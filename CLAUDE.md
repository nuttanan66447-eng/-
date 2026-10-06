# CLAUDE.md

เว็บไซต์กองช่าง เทศบาลตำบลสีแก้ว — เว็บ static บน Vercel https://sikaew-kongchang.vercel.app (โปรเจกต์ `sikaew-kongchang`, deploy อัตโนมัติจาก `main`) และ GitHub Pages (https://nuttanan66447-eng.github.io/-/)
ข้อมูลเก็บใน Supabase (โปรเจกต์ `sikaew-kongchang`, id `goiigbvnlzsovcxykynr`) เมื่อเจ้าหน้าที่เข้าสู่ระบบ

## กติกาการทำงาน (สำคัญ)

- **Merge ทุกครั้ง:** เมื่อแก้ไขเสร็จและทดสอบผ่าน ให้ commit → push → เปิด PR เข้า `main` → merge PR ทันที ไม่ต้องถามก่อน
- ถ้า PR ของ branch เดิม merge ไปแล้ว ให้เริ่ม branch ใหม่จาก `origin/main` ล่าสุดก่อนทำงานต่อ
- ตอบผู้ใช้เป็นภาษาไทย
- ชื่อไฟล์ดาวน์โหลดใช้ตัวอักษรภาษาอังกฤษ (ชื่อภาษาไทยบางเบราว์เซอร์ทิ้ง)

## โครงสร้าง

- หน้าหลัก 5 หน้า: `index.html`, `projects.html`, `progress.html` (งานก่อสร้างและเอกสาร = ติดตามความก้าวหน้า + ศูนย์จัดทำเอกสารช่าง ในหน้าเดียว ใช้ `assets/pages/progress.js` + `documents.js`), `project-docs.html` (เอกสารโครงการ: เลือกหมู่บ้าน/โครงการ → ปุ่มเอกสารทุกแบบ + ประวัติเอกสารของโครงการ, `assets/pages/project-docs.js`), `disbursement.html` + สคริปต์ใน `assets/` และ `assets/pages/`
  - `project.html?id=` = หน้าข้อมูลโครงการแบบละเอียด (กดโครงการที่ใดก็มาหน้านี้ แทนหน้าต่างลอย) `assets/pages/project.js`
  - `documents.html` เหลือแค่ redirect ไป `progress.html#docs-center` (ลิงก์เก่ายังใช้ได้)
- `system.html` = ระบบเดิม (ปัจจุบัน v190) ใช้เป็นตัวสร้างเอกสารเบื้องหลังเท่านั้น (`system.html?engine=1`) เปิดตรงจะกลับ `index.html`
  - สร้างจาก `system/src/*` ด้วย `python3 tools/build_system.py` — ห้ามแก้ `system/src/` หรือ `system.html` ด้วยมือ
- `assets/gas/` = ตัวจำลอง Apps Script (Web Worker + IndexedDB) แทน `google.script.run`
- `assets/doc-engine.js` = ฟอร์ม/พรีวิว/พิมพ์เอกสารโครงการ (สั่งงาน v184 ใน iframe ที่ซ่อนอยู่)
- เข้าสู่ระบบด้วยชื่อผู้ใช้ + รหัสผ่าน (ไม่ต้องใช้อีเมล): บัญชีเป็นอีเมลภายใน `<ชื่อผู้ใช้>@users.sikaew-kongchang.app` สร้าง/ตั้งรหัส/ลบโดยผู้ดูแลผ่าน Edge Function `supabase/functions/staff-user` (ถ้ายังไม่ deploy เว็บสร้างบัญชีจากเบราว์เซอร์ผู้ดูแล ซึ่งต้องปิด Confirm email)
- `assets/cloud.js` = เข้าสู่ระบบ Supabase + ซิงก์ SK.db (ตาราง records), ชีท v184 (workbooks), ไฟล์แนบ (Storage `files`) — โครงสร้าง DB ใน `supabase/schema.sql` แก้ DB แล้วต้องอัปเดตไฟล์นี้ด้วย
- `assets/config.js` = URL + publishable key ของ Supabase
- `assets/personnel.js` = รายชื่อจริง (ผู้ควบคุมงาน บุคลากร ผู้บริหาร หมู่บ้าน) สร้างจาก `system/src` ด้วย `tools/build_system.py` — ห้ามแก้ด้วยมือ
- `assets/tambon-map.js` = ขอบเขตตำบล (ชีท "ขอบเขตแผนที่" หรือ OpenStreetMap) + เส้นแบ่งหมู่บ้านจากชีท + เครื่องมือวาดขอบเขต (เจ้าหน้าที่) — ทุกแผนที่ปิดซูมด้วยลูกกลิ้งเมาส์
- `assets/news.js` (หน้าแรกไม่แสดงกล่องข่าวแล้ว ตามที่ผู้ใช้ขอ) = ข่าวจากเพจ Facebook กองช่าง (ตาราง news_posts, Edge Function `supabase/functions/facebook-sync` ต้องตั้ง secret FB_PAGE_TOKEN; เจ้าหน้าที่ลงข่าวเองได้ id `manual-*` รูปใน bucket `news`) + รูปเข้าโครงการที่ตรงกัน
- `assets/word-export.js` = บันทึกพรีวิวเป็น .docx (สร้าง WordprocessingML เอง วัดตำแหน่งจากพรีวิว: แถวหัวหนังสือใช้แท็บ+เส้นประ, แถวหลายช่องเป็นตารางไร้เส้น, ครุฑวางตายตัว) — ตรวจผลด้วย LibreOffice (`apt-get install libreoffice-writer`) แปลงเป็น PDF
- ประวัติเอกสาร: ทุกเอกสารที่สร้างบันทึกสำเนา HTML ลงทะเบียนเอกสาร (`SK.db.data.documents`, format `html`, `docKey`, `variant` = สัปดาห์/งวด) เปิดซ้ำผ่าน `SK.docEngine.reopen` — สร้างซ้ำ (แบบ+โครงการ+สัปดาห์เดียวกัน) แทนที่ฉบับเดิม ไม่เพิ่มรายการซ้ำ; แสดงชื่อเอกสารภาษาไทย (`SK.flows.docName`) ไม่ใช่ชื่อไฟล์
- `assets/doc-standard.js` = จัดรูปแบบ "บันทึกข้อความ" ทุกเอกสารตามมาตรฐานการพิมพ์หนังสือราชการ (ขอบ 3/2/2.5/2 ซม., TH Sarabun PSK 16pt, ครุฑ 1.5 ซม., หัว 29pt/35pt, ป้าย 20pt, ย่อหน้า 2.5 ซม., ลงชื่อกึ่งกลางหน้า) — ทำหลังระบบเดิมสร้างเอกสาร ไม่แก้ system/src
- `assets/theme-v184.css` = ธีมตามระบบเดิม v184 (ผู้ใช้เลือก): ฟอนต์ Prompt, เมนูซ้ายพื้นน้ำเงินไล่สี + ไอคอนกล่องสีไล่เฉด + ลูกศร, การ์ดขาวขอบบาง, แท็บน้ำเงินไล่สี, การ์ดหัวหน้า (`.sk-page-head` ใส่โดย ui.js) มีแถบซ้าย 6px — โหลดหลัง styles.css ทุกหน้า
- เมนูด้านซ้ายทุกหน้าสร้างจากเมนูของระบบเดิมใน `system/src/Dashboard.html` ด้วย `python3 tools/sidebar.py` (รันใหม่ทุกครั้งที่อัปเดตระบบเดิม) — แต่ละเมนูลิงก์ `index.html?page=<ฟังก์ชัน openXxx ของระบบเดิม>`
- หน้าแรก/หน้าเมนู (`index.html` + `assets/pages/app.js`) = หน้าของระบบเดิมจริง (system.html ใน iframe ที่มองเห็น ซ่อนเมนูซ้าย/แถบบนของระบบเดิม) เปิดหน้าตามเมนูด้วยฟังก์ชันของระบบเดิม หน้าตาเหมือนโค้ดทุกหน้า; หน้าเสริมของเว็บ (projects/progress/project-docs/project/disbursement) ยังอยู่แต่ไม่มีในเมนู
- `assets/thai-date.js` = ปฏิทินภาษาไทย แทน `<input type="date">` ทุกช่องอัตโนมัติ
- ใช้ข้อมูลจริงเท่านั้น ห้ามใส่ข้อมูล/รายชื่อ/ตัวเลขสมมุติในหน้าเว็บ (โครงการมาจากชีท "ฐานข้อมูลโครงการ" ของระบบเอกสาร)
- `assets/realdata.js` = ใช้ข้อมูลจริงที่นำเข้าจาก Google Sheet (.xlsx) หรือส่งโครงการตัวอย่างให้ตัวสร้างเอกสารถ้ายังไม่นำเข้า

## คำสั่ง

```bash
npm run build              # สร้าง assets/styles.css ใหม่ (Tailwind) ทุกครั้งที่เพิ่มคลาสใหม่
python3 tools/build_system.py
python3 -m http.server 8765   # ทดสอบในเครื่อง (ต้องเปิดผ่าน http ไม่ใช่ file://)
node tools/build-dist.js      # สร้าง dist/ แบบที่ Vercel ใช้
```
