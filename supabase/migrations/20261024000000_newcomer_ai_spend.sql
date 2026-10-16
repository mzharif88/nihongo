-- Every Claude call Newcomer makes (adding or editing phrases), with its
-- cost, so the spend shown and the monthly budget stay right even after a
-- phrase is deleted or re-translated.
create table public.newcomer_ai_spend (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind        text not null check (kind in ('add', 'edit')),
  lines       integer not null default 1 check (lines >= 0),
  cost_usd    numeric(10, 5) not null check (cost_usd >= 0),
  created_at  timestamptz not null default now()
);
create index newcomer_ai_spend_user_idx on public.newcomer_ai_spend (user_id, created_at desc);

alter table public.newcomer_ai_spend enable row level security;
create policy newcomer_ai_spend_own on public.newcomer_ai_spend for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert on public.newcomer_ai_spend to authenticated;

-- What was spent before this table existed lives on the saved phrases.
insert into public.newcomer_ai_spend (user_id, kind, lines, cost_usd, created_at)
select user_id, 'add', 1, cost_usd, created_at from public.newcomer_phrases where cost_usd > 0;
