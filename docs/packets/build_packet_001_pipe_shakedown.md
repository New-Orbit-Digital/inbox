# Build Packet 001 — Pipe shakedown: version beacon + health endpoint

**Prepared:** 2026-08-31 · prep session with Justin · first packet run from this inventory; doubles as the shakedown of the whole pipe (executor → PR → adjudication → merge → Actions deploy → deployed-app proof)
**Risk class:** minimal — three added lines in a public config file and one new read-only function; no data writes; no existing behavior changes
**Merge policy:** auto-merge on PASS authorized for U001-A and U001-B. Units are SEQUENTIAL — U001-B is filed only after U001-A is merged (no shared files, but one deploy at a time keeps Justin's proofs unambiguous).
**Concurrency:** fine alongside packet 002 (no file overlap: this packet touches `web/config.js`, `supabase/functions/health/index.ts`, `supabase/config.toml`; 002 touches `supabase/functions/classify/index.ts` only). Never alongside 003+ (they own `web/`).
**Deploy surface:** Worker (after U001-A merges; `web/**` path trigger) and edge functions (after U001-B merges; `supabase/functions/**` + `supabase/config.toml` trigger). Both automatic on merge to `main`; proofs in Actions for Justin.
**DB prep status:** no DDL in this packet. Migration `20260831020016_health_support` (function `public.migration_versions(p_limit int)`, SECURITY DEFINER, execute granted to `service_role` only) is LIVE on `qaabxgldjluqyccwhjzf`, certified 2026-08-31 by readback (returns `20260831020016 health_support | 20260830174400 quadrants_and_lanes`).
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor (Claude Code Action) builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge with `merge_pull_request` only after posting an explicit PASS.

**Prep already done — do not redo:**
- The Worker deploys from `wrangler.toml` (`name = "inbox"`, `[assets] directory = "./web"`) to `https://inbox.justin-dec.workers.dev` — proven 2026-08-31 (three assets uploaded, sign-in and captures verified there by Justin).
- Edge functions deploy from `supabase/config.toml` per-function settings — proven 2026-08-31: `classify` redeployed as v11 from the runner with `verify_jwt = false` intact.
- `web/config.js` currently defines exactly one top-level statement, the `window.TEXTWALL = { … };` object literal. Nothing in this packet edits that object.
- Live table counts at prep (2026-08-31): `messages` 193, `todo_tags` 8, `grocery_prefs` 4. `messages` drifts as Justin captures; `todo_tags` and `grocery_prefs` rarely move.
- Ruled by Justin 2026-08-31: the live wall is cut entirely (repo cleanup lands in 003; nothing in this packet touches it).

## Hard constraints (verbatim, non-negotiable)

1. **Never touch `web/inbox.html`** — packet 003 owns it. If a unit appears to need an `inbox.html` edit, that is a STOP, not an improvisation.
2. **Never touch `.github/workflows/`** — writes return 403 for every automated token.
3. **Secret placeholders in every issue:** write names only — ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN — never a value. Placeholder examples in issue bodies are written WITHOUT angle brackets (the issue sanitizer strips them). Repeat the rule in each issue body.
4. One unit per issue. Branch naming `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop. Executor self-reports are not verification.
5. **Supabase connector discipline:** use ONLY the connector named **Supabase Inbox** (project `qaabxgldjluqyccwhjzf`). Any other Supabase connector present ("Supabase" = the ads-agent org, load-bearing for Justin's daily work; "Supabase Primer" = a retired empty project) is never called and never disconnected.
6. **This packet issues no DDL.** A unit that seems to need a schema change is a STOP.
7. **In-scope files, exhaustively:** U001-A → `web/config.js`. U001-B → `supabase/functions/health/index.ts` (new), `supabase/config.toml`. Nothing else in either unit.
8. **No model calls.** Neither unit calls the Anthropic API or introduces any AI; a unit that does is a STOP.

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first:** open a docs-only PR on a planner branch that changes only the 001 row in `docs/packets/INDEX.md`, and merge it yourself (docs-only, deploys nothing; `main` requires a PR).
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md` via the GitHub connector. Connector down → STOP the packet.
- Supabase Inbox binding: `select count(*) from todo_tags` returns a number. Missing connector or error → STOP the packet.
- Premise gate (literal): `select version, name from public.migration_versions(2)` returns `20260831020016 health_support` and `20260830174400 quadrants_and_lanes`. Anything else → STOP the packet (the prep premise is stale).
- File-size gate: list `web/` and `supabase/functions/` with sizes; expected largest is `web/inbox.html` at roughly 37 KB. Any file over 300 KB → finding; no unit may edit it.

## Session role

You are the PLANNER. Issues tag `@claude`; the executor (Claude Code Action) builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge with `merge_pull_request` only after posting an explicit PASS.

---

## U001-A — `web/config.js`: `INBOX_VERSION` beacon

**Why:** every later packet's deploy proof is "fetch `config.js`, read the version." Nothing in the app currently reports what build is deployed, which is exactly how the old dashboard-upload workflow produced silent staleness.
**Scope:** `web/config.js`. Nothing else.

**Pinned contract:** append the following at the END of `web/config.js`, after the closing `};` of the `window.TEXTWALL` object, as the file's final lines:

```js

// Build beacon — bumped by every unit that ships a web/ change. Deploy proof.
window.INBOX_VERSION = "001-A";
console.log("inbox build", window.INBOX_VERSION);
```

- The `window.TEXTWALL` object is byte-identical before and after (every key, value, comment, and line inside it).
- No other statement, no reformatting, no renaming (`TEXTWALL` → anything is packet 003's job).
- The file must still parse: executor runs `node --check web/config.js` and pastes the (empty) output plus the exit code.

**Rules for the executor, stated in the issue:** append-only edit; paste `git diff --stat main` (expect `1 file changed, 4 insertions(+)`) and the `node --check` result into the PR body.

**Adjudication:** diff = one file, only additions, all at the end of the file, exactly the four lines above (one blank, one comment, two statements). FAIL on: any removed or modified line; any hunk not at end-of-file; any other file; any other statement.

**STOP conditions:** `web/config.js` on `main` does not end with the `window.TEXTWALL` object's closing `};` (premise mismatch — record what IS there); executor cannot run `node --check`.

---

## U001-B — `supabase/functions/health/index.ts` (new) + `supabase/config.toml` entry

**Why:** Cowork sessions gate on live state and deploy state. The health endpoint is the cheap, no-secret, no-connector way to read both: which build is deployed, which migrations are live, how big the tables are.
**Scope:** `supabase/functions/health/index.ts` (new file), `supabase/config.toml` (one added block). Nothing else. `classify` is not touched.

**Pinned contract — `supabase/config.toml`:** append exactly this block at the end of the file (leave the existing `[functions.classify]` block untouched):

```toml

[functions.health]
verify_jwt = false
```

**Pinned contract — `supabase/functions/health/index.ts`:** single file, no shared imports, `Deno.serve`. Imports only `createClient` from `npm:@supabase/supabase-js@2`.

- Constant `HEALTH_VERSION = "001-B"`.
- Auth: none. Read-only. It builds a supabase-js client from the auto-injected `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (names only) purely to run counts and the RPC below; it never returns row contents and never writes.
- CORS: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, OPTIONS`, `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`. `OPTIONS` → `200` with those headers.
- Any method other than `GET`/`OPTIONS` → `405` JSON `{"error":"GET only","health_version":"001-B"}`.
- `GET` with query `ping=1` → `200` JSON exactly `{"health_version":"001-B"}`. No database access on this path.
- `GET` otherwise → `200` JSON with exactly these keys:
  - `app`: the string `"inbox"`
  - `health_version`: `"001-B"`
  - `migrations`: array of strings, newest first, from `supabase.rpc("migration_versions", { p_limit: 5 })`, each formatted `${version}_${name}` (or `${version}` when `name` is null)
  - `tables`: object `{ "messages": n, "todo_tags": n, "grocery_prefs": n }` from `select("id", { count: "exact", head: true })` on each table (for `todo_tags` and `grocery_prefs`, which have no `id` column, count with `select("*", { count: "exact", head: true })`) — integers
  - `checked_at`: ISO-8601 timestamp string
- Any database or RPC error → `500` JSON `{"error": <message string>, "health_version":"001-B"}`.
- Every response carries `Content-Type: application/json` and the CORS headers.

**Rules for the executor, stated in the issue:** create the file and the config block only; no edits to `classify`; no secret values anywhere; run `deno check supabase/functions/health/index.ts` and paste its output and exit code into the PR body; paste `git diff --stat main` (expect exactly 2 files: one new, one with 3 insertions).

**What-survives proof (required in the PR body):** the full `git diff --stat main`; the `deno check` output; a one-line statement that `supabase/functions/classify/index.ts` is untouched (`git diff main -- supabase/functions/classify/index.ts` is empty).

**Adjudication:** read the full diff. PASS shape = one new file + one 3-line addition at the end of `config.toml`. FAIL on: any hunk in `classify`; any write to any table; any secret value; missing `?ping=1` path; missing `405` for non-GET; any extra top-level response key; missing CORS headers; `deno check` not pasted or non-zero.

**STOP conditions:** `supabase/config.toml` on `main` does not contain a `[functions.classify]` block (premise mismatch); the executor cannot run `deno check` — record the exact refusal, then adjudicate the file by reading it in full and note in the run report that the syntax gate was not executed.

---

## End-of-run report (single message, final)

1. Per unit: PASS / FAIL / STOPPED, issue numbers, PR numbers, merge SHAs.
2. Confirmation no unit touched `web/inbox.html`, `supabase/functions/classify/`, or `.github/workflows/`, and no DDL was issued.
3. The live table counts you read via the connector at close-out (`messages`, `todo_tags`, `grocery_prefs`), stated as the prediction for Justin's health fetch.
4. **Actions for Justin** (explicitly separated checklist):
   - Confirm the Actions tab shows `deploy-worker` green on the U001-A merge SHA and `deploy-supabase` green on the U001-B merge SHA (deploy proof).
   - Fetch `https://inbox.justin-dec.workers.dev/config.js` in a browser tab with a hard refresh (Ctrl+F5) — expect the last three lines to contain `window.INBOX_VERSION = "001-A";`. Any other value after a hard refresh = STOP; report it.
   - Fetch `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/health?ping=1` — expect exactly `{"health_version":"001-B"}`. A 401, a 404, or any other body = STOP; report it.
   - Fetch `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/health` — expect `app: "inbox"`, `health_version: "001-B"`, `migrations` beginning with `20260831020016_health_support`, and `tables` matching item 3 within ±5 on `messages` and exactly on the other two.
   - Open the app at `https://inbox.justin-dec.workers.dev/inbox.html`, hard refresh, capture one grocery item: it still categorizes (proves the unrelated `classify` deploy path did not regress).
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (all units PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_001_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
