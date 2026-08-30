# current.md — as of 2026-08-30 (PIPE STOOD UP; SMOKE PENDING; NO PACKET READY)

## Gates at next open
- `select count(*) from todo_tags` via Supabase Inbox = 8 (binding proof).
- Migration history contains `20260830174400 quadrants_and_lanes`.
- Open to-dos: 9 total, 0 with a null quadrant.
- Once 001 lands: health endpoint and `INBOX_VERSION` become the cheap gate.

## State
- Repo: `New-Orbit-Digital/inbox` (public). Transferred from the user account 2026-08-30; the
  org's "Claude" and "Claude GitHub MCP Connector" installs cover it; planner writes verified.
- Scaffold on `main`, byte-verified: v7 app under `web/`, classify v10 mirror, both migrations,
  docs trio, SPEC v0.2, INDEX, CLAUDE.md, `.gitignore`, four workflows.
- Executor auth: `anthropic_api_key` (API billing) in `claude.yml`; secret `ANTHROPIC_API_KEY` set.
  `/install-github-app` was unavailable in Justin's environment; OAuth token path abandoned.
- Actions secrets/variable reported set by Justin: SUPABASE_ACCESS_TOKEN, CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID, SUPABASE_PROJECT_ID. (Values never in chat.)
- Schema v2 live and certified; backfill done (4×Q1, 5×Q2).

## Pending, in order
1. Smoke issue → executor reply proves the Claude app + API key on this repo.
2. Justin's report: both deploy workflows green; cutover check at the new URL (sign in, one grocery
   capture categorizes, one to-do captures).
3. Branch protection on `main` confirmed by a refused direct push (planner probe).
4. Supabase Auth redirect list includes `https://inbox.justin-a-bost.workers.dev`.
5. Packet 001 written in full → READY → first Cowork kickoff.

## Mechanics that must not be relearned
- Two Claude GitHub apps exist and are installed per account, not per user login. A repo outside an
  account that has both installed is read-only to the pipe (writes 403, private repos 404).
- GitHub's web uploader silently drops dot-paths (`.github/`, `.gitignore`); paste those via
  "Create new file".
- The webhook calls classify with an `x-webhook-secret` header whose value sits in the trigger
  definition. Retire with the webhook (packet 004); rotate only if it leaks somewhere new.
- classify SPLITS captures (one dictation → many rows); 002's direct-call contract keeps the split.
- `messages.bucket` is CHECK-constrained; adding a bucket value is DDL, hence prep.
