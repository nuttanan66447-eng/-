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
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}
function saveNow() {
  clearTimeout(saveTimer);
  var wb = GasEmu.getWorkbook();
  wb.savedAt = new Date().toISOString();
  savePending = idb('readwrite', function (s) { return s.put(wb, KEY); }).catch(function (e) {
    self.postMessage({ type: 'storage-error', error: String(e && e.message || e) });
  });
  return savePending;
}

function runSetup() {
  SETUP.forEach(function (fn) {
    if (typeof self[fn] === 'function') {
      try { self[fn](); } catch (e) { console.warn('setup', fn, e); }
    }
  });
}

function summary() {
  var wb = GasEmu.getWorkbook();
  return {
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
        return saveNow().then(function () { self.postMessage({ id: msg.id, ok: true, result: summary() }); });
      } else if (msg.type === 'export') {
        reply.result = GasEmu.getWorkbook(); reply.ok = true;
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
