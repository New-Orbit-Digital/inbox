# backlog.md — durable standing work

## 2026-08-31 — Prep-1b close-out (added this close-out)
- **Closed this session — pipe proofs.** Executor smoke, both deploy workflows, cutover at the
  new URL, branch-protection refusal, auth redirect URL: all green 2026-08-31.
- **[high] Executor runner has no `deno`** (packet 001 finding: `command not found`, and the sandbox
  refused the installer). Add a step to `claude.yml` before "Run Claude Code": `denoland/setup-deno@v2`
  with `deno-version: v2.x`, so `deno check` executes in packets 002 and 008. Until it lands, packets
  fall back to planner read-through, as 001 did. Justin paste.
- **[Justin surface] Delete the old `textwall` Worker** in the personal Cloudflare account (the
  `justin-a-bost` subdomain). Removes the wall pages from the internet.
- **[Justin surface] Delete the unused branches** `claude/pipe-fixes-20260831` and
  `claude/packet-002-ready-20260831` (superseded; the connector cannot delete branches).
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
- **[HIGH — Justin paste] Executor auth is on API billing, and that is what drained the credits.**
  `claude.yml` passes `anthropic_api_key`, so every packet issue runs an Opus build session against
  pay-as-you-go API credits, while this planner session bills the Claude subscription. The balance
  ran dry mid-packet-002 (executor runs 33351757525 / 33352038557 errored; the app's grocery call
  then returned `anthropic 400: credit balance is too low`). **Correction to the earlier note:**
  minting the token does NOT need `/install-github-app` — that flow is an optional convenience. The
  command is `claude setup-token` in the Claude Code CLI, which prints a one-year token. Fix: mint
  it, add repo secret CLAUDE_CODE_OAUTH_TOKEN, and change the one auth line in `claude.yml` to
  `claude_code_oauth_token: (that secret)`. Executor then bills the subscription like the ads-agent
  work. Docs: code.claude.com/docs/en/authentication, /github-actions.
- **[note] The app's own model call cannot use the subscription token.** `classify` calls the
  Anthropic API directly from an edge function, so ANTHROPIC_API_KEY (the Supabase function secret)
  stays on API billing forever. A small credit balance must exist or grocery captures degrade to a
  single "Other" row. This is unrelated to the executor swap; both need doing.
- **[Justin surface] Retire Primer artifacts:** delete Supabase project `dihrtmwbaycmilvcvcom`;
  archive `NewOrbitDigital/primer`; remove the Supabase Primer connector from the account.
- **[note → 004] WEBHOOK_SECRET** retires with the trigger; treat as burned if it ever appears
  outside the trigger definition.
- **[note → 009] Research capture is topic-only (body ≤ 280);** brain dump entered in the overlay.
- **[Justin surface] Project knowledge:** add PROCESS.md, PRINCIPLES.md, the operating-instructions
  base + Inbox project block, SPEC.md to the Claude project.
