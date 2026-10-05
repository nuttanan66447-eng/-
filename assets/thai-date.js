// ปฏิทินเลือกวันที่ภาษาไทย (เดือนไทย ปี พ.ศ.) ใช้แทนปฏิทินของเบราว์เซอร์ทุกช่องวันที่ในเว็บ
// - ช่อง <input type="date"> ทุกช่อง: แสดงเป็น "15 มิถุนายน 2569" ค่าในฟอร์มยังเป็น 2026-06-15 เหมือนเดิม
// - SK.thaiDate.open(ปุ่ม, { value: 'YYYY-MM-DD', onPick: fn(iso) }) สำหรับช่องวันที่แบบข้อความ
(function () {
  'use strict';
  var SK = window.SK;
  var MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function toThai(v) { var d = parse(v); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543) : ''; }
  function fromThai(text) {
    var m = /^(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec(String(text || '').trim());
    var mo = m ? MONTHS.indexOf(m[2]) : -1;
    if (mo < 0) return '';
    var y = +m[3] - (+m[3] > 2400 ? 543 : 0);
    return y + '-' + pad(mo + 1) + '-' + pad(+m[1]);
  }

  var pop = null, state = null;
  function close() {
    if (!pop) return;
    pop.remove(); pop = null; state = null;
    document.removeEventListener('mousedown', outside, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', close);
  }
  function outside(e) { if (pop && !pop.contains(e.target) && e.target !== state.anchor && !state.anchor.contains(e.target)) close(); }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }

  function render() {
    var y = state.view.getFullYear(), m = state.view.getMonth();
    var first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
    var today = iso(new Date()), sel = state.value;
    var cells = '';
    for (var i = 0; i < 42; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), v = iso(d), out = d.getMonth() !== m;
      var cls = v === sel ? 'bg-primary text-on-primary font-bold' : v === today ? 'ring-2 ring-secondary-container text-primary font-bold' : out ? 'text-outline' : 'text-on-surface hover:bg-surface-container-high';
      cells += '<button type="button" data-day="' + v + '" class="h-9 rounded-lg text-sm ' + cls + (d.getDay() === 0 && v !== sel && !out ? ' text-error' : '') + '">' + d.getDate() + '</button>';
    }
    var years = '';
    for (var yy = y - 15; yy <= y + 10; yy++) years += '<option value="' + yy + '"' + (yy === y ? ' selected' : '') + '>' + (yy + 543) + '</option>';
    pop.innerHTML =
      '<div class="flex items-center gap-1 mb-2">' +
        '<button type="button" data-nav="-1" class="p-1.5 rounded-lg hover:bg-surface-container-high text-primary" aria-label="เดือนก่อนหน้า"><span class="material-symbols-outlined">chevron_left</span></button>' +
        '<select data-month class="flex-1 min-w-[110px] px-2 py-1.5 rounded-lg bg-surface-container-low font-semibold text-primary text-sm">' +
          MONTHS.map(function (n, i) { return '<option value="' + i + '"' + (i === m ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>' +
        '<select data-year class="w-[84px] px-2 py-1.5 rounded-lg bg-surface-container-low font-semibold text-primary text-sm">' + years + '</select>' +
        '<button type="button" data-nav="1" class="p-1.5 rounded-lg hover:bg-surface-container-high text-primary" aria-label="เดือนถัดไป"><span class="material-symbols-outlined">chevron_right</span></button>' +
      '</div>' +
      '<div class="grid grid-cols-7 gap-0.5 text-center">' +
        DAYS.map(function (n, i) { return '<span class="h-7 leading-7 text-xs font-bold ' + (i === 0 ? 'text-error' : 'text-on-surface-variant') + '">' + n + '</span>'; }).join('') + cells +
      '</div>' +
      '<div class="flex items-center justify-between mt-2 pt-2 border-t border-surface-container">' +
        '<button type="button" data-clear class="px-3 py-1.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high">ล้าง</button>' +
        '<span class="text-xs text-on-surface-variant">' + (sel ? toThai(sel) : 'ยังไม่ได้เลือก') + '</span>' +
        '<button type="button" data-today class="px-3 py-1.5 rounded-lg text-sm font-semibold text-primary hover:bg-surface-container-high">วันนี้</button>' +
      '</div>';
  }

  function place() {
    var r = state.anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    var top = r.bottom + 6 + h > window.innerHeight && r.top - 6 - h > 0 ? r.top - 6 - h : r.bottom + 6;
    pop.style.left = left + 'px'; pop.style.top = Math.max(8, top) + 'px';
  }

  function open(anchor, opts) {
    close();
    opts = opts || {};
    state = { anchor: anchor, value: opts.value || '', onPick: opts.onPick || function () {}, view: parse(opts.value) || new Date() };
    state.view = new Date(state.view.getFullYear(), state.view.getMonth(), 1);
    pop = document.createElement('div');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'เลือกวันที่');
    pop.className = 'sk-thaidate fixed z-[1150] w-[300px] p-3 rounded-xl bg-surface-container-lowest shadow-2xl ring-1 ring-surface-container font-body-md';
    document.body.appendChild(pop);
    render(); place();
    pop.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.nav) { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + Number(b.dataset.nav), 1); render(); return; }
      var pick = b.dataset.day || (b.hasAttribute('data-today') ? iso(new Date()) : b.hasAttribute('data-clear') ? '' : null);
      if (pick === null) return;
      var fn = state.onPick;
      close();
      fn(pick);
    });
    pop.addEventListener('change', function (e) {
      if (e.target.matches('[data-month]')) state.view = new Date(state.view.getFullYear(), +e.target.value, 1);
      if (e.target.matches('[data-year]')) state.view = new Date(+e.target.value, state.view.getMonth(), 1);
      render();
    });
    setTimeout(function () {
      document.addEventListener('mousedown', outside, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', close);
    }, 0);
  }

  // ---------- แปลง <input type="date"> ทุกช่องเป็นปฏิทินภาษาไทย ----------
  var nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  function enhance(input) {
    if (input.__thai || input.type !== 'date') return;
    input.__thai = true;
    var shown = document.createElement('button');
    shown.type = 'button';
    shown.className = (input.className || '') + ' sk-thaidate-field text-left flex items-center justify-between gap-2';
    shown.setAttribute('aria-label', (input.getAttribute('aria-label') || 'เลือกวันที่'));
    if (input.id) { shown.id = input.id + '-thai'; var lab = document.querySelector('label[for="' + input.id + '"]'); if (lab) lab.htmlFor = shown.id; }
    function sync() {
      var v = nativeValue.get.call(input);
      shown.innerHTML = '<span class="' + (v ? '' : 'text-outline') + '">' + (v ? toThai(v) : 'เลือกวันที่') + '</span><span class="material-symbols-outlined text-[18px] text-primary">calendar_month</span>';
    }
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: function () { return nativeValue.get.call(this); },
      set: function (v) { nativeValue.set.call(this, v); sync(); }
    });
    input.style.display = 'none';
    input.insertAdjacentElement('afterend', shown);
    shown.addEventListener('click', function () {
      open(shown, { value: input.value, onPick: function (v) {
        if (!v && input.required) return;
        input.value = v;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } });
    });
    input.addEventListener('invalid', function () {
      shown.classList.add('ring-2', 'ring-error');
      if (SK.ui) SK.ui.toast('กรุณาเลือกวันที่', 'error');
    });
    input.addEventListener('change', function () { shown.classList.remove('ring-2', 'ring-error'); });
    sync();
  }
  function scan(root) {
    if (root.matches && root.matches('input[type=date]')) enhance(root);
    if (root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll('input[type=date]'), enhance);
  }
  function start() {
    scan(document.body);
    new MutationObserver(function (list) {
      list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  SK.thaiDate = { open: open, close: close, toThai: toThai, fromThai: fromThai };
})();
