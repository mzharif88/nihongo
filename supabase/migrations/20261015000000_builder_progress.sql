-- Sentence builder: the learner's best run on each pattern.
create table public.builder_progress (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern_id    uuid not null references public.sentence_patterns (id) on delete cascade,
  best_score    integer not null check (best_score >= 0),
  max_score     integer not null check (max_score >= 0 and best_score <= max_score),
  attempts      integer not null default 1 check (attempts >= 1),
  completed_at  timestamptz not null default now(),
  primary key (user_id, pattern_id)
);

revoke all on public.builder_progress from anon;
alter table public.builder_progress enable row level security;

create policy builder_progress_owner on public.builder_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Order patterns in the builder list (easiest first).
alter table public.sentence_patterns add column position integer check (position >= 0);
