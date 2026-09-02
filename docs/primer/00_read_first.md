# Primer → Text Wall Migration Corpus

**Prepared:** 2026-08-29, from the Primer project's planning chat, project knowledge, GitHub connector, and Supabase connector.
**Audience:** a Claude instance working in the Text Wall project with no access to Primer's chats, files, or project knowledge.
**Purpose:** rebuild Primer's functionality as Text Wall's Research segment.

---

## How this corpus is split in this repo

| Part | Corpus sections | What it is for |
|---|---|---|
| [00_read_first.md](00_read_first.md) | header, §1 product summary, §2 feature inventory | why the format is shaped this way; read before changing anything |
| [01_architecture.md](01_architecture.md) | §3 | as-is (nothing) and the proposed shape |
| [02_data_model.md](02_data_model.md) | §4 | the schema — **applied 2026-09-02** as migration `20260902014310_primer_schema` |
| [03_backend.md](03_backend.md) | §5 | `primer-menu` and `primer-card` reference implementations and the prompts — **packet 008's contract** |
| [04_ai_usage.md](04_ai_usage.md) | §6, §7, §8 | models, output schemas, failure modes, cost, dependencies, auth mapping |
| [05_ui.md](05_ui.md) | §9 | `research.html` / `research.js` skeletons — **packet 009's contract** |
| [06_lessons_questions.md](06_lessons_questions.md) | §10–§12 | known issues, migration sequencing, the 18 open questions |
| [07_card_library_spec.md](07_card_library_spec.md) | Appendix A `[VERBATIM]` | **the product.** The card library, locked formats, fixed order |
| [08_sample_primers.md](08_sample_primers.md) | Appendix B `[VERBATIM]` | the five samples — packet 009 U-C's regression fixtures |

**Which of the corpus's 18 open questions (§12) are already answered here**, so no packet re-litigates them:

| # | Question | Answer, and where it was made |
|---|---|---|
| 1 | `messages.id` type | uuid (confirmed 2026-09-02). The optional FK **was added**, `on delete set null` |
| 2 | `kind` value for research captures | `research` — Inbox calls the column `bucket`, and `research` is already in its CHECK constraint (SPEC D-21) |
| 3 | Where the brain dump comes from | Topic only at capture (≤280 chars, the `messages.body` check); the dump is entered in the overlay at tap time (SPEC D-20) |
| 4 | Should a primer outlive its capture | Yes — `on delete set null` (SPEC D-21) |
| 5 / 6 | Anthropic key and its org | `ANTHROPIC_API_KEY`, the name the deployed `classify` already reads. Whether it is *set* as a function secret is packet 008's session-open gate |
| 8 | Web search tool version | `web_search_20250305`, pinned. `web_search_20260209` adds dynamic filtering on 4.6+ models; the support matrix for `claude-sonnet-5` could not be confirmed from the docs on 2026-09-02, so the broadly-supported version wins |
| 10 | Check Yourself reveal policy | Answers reveal on tap (SPEC D-21) |
| 11 | Check Yourself in Conversation mode | Research mode only for v1 (SPEC D-21) |
| 12 | Chip taxonomy | As the corpus's own code does it: every chip spawns a `mini_primer` except the Debates chip, which generates the real Debates card |
| 15 | CORS origin | `https://inbox.justin-dec.workers.dev`, matching `ALLOWED_ORIGIN` in `classify` — not `*` |
| — | "Deploy with Verify JWT on" (§11 sequencing) | **Overruled.** `verify_jwt = false` in `supabase/config.toml` for both functions, with `supabase.auth.getUser()` as the in-code gate and RLS as the boundary (SPEC D-28). The gateway enforces `verify_jwt` ahead of the function body, so `true` would swallow the `?ping=1` deploy proof that D-25 makes mandatory |
| — | Realtime on `primer_cards` (§12 q17) | Enabled 2026-09-02 (`20260902020131_primer_realtime`). The `supabase_realtime` publication previously carried only `public.messages`; without membership a subscription attaches and silently delivers nothing |
| 17 | Realtime vs polling | Realtime. `web/inbox.html` already runs a `postgres_changes` channel; packet 009 extends the pattern to `primer_cards` |
| 18 | Cost ceiling | A per-owner cap of 20 cards per day, enforced server-side in `primer-card` (SPEC D-21) |

Still genuinely open, and flagged in the packets rather than guessed: **7** (edge-function wall-clock limit on this plan — `SEARCH_BUDGET` and `CALL_TIMEOUT_MS` are set conservatively and tuned from real token counts), **9** (Sonnet 5 effort level), **13** (card-length enforcement — prompt targets only for v1), **14** (familiarity estimate stays a stored field with no UI), **16** (the `NewOrbitDigital/primer` repo — a Justin surface).

---

## Read this first

Primer never reached code. What exists is a finished format design (the Card Library Specification), a validated set of five sample primers, a settled interaction design, and a partially stood-up dev environment. There are **no tables, no edge functions, no prompts as artifacts, no app code, no users, and no data** — every one of those was checked directly on 2026-08-29 and the results are recorded in the relevant section below. Nothing needs exporting.

Because sections 3–9 would otherwise be empty, each of them has two parts: **As-is** (what Primer actually has, verified) and **Proposed** (a design written for this corpus against Text Wall's stack). Proposed material has never been run. Treat it as a strong first draft to be verified, not as shipped code.

Every block in this document carries a provenance tag:

| Tag | Meaning |
|---|---|
| `[VERBATIM]` | Copied unchanged from a Primer artifact (spec, sample output, chat). Do not "improve" it — it's the product's IP. |
| `[DESIGN]` | A decision recorded in Primer's planning chat, restated here. |
| `[PROPOSED]` | Written for this corpus, for Text Wall's stack. Never run. Verify before trusting. |
| `[UNVERIFIED]` | Builder-reported or could not be checked from the Primer project. |

How far each `[PROPOSED]` artifact was actually checked before handoff:

| Artifact | Verification done (2026-08-29) | Not done |
|---|---|---|
| §4 migration | Executed inside a `BEGIN … ROLLBACK` transaction on an empty Postgres (Primer's disposable project): 8 policies, 32 columns, 2 triggers, 6 indexes created with no errors | Never run on Text Wall's project; no data exercised; RLS not tested with real sessions |
| §5 `primer-menu`, `primer-card` | Pass a TypeScript syntax/type check (`tsc`, strict off, Deno globals shimmed) | Never deployed, never invoked; no Anthropic call made |
| §9 `research.js` | Parses as an ES module (`node --check`) | Never loaded in a browser; HTML/CSS unrendered |
| §5/§6 prompts | Lifted line-by-line from the spec | Never sent to a model |

Text Wall's target environment, as stated in the migration request: Supabase project `qaabxgldjluqyccwhjzf` in the personal org (Postgres + Deno edge functions), plain HTML/JS with no build step on Cloudflare Workers, Anthropic API (Claude Haiku) for parsing/classification, password-primary Supabase auth, rows owned via an `owner` column keyed to the auth user id, existing tables `messages` (with `kind`), `todo_tags`, `grocery_prefs`, deploys via the Supabase dashboard and Cloudflare's asset uploader. Every mismatch between Primer's design and that environment is flagged inline with **⚠ MISMATCH**.

---

## 1. Product summary

### What Primer does

Primer is a research aid that generates a consistently formatted educational overview ("a primer") on any topic the user names. The goal is **orientation-level familiarity** — enough context to follow a conversation, read an article, or decide whether to go deeper — not expertise. The product promise is "fair and factual": contested questions are presented with both sides steelmanned and sourced, and common misconceptions are corrected explicitly.

The consistency is the product. Every primer is built from a fixed library of card types with locked formats, so a user who has read three primers knows exactly where everything lives in the fourth.

### The core loop

```
INPUT                        PROCESSING                                   OUTPUT
─────                        ──────────                                   ──────
topic                 ──►    Menu call (fast, cheap model):        ──►    3–5 coverage options with
+ optional brain dump        classify topic type, choose which             topic-adapted labels
                             card types to offer, read the dump

user taps 0–5 options ──►    Depth mode inferred from the count:    ──►    a carousel of cards in
                             0 = curious, 1–2 = conversation,               fixed order, generated
                             3+ = research. Generate one card               one card at a time
                             per selection + the auto-included
                             cards (Overview always; Debates &
                             Further Reading when ≥1 selected)

user taps an          ──►    Generate a single mini-primer card     ──►    card appended to the
expansion chip               on that sub-topic                              same carousel
```

The two-call shape (cheap menu call, then per-card generation) is deliberate: the menu call makes the app feel bespoke per topic, while every option maps to a card type with a locked format so the output stays consistent.

### Why the format is shaped this way `[VERBATIM]` — research synthesis from the concept phase

The following is the learning-science synthesis produced at the start of the project. It's the justification for every locked format decision; a rebuild that "simplifies" the format should re-read this first.

> **What the learning science says about "orientation-level" knowledge**
>
> 1. **Give the frame before the facts.** The best-supported idea for exactly your use case is Ausubel's "advance organizer": information presented prior to learning that the learner uses to organize and interpret incoming information, acting as "ideational scaffolding" — a frame of reference for assimilating new material. Practically: every primer should open with a short "map" — what kind of thing this is, where it sits, the 3–4 big ideas — before any detail. The most general ideas come first, then get progressively differentiated in detail.
>
> 2. **Front-load ruthlessly.** The inverted pyramid works because it matches how people actually read on screens — a reader who stops early still walks away with the core. Implication: the first paragraph of every primer should be able to stand alone as the whole answer.
>
> 3. **Your consistent format is itself a retention feature.** Cognitive load theory distinguishes the inherent complexity of material from extraneous load — noise around the information, like poor structure — which should be minimized, and recommends chunking content into small components of related information. Once a user learns your template, they spend zero attention on navigation and all of it on content. This is your strongest scientific argument for the product.
>
> 4. **Anchor to prior knowledge.** New information is retained far more effectively when consciously connected to existing knowledge rather than absorbed in isolation. This is where your follow-up questions earn their keep: the single biggest moderator of what format works is what the user already knows. "Compared to what you know about X, this is like…" beats neutral encyclopedia voice.
>
> 5. **Use narrative for the causal core, lists for reference.** For historical/causal topics, a causal throughline ("this led to this because…") is retained better than disconnected facts — but structured reference material (timelines, key figures) is better for lookup. The hybrid exists in journalism: the hourglass format opens with a summary and key details, then shifts into narrative — effective for stories needing both urgency and context. Your primer should do both: brief narrative arc, then structured reference sections.
>
> **On the brain-dump card:** there's a documented "pretesting/generation effect" — attempting to articulate what you know *before* learning improves retention of the correction, even when your guesses are wrong. So the card isn't just idea refinement; if the app parses the dump, it can (a) skip what the user already knows, (b) explicitly correct misconceptions (refutation-style corrections are more durable than just stating facts), and (c) anchor new material to their existing schema. I'd make the dump an input to primer generation, not a separate surface.
>
> **One caution:** smooth, well-formatted summaries create a fluency illusion — people feel confident without retaining much.

The fluency-illusion caution is what the Check Yourself card exists to counter.

### Honest status

| Area | Status | Evidence (checked 2026-08-29) |
|---|---|---|
| Concept & learning-science research | Done | Planning chat, Aug 2026 |
| Format design | Done — Card Library Specification v0.1 (Appendix A) | Project knowledge |
| Sample primers | Done — 5 samples across topic types and depth modes (Appendix B). Generated against format v0, *before* the card library was finalized | Planning chat |
| UI / interaction design | Decided in prose; no mockups, no screens built | Planning chat; §9 |
| Prompts | **Not written.** Spec §3 was written to be lifted into prompts, but no prompt artifact exists | — |
| Data model | **Not designed.** | Supabase project has 0 tables |
| Backend | **None.** | `list_edge_functions` → `[]` |
| App code | **None.** No unit of work was ever filed | Repo unreadable from the planning chat; standup never completed |
| Dev-environment standup | Partial: private repo `NewOrbitDigital/primer` created; Claude GitHub App installed `[UNVERIFIED]`; Supabase project `dihrtmwbaycmilvcvcom` created in the free "Playground" org; connectors wired. **Blocked**: the planning chat's GitHub connector has no private-repo scope and 404s on the repo | Connector results |
| Users / data | None. `auth.users` = 0, `storage.buckets` = 0 | SQL |

### What's finished, half-built, or abandoned, and why

- **Finished:** the format (spec), the interaction model, the evidence that the format works (samples).
- **Half-built:** the dev environment. The last action item in the planning chat was "reconnect the GitHub connector with private-repo scope, or make the repo public, then say go." It never got a "go." No smoke test, no doc scaffold, no first unit.
- **Abandoned (by this merge):** the standalone Expo/Android app and its executor pipe (GitHub issue → Claude Code Action → PR → merge). Text Wall is plain HTML/JS deployed by dashboard upload, so neither the mobile shell nor the pipe carries over.
- **Explicitly tried and dropped during design:** an explicit "How familiar are you?" question (replaced by parsing the brain dump); an explicit "What's this for?" question (collapsed into depth-by-selection-count); flexible section order by purpose (rejected — fixed order *is* the consistency promise); visual/diagram enrichment (deferred until the text loop is proven).

---

## 2. Feature inventory

Status vocabulary: **designed** = specified in Appendix A and/or decided in chat; nothing is built. Recommendation is for the Text Wall merge.

**F1 — Brain dump (Card 0)**
Behavior: before requesting a primer, the user can free-write what they think they know and what they're trying to figure out. It's the first card of the carousel and is never edited by the app.
Inputs → outputs: user text → silently feeds the menu call (which options to offer), the familiarity estimate, and the misconception harvest (wrong/contested claims corrected by reference in the Debates card).
Status: designed.
Recommendation: **KEEP.** Maps cleanly onto Text Wall's capture model — a research capture's body beyond the topic line *is* the brain dump.

**F2 — Topic entry**
Behavior: user names a topic in a sentence or phrase.
Inputs → outputs: string → `primers` row.
Status: designed.
Recommendation: **KEEP**, as a `messages` capture with a new `kind` (see §11 for the collision).

**F3 — Menu call (topic-adapted coverage options)**
Behavior: after the topic is entered, the app offers 3–5 tappable coverage options whose labels adapt to the topic ("How we got here", "How the vaccine works", "Who's who"). Every option maps to one card type.
Inputs → outputs: topic + brain dump + date → `{topic_type, coverage_options[], familiarity_estimate, dump_claims[], search_recommended}` (schema in Appendix A §6).
Status: designed.
Recommendation: **KEEP.** This is the Haiku call; it matches Text Wall's existing model use.

**F4 — Depth mode inferred from selection count**
Behavior: the user never picks a length. 0 selections ("just the basics") = Curious (~1 min); 1–2 = Conversation (3–4 min); 3+ = Research (5+ min). The UI shows the resulting read time as the user taps.
Inputs → outputs: selection count → mode → per-card word targets.
Status: designed.
Recommendation: **KEEP** exactly as specified. This mechanic replaced two questions and is the cleanest part of the design.

**F5 — Overview card** (mandatory)
Behavior: the one card that stands alone: the answer paragraph, then the map paragraph naming the 3–4 big ideas the rest of the primer hangs on. In Curious mode it ends with expansion chips.
Status: designed.
Recommendation: **KEEP.**

**F6 — Story card** (selectable)
Behavior: the causal throughline in 3–5 paragraphs.
Status: designed.
Recommendation: **KEEP.**

**F7 — How It Works card** (selectable)
Behavior: mechanism: one-sentence core, the chain in order, one analogy, closing constraint.
Status: designed.
Recommendation: **KEEP.** Spec flags it as the top candidate for later visual enrichment.

**F8 — Timeline card** (selectable, reference class)
Behavior: flat list of `when — event — why it mattered`, 6–10 entries (conversation) or 10–15 (research).
Status: designed.
Recommendation: **KEEP.**

**F9 — Key Players & Terms card** (selectable, reference class)
Behavior: two clusters — players with stakes, terms with definitions.
Status: designed.
Recommendation: **KEEP.**

**F10 — Key Numbers card** (selectable, reference class)
Behavior: 5–10 numbers, each with a comparison; date-stamped; generated with web search.
Status: designed.
Recommendation: **KEEP**, but only offered when the menu call judges numbers to anchor the topic.

**F11 — Debates & Misconceptions card** (auto-included whenever ≥1 option is selected; a mandatory chip in Curious mode)
Behavior: "What people get wrong" (refutation-style corrections, including any from the brain dump) then "What's genuinely debated" (each side steelmanned, named, and cited to its own canonical source, plus the crux).
Status: designed.
Recommendation: **KEEP, never make opt-in.** This is the differentiator and the fairness promise.

**F12 — Check Yourself card** (auto in Research; optional toggle in Conversation; absent in Curious)
Behavior: 2–3 causal/structural questions; answers hidden until tapped (UI decision still open in the spec).
Status: designed; reveal policy undecided.
Recommendation: **RETHINK → ship simplest form.** Generate it in Research mode only for v1, answers revealed on tap. Add the Conversation-mode toggle later if anyone asks.

**F13 — Further Reading card** (auto-included whenever ≥1 option is selected)
Behavior: 3–5 real, verified sources, each with a line on its angle and slant; composition rule (≥1 primary, ≥1 narrative, both sides of any named debate).
Status: designed.
Recommendation: **KEEP**, with web-search verification of every source. Hallucinated sources are the spec's "fatal" failure mode.

**F14 — Expansion chips → mini-primer cards**
Behavior: in Curious mode the Overview ends with 3–5 chips phrased as sub-topics. Tapping one appends a single Overview-shaped mini-primer card (100–180 words) at the position of its nearest card-type cousin; it may end with 1–2 chips of its own.
Status: designed.
Recommendation: **KEEP**, with the taxonomy-drift question (Appendix A §7.2) parked.

**F15 — "Build out the full primer" nudge**
Behavior: a user who taps 3+ chips is behaviorally in Conversation mode; the spec suggests a gentle offer to build the full primer.
Status: idea only.
Recommendation: **KILL for v1.** Cheap to add later; it complicates state now.

**F16 — Fixed carousel order**
Behavior: `Brain Dump → Overview → Story → How It Works → Timeline → Key Players → Key Numbers → Debates → Check Yourself → Further Reading`. Absent cards are simply skipped; present cards never reorder; chip cards insert at their canonical slot.
Status: designed.
Recommendation: **KEEP.** Position consistency is part of the format promise.

**F17 — Recency via web search**
Behavior: any card touching current events, live policy, fast-moving fields, or volatile numbers is generated with web search on.
Status: designed.
Recommendation: **KEEP.** ⚠ MISMATCH: Text Wall uses Haiku only. Card generation needs a Sonnet-class model with the Anthropic web search tool (decision taken for this corpus: Haiku for the menu call, Sonnet 5 + web search for cards). See §6 and §7.

**F18 — Familiarity estimate**
Behavior: the menu call estimates `none | partial | informed` from the brain dump; card prompts use it to skip basics the user demonstrably knows.
Status: designed; spec §7.4 suspects it may not be needed.
Recommendation: **KEEP as a stored field, no UI.** Revisit only if Conversation-mode primers over-explain to informed users.

**F19 — Streaming cards into the carousel**
Behavior: cards appear one by one as each finishes rather than the whole primer at once.
Status: implied by the per-card generation design.
Recommendation: **KEEP** via per-card edge-function calls (§5). Skeleton cards render immediately; each fills in as its call returns.

**F20 — Expo/Android native app shell**
Status: never built.
Recommendation: **KILL.** Text Wall's plain-HTML carousel replaces it.

**F21 — GitHub executor pipe (issue → Claude Code Action → PR → merge)**
Status: workflow file possibly committed `[UNVERIFIED]`; never smoke-tested.
Recommendation: **KILL for Text Wall** (dashboard deploys); keep the process doc's *verification standard* (predict → fire → verify against the running system) as a habit.

---
