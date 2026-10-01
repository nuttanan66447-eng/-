// ส่วนติดต่อผู้ใช้ที่ใช้ร่วมกันทุกหน้า: modal, ฟอร์ม, แจ้งเตือน, ดาวน์โหลด, เมนูส่วนหัว
(function () {
  'use strict';
  var SK = window.SK;
  var ref = SK.ref;

  // ---------- รูปแบบตัวเลข / วันที่ ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n, digits) {
    return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  }
  function toDate(iso) { return iso ? new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso) : null; }
  function dateShort(iso) {
    var d = toDate(iso);
    return d ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-';
  }
  function dateLong(iso) {
    var d = toDate(iso);
    return d ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
  }
  function dateFull(iso) {
    var d = toDate(iso);
    return d ? d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
  }
  function today() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function nowTime() { return new Date().toTimeString().slice(0, 5); }

  var DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  var PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  function readInt(str) {
    // อ่านจำนวนเต็ม (สตริงตัวเลข) เป็นคำอ่านภาษาไทย รองรับหลักล้านแบบวนซ้ำ
    str = str.replace(/^0+/, '');
    if (!str) return '';
    if (str.length > 6) {
      var low = str.slice(-6).replace(/^0+/, '');
      return readInt(str.slice(0, -6)) + 'ล้าน' + (low === '1' ? 'เอ็ด' : readInt(low));
    }
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var d = +str[i], pos = str.length - i - 1;
      if (d === 0) continue;
      if (pos === 0 && d === 1 && str.length > 1) out += 'เอ็ด';
      else if (pos === 1 && d === 2) out += 'ยี่';
      else if (pos === 1 && d === 1) out += '';
      else out += DIGITS[d];
      out += PLACES[pos];
    }
    return out;
  }
  function bahtText(n) {
    n = Math.round(Number(n || 0) * 100) / 100;
    var parts = n.toFixed(2).split('.');
    var baht = readInt(parts[0]);
    var satang = readInt(parts[1]);
    if (!baht && !satang) return 'ศูนย์บาทถ้วน';
    return (baht ? baht + 'บาท' : '') + (satang ? satang + 'สตางค์' : 'ถ้วน');
  }

  // ---------- แจ้งเตือนชั่วคราว ----------
  var toastEl, toastTimer;
  function toast(msg, tone) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      toastEl.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] max-w-[92vw] px-4 py-2.5 rounded-lg shadow-lg text-sm font-semibold transition-opacity duration-300 opacity-0 pointer-events-none flex items-center gap-2';
      document.body.appendChild(toastEl);
    }
    var tones = { error: 'bg-error text-on-error', success: 'bg-emerald-700 text-white', info: 'bg-tertiary text-surface' };
    toastEl.className = toastEl.className.replace(/bg-\S+ text-\S+/, '').trim() + ' ' + (tones[tone] || tones.info);
    var icon = tone === 'error' ? 'error' : tone === 'success' ? 'check_circle' : 'info';
    toastEl.innerHTML = '<span class="material-symbols-outlined text-[18px]">' + icon + '</span><span>' + esc(msg) + '</span>';
    toastEl.classList.remove('opacity-0');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.add('opacity-0'); }, 2800);
  }

  // ---------- Modal ----------
  var openModals = [];
  function modal(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'sk-modal fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 bg-tertiary/60 backdrop-blur-sm';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    var width = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl' }[opts.size || 'md'];
    wrap.innerHTML =
      '<div class="bg-surface-container-lowest w-full ' + width + ' max-h-[92vh] flex flex-col rounded-t-xl sm:rounded-xl shadow-2xl">' +
        '<div class="flex items-start justify-between gap-3 px-5 py-4 border-b border-surface-container">' +
          '<div class="flex items-start gap-3 min-w-0">' +
            (opts.icon ? '<div class="w-10 h-10 shrink-0 rounded-lg ' + (opts.iconClass || 'bg-surface-container text-primary') + ' flex items-center justify-center"><span class="material-symbols-outlined">' + opts.icon + '</span></div>' : '') +
            '<div class="min-w-0"><h3 class="font-headline-md text-headline-md text-primary font-bold">' + esc(opts.title) + '</h3>' +
            (opts.subtitle ? '<p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
          '</div>' +
          '<button type="button" data-close class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary" aria-label="ปิด"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<div class="sk-modal-body px-5 py-4 overflow-y-auto font-body-md text-body-md text-on-surface"></div>' +
        '<div class="sk-modal-actions hidden px-5 py-3 border-t border-surface-container flex flex-wrap justify-end gap-2"></div>' +
      '</div>';
    var body = wrap.querySelector('.sk-modal-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    var actionsEl = wrap.querySelector('.sk-modal-actions');
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.type = a.submit ? 'submit' : 'button';
      if (a.form) b.setAttribute('form', a.form);
      b.className = btnClass(a.kind);
      b.innerHTML = (a.icon ? '<span class="material-symbols-outlined text-[18px]">' + a.icon + '</span>' : '') + '<span>' + esc(a.label) + '</span>';
      if (a.onClick) b.addEventListener('click', function () { a.onClick(api); });
      actionsEl.appendChild(b);
      actionsEl.classList.remove('hidden');
    });

    var lastFocus = document.activeElement;
    function close() {
      wrap.remove();
      openModals = openModals.filter(function (m) { return m !== api; });
      document.body.classList.toggle('overflow-hidden', openModals.length > 0);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (opts.onClose) opts.onClose();
    }
    var api = { el: wrap, body: body, close: close };
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
    });
    document.body.appendChild(wrap);
    document.body.classList.add('overflow-hidden');
    openModals.push(api);
    var focusable = body.querySelector('input:not([type=hidden]),select,textarea') || wrap.querySelector('[data-close]');
    if (focusable) setTimeout(function () { focusable.focus(); }, 30);
    return api;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModals.length) openModals[openModals.length - 1].close();
  });

  function btnClass(kind) {
    return 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-label-md text-label-md font-semibold transition-colors ' + ({
      primary: 'bg-primary text-on-primary hover:bg-primary-container',
      accent: 'bg-secondary text-on-primary hover:bg-secondary-container',
      danger: 'bg-error text-on-error hover:opacity-90',
      ghost: 'bg-surface-container text-on-surface hover:bg-surface-container-high'
    }[kind || 'ghost']);
  }

  function confirmBox(message, okLabel, kind) {
    return new Promise(function (resolve) {
      var done = false;
      modal({
        title: 'ยืนยันการดำเนินการ', icon: 'help', size: 'sm', body: '<p>' + esc(message) + '</p>',
        actions: [
          { label: 'ยกเลิก', onClick: function (m) { m.close(); } },
          { label: okLabel || 'ยืนยัน', kind: kind || 'primary', onClick: function (m) { done = true; m.close(); resolve(true); } }
        ],
        onClose: function () { if (!done) resolve(false); }
      });
    });
  }

  // ---------- ฟอร์ม ----------
  var inputCls = 'w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary/20';
  function fieldHtml(f) {
    var id = 'f-' + f.name + '-' + Math.random().toString(36).slice(2, 7);
    var v = f.value == null ? '' : f.value;
    var req = f.required ? ' required' : '';
    var input;
    if (f.type === 'select') {
      input = '<select id="' + id + '" name="' + f.name + '" class="' + inputCls + '"' + req + '>' +
        f.options.map(function (o) {
          var val = Array.isArray(o) ? o[0] : o, lab = Array.isArray(o) ? o[1] : o;
          return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(lab) + '</option>';
        }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '" class="' + inputCls + ' resize-y"' + req +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '>' + esc(v) + '</textarea>';
    } else if (f.type === 'file') {
      input = '<input id="' + id + '" name="' + f.name + '" type="file" class="block w-full text-body-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary file:font-semibold"' +
        (f.accept ? ' accept="' + f.accept + '"' : '') + (f.multiple ? ' multiple' : '') + req + '/>';
    } else if (f.type === 'checkbox') {
      return '<label class="flex items-center gap-2 ' + (f.span === 2 ? 'sm:col-span-2' : '') + '"><input type="checkbox" name="' + f.name + '"' + (v ? ' checked' : '') + ' class="w-4 h-4 accent-[#1e3a8a]"/> <span>' + esc(f.label) + '</span></label>';
    } else {
      input = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '" class="' + inputCls + '"' + req +
        (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') +
        (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') +
        (f.step != null ? ' step="' + f.step + '"' : '') + '/>';
    }
    return '<div class="flex flex-col gap-1 ' + (f.span === 2 ? 'sm:col-span-2' : '') + '">' +
      '<label for="' + id + '" class="font-label-md text-label-md text-on-surface font-semibold">' + esc(f.label) + (f.required ? ' <span class="text-error">*</span>' : '') + '</label>' +
      input + (f.help ? '<span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(f.help) + '</span>' : '') + '</div>';
  }
  function readForm(form, fields) {
    var out = {};
    fields.forEach(function (f) {
      var el = form.elements[f.name];
      if (!el) return;
      if (f.type === 'file') out[f.name] = el.files;
      else if (f.type === 'checkbox') out[f.name] = el.checked;
      else if (f.type === 'number') out[f.name] = el.value === '' ? null : Number(el.value);
      else out[f.name] = el.value.trim();
    });
    return out;
  }
  function formModal(opts) {
    var formId = 'form-' + Math.random().toString(36).slice(2, 8);
    var form = document.createElement('form');
    form.id = formId;
    form.noValidate = false;
    form.innerHTML = (opts.intro || '') + '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + opts.fields.map(fieldHtml).join('') + '</div>';
    var m = modal({
      title: opts.title, subtitle: opts.subtitle, icon: opts.icon, iconClass: opts.iconClass, size: opts.size, body: form,
      actions: [
        { label: 'ยกเลิก', onClick: function (mm) { mm.close(); } }
      ].concat(opts.extraActions || []).concat([{ label: opts.submitLabel || 'บันทึก', kind: opts.submitKind || 'primary', icon: opts.submitIcon || 'save', submit: true, form: formId }])
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var values = readForm(form, opts.fields);
      Promise.resolve(opts.onSubmit(values, m)).then(function (keepOpen) { if (keepOpen !== true) m.close(); });
    });
    if (opts.onReady) opts.onReady(form, m);
    return m;
  }

  // ---------- ไฟล์ ----------
  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function csv(filename, rows) {
    var text = rows.map(function (r) {
      return r.map(function (c) {
        var s = c == null ? '' : String(c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
    download(filename, '﻿' + text, 'text/csv;charset=utf-8'); // BOM ให้ Excel อ่านภาษาไทยได้
  }
  function pickFile(accept, multiple) {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file';
      if (accept) inp.accept = accept;
      inp.multiple = !!multiple;
      inp.addEventListener('change', function () { resolve(inp.files); });
      inp.click();
    });
  }
  function resizeImage(file, maxSize) {
    // ย่อภาพก่อนเก็บ เพื่อไม่ให้พื้นที่เก็บข้อมูลของเบราว์เซอร์เต็ม
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var s = Math.min(1, (maxSize || 640) / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- พิมพ์เอกสาร ----------
  // พิมพ์เอกสารทางราชการผ่าน iframe ที่ซ่อนไว้ (ไม่ต้องเปิดหน้าต่างใหม่ ผู้ใช้เลือก "บันทึกเป็น PDF" ได้)
  function printDoc(title, bodyHtml) {
    var logo = new URL('assets/logo-sikaew.jpg', location.href).href;
    var html = '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">' +
      '<style>@page{size:A4;margin:2cm 2cm 2cm 2.5cm}body{font-family:Sarabun,"TH Sarabun New",sans-serif;font-size:15px;line-height:1.6;color:#000}' +
      'h1{font-size:20px;text-align:center;margin:4px 0 12px}h2{font-size:16px;margin:16px 0 6px}.head{text-align:center}.head img{width:72px;height:72px}' +
      '.meta{display:flex;justify-content:space-between;gap:16px;margin:8px 0}.right{text-align:right}.center{text-align:center}' +
      'table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #444;padding:4px 6px;vertical-align:top}th{background:#eee}td.num{text-align:right;font-variant-numeric:tabular-nums}' +
      '.sign{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;margin-top:48px;text-align:center}.sign div{padding-top:32px}' +
      '.indent{text-indent:2.5cm}.muted{color:#555;font-size:13px}.box{border:1px solid #444;padding:8px 12px;margin:8px 0}</style></head><body>' +
      '<div class="head"><img src="' + logo + '" alt=""><div><strong>เทศบาลตำบลสีแก้ว</strong> อำเภอเมืองร้อยเอ็ด จังหวัดร้อยเอ็ด</div><div>กองช่าง</div></div>' +
      bodyHtml + '</body></html>';
    var frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    var doc = frame.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    var printed = false;
    function go() {
      if (printed) return;
      printed = true;
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(function () { frame.remove(); }, 60000);
    }
    frame.onload = go;
    setTimeout(go, 1200); // กรณีโหลดฟอนต์ไม่ได้
    toast('กำลังเปิดหน้าพิมพ์: ' + title + ' (เลือก "บันทึกเป็น PDF" ได้)');
  }

  // ---------- ข้อมูลโครงการ ----------
  function statusBadge(p) {
    var s = p.status;
    var cls = {
      'on-schedule': 'bg-surface-container-high text-primary',
      'delayed': 'bg-error-container text-on-error-container',
      'pending-inspection': 'bg-secondary-fixed text-on-secondary-fixed-variant',
      'completed': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      'signing': 'bg-surface-container text-on-surface-variant'
    }[s];
    var icon = { 'on-schedule': 'radio_button_checked', delayed: 'warning', 'pending-inspection': 'fact_check', completed: 'check_circle', signing: 'draw' }[s];
    var label = ref.STATUSES[s].label;
    if (s === 'delayed') label = 'ล่าช้า ' + Math.max(0, Math.round(p.plan - p.actual)) + '%';
    return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold whitespace-nowrap ' + cls + '">' +
      '<span class="material-symbols-outlined text-[14px]">' + icon + '</span>' + esc(label) + '</span>';
  }
  function progressBar(pct, tone) {
    var color = tone === 'delayed' ? 'bg-error' : tone === 'completed' ? 'bg-emerald-600' : tone === 'pending-inspection' ? 'bg-secondary-container' : 'bg-primary-container';
    return '<div class="w-full bg-surface-container rounded-full h-2 overflow-hidden"><div class="' + color + ' h-full rounded-full" style="width:' + Math.min(100, pct) + '%"></div></div>';
  }
  function villageName(code) { return (ref.VILLAGES[code] || {}).name || code; }

  function projectFields(p) {
    p = p || {};
    var opt = function (obj, key) { return Object.keys(obj).map(function (k) { return [k, key ? obj[k][key] : obj[k]]; }); };
    return [
      { name: 'name', label: 'ชื่อโครงการ', required: true, span: 2, value: p.name, placeholder: 'เช่น ก่อสร้างถนน คสล. สาย...' },
      { name: 'category', label: 'ประเภทงาน', type: 'select', options: opt(ref.CATEGORIES, 'label'), value: p.category },
      { name: 'village', label: 'พื้นที่ (หมู่บ้าน)', type: 'select', options: opt(ref.VILLAGES, 'name'), value: p.village },
      { name: 'location', label: 'รายละเอียดที่ตั้ง / ปริมาณงาน', span: 2, value: p.location, placeholder: 'เช่น กว้าง 5.00 ม. ยาว 850 ม. หนา 0.15 ม.' },
      { name: 'contractNo', label: 'เลขที่สัญญา', value: p.contractNo, placeholder: 'สท. xx/2567' },
      { name: 'egp', label: 'เลขโครงการ e-GP', value: p.egp },
      { name: 'source', label: 'แหล่งงบประมาณ', type: 'select', options: opt(ref.SOURCES), value: p.source },
      { name: 'budget', label: 'วงเงินตามสัญญา (บาท)', type: 'number', min: 0, step: '0.01', required: true, value: p.budget },
      { name: 'contractor', label: 'ผู้รับจ้าง', value: p.contractor },
      { name: 'supervisor', label: 'ผู้ควบคุมงาน', type: 'select', options: ref.STAFF, value: p.supervisor },
      { name: 'start', label: 'วันเริ่มสัญญา', type: 'date', value: p.start || today() },
      { name: 'end', label: 'วันสิ้นสุดสัญญา', type: 'date', value: p.end },
      { name: 'installments', label: 'จำนวนงวดงาน', type: 'number', min: 1, max: 12, value: p.installments || 1 },
      { name: 'status', label: 'สถานะ', type: 'select', options: opt(ref.STATUSES, 'long'), value: p.status || 'signing' }
    ];
  }

  function nextProjectId() {
    var max = 0;
    SK.db.data.projects.forEach(function (p) {
      var m = /SK-67-(\d+)/.exec(p.id);
      if (m) max = Math.max(max, +m[1]);
    });
    return 'SK-67-' + String(max + 1).padStart(3, '0');
  }

  function openProjectForm(existing, onSaved) {
    var isNew = !existing;
    var fields = projectFields(existing);
    if (!isNew) {
      fields = fields.concat([
        { name: 'actual', label: 'ผลงานจริง (%)', type: 'number', min: 0, max: 100, step: '0.1', value: existing.actual },
        { name: 'plan', label: 'ผลงานตามแผน (%)', type: 'number', min: 0, max: 100, step: '0.1', value: existing.plan },
        { name: 'installment', label: 'งวดปัจจุบัน', type: 'number', min: 0, max: 12, value: existing.installment },
        { name: 'disbursed', label: 'เบิกจ่ายแล้ว (บาท)', type: 'number', min: 0, step: '0.01', value: existing.disbursed }
      ]);
    }
    formModal({
      title: isNew ? 'ลงทะเบียนโครงการใหม่' : 'แก้ไขข้อมูลโครงการ ' + existing.id,
      subtitle: 'กองช่าง เทศบาลตำบลสีแก้ว • ปีงบประมาณ 2567',
      icon: isNew ? 'add_circle' : 'edit_note', size: 'lg', fields: fields,
      submitLabel: isNew ? 'ลงทะเบียนโครงการ' : 'บันทึกการแก้ไข',
      extraActions: isNew ? [] : [{
        label: 'ลบโครงการ', kind: 'danger', icon: 'delete', onClick: function (m) {
          confirmBox('ลบโครงการ ' + existing.id + ' ออกจากทะเบียน? การลบไม่สามารถย้อนกลับได้', 'ลบโครงการ', 'danger').then(function (ok) {
            if (!ok) return;
            var d = SK.db.data;
            d.projects = d.projects.filter(function (x) { return x.id !== existing.id; });
            SK.db.save();
            m.close();
            toast('ลบโครงการ ' + existing.id + ' แล้ว', 'success');
            if (onSaved) onSaved(null);
          });
        }
      }],
      onSubmit: function (v) {
        if (v.end && v.start && v.end < v.start) { toast('วันสิ้นสุดสัญญาต้องไม่ก่อนวันเริ่มสัญญา', 'error'); return true; }
        var d = SK.db.data;
        var p = existing || { id: nextProjectId(), disbursed: 0, installment: 0, actual: 0, plan: 0, createdAt: today() };
        Object.keys(v).forEach(function (k) { if (v[k] !== null && v[k] !== undefined) p[k] = v[k]; });
        p.installment = Math.min(p.installment, p.installments);
        if (p.disbursed > p.budget) { toast('ยอดเบิกจ่ายเกินวงเงินสัญญา', 'error'); return true; }
        if (isNew || !p.lat) {
          var vg = ref.VILLAGES[p.village];
          p.lat = +(vg.lat + (Math.random() - 0.5) * 0.006).toFixed(5);
          p.lng = +(vg.lng + (Math.random() - 0.5) * 0.006).toFixed(5);
        }
        if (isNew) d.projects.unshift(p);
        SK.db.save();
        toast(isNew ? 'ลงทะเบียนโครงการ ' + p.id + ' เรียบร้อย' : 'บันทึกการแก้ไขโครงการ ' + p.id + ' แล้ว', 'success');
        if (onSaved) onSaved(p);
      }
    });
  }

  function openProjectDetail(id, onChanged) {
    var p = SK.db.project(id);
    if (!p) return toast('ไม่พบโครงการ ' + id, 'error');
    var row = function (k, v) { return '<div class="flex flex-col"><span class="font-label-sm text-label-sm text-on-surface-variant">' + k + '</span><span class="font-semibold">' + v + '</span></div>'; };
    var body =
      '<div class="flex flex-wrap items-center gap-2 mb-3">' + statusBadge(p) +
        '<span class="px-2 py-0.5 rounded bg-surface-variant text-primary font-code-sm text-code-sm font-semibold">' + esc(ref.CATEGORIES[p.category].short) + '</span>' +
        '<span class="font-code-sm text-code-sm text-on-surface-variant">' + esc(p.contractNo) + ' • e-GP: ' + esc(p.egp || '-') + '</span></div>' +
      '<p class="mb-4 text-on-surface-variant">' + esc(villageName(p.village)) + ' ต.สีแก้ว — ' + esc(p.location || '') + '</p>' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-surface-container-low mb-4">' +
        row('วงเงินตามสัญญา', money(p.budget) + ' บาท') +
        row('เบิกจ่ายแล้ว', money(p.disbursed) + ' บาท (' + (p.budget ? Math.round(p.disbursed / p.budget * 100) : 0) + '%)') +
        row('งวดงาน', p.installment + ' / ' + p.installments) +
        row('ระยะเวลาสัญญา', dateShort(p.start) + ' – ' + dateShort(p.end)) +
        row('แหล่งงบประมาณ', esc(ref.SOURCES[p.source])) +
        row('ผู้รับจ้าง', esc(p.contractor || '-')) +
      '</div>' +
      '<div class="mb-1 flex justify-between font-label-md text-label-md"><span>ผลงานจริง ' + p.actual + '%</span><span class="text-on-surface-variant">แผน ' + p.plan + '%</span></div>' +
      progressBar(p.actual, p.status) +
      '<p class="mt-3 font-body-sm text-body-sm text-on-surface-variant">ผู้ควบคุมงาน: ' + esc(p.supervisor) + '</p>';
    modal({
      title: p.name, subtitle: 'รหัสโครงการ ' + p.id, icon: ref.CATEGORIES[p.category].icon, size: 'lg', body: body,
      actions: [
        { label: 'แก้ไขข้อมูล', icon: 'edit', onClick: function (m) { m.close(); openProjectForm(p, onChanged); } },
        { label: 'เปิดใน Google Maps', icon: 'map', onClick: function () { window.open('https://www.google.com/maps?q=' + p.lat + ',' + p.lng, '_blank', 'noopener'); } },
        { label: 'ติดตามความก้าวหน้า', kind: 'primary', icon: 'construction', onClick: function () { location.href = 'progress.html?id=' + encodeURIComponent(p.id); } }
      ]
    });
  }

  function projectOptions(filter) {
    return SK.db.data.projects.filter(filter || function () { return true; }).map(function (p) { return [p.id, p.id + ' • ' + p.name]; });
  }

  // ---------- ส่วนหัว: แจ้งเตือน + เมนูผู้ใช้ ----------
  function dropdown(anchor, html, width) {
    closeDropdowns();
    var box = document.createElement('div');
    box.className = 'sk-dropdown fixed z-[60] bg-surface-container-lowest rounded-xl shadow-2xl ring-1 ring-surface-container overflow-hidden';
    box.style.width = Math.min(width || 340, window.innerWidth - 24) + 'px';
    box.innerHTML = html;
    document.body.appendChild(box);
    var r = anchor.getBoundingClientRect();
    var left = Math.min(Math.max(12, r.right - box.offsetWidth), window.innerWidth - box.offsetWidth - 12);
    box.style.left = left + 'px';
    box.style.top = (r.bottom + 8) + 'px';
    setTimeout(function () { document.addEventListener('click', outside); }, 0);
    function outside(e) { if (!box.contains(e.target)) closeDropdowns(); }
    box._outside = outside;
    return box;
  }
  function closeDropdowns() {
    document.querySelectorAll('.sk-dropdown').forEach(function (b) {
      document.removeEventListener('click', b._outside);
      b.remove();
    });
  }

  function refreshBell() {
    var n = SK.db.data.notifications.filter(function (x) { return !x.read; }).length;
    var badge = document.querySelector('#notif-btn .notif-count');
    if (badge) { badge.textContent = n; badge.classList.toggle('hidden', n === 0); }
  }
  function openNotifications(btn) {
    var list = SK.db.data.notifications;
    var tone = { secondary: 'text-secondary', primary: 'text-primary', error: 'text-error' };
    var html = '<div class="flex items-center justify-between px-4 py-3 border-b border-surface-container"><span class="font-headline-sm text-headline-sm text-primary">การแจ้งเตือน</span>' +
      '<button type="button" data-act="readall" class="font-label-sm text-label-sm text-primary hover:underline">อ่านทั้งหมดแล้ว</button></div>' +
      '<div class="max-h-96 overflow-y-auto divide-y divide-surface-container">' +
      (list.length ? list.map(function (n) {
        return '<a href="' + esc(n.href) + '" data-id="' + n.id + '" class="flex gap-3 px-4 py-3 hover:bg-surface-container-low ' + (n.read ? 'opacity-60' : '') + '">' +
          '<span class="material-symbols-outlined ' + (tone[n.tone] || '') + '">' + n.icon + '</span>' +
          '<span class="flex flex-col"><span class="font-label-md text-label-md text-on-surface">' + esc(n.title) + '</span><span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(n.text) + '</span></span>' +
          (n.read ? '' : '<span class="ml-auto mt-1 w-2 h-2 rounded-full bg-secondary-container shrink-0"></span>') + '</a>';
      }).join('') : '<p class="px-4 py-6 text-center text-on-surface-variant">ไม่มีการแจ้งเตือน</p>') + '</div>';
    var box = dropdown(btn, html, 360);
    box.querySelector('[data-act=readall]').addEventListener('click', function () {
      list.forEach(function (n) { n.read = true; });
      SK.db.save(); refreshBell(); closeDropdowns();
      toast('ทำเครื่องหมายอ่านแล้วทั้งหมด', 'success');
    });
    box.querySelectorAll('a[data-id]').forEach(function (a) {
      a.addEventListener('click', function () {
        list.forEach(function (n) { if (n.id === a.dataset.id) n.read = true; });
        SK.db.save();
      });
    });
  }

  function openProfileMenu(btn) {
    var item = function (act, icon, label) {
      return '<button type="button" data-act="' + act + '" class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-container-low"><span class="material-symbols-outlined text-primary">' + icon + '</span><span>' + label + '</span></button>';
    };
    var html = '<div class="px-4 py-3 border-b border-surface-container flex items-center gap-3"><img src="assets/director.jpg" alt="" class="w-10 h-10 rounded-full object-cover"/>' +
      '<div><div class="font-label-md text-label-md">นายธีรภัทร ชาญวิทย์</div><div class="font-body-sm text-body-sm text-on-surface-variant">ผู้อำนวยการกองช่าง</div></div></div>' +
      '<div class="py-1">' + item('export', 'download', 'สำรองข้อมูล (ไฟล์ JSON)') + item('import', 'upload', 'นำเข้าข้อมูลจากไฟล์สำรอง') +
      item('reset', 'restart_alt', 'คืนค่าข้อมูลตัวอย่าง') +
      '<a href="https://www.sikaew.go.th/index/" target="_blank" rel="noopener" class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low"><span class="material-symbols-outlined text-primary">public</span><span>เว็บไซต์เทศบาลตำบลสีแก้ว</span></a></div>' +
      '<p class="px-4 py-2 border-t border-surface-container font-body-sm text-body-sm text-on-surface-variant">ข้อมูลบันทึกไว้ในเบราว์เซอร์เครื่องนี้ ควรสำรองข้อมูลเป็นประจำ</p>';
    var box = dropdown(btn, html, 320);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      closeDropdowns();
      if (b.dataset.act === 'export') {
        download('kongchang-sikaew-backup-' + today() + '.json', SK.db.exportJSON(), 'application/json');
        toast('ดาวน์โหลดไฟล์สำรองข้อมูลแล้ว', 'success');
      } else if (b.dataset.act === 'import') {
        pickFile('application/json,.json').then(function (files) {
          if (!files || !files[0]) return;
          files[0].text().then(function (t) {
            try { SK.db.importJSON(t); toast('นำเข้าข้อมูลเรียบร้อย', 'success'); setTimeout(function () { location.reload(); }, 700); }
            catch (err) { toast('นำเข้าไม่สำเร็จ: ' + err.message, 'error'); }
          });
        });
      } else if (b.dataset.act === 'reset') {
        confirmBox('คืนค่าข้อมูลทั้งหมดเป็นข้อมูลตัวอย่าง? ข้อมูลที่บันทึกไว้จะถูกลบ', 'คืนค่าข้อมูล', 'danger').then(function (ok) {
          if (!ok) return;
          SK.db.reset(); toast('คืนค่าข้อมูลตัวอย่างแล้ว', 'success');
          setTimeout(function () { location.reload(); }, 700);
        });
      }
    });
  }

  // ---------- เมนูด้านข้าง (มือถือ) ----------
  function initShell() {
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebar-backdrop');
    var toggle = document.getElementById('sidebar-toggle');
    if (sidebar && toggle) {
      var setOpen = function (open) {
        sidebar.classList.toggle('-translate-x-full', !open);
        backdrop.classList.toggle('hidden', !open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      toggle.addEventListener('click', function () { setOpen(sidebar.classList.contains('-translate-x-full')); });
      backdrop.addEventListener('click', function () { setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    }
    var bell = document.getElementById('notif-btn');
    if (bell) bell.addEventListener('click', function (e) { e.stopPropagation(); openNotifications(bell); });
    var prof = document.getElementById('profile-btn');
    if (prof) prof.addEventListener('click', function (e) { e.stopPropagation(); openProfileMenu(prof); });
    refreshBell();
    if (!localStorageWorks()) toast('เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกข้อมูล ข้อมูลจะหายเมื่อปิดหน้า', 'error');
  }
  function localStorageWorks() {
    try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch (e) { return false; }
  }

  // ปุ่มที่ผูกด้วย data-action="ชื่อ" จะเรียกฟังก์ชันใน SK.actions
  SK.actions = {};
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var fn = SK.actions[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
  });

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  SK.ui = {
    esc: esc, money: money, dateShort: dateShort, dateLong: dateLong, dateFull: dateFull, today: today, nowTime: nowTime,
    bahtText: bahtText, toast: toast, modal: modal, confirm: confirmBox, formModal: formModal, btnClass: btnClass,
    download: download, csv: csv, pickFile: pickFile, resizeImage: resizeImage, printDoc: printDoc,
    statusBadge: statusBadge, progressBar: progressBar, villageName: villageName,
    openProjectForm: openProjectForm, openProjectDetail: openProjectDetail, projectOptions: projectOptions,
    refreshBell: refreshBell, onReady: onReady
  };
  onReady(initShell);
})();
