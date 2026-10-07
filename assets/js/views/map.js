// แผนที่ GIS ตำบล: หมุดโครงการตามตัวกรอง + ขอบเขตตำบล/หมู่บ้าน
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var el = null, ctl = null, f = { year: '', status: '', category: '' };

  function render(root) {
    el = root;
    root.innerHTML =
      '<div class="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4">' +
        '<div><h1 class="font-headline-md text-headline-md font-semibold flex items-center gap-2">' + icon('map', 'text-primary') + 'แผนที่ GIS ตำบลสีแก้ว</h1><p class="font-body-sm text-body-sm text-outline">หมุดโครงการตามพิกัดในฐานข้อมูล • ขอบเขตตำบลและหมู่บ้านจากระบบหลัก</p></div>' +
        '<div class="flex flex-wrap gap-2">' +
          '<select id="mp-year" class="input !w-auto !py-2 !rounded-full" aria-label="ปีงบประมาณ">' + V.yearOptions(f.year) + '</select>' +
          '<select id="mp-cat" class="input !w-auto !py-2 !rounded-full" aria-label="ประเภทงาน">' + V.options(Object.keys(SK.projects.CATEGORIES).map(function (k) { return [k, SK.projects.CATEGORIES[k].label]; }), f.category, 'ทุกประเภท') + '</select>' +
          '<select id="mp-status" class="input !w-auto !py-2 !rounded-full" aria-label="สถานะ">' + V.options(Object.keys(SK.projects.STATUSES).map(function (k) { return [k, SK.projects.STATUSES[k].label]; }), f.status, 'ทุกสถานะ') + '</select>' +
        '</div></div>' +
      '<div class="grid grid-cols-1 xl:grid-cols-12 gap-gutter">' +
        '<div class="xl:col-span-9 card overflow-hidden p-2"><div id="mp-map" class="rounded-[22px] overflow-hidden bg-surface-container" style="height:calc(100vh - 210px);min-height:460px"></div></div>' +
        '<aside class="xl:col-span-3 card card-pad flex flex-col" style="max-height:calc(100vh - 194px)"><h2 class="card-title mb-3">' + icon('list') + '<span id="mp-count">โครงการ</span></h2><div id="mp-list" class="flex-1 overflow-y-auto -mx-2 px-2 flex flex-col gap-1.5"></div></aside>' +
      '</div>';
    ctl = SK.map.create(root.querySelector('#mp-map'), { layers: true, onPin: function (p) { SK.go('project/' + p.id); } });
    ['year', 'cat', 'status'].forEach(function (k) {
      root.querySelector('#mp-' + k).addEventListener('change', function () { f[k === 'cat' ? 'category' : k] = this.value; update(); });
    });
    update();
  }
  function update() {
    if (!el || !ctl) return;
    var list = V.filter(SK.projects.list, f);
    ctl.setProjects(list);
    var pinned = list.filter(function (p) { return p.lat; });
    el.querySelector('#mp-count').textContent = 'โครงการ ' + list.length + ' (มีพิกัด ' + pinned.length + ')';
    el.querySelector('#mp-list').innerHTML = list.length ? list.map(function (p) {
      var c = (SK.projects.STATUSES[p.status] || {}).color;
      return '<button type="button" data-fly="' + p.id + '" class="flex items-start gap-2.5 p-2.5 rounded-2xl text-left hover:bg-surface-container-low"><span class="w-2.5 h-2.5 mt-1.5 shrink-0 rounded-full" style="background:' + c + '"></span>' +
        '<span class="min-w-0"><span class="block font-label-md text-label-md font-semibold line-clamp-2">' + esc(p.name) + '</span><span class="block font-body-sm text-body-sm text-outline">' + esc(p.place || '') + (p.lat ? '' : ' • ไม่มีพิกัด') + '</span></span></button>';
    }).join('') : '<p class="muted font-body-sm text-body-sm">' + (SK.projects.loaded ? 'ไม่มีโครงการตามตัวกรอง' : 'กำลังโหลด...') + '</p>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fly]');
    if (!b || !el || !el.contains(b) || !ctl) return;
    var p = SK.projects.byId(b.dataset.fly);
    if (p && p.lat) ctl.map.flyTo([p.lat, p.lng], 17); else if (p) SK.go('project/' + p.id);
  });
  SK.route('map', { title: 'แผนที่ GIS', render: render, refresh: update, leave: function () { if (ctl) { ctl.map.remove(); ctl = null; } } });
})();
