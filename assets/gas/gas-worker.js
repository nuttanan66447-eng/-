/*
 * Web Worker ที่รันโค้ดฝั่งเซิร์ฟเวอร์ของระบบเดิม (Config.gs + Code.gs) ในเบราว์เซอร์
 * รับคำสั่งจาก gas-bridge.js (แทน google.script.run) แล้วตอบผลกลับ
 * ข้อมูลชีททั้งหมดถูกบันทึกใน IndexedDB ของเบราว์เซอร์เครื่องนั้น
 */
/* global importScripts, GasEmu */
importScripts('gas-emulator.js', '../../system/server/config.js', '../../system/server/code.js');

var DB_NAME = 'sikaew-gas', STORE = 'kv', KEY = 'workbook';
var BLOCKED = { doGet: 1, doPost: 1, include: 1 };
// ฟังก์ชันที่ doGet ของระบบเดิมเรียกทุกครั้งที่เปิดหน้าเว็บ + ชีทที่สร้างเมื่อใช้งานครั้งแรก
var SETUP = ['setupDatabase', 'setupUserSheet', 'setupBuildingInspectionHistorySheet', 'setupBuildingPermitA1HistorySheet',
  'setupWeeklyWorkHistorySheet', 'setupWeeklyPerformanceHistorySheet', 'setupPerformanceEvaluationHistorySheet'];

function openDb() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}
function idb(mode, fn) {
  return openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE));
      tx.oncomplete = function () { resolve(req && req.result); db.close(); };
      tx.onerror = function () { reject(tx.error); db.close(); };
    });
  });
}

var saveTimer = null, savePending = Promise.resolve();
// แจ้งหน้าเว็บทุกแท็บ (รวมตัวสร้างเอกสารใน iframe) ว่าชีทเปลี่ยน เพื่อซิงก์ขึ้นคลาวด์ (assets/cloud.js)
var channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('sikaew-gas') : null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}
function saveNow(savedAt) {
  clearTimeout(saveTimer);
  var wb = GasEmu.getWorkbook();
  wb.savedAt = savedAt || new Date().toISOString();
  savePending = idb('readwrite', function (s) { return s.put(wb, KEY); }).then(function () {
    if (channel) channel.postMessage({ type: 'saved', savedAt: wb.savedAt });
  }, function (e) {
    self.postMessage({ type: 'storage-error', error: String(e && e.message || e) });
  });
  return savePending;
}

// วันที่จากไฟล์ Excel: SheetJS แสดงชื่อเดือนภาษาอังกฤษ (เช่น "30 April 2569") — แปลงเป็นเดือนไทย
var EN_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
var EN_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
var TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
var EN_DATE = /(\d{1,2})[\s\-\/]*(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\.?[\s\-\/,]*(\d{2,4})/gi;
function thaiMonths(text) {
  return String(text).replace(EN_DATE, function (all, d, mon, y) {
    var k = mon.toLowerCase(), i = EN_MONTHS.indexOf(k);
    if (i < 0) i = EN_SHORT.indexOf(k.slice(0, 3));
    if (i < 0) return all;
    var year = Number(y);
    if (y.length === 2) year += year > 40 ? 2500 : 2500; // ปีย่อ ใช้ พ.ศ.
    else if (year < 2400) year += 543;
    return Number(d) + ' ' + TH_MONTHS[i] + ' ' + year;
  });
}
function normalizeWorkbookDates() {
  var wb = GasEmu.getWorkbook(), changed = false;
  (wb.sheets || []).forEach(function (sh) {
    (sh.rows || []).forEach(function (row) {
      (row || []).forEach(function (v, c) {
        if (typeof v === 'string' && /[A-Za-z]/.test(v)) { var n = thaiMonths(v); if (n !== v) { row[c] = n; changed = true; } }
      });
    });
    Object.keys(sh.disp || {}).forEach(function (k) {
      var v = sh.disp[k];
      if (typeof v === 'string' && /[A-Za-z]/.test(v)) { var n = thaiMonths(v); if (n !== v) { sh.disp[k] = n; changed = true; } }
    });
  });
  if (changed) GasEmu.setWorkbook(wb);
  return changed;
}

function runSetup() {
  SETUP.forEach(function (fn) {
    if (typeof self[fn] === 'function') {
      try { self[fn](); } catch (e) { console.warn('setup', fn, e); }
    }
  });
}

// ยังไม่ได้นำเข้าข้อมูลจริง: ใช้โครงการตัวอย่างของเว็บไซต์เป็นฐานข้อมูลโครงการ เพื่อให้พิมพ์เอกสารได้ทุกโครงการ
// (นำเข้าไฟล์ Excel จริงเมื่อไร ข้อมูลตัวอย่างจะถูกแทนที่ทั้งหมด)
var SAMPLE_PROP = 'SK_SITE_SAMPLE';
function isSample() { return PropertiesService.getScriptProperties().getProperty(SAMPLE_PROP) === '1'; }
function syncSample(projects) {
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.DATA_SHEET_NAME);
  var last = sheet.getLastRow();
  if (!isSample() && last > 1) return { sample: false };
  var width = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
  var rows = (projects || []).map(function (p) { return headers.map(function (h) { return p[h] == null ? '' : p[h]; }); });
  var old = last > 1 ? sheet.getRange(2, 1, last - 1, width).getValues() : [];
  if (JSON.stringify(old) === JSON.stringify(rows)) return { sample: true, changed: false };
  if (last > 1) sheet.deleteRows(2, last - 1);
  if (rows.length) sheet.getRange(2, 1, rows.length, width).setValues(rows);
  PropertiesService.getScriptProperties().setProperty(SAMPLE_PROP, '1');
  return { sample: true, changed: true };
}

function summary() {
  var wb = GasEmu.getWorkbook();
  return {
    sample: isSample(),
    savedAt: wb.savedAt || null,
    title: wb.title || '',
    sheets: wb.sheets.map(function (s) {
      var n = 0;
      for (var i = s.rows.length - 1; i >= 0; i--) if (s.rows[i] && s.rows[i].some(function (v) { return v !== '' && v != null; })) { n = i + 1; break; }
      return { name: s.name, rows: Math.max(0, n - 1) };
    })
  };
}

var ready = idb('readonly', function (s) { return s.get(KEY); }).catch(function () { return null; }).then(function (wb) {
  GasEmu.setWorkbook(wb || { title: 'ข้อมูลกองช่าง (เริ่มต้น)' });
  runSetup();
  if (!wb) return saveNow();
  if (normalizeWorkbookDates()) return saveNow();
});

// JSON แบบเดียวกับ google.script.run: Date กลายเป็นข้อความ, ฟังก์ชันถูกตัดทิ้ง
function clone(v) { return v === undefined ? null : JSON.parse(JSON.stringify(v)); }

self.onmessage = function (e) {
  var msg = e.data || {};
  ready.then(function () {
    var reply = { id: msg.id };
    try {
      if (msg.type === 'call') {
        var fn = String(msg.fn || '');
        if (!/^[A-Za-z]\w*$/.test(fn) || /_$/.test(fn) || BLOCKED[fn] || typeof self[fn] !== 'function') {
          throw new Error('Script function not found: ' + fn);
        }
        reply.result = clone(self[fn].apply(null, clone(msg.args || [])));
        if (!/^(get|load|fetch|check|is|has|list|find|search)/.test(fn)) scheduleSave();
        reply.ok = true;
      } else if (msg.type === 'import') {
        GasEmu.setWorkbook(msg.workbook);
        runSetup();
        normalizeWorkbookDates();
        // ข้อมูลจากคลาวด์: คงเวลาบันทึกเดิมไว้ จะได้ไม่ถูกส่งกลับขึ้นคลาวด์ซ้ำ
        return saveNow(msg.savedAt || null).then(function () { self.postMessage({ id: msg.id, ok: true, result: summary() }); });
      } else if (msg.type === 'sample') {
        var res = syncSample(msg.projects);
        if (!res.changed) { reply.result = res; reply.ok = true; }
        else return saveNow().then(function () { self.postMessage({ id: msg.id, ok: true, result: res }); });
      } else if (msg.type === 'export') {
        reply.result = GasEmu.getWorkbook(); reply.ok = true;
      } else if (msg.type === 'boundary') {
        // ขอบเขตแผนที่จากหน้าเว็บหลัก: สิทธิ์ตรวจที่หน้าเว็บแล้ว (เจ้าหน้าที่ที่เข้าสู่ระบบคลาวด์)
        var orig = self.assertMapBoundaryEditPermission_;
        self.assertMapBoundaryEditPermission_ = function () { return { username: 'website' }; };
        try {
          reply.result = clone(msg.op === 'delete'
            ? deleteMapBoundary('', msg.id, { auditUserName: msg.user || 'เว็บไซต์กองช่าง' })
            : saveMapBoundary('', Object.assign({ auditUserName: msg.user || 'เว็บไซต์กองช่าง' }, msg.data)));
        } finally { self.assertMapBoundaryEditPermission_ = orig; }
        reply.ok = true;
        scheduleSave();
      } else if (msg.type === 'summary') {
        reply.result = summary(); reply.ok = true;
      } else if (msg.type === 'reset') {
        GasEmu.setWorkbook({ title: 'ข้อมูลกองช่าง (เริ่มต้น)' });
        runSetup();
        return saveNow().then(function () { self.postMessage({ id: msg.id, ok: true, result: summary() }); });
      } else {
        throw new Error('คำสั่งไม่ถูกต้อง');
      }
    } catch (err) {
      reply.ok = false;
      reply.error = String(err && err.message || err);
    }
    self.postMessage(reply);
  });
};
