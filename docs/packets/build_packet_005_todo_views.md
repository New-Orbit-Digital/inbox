# Build Packet 005 — To-do views: swimlanes, quadrant stripes, matrix, card overlay

**Prepared:** 2026-09-02 · prep session with Justin · contracts pinned against `web/inbox.html` as it will stand after packets 003 and 004, and against the live tag and quadrant state read 2026-09-02
**Risk class:** moderate-high — the biggest single rewrite of the render path. No schema change, no data write beyond what the overlay's controls already do; the risk is a to-do becoming invisible because a lane, a filter or a quadrant bucket silently swallowed it.
**Merge policy:** auto-merge on PASS authorized for U005-A, U005-B and U005-C. Units are SEQUENTIAL, each deployed and confirmed on the phone before the next is filed.
**Concurrency:** run ALONE. 003 → 004 → 005 → 006 → 007 → 009 are serial (`web/inbox.html`). Packet 008 is safe alongside (functions only).
**Deploy surface:** Worker only (`web/**`). `deploy-supabase` must stay idle all run.
**DB prep status:** no DDL and none needed. `messages.important` / `messages.urgent` and `todo_tags.lane_order` all exist and are seeded (migration `20260830174400`). **Quadrant is derived, never stored** — there is no quadrant column and a unit that wants one is a STOP.
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge only after posting an explicit PASS.

**Prep already done — do not redo:**
- **The quadrant derivation, pinned once for the whole packet.** With `important` and `urgent` both non-null: `important && urgent` → **Q1 Do**; `important && !urgent` → **Q2 Schedule**; `!important && urgent` → **Q3 Delegate**; `!important && !urgent` → **Q4 Eliminate**. **Either column null → Unsorted** (D-10). Every unit uses one shared `quadrantOf(m)` helper; a second copy of this logic anywhere is a FAIL.
- **Live state read 2026-09-02** — the prediction Justin checks against. 14 open to-dos: Q1 **4**, Q2 **5**, Unsorted **5**, Q3 0, Q4 0. Tags by `lane_order`: `dev` 1 (2 open), `ews` 2 (3), `gtfo` 3 (**0**), `house` 4 (1), `new-orbit` 5 (4), `personal` 6 (3), `ptc` 7 (**0**), `yard` 8 (1). **0 untagged open to-dos.** So on first render: six lanes, `gtfo` and `ptc` hidden, Untagged hidden. These numbers drift as Justin captures — the shape is the gate, not the arithmetic.
- **Colour tokens are ruled** (D-14) and are added by U005-A, not invented: light `--q1:#d92d20; --q2:#175cd3; --q3:#dc6803; --q4:#667085`; dark `--q1:#f97066; --q2:#53b1fd; --q3:#fdb022; --q4:#98a2b3`.
- **Dates are retired** (D-09). After packet 004 nothing writes `due_date`; the columns stay, hidden and unmaintained. This packet removes the last of the due-date UI.
- **The segmented control exists but is inert** — packet 003 shipped it as a stub with Matrix disabled. U005-B is what makes it work.

## Hard constraints (verbatim, non-negotiable)

1. **No `supabase/` edits, no DDL, no migration file.** A unit that seems to need a schema change — a stored quadrant, a sort column, an order table — is a STOP.
2. **Never touch `.github/workflows/`.**
3. **No model calls.** `grep -c "api.anthropic.com" web/inbox.html` → `0` before and after every unit.
4. **One `quadrantOf` and one `laneOf`.** Duplicated ordering logic is the failure mode this packet is most likely to produce; the what-survives proof checks for it by grep.
5. One unit per issue. Branch `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop.
6. **Secret placeholders in every issue:** names only, examples WITHOUT angle brackets.
7. **Supabase connector discipline:** ONLY **Supabase Inbox** (`qaabxgldjluqyccwhjzf`).
8. **No new dependency, no build step, no drag-and-drop library** — D-08 rules out drag-and-drop entirely, in this packet and after it.
9. **In-scope files, exhaustively: `web/inbox.html` plus `web/config.js`,** for all three units — and in `config.js` only the one-line `INBOX_VERSION` bump, with one named exception: **U005-A also removes the `DAY_ROLLOVER_HOUR` key as a four-line hunk** (blank line, two comments, the key), because this unit deletes its last reader. Any other `config.js` hunk, or any hunk in `supabase/` or `archive/`, = FAIL.
10. **`INBOX_VERSION` bumps in every unit** (`005-A`, `005-B`, `005-C`).

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first** (docs-only PR on a planner branch, merged by you).
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md` via the GitHub connector. Connector down → STOP.
- Ordering gate: `docs/packets/INDEX.md` shows 003 **and** 004 COMPLETE. Anything else → STOP.
- Supabase Inbox binding: `select count(*) from todo_tags` returns a number.
- **Premise gate (literal), one query, and its answer goes in the run report as the prediction:**
  `select coalesce(tag,'(untagged)') as lane, count(*) filter (where important is null or urgent is null) as unsorted, count(*) filter (where important and urgent) as q1, count(*) filter (where important and not urgent) as q2, count(*) filter (where not important and urgent) as q3, count(*) filter (where not important and not urgent) as q4 from public.messages where bucket='todo' and status='open' group by 1 order by 1;`
  A tag appearing here that has **no row in `todo_tags`** → STOP: it has no `lane_order` and its lane position is undefined. (None as of 2026-09-02.)
- Deploy-state gate: `https://inbox.justin-dec.workers.dev/config.js` contains `window.INBOX_VERSION = "004-B";`.
- File-size gate: any file over 300 KB → finding.

---

## U005-A — swimlanes, quadrant stripes, chip filter, complete → Done

**Why:** the current To-do view is the v7 one — filtered by `due_date`, grouped by tag, with a "Today" chip that means "due today or earlier". Dates are gone, so "Today" now means "everything with a null date", which is everything. This unit replaces the whole thing with the lane model.
**Scope:** `web/inbox.html`, plus two edits in `web/config.js` and nothing else there: the one-line `INBOX_VERSION` bump, and the four-line removal of the now-unread `DAY_ROLLOVER_HOUR` key (its only consumer, `todayLocal`, is deleted by this unit — see below).

### Pinned contract

**Tokens** — add to both `:root` blocks exactly the eight values listed in "Prep already done". No other token changes.

**Helpers (exactly one of each):**
- `quadrantOf(m)` → `0` for Unsorted, `1`–`4` for Q1–Q4, per the pinned derivation.
- `laneOf(m)` → `m.tag || null`, where `null` is the Untagged lane.
- `LANE_ORDER` — a map from tag to `lane_order`, built in `loadTags()` from the **single** `todo_tags` query, which packet 004 U-A widened in place to `select('tag, lane_order, last_used_at')`. Derive lane order from that same result; **do not add a second query**. A tag with a null `lane_order` sorts last, then alphabetically.

**Swimlane render** (replaces the `grouped` branch of `render()` and the to-do half of `visible()`):
- Lanes render in `lane_order` ascending. **Untagged is pinned first** whenever it is non-empty (D-02), ahead of `lane_order` 1.
- **A lane with zero open to-dos does not render at all** (D-03). Hidden lanes keep their position — they reappear in place when they refill, because position comes from `lane_order`, not from render order.
- Lane header: the tag name in the existing `.cat.tags h2` style, with the lane's open count beside it in `.n`.
- Within a lane (D-05): **Unsorted first**, then Q1 → Q2 → Q3 → Q4; **oldest first** (`created_at` ascending) inside each quadrant. State this as a single comparator function; do not sort three times.
- Cards show **title only** (D-07) — the body text and nothing else. No date line, no tag line (the lane says the tag), no meta row.
- **Pinned to remove the ambiguity:** to-do cards get their **own builder**, `todoCard(m)`, used by both views. `itemCard`, `metaRow` and `when()` **survive and keep serving Research, Notes and Done**, which still show their timestamp — but `itemCard` loses its two `b === 'todo'` branches, which become dead the moment no to-do reaches it. Those branches are exactly what the deletion list below names (the `.dateline.due` block, the date `<input>`, the per-card tag `<select>`). Do not thread a mode flag through `itemCard`; two small builders are the contract.

**Quadrant stripe** (D-14): the card's existing 4px left border becomes the quadrant colour — `--q1`…`--q4` — via `li.style.setProperty('--edge', …)`. **Unsorted renders the same 4px width as a dashed border** in `var(--dim)`, so an unsorted card is visibly unsorted without being loud. Implement with a `data-q="0"` attribute and a CSS rule (`li.item[data-q="0"]{border-left-style:dashed}`), not an inline style string.

**Chip filter** (D-13) — `renderTagbar()` rewritten:
- Chips are `All` followed by every tag with ≥1 open to-do, in `lane_order`; plus `Untagged` when non-empty, positioned first among the tags.
- **Default is `All`.** The `today` chip and the whole `tagFilter === 'today'` branch are deleted.
- Selecting a tag renders that lane only, with the same internal ordering. `All` renders every lane.

**Delete, in full:**
- The `due_date` filter and both sort blocks in `visible()`.
- `nextOccurrence` and `toDayStr` (used only by it), and the recurrence roll-forward inside `complete()` — `complete(m)` becomes a plain `status` toggle for every bucket (D-06). The `(stop)` recur button and `recurLabel`'s to-do call site go with it; `recurLabel` itself stays only if the Events code path still calls it (it does — leave it).
- `itemCard`'s two `b === 'todo'` branches — the `.dateline.due` block, the `data-late` / `data-today` attributes and their CSS rules, `dayLabel`, and the date `<input class="mini">` — leaving the rest of `itemCard` intact for the other buckets.
- `todayLocal` **if and only if** it is orphaned after the above (it should be — its callers were `fileAs`, `dayLabel`, `nextOccurrence`, `complete`'s roll-forward, the card's late/today logic and `visible()`'s filter, all gone by now). Prove it with `grep -n "todayLocal" web/inbox.html` returning empty, and leave `TZ` alone: the Events code still uses it.
- With `todayLocal` gone, `cfg.DAY_ROLLOVER_HOUR` has no reader anywhere in the app (the edge function read its own env var, and after 004 U-C reads nothing at all). Remove it from `web/config.js` in this unit — a config key nothing reads is the same stale pointer `PUBLIC_HOST` was — taking exactly four lines, the same shape packet 003 U-C used: the **blank line before** the comment, the two comment lines, and the `DAY_ROLLOVER_HOUR: 3,` line. That leaves the file's existing single-blank spacing between `TIMEZONE` and `GROCERY_ORDER`, with no double blank to tidy afterwards.
- The per-card tag `<select>` — the overlay (U005-C) is where tag changes live now (D-08). **Until U005-C ships there is no way to change a to-do's tag in the UI.** That is a deliberate one-deploy gap, stated here so it is not discovered as a bug; Justin is told in the checklist.

**Keep:** `parseDay` (the Events code still uses it), `when()`, the grocery renderer, the Done view, `patch`, `complete`.

**Empty states:** the two existing strings — `'Nothing due today. Enjoy it.'` and `'Nothing in here yet.'` — are both date-era copy. Replace the To-do empty state with `Nothing to do. Enjoy it.` and leave `'Nothing in here yet.'` for the other sections. A selected chip whose lane is empty cannot happen (chips only exist for non-empty lanes).

**What-survives proof (required in the PR body):**
1. `grep -c "quadrantOf" web/inbox.html` → the definition plus its call sites, all inside the render path; paste the lines.
2. `grep -n "due_date\|dayLabel\|nextOccurrence\|data-late\|data-today" web/inbox.html` → the **only** permitted survivors are the `due_date` in `load()`'s select list (D-09 keeps the columns; the app still reads them) and any Events-path hit. Name each survivor; anything else is a FAIL.
3. `grep -n "tagFilter === 'today'\|'today'" web/inbox.html` → empty.
4. A rendered-shape table produced from the executor's own code against the premise-gate numbers: lane → count → the order of quadrants inside it.
5. Handler inventory before → after.
6. `grep -rn "DAY_ROLLOVER_HOUR" web/` → empty.
7. `git diff --stat main` — two files: `inbox.html`, and `config.js` with **two** hunks (the version bump, and the four-line `DAY_ROLLOVER_HOUR` removal). This is the one unit in the packet whose `config.js` diff is larger than a single line.

**Adjudication:** PASS shape = two files; one `quadrantOf`; lanes ordered by `lane_order` with Untagged pinned first and empty lanes absent; Unsorted-first-then-Q1→Q4 inside a lane, oldest first; dashed stripe for Unsorted; no date UI anywhere; `complete` is a plain toggle. FAIL on: a stored quadrant; a second copy of the ordering logic; drag-and-drop; an empty lane rendering a header; a card showing anything but its title; version not bumped to `005-A`.

**STOP conditions:** a tag on an open to-do has no `todo_tags` row (premise gate); `web/config.js` on `main` is not at `INBOX_VERSION = "004-B"`.

---

## U005-B — matrix view and a live segmented control

**Why:** swimlanes answer "what is on my plate for this project"; the matrix answers "what should I do first". D-16 puts them behind one control rather than two screens.
**Scope:** `web/inbox.html`, plus the one-line `INBOX_VERSION` bump in `web/config.js` and nothing else in that file. File after Justin confirms U005-A.

### Pinned contract

- Module-level `var view = 'lanes';` restored on load from `localStorage` key **`inbox-view`** inside `try{}catch(e){}`, written on every switch. An unrecognised stored value falls back to `'lanes'`.
- The packet-003 segmented control becomes live: the `disabled` attribute and the `title="Lands in packet 005"` come off Matrix; clicking either button sets `view`, resets `active = 0`, and re-renders. It stays visible only on To-do.
- **Matrix layout** (D-12): four stacked sections in this order — **Do** (Q1), **Schedule** (Q2), **Delegate** (Q3), **Eliminate** (Q4) — with **Unsorted above them when non-empty**. Section headers reuse the `.cat` header style; the header text carries the quadrant colour (`--q1`…`--q4`), Unsorted in `var(--dim)`.
- **An empty quadrant section does not render** — same rule as empty lanes.
- Cards inside a section: title only, quadrant stripe as in U005-A, **grouped by nothing**; ordered `created_at` ascending. The lane/tag is not shown on the card (the overlay shows it).
- **The chip filter applies to both views.** Selecting `house` in matrix view shows only `house` to-dos, still split across the four sections.
- Grocery, Research, Notes and Done are unaffected: the control is rendered only when `filter === 'todo'` and `view` is ignored everywhere else.

**What-survives proof (required in the PR body):**
1. `grep -n "inbox-view" web/inbox.html` → the read and the write, both inside try/catch.
2. `grep -c "quadrantOf" web/inbox.html` → unchanged from U005-A plus the matrix call sites; still exactly one definition.
3. `grep -n "disabled" web/inbox.html` → no hit on the Matrix button.
4. A rendered-shape table for both views against the premise numbers.
5. `git diff --stat main` — two files (`inbox.html`, plus the one-line `config.js` bump).

**Adjudication:** PASS shape = two files; both views working from one data pass; view persisted; empty sections absent; Unsorted on top when non-empty; chip filter honoured in both. FAIL on: a second `quadrantOf`; the matrix re-querying the database; view state stored in the URL or a cookie; the control appearing outside To-do; version not bumped to `005-B`.

**STOP conditions:** the segmented control is missing from `main` (packet 003 did not land it) — record what IS there.

---

## U005-C — card overlay

**Why:** cards are title-only now, so every edit needs somewhere to live. One overlay serves both views and both is where tag and quadrant change (D-07, D-08). It also restores the tag control that U005-A deliberately removed.
**Scope:** `web/inbox.html`, plus the one-line `INBOX_VERSION` bump in `web/config.js` and nothing else in that file. File after Justin confirms U005-B.

### Pinned contract

**Trigger:** tapping a to-do card opens the overlay for that row. Tapping a Grocery, Research, Note or Done card does **not** open it in this packet. (Packet 009 U-B later opens the same sheet, through the same `openSheet` API, for a Research capture — that is contracted there and is not a licence for this unit to build it.)

**Markup**, added once **immediately after the `</div>` that closes `<div id="app">` and before the three `<script>` tags** — outside `#app`, so the scrim can sit above the fixed nav without fighting the app container's stacking context (packet 003's nav is the last child of `#app`), and above the scripts, so the IIFE's `document.getElementById('sheet')` finds it the way every other element in the file is found:

```html
<div class="scrim" id="scrim" hidden></div>
<div class="sheet" id="sheet" hidden role="dialog" aria-modal="true"></div>
```

- **The sheet is generic, by contract, because packet 006 reuses it for the tag sheet.** Expose exactly one entry point — `openSheet(buildFn, label)` — which sets `aria-label` to `label`, replaces the sheet's children with what `buildFn` returns, shows sheet and scrim, and returns a matching `closeSheet()`. The `aria-label` therefore lives in the call, not the markup. Listeners on sheet contents are replaced wholesale on each open, never accumulated.
- Rendered from JS for the current row; contents replaced on each open, never accumulated.
- A full-width bottom sheet on phone: `position:fixed`, `left:0`, `right:0`, `bottom:0`, `margin:0 auto`, `max-width:720px`, `border-radius:16px 16px 0 0`, `background:var(--card)`, `border-top:1px solid var(--line)`, `padding-bottom:calc(1rem + env(safe-area-inset-bottom))`, `z-index:40` (above the nav's 20). The scrim sits at `z-index:30`, `background:rgba(19,24,38,.45)`, fixed and full-viewport.

**Contents, in this order:**
1. **Title** — a `<textarea class="sheettitle">` prefilled with the body, auto-sized, `maxlength="280"`. Saved on blur and on Save; an empty or whitespace-only value is refused (no write, control re-focused).
2. **Important / Urgent toggles** — the same `.toggle` control as the capture bar, reflecting the row's current values. Tapping one writes immediately (`patch(m.id, {important:…})`) and the card's stripe updates on the next render. **A row whose columns are null starts with both toggles off and stays Unsorted until one is tapped** — tapping either sets *both* columns (the tapped one to true, the other to `false` if it was null), because a half-null row cannot have a quadrant. State this explicitly in the issue; it is the subtle part.
3. **Tag** — a `<select class="mini">` listing the owner's tags ordered by `last_used_at` desc (same order as capture), plus `(no tag)` last. Changing it writes `patch(m.id, {tag:…})` and calls `db.rpc('tag_touch', {p_tag:…})` for a non-null value (D-04).
4. **Created** — `created_at` rendered as a plain date-and-time line in `var(--dim)`, not editable.
5. **Actions row** — `Done` (calls `complete(m)` and closes), `Delete`, `Close`.

**Delete:** `db.from('messages').delete().eq('id', m.id)`. **Two-step, no browser dialog:** the first tap turns the button into `Delete — tap again`, the second performs the delete; the state resets if the sheet closes or another control is touched. `confirm()` and `alert()` are forbidden — they are the one thing that reliably breaks a PWA on Android.

**Dismissal:** tapping the scrim, the Close button, or pressing `Escape`. Closing always re-renders. The sheet closes on `x`/`j`/`k` too — or, simpler and preferred, the keyboard handler returns early while the sheet is open. Whichever the executor picks, it states it in the PR body.

**Body-scroll:** while the sheet is open, `document.body.style.overflow = 'hidden'`, restored on close.

**What-survives proof (required in the PR body):**
1. `grep -n "confirm(\|alert(" web/inbox.html` → empty.
2. `grep -n "\.delete()" web/inbox.html` → exactly one call site, inside the sheet's delete handler.
3. `grep -n "tag_touch" web/inbox.html` → two call sites (capture, overlay).
3b. `grep -n "openSheet\|closeSheet" web/inbox.html` → one definition each, and the sheet's `aria-label` set from the argument rather than hardcoded in markup.
4. The null-quadrant rule quoted from the executor's own code.
5. Handler inventory before → after, including the sheet's own listeners and their teardown.
6. `git diff --stat main` — two files (`inbox.html`, plus the one-line `config.js` bump).

**Adjudication:** PASS shape = two files; one sheet element reused; delete is two-tap and native-dialog-free; toggles resolve the half-null case; tag change touches `tag_touch`; scrim and Escape both close. FAIL on: `confirm`/`alert`; a delete without the two-tap; the sheet opening for non-to-do cards **in this packet** (packet 009 U-B adds the Research case later, through `openSheet`); listeners accumulating on repeat opens (the executor must show they are replaced, not added); version not bumped to `005-C`.

**STOP conditions:** `messages` delete is refused by RLS for the owner (it is not — `owner full access` is `for all` — but if a delete errors, record it and STOP rather than working around it).

---

## End-of-run report (single message, final)

1. Per unit: PASS / FAIL / STOPPED, issue numbers, PR numbers, merge SHAs, shipped version values.
2. The premise-gate table read at open and again at close, with the rendered-shape table beside it.
3. Confirmation that no `supabase/` file was touched, no DDL was issued, no quadrant was stored, and the only `web/config.js` hunks were the three version bumps.
4. The full handler inventory across the three units.
5. **Actions for Justin** (explicitly separated checklist):
   - Confirm `deploy-worker` green on all three merges and `deploy-supabase` idle throughout.
   - Android at ~390px, light and dark, hard refresh each time.
   - **After U005-A:** To-do shows lanes in this order — dev, ews, house, new-orbit, personal, yard — with gtfo and ptc **absent** (they have no open items). Inside each lane the unsorted items are on top with a dashed stripe, then red, then blue. No dates anywhere. **Expect the tag dropdown on cards to be gone — that is intended and U005-C brings it back in the overlay.**
   - **After U005-B:** the Matrix segment is tappable. Matrix shows Unsorted (5 items), then Do (4), then Schedule (5); Delegate and Eliminate absent. Switch to Grocery and back — To-do remembers Matrix. Reload — it still remembers.
   - **After U005-C:** tap a card → the sheet opens. Change the title, close, reopen: it stuck. Tap Important on an unsorted item → it leaves Unsorted and gets a coloured stripe. Change its tag → it moves lanes. Delete needs two taps and no browser popup appears at any point.
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (all units PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_005_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
