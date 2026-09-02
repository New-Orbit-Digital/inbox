# always.md — stable context (Inbox)

**Builder profile:** non-developer. Justin directs and verifies; he does not read code or use a
terminal. Everything CLI-shaped runs in GitHub Actions; everything human-shaped is an explicit
checklist item with a prediction.

**Product:** Inbox — personal captures in one shell: To-do (Eisenhower + tag swimlanes), Grocery
(store-ordered list), Research (Primer briefs), Notes, Done. Calendar hidden pending rework.
Formerly Text Wall; the live audience wall is cut entirely (ruled 2026-08-31) — no pages, no
policies, no rows survive it once packet 003 and Prep-2 land.

**Stack:** plain HTML/JS, no build step — `web/` deploys verbatim to the Cloudflare Worker
`inbox` at `https://inbox.justin-dec.workers.dev` (the New Orbit agency Cloudflare account,
subdomain `justin-dec`; the retired `textwall` Worker lived in Justin's personal account).
Supabase project `qaabxgldjluqyccwhjzf` (personal org): Postgres + RLS (`owner = auth.uid()`),
Deno edge functions, password-primary auth with email-link fallback. Anthropic API: Haiku 4.5
(`claude-haiku-4-5-20251001`) for grocery parsing and the Primer menu; Sonnet 5 + web search for
Primer cards.

**Pipe:** planner (chat / Cowork session) files `@claude` issues → Claude Code Action (on
`claude_code_oauth_token`, so executor runs bill the Claude subscription, not pay-as-you-go API
credits) builds on a branch → planner opens the PR, adjudicates the diff, merges on
PASS where authorized → Actions deploy (`deploy-worker`, `deploy-supabase`) → Justin verifies on
the deployed app. The `main` ruleset (PR required, no bypass) is the fire-gate. Packets:
`docs/packets/INDEX.md`.

**Connector law:** database work goes through the **Supabase Inbox** connector only. The
"Supabase" connector is bound to the New Orbit ads-agent org — Justin's daily-critical system —
and is never called from Inbox work and NEVER disconnected. GitHub: the repo lives in the
New-Orbit-Digital org because both Claude GitHub apps ("Claude" for the executor, "Claude GitHub MCP
Connector" for chat/Cowork) are installed there at all-repositories; the user account has neither
installed, so repos owned by it are read-only to the pipe. Keep pipe repos in the org.

**Deploy proof:** `INBOX_VERSION` in `web/config.js`, `?ping=1` on every function, and the
`health` endpoint (`…/functions/v1/health`: deployed version, live migrations, table counts; no
secret needed). A stale version is a STOP, not a shrug. `verify_jwt` per function lives in
`supabase/config.toml`, so redeploys can't silently reset it; functions that need auth also check
in code.

**Constraints that shape design:** `messages.body` is 1–280 chars (Primer brain dumps therefore
live on `primers.brain_dump`, entered in the overlay). The DB webhook (`classify-on-insert`)
embeds `WEBHOOK_SECRET` in its trigger definition and retires in packet 004. `session='personal'`
on app rows is legacy-required (NOT NULL). Timezone America/New_York; day-rollover env vars
exist but rollover logic is retired with dates.
