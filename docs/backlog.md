# backlog.md — durable standing work

## 2026-08-30 — Prep-1 close-out (added this close-out)
- **Closed this session — GitHub connector write access.** Root cause: both Claude GitHub apps were
  installed only on the New-Orbit-Digital org; the user-owned repo was read-only to the pipe.
  Resolved by transferring `inbox` into the org (ruled by Justin over installing the apps on the
  user account). Writes verified 2026-08-30.
- **[high] Pipe proofs outstanding:** smoke issue reply; both deploy workflows green; cutover check
  at the new URL; branch protection refusal probe; auth redirect URL. [Justin surface]
- **[normal] Calendar rework.** Events tab hidden; link-based Google Calendar approach is the
  weakest part of the app. Own effort later.
- **[normal] Habits / recurring items.** Removed with dates (4 items deleted 2026-08-30, bodies
  in the prep chat). Revisit as its own segment.
- **[low] Retire live-wall leftovers:** five anon/`owner is null` RLS policies on `messages`,
  the `session` column convention, wall-era `status='hidden'`. DDL → a future prep session.
- **[low] `todo_tags.description`** unused since auto-tagging died; drop in a future prep DDL.
- **[low] Executor auth:** on API billing; switch `claude.yml` back to `claude_code_oauth_token`
  if a token is ever minted (needs Claude Code CLI `/install-github-app`, unavailable to Justin).
- **[Justin surface] Teardown after cutover:** delete the old `textwall` Worker; delete Supabase
  project `dihrtmwbaycmilvcvcom`; archive `NewOrbitDigital/primer`; remove the Supabase Primer
  connector from the account.
- **[note → 004] WEBHOOK_SECRET** retires with the trigger; treat as burned if it ever appears
  outside the trigger definition.
- **[note → 009] Research capture is topic-only (body ≤ 280);** brain dump entered in the overlay.
- **[Justin surface] Project knowledge:** add PROCESS.md, PRINCIPLES.md, the operating-instructions
  base + Inbox project block, SPEC.md to the Claude project.
