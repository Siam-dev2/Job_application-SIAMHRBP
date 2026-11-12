-- Web Job Application Pro: add Super Admin support.
-- Run once in Supabase SQL Editor after the initial schema.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('candidate', 'hr_admin', 'super_admin'));

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('hr_admin', 'super_admin')
  );
$$;
