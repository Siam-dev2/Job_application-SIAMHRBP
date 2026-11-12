-- Web Job Application Pro V2: job catalog + complete application payload.
-- Apply in Supabase SQL Editor after reviewing the project-specific role names.
create extension if not exists pgcrypto;

create table if not exists public.job_positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  qualifications text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_positions_title_not_blank check (length(trim(title)) > 0)
);
create index if not exists job_positions_active_idx on public.job_positions(is_active, created_at desc);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  job_id uuid not null references public.job_positions(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','interview','passed','rejected')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  form_data jsonb not null default '{}'::jsonb,
  form_version text not null default 'application-v2',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  constraint submitted_has_full_progress check (status <> 'submitted' or progress_percent = 100)
);
create index if not exists job_applications_user_idx on public.job_applications(user_id, created_at desc);
create index if not exists job_applications_job_idx on public.job_applications(job_id, status, created_at desc);
create unique index if not exists job_applications_one_draft_per_user_idx on public.job_applications(user_id) where status = 'draft';

-- Guard submitted content from being changed, including by a future accidental admin UI.
create or replace function public.guard_job_application_update()
returns trigger language plpgsql set search_path=public as $$
declare required_key text;
begin
  if old.status = 'submitted' then
    if new.form_data is distinct from old.form_data
       or new.job_id is distinct from old.job_id
       or new.user_id is distinct from old.user_id
       or new.progress_percent is distinct from old.progress_percent
       or new.submitted_at is distinct from old.submitted_at then
      raise exception 'Submitted application content is read-only';
    end if;
  end if;
  if old.status = 'draft' and new.status = 'submitted' then
    if new.progress_percent <> 100 then raise exception 'Application must be 100%% complete before submission'; end if;
    foreach required_key in array array['applicationDate','expectedSalary','firstNameTh','lastNameTh','fullNameEn','birthDate','phone','email','address','education1Level','employment1Company','photoPath','selfIntroduction','declaration'] loop
      if coalesce(trim(new.form_data->>required_key),'') = '' then raise exception 'Required application field is missing: %', required_key; end if;
    end loop;
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists guard_job_application_update_trigger on public.job_applications;
create trigger guard_job_application_update_trigger before update on public.job_applications for each row execute function public.guard_job_application_update();

alter table public.job_positions enable row level security;
alter table public.job_applications enable row level security;

-- Existing profiles and consent_logs are retained; their auth and PDPA workflow is not replaced.
create or replace function public.wja_is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('hr_admin','super_admin'));
$$;

drop policy if exists "active jobs visible to signed-in users" on public.job_positions;
create policy "active jobs visible to signed-in users" on public.job_positions for select to authenticated using (public.wja_is_admin() or (is_active and exists(select 1 from public.consent_logs c where c.user_id=auth.uid() and c.policy_version='privacy-v1' and c.action='consented')));
drop policy if exists "admins insert jobs" on public.job_positions;
create policy "admins insert jobs" on public.job_positions for insert to authenticated with check (public.wja_is_admin());
drop policy if exists "admins update jobs" on public.job_positions;
create policy "admins update jobs" on public.job_positions for update to authenticated using (public.wja_is_admin()) with check (public.wja_is_admin());
drop policy if exists "admins delete jobs" on public.job_positions;
create policy "admins delete jobs" on public.job_positions for delete to authenticated using (public.wja_is_admin());

drop policy if exists "candidate read own applications and admins read submitted" on public.job_applications;
create policy "candidate read own applications and admins read submitted" on public.job_applications for select to authenticated using ((user_id=auth.uid()) or (public.wja_is_admin() and status='submitted'));
drop policy if exists "candidate create own draft" on public.job_applications;
create policy "candidate create own draft" on public.job_applications for insert to authenticated with check (user_id=auth.uid() and status='draft' and not public.wja_is_admin() and exists(select 1 from public.job_positions j where j.id=job_id and j.is_active) and exists(select 1 from public.consent_logs c where c.user_id=auth.uid() and c.policy_version='privacy-v1' and c.action='consented'));
drop policy if exists "candidate update own draft only" on public.job_applications;
create policy "candidate update own draft only" on public.job_applications for update to authenticated using (user_id=auth.uid() and status='draft' and not public.wja_is_admin()) with check (user_id=auth.uid() and status in ('draft','submitted') and not public.wja_is_admin() and exists(select 1 from public.consent_logs c where c.user_id=auth.uid() and c.policy_version='privacy-v1' and c.action='consented'));
drop policy if exists "candidate delete own draft only" on public.job_applications;
create policy "candidate delete own draft only" on public.job_applications for delete to authenticated using (user_id=auth.uid() and status='draft' and not public.wja_is_admin());

-- The first full application payload is stored in JSONB to avoid losing any source-template fields.
-- A future form-builder can add versioned field definitions without rewriting historical applications.

-- Align existing profile role constraint with the already-used Super Admin role.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('candidate','hr_admin','super_admin'));

-- Let Super Admin preview applicant photos while keeping the bucket private.
drop policy if exists "super admin read candidate photos" on storage.objects;
create policy "super admin read candidate photos" on storage.objects for select to authenticated
using (bucket_id='candidate-photos' and public.wja_is_admin());

-- Versioned form definitions allow a future upload-to-form-builder without rewriting old submissions.
create table if not exists public.application_form_versions (
  id uuid primary key default gen_random_uuid(),
  version_code text not null unique,
  display_name text not null,
  schema_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
insert into public.application_form_versions(version_code,display_name,schema_json,is_active)
values('application-v2','ใบสมัครงานฉบับเต็ม V2',jsonb_build_object('sections',jsonb_build_array('personal','family','education','employment','skills','photo','additional')),true)
on conflict(version_code) do nothing;

-- Keep each tab's data separately addressable while retaining a full JSON snapshot on job_applications.
create table if not exists public.application_section_data (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  section_key text not null,
  section_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(application_id, section_key)
);
create index if not exists application_section_data_app_idx on public.application_section_data(application_id, section_key);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  original_file_name text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique(application_id, document_type)
);

alter table public.application_form_versions enable row level security;
alter table public.application_section_data enable row level security;
alter table public.application_documents enable row level security;

drop policy if exists "authenticated read active form version" on public.application_form_versions;
create policy "authenticated read active form version" on public.application_form_versions for select to authenticated using (public.wja_is_admin() or (is_active and exists(select 1 from public.consent_logs c where c.user_id=auth.uid() and c.policy_version='privacy-v1' and c.action='consented')));
drop policy if exists "admins manage form versions" on public.application_form_versions;
create policy "admins manage form versions" on public.application_form_versions for all to authenticated using (public.wja_is_admin()) with check (public.wja_is_admin());

drop policy if exists "candidate or admin read application sections" on public.application_section_data;
create policy "candidate or admin read application sections" on public.application_section_data for select to authenticated using (exists(select 1 from public.job_applications a where a.id=application_id and (a.user_id=auth.uid() or (public.wja_is_admin() and a.status='submitted'))));
drop policy if exists "candidate write own draft sections" on public.application_section_data;
create policy "candidate write own draft sections" on public.application_section_data for insert to authenticated with check (exists(select 1 from public.job_applications a where a.id=application_id and a.user_id=auth.uid() and a.status='draft' and not public.wja_is_admin()));
drop policy if exists "candidate update own draft sections" on public.application_section_data;
create policy "candidate update own draft sections" on public.application_section_data for update to authenticated using (exists(select 1 from public.job_applications a where a.id=application_id and a.user_id=auth.uid() and a.status='draft' and not public.wja_is_admin())) with check (exists(select 1 from public.job_applications a where a.id=application_id and a.user_id=auth.uid() and a.status='draft' and not public.wja_is_admin()));
drop policy if exists "candidate delete own draft sections" on public.application_section_data;
create policy "candidate delete own draft sections" on public.application_section_data for delete to authenticated using (exists(select 1 from public.job_applications a where a.id=application_id and a.user_id=auth.uid() and a.status='draft' and not public.wja_is_admin()));

drop policy if exists "candidate or admin read application documents" on public.application_documents;
create policy "candidate or admin read application documents" on public.application_documents for select to authenticated using (exists(select 1 from public.job_applications a where a.id=application_id and (a.user_id=auth.uid() or (public.wja_is_admin() and a.status='submitted'))));
drop policy if exists "candidate add own draft documents" on public.application_documents;
create policy "candidate add own draft documents" on public.application_documents for insert to authenticated with check (exists(select 1 from public.job_applications a where a.id=application_id and a.user_id=auth.uid() and a.status='draft' and not public.wja_is_admin()));
drop policy if exists "candidate update own draft documents" on public.application_documents;
create policy "candidate update own draft documents" on public.application_documents for update to authenticated using (exists(select 1 from public.job_applications a where a.id=application_id and a.user_id=auth.uid() and a.status='draft' and not public.wja_is_admin())) with check (exists(select 1 from public.job_applications a where a.id=application_id and a.user_id=auth.uid() and a.status='draft' and not public.wja_is_admin()));
