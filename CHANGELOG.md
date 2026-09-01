# Inbox — Changelog
Shipped history, newest-first. Close-outs append verified items.
---
## 2026-09-01 — Executor auth moved to the Claude subscription
- **`claude.yml` switched to `claude_code_oauth_token`** (`e6a3b70`), replacing the API-key auth line.
  Executor runs now bill the Claude subscription instead of pay-as-you-go API credits. The token is
  minted with `claude setup-token`; the secret is named CLAUDE_CODE_OAUTH_TOKEN.
- **Unchanged:** ANTHROPIC_API_KEY remains the Supabase function secret that `classify` reads at
  runtime, and stays on API billing.
---
## 2026-08-31 — Pipe proven end to end; packet 001 READY
- **Executor smoke PASS** (issue #2): clean tree, file listing, `anthropic_api_key` confirmed by name.
- **Deploys automated and proven:** `deploy-worker` → `https://inbox.justin-dec.workers.dev` (agency
  Cloudflare account); `deploy-supabase` → `classify` v11 from the runner, `verify_jwt = false` via
  `config.toml`. The project ref is hardcoded in the workflow (the repo variable never existed).
- **Cutover:** Justin signed in at the new URL with his password and captured grocery + to-do items.
  Site URL and redirect list updated to the new origin.
- **Fire-gate mechanical:** `main` ruleset (PR required, no bypass); planner probe push refused.
- **Migration `20260831020016_health_support`** applied and certified: `public.migration_versions()`
  (DEFINER, service_role-only) for the health endpoint.
- **Packet 001 written in full and flipped READY.** Ruled: live wall cut entirely.
---
## 2026-08-30 — Pipe stood up: repo moved to the org, executor on API auth
- **Repo transferred** `NewOrbitDigital/inbox` → `New-Orbit-Digital/inbox` so the org's existing
  "Claude" and "Claude GitHub MCP Connector" installs cover it; planner writes verified after the move.
- **Workflows and `.gitignore` landed by paste** (the web uploader drops dot-paths); `claude.yml`
  switched to `anthropic_api_key`; secrets and the project-id variable set by Justin.
- Docs updated for the new owner (this PR).
---
## 2026-08-30 — Prep-1: schema v2, backfill, repo scaffold
- **Migration `20260830174400_quadrants_and_lanes`** applied via the Supabase Inbox connector,
  certified by readback: `messages.important/urgent`, `todo_tags.lane_order/last_used_at`
  (seeded), RPCs `tag_touch` / `tag_rename` (merge on collision) / `tag_delete(tag, reassign)`,
  all SECURITY INVOKER, anon revoked.
- **Quadrant backfill ruled and fired:** 9 open to-dos — 4×Q1 Do, 5×Q2 Schedule, 0 unsorted.
  4 recurring to-dos deleted by ruling; habit tracking logged as a future intention.
- **Repo scaffolded** (this commit): deployed v7 app byte-identical under `web/`; live wall
  archived; classify deploy v10 mirrored; migrations mirrored; docs trio, SPEC v0.2, packet
  INDEX, CLAUDE.md, four Actions workflows. Uploaded by Justin via web UI — the GitHub
  connector's write 403 is the top backlog item.
---
