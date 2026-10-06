# สร้างเมนูด้านซ้ายทุกหน้าจากเมนูของระบบเดิม (system/src/Dashboard.html) ให้เหมือนโค้ดทุกเมนู: python3 tools/sidebar.py
# แต่ละเมนูเปิดหน้าเดิมของระบบ (ฟังก์ชัน openXxx ในโค้ด) ในหน้า index.html?page=<ชื่อฟังก์ชัน>
import re, sys, html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index.html', 'projects.html', 'project.html', 'progress.html', 'project-docs.html', 'disbursement.html']
dash = (ROOT / 'system' / 'src' / 'Dashboard.html').read_text(encoding='utf-8')
nav = re.search(r'<nav class="app-menu-groups"[^>]*>(.*?)</nav>', dash, re.S).group(1)

def link(fn, inner_icon, label, arrow='›'):
    return ('<a class="sk-menu" href="index.html?page=%s" data-page="%s">%s<b>%s</b><span class="sk-menu-arrow" aria-hidden="true">%s</span></a>'
            % (fn, fn, inner_icon, label, arrow))

def icon_of(btn):
    m = re.search(r'<span class="app-menu-icon ([\w-]+)">(.*?)</span>', btn, re.S)
    cls, inner = m.group(1), m.group(2)
    if not inner.strip().startswith('<svg'): inner = '<b class="sk-menu-pct">%s</b>' % inner.strip()
    return '<span class="sk-menu-icon %s">%s</span>' % (cls, inner)

out = []
# เมนูหลักตามลำดับในโค้ด
for m in re.finditer(r'<button type="button" class="sidebar-(?:direct|game)-link[^"]*"[^>]*onclick="runAppMenuAction\(this,(\w+)\)">(.*?)</button>', nav, re.S):
    fn, body = m.group(1), m.group(2)
    label = re.search(r'<b>(.*?)</b>', body).group(1)
    out.append((m.start(), link(fn, icon_of(body), label)))
# กลุ่ม "ระบบ"
g = re.search(r'<details class="app-menu-group">(.*?)</details>', nav, re.S)
if g:
    summ = re.search(r'<summary>(.*?)</summary>', g.group(1), re.S).group(1)
    label = re.search(r'<b>(.*?)</b>', summ)
    items = ''.join('<a href="index.html?page=%s" data-page="%s">%s</a>' % (fn, fn, html.escape(re.sub(r'<[^>]+>', '', t).strip()))
                    for fn, t in re.findall(r'onclick="runAppMenuAction\(this,(\w+)\)">(.*?)</button>', g.group(1), re.S))
    out.append((g.start(), '<details class="sk-menu-group"><summary class="sk-menu">%s<b>%s</b><span class="sk-menu-arrow" aria-hidden="true">⌄</span></summary><div class="sk-submenu">%s</div></details>'
                % (icon_of(summ), label.group(1) if label else 'ระบบ', items)))
out.sort()
# หน้า "กรอกข้อมูลโครงการ" ของระบบหลัก (ปุ่ม "สร้างโครงการใหม่" ในหน้าแรกของโค้ด) เป็นเมนูแรก
m = re.search(r'class="dashboard-create-project"[^>]*onclick="(openEntryGate)\(\)"><svg viewBox="0 0 24 24" aria-hidden="true">(.*?)</svg>', dash, re.S)
if m:
    out.insert(0, (-1, link(m.group(1), '<span class="sk-menu-icon teal"><svg viewBox="0 0 24 24" aria-hidden="true">%s</svg></span>' % m.group(2), 'กรอกข้อมูลโครงการ')))
title = re.search(r'<h1 id="title">(.*?)</h1>', dash).group(1)
inner = ''.join([
    '<div class="sk-side-top">',
    '<a href="index.html" class="sk-brand" title="กลับหน้าแรก"><span class="sk-brand-logo"><img src="assets/logo-sikaew.jpg" alt="ตราสัญลักษณ์เทศบาลตำบลสีแก้ว"/></span>',
    '<span class="sk-brand-text"><b>%s</b><small id="sk-brand-sub">ฐานข้อมูลโครงการ</small></span></a>' % title,
    '<nav class="sk-menu-list" aria-label="เมนูหลัก">', ''.join(x for _, x in out), '</nav></div>',
    '<div class="sk-side-user"><div class="sk-side-user-text"><b id="sk-side-user-name">ผู้เยี่ยมชม | ดู Dashboard</b><small id="sk-side-user-role">เข้าสู่ระบบเพื่อบันทึกและซิงก์ข้อมูล</small></div>',
    '<button type="button" data-action="sk-side-account" class="sk-side-login" id="sk-side-login">เข้าสู่ระบบ</button></div>'])
for f in PAGES:
    p = ROOT / f
    s = p.read_text(encoding='utf-8')
    m = re.search(r'(<aside id="sidebar"[^>]*>)(.*?)(</aside>)', s, re.S)
    if not m: print('no sidebar', f); continue
    s = s[:m.start()] + m.group(1) + inner + m.group(3) + s[m.end():]
    p.write_text(s, encoding='utf-8')
    print('ok', f, len(out), 'menus')
