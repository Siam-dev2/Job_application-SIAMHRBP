-- Allow HR Admin and Super Admin to review draft as well as submitted applications.
-- Candidate access remains limited to their own records; only the admin branch changes.
-- Required for the admin dashboard's in-progress applicant count and detail popup.
drop policy if exists "candidate read own applications and admins read submitted" on public.job_applications;
create policy "candidate read own applications and admins read all statuses"
on public.job_applications
for select to authenticated
using (
  user_id = auth.uid()
  or (public.wja_is_admin() and status in ('draft','submitted','under_review','interview','passed','rejected'))
);
