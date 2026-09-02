> **Provenance.** This file is one part of the *Primer → Text Wall Migration Corpus*,
> prepared 2026-08-29 and handed to the Inbox project on 2026-09-02. It was split into
> `docs/primer/*.md` on arrival so each part is small enough to review; **the text of every
> part is verbatim and unedited.** Provenance tags inside — `[VERBATIM]`, `[DESIGN]`,
> `[PROPOSED]`, `[UNVERIFIED]` — are the corpus's own and are defined in
> [00_read_first.md](00_read_first.md). `[PROPOSED]` material has never been run; packets
> 008 and 009 are what run it. Where the corpus contradicts this repo (it predates the
> Inbox rename and assumes dashboard deploys), the packets carry the reconciliation —
> never edit this corpus to match.

## 6. AI usage

### As-is

No prompt artifact ever existed. Primer's LLM usage was designed, not built:

- **Two-call flow** `[DESIGN]`: a fast, cheap **menu call** (topic + brain dump → topic type, 3–5 topic-adapted coverage options, familiarity estimate, dump claims, search flag), then **per-card generation** where each card type has its own prompt built from its Generation Guidance in the spec.
- **Prompt source** `[VERBATIM]`: Appendix A — its §2 (global style rules) and §3 (per-card job, locked structure, length by mode, done-well, failure modes) were written "to be lifted nearly verbatim into that card's production prompt." That is exactly what the proposed prompts do.
- **Model tiering** `[DESIGN]`: menu call on the cheapest model; cards on a strong model; web search on for anything current, live, fast-moving, or numeric (spec rule 9). No specific model IDs were chosen in Primer.
- **The five sample primers** (Appendix B) were generated inside the planning chat by the planning model itself, with no prompt beyond the format description in the conversation. They are the only examples of intended output.

### Proposed configuration `[PROPOSED]`

**Prompts — verbatim, single source of truth in §5:**

| Prompt | Where | Role |
|---|---|---|
| Menu system prompt | `primer-menu/index.ts` → `MENU_SYSTEM` | system |
| Menu user template | `primer-menu/index.ts` → `menuUserMessage()` | user |
| Card system prompt (all cards) | `primer-card/index.ts` → `CARD_SYSTEM` | system |
| Card user header | `primer-card/index.ts` → `buildUserMessage()` | user, first half |
| Per-card blocks (10 card types) | `primer-card/index.ts` → `CARD_BLOCKS` | user, second half |
| Sibling context | `primer-card/index.ts` → `contextFor()` | user, middle |
| Corrective retry | inline in both functions | user, appended after a rejected output |

Keeping them in the function source rather than a separate prompts file is a deliberate concession to dashboard deploys (one file per function). If Text Wall later gets a build step, move them to `_shared/prompts.ts`.

**Models and settings** (IDs and pricing verified against the official models page on 2026-08-29):

| Call | Model ID | Settings | Why |
|---|---|---|---|
| Menu | `claude-haiku-4-5-20251001` | `max_tokens: 1024`, `temperature: 0.3`, no tools | Classification-grade task; matches Text Wall's existing Haiku use. $1 / $5 per MTok in/out. |
| Card | `claude-sonnet-5` | `max_tokens: 4000`, temperature unset (adaptive thinking is on by default), web search tool `web_search_20250305` with per-card `max_uses` (`SEARCH_BUDGET` in §5) when `ALWAYS_SEARCH` or `menu.search_recommended` | Spec rules 5, 6, 9 and the Further Reading "real sources only" rule need a model that reasons carefully and can search. $2 / $10 per MTok in/out. |

⚠ MISMATCH: Text Wall's stated model use is Haiku for parsing/classification. The menu call fits that; card generation does not. Haiku can be tried for cards as a cost experiment, but expect failures on exactly the things the spec locks hardest — misconception/debate classification, source verification, calibrated confidence.

**Expected output schemas** (what lands in `primer_cards.body`; `chips` is split out into its own column by the function; `sources_used` is appended by the function):

| card_type | body |
|---|---|
| overview | `{"answer": str, "map": str, "sources_used": [...]}` — chips → `chips` column (curious mode only) |
| story | `{"paragraphs": [str × 3–5]}` |
| how_it_works | `{"core": str, "chain": [str × 2+], "analogy": str\|null, "constraint": str}` |
| timeline | `{"entries": [{"when", "event", "why_it_mattered"} × 6–15]}` |
| key_players | `{"players": [{"name", "identification", "why_they_matter"} × 0–8], "terms": [{"term", "definition"} × 0–8]}` |
| key_numbers | `{"numbers": [{"figure", "measures", "context", "as_of"} × 5–10]}` |
| debates | `{"misconceptions": [{"belief", "correction", "reason", "from_brain_dump"} × 2–4], "debates": [{"question", "side_a": {"position","holders","source"}, "side_b": {…}, "crux"} × 2–5]}` |
| check_yourself | `{"questions": [{"question", "answer", "reread"} × 2–3]}` |
| further_reading | `{"sources": [{"title", "creator", "kind", "angle", "url"} × 3–5]}` |
| mini_primer | `{"answer": str, "micro_map": str}` — chips → `chips` column (0–2) |
| menu (on `primers.menu`) | Appendix A §6 schema, validated by `validateMenu()` |

**Examples of good output:** Appendix B, all five samples, plus the planner's format notes at the end of it. Read them as *targets*, with one translation: they predate the card library, so "The One-Paragraph Version" + "The Map" = the Overview card, "The Story" = Story, the "Reference" block = what became Timeline / Key Players & Terms / Key Numbers as separate cards, "What People Get Wrong / What's Debated" = Debates & Misconceptions, and "Want more?" = expansion chips. The Nuclear Energy sample (research mode) is the reference for how a Debates card must read; the 2008 sample is the reference for misconception handling; the Partition and K-pop samples are the reference for Curious-mode Overviews and chip phrasing.

**Examples of bad output** — the failure modes to test against, from the spec and from the sample run:

- Overview: paragraph 1 defines but doesn't explain significance; the map is a list of section names rather than ideas; big ideas that don't match the cards behind them.
- Story: a disguised timeline (sequence without causation); starting too early; hindsight determinism. *Observed in the samples:* on the mRNA topic, "The Story" drifted into history-of-the-science when the user wanted mechanism — this is why How It Works became a separate card and why the menu call must not offer both with blurred labels.
- How It Works: jargon chains; explaining the category instead of the mechanism; omitting the constraint.
- Timeline: trivia; repeating Story verbatim; false precision on disputed dates.
- Key Players: encyclopedic completeness; titles without stakes; circular definitions.
- Key Numbers: any figure without a comparison (banned); spurious precision; impressive-but-not-load-bearing numbers.
- Debates: **the cardinal failure** — filing a live debate as a misconception (launders one side as fact) or a settled question as a debate (false balance); every corrected misconception favoring one political side; the app's own voice taking a side in the debates half.
- Check Yourself: date-recall questions.
- Further Reading: **a hallucinated source is fatal**; five sources with one perspective; unreadable primary literature at conversation depth.
- Any card: filler ("it's important to note"), unglossed terms, a contested claim stated in the app's voice, a stale number without a date stamp.

**Cost and rate-limit notes** (rough; verify with real usage):

- Menu call: ~1.5k input + ~300 output tokens on Haiku ≈ **$0.003**.
- Card call on Sonnet 5: ~3–6k input (system + context + retrieved search results) and ~600–1,200 output (including thinking) ≈ $0.01–0.03 in tokens, plus **$0.01 per web search** (billed at $10 per 1,000 searches). A card that runs its full budget of 4–6 searches costs $0.05–0.09.
- Per primer: Curious (Overview only) ≈ $0.02–0.05; Conversation (5 cards) ≈ $0.10–0.25; Research (up to 9 cards) ≈ $0.25–0.60. Web search is the dominant cost when budgets are hit; `SEARCH_BUDGET` is the dial.
- Prompt caching: `CARD_SYSTEM` is identical across calls and long enough to be worth caching if usage grows — not wired in the proposed code.
- Rate limits are tier-based per organization. Sequential per-card calls (≤2 in flight) keep request rates trivial for a single-user app.

---

## 7. External dependencies

| Dependency | Used for | Keys / config | Cost / limits |
|---|---|---|---|
| **Anthropic Messages API** | Menu call (Haiku 4.5), card generation (Sonnet 5), web search tool | `ANTHROPIC_API_KEY` as an edge-function secret. Text Wall presumably already has one for its Haiku parsing — reuse it if it's in the same Anthropic org; the name may differ | Haiku $1/$5 per MTok; Sonnet 5 $2/$10 per MTok; web search $10 per 1,000 searches plus tokens for retrieved content; tier-based rate limits |
| **Supabase** — Postgres, Auth, Edge Functions | Storage, ownership, all server logic | Auto-injected `SUPABASE_URL`, `SUPABASE_ANON_KEY` in functions; anon key + URL in the browser (already present in Text Wall) | Free/paid plan limits on edge-function wall-clock time and invocations — check the personal org's plan |
| **supabase-js v2** | Browser client and edge-function client | Browser: Text Wall's existing bundle/CDN import; Deno: `npm:@supabase/supabase-js@2` | — |
| Storage buckets | none | — | — |
| Other libraries | none | — | — |
| Expo / EAS | abandoned with the merge | — | — |
| Claude Code GitHub Action (`anthropics/claude-code-action`) | abandoned with the merge | `ANTHROPIC_API_KEY` as a GitHub Actions secret `[UNVERIFIED]` | — |

Nothing else. Primer never depended on a search API of its own, an embeddings provider, or a storage bucket.

---

## 8. Auth and ownership

### As-is

Nothing implemented. Two `[DESIGN]` decisions were recorded:

1. All LLM calls go through Supabase Edge Functions so the Anthropic key never ships to the client. (Carries over unchanged.)
2. The process handoff flagged that in a mobile app the anon key ships inside the bundle, so **RLS is the auth boundary from day one** — every client-touched table needs policies before the first real user. The open "decide at standup" question (direct client access with RLS vs. Edge Functions for privileged paths) was never decided.

No auth provider, sign-in flow, or user model was chosen. `auth.users` is empty.

### Mapping onto Text Wall `[PROPOSED]`

There is nothing to *convert* — the proposed schema was written to Text Wall's convention from the start:

- Both tables carry `owner uuid not null default auth.uid() references auth.users(id) on delete cascade`.
- RLS policies on both tables are owner-only for `select / insert / update / delete`, scoped to the `authenticated` role, with `anon` revoked (Text Wall is password-primary; there's no anonymous path).
- Client inserts never set `owner`; the column default fills it from the session JWT.
- Edge functions forward the browser's `Authorization` header into their supabase-js client, so they read and write **as the user**: RLS applies, `owner` defaults correctly, and a foreign `primer_id`/`card_id` simply reads as not-found. Neither function touches `SUPABASE_SERVICE_ROLE_KEY`; if a future function must (e.g., a cron cleanup), it has to set `owner` explicitly and filter by it, because the service role bypasses RLS entirely.
- Keep the dashboard's "Verify JWT" setting **on** for both functions so unauthenticated requests are rejected before any code runs.
- Password-primary auth changes nothing here; the functions only need `supabase.auth.getUser()` to succeed on the forwarded token.

Deleting a user cascades through `primers` to `primer_cards`. Deleting a Text Wall `messages` row does *not* delete its primer unless the optional FK in §4 is added with `on delete set null` (proposed) — decide whether a primer should outlive its capture (§12).
