> **Provenance.** This file is one part of the *Primer → Text Wall Migration Corpus*,
> prepared 2026-08-29 and handed to the Inbox project on 2026-09-02. It was split into
> `docs/primer/*.md` on arrival so each part is small enough to review; **the text of every
> part is verbatim and unedited.** Provenance tags inside — `[VERBATIM]`, `[DESIGN]`,
> `[PROPOSED]`, `[UNVERIFIED]` — are the corpus's own and are defined in
> [00_read_first.md](00_read_first.md). `[PROPOSED]` material has never been run; packets
> 008 and 009 are what run it. Where the corpus contradicts this repo (it predates the
> Inbox rename and assumes dashboard deploys), the packets carry the reconciliation —
> never edit this corpus to match.

## 4. Data model

### As-is (verified 2026-08-29)

Primer's Supabase project — **ref `dihrtmwbaycmilvcvcom`**, org **Playground** (free tier), API URL `https://dihrtmwbaycmilvcvcom.supabase.co` — contains nothing user-created:

```
public tables ............ 0
views / matviews ......... 0
RLS policies (public) .... 0
functions (public) ....... 0
triggers (public) ........ 0
edge functions ........... 0
migrations ............... 0   (supabase_migrations schema does not exist)
auth.users ............... 0
storage.buckets .......... 0
extensions ............... plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault (defaults)
```

There is no DDL, no RLS, no trigger, no view, no SQL function, and no data. **Nothing to migrate; the project can be deleted after the merge.**

### Proposed schema for Text Wall `[PROPOSED]`

Two tables. `primers` is one requested primer (topic, dump, menu result, depth mode, status); `primer_cards` is one row per card in that primer's carousel, including mini-primers spawned by chips. Both carry Text Wall's `owner` column with `default auth.uid()` so client inserts and JWT-scoped edge-function inserts need not set it.

Migration, complete, for the dashboard SQL editor. Every statement is idempotent-guarded per the lessons in §10. It was executed end-to-end inside a rolled-back transaction on an empty Postgres on 2026-08-29 and produced 8 policies, 32 columns, 2 triggers and 6 indexes without error — so it is syntactically and semantically valid against a stock Supabase database, but it has never touched Text Wall's project.

```sql
-- ============================================================
-- Primer (Research segment) — schema v1  [PROPOSED — validated in a rolled-back transaction on an empty Postgres 2026-08-29; never run on Text Wall]
-- Target: Text Wall Supabase project qaabxgldjluqyccwhjzf
-- ============================================================

-- updated_at helper. Text Wall may already have one — check
--   select proname from pg_proc where proname like '%updated_at%';
-- and if it does, delete this block and reference the existing function
-- in the trigger statements below.
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
  message_id           uuid,       -- originating Text Wall capture (public.messages). No FK yet: see §4 note.
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
```

**Read-back to run immediately after** (never trust the migration's return value):

```sql
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('primers','primer_cards')
order by table_name, ordinal_position;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('primers','primer_cards')
order by 1, 2;

select relname, relrowsecurity from pg_class
where relname in ('primers','primer_cards');   -- both must be true
```

**Optional: link primers to Text Wall captures.** The migration request doesn't state the type of `messages.id`. Add the foreign key only once that's confirmed:

```sql
-- If messages.id is uuid:
alter table public.primers
  add constraint primers_message_fk
  foreign key (message_id) references public.messages (id) on delete set null;

-- If messages.id is bigint/serial instead, change the column first:
-- alter table public.primers drop column message_id;
-- alter table public.primers add column message_id bigint references public.messages (id) on delete set null;
-- create index if not exists primers_message_idx on public.primers (message_id);
```

### Plain-English description and relationships

- **`primers`** — one row per primer the user asked for. Holds the topic, the brain dump (Card 0's text), the menu-call output (`menu` jsonb, so the options can be re-shown without another Haiku call), the user's selections, the inferred `depth_mode`, and a status that walks `new → menu_pending → menu_ready → generating → ready` (or `error`). `message_id` optionally points at the Text Wall capture that created it.
- **`primer_cards`** — one row per card in that primer's carousel. `card_type` + `position` give the fixed order; `body` holds the card's structured content (per-type JSON in §6); `chips` holds expansion chips; `status` lets the UI render skeletons and retry failures per card; token/search counts make cost visible per card. A `mini_primer` row records which card and chip spawned it. Deleting a primer cascades to its cards; deleting a user cascades to everything.
- The brain dump is **not** a `primer_cards` row: `primers.brain_dump` is the source of truth and the UI renders it as a virtual Card 0. That keeps "never edited by the app" trivially true.

**Canonical positions** (Appendix A §4), used for `primer_cards.position`:

| position | card_type | notes |
|---|---|---|
| (virtual 0) | brain_dump | rendered from `primers.brain_dump` |
| 1 | overview | always |
| 2 | story | selectable |
| 3 | how_it_works | selectable |
| 4 | timeline | selectable |
| 5 | key_players | selectable |
| 6 | key_numbers | selectable |
| 7 | debates | auto when ≥1 selected; chip in Curious |
| 8 | check_yourself | Research auto; Conversation optional |
| 9 | further_reading | auto when ≥1 selected |
| (inherits) | mini_primer | takes the position of its nearest card-type cousin (`card_type_hint` on the chip); falls back to 9 |

### Row counts and what's worth migrating

All zero. No table holds data worth migrating; the Playground project is disposable.

---
