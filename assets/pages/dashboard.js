// หน้าภาพรวมโครงการ (แดชบอร์ด)
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };

  var CENTER = SK.ref.CENTER;
  function center() { var e = SK.db.external; return e && e.center ? e.center : CENTER; }
  var GROUP = function (p) {
    if (p.status === 'completed') return 'done';
    if (p.status === 'delayed') return 'late';
    return 'active';
  };
  var GROUP_COLOR = { done: '#1e3a8a', active: '#fd651e', late: '#ba1a1a' };
  var CAT_STYLE = {
    road: { dot: 'bg-surface-tint', text: 'text-primary' },
    drainage: { dot: 'bg-secondary-container', text: 'text-secondary' },
    building: { dot: 'bg-tertiary', text: 'text-tertiary' },
    electrical: { dot: 'bg-primary', text: 'text-primary' }
  };

  // ---------- KPI ----------
  function renderKpis() {
    var P = SK.db.data.projects;
    var budget = P.reduce(function (s, p) { return s + p.budget; }, 0);
    var disb = P.reduce(function (s, p) { return s + p.disbursed; }, 0);
    var pct = budget ? disb / budget * 100 : 0;
    var count = function (f) { return P.filter(f).length; };
    $('kpi-budget').textContent = money(budget);
    $('kpi-disb').textContent = money(disb) + ' บาท';
    $('kpi-disb-pct').textContent = 'เบิกจ่ายแล้ว (' + pct.toFixed(2) + '%)';
    $('kpi-disb-bar').style.width = pct.toFixed(2) + '%';
    $('kpi-remain').textContent = 'คงเหลือ ' + money(budget - disb) + ' บาท';
    $('kpi-count').textContent = P.length;
    $('kpi-done').textContent = count(function (p) { return p.status === 'completed'; });
    $('kpi-plan').textContent = count(function (p) { return p.status === 'on-schedule' || p.status === 'pending-inspection'; });
    $('kpi-late').textContent = count(function (p) { return p.status === 'delayed'; });
    $('kpi-sign').textContent = count(function (p) { return p.status === 'signing' || p.status === 'unknown'; });
    var awaiting = count(function (p) { return p.status === 'pending-inspection'; });
    var delayed = count(function (p) { return p.status === 'delayed'; });
    $('kpi-urgent').textContent = delayed;
    $('kpi-await').textContent = awaiting + ' โครงการ';
    $('kpi-delayed').textContent = delayed + ' โครงการ';
    if (SK.db.external) {
      // การ์ดที่ 3 ในดีไซน์เป็นข้อมูลความปลอดภัยตัวอย่าง ซึ่งไม่มีในชีท: แสดงสัญญาที่จะสิ้นสุดใน 30 วันแทน
      var today = ui.today(), soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      var ending = P.filter(function (p) { return p.status !== 'completed' && p.end && p.end >= today && p.end <= soon; });
      var withGps = P.filter(function (p) { return !p.approxLocation; }).length;
      $('kpi3-title').textContent = 'สัญญาใกล้สิ้นสุด (30 วัน)';
      $('kpi3-value').textContent = ending.length;
      $('kpi3-unit').textContent = 'โครงการ';
      $('kpi3-sub').textContent = 'โครงการที่มีพิกัด GPS';
      $('kpi3-subval').textContent = withGps + ' / ' + P.length;
      $('kpi3-note').textContent = 'คำนวณจากวันสิ้นสุดสัญญาในฐานข้อมูลโครงการ';
    }
  }

  // ---------- งบประมาณตามประเภทงาน ----------
  function renderBudget() {
    var P = SK.db.data.projects;
    var total = P.reduce(function (s, p) { return s + p.budget; }, 0) || 1;
    var colors = { road: '#00236f', drainage: '#a73a00', building: '#122c45', electrical: '#4059aa' };
    var bars = { road: 'bg-primary', drainage: 'bg-secondary', building: 'bg-tertiary', electrical: 'bg-surface-tint' };
    var C = 2 * Math.PI * 38, offset = 0, svg = '<circle cx="50" cy="50" r="38" fill="transparent" stroke="#d3e4fe" stroke-width="12"></circle>';
    var list = Object.keys(ref.CATEGORIES).map(function (cat) {
      var items = P.filter(function (p) { return p.category === cat; });
      var b = items.reduce(function (s, p) { return s + p.budget; }, 0);
      var dsb = items.reduce(function (s, p) { return s + p.disbursed; }, 0);
      var share = b / total;
      var len = share * C;
      svg += '<circle cx="50" cy="50" r="38" fill="transparent" stroke="' + colors[cat] + '" stroke-width="12" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"><title>' + ref.CATEGORIES[cat].label + ' ' + (share * 100).toFixed(0) + '%</title></circle>';
      offset += len;
      var done = items.filter(function (p) { return p.status === 'completed'; }).length;
      var dp = b ? Math.round(dsb / b * 100) : 0;
      return '<a href="projects.html?category=' + cat + '" class="p-space-sm bg-surface-container-low hover:bg-surface-container rounded-lg flex flex-col gap-space-2xs transition-colors">' +
        '<div class="flex items-center justify-between gap-2 font-label-md text-label-md"><div class="flex items-center gap-space-xs"><span class="w-3 h-3 rounded shrink-0 ' + bars[cat] + '"></span>' +
        '<span class="text-on-surface font-semibold">' + esc(ref.CATEGORIES[cat].label) + ' (' + (share * 100).toFixed(0) + '%)</span></div>' +
        '<span class="font-code-sm text-code-sm text-primary font-bold whitespace-nowrap">' + money(b) + ' บ.</span></div>' +
        '<div class="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden"><div class="' + bars[cat] + ' h-full rounded-full" style="width:' + dp + '%"></div></div>' +
        '<div class="flex justify-between font-body-sm text-body-sm text-on-surface-variant"><span>' + items.length + ' โครงการ (เสร็จแล้ว ' + done + ' โครงการ)</span><span class="font-medium">เบิกจ่ายแล้ว ' + dp + '%</span></div></a>';
    }).join('');
    $('donut').innerHTML = svg;
    $('budget-breakdown').innerHTML = list;
    $('donut-total').textContent = (total / 1e6).toFixed(2) + 'M';
    $('budget-sub').textContent = 'การจัดสรรงบลงทุน ' + (total / 1e6).toFixed(2) + ' ล้านบาท ประจำปีงบประมาณ ' + SK.fiscalYear() + ' (คลิกเพื่อดูรายการ)';
  }

  // ---------- แผนที่ GIS ----------
  var map, layers, layerIdx = 0, markers = [], hiddenCats = {};
  function initMap() {
    if (!window.L) {
      $('gis-map').innerHTML = '<div class="h-full flex items-center justify-center text-on-surface-variant">โหลดแผนที่ไม่สำเร็จ</div>';
      return;
    }
    map = L.map('gis-map', { zoomControl: false, attributionControl: true }).setView(center(), 13);
    layers = [
      { name: 'แผนที่ถนน (OSM)', layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }) },
      { name: 'ภาพถ่ายดาวเทียม (Esri)', layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery &copy; Esri' }) }
    ];
    layers[0].layer.addTo(map);
    renderMarkers();
    document.addEventListener('fullscreenchange', function () { setTimeout(function () { map.invalidateSize(); }, 100); });
  }
  function renderMarkers() {
    var P = SK.db.data.projects;
    var counts = { done: 0, active: 0, late: 0 };
    P.forEach(function (p) { counts[GROUP(p)]++; });
    $('lg-done').textContent = counts.done;
    $('lg-active').textContent = counts.active;
    $('lg-late').textContent = counts.late;
    $('map-filters').innerHTML = Object.keys(ref.CATEGORIES).map(function (cat) {
      var n = P.filter(function (p) { return p.category === cat; }).length;
      var off = hiddenCats[cat];
      return '<button type="button" data-action="map-filter" data-cat="' + cat + '" aria-pressed="' + !off + '" class="px-space-xs py-0.5 rounded bg-surface font-code-sm text-code-sm flex items-center gap-1 ' + CAT_STYLE[cat].text + (off ? ' opacity-40 line-through' : '') + '">' +
        '<span class="w-2 h-2 rounded-full ' + CAT_STYLE[cat].dot + '"></span>' + esc(ref.CATEGORIES[cat].short) + ' (' + n + ')</button>';
    }).join('');
    if (!map) return;
    markers.forEach(function (m) { m.remove(); });
    markers = P.filter(function (p) { return !hiddenCats[p.category] && p.lat; }).map(function (p) {
      var g = GROUP(p);
      var icon = L.divIcon({
        className: '', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14],
        html: '<div style="background:' + GROUP_COLOR[g] + '" class="w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg ring-4 ring-white"><span class="material-symbols-outlined text-[18px]">' + ref.CATEGORIES[p.category].icon + '</span></div>'
      });
      var m = L.marker([p.lat, p.lng], { icon: icon, title: p.name, keyboard: true }).addTo(map);
      m.bindPopup('<div style="min-width:220px;font-family:Sarabun,sans-serif"><div style="display:flex;justify-content:space-between;gap:8px"><strong>' + esc(ui.villageName(p.village)) + '</strong>' + ui.statusBadge(p) + '</div>' +
        '<div style="margin:4px 0;font-weight:600">' + esc(p.name) + '</div><div>งบ ' + money(p.budget) + ' บ. • ผลงาน ' + p.actual + '%</div>' +
        '<button type="button" data-action="view-project" data-id="' + p.id + '" style="margin-top:6px;color:#1e3a8a;font-weight:700">ดูรายละเอียดโครงการ →</button></div>');
      return m;
    });
  }

  // ---------- บันทึกหน้างานล่าสุด ----------
  function renderFeed() {
    var rows = SK.flows.sortedDiary().slice(0, 3);
    $('diary-feed').innerHTML = rows.map(function (e) {
      var p = SK.db.project(e.projectId) || {};
      var photo = e.photos && e.photos[0];
      return '<a href="progress.html?id=' + encodeURIComponent(e.projectId) + '" class="flex gap-space-sm rounded-lg hover:bg-surface-container-low -m-1 p-1 transition-colors">' +
        '<div class="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-surface-container flex items-center justify-center text-outline">' +
        (photo ? '<img class="w-full h-full object-cover" alt="' + esc(photo.caption) + '" src="' + esc(photo.src) + '"/>' : '<span class="material-symbols-outlined">edit_note</span>') + '</div>' +
        '<div class="flex flex-col justify-between flex-1 min-w-0"><div class="flex items-start justify-between gap-1">' +
        '<span class="font-label-sm text-label-sm text-primary font-bold truncate">' + esc(ui.villageName(p.village)) + '</span>' +
        '<span class="font-code-sm text-code-sm text-outline shrink-0">' + ui.dateShort(e.date) + '</span></div>' +
        '<p class="font-body-sm text-body-sm text-on-surface leading-snug line-clamp-2">' + esc(e.title) + '</p>' +
        '<div class="flex items-center gap-space-xs text-outline font-label-sm text-label-sm"><span class="material-symbols-outlined text-space-md text-primary">person</span><span class="truncate">' + esc(e.reporter) + '</span></div></div></a>';
    }).join('') || '<p class="text-on-surface-variant">ยังไม่มีบันทึก</p>';
  }

  // ---------- ตารางสัญญาล่าสุด ----------
  var PAGE = 3, page = 1, statusFilter = '';
  function recentRows() {
    var q = $('recent-search').value.trim().toLowerCase();
    return SK.db.data.projects.slice().sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); })
      .filter(function (p) {
        if (statusFilter && p.status !== statusFilter) return false;
        if (!q) return true;
        return [p.id, p.contractNo, p.name, p.contractor, p.egp].join(' ').toLowerCase().indexOf(q) > -1;
      });
  }
  function renderRecent() {
    var rows = recentRows();
    var pages = Math.max(1, Math.ceil(rows.length / PAGE));
    page = Math.min(Math.max(1, page), pages);
    var slice = rows.slice((page - 1) * PAGE, page * PAGE);
    $('recent-body').innerHTML = slice.map(function (p, i) {
      return '<tr class="hover:bg-surface-container-low/50 transition-colors ' + (i % 2 ? 'bg-surface-container-low/20' : 'bg-surface-container-lowest') + '">' +
        '<td class="py-space-sm px-space-base font-code-sm text-code-sm text-primary font-bold whitespace-nowrap">' + esc(p.id) + '<div class="font-normal text-outline">' + esc(p.contractNo) + '</div></td>' +
        '<td class="py-space-sm px-space-base"><button type="button" data-action="view-project" data-id="' + p.id + '" class="font-semibold text-on-surface block text-left hover:text-primary hover:underline">' + esc(p.name) + '</button>' +
        '<span class="text-outline text-label-sm">ผู้รับจ้าง: ' + esc(p.contractor) + '</span></td>' +
        '<td class="py-space-sm px-space-base whitespace-nowrap">' + esc(ui.villageName(p.village)) + '</td>' +
        '<td class="py-space-sm px-space-base text-right font-code-sm text-code-sm font-semibold">' + money(p.budget, 2) + '</td>' +
        '<td class="py-space-sm px-space-base text-center"><div class="flex items-center justify-center gap-2"><div class="w-16">' + ui.progressBar(p.actual, p.status) + '</div><span class="font-code-sm text-code-sm font-bold text-primary">' + p.actual + '%</span></div></td>' +
        '<td class="py-space-sm px-space-base text-center">' + ui.statusBadge(p) + '</td>' +
        '<td class="py-space-sm px-space-base text-center"><button type="button" data-action="view-project" data-id="' + p.id + '" aria-label="ดูรายละเอียด ' + esc(p.id) + '" class="p-1 rounded text-outline hover:text-primary hover:bg-surface-container"><span class="material-symbols-outlined text-space-md">visibility</span></button></td></tr>';
    }).join('') || '<tr><td colspan="7" class="py-6 text-center text-on-surface-variant">ไม่พบสัญญาที่ตรงกับเงื่อนไข</td></tr>';
    $('recent-summary').textContent = 'แสดง ' + slice.length + ' จาก ' + rows.length + ' รายการ' + (rows.length !== SK.db.data.projects.length ? ' (ทั้งหมด ' + SK.db.data.projects.length + ')' : ' สัญญาในรอบปี 2567');
    $('recent-page').textContent = page + ' / ' + pages;
    document.querySelector('[data-action=recent-prev]').disabled = page <= 1;
    document.querySelector('[data-action=recent-next]').disabled = page >= pages;
    $('recent-filter').classList.toggle('ring-2', !!statusFilter);
  }

  // งานเร่งด่วนจากข้อมูลจริง: โครงการล่าช้า และโครงการที่สัญญาจะสิ้นสุดภายใน 30 วัน
  function renderAlerts() {
    if (!SK.db.external) return; // ข้อมูลตัวอย่างใช้การ์ดตัวอย่างใน HTML
    var today = ui.today();
    var soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    var P = SK.db.data.projects;
    var items = P.filter(function (p) { return p.status === 'delayed'; }).map(function (p) { return { p: p, kind: 'late' }; })
      .concat(P.filter(function (p) { return p.status === 'on-schedule' && p.end && p.end >= today && p.end <= soon; }).map(function (p) { return { p: p, kind: 'soon' }; }));
    $('alerts-count').textContent = items.length + ' รายการ';
    $('alerts-list').innerHTML = items.slice(0, 5).map(function (it) {
      var p = it.p, late = it.kind === 'late';
      var days = p.end ? Math.round((Date.parse(p.end) - Date.parse(today)) / 86400000) : null;
      return '<div class="p-space-sm ' + (late ? 'bg-error-container/30' : 'bg-surface-container-low') + ' rounded-lg relative overflow-hidden flex flex-col gap-space-xs">' +
        '<div class="absolute top-0 left-0 bottom-0 w-1 ' + (late ? 'bg-error' : 'bg-secondary') + '"></div>' +
        '<div class="flex items-center justify-between gap-2 pl-space-xs"><span class="font-label-sm text-label-sm ' + (late ? 'text-error' : 'text-secondary') + ' font-bold flex items-center gap-1">' +
        '<span class="material-symbols-outlined text-space-md">' + (late ? 'warning' : 'schedule') + '</span>' + (late ? 'ล่าช้ากว่าแผน' : 'สัญญาสิ้นสุดใน ' + days + ' วัน') + '</span>' +
        '<span class="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-code-sm text-code-sm">' + esc(ui.villageName(p.village)) + '</span></div>' +
        '<h4 class="font-headline-sm text-headline-sm text-on-surface leading-tight pl-space-xs">' + esc(p.name) + '</h4>' +
        '<p class="font-body-sm text-body-sm text-on-surface-variant pl-space-xs">' + esc(p.contractor) + (p.end ? ' • สิ้นสุดสัญญา ' + ui.dateShort(p.end) : '') + ' • ผลงาน ' + p.actual + '%</p>' +
        '<div class="mt-space-xs pl-space-xs flex flex-wrap gap-space-xs">' +
        (late ? '<button type="button" data-action="urge" data-project="' + p.id + '" class="px-space-sm py-1 bg-error text-on-error rounded font-label-sm text-label-sm font-semibold">ออกหนังสือเร่งรัดสัญญา (ว.119)</button>' : '') +
        '<button type="button" data-action="view-project" data-id="' + p.id + '" class="px-space-sm py-1 bg-surface-container text-on-surface rounded font-label-sm text-label-sm">ดูรายละเอียด</button>' +
        '<a href="progress.html?id=' + encodeURIComponent(p.id) + '#docs" class="px-space-sm py-1 bg-surface-container text-primary rounded font-label-sm text-label-sm">พิมพ์เอกสาร</a></div></div>';
    }).join('') || '<p class="text-on-surface-variant font-body-sm text-body-sm">ไม่มีโครงการล่าช้าหรือใกล้สิ้นสุดสัญญาใน 30 วัน</p>';
  }

  function refresh() { renderKpis(); renderBudget(); renderMarkers(); renderFeed(); renderRecent(); renderAlerts(); }

  Object.assign(SK.actions, {
    'exec-report': function () {
      SK.docs.print('slaReport', 'รายงานสรุปผู้บริหาร', SK.db.data.projects, 'รายงานสรุปโครงการและงบประมาณสำหรับผู้บริหาร');
    },
    'new-project': function () { ui.openProjectForm(null, refresh); },
    'map-layers': function () {
      if (!map) return;
      map.removeLayer(layers[layerIdx].layer);
      layerIdx = (layerIdx + 1) % layers.length;
      layers[layerIdx].layer.addTo(map);
      $('map-layer-name').textContent = layers[layerIdx].name;
      ui.toast('เปลี่ยนเป็น ' + layers[layerIdx].name);
    },
    'map-zoom-in': function () { if (map) map.zoomIn(); },
    'map-zoom-out': function () { if (map) map.zoomOut(); },
    'map-locate': function () { if (map) map.flyTo(center(), 13); ui.toast('กลับสู่พิกัดศูนย์กลางตำบลสีแก้ว'); },
    'map-fullscreen': function () {
      var card = $('map-card');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (card.requestFullscreen) card.requestFullscreen();
      else window.open('https://www.google.com/maps/@' + center()[0] + ',' + center()[1] + ',14z', '_blank', 'noopener');
    },
    'map-filter': function (el) {
      hiddenCats[el.dataset.cat] = !hiddenCats[el.dataset.cat];
      renderMarkers();
    },
    'recent-prev': function () { page--; renderRecent(); },
    'recent-next': function () { page++; renderRecent(); },
    'recent-filter': function (el) {
      var opts = [['', 'ทุกสถานะ']].concat(Object.keys(ref.STATUSES).map(function (k) { return [k, ref.STATUSES[k].long]; }));
      var box = document.createElement('div');
      box.className = 'sk-dropdown fixed z-[1050] bg-surface-container-lowest rounded-xl shadow-2xl ring-1 ring-surface-container py-1';
      box.innerHTML = opts.map(function (o) {
        return '<button type="button" data-v="' + o[0] + '" class="w-full text-left px-4 py-2 hover:bg-surface-container-low ' + (o[0] === statusFilter ? 'font-bold text-primary' : '') + '">' + esc(o[1]) + '</button>';
      }).join('');
      document.body.appendChild(box);
      var r = el.getBoundingClientRect();
      box.style.top = (r.bottom + 6) + 'px';
      box.style.left = Math.max(12, r.right - box.offsetWidth) + 'px';
      var close = function (e) { if (!box.contains(e.target)) { box.remove(); document.removeEventListener('click', close); } };
      setTimeout(function () { document.addEventListener('click', close); }, 0);
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]');
        if (!b) return;
        statusFilter = b.dataset.v; page = 1; renderRecent();
        box.remove(); document.removeEventListener('click', close);
      });
    }
  });

  SK.page = { refresh: refresh };
  ui.onReady(function () {
    $('recent-search').addEventListener('input', function () { page = 1; renderRecent(); });
    initMap();
    refresh();
  });
})();
