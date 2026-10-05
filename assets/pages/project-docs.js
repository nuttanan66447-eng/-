// หน้าเอกสารโครงการ (project-docs.html?id=รหัสโครงการ): เลือกโครงการ -> เลือกเอกสาร -> กรอก/พรีวิว/พิมพ์/Word
// พร้อมประวัติเอกสารที่เคยสร้างของโครงการนั้น
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, esc = ui.esc;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var VKEY = 'sikaew-progress-village', PKEY = 'sikaew-docs-project';
  var projectId = params.get('id') || store(PKEY) || '';

  function store(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch (e) { return ''; }
  }
  function projects() { return SK.db.data.projects; }
  function project() {
    var p = SK.db.project(projectId);
    if (!p && projects().length) { p = projects()[0]; projectId = p.id; }
    return p;
  }

  // ---------- ตัวเลือกหมู่บ้าน/โครงการ ----------
  function renderPickers(p) {
    var counts = {};
    projects().forEach(function (x) { counts[x.village] = (counts[x.village] || 0) + 1; });
    var keys = Object.keys(counts).sort(function (a, b) { return (parseInt(a.slice(1), 10) || 99) - (parseInt(b.slice(1), 10) || 99); });
    var v = store(VKEY);
    if (v && !counts[v]) v = '';
    $('pd-village').innerHTML = '<option value="">ทุกหมู่บ้าน (' + projects().length + ')</option>' + keys.map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === v ? ' selected' : '') + '>' + esc(ui.villageName(k)) + ' (' + counts[k] + ')</option>';
    }).join('');
    fillProjects(p);
  }
  function fillProjects(p) {
    var v = $('pd-village').value;
    var list = projects().filter(function (x) { return !v || x.village === v; });
    var inList = p && list.some(function (x) { return x.id === p.id; });
    $('pd-project').innerHTML = (inList ? '' : '<option value="" selected>— เลือกโครงการ (' + list.length + ') —</option>') + list.map(function (x) {
      return '<option value="' + esc(x.id) + '"' + (p && x.id === p.id ? ' selected' : '') + '>' + esc(x.id + ' • ' + x.name) + '</option>';
    }).join('');
  }

  function renderSummary(p) {
    $('pd-summary').innerHTML = '<div class="flex flex-wrap items-center gap-x-space-lg gap-y-2 p-space-sm rounded-lg bg-surface-container-low font-body-sm text-body-sm">' +
      '<span class="font-headline-sm text-headline-sm text-on-surface font-semibold min-w-0">' + esc(p.name) + '</span>' + ui.statusBadge(p) +
      '<span class="text-on-surface-variant">' + esc(ui.villageName(p.village)) + '</span>' +
      '<span class="text-on-surface-variant">สัญญา ' + esc(p.contractNo || '-') + '</span>' +
      '<span class="text-on-surface-variant">ผู้รับจ้าง ' + esc(p.contractor || '-') + '</span>' +
      '<a href="progress.html?id=' + encodeURIComponent(p.id) + '" class="ml-auto inline-flex items-center gap-1 text-primary font-semibold hover:underline"><span class="material-symbols-outlined text-[18px]">construction</span>ติดตามความก้าวหน้า</a></div>';
  }

  // ---------- ปุ่มเอกสาร (จัดกลุ่มตามระบบเอกสารเดิม) ----------
  function renderDocs(p) {
    var box = $('project-docs');
    if (!p.rowNumber || !SK.docEngine) {
      box.innerHTML = '<div class="p-space-md rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex flex-wrap items-center justify-between gap-2">' +
        '<span>การพิมพ์เอกสารโครงการต้องใช้ข้อมูลจริงจาก Google Sheet</span>' +
        '<button type="button" data-action="data-panel" class="' + ui.btnClass('primary') + '">นำเข้าข้อมูลจริง</button></div>';
      return;
    }
    var groups = [];
    SK.docEngine.DOCS.forEach(function (d) {
      var name = d.general ? 'เอกสารทั่วไป (ไม่ผูกกับโครงการ)' : d.group;
      var g = groups.filter(function (x) { return x.name === name; })[0];
      if (!g) groups.push(g = { name: name, docs: [] });
      g.docs.push(d);
    });
    box.innerHTML = groups.map(function (g) {
      return '<div class="mb-space-md last:mb-0"><h4 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-space-xs">' + esc(g.name) + '</h4>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">' + g.docs.map(function (d) {
          return '<button type="button" data-action="pd-doc" data-doc="' + d.key + '" class="text-left p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors flex items-start gap-space-sm">' +
            '<span class="w-9 h-9 shrink-0 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center"><span class="material-symbols-outlined">' + d.icon + '</span></span>' +
            '<span class="min-w-0"><span class="block font-headline-sm text-headline-sm text-on-surface font-semibold">' + esc(d.title) + '</span>' +
            '<span class="block font-body-sm text-body-sm text-on-surface-variant">' + esc(d.desc) + '</span></span></button>';
        }).join('') + '</div></div>';
    }).join('');
  }

  // ---------- ประวัติเอกสารของโครงการ ----------
  function docHistory(p) {
    return SK.db.data.documents.filter(function (d) { return d.projectId === p.id; })
      .sort(function (a, b) { return String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')); });
  }
  function when(d) {
    var t = d.updatedAt || d.createdAt;
    return t ? new Date(t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : ui.dateShort(d.date);
  }
  function renderHistory(p) {
    var list = docHistory(p);
    $('pd-history').innerHTML = list.length ? '<ul class="flex flex-col gap-space-xs">' + list.map(function (d, i) {
      return '<li><button type="button" data-action="pd-open" data-i="' + i + '" class="w-full text-left p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors flex items-start gap-space-sm">' +
        '<span class="material-symbols-outlined text-primary">' + ((SK.flows.FORMAT_ICON || {})[d.format] || 'draft') + '</span>' +
        '<span class="min-w-0 flex-1"><span class="block font-label-md text-label-md text-on-surface font-semibold line-clamp-2">' + esc(String(d.title || '').split(' — ')[0]) + '</span>' +
        '<span class="block font-body-sm text-body-sm text-on-surface-variant">' + esc(when(d)) + (d.owner ? ' • ' + esc(d.owner) : '') + (d.edited ? ' • แก้ไขข้อความแล้ว' : '') + '</span></span></button></li>';
    }).join('') + '</ul>'
      : '<p class="font-body-sm text-body-sm text-on-surface-variant p-space-sm rounded-lg bg-surface-container-low">ยังไม่มีเอกสารของโครงการนี้ — เลือกเอกสารด้านซ้ายแล้วกด "สร้างเอกสาร" ระบบจะเก็บไว้ที่นี่ให้อัตโนมัติ</p>';
  }

  function refresh() {
    var p = project();
    if (!p) {
      $('pd-village').innerHTML = ''; $('pd-project').innerHTML = '';
      $('pd-summary').innerHTML = '';
      $('project-docs').innerHTML = '<div class="py-8 flex flex-col items-center gap-3 text-center"><span class="material-symbols-outlined text-[48px] text-outline">inventory_2</span>' +
        '<p class="font-headline-md text-headline-md text-primary font-bold">ยังไม่มีโครงการในฐานข้อมูล</p>' +
        '<div class="flex flex-wrap justify-center gap-2"><button type="button" data-action="register-project" class="' + ui.btnClass('primary') + '">ลงทะเบียนโครงการใหม่</button>' +
        '<button type="button" data-action="data-panel" class="' + ui.btnClass('ghost') + '">นำเข้าจาก Excel</button></div></div>';
      $('pd-history').innerHTML = '';
      return;
    }
    store(PKEY, p.id);
    renderPickers(p);
    renderSummary(p);
    renderDocs(p);
    renderHistory(p);
    document.title = p.id + ' เอกสารโครงการ | กองช่าง เทศบาลตำบลสีแก้ว';
  }
  function select(id) {
    projectId = id;
    try { history.replaceState(null, '', 'project-docs.html?id=' + encodeURIComponent(id)); } catch (e) {}
    refresh();
  }

  Object.assign(SK.actions, {
    'pd-doc': function (el) {
      var d = SK.docEngine.DOCS.filter(function (x) { return x.key === el.dataset.doc; })[0];
      SK.docEngine.openDocument(d, d.general ? null : project());
    },
    'pd-open': function (el) {
      var d = docHistory(project())[Number(el.dataset.i)];
      if (d) SK.flows.openDocument(d, refresh);
    }
  });

  SK.page = { refresh: refresh };
  ui.onReady(function () {
    $('pd-project').addEventListener('change', function () { if (this.value) select(this.value); });
    $('pd-village').addEventListener('change', function () {
      store(VKEY, this.value);
      var p = project();
      var list = projects().filter(function (x) { return !this.value || x.village === this.value; }, this);
      // หมู่ที่เลือกมีโครงการเดียว: เลือกให้เลย
      if (list.length === 1 && (!p || list[0].id !== p.id)) select(list[0].id); else fillProjects(p);
    });
    refresh();
    if (project() && project().rowNumber && SK.docEngine) setTimeout(function () { SK.docEngine.load().catch(function () {}); }, 800);
  });
})();
