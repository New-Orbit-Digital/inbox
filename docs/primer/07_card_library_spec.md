> **Provenance.** This file is one part of the *Primer → Text Wall Migration Corpus*,
> prepared 2026-08-29 and handed to the Inbox project on 2026-09-02. It was split into
> `docs/primer/*.md` on arrival so each part is small enough to review; **the text of every
> part is verbatim and unedited.** Provenance tags inside — `[VERBATIM]`, `[DESIGN]`,
> `[PROPOSED]`, `[UNVERIFIED]` — are the corpus's own and are defined in
> [00_read_first.md](00_read_first.md). `[PROPOSED]` material has never been run; packets
> 008 and 009 are what run it. Where the corpus contradicts this repo (it predates the
> Inbox rename and assumes dashboard deploys), the packets carry the reconciliation —
> never edit this corpus to match.

## Appendix A — Card Library Specification v0.1 `[VERBATIM]`

Copied unchanged from Primer's project knowledge (`primer-card-library-spec.md`). Its own heading levels are preserved, so `#`/`##` below belong to the spec, not to this corpus. This is the production-prompt source: §5's `CARD_SYSTEM` and `CARD_BLOCKS` were lifted from §2 and §3 of this document.

---

# Primer — Card Library Specification

**Version:** 0.1 (design phase, pre-development)
**Purpose of this document:** Defines every card type, its locked format, length rules by depth mode, and generation guidance. Each card's Generation Guidance section is written to be lifted nearly verbatim into that card's production prompt. This is the consistency layer of the product.

---

## 1. Core Concepts

### 1.1 The carousel
A primer is a horizontal carousel of cards. Card order is fixed (see §4). The carousel grows over time: tapping an expansion chip appends a new card rather than regenerating the primer.

### 1.2 Depth modes (derived, never asked)
Depth is inferred from the coverage menu, not asked directly:

| Selections | Mode | Target total read time |
|---|---|---|
| 0 ("just the basics") | **Curious** | ~1 min |
| 1–2 | **Conversation** | 3–4 min |
| 3+ | **Research** | 5+ min |

Per-card lengths below scale by mode. Depth mode is a property of the whole primer; a card appended later via expansion chip inherits the primer's current mode.

### 1.3 Auto-included vs. selectable cards
- **Always present:** Overview.
- **Auto-included when 1+ coverage options are selected:** Debates & Misconceptions, Further Reading. These are never menu options — they come with every non-Curious primer. Debates is the "fair and factual" promise made visible; it must not be opt-in.
- **Curious mode:** Overview only, ending in expansion chips. Debates & Misconceptions must always appear among the chips.
- **Selectable (menu-driven):** Story, How It Works, Timeline, Key Players & Terms, Key Numbers.

### 1.4 The two-call flow
1. **Menu call** (fast, cheap model): takes the topic (+ brain dump if present) → returns topic type, the 3–5 coverage options to offer with topic-adapted labels, and a familiarity estimate if a brain dump exists.
2. **Primer call(s)**: generates the selected cards. Each card type has its own prompt (this spec, §3). Cards can be generated in one structured call or per-card; per-card allows independent tuning and streaming into the carousel.

---

## 2. Global Style Rules (apply to every card)

1. **Front-load.** First sentence of every card carries its most important content. A reader who stops after sentence one of any card got that card's core.
2. **Prose over bullets** except in Reference-class cards (Timeline, Key Players, Key Numbers), which are scannable by design.
3. **Plain language, defined terms.** Any term of art gets a gloss in parentheses on first use. Never use a term in a card before it's been glossed in that card or the Overview.
4. **No filler.** No "it's important to note," no throat-clearing, no restating the question. Every sentence carries information.
5. **Calibrated confidence.** State settled facts plainly. Flag uncertainty explicitly ("estimates range from X to Y," "disputed"). Never smooth over a range to sound authoritative.
6. **Attribution over assertion for contested claims.** Contested claims are always attributed to who holds them ("critics argue," "the IPCC's central estimate," "Jacobson's group models") — never stated in the app's own voice.
7. **Reading level:** intelligent generalist. Assume zero domain knowledge unless the brain dump shows otherwise; never condescend.
8. **Numbers are approximate by default** ("~14 million," "roughly 200,000–2 million") unless precision is the point.
9. **Recency check.** Any card touching current events, live policy, or fast-moving fields must be generated with web search enabled and reflect the current state, not training-data state.

---

## 3. Card Library

### CARD 0 — Brain Dump (user-authored)

- **What it is:** A freeform text card the user creates *before* requesting a primer — a surface to think out loud, list what they believe they know, and articulate what they're actually trying to figure out.
- **Position:** First card of the carousel. Never edited by the app.
- **How the app uses it (silently):**
  1. **Menu call input:** shapes which coverage options are offered and their labels.
  2. **Familiarity signal:** replaces any explicit familiarity question. A rich dump → skip basics the user demonstrably knows; sparse/absent dump → assume zero knowledge.
  3. **Misconception harvest:** claims in the dump that are wrong or contested are corrected *explicitly and by reference* in the Debates & Misconceptions card ("You mentioned X — that's a common framing, but…"). This exploits the pretesting effect: articulated-then-corrected beliefs are retained better than passively read facts.
- **Rules:** The app never quotes the dump mockingly or evaluatively outside the correction pattern above. Corrections are warm and matter-of-fact.

---

### CARD 1 — Overview (mandatory, always first generated card)

- **Job:** Stand alone as a complete answer. Merges the "one-paragraph version" and the "map" (advance organizer).
- **Locked structure:**
  1. **Para 1 — The answer** (50–70 words): what it is, why it matters, the single most important thing to understand.
  2. **Para 2 — The map** (70–110 words): what kind of topic this is, where it sits (time/place/field), and the 3–4 big ideas the rest of the primer hangs on. Written as prose. In Conversation/Research mode, the big ideas named here must correspond to the cards that follow — the map is the carousel's table of contents in disguise.
- **Length by mode:** Curious 120–180 words · Conversation 150–200 · Research 180–250.
- **Curious mode addendum:** ends with 3–5 **expansion chips** (see §5).
- **Done well when:** a user who reads only this card can say one accurate, non-trivial sentence about the topic to someone else.
- **Failure modes to test against:** para 1 that defines but doesn't explain significance; a "map" that's a list of section names rather than ideas; big ideas that don't match the cards behind them.

---

### CARD 2 — Story (selectable)

- **Job:** The causal throughline. Not "events that happened" but "this led to this because." Narrative is the retention workhorse for historical/social topics.
- **Menu label adapts:** "The story" · "How we got here" · "The history" — per menu call.
- **Locked structure:** continuous prose, 3–5 paragraphs, strictly causal ordering (chronology may bend if causality is clearer another way). Opens with the origin condition, closes with the present-day state or consequence. Every paragraph transition should answer "and therefore / and because of that."
- **Length by mode:** Conversation 250–350 words · Research 400–550.
- **Boundary with How It Works:** Story covers *how the situation came to be*; How It Works covers *how the thing operates*. For a science topic where both are offered, Story = history of the discovery/field, How It Works = the mechanism. The menu call must not offer a label that blurs them.
- **Done well when:** the user can reconstruct the causal chain from memory, even having forgotten the dates.
- **Failure modes:** disguised timeline (sequence without causation); starting the story too early (padding with deep background); hindsight determinism (narrating contingent outcomes as inevitable).

---

### CARD 3 — How It Works (selectable)

- **Job:** Mechanism. For scientific, technical, economic, or institutional topics: what the parts are and how they interact.
- **Menu label adapts:** "How it works" · "The mechanism" · "How the system operates."
- **Locked structure:**
  1. One-sentence statement of the core mechanism.
  2. The chain, in order, as prose or a single ordered sequence (input → steps → output). One analogy to something universally familiar is encouraged; more than one is clutter.
  3. Closing sentence: the key constraint or failure point of the mechanism (what breaks it / limits it) — this is what makes the understanding feel earned.
- **Length by mode:** Conversation 200–300 words · Research 350–450.
- **Done well when:** the user could sketch the mechanism as a diagram from the text alone. (This card is the top candidate for visual enrichment later — write it so a diagram could be generated from it.)
- **Failure modes:** jargon chains where each term is defined by another term; explaining the general category instead of the specific mechanism; omitting the constraint/failure point.

---

### CARD 4 — Timeline (selectable, reference class)

- **Job:** Scannable chronological reference. The card users return to.
- **Locked structure:** a single flat list: `date/period — event, with a clause on why it mattered`. 6–10 entries in Conversation mode, 10–15 in Research. No sub-nesting. Entries chosen for causal significance, not completeness.
- **Rule:** every entry's "why it mattered" clause must be earnest — if an entry has no consequence worth a clause, cut the entry.
- **Done well when:** the entries alone imply the Story card's causal arc.
- **Failure modes:** trivia entries; entries that repeat the Story card verbatim; false precision on disputed dates.

---

### CARD 5 — Key Players & Terms (selectable, reference class)

- **Job:** The cast and the vocabulary. People, organizations, factions, and terms of art the user needs to follow any real discussion of the topic.
- **Locked structure:** two labeled clusters, each a flat list of `name — one-line identification + why they matter`. 4–8 players, 4–8 terms. Conversation mode may drop one cluster if the topic doesn't need it (e.g., few named "players" in a mechanism topic).
- **Rule:** identifications must include the person/org's *stake or position* where relevant, not just their role ("rating agencies — paid by the issuers whose products they rated"), because stakes are what make the cast memorable and the topic legible.
- **Done well when:** the user can follow a podcast or article on the topic without stopping to look anyone up.
- **Failure modes:** encyclopedic completeness; identifications that are titles without stakes; terms defined circularly.

---

### CARD 6 — Key Numbers (selectable, reference class)

- **Job:** The quantitative skeleton — the 5–10 numbers that anchor the topic, each with the comparison that makes it meaningful.
- **Locked structure:** flat list: `figure — what it measures — the comparison or context that gives it meaning`. Every number MUST carry a comparison ("~9% of global electricity — down from 17% in 2000" / "deaths per TWh on par with wind, ~100x lower than coal"). A number without context is banned from this card.
- **Rules:** approximate by default; date-stamp anything volatile ("as of 2026"); generate with web search for anything that moves.
- **Done well when:** the user can deploy two of these numbers in conversation and sound genuinely informed rather than like they memorized statistics.
- **Failure modes:** context-free figures; spurious precision; numbers that are impressive but not load-bearing for understanding.

---

### CARD 7 — Debates & Misconceptions (auto-included; expansion chip in Curious mode)

- **Job:** The fairness card. Two distinct duties that must not blur:
  1. **Misconceptions:** things commonly believed that are *wrong by the evidence*, corrected refutation-style: state the belief, state plainly that it's mistaken, give the correction and the reason. If the user's brain dump contained one, address it by reference, warmly.
  2. **Live debates:** questions where informed, credible people genuinely disagree. Presented with steelman symmetry: each side gets its strongest version, named holders where possible, and **a citation to something that side would itself reference** (their canonical report, paper, or book — not a critic's summary of them).
- **Locked structure:** "What people get wrong" (2–4 items, prose or short list) then "What's genuinely debated" (2–4 debates in Conversation mode, 3–5 in Research; each: the question, side A + their source, side B + their source, and one sentence on what the disagreement actually turns on — the crux assumption).
- **Length by mode:** Conversation 150–250 words · Research 300–450.
- **Hard rules:**
  - Never file a live debate under misconceptions or vice versa. Misclassification in either direction is the card's cardinal failure — it either launders one side's position as fact or manufactures false balance on settled questions.
  - Political valence check: if every "misconception" corrected happens to favor one side of a live political divide, re-audit the card.
  - The app's own voice never takes a side in the debates half. It may and must take a side in the misconceptions half — that's what the evidence is for.
- **Done well when:** a partisan of either side of each debate would say their position was stated fairly.

---

### CARD 8 — Check Yourself (auto-included in Research mode; optional toggle in Conversation; absent in Curious)

- **Job:** Counter the fluency illusion. 2–3 questions the user should be able to answer after the primer; collapsible/skippable in UI.
- **Locked structure:** questions only, no answers printed (tapping a question could reveal the answer — UI decision). Questions must target *causal or structural* understanding ("why did X change the incentives?"), never date-recall.
- **Done well when:** a user who can't answer one knows exactly which card to re-read.

---

### CARD 9 — Further Reading (auto-included when 1+ selections)

- **Job:** The exits. 3–5 sources, each with one line on **why this source and what angle it covers** — never a bare link list.
- **Locked structure:** flat list: `source — its angle/perspective and what it's the best source for`. Composition rule: at least one primary/official source, at least one accessible narrative source; in Research mode, where a Debates card names sides, the canonical source for each side should appear here (may duplicate the Debates citations — that's fine, this card is the collected exit points).
- **Rules:** real sources only, verified current via search where uncertain; note a source's known slant as a feature, not a disclaimer ("Bernanke's memoir — the Fed's self-defense, useful as one side of the debate").
- **Failure modes:** hallucinated sources (fatal — verify); five sources with the same perspective; recommending unreadable primary literature to a Curious-adjacent user.

---

## 4. Card Order (fixed)

`Brain Dump (if any) → Overview → Story → How It Works → Timeline → Key Players & Terms → Key Numbers → Debates & Misconceptions → Check Yourself → Further Reading`

Unselected cards are simply absent; order of the present cards never varies. Expansion-chip cards insert at their canonical position, not at the end. Consistency of position is part of the format promise — users should develop muscle memory for where things live.

---

## 5. Expansion Chips (Curious mode)

- 3–5 chips generated with the Overview, phrased as topics not card names ("the Kashmir dispute it created," not "Timeline").
- Tapping a chip generates a **mini-primer card**: a single card, 100–180 words, Overview-like in structure (answer + micro-map), appended to the carousel at the position of its nearest card-type cousin. It ends with its own 1–2 chips if the sub-topic warrants.
- One chip must always be the Debates & Misconceptions card for the main topic.
- A user who taps 3+ chips is behaviorally in Conversation mode; consider a gentle offer to "build out the full primer."

---

## 6. Menu Call Spec

**Input:** topic string, brain dump text (optional), user locale/date.
**Output (structured):**
```json
{
  "topic_type": "historical | mechanism | cultural | economic | contested-policy | biographical | mixed",
  "coverage_options": [
    {"card_type": "story", "label": "How we got here"},
    {"card_type": "how_it_works", "label": "How the mechanism works"}
  ],
  "familiarity_estimate": "none | partial | informed",
  "dump_claims": [{"claim": "...", "status": "correct | misconception | contested"}],
  "search_recommended": true
}
```
**Rules:** offer 3–5 options; never offer both Story and How It Works with ambiguous labels; only offer Key Numbers where numbers genuinely anchor the topic; `dump_claims` feeds Card 7; `search_recommended` is true for anything post-2023, live, or fast-moving.

---

## 7. Open Questions (to settle in testing)

1. **Per-card vs. single-call generation.** Per-card enables independent tuning and streaming but risks cross-card redundancy (Story and Timeline repeating each other). Likely answer: single structured call at generation time, per-card prompts maintained separately and assembled — test both.
2. **Chip taxonomy drift.** Mini-primer cards from chips are Overview-shaped regardless of content type. Is that consistent enough, or do chips need to map to card types too?
3. **Check Yourself interaction** — reveal-on-tap answers, or answers never shown (forcing re-read)? Retention science mildly favors forcing retrieval; UX may disagree.
4. **Does familiarity need to come back?** Watch for Conversation-mode primers that over-explain to informed users who wrote no brain dump. If it recurs, the fix is probably a chip ("skip the basics — I know this part") rather than a survey question.
5. **Card length enforcement.** Word ranges in this spec are targets for the prompt, not hard validation. Decide whether to validate + retry on gross violations.


---
