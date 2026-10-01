"""Builds the site pages from the Google Stitch exports in design/src/.

Run: npm run build   (this script writes *.html at the repo root, then
Tailwind compiles assets/styles.css from the classes they use)
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "src"

# data-path in Stitch nav -> (source export, output file, page title)
PAGES = {
    "dashboard":    ("dashboard.html",         "index.html",        "ภาพรวมโครงการ"),
    "projects":     ("project_directory.html", "projects.html",     "ทะเบียนโครงการ"),
    "progress":     ("site_progress.html",     "progress.html",     "ติดตามความก้าวหน้า"),
    "documents":    ("e_document.html",        "documents.html",    "ศูนย์จัดทำเอกสารช่าง"),
    "disbursement": ("disbursement.html",      "disbursement.html", "เบิกจ่ายและรายงาน สถ."),
}

def sub1(pattern, repl, text):
    out, n = re.subn(pattern, repl, text, count=1)
    if n != 1:
        raise SystemExit(f"pattern not found: {pattern}")
    return out

for key, (src, out, title) in PAGES.items():
    html = (SRC / src).read_text(encoding="utf-8")

    head = (f'<title>{title} | กองช่าง เทศบาลตำบลสีแก้ว</title>'
            '<meta name="description" content="ระบบบริหารโครงการ กองช่าง เทศบาลตำบลสีแก้ว อ.เมือง จ.ร้อยเอ็ด"/>'
            '<link rel="icon" type="image/svg+xml" href="assets/logo.svg"/>')
    html = sub1(r'<meta charset="utf-8"/>', '<meta charset="utf-8"/>' + head, html)

    # Tailwind Play CDN + inline config -> compiled assets/styles.css (see tailwind.config.js)
    html = sub1(r'<style>.*?</style>', '', html)
    html = sub1(r'<script src="https://cdn\.tailwindcss\.com"></script>', '', html)
    html = sub1(r'<script id="tailwind-config">.*?</script>',
                '<link rel="stylesheet" href="assets/styles.css"/>', html)

    # Sidebar navigation -> real pages
    for k, (_, o, _) in PAGES.items():
        html = sub1(rf'data-path="{k}" href="#"', f'data-path="{k}" href="{o}"', html)

    # Logo + director photo
    html = sub1(r'<span class="material-symbols-outlined">account_balance</span>',
                '<img src="assets/logo.svg" alt="ตราสัญลักษณ์กองช่าง" class="w-10 h-10"/>', html)
    html = sub1(r'alt="Profile" class="([^"]*)" src="[^"]*"',
                r'alt="นายธีรภัทร ชาญวิทย์" class="\1" src="assets/director.jpg"', html)

    # Responsive shell: off-canvas sidebar below lg
    html = sub1(r'<aside class="fixed left-0 top-0 h-full w-72',
                '<div id="sidebar-backdrop" class="hidden fixed inset-0 z-[45] bg-tertiary/60 lg:hidden"></div>'
                '<aside id="sidebar" class="-translate-x-full lg:translate-x-0 transition-transform duration-200 overflow-y-auto fixed left-0 top-0 h-full w-72', html)
    html = sub1(r'class="pl-72 flex', 'class="lg:pl-72 flex', html)
    html = sub1(r'<header class="fixed top-0 left-72 right-0 h-16 ([^"]*)px-space-xl',
                r'<header class="fixed top-0 left-0 lg:left-72 right-0 h-16 \1px-4 lg:px-space-xl gap-space-sm', html)
    html = sub1(r'(<header[^>]*>)<div class="flex items-center gap-space-md">',
                r'\1<div class="flex items-center gap-space-md min-w-0">'
                '<button id="sidebar-toggle" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="เปิดเมนู" '
                'class="lg:hidden p-space-xs -ml-space-xs text-primary"><span class="material-symbols-outlined">menu</span></button>', html)
    html = sub1(r'<span class="font-headline-sm text-headline-sm text-primary tracking-tight">',
                '<span class="font-headline-sm text-headline-sm text-primary tracking-tight truncate">', html)
    # Hide secondary header chips on small screens
    html = sub1(r'<span class="bg-surface-container-high text-primary font-label-sm',
                '<span class="hidden md:flex shrink-0 bg-surface-container-high text-primary font-label-sm', html)
    html = sub1(r'<div class="flex items-center gap-space-xs bg-surface-container-low text-secondary',
                '<div class="hidden md:flex items-center gap-space-xs bg-surface-container-low text-secondary', html)
    html = sub1(r'<div class="flex flex-col text-left">', '<div class="hidden sm:flex flex-col text-left">', html)
    html = sub1(r'<div class="flex items-center gap-space-lg">', '<div class="flex items-center gap-space-sm md:gap-space-lg shrink-0">', html)

    # Stitch's py-* overrode pt-16, putting content under the fixed header
    html = sub1(r'<main class="w-full pt-16 bg-surface flex-1 px-space-xl py-space-lg">',
                '<main class="w-full min-w-0 pt-20 pb-space-xl bg-surface flex-1 px-4 lg:px-space-xl">', html)

    html = sub1(r'</body>', '<script src="assets/app.js"></script></body>', html)
    (ROOT / out).write_text(html, encoding="utf-8")
    print("wrote", out)
