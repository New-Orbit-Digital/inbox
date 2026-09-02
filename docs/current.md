# current.md — as of 2026-09-02 (ALL PACKETS 003–009 READY; PREP-2 COMPLETE)

## Gates at next open
- `select count(*) from todo_tags` via Supabase Inbox returns a number (binding proof; 8 today).
- `select version, name from public.migration_versions(2)` = `20260902020131 primer_realtime`, `20260902014310 primer_schema`.
- `select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public';` = `messages`, `primer_cards`, `primers`. Publication membership is invisible to a schema readback, so it gets its own gate.
- `select count(*) from public.messages where owner is null` = **0**, and `pg_policies` shows exactly one policy on `public.messages` (`owner full access`).
- `select count(*) from public.messages where bucket is null and status = 'open'` = **0** — this is packet 003's premise for dropping the Unsorted segment. Non-zero is a STOP.
- Cheap, no-connector gates: `https://inbox.justin-dec.workers.dev/config.js` → `INBOX_VERSION` (`001-A` until 003 lands); `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/health`; `…/functions/v1/classify?ping=1` → `{"classify_version":"002-A"}`.

## State
- **Packets 001 and 002 COMPLETE. 003 through 009 are all written in full and READY.** Nothing is left IN PREP.
- **Prep-2 complete 2026-09-02.** Part 1: the live wall is gone from the database (`20260902000812_live_wall_retirement`; five anon/`owner is null` policies dropped, 2 test rows purged). Its repo half is packet 003 U-C. Part 2: the Primer corpus arrived and is committed at `docs/primer/`; migration `20260902014310_primer_schema` applied and certified — 32 columns, 8 policies, 2 triggers, 6 indexes, RLS on both, `primers_message_fk` present. Part 2b: `20260902020131_primer_realtime` put both Primer tables on the `supabase_realtime` publication, which previously carried only `messages`.
- Live shape 2026-09-02: `messages` 214, `todo_tags` 8, `grocery_prefs` 14, `primers` 0, `primer_cards` 0. Open rows: to-do 14, research 7, notes 4, grocery 2, events 0, unbucketed 0. Open to-dos by quadrant: 4 Q1, 5 Q2, 5 Unsorted, 0 untagged. Research captures with no primer yet: 10 (7 open, 3 done).
- Deployed: `classify` v12 (`002-A`), `health` v1 (`001-B`). Worker serving `INBOX_VERSION = "001-A"`.
- Supabase Auth: Site URL `https://inbox.justin-dec.workers.dev/inbox.html`; redirect `…/**`.
- Executor auth is `claude_code_oauth_token` since 2026-09-01 (`e6a3b70`) — executor runs bill the Claude subscription.

## Pending, in order
1. **Run packet 003** in a fresh Cowork session (GitHub + Supabase Inbox on, all else off). Then 004, 005, 006, 007 — strictly serial, each after the previous is COMPLETE and verified on the phone.
2. **Prep-3, right after packet 004 closes:** drop the `classify-on-insert` trigger via the connector and mirror it to `supabase/migrations/`. Packet 004 leaves the trigger live on purpose (DDL is never packet work) and is safe with it live, because every row it writes carries a non-null `confidence`.
3. **008 can run any time** — it is functions-only and independent of the web chain, except that it must never be in flight at the same time as packet 004 U-C (both deploy through `deploy-supabase`). Its one blocker is a Justin check: ANTHROPIC_API_KEY set as a function secret, on a funded Anthropic account.
4. **009 runs last** — it needs 007 (the web chain) and 008 (its two functions) both COMPLETE.
5. Justin surfaces, any time: **upload the three PWA icons to `web/icons/`** (generated 2026-09-02 and delivered in the planning chat; the connector cannot write binaries and the git proxy refuses pushes here — packet 007 STOPs without them); delete the old `textwall` Worker (personal Cloudflare account); paste the `setup-deno` step into `claude.yml` so `deno check` runs in packets 004 and 008; delete the superseded branches.

## Mechanics that must not be relearned
- **`verify_jwt` is enforced by the gateway, before the function body runs.** So a function with `verify_jwt = true` cannot answer an unauthenticated `?ping=1`, and D-25's deploy proof would be dead. All four functions therefore run `false` with the auth check in code; RLS is the boundary, not the gateway.
- **Realtime membership is invisible to a schema readback.** `supabase_realtime` carried only `messages` until 2026-09-02, enabled out-of-band through the dashboard — no migration mentioned it. A subscription to an unpublished table attaches and silently delivers nothing, which is why packet 009 gates on `pg_publication_tables` rather than trusting the column counts.
- **Packet 008's functions cannot be exercised until packet 009 ships.** They need a signed-in user's JWT and only a browser can produce one; a connector session has no `auth.uid()`, so it cannot even insert a `primers` row without naming the owner. 008 is proven by its pings; 009 U-A's first primer is its real acceptance test.
- **Deleting a function's directory from the repo does not undeploy it.** `deploy-supabase` deploys its checkout; a removed function keeps running at its last deployed version. Retirement means shipping an inert stub, then deleting the deployed function by hand. This is why packet 004 U-C is a stub.
- The webhook `classify-on-insert` **skips any row whose `confidence` is non-null** — packet 004 uses that deliberately on **every** insert path, grocery and to-do, so client-filed rows are invisible to the model until Prep-3 drops the trigger. Without it the webhook rewrites a to-do's tag to `personal` and stamps a retired `due_date`.
- A service worker that caches HTML is the only change in this rework that can make the app un-updatable from the phone. Packet 007 forbids it outright; the update proof is in its checklist.
- Two Claude GitHub apps exist and are installed per account. Repos outside an account that has both are read-only to the pipe. Keep pipe repos in the org.
- The chat connector cannot write `.github/workflows/` (403) and its file-delete call needs an approval card that lapses; workflow edits are Justin pastes, deletions go to the executor.
- GitHub's web uploader silently drops dot-paths; `${{ vars.X }}` resolved empty because the variable was never created — public values are hardcoded in workflows instead.
- `messages.bucket` is CHECK-constrained; adding a bucket value is DDL, hence prep.
- Password sign-in is origin-independent; the email link depends on Site URL + redirect list and is the fragile fallback by design.
- `messages.body` is 1–280 chars. Every capture path must refuse or truncate rather than let the insert fail silently.
