# เว็บไซต์กองช่าง เทศบาลตำบลสีแก้ว

ระบบบริหารโครงการ กองช่าง (วิศวกรรมโยธา) เทศบาลตำบลสีแก้ว อ.เมือง จ.ร้อยเอ็ด
สร้างจากงานออกแบบ Google Stitch (`design/`)

## หน้าเว็บ

| ไฟล์ | หน้า |
|---|---|
| `index.html` | ภาพรวมโครงการ (แดชบอร์ด) |
| `projects.html` | ทะเบียนโครงการ |
| `progress.html` | ติดตามความก้าวหน้า / บันทึกหน้างาน |
| `documents.html` | ศูนย์จัดทำเอกสารช่าง (ปร.4 / ปร.5 / ปร.6) |
| `disbursement.html` | เบิกจ่ายและรายงาน สถ. / e-GP |

เป็นเว็บแบบ static เปิด `index.html` ได้ทันที หรือ deploy ขึ้น GitHub Pages ได้เลย
รองรับมือถือ (เมนูด้านข้างพับเก็บได้)

## แก้ไข / build ใหม่

```bash
npm install
npm run build   # สร้าง *.html จาก design/src แล้ว compile assets/styles.css
npm start       # เปิดดูที่ http://localhost:3000
```

- `design/src/` — HTML ต้นฉบับจาก Stitch, `design/DESIGN.md` — design system, `design/screens/` — ภาพตัวอย่าง
- `design/build.py` — เชื่อมเมนู, ปรับ layout ให้รองรับมือถือ, ใส่โลโก้/รูปผู้อำนวยการ
- `tailwind.config.js` — สี ฟอนต์ ระยะห่าง ตาม design system
- ข้อมูลในหน้าเว็บเป็นข้อมูลตัวอย่าง ปุ่มที่ยังไม่มีฟังก์ชันจะแสดงข้อความ "อยู่ระหว่างพัฒนา"
