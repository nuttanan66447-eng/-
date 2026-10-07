// แกนกลางของเว็บ: ตัวช่วยทั่วไป หน้าต่างลอย การแจ้งเตือน และตัวเปลี่ยนหน้า (index.html#/...)
(function () {
  'use strict';
  var SK = window.SK = window.SK || {};

  // ---------- ข้อความ / ตัวเลข / วันที่ ----------
  var MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  var TH_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function arabic(s) { return String(s == null ? '' : s).replace(/[๐-๙]/g, function (d) { return TH_DIGITS.indexOf(d); }); }
  function num(v) { if (typeof v === 'number') return v; var n = Number(arabic(v).replace(/[^\d.-]/g, '')); return isFinite(n) ? n : 0; }
  function money(n, dec) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec == null ? 2 : dec }); }
  // ยอดเงินแบบย่อ: 2,480,000 -> 2.48 ล้าน
  function moneyShort(n) {
    n = Number(n || 0);
    if (Math.abs(n) >= 1e6) return (n / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ล้าน';
    return money(n, 0);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function dateLong(iso) { var d = parseIso(iso); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543) : ''; }
  function dateShort(iso) { var d = parseIso(iso); return d ? d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(2) : ''; }
  function dateFull(d) { d = d || new Date(); return 'วัน' + DAYS[d.getDay()] + 'ที่ ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543); }
  function timeAgo(iso) {
    var t = Date.parse(iso || ''); if (!t) return '';
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'เมื่อสักครู่';
    if (s < 3600) return Math.round(s / 60) + ' นาทีที่แล้ว';
    if (s < 86400) return Math.round(s / 3600) + ' ชั่วโมงที่แล้ว';
    var d = new Date(t);
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  // "15 มีนาคม 2569", "15 มี.ค. 69", "15/03/2569", "2026-03-15" -> "2026-03-15"
  function isoDate(text) {
    var s = arabic(text).trim();
    if (!s) return '';
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s), d, mo, y;
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(s);
    if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else {
      m = /^(\d{1,2})\s*([^\s\d]+)\s*(\d{2,4})/.exec(s);
      if (!m) return '';
      d = +m[1]; y = +m[3];
      mo = MONTHS.indexOf(m[2]) + 1 || MONTHS_SHORT.indexOf(m[2]) + 1;
      if (!mo) return '';
    }
    if (y < 100) y += 2500;
    if (y > 2400) y -= 543;
    if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return '';
    return y + '-' + pad(mo) + '-' + pad(d);
  }
  // ปีงบประมาณ (พ.ศ.) ปัจจุบัน: เริ่ม 1 ตุลาคม
  function fiscalYear(d) { d = d || new Date(); return d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0); }
  function greeting() { var h = new Date().getHours(); return h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'; }
  function icon(name, cls) { return '<span class="material-symbols-outlined' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + name + '</span>'; }
  function fileSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function uid(prefix) { return (prefix || 'ID') + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }

  // ---------- การแจ้งเตือน ----------
  var toastBox = null;
  function toast(message, kind) {
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-lg';
      toastBox.setAttribute('role', 'status');
      toastBox.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastBox);
    }
    var tone = kind === 'error' ? 'bg-[#93000a] text-white' : kind === 'success' ? 'bg-[#0b1c30] text-white' : 'bg-[#213145] text-white';
    var ic = kind === 'error' ? 'error' : kind === 'success' ? 'check_circle' : 'info';
    var el = document.createElement('div');
    el.className = 'pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)] font-body-md text-body-md transition-all duration-300 opacity-0 translate-y-2 ' + tone;
    el.innerHTML = icon(ic, 'text-[20px] shrink-0') + '<span>' + esc(message) + '</span>';
    toastBox.appendChild(el);
    requestAnimationFrame(function () { el.classList.remove('opacity-0', 'translate-y-2'); });
    setTimeout(function () { el.classList.add('opacity-0'); setTimeout(function () { el.remove(); }, 300); }, kind === 'error' ? 6500 : 3800);
  }

  // ---------- หน้าต่างลอย ----------
  // modal({ title, subtitle, icon, size: sm|md|lg|xl, body: html|Node, actions: [{label, icon, kind, onClick(m)}], onClose })
  function modal(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'sk-modal fixed inset-0 z-[1500] flex items-end sm:items-center justify-center sm:p-4 bg-[rgba(11,28,48,0.35)] backdrop-blur-sm';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    var width = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl', xl: 'sm:max-w-6xl' }[opts.size || 'md'];
    wrap.innerHTML =
      '<div class="w-full ' + width + ' max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-white/95 glass shadow-[0_32px_64px_-16px_rgba(15,23,42,0.25)] ring-1 ring-white/80">' +
        '<div class="flex items-start gap-3 px-6 pt-5 pb-4">' +
          (opts.icon ? '<span class="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">' + icon(opts.icon, 'text-[22px]') + '</span>' : '') +
          '<div class="min-w-0 flex-1"><h2 class="font-headline-sm text-headline-sm font-semibold text-on-surface">' + esc(opts.title || '') + '</h2>' +
          (opts.subtitle ? '<p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
          '<button type="button" data-close class="icon-btn -mr-2" aria-label="ปิด">' + icon('close') + '</button>' +
        '</div>' +
        '<div data-body class="px-6 pb-5 overflow-y-auto"></div>' +
        '<div data-actions class="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-[rgba(100,116,139,0.12)]"></div>' +
      '</div>';
    var body = wrap.querySelector('[data-body]'), bar = wrap.querySelector('[data-actions]');
    if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    var actions = (opts.actions || []).filter(Boolean);
    if (!actions.length) bar.remove();
    var api = { el: wrap, body: body, close: close, closed: false };
    actions.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-glass';
      if (a.left) b.className += ' sm:mr-auto';
      b.innerHTML = (a.icon ? icon(a.icon) : '') + '<span>' + esc(a.label) + '</span>';
      b.addEventListener('click', function () { a.onClick ? a.onClick(api, b) : close(); });
      bar.appendChild(b);
    });
    function close() {
      if (api.closed) return;
      api.closed = true;
      document.removeEventListener('keydown', onKey);
      wrap.remove();
      if (!document.querySelector('.sk-modal')) document.body.classList.remove('overflow-hidden');
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape' && wrap === Array.prototype.slice.call(document.querySelectorAll('.sk-modal')).pop()) close(); }
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap && !opts.sticky) close(); });
    wrap.querySelector('[data-close]').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    document.body.classList.add('overflow-hidden');
    var first = body.querySelector('input:not([type=hidden]), select, textarea');
    setTimeout(function () { (first || wrap.querySelector('[data-close]')).focus(); }, 30);
    return api;
  }

  function confirmBox(message, okLabel, kind) {
    return new Promise(function (resolve) {
      var done = false;
      modal({
        title: 'ยืนยันการดำเนินการ', icon: kind === 'danger' ? 'warning' : 'help', size: 'sm', body: '<p class="font-body-lg text-body-lg">' + esc(message) + '</p>',
        onClose: function () { if (!done) resolve(false); },
        actions: [
          { label: 'ยกเลิก', onClick: function (m) { m.close(); } },
          { label: okLabel || 'ตกลง', kind: kind === 'danger' ? 'danger' : 'primary', onClick: function (m) { done = true; resolve(true); m.close(); } }
        ]
      });
    });
  }

  // แบบฟอร์มในหน้าต่างลอย: fields [{name,label,type,value,options:[[v,t]],required,placeholder,help,span}]
  // onSubmit(values, m) คืน true = ยังไม่ปิด / Promise
  function formModal(opts) {
    var form = document.createElement('form');
    form.noValidate = true;
    form.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    form.innerHTML = (opts.intro || '') + opts.fields.map(function (f) {
      var id = 'f-' + f.name, req = f.required ? ' <b class="text-error">*</b>' : '', input;
      if (f.type === 'select') {
        input = '<select id="' + id + '" name="' + f.name + '" class="input">' + f.options.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(f.value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select>';
      } else if (f.type === 'textarea') {
        input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 3) + '" class="input resize-y" placeholder="' + esc(f.placeholder || '') + '">' + esc(f.value || '') + '</textarea>';
      } else {
        input = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(f.value == null ? '' : f.value) + '" placeholder="' + esc(f.placeholder || '') + '" class="input"' +
          (f.type === 'password' ? ' autocomplete="' + (f.autocomplete || 'current-password') + '"' : '') + (f.autocomplete && f.type !== 'password' ? ' autocomplete="' + f.autocomplete + '"' : '') + '/>';
      }
      return '<label class="field' + (f.span === 2 || opts.size === 'sm' ? ' sm:col-span-2' : '') + '" for="' + id + '"><span>' + esc(f.label) + req + '</span>' + input +
        (f.help ? '<small class="font-body-sm text-body-sm text-outline">' + esc(f.help) + '</small>' : '') + '</label>';
    }).join('') + '<button type="submit" hidden></button>';
    var m = modal({
      title: opts.title, subtitle: opts.subtitle, icon: opts.icon, size: opts.size || 'md', body: form,
      actions: (opts.extraActions || []).concat([
        { label: 'ยกเลิก', onClick: function (mm) { mm.close(); } },
        { label: opts.submitLabel || 'บันทึก', icon: opts.submitIcon || 'save', kind: 'primary', onClick: function () { submit(); } }
      ])
    });
    var busy = false;
    function submit() {
      if (busy) return;
      var values = {}, missing = [];
      opts.fields.forEach(function (f) {
        var el = form.elements[f.name], v = el.value;
        if (f.type === 'number') v = v === '' ? null : Number(v); else v = String(v).trim();
        if (f.required && (v === '' || v === null)) missing.push(f.label);
        values[f.name] = v;
      });
      if (missing.length) return toast('กรุณากรอก: ' + missing.join(', '), 'error');
      busy = true;
      Promise.resolve(opts.onSubmit(values, m)).then(function (keep) { busy = false; if (keep !== true) m.close(); }, function (err) { busy = false; toast(err.message || String(err), 'error'); });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    return m;
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
  function download(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- ตัวเปลี่ยนหน้า ----------
  // หน้าลงทะเบียนด้วย SK.route('projects', { title, render(el, params) }) — ที่อยู่ #/projects/รหัส?ค้นหา=...
  var routes = {}, current = null;
  function route(name, def) { routes[name] = def; }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ''), q = '', i = h.indexOf('?');
    if (i >= 0) { q = h.slice(i + 1); h = h.slice(0, i); }
    var parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'overview', args: parts.slice(1), query: new URLSearchParams(q) };
  }
  function go(path) { location.hash = '#/' + path; }
  function render() {
    var r = parseHash(), def = routes[r.name] || routes.overview;
    var main = document.getElementById('view');
    if (current && current.leave) try { current.leave(); } catch (e) { console.warn(e); }
    current = def;
    main.innerHTML = '';
    document.querySelectorAll('#sidebar [data-nav]').forEach(function (a) { a.classList.toggle('is-active', a.dataset.nav === (def.nav || r.name)); });
    document.title = (def.title ? def.title + ' • ' : '') + 'กองช่าง เทศบาลตำบลสีแก้ว';
    window.scrollTo(0, 0);
    try { def.render(main, r); } catch (e) { console.error(e); main.innerHTML = '<div class="card card-pad text-error">' + esc(e.message) + '</div>'; }
  }
  function refresh() { if (current && current.refresh) current.refresh(); else render(); }

  Object.assign(SK, {
    esc: esc, arabic: arabic, num: num, money: money, moneyShort: moneyShort, todayIso: todayIso, dateLong: dateLong, dateShort: dateShort, dateFull: dateFull,
    timeAgo: timeAgo, isoDate: isoDate, fiscalYear: fiscalYear, greeting: greeting, icon: icon, fileSize: fileSize, uid: uid, MONTHS: MONTHS,
    toast: toast, modal: modal, confirm: confirmBox, formModal: formModal, pickFile: pickFile, download: download,
    route: route, go: go, render: render, refresh: refresh, parseHash: parseHash
  });
})();
