// ส่วนประกอบหน้าจอที่ใช้ร่วมกันทุกหน้า
(function () {
  'use strict';
  var SK = window.SK, esc = SK.esc, icon = SK.icon;

  function pageHead(o) {
    return '<section class="card overflow-hidden card-pad mb-space-lg">' +
      '<div class="relative flex flex-col md:flex-row md:items-center justify-between gap-space-md">' +
        '<div class="min-w-0 space-y-1">' +
          (o.kicker ? '<div class="flex flex-wrap items-center gap-2">' + o.kicker + '</div>' : '') +
          '<h1 class="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface font-semibold tracking-tight">' + o.title + '</h1>' +
          (o.desc ? '<p class="font-body-md text-body-md text-on-surface-variant max-w-3xl">' + o.desc + '</p>' : '') +
        '</div>' +
        (o.actions ? '<div class="flex flex-wrap items-center gap-2.5 shrink-0">' + o.actions + '</div>' : '') +
      '</div></section>';
  }
  function kpi(o) {
    return '<div class="card p-5 hover:shadow-md transition-all">' +
      '<div class="flex items-start justify-between gap-2"><div class="w-10 h-10 rounded-xl ' + (o.tone || 'bg-primary/10 text-primary') + ' flex items-center justify-center">' + icon(o.icon, 'text-[22px]') + '</div>' + (o.badge || '') + '</div>' +
      '<div class="mt-4"><span class="font-label-md text-label-md text-outline">' + esc(o.label) + '</span>' +
      '<div class="flex items-baseline gap-2 mt-1 flex-wrap"><span class="font-display-lg-mobile text-[34px] leading-[42px] text-on-surface font-bold">' + o.value + '</span><span class="font-body-md text-body-md text-secondary">' + (o.unit || '') + '</span></div></div>' +
      (o.bar != null ? '<div class="mt-3 flex items-center gap-2"><div class="bar flex-1"><i style="width:' + Math.max(0, Math.min(100, o.bar)) + '%;' + (o.barColor ? 'background:' + o.barColor : '') + '"></i></div><span class="font-label-sm text-label-sm text-outline whitespace-nowrap">' + esc(o.barLabel || '') + '</span></div>' : '') +
      '</div>';
  }
  function progress(p, wide) {
    var color = (SK.projects.STATUSES[p.status] || {}).color || '#006194';
    return '<div class="' + (wide ? 'w-full' : 'w-24') + '"><div class="flex justify-between font-label-md text-label-md mb-1"><b style="color:' + color + '">' + Math.round(p.actual) + '%</b>' +
      (p.plan && p.status !== 'completed' ? '<span class="text-outline">แผน ' + Math.round(p.plan) + '%</span>' : '') + '</div><div class="bar"><i style="width:' + p.actual + '%;background:' + color + '"></i></div></div>';
  }
  function empty(ic, title, desc, action) {
    return '<div class="flex flex-col items-center text-center gap-2 py-10 px-4"><span class="w-14 h-14 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center">' + icon(ic, 'text-[28px]') + '</span>' +
      '<p class="font-headline-sm text-headline-sm font-semibold">' + title + '</p>' + (desc ? '<p class="muted max-w-md">' + desc + '</p>' : '') + (action ? '<div class="mt-2 flex flex-wrap justify-center gap-2">' + action + '</div>' : '') + '</div>';
  }
  function loading(h) { return '<div class="skeleton" style="height:' + (h || 160) + 'px"></div>'; }

  // กรองโครงการ: { year, village, category, status, q }
  function filter(list, f) {
    var q = String(f.q || '').trim().toLowerCase();
    return list.filter(function (p) {
      if (f.year && String(p.year) !== String(f.year)) return false;
      if (f.village && p.villageNo !== String(f.village)) return false;
      if (f.category && p.category !== f.category) return false;
      if (f.status && p.status !== f.status) return false;
      if (q) {
        var hay = [p.id, p.name, p.contractor, p.contractNo, p.place, p.villageName, p.type, p.supervisor, p.source].join(' ').toLowerCase();
        if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false;
      }
      return true;
    });
  }
  function options(list, value, all) {
    return (all ? '<option value="">' + esc(all) + '</option>' : '') + list.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
  }
  function yearOptions(value, all) { return options(SK.projects.years().map(function (y) { return [y, 'ปีงบประมาณ ' + y]; }), value, all || 'ทุกปีงบประมาณ'); }
  function villageOptions(value, all) { return options(SK.projects.villages().map(function (v) { return [v.no, 'หมู่ที่ ' + v.no + (v.name ? ' ' + v.name : '')]; }), value, all || 'ทุกหมู่บ้าน'); }
  function projectOptions(value, list) {
    return options((list || SK.projects.list).map(function (p) { return [p.id, p.id + ' • ' + p.name]; }), value, '— เลือกโครงการ —');
  }
  // โครงการยังไม่มีในฐานข้อมูล
  function noProjects() {
    var info = SK.projects.info;
    return empty('inventory_2', 'ยังไม่มีโครงการในฐานข้อมูล', (info.error ? esc(info.error) + '<br>' : '') + 'กรอกข้อมูลโครงการด้วยแบบฟอร์มของระบบหลัก หรือนำเข้าทั้งหมดจากไฟล์ Excel ของ Google Sheet',
      '<a href="#/entry" class="btn-primary">' + icon('add_circle') + '<span>กรอกข้อมูลโครงการ</span></a><a href="#/data" class="btn-glass">' + icon('upload_file') + '<span>นำเข้าจาก Excel</span></a>');
  }

  // ให้กล่องสูงพอดีหน้าจอ (หน้าเว็บไม่ต้องเลื่อน เลื่อนเฉพาะในกล่อง)
  var fitted = [];
  function fit(el, bottom) {
    if (!el) return;
    el.__fitBottom = bottom == null ? 24 : bottom;
    var apply = function () {
      if (!document.body.contains(el)) return;
      var top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = Math.max(420, window.innerHeight - top - el.__fitBottom) + 'px';
    };
    apply();
    fitted = fitted.filter(function (x) { return document.body.contains(x.el); });
    fitted.push({ el: el, apply: apply });
  }
  window.addEventListener('resize', function () { fitted.forEach(function (x) { x.apply(); }); });

  SK.view = { fit: fit, pageHead: pageHead, kpi: kpi, progress: progress, empty: empty, loading: loading, filter: filter, options: options, yearOptions: yearOptions, villageOptions: villageOptions, projectOptions: projectOptions, noProjects: noProjects };
})();
