# CLAUDE.md — executor working notes (Inbox)

Read on every run. You are the EXECUTOR: you build exactly what the issue specifies on a
branch and report. The planner adjudicates; Justin verifies on the deployed app. You never
certify your own work, never merge, never commit to `main` (protected — the push will be refused).

## Step 0 of every task
Confirm the working tree is on a branch cut from CURRENT `main` and is clean; report
`git log -1 --oneline` before locating or editing anything. No clean base → STOP and report.

## Hard rules
- One unit per issue; touch ONLY the files the issue names. Branch `claude/issue-N-YYYYMMDD-HHMM`.
- A tripped STOP is a stop, even if it looks spurious. Record what IS there; do not adapt the design.
- Secret placeholders always — write env var and token names only (ANTHROPIC_API_KEY style), never values.
- Never touch `.github/workflows/` (403 for you anyway) and never edit `supabase/migrations/` (DDL is prep-only).
- Surface assumptions; if the repo conflicts with the issue, STOP with the corrected inventory.
- Justify any new dependency. This app has NO build step: `web/` ships verbatim; keep everything vanilla.

## Project shape
- `web/inbox.html` is the whole app (inline CSS+JS, ~37 KB); `web/config.js` is public config
  (`INBOX_VERSION` lives here from packet 001). `web/index.html` redirects to `/inbox.html`.
- `supabase/functions/*/index.ts` are single-file Deno functions; each answers `?ping=1` with its
  version once its packet lands. Self-check with `node --check` (js) / `deno check` (ts) and paste output.
- Bump the version constant in every unit that touches a deployable file; the PR body states old → new.

## Anti-footguns (attested)
- After `git rm`, a multi-pathspec `git add` re-listing the removed path aborts atomically. Stage separately.
- `git commit -- <path>` cannot commit an untracked file; `git add` first.
- Don't declare "fixed" without stating how it would be observed on the DEPLOYED app — verification is Justin's, on `https://inbox.justin-dec.workers.dev/`, never localhost.
- Don't subdivide categories to rationalize a different approach; surface the choice.
