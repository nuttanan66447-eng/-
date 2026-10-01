// หน้าศูนย์จัดทำเอกสารช่าง: ประมาณราคา ปร.4-6, ทะเบียนเอกสาร, อัปโหลดแบบแปลน
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var tab = params.get('tab') || 'estimate', statusFilter = '', showAll = false;
  var LIMIT = 5;

  // ---------- ประมาณราคา ----------
  function est() { return SK.db.data.estimate; }
  function sigs() { return SK.db.data.signatures['estimate-089']; }
  function totals(e) {
    var direct = e.rows.reduce(function (s, r) { return s + Number(r.cost || 0); }, 0);
    return { direct: direct, total: Math.round(direct * e.factor * 100) / 100 };
  }

  function renderEstimate() {
    var e = est(), t = totals(e);
    $('est-title').textContent = 'สรุปผลการประมาณราคาค่าก่อสร้าง ' + e.project;
    $('est-place').textContent = e.place;
    $('est-qty').textContent = e.qty;
    $('est-date').textContent = 'วันที่ประเมิน: ' + ui.dateLong(e.date);
    $('est-body').innerHTML = e.rows.map(function (r, i) {
      return '<tr class="' + (i % 2 ? 'bg-surface-container-lowest ' : '') + 'hover:bg-surface-container-low/40">' +
        '<td class="py-space-sm px-space-md text-center font-code-sm text-code-sm text-on-surface-variant">' + (i + 1) + '</td>' +
        '<td class="py-space-sm px-space-md font-semibold text-on-surface">' + esc(r.name) + '</td>' +
        '<td class="py-space-sm px-space-md text-right font-code-sm text-code-sm font-semibold text-on-surface">' + money(r.cost, 2) + '</td>' +
        '<td class="py-space-sm px-space-md text-center font-code-sm text-code-sm text-on-surface-variant">' + e.factor.toFixed(4) + '</td>' +
        '<td class="py-space-sm px-space-md text-right font-code-sm text-code-sm font-bold text-primary">' + money(r.cost * e.factor, 2) + '</td></tr>';
    }).join('');
    $('est-direct').textContent = money(t.direct, 2);
    $('est-sum').textContent = money(t.total, 2);
    $('est-factor').textContent = e.factor.toFixed(4);
    $('est-total').textContent = money(t.total, 2);
    $('est-text').textContent = '(' + ui.bahtText(t.total) + ')';
    var ratio = t.total ? t.direct / t.total * 100 : 0;
    $('est-ratio').textContent = ratio.toFixed(1) + '%';
    $('est-donut').innerHTML = '<circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5eeff" stroke-width="4.5"></circle>' +
      '<circle cx="18" cy="18" r="15.9155" fill="none" stroke="#00236f" stroke-width="4.5" stroke-dasharray="' + ratio.toFixed(2) + ' ' + (100 - ratio).toFixed(2) + '"></circle>' +
      '<circle cx="18" cy="18" r="15.9155" fill="none" stroke="#fd651e" stroke-width="4.5" stroke-dasharray="' + (100 - ratio).toFixed(2) + ' ' + ratio.toFixed(2) + '" stroke-dashoffset="' + (-ratio).toFixed(2) + '"></circle>';
    $('est-legend-direct').textContent = 'ค่างานต้นทุน: ' + (t.direct / 1e6).toFixed(2) + ' ลบ.';
    $('est-legend-f').textContent = 'Factor F + VAT: ' + ((t.total - t.direct) / 1e6).toFixed(2) + ' ลบ.';
    var saving = e.budget ? (e.budget - t.total) / e.budget * 100 : 0;
    $('est-saving').textContent = e.budget ? (saving >= 0 ? 'ประหยัดจากงบตั้งต้น: ' + saving.toFixed(1) + '%' : 'สูงกว่างบตั้งต้น: ' + (-saving).toFixed(1) + '%') : '';
    renderSignatures();
  }

  function renderSignatures() {
    var list = sigs(), signed = list.filter(function (s) { return s.signedAt; }).length;
    $('sig-count').textContent = signed === list.length ? 'ครบถ้วน ' + signed + ' ใน ' + list.length + ' ตำแหน่ง' : 'ลงนามแล้ว ' + signed + ' ใน ' + list.length + ' ตำแหน่ง';
    $('sig-grid').innerHTML = list.map(function (s, i) {
      var when = s.signedAt ? new Date(s.signedAt) : null;
      return '<div class="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-md">' +
        '<div class="flex items-center justify-between"><span class="font-label-sm text-label-sm ' + (i === 0 ? 'bg-primary-container text-surface-bright' : 'bg-surface-container-high text-primary') + ' px-space-xs py-space-2xs rounded font-semibold">' + esc(s.role) + '</span>' +
        '<span class="material-symbols-outlined ' + (s.signedAt ? 'text-primary' : 'text-outline') + '">' + (s.signedAt ? 'check_circle' : 'pending') + '</span></div>' +
        '<div class="flex flex-col items-center text-center my-space-xs"><div class="h-10 flex items-center justify-center text-headline-md italic font-serif ' + (s.signedAt ? 'text-primary/70' : 'text-outline/40') + ' select-none">' + (s.signedAt ? esc(s.name.replace(/^นาย|^นางสาว|^นาง/, '')) : 'รอลงนาม') + '</div>' +
        '<span class="font-label-md text-label-md font-bold text-on-surface mt-space-2xs">(' + esc(s.name) + ')</span><span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(s.position) + '</span></div>' +
        '<div class="pt-space-2xs bg-surface-container-lowest/60 px-space-xs rounded text-center"><span class="font-code-sm text-code-sm text-outline">' +
        (when ? 'e-Signed: ' + when.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + when.toTimeString().slice(0, 5) + ' น.' : 'ยังไม่ได้ลงนาม') + '</span></div></div>';
    }).join('');
  }

  function openCalculator() {
    var e = JSON.parse(JSON.stringify(est()));
    var wrap = document.createElement('form');
    wrap.id = 'calc-form';
    var input = 'w-full px-3 py-2 rounded-lg bg-surface-container-low outline-none focus:ring-2 focus:ring-primary/30';
    wrap.innerHTML =
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">' +
        '<label class="flex flex-col gap-1 sm:col-span-2"><span class="font-label-md text-label-md">ชื่อโครงการ</span><input name="project" required class="' + input + '" value="' + esc(e.project) + '"/></label>' +
        '<label class="flex flex-col gap-1"><span class="font-label-md text-label-md">สถานที่ก่อสร้าง</span><input name="place" class="' + input + '" value="' + esc(e.place) + '"/></label>' +
        '<label class="flex flex-col gap-1"><span class="font-label-md text-label-md">ปริมาณงาน</span><input name="qty" class="' + input + '" value="' + esc(e.qty) + '"/></label>' +
        '<label class="flex flex-col gap-1"><span class="font-label-md text-label-md">วันที่ประเมิน</span><input type="date" name="date" class="' + input + '" value="' + e.date + '"/></label>' +
        '<label class="flex flex-col gap-1"><span class="font-label-md text-label-md">Factor F (จากตารางกรมบัญชีกลาง)</span><input type="number" step="0.0001" min="1" max="2" name="factor" required class="' + input + '" value="' + e.factor + '"/></label>' +
        '<label class="flex flex-col gap-1"><span class="font-label-md text-label-md">งบประมาณตั้งต้น (บาท)</span><input type="number" step="0.01" min="0" name="budget" class="' + input + '" value="' + (e.budget || '') + '"/></label>' +
      '</div>' +
      '<div class="font-label-md text-label-md mb-2">รายการกลุ่มงาน (ค่างานต้นทุนตามแบบ ปร.4)</div>' +
      '<div class="calc-rows flex flex-col gap-2"></div>' +
      '<button type="button" class="calc-add mt-2 ' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">add</span>เพิ่มรายการ</button>' +
      '<div class="mt-4 p-3 rounded-lg bg-primary text-on-primary flex flex-wrap justify-between gap-2"><span>ราคากลางรวม</span><strong class="calc-total font-code-sm"></strong><span class="calc-text w-full text-body-sm opacity-80"></span></div>';
    var rowsEl = wrap.querySelector('.calc-rows');
    function rowHtml(r) {
      return '<div class="calc-row grid grid-cols-[1fr_9rem_auto] gap-2"><input aria-label="ชื่อรายการ" class="' + input + '" required value="' + esc(r.name) + '"/>' +
        '<input aria-label="ค่างานต้นทุน" type="number" min="0" step="0.01" class="' + input + ' text-right" required value="' + r.cost + '"/>' +
        '<button type="button" class="calc-del p-2 rounded-lg text-error hover:bg-error-container" aria-label="ลบรายการ"><span class="material-symbols-outlined">delete</span></button></div>';
    }
    function read() {
      var rows = Array.prototype.map.call(rowsEl.querySelectorAll('.calc-row'), function (r) {
        var i = r.querySelectorAll('input');
        return { name: i[0].value.trim(), cost: Number(i[1].value || 0) };
      });
      var f = Number(wrap.elements.factor.value || 0);
      var direct = rows.reduce(function (s, r) { return s + r.cost; }, 0);
      return { rows: rows, factor: f, total: Math.round(direct * f * 100) / 100 };
    }
    function update() {
      var r = read();
      wrap.querySelector('.calc-total').textContent = money(r.total, 2) + ' บาท';
      wrap.querySelector('.calc-text').textContent = '(' + ui.bahtText(r.total) + ')';
    }
    rowsEl.innerHTML = e.rows.map(rowHtml).join('');
    wrap.addEventListener('input', update);
    wrap.addEventListener('click', function (ev) {
      if (ev.target.closest('.calc-add')) { rowsEl.insertAdjacentHTML('beforeend', rowHtml({ name: '', cost: 0 })); rowsEl.lastElementChild.querySelector('input').focus(); update(); }
      var del = ev.target.closest('.calc-del');
      if (del) { if (rowsEl.children.length > 1) { del.parentElement.remove(); update(); } else ui.toast('ต้องมีอย่างน้อย 1 รายการ', 'error'); }
    });
    update();
    var m = ui.modal({
      title: 'แบบฟอร์มคำนวณราคากลาง ปร.4 ปร.5 ปร.6', subtitle: 'คำนวณอัตโนมัติ: ค่าก่อสร้าง = ค่างานต้นทุน × Factor F', icon: 'calculate', size: 'lg', body: wrap,
      actions: [
        { label: 'ยกเลิก', onClick: function (mm) { mm.close(); } },
        { label: 'บันทึกราคากลาง', kind: 'primary', icon: 'save', submit: true, form: 'calc-form' }
      ]
    });
    wrap.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var r = read();
      var d = SK.db.data;
      d.estimate = { projectId: e.projectId, project: wrap.elements.project.value.trim(), place: wrap.elements.place.value.trim(), qty: wrap.elements.qty.value.trim(), date: wrap.elements.date.value || ui.today(), factor: r.factor, budget: Number(wrap.elements.budget.value || 0), rows: r.rows };
      sigs().forEach(function (s) { s.signedAt = null; }); // แก้ราคาแล้วต้องลงนามรับรองใหม่
      SK.db.save(); m.close(); renderEstimate();
      ui.toast('บันทึกราคากลาง ' + money(r.total, 2) + ' บาท — กรุณาให้คณะกรรมการลงนามรับรองใหม่', 'success');
    });
  }

  function openSign() {
    var list = sigs();
    var body = document.createElement('div');
    function render() {
      body.innerHTML = '<p class="mb-3 text-on-surface-variant">คณะกรรมการกำหนดราคากลางลงนามรับรองแบบ ปร.5 ราคากลาง ' + money(totals(est()).total, 2) + ' บาท</p>' +
        list.map(function (s, i) {
          return '<div class="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-low mb-2"><div><div class="font-semibold">' + esc(s.name) + '</div><div class="font-body-sm text-body-sm text-on-surface-variant">' + esc(s.role) + ' • ' + esc(s.position) + '</div></div>' +
            (s.signedAt ? '<span class="text-primary font-label-md text-label-md flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">check_circle</span>ลงนามแล้ว</span>'
              : '<button type="button" data-i="' + i + '" class="sig-btn ' + ui.btnClass('accent') + '"><span class="material-symbols-outlined text-[18px]">draw</span>ลงนาม</button>') + '</div>';
        }).join('');
    }
    body.addEventListener('click', function (ev) {
      var b = ev.target.closest('.sig-btn');
      if (!b) return;
      var d = new Date();
      list[Number(b.dataset.i)].signedAt = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      SK.db.save(); render(); renderSignatures();
      ui.toast('ลงนามรับรองโดย ' + list[Number(b.dataset.i)].name + ' แล้ว', 'success');
    });
    render();
    ui.modal({
      title: 'ลงนามตรวจสอบราคากลาง (e-Signature)', icon: 'history_edu', iconClass: 'bg-secondary-fixed text-secondary', body: body,
      actions: [{ label: 'ยกเลิกการลงนามทั้งหมด', icon: 'restart_alt', onClick: function () {
        ui.confirm('ยกเลิกการลงนามของคณะกรรมการทั้งหมด เพื่อลงนามรับรองใหม่?', 'ยกเลิกการลงนาม', 'danger').then(function (ok) {
          if (!ok) return;
          list.forEach(function (s) { s.signedAt = null; }); SK.db.save(); render(); renderSignatures();
        });
      } }]
    });
  }

  // ---------- ทะเบียนเอกสาร ----------
  function filteredDocs() {
    var q = $('doc-search').value.trim().toLowerCase();
    return SK.db.data.documents.filter(function (d) {
      if (tab !== 'estimate' && d.type !== tab) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      if (!q) return true;
      return [d.id, d.title, d.detail, d.owner, d.projectId, d.fileName].join(' ').toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  }
  function renderDocs() {
    var all = filteredDocs();
    var rows = showAll ? all : all.slice(0, LIMIT);
    var st = SK.flows.DOC_STATUS;
    $('doc-body').innerHTML = rows.map(function (d, i) {
      var s = st[d.status] || st.approved;
      var dot = d.status === 'approved' ? 'bg-primary' : d.status === 'waiting' ? 'bg-secondary-container' : 'bg-error';
      var p = d.projectId ? SK.db.project(d.projectId) : null;
      return '<tr class="' + (i % 2 ? 'bg-surface-container-lowest ' : '') + 'hover:bg-surface-container-low/40 transition-colors">' +
        '<td class="py-space-md px-space-lg font-code-sm text-code-sm font-bold text-primary whitespace-nowrap">' + esc(d.id) + '</td>' +
        '<td class="py-space-md px-space-md"><div class="flex flex-col"><button type="button" data-action="open-doc" data-id="' + esc(d.id) + '" class="text-left font-headline-sm text-headline-sm font-semibold text-on-surface hover:text-primary hover:underline">' + esc(d.title) + '</button>' +
        '<span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(d.detail || '') + (p ? ' • <a class="text-primary hover:underline" href="progress.html?id=' + p.id + '">' + p.id + '</a>' : '') + '</span></div></td>' +
        '<td class="py-space-md px-space-md"><div class="flex items-center gap-space-xs"><span class="material-symbols-outlined text-space-lg text-outline">engineering</span><span class="text-on-surface font-body-md text-body-md">' + esc(d.owner) + '</span></div></td>' +
        '<td class="py-space-md px-space-md text-center"><button type="button" data-action="doc-status" data-id="' + esc(d.id) + '" title="เปลี่ยนสถานะเอกสาร" class="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-semibold whitespace-nowrap ' + s[1] + '"><span class="w-2 h-2 rounded-full ' + dot + '"></span>' + s[0] + '</button></td>' +
        '<td class="py-space-md px-space-md text-center font-code-sm text-code-sm text-on-surface-variant whitespace-nowrap">' + ui.dateShort(d.date) + '</td>' +
        '<td class="py-space-md px-space-lg text-right"><div class="flex items-center justify-end gap-space-xs">' +
          '<button type="button" data-action="open-doc" data-id="' + esc(d.id) + '" class="p-space-2xs text-secondary hover:bg-secondary-fixed/30 rounded" title="' + (d.fileId ? 'ดาวน์โหลด ' + esc(d.fileName) : 'ดูเอกสาร / แนบไฟล์') + '" aria-label="เปิดเอกสาร ' + esc(d.id) + '"><span class="material-symbols-outlined">' + (d.fileId ? 'download' : SK.flows.FORMAT_ICON[d.format] || 'draft') + '</span></button>' +
          '<button type="button" data-action="attach-doc" data-id="' + esc(d.id) + '" class="p-space-2xs text-primary hover:bg-primary-fixed/40 rounded" title="แนบ/เปลี่ยนไฟล์ต้นฉบับ" aria-label="แนบไฟล์ ' + esc(d.id) + '"><span class="material-symbols-outlined">upload_file</span></button>' +
        '</div></td></tr>';
    }).join('') || '<tr><td colspan="6" class="py-8 text-center text-on-surface-variant">ไม่พบเอกสารที่ตรงกับเงื่อนไข</td></tr>';
    $('doc-count').textContent = 'แสดง ' + rows.length + ' จาก ' + all.length + ' รายการ';
    $('doc-all').textContent = showAll ? 'แสดงเฉพาะล่าสุด' : 'ดูคลังเอกสารทั้งหมด';
    $('doc-filter').classList.toggle('ring-2', !!statusFilter);
  }
  function findDoc(id) { return SK.db.data.documents.filter(function (d) { return d.id === id; })[0]; }

  function setTab(t) {
    tab = t;
    document.querySelectorAll('#docTabs [data-tab]').forEach(function (b) {
      var on = b.dataset.tab === t;
      b.setAttribute('aria-selected', on);
      b.className = 'flex items-center gap-space-xs px-space-md py-space-sm rounded-lg font-headline-sm text-headline-sm transition-all shrink-0 ' + (on ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary');
    });
    $('estimate-panel').classList.toggle('hidden', t !== 'estimate');
    showAll = t !== 'estimate';
    renderDocs();
  }

  function newDoc() {
    var types = Object.keys(SK.flows.DOC_TYPES).map(function (k) { return [k, SK.flows.DOC_TYPES[k].label]; });
    ui.formModal({
      title: 'สร้างเอกสารใหม่', subtitle: 'ลงทะเบียนเอกสารช่างเข้าระบบสารบรรณ', icon: 'note_add', size: 'lg',
      fields: [
        { name: 'type', label: 'ประเภทเอกสาร', type: 'select', options: types, value: tab === 'estimate' ? 'order' : tab },
        { name: 'id', label: 'เลขที่เอกสาร', required: true, placeholder: 'เช่น บันทึก 095/2567' },
        { name: 'title', label: 'ชื่อเรื่อง', required: true, span: 2 },
        { name: 'detail', label: 'รายละเอียด', type: 'textarea', span: 2, rows: 2 },
        { name: 'projectId', label: 'โครงการที่เกี่ยวข้อง', type: 'select', span: 2, options: [['', '— ไม่ระบุ —']].concat(ui.projectOptions()) },
        { name: 'owner', label: 'ผู้จัดทำ', value: 'นายธีรภัทร ชาญวิทย์' },
        { name: 'status', label: 'สถานะ', type: 'select', options: [['draft', 'ร่างฉบับแก้ไข'], ['waiting', 'รอปลัดเทศบาลลงนาม'], ['approved', 'อนุมัติแล้ว']] },
        { name: 'date', label: 'วันที่เอกสาร', type: 'date', value: ui.today() },
        { name: 'file', label: 'แนบไฟล์ต้นฉบับ (ถ้ามี)', type: 'file', accept: '.pdf,.dwg,.dxf,.xls,.xlsx,.csv,.doc,.docx,.jpg,.jpeg,.png' }
      ],
      onSubmit: function (v) {
        if (findDoc(v.id)) { ui.toast('เลขที่เอกสารนี้มีอยู่แล้ว', 'error'); return true; }
        var file = v.file && v.file[0];
        var doc = { id: v.id, type: v.type, title: v.title, detail: v.detail, projectId: v.projectId, owner: v.owner, status: v.status, date: v.date, format: v.type === 'drawing' ? 'dwg' : 'doc' };
        var done = function () {
          SK.db.data.documents.unshift(doc); SK.db.save();
          if (tab !== 'estimate' && tab !== doc.type) setTab(doc.type); else renderDocs();
          ui.toast('ลงทะเบียนเอกสาร ' + doc.id + ' แล้ว', 'success');
        };
        if (!file) return done();
        return SK.db.files.put(file).then(function (fid) {
          doc.fileId = fid; doc.fileName = file.name; doc.fileSize = file.size;
          done();
        }).catch(function () { ui.toast('เก็บไฟล์ไม่สำเร็จ — บันทึกเฉพาะข้อมูลเอกสาร', 'error'); done(); });
      }
    });
  }

  Object.assign(SK.actions, {
    'upload-cad': function () { SK.flows.uploadNew({ type: 'drawing', status: 'approved' }, function () { setTab('drawing'); }); },
    'new-doc': newDoc,
    'doc-tab': function (el) { setTab(el.dataset.tab); },
    'doc-all': function () { showAll = !showAll; renderDocs(); },
    'doc-filter': function (el) {
      var opts = [['', 'ทุกสถานะ'], ['approved', 'อนุมัติแล้ว'], ['waiting', 'รอปลัดเทศบาลลงนาม'], ['draft', 'ร่างฉบับแก้ไข']];
      var box = document.createElement('div');
      box.className = 'sk-dropdown fixed z-[60] bg-surface-container-lowest rounded-xl shadow-2xl ring-1 ring-surface-container py-1';
      box.innerHTML = opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="w-full text-left px-4 py-2 hover:bg-surface-container-low ' + (o[0] === statusFilter ? 'font-bold text-primary' : '') + '">' + o[1] + '</button>'; }).join('');
      document.body.appendChild(box);
      var r = el.getBoundingClientRect();
      box.style.top = (r.bottom + 6) + 'px';
      box.style.left = Math.max(12, r.right - box.offsetWidth) + 'px';
      var close = function (e) { if (!box.contains(e.target)) { box.remove(); document.removeEventListener('click', close); } };
      setTimeout(function () { document.addEventListener('click', close); }, 0);
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        statusFilter = b.dataset.v; renderDocs(); box.remove(); document.removeEventListener('click', close);
      });
    },
    'open-doc': function (el) { SK.flows.openDocument(findDoc(el.dataset.id), renderDocs); },
    'attach-doc': function (el) { SK.flows.attachTo(findDoc(el.dataset.id), renderDocs); },
    'doc-status': function (el) {
      var d = findDoc(el.dataset.id);
      var order = ['draft', 'waiting', 'approved'];
      d.status = order[(order.indexOf(d.status) + 1) % order.length];
      SK.db.save(); renderDocs();
      ui.toast(d.id + ': ' + SK.flows.DOC_STATUS[d.status][0], 'success');
    },
    'print-estimate': function () { SK.docs.print('estimate', 'แบบ ปร.5 ราคากลาง', est()); },
    'sign-estimate': openSign,
    'open-calculator': openCalculator,
    'appointment': function () {
      ui.formModal({
        title: 'คำสั่งแต่งตั้งผู้ควบคุมงาน / คณะกรรมการ', subtitle: 'พ.ร.บ. การจัดซื้อจัดจ้างฯ พ.ศ. 2560 มาตรา 100', icon: 'person_add', size: 'lg', submitLabel: 'ออกคำสั่งและพิมพ์', submitIcon: 'print',
        fields: [
          { name: 'no', label: 'เลขที่คำสั่ง', required: true, value: (SK.db.data.documents.filter(function (d) { return /^คำสั่ง/.test(d.id); }).length + 143) + '/2567' },
          { name: 'date', label: 'วันที่สั่ง', type: 'date', value: ui.today() },
          { name: 'kind', label: 'ประเภทการแต่งตั้ง', type: 'select', span: 2, options: ['ผู้ควบคุมงานก่อสร้าง', 'คณะกรรมการตรวจรับพัสดุ', 'คณะกรรมการกำหนดราคากลาง'] },
          { name: 'projectId', label: 'โครงการ', type: 'select', span: 2, options: ui.projectOptions() },
          { name: 'members', label: 'รายชื่อผู้ได้รับแต่งตั้ง (บรรทัดละ 1 คน พร้อมตำแหน่ง)', type: 'textarea', span: 2, rows: 4, required: true,
            value: ref.COMMITTEE.map(function (c) { return c.name + ' ' + c.position + ' — ' + c.role; }).join('\n') }
        ],
        onSubmit: function (v) {
          var p = SK.db.project(v.projectId);
          SK.flows.addDocument({ id: 'คำสั่ง ' + v.no, type: 'order', title: 'คำสั่งแต่งตั้ง' + v.kind, detail: p ? p.name : '', projectId: v.projectId, status: 'waiting', format: 'doc', date: v.date });
          SK.db.save(); renderDocs();
          SK.docs.print('appointment', 'คำสั่งที่ ' + v.no, v, p);
        }
      });
    },
    'inspection-report': function () {
      ui.formModal({
        title: 'ใบรายงานผลตรวจรับงานจ้างก่อสร้าง', icon: 'grading', submitLabel: 'ถัดไป', submitIcon: 'arrow_forward',
        fields: [{ name: 'id', label: 'เลือกโครงการ', type: 'select', span: 2, options: ui.projectOptions(function (p) { return p.status !== 'signing'; }) }],
        onSubmit: function (v) { setTimeout(function () { SK.flows.inspection(v.id, renderDocs); }, 0); }
      });
    }
  });

  SK.page = { refresh: function () { renderEstimate(); renderDocs(); } };
  ui.onReady(function () {
    if (params.get('q')) $('doc-search').value = params.get('q');
    $('doc-search').addEventListener('input', renderDocs);
    renderEstimate();
    setTab(tab);
  });
})();
