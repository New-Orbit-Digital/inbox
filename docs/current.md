# current.md — as of 2026-09-02 (PACKETS 003–007 READY; PREP-2 HALF DONE)

## Gates at next open
- `select count(*) from todo_tags` via Supabase Inbox returns a number (binding proof; 8 today).
- `select version, name from public.migration_versions(2)` = `20260902000812 live_wall_retirement`, `20260831020016 health_support`.
- `select count(*) from public.messages where owner is null` = **0**, and `pg_policies` shows exactly one policy on `public.messages` (`owner full access`).
- `select count(*) from public.messages where bucket is null and status = 'open'` = **0** — this is packet 003's premise for dropping the Unsorted segment. Non-zero is a STOP.
- Cheap, no-connector gates: `https://inbox.justin-dec.workers.dev/config.js` → `INBOX_VERSION` (`001-A` until 003 lands); `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/health`; `…/functions/v1/classify?ping=1` → `{"classify_version":"002-A"}`.

## State
- **Packets 001 and 002 COMPLETE. 003, 004, 005, 006 and 007 written in full and READY.** 008 and 009 remain IN PREP and are blocked on one artefact — the Primer corpus is not in this repo.
- **Prep-2 part 1 done 2026-09-02:** the live wall is gone from the database (migration `20260902000812_live_wall_retirement`; five anon/`owner is null` policies dropped, 2 test rows purged, certified by readback). Its repo half is packet 003 U-C. **Part 2 (Primer schema) is blocked on the corpus.**
- Live shape 2026-09-02: `messages` 214, `todo_tags` 8, `grocery_prefs` 14. Open rows: to-do 14, research 7, notes 4, grocery 2, events 0, unbucketed 0. Open to-dos by quadrant: 4 Q1, 5 Q2, 5 Unsorted, 0 untagged.
- Deployed: `classify` v12 (`002-A`), `health` v1 (`001-B`). Worker serving `INBOX_VERSION = "001-A"`.
- Supabase Auth: Site URL `https://inbox.justin-dec.workers.dev/inbox.html`; redirect `…/**`.
- Executor auth is `claude_code_oauth_token` since 2026-09-01 (`e6a3b70`) — executor runs bill the Claude subscription.

## Pending, in order
1. **Run packet 003** in a fresh Cowork session (GitHub + Supabase Inbox on, all else off). Then 004, 005, 006, 007 — strictly serial, each after the previous is COMPLETE and verified on the phone.
2. **Prep-3, right after packet 004 closes:** drop the `classify-on-insert` trigger via the connector and mirror it to `supabase/migrations/`. Packet 004 leaves the trigger live on purpose (DDL is never packet work) and is safe with it live, because every row it writes carries a non-null `confidence`.
3. **Get the Primer corpus into this repo** (`docs/primer_corpus.md`) or into the Claude project. Nothing about 008 or 009 can be contracted until then; their JSON shapes are adjudicated verbatim against §5.
4. Then Prep-2 part 2 (Primer schema migration + read-backs), then 008, then 009.
5. Justin surfaces, any time: **upload the three PWA icons to `web/icons/`** (generated 2026-09-02 and delivered in the planning chat; the connector cannot write binaries and the git proxy refuses pushes here — packet 007 STOPs without them); delete the old `textwall` Worker (personal Cloudflare account); paste the `setup-deno` step into `claude.yml` so `deno check` runs in packets 004 and 008; delete the superseded branches.

## Mechanics that must not be relearned
- **Deleting a function's directory from the repo does not undeploy it.** `deploy-supabase` deploys its checkout; a removed function keeps running at its last deployed version. Retirement means shipping an inert stub, then deleting the deployed function by hand. This is why packet 004 U-C is a stub.
- The webhook `classify-on-insert` **skips any row whose `confidence` is non-null** — packet 004 uses that deliberately on **every** insert path, grocery and to-do, so client-filed rows are invisible to the model until Prep-3 drops the trigger. Without it the webhook rewrites a to-do's tag to `personal` and stamps a retired `due_date`.
- A service worker that caches HTML is the only change in this rework that can make the app un-updatable from the phone. Packet 007 forbids it outright; the update proof is in its checklist.
- Two Claude GitHub apps exist and are installed per account. Repos outside an account that has both are read-only to the pipe. Keep pipe repos in the org.
- The chat connector cannot write `.github/workflows/` (403) and its file-delete call needs an approval card that lapses; workflow edits are Justin pastes, deletions go to the executor.
- GitHub's web uploader silently drops dot-paths; `${{ vars.X }}` resolved empty because the variable was never created — public values are hardcoded in workflows instead.
- `messages.bucket` is CHECK-constrained; adding a bucket value is DDL, hence prep.
- Password sign-in is origin-independent; the email link depends on Site URL + redirect list and is the fragile fallback by design.
- `messages.body` is 1–280 chars. Every capture path must refuse or truncate rather than let the insert fail silently.
