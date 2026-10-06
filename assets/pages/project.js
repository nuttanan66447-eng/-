// หน้าข้อมูลโครงการแบบละเอียด (project.html?id=รหัสโครงการ)
// แสดงทุกช่องของโครงการจากชีท "ฐานข้อมูลโครงการ" จัดเป็นหมวด + ภาพรวมสัญญา ผลงาน แผนที่ และประวัติเอกสาร
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var projectId = new URLSearchParams(location.search).get('id') || '';

  // หมวดของข้อมูล (จับคู่จากชื่อหัวคอลัมน์ในชีท) — ช่องที่ไม่เข้าหมวดใดอยู่ใน "ข้อมูลอื่น ๆ"
  var GROUPS = [
    { icon: 'description', title: 'ข้อมูลโครงการ', re: /ชื่อโครงการ|หน่วยงาน|ประเภทงาน|งบประมาณ|ปีงบ|ปริมาณงาน|ระยะทาง|ขอบเขต|รายละเอียด/ },
    { icon: 'location_on', title: 'ที่ตั้งโครงการ', re: /หมู่|สถานที่|พิกัด|ละติจูด|ลองจิจูด|lat|lng/i },
    { icon: 'gavel', title: 'กรรมการ TOR / ราคากลาง', re: /TOR|ราคากลาง/ },
    { icon: 'contract', title: 'คำสั่งและสัญญาจ้าง', re: /คำสั่ง|สัญญา|ค่างาน|ค่าปรับ|วงเงิน|ระยะเวลา/ },
    { icon: 'event_available', title: 'การส่งมอบและตรวจรับงาน', re: /ลงงาน|ส่งมอบ|ตรวจรับงาน|วันตรวจรับ|สถานะ|ความก้าวหน้า|คงเหลือ|เบิกจ่าย/ },
    { icon: 'engineering', title: 'ผู้ควบคุมงาน', re: /ผู้ควบคุมงาน/ },
    { icon: 'storefront', title: 'ผู้รับจ้าง', re: /ผู้รับจ้าง|ภาษี|โทรศัพท์|เบอร์|ที่อยู่/ },
    { icon: 'groups', title: 'คณะกรรมการตรวจรับพัสดุ', re: /กรรมการ|ประธาน/ }
  ];
  var SYSTEM = /^(สร้างโดย|แก้ไขโดย|วันที่สร้าง|วันที่แก้ไข)$/;

  function project() { return SK.db.project(projectId); }

  function kpi(icon, label, value, sub) {
    return '<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-1 min-w-0">' +
      '<span class="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant"><span class="material-symbols-outlined text-[18px] text-primary">' + icon + '</span>' + label + '</span>' +
      '<span class="font-headline-md text-headline-md text-primary font-bold truncate">' + value + '</span>' +
      (sub ? '<span class="font-body-sm text-body-sm text-on-surface-variant">' + sub + '</span>' : '') + '</div>';
  }

  function groupsOf(p) {
    var fields = p.fields || {}, used = {}, out = [];
    GROUPS.forEach(function (g) {
      var rows = Object.keys(fields).filter(function (k) { return !used[k] && !SYSTEM.test(k) && g.re.test(k) && String(fields[k]).trim() !== ''; });
      rows.forEach(function (k) { used[k] = 1; });
      if (rows.length) out.push({ icon: g.icon, title: g.title, rows: rows });
    });
    var rest = Object.keys(fields).filter(function (k) { return !used[k] && !SYSTEM.test(k) && String(fields[k]).trim() !== ''; });
    if (rest.length) out.push({ icon: 'sticky_note_2', title: 'ข้อมูลอื่น ๆ', rows: rest });
    return out;
  }

  function render() {
    var p = project();
    var root = $('pj-root');
    if (!p) {
      $('pj-crumb').textContent = projectId || '-';
      root.innerHTML = '<div class="bg-surface-container-lowest rounded-xl shadow-sm py-12 flex flex-col items-center gap-3 text-center">' +
        '<span class="material-symbols-outlined text-[48px] text-outline">search_off</span>' +
        '<p class="font-headline-md text-headline-md text-primary font-bold">ไม่พบโครงการ ' + esc(projectId) + '</p>' +
        '<a href="projects.html" class="' + ui.btnClass('primary') + '">กลับไปทะเบียนโครงการ</a></div>';
      return;
    }
    $('pj-crumb').textContent = p.id;
    document.title = p.id + ' ' + p.name + ' | กองช่าง เทศบาลตำบลสีแก้ว';
    var cat = ref.CATEGORIES[p.category] || {};
    var today = ui.today();
    var days = p.start && p.end ? Math.round((new Date(p.end) - new Date(p.start)) / 86400000) : 0;
    var left = p.end ? Math.round((new Date(p.end) - new Date(today)) / 86400000) : null;
    var dpct = p.budget ? Math.round(p.disbursed / p.budget * 100) : 0;
    var actions =
      '<a href="progress.html?id=' + encodeURIComponent(p.id) + '" class="' + ui.btnClass('primary') + '"><span class="material-symbols-outlined text-[18px]">construction</span>ติดตามความก้าวหน้า</a>' +
      '<a href="project-docs.html?id=' + encodeURIComponent(p.id) + '" class="' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">description</span>เอกสารโครงการ</a>' +
      '<button type="button" data-action="edit-project" data-id="' + esc(p.id) + '" class="' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">edit</span>แก้ไขข้อมูล</button>' +
      (p.lat ? '<a href="https://www.google.com/maps?q=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener" class="' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">map</span>Google Maps</a>' : '') +
      (SK.deleteProject && p.rowNumber ? '<button type="button" data-action="delete-project" data-id="' + esc(p.id) + '" class="' + ui.btnClass('danger') + '"><span class="material-symbols-outlined text-[18px]">delete</span>ลบโครงการ</button>' : '');

    var groups = groupsOf(p);
    var docs = SK.db.data.documents.filter(function (d) { return d.projectId === p.id; });
    var diary = SK.flows.sortedDiary().filter(function (e) { return e.projectId === p.id; }).slice(0, 5);

    root.innerHTML =
      // ส่วนหัว
      '<section class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">' +
        '<div class="flex flex-wrap items-center gap-2">' + ui.statusBadge(p) +
          '<span class="px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm font-semibold">' + esc(cat.label || p.typeLabel || '') + '</span>' +
          '<span class="font-code-sm text-code-sm text-on-surface-variant">' + esc(p.id) + ' • สัญญา ' + esc(p.contractNo || '-') + '</span></div>' +
        '<h1 class="font-headline-lg text-headline-lg text-primary font-bold leading-snug">' + esc(p.name) + '</h1>' +
        '<p class="flex items-center gap-1 text-on-surface-variant"><span class="material-symbols-outlined text-[18px]">location_on</span>' + esc(ui.villageName(p.village)) + ' ต.สีแก้ว อ.เมืองร้อยเอ็ด จ.ร้อยเอ็ด' + (p.location && p.location !== '-' ? ' — ' + esc(p.location) : '') + '</p>' +
        '<div class="flex flex-wrap gap-2">' + actions + '</div>' +
      '</section>' +
      // ตัวเลขสำคัญ
      '<div class="grid grid-cols-2 xl:grid-cols-4 gap-space-md">' +
        kpi('payments', 'วงเงินตามสัญญา', money(p.budget) + ' บาท', esc(p.sourceLabel || ref.SOURCES[p.source] || '')) +
        kpi('account_balance_wallet', 'เบิกจ่ายแล้ว', money(p.disbursed) + ' บาท', dpct + '% ของวงเงิน • งวด ' + p.installment + '/' + p.installments) +
        kpi('date_range', 'ระยะเวลาสัญญา', days ? days + ' วัน' : '-', (p.start ? ui.dateShort(p.start) + ' – ' + ui.dateShort(p.end) : 'ยังไม่ระบุวันที่') + (left !== null && p.status !== 'completed' ? ' • ' + (left >= 0 ? 'เหลือ ' + left + ' วัน' : 'เกินกำหนด ' + (-left) + ' วัน') : '')) +
        '<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-2 min-w-0">' +
          '<span class="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant"><span class="material-symbols-outlined text-[18px] text-primary">trending_up</span>ผลงาน</span>' +
          '<div class="flex justify-between font-label-md text-label-md"><span class="text-primary font-bold">จริง ' + p.actual + '%</span><span class="text-on-surface-variant">แผน ' + p.plan + '%</span></div>' +
          ui.progressBar(p.actual, p.status) + '</div>' +
      '</div>' +
      // รายละเอียด + ข้างขวา
      '<div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">' +
        '<div class="xl:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-space-lg">' + (groups.length ? groups.map(function (g) {
          return '<section class="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg' + (g.rows.length > 8 ? ' lg:col-span-2' : '') + '">' +
            '<h2 class="flex items-center gap-2 font-headline-sm text-headline-sm text-primary font-bold mb-space-sm"><span class="material-symbols-outlined">' + g.icon + '</span>' + g.title + '</h2>' +
            '<dl class="grid grid-cols-[minmax(7rem,40%)_1fr] gap-x-3 gap-y-1.5 font-body-sm text-body-sm' + (g.rows.length > 8 ? ' lg:grid-cols-[minmax(7rem,20%)_1fr_minmax(7rem,20%)_1fr]' : '') + '">' +
            g.rows.map(function (k) { return '<dt class="text-on-surface-variant">' + esc(k) + '</dt><dd class="text-on-surface font-medium break-words">' + esc(p.fields[k]) + '</dd>'; }).join('') + '</dl></section>';
        }).join('') : '<section class="lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm p-space-lg text-on-surface-variant">ยังไม่มีรายละเอียดเพิ่มเติมของโครงการ — กด "แก้ไขข้อมูล" เพื่อกรอก</section>') + '</div>' +
        '<div class="xl:col-span-4 flex flex-col gap-space-lg">' +
          '<section class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"><div class="p-space-md flex items-center justify-between"><h2 class="flex items-center gap-2 font-headline-sm text-headline-sm text-primary font-bold"><span class="material-symbols-outlined">map</span>ที่ตั้งโครงการ</h2>' +
            '<span class="font-code-sm text-code-sm text-on-surface-variant">' + (p.lat ? p.lat.toFixed(5) + ', ' + p.lng.toFixed(5) : 'ยังไม่ระบุพิกัด') + '</span></div>' +
            '<div id="pj-map" class="h-64 bg-surface-container"></div></section>' +
          '<section class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md"><h2 class="flex items-center gap-2 font-headline-sm text-headline-sm text-primary font-bold mb-space-sm"><span class="material-symbols-outlined">history</span>ประวัติเอกสาร (' + docs.length + ')</h2>' +
            (docs.length ? '<ul class="flex flex-col gap-1">' + docs.map(function (d, i) {
              return '<li><button type="button" data-action="pj-open-doc" data-i="' + i + '" class="w-full text-left p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high flex items-start gap-2"><span class="material-symbols-outlined text-primary text-[20px]">' + (SK.flows.FORMAT_ICON[d.format] || 'draft') + '</span>' +
                '<span class="min-w-0"><span class="block font-label-md text-label-md font-semibold text-on-surface line-clamp-2">' + esc(SK.flows.docName(d)) + '</span><span class="block font-body-sm text-body-sm text-on-surface-variant">' + ui.dateShort(d.date) + (d.owner ? ' • ' + esc(d.owner) : '') + '</span></span></button></li>';
            }).join('') + '</ul>' : '<p class="font-body-sm text-body-sm text-on-surface-variant">ยังไม่มีเอกสาร — สร้างได้ที่ <a class="text-primary underline" href="project-docs.html?id=' + encodeURIComponent(p.id) + '">เอกสารโครงการ</a></p>') + '</section>' +
          '<section class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md"><h2 class="flex items-center gap-2 font-headline-sm text-headline-sm text-primary font-bold mb-space-sm"><span class="material-symbols-outlined">edit_note</span>บันทึกหน้างานล่าสุด</h2>' +
            (diary.length ? '<ul class="flex flex-col gap-2">' + diary.map(function (e) {
              return '<li class="p-2 rounded-lg bg-surface-container-low"><span class="block font-label-sm text-label-sm text-on-surface-variant">' + ui.dateShort(e.date) + (e.reporter ? ' • ' + esc(e.reporter) : '') + '</span><span class="block font-body-sm text-body-sm text-on-surface">' + esc(e.title || '') + '</span></li>';
            }).join('') + '</ul>' : '<p class="font-body-sm text-body-sm text-on-surface-variant">ยังไม่มีบันทึก</p>') +
            '<a href="progress.html?id=' + encodeURIComponent(p.id) + '" class="mt-2 inline-flex items-center gap-1 text-primary font-label-md text-label-md font-semibold hover:underline">ดูทั้งหมด / บันทึกเพิ่ม<span class="material-symbols-outlined text-[16px]">arrow_forward</span></a></section>' +
        '</div>' +
      '</div>';
    renderMap(p);
    SK.actions['pj-open-doc'] = function (el) { var d = docs[Number(el.dataset.i)]; if (d) SK.flows.openDocument(d, render); };
  }

  var map = null;
  function renderMap(p) {
    var box = $('pj-map');
    if (!box || !window.L) return;
    if (map) { map.remove(); map = null; }
    var c = p.lat ? [p.lat, p.lng] : (SK.tambon ? SK.tambon.center() : ref.CENTER);
    map = L.map(box, { zoomControl: true, attributionControl: false, scrollWheelZoom: false }).setView(c, p.lat ? 16 : 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    if (SK.tambon) SK.tambon.attach(map, { fit: !p.lat, labels: !p.lat });
    if (p.lat) L.marker(c, { title: p.name }).addTo(map);
  }

  SK.page = { refresh: render };
  ui.onReady(render);
})();
