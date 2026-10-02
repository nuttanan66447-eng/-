# CLAUDE.md

เว็บไซต์กองช่าง เทศบาลตำบลสีแก้ว — เว็บ static บน GitHub Pages (https://nuttanan66447-eng.github.io/-/)

## กติกาการทำงาน (สำคัญ)

- **Merge ทุกครั้ง:** เมื่อแก้ไขเสร็จและทดสอบผ่าน ให้ commit → push → เปิด PR เข้า `main` → merge PR ทันที ไม่ต้องถามก่อน
- ถ้า PR ของ branch เดิม merge ไปแล้ว ให้เริ่ม branch ใหม่จาก `origin/main` ล่าสุดก่อนทำงานต่อ
- ตอบผู้ใช้เป็นภาษาไทย
- ชื่อไฟล์ดาวน์โหลดใช้ตัวอักษรภาษาอังกฤษ (ชื่อภาษาไทยบางเบราว์เซอร์ทิ้ง)

## โครงสร้าง

- หน้าหลัก 5 หน้า: `index.html`, `projects.html`, `progress.html`, `documents.html`, `disbursement.html` + สคริปต์ใน `assets/` และ `assets/pages/`
- `system.html` = ระบบ v184 เดิม ใช้เป็นตัวสร้างเอกสารเบื้องหลังเท่านั้น (`system.html?engine=1`) เปิดตรงจะกลับ `index.html`
  - สร้างจาก `system/src/*` ด้วย `python3 tools/build_system.py` — ห้ามแก้ `system/src/` หรือ `system.html` ด้วยมือ
- `assets/gas/` = ตัวจำลอง Apps Script (Web Worker + IndexedDB) แทน `google.script.run`
- `assets/doc-engine.js` = ฟอร์ม/พรีวิว/พิมพ์เอกสารโครงการ (สั่งงาน v184 ใน iframe ที่ซ่อนอยู่)
- `assets/realdata.js` = ใช้ข้อมูลจริงที่นำเข้าจาก Google Sheet (.xlsx) หรือส่งโครงการตัวอย่างให้ตัวสร้างเอกสารถ้ายังไม่นำเข้า

## คำสั่ง

```bash
npm run build              # สร้าง assets/styles.css ใหม่ (Tailwind) ทุกครั้งที่เพิ่มคลาสใหม่
python3 tools/build_system.py
python3 -m http.server 8765   # ทดสอบในเครื่อง (ต้องเปิดผ่าน http ไม่ใช่ file://)
```
