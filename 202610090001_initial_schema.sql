-- Web Job Application Pro: initial schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'candidate' check (role in ('candidate','hr_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  applied_position text,
  full_name text,
  phone text,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  application_status text not null default 'draft' check (application_status in ('draft','submitted','interview','passed','rejected')),
  form_data jsonb not null default '{}'::jsonb,
  profile_photo_path text,
  consent_status boolean not null default false,
  consent_version text,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  policy_version text not null,
  consented_at timestamptz not null default now(),
  action text not null default 'consented'
);
create index if not exists applications_status_idx on public.applications(application_status);
create index if not exists applications_position_idx on public.applications(applied_position);
create index if not exists applications_updated_idx on public.applications(updated_at desc);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),'candidate')
  on conflict(id) do update set email=excluded.email;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.is_hr_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='hr_admin');
$$;
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.consent_logs enable row level security;
drop policy if exists "profile self or HR read" on public.profiles;
create policy "profile self or HR read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_hr_admin());
drop policy if exists "candidate create own profile not allowed" on public.profiles;
drop policy if exists "candidate update own basic profile" on public.profiles;
create policy "profile self update basic" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and role='candidate');
drop policy if exists "application owner or HR read" on public.applications;
create policy "application owner or HR read" on public.applications for select to authenticated using(user_id=auth.uid() or public.is_hr_admin());
drop policy if exists "candidate insert own application" on public.applications;
create policy "candidate insert own application" on public.applications for insert to authenticated with check(user_id=auth.uid() and not public.is_hr_admin());
drop policy if exists "candidate update own draft or HR update" on public.applications;
create policy "candidate update own draft or HR update" on public.applications for update to authenticated using(user_id=auth.uid() or public.is_hr_admin()) with check(user_id=auth.uid() or public.is_hr_admin());
drop policy if exists "consent log owner or HR read" on public.consent_logs;
create policy "consent log owner or HR read" on public.consent_logs for select to authenticated using(user_id=auth.uid() or public.is_hr_admin());
drop policy if exists "consent log own insert" on public.consent_logs;
create policy "consent log own insert" on public.consent_logs for insert to authenticated with check(user_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('candidate-photos','candidate-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists "candidate photos owner read" on storage.objects;
create policy "candidate photos owner read" on storage.objects for select to authenticated using(bucket_id='candidate-photos' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_hr_admin()));
drop policy if exists "candidate photos owner upload" on storage.objects;
create policy "candidate photos owner upload" on storage.objects for insert to authenticated with check(bucket_id='candidate-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "candidate photos owner update" on storage.objects;
create policy "candidate photos owner update" on storage.objects for update to authenticated using(bucket_id='candidate-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='candidate-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "candidate photos owner delete" on storage.objects;
create policy "candidate photos owner delete" on storage.objects for delete to authenticated using(bucket_id='candidate-photos' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_hr_admin()));
-- After creating the HR account through the UI, promote it from SQL Editor:
-- update public.profiles set role='hr_admin' where email='YOUR_HR_EMAIL';
