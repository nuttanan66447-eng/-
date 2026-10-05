/*
 * แทนที่ google.script.run ของ Google Apps Script ด้วยการเรียกโค้ดเดิม (Code.gs) ที่รันใน Web Worker
 * ใช้งานแบบเดิมได้ทุกรูปแบบ:
 *   google.script.run.withSuccessHandler(fn).withFailureHandler(fn).withUserObject(o).ชื่อฟังก์ชัน(args...)
 * และมี window.SKGas สำหรับนำเข้า/ส่งออกข้อมูล
 */
(function () {
  'use strict';
  var base = (document.currentScript && document.currentScript.src) || location.href;
  var seq = 0, pending = {}, worker = null, startError = null;
  try {
    worker = new Worker(new URL('gas-worker.js', base));
  } catch (e) {
    // เปิดไฟล์จากเครื่องโดยตรง (file://) เบราว์เซอร์ไม่อนุญาตให้ใช้ Web Worker
    startError = location.protocol === 'file:'
      ? 'ระบบงานเอกสารต้องเปิดผ่านเว็บไซต์ (https://...) หรือ npm start — เปิดจากไฟล์ในเครื่องโดยตรงไม่ได้'
      : 'เบราว์เซอร์นี้ไม่รองรับ Web Worker: ' + (e && e.message);
    console.warn(startError);
  }
  if (worker) worker.onmessage = function (e) {
    var m = e.data || {};
    if (m.type === 'storage-error') {
      console.error('บันทึกข้อมูลลงเบราว์เซอร์ไม่สำเร็จ:', m.error);
      window.dispatchEvent(new CustomEvent('skgas:storage-error', { detail: m.error }));
      return;
    }
    var p = pending[m.id];
    if (!p) return;
    delete pending[m.id];
    if (m.ok) p.resolve(m.result); else p.reject(m.error);
  };
  if (worker) worker.onerror = function (e) {
    // โหลดโค้ดระบบไม่สำเร็จ: ปิด worker และแจ้งทุกคำสั่งที่รออยู่ แทนการค้างไว้
    startError = 'โหลดระบบงานเอกสารไม่สำเร็จ: ' + (e.message || 'Worker error');
    console.error(startError);
    Object.keys(pending).forEach(function (k) { pending[k].reject(startError); delete pending[k]; });
    worker.terminate();
    worker = null;
  };

  function send(msg) {
    return new Promise(function (resolve, reject) {
      if (!worker) { reject(startError); return; }
      msg.id = ++seq;
      pending[msg.id] = { resolve: resolve, reject: reject };
      worker.postMessage(msg);
    });
  }

  function makeRunner(success, failure, userObject) {
    var target = {
      withSuccessHandler: function (fn) { return makeRunner(fn, failure, userObject); },
      withFailureHandler: function (fn) { return makeRunner(success, fn, userObject); },
      withUserObject: function (o) { return makeRunner(success, failure, o); }
    };
    return new Proxy(target, {
      get: function (t, name) {
        if (name in t) return t[name];
        if (typeof name !== 'string' || name === 'then') return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments).map(function (a) { return a === undefined ? null : a; });
          send({ type: 'call', fn: name, args: JSON.parse(JSON.stringify(args)) }).then(function (result) {
            if (success) success(result, userObject);
          }, function (error) {
            var err = new Error(error);
            if (failure) failure(err, userObject);
            else console.error('google.script.run.' + name + ' failed:', error);
          });
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = makeRunner(null, null, undefined);
  window.google.script.host = { close: function () {}, setHeight: function () {}, setWidth: function () {}, editor: { focus: function () {} } };

  window.SKGas = {
    call: function (fn) { return send({ type: 'call', fn: fn, args: Array.prototype.slice.call(arguments, 1) }); },
    importWorkbook: function (wb, savedAt) { return send({ type: 'import', workbook: wb, savedAt: savedAt || null }); },
    exportWorkbook: function () { return send({ type: 'export' }); },
    summary: function () { return send({ type: 'summary' }); },
    syncSample: function (projects) { return send({ type: 'sample', projects: projects }); },
    reset: function () { return send({ type: 'reset' }); }
  };
  // ชีทข้อมูลตัวอย่างจากรุ่นก่อน (โครงการสมมุติ): ล้างทิ้งครั้งเดียว ใช้ข้อมูลจริงเท่านั้น
  window.SKGas.ready = worker ? window.SKGas.summary().then(function (s) {
    return s && s.sample ? window.SKGas.reset() : null;
  }).catch(function () {}) : Promise.resolve();
})();
