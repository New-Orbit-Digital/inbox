# Packet 004 — Capture — run report

**Ran:** 2026-09-02 → 2026-09-03 · one Cowork session · planner + Claude Code Action executor
**Result:** **COMPLETE.** Three units, all **PASS**, none STOPPED. One unit needed a second executor
round after the planner rejected the first (see §3).

Packet: [build_packet_004_capture.md](../build_packet_004_capture.md) · contract input:
[prep_004_grocery_rule.md](../prep_004_grocery_rule.md)

---

## 1. Units

| Unit | Result | Issue | PR | Merge | Version |
|---|---|---|---|---|---|
| INDEX → RUNNING (docs-only) | merged | — | [#36](https://github.com/New-Orbit-Digital/inbox/pull/36) | `d242c9c` | — |
| U004-A — to-do toggles, tag dropdown, `#tag`, plain insert | **PASS** | [#37](https://github.com/New-Orbit-Digital/inbox/issues/37) | [#38](https://github.com/New-Orbit-Digital/inbox/pull/38) | `bfd3925` | `004-A` |
| U004-B — deterministic grocery split + aisle rule | **PASS** (2nd round) | [#39](https://github.com/New-Orbit-Digital/inbox/issues/39) | [#40](https://github.com/New-Orbit-Digital/inbox/pull/40) | `112fb91` | `004-B` |
| U004-C — `classify` → ping-only stub | **PASS** | [#42](https://github.com/New-Orbit-Digital/inbox/issues/42) | [#43](https://github.com/New-Orbit-Digital/inbox/pull/43) | `acb8cb0` | `004-C` |
| Close-out (docs-only) | this PR | — | — | — | — |

Ordering held. U004-A was deployed and confirmed before U004-B was filed; U004-B was deployed and
confirmed on the deployed app before U004-C was filed. Constraint 9 was never at risk.

Shipped: `INBOX_VERSION = "004-B"`, `CLASSIFY_VERSION = "004-C"`.

## 2. The headline claim, proved

`grep -rc "api.anthropic.com" web/ supabase/functions/` on `main` at `acb8cb0`:

```
web/inbox.html:0          web/config.js:0            web/index.html:0
web/icons/README.md:0     web/icons/icon-192.png:0   web/icons/icon-512.png:0
web/icons/icon-maskable-512.png:0
supabase/functions/classify/index.ts:0               supabase/functions/health/index.ts:0
```

**Zero for every file, with no exceptions to declare** — packet 008 has not landed, so
`primer-menu` and `primer-card` do not exist yet. When 008 ships they will carry one each and that
is the rule's named exception.

**There is no model call anywhere in this app.** The one that existed — `classify`'s Haiku grocery
parse — is gone from the repo, and the deployed endpoint answers `410`.

Live deploy proof, both cache-busted:

- `https://inbox.justin-dec.workers.dev/config.js` → `window.INBOX_VERSION = "004-B";`, `GROCERY_KEYWORDS` present
- `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/classify?ping=1` → `{"classify_version":"004-C","retired":true}`
- the same URL without `ping=1` → **410**

## 2b. The trigger is still live, and Prep-3 is still required

`classify-on-insert` on `public.messages` is **unchanged and still firing.** This packet deliberately
did not touch it: dropping it is DDL, and DDL is never packet work. **Prep-3** fires the drop and
mirrors it to `supabase/migrations/` — the baseline file still carries the `create trigger`
statement, so an unmirrored drop would leave the migration record wrong.

The `confidence: 1` guard is not a theory. `net._http_response` for Justin's confirming grocery
capture at `02:35:42Z`:

| status | n | when |
|---|---|---|
| 200 | 3 | `2026-09-03 02:35:42.54268+00` |

Three inserts, three webhook POSTs, three `200 {"skipped": true}` — the trigger fired on every row,
the still-deployed v12 skipped all three on the non-null `confidence`, and **no model call was
made.** From `acb8cb0` those POSTs get `410` instead, which is the signal in `net._http_response`
that the trigger still fires and still needs dropping.

## 3. U004-B failed its first round — a contract defect, not an executor error

The first branch implemented the pinned contract faithfully and passed all seven pinned acceptance
cases. The planner rejected it anyway, because **the contract contradicted itself**:

> `half and half` is pinned as a **Dairy keyword** in prep_004's seed table, and ` and ` is pinned as
> a **split separator**. The keyword is therefore unreachable — the capture splits into two fragments
> reading `half`, both filed to `Other`.

It is the only one of the 250 keywords affected (`candy` and `band aid` contain the letters without
the required spaces), and it is an item in Justin's real captured history.

**The correction loop could not have repaired it.** `savePref` upserts `normalize(m.body)`, so
correcting one of those rows teaches `half` → Dairy and the next capture still produces two rows
reading "half". "One correction fixes it" — the fallback the seed table leans on everywhere else —
is simply false for this class of defect.

Justin ruled the fix into the unit rather than deferring it. The amendment: **separator-bearing
keywords are derived from `GROCERY_KEYWORDS` at runtime, masked before the split and restored before
any word-level rule inspects the fragment.** Nothing is hardcoded, so a future multi-word entry is
protected automatically.

**How it was found is the transferable part.** The seven pinned cases all passed on the broken
build. What exposed it was running the committed code against **all 91 distinct grocery items in
the live `messages` table**. A pinned acceptance list proves a contract was implemented; only real
data proves the contract was right.

## 4. Adjudication readback — captures land complete without the webhook

`select body, bucket, grocery_category, tag, important, urgent, auto, confidence, created_at from public.messages order by created_at desc limit 5`

| body | bucket | aisle | tag | important | urgent | auto | confidence |
|---|---|---|---|---|---|---|---|
| `apples` | grocery | Produce | — | null | null | false | 1 |
| `bread` | grocery | Bakery | — | null | null | false | 1 |
| `milk` | grocery | Dairy | — | null | null | false | 1 |
| `wash the car` | todo | — | `house` | null | null | false | 1 |
| `packet 004 smoke` | todo | — | `ews` | true | true | false | 1 |

The three grocery rows share a timestamp **to the microsecond** — one array insert, the client
having done the whole job. `wash the car` proves the `#house` override: the tag was applied and the
token stripped from the body, while the dropdown said `ews`. Both to-do rows carry `null`/`null`
where no toggle was pressed — **Unsorted, not Eliminate** — and neither carries a `due_date`.
`tag_touch` fired on both: `todo_tags.last_used_at` for `house` and `ews` matches the inserts.

Contrast with the rows immediately before this packet, all `confidence 0` with a stamped
`due_date` — that is what the webhook used to do to every capture.

## 5. Hard constraints — clean

Across the whole packet (`d242c9c..acb8cb0`) exactly **three files** changed:
`web/inbox.html`, `web/config.js`, `supabase/functions/classify/index.ts`.

- **No DDL, no migration file, no trigger change.** Nothing under `supabase/migrations/` was touched.
- **No database write by any unit.** The rows above are Justin's own captures through the app.
- **`.github/workflows/` untouched.**
- **`supabase/config.toml` untouched** — `verify_jwt = false` intact, which is what keeps `?ping=1`
  answerable unauthenticated.
- **No new dependency, no build step, no new `<script>` tag.**
- Only the **Supabase Inbox** connector was used.

## 6. Errata against the packet and its issues

1. **The `half and half` contradiction** (§3) — two pinned clauses that cannot both hold. Recorded
   against the packet, not the branch.
2. **U004-A pinned a message requirement without a message element.** §5.4 demanded a rejected
   insert "surface the existing kind of inline message"; the file had none to reuse (`note()` is the
   sign-in gate's, `#pwmsg` the password panel's) and the pinned `.capopts` snippet provided no
   place for one. The executor added a `#capmsg` sibling and said so. **Behaviour beat artifact,
   correctly.** A future packet pins both or neither.
3. **The U004-B issue contradicted itself on `savePref`** — "refreshed after `savePref` writes"
   (behavioural) and "`savePref` (unchanged body)" (proof). They cannot both hold; `savePref` is the
   only site that knows a correction was written. The executor kept the existing statements
   byte-identical, appended one `loadPrefs()` call, and **explicitly rejected** hiding the refresh
   inside `load()` — which would have kept the grep clean while re-querying `grocery_prefs` on every
   realtime change. Choosing the larger honesty over the cleaner proof is the behaviour we want.
4. **Both executor rounds surfaced their conflicts rather than gaming the greps** — including
   round one of U004-B flagging the `half and half` contradiction on its own, before the planner
   raised it. The session-wide rule from packet 003 is working.

## 7. Findings worth carrying forward

**a. An executor cannot run its own code.** `claude.yml` pins
`--allowedTools "Bash(node --check:*),Bash(deno check:*)"` — parse-only. `node`, `deno run`,
`python3 -c`, `perl -e` and `awk 'BEGIN{}'` are all refused. This packet demanded an **executed**
worked table twice and got an honest hand-transcription twice; the second round transcribed the
algorithm into `sed` and ran *that*, which is ingenious and still not the code under test. **The
planner executed the committed branch instead, which is how the `half and half` defect surfaced.**
Until `Bash(node:*)` is added, "run your own code and paste the output" is not a proof any unit can
satisfy, and every packet asking for one must expect the planner to run it.

**b. A cached asset can lie about the deployed version.** The first read of the Worker's `config.js`
this session returned `001-A` while `main` was at `003-C`; a cache-busted read returned `003-C`. The
same happened on `classify?ping=1` after the U004-C deploy — `002-A` on a plain fetch, `004-C` with a
cache-buster. **Every version gate in this repo needs a cache-buster or a hard refresh**, or a
healthy deploy reads as a stale one.

**c. Verify a contract against live data, not only its acceptance list.** See §3. Cheap to do,
and it was the difference between shipping the grocery rewrite and shipping it broken.

**d. `deno check` now runs for real.** `denoland/setup-deno@v2` is in `claude.yml` and U004-C's
syntax gate executed on the runner. The executor could not *print* the exit code (the allowlist
refused `echo "EXIT=$?"` as a second operation) and recorded that refusal rather than pasting a
number it had not read. Packet 008 can rely on the gate.

## 8. Actions for Justin

**All outstanding verification now lives in the standing bookmark issue —
[#41](https://github.com/New-Orbit-Digital/inbox/issues/41).** Walk it at a computer; nothing in it
blocks a packet. New this packet: the `Bash(node:*)` workflow paste (§7a), the U004-A visual checks,
the remaining U004-B grocery cases, and the U004-C ping.

**Confirmed during the run, not outstanding:** U004-A's two smoke captures and column readback;
U004-B's `apples, bread and milk` on the deployed app; U004-C's ping and 410.

**The one thing that is not in the bookmark issue, because it gates the next step:**

- [ ] **Ask for Prep-3.** A ten-minute prep session, run before or alongside packet 005: drop
      `classify-on-insert` via the Supabase Inbox connector, mirror the drop to
      `supabase/migrations/`, capture one row, and confirm `net._http_response` stays flat.
      Until it runs, every insert still makes a wasted webhook round trip — now answered `410`,
      harmless, but noisy.

## 9. State at close

`messages` 219 · `todo_tags` 8 · `grocery_prefs` 14 · open to-do 16 (6 Unsorted) · open grocery 5
`owner is null` **0** · `bucket is null and status='open'` **0** (both premise gates held, open and close)
Trigger `classify-on-insert`: **still live.** Deployed: `classify` `004-C`, `health` `001-B`.
Worker: `INBOX_VERSION = "004-B"`.

## 10. Next

**Prep-3**, then **packet 005** (to-do views — and the tap-to-complete affordance packet 003 removed,
which is still load-bearing and must cover research and notes, not to-dos alone). Then 006, 007, 009,
strictly serial on `web/inbox.html`. **008 can run any time** — functions only, and the U004-C
deploy race it had to avoid is over. Its one blocker is a funded `ANTHROPIC_API_KEY` as a Supabase
function secret, in the bookmark issue.
