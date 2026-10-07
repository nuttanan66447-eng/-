// ฐานข้อมูลโครงการจริง: ชีท "ฐานข้อมูลโครงการ" ของระบบหลัก (กรอกผ่านหน้า "กรอกข้อมูลโครงการ" หรือนำเข้า Excel)
// อ่านผ่านตัวจำลอง Apps Script (SKGas) แล้วแปลงเป็นรายการโครงการของเว็บ — รหัสโครงการ P-<แถว> เหมือนเดิม
(function () {
  'use strict';
  var SK = window.SK;
  var PEOPLE = window.SK_PERSONNEL || { supervisors: [], committee: [], executives: [], villages: [] };
  var CENTER = [16.0538, 103.6520];
  var state = { list: [], info: { count: 0 }, loaded: false };

  var CATEGORIES = {
    road: { label: 'งานถนน / สะพาน', icon: 'add_road', color: '#006194' },
    drainage: { label: 'งานระบายน้ำ / แหล่งน้ำ', icon: 'water_drop', color: '#007da9' },
    building: { label: 'งานอาคาร / สิ่งก่อสร้าง', icon: 'apartment', color: '#565e74' },
    electrical: { label: 'งานไฟฟ้า / ส่องสว่าง', icon: 'solar_power', color: '#b45309' }
  };
  var STATUSES = {
    progress: { label: 'กำลังดำเนินการ', chip: 'chip-blue', color: '#006194' },
    delayed: { label: 'ล่าช้ากว่าแผน', chip: 'chip-red', color: '#ba1a1a' },
    completed: { label: 'แล้วเสร็จ', chip: 'chip-green', color: '#15803d' },
    pending: { label: 'ยังไม่เริ่มงาน', chip: 'chip-gray', color: '#707881' }
  };
  function category(type) {
    if (/ไฟฟ้า|โซล่า|โซลาร์|ส่องสว่าง/.test(type)) return 'electrical';
    if (/อาคาร|ศาลา|ห้องน้ำ|ลาน|รั้ว/.test(type)) return 'building';
    if (/ท่อ|ระบายน้ำ|ประปา|ขุดลอก|ฝาย|สระ|แหล่งน้ำ|บ่อ/.test(type)) return 'drainage';
    return 'road';
  }
  // สถานะ: ตามข้อความในชีท + เทียบผลงานกับแผนตามวันที่ในสัญญา (ช้ากว่าแผนเกิน 15% = ล่าช้า)
  function statusOf(s, actual, plan, started) {
    if (/แล้วเสร็จ|ส่งมอบ|ตรวจรับแล้ว/.test(s) || actual >= 100) return 'completed';
    if (/ล่าช้า|เกิน/.test(s)) return 'delayed';
    if (/กำลัง|ดำเนินการ/.test(s) || actual > 0 || started) return plan - actual > 15 ? 'delayed' : 'progress';
    return 'pending';
  }
  function f(row, key) { return String((row.fields && row.fields[key]) || '').trim(); }

  function villageName(no) {
    var v = PEOPLE.villages.filter(function (x) { return String(x.no) === String(no); })[0];
    return v ? v.name : '';
  }

  function mapRows(data) {
    var today = SK.todayIso();
    return (data.rows || []).map(function (row) {
      var no = String(row.villageNo || f(row, 'หมู่ที่') || '').replace(/\D/g, '');
      var vName = row.villageName || f(row, 'หมู่บ้าน') || villageName(no);
      var start = SK.isoDate(f(row, 'วันเริ่มสัญญา')), end = SK.isoDate(f(row, 'สิ้นสุดสัญญา'));
      var actual = Math.max(0, Math.min(100, Number(row.progress) || SK.num(f(row, 'ความก้าวหน้า'))));
      var statusText = row.status || f(row, 'สถานะ');
      var done = /แล้วเสร็จ|ส่งมอบ|ตรวจรับแล้ว/.test(statusText);
      var plan = done ? 100 : (start && end && end > start ? Math.max(0, Math.min(100, Math.round((Date.parse(today) - Date.parse(start)) / (Date.parse(end) - Date.parse(start)) * 100))) : actual);
      var type = row.type || f(row, 'ประเภทงาน');
      var year = SK.num(row.year || f(row, 'งบประมาณประจำปี')) || '';
      return {
        id: 'P-' + String(row.rowNumber).padStart(3, '0'),
        rowNumber: row.rowNumber,
        name: row.projectName || f(row, 'ชื่อโครงการ') || 'ไม่ระบุชื่อโครงการ',
        type: type,
        category: category(type),
        villageNo: no,
        villageName: vName,
        place: no ? 'หมู่ที่ ' + no + (vName ? ' บ้าน' + String(vName).replace(/^บ้าน/, '') : '') : (vName || f(row, 'สถานที่ก่อสร้าง') || ''),
        work: f(row, 'ปริมาณงาน'),
        source: f(row, 'งบประมาณ'),
        year: year,
        budget: row.budget || SK.num(f(row, 'ค่างาน')),
        contractNo: f(row, 'เลขที่สัญญา'),
        contractDate: f(row, 'วันที่สัญญา'),
        contractor: row.contractor || f(row, 'ผู้รับจ้าง'),
        supervisor: f(row, 'ผู้ควบคุมงาน คนที่ 1'),
        supervisorPosition: f(row, 'ตำแหน่งผู้ควบคุมงาน คนที่ 1'),
        start: start, end: end,
        days: start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : 0,
        actual: actual, plan: plan,
        status: statusOf(statusText, actual, plan, !!(start && start <= today)),
        statusText: statusText,
        lat: row.hasLocation && row.lat ? Number(row.lat) : null,
        lng: row.hasLocation && row.lng ? Number(row.lng) : null,
        fields: row.fields || {}
      };
    });
  }

  var loading = null;
  function load() {
    if (!window.SKGas) return Promise.resolve(state.list);
    loading = Promise.resolve(SK.cloud && SK.cloud.ready).then(function () { return SKGas.ready; }).then(function () {
      return Promise.all([SKGas.call('getDashboardDataFast'), SKGas.summary()]);
    }).then(function (r) {
      var data = r[0], sum = r[1] || {};
      state.list = data && data.ok ? mapRows(data) : [];
      state.info = { count: state.list.length, savedAt: sum.savedAt, title: sum.title, center: (data && data.defaultCenter) || CENTER, error: data && !data.ok ? data.message : '' };
      state.loaded = true;
      window.dispatchEvent(new CustomEvent('sk:projects'));
      return state.list;
    }).catch(function (err) {
      console.warn('โหลดฐานข้อมูลโครงการไม่สำเร็จ', err);
      state.info = { count: 0, error: String(err && err.message || err) };
      state.loaded = true;
      window.dispatchEvent(new CustomEvent('sk:projects'));
      return state.list;
    });
    return loading;
  }
  // ระบบหลักบันทึกชีท (เพิ่ม/แก้ไข/ลบโครงการ หรือนำเข้า Excel): โหลดรายการใหม่
  var timer = null;
  if (typeof BroadcastChannel === 'function') {
    new BroadcastChannel('sikaew-gas').addEventListener('message', function (e) {
      var t = e.data && e.data.type;
      if (t !== 'saved' && t !== 'imported') return;
      clearTimeout(timer);
      timer = setTimeout(load, 600);
    });
  }

  function byId(id) { return state.list.filter(function (p) { return p.id === id; })[0] || null; }
  function years() {
    var ys = {};
    state.list.forEach(function (p) { if (p.year) ys[p.year] = 1; });
    return Object.keys(ys).map(Number).sort(function (a, b) { return b - a; });
  }
  function villages() {
    var map = {};
    PEOPLE.villages.forEach(function (v) { map[v.no] = { no: String(v.no), name: v.name }; });
    state.list.forEach(function (p) { if (p.villageNo && !map[p.villageNo]) map[p.villageNo] = { no: p.villageNo, name: p.villageName }; });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.no - b.no; });
  }
  function statusChip(p) { var s = STATUSES[p.status] || STATUSES.pending; return '<span class="' + s.chip + '"><span class="w-1.5 h-1.5 rounded-full" style="background:' + s.color + '"></span>' + SK.esc(p.statusText && p.status !== 'delayed' && !/ไม่ระบุ|^-$/.test(p.statusText) ? p.statusText : s.label) + '</span>'; }

  // คณะกรรมการ/ผู้ควบคุมงานของโครงการจากชีท
  function people(p) {
    var F = p.fields || {}, out = { supervisors: [], inspection: [], price: [], tor: [] };
    var push = function (list, name, role, pos) { name = String(name || '').trim(); if (name) list.push({ name: name, role: role, position: String(pos || '').trim() }); };
    for (var i = 1; i <= 4; i++) push(out.supervisors, F['ผู้ควบคุมงาน คนที่ ' + i], 'ผู้ควบคุมงาน', F['ตำแหน่งผู้ควบคุมงาน คนที่ ' + i]);
    push(out.inspection, F['ประธานกรรมการตรวจรับงานจ้าง'], 'ประธานกรรมการ', F['ตำแหน่งประธาน']);
    for (i = 1; i <= 4; i++) push(out.inspection, F['กรรมการตรวจรับงานจ้าง ' + i], 'กรรมการ', F['ตำแหน่งกรรมการ ' + i]);
    Object.keys(F).forEach(function (k) {
      var v = F[k];
      if (!v || /ตำแหน่ง|วันที่|เลขที่|คำสั่ง/.test(k)) return;
      if (/ราคากลาง/.test(k) && /ประธาน|กรรมการ/.test(k)) push(out.price, v, /ประธาน/.test(k) ? 'ประธานกรรมการ' : 'กรรมการ', F[k.replace(/^(ประธาน|กรรมการ)/, 'ตำแหน่ง$1')] || '');
      else if (/TOR/.test(k) && /ประธาน|กรรมการ/.test(k)) push(out.tor, v, /ประธาน/.test(k) ? 'ประธานกรรมการ' : 'กรรมการ', '');
    });
    return out;
  }

  SK.projects = {
    load: load, byId: byId, years: years, villages: villages, people: people, statusChip: statusChip,
    get list() { return state.list; },
    get info() { return state.info; },
    get loaded() { return state.loaded; },
    ready: function () { return loading || load(); },
    CATEGORIES: CATEGORIES, STATUSES: STATUSES, CENTER: CENTER
  };
})();
