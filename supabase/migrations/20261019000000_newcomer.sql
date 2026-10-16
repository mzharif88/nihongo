-- Newcomer: learning to speak the way children do, from whole sentences.
-- Each learner keeps their own phrases (their daily life, typed in English
-- or Malay and translated to polite Japanese) and recall progress on the
-- starter library. A private feed token lets an iPhone Shortcut play the
-- phrases aloud with the screen locked.

create table public.newcomer_phrases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade default auth.uid(),
  source            text not null check (char_length(source) between 1 and 300),
  source_lang       text not null check (source_lang in ('en', 'ms')),
  meaning           text not null,
  jp                text not null,
  reading           text not null,
  kana              text not null,
  priority          text not null default 'normal' check (priority in ('priority', 'normal', 'less', 'paused')),
  right_count       integer not null default 0,
  wrong_count       integer not null default 0,
  streak            integer not null default 0,
  due_at            timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  cost_usd          numeric(10, 4) not null default 0,
  created_at        timestamptz not null default now()
);
create index newcomer_phrases_user_idx on public.newcomer_phrases (user_id, created_at desc);

-- Recall progress on starter-library phrases (the phrases themselves live in the app's content).
create table public.newcomer_progress (
  user_id           uuid not null references auth.users (id) on delete cascade default auth.uid(),
  phrase_slug       text not null,
  right_count       integer not null default 0,
  wrong_count       integer not null default 0,
  streak            integer not null default 0,
  due_at            timestamptz not null default now(),
  last_reviewed_at  timestamptz,
  primary key (user_id, phrase_slug)
);

create table public.newcomer_feeds (
  user_id     uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  token       text not null unique check (char_length(token) >= 32),
  created_at  timestamptz not null default now()
);

alter table public.newcomer_phrases enable row level security;
alter table public.newcomer_progress enable row level security;
alter table public.newcomer_feeds enable row level security;

create policy newcomer_phrases_own on public.newcomer_phrases for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy newcomer_progress_own on public.newcomer_progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy newcomer_feeds_own on public.newcomer_feeds for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.newcomer_phrases, public.newcomer_progress, public.newcomer_feeds to authenticated;

-- The Shortcut feed: a learner's playable phrases, found by their private
-- token alone (the Shortcut has no login). Paused phrases are left out;
-- priority phrases come first.
create or replace function public.newcomer_feed(feed_token text)
returns table (jp text, kana text, meaning text, source_lang text)
language sql stable security definer set search_path = '' as $$
  select p.jp, p.kana, p.meaning, p.source_lang
  from public.newcomer_phrases p
  join public.newcomer_feeds f on f.user_id = p.user_id
  where f.token = feed_token and char_length(feed_token) >= 32 and p.priority <> 'paused'
  order by (p.priority = 'priority') desc, p.created_at desc
$$;
revoke execute on function public.newcomer_feed(text) from public;
grant execute on function public.newcomer_feed(text) to anon, authenticated;
