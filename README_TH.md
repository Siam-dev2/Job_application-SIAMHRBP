# StarLive Web Job Application Pro — Admin Dashboard Patch

## รายการแก้ไข
- เพิ่มจำนวนบัญชีผู้สมัครที่ลงทะเบียนสำเร็จ (นับจาก `profiles.role = 'candidate'`).
- เพิ่มการ์ดจำนวนใบสมัครฉบับร่างที่กำลังกรอก; คลิกเพื่อดูชื่อผู้สมัคร ตำแหน่ง และเปอร์เซ็นต์ความสมบูรณ์ที่บันทึกล่าสุด.
- จำสถานะหน้า Admin ใน `sessionStorage` เพื่อให้รีเฟรชด้วย F5 แล้วยังคงกลับหน้า Admin สำหรับบัญชีผู้ดูแลที่มีสิทธิ์.
- เพิ่ม migration เพื่อให้ HR Admin/Super Admin อ่านสถานะใบสมัครได้ทุกสถานะ; ผู้สมัครยังอ่านได้เฉพาะใบสมัครของตนเอง.

## วิธีติดตั้ง
1. สำรองโฟลเดอร์โปรเจกต์ก่อน.
2. คัดลอก `src/App.tsx` และ `src/styles.css` ไปทับไฟล์เดิมใน `D:\Job_application-main\src\`.
3. เปิด Supabase Dashboard → SQL Editor แล้วรันเนื้อหาไฟล์ `supabase/migrations/202610140001_admin_application_visibility.sql` หนึ่งครั้ง.
4. ที่ PowerShell รัน:
   ```powershell
   Set-Location 'D:\Job_application-main'
   npm.cmd run build
   if ($LASTEXITCODE -ne 0) { throw "BUILD FAILED - หยุดก่อน Deploy" }
   npx.cmd wrangler pages deploy dist --project-name careers-starlive
   ```
5. ทดสอบหน้า Admin, การคลิกการ์ดผู้กำลังกรอก, และ F5 ที่ `https://careers.starlive-s.com`.

## ข้อสังเกต
- ความสมบูรณ์แสดงตาม `progress_percent` ที่บันทึกในฐานข้อมูลล่าสุด ไม่ใช่ค่าที่ยังไม่ได้กดบันทึกร่าง.
- จำนวนผู้ลงทะเบียนนับแถวใน `profiles` ที่มี role `candidate`.
- หากยังไม่รัน SQL migration ผู้ดูแลจะยังไม่เห็น draft applications เนื่องจาก Row Level Security เดิมอนุญาตให้อ่านเฉพาะใบสมัครที่ส่งแล้ว.
