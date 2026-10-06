// ฐานข้อมูลโครงการจริง: อ่านจากชีท "ฐานข้อมูลโครงการ" ของระบบเอกสาร (ลงทะเบียนผ่านฟอร์ม หรือนำเข้าจาก Google Sheet)
// แล้วแสดงบนหน้าเว็บหลักทุกหน้า (ไม่มีข้อมูลตัวอย่าง)
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui;
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
    // ศูนย์กลางตำบลจากขอบเขต OpenStreetMap (ถ้าโหลดไว้แล้ว) และตำแหน่งหมู่บ้านตามชื่อ
    var osm = (SK.db.data.meta || {}).tambonOsm || null;
    var center = (osm && osm.center) || data.defaultCenter || SK.ref.CENTER;
    var osmVillage = function (name) { var n = String(name || '').trim(); return n && osm && (osm.villages || []).filter(function (x) { return x.name === n || x.name === 'บ้าน' + n.replace(/^บ้าน/, ''); })[0]; };
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
        real: true,
        fields: row.fields || {}
      };
    });
    // หมู่บ้านจริงจากชีท: ใช้ค่ากึ่งกลางของพิกัดโครงการในหมู่นั้น
    Object.keys(villages).forEach(function (k) {
      var v = villages[k], pts = v.pts;
      var ov = !pts.length && osmVillage(v.name.replace(/^ม\.\d+\s*/, ''));
      var lat = pts.length ? pts.reduce(function (s, p) { return s + p[0]; }, 0) / pts.length : ov ? ov.lat : center[0];
      var lng = pts.length ? pts.reduce(function (s, p) { return s + p[1]; }, 0) / pts.length : ov ? ov.lng : center[1];
      SK.ref.VILLAGES[k] = { name: v.name, lat: lat, lng: lng };
    });
    projects.forEach(function (p) {
      if (!p.lat) { var v = SK.ref.VILLAGES[p.village]; p.lat = v.lat; p.lng = v.lng; p.approxLocation = true; }
    });
    return projects;
  }

  // เปิดหน้าเว็บ: รอโหลดข้อมูลจากคลาวด์ (assets/cloud.js) แล้วอ่านฐานข้อมูลโครงการจริง (ชีทของระบบเอกสาร)
  SK.dataReady = Promise.resolve(SK.cloudReady).then(function () { return SKGas.ready; }).then(function () {
    return SKGas.call('getDashboardDataFast');
  }).then(loadReal).catch(function (err) {
    console.warn('โหลดฐานข้อมูลโครงการไม่สำเร็จ', err);
    SK.db.useExternalProjects([], { count: 0, error: String(err && err.message || err) });
  });

  function loadReal(data) {
    var list = data && data.ok && data.rows ? mapRows(data) : [];
    return SKGas.summary().then(function (sum) {
      SK.db.useExternalProjects(list, { count: list.length, title: sum.title, savedAt: sum.savedAt, center: (data && data.defaultCenter) || SK.ref.CENTER });
      // รายการที่อ้างถึงโครงการที่ไม่มีแล้ว (เช่น ถูกลบจากชีท) ไม่แสดง
      var d = SK.db.data, has = function (id) { return !id || list.some(function (p) { return p.id === id; }); };
      d.diary = d.diary.filter(function (e) { return has(e.projectId); });
      d.payments = d.payments.filter(function (x) { return has(x.projectId); });
      d.documents = d.documents.filter(function (x) { return has(x.projectId); });
      d.inspections = d.inspections.filter(function (x) { return has(x.projectId); });
      d.notifications = d.notifications.filter(function (n) { var m = /id=([^&]+)/.exec(n.href || ''); return !m || has(decodeURIComponent(m[1])); });
    });
  }

  // แถบสถานะฐานข้อมูลบนทุกหน้า
  function banner() {
    var main = document.querySelector('main');
    if (!main) return;
    var ext = SK.db.external || { count: 0 }, cloud = SK.cloud && SK.cloud.active;
    var el = document.createElement('div');
    el.className = 'no-print flex flex-wrap items-center justify-between gap-2 px-4 py-2 mb-4 rounded-lg font-body-sm text-body-sm ' +
      (ext.count ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-secondary-fixed text-on-secondary-fixed-variant');
    var btn = function (act, icon, label, strong) {
      return '<button type="button" data-action="' + act + '" class="inline-flex items-center gap-1 px-3 py-1 rounded-full ' + (strong ? 'bg-primary text-on-primary' : 'bg-white/70 hover:bg-white') + ' font-semibold"><span class="material-symbols-outlined text-[16px]">' + icon + '</span>' + label + '</button>';
    };
    el.innerHTML = ext.count
      ? '<span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">' + (cloud ? 'cloud_done' : 'database') + '</span>ฐานข้อมูลโครงการ • ' + ext.count + ' โครงการ' +
        (ext.savedAt ? ' • ' + (cloud ? 'บันทึกบนคลาวด์' : 'บันทึกในเครื่องนี้') + ' ' + new Date(ext.savedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '') + '</span>' +
        '<span class="flex gap-2">' + btn('data-panel', 'swap_vert', 'นำเข้า / ส่งออก Excel') + '</span>'
      : '<span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">info</span>ยังไม่มีโครงการในฐานข้อมูล — ลงทะเบียนโครงการใหม่ หรือนำเข้าโครงการทั้งหมดจาก Google Sheet (Excel)</span>' +
        '<span class="flex flex-wrap gap-2">' + btn('register-project', 'add_circle', 'ลงทะเบียนโครงการใหม่', true) + btn('data-panel', 'upload_file', 'นำเข้าจาก Excel') + '</span>';
    var first = main.firstElementChild;
    (first && first.classList.contains('flex') && first.firstElementChild ? first : main).insertAdjacentElement('afterbegin', el);
  }

  // ลงทะเบียน/แก้ไขโครงการ: เปิดหน้า "กรอกข้อมูลโครงการ" ของระบบหลัก (index.html?page=openEntryGate) ทุกหน้า
  // กลับหน้าเดิมเมื่อบันทึก/ปิดฟอร์ม (back=)
  function entryUrl(existing) {
    var q = 'index.html?page=openEntryGate';
    if (existing && existing.rowNumber) q += '&row=' + encodeURIComponent(existing.rowNumber) + '&name=' + encodeURIComponent(existing.name || '');
    var here = location.pathname.split('/').pop() || 'index.html';
    if (here !== 'index.html') q += '&back=' + encodeURIComponent(here + location.search + location.hash);
    return q;
  }
  SK.entryUrl = entryUrl;
  function redirectEdits() {
    SK.ui.openProjectForm = function (existing) { location.href = entryUrl(existing && existing.rowNumber ? existing : null); };
  }
  SK.actions['register-project'] = function () { SK.ui.openProjectForm(null); };

  // ลบโครงการ: ลบแถวในชีท "ฐานข้อมูลโครงการ" แล้วเลื่อนรหัสโครงการถัดไป (P-รหัส = แถวในชีท)
  // ข้อมูลของเว็บที่ผูกกับโครงการ (บันทึกประจำวัน งวดงาน เอกสาร การตรวจรับ แจ้งเตือน ข่าว) ลบ/เลื่อนรหัสตาม
  function pid(row) { return 'P-' + String(row).padStart(3, '0'); }
  function remapId(deletedRow) {
    return function (id) {
      var m = /^P-(\d+)$/.exec(String(id || ''));
      if (!m) return id;
      var n = Number(m[1]);
      if (n === deletedRow) return null;
      return n > deletedRow ? pid(n - 1) : id;
    };
  }
  function remapLocal(deletedRow) {
    var d = SK.db.data, map = remapId(deletedRow);
    ['diary', 'payments', 'documents', 'inspections', 'photos'].forEach(function (k) {
      d[k] = (d[k] || []).filter(function (x) { return !x.projectId || map(x.projectId) !== null; })
        .map(function (x) { if (x.projectId) x.projectId = map(x.projectId); return x; });
    });
    d.notifications = (d.notifications || []).filter(function (n) {
      var m = /[?&]id=(P-\d+)/.exec(n.href || '');
      if (!m) return true;
      var to = map(m[1]);
      if (to === null) return false;
      n.href = n.href.replace(m[1], to);
      n.title = String(n.title || '').replace(m[1], to);
      return true;
    });
    var ms = {};
    Object.keys(d.milestones || {}).forEach(function (k) { var to = map(k); if (to) ms[to] = d.milestones[k]; });
    d.milestones = ms;
  }
  SK.deleteProject = function (p) {
    if (!p || !p.rowNumber) { ui.toast('ไม่พบแถวของโครงการนี้ในฐานข้อมูล', 'error'); return Promise.resolve(false); }
    return ui.confirm('ลบโครงการ "' + p.name + '" (' + p.id + ') ออกจากฐานข้อมูล? บันทึกประจำวัน งวดงาน และเอกสารของโครงการนี้จะถูกลบด้วย และย้อนกลับไม่ได้', 'ลบโครงการ', 'danger').then(function (ok) {
      if (!ok) return false;
      ui.toast('กำลังลบโครงการ...');
      var row = Number(p.rowNumber);
      return SKGas.call('deleteProjectEntry', '', row)
        .then(function () {
          remapLocal(row);
          SK.db.save();
          return SK.news && SK.news.remapProjects ? SK.news.remapProjects(remapId(row)) : null;
        })
        .then(function () { return SK.cloud && SK.cloud.active ? SK.cloud.flush() : null; })
        .then(function () {
          ui.toast('ลบโครงการแล้ว', 'success');
          setTimeout(function () { location.href = 'projects.html'; }, 500);
          return true;
        }, function (err) { ui.toast('ลบไม่สำเร็จ: ' + (err && err.message || err), 'error'); return false; });
    });
  };
  SK.actions['delete-project'] = function (el) {
    var p = SK.db.data.projects.filter(function (x) { return x.id === el.dataset.id; })[0];
    SK.deleteProject(p);
  };

  SK.actions['data-panel'] = function () { if (window.SKData) SKData.open(); };

  // ปีงบประมาณในข้อความของหน้าเว็บ (แบบหน้าเว็บเขียนไว้เป็น 2567): ใช้ปีงบประมาณจริง
  function budgetYear() {
    var y = String(SK.fiscalYear()), yy = y.slice(-2);
    var rules = [
      [/((?:ปีงบ(?:ประมาณ|ฯ)|ประจำปี(?:งบประมาณ)?|รอบปี|งบประมาณ)\s*(?:พ\.ศ\.\s*)?)2567/g, '$1' + y],
      [/((?:ปีงบฯ?|ปี)\s*)67\b/g, '$1' + yy],
      [/ไตรมาส\s*3\/2567\s*\(1 เม\.ย\. - 30 มิ\.ย\. 2567\)/g, quarterText()],
      [/ไตรมาสที่\s*\d/g, 'ไตรมาสที่ ' + quarterNo()]
    ];
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = walk.nextNode())) {
      var v = n.nodeValue, o = v;
      rules.forEach(function (r) { v = v.replace(r[0], r[1]); });
      if (v !== o) n.nodeValue = v;
    }
  }
  function quarterNo() { var m = new Date().getMonth(); return m >= 9 ? 1 : Math.floor(m / 3) + 2; }
  // ไตรมาสปัจจุบันของปีงบประมาณ
  function quarterText() {
    var now = new Date(), m = now.getMonth(), q = m >= 9 ? 1 : Math.floor(m / 3) + 2;
    var names = ['1 ต.ค. - 31 ธ.ค.', '1 ม.ค. - 31 มี.ค.', '1 เม.ย. - 30 มิ.ย.', '1 ก.ค. - 30 ก.ย.'];
    return 'ไตรมาส ' + q + '/' + SK.fiscalYear() + ' (' + names[q - 1] + ')';
  }

  SK.ui.onReady(function () { banner(); redirectEdits(); budgetYear(); });
})();
