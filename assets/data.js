// ข้อมูลระบบกองช่าง เทศบาลตำบลสีแก้ว
// ข้อมูลอ้างอิง (รายชื่อจริงจากระบบเดิม) + ที่เก็บข้อมูลในเบราว์เซอร์ (localStorage) + ที่เก็บไฟล์ (IndexedDB)
// เมื่อเข้าสู่ระบบ assets/cloud.js ซิงก์ข้อมูลชุดนี้และไฟล์กับ Supabase
(function () {
  'use strict';

  // รายชื่อจริงจากระบบ v184 (assets/personnel.js สร้างจาก system/src ด้วย tools/build_system.py)
  var PEOPLE = window.SK_PERSONNEL || { supervisors: [], committee: [], executives: [], villages: [] };
  var CENTER = [16.0538, 103.6520]; // ศูนย์กลางตำบลสีแก้ว (CONFIG.DEFAULT_CENTER ของระบบเดิม)

  var VILLAGES = {};
  PEOPLE.villages.forEach(function (v) {
    VILLAGES['m' + v.no] = { name: 'ม.' + v.no + ' ' + v.name, lat: CENTER[0], lng: CENTER[1] };
  });
  VILLAGES.m0 = { name: 'ไม่ระบุหมู่', lat: CENTER[0], lng: CENTER[1] };

  var CATEGORIES = {
    road: { label: 'งานทาง / ถนน / สะพาน', short: 'งานทาง', icon: 'road' },
    drainage: { label: 'งานระบบระบายน้ำ / แหล่งน้ำ / ประปา', short: 'งานระบายน้ำ', icon: 'water_damage' },
    building: { label: 'งานอาคารสาธารณะ / สิ่งก่อสร้าง', short: 'งานอาคาร', icon: 'apartment' },
    electrical: { label: 'งานไฟฟ้าส่องสว่าง / โซลาร์เซลล์', short: 'งานไฟฟ้า', icon: 'solar_power' }
  };

  var STATUSES = {
    'on-schedule': { label: 'กำลังดำเนินการ', long: 'กำลังก่อสร้าง (ตามแผน)' },
    'delayed': { label: 'ล่าช้ากว่าแผน', long: 'มีความล่าช้า (มีหนังสือเร่งรัด)' },
    'pending-inspection': { label: 'รอตรวจรับพัสดุ', long: 'รอตรวจรับพัสดุ / คณะกรรมการตรวจรับ' },
    'completed': { label: 'แล้วเสร็จ / ส่งมอบ', long: 'ส่งมอบงานแล้วเสร็จ 100%' },
    'signing': { label: 'ระหว่างลงนามสัญญา', long: 'ระหว่างลงนามสัญญาจ้าง' },
    'unknown': { label: 'ยังไม่เริ่มงาน', long: 'ยังไม่ระบุสถานะ / ยังไม่เริ่มงาน' }
  };

  var SOURCES = {
    'local': 'งบเทศบัญญัติ / เงินรายได้',
    'general-grant': 'เงินอุดหนุนทั่วไป',
    'specific-grant': 'เงินอุดหนุนเฉพาะกิจ',
    'accumulated': 'เงินสะสม'
  };

  // ผู้ควบคุมงาน "ชื่อ (ตำแหน่ง)" และบุคลากรที่เลือกเป็นคณะกรรมการได้
  var STAFF = PEOPLE.supervisors.map(function (x) { return x.name + ' (' + x.position + ')'; });
  var COMMITTEE_POOL = PEOPLE.committee;

  // คณะกรรมการตรวจรับของโครงการ (จากฐานข้อมูลโครงการ)
  function committeeOf(p) {
    var f = (p && (p.fields || p.sheet)) || {}, out = [];
    var push = function (name, role, position) { if (name) out.push({ name: name, role: role, position: position || '', phone: '' }); };
    push(f['ประธานกรรมการตรวจรับงานจ้าง'], 'ประธานกรรมการ', f['ตำแหน่งประธาน']);
    for (var i = 1; i <= 4; i++) push(f['กรรมการตรวจรับงานจ้าง ' + i], 'กรรมการ', f['ตำแหน่งกรรมการ ' + i]);
    return out;
  }

  // ข้อมูลเริ่มต้น: ว่าง (ใช้ข้อมูลจริงเท่านั้น)
  function seed() {
    return {
      version: 2,
      projects: [],
      milestones: {},
      diary: [],
      documents: [],
      payments: [],
      notifications: [],
      inspections: [],
      estimate: { projectId: '', project: '', place: '', qty: '', date: '', factor: 1.3087, budget: 0, rows: [] },
      signatures: {},
      meta: { lastSync: null },
      dataset: 'real-v2'
    };
  }

  // ---------- Store (localStorage) ----------
  var KEY = 'sikaew-kongchang-db-v2';
  var memory = null;

  function load() {
    if (memory) return memory;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) memory = JSON.parse(raw);
    } catch (e) { memory = null; }
    if (!memory || memory.version !== 2) memory = seed();
    return memory;
  }

  // โครงการจริงจาก Google Sheet (ผ่านระบบงานเอกสาร) แสดงแทนข้อมูลตัวอย่างโดยไม่เขียนทับข้อมูลตัวอย่างในเครื่อง
  var external = null;

  // ข้อมูลที่บันทึกจริง (โครงการจริงจาก Google Sheet อยู่ในชีทของระบบเอกสาร ไม่ได้เก็บซ้ำที่นี่)
  function snapshot() {
    var d = load();
    return external ? Object.assign({}, d, { projects: external.sampleProjects }) : d;
  }

  var saveHooks = [];
  function save() {
    saveHooks.forEach(function (fn) { try { fn(); } catch (e) { console.warn(e); } });
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot()));
      return true;
    } catch (e) {
      // พื้นที่ในเบราว์เซอร์เต็ม: ถ้าเชื่อมคลาวด์อยู่ข้อมูลยังถูกส่งขึ้นคลาวด์
      return !!(window.SK.cloud && window.SK.cloud.active);
    }
  }

  // ---------- File store (IndexedDB) ----------
  var dbPromise = null;
  function idb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      var req = indexedDB.open('sikaew-kongchang-files', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('files', { keyPath: 'id' }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }
  function tx(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction('files', mode);
        var r = fn(t.objectStore('files'));
        t.oncomplete = function () { resolve(r && r.result); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  // ปีงบประมาณ (พ.ศ.): ปีงบประมาณปัจจุบัน (เริ่ม 1 ต.ค.) หรือปีในฐานข้อมูลถ้าใหม่กว่า
  function fiscalYear() {
    var years = (memory ? memory.projects : []).map(function (p) { return parseInt(String(p.year || '').replace(/[๐-๙]/g, function (d) { return '๐๑๒๓๔๕๖๗๘๙'.indexOf(d); }), 10); })
      .filter(function (y) { return y > 2400; });
    var now = new Date(), cur = now.getFullYear() + 543 + (now.getMonth() >= 9 ? 1 : 0);
    return Math.max.apply(null, years.concat([cur]));
  }

  window.SK = window.SK || {};
  window.SK.fiscalYear = fiscalYear;
  window.SK.currentFiscalYear = function () { var now = new Date(); return now.getFullYear() + 543 + (now.getMonth() >= 9 ? 1 : 0); };
  window.SK.ref = { VILLAGES: VILLAGES, CATEGORIES: CATEGORIES, STATUSES: STATUSES, SOURCES: SOURCES, STAFF: STAFF, COMMITTEE: [], COMMITTEE_POOL: COMMITTEE_POOL, EXECUTIVES: PEOPLE.executives, CENTER: CENTER, committeeOf: committeeOf, IMG: {} };
  window.SK.db = {
    get data() { return load(); },
    save: save,
    snapshot: snapshot,
    onSave: function (fn) { saveHooks.push(fn); },
    // แทนที่ข้อมูลทั้งหมดด้วยข้อมูลจากคลาวด์ (ไม่เรียก onSave)
    replace: function (obj) {
      memory = obj; memory.version = 2;
      if (!memory.meta) memory.meta = {};
      try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) {}
    },
    seed: seed,
    reset: function () { memory = seed(); save(); },
    exportJSON: function () { return JSON.stringify(load(), null, 2); },
    importJSON: function (text) {
      var obj = JSON.parse(text);
      if (!obj || !Array.isArray(obj.projects)) throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
      memory = obj; memory.version = 2; save();
    },
    project: function (id) { return load().projects.filter(function (p) { return p.id === id; })[0]; },
    useExternalProjects: function (list, info) {
      var d = load();
      external = { sampleProjects: external ? external.sampleProjects : d.projects, info: info || {} };
      d.projects = list;
    },
    get external() { return external ? external.info : null; },
    files: {
      put: function (file) {
        var id = 'F' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        var cloud = window.SK.cloud;
        return tx('readwrite', function (s) { return s.put({ id: id, name: file.name, type: file.type, size: file.size, blob: file }); })
          .catch(function (e) { if (!(cloud && cloud.active)) throw e; })
          .then(function () { return cloud && cloud.active ? cloud.putFile(id, file) : null; })
          .then(function () { return id; });
      },
      get: function (id) {
        var cloud = window.SK.cloud;
        return tx('readonly', function (s) { return s.get(id); }).catch(function () { return null; }).then(function (rec) {
          if (rec || !(cloud && cloud.active)) return rec;
          // ไฟล์ที่แนบจากเครื่องอื่น: ดาวน์โหลดจากคลาวด์แล้วเก็บไว้ในเครื่อง
          return cloud.getFile(id).then(function (r) {
            if (r) tx('readwrite', function (s) { return s.put(r); }).catch(function () {});
            return r;
          });
        });
      }
    }
  };
})();
