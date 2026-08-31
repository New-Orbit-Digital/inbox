-- 0003 health_support — read-only helper for the health edge function (packet 001, U001-B).
-- APPLIED 2026-08-31 via the Supabase Inbox connector (version 20260831020016) and certified
-- by readback. Mirror copy; CI never applies migrations.
-- PostgREST does not expose the supabase_migrations schema, so a SECURITY DEFINER
-- function returns the newest migration versions. Executable by service_role only.
create or replace function public.migration_versions(p_limit integer default 5)
returns table(version text, name text)
language sql
security definer
set search_path = public
as $$
  select version::text, name
  from supabase_migrations.schema_migrations
  order by version desc
  limit p_limit
$$;

revoke all on function public.migration_versions(integer) from public;
revoke all on function public.migration_versions(integer) from anon;
revoke all on function public.migration_versions(integer) from authenticated;
grant execute on function public.migration_versions(integer) to service_role;

notify pgrst, 'reload schema';
