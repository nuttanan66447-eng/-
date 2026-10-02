// ใช้ข้อมูลโครงการจริงจาก Google Sheet (ที่นำเข้าในระบบงานเอกสาร) แสดงบนหน้าเว็บหลัก
// ถ้ายังไม่ได้นำเข้า หน้าเว็บจะแสดงข้อมูลตัวอย่างพร้อมแถบแจ้ง
(function () {
  'use strict';
  var SK = window.SK;
  if (!window.SKGas) return;

  var MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
  function arabic(s) { return String(s || '').replace(/[๐-๙]/g, function (d) { return THAI_DIGITS.indexOf(d); }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // "15 มีนาคม 2569", "15 มี.ค. 69", "15/03/2569", "2026-03-15" -> "2026-03-15"
  function isoDate(text) {
    var s = arabic(text).trim();
    if (!s) return '';
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    var d, mo, y;
    m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(s);
    if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else {
      m = /^(\d{1,2})\s*([^\s\d]+)\s*(\d{2,4})/.exec(s);
      if (!m) return '';
      d = +m[1]; y = +m[3];
      mo = MONTHS.indexOf(m[2]) + 1 || MONTHS_SHORT.indexOf(m[2]) + 1;
      if (!mo) return '';
    }
    if (y < 100) y += 2500;
    if (y > 2400) y -= 543;
    if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return '';
    return y + '-' + pad(mo) + '-' + pad(d);
  }
  function num(v) { var n = Number(arabic(v).replace(/[^\d.-]/g, '')); return isFinite(n) ? n : 0; }
  function f(row, key) { return String((row.fields && row.fields[key]) || '').trim(); }

  function category(type) {
    if (/ไฟฟ้า|โซล่า|โซลาร์|ส่องสว่าง/.test(type)) return 'electrical';
    if (/อาคาร|ศาลา|ห้องน้ำ|ลาน|รั้ว/.test(type)) return 'building';
    if (/ท่อ|ระบายน้ำ|ประปา|ขุดลอก|ฝาย|สระ|แหล่งน้ำ|บ่อ/.test(type)) return 'drainage';
    return 'road';
  }
  function statusOf(s) {
    if (/แล้วเสร็จ|ส่งมอบ|ตรวจรับแล้ว/.test(s)) return 'completed';
    if (/ล่าช้า|เกิน/.test(s)) return 'delayed';
    if (/กำลัง|ดำเนินการ/.test(s)) return 'on-schedule';
    return 'unknown';
  }
  function source(s) {
    if (/เฉพาะกิจ/.test(s)) return 'specific-grant';
    if (/อุดหนุน/.test(s)) return 'general-grant';
    if (/สะสม/.test(s)) return 'accumulated';
    return 'local';
  }

  function mapRows(data) {
    var center = data.defaultCenter || [16.0538, 103.6520];
    var villages = {};
    var today = new Date().toISOString().slice(0, 10);
    var projects = data.rows.map(function (row) {
      var no = String(row.villageNo || f(row, 'หมู่ที่') || '').replace(/\D/g, '');
      var vKey = no ? 'm' + no : 'm0';
      var vName = row.villageName || f(row, 'หมู่บ้าน');
      if (!villages[vKey]) villages[vKey] = { name: no ? 'ม.' + no + (vName ? ' ' + vName : '') : 'ไม่ระบุหมู่', pts: [] };
      var lat = row.lat, lng = row.lng;
      if (row.hasLocation && lat && lng) villages[vKey].pts.push([lat, lng]);
      var start = isoDate(f(row, 'วันเริ่มสัญญา')), end = isoDate(f(row, 'สิ้นสุดสัญญา'));
      var status = statusOf(row.status || f(row, 'สถานะ'));
      var budget = row.budget || num(f(row, 'ค่างาน'));
      var actual = Math.max(0, Math.min(100, Number(row.progress) || num(f(row, 'ความก้าวหน้า'))));
      var plan = status === 'completed' ? 100 : (start && end && end > start ? Math.max(0, Math.min(100, Math.round((Date.parse(today) - Date.parse(start)) / (Date.parse(end) - Date.parse(start)) * 100))) : actual);
      var sup = f(row, 'ผู้ควบคุมงาน คนที่ 1'), supPos = f(row, 'ตำแหน่งผู้ควบคุมงาน คนที่ 1');
      return {
        id: 'P-' + String(row.rowNumber).padStart(3, '0'),
        rowNumber: row.rowNumber,
        contractNo: f(row, 'เลขที่สัญญา') || '-',
        egp: '',
        name: row.projectName || f(row, 'ชื่อโครงการ') || 'ไม่ระบุชื่อโครงการ',
        category: category(row.type || f(row, 'ประเภทงาน')),
        typeLabel: row.type || f(row, 'ประเภทงาน'),
        village: vKey,
        location: f(row, 'ปริมาณงาน') || f(row, 'สถานที่ก่อสร้าง') || '-',
        source: source(f(row, 'งบประมาณ')),
        sourceLabel: f(row, 'งบประมาณ'),
        year: row.year || f(row, 'งบประมาณประจำปี'),
        budget: budget,
        // ชีทไม่มีข้อมูลการเบิกจ่ายรายงวด: นับยอดของโครงการที่ตรวจรับแล้วเป็นเบิกจ่ายแล้ว
        disbursed: status === 'completed' ? budget : 0,
        installment: status === 'completed' ? 1 : 0,
        installments: 1,
        contractor: row.contractor || f(row, 'ผู้รับจ้าง') || '-',
        supervisor: sup ? sup + (supPos ? ' (' + supPos + ')' : '') : '-',
        start: start, end: end,
        actual: actual, plan: plan,
        status: status,
        statusLabel: row.status || f(row, 'สถานะ'),
        lat: lat || null, lng: lng || null,
        createdAt: start || '',
        real: true
      };
    });
    // หมู่บ้านจริงจากชีท: ใช้ค่ากึ่งกลางของพิกัดโครงการในหมู่นั้น
    Object.keys(villages).forEach(function (k) {
      var v = villages[k], pts = v.pts;
      var lat = pts.length ? pts.reduce(function (s, p) { return s + p[0]; }, 0) / pts.length : center[0];
      var lng = pts.length ? pts.reduce(function (s, p) { return s + p[1]; }, 0) / pts.length : center[1];
      SK.ref.VILLAGES[k] = { name: v.name, lat: lat, lng: lng };
    });
    projects.forEach(function (p) {
      if (!p.lat) { var v = SK.ref.VILLAGES[p.village]; p.lat = v.lat; p.lng = v.lng; p.approxLocation = true; }
    });
    return projects;
  }

  SK.dataReady = SKGas.call('getDashboardDataFast').then(function (data) {
    if (!data || !data.ok || !data.rows || !data.rows.length) return;
    var list = mapRows(data);
    return SKGas.summary().then(function (sum) {
      SK.db.useExternalProjects(list, { count: list.length, title: sum.title, savedAt: sum.savedAt, center: data.defaultCenter });
      // ข้อมูลตัวอย่าง (ฎีกา บันทึกหน้างาน แจ้งเตือน เอกสาร) ที่อ้างถึงโครงการตัวอย่างไม่แสดงร่วมกับข้อมูลจริง
      var d = SK.db.data, has = function (id) { return !id || list.some(function (p) { return p.id === id; }); };
      d.diary = d.diary.filter(function (e) { return has(e.projectId); });
      d.payments = d.payments.filter(function (x) { return has(x.projectId); });
      d.documents = d.documents.filter(function (x) { return has(x.projectId); });
      d.inspections = d.inspections.filter(function (x) { return has(x.projectId); });
      d.notifications = d.notifications.filter(function (n) { var m = /id=([^&]+)/.exec(n.href || ''); return !m || has(decodeURIComponent(m[1])); });
    });
  }).catch(function (err) { console.warn('โหลดข้อมูลจริงไม่สำเร็จ', err); });

  // แถบแจ้งแหล่งข้อมูลบนทุกหน้า
  function banner() {
    var main = document.querySelector('main');
    if (!main) return;
    var ext = SK.db.external;
    var el = document.createElement('div');
    el.className = 'no-print flex flex-wrap items-center justify-between gap-2 px-4 py-2 mb-4 rounded-lg font-body-sm text-body-sm ' + (ext ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-secondary-fixed text-on-secondary-fixed-variant');
    el.innerHTML = ext
      ? '<span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">cloud_done</span>ข้อมูลจริงจาก Google Sheet • ' + ext.count + ' โครงการ' +
        (ext.savedAt ? ' • อัปเดตในเครื่องนี้ ' + new Date(ext.savedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '') + '</span>' +
        '<button type="button" data-action="data-panel" class="font-bold underline">นำเข้า / ส่งออกข้อมูล</button>'
      : '<span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">info</span>กำลังแสดงข้อมูลตัวอย่าง — นำเข้าข้อมูลจริงจาก Google Sheet เพื่อพิมพ์เอกสารโครงการ</span>' +
        '<button type="button" data-action="data-panel" class="font-bold underline">นำเข้าข้อมูลจริง →</button>';
    var first = main.firstElementChild;
    (first && first.classList.contains('flex') && first.firstElementChild ? first : main).insertAdjacentElement('afterbegin', el);
  }

  // ข้อมูลจริงเพิ่ม/แก้ไขด้วยแบบฟอร์มโครงการชุดเดิม เพื่อให้เป็นข้อมูลเดียวกับที่ใช้พิมพ์เอกสาร
  function redirectEdits() {
    if (!SK.db.external || !SK.docEngine) return;
    SK.ui.openProjectForm = function (existing) { SK.docEngine.openEntry(existing || null); };
  }

  SK.actions['data-panel'] = function () { if (window.SKData) SKData.open(); };

  // ปีงบประมาณบนหัวหน้าเว็บ: ใช้ปีล่าสุดในข้อมูลจริง
  function budgetYear() {
    if (!SK.db.external) return;
    var years = SK.db.data.projects.map(function (p) { return parseInt(arabic(p.year), 10); }).filter(function (y) { return y > 2400; });
    if (!years.length) return;
    var y = String(Math.max.apply(null, years));
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walk.nextNode())) {
      if (/ปีงบ(ประมาณ|ฯ)\s*2567/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/(ปีงบ(?:ประมาณ|ฯ)\s*)2567/, '$1' + y);
    }
  }

  SK.ui.onReady(function () { banner(); redirectEdits(); budgetYear(); });
})();
