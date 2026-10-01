// หน้าทะเบียนโครงการ
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var PAGE = 6, page = 1, newestFirst = true;
  var FILTERS = { 'f-category': 'category', 'f-village': 'village', 'f-status': 'status', 'f-source': 'source' };
  var SOURCE_MAP = { local: 'local', 'general-grant': 'general-grant', 'specific-grant': 'specific-grant', accumulated: 'accumulated' };

  function filtered() {
    var q = $('searchKeyword').value.trim().toLowerCase();
    var f = {};
    Object.keys(FILTERS).forEach(function (id) {
      var v = $(id).value;
      if (v && v !== 'all') f[FILTERS[id]] = id === 'f-village' ? v : (id === 'f-source' ? SOURCE_MAP[v] : v);
    });
    var rows = SK.db.data.projects.filter(function (p) {
      for (var k in f) if (p[k] !== f[k]) return false;
      if (!q) return true;
      return [p.id, p.contractNo, p.egp, p.name, p.contractor, p.location, p.supervisor].join(' ').toLowerCase().indexOf(q) > -1;
    });
    rows.sort(function (a, b) {
      var c = (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id);
      return newestFirst ? -c : c;
    });
    return rows;
  }

  function rowHtml(p, i) {
    var diff = Math.round((p.actual - p.plan) * 10) / 10;
    var diffText = p.status === 'completed' ? 'ส่งมอบแล้ว' : p.status === 'signing' ? 'ยังไม่เริ่มสัญญา' : (diff >= 0 ? '+' + diff + '% เร็วกว่าแผน' : diff + '% ช้ากว่าแผน');
    var diffCls = p.status === 'delayed' ? 'text-error' : 'text-primary';
    return '<tr class="hover:bg-surface-container-low/60 transition-colors ' + (i % 2 ? 'bg-surface-container-lowest' : '') + '">' +
      '<td class="py-space-sm px-space-md align-top"><div class="flex flex-col">' +
        '<span class="font-code-sm text-code-sm font-bold text-primary">' + esc(p.id) + '</span>' +
        '<span class="font-code-sm text-code-sm text-on-surface-variant mt-space-2xs">' + esc(p.contractNo) + '</span>' +
        '<span class="font-label-sm text-label-sm text-on-surface-variant mt-space-2xs">e-GP: ' + esc(p.egp || '-') + '</span></div></td>' +
      '<td class="py-space-sm px-space-md align-top min-w-[280px]"><div class="flex flex-col">' +
        '<div class="flex items-start gap-space-xs"><span class="shrink-0 px-space-xs py-space-2xs rounded bg-surface-variant text-primary font-code-sm text-code-sm font-semibold">' + esc(ref.CATEGORIES[p.category].short) + '</span>' +
        '<button type="button" data-action="view-project" data-id="' + p.id + '" class="text-left font-headline-sm text-headline-sm font-bold text-primary hover:text-secondary">' + esc(p.name) + '</button></div>' +
        '<div class="flex items-center gap-space-xs text-on-surface-variant text-body-sm font-body-sm mt-space-2xs"><span class="material-symbols-outlined text-space-sm text-secondary">pin_drop</span><span>' + esc(ui.villageName(p.village)) + ' ต.สีแก้ว (' + esc(p.location) + ')</span></div>' +
        '<div class="flex flex-wrap items-center gap-space-sm text-label-sm font-label-sm text-on-surface-variant mt-space-xs"><span class="bg-surface-container-low px-space-xs py-space-2xs rounded">' + esc(ref.SOURCES[p.source]) + '</span>' +
        '<span>สัญญา: ' + ui.dateShort(p.start) + ' - ' + ui.dateShort(p.end) + '</span></div></div></td>' +
      '<td class="py-space-sm px-space-md align-top text-right"><div class="flex flex-col items-end">' +
        '<span class="font-headline-sm text-headline-sm font-bold text-primary font-mono">' + money(p.budget) + '</span>' +
        '<span class="font-code-sm text-code-sm text-on-surface-variant mt-space-2xs">เบิกแล้ว ' + money(p.disbursed) + ' บ.</span>' +
        '<span class="font-label-sm text-label-sm text-tertiary-container bg-surface-container-high px-space-xs py-space-2xs rounded mt-space-2xs">' + (p.status === 'signing' ? 'รอลงนาม' : 'งวดที่ ' + p.installment + '/' + p.installments) + '</span></div></td>' +
      '<td class="py-space-sm px-space-md align-top"><div class="flex flex-col">' +
        '<span class="font-headline-sm text-headline-sm font-semibold text-on-surface">' + esc(p.contractor) + '</span>' +
        '<div class="flex items-center gap-space-xs text-on-surface-variant text-body-sm font-body-sm mt-space-2xs"><span class="material-symbols-outlined text-space-sm text-primary">person</span><span>' + esc(p.supervisor) + '</span></div></div></td>' +
      '<td class="py-space-sm px-space-md align-top"><div class="flex flex-col gap-space-2xs">' +
        '<div class="flex items-center justify-between text-body-sm font-body-sm"><span class="font-semibold text-primary">งานจริง ' + p.actual + '%</span><span class="text-on-surface-variant font-code-sm text-code-sm">แผน ' + p.plan + '%</span></div>' +
        ui.progressBar(p.actual, p.status) +
        '<div class="flex items-center justify-between gap-1 text-label-sm font-label-sm text-on-surface-variant"><span>เบิกจ่าย: ' + (p.budget ? Math.round(p.disbursed / p.budget * 100) : 0) + '%</span><span class="' + diffCls + ' font-bold">' + diffText + '</span></div></div></td>' +
      '<td class="py-space-sm px-space-md align-top text-center">' + ui.statusBadge(p) + '</td>' +
      '<td class="py-space-sm px-space-md align-top text-center"><div class="flex items-center justify-center gap-space-xs">' +
        '<button type="button" data-action="view-project" data-id="' + p.id + '" class="p-space-xs rounded bg-surface-container-low hover:bg-surface-container-high text-primary transition-colors" title="ดูรายละเอียดโครงการ" aria-label="ดูรายละเอียด ' + esc(p.id) + '"><span class="material-symbols-outlined text-space-lg">visibility</span></button>' +
        '<button type="button" data-action="edit-project" data-id="' + p.id + '" class="p-space-xs rounded bg-surface-container-low hover:bg-surface-container-high text-secondary transition-colors" title="แก้ไข / บันทึกผลงาน" aria-label="แก้ไข ' + esc(p.id) + '"><span class="material-symbols-outlined text-space-lg">edit_note</span></button>' +
      '</div></td></tr>';
  }

  function pagerBtn(label, target, opts) {
    opts = opts || {};
    var cls = opts.active ? 'w-8 h-8 rounded bg-primary-container text-surface-bright font-code-sm text-code-sm font-bold' :
      opts.icon ? 'p-space-xs rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:text-outline disabled:cursor-not-allowed' :
        'w-8 h-8 rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container font-code-sm text-code-sm font-semibold';
    return '<button type="button" data-action="goto-page" data-page="' + target + '" class="flex items-center justify-center transition-colors ' + cls + '"' +
      (opts.disabled ? ' disabled' : '') + (opts.aria ? ' aria-label="' + opts.aria + '"' : '') + (opts.active ? ' aria-current="page"' : '') + '>' +
      (opts.icon ? '<span class="material-symbols-outlined text-space-lg">' + label + '</span>' : label) + '</button>';
  }

  function renderTable() {
    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / PAGE));
    page = Math.min(Math.max(1, page), pages);
    var slice = rows.slice((page - 1) * PAGE, page * PAGE);
    var total = SK.db.data.projects.length;
    $('projects-body').innerHTML = slice.map(rowHtml).join('') ||
      '<tr><td colspan="7" class="py-10 text-center text-on-surface-variant">ไม่พบโครงการที่ตรงกับเงื่อนไข <button type="button" data-action="reset-filters" class="text-primary font-semibold hover:underline">ล้างตัวกรอง</button></td></tr>';
    $('match-count').textContent = 'พบ ' + rows.length + ' รายการที่ตรงเงื่อนไข';
    $('table-count').textContent = 'แสดง ' + slice.length + ' จาก ' + total + ' แฟ้ม';
    $('page-sum').textContent = money(slice.reduce(function (s, p) { return s + p.budget; }, 0));
    $('range-text').innerHTML = rows.length ? 'แสดงรายการที่ <strong class="text-primary font-bold">' + ((page - 1) * PAGE + 1) + ' - ' + ((page - 1) * PAGE + slice.length) + '</strong> จากทั้งหมด <strong class="text-primary font-bold">' + rows.length + '</strong> รายการ' : 'ไม่มีรายการ';
    var html = pagerBtn('first_page', 1, { icon: true, disabled: page === 1, aria: 'หน้าแรก' }) + pagerBtn('chevron_left', page - 1, { icon: true, disabled: page === 1, aria: 'หน้าก่อนหน้า' });
    var start = Math.max(1, Math.min(page - 2, pages - 4));
    for (var i = start; i <= Math.min(pages, start + 4); i++) html += pagerBtn(i, i, { active: i === page });
    html += pagerBtn('chevron_right', page + 1, { icon: true, disabled: page === pages, aria: 'หน้าถัดไป' }) + pagerBtn('last_page', pages, { icon: true, disabled: page === pages, aria: 'หน้าสุดท้าย' });
    $('pager').innerHTML = html;
    $('sort-label').textContent = newestFirst ? 'ล่าสุด → เก่าสุด' : 'เก่าสุด → ล่าสุด';
  }

  function renderSummary() {
    var P = SK.db.data.projects;
    var budget = P.reduce(function (s, p) { return s + p.budget; }, 0);
    var disb = P.reduce(function (s, p) { return s + p.disbursed; }, 0);
    var n = function (f) { return P.filter(f).length; };
    $('sum-count').textContent = P.length;
    $('sum-budget').textContent = (budget / 1e6).toFixed(2);
    $('sum-disb').textContent = 'เบิกจ่ายแล้ว ' + (budget ? (disb / budget * 100).toFixed(1) : 0) + '%';
    $('sum-active').textContent = n(function (p) { return ['on-schedule', 'delayed', 'pending-inspection'].indexOf(p.status) > -1; });
    $('sum-late').textContent = 'ล่าช้ากว่าแผน ' + n(function (p) { return p.status === 'delayed'; }) + ' รายการ';
    $('sum-done').textContent = n(function (p) { return p.status === 'completed'; });
    $('sum-await').textContent = 'รอตรวจรับ ' + n(function (p) { return p.status === 'pending-inspection'; }) + ' รายการ';
  }

  function allPhotos() {
    var out = [];
    SK.flows.sortedDiary().forEach(function (e) {
      (e.photos || []).forEach(function (ph) { out.push({ src: ph.src, caption: ph.caption, entry: e }); });
    });
    return out;
  }
  function renderGallery() {
    var photos = allPhotos();
    $('gallery').innerHTML = photos.slice(0, 3).map(function (ph) {
      var p = SK.db.project(ph.entry.projectId) || {};
      return '<a href="progress.html?id=' + encodeURIComponent(ph.entry.projectId) + '" class="group relative rounded-lg overflow-hidden h-24 bg-surface-container">' +
        '<img class="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="' + esc(ph.caption) + '" src="' + esc(ph.src) + '"/>' +
        '<div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent flex items-end p-space-2xs"><span class="font-code-sm text-code-sm text-surface-bright truncate">' + esc(ui.villageName(p.village)) + '</span></div></a>';
    }).join('') || '<p class="col-span-3 text-on-surface-variant">ยังไม่มีภาพถ่าย</p>';
    $('gallery-count').textContent = 'ดูทั้งหมด (' + photos.length + ' รูป)';
    var last = SK.flows.sortedDiary()[0];
    $('gallery-updated').textContent = last ? 'อัปเดตล่าสุด: ' + ui.dateLong(last.date) + ' โดย ' + last.reporter : '';
  }

  function renderReminders() {
    var P = SK.db.data.projects;
    var items = P.filter(function (p) { return p.status === 'delayed'; }).map(function (p) {
      return { icon: 'notification_important', tone: 'text-error', title: p.id + ' ล่าช้ากว่าแผน ' + Math.round(p.plan - p.actual) + '%', text: p.name + ' — ควรออกหนังสือเร่งรัดตามระเบียบพัสดุ', action: 'urge', p: p, label: 'ออกหนังสือ ว.119' };
    }).concat(P.filter(function (p) { return p.status === 'pending-inspection'; }).map(function (p) {
      return { icon: 'assignment_turned_in', tone: 'text-primary', title: 'รอตรวจรับพัสดุ ' + p.id, text: p.name + ' — งวดที่ ' + p.installment + '/' + p.installments, action: 'inspect-record', p: p, label: 'บันทึกผลตรวจรับ' };
    }));
    $('reminders').innerHTML = items.slice(0, 4).map(function (it) {
      return '<div class="p-space-xs rounded bg-surface-container-low flex items-start gap-space-xs"><span class="material-symbols-outlined text-space-md ' + it.tone + ' mt-0.5">' + it.icon + '</span>' +
        '<div class="flex flex-col min-w-0 flex-1"><span class="font-headline-sm text-headline-sm text-on-surface font-semibold">' + esc(it.title) + '</span>' +
        '<span class="text-body-sm font-body-sm text-on-surface-variant">' + esc(it.text) + '</span>' +
        '<button type="button" data-action="' + it.action + '" data-project="' + it.p.id + '" class="self-start mt-1 text-label-sm font-label-sm font-bold text-primary hover:underline">' + it.label + ' →</button></div></div>';
    }).join('') || '<p class="text-on-surface-variant">ไม่มีรายการที่ต้องดำเนินการ</p>';
  }

  function refresh() { renderSummary(); renderTable(); renderGallery(); renderReminders(); }

  function chooseProject(title, icon, onPick) {
    ui.formModal({
      title: title, icon: icon, submitLabel: 'พิมพ์เอกสาร', submitIcon: 'print',
      fields: [{ name: 'id', label: 'โครงการ', type: 'select', span: 2, options: ui.projectOptions() }],
      onSubmit: function (v) { onPick(SK.db.project(v.id)); }
    });
  }

  Object.assign(SK.actions, {
    'new-project': function () { ui.openProjectForm(null, function () { page = 1; newestFirst = true; refresh(); }); },
    'export-csv': function () {
      var rows = filtered();
      var data = [['รหัสโครงการ', 'เลขที่สัญญา', 'e-GP', 'ชื่อโครงการ', 'ประเภทงาน', 'หมู่บ้าน', 'รายละเอียด', 'แหล่งงบประมาณ', 'วงเงินสัญญา', 'เบิกจ่ายแล้ว', 'งวดปัจจุบัน', 'จำนวนงวด', 'ผู้รับจ้าง', 'ผู้ควบคุมงาน', 'วันเริ่ม', 'วันสิ้นสุด', 'ผลงานจริง%', 'แผน%', 'สถานะ']]
        .concat(rows.map(function (p) {
          return [p.id, p.contractNo, p.egp, p.name, ref.CATEGORIES[p.category].label, ui.villageName(p.village), p.location, ref.SOURCES[p.source], p.budget, p.disbursed, p.installment, p.installments, p.contractor, p.supervisor, p.start, p.end, p.actual, p.plan, ref.STATUSES[p.status].label];
        }));
      ui.csv('projects-sikaew-' + ui.today() + '.csv', data);
      ui.toast('ส่งออก ' + rows.length + ' โครงการเป็นไฟล์ CSV (เปิดด้วย Excel ได้)', 'success');
    },
    'print-report': function () { SK.docs.print('slaReport', 'รายงานทะเบียนโครงการ', filtered(), 'รายงานทะเบียนโครงการก่อสร้าง (ส่ง สถ.)'); },
    'reset-filters': function () {
      $('searchKeyword').value = '';
      Object.keys(FILTERS).forEach(function (id) { $(id).value = 'all'; });
      page = 1; renderTable();
      history.replaceState(null, '', location.pathname);
      ui.toast('ล้างตัวกรองแล้ว แสดงโครงการทั้งหมด');
    },
    'do-search': function () { page = 1; renderTable(); ui.toast('พบ ' + filtered().length + ' โครงการ'); },
    'toggle-sort': function () { newestFirst = !newestFirst; renderTable(); },
    'goto-page': function (el) { page = Number(el.dataset.page); renderTable(); $('projects-body').closest('.rounded-xl').scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    'gallery': function () {
      var photos = allPhotos();
      ui.modal({
        title: 'ภาพตรวจงานช่างทั้งหมด', subtitle: photos.length + ' รูป จากสมุดบันทึกหน้างาน', icon: 'photo_library', size: 'lg',
        body: '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">' + photos.map(function (ph) {
          var p = SK.db.project(ph.entry.projectId) || {};
          return '<figure class="rounded-lg overflow-hidden bg-surface-container-low"><a href="' + esc(ph.src) + '" target="_blank" rel="noopener"><img src="' + esc(ph.src) + '" alt="' + esc(ph.caption) + '" class="w-full h-32 object-cover"/></a>' +
            '<figcaption class="p-2 font-body-sm text-body-sm"><strong>' + esc(ph.caption) + '</strong><br><a class="text-primary hover:underline" href="progress.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a><br><span class="text-on-surface-variant">' + ui.dateShort(ph.entry.date) + '</span></figcaption></figure>';
        }).join('') + '</div>'
      });
    },
    'form-supervisor': function () { chooseProject('บันทึกรายงานผู้ควบคุมงาน', 'description', function (p) { SK.docs.print('supervisorReport', 'บันทึกรายงานผู้ควบคุมงาน ' + p.id, p, SK.flows.sortedDiary(p.id)); }); },
    'form-installment': function () { chooseProject('ใบแจ้งตรวจรับงานงวด', 'receipt_long', function (p) { SK.docs.print('installmentNotice', 'ใบแจ้งตรวจรับงานงวด ' + p.id, p); }); },
    'form-boq': function () { chooseProject('แบบฟอร์ม BOQ ปร.4/ปร.5', 'assignment', function (p) { SK.docs.print('blankForm', 'แบบ ปร.4 ' + p.id, 'แบบแสดงรายการ ปริมาณงาน และราคา (แบบ ปร.4)', p); }); },
    'form-handover': function () { chooseProject('หนังสือส่งมอบงานจ้าง', 'request_quote', function (p) { SK.docs.print('handover', 'หนังสือส่งมอบงาน ' + p.id, p); }); }
  });

  SK.page = { refresh: refresh };
  ui.onReady(function () {
    var params = new URLSearchParams(location.search);
    if (params.get('category')) $('f-category').value = params.get('category');
    if (params.get('status')) $('f-status').value = params.get('status');
    if (params.get('q')) $('searchKeyword').value = params.get('q');
    $('searchKeyword').addEventListener('input', function () { page = 1; renderTable(); });
    Object.keys(FILTERS).forEach(function (id) { $(id).addEventListener('change', function () { page = 1; renderTable(); }); });
    refresh();
  });
})();
