-- Buckets
insert into storage.buckets (id, name, public) values
  ('avatars','avatars', true),
  ('chat-media','chat-media', true),
  ('voice-notes','voice-notes', false)
on conflict do nothing;

-- Avatars: public read, owner write
create policy "Avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');
create policy "Avatars owner write"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() = owner);
create policy "Avatars owner update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid() = owner);
create policy "Avatars owner delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid() = owner);

-- Chat media: public read, participants write (looser: any authed write)
create policy "Chat media public read"
  on storage.objects for select
  using (bucket_id = 'chat-media');
create policy "Chat media authed write"
  on storage.objects for insert
  with check (bucket_id = 'chat-media' and auth.role() = 'authenticated');
create policy "Chat media authed update"
  on storage.objects for update
  using (bucket_id = 'chat-media' and auth.role() = 'authenticated');
create policy "Chat media authed delete"
  on storage.objects for delete
  using (bucket_id = 'chat-media' and auth.role() = 'authenticated');

-- Voice notes: private read/write owner only
create policy "Voice notes owner read"
  on storage.objects for select
  using (bucket_id = 'voice-notes' and auth.uid() = owner);
create policy "Voice notes owner write"
  on storage.objects for insert
  with check (bucket_id = 'voice-notes' and auth.uid() = owner);
create policy "Voice notes owner update"
  on storage.objects for update
  using (bucket_id = 'voice-notes' and auth.uid() = owner);
create policy "Voice notes owner delete"
  on storage.objects for delete
  using (bucket_id = 'voice-notes' and auth.uid() = owner);

-- Ensure owners populate on upload via PostgREST
create or replace function storage.set_owner()
returns trigger
language plpgsql
as $$
begin
  if new.owner is null then
    new.owner := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_owner_before_insert on storage.objects;
create trigger set_owner_before_insert
before insert on storage.objects
for each row execute function storage.set_owner();
