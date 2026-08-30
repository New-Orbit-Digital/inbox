# always.md — stable context (Inbox)

**Builder profile:** non-developer. Justin directs and verifies; he does not read code or use a
terminal. Everything CLI-shaped runs in GitHub Actions; everything human-shaped is an explicit
checklist item with a prediction.

**Product:** Inbox — personal captures in one shell: To-do (Eisenhower + tag swimlanes), Grocery
(store-ordered list), Research (Primer briefs), Notes, Done. Calendar hidden pending rework.
Formerly Text Wall; the live audience wall is retired (`archive/live-wall/`).

**Stack:** plain HTML/JS, no build step — `web/` deploys verbatim to the Cloudflare Worker
`inbox` (`https://inbox.justin-a-bost.workers.dev`). Supabase project `qaabxgldjluqyccwhjzf`
(personal org): Postgres + RLS (`owner = auth.uid()`), Deno edge functions, password-primary
auth with email-link fallback. Anthropic API: Haiku 4.5 (`claude-haiku-4-5-20251001`) for
grocery parsing and the Primer menu; Sonnet 5 + web search for Primer cards.

**Pipe:** planner (chat / Cowork session) files `@claude` issues → Claude Code Action builds on
a branch → planner opens the PR, adjudicates the diff, merges on PASS where authorized → Actions
deploy (`deploy-worker`, `deploy-supabase`) → Justin verifies on the deployed app. Branch
protection on `main` is the fire-gate. Packets: `docs/packets/INDEX.md`.

**Connector law:** database work goes through the **Supabase Inbox** connector only. The
"Supabase" connector is bound to the New Orbit ads-agent org — Justin's daily-critical system —
and is never called from Inbox work and NEVER disconnected. GitHub connector: reads public repos;
private repos invisible; write access broken as of 2026-08-30 (403) — see backlog.

**Deploy proof:** `INBOX_VERSION` in `web/config.js` and `?ping=1` on every function. A stale
version is a STOP, not a shrug. `verify_jwt` per function lives in `supabase/config.toml`, so
redeploys can't silently reset it; functions that need auth also check in code.

**Constraints that shape design:** `messages.body` is 1–280 chars (Primer brain dumps therefore
live on `primers.brain_dump`, entered in the overlay). The DB webhook (`classify-on-insert`)
embeds `WEBHOOK_SECRET` in its trigger definition and retires in packet 004. `session='personal'`
on app rows is legacy-required (NOT NULL). Timezone America/New_York; day-rollover env vars
exist but rollover logic is retired with dates.
