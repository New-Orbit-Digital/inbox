# Build Packet 004 — Capture: to-do toggles + tags, deterministic grocery, classify retired

**Prepared:** 2026-09-02 · prep session with Justin · builds on `docs/packets/prep_004_grocery_rule.md` (contract and seed table pinned 2026-09-01) and on the live `classify` source at `CLASSIFY_VERSION = "002-A"` (deploy v12)
**Risk class:** high — this is the packet where the app stops asking a model what Justin meant. Grocery capture, the feature he uses most, changes engine mid-flight. The mitigation is ordering: the new path ships and is verified on the phone before the old one is removed, and the database trigger is dropped last, by hand.
**Merge policy:** auto-merge on PASS authorized for U004-A and U004-B. **U004-C is merge-on-Justin's-word only** — the planner posts PASS, and Justin confirms grocery capture is working on the deployed app before that merge happens.
**Concurrency:** run ALONE. 003 → 004 → 005 → 006 → 007 → 009 are strictly serial (`web/inbox.html`). Packet 008 is safe alongside (functions only) **except** during U004-C, which deploys through `deploy-supabase` and would race it.
**Deploy surface:** Worker for U004-A and U004-B (`web/**`); edge functions for U004-C (`supabase/functions/**`).
**DB prep status:** no DDL in this packet. Everything it writes already exists: `messages.important`, `messages.urgent`, `messages.tag`, `messages.grocery_category`, `grocery_prefs`, and the `tag_touch(text)` RPC (migration `20260830174400`, SECURITY INVOKER, granted to `authenticated`). **Dropping the `classify-on-insert` trigger is DDL and therefore is not part of this packet at all** — the INDEX rule is absolute ("DDL is never packet work… fired and certified in prep sessions via the connector and mirrored to `supabase/migrations/`"). It becomes **Prep-3**, a short prep session run after this packet closes, which fires the drop and writes the mirror file. The packet's job is to make the trigger unnecessary; Prep-3's job is to remove it. Until Prep-3 runs, the trigger stays live and harmless — every row this packet writes carries a non-null `confidence`, which the webhook skips.
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor (Claude Code Action) builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge with `merge_pull_request` only after posting an explicit PASS.

**Prep already done — do not redo:**
- **Grocery is deterministic by ruling (2026-09-01), superseding the 08-29 ruling.** Split rules, resolution order and the seed keyword table are pinned in [prep_004_grocery_rule.md](prep_004_grocery_rule.md). That document is a **contract input to U004-B**, not background reading.
- **The one open question in that document is now ruled (2026-09-02, Justin):** a capture containing ` - ` splits on it like any other separator, and a resulting fragment that is a generic shopping word is dropped. The stop-list is generic terms only — no store brand names. See U004-B.
- **Placement ruled (2026-09-02, Justin):** the seed keyword table lives in `web/config.js` beside `GROCERY_ORDER`, as prep_004 recommended.
- **`classify`'s fate ruled (2026-09-02, planner, on a mechanical fact):** it becomes a **ping-only stub**, not a deleted directory. Deleting `supabase/functions/classify/` from the repo does not undeploy anything — `deploy-supabase` deploys what is in its checkout, so the live v12 function would keep running and keep answering the webhook. Shipping an inert stub is what actually makes the endpoint dead. Deleting the deployed function afterwards is a Justin surface.
- **The live `classify` source on `main`**, top-level symbols, verified 2026-09-02: `CLASSIFY_VERSION`, `ALLOWED_ORIGIN`, `TIMEZONE`, `ROLLOVER`, `GROCERY_CATEGORIES`, `db`, `interface Entry`, `normalize`, `stripTags`, `todayLocal`, `CORS`, `json`, `plain`, `unauthenticated`, `Deno.serve`, `webhookMode`, `defaultTodo`, `directMode`, `parseGrocery`, `writeEntries`, `parse`. 263 lines. One call to `api.anthropic.com`.
- **The webhook trigger `classify-on-insert` is still live** (AFTER INSERT on `public.messages`). It skips any row whose `confidence` is non-null — which **both U004-A and U004-B exploit deliberately**, see below.
- **`savePref` already works and is already learning:** `grocery_prefs` has grown 4 → 14 rows with no packet work. U004-B must not touch it.
- **Live tag state read 2026-09-02:** 8 tags with `lane_order` 1–8 — `dev`(2 open) `ews`(3) `gtfo`(0) `house`(1) `new-orbit`(4) `personal`(3) `ptc`(0) `yard`(1). 14 open to-dos, **0 untagged**. `config.js`'s `TAGS` array is a stale five-entry fallback; packet 006 removes it, this packet does not.

## Hard constraints (verbatim, non-negotiable)

1. **After this packet there is no model call in this app except Primer.** `grep -rc "api.anthropic.com" web/ supabase/functions/` must be `0` for every file at close-out. A model call added on any path = FAIL.
2. **No DDL, no migration file, no trigger change by any unit — and not by Justin during this packet either.** Dropping `classify-on-insert` is **Prep-3**, a separate prep session that fires the drop through the connector and mirrors it to `supabase/migrations/`. This packet leaves the trigger live and is safe with it live. A unit that seems to need a schema change is a STOP.
3. **Never touch `.github/workflows/`.**
4. **Secret placeholders in every issue:** names only — ANTHROPIC_API_KEY, WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY — never a value; examples written WITHOUT angle brackets. WEBHOOK_SECRET retires with the trigger; if its value ever appears outside the trigger definition, treat it as burned and tell Justin.
5. One unit per issue. Branch `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop.
6. **Supabase connector discipline:** ONLY the connector named **Supabase Inbox** (project `qaabxgldjluqyccwhjzf`). Never call or disconnect any other Supabase connector.
7. **No new dependency, no build step.** Vanilla JS in the file's existing style.
8. **In-scope files, exhaustively:** U004-A → `web/inbox.html`, `web/config.js` (**version bump line only**). U004-B → `web/config.js`, `web/inbox.html`. U004-C → `supabase/functions/classify/index.ts`. Nothing else in any unit; `supabase/config.toml` stays untouched (the stub still wants `verify_jwt = false`).
9. **Ordering is a constraint, not a preference.** U004-B must be deployed and confirmed by Justin on the phone before U004-C's issue is filed. Filing them together is a FAIL of the packet, not of a unit.
10. **`INBOX_VERSION` bumps in U004-A and U004-B** (`004-A`, `004-B`); `CLASSIFY_VERSION` becomes `004-C`.

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first** (docs-only PR on a planner branch, merged by you).
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md`, and `docs/packets/prep_004_grocery_rule.md` via the GitHub connector. Connector down → STOP the packet.
- Ordering gate: `docs/packets/INDEX.md` shows 003 COMPLETE. Anything else → STOP (this packet edits `web/inbox.html` after 003's shell).
- Supabase Inbox binding: `select count(*) from todo_tags` returns a number.
- **Premise gate (literal):** `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/classify?ping=1` returns exactly `{"classify_version":"002-A"}`, and `https://inbox.justin-dec.workers.dev/config.js` contains `window.INBOX_VERSION = "003-C";`. Either one stale → STOP the packet.
- Trigger gate: `select tgname from pg_trigger where tgrelid = 'public.messages'::regclass and not tgisinternal;` includes `classify-on-insert`. If it is already gone, the `confidence: 1` guard in U004-A and U004-B is moot but harmless — record it and continue.
- File-size gate: any file over 300 KB → finding; no unit may edit it.

---

## U004-A — to-do capture: Important / Urgent toggles, tag dropdown, `#tag`, plain insert

**Why:** capture currently inserts a bare row and lets the webhook decide the tag and a due date. D-11 removes AI from to-do capture entirely; D-10 puts the two Eisenhower axes on the capture bar so a to-do arrives already sorted. This is also the unit that makes the row's shape match what packet 005's swimlanes read.
**Scope:** `web/inbox.html`, plus the one-line `INBOX_VERSION` bump in `web/config.js` and nothing else in that file.

### Pinned contract

**Capture bar, To-do only** (`filter === 'todo'`) — a second row under the existing input, `hidden` for every other section:

```html
  <div class="capopts" id="capopts" hidden>
    <button class="toggle" id="tgImportant" aria-pressed="false">Important</button>
    <button class="toggle" id="tgUrgent" aria-pressed="false">Urgent</button>
    <select class="mini" id="capTag" aria-label="Tag"></select>
  </div>
```

- `.toggle` CSS: same pill geometry as `.tagchip`; `aria-pressed=true` fills with `var(--todo)` and white text. Tap target ≥ 40px tall.
- **Toggle state** lives in two module-level booleans, both `false` by default, **reset to `false` after every successful add** (D-10).
- **How the toggles map to columns — the subtle part, pinned here because getting it wrong is invisible until packet 005 renders it.** `important` and `urgent` are nullable, and **null is what makes a row Unsorted** (SPEC data model; packet 005's `quadrantOf`). Writing `false/false` would make an untouched capture `!important && !urgent` = **Q4 Eliminate**, which is the opposite of what D-10 intends. So:
  - **Neither toggle pressed → insert `important: null, urgent: null`** (Unsorted).
  - **At least one pressed → insert both as booleans**, the pressed one `true` and the other `false`. Important alone → Q2 Schedule; Urgent alone → Q3 Delegate; both → Q1 Do.
  This is the same rule packet 005's overlay applies when a half-null row is touched, and it is a clarification of D-10's "either unset ⇒ Unsorted" (recorded in `SPEC.md` D-10 on 2026-09-02): *unset* means the user never answered, not that the answer was "no". A unit that writes `false/false` on an untouched capture = FAIL.
- **Tag dropdown:** options are the owner's tags **ordered by `last_used_at` desc, nulls last, then `tag` asc**. Widen the **existing** `loadTags()` query from `select('tag').order('tag')` to `select('tag, lane_order, last_used_at')` and derive both orderings client-side from that one result — packets 005 and 006 both build on this single query, so **do not add a second one**. `TAGS` keeps its current alphabetical meaning for the `#` autocomplete; the dropdown order is derived separately. A final option `(no tag)` with value `""` sits **last**, not first.
- **Default selection: the first option — the most recently used tag.** Ruled 2026-09-02. This is what `last_used_at` ordering is for, and Justin's history has 0 untagged open to-dos out of 14. The selection **persists across captures within the session** and resets to the most-recent on reload. It is one visible control showing exactly what will be applied; nothing is silent.
- An inline `#tag` in the text **overrides the dropdown for that capture only** and does not change the dropdown's selection.

**`add()` — rewritten for the to-do path, no model, no webhook dependency:**

1. `text = input.value.trim()`; empty → return.
2. `hash = text.match(/#([a-z0-9-]+)/i)` — **first match wins**. `tag = hash ? hash[1].toLowerCase() : (capTag.value || null)`.
3. `body = text.replace(/#[a-z0-9-]+/ig, ' ').replace(/\s+/g, ' ').trim()` — every `#tag` token stripped, whitespace collapsed. **If `body` is empty after stripping, do not insert**; leave the input as typed and return (a capture of only `#house` is a mistake, not a to-do).
4. `body` longer than 280 characters → do not insert; surface the existing kind of inline message and return. The `messages_body_check` constraint is 1–280 and a rejected insert must not look like a silent success.
5. Insert exactly: `{ session:'personal', body:body, owner:user.id, bucket:'todo', important:<per the rule above>, urgent:<per the rule above>, tag:tag, confidence:1 }`. **No `due_date`, no `auto`, no `recur`.**
   - **`confidence: 1` is deliberate and load-bearing, exactly as on the grocery path.** The `classify-on-insert` trigger is still live when this unit ships, and the deployed `classify` v12 skips any row whose `confidence` is non-null. Without this field the webhook's `defaultTodo` path fires on every capture and **overwrites the row** — it rewrites `tag` to `'personal'` (the `#tag` was already stripped client-side, so its server-side regex finds nothing) and writes a `due_date` that D-09 retired. State this in the issue body so the executor does not "clean it up".
6. On success, when `tag` is non-null: `db.rpc('tag_touch', { p_tag: tag })`. Fire-and-forget; a failure is logged to the console and does not block the insert or the re-render.
7. Reset both toggles, clear the input, `load()`, refocus.

- **The other sections' capture paths are unchanged in this unit** — Grocery still inserts a bare row and still relies on the webhook until U004-B lands. Research and Notes keep inserting `{session, body, owner, bucket}` as today.
- `CAPTURE_MODE.todo`'s placeholder changes to `"Add a to-do…  #tag to file it"` — the old placeholder advertises dates and "every tuesday", both retired (D-09, D-11).
- The `#` autocomplete popup stays exactly as it is.

**What-survives proof (required in the PR body):**
1. `grep -n "due_date" web/inbox.html` — list every hit with its line number and name what it is. Expected survivors after this unit, none of which it may touch: the `load()` select list, `complete()`'s recurrence roll-forward, `visible()`'s filter and its two sort comparators, the card renderer's date line, and the date `<input>`. **The requirement is narrow and exact: no hit inside `add()`.** Packet 005 removes the rest; this unit must not.
2. `grep -n "tag_touch" web/inbox.html` → exactly one call site.
3. `grep -c "api.anthropic.com" web/inbox.html` → `0`.
4. Handler inventory before → after.
5. `git diff --stat main` — two files (`inbox.html`, plus the one-line `config.js` bump).

**Adjudication:** PASS shape = two files; `add()` inserts exactly the eight named columns (`session`, `body`, `owner`, `bucket`, `important`, `urgent`, `tag`, `confidence`) and nothing else on the to-do path; an untouched capture writes `null`/`null` for the two toggles; `confidence` is `1`; toggles reset; `tag_touch` called once; `#tag` stripped from the body; empty-after-strip and over-280 both refuse to insert. FAIL on: a `due_date` written at capture; a model call; `auto` set on the to-do path; **`confidence` omitted or set to anything but `1`** — it is the webhook guard, not an oversight; `false`/`false` written for an untouched capture; the toggles persisting across adds; the grocery/research/note capture paths altered; version not bumped to `004-A`.

**STOP conditions:** `tag_touch` is absent from the database (`select proname from pg_proc where proname = 'tag_touch'` empty) — record it; the capture bar on `main` does not match the post-003 structure.

---

## U004-B — grocery: deterministic split + aisle rule, client-side

**Why:** the model is inconsistent on Justin's own vocabulary (`oat milk` filed both Beverages and Dairy), costs API credit per capture, and fails closed to a single "Other" row when the balance is empty. 95 distinct items across all history is a table, not a language problem. Read [prep_004_grocery_rule.md](prep_004_grocery_rule.md) in full before writing the issue; its split rules, resolution order and seed table are the contract.
**Scope:** `web/config.js`, `web/inbox.html`. Nothing else.

### Pinned contract — `web/config.js`

Add one key inside the `window.INBOX` object, after `GROCERY_ORDER`, containing the seed table from prep_004 **verbatim** — same categories, same keywords, same spellings:

```js
  // Deterministic aisle rules (packet 004). Keys are lowercase substrings matched
  // against the normalized item text; longest match wins. Not exhaustive by design —
  // a miss lands in "Other" and one correction teaches it permanently via grocery_prefs.
  GROCERY_KEYWORDS: {
    "Produce": ["apple","asparagus", …],
    …
  },
```

- Every category key must be a member of `GROCERY_ORDER`. The executor states in the PR body that it checked this and lists any mismatch (there should be none).
- `window.INBOX_VERSION = "004-B";`.

### Pinned contract — `web/inbox.html`

**`splitGrocery(text)` → array of item strings:**
- Split on: commas, ` and ` (spaces required, so "sandwich" is safe), ` & `, semicolons, newlines, and ` - ` (spaces required — **ruled 2026-09-02**).
- Trim each fragment; drop empties.
- Strip leading filler **at a word boundary**, case-insensitive, repeatedly until none matches. Pinned as a literal regex, because a naive prefix strip turns `apples` into `pples` and `anchovies` into `chovies` — and would break this unit's own first acceptance case: `/^(?:pick up|we need|i need|add|buy|get|grab|some|an|a)\s+/i`, applied in a loop. Strip a trailing `\s+to the (?:grocery )?list$`.
- **Drop a fragment that is, after trimming and lowercasing, exactly one of:** `grocery store`, `grocery`, `groceries`, `store`, `the store`, `list`, `grocery list`, `shopping list`. Generic terms only — **no store brand names**, so a brand can still be captured as an item.
- Preserve the remaining wording as the item text. Do not singularize, do not title-case.
- One fragment in → one item out. This is the normal case and must not regress.

**`aisleFor(item, prefs)` → category string:**
1. Exact match on `normalize(item)` in the caller's `grocery_prefs` map → that category. Always wins.
2. Otherwise the **longest** keyword in `GROCERY_KEYWORDS` that appears as a **substring** of `normalize(item)` — substring, not whole word, and that is intended: it is what makes `apples` match `apple` and `strawberries` match `strawberr`. The cost is occasional nonsense collisions (`toilet paper` contains `oil`, `steak` contains `tea`), which longest-match resolves correctly in every case in Justin's history, and which one aisle correction fixes permanently for anything it does not. Longest wins, so `chicken stock` beats `chicken`, `coconut milk` beats `milk`, `peanut butter` beats `butter`, `bell pepper` and `black pepper` both beat `pepper`. Ties (equal length, different categories) resolve by `GROCERY_ORDER` position, earliest first — state the rule in the PR body.
3. Otherwise `"Other"`.
- A category not present in `GROCERY_ORDER` is impossible by the config check above; if one appears anyway, use `"Other"`.

**Prefs loading:** `grocery_prefs` for the owner is fetched once in `start()` into a module-level map and refreshed after `savePref` writes. Do not query per item, and do not query on every keystroke.

**The grocery `add()` path:**
- `items = splitGrocery(text)`; empty → do not insert.
- Each item over 280 characters → truncate to 280 (the body check is a hard constraint and a dictation run-on must not fail the whole capture); note it in the PR body as intended behaviour.
- One insert call with an array of rows, each: `{ session:'personal', body:item, owner:user.id, bucket:'grocery', grocery_category:aisleFor(item, prefs), auto:false, confidence:1 }`.
- **`confidence: 1` is deliberate and load-bearing.** The still-live `classify-on-insert` trigger skips any row whose `confidence` is non-null, so these rows are invisible to the webhook for the whole window between this merge and **Prep-3**, the separate prep session that drops the trigger. Without it, the webhook would re-parse every row with the model — exactly what this packet exists to stop. State this in the issue body so the executor does not "clean it up".
- `auto: false` because a rule applied it, not a model. The card's `· auto` marker therefore stops appearing on new grocery rows, which is correct.
- No call to `classify` from any path. `grep -n "functions/v1/classify" web/inbox.html` → empty.

**Unchanged:** `savePref`, the aisle `<select>` on each grocery card, `renderGrocery`, the `Other` bucket's position in `GROCERY_ORDER`.

**What-survives proof (required in the PR body):**
1. `grep -c "api.anthropic.com" web/inbox.html web/config.js` → `0` and `0`.
2. `grep -n "functions/v1/classify" web/inbox.html` → empty.
3. `grep -n "savePref" web/inbox.html` → still present, unchanged body (paste it).
4. A worked table run against the executor's own code, pasted as output, for these inputs:
   - `apples, bread and milk` → 3 rows: Produce, Bakery, Dairy
   - `grocery store - toilet paper, salad, tomatoes, cucumbers` → 4 rows: Household & Cleaning, Produce, Produce, Produce (the leading fragment dropped)
   - `mustard` → 1 row, Condiments & Dressings
   - `dragon fruit` → 1 row, Other
   - `chicken stock` → 1 row, Soups & Canned Goods (not Meat)
   - `coconut milk` → 1 row, Soups & Canned Goods (not Dairy)
   - `peanut butter` → 1 row, Condiments & Dressings (not Dairy)
5. `git diff --stat main` — two files.

**Adjudication:** PASS shape = two files; the seed table byte-faithful to prep_004; the three-step resolution order implemented in that order; `confidence: 1` present with the stated rationale; the seven worked cases correct. FAIL on: any model call; a call to `classify`; `savePref` altered; prefs queried per item; a category outside `GROCERY_ORDER`; the single-item case producing anything but one row; version not bumped to `004-B`.

**STOP conditions:** `GROCERY_ORDER` on `main` is not the 22-value list prep_004 assumes (record what IS there); `prep_004_grocery_rule.md` is missing from `main`.

---

## U004-C — `classify` reduced to a ping-only stub

**Why:** with U004-B deployed, nothing calls this function for anything. Its grocery path is dead code that still holds an API key, and its webhook path is a live endpoint that will re-parse rows the moment a row arrives without a `confidence`. A stub is what makes the endpoint inert; a deleted directory would leave v12 running.
**Scope:** `supabase/functions/classify/index.ts`. Nothing else — **not `supabase/config.toml`** (`verify_jwt = false` stays as it is).
**File this issue only after Justin has confirmed on the deployed app that grocery capture splits and files correctly without the model.**

### Pinned contract

Replace the file's entire contents with a single-file `Deno.serve` stub:

- `const CLASSIFY_VERSION = "004-C";`
- **No imports.** No `createClient`, no supabase-js, no `npm:` specifier.
- **No `Deno.env.get` calls at all.** The function reads no secret, so ANTHROPIC_API_KEY and WEBHOOK_SECRET stop being function dependencies (they remain configured until Justin removes them).
- CORS on every response: `Access-Control-Allow-Origin: https://inbox.justin-dec.workers.dev`, `Access-Control-Allow-Methods: GET, OPTIONS`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`.
- `OPTIONS` → `200`, no body.
- `GET` with `ping=1` → `200` JSON exactly `{"classify_version":"004-C","retired":true}`.
- **Every other request, including the webhook's POST** → `410` JSON `{"error":"classify is retired","classify_version":"004-C"}`. A 410 is the honest answer and it is what will appear in `net._http_response` if the trigger is still firing when this deploys — which is the signal Justin uses to confirm the trigger still needs dropping.
- Every response carries `Content-Type: application/json` plus the CORS headers.
- Target: under 40 lines.

**Deleted in full:** `ALLOWED_ORIGIN` as a separate export if unused, `TIMEZONE`, `ROLLOVER`, `GROCERY_CATEGORIES`, `db`, `interface Entry`, `normalize`, `stripTags`, `todayLocal`, `unauthenticated`, `webhookMode`, `defaultTodo`, `directMode`, `parseGrocery`, `writeEntries`, `parse`, and the Anthropic fetch.

**Rules for the executor, stated in the issue:** rewrite the file in place; run `deno check supabase/functions/classify/index.ts` and paste output and exit code. **If the runner has no `deno`** (a known open backlog item — the executor runner lacked it during packet 001), say so plainly and record the refusal; the planner then adjudicates by reading the whole file and the run report notes that the syntax gate did not execute.

**What-survives proof (required in the PR body):**
1. Symbol inventory: all 21 top-level symbols listed in "Prep already done" → kept / deleted, with the survivors named.
2. `grep -c "api.anthropic.com" supabase/functions/classify/index.ts` → `0` (was `1`).
3. `grep -c "Deno.env.get" supabase/functions/classify/index.ts` → `0`.
4. `grep -n "createClient\|npm:" supabase/functions/classify/index.ts` → empty.
5. `git diff --stat main` — one file.
6. `wc -l` of the new file.

**Adjudication:** PASS shape = one file, under 40 lines, no imports, no env reads, no database client, ping and 410 exactly as specified. FAIL on: any hunk in `config.toml` or `web/`; any surviving model call; any env read; the webhook path still working; version not `004-C`.

**STOP conditions:** the file on `main` is not at `CLASSIFY_VERSION = "002-A"` (an unrecorded deploy — record what IS there); Justin has not yet confirmed U004-B on the phone.

---

## End-of-run report (single message, final)

1. Per unit: PASS / FAIL / STOPPED, issue numbers, PR numbers, merge SHAs, shipped version values.
2. `grep -rc "api.anthropic.com" web/ supabase/functions/` for every file — all `0`. This is the packet's headline claim and it is proved by grep, not asserted.
2b. An explicit statement that the `classify-on-insert` trigger is **still live** and that Prep-3 is required to retire it, with the reason (DDL is never packet work).
3. Confirmation that no DDL was issued, no migration file was written, nothing touched `.github/workflows/`, and `supabase/config.toml` is unchanged.
4. Connector readback of the last 5 inserted rows (`select body, bucket, grocery_category, tag, important, urgent, auto, confidence, created_at from public.messages order by created_at desc limit 5`) — the shape proof that captures are landing complete without the webhook.
5. **Actions for Justin** (explicitly separated checklist):
   - Confirm `deploy-worker` green on the U004-A and U004-B merges, and `deploy-supabase` green on the U004-C merge.
   - Hard-refresh the app on Android at ~390px, light and dark.
   - **After U004-A:** To-do capture shows Important and Urgent toggles plus a tag dropdown defaulting to your most recently used tag. Capture `packet 004 smoke` with both toggles on → the row appears, the toggles clear themselves, and the tag shown matches the dropdown. Capture `wash the car #house` → the row reads `wash the car` (no `#house` in the text) and carries the `house` tag whatever the dropdown said. **If either row comes back tagged `personal` or carrying today's date, STOP** — that is the still-live webhook overwriting the capture, which means the `confidence: 1` guard did not ship.
   - Also after U004-A, via the connector: `select body, tag, important, urgent, confidence from public.messages order by created_at desc limit 3` — a capture with neither toggle pressed must show `important` and `urgent` as **null**, not `false`. `false/false` renders as Eliminate in packet 005 and is a FAIL of this unit.
   - **After U004-B — the one that matters:** capture `apples, bread and milk` → three rows under Produce, Bakery and Dairy, **instantly**, with no "auto" marker. Capture `grocery store - toilet paper, salad, tomatoes, cucumbers` → four rows, no "grocery store" row. Capture `dragon fruit` → one row in Other; change its aisle to Produce, then capture `dragon fruit` again → it lands in Produce. Capture `mustard` → exactly one row.
   - **Then, and only then, tell the planner to file U004-C.**
   - **After U004-C:** fetch `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/classify?ping=1` → expect `{"classify_version":"004-C","retired":true}`. Capture one more grocery item and confirm it still splits and files (proving the client owes the function nothing).
   - **Do not drop the database trigger during this packet.** It is DDL, it belongs to **Prep-3**, and it needs a mirror migration so `supabase/migrations/` does not drift (the baseline file still contains the `create trigger` statement). Ask for Prep-3 once this packet is COMPLETE; it is a ten-minute session: drop `classify-on-insert`, capture one row, confirm `select count(*) from net._http_response where created > now() - interval '5 minutes'` stays flat, and mirror the drop as a new migration file.
   - **Justin surfaces after Prep-3:** delete the deployed `classify` function in the Supabase dashboard if you want the endpoint gone entirely, and remove the WEBHOOK_SECRET function secret. **Leave ANTHROPIC_API_KEY** — Primer needs a key of its own and packet 008 is not scoped yet.
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (all units PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_004_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. The same PR appends the end of model-backed grocery to `CHANGELOG.md` — **not** the trigger retirement, which this packet does not perform; it names Prep-3 as the next step instead. (`SPEC.md` D-18 was already corrected in the 2026-09-02 prep PR — do not re-edit it.) Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
