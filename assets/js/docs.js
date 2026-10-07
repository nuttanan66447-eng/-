// เอกสารราชการ: Smart Editor (พรีวิว/แก้ไขข้อความ/พิมพ์/บันทึก Word) + ประวัติเอกสาร
// ทุกเอกสารที่สร้างเก็บสำเนา HTML ไว้ในประวัติ (SK.store.data.documents) — สร้างซ้ำแบบ+โครงการ+สัปดาห์/งวดเดียวกัน แทนที่ฉบับเดิม
(function () {
  'use strict';
  var SK = window.SK, esc = SK.esc, icon = SK.icon;

  function userName() { return (SK.cloud && SK.cloud.active && SK.cloud.displayName()) || ''; }
  function docs() { return SK.store.list('documents'); }

  // ชื่อเอกสารภาษาไทยสำหรับแสดง
  function docName(d) {
    if (!d) return '';
    var t = String(d.title || '');
    if (t && !/\.(html|docx?|pdf|xlsx?)$/i.test(t) && !/^sikaew-/.test(t)) return t;
    var def = SK.engine && SK.engine.doc(d.docKey);
    return (def ? def.title : t.replace(/\.[^.]+$/, '')) + (d.variant ? ' ' + d.variant : '');
  }
  function historyType(doc) {
    var t = (doc.group || '') + ' ' + doc.title;
    return /ตรวจรับ|ส่งมอบ|ผลทดสอบ/.test(t) ? 'inspection' : /ราคากลาง|ปร\.|TOR/.test(t) ? 'estimate' : 'order';
  }
  function variantOf(doc, html) {
    var text = String(html).replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    var m = /ประจำสัปดาห์(?:ที่)?\s*([0-9๐-๙]+)/.exec(text) || /สัปดาห์ที่\s*([0-9๐-๙]+)/.exec(text);
    if (m) return 'สัปดาห์ที่ ' + SK.arabic(m[1]);
    if (/งวด|ตรวจรับ/.test(doc.title + ' ' + (doc.desc || ''))) {
      m = /งวดที่\s*([0-9๐-๙]+)/.exec(text);
      if (m) return 'งวดที่ ' + SK.arabic(m[1]);
    }
    return '';
  }
  function saveHistory(doc, project, html, entry) {
    var now = new Date(), stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '');
    var name = 'sikaew-' + doc.key + (project ? '-' + project.id.toLowerCase() : '') + '-' + stamp + '.html';
    var file = new File([html], name, { type: 'text/html' });
    return SK.store.files.put(file).then(function (fileId) {
      var variant = entry ? entry.variant : variantOf(doc, html);
      var regenerated = !entry;
      if (!entry) entry = docs().filter(function (d) {
        return d.docKey === doc.key && (d.projectId || '') === (project ? project.id : '') && (d.variant || '') === variant;
      })[0];
      if (entry) {
        entry.fileId = fileId; entry.fileSize = file.size; entry.fileName = name; entry.updatedAt = now.toISOString(); entry.updatedBy = userName();
        entry.edited = !regenerated;
        entry.date = SK.todayIso();
        var list = docs(), at = list.indexOf(entry);
        if (at > 0) { list.splice(at, 1); list.unshift(entry); }
      } else {
        entry = {
          id: 'DOC-' + stamp.slice(2) + Math.random().toString(36).slice(2, 4).toUpperCase(), type: historyType(doc), variant: variant,
          title: doc.title + (variant ? ' ' + variant : '') + (project ? ' — ' + project.name : ''),
          detail: doc.desc || '', projectId: project ? project.id : '', status: 'approved', format: 'html', fileId: fileId,
          docKey: doc.key, fileName: name, fileSize: file.size, owner: userName(), date: SK.todayIso(), createdAt: now.toISOString()
        };
        docs().unshift(entry);
      }
      SK.store.save();
      window.dispatchEvent(new CustomEvent('sk:documents'));
      return entry;
    }).catch(function (err) { console.warn('บันทึกประวัติเอกสารไม่สำเร็จ', err); return null; });
  }
  function readHtml(entry) {
    return SK.store.files.get(entry.fileId).then(function (rec) {
      if (!rec) throw new Error('ไม่พบสำเนาเอกสารในระบบ');
      return rec.blob.text ? rec.blob.text() : new Response(rec.blob).text();
    });
  }
  function removeEntry(entry) {
    var d = SK.store.data;
    d.documents = docs().filter(function (x) { return x !== entry; });
    SK.store.save();
    window.dispatchEvent(new CustomEvent('sk:documents'));
  }
  function snapshotDoc(d) {
    var root = d.documentElement.cloneNode(true);
    Array.prototype.forEach.call(root.querySelectorAll('script'), function (x) { x.remove(); });
    return '<!DOCTYPE html>' + root.outerHTML;
  }

  // ---------- Smart Editor ----------
  // editor(box, { doc, project, html, entry(Promise|obj), onBack, compact }) วาดตัวแก้ไขเอกสารลงในกล่อง
  function editor(box, o) {
    var doc = o.doc || { key: 'doc', title: 'เอกสาร' }, project = o.project || null;
    var guard = '<script>window.__skPrint=window.print;window.print=function(){};window.close=function(){};<\/script>' +
      '<style>html{background:#e9eef7}body{margin:0 auto!important}@media screen{body{padding:18px 0!important}}</style>';
    var html2 = /<head[^>]*>/i.test(o.html) ? o.html.replace(/<head[^>]*>/i, function (h) { return h + guard; }) : guard + o.html;
    var tb = function (cmd, ic, label) {
      return '<button type="button" data-cmd="' + cmd + '" title="' + label + '" aria-label="' + label + '" class="icon-btn w-8 h-8 disabled:opacity-35" disabled>' + icon(ic, 'text-[19px]') + '</button>';
    };
    var sep = '<span class="w-px h-6 bg-[rgba(100,116,139,0.18)] mx-1"></span>';
    box.innerHTML =
      '<div class="flex flex-col gap-4">' +
        '<div class="flex flex-wrap items-center gap-2">' +
          (o.onBack ? '<button type="button" data-back class="btn-glass">' + icon('arrow_back') + '<span>กลับไปแก้ไขข้อมูล</span></button>' : '') +
          '<span class="chip-green">' + icon('check_circle', 'text-[14px]') + 'สร้างเอกสารแล้ว • บันทึกในประวัติอัตโนมัติ</span>' +
          '<span class="flex-1"></span>' +
          '<button type="button" data-word class="btn-glass">' + icon('description') + '<span>บันทึกเป็น Word</span></button>' +
          '<button type="button" data-print class="btn-primary">' + icon('print') + '<span>พิมพ์ / บันทึก PDF</span></button>' +
        '</div>' +
        '<div class="card px-3 py-2 flex flex-wrap items-center gap-1">' +
          '<button type="button" data-edit class="btn-glass !py-1.5">' + icon('edit_note') + '<span>แก้ไขข้อความ</span></button>' + sep +
          '<span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low font-label-md text-label-md text-on-surface-variant">' + icon('text_fields', 'text-[16px]') + 'TH Sarabun PSK • ตามระบบหลัก</span>' + sep +
          tb('bold', 'format_bold', 'ตัวหนา') + tb('italic', 'format_italic', 'ตัวเอียง') + tb('underline', 'format_underlined', 'ขีดเส้นใต้') + sep +
          tb('justifyLeft', 'format_align_left', 'ชิดซ้าย') + tb('justifyCenter', 'format_align_center', 'กึ่งกลาง') + tb('justifyRight', 'format_align_right', 'ชิดขวา') + tb('justifyFull', 'format_align_justify', 'กระจายเต็มบรรทัด') + sep +
          tb('undo', 'undo', 'เลิกทำ') + tb('redo', 'redo', 'ทำซ้ำ') +
          '<span class="flex-1"></span>' +
          '<div class="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container-low">' +
            '<button type="button" data-zoom="-1" class="icon-btn w-7 h-7" aria-label="ย่อ">' + icon('remove', 'text-[16px]') + '</button>' +
            '<span data-zoomlabel class="font-label-md text-label-md w-12 text-center">100%</span>' +
            '<button type="button" data-zoom="1" class="icon-btn w-7 h-7" aria-label="ขยาย">' + icon('add', 'text-[16px]') + '</button>' +
          '</div>' +
        '</div>' +
        '<p data-hint hidden class="chip-blue self-start">' + icon('touch_app', 'text-[14px]') + 'คลิกที่ข้อความในเอกสารเพื่อแก้ไข — ผลการแก้ไขใช้ทั้งการพิมพ์และไฟล์ Word</p>' +
        '<div class="rounded-[28px] bg-[#e9eef7] shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)] overflow-auto">' +
          '<iframe title="เอกสาร" class="block w-full border-0" style="height:70vh"></iframe>' +
        '</div>' +
      '</div>';
    var iframe = box.querySelector('iframe'), editing = false, dirty = false, zoom = 1, entryP = Promise.resolve(o.entry || null);
    function keepEdits() {
      if (!dirty) return;
      dirty = false;
      entryP = entryP.then(function (entry) { return entry ? saveHistory(doc, project, snapshotDoc(iframe.contentDocument), entry) : null; });
    }
    function fit() {
      var d = iframe.contentDocument; if (!d || !d.documentElement) return;
      d.documentElement.style.zoom = zoom;
      var h = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0) * (CSS.supports('zoom', '1') ? 1 : zoom);
      iframe.style.height = Math.max(420, Math.min(h + 8, 40000)) + 'px';
      box.querySelector('[data-zoomlabel]').textContent = Math.round(zoom * 100) + '%';
    }
    iframe.addEventListener('load', function () {
      var d = iframe.contentDocument;
      d.addEventListener('input', function () { dirty = true; });
      // พอดีความกว้าง: หน้ากระดาษ A4 กว้าง ~794px
      var w = iframe.clientWidth;
      zoom = w && w < 830 ? Math.max(0.4, Math.floor((w - 24) / 794 * 20) / 20) : 1;
      fit();
      setTimeout(fit, 400);
    });
    var editBtn = box.querySelector('[data-edit]');
    editBtn.addEventListener('click', function () {
      var d = iframe.contentDocument; if (!d) return;
      editing = !editing;
      d.designMode = editing ? 'on' : 'off';
      editBtn.className = editing ? 'btn-primary !py-1.5' : 'btn-glass !py-1.5';
      editBtn.querySelector('span:last-child').textContent = editing ? 'เสร็จสิ้นการแก้ไข' : 'แก้ไขข้อความ';
      if (!editing) keepEdits();
      box.querySelectorAll('[data-cmd]').forEach(function (b) { b.disabled = !editing; });
      box.querySelector('[data-hint]').hidden = !editing;
      if (editing) iframe.contentWindow.focus();
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cmd]');
      if (b && !b.disabled) { iframe.contentDocument.execCommand(b.dataset.cmd, false, null); iframe.contentWindow.focus(); return; }
      var z = e.target.closest('[data-zoom]');
      if (z) { zoom = Math.max(0.4, Math.min(2, Math.round((zoom + 0.1 * z.dataset.zoom) * 10) / 10)); fit(); }
    });
    var fileBase = 'sikaew-' + doc.key + (project ? '-' + project.id.toLowerCase() : '') + '-' + SK.todayIso();
    box.querySelector('[data-word]').addEventListener('click', function () {
      if (!SK.wordExport) return SK.toast('ไม่พบตัวสร้างไฟล์ Word', 'error');
      if (editing) editBtn.click();
      var z = zoom; zoom = 1; fit();
      SK.toast('กำลังสร้างไฟล์ Word...');
      SK.wordExport.download(iframe.contentDocument, fileBase + '.docx').then(function () { SK.toast('ดาวน์โหลดไฟล์ Word แล้ว', 'success'); },
        function (err) { SK.toast('สร้างไฟล์ Word ไม่สำเร็จ: ' + (err && err.message || err), 'error'); }).then(function () { zoom = z; fit(); });
    });
    box.querySelector('[data-print]').addEventListener('click', function () {
      if (editing) editBtn.click();
      var w = iframe.contentWindow, z = zoom;
      zoom = 1; fit();
      w.focus();
      (w.__skPrint || w.print).call(w);
      setTimeout(function () { zoom = z; fit(); }, 500);
    });
    var back = box.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { if (editing) editBtn.click(); keepEdits(); o.onBack(); });
    iframe.srcdoc = html2;
    return { leave: function () { if (editing) editBtn.click(); keepEdits(); }, entry: function () { return entryP; } };
  }

  // เอกสารในหน้าต่างลอย (เปิดจากประวัติ หรือพิมพ์จากหน้าของระบบหลัก)
  function previewModal(o) {
    var box = document.createElement('div'), ed = null;
    SK.modal({
      title: o.title || docName(o.entry) || (o.doc && o.doc.title) || 'เอกสาร', subtitle: o.project ? o.project.name : '', icon: 'description', size: 'xl', body: box,
      onClose: function () { if (ed) ed.leave(); }
    });
    ed = editor(box, o);
  }
  function reopen(entry) {
    return readHtml(entry).then(function (html) {
      var doc = (SK.engine && SK.engine.doc(entry.docKey)) || { key: entry.docKey || 'doc', title: docName(entry) };
      previewModal({ doc: doc, project: entry.projectId ? SK.projects.byId(entry.projectId) : null, html: html, entry: entry, title: docName(entry) });
    }).catch(function (err) { SK.toast(err.message || String(err), 'error'); });
  }

  // รายการประวัติเอกสาร (ใช้หลายหน้า)
  function historyList(list, opts) {
    opts = opts || {};
    if (!list.length) return '<p class="muted font-body-sm text-body-sm py-2">' + (opts.empty || 'ยังไม่มีเอกสาร') + '</p>';
    return '<ol class="relative flex flex-col gap-3 ' + (opts.timeline === false ? '' : 'pl-4 border-l-2 border-surface-container-high') + '">' + list.map(function (d) {
      var p = d.projectId && SK.projects.byId(d.projectId);
      return '<li class="relative">' + (opts.timeline === false ? '' : '<span class="absolute -left-[23px] top-2 w-3 h-3 rounded-full bg-primary ring-4 ring-white"></span>') +
        '<div class="flex items-start gap-2"><button type="button" data-open-doc="' + esc(d.id) + '" class="min-w-0 flex-1 text-left rounded-xl px-2 py-1 -mx-2 hover:bg-surface-container-low">' +
        '<span class="block font-label-lg text-label-lg font-semibold text-on-surface line-clamp-2">' + esc(docName(d)) + '</span>' +
        '<span class="block font-body-sm text-body-sm text-outline">' + (d.updatedBy || d.owner ? 'โดย ' + esc(d.updatedBy || d.owner) + ' • ' : '') + esc(SK.timeAgo(d.updatedAt || d.createdAt) || SK.dateShort(d.date)) +
        (opts.project !== false && p ? ' • ' + esc(p.id) : '') + (d.edited ? ' • แก้ไขข้อความแล้ว' : '') + '</span></button>' +
        (opts.remove ? '<button type="button" data-del-doc="' + esc(d.id) + '" class="icon-btn w-8 h-8 shrink-0" aria-label="ลบเอกสาร">' + icon('delete', 'text-[18px]') + '</button>' : '') +
        '</div></li>';
    }).join('') + '</ol>';
  }
  // ปุ่มในรายการประวัติ (คลิกที่ใดก็ได้ในหน้า)
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open-doc]');
    if (o) { var d = docs().filter(function (x) { return x.id === o.dataset.openDoc; })[0]; if (d) reopen(d); return; }
    var del = e.target.closest('[data-del-doc]');
    if (del) {
      var x = docs().filter(function (y) { return y.id === del.dataset.delDoc; })[0];
      if (x) SK.confirm('ลบ "' + docName(x) + '" ออกจากประวัติเอกสาร?', 'ลบ', 'danger').then(function (ok) { if (ok) { removeEntry(x); SK.toast('ลบเอกสารแล้ว', 'success'); } });
    }
  });

  // ผลการพิมพ์จากหน้าของระบบหลักที่เปิดในเว็บ: แสดงใน Smart Editor
  if (SK.engine) SK.engine.onOutput = function (html) { previewModal({ html: html, title: 'เอกสารจากระบบหลัก' }); };

  SK.docs = { docName: docName, saveHistory: saveHistory, reopen: reopen, editor: editor, previewModal: previewModal, historyList: historyList, readHtml: readHtml, list: docs };
})();
