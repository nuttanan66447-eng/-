// หน้าข้อมูลโครงการแบบละเอียด (project.html?id=รหัสโครงการ#แท็บ)
// ส่วนหัว + ตัวเลขหลัก + แถบเครื่องมือ (แท็บ: ภาพรวม ข้อมูลโครงการ คณะกรรมการ เอกสาร บันทึกหน้างาน แผนที่ + ค้นหา)
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var projectId = new URLSearchParams(location.search).get('id') || '';
  var TABS = [
    { key: 'overview', icon: 'dashboard', label: 'ภาพรวม' },
    { key: 'details', icon: 'list_alt', label: 'ข้อมูลโครงการ' },
    { key: 'people', icon: 'groups', label: 'คณะกรรมการและผู้ควบคุมงาน' },
    { key: 'docs', icon: 'history', label: 'ประวัติเอกสาร' },
    { key: 'diary', icon: 'edit_note', label: 'บันทึกหน้างาน' },
    { key: 'map', icon: 'map', label: 'แผนที่' }
  ];
  var tab = (/^#(\w+)/.exec(location.hash) || [])[1] || 'overview';
  if (!TABS.some(function (t) { return t.key === tab; })) tab = 'overview';
  var query = '';

  // หมวดของข้อมูล (จับคู่จากชื่อหัวคอลัมน์ในชีท)
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
  var STATUS_TONE = { completed: '#15803d', delayed: '#ba1a1a', 'pending-inspection': '#a73a00', 'on-schedule': '#1e3a8a', signing: '#757682', unknown: '#757682' };

  function project() { return SK.db.project(projectId); }
  function F(p, k) { var v = (p.fields || {})[k]; return v === undefined || v === null ? '' : String(v).trim(); }

  // ตำแหน่งจากรายชื่อบุคลากรจริง (assets/personnel.js) เมื่อชีทไม่ได้เก็บตำแหน่งไว้
  function positionOf(name) {
    var P = window.SK_PERSONNEL || {}, key = String(name || '').replace(/\s+/g, ''), hit = null;
    if (!key) return '';
    Object.keys(P).forEach(function (k) {
      if (hit || !Array.isArray(P[k])) return;
      hit = P[k].filter(function (x) { return x && x.name && String(x.name).replace(/\s+/g, '') === key; })[0];
    });
    return hit ? (hit.position || '') + (hit.department && !/กอง|สำนัก/.test(hit.position || '') ? ' ' + hit.department : '') : '';
  }
  function committees(p) {
    var person = function (name, role, chair, pos) { return name ? { name: name, role: role, chair: chair, position: pos || positionOf(name) } : null; };
    var list = function (arr) { return arr.filter(Boolean); };
    var inspect = list([person(F(p, 'ประธานกรรมการตรวจรับงานจ้าง'), 'ประธาน', true, F(p, 'ตำแหน่งประธาน'))]
      .concat([1, 2, 3, 4].map(function (i) { return person(F(p, 'กรรมการตรวจรับงานจ้าง ' + i), 'กรรมการ', false, F(p, 'ตำแหน่งกรรมการ ' + i)); })));
    var price = list([person(F(p, 'ประธานกรรมการราคากลาง'), 'ประธาน', true), person(F(p, 'กรรมการราคากลาง 1'), 'กรรมการ'), person(F(p, 'กรรมการราคากลาง 2'), 'กรรมการ')]);
    var tor = list([person(F(p, 'ประธานกรรมการ TOR'), 'ประธาน', true), person(F(p, 'กรรมการ TOR 1'), 'กรรมการ'), person(F(p, 'กรรมการ TOR 2'), 'กรรมการ')]);
    var sup = list([1, 2, 3, 4].map(function (i) { return person(F(p, 'ผู้ควบคุมงาน คนที่ ' + i), 'ผู้ควบคุมงาน', i === 1, F(p, 'ตำแหน่งผู้ควบคุมงาน คนที่ ' + i)); }));
    var torOrder = F(p, 'เลขที่คำสั่ง TOR/ราคากลาง'), torDate = F(p, 'ลงวันที่คำสั่ง TOR/ราคากลาง');
    return [
      { icon: 'groups', title: 'คณะกรรมการตรวจรับพัสดุ', note: 'แต่งตั้งตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560', order: F(p, 'คำสั่งที่'), people: inspect },
      { icon: 'calculate', title: 'คณะกรรมการกำหนดราคากลาง', note: 'กำหนดราคากลางงานก่อสร้าง', order: torOrder, date: torDate, people: price },
      { icon: 'gavel', title: 'คณะกรรมการจัดทำ TOR', note: 'จัดทำร่างขอบเขตของงาน (Terms of Reference)', order: torOrder, date: torDate, people: tor },
      { icon: 'engineering', title: 'ผู้ควบคุมงาน', note: 'ควบคุมงานก่อสร้างตามสัญญา', people: sup }
    ];
  }
  function personCard(c) {
    var initial = (/[ก-ฮA-Za-z]/.exec(c.name.replace(/^(นางสาว|นาง|นาย|ว่าที่\s*ร\.ต\.|ร้อยตำรวจเอก)\s*/, '')) || ['?'])[0];
    return '<div class="p-space-md rounded-lg bg-surface-container-low flex items-start gap-space-md" data-search="' + esc((c.name + ' ' + c.position + ' ' + c.role).toLowerCase()) + '">' +
      '<div class="w-10 h-10 rounded-full ' + (c.chair ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-primary') + ' flex items-center justify-center shrink-0 font-bold font-headline-sm">' + esc(initial) + '</div>' +
      '<div class="flex flex-col flex-1 min-w-0"><div class="flex items-center justify-between gap-2"><span class="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">' + esc(c.name) + '</span>' +
      '<span class="px-space-xs py-space-2xs rounded font-label-sm text-label-sm shrink-0 ' + (c.chair && c.role === 'ประธาน' ? 'bg-secondary-fixed text-on-secondary-fixed-variant font-semibold' : 'bg-surface-container text-on-surface-variant') + '">' + esc(c.role) + '</span></div>' +
      '<span class="font-label-sm text-label-sm text-on-surface-variant">' + esc(c.position || '-') + '</span></div></div>';
  }

  function groupsOf(p) {
    var fields = p.fields || {}, used = {}, out = [];
    var has = function (k) { return !used[k] && !SYSTEM.test(k) && String(fields[k]).trim() !== ''; };
    GROUPS.forEach(function (g) {
      var rows = Object.keys(fields).filter(function (k) { return has(k) && g.re.test(k); });
      rows.forEach(function (k) { used[k] = 1; });
      if (rows.length) out.push({ icon: g.icon, title: g.title, rows: rows });
    });
    var rest = Object.keys(fields).filter(has);
    if (rest.length) out.push({ icon: 'sticky_note_2', title: 'ข้อมูลอื่น ๆ', rows: rest });
    return out;
  }

  // ---------- ส่วนประกอบ ----------
  function card(inner, cls) { return '<section class="bg-surface-container-lowest rounded-xl shadow-sm ' + (cls || 'p-space-lg') + '">' + inner + '</section>'; }
  function head(icon, title, extra) {
    return '<div class="flex flex-wrap items-center justify-between gap-2 mb-space-md"><h2 class="flex items-center gap-2 font-headline-md text-headline-md text-primary font-bold"><span class="material-symbols-outlined">' + icon + '</span>' + title + '</h2>' + (extra || '') + '</div>';
  }
  function kpi(icon, tone, label, value, sub) {
    return '<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex items-start gap-space-sm min-w-0">' +
      '<span class="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ' + tone + '"><span class="material-symbols-outlined">' + icon + '</span></span>' +
      '<span class="flex flex-col min-w-0"><span class="font-label-md text-label-md text-on-surface-variant">' + label + '</span>' +
      '<span class="font-headline-md text-headline-md text-on-surface font-bold truncate">' + value + '</span>' +
      (sub ? '<span class="font-body-sm text-body-sm text-on-surface-variant">' + sub + '</span>' : '') + '</span></div>';
  }
  function ring(actual, plan, color) {
    var r = 34, C = 2 * Math.PI * r, a = Math.max(0, Math.min(100, actual)) / 100 * C, pl = Math.max(0, Math.min(100, plan));
    var ang = pl / 100 * 2 * Math.PI - Math.PI / 2, px = 44 + Math.cos(ang) * r, py = 44 + Math.sin(ang) * r;
    return '<div class="relative w-28 h-28 shrink-0" title="ผลงานจริง ' + actual + '% • แผน ' + plan + '%"><svg viewBox="0 0 88 88" class="w-full h-full -rotate-0">' +
      '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="#e5eeff" stroke-width="9"/>' +
      '<circle cx="44" cy="44" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + a.toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 44 44)"/>' +
      '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="4.5" fill="#fff" stroke="#444651" stroke-width="2"><title>แผน ' + plan + '%</title></circle></svg>' +
      '<div class="absolute inset-0 flex flex-col items-center justify-center"><span class="font-headline-md text-headline-md font-bold text-on-surface">' + actual + '%</span><span class="font-label-sm text-label-sm text-on-surface-variant">แผน ' + plan + '%</span></div></div>';
  }
  function timeline(p) {
    if (!p.start || !p.end) return '<p class="font-body-sm text-body-sm text-on-surface-variant">ยังไม่ระบุวันเริ่ม/สิ้นสุดสัญญา</p>';
    var s = Date.parse(p.start), e = Date.parse(p.end), t = Date.parse(ui.today());
    var pct = Math.max(0, Math.min(100, (t - s) / Math.max(1, e - s) * 100));
    var left = Math.round((e - t) / 86400000);
    return '<div class="flex justify-between font-label-md text-label-md text-on-surface-variant mb-1"><span>เริ่ม ' + ui.dateShort(p.start) + '</span><span>สิ้นสุด ' + ui.dateShort(p.end) + '</span></div>' +
      '<div class="relative h-3 rounded-full bg-surface-container-high"><div class="h-full rounded-full bg-primary-container" style="width:' + pct.toFixed(1) + '%"></div>' +
      '<span class="absolute -top-1 w-1 h-5 rounded bg-secondary" style="left:calc(' + pct.toFixed(1) + '% - 2px)" title="วันนี้"></span></div>' +
      '<p class="mt-2 font-body-sm text-body-sm text-on-surface">ผ่านไป ' + Math.round(pct) + '% ของระยะเวลาสัญญา • ' +
      (p.status === 'completed' ? 'ส่งมอบงานแล้ว' : left >= 0 ? 'เหลือ <b>' + left + '</b> วัน' : '<b class="text-error">เกินกำหนด ' + (-left) + ' วัน</b>') + '</p>';
  }
  function info(label, value) {
    return '<div class="flex flex-col gap-0.5 min-w-0"><dt class="font-label-sm text-label-sm text-on-surface-variant">' + label + '</dt><dd class="font-body-md text-body-md text-on-surface font-medium break-words">' + (value || '-') + '</dd></div>';
  }

  // ---------- แท็บ ----------
  function paneOverview(p, ctx) {
    var sup = ctx.people[3].people[0];
    return '<div class="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">' +
      '<div class="xl:col-span-8 flex flex-col gap-space-lg">' +
        card(head('description', 'รายละเอียดงาน') +
          '<p class="font-body-md text-body-md text-on-surface leading-relaxed">' + esc(F(p, 'ปริมาณงาน') || p.location || '-') + '</p>' +
          '<dl class="mt-space-md grid grid-cols-1 sm:grid-cols-3 gap-space-md p-space-md rounded-lg bg-surface-container-low">' +
            info('ผู้รับจ้าง', esc(p.contractor)) + info('ผู้ควบคุมงาน', sup ? esc(sup.name) + '<span class="block font-body-sm text-body-sm text-on-surface-variant">' + esc(sup.position) + '</span>' : '-') +
            info('สัญญาเลขที่', esc(p.contractNo) + (F(p, 'วันที่สัญญา') ? '<span class="block font-body-sm text-body-sm text-on-surface-variant">ลงวันที่ ' + esc(F(p, 'วันที่สัญญา')) + '</span>' : '')) + '</dl>') +
        card(head('date_range', 'ระยะเวลาสัญญา') + timeline(p)) +
      '</div>' +
      '<div class="xl:col-span-4 flex flex-col gap-space-lg">' +
        card('<div class="p-space-md flex items-center justify-between"><h2 class="flex items-center gap-2 font-headline-sm text-headline-sm text-primary font-bold"><span class="material-symbols-outlined">location_on</span>ที่ตั้ง</h2>' +
          '<button type="button" data-action="pj-tab" data-tab="map" class="font-label-md text-label-md text-primary font-semibold hover:underline">ดูแผนที่ใหญ่</button></div><div id="pj-map-small" class="h-56 bg-surface-container"></div>', 'overflow-hidden') +
        card(head('history', 'เอกสารล่าสุด', '<button type="button" data-action="pj-tab" data-tab="docs" class="font-label-md text-label-md text-primary font-semibold hover:underline">ทั้งหมด (' + ctx.docs.length + ')</button>') + docList(ctx.docs.slice(0, 4), p)) +
      '</div></div>';
  }
  function paneDetails(p) {
    var groups = groupsOf(p);
    if (!groups.length) return card('<p class="text-on-surface-variant">ยังไม่มีรายละเอียดของโครงการ — กด "แก้ไขข้อมูล" เพื่อกรอก</p>');
    return '<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-start">' + groups.map(function (g) {
      return '<section data-group class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden' + (g.rows.length > 8 ? ' lg:col-span-2' : '') + '">' +
        '<h2 class="flex items-center gap-2 px-space-lg py-space-sm bg-surface-container-low font-headline-sm text-headline-sm text-primary font-bold"><span class="material-symbols-outlined">' + g.icon + '</span>' + g.title + '</h2>' +
        '<dl class="divide-y divide-surface-container' + (g.rows.length > 8 ? ' lg:grid lg:grid-cols-2 lg:divide-y-0' : '') + '">' + g.rows.map(function (k) {
          return '<div data-row data-search="' + esc((k + ' ' + p.fields[k]).toLowerCase()) + '" class="grid grid-cols-[minmax(7rem,38%)_1fr] gap-3 px-space-lg py-2 font-body-sm text-body-sm' + (g.rows.length > 8 ? ' lg:border-b lg:border-surface-container' : '') + '">' +
            '<dt class="text-on-surface-variant">' + esc(k) + '</dt><dd class="text-on-surface font-medium break-words">' + esc(p.fields[k]) + '</dd></div>';
        }).join('') + '</dl></section>';
    }).join('') + '</div>';
  }
  function panePeople(ctx) {
    return '<div class="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-start">' + ctx.people.map(function (g) {
      return card(head(g.icon, g.title, g.order ? '<span class="px-2 py-1 rounded bg-surface-container-high text-primary font-label-md text-label-md font-semibold">คำสั่งที่ ' + esc(g.order) + (g.date ? ' ลว. ' + esc(g.date) : '') + '</span>' : '') +
        '<p class="-mt-2 mb-space-md font-body-sm text-body-sm text-on-surface-variant">' + esc(g.note) + '</p>' +
        (g.people.length ? '<div class="flex flex-col gap-space-sm">' + g.people.map(personCard).join('') + '</div>'
          : '<div class="p-space-md rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm">ยังไม่ได้กำหนด — <button type="button" data-action="edit-project" data-id="' + esc(projectId) + '" class="text-primary font-semibold underline">แก้ไขข้อมูลโครงการ</button> เพื่อเลือกรายชื่อ</div>'));
    }).join('') + '</div>';
  }
  function docList(docs, p) {
    if (!docs.length) return '<p class="font-body-sm text-body-sm text-on-surface-variant p-space-sm rounded-lg bg-surface-container-low">ยังไม่มีเอกสาร — สร้างได้ที่ <a class="text-primary underline" href="project-docs.html?id=' + encodeURIComponent(p.id) + '">เอกสารโครงการ</a></p>';
    return '<ul class="flex flex-col gap-space-xs">' + docs.map(function (d) {
      var i = SK.db.data.documents.indexOf(d);
      return '<li data-search="' + esc((SK.flows.docName(d) + ' ' + (d.owner || '')).toLowerCase()) + '"><button type="button" data-action="pj-open-doc" data-i="' + i + '" class="w-full text-left p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors flex items-start gap-space-sm">' +
        '<span class="w-9 h-9 shrink-0 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center"><span class="material-symbols-outlined">' + (SK.flows.FORMAT_ICON[d.format] || 'draft') + '</span></span>' +
        '<span class="min-w-0 flex-1"><span class="block font-label-md text-label-md font-semibold text-on-surface line-clamp-2">' + esc(SK.flows.docName(d)) + '</span>' +
        '<span class="block font-body-sm text-body-sm text-on-surface-variant">' + ui.dateShort(d.date) + (d.owner ? ' • ' + esc(d.owner) : '') + '</span></span>' +
        '<span class="material-symbols-outlined text-outline">visibility</span></button></li>';
    }).join('') + '</ul>';
  }
  function paneDocs(p, ctx) {
    return card(head('history', 'ประวัติเอกสาร (' + ctx.docs.length + ')', '<a href="project-docs.html?id=' + encodeURIComponent(p.id) + '" class="' + ui.btnClass('primary') + '"><span class="material-symbols-outlined text-[18px]">add</span>สร้างเอกสาร</a>') + docList(ctx.docs, p));
  }
  function paneDiary(p, ctx) {
    return card(head('edit_note', 'บันทึกหน้างาน (' + ctx.diary.length + ')', '<a href="progress.html?id=' + encodeURIComponent(p.id) + '&new=diary" class="' + ui.btnClass('primary') + '"><span class="material-symbols-outlined text-[18px]">add_a_photo</span>บันทึกหน้างาน</a>') +
      (ctx.diary.length ? '<ol class="relative border-l-2 border-surface-container-high ml-2 flex flex-col gap-space-md">' + ctx.diary.map(function (e) {
        var photo = e.photos && e.photos[0];
        return '<li class="pl-space-md relative" data-search="' + esc((e.title + ' ' + (e.reporter || '') + ' ' + (e.note || '')).toLowerCase()) + '"><span class="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-primary-container ring-4 ring-surface-container-lowest"></span>' +
          '<div class="flex gap-space-sm">' + (photo ? '<img src="' + esc(photo.src) + '" alt="" class="w-20 h-16 rounded-lg object-cover shrink-0"/>' : '') +
          '<div class="min-w-0"><span class="block font-label-sm text-label-sm text-on-surface-variant">' + ui.dateLong(e.date) + (e.reporter ? ' • ' + esc(e.reporter) : '') + '</span>' +
          '<span class="block font-body-md text-body-md text-on-surface font-semibold">' + esc(e.title || '') + '</span>' + (e.note ? '<span class="block font-body-sm text-body-sm text-on-surface-variant">' + esc(e.note) + '</span>' : '') + '</div></div></li>';
      }).join('') + '</ol>' : '<p class="font-body-sm text-body-sm text-on-surface-variant">ยังไม่มีบันทึกหน้างาน</p>'));
  }
  function paneMap(p) {
    return card('<div class="p-space-md flex flex-wrap items-center justify-between gap-2"><h2 class="flex items-center gap-2 font-headline-md text-headline-md text-primary font-bold"><span class="material-symbols-outlined">map</span>ที่ตั้งโครงการ</h2>' +
      '<span class="font-code-sm text-code-sm text-on-surface-variant">' + (p.lat ? p.lat.toFixed(6) + ', ' + p.lng.toFixed(6) : 'ยังไม่ระบุพิกัด') + '</span></div>' +
      '<div id="pj-map-big" class="h-[60vh] min-h-[360px] bg-surface-container"></div>', 'overflow-hidden');
  }

  // ---------- หน้า ----------
  var ctx = null;
  function render() {
    var p = project(), root = $('pj-root');
    if (!p) {
      $('pj-crumb').textContent = projectId || '-';
      root.innerHTML = card('<div class="py-10 flex flex-col items-center gap-3 text-center"><span class="material-symbols-outlined text-[48px] text-outline">search_off</span>' +
        '<p class="font-headline-md text-headline-md text-primary font-bold">ไม่พบโครงการ ' + esc(projectId) + '</p><a href="projects.html" class="' + ui.btnClass('primary') + '">กลับไปทะเบียนโครงการ</a></div>');
      return;
    }
    $('pj-crumb').textContent = p.id;
    document.title = p.id + ' ' + p.name + ' | กองช่าง เทศบาลตำบลสีแก้ว';
    ctx = {
      people: committees(p),
      docs: SK.db.data.documents.filter(function (d) { return d.projectId === p.id; }),
      diary: SK.flows.sortedDiary().filter(function (e) { return e.projectId === p.id; })
    };
    var cat = ref.CATEGORIES[p.category] || {}, tone = STATUS_TONE[p.status] || '#1e3a8a';
    var dpct = p.budget ? Math.round(p.disbursed / p.budget * 100) : 0;
    var days = p.start && p.end ? Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86400000) : 0;
    var vname = F(p, 'หมู่บ้าน'), vno = F(p, 'หมู่ที่');
    var place = vno ? 'หมู่ที่ ' + vno + (vname ? ' ' + vname : '') : ui.villageName(p.village);

    root.innerHTML =
      // ส่วนหัว
      '<section class="relative overflow-hidden bg-surface-container-lowest rounded-xl shadow-sm">' +
        '<span class="absolute left-0 top-0 bottom-0 w-1.5" style="background:' + tone + '"></span>' +
        '<div class="absolute inset-0 pointer-events-none opacity-60" style="background:radial-gradient(60rem 14rem at 100% 0%,#e5eeff 0%,transparent 60%)"></div>' +
        '<div class="relative p-space-lg md:p-space-xl flex flex-col lg:flex-row gap-space-lg lg:items-center">' +
          '<div class="flex-1 min-w-0 flex flex-col gap-space-sm">' +
            '<div class="flex flex-wrap items-center gap-2">' + ui.statusBadge(p) +
              '<span class="px-2 py-0.5 rounded bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold">' + esc(cat.label || p.typeLabel || '') + '</span>' +
              '<span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-code-sm text-code-sm">' + esc(p.id) + '</span>' +
              (p.year ? '<span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">ปีงบฯ ' + esc(p.year) + '</span>' : '') + '</div>' +
            '<h1 class="font-headline-lg text-headline-lg text-primary font-bold leading-snug">' + esc(p.name) + '</h1>' +
            '<p class="flex items-center gap-1 text-on-surface-variant"><span class="material-symbols-outlined text-[18px]">location_on</span>' + esc(place) + ' ต.สีแก้ว อ.เมืองร้อยเอ็ด จ.ร้อยเอ็ด</p>' +
            '<div class="flex flex-wrap gap-2 mt-1">' +
              '<a href="progress.html?id=' + encodeURIComponent(p.id) + '" class="' + ui.btnClass('primary') + '"><span class="material-symbols-outlined text-[18px]">construction</span>ติดตามความก้าวหน้า</a>' +
              '<a href="project-docs.html?id=' + encodeURIComponent(p.id) + '" class="' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">description</span>เอกสารโครงการ</a>' +
              '<button type="button" data-action="edit-project" data-id="' + esc(p.id) + '" class="' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">edit</span>แก้ไขข้อมูล</button>' +
              (p.lat ? '<a href="https://www.google.com/maps?q=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener" class="' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">map</span>Google Maps</a>' : '') +
              (SK.deleteProject && p.rowNumber ? '<button type="button" data-action="delete-project" data-id="' + esc(p.id) + '" class="' + ui.btnClass('ghost') + ' !text-error"><span class="material-symbols-outlined text-[18px]">delete</span>ลบ</button>' : '') +
            '</div></div>' +
          ring(p.actual, p.plan, tone) +
        '</div></section>' +
      // ตัวเลขหลัก
      '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">' +
        kpi('payments', 'bg-primary-fixed text-primary', 'วงเงินตามสัญญา', money(p.budget) + ' บาท', esc(p.sourceLabel || ref.SOURCES[p.source] || '')) +
        kpi('account_balance_wallet', 'bg-secondary-fixed text-secondary', 'เบิกจ่ายแล้ว', money(p.disbursed) + ' บาท', dpct + '% • งวด ' + p.installment + '/' + p.installments) +
        kpi('date_range', 'bg-tertiary-fixed text-tertiary', 'ระยะเวลาสัญญา', days ? days + ' วัน' : '-', p.start ? ui.dateShort(p.start) + ' – ' + ui.dateShort(p.end) : 'ยังไม่ระบุวันที่') +
        kpi('storefront', 'bg-surface-container-high text-primary', 'ผู้รับจ้าง', esc(p.contractor || '-'), 'สัญญา ' + esc(p.contractNo || '-')) +
      '</div>' +
      // แถบเครื่องมือ
      '<div class="sticky top-16 z-30 flex flex-col md:flex-row md:items-center justify-between gap-space-sm bg-surface-container-lowest/95 backdrop-blur p-space-sm rounded-xl shadow-sm">' +
        '<div class="flex items-center gap-space-2xs overflow-x-auto pb-space-2xs md:pb-0" role="tablist">' + TABS.map(function (t) {
          var n = t.key === 'docs' ? ctx.docs.length : t.key === 'diary' ? ctx.diary.length : null;
          return '<button type="button" data-action="pj-tab" data-tab="' + t.key + '" role="tab" aria-selected="' + (t.key === tab) + '" class="flex items-center gap-space-xs px-space-md py-space-sm rounded-lg font-headline-sm text-headline-sm transition-all shrink-0 ' +
            (t.key === tab ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary') + '"><span class="material-symbols-outlined text-space-lg">' + t.icon + '</span><span>' + t.label + '</span>' +
            (n ? '<span class="px-1.5 rounded-full text-label-sm font-label-sm ' + (t.key === tab ? 'bg-on-primary/20' : 'bg-surface-container-high') + '">' + n + '</span>' : '') + '</button>';
        }).join('') + '</div>' +
        '<label class="relative shrink-0 self-end md:self-auto"><span class="sr-only">ค้นหาในโครงการ</span><span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>' +
          '<input id="pj-search" type="search" value="' + esc(query) + '" placeholder="ค้นหาข้อมูล รายชื่อ เอกสาร..." class="w-60 pl-8 pr-3 py-2 rounded-lg bg-surface-container-low font-body-sm text-body-sm"/></label>' +
      '</div>' +
      '<div id="pj-pane"></div>';
    $('pj-search').addEventListener('input', function () { query = this.value; if (query && tab === 'overview') setTab('details', true); else filter(); });
    showPane(p);
  }
  function showPane(p) {
    var pane = $('pj-pane');
    pane.innerHTML = tab === 'details' ? paneDetails(p) : tab === 'people' ? panePeople(ctx) : tab === 'docs' ? paneDocs(p, ctx) : tab === 'diary' ? paneDiary(p, ctx) : tab === 'map' ? paneMap(p) : paneOverview(p, ctx);
    if (tab === 'overview') drawMap('pj-map-small', p, false);
    if (tab === 'map') drawMap('pj-map-big', p, true);
    filter();
  }
  // ค้นหา: ซ่อนแถว/รายการที่ไม่ตรง และหมวดที่ไม่มีแถวเหลือ
  function filter() {
    var q = query.trim().toLowerCase(), pane = $('pj-pane');
    if (!pane) return;
    pane.querySelectorAll('[data-search]').forEach(function (el) { el.classList.toggle('hidden', !!q && el.dataset.search.indexOf(q) < 0); });
    pane.querySelectorAll('[data-group]').forEach(function (g) { g.classList.toggle('hidden', !!q && !g.querySelector('[data-row]:not(.hidden)')); });
  }
  function setTab(key, keepFocus) {
    tab = key;
    try { history.replaceState(null, '', '#' + key); } catch (e) {}
    var focus = keepFocus && document.activeElement && document.activeElement.id === 'pj-search';
    render();
    if (focus) { var s = $('pj-search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }

  var maps = {};
  function drawMap(id, p, big) {
    var box = $(id);
    if (!box || !window.L) return;
    if (maps[id]) { maps[id].remove(); delete maps[id]; }
    var c = p.lat ? [p.lat, p.lng] : (SK.tambon ? SK.tambon.center() : ref.CENTER);
    var map = maps[id] = L.map(box, { zoomControl: true, attributionControl: false, scrollWheelZoom: false }).setView(c, p.lat ? (big ? 17 : 16) : 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    if (SK.tambon) SK.tambon.attach(map, { fit: !p.lat, labels: big || !p.lat });
    if (p.lat) L.marker(c, { title: p.name }).addTo(map).bindTooltip(esc(p.name), { direction: 'top' });
    setTimeout(function () { map.invalidateSize(); }, 50);
  }

  Object.assign(SK.actions, {
    'pj-tab': function (el) { setTab(el.dataset.tab); window.scrollTo({ top: Math.min(window.scrollY, $('pj-root').offsetTop + 300), behavior: 'smooth' }); },
    'pj-open-doc': function (el) { var d = SK.db.data.documents[Number(el.dataset.i)]; if (d) SK.flows.openDocument(d, render); }
  });
  SK.page = { refresh: render };
  ui.onReady(render);
})();
