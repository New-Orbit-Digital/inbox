-- ============================================================
-- 20260804000000_baseline — RECORD ONLY.
-- Reconstructed 2026-08-30 from the live database (information_schema,
-- pg_constraint, pg_policies, information_schema.triggers) via the
-- Supabase Inbox connector. The DATABASE is the source of truth; this
-- file is the review surface. CI never applies migrations; DDL is fired
-- in prep sessions through the connector and mirrored here.
-- The webhook trigger's secret header is a placeholder — the real value
-- lives only in the live trigger definition and the function's secrets.
-- ============================================================

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  session          text not null,
  body             text not null,
  owner            uuid references auth.users (id) on delete cascade,
  bucket           text,
  status           text not null default 'open',
  created_at       timestamptz not null default now(),
  confidence       numeric,
  auto             boolean not null default false,
  event_start      timestamptz,
  event_end        timestamptz,
  grocery_category text,
  due_date         date,
  tag              text,
  all_day          boolean not null default false,
  recur            text,
  constraint messages_body_check   check (char_length(body) >= 1 and char_length(body) <= 280),
  constraint messages_bucket_check check (bucket = any (array['todo','grocery','research','note','event'])),
  constraint messages_status_check check (status = any (array['open','done','hidden']))
);

create index if not exists messages_owner_status_idx  on public.messages (owner, status);
create index if not exists messages_session_time_idx  on public.messages (session, created_at desc);

create table if not exists public.todo_tags (
  owner       uuid not null references auth.users (id) on delete cascade,
  tag         text not null,
  description text,           -- used by the retired AI auto-tagger; kept, unused
  created_at  timestamptz not null default now(),
  primary key (owner, tag)
);

create table if not exists public.grocery_prefs (
  owner      uuid not null references auth.users (id) on delete cascade,
  item       text not null,
  category   text not null,
  updated_at timestamptz not null default now(),
  primary key (owner, item)
);

alter table public.messages      enable row level security;
alter table public.todo_tags     enable row level security;
alter table public.grocery_prefs enable row level security;

-- Owner-scoped access (the app).
create policy "owner full access"   on public.messages      for all    to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "owner tags"          on public.todo_tags     for all    to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "owner grocery prefs" on public.grocery_prefs for all    to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Live-wall policies (audience pages, retired 2026-08 — slated for removal; see backlog).
create policy "anon posts to public sessions"      on public.messages for insert to anon          with check (owner is null and status = 'open' and bucket is null);
create policy "anon reads public sessions"         on public.messages for select to anon          using (owner is null);
create policy "signed-in reads public sessions"    on public.messages for select to authenticated using (owner is null);
create policy "signed-in moderates public sessions" on public.messages for update to authenticated using (owner is null) with check (owner is null);
create policy "signed-in deletes public sessions"  on public.messages for delete to authenticated using (owner is null);

-- Database webhook: every insert calls the classify edge function.
-- Retired in packet 004 (capture switches to a direct call).
create trigger "classify-on-insert"
  after insert on public.messages
  for each row
  execute function supabase_functions.http_request(
    'https://qaabxgldjluqyccwhjzf.supabase.co/functions/v1/classify',
    'POST',
    '{"Content-type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>","apikey":"<SUPABASE_PUBLISHABLE_KEY>"}',
    '{}',
    '10000'
  );
