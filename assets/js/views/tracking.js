// ติดตามงานและรูปภาพ: ความคืบหน้าเทียบแผนทุกโครงการที่กำลังทำ + คลังรูปภาพ + บันทึกหน้างานล่าสุด
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var el = null, f = { village: '', project: '' };

  function render(root) {
    el = root;
    root.innerHTML = V.pageHead({
      kicker: '<span class="chip-blue">' + icon('monitoring', 'text-[14px]') + 'เทียบผลงานจริงกับแผนตามระยะเวลาสัญญา</span>',
      title: 'ติดตามงาน &amp; รูปภาพ',
      desc: 'โครงการที่กำลังดำเนินการ ความล่าช้า รูปถ่ายก่อน/ระหว่าง/หลังดำเนินการ และบันทึกหน้างานของทุกโครงการ'
    }) + '<div id="tr-body">' + (SK.projects.loaded ? '' : V.loading(320)) + '</div>';
    if (SK.projects.loaded) body();
  }
  function body() {
    var box = el.querySelector('#tr-body'), all = SK.projects.list;
    if (!all.length) { box.innerHTML = '<div class="card">' + V.noProjects() + '</div>'; return; }
    var active = all.filter(function (p) { return p.status === 'progress' || p.status === 'delayed' || (p.status === 'pending' && p.start); })
      .sort(function (a, b) { return (b.plan - b.actual) - (a.plan - a.actual); });
    var photos = SK.photos.of().filter(function (ph) {
      var p = SK.projects.byId(ph.projectId);
      return p && (!f.village || p.villageNo === f.village) && (!f.project || p.id === f.project);
    });
    var diary = SK.store.list('diary').slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 6);
    box.innerHTML =
      '<div class="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">' +
        '<section class="xl:col-span-7 card card-pad"><div class="flex items-center justify-between gap-2 mb-1"><h2 class="card-title">' + icon('speed') + 'ความคืบหน้าเทียบแผน</h2><span class="chip-blue">' + active.length + ' โครงการ</span></div>' +
          '<p class="muted font-body-sm text-body-sm mb-4">แถบเข้ม = ผลงานจริง • แถบอ่อน = แผนตามวันที่ในสัญญา • เรียงจากล่าช้ามากที่สุด</p>' +
          (active.length ? '<div class="flex flex-col gap-2">' + active.map(row).join('') + '</div>' : '<p class="muted">ไม่มีโครงการที่กำลังดำเนินการ</p>') + '</section>' +
        '<section class="xl:col-span-5 card card-pad"><h2 class="card-title mb-4">' + icon('edit_note') + 'บันทึกหน้างานล่าสุด</h2>' +
          (diary.length ? '<div class="flex flex-col gap-2">' + diary.map(function (e) {
            var p = SK.projects.byId(e.projectId);
            return '<a href="#/project/' + esc(e.projectId) + '?tab=diary" class="block p-3 rounded-[20px] bg-surface-container-low/70 hover:bg-surface-container"><span class="block font-label-md text-label-md text-outline">' + SK.dateLong(e.date) + (e.reporter ? ' • ' + esc(e.reporter) : '') + '</span>' +
              '<span class="block font-label-lg text-label-lg font-semibold">' + esc(e.title || 'บันทึกหน้างาน') + '</span><span class="block font-body-sm text-body-sm text-outline truncate">' + esc(p ? p.name : e.projectId) + '</span></a>';
          }).join('') + '</div>' : '<p class="muted font-body-sm text-body-sm">ยังไม่มีบันทึกหน้างาน — เปิดหน้าโครงการแล้วกด "บันทึกหน้างาน"</p>') + '</section>' +
      '</div>' +
      '<section class="card card-pad mt-gutter"><div class="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5"><div><h2 class="card-title">' + icon('photo_library') + 'คลังรูปภาพโครงการ (' + photos.length + ')</h2><p class="muted font-body-sm text-body-sm mt-1">กดที่รูปเพื่อดูภาพใหญ่ ใส่คำอธิบาย ดาวน์โหลด หรือลบ</p></div>' +
        '<div class="flex flex-wrap items-end gap-2"><label class="field"><span>หมู่บ้าน</span><select id="tr-village" class="input !py-2">' + V.villageOptions(f.village) + '</select></label>' +
        '<label class="field"><span>โครงการ</span><select id="tr-project" class="input !py-2 max-w-[280px]">' + V.projectOptions(f.project, all.filter(function (p) { return !f.village || p.villageNo === f.village; })).replace('— เลือกโครงการ —', 'ทุกโครงการ') + '</select></label>' +
        '<button type="button" id="tr-add" class="btn-primary"' + (f.project ? '' : ' disabled title="เลือกโครงการก่อน"') + '>' + icon('add_a_photo') + '<span>เพิ่มรูป</span></button></div></div>' +
        (photos.length ? '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-3">' + photos.map(function (ph) {
          var p = SK.projects.byId(ph.projectId);
          return '<figure class="flex flex-col gap-1.5">' + SK.photos.thumb(ph) + '<figcaption class="font-body-sm text-body-sm"><a href="#/project/' + p.id + '?tab=photos" class="font-semibold hover:text-primary line-clamp-1">' + esc(p.name) + '</a><span class="text-outline">' + SK.dateShort(ph.date) + '</span></figcaption></figure>';
        }).join('') + '</div>' : V.empty('photo_library', 'ยังไม่มีรูปภาพ', 'เลือกโครงการแล้วกด "เพิ่มรูป" หรือเพิ่มจากหน้าโครงการ')) + '</section>';
    SK.photos.hydrate(box);
    box.querySelector('#tr-village').addEventListener('change', function () { f.village = this.value; f.project = ''; body(); });
    box.querySelector('#tr-project').addEventListener('change', function () { f.project = this.value; body(); });
    box.querySelector('#tr-add').addEventListener('click', function () { if (f.project) SK.photos.add(f.project, ''); });
  }
  function row(p) {
    var gap = Math.round(p.plan - p.actual), color = (SK.projects.STATUSES[p.status] || {}).color;
    return '<a href="#/project/' + p.id + '" class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 p-3 rounded-[20px] hover:bg-surface-container-low transition-colors">' +
      '<span class="min-w-0"><span class="block font-label-lg text-label-lg font-semibold truncate">' + esc(p.name) + '</span><span class="block font-body-sm text-body-sm text-outline truncate">' + esc(p.place || '') + (p.end ? ' • สิ้นสุด ' + SK.dateShort(p.end) : '') + '</span></span>' +
      '<span class="text-right"><b class="font-label-lg text-label-lg" style="color:' + color + '">' + Math.round(p.actual) + '%</b>' + (gap > 0 ? '<span class="block font-label-sm text-label-sm ' + (gap > 15 ? 'text-error' : 'text-[#b45309]') + '">ช้ากว่าแผน ' + gap + '%</span>' : '<span class="block font-label-sm text-label-sm text-[#15803d]">ตามแผน</span>') + '</span>' +
      '<span class="col-span-2 relative h-2 rounded-full bg-surface-container-high overflow-hidden"><i class="absolute inset-y-0 left-0 rounded-full" style="width:' + Math.min(100, p.plan) + '%;background:' + color + '33"></i><i class="absolute inset-y-0 left-0 rounded-full" style="width:' + p.actual + '%;background:' + color + '"></i></span></a>';
  }
  window.addEventListener('sk:photos', function () { if (el && document.body.contains(el) && el.querySelector('#tr-body')) body(); });
  SK.route('tracking', { title: 'ติดตามงานและรูปภาพ', render: render, refresh: function () { if (el && document.body.contains(el)) body(); } });
})();
