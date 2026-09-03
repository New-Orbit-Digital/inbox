# current.md — as of 2026-09-03 (PACKET 004 COMPLETE; 005–009 READY)

## Gates at next open
- `select count(*) from todo_tags` via Supabase Inbox returns a number (binding proof; 8 today).
- `select version, name from public.migration_versions(2)` = `20260902020131 primer_realtime`, `20260902014310 primer_schema`.
- `select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public';` = `messages`, `primer_cards`, `primers`. Publication membership is invisible to a schema readback, so it gets its own gate.
- `select count(*) from public.messages where owner is null` = **0**, and `pg_policies` shows exactly one policy on `public.messages` (`owner full access`).
- `select count(*) from public.messages where bucket is null and status = 'open'` = **0**. Structural since packet 003; a non-zero reading means something outside the app wrote one — STOP and find out what.
- **Cheap, no-connector gates — always with a cache-buster** (see mechanics below; a plain fetch served a stale value twice in packet 004): `https://inbox.justin-dec.workers.dev/config.js?cb=1` → `INBOX_VERSION` (**`004-B`** until 005 lands); `…/functions/v1/health`; `…/functions/v1/classify?ping=1&cb=1` → **`{"classify_version":"004-C","retired":true}`**.
- **Deferred verification lives in [bookmark issue #41](https://github.com/New-Orbit-Digital/inbox/issues/41)**, not in a blocked session. Read it at session open; append to it rather than stopping for anything that does not gate the next unit.

## State
- **Packets 001–004 COMPLETE. 005 through 009 are written in full and READY.** Nothing is IN PREP.
- **Packet 004 ran and closed 2026-09-02 → 09-03** — all three units PASS, see [the run report](packets/reports/packet_004_report_20260903.md). **There is no model call left in this app**: `grep -rc "api.anthropic.com" web/ supabase/functions/` is `0` for every file. Capture is entirely client-side — to-do toggles + tag dropdown + `#tag`, and a deterministic grocery split + 250-keyword aisle table in `web/config.js`. `classify` is a 35-line ping-only stub answering `410` to everything but `?ping=1`.
- **The `classify-on-insert` trigger is STILL LIVE.** Packet 004 left it deliberately (DDL is never packet work) and is safe with it live: every row the app writes now carries `confidence: 1`, which the webhook skips. **Prep-3 drops it** and mirrors the drop to `supabase/migrations/`. Proof it is harmless, from the run: three grocery inserts → three webhook POSTs → three `200 {skipped}`, no model call. Once the stub is deployed those POSTs return `410`, which is the signal in `net._http_response` that the trigger still fires.
- **The Anthropic API balance being empty no longer affects the app.** It was degrading every grocery capture to a single `Other` row; that path is gone. It now blocks **Primer only**, i.e. packet 008.
- **Live wall fully cut in repo and database.** The old `textwall` Worker is still deployed in Justin's *personal* Cloudflare account and still public — a Justin surface, tracked in bookmark issue #41.
- **Prep-2 complete 2026-09-02.** Primer corpus at `docs/primer/`; `20260902014310_primer_schema` and `20260902020131_primer_realtime` applied and certified.
- **PWA icons are on `main`** (`web/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`). Packet 007's asset gate is satisfied; this is no longer a Justin surface.
- Live shape 2026-09-03: `messages` 219, `todo_tags` 8, `grocery_prefs` 14, `primers` 0, `primer_cards` 0. Open: to-do 16 (6 Unsorted), grocery 5, unbucketed 0.
- Deployed: `classify` `004-C` (retired stub), `health` `001-B`. Worker serving `INBOX_VERSION = "004-B"`.
- Supabase Auth: Site URL `https://inbox.justin-dec.workers.dev/inbox.html`; redirect `…/**`.
- Executor auth is `claude_code_oauth_token` since 2026-09-01 (`e6a3b70`). `.github/workflows/claude.yml` carries `denoland/setup-deno@v2`, and `deno check` ran for real in packet 004 U-C.

## Open behavioural gap — no tap-to-complete until packet 005
Packet 003 U-B removed the bucket chip row, the only pointer-driven caller of `complete()`. Its one remaining caller is the `x` key, and `.keys` is hidden under `@media (hover:none)`. **On the phone there is still no way to complete or un-complete a to-do, research or note card**, and the recurrence roll-forward is keyboard-only. Grocery is unaffected. Justin ruled 2026-09-02 to accept the gap; 004 has now run, so **packet 005 is next and its completion affordance is load-bearing — it must cover research and notes as well as to-dos.**

## Pending, in order
1. **Prep-3** — drop the `classify-on-insert` trigger via the Supabase Inbox connector and mirror it to `supabase/migrations/`. Ten minutes. Certify by capturing one row and confirming `net._http_response` stays flat.
2. **Packet 005** (to-do views + the load-bearing completion affordance), then 006, 007 — strictly serial on `web/inbox.html`, each after the previous is COMPLETE.
3. **008 can run any time** — functions only, and the U004-C deploy race it had to avoid is over. Its one blocker is a Justin check: `ANTHROPIC_API_KEY` set as a Supabase **function** secret on a funded account.
4. **009 runs last** — needs 007 (web chain) and 008 (its two functions) both COMPLETE.
5. **Justin surfaces:** all in [bookmark issue #41](https://github.com/New-Orbit-Digital/inbox/issues/41) — workflow pastes (including `Bash(node:*)`), the old `textwall` Worker, the API balance, branch cleanup, and the deferred app checks.

## Mechanics that must not be relearned
- **A pinned proof can contradict a pinned behaviour.** Packet 003 U-A demanded both a `tw-theme` carry-over and zero occurrences of that string. The behaviour wins, the executor surfaces the conflict instead of gaming the grep, and the planner records an erratum. Write greps that name the permitted occurrences.
- **Three different credential stores, easily confused.** GitHub repo secret CLAUDE_CODE_OAUTH_TOKEN authenticates the executor and bills the Claude subscription. Supabase **function** secret ANTHROPIC_API_KEY authenticates the app's own runtime model calls and bills the API. WEBHOOK_SECRET authenticates the database webhook into `classify`. They live in different places and none substitutes for another.
- **`verify_jwt` is enforced by the gateway, before the function body runs.** So a function with `verify_jwt = true` cannot answer an unauthenticated `?ping=1`, and D-25's deploy proof would be dead. All four functions therefore run `false` with the auth check in code; RLS is the boundary, not the gateway.
- **Realtime membership is invisible to a schema readback.** `supabase_realtime` carried only `messages` until 2026-09-02, enabled out-of-band through the dashboard — no migration mentioned it. A subscription to an unpublished table attaches and silently delivers nothing, which is why packet 009 gates on `pg_publication_tables` rather than trusting the column counts.
- **Packet 008's functions cannot be exercised until packet 009 ships.** They need a signed-in user's JWT and only a browser can produce one; a connector session has no `auth.uid()`, so it cannot even insert a `primers` row without naming the owner. 008 is proven by its pings; 009 U-A's first primer is its real acceptance test.
- **A version ping can be served stale from cache.** In packet 004 a plain fetch of `config.js` returned `001-A` while `main` was at `003-C`, and `classify?ping=1` returned `002-A` minutes after `004-C` deployed. Both were correct with a cache-buster. **Every version gate uses a cache-buster or a hard refresh** — otherwise a healthy deploy reads as a STOP.
- **An executor cannot execute code.** `claude.yml` allows `Bash(node --check:*)` and `Bash(deno check:*)` only — parse gates, not runtimes. A proof of the form "run your harness and paste the output" cannot be satisfied; packet 004 asked twice and got honest transcriptions. **The planner runs the committed branch**, which is how U-B's defect was found. A paste adding `Bash(node:*)` is in bookmark issue #41.
- **Validate a contract against live data, not only its acceptance list.** Packet 004 U-B passed all seven pinned cases while `half and half` — a keyword in its own seed table and a real item in Justin's history — was unreachable, because ` and ` was also a pinned separator. `savePref` keys on the body, so no correction could ever have repaired it. The 91-item corpus run found it in seconds.
- **Deleting a function's directory from the repo does not undeploy it.** `deploy-supabase` deploys its checkout; a removed function keeps running at its last deployed version. Retirement means shipping an inert stub, then deleting the deployed function by hand. This is why packet 004 U-C is a stub.
- The webhook `classify-on-insert` **skips any row whose `confidence` is non-null** — packet 004 uses that deliberately on **every** insert path, grocery and to-do, so client-filed rows are invisible to the model until Prep-3 drops the trigger. Without it the webhook rewrites a to-do's tag to `personal` and stamps a retired `due_date`.
- A service worker that caches HTML is the only change in this rework that can make the app un-updatable from the phone. Packet 007 forbids it outright; the update proof is in its checklist.
- Two Claude GitHub apps exist and are installed per account. Repos outside an account that has both are read-only to the pipe. Keep pipe repos in the org.
- The chat connector cannot write `.github/workflows/` (403) and its file-delete call needs an approval card that lapses; workflow edits are Justin pastes, deletions go to the executor.
- GitHub's web uploader silently drops dot-paths; `${{ vars.X }}` resolved empty because the variable was never created — public values are hardcoded in workflows instead.
- `messages.bucket` is CHECK-constrained; adding a bucket value is DDL, hence prep.
- Password sign-in is origin-independent; the email link depends on Site URL + redirect list and is the fragile fallback by design.
- `messages.body` is 1–280 chars. Every capture path must refuse or truncate rather than let the insert fail silently.
