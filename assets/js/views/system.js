// หน้าของระบบหลักในเว็บ: กรอกข้อมูลโครงการ (#/entry, #/entry/P-001) และเครื่องมืออื่น (#/tools, #/system/<ฟังก์ชัน>)
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var timer = null;

  function frame(root, o) {
    root.innerHTML =
      '<div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">' +
        '<div class="flex items-center gap-3 min-w-0"><span class="w-11 h-11 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center">' + icon(o.icon, 'text-[22px]') + '</span>' +
          '<div class="min-w-0"><h1 class="font-headline-md text-headline-md font-semibold">' + esc(o.title) + '</h1><p class="font-body-sm text-body-sm text-outline truncate">' + esc(o.sub || '') + '</p></div></div>' +
        '<div class="flex flex-wrap gap-2">' + (o.actions || '') + '</div></div>' +
      '<div id="sys-holder" class="relative card overflow-hidden" style="height:calc(100vh - 190px)">' +
        '<div id="sys-wait" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant">' + icon('progress_activity', 'animate-spin text-primary text-[32px]') + '<span>กำลังเปิดระบบหลัก...</span></div></div>';
    var holder = root.querySelector('#sys-holder');
    V.fit(holder);
    return holder;
  }
  // ผู้ใช้กดปิดหน้าในระบบหลัก (×/ยกเลิก): กลับหน้าก่อนหน้าในเว็บ
  function watch(back) {
    clearInterval(timer);
    var seen = false;
    timer = setInterval(function () {
      var open = SK.engine.pageOpen();
      if (open) seen = true;
      else if (seen) { clearInterval(timer); SK.go(back); }
    }, 700);
  }
  function show(root, o) {
    var holder = frame(root, o);
    return SK.engine.showPage(holder, o.code).then(function () {
      var w = root.querySelector('#sys-wait'); if (w) w.remove();
      if (o.back) watch(o.back);
    }).catch(function (err) {
      holder.innerHTML = '<div class="p-6">' + V.empty('error', 'เปิดระบบหลักไม่สำเร็จ', esc(err.message || err)) + '</div>';
    });
  }
  function leave() { clearInterval(timer); SK.engine.undock(); SK.engine.closeAll(); }

  // ---------- กรอกข้อมูลโครงการ ----------
  SK.route('entry', {
    title: 'กรอกข้อมูลโครงการ', nav: 'projects', leave: leave, refresh: function () {},
    render: function (root, r) {
      var id = r.args[0], p = id ? SK.projects.byId(id) : null;
      if (id && !SK.projects.loaded) { root.innerHTML = V.loading(400); SK.projects.ready().then(function () { if (SK.parseHash().name === 'entry') SK.render(); }); return; }
      if (id && !p) { root.innerHTML = '<div class="card">' + V.empty('search_off', 'ไม่พบโครงการ ' + esc(id), '', '<a href="#/projects" class="btn-primary">กลับไปทะเบียนโครงการ</a>') + '</div>'; return; }
      show(root, {
        icon: p ? 'edit_note' : 'add_circle', title: p ? 'แก้ไขข้อมูลโครงการ' : 'กรอกข้อมูลโครงการ',
        sub: p ? p.id + ' • ' + p.name : 'แบบฟอร์มของระบบหลัก — บันทึกลงชีท "ฐานข้อมูลโครงการ" (ข้อมูลชุดเดียวกับที่ใช้พิมพ์เอกสาร)',
        actions: (p ? '<a href="#/project/' + p.id + '" class="btn-glass">' + icon('arrow_back') + '<span>กลับหน้าโครงการ</span></a>' : '<a href="#/projects" class="btn-glass">' + icon('inventory_2') + '<span>ทะเบียนโครงการ</span></a>'),
        code: p ? "openEntryGate('edit'," + Number(p.rowNumber) + ',' + JSON.stringify(p.name) + ')' : "openEntryGate('new')",
        back: p ? 'project/' + p.id : 'projects'
      });
    }
  });

  // ---------- เครื่องมือระบบหลัก ----------
  SK.route('tools', {
    title: 'เครื่องมือระบบหลัก',
    render: function (root) {
      root.innerHTML = V.pageHead({
        kicker: '<span class="chip-blue">' + icon('verified', 'text-[14px]') + 'ระบบหลัก v190</span>',
        title: 'เครื่องมือระบบหลัก',
        desc: 'หน้าทำงานทุกหน้าของระบบหลักของกองช่าง (รายงานช่าง ผลทดสอบ ราคากลาง TOR ค่า K ค่าตอบแทน คุมสายทาง ฯลฯ) ใช้ข้อมูลชุดเดียวกับเว็บ'
      }) + '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-gutter">' + SK.engine.TOOLS.filter(function (t) { return !t.admin || SK.cloud.isAdmin(); }).map(function (t) {
        var href = t.fn === 'openEntryGate' ? '#/entry' : '#/system/' + t.fn;
        return '<a href="' + href + '" class="group card p-5 flex items-center gap-4 hover:shadow-md transition-all"><span class="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">' + icon(t.icon, 'text-[24px]') + '</span>' +
          '<span class="flex-1 font-label-lg text-label-lg font-semibold">' + esc(t.title) + '</span>' + icon('arrow_forward', 'text-outline group-hover:text-primary') + '</a>';
      }).join('') + '</div>';
    }
  });
  SK.route('system', {
    title: 'ระบบหลัก', nav: 'tools', leave: leave, refresh: function () {},
    render: function (root, r) {
      var fn = r.args[0] || '', t = SK.engine.TOOLS.filter(function (x) { return x.fn === fn; })[0];
      if (!t) { root.innerHTML = '<div class="card">' + V.empty('search_off', 'ไม่พบหน้านี้ในระบบหลัก', '', '<a href="#/tools" class="btn-primary">เครื่องมือระบบหลัก</a>') + '</div>'; return; }
      if (t.admin && !SK.cloud.isAdmin()) { root.innerHTML = '<div class="card">' + V.empty('admin_panel_settings', 'เฉพาะผู้ดูแลระบบ', 'เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบเพื่อใช้หน้า ' + esc(t.title), '<a href="#/users" class="btn-primary">ผู้ใช้งานและสิทธิ์</a>') + '</div>'; return; }
      show(root, {
        icon: t.icon, title: t.title, sub: 'หน้าของระบบหลัก — เอกสารที่สั่งพิมพ์จะเปิดใน Smart Editor ของเว็บ',
        actions: '<a href="#/tools" class="btn-glass">' + icon('apps') + '<span>เครื่องมือทั้งหมด</span></a>',
        code: 'typeof ' + t.fn + '==="function" && ' + t.fn + '()', back: 'tools'
      });
    }
  });
})();
