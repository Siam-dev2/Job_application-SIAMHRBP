STARLIVE-S Navy & Amber Gold Theme Patch V1

Patch สำหรับโปรเจกต์เดิม D:\Job_application-main เท่านั้น ไม่ใช่โปรเจกต์เต็ม
เปลี่ยนสีหลักเป็น Midnight/Navy (#0F1B2B–#1B2A4A), ปุ่มสำคัญเป็น Amber Gold (#F59E0B / hover #F39C12), ข้อความบนแผงสีเข้มเป็น #FFFFFF และคำอธิบายเป็น #E2E8F0
รวม App.tsx ที่ใช้โลโก้พื้นหลังโปร่งใส และไฟล์โลโก้/favicon ที่แนบไว้
ไม่เปลี่ยน Supabase, authentication flow, schema หรือข้อมูลใบสมัคร

วิธีใช้:
1) สำรองไฟล์ src\App.tsx และ src\styles.css เดิม
2) คัดลอก src\App.tsx และ src\styles.css จาก ZIP ไปทับใน D:\Job_application-main\src\
3) คัดลอกไฟล์ใน public\ ไปทับ D:\Job_application-main\public\
4) รัน PowerShell:
   Set-Location 'D:\Job_application-main'
   npm.cmd run build
   if ($LASTEXITCODE -ne 0) { throw "BUILD FAILED - หยุดก่อน Deploy" }
   npx.cmd wrangler pages deploy dist --project-name careers-starlive
5) เปิด https://careers.starlive-s.com แล้วกด Ctrl+F5

หมายเหตุ: Deploy นี้เป็น Cloudflare Pages project careers-starlive (ไม่ใช่ Worker deploy)
