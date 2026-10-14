-- Mock tests in exam format and graded reading passages.

-- Exam part label ("問題1 漢字読み · Kanji reading") and, for reading
-- comprehension practice, the text a question belongs to.
alter table public.questions add column part text;
alter table public.questions add column text_slug text references public.texts (slug) on update cascade on delete set null;
create index questions_text_idx on public.questions (text_slug, position);

-- One finished mock test: answers, per-section results and predicted scores.
create table public.mock_attempts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mock_test_id  uuid not null references public.mock_tests (id) on delete cascade,
  answers       jsonb not null default '{}'::jsonb,
  result        jsonb not null default '{}'::jsonb,
  correct       integer not null check (correct >= 0),
  total         integer not null check (total >= 0 and correct <= total),
  passed        boolean not null,
  started_at    timestamptz,
  finished_at   timestamptz not null default now()
);
create index mock_attempts_user_idx on public.mock_attempts (user_id, finished_at desc);

revoke all on public.mock_attempts from anon;
alter table public.mock_attempts enable row level security;
create policy mock_attempts_owner on public.mock_attempts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Best result on each reading passage.
create table public.text_progress (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text_id       uuid not null references public.texts (id) on delete cascade,
  best_score    integer not null check (best_score >= 0),
  max_score     integer not null check (max_score >= 0 and best_score <= max_score),
  attempts      integer not null default 1 check (attempts >= 1),
  completed_at  timestamptz not null default now(),
  primary key (user_id, text_id)
);

revoke all on public.text_progress from anon;
alter table public.text_progress enable row level security;
create policy text_progress_owner on public.text_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
