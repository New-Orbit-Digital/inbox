// Supabase Edge Function: classify (002-A — grocery-only, two entry points)
// The inbox inserts each capture WITH its bucket (the active tab). This
// function parses ONE mode with the model — grocery — and nothing else:
//   grocery  → split into items, assign store category (prefs override model)
//   todo     → transitional deterministic default, NO model call (packet 004
//              deletes this path entirely)
//   research/note/event/null → ignored; stored exactly as typed, no cost
//
// Two entry points share one grocery routine:
//   webhook mode (x-webhook-secret)  → writes the parsed items back to messages
//   direct mode  (Authorization)     → returns the parsed items, writes nothing
//
// Secrets: ANTHROPIC_API_KEY, WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY,
//          SUPABASE_URL (auto-injected), TIMEZONE (optional),
//          DAY_ROLLOVER_HOUR (optional, default 3 — the hour at which
//          "today" becomes tomorrow; 12:10am counts as the previous day)
// After redeploying: re-check Settings → "Verify JWT with legacy secret" stays OFF.

import { createClient } from "npm:@supabase/supabase-js@2";

const CLASSIFY_VERSION = "002-A";
const ALLOWED_ORIGIN = "https://inbox.justin-dec.workers.dev";

const TIMEZONE = Deno.env.get("TIMEZONE") ?? "America/New_York";
const ROLLOVER = parseInt(Deno.env.get("DAY_ROLLOVER_HOUR") ?? "3", 10) || 3;

const GROCERY_CATEGORIES = [
  "Produce","Deli","Bakery","Seafood","Meat","Pickles","Dairy","Frozen Foods",
  "Pet Supplies","Cooking & Baking","Spices","Breakfast & Cereal",
  "Grains, Pasta & Sides","Soups & Canned Goods","Condiments & Dressings",
  "Wine, Beer & Spirits","Snacks","Beverages","Baby","Health & Personal Care",
  "Household & Cleaning","Other",
];

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

// ---------------------------------------------------------------- responses

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: CORS });
const plain = (body: string, status: number) =>
  new Response(body, { status, headers: CORS });
const unauthenticated = () =>
  json({ error: "unauthenticated", classify_version: CLASSIFY_VERSION }, 401);

// ---------------------------------------------------------------- router

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: CORS });

  if (req.method === "GET") {
    const ping = new URL(req.url).searchParams.get("ping");
    if (ping === "1") return json({ classify_version: CLASSIFY_VERSION });
    return json({ error: "GET ping only", classify_version: CLASSIFY_VERSION }, 405);
  }

  if (req.method === "POST") {
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== null) {
      if (secret !== Deno.env.get("WEBHOOK_SECRET")) return plain("forbidden", 403);
      return await webhookMode(req);
    }
    if (req.headers.get("Authorization")) return await directMode(req);
  }

  return unauthenticated();
});

// ---------------------------------------------------------------- webhook mode

async function webhookMode(req: Request) {
  const payload = await req.json();
  const m = payload?.record;

  // Personal inserts only; skip wall messages and our own sibling inserts
  // (those carry a confidence value).
  if (payload?.type !== "INSERT" || !m?.owner || m.confidence != null) {
    return json({ skipped: true });
  }

  if (m.bucket === "grocery") {
    try {
      const entries = await parseGrocery(m.body as string, m.owner as string);
      return await writeEntries(m, entries, (e: Entry) => ({
        body: e.text,
        grocery_category: e.grocery_category,
        confidence: 0.95, auto: true,
      }));
    } catch (err) {
      // Parsing is best-effort: on failure the capture stays as typed,
      // in the tab it was entered on, with safe defaults.
      console.error("grocery parse failed:", err);
      await db.from("messages").update({
        grocery_category: "Other", confidence: 0, auto: false,
      }).eq("id", m.id);
      return json({ error: String(err) }, 200);
    }
  }

  // Transitional: to-dos file deterministically, with no model call at all.
  if (m.bucket === "todo") return await defaultTodo(m);

  return json({ ignored: true });
}

async function defaultTodo(m: Record<string, unknown>) {
  const body = m.body as string;

  // A typed #tag is explicit; unknown ones become real tags now.
  const hash = body.match(/#([a-z0-9-]+)/i);
  const tag = hash ? hash[1].toLowerCase() : "personal";
  if (hash) {
    const { error } = await db.from("todo_tags").upsert({ owner: m.owner, tag });
    if (error) console.error("tag persist failed:", error);
  }

  const { error: upErr } = await db.from("messages").update({
    body: stripTags(body),
    due_date: todayLocal(),
    tag,
    auto: false, confidence: 0,
  }).eq("id", m.id);
  if (upErr) console.error("update failed:", upErr);

  return json({ filed: 1 });
}

// ---------------------------------------------------------------- direct mode

async function directMode(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const { data: auth, error: authErr } = await db.auth.getUser(token);
  if (authErr || !auth?.user) return unauthenticated();
  const owner = auth.user.id;

  const payload = await req.json().catch(() => null);
  const raw = payload?.text;
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text || text.length > 280) {
    return json({ error: "text required (1–280 chars)", classify_version: CLASSIFY_VERSION }, 400);
  }

  // A model failure degrades to a single uncategorised item; never a 5xx.
  try {
    const entries = await parseGrocery(text, owner);
    if (!entries.length) throw new Error("no entries");
    return json({
      entries: entries.map((e) => ({ text: e.text, category: e.grocery_category })),
    });
  } catch (err) {
    console.error("direct grocery parse failed:", err);
    return json({ entries: [{ text, category: "Other" }], degraded: true });
  }
}

// ---------------------------------------------------------------- grocery

async function parseGrocery(body: string, owner: string): Promise<Entry[]> {
  const entries = await parse(body, `You split a grocery capture, often messy speech-to-text, into individual store items.
Respond with ONLY JSON, no fences: {"entries":[{"text":"...","grocery_category":"..."}]}
- One entry per item ("apples, bread and milk" → three entries).
- "text" is the clean item name; drop filler like "add", "buy", "to the list".
- "grocery_category" from exactly: ${GROCERY_CATEGORIES.join("; ")}. Use "Other" when unsure.`);

  const keys = entries.map((e) => normalize(e.text));
  const prefs = new Map<string, string>();
  if (keys.length) {
    const { data } = await db.from("grocery_prefs")
      .select("item,category").eq("owner", owner).in("item", keys);
    (data ?? []).forEach((p) => prefs.set(p.item, p.category));
  }

  // A learned preference beats the model; anything off-list becomes "Other".
  return entries.map((e) => ({
    ...e,
    grocery_category: prefs.get(normalize(e.text)) ??
      (GROCERY_CATEGORIES.includes(e.grocery_category ?? "") ? e.grocery_category : "Other"),
  }));
}

// ---------------------------------------------------------------- shared

async function writeEntries(
  m: Record<string, unknown>,
  entries: Entry[],
  rowFor: (e: Entry) => Record<string, unknown>,
) {
  if (!entries.length) return json({ skipped: true });

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
  return json({ filed: entries.length });
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
