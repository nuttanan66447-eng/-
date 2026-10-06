// หน้าภาพรวมโครงการ (index.html) — จัดหน้าตามระบบเดิม v184
// แท็บ: ผู้ควบคุมงาน (โครงการ) / ธุรการกองช่าง (ตรวจสอบอาคาร) / สายทางทางหลวงท้องถิ่น
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var TH_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
  var thaiNum = function (s) { return String(s).replace(/\d/g, function (d) { return TH_DIGITS[d]; }); };
  var MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function center() { return SK.tambon ? SK.tambon.center() : ref.CENTER; }
  // วันที่แบบไทย "1 ตุลาคม 2569" / "01/10/2569" / ISO -> { y: ค.ศ., m: 0-11 }
  function parseDate(v) {
    var t = String(v || '').trim(), m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t))) return { y: +m[1], m: +m[2] - 1, d: +m[3] };
    t = t.replace(/[๐-๙]/g, function (d) { return TH_DIGITS.indexOf(d); });
    if ((m = /(\d{1,2})\s+(\S+)\s+(\d{4})/.exec(t))) {
      var mi = MONTHS.indexOf(m[2]); if (mi < 0) mi = MON.indexOf(m[2]);
      if (mi >= 0) return { y: +m[3] > 2400 ? +m[3] - 543 : +m[3], m: mi, d: +m[1] };
    }
    if ((m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t))) return { y: +m[3] > 2400 ? +m[3] - 543 : +m[3], m: +m[2] - 1, d: +m[1] };
    return null;
  }
  var GROUP = function (p) { return p.status === 'completed' ? 'done' : p.status === 'delayed' ? 'late' : 'active'; };
  var GROUP_COLOR = { done: '#1e3a8a', active: '#fd651e', late: '#ba1a1a' };
  var BAR = ['#173b8e', '#264fa9', '#19a865', '#e56b1f', '#9b51e0', '#1673bd', '#c9314c', '#db7419'];

  // ---------- ส่วนประกอบแบบระบบเดิม ----------
  function head(title, sub, extra) {
    return '<div class="sk-card-head"><div><h3>' + title + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (extra || '') + '</div>';
  }
  function toggle(target, label) { return '<button type="button" class="sk-toggle" data-action="dash-collapse" data-target="' + target + '">▾ ปิด' + (label || 'กราฟ') + '</button>'; }
  // กราฟแท่งแนวตั้ง (มีเส้นแกนแบบระบบเดิม)
  function columns(rows, opts) {
    opts = opts || {};
    if (!rows.length) return '<div class="sk-chart-empty">ไม่พบข้อมูล</div>';
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    return '<div class="sk-cols" style="--n:' + rows.length + '">' + rows.map(function (r, i) {
      var h = r.value / max * 100;
      return '<button type="button" class="sk-col"' + (opts.key ? ' data-action="dash-chart-filter" data-key="' + opts.key + '" data-v="' + esc(r.key) + '"' : '') + ' title="' + esc(r.label + ': ' + r.tip) + '">' +
        '<span class="sk-col-val">' + esc(r.text) + '</span><span class="sk-col-bar" style="height:' + h.toFixed(1) + '%;background:' + (opts.color || BAR[i % BAR.length]) + '"></span>' +
        '<span class="sk-col-label">' + esc(r.label) + '</span></button>';
    }).join('') + '</div>';
  }
  // แท่งแนวนอน
  function hbars(rows, opts) {
    opts = opts || {};
    if (!rows.length) return '<div class="sk-chart-empty">ไม่พบข้อมูล</div>';
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    return '<ul class="sk-hbars">' + rows.map(function (r) {
      return '<li><button type="button"' + (opts.key ? ' data-action="dash-chart-filter" data-key="' + opts.key + '" data-v="' + esc(r.key) + '"' : '') + ' title="' + esc(r.label + ': ' + r.tip) + '" class="' + (F[opts.key] === r.key ? 'is-on' : '') + '">' +
        '<span class="sk-hbar-label">' + esc(r.label) + '</span><span class="sk-hbar-track"><span style="width:' + Math.max(r.value ? 2 : 0, r.value / max * 100).toFixed(1) + '%"></span></span><b>' + esc(r.text) + '</b></button></li>';
    }).join('') + '</ul>';
  }
  function donut(rows) {
    var total = rows.reduce(function (s, r) { return s + r.value; }, 0);
    if (!total) return '<div class="sk-chart-empty">ไม่พบข้อมูล</div>';
    var C = 2 * Math.PI * 38, off = 0;
    var svg = '<svg viewBox="0 0 100 100" class="w-40 h-40 -rotate-90"><circle cx="50" cy="50" r="38" fill="none" stroke="#e5eeff" stroke-width="14"/>' + rows.map(function (r) {
      var len = r.value / total * C, x = '<circle cx="50" cy="50" r="38" fill="none" stroke="' + r.color + '" stroke-width="14" stroke-dasharray="' + Math.max(0, len - 1).toFixed(2) + ' ' + (C - len + 1).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"><title>' + esc(r.label) + ' ' + r.value + ' โครงการ</title></circle>';
      off += len; return x;
    }).join('') + '</svg>';
    return '<div class="flex flex-col sm:flex-row xl:flex-col items-center gap-4"><div class="relative">' + svg + '<div class="absolute inset-0 flex flex-col items-center justify-center"><b class="text-2xl text-[#14254d]">' + total + '</b><span class="text-xs text-on-surface-variant">โครงการ</span></div></div>' +
      '<ul class="flex flex-col gap-1.5 w-full">' + rows.map(function (r) {
        return '<li><button type="button" data-action="dash-chart-filter" data-key="status" data-v="' + esc(r.key) + '" class="w-full flex items-center gap-2 text-left text-sm rounded px-1 hover:bg-surface-container-low' + (F.status === r.key ? ' bg-primary-fixed/50' : '') + '"><i class="w-3 h-3 rounded-sm shrink-0" style="background:' + r.color + '"></i><span class="flex-1">' + esc(r.label) + '</span><b>' + r.value + '</b><span class="text-on-surface-variant w-10 text-right">' + Math.round(r.value / total * 100) + '%</span></button></li>';
      }).join('') + '</ul></div>';
  }
  // กราฟรายเดือน (เส้น/แท่ง) แบบระบบเดิม
  function monthly(counts, yearBE, mode) {
    var W = 1000, H = 220, L = 40, R = 16, T = 16, B = 34, max = Math.max(3, Math.max.apply(null, counts));
    var x = function (i) { return L + (W - L - R) * (i / 11); }, y = function (v) { return T + (H - T - B) * (1 - v / max); };
    var grid = '', step = Math.max(1, Math.ceil(max / 3));
    for (var g = 0; g <= max; g += step) grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="#e5ebf3"/><text x="' + (L - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="12" fill="#607169">' + g + '</text>';
    var labels = MON.map(function (m, i) { return '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" fill="#607169">' + m + ' ' + thaiNum(String(yearBE).slice(-2)) + '</text>'; }).join('');
    var marks;
    if (mode === 'bar') {
      var bw = (W - L - R) / 12 * 0.5;
      marks = counts.map(function (c, i) { return '<rect x="' + (x(i) - bw / 2) + '" y="' + y(c) + '" width="' + bw + '" height="' + Math.max(0, y(0) - y(c)) + '" rx="4" fill="#19a865"><title>' + MONTHS[i] + ': ' + c + ' โครงการ</title></rect>'; }).join('');
    } else {
      marks = '<polyline fill="none" stroke="#16a34a" stroke-width="2.5" points="' + counts.map(function (c, i) { return x(i) + ',' + y(c); }).join(' ') + '"/>' +
        counts.map(function (c, i) { return '<circle cx="' + x(i) + '" cy="' + y(c) + '" r="4.5" fill="#16a34a" stroke="#fff" stroke-width="2"><title>' + MONTHS[i] + ': ' + c + ' โครงการ</title></circle>' + (c ? '<text x="' + x(i) + '" y="' + (y(c) - 10) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#14532d">' + c + '</text>' : ''); }).join('');
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full h-auto" role="img" aria-label="จำนวนโครงการแล้วเสร็จรายเดือน">' + grid + labels + marks + '</svg>';
  }

  // ---------- ตัวกรอง ----------
  var FKEY = 'sikaew-dashboard-filter-v2';
  var F = (function () { try { return JSON.parse(sessionStorage.getItem(FKEY)) || {}; } catch (e) { return {}; } })();
  var FIELDS = [
    { key: 'year', label: 'ปีงบประมาณ', get: function (p) { return String(p.year || '').replace(/\D/g, ''); }, name: function (v) { return v; } },
    { key: 'village', label: 'หมู่บ้าน', get: function (p) { return p.village; }, name: function (v) { return ui.villageName(v); }, sort: function (a, b) { return (parseInt(a.slice(1), 10) || 99) - (parseInt(b.slice(1), 10) || 99); } },
    { key: 'category', label: 'ประเภทงาน', get: function (p) { return p.category; }, name: function (v) { return (ref.CATEGORIES[v] || {}).label || v; } },
    { key: 'status', label: 'สถานะ', get: function (p) { return p.status; }, name: function (v) { return (ref.STATUSES[v] || {}).long || v; } }
  ];
  function FP() {
    var q = String(F.q || '').trim().toLowerCase();
    return SK.db.data.projects.filter(function (p) {
      if (q && [p.id, p.name, p.contractor, ui.villageName(p.village), p.location].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return FIELDS.every(function (f) { return !F[f.key] || f.get(p) === F[f.key]; });
    });
  }
  function filtered() { return !!(F.q || FIELDS.some(function (f) { return F[f.key]; })); }
  function saveF() { try { sessionStorage.setItem(FKEY, JSON.stringify(F)); } catch (e) {} }
  function renderFilters() {
    var all = SK.db.data.projects;
    var box = $('dash-filters');
    var focused = document.activeElement && document.activeElement.id === 'dash-q';
    box.innerHTML = '<div class="sk-filter-grid"><label class="sk-field sk-field-wide"><span>ค้นหาโครงการ</span><input id="dash-q" type="search" value="' + esc(F.q || '') + '" placeholder="ชื่อโครงการ หมู่บ้าน ผู้รับจ้าง..."/></label>' +
      FIELDS.map(function (f) {
        var counts = {};
        all.forEach(function (p) { var v = f.get(p); if (v) counts[v] = (counts[v] || 0) + 1; });
        var keys = Object.keys(counts).sort(f.sort || function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
        return '<label class="sk-field"><span>' + f.label + '</span><select data-dash-filter="' + f.key + '"><option value="">ทั้งหมด</option>' +
          keys.map(function (k) { return '<option value="' + esc(k) + '"' + (F[f.key] === k ? ' selected' : '') + '>' + esc(f.name(k)) + '</option>'; }).join('') + '</select></label>';
      }).join('') +
      '<button type="button" data-action="dash-filter-reset" class="sk-btn-clear">ล้างตัวกรอง</button></div>';
    var q = $('dash-q');
    q.addEventListener('input', function () { F.q = this.value; saveF(); refreshSupervisor(true); });
    if (focused) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  function setFilter(key, value) {
    if (value) F[key] = value; else delete F[key];
    saveF(); refresh();
    if (map && filtered() && markers.length) map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [40, 40], maxZoom: 16 });
  }
  document.addEventListener('change', function (e) {
    var sel = e.target.closest && e.target.closest('[data-dash-filter]');
    if (sel) setFilter(sel.dataset.dashFilter, sel.value);
  });

  // ---------- แท็บผู้ควบคุมงาน ----------
  function tally(P, get) {
    var m = {};
    P.forEach(function (p) { var k = get(p) || ''; var x = m[k] || (m[k] = { key: k, count: 0, budget: 0 }); x.count++; x.budget += p.budget || 0; });
    return Object.keys(m).map(function (k) { return m[k]; });
  }
  function acceptDate(p) {
    var f = p.fields || {}, k = Object.keys(f).filter(function (x) { return /ตรวจรับ/.test(x) && /วัน/.test(x) && !/กรรมการ/.test(x); })[0];
    return parseDate(k ? f[k] : '') || (p.status === 'completed' ? parseDate(p.end) : null);
  }
  var monthMode = 'line';
  function renderKpis(P) {
    var done = P.filter(function (p) { return p.status === 'completed'; }).length;
    var bySource = tally(P, function (p) { return p.sourceLabel || ref.SOURCES[p.source] || 'ไม่ระบุ'; }).sort(function (a, b) { return b.count - a.count; });
    var byCat = tally(P, function (p) { return p.category; }).sort(function (a, b) { return b.count - a.count; });
    $('dash-kpis').innerHTML =
      '<section class="sk-kpi sk-kpi-blue"><span class="sk-kpi-label">จำนวนโครงการ</span><b class="sk-kpi-num">' + P.length + '</b><span class="sk-kpi-sub">รายการตามตัวกรองปัจจุบัน</span></section>' +
      '<section class="sk-kpi sk-kpi-orange">' + head('จำนวนโครงการตามงบประเภท', '', toggle('kpi-src')) + '<div id="kpi-src">' + columns(bySource.map(function (x) {
        return { key: x.key, label: x.key, value: x.count, text: String(x.count), tip: x.count + ' โครงการ • ' + money(x.budget) + ' บาท' };
      }), { color: '#e56b1f' }) + '</div></section>' +
      '<section class="sk-kpi sk-kpi-red">' + head('จำนวนโครงการตามประเภทงาน', '', toggle('kpi-cat')) + '<div id="kpi-cat">' + columns(byCat.map(function (x) {
        var c = ref.CATEGORIES[x.key] || {};
        return { key: x.key, label: c.short || c.label || x.key, value: x.count, text: String(x.count), tip: x.count + ' โครงการ • ' + money(x.budget) + ' บาท' };
      }), { key: 'category' }) + '</div></section>' +
      '<section class="sk-kpi sk-kpi-blue"><span class="sk-kpi-label">ดำเนินการแล้วเสร็จ</span><b class="sk-kpi-num">' + done + '</b><span class="sk-kpi-sub">' + (P.length ? Math.round(done / P.length * 100) : 0) + '% ของโครงการ</span></section>';
  }
  function renderMonthly(P) {
    var yearBE = new Date().getFullYear() + 543, counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total = 0;
    P.forEach(function (p) {
      if (p.status !== 'completed') return;
      var d = acceptDate(p);
      if (d && d.y + 543 === yearBE) { counts[d.m]++; total++; }
    });
    $('dash-monthly').innerHTML = head('โครงการแล้วเสร็จแต่ละเดือน', 'รวม ' + total + ' โครงการ • นับจากวันตรวจรับงาน • ตามตัวกรองปัจจุบัน',
      '<div class="flex items-center gap-2"><div class="sk-seg"><button type="button" data-action="dash-month-mode" data-mode="line" class="' + (monthMode === 'line' ? 'is-on' : '') + '">📈 กราฟเส้น</button>' +
      '<button type="button" data-action="dash-month-mode" data-mode="bar" class="' + (monthMode === 'bar' ? 'is-on' : '') + '">📊 กราฟแท่ง</button></div>' + toggle('month-body') + '</div>') +
      '<div id="month-body" class="px-space-lg pb-space-md">' + monthly(counts, yearBE, monthMode) + '</div>';
  }
  var STATUS_COLOR = { completed: '#1e3a8a', 'on-schedule': '#19a865', 'pending-inspection': '#e56b1f', delayed: '#ba1a1a', signing: '#9b51e0', unknown: '#9aa5b1' };
  function renderSide(P) {
    var st = tally(P, function (p) { return p.status; }).sort(function (a, b) { return b.count - a.count; });
    $('dash-status').innerHTML = head('โครงการแยกตามสถานะ', '', toggle('status-body', 'แผนภูมิ')) + '<div id="status-body" class="px-space-lg pb-space-lg">' + donut(st.map(function (x) {
      return { key: x.key, label: (ref.STATUSES[x.key] || {}).long || x.key || 'ไม่ระบุ', value: x.count, color: STATUS_COLOR[x.key] || '#9aa5b1' };
    })) + '</div>';
    var vNo = function (k) { return parseInt(String(k).slice(1), 10) || 99; };
    var vs = tally(P, function (p) { return p.village; }).sort(function (a, b) { return vNo(a.key) - vNo(b.key); });
    $('dash-village').innerHTML = head('จำนวนโครงการแต่ละหมู่บ้าน', 'คลิกเพื่อกรองหมู่บ้าน', toggle('village-body')) + '<div id="village-body" class="px-space-lg pb-space-lg max-h-[26rem] overflow-y-auto">' + hbars(vs.map(function (x) {
      return { key: x.key, label: ui.villageName(x.key), value: x.count, text: String(x.count), tip: x.count + ' โครงการ • งบ ' + money(x.budget) + ' บาท' };
    }), { key: 'village' }) + '</div>';
  }
  function renderTable(P) {
    var rows = P.slice().sort(function (a, b) { return (a.rowNumber || 0) - (b.rowNumber || 0); });
    $('dash-table').innerHTML = head('รายการโครงการ', rows.length + ' รายการ') +
      '<div class="overflow-x-auto"><table class="sk-table"><thead><tr><th>ลำดับ</th><th>ชื่อโครงการ</th><th>พื้นที่</th><th>ปีงบฯ</th><th>ประเภท</th><th>งบประเภท</th><th>สถานะ</th><th>ความก้าวหน้า</th><th>พิกัด</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (p, i) {
        var c = ref.CATEGORIES[p.category] || {};
        return '<tr><td class="text-center">' + (i + 1) + '</td>' +
          '<td class="min-w-[18rem]"><a href="project.html?id=' + encodeURIComponent(p.id) + '" class="font-semibold text-[#14254d] hover:underline">' + esc(p.name) + '</a><div class="text-xs text-on-surface-variant">' + esc(p.id) + ' • ' + esc(p.contractor || '-') + '</div></td>' +
          '<td class="whitespace-nowrap">' + esc(ui.villageName(p.village)) + '</td><td class="text-center">' + esc(p.year || '-') + '</td><td class="whitespace-nowrap">' + esc(c.label || p.typeLabel || '-') + '</td>' +
          '<td>' + esc(p.sourceLabel || ref.SOURCES[p.source] || '-') + '</td><td>' + ui.statusBadge(p) + '</td>' +
          '<td class="min-w-[8rem]"><div class="flex items-center gap-2"><div class="flex-1">' + ui.progressBar(p.actual, p.status) + '</div><b class="text-xs">' + p.actual + '%</b></div></td>' +
          '<td class="text-center">' + (p.lat && !p.approxLocation ? '<button type="button" data-action="dash-map-go" data-id="' + esc(p.id) + '" class="text-primary font-semibold hover:underline" title="ดูบนแผนที่">📍</button>' : '<span class="text-outline">-</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="9" class="text-center py-10 text-on-surface-variant">ไม่พบข้อมูลตามตัวกรอง</td></tr>') + '</tbody></table></div>';
  }
  function refreshSupervisor(keepFilters) {
    var P = FP();
    if (!keepFilters) renderFilters();
    renderKpis(P); renderMonthly(P); renderSide(P); renderTable(P); renderMarkers();
  }

  // ---------- แผนที่ ----------
  var map, layers, layerIdx = 0, markers = [], tambon = null;
  function initMap() {
    if (!window.L) { $('gis-map').innerHTML = '<div class="h-full flex items-center justify-center text-on-surface-variant">โหลดแผนที่ไม่สำเร็จ</div>'; return; }
    map = L.map('gis-map', { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(center(), 14);
    layers = [
      { name: 'แผนที่ถนน', layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }) },
      { name: 'ภาพถ่ายดาวเทียม', layer: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery &copy; Esri' }) }
    ];
    layers[0].layer.addTo(map);
    if (SK.tambon) tambon = SK.tambon.attach(map, { fit: true });
    if (SK.cloud && SK.cloud.active) $('map-draw-btn').classList.remove('hidden');
    document.addEventListener('fullscreenchange', function () { setTimeout(function () { map.invalidateSize(); }, 100); });
  }
  function renderMarkers() {
    var P = FP(), counts = { done: 0, active: 0, late: 0 };
    P.forEach(function (p) { counts[GROUP(p)]++; });
    $('lg-done').textContent = counts.done; $('lg-active').textContent = counts.active; $('lg-late').textContent = counts.late;
    if (!map) return;
    markers.forEach(function (m) { m.remove(); });
    var pts = P.filter(function (p) { return p.lat; });
    $('map-sub').textContent = pts.length + ' จุด จาก ' + P.length + ' โครงการ';
    markers = pts.map(function (p) {
      var icon = L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12],
        html: '<div style="background:' + GROUP_COLOR[GROUP(p)] + ';width:26px;height:26px;border-radius:999px;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.3)"></div>' });
      var m = L.marker([p.lat, p.lng], { icon: icon, title: p.name, keyboard: true }).addTo(map);
      m.__id = p.id;
      m.bindPopup('<div style="min-width:220px;font-family:Prompt,Sarabun,sans-serif"><div style="display:flex;justify-content:space-between;gap:8px"><strong>' + esc(ui.villageName(p.village)) + '</strong>' + ui.statusBadge(p) + '</div>' +
        '<div style="margin:4px 0;font-weight:600">' + esc(p.name) + '</div><div>งบ ' + money(p.budget) + ' บ. • ผลงาน ' + p.actual + '%</div>' +
        '<a href="project.html?id=' + encodeURIComponent(p.id) + '" style="display:inline-block;margin-top:6px;color:#173b8e;font-weight:700">ดูข้อมูลโครงการ →</a></div>');
      return m;
    });
  }

  // พิมพ์แผนที่: หน้าเดียว A4 แนวนอน ไม่แสดงหมุดโครงการ — แผนที่ขอบเขตตำบล/หมู่บ้าน + คำอธิบายหมู่ที่ใต้แผนที่
  function printMap() {
    if (!map) return;
    var card = $('map-card'), home = { parent: card.parentNode, next: card.nextSibling }, oldStyle = card.getAttribute('style') || '';
    var st = document.getElementById('sk-map-print-css');
    if (!st) {
      st = document.createElement('style'); st.id = 'sk-map-print-css';
      st.textContent =
        '#map-print-wrap{position:fixed;inset:0;z-index:5000;overflow:auto;background:#fff;padding:16px;color:#0b1c30}' +
        '#map-print-wrap .mp-page{width:281mm;margin:0 auto}' +
        '#map-print-wrap #map-card{width:281mm!important;height:134mm!important;border:1px solid #c5c5d3;border-radius:0}' +
        '#map-print-wrap #map-card [data-map-tools],#map-print-wrap #map-card .leaflet-control-zoom,#map-print-wrap #map-card > .absolute:not(#gis-map){display:none!important}' +
        '#map-print-wrap .mp-legend{display:grid;grid-template-columns:repeat(8,1fr);gap:0.5mm 3mm;font-size:9.5pt;margin-top:1.5mm}' +
        '#map-print-wrap .mp-legend b{color:#00236f}' +
        '#map-print-wrap .leaflet-tooltip,#map-print-wrap .leaflet-popup{display:none!important}' +
        '@media print{@page{size:A4 landscape;margin:8mm}' +
          'html,body{height:auto!important;overflow:visible!important}' +
          'body.sk-print-map>*:not(#map-print-wrap){display:none!important}' +
          '#map-print-wrap{position:static;padding:0;overflow:visible}' +
          '#map-print-wrap .mp-bar{display:none!important}' +
          '#map-print-wrap .mp-page{break-inside:avoid;page-break-inside:avoid}' +
          '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}';
      document.head.appendChild(st);
    }
    var villages = ((window.SK_PERSONNEL || {}).villages || []).slice().sort(function (x, y) { return x.no - y.no; });
    var wrap = document.createElement('div');
    wrap.id = 'map-print-wrap';
    wrap.innerHTML =
      '<div class="mp-bar" style="display:flex;justify-content:space-between;align-items:center;max-width:281mm;margin:0 auto 8px"><b>ตัวอย่างก่อนพิมพ์แผนที่</b><span>กำลังโหลดแผนที่...</span></div>' +
      '<div class="mp-page">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:2mm">' +
          '<div><div style="font-size:16pt;font-weight:700;color:#00236f">แผนที่ตำบลสีแก้ว อำเภอเมืองร้อยเอ็ด จังหวัดร้อยเอ็ด</div>' +
          '<div style="font-size:10pt;color:#444651">แสดงขอบเขตตำบลและขอบเขตหมู่บ้าน • กองช่าง เทศบาลตำบลสีแก้ว</div></div>' +
          '<div style="font-size:10pt;color:#444651">พิมพ์เมื่อ ' + esc(ui.dateLong(ui.today())) + '</div></div>' +
        '<div data-slot></div>' +
        '<div style="display:flex;gap:6mm;align-items:center;font-size:10pt;margin-top:2mm">' +
          '<span><span style="display:inline-block;width:14mm;border-top:2.5px dashed #00236f;vertical-align:middle"></span> ขอบเขตตำบลสีแก้ว</span>' +
          '<span><span style="display:inline-block;width:14mm;border-top:2px solid #ea580c;vertical-align:middle"></span> ขอบเขตหมู่บ้าน (ม.= หมู่ที่)</span></div>' +
        '<div style="font-size:11pt;font-weight:700;margin-top:2mm;color:#00236f">คำอธิบายหมู่บ้าน</div>' +
        '<div class="mp-legend">' + villages.map(function (v) { return '<span><b>ม.' + v.no + '</b> ' + esc(v.name) + '</span>'; }).join('') + '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.querySelector('[data-slot]').appendChild(card);
    card.setAttribute('style', '');
    document.body.classList.add('sk-print-map');
    map.closePopup();
    map.eachLayer(function (l) { if (l.closeTooltip) l.closeTooltip(); });
    markers.forEach(function (m) { m.remove(); });
    map.invalidateSize();
    var snap = map.options.zoomSnap;
    map.options.zoomSnap = 0.05;
    if (tambon && tambon.bounds && tambon.bounds.isValid()) map.fitBounds(tambon.bounds, { padding: [6, 6], animate: false });
    var done = false;
    function restore() {
      if (done) return; done = true;
      window.removeEventListener('afterprint', restore);
      document.body.classList.remove('sk-print-map');
      home.parent.insertBefore(card, home.next && home.next.parentNode === home.parent ? home.next : null);
      card.setAttribute('style', oldStyle);
      map.options.zoomSnap = snap;
      wrap.remove();
      renderMarkers();
      map.invalidateSize();
      if (tambon) tambon.fit();
    }
    var tiles = layers[layerIdx].layer, started = false;
    function go() {
      if (started) return; started = true;
      wrap.querySelector('.mp-bar span').textContent = 'กำลังเปิดหน้าต่างพิมพ์...';
      window.addEventListener('afterprint', restore);
      setTimeout(function () { window.print(); setTimeout(function () { document.addEventListener('mousemove', restore, { once: true }); document.addEventListener('keydown', restore, { once: true }); }, 800); }, 400);
    }
    tiles.once('load', go);
    setTimeout(go, 4000);
  }

  // ---------- แท็บธุรการกองช่าง (ข้อมูลตรวจสอบสิ่งปลูกสร้างอาคาร) ----------
  var building = null, bYear = new Date().getFullYear() + 543, bMonth = '', bQuery = '';
  function loadBuilding(force) {
    if (building && !force) return Promise.resolve(building);
    var call = SK.docEngine ? SK.docEngine.call('getAllBuildingInspectionHistories') : window.SKGas ? SKGas.call('getAllBuildingInspectionHistories') : Promise.resolve({ inspections: [] });
    return Promise.resolve(call).then(function (r) { building = (r && r.inspections) || []; return building; }, function () { building = []; return building; });
  }
  function kpiCard(tone, label, value, sub) { return '<section class="sk-kpi sk-kpi-' + tone + '"><span class="sk-kpi-label">' + label + '</span><b class="sk-kpi-num">' + value + '</b><span class="sk-kpi-sub">' + sub + '</span></section>'; }
  function renderClerk() {
    var box = $('page-clerk');
    if (!building) { box.innerHTML = '<section class="sk-card p-space-lg text-on-surface-variant">กำลังโหลดข้อมูลตรวจสอบอาคาร...</section>'; loadBuilding().then(renderClerk); return; }
    var dateOf = function (r) { return parseDate(r['วันที่ทำบันทึก']) || parseDate(r['วันที่สร้าง']); };
    var now = new Date(), thisMonth = building.filter(function (r) { var d = dateOf(r); return d && d.y === now.getFullYear() && d.m === now.getMonth(); }).length;
    var people = {};
    building.forEach(function (r) { var n = String(r['ผู้ยื่นคำร้อง'] || '').trim(); if (n) people[n] = 1; });
    var last = building.map(function (r) { return r['วันที่แก้ไข'] || r['วันที่สร้าง']; }).filter(Boolean).sort().pop();
    var q = bQuery.trim().toLowerCase();
    var rows = building.filter(function (r) {
      var d = dateOf(r);
      if (bYear && (!d || d.y + 543 !== +bYear)) return false;
      if (bMonth !== '' && (!d || d.m !== +bMonth)) return false;
      return !q || [r['เลขบันทึก'], r['ผู้ยื่นคำร้อง'], r['โฉนดที่ดินเลขที่'], r['ชื่อโครงการ']].join(' ').toLowerCase().indexOf(q) > -1;
    });
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    building.forEach(function (r) { var d = dateOf(r); if (d && d.y + 543 === +bYear) counts[d.m]++; });
    var detail = function (r) {
      try { var j = JSON.parse(r['ข้อมูลตรวจสอบอาคาร JSON'] || '{}'); return [j.buildingType || j.type || j.buildingKind, j.buildingDetail || j.detail || j.description].filter(Boolean).join(' • '); } catch (e) { return ''; }
    };
    box.innerHTML = '<div class="sk-kpi-grid sk-kpi-grid-4">' +
        kpiCard('blue', 'บันทึกตรวจสอบอาคารทั้งหมด', building.length, 'จากชีทประวัติตรวจสอบสิ่งปลูกสร้างอาคาร') +
        kpiCard('orange', 'บันทึกเดือนนี้', thisMonth, 'ตามวันที่ทำบันทึก/วันที่สร้าง') +
        kpiCard('red', 'ผู้ยื่นคำร้อง', Object.keys(people).length, 'จำนวนรายชื่อไม่ซ้ำ') +
        kpiCard('blue', 'อัปเดตล่าสุด', esc(last || '-'), 'ข้อมูลตรวจสอบอาคาร') + '</div>' +
      '<section class="sk-card"><div class="sk-card-head flex-wrap"><div><h3>ข้อมูลตรวจสอบสิ่งปลูกสร้างอาคาร</h3><p>' + rows.length + ' รายการจากทั้งหมด ' + building.length + ' รายการ • ปี ' + thaiNum(bYear) + ' • ' + (bMonth === '' ? 'ทั้งปี' : MONTHS[+bMonth]) + '</p></div>' +
        '<div class="flex flex-wrap items-center gap-2"><input id="b-q" type="search" value="' + esc(bQuery) + '" placeholder="ค้นหาเลขบันทึก ผู้ยื่นคำร้อง โฉนด..." class="sk-input w-64"/>' +
        '<label class="sk-mini">ปี<input id="b-year" type="number" value="' + esc(bYear) + '" class="sk-input w-24"/></label>' +
        '<label class="sk-mini">เดือน<select id="b-month" class="sk-input"><option value="">ทั้งปี</option>' + MONTHS.map(function (m, i) { return '<option value="' + i + '"' + (String(i) === String(bMonth) ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
        '<button type="button" data-action="b-reload" class="sk-btn-clear">↻ โหลดข้อมูลตรวจสอบอาคาร</button>' +
        '<a href="project-docs.html?doc=building&docs=building&menu=ตรวจสอบอาคาร" class="sk-btn-hero !py-2">+ บันทึกตรวจสอบอาคาร</a></div></div>' +
        '<div class="px-space-lg pb-space-md"><h4 class="font-semibold text-[#14532d] mb-1">กราฟจำนวนบันทึกตรวจสอบอาคารรายเดือน</h4><p class="text-xs text-on-surface-variant mb-2">ปี ' + thaiNum(bYear) + ' รวม ' + counts.reduce(function (a, b) { return a + b; }, 0) + ' รายการ</p>' + monthly(counts, bYear, 'line') + '</div>' +
        '<div class="overflow-x-auto"><table class="sk-table"><thead><tr><th>ลำดับ</th><th>เลขบันทึก</th><th>วันที่ทำบันทึก</th><th>ผู้ยื่นคำร้อง</th><th>โฉนดที่ดิน</th><th>รายละเอียดอาคาร</th><th>สร้าง/แก้ไขโดย</th><th>ดำเนินการ</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (r, i) {
          var idx = building.indexOf(r);
          return '<tr><td class="text-center">' + (i + 1) + '</td><td class="whitespace-nowrap font-semibold">' + esc(r['เลขบันทึก'] || '-') + '</td><td class="whitespace-nowrap">' + esc(r['วันที่ทำบันทึก'] || '-') + '</td>' +
            '<td>' + esc(r['ผู้ยื่นคำร้อง'] || '-') + '</td><td>' + esc(r['โฉนดที่ดินเลขที่'] || '-') + '</td><td>' + esc(detail(r) || r['ชื่อโครงการ'] || '-') + '</td>' +
            '<td class="text-xs">' + esc(r['สร้างโดย'] || '-') + (r['แก้ไขโดย'] && r['แก้ไขโดย'] !== r['สร้างโดย'] ? '<br>แก้ไข: ' + esc(r['แก้ไขโดย']) : '') + '</td>' +
            '<td>' + (r['HTML ตรวจสอบอาคาร'] ? '<button type="button" data-action="b-view" data-i="' + idx + '" class="sk-btn-clear !py-1">ดูเอกสาร</button>' : '-') + '</td></tr>';
        }).join('') : '<tr><td colspan="8" class="text-center py-10 text-on-surface-variant">ยังไม่มีข้อมูลตรวจสอบอาคารตามปี/เดือนที่เลือก</td></tr>') + '</tbody></table></div></section>';
    $('b-q').addEventListener('input', function () { bQuery = this.value; var pos = this.selectionStart; renderClerk(); var e = $('b-q'); e.focus(); e.setSelectionRange(pos, pos); });
    $('b-year').addEventListener('change', function () { bYear = this.value; renderClerk(); });
    $('b-month').addEventListener('change', function () { bMonth = this.value; renderClerk(); });
  }

  // ---------- แท็บสายทางทางหลวงท้องถิ่น ----------
  var roads = null, roadQuery = '', roadMap = null, roadLayer = null;
  function loadRoads(force) {
    if (roads && !force) return Promise.resolve(roads);
    var call = SK.docEngine ? SK.docEngine.call('getAllLocalRoadEntries') : window.SKGas ? SKGas.call('getAllLocalRoadEntries') : Promise.resolve({ entries: [] });
    return Promise.resolve(call).then(function (r) { roads = (r && r.entries) || []; roads.updatedAt = r && r.updatedAt; return roads; }, function () { roads = []; return roads; });
  }
  var ROAD_COLS = ['รหัสสายทาง', 'ชื่อสายทาง', 'ระยะทาง', 'ผิวจราจร', 'เขตทางกว้าง ม.', 'สถานะ', 'ลงทะเบียนเมื่อวันที่', 'ชั้นทางในเขตเมือง', 'ชั้นทางนอกเขตเมือง', 'กว้าง (ม.)', 'ไหล่ทาง/ทางเท้ากว้าง ม. (ซ้าย)', 'ไหล่ทาง/ทางเท้ากว้าง ม. (ขวา)', 'พิกัดเริ่มต้น', 'พิกัดสิ้นสุด'];
  function latlng(v) { var m = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(String(v || '')); return m ? [+m[1], +m[2]] : null; }
  function km(v) { var t = String(v || '').replace(/,/g, ''), n = parseFloat(t); if (isNaN(n)) return 0; return /เมตร|ม\.$|\bm\b/.test(t) && !/กม|กิโล|km/i.test(t) ? n / 1000 : n; }
  function renderRoads() {
    var box = $('page-localRoad');
    if (!roads) { box.innerHTML = '<section class="sk-card p-space-lg text-on-surface-variant">กำลังโหลดข้อมูลสายทาง...</section>'; loadRoads().then(renderRoads); return; }
    var total = roads.reduce(function (s, r) { return s + km(r['ระยะทาง']); }, 0);
    var surf = {};
    roads.forEach(function (r) { var k = String(r['ผิวจราจร'] || '').trim(); if (k) surf[k] = (surf[k] || 0) + 1; });
    var topSurf = Object.keys(surf).sort(function (a, b) { return surf[b] - surf[a]; })[0];
    var q = roadQuery.trim().toLowerCase();
    var rows = roads.filter(function (r) { return !q || ROAD_COLS.map(function (c) { return r[c] || ''; }).join(' ').toLowerCase().indexOf(q) > -1; });
    box.innerHTML = '<div class="sk-kpi-grid sk-kpi-grid-4">' +
        kpiCard('blue', 'สายทางทั้งหมด', roads.length, 'จากชีททะเบียนคุมสายทางทางหลวงท้องถิ่น') +
        kpiCard('orange', 'ระยะทางรวม', total ? total.toLocaleString('th-TH', { maximumFractionDigits: 3 }) : 0, 'กิโลเมตร ตามข้อมูลที่ลงทะเบียน') +
        kpiCard('red', 'ผิวจราจร', esc(topSurf || '-'), 'ชนิดที่พบมากที่สุด') +
        kpiCard('blue', 'อัปเดตล่าสุด', esc(roads.updatedAt || '-'), 'ข้อมูลสายทาง') + '</div>' +
      '<section class="sk-card"><div class="sk-card-head flex-wrap"><div><h3>สายทางทางหลวงท้องถิ่น</h3><p>' + rows.length + ' รายการ • ข้อมูลแยกจากฐานข้อมูลโครงการ/ผู้ควบคุมงาน</p></div>' +
        '<div class="flex flex-wrap items-center gap-2"><input id="r-q" type="search" value="' + esc(roadQuery) + '" placeholder="ค้นหารหัสสายทาง ชื่อสายทาง ผิวจราจร สถานะ" class="sk-input w-72"/>' +
        '<button type="button" data-action="r-reload" class="sk-btn-clear">↻ โหลดข้อมูลสายทาง</button>' +
        '<button type="button" data-action="r-add" class="sk-btn-hero !py-2">+ ลงทะเบียนสายทาง</button></div></div>' +
        '<div class="px-space-lg pb-space-md"><div class="flex flex-wrap items-center justify-between gap-2 mb-2"><div><h4 class="font-semibold text-[#14532d]">แผนที่สายทางทางหลวงท้องถิ่น</h4>' +
          '<p class="text-xs text-on-surface-variant">' + (rows.some(function (r) { return latlng(r['พิกัดเริ่มต้น']); }) ? 'เส้นเชื่อมพิกัดเริ่มต้น–สิ้นสุดของแต่ละสายทาง' : 'ยังไม่มีข้อมูลพิกัดเริ่มต้น/สิ้นสุดสำหรับแสดงบนแผนที่') + '</p></div>' +
          '<button type="button" data-action="r-fit" class="sk-map-btn">ดูทั้งหมด</button></div>' +
          '<div id="road-map" class="h-[30rem] rounded-xl overflow-hidden bg-surface-container"></div></div>' +
        '<div class="overflow-x-auto"><table class="sk-table"><thead><tr><th>ลำดับ</th>' + ROAD_COLS.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        (rows.length ? rows.map(function (r, i) {
          return '<tr><td class="text-center">' + (i + 1) + '</td>' + ROAD_COLS.map(function (c) { return '<td class="whitespace-nowrap">' + esc(r[c] || '-') + '</td>'; }).join('') + '</tr>';
        }).join('') : '<tr><td colspan="' + (ROAD_COLS.length + 1) + '" class="text-center py-10 text-on-surface-variant">ยังไม่มีข้อมูลสายทางทางหลวงท้องถิ่น</td></tr>') + '</tbody></table></div></section>';
    $('r-q').addEventListener('input', function () { roadQuery = this.value; var pos = this.selectionStart; renderRoads(); var e = $('r-q'); e.focus(); e.setSelectionRange(pos, pos); });
    drawRoads(rows);
  }
  function drawRoads(rows) {
    if (!window.L) return;
    if (roadMap) { roadMap.remove(); roadMap = null; }
    roadMap = L.map('road-map', { scrollWheelZoom: false }).setView(center(), 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(roadMap);
    if (SK.tambon) SK.tambon.attach(roadMap, { fit: true });
    roadLayer = L.featureGroup().addTo(roadMap);
    rows.forEach(function (r, i) {
      var a = latlng(r['พิกัดเริ่มต้น']), b = latlng(r['พิกัดสิ้นสุด']);
      var tip = esc((r['รหัสสายทาง'] || '') + ' ' + (r['ชื่อสายทาง'] || '')) + '<br>' + esc(r['ระยะทาง'] || '') + ' • ' + esc(r['ผิวจราจร'] || '');
      var color = BAR[i % BAR.length];
      if (a && b) L.polyline([a, b], { color: color, weight: 5, opacity: .85 }).bindTooltip(tip, { sticky: true }).addTo(roadLayer);
      if (a) L.circleMarker(a, { radius: 6, color: '#fff', weight: 2, fillColor: '#19a865', fillOpacity: 1 }).bindTooltip('จุดเริ่มต้น: ' + tip).addTo(roadLayer);
      if (b) L.circleMarker(b, { radius: 6, color: '#fff', weight: 2, fillColor: '#ba1a1a', fillOpacity: 1 }).bindTooltip('จุดสิ้นสุด: ' + tip).addTo(roadLayer);
    });
    setTimeout(function () { roadMap.invalidateSize(); if (roadLayer.getLayers().length) roadMap.fitBounds(roadLayer.getBounds(), { padding: [30, 30], maxZoom: 16 }); }, 60);
  }

  // ---------- แท็บ ----------
  var page = (/[?&]tab=(\w+)/.exec(location.search) || [])[1] || 'supervisor';
  if (['supervisor', 'clerk', 'localRoad'].indexOf(page) < 0) page = 'supervisor';
  function showPage(p) {
    page = p;
    document.querySelectorAll('[data-action="dash-page"]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.page === p)); });
    document.querySelectorAll('[data-dash-page]').forEach(function (el) { var on = el.dataset.dashPage === p; el.classList.toggle('hidden', !on); el.classList.toggle('flex', on); });
    if (p === 'supervisor' && map) setTimeout(function () { map.invalidateSize(); }, 60);
    if (p === 'clerk') renderClerk();
    if (p === 'localRoad') renderRoads();
  }

  function refresh() { refreshSupervisor(false); }

  Object.assign(SK.actions, {
    'dash-page': function (el) {
      showPage(el.dataset.page);
      var q = new URLSearchParams(location.search);
      if (el.dataset.page === 'supervisor') q.delete('tab'); else q.set('tab', el.dataset.page);
      try { history.replaceState(null, '', 'index.html' + (q.toString() ? '?' + q : '')); } catch (e) {}
    },
    'dash-collapse': function (el) {
      var t = $(el.dataset.target); if (!t) return;
      var hide = !t.classList.contains('hidden');
      t.classList.toggle('hidden', hide);
      el.textContent = el.textContent.replace(/^[▾▸]\s*(ปิด|เปิด)/, hide ? '▸ เปิด' : '▾ ปิด');
      if (!hide && el.dataset.target === 'map-body' && map) setTimeout(function () { map.invalidateSize(); }, 60);
    },
    'dash-month-mode': function (el) { monthMode = el.dataset.mode; renderMonthly(FP()); },
    'dash-chart-filter': function (el) { setFilter(el.dataset.key, F[el.dataset.key] === el.dataset.v ? '' : el.dataset.v); },
    'dash-filter-reset': function () { F = {}; saveF(); refresh(); if (tambon) tambon.fit(); },
    'dash-map-go': function (el) {
      var m = markers.filter(function (x) { return x.__id === el.dataset.id; })[0];
      if (!m) return;
      $('map-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
      map.flyTo(m.getLatLng(), 17); setTimeout(function () { m.openPopup(); }, 700);
    },
    'exec-report': function () { SK.docs.print('slaReport', 'รายงานสรุปผู้บริหาร', FP(), 'รายงานสรุปโครงการและงบประมาณสำหรับผู้บริหาร'); },
    'new-project': function () { ui.openProjectForm(null, refresh); },
    'map-layers': function () {
      if (!map) return;
      map.removeLayer(layers[layerIdx].layer);
      layerIdx = (layerIdx + 1) % layers.length;
      layers[layerIdx].layer.addTo(map);
      $('map-layer-name').textContent = layers[layerIdx].name;
    },
    'map-locate': function () { if (!map) return; if (tambon) tambon.fit(); else map.flyTo(center(), 14); },
    'map-draw': function () {
      if (!map || !SK.tambon) return;
      ui.toast('คลิกบนแผนที่ทีละจุดตามแนวเขตหมู่บ้าน แล้วกด "เสร็จสิ้น"');
      SK.tambon.startDraw(map, function () { if (tambon) tambon.refresh(); });
    },
    'map-fullscreen': function () {
      var card = $('map-card');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (card.requestFullscreen) card.requestFullscreen();
    },
    'map-print': function () { printMap(); },
    'b-reload': function () { building = null; loadBuilding(true).then(renderClerk); renderClerk(); },
    'b-view': function (el) {
      var r = building[Number(el.dataset.i)];
      if (r && SK.docEngine && SK.docEngine.preview) SK.docEngine.preview('บันทึกตรวจสอบสิ่งปลูกสร้างอาคาร ' + (r['เลขบันทึก'] || ''), r['HTML ตรวจสอบอาคาร']);
    },
    'r-reload': function () { roads = null; renderRoads(); },
    'r-add': function () { if (SK.docEngine) SK.docEngine.openTool('localRoad', function () { roads = null; renderRoads(); }); },
    'r-fit': function () { if (roadMap && roadLayer && roadLayer.getLayers().length) roadMap.fitBounds(roadLayer.getBounds(), { padding: [30, 30], maxZoom: 16 }); else if (roadMap) roadMap.setView(center(), 14); }
  });

  SK.page = { refresh: refresh };
  ui.onReady(function () {
    initMap();
    refresh();
    showPage(page);
  });
})();
