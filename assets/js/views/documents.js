// พิมพ์เอกสารราชการ (Smart Editor) ตามแบบ design/document-editor.png
// เลือกแบบเอกสาร + โครงการ -> กรอกในแบบฟอร์มของระบบหลัก -> สร้าง -> แก้ไขข้อความ/พิมพ์/บันทึก Word (บันทึกประวัติอัตโนมัติ)
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var el = null, st = { project: '', village: '', doc: '', phase: 'pick', html: '', entry: null, q: '' }, ed = null, busy = false;

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
      '<div class="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">' +
        '<div id="dc-main" class="xl:col-span-8 min-w-0"></div>' +
        '<aside id="dc-side" class="xl:col-span-4 flex flex-col gap-gutter"></aside>' +
      '</div>';
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
        '<div id="dc-holder" class="relative rounded-[20px] bg-surface-container-low" style="height:calc(100vh - 250px);min-height:480px">' +
          '<div id="dc-wait" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant">' + icon('progress_activity', 'animate-spin text-primary text-[32px]') + '<span>กำลังเปิดแบบฟอร์มของระบบหลัก...</span></div></div></div>';
      var holder = box.querySelector('#dc-holder');
      E().openDoc(d, p ? p.rowNumber : null, holder).then(function () {
        var w = box.querySelector('#dc-wait'); if (w) w.remove();
      }).catch(function (err) {
        holder.innerHTML = '<div class="p-6">' + V.empty('error', 'เปิดแบบฟอร์มไม่สำเร็จ', esc(err.message || err)) + '</div>';
      });
      return;
    }
    // เลือกแบบเอกสาร
    acts.innerHTML = '<a href="#/tools" class="btn-glass">' + icon('construction') + '<span>เครื่องมือระบบหลัก</span></a>';
    var groups = [];
    E().DOCS.forEach(function (d) { if (groups.indexOf(d.group) < 0) groups.push(d.group); });
    var ql = st.q.trim().toLowerCase();
    box.innerHTML = '<section class="card card-pad mb-gutter"><h2 class="card-title mb-1">' + icon('folder_shared') + 'โครงการ</h2><p class="muted font-body-sm text-body-sm mb-4">เลือกโครงการเพื่อเติมข้อมูลในเอกสารอัตโนมัติ (เอกสารงานอาคาร/บุคลากรไม่ต้องเลือก)</p>' + picker() + '</section>' +
      '<section class="card card-pad"><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><h2 class="card-title">' + icon('dashboard_customize') + 'แบบเอกสารสำเร็จรูป (' + E().DOCS.length + ')</h2>' +
        '<label class="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low sm:w-72">' + icon('search', 'text-outline text-[18px]') + '<span class="sr-only">ค้นหาแบบเอกสาร</span><input id="dc-q" type="search" value="' + esc(st.q) + '" placeholder="ค้นหาแบบเอกสาร..." class="bg-transparent outline-none w-full font-body-sm text-body-sm"/></label></div>' +
        groups.map(function (g) {
          var items = E().DOCS.filter(function (d) { return d.group === g && (!ql || (d.title + ' ' + d.desc).toLowerCase().indexOf(ql) >= 0); });
          if (!items.length) return '';
          return '<h3 class="font-label-lg text-label-lg text-outline mt-5 mb-2 first:mt-0">' + esc(g) + '</h3><div class="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">' + items.map(function (d) {
            return '<button type="button" data-doc="' + d.key + '" class="group text-left flex items-start gap-3 p-4 rounded-[22px] bg-surface-container-low/70 hover:bg-white hover:shadow-md ring-1 ring-transparent hover:ring-[rgba(15,23,42,0.06)] transition-all">' +
              '<span class="w-10 h-10 shrink-0 rounded-xl bg-white text-primary flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-on-primary transition-colors">' + icon(d.icon) + '</span>' +
              '<span class="min-w-0 flex-1"><span class="block font-label-lg text-label-lg font-semibold leading-snug">' + esc(d.title) + '</span><span class="block font-body-sm text-body-sm text-outline mt-0.5">' + esc(d.desc) + '</span>' +
              (d.general ? '<span class="chip-gray mt-2">ไม่ผูกโครงการ</span>' : '') + '</span>' + icon('chevron_right', 'text-outline mt-2') + '</button>';
          }).join('') + '</div>';
        }).join('') + '</section>';
    bindPicker(box);
    var q = box.querySelector('#dc-q');
    q.addEventListener('input', function () { st.q = q.value; var pos = q.selectionStart; main(); var n = el.querySelector('#dc-q'); n.focus(); n.setSelectionRange(pos, pos); });
  }
  function picker() {
    var list = SK.projects.list.filter(function (p) { return !st.village || p.villageNo === st.village; });
    return '<div class="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">' +
      '<label class="field"><span>หมู่บ้าน</span><select id="dc-village" class="input">' + V.villageOptions(st.village) + '</select></label>' +
      '<label class="field"><span>โครงการ</span><select id="dc-project" class="input">' + V.projectOptions(st.project, list).replace('— เลือกโครงการ —', SK.projects.loaded ? (list.length ? '— เลือกโครงการ (' + list.length + ') —' : 'ไม่มีโครงการ') : 'กำลังโหลด...') + '</select></label></div>';
  }
  function bindPicker(box) {
    var v = box.querySelector('#dc-village'), p = box.querySelector('#dc-project');
    if (v) v.addEventListener('change', function () { st.village = v.value; st.project = ''; main(); side(); });
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
    if (holder && E().lastDockWrap) { E().dock(holder, { wrap: E().lastDockWrap, keepActions: doc() && doc().keepActions }); var w = holder.querySelector('#dc-wait'); if (w) w.remove(); }
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
    var box = el.querySelector('#dc-side'); if (!box) return;
    var p = project(), d = doc();
    var hist = SK.docs.list().filter(function (x) { return (!p || x.projectId === p.id) && (!d || x.docKey === d.key); }).slice(0, 6);
    box.innerHTML =
      '<section class="card card-pad"><div class="flex items-center justify-between mb-3"><h2 class="card-title">' + icon('tune') + 'การตั้งค่าหน้ากระดาษ</h2><span class="chip-gray">ระบบหลัก</span></div>' +
        '<div class="grid grid-cols-2 gap-3"><div class="p-3 rounded-[18px] bg-surface-container-low/70"><span class="block font-label-sm text-label-sm text-outline">ขนาดกระดาษ</span><b class="font-label-lg text-label-lg">A4 แนวตั้ง</b><span class="block font-body-sm text-body-sm text-outline">210 × 297 มม.</span></div>' +
        '<div class="p-3 rounded-[18px] bg-surface-container-low/70"><span class="block font-label-sm text-label-sm text-outline">รูปแบบหนังสือ</span><b class="font-label-lg text-label-lg">ตามระบบหลัก</b><span class="block font-body-sm text-body-sm text-outline">TH Sarabun PSK</span></div></div>' +
        '<p class="mt-3 font-body-sm text-body-sm text-outline">หนังสือราชการทุกฉบับใช้รูปแบบเดียวกับระบบหลัก — พิมพ์/PDF/Word ได้จากหน้าเอกสาร</p></section>' +
      '<section class="card card-pad"><div class="flex items-center justify-between mb-3"><h2 class="card-title">' + icon('inventory_2') + 'แบบฟอร์มสำเร็จรูป</h2><button type="button" data-dc="pick" class="font-label-md text-label-md text-primary font-semibold hover:underline">ดูทั้งหมด</button></div>' +
        '<div class="flex flex-col gap-2">' + quick().map(function (k) {
          var x = E().doc(k), on = st.doc === k && st.phase !== 'pick';
          return '<button type="button" data-doc="' + k + '" class="flex items-center gap-3 p-3 rounded-[20px] text-left transition-colors ' + (on ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-surface-container-low/70 hover:bg-surface-container') + '">' +
            '<span class="w-9 h-9 shrink-0 rounded-full ' + (on ? 'bg-primary text-on-primary' : 'bg-white text-primary') + ' flex items-center justify-center">' + icon(x.icon, 'text-[19px]') + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block font-label-lg text-label-lg font-semibold truncate">' + esc(x.title) + '</span><span class="block font-body-sm text-body-sm text-outline truncate">' + esc(x.desc) + '</span></span>' + icon(on ? 'check_circle' : 'chevron_right', on ? 'text-primary' : 'text-outline') + '</button>';
        }).join('') + '</div></section>' +
      (p ? '<section class="card card-pad bg-gradient-to-br from-primary-fixed/50 to-white"><div class="flex items-center gap-3 mb-3"><span class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center">' + icon('link') + '</span>' +
          '<div class="min-w-0"><h2 class="font-label-lg text-label-lg font-semibold">ข้อมูลโครงการที่เชื่อมกับเอกสาร</h2><p class="font-body-sm text-body-sm text-outline">เติมในแบบฟอร์มอัตโนมัติ</p></div></div>' +
          '<dl class="flex flex-col gap-1.5 p-3 rounded-[18px] bg-white/80 font-body-sm text-body-sm">' +
            [['รหัสโครงการ', p.id], ['ค่างาน', '฿ ' + SK.money(p.budget, 2)], ['ผู้รับจ้าง', p.contractor || '-'], ['ผู้ควบคุมงาน', p.supervisor || '-'], ['สัญญา', (p.contractNo || '-') + (p.end ? ' • สิ้นสุด ' + SK.dateShort(p.end) : '')]].map(function (r) {
              return '<div class="flex justify-between gap-3"><dt class="text-outline whitespace-nowrap">' + r[0] + '</dt><dd class="font-semibold text-right">' + esc(r[1]) + '</dd></div>';
            }).join('') + '</dl>' +
          '<div class="flex gap-2 mt-3"><a href="#/project/' + p.id + '" class="btn-glass flex-1">' + icon('open_in_new') + '<span>หน้าโครงการ</span></a><a href="#/entry/' + p.id + '" class="btn-primary flex-1">' + icon('edit') + '<span>แก้ไขข้อมูล</span></a></div></section>' : '') +
      '<section class="card card-pad"><div class="flex items-center justify-between mb-3"><h2 class="card-title">' + icon('history') + 'ประวัติเอกสาร</h2><span class="chip-gray">' + (p ? p.id : 'ทั้งหมด') + '</span></div>' +
        SK.docs.historyList(hist, { remove: true, empty: 'ยังไม่มีเอกสาร' + (d ? 'แบบนี้' : '') + (p ? 'ของโครงการนี้' : '') }) + '</section>';
  }
  function quick() {
    var keys = ['combined', 'memo', 'completion', 'centralPrice', 'testResult'];
    if (st.doc && keys.indexOf(st.doc) < 0) keys.unshift(st.doc);
    return keys.slice(0, 5);
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
    if (a.dataset.dc === 'pick') { if (busy) return; st.phase = 'pick'; st.doc = ''; setUrl(); main(); side(); }
    else if (a.dataset.dc === 'build') build(a);
  });
  window.addEventListener('sk:documents', function () { if (el && document.body.contains(el) && el.querySelector('#dc-side')) side(); });

  SK.route('documents', {
    title: 'พิมพ์เอกสารราชการ', render: render,
    // ข้อมูลโครงการเปลี่ยน: ปรับเฉพาะส่วนที่ไม่กระทบแบบฟอร์มที่กำลังกรอก
    refresh: function () { if (!el || !document.body.contains(el)) return; side(); if (st.phase === 'pick' || (st.phase === 'form' && !el.querySelector('#dc-holder'))) main(); else sub(); },
    leave: function () { if (ed) { ed.leave(); ed = null; } E().undock(); E().closeAll(); }
  });
})();
