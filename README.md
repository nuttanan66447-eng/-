# ระบบกองช่าง เทศบาลตำบลสีแก้ว (รุ่นใหม่)

ระบบบริหารโครงการและเอกสารราชการ กองช่าง เทศบาลตำบลสีแก้ว อ.เมืองร้อยเอ็ด จ.ร้อยเอ็ด
เปิดใช้งาน: https://sikaew-kongchang.vercel.app (Vercel) • https://nuttanan66447-eng.github.io/-/ (GitHub Pages)

หน้าตาตามไฟล์ตัวอย่างใน `design/` (Civic Architectural Glass — `design/DESIGN.md`, `design/dashboard.png`, `design/document-editor.png`)

## เมนู

| เมนู | ที่อยู่ | ทำอะไร |
|---|---|---|
| ภาพรวมโครงการ | `#/overview` | แดชบอร์ด: ตัวเลขหลัก ทะเบียนงาน แผนที่ ใกล้ครบสัญญา ผู้ควบคุมงาน ทางลัดเอกสาร |
| ทะเบียนโครงการ | `#/projects` | ค้นหา/กรองโครงการ (ปีงบ หมู่บ้าน ประเภท สถานะ) แบบตารางหรือการ์ด |
| ข้อมูลโครงการ | `#/project/P-001` | ภาพรวม ข้อมูลทั้งหมด คณะกรรมการ รูปภาพ บันทึกหน้างาน เอกสาร |
| กรอกข้อมูลโครงการ | `#/entry`, `#/entry/P-001` | แบบฟอร์มของระบบหลัก (เพิ่ม/แก้ไขโครงการ) |
| พิมพ์เอกสารราชการ | `#/documents?project=P-001&doc=memo` | Smart Editor: เลือกแบบ → กรอก → สร้าง → แก้ไขข้อความ/พิมพ์/Word + ประวัติ |
| ติดตามงาน & รูปภาพ | `#/tracking` | ผลงานเทียบแผน คลังรูปภาพ บันทึกหน้างานล่าสุด |
| แผนที่ GIS ตำบล | `#/map` | หมุดโครงการ + ขอบเขตตำบล/หมู่บ้าน |
| เครื่องมือระบบหลัก | `#/tools`, `#/system/openXxx` | ทุกหน้าของระบบหลัก v190 |
| ผู้ใช้และสิทธิ์ | `#/users` | บัญชีเจ้าหน้าที่ (ชื่อผู้ใช้ + รหัสผ่าน) |
| ข้อมูล & นำเข้า Excel | `#/data` | นำเข้า/ส่งออกชีท สำรองข้อมูล |

## ข้อมูล

- ข้อมูลโครงการ/บุคลากร/ประวัติของระบบหลัก = ชีท (รูปแบบเดียวกับ Google Sheet เดิม) ทำงานในเบราว์เซอร์ด้วย `assets/gas/` (Web Worker + IndexedDB)
- รูปภาพ บันทึกหน้างาน ประวัติเอกสาร = `SK.store` (localStorage + IndexedDB สำหรับไฟล์)
- เข้าสู่ระบบแล้ว ทุกอย่างซิงก์กับ Supabase (`records`, `workbooks`, Storage `files`, สิทธิ์ใน `staff`) — โครงสร้างใน `supabase/schema.sql`

## คำสั่ง

```bash
npm run build                 # Tailwind -> assets/css/app.css
python3 tools/build_system.py # สร้าง system.html + assets/personnel.js จาก system/src
python3 -m http.server 8765   # ทดสอบในเครื่อง
node tools/build-dist.js      # dist/ แบบที่ Vercel ใช้
```
