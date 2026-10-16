-- Newcomer pre-input listening: which graded scenes a learner has heard,
-- how often, and whether they caught the gist on the first listen.
create table public.newcomer_listening (
  user_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  scene_slug    text not null,
  plays         integer not null default 0,
  gist_correct  boolean,
  last_at       timestamptz not null default now(),
  primary key (user_id, scene_slug)
);

alter table public.newcomer_listening enable row level security;
create policy newcomer_listening_own on public.newcomer_listening for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.newcomer_listening to authenticated;
