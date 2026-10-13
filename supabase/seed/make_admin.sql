-- Run once in the Supabase SQL editor after creating your user in
-- Authentication → Users. Replace the email with the admin account's email.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');

-- Check: should return one row with role = admin.
select p.id, u.email, p.role
from public.profiles p join auth.users u on u.id = p.id;
