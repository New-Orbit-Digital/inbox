# Inbox — Changelog
Shipped history, newest-first. Close-outs append verified items.
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
