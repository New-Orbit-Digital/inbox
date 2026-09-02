# Build Packet 003 — Shell: bottom nav, Events behind a flag, cross-filing removed, live wall gone

**Prepared:** 2026-09-02 · prep session with Justin · contracts pinned against `web/inbox.html` at 974 lines / 37 KB (unchanged by the 2026-09-02 prep PR, which touched only docs, migrations and `web/icons/`) and the live database read the same day
**Risk class:** moderate — this is the first packet that edits the app shell. Every unit ships to the phone Justin actually uses. Nothing here writes data or changes schema; the risk is a broken render, not a lost row.
**Merge policy:** auto-merge on PASS authorized for U003-A, U003-B and U003-C. Units are SEQUENTIAL and each one deploys before the next is filed — U003-B is filed only after Justin confirms U003-A on the phone, and U003-C only after U003-B.
**Concurrency:** run ALONE among the web packets. 003 → 004 → 005 → 006 → 007 → 009 are strictly serial: they all edit `web/inbox.html`. Packet 008 (functions only) is safe alongside this one.
**Deploy surface:** Worker only (`web/**` trigger) for all three units. `deploy-supabase` must stay idle all run: no unit touches `supabase/`.
**DB prep status:** no DDL in this packet and none needed. Prep-2's live-wall half is already applied — migration `20260902000812_live_wall_retirement` (five anon/`owner is null` policies dropped, 2 `owner is null` rows purged), certified 2026-09-02 by readback: `owner is null` = 0, `messages` = 214, one policy left on `messages` (`owner full access`).
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor (Claude Code Action) builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge with `merge_pull_request` only after posting an explicit PASS.

**Prep already done — do not redo:**
- `web/inbox.html` on `main` is one file: inline `<style>`, markup, then a single IIFE. Its top-level structure, verified 2026-09-02: theme block, `EDGE`, `CHIP_BUCKETS`, `normalize`, `todayLocal`, auth block, password block, `start`/`load`/`loadTags`, `CAPTURE_MODE`, `updateCapture`, `add`, the `#tag` autocomplete (`acUpdate`/`acRender`/`acPick`/`acClose`), `patch`, `fileAs`, `savePref`, the date helpers (`parseDay`, `dayLabel`, `toDayStr`, `nextOccurrence`), `complete`, the calendar helpers (`gcalStamp`, `gcalUrl`, `eventLabel`, `recurLabel`), `bucketOf`, `counts`, `when`, `metaRow`, `itemCard`, `renderGrocery`, `visible`, `renderTagbar`, `render`, the `#tabs` click handler, the keyboard handler.
- The tab strip is `<div class="tabs" role="tablist" id="tabs">` with SEVEN buttons, `data-f` = `unsorted`, `todo`, `grocery`, `event`, `research`, `note`, `done`. `filter` initialises to `'unsorted'` and `render()` force-switches to `'todo'` when the unsorted count is 0.
- **Live counts read 2026-09-02 via the Supabase Inbox connector** — the premise for removing the Unsorted segment: open rows by bucket are `todo` 14, `research` 7, `note` 4, `grocery` 2, `event` **0**, and **null-bucket open rows: 0**. (The 16 null-bucket rows that exist are all `status='done'` and stay reachable in Done.)
- `web/config.js` defines exactly one object, `window.TEXTWALL`, followed by the packet-001 beacon block. `INBOX_VERSION` on `main` is `"001-A"`.
- `archive/live-wall/` holds exactly two files, `index.html` and `wall.html`. Nothing in `web/` links to them; `PUBLIC_HOST` in `config.js` is read by nothing in `web/inbox.html` (grep-verified 2026-09-02).
- Deployed today: `classify` v12 answering `{"classify_version":"002-A"}`, `health` v1 answering `{"health_version":"001-B"}`. Neither is touched by this packet.

## Hard constraints (verbatim, non-negotiable)

1. **No `supabase/` edits of any kind** — not the functions, not `config.toml`, not `migrations/`. Any hunk there = FAIL. `deploy-supabase` must not run this whole packet.
2. **Never touch `.github/workflows/`** — writes return 403 for every automated token.
3. **This packet issues no DDL and makes no database writes.** A unit that seems to need a schema change is a STOP.
4. **No model calls.** No unit may add a call to `api.anthropic.com` or any other model API. `grep -c "api.anthropic.com" web/inbox.html` must be `0` before and after every unit.
5. One unit per issue. Branch naming `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop. Executor self-reports are not verification.
6. **Secret placeholders in every issue:** names only — ANTHROPIC_API_KEY, WEBHOOK_SECRET, SUPABASE_ACCESS_TOKEN, CLOUDFLARE_API_TOKEN — never a value; examples written WITHOUT angle brackets (the issue sanitizer strips them). Repeat the rule in each issue body.
7. **Supabase connector discipline:** use ONLY the connector named **Supabase Inbox** (project `qaabxgldjluqyccwhjzf`). Any other Supabase connector present ("Supabase" = the ads-agent org, load-bearing for Justin's daily work; "Supabase Primer" = a retired empty project) is never called and never disconnected.
8. **No new dependency, no build step, no framework.** `web/` ships verbatim. Vanilla ES5-flavoured JS in the existing style (`var`, `function`, no optional chaining) so the file stays internally consistent.
9. **In-scope files, exhaustively:** U003-A → `web/inbox.html`, `web/config.js`. U003-B → `web/inbox.html`, `web/config.js`. U003-C → `web/config.js`, and deletion of `archive/live-wall/index.html` and `archive/live-wall/wall.html`. Nothing else in any unit.
10. **`INBOX_VERSION` bumps in every unit** (`003-A`, `003-B`, `003-C`) and the PR body states old → new. The beacon lives in `web/config.js`, which is therefore in scope for **every** unit that ships a `web/` change — but in a unit whose contract is otherwise `inbox.html`-only, the *sole* permitted `config.js` hunk is the one-line version bump. Any other `config.js` change in such a unit = FAIL.

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first:** open a docs-only PR on a planner branch that changes only the 003 row in `docs/packets/INDEX.md`, and merge it yourself (docs-only, deploys nothing; `main` requires a PR).
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md` via the GitHub connector. Connector down → STOP the packet.
- Ordering gate: `docs/packets/INDEX.md` shows 001 and 002 COMPLETE. Anything else → STOP.
- Supabase Inbox binding: `select count(*) from todo_tags` returns a number. Missing connector or error → STOP the packet.
- **Premise gate (literal), one query:**
  `select count(*) filter (where bucket is null and status = 'open') as open_unbucketed, count(*) filter (where owner is null) as wall_rows from public.messages;`
  Expected `open_unbucketed = 0` and `wall_rows = 0`. **Non-zero `open_unbucketed` → STOP the packet** — removing the Unsorted segment would hide live rows, and the fix is a ruling, not an improvisation. Non-zero `wall_rows` → STOP (Prep-2 did not hold).
- Deploy-state gate: `https://inbox.justin-dec.workers.dev/config.js` contains `window.INBOX_VERSION = "001-A";`. A different value means an unrecorded deploy → STOP and report.
- File-size gate: list `web/` and `supabase/functions/` with sizes; expected largest is `web/inbox.html` at roughly 37 KB. Any file over 300 KB → finding; no unit may edit it.

---

## U003-A — bottom nav, routing, Events flag, internals rename

**Why:** the tab strip is the last piece of the Text Wall triage shell — seven pill tabs including a bucket ("Unsorted") that no longer receives rows and a tab ("Events") whose feature is parked. The bottom nav is the phone-shaped replacement and the thing every later packet routes through, so it lands first and alone.
**Scope:** `web/inbox.html`, `web/config.js`. Nothing else.

### Pinned contract — `web/config.js`

- Rename the object: `window.TEXTWALL = {` → `window.INBOX = {`. **The object's contents are byte-identical** — every key, value, comment and blank line inside it, `PUBLIC_HOST` included (its removal is U003-C's job, deliberately separated so this unit's diff is a pure rename).
- `window.INBOX_VERSION = "001-A";` → `window.INBOX_VERSION = "003-A";`.
- No other change to the file.

### Pinned contract — `web/inbox.html`

**Rename, exhaustively (grep-checkable):**
- `var cfg = window.TEXTWALL;` → `var cfg = window.INBOX;`. After this unit, `grep -c "TEXTWALL" web/inbox.html web/config.js` is `0` in both files.
- Theme storage key `tw-theme` → `inbox-theme`, with a one-time carry-over so Justin's current setting survives: read `inbox-theme`; if it is absent, read `tw-theme` and use it; on every `applyTheme` write `inbox-theme` only. After a successful read of the old key, `localStorage.removeItem('tw-theme')` inside the same `try`. All storage access stays inside `try{}catch(e){}` as today.
- The banner line `console.log('textwall inbox v7 (password sign-in)');` → `console.log('inbox shell', window.INBOX_VERSION);`.

**Markup — remove:** the entire `<div class="tabs" role="tablist" id="tabs"> … </div>` block.

**Markup — add**, as the last child of `<div id="app">`, after `<ul id="list">` and the `.keys` paragraph:

```html
  <nav class="nav" id="nav" role="tablist" aria-label="Sections"></nav>
```

The nav is **rendered from JS**, not hand-written, so the Events flag has exactly one place to act. Add a module-level definition immediately after the `EDGE` map:

```js
  var SHOW_EVENTS = false;   // Calendar is parked; flip to true only when its rework ships.
  var SECTIONS = [
    { f:'todo',     label:'To-do',    accent:'var(--todo)' },
    { f:'grocery',  label:'Grocery',  accent:'var(--grocery)' },
    { f:'research', label:'Research', accent:'var(--research)' },
    { f:'note',     label:'Notes',    accent:'var(--note)' },
    { f:'event',    label:'Events',   accent:'var(--event)', flag:'events' },
    { f:'done',     label:'Done',     accent:'var(--done)' }
  ];
```

- A section whose `flag` is `'events'` renders **only when `SHOW_EVENTS` is true**. With the flag false the nav has exactly five buttons, in this order: To-do · Grocery · Research · Notes · Done. Events sits between Notes and Done when the flag is on.
- There is **no Unsorted segment** — the premise gate proves no open row can land there.
- Each button: `<button class="navbtn" role="tab" data-f="…" aria-selected="…">`, containing an inline `<svg>` icon, a `<span class="navlabel">` with the label, and a `<span class="n">` count.
- **Icons:** inline SVG, `viewBox="0 0 24 24"`, `width="22" height="22"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `aria-hidden="true"`. Executor's choice of path data — a check-square for To-do, a basket or bag for Grocery, a book or magnifier for Research, a note page for Notes, a clock or archive box for Done — provided each is a single-colour line icon of that shape and nothing else. No icon font, no external asset, no emoji.
- **Counts:** open rows in that bucket (the existing `counts()` result). Rendered only when non-zero; Done never shows a count. Counts refresh on every `render()`.
- **Selected state:** `aria-selected="true"` on exactly one button; its icon and label take that section's `accent`. Unselected buttons are `var(--dim)`. No pill, no filled background — the nav must not read as a chip row (D-15).

**Nav CSS** (add near the `.tabs` rules being removed; delete the `.tabs` and `.tab` rules in the same edit):

```css
  .nav{
    position:fixed;left:0;right:0;bottom:0;z-index:20;
    display:flex;justify-content:space-around;align-items:stretch;
    max-width:720px;margin:0 auto;
    background:var(--card);border-top:1px solid var(--line);
    padding-bottom:env(safe-area-inset-bottom);
  }
  .navbtn{
    flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.15rem;
    min-height:56px;padding:.45rem .2rem;
    border:0;background:none;font:inherit;color:var(--dim);cursor:pointer;
  }
  .navbtn[aria-selected=true]{color:var(--nav-accent,var(--ink))}
  .navlabel{font-size:.68rem;line-height:1}
  .navbtn .n{
    font-size:.62rem;line-height:1;font-variant-numeric:tabular-nums;
    min-height:.7rem;opacity:.75;
  }
```

- The per-button accent is applied by setting `--nav-accent` on that button in JS. No colour literals in the JS.
- `body` gains bottom clearance so the fixed nav never covers the last card: change the existing `body` padding line to
  `padding:max(1rem,env(safe-area-inset-top)) 1rem calc(72px + env(safe-area-inset-bottom));`

**Segmented-control stub** (Swimlanes / Matrix, D-16) — markup added in the position the removed `.tabs` block occupied, i.e. between the capture bar and `<div class="tagbar">`:

```html
  <div class="seg" id="seg" role="tablist" aria-label="To-do view" hidden></div>
```

- Placed **above the tag chip bar**, so the To-do header reads: capture bar → segmented control → chip filter → list. `renderTagbar()` and the control are siblings in that order.
- Rendered by JS with exactly two buttons: `Swimlanes` (`data-v="lanes"`, `aria-selected="true"`) and `Matrix` (`data-v="matrix"`, `disabled`, `title="Lands in packet 005"`).
- The container is `hidden` unless `filter === 'todo'`; `renderTagbar()`'s sibling call site in `render()` is the place to toggle it.
- **It is inert.** Neither button changes what renders in this packet. A click handler that switches views = FAIL; that is packet 005.
- CSS: a bordered inline group, `border:1px solid var(--line); border-radius:999px`, selected segment `background:var(--ink); color:var(--bg)`, disabled segment `opacity:.45; cursor:default`.

**Routing:**
- `var filter = 'todo';` replaces `'unsorted'`.
- The `#tabs` click handler is replaced by a `#nav` click handler with identical semantics: set `filter` from `data-f`, `active = 0`, re-render (the nav's own selected state is set inside `render()`, not in the handler).
- In `render()`: delete the unsorted count/badge/force-switch block and the `.tab` loop; call a new `renderNav()` that rebuilds the buttons, sets counts and selection.
- `counts()`, `bucketOf()`, `visible()`, `renderTagbar()`, `updateCapture()`, `renderGrocery()`, `itemCard()` are **unchanged in this unit** apart from the `#tabs` references disappearing. `bucketOf` keeps returning `m.bucket || 'unsorted'`; no segment renders that value and the premise gate proves the set is empty.
- `CAPTURE_MODE` is unchanged, so the capture bar still hides itself on Done and shows the existing placeholders elsewhere.
- The `.tab .n.badge` CSS rule goes with the tabs.

**Rules for the executor, stated in the issue:** one file at a time, no reformatting of untouched regions; `node --check` cannot parse HTML, so extract nothing — instead paste `grep -n "TEXTWALL\|tw-theme\|class=\"tabs\"\|id=\"tabs\"" web/inbox.html web/config.js` (must be empty) and `git diff --stat main`.

**What-survives proof (required in the PR body):**
1. `grep -c "TEXTWALL" web/inbox.html web/config.js` → `0` and `0`.
2. `grep -c "tw-theme" web/inbox.html` → `0`.
3. `grep -n "SHOW_EVENTS" web/inbox.html` → the definition line and exactly one use (the nav filter).
4. `grep -c "api.anthropic.com" web/inbox.html` → `0`.
5. A handler inventory table: every `addEventListener` in the file before → after, marked kept / removed / added. Expected removals: the `#tabs` click handler. Expected additions: the `#nav` click handler, plus the per-button handlers if the executor binds per button rather than delegating.
6. `git diff --stat main` — exactly 2 files.

**Adjudication:** PASS shape = two files; the `window.INBOX` object's contents byte-identical to `window.TEXTWALL`'s (diff shows only the declaration line changing); `TEXTWALL` and `tw-theme` gone; five nav buttons with the flag false; the segmented control present and inert; `body` bottom padding raised. FAIL on: any `supabase/` hunk; a sixth nav button with `SHOW_EVENTS` false; an Unsorted segment; a working Matrix view; `PUBLIC_HOST` removed in this unit (that is U003-C); any change to `counts`/`visible`/`renderGrocery` semantics; a new dependency; a `<script>` tag added **in this unit** (packet 009 U-A later adds `research.js`, which is contracted there); version not bumped to `003-A`.

**STOP conditions:** `web/config.js` on `main` does not declare `window.TEXTWALL` (premise mismatch — record what IS there); the premise gate's `open_unbucketed` is non-zero; `web/inbox.html` on `main` differs materially from the structure listed in "Prep already done".

---

## U003-B — remove cross-filing: bucket chips, `fileAs`, keys 1–4

**Why:** the chip row under every card and the number keys exist to move a row between buckets — the triage model from the wall era. Capture is tab-scoped now (D-17), and 004 makes each section own its capture outright. Leaving cross-filing in place would let a row be filed into a bucket whose capture contract no longer produces rows of that shape.
**Scope:** `web/inbox.html`, plus the one-line `INBOX_VERSION` bump in `web/config.js` and nothing else in that file. **File this issue only after Justin has confirmed U003-A on the phone.**

### Pinned contract

**Delete, in full** (this unit is otherwise deletions only; the `config.js` version bump is the single non-deletion besides the `.keys` text and whatever minimal glue keeps `metaRow` returning a valid node):
- The `CHIP_BUCKETS` constant.
- The chip-building block inside `metaRow` — the `CHIP_BUCKETS.concat(['done']).forEach(…)` loop and everything in it, including the `fileAs` / `patch(m.id, {bucket:null, auto:false})` calls it makes.
- The `fileAs` function itself.
- In the keyboard handler: the `'1'`, `'2'`, `'3'`, `'4'` branches. `j`, `k` and `x` stay exactly as they are.
- The CSS rules `.chip`, `.chip:hover`, `.chip[aria-pressed=true]` and all five `.chip[data-b=…][aria-pressed=true]` rules. `.tagchip`, `select.mini` and `input.mini[type=date]` stay — they are the tag filter and the per-card controls.

**Keep:**
- `metaRow` itself, now returning a `.meta` row containing only the `.when` timestamp span (with its `· auto` marker) — plus, for to-dos, the date input and tag select that `itemCard` appends to it. Those two controls are packet 005's to remove, not this one's.
- `patch`, `complete`, `savePref`, everything else.

**The `.keys` hint** changes to exactly:

```html
  <p class="keys">j / k move · x done</p>
```

**Consequence to state in the PR body:** with the chips gone, nothing in the app can set `bucket` to null any more, which is what makes the missing Unsorted segment from U003-A permanently safe rather than merely currently safe.

**Rules for the executor, stated in the issue:** deletions only — this unit adds no behaviour. The only non-deletion edits are the `.keys` text, the `config.js` version bump, and whatever minimal glue keeps `metaRow` returning a valid node.

**What-survives proof (required in the PR body):**
1. `grep -n "fileAs\|CHIP_BUCKETS" web/inbox.html` → empty.
2. `grep -n "class=\"chip\"\|\.chip" web/inbox.html` → empty.
3. `grep -n "e.key === '1'\|e.key === '2'\|e.key === '3'\|e.key === '4'" web/inbox.html` → empty.
4. `grep -c "savePref\|complete(\|patch(" web/inbox.html` → non-zero for each (the surviving mutators).
5. Handler inventory before → after.
6. `git diff --stat main` — two files (`inbox.html` deletions dominant, `config.js` one line).

**Adjudication:** PASS shape = `web/inbox.html` net deletion plus the one-line `config.js` bump and nothing else; no new function; the tag `<select>` and date `<input>` on to-do cards still built in `itemCard`; the grocery aisle `<select>` in `renderGrocery` untouched. FAIL on: `fileAs` surviving anywhere; any chip markup left; `x` or `j`/`k` removed; the grocery aisle select or `savePref` touched; version not bumped to `003-B`.

**STOP conditions:** `metaRow` on `main` does not contain the chip loop as described (premise mismatch).

---

## U003-C — live-wall cleanup: delete `archive/live-wall/`, drop `PUBLIC_HOST`

**Why:** the wall is cut (D-26). The database half is already gone (Prep-2, 2026-09-02). This is the repo half. `PUBLIC_HOST` names a host in Justin's personal Cloudflare account that no longer serves the app; leaving it in a public config file is a stale pointer, not a secret.
**Scope:** `web/config.js`, and deletion of `archive/live-wall/index.html` and `archive/live-wall/wall.html`. Nothing else. **File this issue only after Justin has confirmed U003-B on the phone.**

### Pinned contract

- Delete both files under `archive/live-wall/`. The directory disappears with them (git tracks files, not directories). Do not delete or create anything else under `archive/`.
- In `web/config.js`, remove exactly these lines from inside the `window.INBOX` object — the two comment lines, the `PUBLIC_HOST` line, and the blank line that follows:

```js

  // Shown under the QR code on the wall. No protocol, no trailing slash.
  PUBLIC_HOST: "textwall.justin-a-bost.workers.dev",
```

- Every other key in the object is byte-identical.
- `window.INBOX_VERSION = "003-C";`.

**Executor anti-footgun, stated in the issue (attested in CLAUDE.md):** after `git rm`, a multi-pathspec `git add` that re-lists a removed path aborts atomically. Stage the deletions and the `config.js` edit in separate `git add` calls.

**What-survives proof (required in the PR body):**
1. `grep -rn "PUBLIC_HOST" web/ archive/ supabase/functions/` → empty. (Repo-wide it still appears in `docs/`, in this packet, and in `supabase/migrations/20260902000812_live_wall_retirement.sql`, all of which are correct and out of scope — do not "fix" those.)
2. `grep -rn "textwall" web/ archive/ 2>/dev/null` → empty (the string survives only in `docs/` and `CHANGELOG.md`, which this unit does not touch).
3. `git status --short` showing exactly two deletions and one modification.
4. `git diff --stat main`.

**Adjudication:** PASS shape = two file deletions plus a four-line removal in `config.js` and the version bump. FAIL on: any `web/inbox.html` hunk; any other `archive/` path touched; another config key altered; version not bumped.

**STOP conditions:** `archive/live-wall/` on `main` contains files other than `index.html` and `wall.html` (record the inventory); `PUBLIC_HOST` is referenced anywhere under `web/` (it is not, as of 2026-09-02 — if it is, the wall is load-bearing and that is a ruling).

---

## End-of-run report (single message, final)

1. Per unit: PASS / FAIL / STOPPED, issue numbers, PR numbers, merge SHAs, and the `INBOX_VERSION` value each one shipped.
2. Confirmation that no unit touched `supabase/` or `.github/workflows/`, that no DDL was issued, and that no database write was made by the session.
3. The combined handler inventory: every `addEventListener` in `web/inbox.html` before the packet and after it.
4. The premise-gate numbers read at open and at close (`open_unbucketed`, `wall_rows`).
5. **Actions for Justin** (explicitly separated checklist):
   - Confirm the Actions tab shows `deploy-worker` green on each of the three merge SHAs, and that `deploy-supabase` did **not** run at all during this packet.
   - After each unit's deploy, on Android at ~390px, hard-refresh `https://inbox.justin-dec.workers.dev/inbox.html` and check `https://inbox.justin-dec.workers.dev/config.js` reads `003-A`, then `003-B`, then `003-C`. A stale value after a hard refresh = STOP.
   - **After U003-A:** five buttons across the bottom — To-do · Grocery · Research · Notes · Done — with the selected one coloured and the others grey. No Events, no Unsorted. Counts expected on open: To-do 14, Grocery 2, Research 7, Notes 4 (these drift as you capture). The Swimlanes / Matrix control appears on To-do only, Matrix greyed out and unresponsive — that is correct. The last card in a long list must be fully readable above the nav, not tucked under it. Check both light and dark; dark mode must still be dark on first load (the theme carry-over).
   - **After U003-B:** the To-do / Grocery / Research / Note / Done chip row under each card is gone; the timestamp stays; the to-do date box and tag dropdown stay; the grocery aisle dropdown still saves a correction.
   - **After U003-C:** `https://inbox.justin-dec.workers.dev/config.js` no longer mentions `textwall.justin-a-bost`. The app still signs in and captures.
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (all units PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_003_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
