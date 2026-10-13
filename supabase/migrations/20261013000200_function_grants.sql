-- Postgres grants EXECUTE on new functions to PUBLIC, so revoking from anon
-- alone (as the init migration did) left these callable without signing in.
-- handle_new_user only runs as the auth.users trigger; is_admin is needed by
-- signed-in users because RLS policies call it as the requesting role.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
