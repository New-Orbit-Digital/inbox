-- 0002 quadrants_and_lanes — additive, idempotent.
-- APPLIED 2026-08-30 via the Supabase Inbox connector (version 20260830174400)
-- and certified by readback. Mirror copy; CI never applies migrations.
alter table public.messages add column if not exists important boolean;
alter table public.messages add column if not exists urgent boolean;

alter table public.todo_tags add column if not exists lane_order integer;
alter table public.todo_tags add column if not exists last_used_at timestamptz;

insert into public.todo_tags (owner, tag)
select distinct owner, tag from public.messages
where bucket = 'todo' and tag is not null and owner is not null
on conflict (owner, tag) do nothing;

update public.todo_tags t set lane_order = s.rn
from (select owner, tag, row_number() over (partition by owner order by tag) as rn
      from public.todo_tags) s
where t.owner = s.owner and t.tag = s.tag and t.lane_order is null;

update public.todo_tags t set last_used_at = s.last_used
from (select owner, tag, max(created_at) as last_used from public.messages
      where bucket = 'todo' and tag is not null group by owner, tag) s
where t.owner = s.owner and t.tag = s.tag and t.last_used_at is null;

create or replace function public.tag_touch(p_tag text)
returns void language plpgsql security invoker as $$
begin
  insert into public.todo_tags (owner, tag, last_used_at)
  values (auth.uid(), p_tag, now())
  on conflict (owner, tag) do update set last_used_at = now();
end $$;

create or replace function public.tag_rename(p_from text, p_to text)
returns text language plpgsql security invoker as $$
declare v_exists boolean;
begin
  if p_from = p_to then return 'noop'; end if;
  select exists (select 1 from public.todo_tags where owner = auth.uid() and tag = p_to) into v_exists;
  update public.messages set tag = p_to where owner = auth.uid() and tag = p_from;
  if v_exists then
    delete from public.todo_tags where owner = auth.uid() and tag = p_from;
    update public.todo_tags set last_used_at = now() where owner = auth.uid() and tag = p_to;
    return 'merged';
  end if;
  update public.todo_tags set tag = p_to where owner = auth.uid() and tag = p_from;
  return 'renamed';
end $$;

create or replace function public.tag_delete(p_tag text, p_reassign_to text default null)
returns void language plpgsql security invoker as $$
begin
  if p_reassign_to is not null then perform public.tag_touch(p_reassign_to); end if;
  update public.messages set tag = p_reassign_to where owner = auth.uid() and tag = p_tag;
  delete from public.todo_tags where owner = auth.uid() and tag = p_tag;
end $$;

revoke execute on function public.tag_touch(text) from anon;
revoke execute on function public.tag_rename(text, text) from anon;
revoke execute on function public.tag_delete(text, text) from anon;
grant execute on function public.tag_touch(text) to authenticated;
grant execute on function public.tag_rename(text, text) to authenticated;
grant execute on function public.tag_delete(text, text) to authenticated;

notify pgrst, 'reload schema';
