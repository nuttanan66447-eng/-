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
