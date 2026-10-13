-- Streaks and "new cards today" are counted in the learner's local day.
alter table public.profiles
  add column timezone text not null default 'Asia/Kuala_Lumpur'
  check (timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$');

grant update (timezone) on public.profiles to authenticated;
