# Inbox — Changelog
Shipped history, newest-first. Close-outs append verified items.
---
## 2026-09-03 (packet 004) — the app stopped asking a model what Justin meant
- **Packet 004 ran and closed; all three units PASS, none STOPPED.** Full detail in
  [the run report](docs/packets/reports/packet_004_report_20260903.md). Merges: `bfd3925` (U004-A),
  `112fb91` (U004-B), `acb8cb0` (U004-C). `INBOX_VERSION` walked `003-C` → `004-A` → `004-B`;
  `CLASSIFY_VERSION` `002-A` → `004-C`. Each unit was deployed and confirmed on the phone before the
  next was filed.
- **There is no model call left in this app.** `grep -rc "api.anthropic.com" web/ supabase/functions/`
  returns `0` for **every** file, with no exception to declare — packet 008 has not landed yet, and
  its two Primer functions are the rule's named exception when it does. This is the packet's headline
  claim and it is proved by grep, not asserted.
- **To-do capture files itself.** Important / Urgent pill toggles and a tag dropdown ordered by
  `last_used_at`, defaulting to the most recently used tag and persisting for the session. An inline
  `#tag` overrides the dropdown for that capture only and is stripped from the body. The insert is
  eight columns and nothing else; `tag_touch` records the use. No `due_date`, no `auto`, no `recur` —
  D-09 and D-11 are now true in code.
- **An untouched capture writes `null`/`null`, not `false`/`false`.** *Unset* means the user never
  answered, so the row is **Unsorted**; `false`/`false` would have rendered every casual capture as
  Q4 Eliminate in packet 005. Confirmed by readback on live rows.
- **Grocery is deterministic and instant.** A split rule and a 250-keyword table in `web/config.js`
  replace the Haiku parse: `grocery_prefs` exact match → longest keyword substring → `Other`. Run
  against all 91 distinct grocery items in captured history, **90 land in a real aisle**; the one
  miss (`flowers`) is genuinely absent from the table and is what the correction loop is for.
  `oat milk` → Dairy and `muffins` → Bakery, the two the model kept getting wrong. New rows carry
  `auto: false`, so the `· auto` marker correctly stops appearing.
- **A contract defect caught before it shipped.** `half and half` was pinned as a Dairy keyword while
  ` and ` was pinned as a separator, so the keyword could never match and the capture split into two
  `Other` rows — and `savePref` keys on the body, so no correction could ever repair it. Ruled and
  fixed inside the unit: separator-bearing keywords are derived from the table at runtime and masked
  across the split. **The seven pinned acceptance cases all passed on the broken build; running the
  code over real captured data is what found it.**
- **`classify` is retired as a 35-line ping-only stub** — no imports, no `Deno.env.get`, no database
  client, no model call. `?ping=1` → `{"classify_version":"004-C","retired":true}`; everything else,
  including the webhook POST, → `410`. A stub rather than a deleted directory because deleting a
  function's directory undeploys nothing.
- **The `classify-on-insert` trigger is still live, deliberately.** Dropping it is DDL and DDL is
  never packet work — that is **Prep-3**, with a mirror migration. The packet is safe with it live
  because every row it writes carries `confidence: 1`, which the webhook skips. Proved rather than
  assumed: the three confirming grocery inserts produced three webhook POSTs, all `200 {skipped}`,
  no model call.
- **Clean on the hard constraints:** three files touched in the whole packet, no DDL, no migration,
  no database write by any unit, `.github/workflows/` and `supabase/config.toml` untouched, no new
  dependency.
- **Process changes adopted:** deferred verification now goes to a standing bookmark issue
  ([#41](https://github.com/New-Orbit-Digital/inbox/issues/41)) instead of blocking a session;
  contracts that operate on Justin's own data get a corpus run before PASS; version gates always use
  a cache-buster, after a cached `config.js` served `001-A` while `main` was at `003-C`; and packets
  stop asking executors to run their own harnesses, because `claude.yml` allows only parse gates.
---
## 2026-09-02 (packet 003) — the shell became a phone app
- **Packet 003 ran and closed in one session; all three units PASS, none STOPPED.** Full detail in
  [the run report](docs/packets/reports/packet_003_report_20260902.md). Merges: `2a31051` (U003-A),
  `95832ce` (U003-B), `fa486a6` (U003-C). `INBOX_VERSION` walked `001-A` → `003-A` → `003-B` →
  `003-C`, each read back live from the Worker before the next unit was filed, and each confirmed on
  the phone by Justin.
- **Bottom nav replaces the tab strip.** Five sections — To-do · Grocery · Research · Notes · Done —
  rendered from a `SECTIONS` table by `renderNav()`, fixed to the bottom with safe-area padding and
  inline single-colour SVG icons. Counts come from the existing `counts()`, show only when non-zero,
  and Done never carries one. `body` gained bottom clearance so the last card is never tucked under
  the bar.
- **Events is parked behind `SHOW_EVENTS = false`** — one flag with exactly one use, so the calendar
  rework has a single place to switch back on.
- **The Unsorted segment is gone, and permanently so.** It went out on the premise that no open row
  can land there (verified 0 at open and at close); U003-B then deleted `fileAs` and the un-file
  `patch({bucket:null})`, which were the app's only writers of a null bucket. Nothing in the app can
  produce one now.
- **Cross-filing removed.** The bucket chip row under every card, `fileAs`, the number keys `1`–`4`
  and the eight `.chip` CSS rules are all deleted; `j`, `k` and `x` survive untouched, as do the
  per-card date box, tag dropdown and grocery aisle dropdown. Capture is tab-scoped now, and packet
  004 makes each section own its capture outright.
- **Swimlanes / Matrix segmented control added and deliberately inert** — Swimlanes selected, Matrix
  disabled, no listener bound to either. It shows on To-do only. The behaviour lands in packet 005.
- **Internals renamed:** `window.TEXTWALL` → `window.INBOX` (contents byte-identical), theme key
  `tw-theme` → `inbox-theme` with a one-time carry-over so nobody's dark mode reset, and the boot
  banner now logs `INBOX_VERSION` instead of the old `textwall inbox v7` string.
- **The live wall is fully cut.** `archive/live-wall/index.html` and `wall.html` deleted and
  `PUBLIC_HOST` removed from `web/config.js`, completing D-26 — the database half went in Prep-2.
  Confirmed while adjudicating: the only readers of `PUBLIC_HOST` were the two deleted wall files.
  **Justin surface:** delete the old `textwall` Worker in the personal Cloudflare account.
- **Known gap, ruled and accepted:** removing the chip row also removed the only pointer-driven
  caller of `complete()`, so on a touch device a to-do, research or note card cannot be completed or
  un-completed until packet 005 restores the affordance — and the recurrence roll-forward is
  keyboard-only meanwhile. Grocery is unaffected. Justin ruled on 2026-09-02 to accept it rather than
  add an interim button. **005's completion affordance is now load-bearing**, and must cover research
  and notes, not to-dos alone.
- **Process finding worth keeping:** U003-A's pinned proofs (`grep -c "tw-theme"` → `0`) contradicted
  its own pinned behaviour (a carry-over that must name that key). The behaviour won, the executor
  surfaced the conflict rather than obfuscating the string to make the grep pass, and the erratum is
  recorded in the report. A session-wide rule now says so: write greps that name the permitted
  occurrences instead of demanding zero.
- **Clean run on the hard constraints:** no `supabase/` hunk in any unit, `deploy-supabase` never
  ran, no `.github/workflows/` edit, no DDL, no database write, no model call added, no new
  dependency and no new `<script>` tag.
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
