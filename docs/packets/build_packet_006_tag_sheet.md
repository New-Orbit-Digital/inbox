# Build Packet 006 — Tag sheet: rename, merge, reorder, delete-with-reassign

**Prepared:** 2026-09-02 · prep session with Justin · contracts pinned against the RPCs applied and certified in migration `20260830174400_quadrants_and_lanes`
**Risk class:** moderate — small surface, but the only packet whose controls can silently rewrite many rows at once. A merge or a delete-with-reassign touches every to-do carrying that tag, and there is no undo.
**Merge policy:** auto-merge on PASS authorized for U006-A and U006-B. Sequential; U006-B is filed after Justin confirms U006-A.
**Concurrency:** run ALONE among the web packets (`web/inbox.html`). Safe alongside 008.
**Deploy surface:** Worker only (`web/**`).
**DB prep status:** no DDL and none needed. The three RPCs exist, are SECURITY INVOKER, and are granted to `authenticated` with `anon` revoked: `tag_touch(p_tag text)`, `tag_rename(p_from text, p_to text) returns text` (`'noop'` | `'renamed'` | `'merged'`), `tag_delete(p_tag text, p_reassign_to text default null)`. **Reordering has no RPC** and is a plain `todo_tags` write under the owner policy — see U006-A.
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor builds on a branch; you open the PR, adjudicate the diff, and merge only after posting an explicit PASS.

**Prep already done — do not redo:**
- **`tag_rename` merges on collision by design.** Renaming `dev` to `ews` when `ews` exists moves every `dev` row to `ews`, deletes the `dev` tag row, and returns `'merged'`. That is a feature (D-06-era cleanup), and it is destructive in the sense that the old tag is gone. The UI must surface which of the two happened.
- **`tag_delete` reassigns, it does not orphan.** With `p_reassign_to` null, every row carrying the tag becomes untagged and lands in the Untagged lane; with a value, it moves to that tag and touches it.
- **Live tags read 2026-09-02:** `dev` 1, `ews` 2, `gtfo` 3, `house` 4, `new-orbit` 5, `personal` 6, `ptc` 7, `yard` 8 — `lane_order` contiguous 1–8, no nulls, no duplicates. `gtfo` and `ptc` have 0 open to-dos and are the natural test subjects for delete.
- **`web/config.js` still carries a stale `TAGS: ["personal","new-orbit","ews","ptc","gtfo"]`** — five entries against eight live tags. It is read only as a fallback before `todo_tags` loads, and by a first-run branch in `loadTags()` that pushes it *up* to the database. U006-B removes both.

## Hard constraints (verbatim, non-negotiable)

1. **All three mutations go through the RPCs.** No client-side `update public.messages set tag = …` loop, ever. A rename or delete implemented by iterating rows = FAIL: the RPCs are transactional and the loop is not.
2. **No DDL, no migration file, no new RPC.** A unit that wants a fourth RPC (a reorder RPC would be reasonable and is still a STOP) surfaces it as a finding for a prep session.
3. **Never touch `.github/workflows/`.**
4. **No model calls.** `grep -c "api.anthropic.com" web/` → `0`.
5. One unit per issue. Branch `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop.
6. **Secret placeholders in every issue:** names only, examples WITHOUT angle brackets.
7. **Supabase connector discipline:** ONLY **Supabase Inbox** (`qaabxgldjluqyccwhjzf`).
8. **No new dependency, no build step, no drag-and-drop** (D-08) — reordering is buttons.
9. **In-scope files, exhaustively:** U006-A → `web/inbox.html`, `web/config.js` (**version bump line only**). U006-B → `web/config.js`, `web/inbox.html`.
10. **`INBOX_VERSION` bumps in every unit** (`006-A`, `006-B`).

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first** (docs-only PR, merged by you).
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md`. Connector down → STOP.
- Ordering gate: `docs/packets/INDEX.md` shows 005 COMPLETE.
- Supabase Inbox binding: `select count(*) from todo_tags` returns a number.
- **Premise gate (literal):** `select proname from pg_proc where pronamespace = 'public'::regnamespace and proname in ('tag_touch','tag_rename','tag_delete');` returns all three. Missing any → STOP. And `select tag, lane_order from public.todo_tags order by lane_order;` shows contiguous, non-null, unique `lane_order` values. Gaps or nulls are not a STOP but must be recorded — U006-A's renumber-on-write fixes them.
- Deploy-state gate: `https://inbox.justin-dec.workers.dev/config.js` contains `window.INBOX_VERSION = "005-C";`.
- File-size gate: any file over 300 KB → finding.

---

## U006-A — the tag sheet

**Why:** lanes are ordered by `lane_order` and named by `tag`, and neither is editable anywhere in the app. Tags accumulate from capture typos and never get merged. The RPCs to fix that shipped in Prep-1 and have had no caller since.
**Scope:** `web/inbox.html`, plus the one-line `INBOX_VERSION` bump in `web/config.js` and nothing else in that file.

### Pinned contract

**Entry point:** a `Tags` button in the header's `.hbtns` group, in the existing `.link` style, **visible only when `filter === 'todo'`**. It calls packet 005 U-C's generic `openSheet(buildFn, label)` with its own content builder and the label `Manage tags`, reusing that element, scrim, styling and dismissal wholesale. A second sheet implementation = FAIL; so is threading a mode flag through the to-do sheet's builder.

**Contents:** the owner's tags in `lane_order` ascending, one row each. Every row carries, left to right:
- the tag name as an editable `<input type="text" class="mini">`,
- its open-to-do count in `var(--dim)`,
- `↑` and `↓` reorder buttons,
- a `Delete` button.

Below the list: a `Close` button. There is **no "add tag"** control — tags are created by capture (`#tag`) and that stays the only door.

**Rename** — on blur or Enter, when the value changed:
- Trim and lowercase. Reject and revert, with an inline message and no write, if the result is empty or does not match `/^[a-z0-9-]+$/` (the same shape the `#tag` parser accepts — a tag the parser cannot round-trip is a trap). "Unchanged" is already excluded by the trigger condition, so `tag_rename`'s `'noop'` return should be unreachable; if it ever arrives, log it and reload without a message rather than treating it as an error.
- Call `db.rpc('tag_rename', { p_from: old, p_to: next })`.
- **Act on the return value**: `'renamed'` → an inline confirmation naming both; `'merged'` → an inline confirmation stating plainly that the old tag is gone and its to-dos now carry the new one, including the count moved; `'noop'` → no message.
- Reload tags and rows afterwards. Both views must reflect the change without a page refresh.

**Reorder** — `↑` / `↓` move the row one position:
- The client recomputes `lane_order` for the **whole list** as 1..n in the new order and writes it in **one** `db.from('todo_tags').upsert([...])` call carrying `{owner, tag, lane_order}` for every tag. This renumbers away any pre-existing gaps or duplicates as a side effect, which is why gaps are recorded rather than blocking at the gate.
- `↑` on the first row and `↓` on the last are no-ops with the buttons `disabled`.
- No RPC exists for this and none is added (constraint 2). The owner RLS policy on `todo_tags` (`for all`, `owner = auth.uid()`) is what authorises it.

**Delete** — same two-tap pattern as the packet-005 card delete; `confirm()` and `alert()` remain forbidden:
- First tap expands the row into a reassign choice: a `<select>` of the other tags plus `(leave untagged)`, and a `Delete — tap again` button.
- Second tap calls `db.rpc('tag_delete', { p_tag: tag, p_reassign_to: choice || null })`.
- **The button's label states the consequence before the second tap**, using the live count: `Delete gtfo — 0 to-dos` or `Move 3 to-dos to ews, delete ews`… — the executor picks the wording; the requirement is that the number of affected rows is on screen before the destructive tap.
- After deleting, renumber `lane_order` 1..n with the same single upsert as reorder, so no gap is left behind.

**What-survives proof (required in the PR body):**
1. `grep -n "tag_rename\|tag_delete" web/inbox.html` → exactly one call site each.
2. `grep -n "from('messages').update\|from(\"messages\").update" web/inbox.html` → no hit that writes `tag` in a loop; list every surviving `messages` update with its purpose.
3. `grep -n "confirm(\|alert(" web/inbox.html` → empty.
4. `grep -c "id=\"sheet\"" web/inbox.html` → `1` (the packet-005 element, reused).
5. Handler inventory before → after, showing the sheet's listeners are replaced on each open, not accumulated.
6. `git diff --stat main` — two files (`inbox.html`, plus the one-line `config.js` bump).

**Adjudication:** PASS shape = two files; one sheet element; all three mutations through RPCs; the `'merged'` return surfaced distinctly from `'renamed'`; reorder as a single whole-list upsert; delete two-tap with the affected count visible; tag shape validated against `/^[a-z0-9-]+$/`. FAIL on: a row-by-row tag rewrite; a new RPC or migration; drag-and-drop; a native dialog; an "add tag" control; version not bumped to `006-A`.

**STOP conditions:** any of the three RPCs missing (premise gate); an RPC returns a permission error for the signed-in owner — record the exact error and STOP rather than falling back to direct writes.

---

## U006-B — retire the stale `TAGS` fallback

**Why:** `config.js` claims five tags; the database has eight. Nothing reads the list except a first-run branch that would push the stale five *into* `todo_tags` if the table ever came back empty — a seeding path from before the tags were real data. It is a small, quiet source of wrong.
**Scope:** `web/config.js`, `web/inbox.html`. File after Justin confirms U006-A.

### Pinned contract

- `web/config.js`: remove the `TAGS` key and its comment line. Every other key byte-identical. `window.INBOX_VERSION = "006-B";`.
- `web/inbox.html`:
  - `var TAGS = (cfg.TAGS || []).slice();` → `var TAGS = [];`.
  - In `loadTags()`, delete the `else if(TAGS.length){ … upsert … }` branch entirely — the first-run seeding path. An owner with no tags simply has no lanes until they capture with a `#tag`, which is correct.
  - Every other `TAGS` use is unchanged; the array is still populated from `todo_tags`.

**What-survives proof (required in the PR body):**
1. `grep -rn "TAGS" web/config.js` → empty.
2. `grep -n "TAGS" web/inbox.html` → the declaration and its read sites only; no upsert.
3. `grep -n "todo_tags" web/inbox.html` → exactly three sites: the single widened `select('tag, lane_order, last_used_at')` from packet 004 U-A, the `#tag` create path, and U006-A's reorder upsert. **A second `todo_tags` select anywhere is a FAIL** — 004, 005 and 006 all derive their orderings from that one query.
4. `git diff --stat main` — two files.

**Adjudication:** PASS shape = two files, net deletion, the seeding branch gone. FAIL on: `GROCERY_ORDER` or `GROCERY_KEYWORDS` disturbed; the `#tag` create path removed (it is the only way to make a tag); version not bumped.

**STOP conditions:** `config.js` on `main` does not contain the `TAGS` key (already removed — record and skip the unit rather than inventing work).

---

## End-of-run report (single message, final)

1. Per unit: PASS / FAIL / STOPPED, issue numbers, PR numbers, merge SHAs, shipped version values.
2. `select tag, lane_order from public.todo_tags order by lane_order;` read at open and at close, side by side.
3. Confirmation that no DDL was issued, no RPC was added, and no `messages` row was updated by the session itself.
4. **Actions for Justin** (explicitly separated checklist):
   - Confirm `deploy-worker` green on both merges, `deploy-supabase` idle.
   - Android at ~390px, light and dark, hard refresh.
   - **After U006-A:** a `Tags` button appears in the header on To-do only. Open it: eight tags in lane order with their counts. Move `personal` up one — the To-do lanes reorder to match, immediately. Rename `yard` to `house` — expect the sheet to tell you it **merged**, and `house` to now hold 2 to-dos. (If you would rather not merge anything, rename `gtfo` to `gtfo-old` instead and expect it to say **renamed**.) Delete `ptc` (0 to-dos) and confirm no lane vanishes that you still wanted. At no point should a browser popup appear.
   - **After U006-B:** the app still signs in, lanes still render, and capturing `test #brandnew` still creates the tag and the lane.
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_006_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. The same PR closes the `todo_tags.description` backlog line if the session confirmed the column is still unused. Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
