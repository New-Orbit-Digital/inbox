# backlog.md — durable standing work

> **Justin-facing checks and pastes now live in [bookmark issue #41](https://github.com/New-Orbit-Digital/inbox/issues/41)**, a standing checklist he walks at a computer. This file keeps *durable engineering* items — things a future packet or prep session acts on. A one-off "Justin does X" belongs in #41, not here.

## 2026-09-03 — packet 004 close-out (added this close-out)
- **[CLOSED 2026-09-03] Grocery drops the model.** Shipped in 004 U-B: split rule + 250-keyword table in `web/config.js`, resolved `grocery_prefs` → longest keyword → `Other`. Verified against all 91 distinct captured items — 90 land in a real aisle. **The API balance no longer affects the app**; it blocks Primer (008) only.
- **[CLOSED 2026-09-03] `classify` retired.** 35-line ping-only stub, `410` to everything but `?ping=1`. The *deployed function* and `WEBHOOK_SECRET` are Justin surfaces after Prep-3, tracked in #41.
- **[PREP-3, next] Retire the webhook trigger.** Unchanged in substance, now unblocked: drop `classify-on-insert` via the connector and mirror it to `supabase/migrations/` (`20260804000000_baseline.sql` still carries the `create trigger` statement). Certify by capturing one row and confirming `net._http_response` stays flat. **Evidence it is currently harmless:** packet 004's three confirming grocery inserts produced three webhook POSTs, all `200 {skipped}` on the `confidence: 1` guard, no model call.
- **[HIGH → packet 005, still open] The app has no tap-to-complete.** Unchanged from the 003 close-out and now the next thing to fix: `complete()`'s only caller is the `x` key and `.keys` is hidden on touch, so a to-do, research or note card cannot be completed on the phone, and the recurrence roll-forward is keyboard-only. **005's completion affordance is load-bearing and must cover research and notes, not to-dos alone.**
- **[process, applied to INDEX] Validate a contract against live data, not only its acceptance list.** 004 U-B passed all seven pinned cases while `half and half` was unreachable — pinned as a Dairy keyword *and* split on ` and `. `savePref` keys on the body, so no correction could ever have repaired it. A 91-item corpus run found it immediately. Now a session-wide rule.
- **[process, applied to INDEX] An executor cannot execute code.** `claude.yml` allows only `Bash(node --check:*)` and `Bash(deno check:*)`. Do not write proofs of the form "run your harness and paste the output" — packet 004 asked twice and got honest transcriptions both times; the planner ran the branch instead. The `Bash(node:*)` paste is in #41; revisit the rule when it lands.
- **[process, applied to INDEX] Version gates need a cache-buster.** A plain fetch returned a stale `INBOX_VERSION` and a stale `classify` ping during this run; both were correct with a cache-buster.
- **[note] `messages.session`** is still NOT NULL with every insert path hardcoding `'personal'` — including the two new ones. Drop it in a future prep DDL, after 009.
- **[low] `todo_tags.description`** still unused. Packet 006's close-out should confirm and drop it in a later prep DDL.
- **[normal] Calendar rework** — Events behind `SHOW_EVENTS = false`, one flag, one use. Own effort later.
- **[normal] Habits / recurring items** — removed with dates 2026-08-30; revisit as its own segment. Note that 004 removed the last writer of `due_date` at capture, so recurrence now only ever comes from an existing row.
- **[note] Primer's cost model** is why `primer-card` carries a daily cap of 20 (SPEC D-21), enforced server-side before the model call, returning 429.

## 2026-08-31 — Prep-1b close-out (added this close-out)
- **Closed this session — pipe proofs.** Executor smoke, both deploy workflows, cutover at the
  new URL, branch-protection refusal, auth redirect URL: all green 2026-08-31.
- **[CLOSED 2026-09-02] Executor runner has no `deno`** (packet 001 finding: `command not found`).
  Verified 2026-09-02: `.github/workflows/claude.yml` already carries a
  `denoland/setup-deno@v2` step (`deno-version: v2.x`) before "Run Claude Code", and
  `--allowedTools` already permits `Bash(deno check:*)` and `Bash(node --check:*)`. Nothing to paste.
  Packets 004 and 008 can rely on `deno check` running for real. *(Confirmed in the 004 U-C run.)*
- **[Justin surface → #41] Delete the old `textwall` Worker** in the personal Cloudflare account (the
  `justin-a-bost` subdomain). **Still live as of 2026-09-03** — `https://textwall.justin-a-bost.workers.dev/`
  serves the wall submit page. It is inert (Prep-2 dropped the anon insert policies, so a submission
  is now refused by RLS) but it is still public and still points at the live database. It is in a
  *different* Cloudflare account from the agency one that hosts `inbox` (`justin-dec`) — switch
  accounts in the Cloudflare account picker to find it. Unblocked in the repo since packet 003 U-C.
- **[Justin surface → #41] Delete the unused branches.** The connector cannot delete branches; the
  full list is maintained in the bookmark issue rather than duplicated here.
- **[low] Serialize deploys:** add `concurrency: { group: deploy-supabase, cancel-in-progress: false }` to `deploy-supabase.yml` (and the worker equivalent) so two close merges cannot race and overwrite each other's function deploy. Until then, packets that deploy functions run strictly one at a time. Justin paste, tracked in #41.
- **[low] Pin wrangler 4 in `deploy-worker.yml`** (`wranglerVersion: "4.127.1"` under `with:`) —
  the action's default 3.90 warns itself out of date. Justin paste; not blocking. Tracked in #41.
- **[low] Drop the temporary `show_full_output: true` from `claude.yml`.** Added 2026-09-01 to surface
  the SDK's suppressed error text during an auth failure; its own comment says remove it once
  diagnosed. Auth has been healthy since. Tracked in #41.
- **[CLOSED 2026-09-02] Live wall cut entirely (ruled 2026-08-31).** Both halves are done: the
  database half in Prep-2 (`20260902000812_live_wall_retirement` — five anon/`owner is null` policies
  dropped, 2 rows purged, certified by readback) and the repo half in packet 003 U-C
  (`archive/live-wall/` deleted, `PUBLIC_HOST` removed from `web/config.js`). The `session` column
  stays for now. The old `textwall` Worker is tracked as its own Justin surface above.
- **[CLOSED 2026-09-01] Executor auth off API billing.** The swap landed 2026-09-01 (`e6a3b70`):
  `claude.yml` now passes `claude_code_oauth_token`, so executor runs bill the Claude subscription.
  The token is minted with `claude setup-token`; the secret is named CLAUDE_CODE_OAUTH_TOKEN.
- **[CLOSED 2026-09-03] The app's own model call.** This note used to say ANTHROPIC_API_KEY stays on
  API billing forever because `classify` calls Anthropic from an edge function. Packet 004 deleted
  that call. The key now serves **Primer only**, and a small credit balance is packet 008's blocker
  rather than a daily-capture risk.
- **[CLOSED 2026-09-03] The runtime Anthropic call was failing in production.** Every grocery capture
  from the evening of 2026-08-31 landed as a single `Other` row with `confidence 0` — `classify`'s
  catch path, almost certainly an exhausted credit balance. **Packet 004 made it moot**: grocery is
  deterministic and client-side, and the function is retired.
- **[CLOSED 2026-09-03 → packet 004] Grocery drops the model; deterministic rules replace it.**
  Ruled 2026-09-01, shipped in 004 U-B. Contract and seed table in
  `docs/packets/prep_004_grocery_rule.md`; the `half and half` defect found during the run is
  recorded in the [004 report §3](packets/reports/packet_004_report_20260903.md).
- **[Justin surface] Retire Primer artifacts:** delete Supabase project `dihrtmwbaycmilvcvcom`;
  archive `NewOrbitDigital/primer`; remove the Supabase Primer connector from the account.
- **[note → Prep-3] WEBHOOK_SECRET** retires with the trigger; treat as burned if it ever appears
  outside the trigger definition.
- **[note → 009] Research capture is topic-only (body ≤ 280);** brain dump entered in the overlay.
- **[Justin surface] Project knowledge:** add PROCESS.md, PRINCIPLES.md, the operating-instructions
  base + Inbox project block, SPEC.md to the Claude project.

## 2026-09-02 — packets 003–007 written; Prep-2 half fired
- **[CLOSED 2026-09-02] The Primer corpus arrived** and is committed at `docs/primer/`, split into
  nine parts with the text unedited. Its §4 migration is applied and certified; its §5 is packet
  008's verbatim contract and its §9 is packet 009's. `docs/primer/00_read_first.md` records which
  of the corpus's 18 open questions are already answered, so no packet re-litigates them.
- **[Justin surface, blocks 008 U-B → #41] Confirm ANTHROPIC_API_KEY is set as a Supabase function
  secret, and that the Anthropic account behind it has credit.** The connector cannot list function
  secrets, so this cannot be checked from a session — it is packet 008's session-open gate. The
  secret lives in the Supabase dashboard for project `qaabxgldjluqyccwhjzf` under Edge Functions →
  Secrets; it is **not** a GitHub secret. Primer bills the API: roughly $0.003 for a menu call,
  $0.01–0.09 per card, $0.25–0.60 for a research-mode primer. `SEARCH_BUDGET` in `primer-card` is
  the dial.
- **[CLOSED 2026-09-02] Upload the three PWA icons to `web/icons/`.** Done — `icon-192.png`,
  `icon-512.png` and `icon-maskable-512.png` are all on `main`. Packet 007's asset gate is satisfied.
  `web/icons/` stays prep-owned: no packet unit may touch an image, and a different icon is a Justin
  decision plus a new prep upload.
- **[note] Deleting a function directory does not undeploy the function.** Recorded in
  `docs/current.md` under mechanics; it is why packet 004 retired `classify` as a stub rather than
  by deletion. The deployed function and its WEBHOOK_SECRET are Justin surfaces after Prep-3.
- **[low] `messages.session`** is NOT NULL and every insert path hardcodes `'personal'`. It has had
  no meaning since the wall died. Drop it in a future prep DDL, after 009, when no packet is
  mid-flight.

## 2026-09-02 — packet 003 close-out (added this close-out)
- **[HIGH → packet 005, ruled and accepted] The app has no tap-to-complete.** Packet 003 U-B removed
  the bucket chip row, which held the only pointer-driven caller of `complete()`. Its one remaining
  caller is the `x` key, and `.keys` is hidden under `@media (hover:none)` — so on the phone a to-do,
  research or note card cannot be completed or un-completed, and the recurrence roll-forward inside
  `complete()` is keyboard-only. Grocery is unaffected (its checkbox writes `status` directly).
  Justin ruled 2026-09-02 to accept the gap rather than add an interim button; 004 ran first, so it
  spans two packets. **Packet 005's completion affordance is load-bearing, not cosmetic, and must
  cover research and notes as well as to-dos.** Detail in the
  [003 run report §5.2](packets/reports/packet_003_report_20260902.md).
- **[process, applied to INDEX] A pinned proof can contradict a pinned behaviour.** Packet 003 U-A
  demanded a `tw-theme` carry-over *and* zero occurrences of that string. The behaviour wins, the
  executor surfaces the conflict instead of gaming the grep, and the planner records an erratum. Now
  a session-wide rule in `docs/packets/INDEX.md`: write greps that name the permitted occurrences.
  **Packet 004 produced three more instances** — see its report §6.
- **[note] The Unsorted premise is now structural.** Nothing in the app can write a null bucket since
  `fileAs` and the un-file `patch({bucket:null})` were deleted. A non-zero
  `bucket is null and status='open'` reading at a future session open means something outside the app
  wrote it — that is a STOP and an investigation, not a re-ruling.
- **[process] Check a "Justin paste" item against the file before repeating it.** The `setup-deno`
  item survived four close-outs after it had already been applied. A backlog item naming a specific
  file should be verified against that file at close-out, not carried forward on faith. **Applied
  again in the 004 close-out**, which closed the PWA-icon item the same way.
