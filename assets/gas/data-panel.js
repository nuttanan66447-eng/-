/*
 * แผงจัดการข้อมูล: นำเข้าไฟล์ Excel ที่ดาวน์โหลดจาก Google Sheet ของระบบ, ส่งออกกลับเป็น Excel, ล้างข้อมูล
 * ต้องโหลดหลัง gas-bridge.js และ SheetJS (XLSX)
 */
/* global XLSX, SKGas */
(function () {
  'use strict';
  var SHEET_ID = window.SK_SHEET_ID || '1bkodTUW0fiKa3gPv7Wlz60TRIJ27KRFsP9i5jXhWKGA';
  var DOWNLOAD_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/export?format=xlsx';
  var OPEN_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit';

  // ---------- แปลงไฟล์ ----------
  function workbookFromXlsx(buffer, fileName) {
    var wb = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: true, cellText: true });
    return {
      title: fileName,
      sheets: wb.SheetNames.map(function (name, idx) {
        var ws = wb.Sheets[name], rows = [], disp = {};
        if (ws['!ref']) {
          var r = XLSX.utils.decode_range(ws['!ref']);
          for (var R = 0; R <= r.e.r; R++) {
            var row = [];
            for (var C = 0; C <= r.e.c; C++) {
              var cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
              if (!cell || cell.v === undefined || cell.v === null) { row.push(''); continue; }
              row.push(cell.v);
              // เก็บข้อความตามที่แสดงในชีท (เช่น วันที่ ตัวเลขมีจุลภาค) ให้ getDisplayValues คืนค่าเหมือน Google Sheets
              if ((cell.t === 'n' || cell.t === 'd') && cell.w !== undefined) {
                // ตัวเลขยาวที่ Excel แสดงแบบย่อ (4.53562E+11) เก็บเป็นตัวเลขเต็ม
                disp[(R + 1) + ',' + (C + 1)] = cell.t === 'n' && /E\+/i.test(cell.w) && Number.isInteger(cell.v) ? cell.v.toFixed(0) : String(cell.w);
              }
            }
            rows.push(row);
          }
        }
        return { id: idx + 1, name: name, rows: rows, disp: disp, frozenRows: 1, maxCols: Math.max(26, rows[0] ? rows[0].length : 0) };
      })
    };
  }

  function xlsxFromWorkbook(wbData) {
    var out = XLSX.utils.book_new();
    wbData.sheets.forEach(function (s) {
      var ws = XLSX.utils.aoa_to_sheet(s.rows.map(function (r) { return (r || []).map(function (v) { return v === null || v === undefined ? '' : v; }); }), { cellDates: true });
      XLSX.utils.book_append_sheet(out, ws, s.name.slice(0, 31));
    });
    return XLSX.write(out, { bookType: 'xlsx', type: 'array', cellDates: true });
  }

  function today() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function importFile(file) {
    if (!file) return Promise.reject(new Error('ไม่พบไฟล์'));
    if (!/\.(xlsx|xlsm|xls|ods)$/i.test(file.name)) return Promise.reject(new Error('กรุณาเลือกไฟล์ Excel (.xlsx) ที่ดาวน์โหลดจาก Google Sheet'));
    return file.arrayBuffer().then(function (buf) {
      var wb = workbookFromXlsx(new Uint8Array(buf), file.name);
      var names = wb.sheets.map(function (s) { return s.name; });
      if (names.indexOf('ฐานข้อมูลโครงการ') < 0) {
        throw new Error('ไฟล์นี้ไม่มีชีท "ฐานข้อมูลโครงการ" — กรุณาดาวน์โหลดจาก Google Sheet ของระบบกองช่าง');
      }
      return SKGas.importWorkbook(wb);
    });
  }

  function exportFile() {
    return SKGas.exportWorkbook().then(function (wb) {
      var data = xlsxFromWorkbook(wb);
      var blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sikaew-kongchang-' + today() + '.xlsx';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
  }

  function cloudOn() { return !!(window.SK && SK.cloud && SK.cloud.active); }

  // ---------- แผงควบคุม ----------
  var panel;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render(info, message, tone) {
    var projects = (info.sheets.filter(function (s) { return s.name === 'ฐานข้อมูลโครงการ'; })[0] || {}).rows || 0;
    var used = info.sheets.filter(function (s) { return s.rows > 0; });
    panel.querySelector('.skd-body').innerHTML =
      (message ? '<div class="skd-msg skd-' + (tone || 'info') + '">' + esc(message) + '</div>' : '') +
      '<div class="skd-status"><strong>' + projects + '</strong> โครงการ • ' + used.length + ' ชีทมีข้อมูล' +
      (info.savedAt ? (cloudOn() ? '<br><span>บันทึกล่าสุด ' : '<br><span>บันทึกในเครื่องนี้ล่าสุด ') + esc(new Date(info.savedAt).toLocaleString('th-TH')) + '</span>' : '') +
      (info.sample ? '<br><span>ที่มา: โครงการตัวอย่างของเว็บไซต์ (ยังไม่ได้นำเข้าข้อมูลจริง)</span>' : info.title ? '<br><span>ที่มา: ' + esc(info.title) + '</span>' : '') + '</div>' +
      '<ol class="skd-steps">' +
        '<li><a href="' + DOWNLOAD_URL + '" target="_blank" rel="noopener">ดาวน์โหลดไฟล์ Excel จาก Google Sheet</a><small>ต้องเข้าสู่ระบบ Google ด้วยบัญชีที่มีสิทธิ์เปิดชีทของกองช่าง</small></li>' +
        '<li><label class="skd-btn skd-primary">นำเข้าไฟล์ Excel (.xlsx)<input type="file" accept=".xlsx,.xlsm,.xls,.ods" hidden></label><small>ข้อมูลทุกชีทจะถูกโหลดเข้าระบบในเบราว์เซอร์นี้</small></li>' +
      '</ol>' +
      '<div class="skd-row"><button type="button" class="skd-btn" data-skd="export">ส่งออกข้อมูลเป็น Excel</button>' +
      '<a class="skd-btn" href="' + OPEN_URL + '" target="_blank" rel="noopener">เปิด Google Sheet</a></div>' +
      '<p class="skd-note">' + (cloudOn() ? 'เข้าสู่ระบบคลาวด์อยู่: ข้อมูลที่นำเข้า/แก้ไขจะบันทึกขึ้นฐานข้อมูลกลาง (Supabase) อัตโนมัติ ทุกเครื่องที่เข้าสู่ระบบใช้ข้อมูลชุดเดียวกัน' : 'ข้อมูลที่บันทึก/แก้ไขในหน้านี้เก็บไว้ในเบราว์เซอร์เครื่องนี้ (เข้าสู่ระบบคลาวด์เพื่อใช้ข้อมูลร่วมกันทุกเครื่อง)') +
      ' หากต้องการอัปเดต Google Sheet ให้ส่งออกเป็น Excel แล้วใน Google Sheet เลือก ไฟล์ › นำเข้า › แทนที่สเปรดชีต</p>' +
      '<div class="skd-row">' + (OPTS.fab === false ? '' : '<a class="skd-btn" href="index.html">กลับหน้าเว็บหลัก</a>') + '<button type="button" class="skd-btn skd-danger" data-skd="reset">' + (cloudOn() ? 'โหลดข้อมูลจากคลาวด์ใหม่' : 'ล้างข้อมูลในเครื่องนี้') + '</button></div>';
  }

  function refresh(message, tone) {
    return SKGas.summary().then(function (info) { render(info, message, tone); return info; }, function (err) {
      panel.querySelector('.skd-body').innerHTML = '<div class="skd-msg skd-err">' + esc(err) + '</div><div class="skd-row"><a class="skd-btn" href="index.html">กลับหน้าเว็บหลัก</a></div>';
    });
  }

  function open(message, tone) { panel.classList.add('open'); return refresh(message, tone); }
  function close() { panel.classList.remove('open'); }

  function build() {
    var btn = el('<button type="button" class="skd-fab" aria-label="จัดการข้อมูล" title="นำเข้า/ส่งออกข้อมูลจาก Google Sheet">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 2v3H5V5h14zM5 19v-9h4v9H5zm6 0v-9h8v9h-8z"/></svg><span>ข้อมูล</span></button>');
    panel = el('<div class="skd-panel" role="dialog" aria-label="จัดการข้อมูลระบบ"><div class="skd-head"><strong>ข้อมูลระบบกองช่าง</strong><button type="button" class="skd-x" aria-label="ปิด">×</button></div><div class="skd-body">กำลังโหลด...</div></div>');
    if (OPTS.fab !== false) document.body.appendChild(btn); else panel.classList.add('skd-nofab');
    document.body.appendChild(panel);
    btn.addEventListener('click', function () { if (panel.classList.contains('open')) close(); else open(); });
    panel.querySelector('.skd-x').addEventListener('click', close);
    panel.addEventListener('change', function (e) {
      if (e.target.type !== 'file' || !e.target.files[0]) return;
      var f = e.target.files[0];
      refresh('กำลังนำเข้า ' + f.name + ' ...');
      importFile(f).then(function (info) {
        var n = (info.sheets.filter(function (s) { return s.name === 'ฐานข้อมูลโครงการ'; })[0] || {}).rows || 0;
        refresh('นำเข้าเรียบร้อย ' + n + ' โครงการ กำลังโหลดหน้าใหม่...', 'ok');
        setTimeout(function () { location.reload(); }, 900);
      }).catch(function (err) { refresh('นำเข้าไม่สำเร็จ: ' + (err.message || err), 'err'); });
    });
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-skd]');
      if (!b) return;
      if (b.dataset.skd === 'export') {
        exportFile().then(function () { refresh('ดาวน์โหลดไฟล์ Excel แล้ว', 'ok'); }).catch(function (err) { refresh('ส่งออกไม่สำเร็จ: ' + (err.message || err), 'err'); });
      } else if (b.dataset.skd === 'reset') {
        var cloud = window.SK && SK.cloud && SK.cloud.active ? SK.cloud : null;
        if (cloud) {
          // เชื่อมคลาวด์อยู่: ไม่ล้างข้อมูลกลาง แค่โหลดชีทจากคลาวด์มาแทนข้อมูลในเครื่องนี้
          if (!confirm('แทนที่ข้อมูลชีทในเครื่องนี้ด้วยข้อมูลล่าสุดบนคลาวด์?')) return;
          cloud.reloadWorkbook().then(function () { location.reload(); }, function (err) { refresh('โหลดจากคลาวด์ไม่สำเร็จ: ' + (err.message || err), 'err'); });
          return;
        }
        if (!confirm('ล้างข้อมูลทั้งหมดในเบราว์เซอร์นี้? (ข้อมูลใน Google Sheet ไม่ได้รับผลกระทบ)')) return;
        SKGas.reset().then(function () { location.reload(); });
      }
    });
    window.addEventListener('skgas:storage-error', function (e) { open('บันทึกข้อมูลลงเบราว์เซอร์ไม่สำเร็จ: ' + e.detail + ' — ควรส่งออกข้อมูลเป็น Excel เก็บไว้', 'err'); });
    // ครั้งแรกที่ยังไม่มีข้อมูลโครงการ: เปิดแผงพร้อมคำแนะนำ
    if (OPTS.fab !== false) SKGas.summary().then(function (info) {
      var proj = info.sheets.filter(function (s) { return s.name === 'ฐานข้อมูลโครงการ'; })[0];
      if (!proj || !proj.rows) open('ยังไม่มีข้อมูลโครงการในเบราว์เซอร์นี้ — ดาวน์โหลดไฟล์จาก Google Sheet แล้วนำเข้า (2 ขั้นตอน)', 'info');
    }, function () { open(); });
  }

  window.SKData = { importFile: importFile, exportFile: exportFile, open: function (m, t) { if (!panel) build(); return open(m, t); }, downloadUrl: DOWNLOAD_URL };
  // ตัวสร้างเอกสารที่ทำงานเบื้องหลัง (system.html?engine=1) ไม่ต้องมีแผงข้อมูล
  var OPTS = window.SK_DATA_PANEL || {};
  if (/[?&]engine=1/.test(location.search)) return;
  if (OPTS.fab === false) return; // หน้าเว็บหลักเปิดแผงจากแถบแจ้งเตือนเอง
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
