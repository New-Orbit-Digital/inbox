# backlog.md — durable standing work

## 2026-08-30 — Prep-1 close-out (added this close-out)
- **[high] GitHub connector write access.** All writes 403 (branch, tree, repo create) on both
  public repos; reads fine. Fix without touching the ads-agent-side grants; suspect wrong app
  configured or stale token needing a connector reconnect. Pipe-blocking for packet 001.
  [Justin surface: connector settings]
- **[high] Standup C–D:** Actions secrets/variable, Claude GitHub App on `inbox`, branch
  protection, auth redirect URL, first dispatch deploys, cutover check. [Justin surface]
- **[normal] Calendar rework.** Events tab hidden; link-based Google Calendar approach is the
  weakest part of the app. Own effort later.
- **[normal] Habits / recurring items.** Removed with dates (4 items deleted 2026-08-30, bodies
  in the prep chat). Revisit as its own segment.
- **[low] Retire live-wall leftovers:** five anon/`owner is null` RLS policies on `messages`,
  the `session` column convention, wall-era `status='hidden'`. DDL → a future prep session.
- **[low] `todo_tags.description`** unused since auto-tagging died; drop in a future prep DDL.
- **[Justin surface] Teardown after cutover:** delete the old `textwall` Worker; delete Supabase
  project `dihrtmwbaycmilvcvcom`; archive `NewOrbitDigital/primer`; remove the Supabase Primer
  connector from the account.
- **[note → 004] WEBHOOK_SECRET** retires with the trigger; treat as burned if it ever appears
  outside the trigger definition.
- **[note → 009] Research capture is topic-only (body ≤ 280);** brain dump entered in the overlay.
- **[Justin surface] Project knowledge:** add PROCESS.md, PRINCIPLES.md, the operating-instructions
  base + Inbox project block, SPEC.md to the Claude project.
