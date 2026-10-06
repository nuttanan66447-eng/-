// ขั้นตอนงานที่ใช้ร่วมกันหลายหน้า (ตรวจรับงาน, หนังสือเร่งรัด, สมุดบันทึกช่าง)
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc;

  // ชื่อเอกสารที่แสดง (ภาษาไทย ไม่ใช่ชื่อไฟล์): ตัดชื่อโครงการท้ายชื่อออกเมื่อแสดงในหน้าโครงการ
  function docName(d) {
    var t = String(d.title || d.fileName || d.id || '');
    return d.docKey ? t.split(' — ')[0] : t;
  }
  // ทะเบียนเอกสาร: รายการซ้ำ (เอกสารเดียวกัน โครงการเดียวกัน) เหลือฉบับล่าสุด
  function dedupe() {
    var seen = {}, list = SK.db.data.documents || [], out = [];
    list.forEach(function (d) {
      var k = (d.projectId || '') + '|' + (d.docKey ? 'K:' + d.docKey + '|' + (d.variant || '') : 'T:' + d.type + '|' + (d.title || d.id));
      if (seen[k]) return;
      seen[k] = 1; out.push(d);
    });
    if (out.length !== list.length) { SK.db.data.documents = out; SK.db.save(); }
  }
  function addDocument(doc) {
    var list = SK.db.data.documents;
    for (var i = list.length - 1; i >= 0; i--) {
      if (!list[i].docKey && (list[i].projectId || '') === (doc.projectId || '') && list[i].title === doc.title && list[i].type === doc.type) list.splice(i, 1);
    }
    SK.db.data.documents.unshift(Object.assign({ date: ui.today(), status: 'approved', owner: (ui.currentUser && ui.currentUser().signedIn && ui.currentUser().name) || '', format: 'pdf' }, doc));
  }

  function inspection(projectId, onDone) {
    var p = SK.db.project(projectId);
    if (!p) return ui.toast('ไม่พบโครงการ', 'error');
    var options = [];
    for (var i = 1; i <= p.installments; i++) options.push([i, 'งวดที่ ' + i + (i === p.installments ? ' (งวดสุดท้าย)' : '')]);
    ui.formModal({
      title: 'บันทึกผลการตรวจรับพัสดุ', subtitle: p.id + ' • ' + p.name, icon: 'fact_check', iconClass: 'bg-secondary-fixed text-secondary',
      submitLabel: 'บันทึกผลตรวจรับ', submitKind: 'accent',
      fields: [
        { name: 'installment', label: 'งวดงานที่ตรวจรับ', type: 'select', options: options, value: Math.max(1, p.installment) },
        { name: 'date', label: 'วันที่ตรวจรับ', type: 'date', value: ui.today(), required: true },
        { name: 'result', label: 'ผลการตรวจรับ', type: 'select', options: [['pass', 'ถูกต้องครบถ้วนตามสัญญา (ตรวจรับ)'], ['fail', 'ไม่ถูกต้อง / ให้ผู้รับจ้างแก้ไข']] },
        { name: 'committee', label: 'ประธานกรรมการ', type: 'select', options: (ref.committeeOf(p).length ? ref.committeeOf(p) : ref.COMMITTEE_POOL).map(function (c) { return c.name; }) },
        { name: 'note', label: 'ความเห็นคณะกรรมการ', type: 'textarea', span: 2, placeholder: 'ผลการตรวจวัด ข้อบกพร่อง หรือเงื่อนไขการแก้ไข' },
        { name: 'print', label: 'พิมพ์ใบรายงานผลการตรวจรับหลังบันทึก', type: 'checkbox', value: true, span: 2 }
      ],
      onSubmit: function (v) {
        var d = SK.db.data;
        v.installment = Number(v.installment);
        d.inspections.push({ projectId: p.id, installment: v.installment, date: v.date, result: v.result, note: v.note, committee: v.committee });
        if (v.result === 'pass') {
          p.installment = Math.max(p.installment, v.installment);
          if (v.installment >= p.installments) { p.status = 'completed'; p.actual = 100; p.plan = 100; }
          else if (p.status === 'pending-inspection') p.status = 'on-schedule';
        }
        addDocument({ id: 'ตร.งวด-' + p.id.slice(-3) + '/' + v.installment, type: 'inspection', title: 'ใบรายงานผลตรวจรับงานจ้าง งวดที่ ' + v.installment + ' ' + p.name, detail: v.result === 'pass' ? 'ตรวจรับครบถ้วนตามสัญญา' : 'ให้ผู้รับจ้างแก้ไข: ' + (v.note || '-'), owner: v.committee, projectId: p.id });
        d.notifications.forEach(function (n) { if (n.href.indexOf(p.id) > -1) n.read = true; });
        SK.db.save(); ui.refreshBell();
        ui.toast(v.result === 'pass' ? 'บันทึกผลตรวจรับงวดที่ ' + v.installment + ' เรียบร้อย' : 'บันทึกผล: ให้ผู้รับจ้างแก้ไขงาน', 'success');
        if (v.print) SK.docs.print('inspectionRecord', 'ใบรายงานผลการตรวจรับ ' + p.id, p, v);
        if (onDone) onDone(p);
      }
    });
  }

  function urge(projectId, onDone) {
    var p = SK.db.project(projectId);
    if (!p) return ui.toast('ไม่พบโครงการ', 'error');
    ui.confirm('ออกหนังสือเร่งรัดการปฏิบัติตามสัญญา (ว.119) ถึง ' + p.contractor + ' และบันทึกเข้าทะเบียนเอกสาร?', 'ออกหนังสือและพิมพ์', 'danger').then(function (ok) {
      if (!ok) return;
      addDocument({ id: 'ว.119-' + p.id.slice(-3) + '/' + (SK.db.data.documents.length + 1), type: 'order', title: 'หนังสือเร่งรัดการปฏิบัติงานตามสัญญา ' + p.name, detail: 'ถึง ' + p.contractor + ' (ล่าช้ากว่าแผน ' + Math.max(0, Math.round(p.plan - p.actual)) + '%)', projectId: p.id, format: 'doc' });
      SK.db.save();
      SK.docs.print('urge119', 'หนังสือเร่งรัดสัญญา ' + p.contractNo, p);
      if (onDone) onDone(p);
    });
  }

  function diaryEntryHtml(e) {
    var p = SK.db.project(e.projectId) || { name: e.projectId };
    return '<article class="flex gap-3 py-3">' +
      (e.photos && e.photos[0] ? '<img src="' + esc(e.photos[0].src) + '" alt="" class="w-20 h-20 rounded-lg object-cover shrink-0 bg-surface-container"/>'
        : '<div class="w-20 h-20 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-outline"><span class="material-symbols-outlined">edit_note</span></div>') +
      '<div class="min-w-0"><div class="font-label-sm text-label-sm text-on-surface-variant">' + ui.dateLong(e.date) + ' ' + esc(e.time || '') + ' น. • ' + esc(e.coords || '') + '</div>' +
      '<a href="progress.html?id=' + encodeURIComponent(e.projectId) + '" class="font-label-md text-label-md text-primary hover:underline">' + esc(p.name) + '</a>' +
      '<p class="font-semibold">' + esc(e.title) + '</p><p class="font-body-sm text-body-sm text-on-surface-variant">' + esc(e.detail) + '</p>' +
      '<p class="font-label-sm text-label-sm text-outline mt-1">' + esc(e.reporter) + '</p></div></article>';
  }

  function sortedDiary(projectId) {
    return SK.db.data.diary.filter(function (e) { return !projectId || e.projectId === projectId; })
      .sort(function (a, b) { return (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')); });
  }

  function diaryAll() {
    var wrap = document.createElement('div');
    var used = {};
    SK.db.data.diary.forEach(function (e) { used[e.projectId] = true; });
    wrap.innerHTML = '<div class="flex flex-col sm:flex-row gap-2 mb-2">' +
      '<select class="sk-f-project flex-1 px-3 py-2 rounded-lg bg-surface-container-low" aria-label="กรองตามโครงการ"><option value="">ทุกโครงการ</option>' +
      ui.projectOptions(function (p) { return used[p.id]; }).map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="sk-f-print ' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">print</span>พิมพ์</button></div>' +
      '<div class="sk-f-list divide-y divide-surface-container"></div>';
    var list = wrap.querySelector('.sk-f-list'), sel = wrap.querySelector('.sk-f-project');
    function render() {
      var rows = sortedDiary(sel.value);
      list.innerHTML = rows.length ? rows.map(diaryEntryHtml).join('') : '<p class="py-6 text-center text-on-surface-variant">ยังไม่มีบันทึก</p>';
    }
    sel.addEventListener('change', render);
    wrap.querySelector('.sk-f-print').addEventListener('click', function () {
      var p = sel.value ? SK.db.project(sel.value) : null;
      if (p) SK.docs.print('supervisorReport', 'บันทึกควบคุมงาน ' + p.id, p, sortedDiary(p.id));
      else ui.printDoc('สมุดบันทึกช่าง', '<h1>สมุดบันทึกตรวจงานช่างประจำวัน</h1>' + sortedDiary().map(function (e) {
        var pp = SK.db.project(e.projectId) || {};
        return '<p><strong>' + ui.dateLong(e.date) + ' — ' + esc(pp.name || e.projectId) + '</strong><br>' + esc(e.title) + ': ' + esc(e.detail) + '<br><span class="muted">' + esc(e.reporter) + '</span></p>';
      }).join(''));
    });
    render();
    ui.modal({ title: 'สมุดบันทึกตรวจงานช่างย้อนหลัง', subtitle: SK.db.data.diary.length + ' รายการ', icon: 'history', size: 'lg', body: wrap });
  }

  // ---------- เอกสาร / ไฟล์แนบ ----------
  var DOC_TYPES = {
    estimate: { label: 'ประมาณราคา ปร.4-6', icon: 'calculate' },
    order: { label: 'บันทึกข้อความ / คำสั่ง', icon: 'assignment' },
    inspection: { label: 'รายงานตรวจรับพัสดุ', icon: 'fact_check' },
    drawing: { label: 'แบบแปลน / มาตรฐาน', icon: 'architecture' }
  };
  var FORMAT_ICON = { html: 'article', pdf: 'picture_as_pdf', xls: 'table_chart', doc: 'description', dwg: 'architecture', img: 'image', file: 'draft' };
  var DOC_STATUS = {
    approved: ['อนุมัติแล้ว', 'bg-surface-container-high text-primary'],
    waiting: ['รอปลัดเทศบาลลงนาม', 'bg-secondary-fixed text-on-secondary-fixed-variant'],
    draft: ['ร่างฉบับแก้ไข', 'bg-error-container text-on-error-container']
  };
  function formatOf(name) {
    var ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (/^(xlsx?|csv|ods)$/.test(ext)) return 'xls';
    if (/^(docx?|odt|txt)$/.test(ext)) return 'doc';
    if (/^(dwg|dxf)$/.test(ext)) return 'dwg';
    if (/^(jpe?g|png|gif|webp)$/.test(ext)) return 'img';
    return 'file';
  }
  function fileSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  function attachTo(doc, onChange) {
    ui.pickFile('.pdf,.dwg,.dxf,.xls,.xlsx,.csv,.doc,.docx,.jpg,.jpeg,.png').then(function (files) {
      if (!files || !files[0]) return;
      var f = files[0];
      if (f.size > 50 * 1048576) return ui.toast('ไฟล์ใหญ่เกิน 50 MB', 'error');
      SK.db.files.put(f).then(function (id) {
        doc.fileId = id; doc.fileName = f.name; doc.fileSize = f.size; doc.format = formatOf(f.name);
        SK.db.save();
        ui.toast('แนบไฟล์ ' + f.name + ' แล้ว', 'success');
        if (onChange) onChange(doc);
      }).catch(function () { ui.toast('เบราว์เซอร์นี้ไม่รองรับการเก็บไฟล์', 'error'); });
    });
  }

  function uploadNew(defaults, onChange) {
    ui.pickFile('.pdf,.dwg,.dxf,.xls,.xlsx,.csv,.doc,.docx,.jpg,.jpeg,.png', true).then(function (files) {
      if (!files || !files.length) return;
      var list = Array.prototype.slice.call(files);
      Promise.all(list.map(function (f) {
        if (f.size > 50 * 1048576) { ui.toast(f.name + ' ใหญ่เกิน 50 MB', 'error'); return null; }
        return SK.db.files.put(f).then(function (id) {
          var doc = Object.assign({
            id: 'UP-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 90 + 10),
            type: f.name.match(/\.(dwg|dxf)$/i) ? 'drawing' : 'order', title: f.name.replace(/\.[^.]+$/, ''), detail: 'อัปโหลดเมื่อ ' + ui.dateLong(ui.today()),
            status: 'approved', owner: (ui.currentUser && ui.currentUser().signedIn && ui.currentUser().name) || '', date: ui.today(), projectId: ''
          }, defaults || {}, { fileId: id, fileName: f.name, fileSize: f.size, format: formatOf(f.name) });
          SK.db.data.documents.unshift(doc);
          return doc;
        });
      })).then(function (docs) {
        docs = docs.filter(Boolean);
        if (!docs.length) return;
        SK.db.save();
        ui.toast('อัปโหลด ' + docs.length + ' ไฟล์เข้าทะเบียนเอกสารแล้ว', 'success');
        if (onChange) onChange(docs);
      }).catch(function () { ui.toast('เบราว์เซอร์นี้ไม่รองรับการเก็บไฟล์', 'error'); });
    });
  }

  function openDocument(doc, onChange) {
    // เอกสารที่สร้างจากระบบ (ประวัติเอกสาร): เปิดพรีวิวเดิม พิมพ์/บันทึก Word/แก้ไขได้
    if (doc.fileId && doc.docKey && SK.docEngine && SK.docEngine.reopen) return SK.docEngine.reopen(doc);
    if (doc.fileId) {
      return SK.db.files.get(doc.fileId).then(function (rec) {
        if (!rec) { delete doc.fileId; SK.db.save(); return openDocument(doc, onChange); }
        ui.download(rec.name.replace(/[^\w.\-]+/g, '_'), rec.blob);
        ui.toast('ดาวน์โหลด ' + rec.name, 'success');
      });
    }
    var p = doc.projectId ? SK.db.project(doc.projectId) : null;
    var st = DOC_STATUS[doc.status] || DOC_STATUS.approved;
    var t = DOC_TYPES[doc.type] || DOC_TYPES.order;
    ui.modal({
      title: doc.title, subtitle: doc.id + ' • ' + t.label, icon: t.icon, size: 'md',
      body: '<dl class="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2">' +
        '<dt class="text-on-surface-variant">สถานะ</dt><dd><span class="px-2 py-0.5 rounded-full font-label-sm text-label-sm ' + st[1] + '">' + st[0] + '</span></dd>' +
        '<dt class="text-on-surface-variant">รายละเอียด</dt><dd>' + esc(doc.detail || '-') + '</dd>' +
        '<dt class="text-on-surface-variant">ผู้จัดทำ</dt><dd>' + esc(doc.owner || '-') + '</dd>' +
        '<dt class="text-on-surface-variant">วันที่</dt><dd>' + ui.dateLong(doc.date) + '</dd>' +
        '<dt class="text-on-surface-variant">โครงการ</dt><dd>' + (p ? '<a class="text-primary hover:underline" href="progress.html?id=' + p.id + '">' + esc(p.name) + '</a>' : '-') + '</dd></dl>' +
        '<p class="mt-4 p-3 rounded-lg bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">ยังไม่มีไฟล์ต้นฉบับในระบบ — แนบไฟล์ (PDF, DWG, Excel, Word หรือรูปภาพ) เพื่อให้ดาวน์โหลดได้ทุกครั้งที่คลิก หรือพิมพ์ใบสรุปเอกสารได้ทันที</p>',
      actions: [
        { label: 'พิมพ์ใบสรุปเอกสาร', icon: 'print', onClick: function () {
          ui.printDoc(doc.id, '<h1>' + esc(doc.title) + '</h1><table><tr><th>เลขที่</th><td>' + esc(doc.id) + '</td></tr><tr><th>ประเภท</th><td>' + esc(t.label) + '</td></tr><tr><th>รายละเอียด</th><td>' + esc(doc.detail) + '</td></tr><tr><th>ผู้จัดทำ</th><td>' + esc(doc.owner) + '</td></tr><tr><th>วันที่</th><td>' + ui.dateLong(doc.date) + '</td></tr><tr><th>สถานะ</th><td>' + st[0] + '</td></tr>' + (p ? '<tr><th>โครงการ</th><td>' + esc(p.name) + '</td></tr>' : '') + '</table>');
        } },
        { label: 'แนบไฟล์ต้นฉบับ', kind: 'primary', icon: 'upload_file', onClick: function (m) { m.close(); attachTo(doc, onChange); } }
      ]
    });
  }

  function refreshPage() {
    if (SK.page && SK.page.refresh) SK.page.refresh();
    else location.reload();
  }

  SK.flows = {
    DOC_TYPES: DOC_TYPES, FORMAT_ICON: FORMAT_ICON, DOC_STATUS: DOC_STATUS, fileSize: fileSize,
    openDocument: openDocument, attachTo: attachTo, uploadNew: uploadNew,
    refreshPage: refreshPage, inspection: inspection, urge: urge, diaryAll: diaryAll, sortedDiary: sortedDiary, addDocument: addDocument, docName: docName, dedupe: dedupe };
  ui.onReady(dedupe);

  // การกระทำที่ใช้ได้ทุกหน้า
  Object.assign(SK.actions, {
    'view-project': function (el) { ui.openProjectDetail(el.dataset.id, refreshPage); },
    'edit-project': function (el) { ui.openProjectForm(SK.db.project(el.dataset.id), refreshPage); },
    'inspect-record': function (el) { inspection(el.dataset.project, refreshPage); },
    'urge': function (el) { urge(el.dataset.project); },
    'diary-all': diaryAll,
    'open-notifications': function () { document.getElementById('notif-btn').click(); }
  });
})();
