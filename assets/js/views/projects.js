// ทะเบียนโครงการ: ค้นหา กรอง (ปีงบ หมู่บ้าน ประเภท สถานะ) แบบตารางหรือการ์ด
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var f = { year: '', village: '', category: '', status: '', q: '' }, mode = 'table', el = null, sort = 'urgent';
  try { mode = localStorage.getItem('sk-projects-mode') || 'table'; } catch (e) {}

  function render(root, r) {
    el = root;
    if (r && r.query && r.query.has('q')) f.q = r.query.get('q');
    var P = SK.projects;
    root.innerHTML = V.pageHead({
      kicker: '<span class="chip-blue">' + icon('inventory_2', 'text-[14px]') + 'ฐานข้อมูลโครงการของระบบหลัก</span>',
      title: 'ทะเบียนโครงการ',
      desc: 'โครงการทั้งหมดจากชีท "ฐานข้อมูลโครงการ" — เพิ่ม/แก้ไขด้วยแบบฟอร์ม "กรอกข้อมูลโครงการ" ของระบบหลัก',
      actions: '<a href="#/data" class="btn-glass">' + icon('upload_file') + '<span>นำเข้า / ส่งออก Excel</span></a><a href="#/entry" class="btn-primary">' + icon('add_circle') + '<span>กรอกข้อมูลโครงการ</span></a>'
    }) + '<section class="card card-pad" id="pr-box">' + (P.loaded ? '' : V.loading(300)) + '</section>';
    if (P.loaded) body();
  }
  function body() {
    var box = el.querySelector('#pr-box'), all = SK.projects.list;
    if (!all.length) { box.innerHTML = V.noProjects(); return; }
    var C = SK.projects.CATEGORIES, S = SK.projects.STATUSES;
    box.innerHTML =
      '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end">' +
        '<label class="field sm:col-span-2 xl:col-span-1"><span>ค้นหา</span><span class="relative">' + icon('search', 'absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]') +
          '<input id="pr-q" type="search" class="input !pl-10" value="' + esc(f.q) + '" placeholder="ชื่อโครงการ ผู้รับจ้าง เลขที่สัญญา หมู่บ้าน..."/></span></label>' +
        '<label class="field"><span>ปีงบประมาณ</span><select id="pr-year" class="input">' + V.yearOptions(f.year) + '</select></label>' +
        '<label class="field"><span>หมู่บ้าน</span><select id="pr-village" class="input">' + V.villageOptions(f.village) + '</select></label>' +
        '<label class="field"><span>ประเภทงาน</span><select id="pr-cat" class="input">' + V.options(Object.keys(C).map(function (k) { return [k, C[k].label]; }), f.category, 'ทุกประเภท') + '</select></label>' +
        '<label class="field"><span>สถานะ</span><select id="pr-status" class="input">' + V.options(Object.keys(S).map(function (k) { return [k, S[k].label]; }), f.status, 'ทุกสถานะ') + '</select></label>' +
        '<div class="flex gap-1 p-1 rounded-full bg-surface-container-low self-end" role="group" aria-label="รูปแบบการแสดง">' +
          '<button type="button" data-mode="table" class="icon-btn ' + (mode === 'table' ? 'bg-white text-primary shadow-sm' : '') + '" aria-label="ตาราง" aria-pressed="' + (mode === 'table') + '">' + icon('table_rows') + '</button>' +
          '<button type="button" data-mode="cards" class="icon-btn ' + (mode === 'cards' ? 'bg-white text-primary shadow-sm' : '') + '" aria-label="การ์ด" aria-pressed="' + (mode === 'cards') + '">' + icon('grid_view') + '</button></div>' +
      '</div><div id="pr-list" class="mt-5"></div>';
    list();
    var q = box.querySelector('#pr-q');
    q.addEventListener('input', function () { f.q = q.value; list(); });
    [['pr-year', 'year'], ['pr-village', 'village'], ['pr-cat', 'category'], ['pr-status', 'status']].forEach(function (x) {
      box.querySelector('#' + x[0]).addEventListener('change', function () { f[x[1]] = this.value; list(); });
    });
  }
  function list() {
    var out = el.querySelector('#pr-list');
    var items = V.filter(SK.projects.list, f);
    var order = { delayed: 0, progress: 1, pending: 2, completed: 3 };
    items.sort(sort === 'urgent' ? function (a, b) { return order[a.status] - order[b.status] || b.rowNumber - a.rowNumber; }
      : sort === 'budget' ? function (a, b) { return b.budget - a.budget; } : function (a, b) { return b.rowNumber - a.rowNumber; });
    var sum = items.reduce(function (s, p) { return s + p.budget; }, 0);
    var head = '<div class="flex flex-wrap items-center justify-between gap-2 mb-3"><p class="font-label-lg text-label-lg">พบ <b class="text-primary">' + items.length + '</b> โครงการ • ค่างานรวม <b>฿' + SK.money(sum, 0) + '</b></p>' +
      '<label class="flex items-center gap-2 font-label-md text-label-md text-outline">เรียงตาม<select id="pr-sort" class="input !w-auto !py-1.5 !rounded-full">' +
      V.options([['urgent', 'ความเร่งด่วน'], ['newest', 'เพิ่มล่าสุด'], ['budget', 'ค่างานสูงสุด']], sort) + '</select></label></div>';
    if (!items.length) { out.innerHTML = head + V.empty('search_off', 'ไม่พบโครงการตามเงื่อนไข', 'ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา'); bindSort(); return; }
    if (mode === 'cards') {
      out.innerHTML = head + '<div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-gutter">' + items.map(card).join('') + '</div>';
      SK.photos.hydrate(out);
    } else {
      out.innerHTML = head + '<div class="overflow-x-auto -mx-2"><table class="table-clean min-w-[860px]"><thead><tr><th>รหัส</th><th>โครงการ</th><th>หมู่บ้าน</th><th>ปีงบ</th><th class="text-right">ค่างาน (บาท)</th><th>ผู้รับจ้าง</th><th>สถานะ</th><th>ความคืบหน้า</th></tr></thead><tbody>' +
        items.map(function (p) {
          return '<tr class="cursor-pointer" data-go="' + p.id + '"><td class="font-mono text-[12px] text-outline whitespace-nowrap">' + p.id + '</td>' +
            '<td class="max-w-[340px]"><a href="#/project/' + p.id + '" class="font-label-lg text-label-lg font-semibold hover:text-primary leading-snug">' + esc(p.name) + '</a><span class="block font-body-sm text-body-sm text-outline">' + esc(p.type || '') + (p.contractNo ? ' • สัญญา ' + esc(p.contractNo) : '') + '</span></td>' +
            '<td class="whitespace-nowrap">' + esc(p.villageNo ? 'ม.' + p.villageNo : '-') + '<span class="block font-body-sm text-body-sm text-outline">' + esc(p.villageName || '') + '</span></td>' +
            '<td>' + esc(p.year || '-') + '</td><td class="text-right font-label-lg text-label-lg whitespace-nowrap">' + SK.money(p.budget, 0) + '</td>' +
            '<td class="max-w-[180px]">' + esc(p.contractor || '-') + '</td><td>' + SK.projects.statusChip(p) + '</td><td>' + V.progress(p) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    bindSort();
  }
  function bindSort() { var s = el.querySelector('#pr-sort'); if (s) s.addEventListener('change', function () { sort = this.value; list(); }); }
  function card(p) {
    var ph = SK.photos.of(p.id)[0], cat = SK.projects.CATEGORIES[p.category];
    return '<a href="#/project/' + p.id + '" class="group flex flex-col rounded-[24px] bg-surface-container-low/60 hover:bg-white hover:shadow-md ring-1 ring-transparent hover:ring-[rgba(15,23,42,0.06)] transition-all overflow-hidden">' +
      '<span class="relative block h-36 bg-gradient-to-br from-primary-fixed to-surface-container overflow-hidden">' +
        (ph ? '<img data-photo-id="' + esc(ph.id) + '" alt="" class="w-full h-full object-cover"/>' : '<span class="absolute inset-0 flex items-center justify-center text-primary/40">' + icon(cat.icon, 'text-[56px]') + '</span>') +
        '<span class="absolute top-3 left-3">' + SK.projects.statusChip(p) + '</span><span class="absolute top-3 right-3 chip bg-white/90 text-on-surface">' + p.id + '</span></span>' +
      '<span class="p-4 flex flex-col gap-2 flex-1"><span class="font-label-lg text-label-lg font-semibold leading-snug line-clamp-2 group-hover:text-primary">' + esc(p.name) + '</span>' +
        '<span class="font-body-sm text-body-sm text-outline">' + icon('location_on', 'text-[14px] align-middle') + ' ' + esc(p.place || '-') + ' • ปีงบ ' + esc(p.year || '-') + '</span>' +
        '<span class="flex items-end justify-between gap-3 mt-auto pt-2"><span><span class="block font-body-sm text-body-sm text-outline">ค่างาน</span><b class="font-label-lg text-label-lg">฿' + SK.money(p.budget, 0) + '</b></span>' + V.progress(p) + '</span></span></a>';
  }

  document.addEventListener('click', function (e) {
    if (!el || !document.body.contains(el) || !el.querySelector('#pr-box')) return;
    var m = e.target.closest('[data-mode]');
    if (m && el.contains(m)) { mode = m.dataset.mode; try { localStorage.setItem('sk-projects-mode', mode); } catch (er) {} body(); return; }
    var tr = e.target.closest('tr[data-go]');
    if (tr && el.contains(tr) && !e.target.closest('a,button')) SK.go('project/' + tr.dataset.go);
  });
  SK.route('projects', { title: 'ทะเบียนโครงการ', render: render, refresh: function () { if (el && document.body.contains(el)) { if (el.querySelector('#pr-list')) list(); else body(); } } });
})();
