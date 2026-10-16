-- rls_auto_enable() is the event-trigger function that turns on RLS for every
-- new table in public. It only runs as part of CREATE TABLE (event triggers
-- don't check EXECUTE), so nobody needs to call it through the API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
