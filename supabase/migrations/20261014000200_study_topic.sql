-- The learner's chosen focus for new items ("topic of the day"); null = automatic curriculum order.
alter table public.profiles
  add column study_topic text check (study_topic ~ '^(kana:(hiragana|katakana)|kanji:N[1-5]|words:N[1-5]|topic:.{1,60})$');

grant update (study_topic) on public.profiles to authenticated;
