# Packet 001 run report — pipe shakedown (2026-08-31)

Planner: Cowork session (kickoff by Justin, run unattended). Executor: Claude Code Action.
All times UTC. Packet: [build_packet_001_pipe_shakedown.md](../build_packet_001_pipe_shakedown.md).

## 1. Units

| Unit | Verdict | Issue | PR | Merge SHA |
|---|---|---|---|---|
| U001-A — `INBOX_VERSION` beacon in `web/config.js` | **PASS** | #5 | #7 | `70151e14a8ae60fed36037a3725f0e77160c4527` |
| U001-B — `health` edge function + `config.toml` entry | **PASS** | #8 | #9 | `667c590d17896be07e615dc3bf7ea10712bf3d84` |

Sequencing honored: U001-B was filed only after the U001-A merge. INDEX flip to RUNNING landed
first as PR #4 (merge `e807780e`).

Session-open gates, all green: connector docs reads OK; Supabase Inbox binding OK
(`todo_tags` = 8); premise gate exact (`20260831020016 health_support`,
`20260830174400 quadrants_and_lanes`); file-size gate clean (largest file `web/inbox.html`
at ~37 KB; nothing near 300 KB).

**Deviation to note (not a FAIL):** the U001-B syntax gate `deno check` was NOT executed — the
Actions runner has no `deno` (`command not found`, exit 127) and the sandbox refused the installer
download. Per the packet's documented fallback, the executor recorded the exact refusal, ran
`node --check` as a parse-only substitute (exit 0), and the planner adjudicated
`supabase/functions/health/index.ts` by reading it in full against the pinned contract. Justin's
`?ping=1` fetch below is the real post-deploy gate. Consider preinstalling deno on the runner via a
Justin-pasted workflow edit if later packets need `deno check` (workflow edits are outside packet
scope).

U001-A adjudication: diff read in full — one file, one end-of-file hunk, pure addition, exactly the
four pinned lines; `node --check` empty output / exit 0 pasted by executor.
U001-B adjudication: diff read in full — one new 85-line file + the exact 3-line `config.toml`
block; contract points verified line by line (ping path DB-free, 405 on non-GET, exact response
keys, head-only counts, RPC formatting with null-name fallback, 500 error shape, CORS +
`Content-Type` on every response); `git diff main -- supabase/functions/classify/index.ts` empty.

## 2. Constraint confirmations

- `web/inbox.html`: untouched (no unit's diff contains it).
- `supabase/functions/classify/`: untouched (verified in the U001-B diff and by the executor's
  empty-diff proof).
- `.github/workflows/`: untouched.
- No DDL issued; the only database access was read-only via the Supabase Inbox connector
  (gate queries and close-out counts).
- No model/API calls introduced; no secret values written anywhere.

## 3. Close-out table counts (prediction for the health fetch)

Read via Supabase Inbox at close-out, 2026-08-31:

| table | count |
|---|---|
| `messages` | 193 |
| `todo_tags` | 8 |
| `grocery_prefs` | 4 |

Expect the health endpoint's `tables` to match — `messages` within ±5 (drifts with captures),
the other two exactly.

## 4. Actions for Justin

- [ ] **Actions tab:** `deploy-worker` green on `70151e1` (U001-A) and `deploy-supabase` green on
  `667c590` (U001-B).
- [ ] **Beacon:** fetch `https://inbox.justin-dec.workers.dev/config.js` with a hard refresh
  (Ctrl+F5) — the last three lines must contain `window.INBOX_VERSION = "001-A";`. Any other value
  after a hard refresh = STOP; report it.
- [ ] **Health ping:** fetch
  `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/health?ping=1` — expect exactly
  `{"health_version":"001-B"}`. A 401, a 404, or any other body = STOP; report it.
- [ ] **Health full:** fetch `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/health` —
  expect `app: "inbox"`, `health_version: "001-B"`, `migrations` beginning with
  `20260831020016_health_support`, and `tables` matching §3 (±5 on `messages`, exact on the rest).
- [ ] **Classify regression:** open `https://inbox.justin-dec.workers.dev/inbox.html`, hard
  refresh, capture one grocery item — it must still categorize.
- [ ] If anything deviates from prediction: STOP, paste everything to the planning chat, change
  nothing else.
