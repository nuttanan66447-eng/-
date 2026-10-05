// สร้างโฟลเดอร์ dist/ สำหรับเผยแพร่บน Vercel: หน้าเว็บ + assets + โค้ดระบบเอกสาร (ไม่รวมไฟล์ออกแบบ/ต้นฉบับ)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of fs.readdirSync(root)) if (f.endsWith('.html')) fs.copyFileSync(path.join(root, f), path.join(out, f));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
fs.cpSync(path.join(root, 'system', 'server'), path.join(out, 'system', 'server'), { recursive: true });
console.log('dist/ ready');
