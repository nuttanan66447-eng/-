"""Assemble system.html (ระบบงานเอกสาร v184) from the original Apps Script sources.

The files in system/src/ are kept exactly as exported from Apps Script
(Index.html, Style.html, Dashboard.html, Client.html, Config.gs, Code.gs).
To update to a newer version, replace those files and run:

    python3 tools/build_system.py

Server code (Config.gs + Code.gs) runs in the browser inside a Web Worker
(assets/gas/gas-worker.js) and google.script.run is provided by
assets/gas/gas-bridge.js, so no Apps Script deployment is needed.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'system' / 'src'


def read(name):
    return (SRC / name).read_text(encoding='utf-8')


def appTitle():
    m = re.search(r"APP_TITLE:\s*'([^']*)'", read('Config.gs'))
    return m.group(1) if m else 'ระบบงานกองช่าง'


html = read('Index.html')
title = appTitle()
html = html.replace('<?= appTitle ?>', title)

# Local copies of the libraries (works offline and on GitHub Pages)
html = html.replace('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'assets/vendor/leaflet/leaflet.css')
html = html.replace('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'assets/vendor/leaflet/leaflet.js')
html = html.replace('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js', 'assets/vendor/chartjs/chart.umd.min.js')

head_extra = ('<link rel="icon" type="image/png" href="assets/favicon.png"/>'
              '<link rel="stylesheet" href="assets/gas/data-panel.css"/>')
html = html.replace('</head>', head_extra + '\n</head>', 1)

# หน้านี้เป็นตัวสร้างเอกสารเบื้องหลังเท่านั้น (system.html?engine=1) — เปิดตรง ๆ ให้กลับหน้าเว็บหลัก
redirect = ("<script>if(!/[?&]engine=1(&|$)/.test(location.search))"
            "location.replace('index.html');</script>")
html = html.replace('<head>', '<head>\n' + redirect, 1)

bridge = ('<script src="assets/gas/gas-bridge.js"></script>\n'
          '<script src="assets/vendor/xlsx/xlsx.full.min.js"></script>\n'
          '<script src="assets/gas/data-panel.js"></script>\n')

for name in ('Style', 'Dashboard', 'Client'):
    tag = "<?!= include('%s'); ?>" % name
    assert tag in html, tag
    content = read(name + '.html')
    if name == 'Client':
        content = bridge + content
    html = html.replace(tag, content)

assert '<?' not in html, 'unresolved Apps Script template tag'
(ROOT / 'system.html').write_text(html, encoding='utf-8')

server = ROOT / 'system' / 'server'
server.mkdir(parents=True, exist_ok=True)
(server / 'config.js').write_text(read('Config.gs'), encoding='utf-8')
(server / 'code.js').write_text(read('Code.gs'), encoding='utf-8')
print('wrote system.html (%d KB) and system/server/*.js' % (len(html.encode('utf-8')) // 1024))

# รายชื่อจริงจากระบบ v184 (ผู้ควบคุมงาน บุคลากรสำหรับคณะกรรมการ ผู้บริหาร หมู่บ้าน) ให้หน้าเว็บหลักใช้ร่วมกัน
import json as _json
import re as _re

client = read('Client.html')
dashboard = read('Dashboard.html')


def js_array(name):
    m = _re.search(r'const %s = (\[.*?\n    \]);' % name, client, _re.S)
    assert m, name
    text = _re.sub(r'(\w+):', r'"\1":', m.group(1)).replace("'", '"')
    text = _re.sub(r',\s*([\]}])', r'\1', text)
    return _json.loads(text)


villages = [{'no': int(n), 'name': nm} for n, nm in
            _re.findall(r'<option value="หมู่ที่ (\d+) [^"]*" data-no="\d+" data-name="([^"]+)"', dashboard)]
personnel = {
    'supervisors': js_array('SUPERVISOR_OPTIONS'),
    'committee': js_array('COMMITTEE_OPTIONS'),
    'executives': js_array('EXECUTIVE_OPTIONS'),
    'villages': villages,
}
(ROOT / 'assets' / 'personnel.js').write_text(
    '// สร้างอัตโนมัติจาก system/src/Client.html และ Dashboard.html ด้วย tools/build_system.py — ห้ามแก้ด้วยมือ\n'
    'window.SK_PERSONNEL = ' + _json.dumps(personnel, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
print('wrote assets/personnel.js (%d supervisors, %d committee, %d villages)' % (
    len(personnel['supervisors']), len(personnel['committee']), len(villages)))
