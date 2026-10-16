-- The dictionary words a learner's phrase uses (食べる, コーヒー), from the
-- translation, so those words jump ahead in their main study queue.
alter table public.newcomer_phrases add column words text[] not null default '{}';
