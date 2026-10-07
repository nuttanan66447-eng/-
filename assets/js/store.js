// ข้อมูลของเว็บ (ประวัติเอกสาร รูปภาพโครงการ บันทึกหน้างาน ฯลฯ) — ใช้รูปแบบและที่เก็บเดิม ข้อมูลเก่าใช้ต่อได้ทันที
// เข้าสู่ระบบแล้ว: ซิงก์กับตาราง records ของ Supabase (assets/js/cloud.js)
// ข้อมูลโครงการไม่ได้อยู่ที่นี่ — อยู่ในชีท "ฐานข้อมูลโครงการ" ของระบบหลัก (assets/js/projects.js)
(function () {
  'use strict';
  var SK = window.SK;
  var KEY = 'sikaew-kongchang-db-v2';
  var memory = null, hooks = [];

  function seed() {
    return { version: 2, documents: [], diary: [], photos: [], meta: {}, dataset: 'real-v2' };
  }
  function load() {
    if (memory) return memory;
    try { var raw = localStorage.getItem(KEY); if (raw) memory = JSON.parse(raw); } catch (e) { memory = null; }
    if (!memory || memory.version !== 2) memory = seed();
    var s = seed();
    Object.keys(s).forEach(function (k) { if (memory[k] === undefined) memory[k] = s[k]; });
    return memory;
  }
  function save() {
    hooks.forEach(function (fn) { try { fn(); } catch (e) { console.warn(e); } });
    try { localStorage.setItem(KEY, JSON.stringify(load())); return true; }
    catch (e) { return !!(SK.cloud && SK.cloud.active); } // พื้นที่เบราว์เซอร์เต็ม: ยังส่งขึ้นคลาวด์ได้
  }

  // ---------- ไฟล์ (IndexedDB ในเครื่อง + Storage "files" บนคลาวด์) ----------
  var dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('เบราว์เซอร์นี้เก็บไฟล์ไม่ได้'));
      var req = indexedDB.open('sikaew-kongchang-files', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('files', { keyPath: 'id' }); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction('files', mode), r = fn(t.objectStore('files'));
        t.oncomplete = function () { resolve(r && r.result); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }
  var files = {
    put: function (file) {
      var id = 'F' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cloud = SK.cloud;
      return tx('readwrite', function (s) { return s.put({ id: id, name: file.name, type: file.type, size: file.size, blob: file }); })
        .catch(function (e) { if (!(cloud && cloud.active)) throw e; })
        .then(function () { return cloud && cloud.active ? cloud.putFile(id, file) : null; })
        .then(function () { return id; });
    },
    get: function (id) {
      var cloud = SK.cloud;
      return tx('readonly', function (s) { return s.get(id); }).catch(function () { return null; }).then(function (rec) {
        if (rec || !(cloud && cloud.active)) return rec;
        // ไฟล์จากเครื่องอื่น: ดาวน์โหลดจากคลาวด์แล้วเก็บไว้ในเครื่อง
        return cloud.getFile(id).then(function (r) {
          if (r) tx('readwrite', function (s) { return s.put(r); }).catch(function () {});
          return r;
        });
      });
    }
  };

  SK.store = {
    get data() { return load(); },
    save: save,
    seed: seed,
    onSave: function (fn) { hooks.push(fn); },
    // แทนที่ทั้งหมดด้วยข้อมูลจากคลาวด์ (ไม่เรียก onSave)
    replace: function (obj) {
      memory = obj; memory.version = 2;
      load();
      try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) {}
    },
    list: function (k) { var d = load(); if (!Array.isArray(d[k])) d[k] = []; return d[k]; },
    files: files
  };
})();
