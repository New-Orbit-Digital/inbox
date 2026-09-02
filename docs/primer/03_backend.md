> **Provenance.** This file is one part of the *Primer → Text Wall Migration Corpus*,
> prepared 2026-08-29 and handed to the Inbox project on 2026-09-02. It was split into
> `docs/primer/*.md` on arrival so each part is small enough to review; **the text of every
> part is verbatim and unedited.** Provenance tags inside — `[VERBATIM]`, `[DESIGN]`,
> `[PROPOSED]`, `[UNVERIFIED]` — are the corpus's own and are defined in
> [00_read_first.md](00_read_first.md). `[PROPOSED]` material has never been run; packets
> 008 and 009 are what run it. Where the corpus contradicts this repo (it predates the
> Inbox rename and assumes dashboard deploys), the packets carry the reconciliation —
> never edit this corpus to match.

## 5. Backend logic

### As-is (verified 2026-08-29)

`Supabase Primer:list_edge_functions` → `{"functions": []}`. No edge functions, no database webhooks, no cron, no server routines of any kind exist. No backend code was ever written for Primer.

### Proposed backend for Text Wall `[PROPOSED]`

Two Deno edge functions, each self-contained in one `index.ts` so they can be pasted into the Supabase dashboard's function editor. Both run **as the calling user**: they build a supabase-js client with the anon key and forward the browser's `Authorization` header, so every read and write goes through RLS and `owner` is set by the column default. Neither function ever uses the service-role key.

| Function | Trigger | Model | Input | Output | Writes |
|---|---|---|---|---|---|
| `primer-menu` | HTTP POST via `supabase.functions.invoke` | `claude-haiku-4-5-20251001` | `{ primer_id }` | `{ menu, usage }` | `primers.menu, topic_type, familiarity_estimate, status` |
| `primer-card` | HTTP POST via `supabase.functions.invoke`, once per card row | `claude-sonnet-5` (+ web search tool when warranted) | `{ card_id, force? }` | `{ card }` | `primer_cards.body, chips, status, model, token counts`; `primers.status` when the last card lands |

**Orchestration (client-driven, §9 `research.js`):**

1. Client inserts a `primers` row (topic, brain_dump) → calls `primer-menu` → renders options.
2. User taps 0–5 options → client computes `depth_mode` (0 → curious, 1–2 → conversation, 3+ → research), updates the `primers` row (`selections`, `depth_mode`, `status='generating'`), and inserts one `pending` `primer_cards` row per card in canonical order: `overview`; each selected type; `debates` and `further_reading` if ≥1 selected; `check_yourself` if research mode.
3. Client calls `primer-card` for the **overview first and awaits it** — every other card's prompt receives the Overview text so the map and the cards agree.
4. Then the selected cards and `debates`, at most two in flight at once.
5. Then `further_reading` (needs the Debates card's sources in research mode), then `check_yourself` (needs every ready card).
6. A chip tap inserts a `mini_primer` row (`parent_card_id`, `chip_text`, `position` from the chip's `card_type_hint`) and calls `primer-card` on it.

The dependency order lives in the client on purpose: the edge functions stay stateless and bounded (one model call each), which matters because dashboard-deployed functions have a wall-clock limit and no retry queue. `primer-card` refuses to generate a non-overview card until the overview is `ready`, so the client can't skip step 3.

**Why not one big call per primer:** Appendix A §7.1 leaves this open. Per-card wins on Text Wall's constraints — each call stays well under the function time limit, cards stream into the carousel as they finish, a failed card retries alone, and each card type's prompt can be tuned independently. The cross-card redundancy risk is handled by passing the Overview to every card and passing sibling bodies where duplication is likely (Story ↔ Timeline, Debates → Further Reading, everything → Check Yourself).

#### `supabase/functions/primer-menu/index.ts` `[PROPOSED]`

```ts
// primer-menu — Primer's menu call.  [PROPOSED — passes tsc; never deployed or invoked]
// Trigger: HTTP POST from the browser:
//   supabase.functions.invoke('primer-menu', { body: { primer_id } })
// Reads the primer as the calling user (RLS applies), runs the menu call on Haiku,
// validates the JSON, stores it on the primer, returns it.
// Secrets (Dashboard → Edge Functions → Secrets): ANTHROPIC_API_KEY
// Auto-injected by Supabase: SUPABASE_URL, SUPABASE_ANON_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

const MENU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const CORS = {
  "Access-Control-Allow-Origin": "*", // tighten to Text Wall's origin once it's fixed
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CARD_TYPES = ["story", "how_it_works", "timeline", "key_players", "key_numbers"];
const TOPIC_TYPES = ["historical", "mechanism", "cultural", "economic", "contested-policy", "biographical", "mixed"];
const FAMILIARITY = ["none", "partial", "informed"];
const CLAIM_STATUS = ["correct", "misconception", "contested"];

// ---------------------------------------------------------------------------
// PROMPT — menu call (system). Verbatim source of truth; §6 documents it.
// ---------------------------------------------------------------------------
const MENU_SYSTEM = `You are the menu planner for Primer, a research aid that produces consistently formatted educational overviews. Given a topic and an optional brain dump written by the user, you decide which coverage options to offer. You never write the primer itself.

The card library (every option maps to exactly one card type):
- story — the causal throughline of how the situation came to be. Labels like "The story", "How we got here", "The history".
- how_it_works — the mechanism: what the parts are and how they interact. Labels like "How it works", "The mechanism", "How the system operates".
- timeline — a scannable chronological reference.
- key_players — the cast and the vocabulary: people, organizations, factions, terms of art.
- key_numbers — the 5–10 numbers that anchor the topic, each with a comparison.

Overview, Debates & Misconceptions, Further Reading, and Check Yourself are never offered as options; the app includes them automatically.

Rules:
1. Offer 3–5 options. Each option's label is adapted to the topic and names that card's coverage of it (for example "How we got here", "How the vaccine works", "Who's who in the 2008 crisis"). Labels are not sub-topics and are under 6 words.
2. Never offer both story and how_it_works with labels that blur them. Story covers how the situation came to be; How It Works covers how the thing operates. For a science topic, offer both only if the labels make that boundary obvious (for example "How the science developed" vs "How the vaccine works").
3. Offer key_numbers only where numbers genuinely anchor the topic.
4. Classify the topic type as one of: historical, mechanism, cultural, economic, contested-policy, biographical, mixed.
5. If a brain dump is present: estimate familiarity (none, partial, or informed) from what it demonstrates, and extract each distinct factual claim it makes, labeling each correct, misconception, or contested. A misconception is wrong by the evidence; contested means informed, credible people genuinely disagree. Never label a live debate as a misconception or a settled question as contested. If there is no brain dump, familiarity_estimate is "none" and dump_claims is an empty list.
6. Set search_recommended to true if the topic touches events after 2023, live policy, a fast-moving field, or if any key figure would plausibly have changed in the last two years.

Respond with a single JSON object and nothing else: no preamble, no explanation, no code fences. Shape:
{
  "topic_type": "historical | mechanism | cultural | economic | contested-policy | biographical | mixed",
  "coverage_options": [ { "card_type": "story", "label": "How we got here" } ],
  "familiarity_estimate": "none | partial | informed",
  "dump_claims": [ { "claim": "...", "status": "correct | misconception | contested" } ],
  "search_recommended": true
}`;

// PROMPT — menu call (user message template)
function menuUserMessage(topic: string, brainDump: string, today: string): string {
  return `Topic: ${topic}
Today's date: ${today}
Brain dump (user-authored; may be empty):
"""
${brainDump}
"""`;
}

// ---------------------------------------------------------------------------
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

function validateMenu(raw: any) {
  const seen = new Set<string>();
  const coverage_options: { card_type: string; label: string }[] = [];
  for (const o of Array.isArray(raw?.coverage_options) ? raw.coverage_options : []) {
    const t = String(o?.card_type ?? "");
    if (!CARD_TYPES.includes(t) || seen.has(t)) continue;
    seen.add(t);
    coverage_options.push({ card_type: t, label: String(o?.label ?? t).trim().slice(0, 60) });
  }
  if (coverage_options.length < 3) {
    throw new Error(`menu call returned ${coverage_options.length} valid options; need at least 3`);
  }
  const topic_type = TOPIC_TYPES.includes(raw?.topic_type) ? raw.topic_type : "mixed";
  const familiarity_estimate = FAMILIARITY.includes(raw?.familiarity_estimate) ? raw.familiarity_estimate : "none";
  const dump_claims = (Array.isArray(raw?.dump_claims) ? raw.dump_claims : [])
    .filter((c: any) => typeof c?.claim === "string" && CLAIM_STATUS.includes(c?.status))
    .map((c: any) => ({ claim: c.claim.trim().slice(0, 300), status: c.status }))
    .slice(0, 12);
  return {
    topic_type,
    coverage_options: coverage_options.slice(0, 5),
    familiarity_estimate,
    dump_claims,
    search_recommended: raw?.search_recommended === true,
  };
}

async function callHaiku(system: string, user: string) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MENU_MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`anthropic ${res.status}: ${detail.slice(0, 600)}`);
  }
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  return { text, usage: data.usage };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing Authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: "not authenticated" }, 401);

  let primerId: string | undefined;
  try {
    const body = await req.json();
    primerId = body?.primer_id;
  } catch {
    return json({ error: "body must be JSON" }, 400);
  }
  if (!primerId) return json({ error: "primer_id required" }, 400);

  // RLS makes other users' primers invisible, so a foreign id reads as "not found".
  const { data: primer, error: readErr } = await supabase
    .from("primers")
    .select("id, topic, brain_dump")
    .eq("id", primerId)
    .single();
  if (readErr || !primer) return json({ error: "primer not found" }, 404);

  await supabase.from("primers").update({ status: "menu_pending", error: null }).eq("id", primerId);

  try {
    const today = new Date().toISOString().slice(0, 10);
    const userMsg = menuUserMessage(primer.topic, primer.brain_dump ?? "", today);

    let menu;
    let usage;
    try {
      const first = await callHaiku(MENU_SYSTEM, userMsg);
      usage = first.usage;
      menu = validateMenu(extractJson(first.text));
    } catch (firstErr) {
      // One retry with the failure named; Haiku occasionally under-delivers options or wraps JSON.
      const retry = await callHaiku(
        MENU_SYSTEM,
        `${userMsg}\n\nYour previous answer was rejected: ${String((firstErr as Error).message)}. Return only the JSON object, with 3–5 valid coverage options.`,
      );
      usage = retry.usage;
      menu = validateMenu(extractJson(retry.text));
    }

    const { error: updErr } = await supabase
      .from("primers")
      .update({
        menu,
        topic_type: menu.topic_type,
        familiarity_estimate: menu.familiarity_estimate,
        status: "menu_ready",
      })
      .eq("id", primerId);
    if (updErr) throw new Error(`db update failed: ${updErr.message}`);

    return json({ menu, usage });
  } catch (err) {
    const message = String((err as Error)?.message ?? err);
    await supabase.from("primers").update({ status: "error", error: message.slice(0, 1000) }).eq("id", primerId);
    return json({ error: message }, 500);
  }
});
```

#### `supabase/functions/primer-card/index.ts` `[PROPOSED]`

```ts
// primer-card — generates exactly one card of a primer.  [PROPOSED — passes tsc; never deployed or invoked]
// Trigger: HTTP POST from the browser, once per pending primer_cards row:
//   supabase.functions.invoke('primer-card', { body: { card_id, force?: boolean } })
// Reads the card, its primer, and sibling cards as the calling user (RLS applies),
// builds the card's prompt from the shared system prompt + the card-type block,
// calls Sonnet (with the web search tool when warranted), validates the JSON,
// stores the result on the card. Marks the primer ready when no card is left pending.
// Secrets: ANTHROPIC_API_KEY.  Auto-injected: SUPABASE_URL, SUPABASE_ANON_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";

const CARD_MODEL = "claude-sonnet-5";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// web_search_20260209 adds dynamic filtering on supported models; verify support for
// the pinned CARD_MODEL in the tool reference before switching. 20250305 works broadly.
const WEB_SEARCH_TOOL = "web_search_20250305";
const MAX_TOKENS = 4000;
const CALL_TIMEOUT_MS = 110_000; // stay under the plan's edge-function wall-clock limit
const MAX_PAUSE_TURN_ROUNDS = 4;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cards that always search, and each card's search budget (max_uses).
const ALWAYS_SEARCH = new Set(["key_numbers", "further_reading", "debates"]);
const SEARCH_BUDGET: Record<string, number> = {
  overview: 2, story: 2, how_it_works: 2, timeline: 2, key_players: 2,
  key_numbers: 5, debates: 4, check_yourself: 0, further_reading: 6, mini_primer: 2,
};

const DEFAULT_LABEL: Record<string, string> = {
  overview: "Overview", story: "The story", how_it_works: "How it works", timeline: "Timeline",
  key_players: "Key players & terms", key_numbers: "Key numbers",
  debates: "Debates & misconceptions", check_yourself: "Check yourself",
  further_reading: "Further reading", mini_primer: "More on this",
};

const CHIP_HINTS = ["story", "how_it_works", "timeline", "key_players", "key_numbers", "debates", "mini_primer"];
const DEBATES_CHIP_TEXT = "What people get wrong and what's debated";

// ---------------------------------------------------------------------------
// PROMPT — shared system prompt for every card. Verbatim source of truth; §6 documents it.
// Lifted from Card Library Specification v0.1 §2 (global style rules) and Card 0 rules.
// ---------------------------------------------------------------------------
const CARD_SYSTEM = `You are the generation engine for Primer, a research aid that produces consistently formatted educational overviews. Your job is orientation-level familiarity for an intelligent generalist, not expertise. You write one card at a time; the card type, its locked structure, and its length target are given in the user message.

Global rules (apply to every card):
1. Front-load. The first sentence of the card carries its most important content. A reader who stops after sentence one still got the card's core.
2. Prose over bullets, except in reference-class cards (Timeline, Key Players & Terms, Key Numbers), which are scannable by design.
3. Plain language, defined terms. Gloss any term of art in parentheses on first use. Never use a term before it has been glossed in this card or in the Overview text you were given.
4. No filler. No "it's important to note," no throat-clearing, no restating the question. Every sentence carries information.
5. Calibrated confidence. State settled facts plainly. Flag uncertainty explicitly ("estimates range from X to Y," "disputed"). Never smooth over a range to sound authoritative.
6. Attribution over assertion for contested claims. Attribute contested claims to who holds them ("critics argue," "the IPCC's central estimate," "Jacobson's group models"). Never state a contested claim in your own voice.
7. Reading level: intelligent generalist. Assume zero domain knowledge unless the brain dump shows otherwise; never condescend.
8. Numbers are approximate by default ("~14 million," "roughly 200,000–2 million") unless precision is the point. Date-stamp anything volatile.
9. Recency. If the web search tool is available to you, use it for anything that may have changed since your training data: current events, live policy, fast-moving fields, and any figure that moves. Reflect the state of the world as of the date given, not training-data state. Do not search for settled history.
10. Never quote the user's brain dump mockingly or evaluatively. Corrections are warm and matter-of-fact.
11. Do not repeat content that already appears in the Overview or in the other cards you were shown; each card carries its own information.

Output contract:
- Respond with a single JSON object and nothing else: no preamble, no explanation, no code fences.
- Follow the JSON shape given in the user message exactly. Plain strings only; no markdown inside strings except *italics* for titles of works.
- Stay within the word target. Count only the words inside the content strings.`;

// ---------------------------------------------------------------------------
// PROMPT — per-card blocks (user message, second half). Lifted from Card Library
// Specification v0.1 §3 and §5. {{label}} and {{chip_text}} are substituted in code.
// ---------------------------------------------------------------------------
const CARD_BLOCKS: Record<string, string> = {
  overview: `CARD TO WRITE: Overview — mandatory, always the first generated card.
Job: stand alone as a complete answer. Merge the "one-paragraph version" and the "map" (an advance organizer).
Structure (locked):
  answer — paragraph 1 (50–70 words): what it is, why it matters, the single most important thing to understand.
  map — paragraph 2 (70–110 words): what kind of topic this is, where it sits (time/place/field), and the 3–4 big ideas the rest of the primer hangs on. Prose, not a list. In conversation and research mode the big ideas MUST correspond to the cards listed under "Cards in this primer" — the map is the carousel's table of contents in disguise.
Length: curious 120–180 words; conversation 150–200; research 180–250.
Curious mode only: also produce 3–5 expansion chips, phrased as sub-topics ("the Kashmir dispute it created"), never as card names. Exactly one chip must have the text "What people get wrong and what's debated" with card_type_hint "debates". Give every chip a card_type_hint from: story, how_it_works, timeline, key_players, key_numbers, debates, mini_primer. In conversation and research mode, chips is an empty list.
Done well when: a user who reads only this card can say one accurate, non-trivial sentence about the topic to someone else.
Do not: define without explaining significance; write a map that is a list of section names rather than ideas; name big ideas that don't match the cards behind them.
JSON shape: {"answer": "...", "map": "...", "chips": [{"text": "...", "card_type_hint": "..."}]}`,

  story: `CARD TO WRITE: Story (label shown to the user: "{{label}}")
Job: the causal throughline. Not "events that happened" but "this led to this because."
Structure (locked): continuous prose, 3–5 paragraphs, strictly causal ordering (chronology may bend if causality is clearer another way). Open with the origin condition; close with the present-day state or consequence. Every paragraph transition answers "and therefore" or "and because of that."
Length: conversation 250–350 words; research 400–550.
Boundary: Story covers how the situation came to be. If a How It Works card is in this primer, leave the mechanism to it entirely — for a science topic, Story is the history of the discovery or field. If a Timeline card is in this primer, do not restate dates as a sequence; carry the causation and let the timeline carry the dates.
Done well when: the user can reconstruct the causal chain from memory, even having forgotten the dates.
Do not: write a disguised timeline (sequence without causation); start too early (deep-background padding); narrate contingent outcomes as inevitable (hindsight determinism).
JSON shape: {"paragraphs": ["...", "...", "..."]}`,

  how_it_works: `CARD TO WRITE: How It Works (label shown to the user: "{{label}}")
Job: mechanism. What the parts are and how they interact.
Structure (locked):
  core — one sentence stating the core mechanism.
  chain — the mechanism in order (input, steps, output) as an ordered list of short prose steps. One analogy to something universally familiar is encouraged (put it in "analogy"); more than one is clutter.
  constraint — one closing sentence naming the key constraint or failure point: what breaks it or limits it. This is what makes the understanding feel earned.
Length: conversation 200–300 words; research 350–450.
Boundary: this card covers how the thing operates, not how it came to be — leave history to the Story card.
Done well when: the user could sketch the mechanism as a diagram from the text alone. Write it so a diagram could be generated from it.
Do not: chain jargon where each term is defined by another term; explain the general category instead of the specific mechanism; omit the constraint.
JSON shape: {"core": "...", "chain": ["...", "..."], "analogy": "..." or null, "constraint": "..."}`,

  timeline: `CARD TO WRITE: Timeline (label shown to the user: "{{label}}") — reference class
Job: scannable chronological reference; the card users return to.
Structure (locked): a single flat list of entries, each: when, event, why it mattered. 6–10 entries in conversation mode, 10–15 in research. No sub-nesting. Choose entries for causal significance, not completeness.
Rule: every entry's "why it mattered" must be earnest — if an entry has no consequence worth a clause, cut the entry.
Done well when: the entries alone imply the Story card's causal arc.
Do not: include trivia; repeat the Story card verbatim; give false precision on disputed dates (write "c. 1947" or "disputed: 1946–48").
JSON shape: {"entries": [{"when": "...", "event": "...", "why_it_mattered": "..."}]}`,

  key_players: `CARD TO WRITE: Key Players & Terms (label shown to the user: "{{label}}") — reference class
Job: the cast and the vocabulary the user needs to follow any real discussion of the topic.
Structure (locked): two clusters. players: 4–8 entries of name, one-line identification, why they matter. terms: 4–8 entries of term and definition. In conversation mode either cluster may be empty if the topic doesn't need it (for example, few named players in a mechanism topic).
Rule: identifications must include the person's or organization's stake or position where relevant, not just their role ("rating agencies — paid by the issuers whose products they rated"). Stakes are what make the cast memorable and the topic legible.
Done well when: the user can follow a podcast or article on the topic without stopping to look anyone up.
Do not: aim for encyclopedic completeness; give titles without stakes; define terms circularly.
JSON shape: {"players": [{"name": "...", "identification": "...", "why_they_matter": "..."}], "terms": [{"term": "...", "definition": "..."}]}`,

  key_numbers: `CARD TO WRITE: Key Numbers (label shown to the user: "{{label}}") — reference class
Job: the quantitative skeleton — the 5–10 numbers that anchor the topic, each with the comparison that makes it meaningful.
Structure (locked): a flat list: figure, what it measures, the comparison or context that gives it meaning. Every number MUST carry a comparison ("~9% of global electricity — down from 17% in 2000"; "deaths per TWh on par with wind, ~100x lower than coal"). A number without context is banned from this card.
Rules: approximate by default; date-stamp anything volatile in as_of ("2026"); use web search for anything that moves.
Done well when: the user can deploy two of these numbers in conversation and sound informed rather than like they memorized statistics.
Do not: give context-free figures; spurious precision; numbers that are impressive but not load-bearing for understanding.
JSON shape: {"numbers": [{"figure": "...", "measures": "...", "context": "...", "as_of": "..." or null}]}`,

  debates: `CARD TO WRITE: Debates & Misconceptions — auto-included. The fairness card. Two duties that must not blur.
misconceptions: things commonly believed that are wrong by the evidence, corrected refutation-style — state the belief, state plainly that it is mistaken, give the correction and the reason. If the brain dump contained one (see the extracted claims with status "misconception"), address it by reference, warmly ("You mentioned X — that's a common framing, but…") and set from_brain_dump to true. 2–4 items.
debates: questions where informed, credible people genuinely disagree, presented with steelman symmetry — each side gets its strongest version, named holders where possible, and a citation to something that side would itself reference (their canonical report, paper, or book — not a critic's summary of them). End each with one sentence on what the disagreement actually turns on: the crux assumption. Put extracted claims with status "contested" here, never under misconceptions. 2–4 debates in conversation mode, 3–5 in research.
Length: conversation 150–250 words; research 300–450.
Hard rules:
  - Never file a live debate under misconceptions or vice versa. Misclassification in either direction is this card's cardinal failure: it either launders one side's position as fact or manufactures false balance on a settled question.
  - Political valence check: if every misconception you corrected happens to favor one side of a live political divide, re-audit the card before answering.
  - Your own voice never takes a side in the debates half. It may and must take a side in the misconceptions half — that is what the evidence is for.
Done well when: a partisan of either side of each debate would say their position was stated fairly.
JSON shape: {"misconceptions": [{"belief": "...", "correction": "...", "reason": "...", "from_brain_dump": false}], "debates": [{"question": "...", "side_a": {"position": "...", "holders": "...", "source": "..."}, "side_b": {"position": "...", "holders": "...", "source": "..."}, "crux": "..."}]}`,

  check_yourself: `CARD TO WRITE: Check Yourself — auto-included in research mode; optional in conversation mode.
Job: counter the fluency illusion. Write 2–3 questions the user should be able to answer after reading this primer, based on what the cards shown to you actually say.
Rule: questions target causal or structural understanding ("why did X change the incentives?"), never date recall. Each question names the card the user should re-read if they can't answer it. Provide a short model answer for each; the app hides answers until tapped.
Done well when: a user who can't answer one knows exactly which card to re-read.
JSON shape: {"questions": [{"question": "...", "answer": "...", "reread": "overview | story | how_it_works | timeline | key_players | key_numbers | debates"}]}`,

  further_reading: `CARD TO WRITE: Further Reading — auto-included. The exits.
Job: 3–5 sources, each with one line on why this source and what angle it covers — never a bare link list.
Composition rule: at least one primary or official source; at least one accessible narrative source; in research mode, where the Debates card names sides, the canonical source for each side must appear here (duplicating the Debates citations is fine — this card is the collected exit points).
Rules: real sources only. Use web search to verify that each source exists and, if you give a URL, that the URL is live; if you cannot verify a source, leave it out. Note a source's known slant as a feature, not a disclaimer ("Bernanke's memoir — the Fed's self-defense, useful as one side of the debate"). Match reading level to the depth mode: no unreadable primary literature in conversation mode.
Do not: invent sources (fatal); give five sources with the same perspective.
JSON shape: {"sources": [{"title": "...", "creator": "author or publisher", "kind": "primary | narrative | side_a | side_b | data | other", "angle": "...", "url": "https://..." or null}]}`,

  mini_primer: `CARD TO WRITE: Mini-primer, spawned by the expansion chip "{{chip_text}}".
Job: a single Overview-shaped card on the sub-topic the chip names, in the context of the main topic. 100–180 words regardless of depth mode.
Structure (locked): answer — one paragraph: what it is, why it matters to the main topic, the single most important thing to understand. micro_map — one short paragraph: the 2–3 ideas that organize it.
End with 1–2 chips of your own only if the sub-topic warrants further expansion; otherwise an empty list. Chips are phrased as sub-topics with card_type_hint "mini_primer".
JSON shape: {"answer": "...", "micro_map": "...", "chips": [{"text": "...", "card_type_hint": "mini_primer"}]}`,
};

// ---------------------------------------------------------------------------
// PROMPT — user message header (first half of every card's user message)
// ---------------------------------------------------------------------------
function buildUserMessage(primer: any, card: any, siblings: any[], overview: any, today: string): string {
  const cardList = siblings
    .filter((s) => s.card_type !== "mini_primer")
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.label ?? DEFAULT_LABEL[s.card_type]} (${s.card_type})`)
    .join(", ");
  const claims = JSON.stringify(primer.menu?.dump_claims ?? []);
  const overviewText = overview ? `${overview.body?.answer ?? ""}\n\n${overview.body?.map ?? ""}` : "(not yet generated — this is the Overview call)";

  let block = CARD_BLOCKS[card.card_type];
  block = block.replaceAll("{{label}}", card.label ?? DEFAULT_LABEL[card.card_type]);
  block = block.replaceAll("{{chip_text}}", card.chip_text ?? "");

  return `PRIMER CONTEXT
Topic: ${primer.topic}
Today's date: ${today}
Topic type: ${primer.topic_type ?? "mixed"}
Depth mode: ${primer.depth_mode}
Familiarity estimate: ${primer.familiarity_estimate ?? "none"}
Cards in this primer, in order: ${cardList || "Overview (overview)"}
Brain dump (user-authored; may be empty):
"""
${primer.brain_dump ?? ""}
"""
Claims extracted from the brain dump: ${claims}
Overview card (already generated; build on it, do not repeat it):
"""
${overviewText}
"""
${contextFor(card, siblings)}
${block}`;
}

// Which sibling bodies a card needs to see. Bounded to keep input tokens sane.
function contextFor(card: any, siblings: any[]): string {
  const ready = siblings.filter((s) => s.status === "ready" && s.id !== card.id && s.card_type !== "overview");
  const compact = (s: any, cap: number) => `--- ${s.card_type} ---\n${JSON.stringify(s.body).slice(0, cap)}`;
  let picked: any[] = [];
  let cap = 2500;
  switch (card.card_type) {
    case "check_yourself":
      picked = ready; cap = 1800; break;
    case "further_reading":
      picked = ready.filter((s) => s.card_type === "debates"); cap = 4000; break;
    case "story":
      picked = ready.filter((s) => s.card_type === "timeline" || s.card_type === "how_it_works"); break;
    case "timeline":
      picked = ready.filter((s) => s.card_type === "story"); break;
    case "how_it_works":
      picked = ready.filter((s) => s.card_type === "story"); break;
    case "debates":
      picked = ready.filter((s) => s.card_type === "story" || s.card_type === "how_it_works"); cap = 1500; break;
    case "mini_primer":
      picked = ready.filter((s) => s.id === card.parent_card_id); cap = 1500; break;
    default:
      picked = [];
  }
  if (picked.length === 0) return "Other cards already generated: none relevant.";
  return `Other cards already generated (do not repeat their content):\n${picked.map((s) => compact(s, cap)).join("\n")}`;
}

// ---------------------------------------------------------------------------
// Anthropic call with timeout, pause_turn continuation, and usage accumulation
// ---------------------------------------------------------------------------
async function callAnthropic(params: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  const usage = { input_tokens: 0, output_tokens: 0, web_search_requests: 0 };
  const sources: { url: string; title: string }[] = [];
  let messages = params.messages as any[];
  try {
    for (let round = 0; round < MAX_PAUSE_TURN_ROUNDS; round++) {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({ ...params, messages }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`anthropic ${res.status}: ${detail.slice(0, 600)}`);
      }
      const data = await res.json();
      usage.input_tokens += data.usage?.input_tokens ?? 0;
      usage.output_tokens += data.usage?.output_tokens ?? 0;
      usage.web_search_requests += data.usage?.server_tool_use?.web_search_requests ?? 0;
      for (const b of data.content ?? []) {
        if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
          for (const r of b.content) {
            if (r.type === "web_search_result" && r.url && !sources.some((s) => s.url === r.url)) {
              sources.push({ url: r.url, title: r.title ?? "" });
            }
          }
        }
      }
      if (data.stop_reason === "pause_turn") {
        // Server-tool turn paused; send the partial turn back unchanged and continue.
        messages = [...messages, { role: "assistant", content: data.content }];
        continue;
      }
      const text = (data.content ?? [])
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join(""); // no separator: JSON may be split across citation-bearing text blocks
      return { text, usage, sources: sources.slice(0, 20), stop_reason: data.stop_reason };
    }
    throw new Error("anthropic: too many pause_turn continuations");
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

const isStr = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const isArr = (v: unknown, min = 1) => Array.isArray(v) && v.length >= min;

// Minimal shape validation per card type. Throws with a message the retry can quote.
function validateBody(cardType: string, body: any) {
  switch (cardType) {
    case "overview":
    case "mini_primer":
      if (!isStr(body?.answer)) throw new Error("answer missing");
      if (cardType === "overview" && !isStr(body?.map)) throw new Error("map missing");
      if (cardType === "mini_primer" && !isStr(body?.micro_map)) throw new Error("micro_map missing");
      break;
    case "story":
      if (!isArr(body?.paragraphs, 3)) throw new Error("paragraphs needs 3–5 entries");
      break;
    case "how_it_works":
      if (!isStr(body?.core) || !isArr(body?.chain, 2) || !isStr(body?.constraint)) throw new Error("core, chain (2+), constraint required");
      break;
    case "timeline":
      if (!isArr(body?.entries, 5)) throw new Error("entries needs 6+ items");
      for (const e of body.entries) if (!isStr(e?.when) || !isStr(e?.event) || !isStr(e?.why_it_mattered)) throw new Error("every entry needs when, event, why_it_mattered");
      break;
    case "key_players":
      if (!isArr(body?.players, 0) || !isArr(body?.terms, 0)) throw new Error("players and terms arrays required");
      if (body.players.length + body.terms.length < 4) throw new Error("too few players/terms");
      break;
    case "key_numbers":
      if (!isArr(body?.numbers, 4)) throw new Error("numbers needs 5–10 items");
      for (const n of body.numbers) if (!isStr(n?.figure) || !isStr(n?.context)) throw new Error("every number needs figure and context");
      break;
    case "debates":
      if (!isArr(body?.misconceptions, 1) || !isArr(body?.debates, 1)) throw new Error("misconceptions and debates required");
      for (const d of body.debates) if (!isStr(d?.question) || !isStr(d?.side_a?.source) || !isStr(d?.side_b?.source) || !isStr(d?.crux)) throw new Error("each debate needs question, side_a.source, side_b.source, crux");
      break;
    case "check_yourself":
      if (!isArr(body?.questions, 2)) throw new Error("questions needs 2–3 items");
      break;
    case "further_reading":
      if (!isArr(body?.sources, 3)) throw new Error("sources needs 3–5 items");
      for (const s of body.sources) if (!isStr(s?.title) || !isStr(s?.angle)) throw new Error("every source needs title and angle");
      break;
    default:
      throw new Error(`unknown card_type ${cardType}`);
  }
}

function normalizeChips(raw: unknown, cardType: string, depthMode: string) {
  let chips = (Array.isArray(raw) ? raw : [])
    .filter((c: any) => isStr(c?.text))
    .map((c: any) => ({ text: String(c.text).trim().slice(0, 80), card_type_hint: CHIP_HINTS.includes(c?.card_type_hint) ? c.card_type_hint : "mini_primer" }))
    .slice(0, 5);
  if (cardType === "overview") {
    if (depthMode !== "curious") return [];
    if (!chips.some((c) => c.card_type_hint === "debates")) {
      chips = [...chips.slice(0, 4), { text: DEBATES_CHIP_TEXT, card_type_hint: "debates" }];
    }
  }
  if (cardType === "mini_primer") chips = chips.slice(0, 2);
  return chips;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing Authorization header" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: "not authenticated" }, 401);

  let cardId: string | undefined;
  let force = false;
  try {
    const body = await req.json();
    cardId = body?.card_id;
    force = body?.force === true;
  } catch {
    return json({ error: "body must be JSON" }, 400);
  }
  if (!cardId) return json({ error: "card_id required" }, 400);

  const { data: card, error: cardErr } = await supabase.from("primer_cards").select("*").eq("id", cardId).single();
  if (cardErr || !card) return json({ error: "card not found" }, 404);
  if (card.status === "ready" && !force) return json({ card, cached: true });

  const { data: primer, error: primerErr } = await supabase.from("primers").select("*").eq("id", card.primer_id).single();
  if (primerErr || !primer) return json({ error: "primer not found" }, 404);

  const { data: siblings } = await supabase
    .from("primer_cards")
    .select("id, card_type, label, position, status, body, chips, parent_card_id")
    .eq("primer_id", primer.id)
    .order("position");
  const overview = (siblings ?? []).find((s) => s.card_type === "overview" && s.status === "ready");
  if (card.card_type !== "overview" && !overview) {
    return json({ error: "overview must be generated before other cards" }, 409);
  }

  await supabase.from("primer_cards").update({ status: "generating", error: null }).eq("id", cardId);

  try {
    const today = new Date().toISOString().slice(0, 10);
    const userMsg = buildUserMessage(primer, card, siblings ?? [], overview, today);
    const useSearch = ALWAYS_SEARCH.has(card.card_type) || primer.menu?.search_recommended === true;
    const budget = SEARCH_BUDGET[card.card_type] ?? 2;

    const params: Record<string, unknown> = {
      model: CARD_MODEL,
      max_tokens: MAX_TOKENS,
      system: CARD_SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    };
    if (useSearch && budget > 0) {
      params.tools = [{ type: WEB_SEARCH_TOOL, name: "web_search", max_uses: budget }];
    }

    let parsed: any;
    let result = await callAnthropic(params);
    try {
      parsed = extractJson(result.text);
      validateBody(card.card_type, parsed);
    } catch (firstErr) {
      // One corrective retry, quoting the validation failure.
      const retryParams = {
        ...params,
        messages: [
          { role: "user", content: userMsg },
          { role: "assistant", content: result.text.slice(0, 6000) || "(empty)" },
          { role: "user", content: `That output was rejected: ${String((firstErr as Error).message)}. Return only the JSON object in the exact shape requested, nothing else.` },
        ],
      };
      const second = await callAnthropic(retryParams);
      result = {
        text: second.text,
        usage: {
          input_tokens: result.usage.input_tokens + second.usage.input_tokens,
          output_tokens: result.usage.output_tokens + second.usage.output_tokens,
          web_search_requests: result.usage.web_search_requests + second.usage.web_search_requests,
        },
        sources: [...result.sources, ...second.sources].slice(0, 20),
        stop_reason: second.stop_reason,
      };
      parsed = extractJson(result.text);
      validateBody(card.card_type, parsed);
    }

    const chips = normalizeChips(parsed.chips, card.card_type, primer.depth_mode);
    delete parsed.chips;
    parsed.sources_used = result.sources; // URLs the model actually retrieved; UI may show them as "checked against"

    const { data: saved, error: saveErr } = await supabase
      .from("primer_cards")
      .update({
        body: parsed,
        chips,
        status: "ready",
        model: CARD_MODEL,
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        web_searches: result.usage.web_search_requests,
        error: null,
      })
      .eq("id", cardId)
      .select("*")
      .single();
    if (saveErr) throw new Error(`db update failed: ${saveErr.message}`);

    // Mark the primer ready once nothing is pending or generating.
    const { count } = await supabase
      .from("primer_cards")
      .select("id", { count: "exact", head: true })
      .eq("primer_id", primer.id)
      .in("status", ["pending", "generating"]);
    if ((count ?? 0) === 0) {
      await supabase.from("primers").update({ status: "ready", error: null }).eq("id", primer.id);
    }

    return json({ card: saved });
  } catch (err) {
    const message = String((err as Error)?.message ?? err);
    await supabase.from("primer_cards").update({ status: "error", error: message.slice(0, 1000) }).eq("id", cardId);
    return json({ error: message }, 500);
  }
});
```

**External calls:** Anthropic Messages API only (`https://api.anthropic.com/v1/messages`). Supabase reads/writes go through PostgREST via supabase-js with the caller's JWT.

**Error handling, both functions:** 401 for missing/invalid session; 404 when RLS hides the row (deliberately not 403 — no existence leak); 409 when the client tries to generate a card before the Overview; one corrective retry on unparseable or shape-invalid JSON; 500 with the error text on anything else, and the row's `status`/`error` columns are updated so the UI can offer a per-card retry. Timeouts abort the Anthropic call at 110 s.

**Known bugs:** none observed — the functions have never been deployed or invoked (they pass a TypeScript check only). Risks to verify on first deploy, in order of likelihood:
1. The edge-function wall-clock limit on the personal org's plan vs. a research-mode Debates or Further Reading call that runs 4–6 searches. If it trips, lower `SEARCH_BUDGET` before anything else.
2. `pause_turn` handling: the loop sends `data.content` back as an assistant turn, which is the documented continuation pattern; confirm it against the current server-tools docs for the pinned model.
3. `web_search_20250305` vs `web_search_20260209` support on `claude-sonnet-5` — check the tool reference and pin whichever is supported.
4. Sonnet 5 defaults to adaptive thinking with effort high on the API; thinking tokens bill as output. If cost or latency is too high, consult the Effort docs for the request syntax and test a lower effort for card generation.
5. Text Wall's `messages` capture creating a primer is *not* in these functions — it's a client-side hook (§9), or a small third function if Text Wall's capture pipeline runs server-side.

---
