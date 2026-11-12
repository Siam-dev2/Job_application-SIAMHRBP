# Web Job Application Pro

Starter project for a Thai-language responsive recruitment application using React, TypeScript, Vite and Supabase. The original Figma/GAS/Google Sheets system is not modified by this project. This is a separate new system; no existing candidate data has been copied or deleted.

## Current starter features
- Email/password registration and login via Supabase Auth, password visibility toggle and logout.
- Candidate profile form grouped into personal, family, education, work, skills and photo sections.
- Draft saving and resume-after-login through Supabase.
- Completion percentage and section completion markers.
- Private candidate photo upload to Supabase Storage (5 MB limit; JPEG/PNG/WebP).
- HR dashboard with search, date range, position and status filters, basic A4 browser print view.
- RLS schema and private storage policies in `supabase/migrations/202610090001_initial_schema.sql`.
- Responsive layouts for desktop, tablet and mobile.

## Requirements
- Node.js 20 LTS recommended
- npm
- Supabase account/project

## Run locally (Windows PowerShell)
1. Extract ZIP to a folder, e.g. `D:\Web Job Application Pro`.
2. Open PowerShell in that folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. In Supabase Dashboard > Project Settings > API, copy the Project URL and publishable/anon key into `.env`:
   - `VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY`
6. In Supabase SQL Editor, run the full migration SQL file.
7. Run `npm run dev` and open the local URL printed by Vite.
8. Run `npm run build` to create `dist/`.

Never put a Supabase `service_role` key in `.env` for this frontend. Only the publishable/anon key belongs in the browser; RLS is mandatory.

## Configure HR account
1. Register an account through the app with the HR email.
2. Confirm the email if Supabase Auth requires it.
3. In Supabase SQL Editor, run (replace with the exact HR email):
   `update public.profiles set role='hr_admin' where email='hr@example.com';`
4. Sign out and sign in again. HR permissions are enforced by database RLS as well as the UI.

Do not allow public signup to choose `hr_admin`. The database trigger always creates a new account as `candidate`.

## GitHub
Create a private GitHub repository, then from this folder run:
`git init`
`git add .`
`git commit -m "Initial Web Job Application Pro starter"`
`git branch -M main`
`git remote add origin https://github.com/YOUR_USERNAME/web-job-application-pro.git`
`git push -u origin main`

Deploy the Vite project to Vercel or another static frontend host. Add the two VITE environment variables in the host settings. GitHub Pages can also host a static app but needs additional Vite base-path configuration if deployed under a repository subpath.

## Important limitations before production
- The company's actual Word/PDF/image application template has not yet been supplied in this conversation. Current A4 print is a generic placeholder and must be adapted to the official template.
- The photo input uploads the original image; interactive crop/zoom is not implemented yet.
- The consent interface is a starter. Before production, provide the approved privacy notice and version, and implement durable consent logging via a database trigger or trusted server endpoint. IP logging should only be added with a documented lawful basis and appropriate privacy notice.
- Add server-side validation, email verification/reset flows, rate limiting and review of RLS policies before public launch.
- Candidate form currently stores section details in `applications.form_data` JSONB. Expand into relational tables if reporting needs require it.
- HR status updates and detailed applicant view are not implemented yet.
- This starter has not been connected to your Supabase project and no live authentication/database tests have been run.

## Existing data preservation
The legacy Google Sheets, GAS deployment, and old Figma project are left untouched. Migration/import should be a separate, backed-up step after the new project has been validated.
