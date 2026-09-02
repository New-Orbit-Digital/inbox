# Packet 003 — run report (2026-09-02)

**Shell: bottom nav, Events behind a flag, cross-filing removed, live wall gone.**
Planner session: Cowork, GitHub + Supabase Inbox connectors. Executor: Claude Code Action on
`claude_code_oauth_token`. All three units ran, all three PASSED, none STOPPED.

## 1. Per-unit results

| Unit | Result | Issue | PR | Merge SHA | `INBOX_VERSION` shipped |
|---|---|---|---|---|---|
| Session-open gate (docs-only) | merged | — | [#26](https://github.com/New-Orbit-Digital/inbox/pull/26) | `6dc5080` | — (no `web/` change) |
| **U003-A** — bottom nav, routing, Events flag, internals rename | **PASS** | [#27](https://github.com/New-Orbit-Digital/inbox/issues/27) | [#28](https://github.com/New-Orbit-Digital/inbox/pull/28) | `2a31051` | `003-A` |
| **U003-B** — remove cross-filing: chips, `fileAs`, keys 1–4 | **PASS** | [#29](https://github.com/New-Orbit-Digital/inbox/issues/29) | [#30](https://github.com/New-Orbit-Digital/inbox/pull/30) | `95832ce` | `003-B` |
| **U003-C** — live-wall cleanup: `archive/live-wall/`, `PUBLIC_HOST` | **PASS** | [#31](https://github.com/New-Orbit-Digital/inbox/issues/31) | [#32](https://github.com/New-Orbit-Digital/inbox/pull/32) | `fa486a6` | `003-C` |

Each unit was deployed and confirmed on the phone by Justin before the next issue was filed, as the
packet requires. Every version was read back live at
`https://inbox.justin-dec.workers.dev/config.js` after its merge: `003-A`, `003-B`, `003-C`, in order.

Diff sizes: U003-A 2 files (+118/−49); U003-B 2 files (+2/−48); U003-C 3 paths (2 deletions totalling
375 lines, plus `web/config.js` +1/−4).

## 2. Constraint compliance

- **No unit touched `supabase/`** — not the functions, not `config.toml`, not `migrations/`.
  `deploy-supabase` did not run at any point during the packet.
- **No unit touched `.github/workflows/`.**
- **No DDL was issued and no database write was made by the session.** The only database access was
  read-only `select` through the **Supabase Inbox** connector (project `qaabxgldjluqyccwhjzf`). No
  other Supabase connector was called or disconnected.
- **No model calls added.** `grep -c "api.anthropic.com" web/inbox.html` is `0` before and after.
- No new dependency, no build step, no framework, no new `<script>` tag. `web/` still ships verbatim.
- Secret placeholders: names only in every issue body, no values anywhere.

## 3. Combined handler inventory — `web/inbox.html`

24 `addEventListener` sites before the packet, **23** after. Two removed, one added, 22 untouched.

| Handler | Before | After | Status |
|---|---|---|---|
| `themeBtn` click | ✓ | ✓ | kept |
| `#signin` click | ✓ | ✓ | kept |
| `#password` keydown | ✓ | ✓ | kept |
| `#email` keydown | ✓ | ✓ | kept |
| `#magic` click | ✓ | ✓ | kept |
| `#signout` click | ✓ | ✓ | kept |
| `#setpw` click | ✓ | ✓ | kept |
| `#savepw` click | ✓ | ✓ | kept |
| `#newpw` keydown | ✓ | ✓ | kept |
| `#add` click | ✓ | ✓ | kept |
| autocomplete row `mousedown` | ✓ | ✓ | kept |
| `captureEl` input | ✓ | ✓ | kept |
| `captureEl` click | ✓ | ✓ | kept |
| `captureEl` keydown | ✓ | ✓ | kept |
| `document` click (autocomplete close) | ✓ | ✓ | kept |
| recur `stop` click | ✓ | ✓ | kept |
| to-do date input `change` | ✓ | ✓ | kept |
| to-do tag select `change` | ✓ | ✓ | kept |
| grocery check click | ✓ | ✓ | kept |
| grocery aisle select `change` | ✓ | ✓ | kept |
| tag filter chip click (`renderTagbar`) | ✓ | ✓ | kept |
| `document` keydown (triage) | ✓ | ✓ | kept |
| **`#tabs` click** | ✓ | — | **removed (U003-A)** |
| **bucket chip click (`metaRow`)** | ✓ | — | **removed (U003-B)** |
| **`#nav` click (delegated)** | — | ✓ | **added (U003-A)** |

The Swimlanes / Matrix segmented control binds **no** listener — it is inert as contracted; its
behaviour lands in packet 005.

## 4. Premise-gate numbers

| Reading | `open_unbucketed` | `wall_rows` |
|---|---|---|
| At session open (before U003-A) | **0** | **0** |
| At close (after U003-C merged) | **0** | **0** |

Open rows by bucket at U003-A's deploy: To-do 14 · Grocery 2 · Research 7 · Notes 4 · Events 0 ·
unbucketed 0 — exactly the packet's prediction.

**The premise is now permanent, not merely current.** `fileAs` and the un-file
`patch(m.id, {bucket:null, auto:false})` were the app's only writers of a null bucket, and U003-B
deleted both. No code path can produce a null-bucket open row, which is what makes U003-A's missing
Unsorted segment safe going forward.

## 5. Errata and findings

### 5.1 Packet erratum — U003-A's proof items 2 and 5 are self-contradictory

The unit requires a one-time theme carry-over (read `tw-theme`, use it, `removeItem` it) *and*
`grep -c "tw-theme" web/inbox.html` → `0`. Both cannot hold: the carry-over needs the literal key.

**Ruling: the behavioural clause wins.** The two surviving occurrences are exactly the carry-over
read and its removal, inside one `try{}catch(e){}`; `applyTheme` writes `inbox-theme` only. The
executor surfaced the conflict rather than obfuscating the string to make the grep pass — the right
call, and the opposite one would have been a FAIL.

**For future packets:** an equivalent proof should read *"the only occurrences of the old key are the
carry-over read and its removal"*, not *"zero occurrences"*.

### 5.2 Finding, ruled and accepted — no tap-to-complete until packet 005

U003-B's deletion of the chip row also removed the only pointer-driven caller of `complete()`. Its
one remaining caller is the `x` key, and the `.keys` hint is hidden under `@media (hover:none)`. On a
touch device there is now **no way to complete or un-complete a to-do / research / note card**, and
the recurrence roll-forward inside `complete()` is keyboard-only. Grocery is unaffected — its
checkbox calls `patch(m.id, {status:'done'})` directly and never went through `complete()`.

This is exactly what the pinned contract specifies (deletions only, no new affordance). The executor
built it as written and flagged it. **Justin ruled 2026-09-02: accept the gap**, and let packet 005
restore completion in swimlanes. Packet 004 runs first, so the gap spans 004 and 005.

**Carried forward: packet 005's session must treat restoring tap-to-complete as load-bearing, not
cosmetic.** It is the app's only completion path for three of its five sections.

### 5.3 Confirmed while adjudicating U003-C

The only readers of `cfg.PUBLIC_HOST` in the repo were `archive/live-wall/wall.html` (the QR join URL
and its printed label), both deleted in that unit. Nothing under `web/` ever read it — the wall was
not load-bearing, as the STOP condition anticipated.

## 6. State after the packet

- Worker serving `INBOX_VERSION = "003-C"`; `window.INBOX` replaces `window.TEXTWALL`; theme key is
  `inbox-theme` with a one-time carry-over from `tw-theme`.
- Shell: fixed bottom nav with five sections (To-do · Grocery · Research · Notes · Done). Events is
  behind `SHOW_EVENTS = false`, one flag with exactly one use. No Unsorted segment.
- Cross-filing is gone: no bucket chips, no `fileAs`, no number keys. `j` / `k` / `x` survive.
- D-26 (live wall cut) is complete on both halves — database in Prep-2, repo here. The old `textwall`
  Worker in Justin's personal Cloudflare account is the last remaining piece and is his to delete.
- `classify` v12 (`002-A`) and `health` v1 (`001-B`) untouched and still deployed.

## 7. Actions for Justin

- [ ] **Delete the old `textwall` Worker** in the personal Cloudflare account (`justin-a-bost`
      subdomain). Nothing in the repo points at it any more; this takes the wall pages off the
      internet. Standing backlog item, now unblocked.
- [ ] **Before packet 004:** paste the `denoland/setup-deno@v2` step into `.github/workflows/claude.yml`
      so `deno check` executes. Without it 004 and 008 fall back to planner read-through.
- [ ] **Before packet 008:** confirm `ANTHROPIC_API_KEY` is set as a Supabase function secret and that
      the Anthropic account behind it has credit. It is 008's session-open gate and cannot be checked
      from a session.
- [ ] **When packet 005 is planned:** confirm the ruling in 5.2 still stands, and that 005's
      completion affordance covers research and notes, not to-dos alone.
- [ ] Optional housekeeping: delete the merged branches `claude/issue-27-20260902-1229`,
      `claude/issue-29-20260902-1259`, `claude/issue-31-20260902-1339`,
      `planner/003-running-20260902` and `planner/003-closeout-20260902` — the connector cannot delete
      branches.

Nothing else is outstanding from this packet. **Next in the queue: packet 004 (Capture).**
