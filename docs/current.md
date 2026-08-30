# current.md — as of 2026-08-30 (PREP-1 COMPLETE; PIPE PARTIALLY STOOD UP; NO PACKET READY)

## Gates at next open
- `select count(*) from todo_tags` via Supabase Inbox = 8 (binding proof).
- Migration history contains `20260830174400 quadrants_and_lanes`.
- Open to-dos: 9 total, 0 with a null quadrant.
- Once 001 lands: health endpoint and `INBOX_VERSION` replace the first two as the cheap gate.

## State
- Schema v2 live and certified (quadrants, lanes, tag RPCs). Backfill done: 4×Q1, 5×Q2.
- Deployed app is v7 at the old `textwall` URL; repo `web/` is byte-identical to it.
- classify deploy v10 mirrored at `supabase/functions/classify/index.ts`; webhook live.
- Repo scaffolded by Justin's web upload (this commit). Workflows present but secrets NOT set.

## Blocking items, in order
1. GitHub connector writes 403 everywhere (branch/tree/repo creation) though public reads work —
   the pipe cannot file issues, open PRs, or merge until fixed. Suspects: wrong app configured
   for all-repos, or a pre-grant token needing reconnect. ads-agent must not be disturbed.
2. Actions secrets + variable (standup step C), Claude GitHub App on `inbox`, branch protection.
3. Supabase Auth redirect list needs `https://inbox.justin-a-bost.workers.dev`.
4. First deploys via workflow_dispatch; cutover check; then 001 → READY.

## Mechanics that must not be relearned
- The webhook calls classify with an `x-webhook-secret` header; its value sits in the trigger
  definition itself. Retire, don't rotate, unless it leaks somewhere new.
- classify SPLITS captures (one dictation → many rows) and inserts siblings; the direct-call
  contract in 002 keeps the split for grocery.
- `messages.status` allows 'hidden' (wall-era); `bucket` is CHECK-constrained to five values —
  adding a bucket value is DDL, hence prep.
- Realtime channel filters `owner=eq.<uid>`; deletes are broadcast without the filter.
