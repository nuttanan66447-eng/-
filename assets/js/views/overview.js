// หน้าภาพรวมโครงการ (แดชบอร์ด) ตามแบบ design/dashboard.png
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var state = { year: null, cat: '', q: '', page: 1 }, PER = 5, mapCtl = null, el = null;

  var SHORTCUTS = [
    { key: 'memo', icon: 'description', note: 'รายงานผลการก่อสร้างประจำสัปดาห์' },
    { key: 'centralPrice', icon: 'calculate', note: 'บันทึก คำสั่ง รายงานการประชุม และรายงานผล' },
    { key: 'completion', icon: 'task_alt', note: 'รายงานวันถึงกำหนดส่งมอบงานของผู้รับจ้าง' },
    { key: 'testResult', icon: 'science', note: 'ดิน เหล็ก คอนกรีต AC Job-mix' }
  ];

  function render(root) {
    el = root;
    var P = SK.projects;
    if (!P.loaded) { root.innerHTML = V.loading(170) + '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter mt-space-lg">' + [1, 2, 3, 4].map(function () { return V.loading(150); }).join('') + '</div>'; return; }
    if (state.year === null) state.year = P.years()[0] || '';
    var name = SK.cloud.user ? SK.cloud.displayName() : 'ผู้ใช้งาน';
    var all = P.list, list = V.filter(all, { year: state.year });
    var active = list.filter(function (p) { return p.status === 'progress' || p.status === 'delayed'; });
    var done = list.filter(function (p) { return p.status === 'completed'; });
    var late = list.filter(function (p) { return p.status === 'delayed'; });
    var budget = list.reduce(function (s, p) { return s + p.budget; }, 0);
    var doneBudget = done.reduce(function (s, p) { return s + p.budget; }, 0);
    var avg = active.length ? Math.round(active.reduce(function (s, p) { return s + p.actual; }, 0) / active.length) : 0;
    var today = SK.todayIso(), soon = SK.todayIso.call(null);
    var due = list.filter(function (p) { return p.end && p.status !== 'completed' && p.end >= today; })
      .sort(function (a, b) { return a.end.localeCompare(b.end); });
    var due30 = due.filter(function (p) { return (Date.parse(p.end) - Date.parse(soon)) / 86400000 <= 30; });

    root.innerHTML =
      V.pageHead({
        kicker: '<span class="chip-blue"><span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>ฐานข้อมูลโครงการ ' + (P.info.count || 0) + ' โครงการ</span><span class="text-outline">•</span><span class="font-body-sm text-body-sm text-secondary">' + SK.dateFull() + '</span>',
        title: SK.greeting() + ', <span class="text-primary">' + esc(name) + '</span>',
        desc: 'ภาพรวมความก้าวหน้าโครงการก่อสร้าง งานเอกสารราชการ และการติดตามงานของกองช่าง เทศบาลตำบลสีแก้ว' + (state.year ? ' ประจำปีงบประมาณ พ.ศ. ' + state.year : ''),
        actions: '<label class="sr-only" for="ov-year">ปีงบประมาณ</label><select id="ov-year" class="input !w-auto !py-2 !rounded-full">' + V.yearOptions(state.year) + '</select>' +
          '<button type="button" data-ov="export" class="btn-glass">' + icon('ios_share') + '<span>ส่งออกรายงานสรุป</span></button>' +
          '<a href="#/entry" class="btn-primary">' + icon('add_circle') + '<span>สร้างโครงการใหม่</span></a>'
      }) +
      (!all.length ? '<div class="card">' + V.noProjects() + '</div>' :
      '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">' +
        V.kpi({ icon: 'foundation', label: 'โครงการกำลังดำเนินการ', value: active.length, unit: 'โครงการ', bar: avg, barLabel: 'เฉลี่ย ' + avg + '% คืบหน้า',
          badge: '<span class="chip-blue">' + icon('stacks', 'text-[14px]') + 'ทั้งหมด ' + list.length + '</span>' }) +
        V.kpi({ icon: 'payments', tone: 'bg-tertiary/10 text-tertiary', label: 'งบประมาณรวม (ค่างาน)', value: SK.moneyShort(budget), unit: 'บาท', bar: budget ? doneBudget / budget * 100 : 0, barColor: '#007da9',
          barLabel: (budget ? Math.round(doneBudget / budget * 100) : 0) + '% แล้วเสร็จ', badge: '<span class="chip-gray">' + esc(state.year ? 'ปีงบ ' + state.year : 'ทุกปี') + '</span>' }) +
        V.kpi({ icon: 'task_alt', tone: 'bg-[rgba(39,201,63,0.12)] text-[#15803d]', label: 'โครงการแล้วเสร็จ', value: done.length, unit: 'โครงการ', bar: list.length ? done.length / list.length * 100 : 0, barColor: '#22c55e',
          barLabel: (list.length ? Math.round(done.length / list.length * 100) : 0) + '% ของทั้งหมด', badge: '<span class="chip-green"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>ส่งมอบแล้ว</span>' }) +
        V.kpi({ icon: 'assignment_late', tone: 'bg-error-container text-error', label: 'ล่าช้า / ใกล้ครบสัญญา (30 วัน)', value: late.length + ' / ' + due30.length, unit: 'โครงการ',
          badge: '<span class="chip-red">ติดตามเร่งรัด</span>' }) +
      '</div>' +
      '<div class="grid grid-cols-1 xl:grid-cols-12 gap-gutter mt-gutter items-start">' +
        '<section class="xl:col-span-8 card card-pad" id="ov-table"></section>' +
        '<div class="xl:col-span-4 flex flex-col gap-gutter">' +
          '<section class="card card-pad"><div class="flex items-start justify-between gap-2 mb-3"><h2 class="card-title">' + icon('map') + 'พิกัดโครงการ (GIS Map)</h2><a href="#/map" class="font-label-md text-label-md text-primary font-semibold hover:underline whitespace-nowrap">ขยายเต็มจอ →</a></div>' +
            '<p class="muted font-body-sm text-body-sm mb-3">หมุดโครงการและขอบเขตตำบลสีแก้ว</p>' +
            '<div id="ov-map" class="h-64 rounded-[24px] overflow-hidden bg-surface-container"></div>' +
            '<div class="flex flex-wrap gap-2 mt-3">' + Object.keys(SK.projects.STATUSES).map(function (k) {
              var s = SK.projects.STATUSES[k], n = list.filter(function (p) { return p.status === k; }).length;
              return n ? '<span class="chip-gray"><span class="w-2 h-2 rounded-full" style="background:' + s.color + '"></span>' + s.label + ' (' + n + ')</span>' : '';
            }).join('') + '</div></section>' +
          '<section class="card card-pad"><div class="flex items-center justify-between gap-2 mb-3"><h2 class="card-title">' + icon('event') + 'ใกล้ครบกำหนดสัญญา</h2><span class="chip-blue">' + due.length + ' โครงการ</span></div>' +
            (due.length ? '<div class="flex flex-col gap-2.5">' + due.slice(0, 4).map(dueItem).join('') + '</div>' : '<p class="muted font-body-sm text-body-sm">ไม่มีโครงการที่กำลังจะครบกำหนดสัญญา</p>') +
            '<a href="#/tracking" class="btn-glass w-full mt-4">' + icon('photo_camera') + '<span>ติดตามงานและรูปภาพ</span></a></section>' +
          '<section class="card card-pad"><div class="flex items-center justify-between gap-2 mb-3"><h2 class="card-title">' + icon('engineering') + 'ผู้ควบคุมงาน</h2><span class="w-2 h-2 rounded-full bg-emerald-500"></span></div>' + supervisors(list) + '</section>' +
        '</div>' +
      '</div>' +
      '<section class="card card-pad mt-gutter"><div class="flex flex-wrap items-center justify-between gap-2 mb-4"><h2 class="card-title">' + icon('folder_open') + 'ทางลัดเอกสารราชการกองช่าง</h2><a href="#/documents" class="font-label-md text-label-md text-primary font-semibold hover:underline">เอกสารทั้งหมด →</a></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">' + SHORTCUTS.map(shortcut).join('') + '</div></section>');

    if (!all.length) return;
    renderTable();
    root.querySelector('#ov-year').addEventListener('change', function () { state.year = this.value; state.page = 1; render(root); });
    mapCtl = SK.map.create(root.querySelector('#ov-map'), { projects: list, zoomControl: false, onPin: function (p) { SK.go('project/' + p.id); } });
  }
  function dueItem(p) {
    var d = Math.round((Date.parse(p.end) - Date.parse(SK.todayIso())) / 86400000);
    var dt = new Date(Date.parse(p.end));
    return '<a href="#/project/' + p.id + '" class="flex items-center gap-3 p-3 rounded-[20px] bg-surface-container-low/70 hover:bg-surface-container transition-colors">' +
      '<span class="w-12 h-12 shrink-0 rounded-full ' + (d <= 7 ? 'bg-error text-white' : 'bg-primary text-on-primary') + ' flex flex-col items-center justify-center leading-none"><small class="text-[9px] opacity-80">' + SK.MONTHS[dt.getMonth()].slice(0, 3) + '</small><b class="text-[17px]">' + dt.getDate() + '</b></span>' +
      '<span class="min-w-0 flex-1"><span class="chip-blue !py-0.5 mb-1">' + (d === 0 ? 'ครบวันนี้' : 'อีก ' + d + ' วัน') + '</span><span class="block font-label-lg text-label-lg font-semibold truncate">' + esc(p.name) + '</span>' +
      '<span class="block font-body-sm text-body-sm text-outline truncate">' + icon('person', 'text-[13px] align-middle') + ' ' + esc(p.contractor || '-') + '</span></span></a>';
  }
  function supervisors(list) {
    var by = {};
    list.forEach(function (p) { if (p.supervisor) (by[p.supervisor] = by[p.supervisor] || { name: p.supervisor, pos: p.supervisorPosition, n: 0, active: 0 }).n++; if (p.supervisor && p.status !== 'completed') by[p.supervisor].active++; });
    var arr = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.active - a.active || b.n - a.n; });
    if (!arr.length) return '<p class="muted font-body-sm text-body-sm">ยังไม่ได้กำหนดผู้ควบคุมงานในโครงการ</p>';
    return '<div class="flex flex-col gap-2">' + arr.slice(0, 4).map(function (s) {
      var ini = s.name.replace(/^(นาย|นางสาว|นาง|ว่าที่.*?ตรี|จ\.ส\.อ\.|พ\.อ\.ต\.)\s*/, '').slice(0, 2);
      return '<div class="flex items-center gap-3 p-3 rounded-[20px] bg-surface-container-low/70"><span class="w-10 h-10 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-lg text-label-lg">' + esc(ini) + '</span>' +
        '<span class="min-w-0 flex-1"><span class="block font-label-lg text-label-lg font-semibold truncate">' + esc(s.name) + '</span><span class="block font-body-sm text-body-sm text-outline truncate">' + esc(s.pos || 'ผู้ควบคุมงาน') + '</span></span>' +
        '<span class="chip-blue">' + s.active + '/' + s.n + '</span></div>';
    }).join('') + '</div><p class="mt-3 font-body-sm text-body-sm text-outline">ตัวเลข = โครงการที่ยังไม่แล้วเสร็จ / ทั้งหมด</p>';
  }
  function shortcut(s) {
    var d = SK.engine.doc(s.key) || { title: s.key };
    return '<a href="#/documents?doc=' + s.key + '" class="group flex flex-col gap-3 p-5 rounded-[24px] bg-surface-container-low/70 hover:bg-surface-container transition-colors">' +
      '<span class="flex items-center justify-between"><span class="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-sm">' + icon(s.icon, 'text-[22px]') + '</span>' + icon('arrow_forward', 'text-outline group-hover:text-primary transition-colors') + '</span>' +
      '<span><span class="block font-headline-sm text-[18px] leading-6 font-semibold">' + esc(d.title) + '</span><span class="block font-body-sm text-body-sm muted mt-1">' + esc(s.note) + '</span></span></a>';
  }

  function renderTable() {
    var box = el.querySelector('#ov-table');
    if (!box) return;
    var base = V.filter(SK.projects.list, { year: state.year });
    var list = V.filter(base, { category: state.cat, q: state.q });
    list.sort(function (a, b) { var o = { delayed: 0, progress: 1, pending: 2, completed: 3 }; return o[a.status] - o[b.status] || b.rowNumber - a.rowNumber; });
    var pages = Math.max(1, Math.ceil(list.length / PER));
    state.page = Math.min(state.page, pages);
    var rows = list.slice((state.page - 1) * PER, state.page * PER);
    var cats = [['', 'ทั้งหมด', base.length]].concat(Object.keys(SK.projects.CATEGORIES).map(function (k) {
      return [k, SK.projects.CATEGORIES[k].label.split(' /')[0], base.filter(function (p) { return p.category === k; }).length];
    })).filter(function (c) { return c[0] === '' || c[2]; });
    box.innerHTML =
      '<div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="card-title">' + icon('stacks') + 'ทะเบียนงานโครงการและสัญญาจ้าง</h2>' +
        '<p class="muted font-body-sm text-body-sm mt-1">เรียงตามความเร่งด่วน • กดที่โครงการเพื่อดูรายละเอียด ความคืบหน้า รูปภาพ และเอกสาร</p></div>' +
        '<div class="flex gap-2"><a href="#/projects" class="icon-btn bg-surface-container-low" title="ทะเบียนโครงการทั้งหมด" aria-label="ทะเบียนโครงการทั้งหมด">' + icon('open_in_full', 'text-[19px]') + '</a></div></div>' +
      '<div class="flex flex-col md:flex-row md:items-center gap-3 my-4"><div class="tabs" role="tablist">' + cats.map(function (c) {
        return '<button type="button" class="tab' + (state.cat === c[0] ? ' is-active' : '') + '" data-cat="' + c[0] + '" role="tab" aria-selected="' + (state.cat === c[0]) + '">' + esc(c[1]) + ' (' + c[2] + ')</button>';
      }).join('') + '</div>' +
      '<label class="flex-1 flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low">' + icon('search', 'text-outline text-[18px]') + '<span class="sr-only">ค้นหา</span><input id="ov-q" type="search" value="' + esc(state.q) + '" placeholder="ค้นหาเลขที่สัญญา, ชื่องาน..." class="bg-transparent outline-none w-full font-body-sm text-body-sm"/></label></div>' +
      (rows.length ? '<div class="overflow-x-auto -mx-2"><table class="table-clean min-w-[720px]"><thead><tr><th>โครงการ &amp; เลขที่สัญญา</th><th>ผู้รับจ้าง</th><th>ค่างาน</th><th>สถานะงาน</th><th>ความคืบหน้า</th><th class="w-10"><span class="sr-only">เอกสาร</span></th></tr></thead><tbody>' +
        rows.map(function (p) {
          return '<tr class="cursor-pointer" data-go="' + p.id + '"><td class="max-w-[320px]"><a href="#/project/' + p.id + '" class="block font-label-lg text-label-lg font-semibold text-on-surface hover:text-primary leading-snug">' + esc(p.name) + '</a>' +
            '<span class="block font-body-sm text-body-sm text-outline mt-1">' + esc(p.contractNo ? 'สัญญา ' + p.contractNo : p.id) + ' • ' + esc(p.place || p.type || '') + '</span></td>' +
            '<td class="max-w-[180px]"><span class="block font-body-md text-body-md">' + esc(p.contractor || '-') + '</span>' + (p.supervisor ? '<span class="block font-body-sm text-body-sm text-outline">ควบคุม: ' + esc(p.supervisor) + '</span>' : '') + '</td>' +
            '<td class="whitespace-nowrap"><b class="font-label-lg text-label-lg">฿' + SK.money(p.budget, 0) + '</b><span class="block font-body-sm text-body-sm text-outline">' + esc(p.source || '') + '</span></td>' +
            '<td>' + SK.projects.statusChip(p) + '</td><td>' + V.progress(p) + '</td>' +
            '<td><a href="#/documents?project=' + p.id + '" class="icon-btn" title="พิมพ์เอกสารของโครงการนี้" aria-label="พิมพ์เอกสาร ' + esc(p.name) + '">' + icon('print', 'text-[20px]') + '</a></td></tr>';
        }).join('') + '</tbody></table></div>' : V.empty('search_off', 'ไม่พบโครงการ', 'ลองเปลี่ยนคำค้นหาหรือหมวดงาน')) +
      '<div class="flex flex-wrap items-center justify-between gap-3 mt-4"><span class="font-body-sm text-body-sm text-outline">แสดง ' + rows.length + ' จาก ' + list.length + ' โครงการ</span>' +
        (pages > 1 ? '<div class="flex items-center gap-1"><button type="button" class="btn-ghost !px-3" data-page="' + (state.page - 1) + '"' + (state.page === 1 ? ' disabled' : '') + '>ย้อนกลับ</button>' +
          pageNums(pages).map(function (n) { return n === '…' ? '<span class="px-1 text-outline">…</span>' : '<button type="button" data-page="' + n + '" class="w-8 h-8 rounded-full font-label-md text-label-md ' + (n === state.page ? 'bg-primary text-on-primary' : 'hover:bg-surface-container') + '">' + n + '</button>'; }).join('') +
          '<button type="button" class="btn-ghost !px-3" data-page="' + (state.page + 1) + '"' + (state.page === pages ? ' disabled' : '') + '>ถัดไป</button></div>' : '') + '</div>';
    var q = box.querySelector('#ov-q');
    q.addEventListener('input', function () { state.q = q.value; state.page = 1; var pos = q.selectionStart; renderTable(); var nq = el.querySelector('#ov-q'); nq.focus(); nq.setSelectionRange(pos, pos); });
  }
  function pageNums(n) {
    var out = [], c = state.page;
    for (var i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - c) <= 1) out.push(i); else if (out[out.length - 1] !== '…') out.push('…');
    return out;
  }
  function exportCsv() {
    var list = V.filter(SK.projects.list, { year: state.year });
    var head = ['รหัส', 'ชื่อโครงการ', 'ประเภทงาน', 'สถานที่', 'ปีงบประมาณ', 'แหล่งงบประมาณ', 'ค่างาน', 'เลขที่สัญญา', 'ผู้รับจ้าง', 'ผู้ควบคุมงาน', 'วันเริ่มสัญญา', 'สิ้นสุดสัญญา', 'ความคืบหน้า (%)', 'สถานะ'];
    var rows = list.map(function (p) { return [p.id, p.name, p.type, p.place, p.year, p.source, p.budget, p.contractNo, p.contractor, p.supervisor, SK.dateLong(p.start), SK.dateLong(p.end), p.actual, (SK.projects.STATUSES[p.status] || {}).label]; });
    var csv = '﻿' + [head].concat(rows).map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    SK.download('sikaew-projects-summary-' + (state.year || 'all') + '.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }

  document.addEventListener('click', function (e) {
    if (!el || !document.body.contains(el) || !el.querySelector('#ov-table')) return;
    var c = e.target.closest('[data-cat]');
    if (c && el.contains(c)) { state.cat = c.dataset.cat; state.page = 1; renderTable(); return; }
    var pg = e.target.closest('[data-page]');
    if (pg && el.contains(pg) && !pg.disabled) { state.page = +pg.dataset.page; renderTable(); return; }
    if (e.target.closest('[data-ov="export"]')) { exportCsv(); return; }
    var tr = e.target.closest('tr[data-go]');
    if (tr && el.contains(tr) && !e.target.closest('a,button')) SK.go('project/' + tr.dataset.go);
  });

  SK.route('overview', { title: 'ภาพรวมโครงการ', render: render, leave: function () { if (mapCtl) { mapCtl.map.remove(); mapCtl = null; } } });
})();
