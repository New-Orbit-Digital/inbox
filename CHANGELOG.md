# Inbox — Changelog
Shipped history, newest-first. Close-outs append verified items.
---
## 2026-09-02 (later) — Primer corpus landed; schema applied; packets 008 and 009 contracted
- **The Primer corpus is in the repo** at `docs/primer/`, split into nine parts for review with the
  text unedited. It is the product IP: Appendix A (the Card Library Specification) is the format,
  Appendix B is the five samples that are packet 009's regression fixtures, §5 is packet 008's
  verbatim contract. Primer never reached code — everything executable is a `[PROPOSED]` draft that
  has never run, and these two packets are what run it.
- **Migration `20260902014310_primer_schema`** applied via the Supabase Inbox connector and certified
  by readback: `primers` 14 columns + `primer_cards` 18 = **32 columns, 8 policies, 2 triggers,
  6 indexes**, RLS true on both — exactly what the corpus's rolled-back-transaction validation
  predicted. Three decisions taken while firing it and recorded in the mirror: no existing
  `updated_at` helper on this project (checked), so the corpus's own is kept; `messages.id` is uuid,
  so the **optional `message_id` FK was added** with `on delete set null`; `verify_jwt` lives in
  `supabase/config.toml` here, so it is packet 008's job. **Prep-2 is complete.**
- **Packets 008 and 009 written in full and flipped READY.** 008: `primer-menu` on Haiku and
  `primer-card` on Sonnet 5 with web search, both running as the calling user,
  with a server-side daily cap of 20 cards. 009: `web/research.js`, all ten card renderers, the
  capture hook, and the five fixtures.
- **Model IDs verified against the live docs:** `claude-haiku-4-5-20251001` and `claude-sonnet-5` are
  both current and exactly as the corpus wrote them. The web search tool is pinned to
  `web_search_20250305` — newer versions exist, but the support matrix for `claude-sonnet-5` could
  not be confirmed, so the broadly-supported version wins until there is evidence.
- **SPEC D-27 and D-28 added** (Primer models, cost and the daily cap; both functions as the calling
  user with RLS as the auth boundary, 404 never 403). D-19 and the data model updated.
- **Four reconciliations the corpus could not know**, ruled into packet 009: no ES-module import
  (this app has no build step and already has a client), no `alert()` (banned since packet 005), no
  classifier hook (there is no classifier after 004), and the brain dump entered in the overlay
  rather than at capture (D-20, the 280-character body check).
- **Migration `20260902020131_primer_realtime`** applied and certified: both Primer tables added to
  the `supabase_realtime` publication, which carried only `messages` until now (enabled out-of-band
  through the dashboard, which is why no migration mentioned it). Found while reviewing packet 009
  before it shipped — its card carousel subscribes to `primer_cards`, and without membership that
  subscription attaches and silently delivers nothing.
- **SPEC D-28 overrules the corpus on `verify_jwt`.** The corpus says "deploy with Verify JWT on";
  the gateway enforces that ahead of the function body, so it would swallow the `?ping=1` deploy
  proof D-25 makes mandatory. Both Primer functions ship `false`, like `classify`, with
  `supabase.auth.getUser()` as the in-code gate and RLS as the boundary.
- **Recorded rather than papered over:** packet 008's two functions cannot be exercised until packet
  009 ships, because they need a signed-in user's JWT and only a browser can produce one. 008 is
  verified by its pings; 009 U-A's first primer is its real acceptance test, and a card that comes
  back wrong in wording rather than rendering is a finding against 008.
- **`web/icons/` now exists** with a README naming the three expected files, so the folder is there
  for Justin to upload into. Still a Justin surface: the connector cannot write binaries.
---
## 2026-09-02 — Prep-2 (half) fired; packets 003–007 contracted
- **Migration `20260902000812_live_wall_retirement`** applied via the Supabase Inbox connector and
  certified by readback: the five anon/`owner is null` policies dropped from `public.messages`, the
  2 `owner is null` rows purged (counts shown to Justin first — both were `session='test'` smoke
  rows from 2026-08-01). After: `owner is null` = 0, `messages` = 214, one policy left
  (`owner full access`). The repo half of the live-wall cut is packet 003 U-C.
- **Packets 003, 004, 005, 006 and 007 written in full and flipped READY** — bottom-nav shell,
  capture, to-do views, tag sheet, PWA. Contracts pinned against `web/inbox.html` at 974 lines and
  the live database read the same day.
- **Three open questions from `prep_004_grocery_rule.md` ruled:** ` - ` is a grocery split
  separator with a generic-word stop-list; the seed keyword table lives in `web/config.js`;
  `classify` retires as a ping-only stub rather than a deleted directory, because deleting a
  function's directory undeploys nothing.
- **`SPEC.md` D-18 corrected** — it still described the Haiku grocery parse, superseded 2026-09-01.
  D-26 records the database half of the live-wall cut as done.
- **PWA icons generated** (three PNGs for `web/icons/`) so no packet unit has to synthesise binary
  assets. They are **delivered to Justin for upload** rather than committed here: the chat connector
  cannot write binary files and the session's git proxy refuses direct pushes to this repo. Packet
  007's asset gate STOPs if they are not on `main` when it opens. Their upload deploys the Worker
  with three new files and no HTML or JS change, so `INBOX_VERSION` stays at `001-A`.
- **`SPEC.md` D-10 clarified:** an untouched capture inserts `null`/`null` for `important`/`urgent`
  (Unsorted); pressing one toggle answers both. Writing `false`/`false` would render every casual
  capture as Q4 Eliminate — the failure was caught reviewing packet 004 against packet 005's
  quadrant derivation before either shipped.
- **Prep-3 defined and scheduled:** dropping the `classify-on-insert` trigger is DDL, so it leaves
  packet 004 and becomes a prep session with a mirror migration. Packet 004 is safe with the trigger
  live because every row it writes carries a non-null `confidence`, which the webhook skips.
- **Recorded as blocking:** the Primer corpus is not in this repo or reachable from the pipe, so
  packets 008 and 009 cannot be contracted and Prep-2 part 2 (the Primer schema) cannot run.
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
