# Inbox

Personal productivity app — to-do (Eisenhower + swimlanes), grocery, research (Primer), notes.
Plain HTML/JS with no build step, served by a Cloudflare Worker; Supabase Postgres + Deno
edge functions; Anthropic API for grocery parsing and Primer briefs.

- `SPEC.md` — the living product spec and decisions log
- `docs/packets/INDEX.md` — the build-packet queue and session-wide rules
- `docs/always.md` / `docs/current.md` / `docs/backlog.md` — stable context · volatile state · standing work
- `CLAUDE.md` — executor working notes
- `web/` deploys verbatim; `supabase/` mirrors what is live (the database is the source of truth)
