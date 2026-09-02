-- 0004 live_wall_retirement — Prep-2, part 1 of 2.
-- APPLIED 2026-09-02 via the Supabase Inbox connector (version 20260902000812)
-- and certified by readback. Mirror copy; CI never applies migrations.
--
-- Ruled 2026-08-31 (SPEC D-26): the live audience wall is cut entirely. This is the
-- database half. The repo half — deleting archive/live-wall/ and PUBLIC_HOST — is
-- packet 003 U-C. The old textwall Worker is Justin's to delete.
--
-- Counts shown to Justin before firing: messages 216 total, 2 with owner is null
-- (both session='test', body 'test', captured 2026-08-01 — wall smoke tests).
-- Certified after: owner is null = 0, messages = 214, policies on public.messages = 1
-- ("owner full access"), todo_tags 8 and grocery_prefs 14 unchanged.
--
-- The `session` column stays (NOT NULL, legacy-required). Primer tables (corpus §4)
-- are NOT in this migration — the corpus was unavailable in the 2026-09-02 session.

drop policy if exists "anon posts to public sessions"       on public.messages;
drop policy if exists "anon reads public sessions"          on public.messages;
drop policy if exists "signed-in reads public sessions"     on public.messages;
drop policy if exists "signed-in moderates public sessions" on public.messages;
drop policy if exists "signed-in deletes public sessions"   on public.messages;

delete from public.messages where owner is null;

notify pgrst, 'reload schema';
