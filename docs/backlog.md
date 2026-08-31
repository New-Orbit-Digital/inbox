# backlog.md — durable standing work

## 2026-08-31 — Prep-1b close-out (added this close-out)
- **Closed this session — pipe proofs.** Executor smoke, both deploy workflows, cutover at the
  new URL, branch-protection refusal, auth redirect URL: all green 2026-08-31.
- **[Justin surface] Delete the old `textwall` Worker** in the personal Cloudflare account (the
  `justin-a-bost` subdomain). Removes the wall pages from the internet.
- **[Justin surface] Delete the unused branch `claude/pipe-fixes-20260831`** (created for a
  workflow edit the connector could not push; the connector cannot delete branches).
- **[low] Serialize deploys:** add `concurrency: { group: deploy-supabase, cancel-in-progress: false }` to `deploy-supabase.yml` (and the worker equivalent) so two close merges cannot race and overwrite each other's function deploy. Until then, packets that deploy functions run strictly one at a time. Justin paste.
- **[low] Pin wrangler 4 in `deploy-worker.yml`** (`wranglerVersion: "4.127.1"` under `with:`) —
  the action's default 3.90 warns itself out of date. Justin paste; not blocking.
- **[normal] Calendar rework.** Events tab hidden; link-based Google Calendar approach is the
  weakest part of the app. Own effort later.
- **[normal] Habits / recurring items.** Removed with dates (4 items deleted 2026-08-30, bodies
  in the prep chat). Revisit as its own segment.
- **[normal → 003 / Prep-2] Live wall cut entirely (ruled 2026-08-31):** delete
  `archive/live-wall/` and `PUBLIC_HOST` (003); drop the five anon/`owner is null` policies and
  purge `owner is null` rows with counts shown first (Prep-2 DDL); `session` column stays for now.
- **[low] `todo_tags.description`** unused since auto-tagging died; drop in a future prep DDL.
- **[low] Executor auth:** on API billing; switch `claude.yml` back to `claude_code_oauth_token`
  if a token is ever minted (needs Claude Code CLI `/install-github-app`, unavailable to Justin).
- **[Justin surface] Retire Primer artifacts:** delete Supabase project `dihrtmwbaycmilvcvcom`;
  archive `NewOrbitDigital/primer`; remove the Supabase Primer connector from the account.
- **[note → 004] WEBHOOK_SECRET** retires with the trigger; treat as burned if it ever appears
  outside the trigger definition.
- **[note → 009] Research capture is topic-only (body ≤ 280);** brain dump entered in the overlay.
- **[Justin surface] Project knowledge:** add PROCESS.md, PRINCIPLES.md, the operating-instructions
  base + Inbox project block, SPEC.md to the Claude project.
