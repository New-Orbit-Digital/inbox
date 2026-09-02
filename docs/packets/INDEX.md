# Build Packet Inventory — Inbox

Kickoff line for a Cowork session, once a row reads READY:

> Run build packet NNN in `docs/packets/` of New-Orbit-Digital/inbox per its own instructions.

Always name the packet explicitly. Each running session reads its packet in full, honors this
file's session-wide rules, commits its run report to `docs/packets/reports/`, and flips its row
here in the same close-out PR.

## Session-wide rules (apply to EVERY packet)

- **Flip this packet's row to RUNNING before Unit 1.** `main` requires a pull request, so the flip is a docs-only PR on a planner branch that the session merges itself. First session-open gate, not a footnote.
- **Database access:** use ONLY the connector named **Supabase Inbox** (project `qaabxgldjluqyccwhjzf`). Verify the binding before the first query: `select count(*) from todo_tags` returns a number (that table exists only here). Any other Supabase connector in the session — "Supabase" is bound to the New Orbit ads-agent org and is load-bearing for Justin's daily work; "Supabase Primer" is bound to a retired empty project — must NEVER be called, and neither may ever be disconnected. Once packet 001 lands, `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/health` reports deployed versions, live migrations, and table counts without a connector or a secret.
- **DDL is never packet work.** Migrations are fired and certified in prep sessions via the connector and mirrored to `supabase/migrations/`. A unit that seems to need a schema change is a STOP.
- **Deploys are GitHub Actions on merge to `main`:** `supabase/functions/**` or `supabase/config.toml` → functions; `web/**` or `wrangler.toml` → the Worker at `https://inbox.justin-dec.workers.dev`. Docs-only merges deploy nothing. CI never applies migrations. Every deploying unit's Actions-for-Justin step carries a version prediction (`INBOX_VERSION` in `web/config.js`; `?ping=1` per function) and a STOP rule for a stale value.
- **Never touch `.github/workflows/`.**
- **Secrets:** placeholders only, everywhere; placeholder examples in issue bodies written without angle brackets (the issue sanitizer strips them). Known secret names: ANTHROPIC_API_KEY, WEBHOOK_SECRET (retires with the webhook), SUPABASE_ACCESS_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
- **File-size gate at session open:** list `web/` and `supabase/functions/` with sizes; any file over 300 KB is a finding and no unit may edit it this run.
- **Phone-first acceptance:** every unit changing `web/` carries an Actions-for-Justin check on Android at ~390px, light and dark mode.
- **No AI where process will do.** Model calls in this app after packet 004: **Primer only** (Haiku menu, Sonnet 5 cards). Grocery split/categorization was ruled back to deterministic rules on 2026-09-01 — see [prep_004_grocery_rule.md](prep_004_grocery_rule.md). A unit introducing another model call is a STOP. Packet 004's close-out proof is `grep -rc "api.anthropic.com" web/ supabase/functions/` returning `0` for every file **except `primer-menu` and `primer-card`, which carry one each once packet 008 lands** — Primer *is* the exception the rule names, and 008 may run before 004.

## Queue

| Packet | Scope | Status | Report |
|---|---|---|---|
| [001](build_packet_001_pipe_shakedown.md) | Pipe shakedown: `INBOX_VERSION` beacon in `web/config.js`; `health` edge function (version, migrations, table counts) | COMPLETE | [2026-08-31](reports/packet_001_report_20260831.md) |
| [002](build_packet_002_classifier_slimdown.md) | Classifier slim-down: grocery-only `classify` with direct-call entry + `?ping=1`; to-do/event parsing, auto-tagging, date logic deleted; webhook shape still honored for grocery until 004 | COMPLETE | [2026-08-31](reports/packet_002_report_20260831.md) |
| [003](build_packet_003_shell_nav.md) | Shell: bottom nav (To-do · Grocery · Research · Notes · Done) replacing tabs; Events hidden behind a flag; bucket chips, `fileAs`, keys 1–4 removed; Swimlanes/Matrix control stub; internals renamed (`window.TEXTWALL`→`window.INBOX`, `tw-theme`→`inbox-theme`, beacon); live-wall cleanup (`archive/live-wall/` deleted, `PUBLIC_HOST` removed) | READY | — |
| [004](build_packet_004_capture.md) | Capture: to-do toggles + tag dropdown (last-used order) + `#tag` parse + plain insert + `tag_touch`; grocery capture → **deterministic client-side split + aisle rule, no model call**; `classify` reduced to a ping-only stub; the DB trigger is dropped afterwards by **Prep-3**, not by the packet (DDL is never packet work) | READY | — |
| [005](build_packet_005_todo_views.md) | To-do views: swimlanes (lanes by `lane_order`, Untagged first, empty hidden), quadrant stripes, chip filter, complete→Done; matrix (stacked + Unsorted); card overlay | READY | — |
| [006](build_packet_006_tag_sheet.md) | Tag sheet: rename / merge-on-collision / reorder / delete-with-reassign via the RPCs; stale `TAGS` fallback retired | READY | — |
| [007](build_packet_007_pwa.md) | PWA: manifest, HTML-never-cached service worker, icons (prep-generated; Justin uploads them to `web/icons/` before this packet runs), standalone, theme-color; Android share target → Research prefill | READY | — |
| [008](build_packet_008_primer_backend.md) | Primer backend: `primer-menu` (Haiku) + `primer-card` (Sonnet 5 + web search) per the corpus §5, daily card cap of 20, `verify_jwt = false` so the pings stay fetchable, `getUser()` + RLS as the boundary | READY | — |
| [009](build_packet_009_primer_ui.md) | Primer UI: `web/research.js` — Research list / new primer / coverage menu / carousel with all ten card renderers; overlay-entered brain dump + capture hook; the five regression fixtures | READY — run after 007 **and** 008 | — |

**Status meanings:** READY — fully contracted, run any time. RUNNING — a session has claimed it. IN PREP — planner prep incomplete, do not run. COMPLETE / STOPPED — see report.

## Concurrency matrix

- 001 → 002: never simultaneous. No file overlap, but both merge through `deploy-supabase`, which redeploys every function from its own checkout — two runs in flight can race and the later-starting run can overwrite the earlier one's function. 002's session-open gate requires 001 COMPLETE (satisfied 2026-08-31).
- 003 → 004 → 005 → 006 → 007 → 009: strictly serial — each edits `web/inbox.html`.
- 004 requires 002 COMPLETE; 009 requires 008 COMPLETE and Prep-2.
- 008 safe alongside 003–007 (functions only) — **except during 004 U-C**, which deploys through `deploy-supabase` and would race it.
- 009 requires **both** 007 and 008 COMPLETE: it edits `web/inbox.html` (so it is last in the serial web chain) and it is a client for 008's two functions (so their pings are its premise gate).
- Recommended solo order: 001 → 002 → 003 → 004 → 005 → 008 → 006 → 007 → 009.

## Prep record

**Prep-1 (2026-08-30, done):** Supabase Inbox connector verified (`todo_tags`=8, `messages`=192, `grocery_prefs`=4). Live schema read; deployed `classify` (deploy v10) mirrored. Migration `20260830174400_quadrants_and_lanes` applied and certified: quadrant columns, `lane_order` (seeded 1–8 alphabetically), `last_used_at` (seeded from newest use), RPCs `tag_touch`/`tag_rename`/`tag_delete`, all INVOKER. Quadrant backfill ruled by Justin and fired: 9 open to-dos — 4×Q1, 5×Q2, 0 unsorted; 4 recurring to-dos deleted (bodies preserved in the prep chat). Repo scaffolded by web upload, then transferred to the New-Orbit-Digital org so the org's existing Claude app installs cover it; connector writes verified after the move.

**Prep-1b (2026-08-31, done) — pipe proven end to end:** executor smoke (issue #2) PASS on `anthropic_api_key`; `deploy-worker` live at `https://inbox.justin-dec.workers.dev` (agency Cloudflare account, subdomain `justin-dec`); `deploy-supabase` redeployed `classify` as v11 from the runner with `verify_jwt = false` intact; Justin signed in and captured at the new URL; `main` ruleset refuses direct pushes. Migration `20260831020016_health_support` (`public.migration_versions`, DEFINER, service_role-only) applied and certified for 001. Ruled: the live wall is cut entirely (repo cleanup → 003; DB purge → Prep-2; old `textwall` Worker → Justin deletes). Executor auth moved to `claude_code_oauth_token` on 2026-09-01 (`e6a3b70`); executor runs bill the Claude subscription from that date on.

**Prep-2 part 1 (2026-09-02, done) — live wall retired in the database.** Migration `20260902000812_live_wall_retirement` applied via the Supabase Inbox connector and certified by readback. Counts shown to Justin first: `messages` 216, `owner is null` 2 (both `session='test'`, body `test`, captured 2026-08-01). After: `owner is null` = 0, `messages` = 214, exactly one policy left on `public.messages` (`owner full access`), `todo_tags` 8 and `grocery_prefs` 14 untouched. The `session` column stays (NOT NULL, legacy-required). The repo half is packet 003 U-C.

**Prep-3 (pending, after packet 004 closes):** drop the database webhook trigger `classify-on-insert` on `public.messages` via the Supabase Inbox connector and mirror the drop to `supabase/migrations/` (the baseline file still carries its `create trigger` statement, so skipping the mirror leaves the migration record wrong). Packet 004 deliberately does **not** do this — DDL is never packet work — and does not need to: every row it writes carries a non-null `confidence`, which the webhook skips. Certify by capturing one row and confirming `net._http_response` stays flat. Justin surfaces afterwards: delete the deployed `classify` function and the WEBHOOK_SECRET function secret; keep ANTHROPIC_API_KEY for Primer.

**Prep-2 part 2 (2026-09-02, done) — Primer schema applied; the corpus is in the repo.** Justin supplied the Primer corpus, which is now committed at `docs/primer/` (nine parts, split for review, text unedited). Migration `20260902014310_primer_schema` applied via the Supabase Inbox connector and certified by readback: `primers` 14 columns + `primer_cards` 18 = **32 columns, 8 policies, 2 triggers, 6 indexes**, RLS true on both — exactly what the corpus's rolled-back-transaction validation predicted. Three project-specific decisions taken while firing it, all recorded in the mirror file: this project has **no** existing `updated_at` helper (checked), so the corpus's own is kept; `messages.id` is uuid (confirmed), so the **optional `message_id` FK was added** with `on delete set null` (SPEC D-21 — primers outlive their capture); `verify_jwt` lives in `supabase/config.toml` here, not the dashboard, so it is packet 008's job. **Still open and deliberately not guessable from here:** whether `ANTHROPIC_API_KEY` is *set* as a function secret and whether that Anthropic account is funded. The connector cannot list function secrets; it is packet 008's session-open gate and a Justin surface.

**Prep — packets 003–007 (2026-09-02, done):** all five written in full from the live repo and database. Read for the contracts: `web/inbox.html` at 974 lines, `web/config.js`, both deployed functions, all four migrations, and the live row/tag/quadrant counts recorded in each packet's premise gate. Ruled in the same session: the ` - ` grocery separator and its generic stop-list; the seed table's home in `config.js`; `classify` retiring as a stub; the to-do tag dropdown defaulting to the most recently used tag; **every** insert carrying `confidence: 1` — grocery and to-do — so the still-live webhook skips them until Prep-3 drops the trigger. PWA icons generated in the same session so no unit has to synthesise binary assets — **delivered to Justin for upload to `web/icons/`**, not committed here: the chat connector cannot write binary files and this session's git proxy refuses direct pushes to the repo. Packet 007's asset gate STOPs if they are not on `main` when it opens.

**Prep — packet 004 U-B (2026-09-01, done):** grocery ruled back to deterministic rules; split rules, resolution order and a seed keyword table derived from the 95 distinct items in captured history are pinned in [prep_004_grocery_rule.md](prep_004_grocery_rule.md). Verified in the same session: `grocery_prefs` has grown 4 → 14 rows unaided, and `savePref` in `web/inbox.html` already writes it on every aisle correction, so the learning loop needs no new work.

## Packet outlines (contracts pinned at packet-writing time)

- **001** — written in full: [build_packet_001_pipe_shakedown.md](build_packet_001_pipe_shakedown.md).
- **002** — written in full: [build_packet_002_classifier_slimdown.md](build_packet_002_classifier_slimdown.md).
- **003** — written in full: [build_packet_003_shell_nav.md](build_packet_003_shell_nav.md).
- **004** — written in full: [build_packet_004_capture.md](build_packet_004_capture.md). Three open questions from prep_004 were ruled 2026-09-02: ` - ` is a split separator with a generic stop-list; the seed table lives in `web/config.js`; `classify` becomes a ping-only stub rather than a deleted directory (deleting the directory would leave the deployed v12 running).
- **005** — written in full: [build_packet_005_todo_views.md](build_packet_005_todo_views.md).
- **006** — written in full: [build_packet_006_tag_sheet.md](build_packet_006_tag_sheet.md).
- **007** — written in full: [build_packet_007_pwa.md](build_packet_007_pwa.md). Icons were generated during prep and are uploaded to `web/icons/` by Justin, so no unit synthesises binary assets; the packet's asset gate STOPs if they are missing.
- **008** — written in full: [build_packet_008_primer_backend.md](build_packet_008_primer_backend.md). Corpus contracts verbatim; JSON shape deviations and altered prompt text are FAIL, not findings.
- **009** — written in full: [build_packet_009_primer_ui.md](build_packet_009_primer_ui.md). Four reconciliations the corpus could not know are ruled in it: no ES-module import, no `alert()`, no classifier hook, and the brain dump entered in the overlay.

## After the packets (joint sessions, never packets)

Calendar rework · habits/recurring segment · Capacitor Android wrap (`[Justin surface: device]`) · old `textwall` Worker deletion (Justin, personal Cloudflare account).
