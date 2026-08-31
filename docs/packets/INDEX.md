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
- **No AI where process will do.** Model calls in this app: grocery split/categorization (Haiku) and Primer (Haiku menu, Sonnet 5 cards). A unit introducing another model call is a STOP.

## Queue

| Packet | Scope | Status | Report |
|---|---|---|---|
| [001](build_packet_001_pipe_shakedown.md) | Pipe shakedown: `INBOX_VERSION` beacon in `web/config.js`; `health` edge function (version, migrations, table counts) | RUNNING | — |
| 002 | Classifier slim-down: grocery-only `classify` with direct-call entry + `?ping=1`; to-do/event parsing, auto-tagging, date logic deleted; webhook shape still honored for grocery until 004 | IN PREP | — |
| 003 | Shell: bottom nav (To-do · Grocery · Research · Notes · Done) replacing tabs; Events hidden behind a flag; bucket chips, `fileAs`, keys 1–4 removed; Swimlanes/Matrix control stub; internals renamed (`window.TEXTWALL`→`window.INBOX`, `tw-theme`→`inbox-theme`, beacon); live-wall cleanup (`archive/live-wall/` deleted, `PUBLIC_HOST` removed) | IN PREP | — |
| 004 | Capture: to-do toggles + tag dropdown (last-used order) + `#tag` parse + plain insert + `tag_touch`; grocery capture → direct call inserting every returned entry; webhook mode deleted; Justin drops the DB trigger at close-out | IN PREP | — |
| 005 | To-do views: swimlanes (lanes by `lane_order`, Untagged first, empty hidden), quadrant stripes, chip filter, complete→Done; matrix (stacked + Unsorted); card overlay | IN PREP | — |
| 006 | Tag sheet: rename / merge-on-collision / reorder / delete-with-reassign via the RPCs | IN PREP | — |
| 007 | PWA: manifest, service worker, icons, standalone, theme-color; Android share target → Research capture | IN PREP | — |
| 008 | Primer backend: `primer-menu` + `primer-card` per the Primer corpus §5, daily card cap, pings | IN PREP — needs Prep-2 | — |
| 009 | Primer UI: Research list / new / coverage menu / carousel; overlay-entered brain dump; capture hook; regression fixtures | IN PREP — needs 008 | — |

**Status meanings:** READY — fully contracted, run any time. RUNNING — a session has claimed it. IN PREP — planner prep incomplete, do not run. COMPLETE / STOPPED — see report.

## Concurrency matrix

- 001 vs 002: safe (001 touches `web/config.js` + `supabase/functions/health/` + `supabase/config.toml`; 002 touches `supabase/functions/classify/` only).
- 003 → 004 → 005 → 006 → 007 → 009: strictly serial — each edits `web/inbox.html`.
- 004 requires 002 COMPLETE; 009 requires 008 COMPLETE and Prep-2.
- 008 safe alongside 003–007 (functions only).
- Recommended solo order: 001 → 002 → 003 → 004 → 005 → 008 → 006 → 007 → 009.

## Prep record

**Prep-1 (2026-08-30, done):** Supabase Inbox connector verified (`todo_tags`=8, `messages`=192, `grocery_prefs`=4). Live schema read; deployed `classify` (deploy v10) mirrored. Migration `20260830174400_quadrants_and_lanes` applied and certified: quadrant columns, `lane_order` (seeded 1–8 alphabetically), `last_used_at` (seeded from newest use), RPCs `tag_touch`/`tag_rename`/`tag_delete`, all INVOKER. Quadrant backfill ruled by Justin and fired: 9 open to-dos — 4×Q1, 5×Q2, 0 unsorted; 4 recurring to-dos deleted (bodies preserved in the prep chat). Repo scaffolded by web upload, then transferred to the New-Orbit-Digital org so the org's existing Claude app installs cover it; connector writes verified after the move.

**Prep-1b (2026-08-31, done) — pipe proven end to end:** executor smoke (issue #2) PASS on `anthropic_api_key`; `deploy-worker` live at `https://inbox.justin-dec.workers.dev` (agency Cloudflare account, subdomain `justin-dec`); `deploy-supabase` redeployed `classify` as v11 from the runner with `verify_jwt = false` intact; Justin signed in and captured at the new URL; `main` ruleset refuses direct pushes. Migration `20260831020016_health_support` (`public.migration_versions`, DEFINER, service_role-only) applied and certified for 001. Ruled: the live wall is cut entirely (repo cleanup → 003; DB purge → Prep-2; old `textwall` Worker → Justin deletes).

**Prep-2 (pending, blocks 008):** apply the Primer corpus §4 migration — `message_id uuid references public.messages(id) on delete set null` (messages.id is uuid, confirmed); keep its own `updated_at` helper (none exists here); certify with the corpus read-backs. Retire the live wall in the database: drop the five anon/`owner is null` policies on `messages` and purge `owner is null` rows (counts shown to Justin first). Confirm `ANTHROPIC_API_KEY` is the live function secret name.

## Packet outlines (contracts pinned at packet-writing time)

- **001** — written in full: [build_packet_001_pipe_shakedown.md](build_packet_001_pipe_shakedown.md).
- **002** — one unit, `classify/index.ts`: entry (a) webhook payload, grocery rows only, behavior unchanged; any other webhook kind → `200 {ignored:true}`; entry (b) `POST {text}` with forwarded `Authorization`, `auth.getUser()` fail-closed → `{entries:[{text, category}]}` (split retained, prefs override, "Other" fallback); `?ping=1`. Deleted outright: `handleTodo`, `handleEvent`, tag persistence, date math, DEFAULT_TAGS. What-survives proof + `deno check` pasted.
- **003** — U-A nav + routing + Events flag + rename; U-B removals (chips/`fileAs`/keys); U-C live-wall cleanup (delete `archive/live-wall/`, drop `PUBLIC_HOST` from `config.js`). Handler inventory before/after.
- **004** — U-A to-do capture; U-B grocery direct call; U-C delete webhook mode from `classify`. Justin close-out: drop trigger `classify-on-insert`, then `net._http_response` stays quiet; connector readback of the last 5 inserts.
- **005** — U-A swimlanes + card + stripes (`--q1..--q4`); U-B matrix; U-C overlay.
- **006** — U-A tag sheet on the To-do header.
- **007** — U-A manifest/sw/icons/standalone; U-B `share_target` (GET → `inbox.html?share=1&title&text&url`) → research insert.
- **008** — U-A `primer-menu`; U-B `primer-card` + cap 20/day/owner. Corpus contracts verbatim; JSON shape deviations = FAIL.
- **009** — U-A `web/research.js` + section; U-B capture hook + overlay brain dump; U-C the five regression fixtures.

## After the packets (joint sessions, never packets)

Calendar rework · habits/recurring segment · Capacitor Android wrap (`[Justin surface: device]`) · old `textwall` Worker deletion (Justin, personal Cloudflare account).
