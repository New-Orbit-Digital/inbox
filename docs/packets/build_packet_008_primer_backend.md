# Build Packet 008 — Primer backend: `primer-menu`, `primer-card`, the daily cap, pings

**Prepared:** 2026-09-02 · prep session with Justin · contracts pinned against the Primer corpus, now committed at `docs/primer/` — §5 (`docs/primer/03_backend.md`) is this packet's contract and Appendix A (`docs/primer/07_card_library_spec.md`) is the product it serves
**Risk class:** high, and differently from every packet before it. Nothing here can lose data — both tables are new and empty. What it can do is **spend money** (Sonnet 5 with web search, $0.25–0.60 per research-mode primer) and **ship a card format that quietly violates the spec**, which is the one failure this whole product exists to prevent. Adjudication is therefore stricter than usual: JSON shape deviations are FAIL, not findings.
**Merge policy:** auto-merge on PASS authorized for U008-A. **U008-B is merge-on-Justin's-word** — it is the unit that starts billing Sonnet 5 and web searches.
**Concurrency:** functions only (`supabase/functions/**`, `supabase/config.toml`), so it is safe alongside the web packets 003–007 **with one exception**: never in flight at the same time as **packet 004 U-C**, which also deploys through `deploy-supabase`. That workflow redeploys every function from its own checkout, so two runs can race and the later-starting one overwrites the earlier.
**Deploy surface:** edge functions (`supabase/functions/**` + `supabase/config.toml` trigger). Automatic on merge to `main`.
**DB prep status:** **done.** Migration `20260902014310_primer_schema` was applied 2026-09-02 via the Supabase Inbox connector and certified by readback — `primers` 14 columns, `primer_cards` 18, 8 policies, 2 triggers, 6 indexes, RLS true on both, `primers_message_fk` present (`message_id` → `public.messages(id)` `on delete set null`; `messages.id` is uuid, confirmed). Those are exactly the counts the corpus's rolled-back-transaction validation predicted. **This packet issues no DDL.**
**Session role:** you are the PLANNER. Issues tag `@claude`; the executor (Claude Code Action) builds on a branch; you open the PR, adjudicate via `pull_request_read` with `method: get_diff`, and merge with `merge_pull_request` only after posting an explicit PASS.

**Prep already done — do not redo:**
- **The corpus is in the repo.** `docs/primer/` holds all of it, split into nine parts and unedited. Read `docs/primer/03_backend.md` in full before writing either issue; read `docs/primer/07_card_library_spec.md` before adjudicating any card output. `docs/primer/00_read_first.md` lists which of the corpus's 18 open questions are already answered and which are still open — **do not re-litigate the answered ones.**
- **The corpus's `[PROPOSED]` functions have never been deployed or invoked.** They pass a TypeScript check and nothing more. They are a strong first draft, not shipped code: the executor ports them, it does not trust them.
- **Model IDs verified against the live docs on 2026-09-02:** `claude-haiku-4-5-20251001` (menu) and `claude-sonnet-5` (cards) are both current, exactly as the corpus writes them.
- **Web search tool version ruled: `web_search_20250305`.** The docs list `web_search_20250305`, `web_search_20260209` (dynamic filtering, Claude 4.6+) and `web_search_20260318`, but the per-model support matrix for `claude-sonnet-5` could not be confirmed on 2026-09-02. The broadly-supported version wins; a newer one is a later, evidence-backed change, not a unit's improvisation.
- **`ANTHROPIC_API_KEY` is the name the deployed `classify` reads** (grep-verified). That proves what the function *asks for*, not what is *set* — the session-open gate below is what proves it is set.
- **This project's function config lives in `supabase/config.toml`, not the dashboard** — and the corpus's instruction to "deploy with Verify JWT on" is **overruled here, deliberately.** Both Primer functions ship `verify_jwt = false`, exactly like `classify`. The reason is D-25: `?ping=1` is the deploy proof and it must be fetchable with no token, from a phone browser, by a person who does not use a terminal. Supabase's gateway enforces `verify_jwt` *ahead of the function body*, so `true` would make the ping return the gateway's 401 and there would be no cheap way to tell a deployed function from a broken one. **The auth boundary does not weaken:** each function still calls `supabase.auth.getUser()` on the forwarded token and returns 401 without it, and RLS is the real boundary (D-28). What `verify_jwt = false` costs is that an unauthenticated POST reaches the handler and is refused in code rather than at the gate — no data risk, and the same trade `classify` has run under since packet 001.
- **CORS is `https://inbox.justin-dec.workers.dev`,** matching `ALLOWED_ORIGIN` in `classify` — not the corpus's `*`.
- **Live counts 2026-09-02:** `primers` 0 rows, `primer_cards` 0 rows. Every number this packet produces is its own.

## Hard constraints (verbatim, non-negotiable)

1. **The JSON contracts in `docs/primer/03_backend.md` and `docs/primer/04_ai_usage.md` are exact.** Every card type's `body` shape, the menu shape, the status values, the `chips` shape. **A deviation is a FAIL, not a finding** — packet 009's renderer is written against these shapes and the five regression fixtures compare against them.
2. **The prompts are `[VERBATIM]` product IP.** `MENU_SYSTEM`, `CARD_SYSTEM` and all ten `CARD_BLOCKS` are lifted from the Card Library Specification and must be reproduced **byte-identical** to the corpus. A unit that "tightens", shortens, reflows or improves a prompt = FAIL. If a prompt looks wrong, that is a finding for Justin, not an edit.
3. **No DDL, no migration file.** The schema is applied and certified. A unit that seems to need a column is a STOP.
4. **Neither function may use `SUPABASE_SERVICE_ROLE_KEY`.** Both build their supabase-js client from `SUPABASE_URL` + `SUPABASE_ANON_KEY` and forward the caller's `Authorization` header, so every read and write goes through RLS and `owner` fills from its column default. `grep -c "SERVICE_ROLE" supabase/functions/primer-*/index.ts` → `0`. This is the auth boundary; a service-role client would silently bypass it.
5. **Never touch `.github/workflows/`**, `web/`, `supabase/functions/classify/`, or `supabase/functions/health/`.
6. One unit per issue. Branch `claude/issue-N-YYYYMMDD-HHMM`. A tripped STOP is always a stop.
7. **Secret placeholders in every issue:** names only — ANTHROPIC_API_KEY, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY — never a value; examples written WITHOUT angle brackets.
8. **Supabase connector discipline:** ONLY **Supabase Inbox** (`qaabxgldjluqyccwhjzf`). Never call or disconnect any other Supabase connector.
9. **Two model call sites in this packet and no more** — one in `primer-menu`, one in `primer-card` (the corrective retry reuses that call site). At close-out, `grep -rc "api.anthropic.com" supabase/functions/` must read: `primer-menu` **1**, `primer-card` **1**, `health` **0**, and `classify` **1 if packet 004 has not landed yet, 0 if it has** — record which, and change nothing about it either way. `classify`'s call site belongs to packet 004 U-C, not to this packet, and 008 may legitimately run first.
10. **In-scope files, exhaustively:** U008-A → `supabase/functions/primer-menu/index.ts` (new), `supabase/config.toml`. U008-B → `supabase/functions/primer-card/index.ts` (new), `supabase/config.toml`. Nothing else in either unit.
11. **Each function answers `?ping=1`** with its own version, per D-25: `{"primer_menu_version":"008-A"}` and `{"primer_card_version":"008-B"}`.

## Session-open gates

- **Flip this packet's INDEX row to RUNNING first** (docs-only PR on a planner branch, merged by you).
- Read `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md` and all of `docs/primer/` via the GitHub connector. Connector down → STOP the packet.
- Ordering gate: 002 COMPLETE (this packet's functions deploy through the same workflow). **If packet 004 is RUNNING, STOP** — deploy race. 003–007 in any state is fine.
- Supabase Inbox binding: `select count(*) from todo_tags` returns a number.
- **Premise gate (literal), one query:**
  `select (select count(*) from information_schema.columns where table_schema='public' and table_name='primers') as p_cols, (select count(*) from information_schema.columns where table_schema='public' and table_name='primer_cards') as c_cols, (select count(*) from pg_policies where schemaname='public' and tablename in ('primers','primer_cards')) as policies, (select count(*) from pg_constraint where conname='primers_message_fk') as fk;`
  Expected `14, 18, 8, 1`. Anything else → STOP the packet (the schema premise is stale).
- **Secret gate — the one that cannot be checked by reading code.** The connector cannot list function secrets. Ask Justin to confirm in the Supabase dashboard (Edge Functions → Secrets) that **ANTHROPIC_API_KEY** exists and that the Anthropic account behind it has a **funded credit balance**. Both functions bill the API, not the Claude subscription — the executor's OAuth token is unrelated. Unconfirmed → STOP before U008-B; U008-A may proceed, since a missing key surfaces as a clean 500 with no spend.
- File-size gate: any file over 300 KB → finding.

---

## U008-A — `supabase/functions/primer-menu/index.ts`

**Why:** the menu call is what makes a primer feel bespoke to its topic while every option still maps to a locked card format. It is also the cheap half — Haiku, ~$0.003 a call — so it is where the whole pipeline gets proven before anything expensive runs.
**Scope:** `supabase/functions/primer-menu/index.ts` (new), `supabase/config.toml` (one added block). Nothing else.

### Pinned contract

**Port `docs/primer/03_backend.md`'s `primer-menu` source**, with these and only these changes:

1. `const PRIMER_MENU_VERSION = "008-A";` added.
2. **CORS origin** `https://inbox.justin-dec.workers.dev` in place of `*`. `Access-Control-Allow-Methods: GET, POST, OPTIONS`; headers unchanged from the corpus.
3. **`GET` with `ping=1` → `200` JSON exactly `{"primer_menu_version":"008-A"}`**, before any auth check, no database or model access. Any other `GET` → `405` JSON `{"error":"GET ping only","primer_menu_version":"008-A"}`.
4. Every error response gains `primer_menu_version`. The status codes are the corpus's and do not change: `401` missing/invalid session, `400` bad body, `404` primer not found (RLS hiding a row reads as not-found — **deliberately not 403, no existence leak**), `500` otherwise with the row's `status`/`error` updated.
5. `MENU_SYSTEM` and `menuUserMessage()` **byte-identical to the corpus.**
6. `validateMenu()`, `extractJson()`, `callHaiku()` and the one corrective retry: ported as written. The retry's rejection message is the corpus's.
7. Model `claude-haiku-4-5-20251001`, `max_tokens: 1024`, `temperature: 0.3`, no tools.

**`supabase/config.toml`** — append, leaving `[functions.classify]` and `[functions.health]` untouched:

```toml

[functions.primer-menu]
verify_jwt = false
```

`false` is deliberate and is explained in "Prep already done" above: the gateway would otherwise reject the `?ping=1` deploy proof before any code runs. The in-code `supabase.auth.getUser()` check is the auth gate, and RLS is the boundary — a request without a valid token gets 401 from the handler and touches nothing.

**Rules for the executor, stated in the issue:** create the file and the config block only; run `deno check supabase/functions/primer-menu/index.ts` and paste output and exit code. **If the runner has no `deno`** (a known open backlog item — absent during packet 001), say so plainly and record the refusal; the planner adjudicates by reading the whole file and the run report notes the syntax gate did not execute.

**What-survives proof (required in the PR body):**
1. A prompt-fidelity diff: `MENU_SYSTEM` as committed, character count, versus the corpus block in `docs/primer/03_backend.md` — must be identical. Paste the count for both.
2. `grep -c "SERVICE_ROLE" supabase/functions/primer-menu/index.ts` → `0`.
3. `grep -c "api.anthropic.com" supabase/functions/primer-menu/index.ts` → `1`.
4. `grep -n "verify_jwt" supabase/config.toml` → three blocks, all `false`: classify, health, primer-menu. Paste the file.
5. `deno check` output and exit code.
6. `git diff --stat main` — exactly 2 files, one new.
7. `wc -l docs/primer/03_backend.md` → `748`, confirming the corpus is the one these contracts were pinned against.

**Adjudication:** PASS shape = one new function file plus a 3-line `config.toml` addition; prompts byte-identical; anon-key client forwarding the caller's header; ping exact; `404` (not 403) for a hidden row; one Anthropic call site; one corrective retry. FAIL on: any prompt text altered; a service-role client; `verify_jwt` **true** (it must be false — see above); a missing in-code `getUser()` check; a second model call; a hunk in `classify`, `health`, or `web/`; the `menu` written anywhere but `primers.menu`; `deno check` missing or non-zero without a recorded refusal.

**STOP conditions:** the premise gate's column/policy counts do not match; `supabase/config.toml` on `main` does not contain both existing function blocks.

---

## U008-B — `supabase/functions/primer-card/index.ts` + the daily cap

**Why:** this is the generation engine, and the only place in the app that spends real money per use. It is also where the Card Library Specification stops being a document and becomes behaviour.
**Scope:** `supabase/functions/primer-card/index.ts` (new), `supabase/config.toml` (one added block). Nothing else. **File this issue only after the secret gate is confirmed and U008-A is verified.**

### Pinned contract

**Port `docs/primer/03_backend.md`'s `primer-card` source**, with these and only these changes:

1. `const PRIMER_CARD_VERSION = "008-B";` added; CORS origin tightened as in U008-A; `?ping=1` → `{"primer_card_version":"008-B"}`; every error response carries `primer_card_version`.
2. `CARD_SYSTEM` and all ten entries of `CARD_BLOCKS` **byte-identical to the corpus** — including the `{{label}}` and `{{chip_text}}` placeholders and the exact word-count ranges. This is the packet's single most important requirement.
3. `CARD_MODEL = "claude-sonnet-5"`; `WEB_SEARCH_TOOL = "web_search_20250305"`; `MAX_TOKENS = 4000`; `ANTHROPIC_VERSION = "2023-06-01"`.
4. `ALWAYS_SEARCH`, `SEARCH_BUDGET`, `DEFAULT_LABEL`, `CHIP_HINTS`, `DEBATES_CHIP_TEXT`: ported unchanged.
5. `buildUserMessage`, `contextFor`, `callAnthropic` (including the `pause_turn` continuation loop and `MAX_PAUSE_TURN_ROUNDS = 4`), `extractJson`, `validateBody`, `normalizeChips`: ported as written.
6. **`CALL_TIMEOUT_MS` drops from the corpus's `110_000` to `55_000`.** The edge-function wall-clock limit on this project's plan is unknown (corpus open question 7) and an abort that returns a clean per-card error beats a function killed mid-write. Tune it upward later from real timings, with evidence.
7. The `409` guard stays exactly as written: a non-overview card whose primer has no `ready` overview is refused. The client cannot skip the overview.
8. `card.status === "ready" && !force` → `{card, cached: true}`, unchanged. The primer flips to `ready` when nothing is `pending` or `generating`, unchanged.

**New in this unit — the daily card cap (SPEC D-21, corpus open question 18):**

- Constant `DAILY_CARD_CAP = 20;` and one canonical message string, `const CAP_MESSAGE = "daily card limit reached (20)";`, used **both** in the row's `error` column and in the response body. Two wordings for one condition is a FAIL.
- **Exact placement, because a line either side of it changes the arithmetic:** the check runs after `getUser()`, after the card and primer are fetched, after the `409` overview guard, and **immediately before** the corpus's `update({ status: "generating" })`. Putting it after that update makes the card being generated count itself.
- **What is counted, pinned:** cards belonging to the caller with `status = 'ready'` and `created_at >= ` the start of today UTC —
  `supabase.from("primer_cards").select("id", { count: "exact", head: true }).eq("status", "ready").gte("created_at", <start of today, UTC, ISO>)`
  — and if that count is **at or over** the cap, update this card to `status:'error'`, `error: CAP_MESSAGE`, and return **`429`** JSON `{"error": CAP_MESSAGE, "primer_card_version":"008-B"}`.
  Counting only `ready` cards is a deliberate choice with a known gap, stated here so nobody "fixes" it: a card that burned a call and failed validation costs money and does not count, and a cap-refused card (now `error`) does not inflate the count on retry. The alternative — counting every non-pending row — makes a refused card count against tomorrow's budget too, which is worse. `created_at` is insert time rather than generation time; in this client they are seconds apart, and a primer built at 23:55 and generated at 00:05 spending nothing is an acceptable edge for a personal tool.
- The count is scoped by RLS to the caller automatically; **do not add an `owner` filter that could mask an RLS failure** — if RLS were wrong, an owner filter would hide it, and this counter is the place that would otherwise notice.
- **`force` does not bypass the cap, and the cap does not break `force`.** The corpus's cached-return stays exactly as written (`card.status === "ready" && !force` → `{card, cached: true}`), so a **non-force** call on a ready card returns before the cap check and costs nothing, while a **`force` retry falls through to the cap check** like any other generation — which is correct, because it is about to spend. Packet 009's "Try again" button calls `generate(cardId, true)`; if that button stopped working for ready cards, that would be this contradiction shipping.
- **The cap counts cards, not primers, because cards are what cost money.** State that in the issue.

**`supabase/config.toml`** — append, leaving the three existing blocks untouched:

```toml

[functions.primer-card]
verify_jwt = false
```

Same reasoning as U008-A: the gateway must not swallow the ping. `getUser()` plus RLS is the boundary.

**Rules for the executor, stated in the issue:** create the file and the config block only; no edits to `primer-menu`; run `deno check supabase/functions/primer-card/index.ts` and paste output and exit code, or record the refusal.

**What-survives proof (required in the PR body), adjudicated line by line:**
1. **Prompt fidelity table:** for `CARD_SYSTEM` and each of the ten `CARD_BLOCKS` keys, the character count as committed and the character count of the corresponding corpus block. Eleven rows, every pair equal. This table is the unit's central proof; a PR without it is not adjudicable.
2. A JSON-shape table: each of the ten `card_type`s → the `body` shape `validateBody` enforces → the shape `docs/primer/04_ai_usage.md` documents. All ten must agree.
3. `grep -c "SERVICE_ROLE" supabase/functions/primer-card/index.ts` → `0`.
4. `grep -c "api.anthropic.com" supabase/functions/primer-card/index.ts` → `1`.
5. `grep -n "DAILY_CARD_CAP\|429" supabase/functions/primer-card/index.ts` — the constant, the check, the response; and a one-line statement that the check sits before the model call.
6. `grep -n "web_search_2025\|web_search_2026" supabase/functions/primer-card/index.ts` → only `web_search_20250305`.
7. `grep -n "CALL_TIMEOUT_MS" supabase/functions/primer-card/index.ts` → **two** lines: the `const` declaration carrying `55_000`, and its use in the `setTimeout` that aborts the call. Quote both.
8. `grep -n "verify_jwt" supabase/config.toml` → four blocks, all `false`.
9. `deno check` output and exit code; `git diff --stat main` — exactly 2 files, one new.

**Adjudication:** PASS shape = one new function file plus a 3-line `config.toml` addition; eleven prompt blocks byte-identical; the cap enforced before spend and returning 429; the 409 overview guard intact; `pause_turn` loop present; one corrective retry; anon-key client only. FAIL on: **any prompt text altered, shortened or reflowed**; a `body` shape that differs from `docs/primer/04_ai_usage.md`; the cap after the model call or missing; a service-role client; a missing in-code `getUser()` check; a second model call; `web_search_20260209` or `web_search_20260318`; a hunk in any other function; `verify_jwt` true.

**STOP conditions:** the secret gate is unconfirmed; `primer-menu` is not deployed and answering its ping; `docs/primer/03_backend.md` on `main` is not **748 lines / 47,133 bytes** — the corpus these contracts were pinned against on 2026-09-02. A changed corpus means the contracts are stale, and that is a ruling, not an improvisation.

---

## End-of-run report (single message, final)

1. Per unit: PASS / FAIL / STOPPED, issue numbers, PR numbers, merge SHAs, shipped version values.
2. The eleven-row prompt-fidelity table, reproduced in the report — it is the evidence that the product's IP shipped intact.
3. Confirmation that no DDL was issued, no `web/` file was touched, `classify` and `health` are untouched, and neither function references the service-role key.
4. Connector readback: `select count(*) from public.primers` and `select count(*) from public.primer_cards` — both expected to still be **0**, because nothing can invoke these functions until packet 009 ships a client. State that explicitly so the next session does not read the zeros as a failure.
5. A named handover line to packet 009: which behaviours of these two functions are still unproven (all of them beyond the pings), and that 009 U009-A's first primer is where they get proven.
6. **Actions for Justin** (explicitly separated checklist):
   - **Before U008-B is filed:** in the Supabase dashboard, Edge Functions → Secrets, confirm **ANTHROPIC_API_KEY** exists, and confirm the Anthropic account behind it has credit. These calls bill the API, not your Claude subscription.
   - Confirm `deploy-supabase` green on each merge SHA.
   - **After U008-A:** fetch `https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/primer-menu?ping=1` → expect `{"primer_menu_version":"008-A"}`.
   - **After U008-B:** fetch `…/functions/v1/primer-card?ping=1` → expect `{"primer_card_version":"008-B"}`.
   - **That is the whole of this packet's verification, and it is deliberately thin.** Both functions require a signed-in user's JWT, and the only thing that can produce one is a browser — which packet **009** builds. There is no honest way for a planner or a connector to invoke them: `primers.owner` defaults from `auth.uid()`, which a service-role SQL session does not have, and nobody here is going to run curl on your behalf. So this packet ships two functions that are deployed and reachable but not yet exercised, and says so plainly rather than inventing a smoke test that cannot be run.
   - **009 U009-A's first primer is 008's real acceptance test.** When you build it, read the Overview against `docs/primer/07_card_library_spec.md` Card 1 (paragraph 1 must stand alone as a complete answer; paragraph 2 must be a map of ideas, not a list of section names) and read the Debates card hardest: a live debate filed under misconceptions, or a settled question filed as a debate, is the cardinal failure this product exists to prevent. **If a card comes back wrong in a way that is about wording rather than rendering, that is a finding against packet 008, not 009** — reopen 008 with the card's JSON attached; the prompts are its contract, not 009's.
   - Suggested first topic when you get there: **the 2008 financial crisis**, in conversation mode — `docs/primer/08_sample_primers.md` sample 4 is the reference for what good looks like. Do not run a research-mode primer until the per-card token and search counts look sane; that is the $0.25–0.60 path.
   - If anything deviates from prediction: STOP, paste everything to the planning chat, change nothing else.

---

## Packet close-out (inventory maintenance)

When the run ends (PASS/FAIL/STOPPED), land ONE final PR through the normal pipe that adds the full end-of-run report as `docs/packets/reports/packet_008_report_YYYYMMDD.md` and flips this packet's row in `docs/packets/INDEX.md` to COMPLETE (or STOPPED, with a one-line reason), linking the report. The report records that the functions are deployed but unexercised, and names packet 009 U009-A as where they get their first real run. Per-card token and web-search counts — the evidence for any later change to `SEARCH_BUDGET` or `CALL_TIMEOUT_MS` — are recorded in **packet 009's** report, not this one. Auto-merge on PASS applies to this close-out PR. Every run report ends with an explicitly separated "Actions for Justin" checklist (state "no action needed" if empty).
