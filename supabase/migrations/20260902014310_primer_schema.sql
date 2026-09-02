-- 0005 primer_schema — Prep-2 part 2.
-- APPLIED 2026-09-02 via the Supabase Inbox connector (version 20260902014310)
-- and certified by readback: primers 14 columns + primer_cards 18 = 32 columns,
-- 8 policies, 2 triggers, 6 indexes, RLS true on both tables, primers_message_fk
-- present. Those are exactly the numbers the corpus's rolled-back-transaction
-- validation predicted (§4: "8 policies, 32 columns, 2 triggers and 6 indexes").
-- Mirror copy; CI never applies migrations.
--
-- Source: the Primer corpus §4 [PROPOSED] block, now at docs/primer/02_data_model.md.
-- Three project-specific decisions were taken when firing it, and only these three
-- differ from the corpus text:
--   1. This project has NO existing updated_at helper (pg_proc has nothing matching
--      '%updated_at%'), so the corpus's primer_set_updated_at() is kept as written.
--   2. public.messages.id is uuid (confirmed), so the corpus's OPTIONAL message_id
--      foreign key IS added, on delete set null — SPEC D-21, primers outlive their
--      capture. Wrapped in a name guard so the migration stays idempotent.
--   3. verify_jwt for the two edge functions lives in supabase/config.toml on this
--      project, not in the dashboard. That is packet 008's job, not this migration's.

-- ============================================================
-- Primer (Research segment) — schema v1  [PROPOSED — validated in a rolled-back transaction on an empty Postgres 2026-08-29; never run on Text Wall]
-- Target: Text Wall Supabase project qaabxgldjluqyccwhjzf
-- ============================================================

-- updated_at helper. Checked 2026-09-02: this project has none, so it is kept.
create or replace function public.primer_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- primers: one row per requested primer
-- ------------------------------------------------------------
create table if not exists public.primers (
  id                   uuid        primary key default gen_random_uuid(),
  owner                uuid        not null default auth.uid()
                                   references auth.users (id) on delete cascade,
  message_id           uuid,       -- originating Inbox capture; FK added below (messages.id is uuid).
  topic                text        not null,
  brain_dump           text,       -- Card 0. Source of truth for prompts; rendered as a virtual card.
  topic_type           text        check (topic_type in
                                     ('historical','mechanism','cultural','economic',
                                      'contested-policy','biographical','mixed')),
  depth_mode           text        not null default 'curious'
                                   check (depth_mode in ('curious','conversation','research')),
  familiarity_estimate text        check (familiarity_estimate in ('none','partial','informed')),
  menu                 jsonb,      -- full menu-call output (Appendix A §6 schema)
  selections           text[]      not null default '{}',  -- card_types the user selected
  status               text        not null default 'new'
                                   check (status in ('new','menu_pending','menu_ready',
                                                     'generating','ready','error')),
  error                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Column guards (CREATE TABLE IF NOT EXISTS is a silent no-op on re-run; these are not)
alter table public.primers add column if not exists message_id uuid;
alter table public.primers add column if not exists menu jsonb;
alter table public.primers add column if not exists selections text[] not null default '{}';
alter table public.primers add column if not exists error text;

create index if not exists primers_owner_created_idx
  on public.primers (owner, created_at desc);
create index if not exists primers_message_idx
  on public.primers (message_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'primers_message_fk') then
    alter table public.primers
      add constraint primers_message_fk
      foreign key (message_id) references public.messages (id) on delete set null;
  end if;
end $$;

drop trigger if exists primers_set_updated_at on public.primers;
create trigger primers_set_updated_at
  before update on public.primers
  for each row execute function public.primer_set_updated_at();

-- ------------------------------------------------------------
-- primer_cards: one row per card in a primer's carousel
-- ------------------------------------------------------------
create table if not exists public.primer_cards (
  id              uuid        primary key default gen_random_uuid(),
  owner           uuid        not null default auth.uid()
                              references auth.users (id) on delete cascade,
  primer_id       uuid        not null references public.primers (id) on delete cascade,
  card_type       text        not null check (card_type in
                                ('overview','story','how_it_works','timeline','key_players',
                                 'key_numbers','debates','check_yourself','further_reading',
                                 'mini_primer')),
  position        smallint    not null check (position between 1 and 9),  -- canonical slot, see table below
  label           text,       -- topic-adapted label from the menu call; chip text for mini_primer
  parent_card_id  uuid        references public.primer_cards (id) on delete set null, -- mini_primer: the card whose chip spawned it
  chip_text       text,       -- mini_primer: the chip that was tapped
  body            jsonb       not null default '{}'::jsonb,  -- card-type-specific content, schemas in §6
  chips           jsonb,      -- expansion chips offered on this card (overview in curious mode; mini_primer)
  status          text        not null default 'pending'
                              check (status in ('pending','generating','ready','error')),
  model           text,
  input_tokens    integer,
  output_tokens   integer,
  web_searches    integer,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.primer_cards add column if not exists parent_card_id uuid references public.primer_cards (id) on delete set null;
alter table public.primer_cards add column if not exists chip_text text;
alter table public.primer_cards add column if not exists chips jsonb;
alter table public.primer_cards add column if not exists model text;
alter table public.primer_cards add column if not exists input_tokens integer;
alter table public.primer_cards add column if not exists output_tokens integer;
alter table public.primer_cards add column if not exists web_searches integer;
alter table public.primer_cards add column if not exists error text;

-- Carousel read order
create index if not exists primer_cards_primer_position_idx
  on public.primer_cards (primer_id, position, created_at);

-- At most one of each fixed card type per primer (mini-primers can repeat a slot)
create unique index if not exists primer_cards_one_fixed_card_per_type
  on public.primer_cards (primer_id, card_type)
  where card_type <> 'mini_primer';

drop trigger if exists primer_cards_set_updated_at on public.primer_cards;
create trigger primer_cards_set_updated_at
  before update on public.primer_cards
  for each row execute function public.primer_set_updated_at();

-- ------------------------------------------------------------
-- Row-level security: owner-only on both tables
-- ------------------------------------------------------------
alter table public.primers      enable row level security;
alter table public.primer_cards enable row level security;

drop policy if exists "primers_owner_select" on public.primers;
drop policy if exists "primers_owner_insert" on public.primers;
drop policy if exists "primers_owner_update" on public.primers;
drop policy if exists "primers_owner_delete" on public.primers;

create policy "primers_owner_select" on public.primers
  for select to authenticated using (owner = auth.uid());
create policy "primers_owner_insert" on public.primers
  for insert to authenticated with check (owner = auth.uid());
create policy "primers_owner_update" on public.primers
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "primers_owner_delete" on public.primers
  for delete to authenticated using (owner = auth.uid());

drop policy if exists "primer_cards_owner_select" on public.primer_cards;
drop policy if exists "primer_cards_owner_insert" on public.primer_cards;
drop policy if exists "primer_cards_owner_update" on public.primer_cards;
drop policy if exists "primer_cards_owner_delete" on public.primer_cards;

create policy "primer_cards_owner_select" on public.primer_cards
  for select to authenticated using (owner = auth.uid());
create policy "primer_cards_owner_insert" on public.primer_cards
  for insert to authenticated with check (owner = auth.uid());
create policy "primer_cards_owner_update" on public.primer_cards
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "primer_cards_owner_delete" on public.primer_cards
  for delete to authenticated using (owner = auth.uid());

-- Anonymous role gets nothing (Text Wall is auth-only)
revoke all on public.primers      from anon;
revoke all on public.primer_cards from anon;

-- PostgREST must reload or it keeps serving the old schema
notify pgrst, 'reload schema';
