> **Provenance.** This file is one part of the *Primer → Text Wall Migration Corpus*,
> prepared 2026-08-29 and handed to the Inbox project on 2026-09-02. It was split into
> `docs/primer/*.md` on arrival so each part is small enough to review; **the text of every
> part is verbatim and unedited.** Provenance tags inside — `[VERBATIM]`, `[DESIGN]`,
> `[PROPOSED]`, `[UNVERIFIED]` — are the corpus's own and are defined in
> [00_read_first.md](00_read_first.md). `[PROPOSED]` material has never been run; packets
> 008 and 009 are what run it. Where the corpus contradicts this repo (it predates the
> Inbox rename and assumes dashboard deploys), the packets carry the reconciliation —
> never edit this corpus to match.

## 3. Architecture

### As-is `[DESIGN]` `[UNVERIFIED]`

**Stack as designed (never implemented):**

- **Client:** Expo (React Native), Android first. Card carousel UI. ⚠ MISMATCH with Text Wall's plain HTML/JS — nothing here ports; §9 proposes the replacement.
- **Backend:** Supabase — Postgres for storage, **Edge Functions for every LLM call** so no Anthropic key ships in the app bundle. (This decision carries over unchanged and is the right shape for Text Wall too.)
- **LLM:** Anthropic API. Menu call on a fast, cheap model; card generation on a stronger model with web search.
- **Code pipeline:** GitHub repo + Claude Code GitHub Action triggered by `@claude` mentions on issues/PRs; branch protection on `main`; builder merges. ⚠ MISMATCH with Text Wall's dashboard/uploader deploys — not carried over.
- **Builds:** EAS (Expo Application Services) — deferred; never set up.

**Hosting:** nothing deployed anywhere.

**Where the code lives:**

- Repo: `https://github.com/NewOrbitDigital/primer` — private, under the NewOrbitDigital *personal* account (not the New-Orbit-Digital org). The planning chat's GitHub connector cannot read it (404 — its OAuth grant has no private-repo scope), so the contents below are inferred from the standup guide the builder was working through, not observed.
- Local folder: none. The builder works without a terminal.

**File list `[UNVERIFIED]`** — what the standup guide instructed, in the order it would have landed:

| File | Purpose | Likely present? |
|---|---|---|
| `README.md` | Repo default | Yes (created with the repo) |
| `.github/workflows/claude.yml` | Runs the Claude Code Action on `@claude` mentions; references `${{ secrets.ANTHROPIC_API_KEY }}` | Possibly — Step 3 of the standup guide; never verified from the planning chat |
| `docs/always.md`, `docs/current.md`, `docs/backlog.md`, `CHANGELOG.md`, `CLAUDE.md` | Doc scaffold from the process handoff | No — the issue that would have created them was never filed |
| Any app source (`app.json`, `App.tsx`, …) | Expo app shell | No — the first unit ("app shell renders a hard-coded primer as a card carousel") was confirmed as the first unit but never briefed |

**Build/deploy steps:** none established. The process handoff's "decide before the first unit" items (verification surface, build trigger, update channels, Supabase access shape, RLS plan) were never decided.

**Env vars / secrets, by name only:**

| Name | Where it was meant to live | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` | GitHub Actions repo secret (for the Claude Code Action); later a Supabase Edge Function secret | Actions secret: builder-reported as added in the standup, `[UNVERIFIED]`. Edge Function secret: never set (no functions exist) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Expo app config | Never set |

No other secrets were ever named.

### Proposed architecture for Text Wall `[PROPOSED]`

```
Browser — Text Wall (plain HTML/JS, Cloudflare Workers static assets)
│
├─ supabase-js v2 (user's session JWT from password auth)
│    ├─ PostgREST  →  public.primers, public.primer_cards   (RLS: owner = auth.uid())
│    └─ functions.invoke()
│          ├─ primer-menu   (Deno)  → Anthropic Messages API, claude-haiku-4-5-20251001
│          └─ primer-card   (Deno)  → Anthropic Messages API, claude-sonnet-5 (+ web search tool)
│                 both read/write the tables *as the user* (forwarded JWT → RLS applies)
│
└─ Text Wall's existing capture flow: a capture classified kind='research' creates a primers row
```

Design rules carried over from Primer: the Anthropic key lives only in edge-function secrets; the client never calls Anthropic directly; every LLM call is scoped by the caller's JWT so ownership is automatic; card generation is per-card so the carousel can fill in progressively and a single failed card can be retried alone.

**Deployment shape for Text Wall's constraints:** two edge functions, each a single `index.ts` with no shared imports (so they can be pasted into the Supabase dashboard's function editor). One migration, pasted into the dashboard SQL editor. One HTML file plus one JS file uploaded with Text Wall's assets.

---
