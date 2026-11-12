STARLIVE-S — Transparent Logo Patch

What this patch changes:
- App.tsx: uses the original STAR LIVE ONLINE logo in the login screen and shared top bar, with a proportional drop shadow.
- public/assets/starlive-logo.png: primary STAR LIVE ONLINE logo.
- public/favicon.png and public/apple-touch-icon.png: generated from the STAR LIVE ONLINE mark with transparent backgrounds.

Apply:
1. Back up D:\Job_application-main\src\App.tsx.
2. Copy src\App.tsx from this ZIP to D:\Job_application-main\src\App.tsx.
3. Copy all files from public\ into D:\Job_application-main\public\ (overwrite when prompted).
4. In PowerShell:

   Set-Location 'D:\Job_application-main'
   npm.cmd run build
   if ($LASTEXITCODE -ne 0) { throw "BUILD FAILED - หยุดก่อน Deploy" }
   npx.cmd wrangler pages deploy dist --project-name careers-starlive

5. Open https://careers.starlive-s.com and press Ctrl+F5.

Important:
- Deploy to Cloudflare Pages project careers-starlive because this is the deployment whose pages.dev URL and custom domain were tested.
- This ZIP is a patch, not a full project. Keep the rest of the existing project unchanged.
