-- Phase 1, slice 2: lessons. One row per learner per completed lesson.
-- Re-doing a lesson overwrites the score; completed_at keeps the first finish.
create table public.lesson_progress (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  checks_correct  smallint not null default 0 check (checks_correct >= 0),
  checks_total    smallint not null default 0 check (checks_total >= 0),
  completed_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create trigger lesson_progress_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at();

revoke all on public.lesson_progress from anon;

alter table public.lesson_progress enable row level security;

create policy lesson_progress_owner on public.lesson_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
