-- Audio bucket for one-time generated TTS files (64 kbps mono).
-- Signed-in users can read; only admins can upload, replace, or delete.

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

create policy audio_read on storage.objects for select to authenticated
  using (bucket_id = 'audio');
create policy audio_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (select public.is_admin()));
create policy audio_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'audio' and (select public.is_admin()));
create policy audio_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (select public.is_admin()));
