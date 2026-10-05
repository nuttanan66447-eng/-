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
  - `documents.html` เหลือแค่ redirect ไป `progress.html#docs-center` (ลิงก์เก่ายังใช้ได้)
- `system.html` = ระบบ v184 เดิม ใช้เป็นตัวสร้างเอกสารเบื้องหลังเท่านั้น (`system.html?engine=1`) เปิดตรงจะกลับ `index.html`
  - สร้างจาก `system/src/*` ด้วย `python3 tools/build_system.py` — ห้ามแก้ `system/src/` หรือ `system.html` ด้วยมือ
- `assets/gas/` = ตัวจำลอง Apps Script (Web Worker + IndexedDB) แทน `google.script.run`
- `assets/doc-engine.js` = ฟอร์ม/พรีวิว/พิมพ์เอกสารโครงการ (สั่งงาน v184 ใน iframe ที่ซ่อนอยู่)
- `assets/cloud.js` = เข้าสู่ระบบ Supabase + ซิงก์ SK.db (ตาราง records), ชีท v184 (workbooks), ไฟล์แนบ (Storage `files`) — โครงสร้าง DB ใน `supabase/schema.sql` แก้ DB แล้วต้องอัปเดตไฟล์นี้ด้วย
- `assets/config.js` = URL + publishable key ของ Supabase
- `assets/personnel.js` = รายชื่อจริง (ผู้ควบคุมงาน บุคลากร ผู้บริหาร หมู่บ้าน) สร้างจาก `system/src` ด้วย `tools/build_system.py` — ห้ามแก้ด้วยมือ
- `assets/tambon-map.js` = ขอบเขตตำบล (ชีท "ขอบเขตแผนที่" หรือ OpenStreetMap) + เส้นแบ่งหมู่บ้านจากชีท + เครื่องมือวาดขอบเขต (เจ้าหน้าที่) — ทุกแผนที่ปิดซูมด้วยลูกกลิ้งเมาส์
- `assets/news.js` = ข่าวจากเพจ Facebook กองช่าง (ตาราง news_posts, Edge Function `supabase/functions/facebook-sync` ต้องตั้ง secret FB_PAGE_TOKEN; เจ้าหน้าที่ลงข่าวเองได้ id `manual-*` รูปใน bucket `news`) + รูปเข้าโครงการที่ตรงกัน
- `assets/word-export.js` = บันทึกพรีวิวเป็น .docx (สร้าง WordprocessingML เอง วัดตำแหน่งจากพรีวิว: แถวหัวหนังสือใช้แท็บ+เส้นประ, แถวหลายช่องเป็นตารางไร้เส้น, ครุฑวางตายตัว) — ตรวจผลด้วย LibreOffice (`apt-get install libreoffice-writer`) แปลงเป็น PDF
- ประวัติเอกสาร: ทุกเอกสารที่สร้างบันทึกสำเนา HTML ลงทะเบียนเอกสาร (`SK.db.data.documents`, format `html`, `docKey`) เปิดซ้ำผ่าน `SK.docEngine.reopen`
- `assets/doc-standard.js` = จัดรูปแบบ "บันทึกข้อความ" ทุกเอกสารตามมาตรฐานการพิมพ์หนังสือราชการ (ขอบ 3/2/2.5/2 ซม., TH Sarabun PSK 16pt, ครุฑ 1.5 ซม., หัว 29pt/35pt, ป้าย 20pt, ย่อหน้า 2.5 ซม., ลงชื่อกึ่งกลางหน้า) — ทำหลังระบบเดิมสร้างเอกสาร ไม่แก้ system/src
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
