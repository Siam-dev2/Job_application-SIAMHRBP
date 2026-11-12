-- ============================================================================
-- Web Job Application Pro V2 — Public job listing + shared company config
-- Additive migration. It does NOT drop, reset or rewrite any existing data.
-- Row Level Security stays enabled on every existing table.
-- ============================================================================
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) Public read surface for job listings.
--    A read-only view that exposes ONLY published (is_active) listings and ONLY
--    the columns that are safe to publish. Candidate, applicant and admin data
--    are never reachable through this view.
--    The view runs with definer rights, so anonymous visitors can read the
--    published rows even though RLS stays enabled on public.job_positions.
--    No new policy is added to public.job_positions, so anonymous users still
--    cannot read that table directly.
-- ----------------------------------------------------------------------------
drop view if exists public.public_job_positions;
create view public.public_job_positions as
  select id, title, description, qualifications, is_active, created_at, updated_at
  from public.job_positions
  where is_active = true;
-- The view executes with the view owner's rights (PostgreSQL default), which is
-- exactly what lets anonymous visitors read the published rows while RLS stays
-- enabled on public.job_positions. On PostgreSQL 15+ we pin that explicitly;
-- on older servers this block is a harmless no-op.
do $$ begin
  execute 'alter view public.public_job_positions set (security_invoker = false)';
exception when others then null; end $$;
grant select on public.public_job_positions to anon, authenticated;
comment on view public.public_job_positions is
  'Public, read-only projection of published job listings used by the careers / share pages.';

-- ----------------------------------------------------------------------------
-- 2) Company-wide configuration displayed at the bottom of every job posting.
--    Single row (singleton). Welfare text is intentionally left EMPTY so the HR
--    team fills it in later from the Config screen.
-- ----------------------------------------------------------------------------
create table if not exists public.company_config (
  id boolean primary key default true,
  welfare text not null default '',
  contact_department text not null default '',
  contact_company_name text not null default '',
  contact_address text not null default '',
  contact_phone1 text not null default '',
  contact_phone1_note text not null default '',
  contact_phone2 text not null default '',
  contact_email text not null default '',
  contact_website text not null default '',
  contact_line_id text not null default '',
  location_name text not null default '',
  location_address text not null default '',
  location_maps_url text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint company_config_singleton check (id)
);

alter table public.company_config enable row level security;

-- Everyone (including anonymous visitors) may read the shared company info.
drop policy if exists "public read company config" on public.company_config;
create policy "public read company config" on public.company_config
  for select to anon, authenticated using (true);

-- Only administrators may change it.
drop policy if exists "admins insert company config" on public.company_config;
create policy "admins insert company config" on public.company_config
  for insert to authenticated with check (public.wja_is_admin());

drop policy if exists "admins update company config" on public.company_config;
create policy "admins update company config" on public.company_config
  for update to authenticated using (public.wja_is_admin()) with check (public.wja_is_admin());

drop policy if exists "admins delete company config" on public.company_config;
create policy "admins delete company config" on public.company_config
  for delete to authenticated using (public.wja_is_admin());

-- Seed the single configuration row with the published contact details.
-- `welfare` is deliberately empty: no welfare content is invented here.
insert into public.company_config (
  id, welfare,
  contact_department, contact_company_name, contact_address,
  contact_phone1, contact_phone1_note, contact_phone2,
  contact_email, contact_website, contact_line_id,
  location_name, location_address, location_maps_url
) values (
  true, '',
  'ฝ่ายบุคคล',
  'บริษัท สตาร์ไลฟ์ ออนไลน์ จำกัด',
  E'145/18-19 Hong Tower อาคาร B ชั้น 9 ห้อง B907-910\nแขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150',
  '065-909-6570', '(สำหรับติดต่อสมัครงานเท่านั้น)', '091-865-1827',
  'starliveonline_08@trustmail.jobthai.com',
  'https://www.facebook.com/hr.start.live/?viewas=1000000686899395',
  '@hr-starlive',
  'อาคาร Hong Tower ตึก B ชั้น 9 ห้อง B907-B910',
  'แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร',
  'https://maps.app.goo.gl/ScuYkp1vMDAtEGxv8'
) on conflict (id) do nothing;

-- Keep updated_at accurate for edits made from the Config screen.
create or replace function public.touch_company_config()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists company_config_touch on public.company_config;
create trigger company_config_touch before update on public.company_config
  for each row execute function public.touch_company_config();

-- Ask PostgREST to pick up the new view immediately.
notify pgrst, 'reload schema';
