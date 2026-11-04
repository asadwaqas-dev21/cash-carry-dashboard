-- Settings page: profile photos and keeping profile emails in sync.
-- Run after 20261102000000_dashboard_auth.sql.

-- The original schema creates the 'kirana-public' bucket but its upload policy
-- checked 'cash-carry-public', so no upload could ever succeed.
drop policy if exists "authenticated users can upload cash & carry public files" on storage.objects;
create policy "authenticated users can upload cash & carry public files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'kirana-public');

-- Avatars live under avatars/<user id>/; only that user may add, replace or delete them.
drop policy if exists "users manage their own avatar files" on storage.objects;
create policy "users manage their own avatar files"
on storage.objects
for all
to authenticated
using (bucket_id = 'kirana-public' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text)
with check (bucket_id = 'kirana-public' and (storage.foldername(name))[1] = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);

-- After someone confirms an email change, copy the new address to their profile on next sign-in.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_sync_profile_email on auth.users;
create trigger tr_sync_profile_email
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
