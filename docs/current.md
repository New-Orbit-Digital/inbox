# current.md — as of 2026-08-31 (PIPE PROVEN END TO END; PACKET 001 READY)

## Gates at next open
- `select count(*) from todo_tags` via Supabase Inbox returns a number (binding proof).
- `select version, name from public.migration_versions(2)` = `20260831020016 health_support`, `20260830174400 quadrants_and_lanes`.
- Open to-dos: 9 total, 0 with a null quadrant (until packets change capture).
- After 001: `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/health` and `INBOX_VERSION` in `config.js` are the cheap gates.

## State
- Pipe proven 2026-08-31: executor smoke PASS (issue #2, `anthropic_api_key`); Worker live at
  `https://inbox.justin-dec.workers.dev` (agency Cloudflare account); `classify` v11 deployed from
  the runner with `verify_jwt = false`; sign-in + grocery + to-do captures verified at the new URL;
  `main` ruleset refuses direct pushes (probe refused 2026-08-31). Executor auth moved to
  `claude_code_oauth_token` on 2026-09-01 (`e6a3b70`), so executor runs now bill the Claude
  subscription.
- Supabase Auth: Site URL `https://inbox.justin-dec.workers.dev/inbox.html`; redirect `…/**`.
- Schema: v2 (quadrants, lanes, tag RPCs) + `migration_versions()` helper. Backfill done.
- Packet 001 READY; 002–009 IN PREP. Prep-2 (Primer schema + live-wall DB purge) pending.

## Pending, in order
1. Justin kicks off packet 001 in a fresh Cowork session (GitHub + Supabase Inbox on, all else off).
2. Justin deletes the old `textwall` Worker in the personal Cloudflare account (also removes the wall pages from the internet).
3. Planner writes packet 002 in full; Prep-2 when 008 approaches.

## Mechanics that must not be relearned
- Two Claude GitHub apps exist and are installed per account. Repos outside an account that has both are read-only to the pipe. Keep pipe repos in the org.
- The chat connector cannot write `.github/workflows/` (403) and its file-delete call needs an approval card that lapses; workflow edits are Justin pastes, deletions go to the executor.
- GitHub's web uploader silently drops dot-paths; `${{ vars.X }}` resolved empty because the variable was never created — public values are hardcoded in workflows instead.
- The webhook calls classify with an `x-webhook-secret` header whose value sits in the trigger definition. Retire with the webhook (packet 004).
- classify SPLITS captures (one dictation → many rows); 002's direct-call contract keeps the split.
- Password sign-in is origin-independent; the email link depends on Site URL + redirect list and is the fragile fallback by design.
- `messages.bucket` is CHECK-constrained; adding a bucket value is DDL, hence prep.
