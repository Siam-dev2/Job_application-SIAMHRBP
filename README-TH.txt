STARLIVE Web Job Application Pro — A4 Photo Print Fix

ไฟล์ที่แก้:
- src/App.tsx: ดึง storage_path ของ profile_photo จาก application_documents (fallback form_data.photoPath), สร้าง signed URL อายุ 5 นาที และส่งให้หน้าพิมพ์
- public/application-template.html: แสดงรูปในช่องรูปถ่ายและรอโหลดรูปก่อนเรียกหน้าพิมพ์

ข้อควรทราบ:
- เป็น source patch จากไฟล์ App.tsx และ application-template.html ที่แนบในบทสนทนา
- ยังไม่ได้ build หรือ deploy ในเครื่องผู้ใช้ เพราะไม่มีโฟลเดอร์โปรเจกต์จริงในสภาพแวดล้อมนี้
- สำรองไฟล์เดิมก่อนแทนที่ และทดสอบปุ่ม A4 ในหน้า Admin หลัง deploy
- หน้า /application-template ที่เปิดตรง ๆ โดยไม่มี payload จะยังแสดงช่อง PHOTO เป็น placeholder ตามเดิม; ให้ทดสอบผ่านปุ่ม A4 ของใบสมัครจริง
