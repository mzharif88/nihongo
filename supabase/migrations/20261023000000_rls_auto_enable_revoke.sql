-- rls_auto_enable() is the event-trigger function that turns on RLS for every
-- new table in public. It only runs as part of CREATE TABLE (event triggers
-- don't check EXECUTE), so nobody needs to call it through the API. It was
-- set up in the Supabase project outside these migrations, so skip where it
-- doesn't exist (local test databases).
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
