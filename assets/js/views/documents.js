// พิมพ์เอกสารราชการ (Smart Editor) ตามแบบ design/document-editor.png
// เลือกแบบเอกสาร + โครงการ -> กรอกในแบบฟอร์มของระบบหลัก -> สร้าง -> แก้ไขข้อความ/พิมพ์/บันทึก Word (บันทึกประวัติอัตโนมัติ)
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var el = null, st = { project: '', village: '', year: '', source: '', doc: '', phase: 'pick', html: '', entry: null, q: '' }, ed = null, busy = false;

  function E() { return SK.engine; }
  function project() { return st.project ? SK.projects.byId(st.project) : null; }
  function doc() { return st.doc ? E().doc(st.doc) : null; }

  function render(root, r) {
    el = root;
    var q = r.query, wantDoc = q.get('doc') || '', wantProject = q.get('project') || '';
    if (wantProject) st.project = wantProject;
    if (wantDoc && E().doc(wantDoc)) { st.doc = wantDoc; st.phase = 'form'; }
    else if (!wantDoc) { st.phase = 'pick'; st.doc = ''; }
    root.innerHTML =
      '<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">' +
        '<div class="flex items-center gap-3 min-w-0"><span class="w-11 h-11 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(0,97,148,0.35)]">' + icon('description', 'text-[22px]') + '</span>' +
          '<div class="min-w-0"><h1 class="font-headline-md text-headline-md font-semibold flex flex-wrap items-center gap-2">Smart Editor • เอกสารราชการ <span class="chip-blue">รูปแบบตามระบบหลัก</span></h1>' +
          '<p id="dc-sub" class="font-body-sm text-body-sm text-outline truncate"></p></div></div>' +
        '<div id="dc-actions" class="flex flex-wrap gap-2"></div>' +
      '</div>' +
      '<div id="dc-side" class="mb-gutter"></div>' +
      '<div id="dc-top" class="grid grid-cols-1 lg:grid-cols-2 gap-gutter mb-gutter items-stretch"></div>' +
      '<div id="dc-main" class="min-w-0"></div>';
    main();
    side();
  }
  function sub() {
    var d = doc(), p = project();
    el.querySelector('#dc-sub').textContent = (d ? 'แฟ้มงาน: ' + d.title : 'เลือกแบบเอกสาร') + (p ? ' • ' + p.id + ' ' + p.name : d && d.general ? ' • เอกสารทั่วไป (ไม่ผูกโครงการ)' : '');
  }

  // ---------- ส่วนหลัก ----------
  function main() {
    var box = el.querySelector('#dc-main'), acts = el.querySelector('#dc-actions');
    if (ed) { ed.leave(); ed = null; }
    E().undock();
    sub();
    // กรอกฟอร์ม: ใช้ความกว้างเต็มหน้า (แถบข้อมูลย้ายไปด้านล่าง) ให้ตารางในฟอร์มไม่ต้องเลื่อนซ้ายขวา
    if (st.phase === 'preview') {
      acts.innerHTML = '<button type="button" data-dc="pick" class="btn-ghost">' + icon('apps') + '<span>เลือกแบบอื่น</span></button>';
      ed = SK.docs.editor(box, { doc: doc(), project: project(), html: st.html, entry: st.entry, onBack: function () { st.phase = 'form'; main(); redock(); } });
      return;
    }
    if (st.phase === 'form') {
      var d = doc(), p = project();
      acts.innerHTML = '<button type="button" data-dc="pick" class="btn-ghost">' + icon('arrow_back') + '<span>เลือกแบบเอกสาร</span></button>' +
        '<button type="button" data-dc="build" class="btn-primary">' + icon('auto_awesome') + '<span>สร้างเอกสาร</span></button>';
      if (!d.general && !p) {
        box.innerHTML = '<section class="card card-pad"><h2 class="card-title mb-2">' + icon(d.icon) + esc(d.title) + '</h2><p class="muted mb-4">เอกสารนี้ใช้ข้อมูลโครงการ — เลือกโครงการก่อน</p>' + picker() + '</section>';
        bindPicker(box);
        return;
      }
      box.innerHTML = '<div class="card p-3"><div class="flex flex-wrap items-center gap-2 px-2 pb-3">' +
          '<span class="tabs"><span class="tab is-active">' + icon(d.icon, 'text-[16px] align-middle') + ' แบบฟอร์ม</span><span class="tab">' + esc(d.group) + '</span></span>' +
          '<span class="flex-1"></span><span class="font-body-sm text-body-sm text-outline">กรอกข้อมูลในแบบฟอร์มของระบบหลักด้านล่าง แล้วกด <b class="text-primary">สร้างเอกสาร</b></span></div>' +
        '<div id="dc-holder" class="relative rounded-[20px] bg-surface-container-low" style="height:480px">' +
          '<div id="dc-wait" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant">' + icon('progress_activity', 'animate-spin text-primary text-[32px]') + '<span>กำลังเปิดแบบฟอร์มของระบบหลัก...</span></div></div></div>';
      var holder = box.querySelector('#dc-holder');
      E().openDoc(d, p ? p.rowNumber : null, holder, { autoHeight: true }).then(function () {
        var w = box.querySelector('#dc-wait'); if (w) w.remove();
      }).catch(function (err) {
        holder.innerHTML = '<div class="p-6">' + V.empty('error', 'เปิดแบบฟอร์มไม่สำเร็จ', esc(err.message || err)) + '</div>';
      });
      return;
    }
    // เลือกแบบเอกสาร: รายการแบบทั้งหมดอยู่ในเมนูด้านซ้าย (ใต้ "พิมพ์เอกสารราชการ")
    acts.innerHTML = '<a href="#/tools" class="btn-glass">' + icon('construction') + '<span>เครื่องมือระบบหลัก</span></a>';
    box.innerHTML = '<section class="card card-pad mb-gutter"><h2 class="card-title mb-1">' + icon('folder_shared') + 'โครงการ</h2><p class="muted font-body-sm text-body-sm mb-4">เลือกโครงการเพื่อเติมข้อมูลในเอกสารอัตโนมัติ (เอกสารงานอาคาร/บุคลากรไม่ต้องเลือก)</p>' + picker() + '</section>' +
      '<section class="card card-pad flex items-start gap-4"><span class="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">' + icon('menu_open', 'text-[26px]') + '</span>' +
        '<div><h2 class="font-headline-sm text-headline-sm font-semibold">เลือกแบบเอกสารจากเมนูด้านซ้าย</h2><p class="muted mt-1">แบบเอกสารสำเร็จรูปทั้ง ' + E().DOCS.length + ' แบบ อยู่ใต้เมนู <b class="text-primary">พิมพ์เอกสารราชการ</b> แบ่งตามหมวด — กดชื่อเอกสารเพื่อเปิดแบบฟอร์มของโครงการที่เลือก</p>' +
        '<button type="button" data-dc="menu" class="btn-glass mt-3 lg:hidden">' + icon('menu') + '<span>เปิดเมนูแบบเอกสาร</span></button></div></section>';
    bindPicker(box);
  }
  // ตัวกรองโครงการ: หมู่บ้าน ปีงบประมาณ ประเภทเงิน
  function sources() {
    var m = {};
    SK.projects.list.forEach(function (p) { if (p.source) m[p.source] = 1; });
    return Object.keys(m).sort();
  }
  function picker() {
    var list = SK.projects.list.filter(function (p) {
      return (!st.village || p.villageNo === st.village) && (!st.year || String(p.year) === String(st.year)) && (!st.source || p.source === st.source);
    });
    if (st.project && !list.some(function (p) { return p.id === st.project; })) { var cur = SK.projects.byId(st.project); if (cur) list.unshift(cur); }
    return '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">' +
      '<label class="field"><span>ปีงบประมาณ</span><select id="dc-year" class="input">' + V.yearOptions(st.year) + '</select></label>' +
      '<label class="field"><span>ประเภทเงิน</span><select id="dc-source" class="input">' + V.options(sources().map(function (x) { return [x, x]; }), st.source, 'ทุกประเภทเงิน') + '</select></label>' +
      '<label class="field"><span>หมู่บ้าน</span><select id="dc-village" class="input">' + V.villageOptions(st.village) + '</select></label></div>' +
      '<label class="field"><span>โครงการ</span><select id="dc-project" class="input">' + V.projectOptions(st.project, list).replace('— เลือกโครงการ —', SK.projects.loaded ? (list.length ? '— เลือกโครงการ (' + list.length + ') —' : 'ไม่มีโครงการตามตัวกรอง') : 'กำลังโหลด...') + '</select></label>';
  }
  function bindPicker(box) {
    [['dc-village', 'village'], ['dc-year', 'year'], ['dc-source', 'source']].forEach(function (x) {
      var el2 = box.querySelector('#' + x[0]);
      if (el2) el2.addEventListener('change', function () { st[x[1]] = el2.value; main(); side(); });
    });
    var p = box.querySelector('#dc-project');
    if (p) p.addEventListener('change', function () { st.project = p.value; setUrl(); main(); side(); });
  }
  function setUrl() {
    var q = [];
    if (st.project) q.push('project=' + st.project);
    if (st.doc && st.phase !== 'pick') q.push('doc=' + st.doc);
    history.replaceState(null, '', '#/documents' + (q.length ? '?' + q.join('&') : ''));
  }
  function redock() {
    var holder = el.querySelector('#dc-holder');
    if (holder && E().lastDockWrap) { E().dock(holder, { wrap: E().lastDockWrap, keepActions: doc() && doc().keepActions, autoHeight: true }); var w = holder.querySelector('#dc-wait'); if (w) w.remove(); }
  }

  function build(btn) {
    var d = doc(); if (!d || busy) return;
    var p = project();
    if (!d.general && !p) return SK.toast('เลือกโครงการก่อน', 'error');
    busy = true;
    var old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = icon('progress_activity', 'animate-spin') + '<span>กำลังสร้างเอกสาร...</span>';
    E().generate(d).then(function (html) {
      st.html = html;
      st.phase = 'preview';
      st.entry = SK.docs.saveHistory(d, p, html, null);
      main();
      st.entry.then(function () { side(); });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (err) {
      SK.toast(err.message || String(err), 'error');
      redock();
    }).then(function () { busy = false; if (document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = old; } });
  }

  // ---------- แถบขวา ----------
  function side() {
    var top = el.querySelector('#dc-top'), box = el.querySelector('#dc-side'); if (!box) return;
    var p = project(), d = doc();
    var hist = SK.docs.list().filter(function (x) { return (!p || x.projectId === p.id) && (!d || x.docKey === d.key); }).slice(0, 20);
    top.innerHTML =
      '<section class="card card-pad"><div class="flex items-center justify-between mb-3"><h2 class="card-title">' + icon('tune') + 'การตั้งค่าหน้ากระดาษ</h2><span class="chip-gray">ระบบหลัก</span></div>' +
        '<div class="grid grid-cols-2 gap-3"><div class="p-3 rounded-[18px] bg-surface-container-low/70"><span class="block font-label-sm text-label-sm text-outline">ขนาดกระดาษ</span><b class="font-label-lg text-label-lg">A4 แนวตั้ง</b><span class="block font-body-sm text-body-sm text-outline">210 × 297 มม.</span></div>' +
        '<div class="p-3 rounded-[18px] bg-surface-container-low/70"><span class="block font-label-sm text-label-sm text-outline">รูปแบบหนังสือ</span><b class="font-label-lg text-label-lg">ตามระบบหลัก</b><span class="block font-body-sm text-body-sm text-outline">TH Sarabun PSK</span></div></div>' +
        '<p class="mt-3 font-body-sm text-body-sm text-outline">หนังสือราชการทุกฉบับใช้รูปแบบเดียวกับระบบหลัก — พิมพ์/PDF/Word ได้จากหน้าเอกสาร</p></section>' +
      (p ? '<section class="card card-pad bg-gradient-to-br from-primary-fixed/50 to-white"><div class="flex flex-wrap items-center gap-3 mb-3"><span class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center">' + icon('link') + '</span>' +
          '<div class="min-w-0 flex-1"><h2 class="font-label-lg text-label-lg font-semibold">ข้อมูลโครงการที่เชื่อมกับเอกสาร</h2><p class="font-body-sm text-body-sm text-outline">เติมในแบบฟอร์มอัตโนมัติ</p></div>' +
          '<a href="#/project/' + p.id + '" class="btn-glass !py-1.5">' + icon('open_in_new') + '<span>หน้าโครงการ</span></a><a href="#/entry/' + p.id + '" class="btn-primary !py-1.5">' + icon('edit') + '<span>แก้ไขข้อมูล</span></a></div>' +
          '<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5 p-3 rounded-[18px] bg-white/80 font-body-sm text-body-sm">' +
            [['รหัสโครงการ', p.id], ['ค่างาน', '฿ ' + SK.money(p.budget, 2)], ['ผู้รับจ้าง', p.contractor || '-'], ['ผู้ควบคุมงาน', p.supervisor || '-'], ['สัญญา', (p.contractNo || '-') + (p.end ? ' • สิ้นสุด ' + SK.dateShort(p.end) : '')], ['ปีงบประมาณ', (p.year || '-') + (p.source ? ' • ' + p.source : '')]].map(function (r) {
              return '<div class="flex justify-between gap-3"><dt class="text-outline whitespace-nowrap">' + r[0] + '</dt><dd class="font-semibold text-right">' + esc(r[1]) + '</dd></div>';
            }).join('') + '</dl></section>'
        : '<section class="card card-pad flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-surface-container-low text-primary flex items-center justify-center">' + icon('link_off') + '</span><div><h2 class="font-label-lg text-label-lg font-semibold">ยังไม่ได้เลือกโครงการ</h2><p class="font-body-sm text-body-sm text-outline">เลือกโครงการเพื่อเติมข้อมูลในแบบฟอร์มอัตโนมัติ</p></div></section>');
    // ประวัติเอกสาร: ด้านบน พับเก็บได้ (จำสถานะไว้)
    var open = histOpen();
    box.innerHTML = '<details class="card group"' + (open ? ' open' : '') + '><summary class="list-none cursor-pointer card-pad flex items-center gap-3 select-none">' +
        '<h2 class="card-title flex-1">' + icon('history') + 'ประวัติเอกสาร <span class="chip-blue">' + hist.length + (hist.length >= 20 ? '+' : '') + '</span><span class="chip-gray">' + (p ? p.id : 'ทุกโครงการ') + (d ? ' • ' + esc(d.title) : '') + '</span></h2>' +
        '<span class="font-label-md text-label-md text-primary">' + (open ? 'พับเก็บ' : 'แสดง') + '</span>' + icon('expand_more', 'text-primary transition-transform group-open:rotate-180') + '</summary>' +
        '<div class="px-5 md:px-space-lg pb-5 -mt-2 max-h-[420px] overflow-y-auto">' + SK.docs.historyList(hist, { remove: true, timeline: false, empty: 'ยังไม่มีเอกสาร' + (d ? 'แบบนี้' : '') + (p ? 'ของโครงการนี้' : '') }) + '</div></details>';
    box.querySelector('details').addEventListener('toggle', function () { histOpen(this.open); var lab = this.querySelector('summary > span.font-label-md'); if (lab) lab.textContent = this.open ? 'พับเก็บ' : 'แสดง'; });
    if (SK.markDocMenu) SK.markDocMenu();
  }
  function histOpen(v) {
    try { if (v === undefined) return localStorage.getItem('sk-doc-hist') !== '0'; localStorage.setItem('sk-doc-hist', v ? '1' : '0'); } catch (e) { return true; }
  }
  function groups() {
    var out = [];
    E().DOCS.forEach(function (d) { if (out.indexOf(d.group) < 0) out.push(d.group); });
    return out;
  }

  document.addEventListener('click', function (e) {
    if (!el || !document.body.contains(el) || !el.querySelector('#dc-main')) return;
    var b = e.target.closest('[data-doc]');
    if (b && el.contains(b)) {
      if (busy) return;
      st.doc = b.dataset.doc; st.phase = 'form'; st.html = ''; st.entry = null;
      setUrl(); main(); side(); window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var a = e.target.closest('[data-dc]');
    if (!a || !el.contains(a)) return;
    if (a.dataset.dc === 'menu') { var mb = document.getElementById('menu-btn'); if (mb) mb.click(); return; }
    if (a.dataset.dc === 'pick') { if (busy) return; st.phase = 'pick'; st.doc = ''; setUrl(); main(); side(); }
    else if (a.dataset.dc === 'build') build(a);
  });
  window.addEventListener('sk:documents', function () { if (el && document.body.contains(el) && el.querySelector('#dc-side')) side(); });

  SK.documentsState = function () { return { project: st.project, doc: st.phase === 'pick' ? '' : st.doc }; };
  SK.route('documents', {
    title: 'พิมพ์เอกสารราชการ', render: render,
    // ข้อมูลโครงการเปลี่ยน: ปรับเฉพาะส่วนที่ไม่กระทบแบบฟอร์มที่กำลังกรอก
    refresh: function () { if (!el || !document.body.contains(el)) return; side(); if (st.phase === 'pick' || (st.phase === 'form' && !el.querySelector('#dc-holder'))) main(); else sub(); },
    leave: function () { if (ed) { ed.leave(); ed = null; } E().undock(); E().closeAll(); }
  });
})();
