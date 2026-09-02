> **Provenance.** This file is one part of the *Primer → Text Wall Migration Corpus*,
> prepared 2026-08-29 and handed to the Inbox project on 2026-09-02. It was split into
> `docs/primer/*.md` on arrival so each part is small enough to review; **the text of every
> part is verbatim and unedited.** Provenance tags inside — `[VERBATIM]`, `[DESIGN]`,
> `[PROPOSED]`, `[UNVERIFIED]` — are the corpus's own and are defined in
> [00_read_first.md](00_read_first.md). `[PROPOSED]` material has never been run; packets
> 008 and 009 are what run it. Where the corpus contradicts this repo (it predates the
> Inbox rename and assumes dashboard deploys), the packets carry the reconciliation —
> never edit this corpus to match.

## 10. Known issues and lessons

### Observed in Primer itself

1. **The Claude GitHub App and the chat GitHub connector are two independent grants.** Installing the App with all-repos access does not give the planning chat's connector private-repo visibility. The connector's OAuth token returned 404 on `primer` *and* on an older private repo, proving it had zero private-repo scope. A disconnect/reconnect was prescribed but never confirmed to work; the fallback was making the repo public (safe under the secret-discipline rule that nothing secret ever enters a repo). Still unresolved at the time of this corpus.
2. **The Supabase MCP connector authorizes against one organization at connect time.** Reconnecting re-selected the same org. Fix that worked: add a *second* custom connector using `https://mcp.supabase.com/mcp?project_ref=<PROJECT_REF>` — Claude rejects duplicate base URLs but accepts parameterized variants as distinct connectors; scope it per project; omit `read_only=true` for a dev project that needs migrations; approve the connector on its first call ("always allow"). Text Wall's own project would use the same pattern if it ever needs a second connector.
3. **Nothing was ever deployed, so no runtime, auth, or deploy bug was observed.** Everything in §5's "known bugs" is a prediction.

### Lessons from the sample run (format)

4. "The Story" drifted into history-of-the-science on a mechanism topic (mRNA) → split into **Story** (how it came to be) and **How It Works** (how it operates), with the menu call forbidden from offering both under blurred labels.
5. Curious-mode expansion offers were doing double duty (table of contents *and* follow-ups) → decided: a chip generates a **mini-primer card appended to the carousel**, never a whole-primer upgrade.
6. The research-mode Debates section "is where fairness lives or dies" — naming who holds each view and what they'd cite is the behavior locked hardest into the prompt.
7. The free-form "Reference" block varied by topic and was the least consistent part → split into three reference-class cards (Timeline, Key Players & Terms, Key Numbers), each with a locked format.

### Tried and dropped

8. Explicit "How familiar are you?" question → replaced by parsing the brain dump (spec §7.4 keeps a chip as the fallback if informed users get over-explained to).
9. Explicit "What's this for?" question and a separate read-time concept → collapsed into depth-by-selection-count.
10. Section order flexing by purpose → rejected; fixed order is the product.
11. Visual elements → deferred; text-only until the loop is proven.

### Inherited Supabase lessons (from the ads-agent process handoff; they apply directly to Text Wall)

12. `CREATE TABLE IF NOT EXISTS` is a silent no-op when the table exists — a column added inside it does nothing. Follow every CREATE with explicit `ALTER TABLE … ADD COLUMN IF NOT EXISTS` guards (the §4 migration does).
13. Include `NOTIFY pgrst, 'reload schema';` in every DDL migration or the REST layer keeps serving the old schema.
14. Always read back after a migration rather than trusting the return value.
15. Apply DDL before merging code that expects it; a missing column is a confusing runtime failure, not a clean one.
16. Never run UI-driving or automated verification against the production database — it issues real writes. Text Wall has one project; if automated verification is ever added, stand up a second project first.
17. RLS is the auth boundary when the anon key is in the client (it is, in any browser app). Policies before the first real row.
18. Supabase queries written with RLS off can fail *silently* once policies are on — returning empty rather than erroring. Verify inserts land as the intended user, not just that the call returned 200.

### Process lessons worth keeping even without the executor pipe

19. A unit works when **observed behavior in the running system matches the prediction** — predict → fire → verify. Not when a function returns the right value, not when an agent says it's done.
20. When something "didn't work," suspect caching and stale assets before logic. On Cloudflare-hosted static assets this means: confirm the uploaded file is the one being served (hard refresh, check a version string) before debugging JS.
21. Verify the teardown path (delete a primer → its cards are gone), not just the apply path.

---

## 11. Migration recommendation

### What ports as-is

- **Card Library Specification v0.1** (Appendix A) — verbatim, into Text Wall's project knowledge. It is the product.
- **The five sample primers** (Appendix B) — as evaluation fixtures. After the pipeline works, regenerate these five topics in the same modes and compare card-by-card; that's the regression check for the format.
- **The design decisions** in §1, §2 and §9 — depth by selection count, mandatory Debates, chips append rather than regenerate, fixed order, edge functions as the only path to the Anthropic key.
- **Ownership convention** — the proposed schema is already in Text Wall's `owner` / `auth.uid()` shape.

### What needs building (there is nothing to rewrite)

Everything executable: the §4 migration, the two §5 functions, the §9 UI, and the capture hook. All proposed, none run.

### Sequencing

1. **Schema.** Paste the §4 migration into the dashboard SQL editor on `qaabxgldjluqyccwhjzf`. Run the read-back queries. Check for an existing `updated_at` helper first and dedupe. Decide the `messages.id` type and add the optional FK or don't.
2. **Secret + `primer-menu`.** Confirm `ANTHROPIC_API_KEY` exists in Edge Function secrets (it likely does for Text Wall's Haiku parsing; confirm the name). Create `primer-menu` in the dashboard, paste §5, deploy with Verify JWT on. Test from the browser console with a signed-in session: insert a `primers` row, invoke, read `primers.menu` back. Predict → fire → verify: you should see 3–5 options with topic-adapted labels and `status = 'menu_ready'`.
3. **`primer-card`, overview only.** Deploy, insert an `overview` row, invoke. Verify the JSON shape, the word count, and (curious mode) the debates chip. Then a full conversation-mode primer on "The 2008 financial crisis" — compare to sample 4.
4. **UI.** Upload `research.html` + `research.js` with Text Wall's assets, wire the segment's navigation, replace `alert()`s. Verify on a phone: swipe, chip tap, retry, resume after closing the tab.
5. **Capture hook.** Add `research` to Text Wall's Haiku classifier and route it to `createPrimer`. Decide the `kind` value first (§12).
6. **Research mode + Further Reading verification.** Run "Nuclear energy's role in climate policy" in research mode; compare to sample 5; click every Further Reading URL. Tune `SEARCH_BUDGET` from the token/search counts stored on each card.
7. **Regression fixtures.** All five sample topics, same modes. Keep the outputs.
8. **Retire Primer.** Delete Supabase project `dihrtmwbaycmilvcvcom` (empty; nothing to export — no `pg_dump`, no CSV). Archive or delete `NewOrbitDigital/primer` after saving its README and the workflow file if you want them. Remove the Playground-scoped Supabase connector from the Primer project.

### Data export

None required. Every table count is zero and there are no users. If a snapshot is wanted for the record, the dashboard's "Database → Backups" is sufficient; a `pg_dump` of an empty schema has no value.

### Naming collisions and conflicts with Text Wall

| Item | Collision risk | Resolution |
|---|---|---|
| Table names `primers`, `primer_cards` | None with `messages`, `todo_tags`, `grocery_prefs` | Keep |
| `messages.kind` | Needs a new value. `research` reads best in the segment's own vocabulary; `primer` is the feature name | Pick one; use it in the classifier, the hook, and any `kind` check constraint that may exist on `messages` |
| `public.primer_set_updated_at()` | Text Wall may have a generic `set_updated_at()` | Reuse Text Wall's; delete the block from the migration |
| Edge function names | Unknown existing names | The `primer-` prefix avoids accidental overlap |
| Column name `owner` | Same convention | No change |
| `ANTHROPIC_API_KEY` | Likely already set for Text Wall's Haiku calls | Reuse; confirm the exact secret name in the dashboard |
| Anthropic org rate limits | Shared with Text Wall's parsing calls | Negligible at single-user volume |
| The `messages` row vs. the `primers` row | A research capture would exist twice (as a message and as a primer) | Accept: the message is the capture record, the primer is the derived object. Link via `message_id` if the FK is added |

### Model mismatch, restated

Text Wall runs Haiku for classification. Primer's menu call belongs on Haiku; its cards do not. The decision taken for this corpus is Haiku for the menu, **Sonnet 5 with web search for cards**. If cost matters more than fidelity for a first pass, the only sane downgrade is Sonnet without web search on non-numeric cards (keep search on Key Numbers, Debates, Further Reading) — not Haiku for cards.

---

## 12. Open questions

Decisions the Text Wall project has to make; none can be answered from Primer.

1. **`messages.id` type** (uuid vs bigint) — gates the optional FK in §4.
2. **`kind` value** for research captures: `research` or `primer`.
3. **Where the brain dump comes from in a capture** — first line = topic, rest = dump (proposed), or a dedicated New primer screen only, or both.
4. **Should a primer outlive its capture?** Proposed: yes (`on delete set null`). Alternative: cascade.
5. **Which Haiku ID Text Wall currently uses**, and whether the Anthropic key is in the same org as the menu/card calls will bill to.
6. **The exact name of Text Wall's Anthropic secret** in Edge Function secrets.
7. **Edge-function wall-clock limit** on the personal org's plan — sets the ceiling on `SEARCH_BUDGET` and `CALL_TIMEOUT_MS`.
8. **Web search tool version** supported by `claude-sonnet-5` (`web_search_20250305` vs `web_search_20260209`).
9. **Sonnet 5 effort level** for card generation (default high; test medium for cost).
10. **Check Yourself reveal policy** — answers on tap (proposed, via `<details>`) vs never shown (spec §7.3 says retention science mildly favors forcing retrieval; UX may disagree).
11. **Check Yourself in Conversation mode** — spec says optional toggle; proposed: research-only for v1.
12. **Chip taxonomy** (spec §7.2) — all non-Debates chips become Overview-shaped mini-primers (proposed) vs mapping chips to real card types (a "timeline" chip generating a real Timeline card at slot 4). The proposed code already does the latter for `debates` only.
13. **Card-length enforcement** (spec §7.5) — targets in the prompt only (proposed) vs validate word counts and retry on gross violations.
14. **Familiarity estimate** — keep as a stored field with no UI (proposed) until over-explaining is observed.
15. **CORS origin** for the functions — `*` in the proposal; tighten to Text Wall's Cloudflare origin.
16. **Whether to keep the `NewOrbitDigital/primer` repo** and what's in it — unverified from the Primer side; the builder can answer in one sentence.
17. **Realtime vs polling** for card updates — the skeleton relies on each call returning its card and on resume-on-open; if Text Wall already uses Supabase Realtime, subscribing to `primer_cards` is the better UX for a tab left open.
18. **Cost ceiling per primer** — the §6 estimate is $0.25–0.60 for research mode; decide whether that's fine for a personal tool or whether `SEARCH_BUDGET` should start lower.

---
