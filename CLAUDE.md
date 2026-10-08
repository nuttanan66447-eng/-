# CLAUDE.md

เว็บไซต์กองช่าง เทศบาลตำบลสีแก้ว — เว็บ static บน Vercel https://sikaew-kongchang.vercel.app (โปรเจกต์ `sikaew-kongchang`, deploy อัตโนมัติจาก `main`) และ GitHub Pages (https://nuttanan66447-eng.github.io/-/)
ข้อมูลเก็บใน Supabase (โปรเจกต์ `sikaew-kongchang`, id `goiigbvnlzsovcxykynr`) เมื่อเจ้าหน้าที่เข้าสู่ระบบ

## กติกาการทำงาน (สำคัญ)

- **Merge ทุกครั้ง:** เมื่อแก้ไขเสร็จและทดสอบผ่าน ให้ commit → push → เปิด PR เข้า `main` → merge PR ทันที ไม่ต้องถามก่อน
- ถ้า PR ของ branch เดิม merge ไปแล้ว ให้เริ่ม branch ใหม่จาก `origin/main` ล่าสุดก่อนทำงานต่อ
- ตอบผู้ใช้เป็นภาษาไทย
- ชื่อไฟล์ดาวน์โหลดใช้ตัวอักษรภาษาอังกฤษ (ชื่อภาษาไทยบางเบราว์เซอร์ทิ้ง)

## โครงสร้าง (เว็บรุ่นใหม่ — เขียนใหม่ทั้งหมดตามแบบใน `design/`)

- หน้าเดียว `index.html` (SPA, ที่อยู่ `#/...`) ธีม Civic Architectural Glass จาก `design/DESIGN.md` (ภาพตัวอย่าง `design/dashboard.png`, `design/document-editor.png`) — Tailwind `assets/css/tailwind.css` → `assets/css/app.css`
- `assets/js/core.js` = ตัวช่วย (esc, วันที่ไทย, เงิน), toast/modal/formModal/confirm, ตัวเปลี่ยนหน้า `SK.route(name,{render,refresh,leave})`
- `assets/js/store.js` = `SK.store` ข้อมูลเว็บ (documents, diary, photos, meta) key เดิม `sikaew-kongchang-db-v2` + `SK.store.files` (IndexedDB `sikaew-kongchang-files` + Storage)
- `assets/js/cloud.js` = Supabase: ซิงก์ records/workbooks/files แบบเดิม, เข้าสู่ระบบชื่อผู้ใช้ (`<ชื่อ>@users.sikaew-kongchang.app`), จัดการ staff (Edge Function `staff-user` หรือสร้างจากเบราว์เซอร์ถ้ายังไม่ deploy)
- `assets/js/projects.js` = `SK.projects` อ่านชีท "ฐานข้อมูลโครงการ" ผ่าน `SKGas.call('getDashboardDataFast')` รหัส `P-<แถว>` โหลดใหม่เมื่อ worker แจ้ง `saved`
- `assets/js/engine.js` = `SK.engine` ระบบหลัก (system.html?engine=1) ใน iframe เดียว: DOCS (แบบเอกสาร), TOOLS (หน้าของระบบหลัก), `openDoc`/`generate` (เก็บ HTML ที่ระบบหลักส่งพิมพ์), `dock(holder)` วาง iframe ทับกล่องในหน้า (ฟอร์มเอกสาร/หน้ากรอกข้อมูลโครงการ/เครื่องมือ)
- `assets/js/docs.js` = Smart Editor (`SK.docs.editor`) แก้ไขบนเอกสารแบบ Word (พิมพ์ได้ทันที แถบเครื่องมือ ขนาด/สี/จัดแนว/รายการ/ระยะบรรทัด บันทึกอัตโนมัติ) พิมพ์ Word + ประวัติเอกสาร (แทนที่ฉบับเดิมเมื่อแบบ+โครงการ+สัปดาห์/งวดเดียวกัน)
- `assets/js/doc-standard.js` = จัดหนังสือราชการตามมาตรฐานการพิมพ์ (ไฟล์ formstandard ที่ผู้ใช้ส่งมา): บันทึกข้อความ (ขอบ 3/2/2.5/2 ซม., TH Sarabun PSK 16pt, ครุฑ 1.5 ซม., หัว 29pt/35pt, ป้าย 20pt, ย่อหน้า 2.5 ซม.) และหนังสือภายนอก (ครุฑ 3 ซม.) — ทำใน Smart Editor หลังระบบหลักสร้าง, สำเนาในประวัติมี `data-sk-std` ไม่จัดซ้ำ
- เมนูซ้ายมีรายการแบบเอกสารทั้งหมด (ใต้ พิมพ์เอกสารราชการ, สร้างใน app.js จาก `SK.engine.DOCS`); หน้าเอกสาร: ประวัติ (พับได้) → การตั้งค่าหน้ากระดาษ + ข้อมูลโครงการ → ฟอร์ม/เอกสาร
- `assets/js/photos.js` (รูปโครงการ ก่อน/ระหว่าง/หลัง), `map.js` (Leaflet + ขอบเขตจากชีท/OSM), `word-export.js` (.docx จากพรีวิว)
- `assets/js/views/*.js` = หน้าต่าง ๆ: overview, projects, project, documents, tracking, map, system (entry/tools), users (+data), common (ส่วนประกอบร่วม); `assets/js/app.js` = เมนู/แถบบน/บัญชี
- `assets/gas/` = ตัวจำลอง Apps Script (worker แต่ละหน้า/iframe โหลดชีทใหม่เมื่อ worker อื่นบันทึก), `data-panel.js` ใช้เฉพาะ importFile/exportFile
- `system.html` = ระบบหลัก v190 สร้างจาก `system/src/*` ด้วย `python3 tools/build_system.py` — ห้ามแก้ `system/src/` หรือ `system.html` ด้วยมือ; `assets/personnel.js` สร้างด้วยสคริปต์เดียวกัน ห้ามแก้ด้วยมือ
- `assets/config.js` = URL + publishable key ของ Supabase; โครงสร้าง DB ใน `supabase/schema.sql` (แก้ DB แล้วต้องอัปเดต)
- `tools/build-dist.js` สร้าง dist/ + หน้า redirect ของลิงก์เก่า (projects.html, project.html?id=, progress.html, project-docs.html, documents.html, disbursement.html, index.html?page=openXxx)
- ใช้ข้อมูลจริงเท่านั้น ห้ามใส่ข้อมูล/รายชื่อ/ตัวเลขสมมุติในหน้าเว็บ
- ทดสอบ Word ด้วย LibreOffice (`apt-get install libreoffice-writer`) แปลงเป็น PDF

## คำสั่ง

```bash
npm run build              # สร้าง assets/css/app.css ใหม่ (Tailwind) ทุกครั้งที่เพิ่มคลาสใหม่
python3 tools/build_system.py
python3 -m http.server 8765   # ทดสอบในเครื่อง (ต้องเปิดผ่าน http ไม่ใช่ file://)
node tools/build-dist.js      # สร้าง dist/ แบบที่ Vercel ใช้
```
