-- Answers from adaptive course units are logged as their own review source.
alter type public.review_source add value if not exists 'course';
