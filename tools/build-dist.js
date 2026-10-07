// สร้างโฟลเดอร์ dist/ สำหรับเผยแพร่บน Vercel: หน้าเว็บ + assets + โค้ดระบบหลัก (ไม่รวมไฟล์ออกแบบ/ต้นฉบับ)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of ['index.html', 'system.html']) fs.copyFileSync(path.join(root, f), path.join(out, f));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), {
  recursive: true,
  filter: (src) => !src.endsWith(path.join('css', 'tailwind.css'))
});
fs.cpSync(path.join(root, 'system', 'server'), path.join(out, 'system', 'server'), { recursive: true });

// ลิงก์หน้าเก่า (เว็บรุ่นก่อน) พาไปหน้าใหม่ในเว็บเดียว
const OLD = {
  'projects.html': "'#/projects'",
  'project.html': "(q.get('id') ? '#/project/' + encodeURIComponent(q.get('id')) : '#/projects')",
  'progress.html': "(q.get('id') ? '#/project/' + encodeURIComponent(q.get('id')) + '?tab=diary' : '#/tracking')",
  'project-docs.html': "'#/documents' + (q.get('id') ? '?project=' + encodeURIComponent(q.get('id')) : '')",
  'documents.html': "'#/documents'",
  'disbursement.html': "'#/projects'"
};
for (const [file, target] of Object.entries(OLD)) {
  fs.writeFileSync(path.join(out, file), '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>กองช่าง เทศบาลตำบลสีแก้ว</title>' +
    '<script>var q=new URLSearchParams(location.search);location.replace(\'index.html\'+' + target + ');</script></head>' +
    '<body><a href="index.html">ไปหน้าหลัก</a></body></html>');
}
console.log('dist/ ready');
