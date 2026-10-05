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

  // โครงการตัวอย่างของเว็บไซต์ -> แถวในชีท "ฐานข้อมูลโครงการ" ของระบบเดิม (ใช้พิมพ์เอกสาร)
  var CATEGORY_TYPES = { road: 'งานถนน', drainage: 'งานระบายน้ำ', building: 'งานอาคาร', electrical: 'งานไฟฟ้า' };
  function thaiDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? +m[3] + ' ' + MONTHS[+m[2] - 1] + ' ' + (+m[1] + 543) : '';
  }
  function person(text) {
    var m = /^(.*?)\s*\((.*)\)\s*$/.exec(text || '');
    return m ? [m[1], m[2]] : [text || '', ''];
  }
  function genRow(p) {
    var v = SK.ref.VILLAGES[p.village] || { name: '' };
    var vm = /^ม\.(\d+)\s*(.*)$/.exec(v.name) || [null, '', v.name];
    var sup = person(p.supervisor), cm = SK.ref.COMMITTEE || [];
    var start = /^(\d{4})-(\d{2})/.exec(p.start || '');
    var row = {
      'ชื่อโครงการ': p.name,
      'ชื่อหน่วยงานท้องถิ่น': 'เทศบาลตำบลสีแก้ว',
      'ปริมาณงาน': p.location || '',
      'งบประมาณ': SK.ref.SOURCES[p.source] || '',
      'งบประมาณประจำปี': p.year || (start ? String(+start[1] + 543 + (+start[2] >= 10 ? 1 : 0)) : ''),
      'เลขที่สัญญา': p.contractNo || '',
      'ลงวันที่สัญญา': thaiDate(p.start),
      'วันเริ่มสัญญา': thaiDate(p.start),
      'สิ้นสุดสัญญา': thaiDate(p.end),
      'พิกัดโครงการ': p.lat && p.lng ? p.lat + ', ' + p.lng : '',
      'ค่างาน': Number(p.budget || 0).toLocaleString('en-US'),
      'ค่าปรับวันละ': Math.round(Number(p.budget || 0) / 1000).toLocaleString('en-US'),
      'สถานที่ก่อสร้าง': vm[1] ? 'หมู่ที่ ' + vm[1] + ' ' + vm[2] : v.name,
      'หมู่ที่': vm[1],
      'หมู่บ้าน': vm[2],
      'ประเภทงาน': CATEGORY_TYPES[p.category] || '',
      'ความก้าวหน้า': p.actual != null ? String(p.actual) : '',
      'จำนวนผู้ควบคุมงาน': sup[0] ? '1' : '',
      'ผู้ควบคุมงาน คนที่ 1': sup[0],
      'ตำแหน่งผู้ควบคุมงาน คนที่ 1': sup[1],
      'ผู้รับจ้าง': p.contractor && p.contractor !== '-' ? p.contractor : '',
      'หมายเหตุ': 'โครงการตัวอย่างของเว็บไซต์ (' + p.id + ')'
    };
    if (cm.length) {
      row['จำนวนคณะกรรมการตรวจรับงานจ้าง'] = cm.length + ' คน';
      row['ประธานกรรมการตรวจรับงานจ้าง'] = cm[0].name; row['ตำแหน่งประธาน'] = cm[0].position;
      cm.slice(1, 5).forEach(function (c, i) {
        row['กรรมการตรวจรับงานจ้าง ' + (i + 1)] = c.name; row['ตำแหน่งกรรมการ ' + (i + 1)] = c.position;
      });
    }
    return row;
  }
  // โครงการที่บันทึกผ่านฟอร์มโครงการ (p.sheet = แถวในชีท): ใช้ค่าจากฟอร์มทุกช่อง
  // ยกเว้นช่องที่ถูกแก้ไขจากหน้าเว็บภายหลัง (ค่าที่สร้างได้ต่างจากตอนบันทึก p.sheetGen)
  function sampleRow(p) {
    var gen = genRow(p);
    if (!p.sheet) return gen;
    var out = Object.assign({}, p.sheet), base = p.sheetGen || {};
    Object.keys(gen).forEach(function (k) { if (gen[k] !== base[k]) out[k] = gen[k]; else if (!(k in out)) out[k] = ''; });
    return out;
  }

  // แถวในชีทหลังบันทึกฟอร์มโครงการ -> โครงการของเว็บ (โหมดข้อมูลตัวอย่าง)
  function captureEntry(existing) {
    var list = SK.db.data.projects;
    return SK.docEngine.call('getDashboardDataFast').then(function (data) {
      if (!data || !data.rows) return;
      var row = existing ? data.rows.filter(function (r) { return r.rowNumber === existing.rowNumber; })[0]
        : data.rows.filter(function (r) { return !list.some(function (p) { return p.rowNumber === r.rowNumber; }); }).sort(function (a, b) { return b.rowNumber - a.rowNumber; })[0];
      if (!row) return;
      var keep = Object.assign({}, SK.ref.VILLAGES);
      var m = mapRows({ rows: [row], defaultCenter: data.defaultCenter })[0];
      var vill = SK.ref.VILLAGES[m.village];
      // mapRows ปรับหมู่บ้านของเว็บตามแถวนี้: คืนค่าเดิม (ชื่อหมู่บ้านตัวอย่างไม่เปลี่ยน)
      for (var k in SK.ref.VILLAGES) if (!keep[k]) delete SK.ref.VILLAGES[k];
      Object.assign(SK.ref.VILLAGES, keep);
      // หมู่บ้านที่ยังไม่มีในเว็บ: เก็บไว้กับข้อมูล (ใช้ได้ทุกเครื่อง)
      if (!SK.ref.VILLAGES[m.village] && vill) {
        var meta = SK.db.data.meta || (SK.db.data.meta = {});
        (meta.villages = meta.villages || {})[m.village] = vill;
        SK.ref.VILLAGES[m.village] = vill;
      }
      var p = existing ? list.filter(function (x) { return x.id === existing.id; })[0] : null;
      if (!p) {
        var yy = String((parseInt(m.year, 10) || new Date().getFullYear() + 543) % 100).padStart(2, '0');
        var n = 1, id;
        do { id = 'SK-' + yy + '-' + String(n++).padStart(3, '0'); } while (list.some(function (x) { return x.id === id; }));
        p = { id: id, egp: '', disbursed: 0, installment: 0, installments: 1, actual: m.actual || 0, plan: 0,
          status: m.status === 'unknown' ? 'signing' : m.status, createdAt: new Date().toISOString().slice(0, 10) };
        list.push(p);
      }
      ['name', 'contractNo', 'category', 'typeLabel', 'village', 'location', 'source', 'sourceLabel', 'year', 'budget', 'contractor', 'supervisor', 'start', 'end', 'lat', 'lng']
        .forEach(function (k) { if (m[k] !== undefined && m[k] !== '') p[k] = m[k]; });
      if (m.status === 'completed') p.status = 'completed';
      p.rowNumber = row.rowNumber;
      p.sheet = Object.assign({}, row.fields);
      p.sheetGen = genRow(p);
      SK.db.save();
    });
  }
  // บันทึกฟอร์มโครงการแล้ว: ข้อมูลจริงอ่านจากชีทเมื่อโหลดหน้าใหม่อยู่แล้ว ส่วนข้อมูลตัวอย่างต้องเก็บเป็นโครงการของเว็บ
  SK.afterEntrySave = function (existing) { return SK.db.external ? null : captureEntry(existing); };

  // ยังไม่ได้นำเข้าข้อมูลจริง: ส่งโครงการตัวอย่างให้ตัวสร้างเอกสาร ทุกโครงการจึงพิมพ์เอกสารได้ทันที
  function useSampleProjects() {
    var list = SK.db.data.projects, mv = (SK.db.data.meta || {}).villages || {};
    Object.keys(mv).forEach(function (k) { if (!SK.ref.VILLAGES[k]) SK.ref.VILLAGES[k] = mv[k]; });
    return SKGas.syncSample(list.map(sampleRow)).then(function (res) {
      if (!res || !res.sample) return false;
      list.forEach(function (p, i) { p.rowNumber = i + 2; });
      return true;
    });
  }

  // รอโหลดข้อมูลจากคลาวด์ (assets/cloud.js) ก่อน
  SK.dataReady = Promise.resolve(SK.cloudReady).then(useSampleProjects).then(function (sample) {
    if (sample) return;
    return SKGas.call('getDashboardDataFast').then(loadReal);
  }).catch(function (err) { console.warn('โหลดข้อมูลจริงไม่สำเร็จ', err); });

  function loadReal(data) {
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
  }

  // แถบแจ้งแหล่งข้อมูลบนทุกหน้า
  function banner() {
    var main = document.querySelector('main');
    if (!main) return;
    var ext = SK.db.external;
    var el = document.createElement('div');
    el.className = 'no-print flex flex-wrap items-center justify-between gap-2 px-4 py-2 mb-4 rounded-lg font-body-sm text-body-sm ' + (ext ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-secondary-fixed text-on-secondary-fixed-variant');
    el.innerHTML = ext
      ? '<span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">cloud_done</span>ข้อมูลจริงจาก Google Sheet • ' + ext.count + ' โครงการ' +
        (ext.savedAt ? (SK.cloud && SK.cloud.active ? ' • ซิงก์บนคลาวด์ • อัปเดต ' : ' • อัปเดตในเครื่องนี้ ') + new Date(ext.savedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '') + '</span>' +
        '<button type="button" data-action="data-panel" class="font-bold underline">นำเข้า / ส่งออกข้อมูล</button>'
      : '<span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">info</span>กำลังแสดงข้อมูลตัวอย่าง (พิมพ์เอกสารได้ทุกโครงการ) — นำเข้าข้อมูลจริงจาก Google Sheet เพื่อใช้โครงการจริง</span>' +
        '<button type="button" data-action="data-panel" class="font-bold underline">นำเข้าข้อมูลจริง →</button>';
    var first = main.firstElementChild;
    (first && first.classList.contains('flex') && first.firstElementChild ? first : main).insertAdjacentElement('afterbegin', el);
  }

  // ข้อมูลจริงเพิ่ม/แก้ไขด้วยแบบฟอร์มโครงการชุดเดิม เพื่อให้เป็นข้อมูลเดียวกับที่ใช้พิมพ์เอกสาร
  // ลงทะเบียน/แก้ไขโครงการด้วยแบบฟอร์มโครงการชุดเดิม (ทุกช่องที่ใช้พิมพ์เอกสาร) ทั้งข้อมูลจริงและข้อมูลตัวอย่าง
  // ข้อมูลตัวอย่างยังใช้ฟอร์มย่อของเว็บสำหรับปรับผลงาน/สถานะ (ข้อมูลจริงคำนวณจากชีท)
  function redirectEdits() {
    if (!SK.docEngine) return;
    var basic = SK.ui.openProjectForm;
    SK.ui.openProjectFormBasic = SK.db.external ? null : basic;
    SK.ui.openProjectForm = function (existing) { SK.docEngine.openEntry(existing && existing.rowNumber ? existing : null); };
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
