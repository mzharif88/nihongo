-- NihonGo! JLPT — Phase 0 schema
-- Two halves: a shared content bank (items, lessons, texts, mock tests, patterns)
-- and per-learner state (user_items, reviews, mistakes, gamification).
-- Row-level security on every table: learner tables are owner-only, content
-- tables are read-only (live rows) for learners and writable only by admins.

create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type public.jlpt_level as enum ('preN5', 'N5', 'N4', 'N3', 'N2', 'N1');
create type public.item_type as enum ('kana', 'radical', 'kanji', 'word', 'grammar', 'sentence');
create type public.content_status as enum ('draft', 'reviewed', 'live');
create type public.user_role as enum ('learner', 'admin');
create type public.study_goal as enum ('exam', 'conversation', 'both');
create type public.jlpt_section as enum ('vocabulary', 'grammar', 'reading', 'listening');
create type public.review_source as enum ('srs', 'lesson', 'builder', 'mock', 'reader', 'speaking');

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Profiles ───────────────────────────────────────────────────────────────

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text,
  role           public.user_role not null default 'learner',
  goal           public.study_goal not null default 'both',
  target_level   public.jlpt_level not null default 'N5',
  exam_date      date,
  daily_minutes  integer not null default 20 check (daily_minutes between 5 and 180),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- security definer so RLS policies can call it without recursing into profiles' own policies
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── Content bank ───────────────────────────────────────────────────────────

-- Every learnable unit. `slug` is the stable id used by JSON imports and by
-- prerequisites / lesson references, so content drafted outside the app can
-- link to other content before it has a uuid.
create table public.items (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  type           public.item_type not null,
  jlpt_level     public.jlpt_level not null,
  term           text not null,
  reading        text,
  romaji         text,
  meaning        text not null,
  mnemonic       text,
  examples       jsonb not null default '[]'::jsonb,
  data           jsonb not null default '{}'::jsonb,
  skill          text,
  topic          text,
  grammar_point  text,
  tags           text[] not null default '{}',
  prerequisites  text[] not null default '{}',
  audio_url      text,
  status         public.content_status not null default 'draft',
  source         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index items_type_level_idx on public.items (type, jlpt_level);
create index items_status_idx on public.items (status);
create index items_tags_idx on public.items using gin (tags);

create table public.lessons (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  jlpt_level     public.jlpt_level not null,
  position       integer not null,
  title          text not null,
  situation      text,
  item_slugs     text[] not null default '{}',
  grammar_slug   text,
  dialogue       jsonb not null default '[]'::jsonb,
  checks         jsonb not null default '[]'::jsonb,
  notes          text,
  status         public.content_status not null default 'draft',
  source         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (jlpt_level, position)
);

-- Listening scripts and dialogues now; Reader stories at a later stage.
create table public.texts (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  jlpt_level     public.jlpt_level not null,
  kind           text not null check (kind in ('dialogue', 'listening', 'reading', 'story')),
  title          text not null,
  body           text not null,
  token_index    jsonb,
  audio_url      text,
  status         public.content_status not null default 'draft',
  source         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.mock_tests (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  jlpt_level     public.jlpt_level not null,
  title          text not null,
  time_limit_min integer not null check (time_limit_min > 0),
  status         public.content_status not null default 'draft',
  source         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Questions can belong to a mock test or sit in the practice bank (mock_test_slug null).
create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  mock_test_slug text references public.mock_tests (slug) on update cascade on delete set null,
  position       integer,
  jlpt_level     public.jlpt_level not null,
  section        public.jlpt_section not null,
  passage        text,
  prompt         text not null,
  options        jsonb not null check (jsonb_typeof(options) = 'array'),
  answer         integer not null check (answer >= 0),
  explanation    text,
  item_slugs     text[] not null default '{}',
  status         public.content_status not null default 'draft',
  source         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index questions_mock_idx on public.questions (mock_test_slug, position);

create table public.sentence_patterns (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  jlpt_level        public.jlpt_level not null,
  grammar_slug      text,
  title             text not null,
  english           text,
  template          jsonb not null check (jsonb_typeof(template) = 'array'),
  conjugation_rules jsonb not null default '[]'::jsonb,
  examples          jsonb not null default '[]'::jsonb,
  notes             text,
  status            public.content_status not null default 'draft',
  source            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Audit log of review-queue transitions (draft → reviewed → live, or back).
create table public.content_reviews (
  id             bigint generated always as identity primary key,
  content_table  text not null check (content_table in ('items', 'lessons', 'texts', 'mock_tests', 'questions', 'sentence_patterns')),
  content_id     uuid not null,
  from_status    public.content_status,
  to_status      public.content_status not null,
  notes          text,
  reviewer_id    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);
create index content_reviews_target_idx on public.content_reviews (content_table, content_id);

create trigger items_updated_at before update on public.items for each row execute function public.set_updated_at();
create trigger lessons_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger texts_updated_at before update on public.texts for each row execute function public.set_updated_at();
create trigger mock_tests_updated_at before update on public.mock_tests for each row execute function public.set_updated_at();
create trigger questions_updated_at before update on public.questions for each row execute function public.set_updated_at();
create trigger sentence_patterns_updated_at before update on public.sentence_patterns for each row execute function public.set_updated_at();

-- ─── Learner state ──────────────────────────────────────────────────────────

-- One row per learner per item per card type, holding the FSRS card.
-- fsrs_state follows ts-fsrs: 0 New, 1 Learning, 2 Review, 3 Relearning.
create table public.user_items (
  user_id         uuid not null references auth.users (id) on delete cascade,
  item_id         uuid not null references public.items (id) on delete cascade,
  card_type       text not null default 'recognition'
                    check (card_type in ('recognition', 'recall', 'typing', 'listening', 'cloze')),
  due             timestamptz not null default now(),
  stability       double precision not null default 0,
  difficulty      double precision not null default 0,
  elapsed_days    integer not null default 0,
  scheduled_days  integer not null default 0,
  learning_steps  integer not null default 0,
  reps            integer not null default 0,
  lapses          integer not null default 0,
  fsrs_state      smallint not null default 0 check (fsrs_state between 0 and 3),
  last_review     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, item_id, card_type)
);
create index user_items_due_idx on public.user_items (user_id, due);
create trigger user_items_updated_at before update on public.user_items for each row execute function public.set_updated_at();

-- Every answer, append-only (no update/delete policies).
create table public.reviews (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id      uuid not null references public.items (id) on delete cascade,
  card_type    text not null,
  grade        smallint not null check (grade between 1 and 4),
  ms_taken     integer check (ms_taken >= 0),
  source       public.review_source not null,
  fsrs_state   smallint,
  reviewed_at  timestamptz not null default now()
);
create index reviews_user_time_idx on public.reviews (user_id, reviewed_at desc);

create table public.mistakes (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id      uuid references public.items (id) on delete set null,
  source       public.review_source not null,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index mistakes_user_open_idx on public.mistakes (user_id) where resolved_at is null;

create table public.gamification (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  xp               integer not null default 0 check (xp >= 0),
  streak           integer not null default 0 check (streak >= 0),
  longest_streak   integer not null default 0 check (longest_streak >= 0),
  freezes          integer not null default 0 check (freezes >= 0),
  last_study_date  date,
  badges           text[] not null default '{}',
  updated_at       timestamptz not null default now()
);
create trigger gamification_updated_at before update on public.gamification for each row execute function public.set_updated_at();

-- ─── New-user bootstrap ─────────────────────────────────────────────────────
-- Public sign-up is disabled in Supabase Auth; users are created from the
-- dashboard. Every new user starts as a learner.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  insert into public.gamification (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Privileges ─────────────────────────────────────────────────────────────
-- Nothing is readable without logging in.
revoke all on all tables in schema public from anon;

-- Learners may edit their own settings but never their role.
revoke update on public.profiles from authenticated;
grant update (display_name, goal, target_level, exam_date, daily_minutes) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;

-- reviews are append-only for everyone through the API.
revoke update, delete on public.reviews from authenticated;

revoke execute on function public.is_admin() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- ─── Row-level security ─────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.items             enable row level security;
alter table public.lessons           enable row level security;
alter table public.texts             enable row level security;
alter table public.mock_tests        enable row level security;
alter table public.questions         enable row level security;
alter table public.sentence_patterns enable row level security;
alter table public.content_reviews   enable row level security;
alter table public.user_items        enable row level security;
alter table public.reviews           enable row level security;
alter table public.mistakes          enable row level security;
alter table public.gamification      enable row level security;

-- profiles: owner reads and updates own row; admin reads all.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- content tables: learners see live rows; admins see and write everything.
do $$
declare t text;
begin
  foreach t in array array['items', 'lessons', 'texts', 'mock_tests', 'questions', 'sentence_patterns'] loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated
         using (status = ''live'' or (select public.is_admin()))', t);
    execute format(
      'create policy %1$s_admin_insert on public.%1$I for insert to authenticated
         with check ((select public.is_admin()))', t);
    execute format(
      'create policy %1$s_admin_update on public.%1$I for update to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format(
      'create policy %1$s_admin_delete on public.%1$I for delete to authenticated
         using ((select public.is_admin()))', t);
  end loop;
end;
$$;

create policy content_reviews_admin_select on public.content_reviews for select to authenticated
  using ((select public.is_admin()));
create policy content_reviews_admin_insert on public.content_reviews for insert to authenticated
  with check ((select public.is_admin()));

-- learner tables: owner-only.
create policy user_items_owner on public.user_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy reviews_owner_select on public.reviews for select to authenticated
  using (user_id = (select auth.uid()));
create policy reviews_owner_insert on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy mistakes_owner on public.mistakes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy gamification_owner_select on public.gamification for select to authenticated
  using (user_id = (select auth.uid()));
create policy gamification_owner_update on public.gamification for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
