-- 0006 primer_realtime — Prep-2 part 2b.
-- APPLIED 2026-09-02 via the Supabase Inbox connector (version 20260902020131)
-- and certified by readback: supabase_realtime now publishes
-- messages, primer_cards, primers. Mirror copy; CI never applies migrations.
--
-- Found while adversarially reviewing packet 009 before it was flipped READY: the
-- supabase_realtime publication contained ONLY public.messages. That membership was
-- enabled out-of-band through the dashboard, which is why no migration mentions it —
-- `grep -rn "publication" supabase/migrations/` returned nothing across all five
-- earlier files. Packet 009 subscribes to postgres_changes on public.primer_cards so
-- cards stream into the carousel as they finish; without publication membership that
-- subscription attaches and silently delivers nothing, and the packet's own Justin
-- check ("leave the tab open and confirm cards fill in without a refresh") would fail
-- with no diagnosis path. Enabling it is DDL, so it is prep work, not packet work.
--
-- Replica identity is left at the default (primary key), matching public.messages:
-- packet 009 reads only the new record on INSERT and UPDATE.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'primer_cards'
  ) then
    alter publication supabase_realtime add table public.primer_cards;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'primers'
  ) then
    alter publication supabase_realtime add table public.primers;
  end if;
end $$;
