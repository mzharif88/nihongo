-- Which lessons the learner has finished, and how they did on the quick checks.
create table public.lesson_progress (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  score         integer not null check (score >= 0),
  max_score     integer not null check (max_score >= 0 and score <= max_score),
  attempts      integer not null default 1 check (attempts >= 1),
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

revoke all on public.lesson_progress from anon;
alter table public.lesson_progress enable row level security;

create policy lesson_progress_owner on public.lesson_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
