// หน้าข้อมูลโครงการ (#/project/P-001): ภาพรวม ข้อมูลทั้งหมด คณะกรรมการ รูปภาพ บันทึกหน้างาน เอกสาร
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var TABS = [['overview', 'dashboard', 'ภาพรวม'], ['details', 'list_alt', 'ข้อมูลโครงการ'], ['people', 'groups', 'คณะกรรมการ'], ['photos', 'photo_library', 'รูปภาพ'], ['diary', 'edit_note', 'บันทึกหน้างาน'], ['docs', 'description', 'เอกสาร']];
  var GROUPS = [
    ['description', 'ข้อมูลโครงการ', /ชื่อโครงการ|หน่วยงาน|ประเภทงาน|งบประมาณ|ปีงบ|ปริมาณงาน|ระยะทาง|ขอบเขต|รายละเอียด/],
    ['location_on', 'ที่ตั้งโครงการ', /หมู่|สถานที่|พิกัด|ละติจูด|ลองจิจูด|lat|lng/i],
    ['gavel', 'TOR / ราคากลาง', /TOR|ราคากลาง/],
    ['contract', 'คำสั่งและสัญญาจ้าง', /คำสั่ง|สัญญา|ค่างาน|ค่าปรับ|วงเงิน|ระยะเวลา/],
    ['event_available', 'การส่งมอบและตรวจรับงาน', /ลงงาน|ส่งมอบ|ตรวจรับงาน|วันตรวจรับ|สถานะ|ความก้าวหน้า|คงเหลือ|เบิกจ่าย/],
    ['engineering', 'ผู้ควบคุมงาน', /ผู้ควบคุมงาน/],
    ['storefront', 'ผู้รับจ้าง', /ผู้รับจ้าง|ภาษี|โทรศัพท์|เบอร์|ที่อยู่/],
    ['groups', 'คณะกรรมการตรวจรับพัสดุ', /กรรมการ|ประธาน/]
  ];
  var HIDE = /JSON|^HTML|สร้างโดย|แก้ไขโดย|วันที่สร้าง|วันที่แก้ไข|^คอลัมน์ \d+$/;
  var el = null, id = '', tab = 'overview', mapCtl = null;

  function render(root, r) {
    el = root; id = r.args[0] || '';
    tab = r.query.get('tab') || 'overview';
    if (!TABS.some(function (t) { return t[0] === tab; })) tab = 'overview';
    if (!SK.projects.loaded) { root.innerHTML = V.loading(220); return; }
    var p = SK.projects.byId(id);
    if (!p) { root.innerHTML = '<div class="card">' + V.empty('search_off', 'ไม่พบโครงการ ' + esc(id), 'โครงการอาจถูกลบหรือเลื่อนแถวในชีท', '<a href="#/projects" class="btn-primary">' + icon('arrow_back') + '<span>กลับไปทะเบียนโครงการ</span></a>') + '</div>'; return; }
    document.title = p.name + ' • กองช่าง เทศบาลตำบลสีแก้ว';
    var S = SK.projects.STATUSES[p.status], cat = SK.projects.CATEGORIES[p.category];
    var nPhotos = SK.photos.of(p.id).length, nDiary = diaryOf(p).length, nDocs = docsOf(p).length;
    root.innerHTML =
      '<nav class="flex items-center gap-1 mb-3 font-label-md text-label-md text-outline" aria-label="ตำแหน่ง"><a href="#/projects" class="hover:text-primary">ทะเบียนโครงการ</a>' + icon('chevron_right', 'text-[16px]') + '<span class="text-on-surface">' + p.id + '</span></nav>' +
      '<section class="card overflow-hidden card-pad">' +
        '<div class="absolute -right-24 -top-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-50" style="background:radial-gradient(circle,' + S.color + '33,transparent 70%)"></div>' +
        '<div class="relative flex flex-col lg:flex-row gap-space-lg lg:items-center">' +
          '<div class="flex-1 min-w-0 flex flex-col gap-2.5">' +
            '<div class="flex flex-wrap items-center gap-2">' + SK.projects.statusChip(p) + '<span class="chip-gray">' + icon(cat.icon, 'text-[14px]') + esc(p.type || cat.label) + '</span><span class="chip-gray font-mono">' + p.id + '</span>' + (p.year ? '<span class="chip-gray">ปีงบ ' + p.year + '</span>' : '') + '</div>' +
            '<h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-semibold text-on-surface leading-tight">' + esc(p.name) + '</h1>' +
            '<p class="muted flex items-center gap-1">' + icon('location_on', 'text-[18px]') + esc(p.place || '-') + ' ต.สีแก้ว อ.เมืองร้อยเอ็ด จ.ร้อยเอ็ด</p>' +
            '<div class="flex flex-wrap gap-2 mt-1">' +
              '<a href="#/documents?project=' + p.id + '" class="btn-primary">' + icon('print') + '<span>พิมพ์เอกสาร</span></a>' +
              '<a href="#/entry/' + p.id + '" class="btn-glass">' + icon('edit') + '<span>แก้ไขข้อมูลโครงการ</span></a>' +
              '<button type="button" data-pj="photo" class="btn-glass">' + icon('add_a_photo') + '<span>เพิ่มรูป</span></button>' +
              (p.lat ? '<a href="https://www.google.com/maps?q=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener" class="btn-ghost">' + icon('near_me') + '<span>Google Maps</span></a>' : '') +
            '</div></div>' +
          ring(p, S.color) +
        '</div></section>' +
      '<div class="grid grid-cols-2 xl:grid-cols-4 gap-gutter mt-gutter">' +
        V.kpi({ icon: 'payments', label: 'ค่างานตามสัญญา', value: SK.moneyShort(p.budget), unit: 'บาท', badge: p.source ? '<span class="chip-gray hidden sm:inline-flex">' + esc(p.source) + '</span>' : '' }) +
        V.kpi({ icon: 'date_range', tone: 'bg-tertiary/10 text-tertiary', label: 'ระยะเวลาสัญญา', value: p.days || '-', unit: p.days ? 'วัน' : '', bar: p.status === 'completed' ? 100 : p.plan, barColor: '#007da9', barLabel: p.start ? SK.dateShort(p.start) + ' – ' + SK.dateShort(p.end) : 'ยังไม่ระบุวันที่' }) +
        V.kpi({ icon: 'storefront', tone: 'bg-secondary-container text-on-secondary-fixed', label: 'ผู้รับจ้าง', value: '<span class="text-[20px] leading-7">' + esc(p.contractor || '-') + '</span>', unit: '' }) +
        V.kpi({ icon: 'engineering', tone: 'bg-primary/10 text-primary', label: 'ผู้ควบคุมงาน', value: '<span class="text-[20px] leading-7">' + esc(p.supervisor || '-') + '</span>', unit: '' }) +
      '</div>' +
      '<div class="sticky top-[72px] z-20 mt-gutter mb-gutter"><div class="tabs glass bg-white/80 shadow-sm" role="tablist">' + TABS.map(function (t) {
        var n = t[0] === 'photos' ? nPhotos : t[0] === 'diary' ? nDiary : t[0] === 'docs' ? nDocs : 0;
        return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '" class="tab flex items-center gap-1.5' + (t[0] === tab ? ' is-active' : '') + '">' + icon(t[1], 'text-[18px]') + t[2] + (n ? '<span class="chip-gray !py-0 !px-1.5">' + n + '</span>' : '') + '</button>';
      }).join('') + '</div></div>' +
      '<div id="pj-pane"></div>';
    pane(p);
  }
  function ring(p, color) {
    var r = 46, c = 2 * Math.PI * r, a = c * (1 - p.actual / 100), pl = c * (1 - Math.min(100, p.plan) / 100);
    return '<div class="flex items-center gap-4 shrink-0"><svg width="128" height="128" viewBox="0 0 120 120" role="img" aria-label="ความคืบหน้า ' + p.actual + '%">' +
      '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#dce9ff" stroke-width="10"/>' +
      (p.plan && p.status !== 'completed' ? '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="#bfc7d2" stroke-width="3" stroke-dasharray="' + c + '" stroke-dashoffset="' + pl + '" transform="rotate(-90 60 60)"/>' : '') +
      '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + a + '" transform="rotate(-90 60 60)"/>' +
      '<text x="60" y="58" text-anchor="middle" font-size="24" font-weight="700" fill="#0b1c30">' + Math.round(p.actual) + '%</text><text x="60" y="78" text-anchor="middle" font-size="11" fill="#707881">' + (p.status === 'completed' ? 'แล้วเสร็จ' : 'แผน ' + Math.round(p.plan) + '%') + '</text></svg></div>';
  }
  function diaryOf(p) { return SK.store.list('diary').filter(function (e) { return e.projectId === p.id; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }); }
  function docsOf(p) { return SK.docs.list().filter(function (d) { return d.projectId === p.id; }); }

  function pane(p) {
    var box = el.querySelector('#pj-pane');
    if (mapCtl) { mapCtl.map.remove(); mapCtl = null; }
    if (tab === 'details') box.innerHTML = details(p);
    else if (tab === 'people') box.innerHTML = people(p);
    else if (tab === 'photos') box.innerHTML = photos(p);
    else if (tab === 'diary') box.innerHTML = diary(p);
    else if (tab === 'docs') box.innerHTML = documents(p);
    else box.innerHTML = overview(p);
    SK.photos.hydrate(box);
    var m = box.querySelector('#pj-map');
    if (m) mapCtl = SK.map.create(m, { projects: [p], layers: true });
  }
  function overview(p) {
    var photos = SK.photos.of(p.id), d = diaryOf(p), docs = docsOf(p);
    return '<div class="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">' +
      '<div class="xl:col-span-8 flex flex-col gap-gutter">' +
        '<section class="card card-pad"><h2 class="card-title mb-3">' + icon('description') + 'รายละเอียดงาน</h2><p class="font-body-lg text-body-lg leading-relaxed">' + esc(p.work || '-') + '</p>' +
          '<dl class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-[20px] bg-surface-container-low/70">' +
            info('เลขที่สัญญา', p.contractNo || '-', p.contractDate ? 'ลงวันที่ ' + p.contractDate : '') + info('แหล่งงบประมาณ', p.source || '-', p.year ? 'ปีงบประมาณ ' + p.year : '') + info('สถานะในชีท', p.statusText || '-', '') + '</dl></section>' +
        '<section class="card card-pad"><h2 class="card-title mb-4">' + icon('timeline') + 'ระยะเวลาสัญญา</h2>' + timeline(p) + '</section>' +
        '<section class="card card-pad"><div class="flex items-center justify-between gap-2 mb-4"><h2 class="card-title">' + icon('photo_library') + 'รูปภาพล่าสุด</h2><button type="button" data-tab="photos" class="font-label-md text-label-md text-primary font-semibold hover:underline">ทั้งหมด (' + photos.length + ') →</button></div>' +
          (photos.length ? '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">' + photos.slice(0, 4).map(function (x) { return SK.photos.thumb(x); }).join('') + '</div>' : addPhotoBox()) + '</section>' +
      '</div>' +
      '<div class="xl:col-span-4 flex flex-col gap-gutter">' +
        '<section class="card overflow-hidden"><div class="p-5 pb-3 flex items-center justify-between"><h2 class="card-title">' + icon('location_on') + 'ที่ตั้ง</h2>' + (p.lat ? '' : '<span class="chip-amber">ยังไม่มีพิกัด</span>') + '</div><div id="pj-map" class="h-64 mx-3 mb-3 rounded-[20px] overflow-hidden bg-surface-container"></div></section>' +
        '<section class="card card-pad"><div class="flex items-center justify-between gap-2 mb-3"><h2 class="card-title">' + icon('history') + 'เอกสารล่าสุด</h2><button type="button" data-tab="docs" class="font-label-md text-label-md text-primary font-semibold hover:underline">ทั้งหมด (' + docs.length + ')</button></div>' +
          SK.docs.historyList(docs.slice(0, 4), { project: false, empty: 'ยังไม่มีเอกสารของโครงการนี้' }) + '</section>' +
        '<section class="card card-pad"><div class="flex items-center justify-between gap-2 mb-3"><h2 class="card-title">' + icon('edit_note') + 'บันทึกหน้างานล่าสุด</h2><button type="button" data-tab="diary" class="font-label-md text-label-md text-primary font-semibold hover:underline">ทั้งหมด (' + d.length + ')</button></div>' +
          (d.length ? diaryList(d.slice(0, 3)) : '<p class="muted font-body-sm text-body-sm">ยังไม่มีบันทึกหน้างาน</p>') + '</section>' +
      '</div></div>';
  }
  function info(label, value, sub) {
    return '<div><dt class="font-label-md text-label-md text-outline">' + esc(label) + '</dt><dd class="font-label-lg text-label-lg font-semibold mt-0.5">' + esc(value) + (sub ? '<span class="block font-body-sm text-body-sm text-outline font-normal">' + esc(sub) + '</span>' : '') + '</dd></div>';
  }
  function timeline(p) {
    if (!p.start || !p.end) return '<p class="muted">ยังไม่ได้ระบุวันเริ่ม/สิ้นสุดสัญญาในข้อมูลโครงการ</p>';
    var today = SK.todayIso(), t = Math.max(0, Math.min(100, p.status === 'completed' ? 100 : p.plan));
    var left = Math.round((Date.parse(p.end) - Date.parse(today)) / 86400000);
    return '<div class="relative h-3 rounded-full bg-surface-container-high"><div class="absolute inset-y-0 left-0 rounded-full bg-primary/25" style="width:' + t + '%"></div>' +
      '<div class="absolute inset-y-0 left-0 rounded-full bg-primary" style="width:' + p.actual + '%"></div>' +
      (p.status !== 'completed' && today >= p.start && today <= p.end ? '<div class="absolute -top-2 -bottom-2 w-0.5 bg-error" style="left:' + t + '%" title="วันนี้"></div>' : '') + '</div>' +
      '<div class="flex justify-between mt-3 font-label-md text-label-md"><span><span class="block text-outline">เริ่มสัญญา</span>' + SK.dateLong(p.start) + '</span>' +
      '<span class="text-center"><span class="block text-outline">' + (p.status === 'completed' ? 'สถานะ' : left >= 0 ? 'เหลือเวลา' : 'เกินกำหนด') + '</span><b class="' + (left < 0 && p.status !== 'completed' ? 'text-error' : 'text-primary') + '">' + (p.status === 'completed' ? 'แล้วเสร็จ' : Math.abs(left) + ' วัน') + '</b></span>' +
      '<span class="text-right"><span class="block text-outline">สิ้นสุดสัญญา</span>' + SK.dateLong(p.end) + '</span></div>';
  }
  function details(p) {
    var used = {}, groups = GROUPS.map(function (g) {
      var rows = Object.keys(p.fields).filter(function (k) { return !used[k] && !HIDE.test(k) && String(p.fields[k] || '').trim() && g[2].test(k); });
      rows.forEach(function (k) { used[k] = 1; });
      return { icon: g[0], title: g[1], rows: rows };
    });
    var rest = Object.keys(p.fields).filter(function (k) { return !used[k] && !HIDE.test(k) && String(p.fields[k] || '').trim(); });
    if (rest.length) groups.push({ icon: 'more_horiz', title: 'ข้อมูลอื่น ๆ', rows: rest });
    groups = groups.filter(function (g) { return g.rows.length; });
    if (!groups.length) return '<div class="card">' + V.empty('list_alt', 'ยังไม่มีรายละเอียดโครงการ', 'กด "แก้ไขข้อมูลโครงการ" เพื่อกรอกในแบบฟอร์มของระบบหลัก', '<a href="#/entry/' + p.id + '" class="btn-primary">' + icon('edit') + '<span>แก้ไขข้อมูลโครงการ</span></a>') + '</div>';
    return '<div class="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start">' + groups.map(function (g) {
      return '<section class="card overflow-hidden' + (g.rows.length > 10 ? ' lg:col-span-2' : '') + '"><h2 class="card-title px-5 pt-5 pb-3">' + icon(g.icon) + g.title + '</h2>' +
        '<dl class="px-2 pb-3' + (g.rows.length > 10 ? ' lg:grid lg:grid-cols-2' : '') + '">' + g.rows.map(function (k) {
          return '<div class="grid grid-cols-[minmax(8rem,40%)_1fr] gap-3 px-3 py-2 rounded-xl hover:bg-surface-container-low"><dt class="font-body-sm text-body-sm text-outline">' + esc(k) + '</dt><dd class="font-body-md text-body-md break-words">' + esc(p.fields[k]) + '</dd></div>';
        }).join('') + '</dl></section>';
    }).join('') + '</div>';
  }
  function positionOf(name) {
    var P = window.SK_PERSONNEL || {}, all = (P.supervisors || []).concat(P.committee || [], P.executives || []);
    var hit = all.filter(function (x) { return x.name === name; })[0];
    return hit ? hit.position : '';
  }
  function people(p) {
    var g = SK.projects.people(p);
    var block = function (ic, title, list, note) {
      return '<section class="card card-pad"><div class="flex items-center justify-between gap-2 mb-4"><h2 class="card-title">' + icon(ic) + title + '</h2><span class="chip-gray">' + list.length + ' คน</span></div>' +
        (list.length ? '<ul class="flex flex-col gap-2">' + list.map(function (x) {
          var pos = x.position || positionOf(x.name);
          return '<li class="flex items-center gap-3 p-3 rounded-[20px] bg-surface-container-low/70"><span class="w-10 h-10 shrink-0 rounded-full ' + (/ประธาน/.test(x.role) ? 'bg-primary text-on-primary' : 'bg-white text-primary') + ' flex items-center justify-center">' + icon(/ประธาน/.test(x.role) ? 'workspace_premium' : 'person') + '</span>' +
            '<span class="min-w-0"><span class="block font-label-lg text-label-lg font-semibold">' + esc(x.name) + '</span><span class="block font-body-sm text-body-sm text-outline">' + esc(x.role) + (pos ? ' • ' + esc(pos) : '') + '</span></span></li>';
        }).join('') + '</ul>' : '<p class="muted font-body-sm text-body-sm">' + note + '</p>') + '</section>';
    };
    return '<div class="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start">' +
      block('engineering', 'ผู้ควบคุมงาน', g.supervisors, 'ยังไม่ได้กำหนดผู้ควบคุมงาน') +
      block('fact_check', 'คณะกรรมการตรวจรับพัสดุ', g.inspection, 'ยังไม่ได้กำหนดคณะกรรมการตรวจรับ') +
      block('calculate', 'คณะกรรมการกำหนดราคากลาง', g.price, 'ยังไม่ได้กำหนดคณะกรรมการราคากลาง') +
      block('gavel', 'คณะกรรมการร่าง TOR', g.tor, 'ยังไม่ได้กำหนดคณะกรรมการ TOR') + '</div>';
  }
  function addPhotoBox() {
    return '<button type="button" data-pj="photo" class="w-full p-8 rounded-[24px] border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary flex flex-col items-center gap-2 transition-colors">' + icon('add_photo_alternate', 'text-[40px]') +
      '<span class="font-headline-sm text-headline-sm">ยังไม่มีรูปภาพของโครงการนี้</span><span class="font-body-sm text-body-sm">กดเพื่อเลือกรูป (เลือกได้หลายรูป) — ภาพก่อน ระหว่าง และหลังดำเนินการ</span></button>';
  }
  var STAGES = ['ก่อนดำเนินการ', 'ระหว่างดำเนินการ', 'หลังดำเนินการ'];
  function photos(p) {
    var list = SK.photos.of(p.id);
    return '<section class="card card-pad"><div class="flex flex-wrap items-center justify-between gap-3 mb-5"><h2 class="card-title">' + icon('photo_library') + 'รูปภาพโครงการ (' + list.length + ')</h2>' +
      '<div class="flex flex-wrap gap-2">' + STAGES.map(function (s) { return '<button type="button" data-pj="photo" data-stage="' + s + '" class="btn-glass">' + icon('add_a_photo') + '<span>' + s + '</span></button>'; }).join('') +
      '<a href="#/documents?project=' + p.id + '&doc=photo" class="btn-primary">' + icon('print') + '<span>พิมพ์หน้ารูปภาพ</span></a></div></div>' +
      (list.length ? STAGES.concat(['']).map(function (s) {
        var items = list.filter(function (x) { return s ? (x.stage || x.caption) === s : STAGES.indexOf(x.stage || x.caption) < 0; });
        if (!items.length) return '';
        return '<h3 class="font-label-lg text-label-lg text-outline mb-2 mt-4 first:mt-0">' + (s || 'รูปอื่น ๆ') + ' (' + items.length + ')</h3><div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">' + items.map(function (x) { return SK.photos.thumb(x); }).join('') + '</div>';
      }).join('') : addPhotoBox()) + '</section>';
  }
  function diaryList(list) {
    return '<ol class="relative flex flex-col gap-4 pl-4 border-l-2 border-surface-container-high">' + list.map(function (e) {
      var pics = (e.photoIds || []).map(function (pid) { return SK.photos.of().filter(function (x) { return x.id === pid; })[0]; }).filter(Boolean);
      var old = (e.photos || []).filter(function (x) { return x && x.src; });
      return '<li class="relative"><span class="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white"></span>' +
        '<div class="flex flex-wrap items-center gap-2 font-label-md text-label-md text-outline">' + SK.dateLong(e.date) + (e.reporter ? ' • ' + esc(e.reporter) : '') + (e.progress != null && e.progress !== '' ? '<span class="chip-blue !py-0">' + esc(e.progress) + '%</span>' : '') + '</div>' +
        '<div class="font-label-lg text-label-lg font-semibold mt-0.5">' + esc(e.title || 'บันทึกหน้างาน') + '</div>' + (e.note ? '<p class="font-body-md text-body-md muted whitespace-pre-line">' + esc(e.note) + '</p>' : '') +
        (pics.length || old.length ? '<div class="flex flex-wrap gap-2 mt-2">' + pics.map(function (x) { return SK.photos.thumb(x, 'w-24 h-20'); }).join('') +
          old.map(function (x) { return '<img src="' + esc(x.src) + '" alt="" class="w-24 h-20 rounded-2xl object-cover"/>'; }).join('') + '</div>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  function diary(p) {
    var list = diaryOf(p);
    return '<section class="card card-pad"><div class="flex flex-wrap items-center justify-between gap-3 mb-5"><h2 class="card-title">' + icon('edit_note') + 'บันทึกหน้างาน (' + list.length + ')</h2>' +
      '<button type="button" data-pj="diary" class="btn-primary">' + icon('add') + '<span>บันทึกหน้างาน</span></button></div>' +
      (list.length ? diaryList(list) : V.empty('edit_note', 'ยังไม่มีบันทึกหน้างาน', 'บันทึกการตรวจหน้างาน ปัญหา/อุปสรรค และแนบรูปถ่ายในแต่ละวัน')) + '</section>';
  }
  function documents(p) {
    var list = docsOf(p), quick = ['combined', 'sCurve', 'completion', 'contractorNotice', 'centralPrice', 'testResult', 'photo', 'sign'];
    return '<div class="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">' +
      '<section class="xl:col-span-7 card card-pad"><div class="flex items-center justify-between gap-2 mb-4"><h2 class="card-title">' + icon('note_add') + 'สร้างเอกสารของโครงการนี้</h2><a href="#/documents?project=' + p.id + '" class="font-label-md text-label-md text-primary font-semibold hover:underline">ทุกแบบ →</a></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + quick.map(function (k) {
          var d = SK.engine.doc(k);
          return '<a href="#/documents?project=' + p.id + '&doc=' + k + '" class="flex items-center gap-3 p-3 rounded-[20px] bg-surface-container-low/70 hover:bg-surface-container transition-colors"><span class="w-10 h-10 shrink-0 rounded-xl bg-white text-primary flex items-center justify-center shadow-sm">' + icon(d.icon) + '</span>' +
            '<span class="min-w-0"><span class="block font-label-lg text-label-lg font-semibold truncate">' + esc(d.title) + '</span><span class="block font-body-sm text-body-sm text-outline truncate">' + esc(d.desc) + '</span></span></a>';
        }).join('') + '</div></section>' +
      '<section class="xl:col-span-5 card card-pad"><h2 class="card-title mb-4">' + icon('history') + 'ประวัติเอกสาร (' + list.length + ')</h2>' + SK.docs.historyList(list, { project: false, remove: true, empty: 'ยังไม่มีเอกสารของโครงการนี้' }) + '</section></div>';
  }

  function addDiary(p) {
    var me = (SK.cloud.active && SK.cloud.displayName()) || '';
    var files = null;
    var m = SK.formModal({
      title: 'บันทึกหน้างาน', subtitle: p.name, icon: 'edit_note',
      fields: [
        { name: 'date', label: 'วันที่', type: 'date', value: SK.todayIso(), required: true },
        { name: 'progress', label: 'ความคืบหน้าที่พบ (%)', type: 'number', placeholder: 'เช่น 45' },
        { name: 'title', label: 'หัวข้อ', required: true, span: 2, placeholder: 'เช่น ตรวจการเทคอนกรีตช่วงที่ 2' },
        { name: 'note', label: 'รายละเอียด / ปัญหาอุปสรรค', type: 'textarea', span: 2, rows: 4 },
        { name: 'reporter', label: 'ผู้บันทึก', value: me || p.supervisor || '', span: 2 }
      ],
      intro: '',
      onSubmit: function (v) {
        var entry = { id: SK.uid('DY'), projectId: p.id, date: v.date, title: v.title, note: v.note, progress: v.progress, reporter: v.reporter, photoIds: [], createdAt: new Date().toISOString() };
        var chain = Promise.resolve();
        if (files && files.length) chain = Array.prototype.reduce.call(files, function (c, f) {
          return c.then(function () {
            return SK.store.files.put(f).then(function (fileId) {
              var ph = { id: SK.uid('PH'), projectId: p.id, projectName: p.name, fileId: fileId, fileName: f.name, fileSize: f.size, caption: v.title, stage: 'ระหว่างดำเนินการ', date: v.date, owner: v.reporter };
              SK.store.list('photos').unshift(ph);
              entry.photoIds.push(ph.id);
            });
          });
        }, chain);
        return chain.then(function () {
          SK.store.list('diary').unshift(entry);
          SK.store.save();
          SK.toast('บันทึกหน้างานแล้ว', 'success');
          pane(p);
        });
      }
    });
    var form = m.body.querySelector('form');
    var pick = document.createElement('div');
    pick.className = 'sm:col-span-2';
    pick.innerHTML = '<button type="button" class="btn-glass">' + icon('add_a_photo') + '<span>แนบรูปถ่าย</span></button> <span data-n class="font-body-sm text-body-sm text-outline ml-2"></span>';
    form.insertBefore(pick, form.lastElementChild);
    pick.querySelector('button').addEventListener('click', function () {
      SK.pickFile('image/*', true).then(function (fl) { files = fl; pick.querySelector('[data-n]').textContent = fl && fl.length ? 'เลือกไว้ ' + fl.length + ' รูป' : ''; });
    });
  }

  document.addEventListener('click', function (e) {
    if (!el || !document.body.contains(el) || !el.querySelector('#pj-pane')) return;
    var p = SK.projects.byId(id); if (!p) return;
    var t = e.target.closest('[data-tab]');
    if (t && el.contains(t)) {
      tab = t.dataset.tab;
      history.replaceState(null, '', '#/project/' + p.id + '?tab=' + tab);
      el.querySelectorAll('[role=tab]').forEach(function (b) { var on = b.dataset.tab === tab; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
      pane(p);
      return;
    }
    var a = e.target.closest('[data-pj]');
    if (!a || !el.contains(a)) return;
    if (a.dataset.pj === 'photo') SK.photos.add(p.id, a.dataset.stage || '');
    else if (a.dataset.pj === 'diary') addDiary(p);
  });
  window.addEventListener('sk:photos', function () { if (el && document.body.contains(el) && el.querySelector('#pj-pane')) { var p = SK.projects.byId(id); if (p) render(el, { args: [id], query: new URLSearchParams('tab=' + tab) }); } });
  window.addEventListener('sk:documents', function () { if (el && document.body.contains(el) && el.querySelector('#pj-pane') && (tab === 'docs' || tab === 'overview')) { var p = SK.projects.byId(id); if (p) pane(p); } });

  SK.route('project', { title: 'ข้อมูลโครงการ', nav: 'projects', render: render, leave: function () { if (mapCtl) { mapCtl.map.remove(); mapCtl = null; } } });
})();
