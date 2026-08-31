# Build Packet 002 — Classifier slim-down: grocery-only `classify`, direct-call entry, ping

**Prepared:** 2026-08-31 · prep session with Justin · contracts pinned against the deployed `classify` source (deploy v10 mirrored, redeployed as v11 from CI and verified by a live grocery capture)
**Risk class:** low-moderate — rewrites the one live model path; no schema change; no client change; grocery behavior through the webhook must be unchanged to the byte of the row it writes
**Merge policy:** auto-merge on PASS authorized for U002-A (the only unit).
**Concurrency:** run ONLY after packet 001 is COMPLETE. Both packets deploy through `deploy-supabase`, which redeploys every function from its own checkout, so two merges in flight can race and the later-starting run can overwrite the earlier one's function. Fine alongside 003+ once they exist (no file overlap: this packet touches `supabase/functions/classify/index.ts` only).
**Deploy surface:** edge functions (`supabase/functions/**` trigger). Automatic on merge to `main`; proof in Actions for Justin.
**DB prep status:** no DDL in this packet. No migration is needed; `grocery_prefs` and `todo_tags` are read exactly as today.
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor (Claude Code Action) builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge with `merge_pull_request` only after posting an explicit PASS.

**Prep already done — do not redo:**
- The deployed function (mirror at `supabase/functions/classify/index.ts`) reads secrets by these names only: ANTHROPIC_API_KEY, WEBHOOK_SECRET, TIMEZONE (optional), DAY_ROLLOVER_HOUR (optional), plus the auto-injected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Model id `claude-haiku-4-5-20251001`. Verified 2026-08-30 by reading the deployed source through the Supabase Inbox connector.
- The database webhook `classify-on-insert` (AFTER INSERT on `public.messages`) POSTs `{type:"INSERT", record:{…}}` with headers `Content-type`, `x-webhook-secret`, `apikey`. It stays live until packet 004 retires it. Its secret value lives in the trigger definition and in the function secret; it never appears in the repo or in any issue.
- `supabase/config.toml` carries `[functions.classify] verify_jwt = false` and must keep it: the webhook sends no user JWT. The direct-call path verifies the user's JWT in code instead.
- Top-level symbols in the current file, for the what-survives proof: `TIMEZONE`, `ROLLOVER`, `GROCERY_CATEGORIES`, `DEFAULT_TAGS`, `db`, `interface Entry`, `normalize`, `stripTags`, `todayLocal`, `Deno.serve`, `handleGrocery`, `handleTodo`, `handleEvent`, `writeEntries`, `parse`.
- Ruled by Justin (2026-08-29/30): no AI anywhere in this app except grocery split/categorization and Primer. The grocery split ("apples, bread and milk" → three rows) is kept — it is what makes dictation work. To-do and event parsing, auto-tagging, and date logic are deleted, not disabled.
- Transitional rule (planner, 2026-08-31): until packet 005 replaces the to-do views, the v7 UI still filters to-dos by `due_date` and groups by `tag`. Webhook-inserted to-do rows therefore get the function's existing deterministic fallback — `due_date = today (local, 3am rollover)`, `tag` = the typed `#tag` if present else `personal`, `auto = false`, `confidence = 0` — with NO model call. Packet 004 deletes this path with the webhook.

## Hard constraints (verbatim, non-negotiable)

1. **In-scope file, exhaustively: `supabase/functions/classify/index.ts`.** Nothing else. Any hunk in `supabase/config.toml`, `web/`, any other function, or any migration = FAIL. If the unit appears to need `config.toml`, that is a STOP, not an improvisation.
2. **Never touch `.github/workflows/`** — writes return 403 for every automated token.
3. **Secret placeholders in every issue:** names only — ANTHROPIC_API_KEY, WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY — never a value; examples written WITHOUT angle brackets (the issue sanitizer strips them). Repeat the rule in the issue body.
4. One unit per issue. Branch naming `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop. Executor self-reports are not verification.
5. **Supabase connector discipline:** use ONLY the connector named **Supabase Inbox** (project `qaabxgldjluqyccwhjzf`). Any other Supabase connector present ("Supabase" = the ads-agent org, load-bearing for Justin's daily work; "Supabase Primer" = a retired empty project) is never called and never disconnected.
6. **This packet issues no DDL.** A unit that seems to need a schema change is a STOP.
7. **Exactly one model call site survives:** the grocery parse. A second Anthropic call anywhere in the file = FAIL. A model call on the to-do, event, research, or note path = FAIL.
8. **The webhook grocery path writes exactly what it writes today:** first row updated with `{body, grocery_category, confidence: 0.95, auto: true}`; siblings inserted with the same shape plus `session`, `owner`, `bucket`, `status: "open"`; prefs override before the model's category; unknown category → `"Other"`. Any change to those semantics = FAIL.

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first:** open a docs-only PR on a planner branch that changes only the 002 row in `docs/packets/INDEX.md`, and merge it yourself.
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md` via the GitHub connector. Connector down → STOP the packet.
- Ordering gate: `docs/packets/INDEX.md` shows packet 001 as COMPLETE. RUNNING or READY → STOP and report (deploy race, see Concurrency).
- Supabase Inbox binding: `select count(*) from todo_tags` returns a number. Missing connector or error → STOP the packet.
- Premise gate (literal): `Supabase Inbox: list_edge_functions` lists `classify` with `verify_jwt: false` and `version` ≥ 11. Anything else → STOP the packet (the prep premise is stale).
- File-size gate: list `web/` and `supabase/functions/` with sizes; any file over 300 KB → finding; no unit may edit it.

## Session role

You are the PLANNER. Issues tag `@claude`; the executor (Claude Code Action) builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge with `merge_pull_request` only after posting an explicit PASS.

---

## U002-A — `supabase/functions/classify/index.ts`: grocery-only, two entries, ping

**Why:** with tag, quadrant, and segment chosen by hand in the app, the classifier's only remaining job is the grocery split + category. Every other path (to-do dates and tags, events, the `#todo` override) is AI doing what process now does, and it will silently fight packet 004's client-side capture if it survives.
**Scope:** `supabase/functions/classify/index.ts`. Nothing else.

### Pinned contract

**Constants and setup**
- `CLASSIFY_VERSION = "002-A"`.
- `ALLOWED_ORIGIN = "https://inbox.justin-dec.workers.dev"`. CORS headers on EVERY response: `Access-Control-Allow-Origin: <ALLOWED_ORIGIN>`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-webhook-secret`. `OPTIONS` → `200` with those headers and no body.
- Keep `GROCERY_CATEGORIES` (the exact 22-entry list, unchanged), `normalize`, `todayLocal` (with `TIMEZONE`/`ROLLOVER` as today), `interface Entry`, the service-role `db` client, `writeEntries`, and `parse` (the single Anthropic call: model `claude-haiku-4-5-20251001`, `max_tokens: 1500`, `anthropic-version: 2023-06-01`, JSON fence stripping, `entries` array or `[]`).
- Delete `DEFAULT_TAGS`, `handleTodo`, `handleEvent`, and the to-do and event system prompts in their entirety. Keep `stripTags` only if the transitional to-do path uses it (it does — see below).

**Routing (in this order)**
1. `OPTIONS` → `200`.
2. `GET` with query `ping=1` → `200` JSON exactly `{"classify_version":"002-A"}`. No database or model access. Any other `GET` → `405` JSON `{"error":"GET ping only","classify_version":"002-A"}`.
3. `POST` with header `x-webhook-secret` present → **webhook mode**: the header must equal the WEBHOOK_SECRET env value, else `403` text `forbidden` (unchanged from today).
4. `POST` with header `Authorization` present and no `x-webhook-secret` → **direct mode**.
5. Any other request → `401` JSON `{"error":"unauthenticated","classify_version":"002-A"}`.

**Webhook mode** (payload `{type, record}` as today)
- Skip exactly as today when `type !== "INSERT"`, `record.owner` is null, or `record.confidence != null` → `200 {"skipped":true}`.
- `record.bucket === "grocery"` → the existing grocery behavior, unchanged: `parseGrocery(record.body, record.owner)` (below) then `writeEntries` with `rowFor = e => ({ body: e.text, grocery_category: e.grocery_category, confidence: 0.95, auto: true })` → `200 {"filed": n}`. On any error → update the row to `{grocery_category: "Other", confidence: 0, auto: false}` and return `200 {"error": String(err)}` (unchanged).
- `record.bucket === "todo"` → the transitional deterministic default, NO model call: `hash = body.match(/#([a-z0-9-]+)/i)`; if a tag was typed, `upsert` `{owner, tag}` into `todo_tags` (as today) and use it, else `tag = "personal"`; update the row to `{ body: stripTags(body), due_date: todayLocal(), tag, auto: false, confidence: 0 }` → `200 {"filed": 1}`. (Packet 004 deletes this path.)
- Any other bucket (`research`, `note`, `event`, null) → `200 {"ignored": true}` with no write.

**Direct mode** (`POST` JSON `{"text": string}`)
- Verify the caller: extract the bearer token from `Authorization`, call `db.auth.getUser(token)`; error or no user → `401` JSON `{"error":"unauthenticated","classify_version":"002-A"}`. The user's id is the `owner` for prefs lookup.
- Validate: `text` must be a non-empty string ≤ 280 characters after trim, else `400` JSON `{"error":"text required (1–280 chars)","classify_version":"002-A"}`.
- Run `parseGrocery(text, owner)` and return `200` JSON `{"entries":[{"text":"…","category":"…"}, …]}` — note the key is `category` in the direct response (the client maps it to `grocery_category` when it inserts in 004).
- **No database writes on this path.** Reads are limited to `grocery_prefs` for the caller.
- On a model or parse failure → `200` JSON `{"entries":[{"text": <trimmed input>, "category":"Other"}], "degraded": true}` — never a 5xx for a model failure (the client shows a retry affordance in 004).

**`parseGrocery(text, owner)`** — the single shared grocery routine, used by both modes
- Calls `parse(text, <the existing grocery system prompt, verbatim, including the GROCERY_CATEGORIES join>)`.
- Applies `grocery_prefs` for `owner` (`select item,category … in(normalized texts)`) with prefs winning over the model's category; a model category outside `GROCERY_CATEGORIES` → `"Other"`.
- Returns `Entry[]` with `text` and `grocery_category` set. Empty model output → `[]` (webhook mode then returns `{"skipped":true}` as today; direct mode returns the degraded single entry).

**Rules for the executor, stated in the issue:** rewrite the file in place, single file, no shared imports; keep the existing grocery system prompt text byte-identical; run `deno check supabase/functions/classify/index.ts` and paste output + exit code; paste `git diff --stat main` (expect exactly one file).

**What-survives proof (required in the PR body, adjudicated line-by-line):**
1. Symbol inventory table: every top-level symbol before (the 15 listed in Prep already done) → kept / deleted / renamed / added, with the added ones named (`CLASSIFY_VERSION`, `ALLOWED_ORIGIN`, `parseGrocery`, the CORS helper, any router helper).
2. `grep -c "api.anthropic.com" supabase/functions/classify/index.ts` before and after — both must be `1`.
3. `grep -n "handleTodo\|handleEvent\|DEFAULT_TAGS\|RRULE" supabase/functions/classify/index.ts` after — must be empty.
4. `deno check` output, exit 0.

**Adjudication:** read the full diff. PASS shape = one file rewritten; the grocery system prompt and `GROCERY_CATEGORIES` byte-identical; exactly one fetch to the Anthropic API; the five routing branches present in the stated order; webhook grocery semantics unchanged per constraint 8; direct mode has no `.update(`/`.insert(`/`.upsert(` calls; ping returns the exact JSON. FAIL on: any hunk outside the file; a second model call; a model call on any non-grocery path; a write on the direct path; a 5xx on model failure in direct mode; `verify_jwt` mentioned as if changed; any secret value; `deno check` missing or non-zero.

**STOP conditions:** the deployed source on `main` differs materially from the symbol inventory above (record what IS there); the executor cannot run `deno check` — record the refusal, adjudicate by reading the whole file, and say in the run report that the syntax gate did not execute.

---

## End-of-run report (single message, final)

1. U002-A: PASS / FAIL / STOPPED, issue number, PR number, merge SHA, and the symbol-inventory verdict.
2. Confirmation the diff touched only `supabase/functions/classify/index.ts`, no DDL was issued, and nothing touched `.github/workflows/`.
3. **Actions for Justin** (explicitly separated checklist):
   - Confirm the Actions tab shows `deploy-supabase` green on the merge SHA.
   - Fetch `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/classify?ping=1` — expect exactly `{"classify_version":"002-A"}`. Any other body = STOP; report it.
   - In the app (`https://inbox.justin-dec.workers.dev/inbox.html`, hard refresh), Grocery tab: capture `apples, bread and milk` — expect three rows within a few seconds, each carrying a category (Produce / Bakery / Dairy is the likely split; three categorized rows is the pass, the exact aisles are not).
   - To-do tab: capture `packet 002 smoke #personal` — expect one row, text `packet 002 smoke`, under the personal tag, dated today, with no other change to it.
   - Do not capture on the Events tab (retired; hidden in 003).
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_002_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
