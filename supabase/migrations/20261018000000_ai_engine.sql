-- AI engine: each generation run (model, tokens, cost, outcome) and the
-- example sentences it produced, which wait for admin review before they
-- join an item's examples. Admin only.

create table public.ai_runs (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null default 'sentences' check (kind in ('sentences')),
  model              text not null,
  scope              text not null,
  status             text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  words_requested    integer not null default 0,
  sentences_created  integer not null default 0,
  sentences_discarded integer not null default 0,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  cost_usd           numeric(10, 4) not null default 0,
  error              text,
  triggered_by       uuid references auth.users (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  finished_at        timestamptz
);
create index ai_runs_created_idx on public.ai_runs (created_at desc);

create table public.ai_sentences (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.ai_runs (id) on delete cascade,
  item_id      uuid not null references public.items (id) on delete cascade,
  jp           text not null,
  en           text not null,
  reading      text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
create index ai_sentences_status_idx on public.ai_sentences (status, created_at);
create index ai_sentences_item_idx on public.ai_sentences (item_id);

alter table public.ai_runs enable row level security;
alter table public.ai_sentences enable row level security;

create policy ai_runs_admin on public.ai_runs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy ai_sentences_admin on public.ai_sentences for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update, delete on public.ai_runs, public.ai_sentences to authenticated;

-- Words per level and how many have at least one example sentence.
create or replace function public.example_coverage()
returns table (level text, words bigint, with_examples bigint)
language sql stable security invoker set search_path = '' as $$
  select i.jlpt_level::text, count(*), count(*) filter (where jsonb_array_length(i.examples) > 0)
  from public.items i
  where i.type = 'word' and i.status = 'live'
  group by 1 order by 1
$$;

-- The next words at a level with no example sentences and none waiting in review.
create or replace function public.words_needing_examples(lvl public.jlpt_level, max_words integer)
returns setof public.items
language sql stable security invoker set search_path = '' as $$
  select i.* from public.items i
  where i.type = 'word' and i.status = 'live' and i.jlpt_level = lvl
    and jsonb_array_length(i.examples) = 0
    and not exists (select 1 from public.ai_sentences s where s.item_id = i.id and s.status <> 'rejected')
  order by i.slug
  limit max_words
$$;

revoke execute on function public.example_coverage() from anon;
revoke execute on function public.words_needing_examples(public.jlpt_level, integer) from anon;
