# สร้างเมนูด้านซ้ายแบบระบบเดิม (v184) ให้ทุกหน้า: python3 tools/sidebar.py
# ไอคอน SVG และสีกล่องไอคอนตามระบบเดิม (system/src/Dashboard.html)
import re, sys, html
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
PAGES = {'index.html': 'dashboard', 'projects.html': 'projects', 'project.html': 'projects', 'progress.html': 'progress',
         'project-docs.html': 'project-docs', 'disbursement.html': 'disbursement'}
SVG = {
 'dashboard': 'M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9-3h7v10h-7V10Z',
 'projects': 'M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 4h18M8 15h8',
 'progress': 'M4 20h16M6 20V10l6-6 6 6v10M10 20v-5h4v5M9 11h6',
 'project-docs': 'M6 3h9l4 4v14H6V3Zm9 0v5h5M9 12h7M9 16h7M9 8h2',
 'disbursement': 'M3 6h18v12H3V6Zm4 3h.01M17 15h.01M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
 'report': 'M7 3h10a2 2 0 0 1 2 2v16l-7-3-7 3V5a2 2 0 0 1 2-2Zm2 3h6M9 10h6M9 14h4',
 'building': 'm3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7M8 9h.01M16 9h.01',
 'test': 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M8 15h8m-6-4h4',
 'tor': 'M6 3h9l4 4v14H6V3Zm9 0v5h5M9 12h7M9 16h7M9 8h2',
 'price': 'M12 2v20M17 6.5c0-1.4-2.2-2.5-5-2.5S7 5.1 7 6.5 9.2 9 12 9s5 1.1 5 2.5S14.8 14 12 14s-5 1.1-5 2.5S9.2 19 12 19s5-1.1 5-2.5',
 'k': 'M4 3h16v18H4V3Zm4 4h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2',
 'comp': 'M3 6h18v12H3V6Zm4 3h.01M17 15h.01M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
 'library': 'M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 4h18',
 'road': 'M8 3 5 21m11-18 3 18M12 4v3m0 4v3m0 4v2M3 21h18',
 'duration': 'M12 8v5l3 2M7 3h10M9 3v2m6-2v2M5 7a8 8 0 1 0 14 0M4 21h16',
 'evaluation': 'M7 3h10a2 2 0 0 1 2 2v16H5V5a2 2 0 0 1 2-2Zm3 0h4v3h-4V3Zm-2 7h8M8 14h5M8 18h3',
 'system': 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 4a7 7 0 0 0-.12-1.3l2-1.55-2-3.46-2.46 1a8 8 0 0 0-2.25-1.3L15.3 2h-4l-.38 3.39a8 8 0 0 0-2.25 1.3l-2.46-1-2 3.46 2 1.55A7 7 0 0 0 6.1 12c0 .44.04.87.12 1.3l-2 1.55 2 3.46 2.46-1a8 8 0 0 0 2.25 1.3L11.3 22h4l.38-3.39a8 8 0 0 0 2.25-1.3l2.46 1 2-3.46-2-1.55c.08-.43.12-.86.12-1.3Z',
 'web': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z',
 'egp': 'm14 4 6 6-9 9H5v-6l9-9ZM12 6l6 6',
 'dla': 'M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M2 10h20L12 3 2 10Z',
}
def icon(key, color, text=None):
    inner = '<b class="sk-menu-pct">%</b>' if text else '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="%s"/></svg>' % SVG[key]
    return '<span class="sk-menu-icon %s">%s</span>' % (color, inner)
def item(href, key, color, label, path=None, menu=None, text=None, ext=False):
    attrs = ''
    if path: attrs += ' data-path="%s"' % path
    if menu: attrs += ' data-menu="%s"' % html.escape(menu)
    if ext: attrs += ' target="_blank" rel="noopener"'
    arrow = '<span class="sk-menu-arrow" aria-hidden="true">%s</span>' % ('↗' if ext else '›')
    return '<a class="sk-menu" href="%s"%s>%s<b>%s</b>%s</a>' % (html.escape(href), attrs, icon(key, color, text), label, arrow)
def docs(keys, menu): return 'project-docs.html?docs=%s&menu=%s' % (keys, menu)
MAIN = [
 ('index.html', 'dashboard', 'green', 'ภาพรวมโครงการ', 'dashboard'),
 ('projects.html', 'projects', 'teal', 'ทะเบียนโครงการ', 'projects'),
 ('progress.html', 'progress', 'orange', 'งานก่อสร้างและเอกสาร', 'progress'),
 ('project-docs.html', 'project-docs', 'pink', 'เอกสารโครงการ', 'project-docs'),
 ('disbursement.html', 'disbursement', 'compensation', 'เบิกจ่ายและรายงาน สถ.', 'disbursement'),
]
WORK = [
 (docs('combined,memo,weeklyWork,weeklyPerformance,sCurve,workReduction,photo,sign', 'รายงานช่าง'), 'report', 'green', 'รายงานช่าง', 'รายงานช่าง', None),
 (docs('building,a1', 'ตรวจสอบอาคาร'), 'building', 'building', 'ตรวจสอบอาคาร', 'ตรวจสอบอาคาร', None),
 (docs('testResult', 'ผลทดสอบ'), 'test', 'test', 'ผลทดสอบ', 'ผลทดสอบ', None),
 (docs('torSpecific,torEbidding', 'ร่าง TOR'), 'tor', 'tor', 'ร่าง TOR', 'ร่าง TOR', None),
 (docs('centralPrice', 'กำหนดราคากลาง'), 'price', 'price', 'กำหนดราคากลาง', 'กำหนดราคากลาง', None),
 (docs('lowBid', 'แจ้งราคาต่ำกว่าราคากลาง ๑๕%'), 'price', 'low-bid', 'แจ้งราคาต่ำกว่าราคากลาง ๑๕%', 'แจ้งราคาต่ำกว่าราคากลาง ๑๕%', '%'),
 (docs('kValue,kInvite,kMeeting', 'รายงานค่า K'), 'k', 'kreport', 'รายงานค่า K', 'รายงานค่า K', None),
 (docs('compTor,compInspection,compSupervisor', 'เบิกค่าตอบแทน'), 'comp', 'compensation', 'เบิกค่าตอบแทน', 'เบิกค่าตอบแทน', None),
 ('progress.html?tab=drawing#docs-center', 'library', 'orange', 'เอกสารดาวน์โหลด', 'เอกสารดาวน์โหลด', None),
 ('index.html?tab=localRoad', 'road', 'cyan', 'คุมสายทาง', 'คุมสายทาง', None),
 ('project-docs.html?tool=duration&docs=-&menu=คำนวณงวดงาน', 'duration', 'duration', 'คำนวณงวดงาน', 'คำนวณงวดงาน', None),
 (docs('evaluation', 'แบบประเมิน'), 'evaluation', 'evaluation', 'แบบประเมิน', 'แบบประเมิน', None),
]
LINKS = [
 ('https://www.sikaew.go.th/index/', 'web', 'cyan', 'เว็บไซต์เทศบาลตำบลสีแก้ว'),
 ('https://www.gprocurement.go.th/', 'egp', 'price', 'ระบบ e-GP กรมบัญชีกลาง'),
 ('https://www.dla.go.th/', 'dla', 'test', 'กรมส่งเสริมการปกครองท้องถิ่น'),
]
def build():
    out = ['<div class="sk-side-top">',
      '<a href="index.html" class="sk-brand"><span class="sk-brand-logo"><img src="assets/logo-sikaew.jpg" alt="ตราสัญลักษณ์เทศบาลตำบลสีแก้ว"/></span>',
      '<span class="sk-brand-text"><b>โครงการกองช่างเทศบาลตำบลสีแก้ว</b><small id="sk-brand-sub">ฐานข้อมูลโครงการ • กองช่างวิศวกรรมโยธา</small></span></a>',
      '<p class="sk-side-label">ระบบงานหลัก</p><nav class="sk-menu-list" aria-label="ระบบงานหลัก">']
    out += [item(h, k, c, l, path=p) for h, k, c, l, p in MAIN]
    out += ['</nav><p class="sk-side-label">งานเอกสารช่าง</p><nav class="sk-menu-list" aria-label="งานเอกสารช่าง">']
    out += [item(h, k, c, l, menu=m, text=t) for h, k, c, l, m, t in WORK]
    out += ['<details class="sk-menu-group"><summary class="sk-menu">' + icon('system', 'pink') + '<b>ระบบ</b><span class="sk-menu-arrow" aria-hidden="true">⌄</span></summary>',
            '<div class="sk-submenu"><button type="button" data-action="data-panel">นำเข้า / ส่งออกข้อมูล Excel</button><button type="button" data-action="sk-side-account">บัญชีผู้ใช้ / เข้าสู่ระบบ</button></div></details>',
            '</nav><p class="sk-side-label">ลิงก์ที่เกี่ยวข้อง</p><nav class="sk-menu-list" aria-label="ลิงก์ภายนอก">']
    out += [item(h, k, c, l, ext=True) for h, k, c, l in LINKS]
    out += ['</nav></div>',
      '<div class="sk-side-user"><div class="sk-side-user-text"><b id="sk-side-user-name">ผู้เยี่ยมชม</b><small id="sk-side-user-role">กองช่าง เทศบาลตำบลสีแก้ว อ.เมือง จ.ร้อยเอ็ด</small></div>',
      '<button type="button" data-action="sk-side-account" class="sk-side-login" id="sk-side-login">เข้าสู่ระบบ</button></div>']
    return ''.join(out)
def main():
    inner = build()
    for f, path in PAGES.items():
        p = ROOT + '/' + f
        s = open(p, encoding='utf-8').read()
        m = re.search(r'(<aside id="sidebar"[^>]*>)(.*?)(</aside>)', s, re.S)
        if not m: print('no sidebar', f); continue
        cur = inner.replace('data-path="%s"' % path, 'data-path="%s" aria-current="page"' % path, 1)
        s = s[:m.start()] + m.group(1) + cur + m.group(3) + s[m.end():]
        open(p, 'w', encoding='utf-8').write(s)
        print('ok', f)
main()
