# Build Packet 009 — Primer UI: the Research segment, the capture hook, the regression fixtures

**Prepared:** 2026-09-02 · prep session with Justin · contracts pinned against the Primer corpus §9 (`docs/primer/05_ui.md`), Appendix A (`docs/primer/07_card_library_spec.md`) and Appendix B (`docs/primer/08_sample_primers.md`)
**Risk class:** moderate. No schema change, and the money is already spent by packet 008's functions — this packet is what makes the output legible. Its real risk is quiet format drift: a renderer that silently drops a field the spec locks, so a card *looks* fine and isn't.
**Merge policy:** auto-merge on PASS authorized for U009-A and U009-B. U009-C is documentation plus one small affordance; auto-merge applies.
**Concurrency:** run ALONE among the web packets — last in the serial chain 003 → 004 → 005 → 006 → 007 → 009, all of which edit `web/inbox.html`. Packet 008 must be COMPLETE first, not merely running — and note that **008 ships two functions nothing has yet been able to call**, so this packet's first primer is where they are actually proven.
**Deploy surface:** Worker only (`web/**`). `deploy-supabase` must stay idle all run: no unit touches `supabase/`.
**DB prep status:** no DDL and none needed. `primers` and `primer_cards` are live and certified (migration `20260902014310_primer_schema`, applied 2026-09-02: 32 columns, 8 policies, 2 triggers, 6 indexes, RLS on both, `primers_message_fk` present), and **both tables are on the `supabase_realtime` publication** (migration `20260902020131_primer_realtime`, applied the same day — the publication previously carried only `public.messages`, enabled out-of-band through the dashboard, which is why no earlier migration mentions it). Without that membership U009-A's subscription would attach and silently deliver nothing. This packet only reads and writes rows through RLS as the signed-in user.
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge only after posting an explicit PASS.

**Prep already done — do not redo:**
- **The corpus's `research.html` / `research.js` skeletons are in the repo** at `docs/primer/05_ui.md`. They are `[PROPOSED]` — they parse and have never been loaded in a browser. They are the **shape** to build, not code to paste, and four things about them are wrong for this repo (below).
- **Four reconciliations, ruled 2026-09-02, that the corpus could not know:**
  1. **No ES module import.** The skeleton does `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"`. `web/inbox.html` already loads supabase-js as a UMD bundle from jsdelivr and builds one client inside its IIFE. `research.js` is a **classic script** that creates no client and imports nothing; the app hands it the existing one.
  2. **No `alert()`, ever.** The skeleton uses `alert()` in four places. Packets 005 and 006 banned native dialogs outright — they break a PWA on Android. Inline messages only.
  3. **No classifier hook.** The skeleton assumes a Haiku classifier routes `kind='research'` captures. After packet 004 there is no classifier: capture is tab-scoped and a Research capture already inserts `bucket='research'` directly. The hook is a tap on that row, not a model call.
  4. **The brain dump is entered in the overlay, not at capture** (SPEC D-20). `messages.body` is 1–280 chars, which is why the topic is the capture and the dump lives on `primers.brain_dump`.
- **The corpus's 18 open questions are already answered** where they touch this packet — see the table in `docs/primer/00_read_first.md`. Check Yourself reveals on tap via `<details>` and is research-mode only; chips spawn `mini_primer` cards except the Debates chip; card updates arrive over Realtime, not polling. **Do not re-litigate these.**
- **Live counts 2026-09-02:** `primers` 0, `primer_cards` 0, `messages` with `bucket='research'`: 10 (7 open, 3 done). Those 10 rows are captures with no primer attached; they must keep rendering after this packet, and U009-B is what lets Justin turn one into a primer.
- **`web/inbox.html` already runs a Realtime channel** (`db.channel('inbox')` on `postgres_changes` for `messages`). U009-A extends that pattern; it does not invent one.

## Hard constraints (verbatim, non-negotiable)

1. **The card renderer must render every field the spec locks.** For each of the ten card types, every key in the `body` shape documented in `docs/primer/04_ai_usage.md` appears on screen. **A dropped field is a FAIL**, not a styling choice — the locked format *is* the product (Appendix A §2). The proof is a field-coverage table, below.
2. **No `alert()`, `confirm()` or `prompt()` anywhere.** `grep -rn "alert(\|confirm(\|prompt(" web/` → empty at close-out (note the `-r`; without it `grep` errors on the directory rather than returning empty).
3. **No `import` statement and no new network dependency.** `web/` has no build step and `research.js` is a classic script. `grep -nE "esm\.sh|^import |createClient" web/research.js` → empty. (One pattern, used identically in every proof below.)
4. **No model call from the client, ever.** All generation goes through packet 008's functions via `supabase.functions.invoke`. `grep -rc "api.anthropic.com" web/` → `0` for every file.
5. **No DDL, no `supabase/` edit, never touch `.github/workflows/`.**
6. One unit per issue. Branch `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop.
7. **Secret placeholders in every issue:** names only, examples WITHOUT angle brackets.
8. **Supabase connector discipline:** ONLY **Supabase Inbox** (`qaabxgldjluqyccwhjzf`).
9. **No drag-and-drop** (D-08). The carousel is CSS scroll-snap with no JS gesture handling — the corpus is explicit that nothing in this UI assumes a desktop.
10. **In-scope files, exhaustively:** U009-A → `web/research.js` (new), `web/inbox.html`, `web/config.js` (**version bump line only**). U009-B → `web/inbox.html`, `web/research.js`, `web/config.js` (**version bump line only**). U009-C → `web/research.js`, `web/config.js` (**version bump line only**), `docs/packets/primer_regression_fixtures.md` (new). **Not `docs/primer/`** — every file there carries the banner "the text of every part is verbatim and unedited" and `00_read_first.md` enumerates parts 00–08; an executor-authored tenth file in that namespace would make both untrue.
11. **`INBOX_VERSION` bumps in every unit** (`009-A`, `009-B`, `009-C`).

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first** (docs-only PR on a planner branch, merged by you).
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md` and all of `docs/primer/` via the GitHub connector. Connector down → STOP.
- Ordering gate: `docs/packets/INDEX.md` shows **007 COMPLETE and 008 COMPLETE**. Either one short of that → STOP.
- Supabase Inbox binding: `select count(*) from todo_tags` returns a number.
- **Premise gate (literal):** both functions answer their pings —
  `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/primer-menu?ping=1` → `{"primer_menu_version":"008-A"}` and `…/primer-card?ping=1` → `{"primer_card_version":"008-B"}`. Either stale or missing → STOP (this packet is a client for functions that must already work).
- Deploy-state gate: `https://inbox.justin-dec.workers.dev/config.js` contains `window.INBOX_VERSION = "007-B";`.
- **Realtime gate (literal):** `select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public';` includes **`primer_cards`**. Missing → STOP: U009-A's subscription would attach and deliver nothing, and the failure is silent. (Applied 2026-09-02 as `20260902020131_primer_realtime`; the gate exists because publication membership is invisible to the schema readback.)
- **No data gate, and that is deliberate.** `primers` and `primer_cards` are expected to be **empty** at open: packet 008's functions require a signed-in user's JWT, and this packet builds the only thing that can produce one. **U009-A's first primer is therefore also packet 008's first real run** — budget for that in the adjudication, and if a card comes back wrong in a way that is about wording rather than rendering, file it against 008, whose prompts are the contract.
- File-size gate: list `web/` with sizes; any file over 300 KB → finding.

---

## U009-A — `web/research.js` and the Research segment

**Why:** packet 008 fills two tables with structured JSON that nothing can read. This is the unit that turns them into the carousel the format was designed for — and the fixed card order is the product promise, so the renderer is where that promise is kept or broken.
**Scope:** `web/research.js` (new), `web/inbox.html`, `web/config.js` (version bump only). Nothing else.

### Pinned contract — the seam

- `web/inbox.html` loads `<script src="research.js"></script>` **after** `config.js` and **before** its own inline script.
- **The container, pinned.** `web/inbox.html` gains exactly one element, inside `<div id="app">`, immediately before `<ul id="list">`:
  `<section id="research" hidden></section>`
  Everything the Research segment draws lives inside it. `research.js` also injects its own `<style id="research-css">` once on first mount and never again — the carousel's scroll-snap strip, card, eyebrow, skeleton and chip rules live there, not in `inbox.html`'s style block, so the segment stays self-contained and `inbox.html` does not grow by a screenful of CSS. The corpus's `research.html` `<style>` block in `docs/primer/05_ui.md` is the starting point; Inbox's tokens (`--card`, `--line`, `--ink`, `--dim`, `--research`) replace its fallbacks.
- `research.js` defines exactly one global, `window.Research`, exposing `mount(ctx)`, `render()`, and `createPrimer(topic, brainDump, messageId)`. It creates no Supabase client, reads no config, and **touches no DOM outside `#research` and the sheet it is handed**.
- The app's IIFE calls, once, after auth resolves:
  `window.Research.mount({ db: db, root: document.getElementById('research'), user: function(){ return user; }, notify: appNote, openSheet: openSheet, closeSheet: closeSheet })`
  — `openSheet` and `closeSheet` are packet 005 U-C's generic sheet API, passed in because the sheet element lives **outside** `#app` and `research.js` must not reach for it directly. U009-B is what uses them. Every Supabase call inside `research.js` goes through `ctx.db`.
- **`notify` needs a surface that exists when signed in, and today there is none.** The app's only inline-message function is `note(msg, kind)`, writing to `#gateNote` — which lives inside `<div id="gate">` and is hidden the moment a user is signed in, so every message written through it is invisible. This unit adds the signed-in equivalent and it is a pinned part of the contract: an element `<p id="appNote" role="status" aria-live="polite"></p>` in `#app` directly under the header, and `function appNote(msg, kind)` mirroring `note`'s signature and its `.err` / `.ok` classes, clearing itself after the next successful action. `note` and `#gateNote` are untouched; they remain the signed-out surface.
- When `filter === 'research'`, the app un-hides `#research` and calls `window.Research.render()` instead of its generic list; every other section hides it again. **No other section's rendering changes.**

### Pinned contract — the four states (corpus §9, `docs/primer/05_ui.md`)

**1. Research list** — the entry point, and it shows **both** kinds of row, which the corpus skeleton did not have to handle:
- Existing `messages` rows with `bucket='research'` (the 10 captures live today), each showing its body and a "Start primer" affordance — that affordance is U009-B's; in this unit the rows render and tap does nothing new.
- `primers` rows: topic, depth mode, status pill, date. Tapping opens the carousel.
- Empty state copy, verbatim from the corpus: `No primers yet. Name a topic and get oriented in a minute.`
- Primary action: **New primer**.

**2. New primer** — two fields, exactly as the corpus specifies: Topic (single line, required) and Brain dump (textarea, optional) with the corpus's placeholder verbatim: `What you think you know, and what you're trying to figure out. The primer uses this to skip what you know and correct what's off.` One button, `Get options`, which reads `Reading your topic…` and is disabled while the menu call runs.

**3. Coverage menu** — options from `primers.menu.coverage_options` as toggle chips with their topic-adapted labels. A live read-time line driven by the selection count: `Just the basics · ~1 min read` (0) / `1 selected · 3–4 min read` / `3 selected · 5+ min read`. The footnote, verbatim: `Every primer with selections includes what's debated and further reading.` Button: `Build primer`, sticky at the bottom.
- `depthFor(n)`: `0 → curious`, `1–2 → conversation`, `3+ → research`. One definition, used everywhere.
- `buildPrimer` inserts the card rows in canonical order per the corpus: `overview`, then each selection, then `debates` and `further_reading` **if ≥1 selected**, then `check_yourself` **if research mode**. Positions from the `SLOT` map — 1 overview, 2 story, 3 how_it_works, 4 timeline, 5 key_players, 6 key_numbers, 7 debates, 8 check_yourself, 9 further_reading.

**4. Carousel** — horizontal CSS scroll-snap strip, cards in canonical order, brain dump first as a virtual Card 0 when present.
- Every card carries an **eyebrow** with its slot label. Pending cards render as skeletons **with the eyebrow already in place** — the user sees the table of contents before the content arrives. This is specified behaviour, not a loading nicety.
- Error cards show the message and a `Try again` button calling `generate(cardId, true)`.
- Chips render as a row of buttons under the Overview and under mini-primers.
- **Card 0 is never editable here.** `primers.brain_dump` is written once, in U009-B's overlay.

### Pinned contract — the pipeline

Port the corpus's `runPipeline` order exactly, because it encodes real dependencies: overview alone first and awaited; then the selected cards plus `debates`, **at most two in flight** (`pool(tasks, 2)`); then `further_reading` (it needs the Debates card's sources); then `check_yourself` (it needs every ready card). A unit that parallelises further, or reorders these, = FAIL — the edge function will answer `409` and the cards will disagree with each other.

**Errors must carry the function's own message.** The corpus's `generate()` does `error?.message ?? data?.error ?? "Generation failed"`, and on any non-2xx `supabase.functions.invoke` rejects with a `FunctionsHttpError` whose `.message` is the generic *"Edge Function returned a non-2xx status code"* — the real body is only reachable through `error.context`. Packet 008 spends real care distinguishing `404`, `409`, `429` and `500` with distinct bodies, and every one of them would be thrown away. **Pinned:** on a rejection, read `error.context` (a `Response`), `await` its JSON, and use its `error` field as the card's message, falling back to the generic string only when the body cannot be read. Surface the **429** case specially — `daily card limit reached (20)` is the one message Justin most needs to see, and a "Try again" button that silently does nothing all day is the failure this pin exists to prevent.

**Resume on open:** `openPrimer` re-reads the primer and its cards; `pending` cards are generated, `error` cards wait for a tap. A primer at `menu_ready` reopens on the menu, not the carousel.

**Realtime:** subscribe to `postgres_changes` on `public.primer_cards` filtered to the open primer (`filter: 'primer_id=eq.<id>'`) and patch state on each event, reusing the existing channel pattern in `inbox.html`. The invoke's own return still patches the card — Realtime is the belt to that braces, so a tab left open finishes correctly. Unsubscribe when the carousel closes; a channel left open per primer is a leak and a FAIL.

### Pinned contract — `renderCard`, per type

For each type, every documented `body` key reaches the screen:

| card_type | must render |
|---|---|
| `overview` | `answer` paragraph, then `map` paragraph, then chips (curious mode) |
| `story` | every entry of `paragraphs`, in order, as separate paragraphs |
| `how_it_works` | `core` first; `chain` as an ordered list; `analogy` when non-null; `constraint` last, visually distinct — it is the point of the card |
| `timeline` | every entry's `when`, `event` **and** `why_it_mattered`. Dropping `why_it_mattered` is the classic failure and is a FAIL |
| `key_players` | `players` as name + identification + `why_they_matter`; `terms` as term + definition; either cluster may be empty |
| `key_numbers` | every number's `figure`, `measures`, `context`, and `as_of` when non-null. **`context` is mandatory on screen** — a number without its comparison is banned by the spec |
| `debates` | `misconceptions` (belief, correction, reason, **and `from_brain_dump` — when true the item is marked as coming from the user's own notes**, which is the visible payoff of the whole brain-dump mechanic) and `debates` (question, side_a and side_b each with position/holders/source, and `crux`) **under two visibly separate headings**. Never merge or interleave them: the whole fairness contract is that a misconception and a live debate look different |
| `check_yourself` | each item as `<details><summary>{question}</summary>` with `{answer}` and `{reread}` **inside the details body, after the summary** — so the answer is hidden until tapped (D-21). The answer must never sit inside `<summary>`; that reveals it on render and defeats the card, which exists to counter the fluency illusion |
| `further_reading` | every source's `title`, `creator`, `kind` and `angle`; `url` as a link opening in a new tab (`rel="noopener"`) when non-null, and plain text when null |
| `mini_primer` | `answer`, `micro_map`, then its own chips |

- `body.sources_used`, appended by the function, renders as a small "checked against" list when non-empty. It is evidence, not decoration.
- **Escaping:** all model output is untrusted text. Use the corpus's `esc()` for every interpolation, and its `ital()` only where the prompts permit `*italics*` for titles of works. `innerHTML` with unescaped model output = FAIL.

**What-survives proof (required in the PR body):**
1. **Field-coverage table:** ten rows, one per card type, listing every documented `body` key and the line in `research.js` that renders it. Missing key = FAIL. This is the unit's central proof.
2. `grep -rn "alert(\|confirm(\|prompt(" web/` → empty.
3. `grep -nE "esm\.sh|^import |createClient" web/research.js` → empty.
4. `grep -c "api.anthropic.com" web/research.js web/inbox.html` → `0` and `0`.
5. `grep -n "window.Research" web/research.js web/inbox.html` → one definition, one mount call, one render call.
6. `grep -n "innerHTML\|insertAdjacentHTML" web/research.js` — every hit annotated with what escapes its inputs.
7. `grep -n "removeChannel\|unsubscribe" web/research.js` → the carousel's teardown.
8. `grep -n "id=\"research\"\|research-css\|appNote" web/inbox.html web/research.js` — the container element, the injected style tag created exactly once, the `#appNote` element and the `appNote(msg, kind)` function. Quote each.
9. `grep -n "error.context" web/research.js` → the unwrap that surfaces the function's own message, with the 429 case named.
10. `node --check web/research.js` output and exit code.
11. `git diff --stat main` — three files, one new.

**Adjudication:** PASS shape = one new classic script, one mount seam in `inbox.html`, the version bump; `#research` and `#appNote` present; `research-css` injected once; four states; canonical order; pipeline order and concurrency of 2; all ten renderers complete; every interpolation escaped; the function's own error body unwrapped from `error.context`; Realtime subscribed and torn down. FAIL on: an `import`; a client created in `research.js`; a native dialog; a dropped `body` field; misconceptions and debates rendered together; `check_yourself`'s answer inside `<summary>`; the pipeline reordered or widened; a model call; unescaped model output; messages routed to `#gateNote` instead of `#appNote`; the generic invoke error shown where the function sent a specific one; carousel CSS added to `inbox.html` instead of the injected style tag; another section's rendering changed; version not bumped to `009-A`.

**STOP conditions:** either function's ping is stale (premise gate); `primer_cards` is missing from the `supabase_realtime` publication (realtime gate); **`openSheet` / `closeSheet` are absent from `web/inbox.html`** — the mount call references them, and an undeclared identifier there is a `ReferenceError` that breaks the entire app, not just Research, so this is a stop before the first line is written. **An empty `primers` table is NOT a stop** — it is the expected state, and this unit is what fills it.

---

## U009-B — capture hook and the overlay brain dump

**Why:** SPEC D-20 splits research capture in two — the topic is caught in 280 characters at the moment of the thought, and the brain dump is written later, when Justin sits down with it. This is the unit that joins those halves and links a primer back to the capture that started it.
**Scope:** `web/inbox.html`, `web/research.js`, `web/config.js` (version bump only). File after Justin confirms U009-A.

### Pinned contract

**Research capture is unchanged** — capturing on the Research section still inserts `{session:'personal', body:text, owner, bucket:'research'}`. No model call, no classifier, no primer created at capture time.

**Tapping a `bucket='research'` message** opens the packet-005 sheet via `openSheet(buildFn, label)` with the label `Start a primer`, containing:
1. The capture's text as the **topic**, editable in a single-line input, prefilled from `messages.body`.
2. A **brain dump** textarea, empty, with the corpus's placeholder verbatim.
3. `Get options` — inserts the `primers` row with `topic`, `brain_dump` (null when blank) **and `message_id` set to the message's id**, calls `primer-menu`, closes the sheet, switches to Research, and opens the coverage menu for the new primer.
4. `Close`.

- **A message that already has a primer** (`select id from primers where message_id = <id>`) opens that primer's carousel or menu instead, with no second insert. Check before rendering the sheet, not after the tap.
- `message_id` is why the FK exists; `on delete set null` means deleting the capture leaves the primer standing (SPEC D-21).
- **The share target from packet 007 lands here unchanged** — it prefills the Research capture box, Justin taps Add, and the row is then a primer waiting to be started. Do not special-case shared text.

**The New primer form from U009-A stays.** Two doors, one destination: `createPrimer(topic, brainDump, messageId)` with `messageId` null from the form and set from the sheet.

**Brain dump, written once:** if `primers.brain_dump` is already non-null, the sheet shows it read-only with a line saying it was used to build this primer. Regenerating a primer against an edited dump is out of scope for v1 and is a finding, not an improvisation.

**What-survives proof (required in the PR body):**
1. `grep -n "createPrimer" web/research.js web/inbox.html` → one definition, two call sites (form, sheet).
2. `grep -n "message_id" web/research.js` → the insert and the already-linked lookup.
3. `grep -c "id=\"sheet\"" web/inbox.html` → `1` — packet 005's element, reused through `openSheet`.
4. `grep -rn "alert(\|confirm(\|prompt(" web/` → empty.
5. A stated walk-through of the three entry paths — New primer form, research-capture tap, packet-007 share — naming which produces a `message_id`.
6. `node --check web/research.js`; `git diff --stat main` — three files.

**Adjudication:** PASS shape = three files; one `createPrimer`; the 005 sheet reused, not reimplemented; `message_id` set from the capture path and null from the form; an already-linked message opening its existing primer; the brain dump read-only once written. FAIL on: a second sheet implementation; a primer created at capture time; a duplicate primer for a message that already has one; a native dialog; research capture's insert shape changed; version not bumped to `009-B`.

**STOP conditions:** `openSheet` is absent from `main` (packet 005 U-C did not land as contracted) — record what IS there.

---

## U009-C — the five regression fixtures

**Why:** the corpus's five sample primers are the only evidence that the format works, and they were generated **before** the card library was locked. Regenerating them through the real pipeline and comparing card-by-card is the only check that the rebuild kept the product. Without it, format drift is invisible until Justin notices a primer feels worse.
**Scope:** `docs/packets/primer_regression_fixtures.md` (new), `web/research.js`, `web/config.js` (version bump only). **Not `docs/primer/`** — see hard constraint 10. File after Justin confirms U009-B.

### Pinned contract — the document

`docs/packets/primer_regression_fixtures.md`, one section per fixture, drawn from `docs/primer/08_sample_primers.md`:

| # | Topic | Mode to run | What it is the reference for |
|---|---|---|---|
| 1 | The Partition of India | curious | Curious-mode Overview and chip phrasing |
| 2 | mRNA Vaccines | conversation | The Story ↔ How It Works boundary — the sample drifted into history when the user wanted mechanism, which is *why* they are separate cards |
| 3 | K-pop as a Global Industry | curious | Curious-mode Overview and chip phrasing |
| 4 | The 2008 Financial Crisis | conversation | Misconception handling |
| 5 | Nuclear Energy in Climate Policy | research | **How a Debates card must read** — steelman symmetry, named holders, a source each side would itself cite, and the crux |

Each section records: the exact topic string, the coverage options to select, the expected card list, and a **comparison checklist against that sample's card** — the two or three things that must be true, drawn from the spec's "Done well when" and "Do not" lines for that card type. Not a diff: a judgement aid.

The document opens with the corpus's own translation note — the samples predate the card library, so *One-Paragraph Version + Map* → Overview, *The Story* → Story or How It Works, *Reference* → Timeline / Key Players / Key Numbers, *What People Get Wrong / What's Debated* → Debates, *Want more?* → chips — and with the corpus's warning that the samples' **facts and figures are as of August 2026 and were never web-verified**, so the *format* is the target and never the numbers.

### Pinned contract — the one code change

A `Copy as text` button in the carousel header that serialises the open primer to plain text — topic, then each card as `EYEBROW` + its rendered content in order — and writes it to the clipboard with `navigator.clipboard.writeText`, falling back to a selectable `<textarea>` when the clipboard API is unavailable or rejects. No network call, no new dependency. This is what makes a card-by-card comparison possible on a phone.

**What-survives proof (required in the PR body):**
1. The fixtures document's five sections, each with its topic string and checklist.
2. `grep -n "clipboard" web/research.js` → one call site, inside a try/catch with the textarea fallback.
3. `grep -rn "alert(\|confirm(\|prompt(" web/` → empty.
4. `node --check web/research.js`; `git diff --stat main` — three files, one new.

**Adjudication:** PASS shape = one new doc, one button, the version bump. FAIL on: a fixture topic that does not match its heading in `docs/primer/08_sample_primers.md` **character for character, capitalisation included** (they are `The Partition of India`, `mRNA Vaccines`, `K-pop as a Global Industry`, `The 2008 Financial Crisis`, `Nuclear Energy in Climate Policy`); the samples' figures presented as facts to verify against; a network call; version not bumped to `009-C`.

**STOP conditions:** none specific to this unit.

---

## End-of-run report (single message, final)

1. Per unit: PASS / FAIL / STOPPED, issue numbers, PR numbers, merge SHAs, shipped version values.
2. The ten-row field-coverage table, reproduced — it is the evidence that the locked format survived the renderer.
3. Confirmation that no `supabase/` file was touched, no DDL was issued, no model call was added to `web/`, and no native dialog exists anywhere in `web/`.
4. Connector readback: `select id, topic, depth_mode, status, message_id from public.primers order by created_at` and `select primer_id, card_type, position, status from public.primer_cards order by primer_id, position`.
5. **Actions for Justin** (explicitly separated checklist):
   - Confirm `deploy-worker` green on all three merges and `deploy-supabase` idle throughout.
   - Android at ~390px, light and dark, hard refresh each time.
   - **After U009-A:** open Research. **The list is empty — that is correct**, because nothing has been able to call packet 008's functions until now. Tap **New primer**, give it a topic (`The 2008 Financial Crisis` is the suggested first, with `docs/primer/08_sample_primers.md` sample 4 as the reference for what good looks like), leave the brain dump blank for this first run, and tap **Get options**. You should get 3–5 options with labels about *your* topic rather than card names — that is packet 008's `primer-menu` working for the first time. Pick two, tap **Build primer**. The carousel opens with the cards in fixed order, each with its eyebrow. Swipe between them. Check the Debates card hardest — misconceptions and debates must be under two clearly separate headings. Check a Key Numbers card: **every number must show its comparison**. Tap a chip on a curious-mode Overview. A chip whose hint names a real card type (`timeline`, `key_players`…) lands at **that** slot; a plain `mini_primer` chip has no slot of its own and lands at position 9, next to Further Reading — **both are correct**, and the Debates chip generates the real Debates card at slot 7 rather than a mini-primer. Leave the tab open during generation and confirm cards fill in without a refresh (that is Realtime working).
   - **After U009-B:** on Research, tap one of your existing captures — the sheet offers the topic and an empty brain dump. Write a few sentences of what you think you know, tap `Get options`, and check the menu's labels are about *your* topic. Build the primer and read the Overview: if the brain dump did its job, it skips what you already said you knew. Tap the same capture again — it opens the primer it already has, it does not make a second one.
   - **After U009-C:** run the five fixtures in `docs/packets/primer_regression_fixtures.md`, in the modes listed. **Fixture 5 (nuclear energy, research mode) is the expensive one** — roughly $0.25–0.60 — so run it last and only once the first four look right. Use `Copy as text` and read each against its sample. What you are judging is the format, never the facts: the samples' numbers are from August 2026 and were never verified.
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_009_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. The report records the fixture outcomes card by card — that record is what a later prompt change gets compared against. The same PR closes the Primer retirement items in `docs/backlog.md` if Justin has done them. Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
