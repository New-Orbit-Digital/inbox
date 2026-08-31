# Inbox — Living Spec

v0.2 · 2026-08-30 · supersedes textwall-v2-spec.md v0.1. Source of truth for product decisions.
The app was called Text Wall; the live-wall use case is retired and the product is now **Inbox**.

## Direction

One shell, several small personal productivity apps: **To-do · Grocery · Research · Notes · Done**.
Calendar (the Events tab) is hidden pending its own rework. Plain HTML/JS, no build step, on a
Cloudflare Worker; Supabase Postgres + Deno edge functions; password-primary auth; rows owned by
`owner = auth.uid()`. AI only where process can't do the job: grocery split/categorization (Haiku)
and Primer research briefs (Haiku menu, Sonnet 5 + web search cards). Mobile-first for an Android
phone browser, shipped as an installable PWA; Capacitor wrap deferred.

## Decisions log

| # | Decision |
|---|---|
| D-01 | One tag per to-do (`messages.tag`, scalar). |
| D-02 | Untagged to-dos live in an **Untagged** lane, pinned first. |
| D-03 | Lanes manually ordered (`todo_tags.lane_order`); a lane renders only with ≥1 open to-do; hidden lanes keep their position. |
| D-04 | Tag dropdowns order by `last_used_at` desc; `tag_touch` fires on capture and reassign. |
| D-05 | Within a lane: Unsorted on top, then Q1→Q4, oldest first inside a quadrant. |
| D-06 | Complete → the global **Done** segment (all buckets). Day-rollover logic retired. |
| D-07 | Cards show title only; tap opens an overlay (title edit, tag, toggles, delete, created date). |
| D-08 | Tag and quadrant change via the overlay's controls; no drag-and-drop anywhere. |
| D-09 | Date/recurrence columns kept, hidden, unmaintained. Recurring to-dos were removed by ruling (2026-08-30); habit tracking is a logged future intention. |
| D-10 | Capture carries **Important** and **Urgent** toggles, unset by default, reset after each add; either unset ⇒ Unsorted. |
| D-11 | No AI in to-do capture. Inline `#tag` parses deterministically; auto-tagging, date parsing, routing, and the `#todo` override are deleted. |
| D-12 | Matrix view: four stacked sections — Do, Schedule, Delegate, Eliminate — Unsorted above when non-empty. |
| D-13 | The tag chip bar stays as a filter in both To-do views. |
| D-14 | Quadrant renders as a 4px left stripe, light `#d92d20/#175cd3/#dc6803/#667085`, dark `#f97066/#53b1fd/#fdb022/#98a2b3`, Unsorted dashed. Tokens `--q1..--q4`. |
| D-15 | Bottom nav (icon + label): To-do · Grocery · Research · Notes · Done. Visually distinct from chips. Calendar hidden behind a flag. |
| D-16 | Swimlanes / Matrix segmented control inside To-do. |
| D-17 | Capture is tab-scoped (already true in v7); cross-type migration (bucket chips, keys 1–4, `fileAs`) is removed everywhere. |
| D-18 | Grocery keeps the Haiku **split + categorize** parse, moved to a direct client → function call; the database webhook retires in packet 004. `grocery_prefs` overrides stay. |
| D-19 | Primer is a build, not a migration: schema, functions, and UI from the Primer corpus land as Research. One Supabase project for everything. |
| D-20 | Research capture stays ≤280 chars (the `messages.body` check) and carries the **topic only**; the brain dump is written in the overlay at tap time (Card 0), landing in `primers.brain_dump`. A "New primer" form exists too. |
| D-21 | Primer models: Haiku 4.5 menu, Sonnet 5 + web search cards; Check Yourself research-mode only, answers reveal on tap; per-owner daily card cap 20; `kind`/`bucket` value `research`; primers outlive their capture. |
| D-22 | Build system: repo + packets + autonomous Cowork sessions per the ads-agent methodology; deploys by GitHub Actions on merge; DDL by prep sessions via the Supabase Inbox connector. |
| D-23 | Repo public at `New-Orbit-Digital/inbox` (created under the user account, transferred to the org 2026-08-30 so the org's Claude app installs cover it); branch protection = the merge fire-gate. |
| D-24 | Rename: Worker `inbox` at `https://inbox.justin-dec.workers.dev` (agency Cloudflare account, ruled 2026-08-31); internals (`window.TEXTWALL`, `tw-theme`, beacon) rename in packet 003; old `textwall` Worker in the personal account deleted after cutover. |
| D-25 | Version discipline: `INBOX_VERSION = "<packet>-<unit>"` in `web/config.js`; every function answers `?ping=1` with its version; the `health` function reports version, migrations, and counts. Stale ping = STOP. |
| D-26 | The live wall is cut entirely (ruled 2026-08-31): no pages in the repo, no anon policies, no `owner is null` rows. Repo cleanup in 003, database purge in Prep-2, old Worker deleted by Justin. |

## Data model (as built, 2026-08-31)

`messages`: v7 columns plus `important boolean` / `urgent boolean` (both non-null ⇒ sorted; quadrant
derived, never stored). `bucket` check: todo/grocery/research/note/event. `status`: open/done/hidden.
`body` 1–280 chars. `todo_tags`: (owner, tag) PK + `description` (unused) + `lane_order` +
`last_used_at`. `grocery_prefs`: (owner, item) → category. RPCs: `tag_touch(tag)`,
`tag_rename(from, to)` (→ 'renamed' | 'merged'), `tag_delete(tag, reassign_to)`, all SECURITY INVOKER;
`migration_versions(limit)` SECURITY DEFINER, service_role-only, for the health endpoint.
Backfill certified 2026-08-30: 9 open to-dos — 4 Q1, 5 Q2, 0 unsorted. Primer tables (`primers`,
`primer_cards`) land in Prep-2 per the Primer corpus §4.

## The rework, by packet

Details live in `docs/packets/INDEX.md`. 001 pipe shakedown → 002 classifier slim-down →
003 shell/nav → 004 capture → 005 to-do views → 006 tag sheet → 007 PWA (+ Android share target
→ Research) → 008 Primer backend → 009 Primer UI.

## Parked (logged intentions)

- **Calendar rework** — the Events tab is the weakest part; hidden until its own effort.
- **Habits / recurring items** — removed with dates; revisit as a segment of its own.
- **Capacitor Android wrap**, widgets, Assistant capture, offline queue.
- **`WEBHOOK_SECRET` retirement** — with the webhook, packet 004.
