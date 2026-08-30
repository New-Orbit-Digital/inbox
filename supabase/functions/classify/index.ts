// Supabase Edge Function: classify (v3 — mode-driven parser)
// The inbox now inserts each capture WITH its bucket (the active tab).
// This function no longer routes; it only parses within the known mode:
//   grocery  → split into items, assign store category (prefs override model)
//   todo     → split, resolve due dates, tags (#tag wins), recurrence
//   event    → resolve start/end, all-day, multi-day, recurrence
//   research/note → stored as typed; no API call, no cost
//
// Secrets: ANTHROPIC_API_KEY, WEBHOOK_SECRET, TIMEZONE (optional),
//          DAY_ROLLOVER_HOUR (optional, default 3 — the hour at which
//          "today" becomes tomorrow; 12:10am counts as the previous day)
// After redeploying: re-check Settings → "Verify JWT with legacy secret" stays OFF.

import { createClient } from "npm:@supabase/supabase-js@2";

const TIMEZONE = Deno.env.get("TIMEZONE") ?? "America/New_York";
const ROLLOVER = parseInt(Deno.env.get("DAY_ROLLOVER_HOUR") ?? "3", 10) || 3;

const GROCERY_CATEGORIES = [
  "Produce","Deli","Bakery","Seafood","Meat","Pickles","Dairy","Frozen Foods",
  "Pet Supplies","Cooking & Baking","Spices","Breakfast & Cereal",
  "Grains, Pasta & Sides","Soups & Canned Goods","Condiments & Dressings",
  "Wine, Beer & Spirits","Snacks","Beverages","Baby","Health & Personal Care",
  "Household & Cleaning","Other",
];
const DEFAULT_TAGS = ["personal","new-orbit","ews","ptc","gtfo"];

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface Entry {
  text: string;
  grocery_category?: string;
  due_date?: string;
  tag?: string;
  event_start?: string;
  event_end?: string;
  all_day?: boolean;
  recur?: string;
}

const normalize = (s: string) => s.toLowerCase().trim();
const stripTags = (s: string) =>
  s.replace(/#[a-z0-9-]+/gi, "").replace(/\s{2,}/g, " ").trim() || s;

function todayLocal(): string {
  return new Date(Date.now() - ROLLOVER * 3600 * 1000)
    .toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const payload = await req.json();
  const m = payload?.record;

  // Personal inserts only; skip wall messages and our own sibling inserts
  // (those carry a confidence value).
  if (payload?.type !== "INSERT" || !m?.owner || m.confidence != null) {
    return Response.json({ skipped: true });
  }

  const mode = (m.bucket ?? "todo") as string;

  // Free modes: stored exactly as typed.
  if (mode === "research" || mode === "note") {
    return Response.json({ stored: true });
  }

  try {
    if (mode === "grocery") return await handleGrocery(m);
    if (mode === "event")   return await handleEvent(m);
    return await handleTodo(m);
  } catch (err) {
    // Parsing is best-effort: on failure the capture stays as typed,
    // in the tab it was entered on, with safe defaults.
    console.error(`${mode} parse failed:`, err);
    if (mode === "todo") {
      await db.from("messages").update({
        due_date: todayLocal(), tag: "personal", confidence: 0, auto: false,
      }).eq("id", m.id);
    } else if (mode === "grocery") {
      await db.from("messages").update({
        grocery_category: "Other", confidence: 0, auto: false,
      }).eq("id", m.id);
    }
    return Response.json({ error: String(err) }, { status: 200 });
  }
});

// ---------------------------------------------------------------- grocery

async function handleGrocery(m: Record<string, unknown>) {
  const entries = await parse(m.body as string, `You split a grocery capture, often messy speech-to-text, into individual store items.
Respond with ONLY JSON, no fences: {"entries":[{"text":"...","grocery_category":"..."}]}
- One entry per item ("apples, bread and milk" → three entries).
- "text" is the clean item name; drop filler like "add", "buy", "to the list".
- "grocery_category" from exactly: ${GROCERY_CATEGORIES.join("; ")}. Use "Other" when unsure.`);

  const keys = entries.map((e) => normalize(e.text));
  const prefs = new Map<string, string>();
  if (keys.length) {
    const { data } = await db.from("grocery_prefs")
      .select("item,category").eq("owner", m.owner).in("item", keys);
    (data ?? []).forEach((p) => prefs.set(p.item, p.category));
  }

  const rowFor = (e: Entry) => ({
    body: e.text,
    grocery_category: prefs.get(normalize(e.text)) ??
      (GROCERY_CATEGORIES.includes(e.grocery_category ?? "") ? e.grocery_category : "Other"),
    confidence: 0.95, auto: true,
  });
  return await writeEntries(m, entries, rowFor);
}

// ---------------------------------------------------------------- todo

async function handleTodo(m: Record<string, unknown>) {
  const body = m.body as string;

  const { data: tagRows } = await db.from("todo_tags")
    .select("tag,description").eq("owner", m.owner);
  const tags = tagRows?.length ? tagRows.map((r) => r.tag) : [...DEFAULT_TAGS];
  const gloss = (tagRows ?? [])
    .filter((r) => r.description)
    .map((r) => `${r.tag} = ${r.description}`).join("; ");

  // A typed #tag is explicit; unknown ones become real tags now.
  const hash = body.match(/#([a-z0-9-]+)/i);
  const forcedTag = hash ? hash[1].toLowerCase() : null;
  if (forcedTag && !tags.includes(forcedTag)) {
    const { error } = await db.from("todo_tags")
      .upsert({ owner: m.owner, tag: forcedTag });
    if (error) console.error("tag persist failed:", error);
    else tags.push(forcedTag);
  }

  const entries = await parse(body, `You parse a to-do capture, often messy speech-to-text, into individual tasks.
Current local date for scheduling: ${todayLocal()} (the day rolls over at ${ROLLOVER}am — late-night captures belong to the previous date). Timezone: ${TIMEZONE}.
Respond with ONLY JSON, no fences: {"entries":[{"text":"...","due_date":"YYYY-MM-DD","tag":"...","recur":"RRULE:... (optional)"}]}
- Split independent tasks into separate entries; keep a single task as ONE entry even if it mentions several details. Only split when there are clearly distinct actions.
- "text": clean task wording; drop filler ("remind me", "I need to"); preserve names' capitalization — lowercase names are people, not acronyms. Strip any #tag from the text.
- "due_date": resolve mentioned dates/relative dates against the current local date; if none mentioned, use the current local date.
- "tag" from: ${tags.join(", ")} — default "personal".${gloss ? ` (${gloss}.)` : ""} A #tag next to an item assigns that item's tag.
- Recurring tasks ("every tuesday night"): "recur" as an RRULE (e.g. RRULE:FREQ=WEEKLY;BYDAY=TU) and due_date = the next occurrence.`);

  const rowFor = (e: Entry) => ({
    body: stripTags(e.text),
    due_date: e.due_date ?? todayLocal(),
    tag: tags.includes(e.tag ?? "") ? e.tag : (forcedTag ?? "personal"),
    recur: e.recur ?? null,
    confidence: 0.95, auto: true,
  });
  return await writeEntries(m, entries, rowFor);
}

// ---------------------------------------------------------------- event

async function handleEvent(m: Record<string, unknown>) {
  const now = new Date().toLocaleString("en-US", {
    timeZone: TIMEZONE,
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  const entries = await parse(m.body as string, `You parse an event capture, often messy speech-to-text, into calendar events.
Current local time: ${now}. Timezone: ${TIMEZONE}.
Respond with ONLY JSON, no fences: {"entries":[{"text":"...","event_start":"...","event_end":"(optional)","all_day":false,"recur":"RRULE:... (optional)"}]}
- Usually ONE entry; split only when clearly separate events were dictated.
- "text": a clean calendar title; preserve names' capitalization — lowercase names are people, not acronyms.
- Clock time given → event_start as ISO8601 with the local offset; all_day=false.
- Only dates given ("aug 26 to 30", "the 14th") → all_day=true, dates as YYYY-MM-DD. Ranges: event_end = the LAST day, inclusive. Never discard any part of a mentioned range or time — if you cannot model it, keep it in "text".
- Recurring ("every monday 9am") → "recur" as an RRULE; event_start = the next occurrence; vague time of day → all_day=true.
- Resolve relative dates against the current local time.`);

  const rowFor = (e: Entry) => ({
    body: e.text,
    event_start: e.event_start ?? null,
    event_end: e.event_end ?? null,
    all_day: e.all_day ?? false,
    recur: e.recur ?? null,
    confidence: 0.95, auto: true,
  });
  return await writeEntries(m, entries, rowFor);
}

// ---------------------------------------------------------------- shared

async function writeEntries(
  m: Record<string, unknown>,
  entries: Entry[],
  rowFor: (e: Entry) => Record<string, unknown>,
) {
  if (!entries.length) return Response.json({ skipped: true });

  const { error: upErr } = await db.from("messages")
    .update(rowFor(entries[0])).eq("id", m.id);
  if (upErr) console.error("update failed:", upErr);

  if (entries.length > 1) {
    const { error: insErr } = await db.from("messages").insert(
      entries.slice(1).map((e) => ({
        ...rowFor(e),
        session: m.session, owner: m.owner,
        bucket: m.bucket, status: "open",
      })),
    );
    if (insErr) console.error("sibling insert failed:", insErr);
  }
  return Response.json({ filed: entries.length });
}

async function parse(body: string, system: string): Promise<Entry[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: body }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n")
    .replace(/```json|```/g, "")
    .trim();
  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.entries) ? parsed.entries : [];
}
