-- Newcomer playlist plays, so Night Recall can tick "Play your playlist".
-- A play is logged by the in-app playlist (after its first full phrase) and
-- by the Siri Shortcut feed each time it fetches the phrases.
create table public.newcomer_plays (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  source     text not null check (source in ('app', 'shortcut')),
  played_at  timestamptz not null default now()
);
create index newcomer_plays_user_idx on public.newcomer_plays (user_id, played_at desc);

alter table public.newcomer_plays enable row level security;
create policy newcomer_plays_own on public.newcomer_plays for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert on public.newcomer_plays to authenticated;

-- The feed now logs a Shortcut play (at most one per 10 minutes) before returning the phrases.
create or replace function public.newcomer_feed(feed_token text)
returns table (jp text, kana text, meaning text, source_lang text)
language plpgsql volatile security definer set search_path = '' as $$
declare
  owner uuid;
begin
  select f.user_id into owner from public.newcomer_feeds f where f.token = feed_token and char_length(feed_token) >= 32;
  if owner is null then return; end if;
  if not exists (
    select 1 from public.newcomer_plays p
    where p.user_id = owner and p.source = 'shortcut' and p.played_at > now() - interval '10 minutes'
  ) then
    insert into public.newcomer_plays (user_id, source) values (owner, 'shortcut');
  end if;
  return query
    select p.jp, p.kana, p.meaning, p.source_lang
    from public.newcomer_phrases p
    where p.user_id = owner and p.priority <> 'paused'
    order by (p.priority = 'priority') desc, p.created_at desc;
end;
$$;
revoke execute on function public.newcomer_feed(text) from public;
grant execute on function public.newcomer_feed(text) to anon, authenticated;
