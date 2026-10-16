-- The learner's own order for My phrases (drag to reorder). Smaller comes
-- first; new phrases default to the top (newest first, as before).
alter table public.newcomer_phrases
  add column if not exists position double precision not null default (-extract(epoch from now()));

update public.newcomer_phrases set position = -extract(epoch from created_at);

create index if not exists newcomer_phrases_user_position on public.newcomer_phrases (user_id, position);
