# backlog.md — durable standing work

## 2026-08-31 — Prep-1b close-out (added this close-out)
- **Closed this session — pipe proofs.** Executor smoke, both deploy workflows, cutover at the
  new URL, branch-protection refusal, auth redirect URL: all green 2026-08-31.
- **[high] Executor runner has no `deno`** (packet 001 finding: `command not found`, and the sandbox
  refused the installer). Add a step to `claude.yml` before "Run Claude Code": `denoland/setup-deno@v2`
  with `deno-version: v2.x`, so `deno check` executes in packets 002 and 008. Until it lands, packets
  fall back to planner read-through, as 001 did. Justin paste.
- **[Justin surface] Delete the old `textwall` Worker** in the personal Cloudflare account (the
  `justin-a-bost` subdomain). Removes the wall pages from the internet. **Unblocked 2026-09-02** —
  packet 003 U-C deleted the last repo reference, so nothing points at it any more.
- **[Justin surface] Delete the unused branches** `claude/pipe-fixes-20260831` and
  `claude/packet-002-ready-20260831` (superseded; the connector cannot delete branches). Add packet
  003's merged branches to the same sweep: `claude/issue-27-20260902-1229`,
  `claude/issue-29-20260902-1259`, `claude/issue-31-20260902-1339`, `planner/003-running-20260902`,
  `planner/003-closeout-20260902`.
- **[low] Serialize deploys:** add `concurrency: { group: deploy-supabase, cancel-in-progress: false }` to `deploy-supabase.yml` (and the worker equivalent) so two close merges cannot race and overwrite each other's function deploy. Until then, packets that deploy functions run strictly one at a time. Justin paste.
- **[low] Pin wrangler 4 in `deploy-worker.yml`** (`wranglerVersion: "4.127.1"` under `with:`) —
  the action's default 3.90 warns itself out of date. Justin paste; not blocking.
- **[normal] Calendar rework.** Events tab hidden; link-based Google Calendar approach is the
  weakest part of the app. Own effort later. Since 2026-09-02 the section is behind
  `SHOW_EVENTS = false` in `web/inbox.html` — one flag, one use, flip it when the rework ships.
- **[normal] Habits / recurring items.** Removed with dates (4 items deleted 2026-08-30, bodies
  in the prep chat). Revisit as its own segment.
- **[CLOSED 2026-09-02] Live wall cut entirely (ruled 2026-08-31).** Both halves are done: the
  database half in Prep-2 (`20260902000812_live_wall_retirement` — five anon/`owner is null` policies
  dropped, 2 rows purged, certified by readback) and the repo half in packet 003 U-C
  (`archive/live-wall/` deleted, `PUBLIC_HOST` removed from `web/config.js`). Confirmed while
  adjudicating: the only readers of `PUBLIC_HOST` were the two deleted wall files. The `session`
  column stays for now. The old `textwall` Worker is tracked as its own Justin surface above.
- **[low] `todo_tags.description`** unused since auto-tagging died; drop in a future prep DDL.
  Packet 006's close-out confirms it is still unused.
- **[CLOSED 2026-09-01] Executor auth off API billing.** The swap landed 2026-09-01 (`e6a3b70`):
  `claude.yml` now passes `claude_code_oauth_token`, so executor runs bill the Claude subscription.
  The token is minted with `claude setup-token`; the secret is named CLAUDE_CODE_OAUTH_TOKEN.
- **[note] The app's own model call cannot use the subscription token.** `classify` calls the
  Anthropic API directly from an edge function, so ANTHROPIC_API_KEY (the Supabase function secret)
  stays on API billing forever. A small credit balance must exist or grocery captures degrade to a
  single "Other" row. This is unrelated to the executor swap; both need doing.
- **[RULED 2026-09-01 → packet 004] Grocery drops the model; deterministic rules replace it.**
  Supersedes the 2026-08-29 ruling that grocery keeps AI for the split. Split on commas/and/&/newlines,
  categorize by `grocery_prefs` exact match → longest keyword match → "Other". Placement ruled:
  client-side, folded into 004 U-B; `classify` loses its grocery path entirely at U-C. Contract and the
  seed table (derived from Justin's 95-item history) are pinned in
  `docs/packets/prep_004_grocery_rule.md`. **After 004 the only model call left in this app is Primer.**
- **[note] Until 004 lands, grocery captures need a funded API credit balance.** The deployed
  `classify` still calls Anthropic for the grocery split; with the balance at zero the error path files
  one row as "Other" (`confidence 0, auto false`). Either fund the balance or accept single-row grocery
  captures until 004.
- **[Justin surface] Retire Primer artifacts:** delete Supabase project `dihrtmwbaycmilvcvcom`;
  archive `NewOrbitDigital/primer`; remove the Supabase Primer connector from the account.
- **[note → 004] WEBHOOK_SECRET** retires with the trigger; treat as burned if it ever appears
  outside the trigger definition.
- **[note → 009] Research capture is topic-only (body ≤ 280);** brain dump entered in the overlay.
- **[Justin surface] Project knowledge:** add PROCESS.md, PRINCIPLES.md, the operating-instructions
  base + Inbox project block, SPEC.md to the Claude project.

## 2026-09-02 — packets 003–007 written; Prep-2 half fired
- **[CLOSED 2026-09-02] The Primer corpus arrived** and is committed at `docs/primer/`, split into
  nine parts with the text unedited. Its §4 migration is applied and certified; its §5 is packet
  008's verbatim contract and its §9 is packet 009's. `docs/primer/00_read_first.md` records which
  of the corpus's 18 open questions are already answered, so no packet re-litigates them.
- **[Justin surface, blocks 008 U-B] Confirm ANTHROPIC_API_KEY is set as a Supabase function
  secret, and that the Anthropic account behind it has credit.** The connector cannot list function
  secrets, so this cannot be checked from a session — it is packet 008's session-open gate. Primer
  bills the API, not the Claude subscription: roughly $0.003 for a menu call, $0.01–0.09 per card,
  $0.25–0.60 for a research-mode primer. `SEARCH_BUDGET` in `primer-card` is the dial.
- **[note] Primer's cost model is the reason `primer-card` carries a daily cap.** 20 cards per
  owner per day (SPEC D-21), enforced server-side before the model call, returning 429. Cards are
  capped rather than primers because cards are what cost money.
- **[Justin surface, before packet 007] Upload the three PWA icons to `web/icons/`.** Generated
  2026-09-02 and delivered in the planning chat: `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png`. They are not in this PR because the chat connector cannot write binary
  files and the session's git proxy refuses direct pushes to this repo. Use GitHub's "Add file →
  Upload files" into `web/icons/` (the uploader only drops **dot**-paths, so this path is fine).
  Packet 007's asset gate STOPs if they are missing. `web/icons/` is prep-owned: no packet unit may
  touch an image, and a different icon is a Justin decision plus a new prep upload.
- **[note] Deleting a function directory does not undeploy the function.** Recorded in
  `docs/current.md` under mechanics; it is why packet 004 retires `classify` as a stub rather than
  by deletion. The deployed function and its WEBHOOK_SECRET are Justin surfaces after 004.
- **[PREP-3, after 004 closes] Retire the webhook trigger.** Dropping `classify-on-insert` is DDL,
  so it is a prep session, not a packet unit, and it needs a mirror migration — `20260804000000_baseline.sql`
  still contains the `create trigger` statement, and an unmirrored drop is exactly the drift the
  live-wall retirement got its own migration to avoid. Certify by capturing one row and confirming
  `net._http_response` stays flat. **Justin surfaces afterwards:** delete the deployed `classify`
  function and the WEBHOOK_SECRET function secret. Keep ANTHROPIC_API_KEY until Primer is scoped.
- **[low] `messages.session`** is NOT NULL and every insert path hardcodes `'personal'`. It has had
  no meaning since the wall died. Drop it in a future prep DDL, after 009, when no packet is
  mid-flight.

## 2026-09-02 — packet 003 close-out (added this close-out)
- **[HIGH → packet 005, ruled and accepted] The app has no tap-to-complete.** Packet 003 U-B removed
  the bucket chip row, which held the only pointer-driven caller of `complete()`. Its one remaining
  caller is the `x` key, and `.keys` is hidden under `@media (hover:none)` — so on the phone a to-do,
  research or note card cannot be completed or un-completed, and the recurrence roll-forward inside
  `complete()` is keyboard-only. Grocery is unaffected (its checkbox writes `status` directly).
  Justin ruled 2026-09-02 to accept the gap rather than add an interim button; 004 runs first, so it
  spans two packets. **Packet 005's completion affordance is load-bearing, not cosmetic, and must
  cover research and notes as well as to-dos.** Detail in the
  [003 run report §5.2](packets/reports/packet_003_report_20260902.md).
- **[process, applied to INDEX] A pinned proof can contradict a pinned behaviour.** Packet 003 U-A
  demanded a `tw-theme` carry-over *and* zero occurrences of that string. The behaviour wins, the
  executor surfaces the conflict instead of gaming the grep, and the planner records an erratum. Now
  a session-wide rule in `docs/packets/INDEX.md`: write greps that name the permitted occurrences.
- **[note] The Unsorted premise is now structural.** Nothing in the app can write a null bucket since
  `fileAs` and the un-file `patch({bucket:null})` were deleted. A non-zero
  `bucket is null and status='open'` reading at a future session open means something outside the app
  wrote it — that is a STOP and an investigation, not a re-ruling.
