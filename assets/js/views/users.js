// ผู้ใช้และสิทธิ์: บัญชีเจ้าหน้าที่ (ชื่อผู้ใช้ + รหัสผ่าน) ในตาราง staff ของ Supabase • ผู้ดูแลระบบเพิ่ม/แก้/ลบได้
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, esc = SK.esc, icon = SK.icon;
  var el = null;
  var ROLES = [
    { key: 'admin', label: 'ผู้ดูแลระบบ', icon: 'admin_panel_settings', chip: 'chip-blue', can: ['ดู/แก้ไขโครงการ และสร้างเอกสาร', 'ข้อมูลซิงก์กับฐานข้อมูลกลาง', 'เพิ่ม/ลบ/ตั้งรหัสผ่านเจ้าหน้าที่', 'กำหนดสิทธิ์ผู้ใช้'] },
    { key: 'staff', label: 'เจ้าหน้าที่', icon: 'badge', chip: 'chip-green', can: ['ดู/แก้ไขโครงการ และสร้างเอกสาร', 'ข้อมูลซิงก์กับฐานข้อมูลกลาง', 'เพิ่มรูปภาพและบันทึกหน้างาน'] },
    { key: 'guest', label: 'ผู้เยี่ยมชม (ไม่ได้เข้าสู่ระบบ)', icon: 'person', chip: 'chip-gray', can: ['ใช้งานได้ทุกหน้า', 'ข้อมูลเก็บในเบราว์เซอร์เครื่องนั้นเท่านั้น'] }
  ];

  function render(root) {
    el = root;
    var c = SK.cloud;
    root.innerHTML = V.pageHead({
      kicker: '<span class="chip-blue">' + icon('shield_person', 'text-[14px]') + 'เข้าสู่ระบบด้วยชื่อผู้ใช้ + รหัสผ่าน (ไม่ต้องใช้อีเมล)</span>',
      title: 'ผู้ใช้และสิทธิ์',
      desc: 'บัญชีเจ้าหน้าที่กองช่างที่ใช้ฐานข้อมูลกลางร่วมกัน — ผู้ดูแลระบบสร้างบัญชีให้แล้วแจ้งชื่อผู้ใช้/รหัสผ่านแก่เจ้าหน้าที่',
      actions: c.isAdmin() ? '<button type="button" data-us="add" class="btn-primary">' + icon('person_add') + '<span>เพิ่มเจ้าหน้าที่</span></button>' : (!c.user ? '<button type="button" data-action="account" class="btn-primary">' + icon('login') + '<span>เข้าสู่ระบบ</span></button>' : '')
    }) +
    '<div class="grid grid-cols-1 xl:grid-cols-12 gap-gutter items-start">' +
      '<section class="xl:col-span-8 card card-pad"><div class="flex items-center justify-between gap-2 mb-4"><h2 class="card-title">' + icon('group') + 'รายชื่อเจ้าหน้าที่</h2><span id="us-count" class="chip-gray"></span></div><div id="us-list">' + V.loading(200) + '</div></section>' +
      '<div class="xl:col-span-4 flex flex-col gap-gutter">' +
        '<section class="card card-pad"><h2 class="card-title mb-4">' + icon('account_circle') + 'บัญชีของฉัน</h2>' + me() + '</section>' +
        '<section class="card card-pad"><h2 class="card-title mb-4">' + icon('rule') + 'สิทธิ์การใช้งาน</h2><div class="flex flex-col gap-3">' + ROLES.map(function (r) {
          return '<div class="p-4 rounded-[20px] bg-surface-container-low/70"><span class="' + r.chip + ' mb-2">' + icon(r.icon, 'text-[14px]') + r.label + '</span><ul class="flex flex-col gap-1 font-body-sm text-body-sm">' +
            r.can.map(function (x) { return '<li class="flex items-start gap-1.5">' + icon('check', 'text-[16px] text-[#15803d]') + esc(x) + '</li>'; }).join('') + '</ul></div>';
        }).join('') + '</div></section>' +
        '<section class="card card-pad"><h2 class="card-title mb-2">' + icon('badge') + 'รายชื่อบุคลากรในเอกสาร</h2><p class="muted font-body-sm text-body-sm mb-3">ชื่อ-ตำแหน่งผู้ลงนาม ผู้ควบคุมงาน และกรรมการที่ใช้ในหนังสือราชการ จัดการในระบบหลัก</p>' +
          '<a href="#/system/openPersonnelManager" class="btn-glass w-full">' + icon('edit') + '<span>จัดการรายชื่อบุคลากร</span></a></section>' +
      '</div></div>';
    list();
  }
  function me() {
    var c = SK.cloud;
    if (!c.enabled) return '<p class="muted">ยังไม่ได้ตั้งค่าฐานข้อมูลกลาง</p>';
    if (!c.user) return '<p class="muted mb-3">ยังไม่ได้เข้าสู่ระบบ — ข้อมูลที่บันทึกจะอยู่ในเบราว์เซอร์นี้เท่านั้น</p><button type="button" data-action="account" class="btn-primary w-full">' + icon('login') + '<span>เข้าสู่ระบบ</span></button>';
    return '<div class="flex items-center gap-3 p-3 rounded-[20px] bg-surface-container-low/70"><span class="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center">' + icon('person') + '</span>' +
      '<div class="min-w-0"><div class="font-label-lg text-label-lg font-semibold truncate">' + esc(c.displayName()) + '</div><div class="font-body-sm text-body-sm text-outline truncate">' + esc(c.loginName(c.user.email)) + ' • ' + (c.staff ? (c.staff.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่') : 'ยังไม่ได้รับสิทธิ์') + '</div></div></div>' +
      '<button type="button" data-action="account" class="btn-glass w-full mt-3">' + icon('settings') + '<span>จัดการบัญชี</span></button>';
  }
  function list() {
    var box = el.querySelector('#us-list'), c = SK.cloud;
    if (!c.enabled || !c.user || !c.staff) {
      box.innerHTML = V.empty('lock', c.user ? 'บัญชีนี้ยังไม่ได้รับสิทธิ์' : 'เข้าสู่ระบบเพื่อดูรายชื่อเจ้าหน้าที่', c.user ? 'ติดต่อผู้ดูแลระบบให้เพิ่มบัญชีนี้ในรายชื่อเจ้าหน้าที่' : 'รายชื่อเจ้าหน้าที่แสดงเฉพาะผู้ที่เข้าสู่ระบบแล้ว',
        c.user ? '' : '<button type="button" data-action="account" class="btn-primary">' + icon('login') + '<span>เข้าสู่ระบบ</span></button>');
      el.querySelector('#us-count').textContent = '';
      return;
    }
    c.staffList().then(function (rows) {
      el.querySelector('#us-count').textContent = rows.length + ' บัญชี';
      var admin = c.isAdmin(), my = String(c.user.email || '').toLowerCase();
      box.innerHTML = '<div class="overflow-x-auto -mx-2"><table class="table-clean min-w-[560px]"><thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ - ตำแหน่ง</th><th>สิทธิ์</th><th>เพิ่มเมื่อ</th>' + (admin ? '<th class="text-right">จัดการ</th>' : '') + '</tr></thead><tbody>' +
        rows.map(function (s) {
          var r = ROLES.filter(function (x) { return x.key === s.role; })[0] || ROLES[1];
          var isUser = c.loginName(s.email) !== s.email;
          return '<tr><td><span class="flex items-center gap-2"><span class="w-8 h-8 rounded-full bg-surface-container text-primary flex items-center justify-center">' + icon(r.icon, 'text-[18px]') + '</span><b class="font-label-lg text-label-lg">' + esc(c.loginName(s.email)) + '</b>' + (s.email === my ? '<span class="chip-gray">ฉัน</span>' : '') + '</span></td>' +
            '<td>' + esc(s.name || '-') + '</td><td><span class="' + r.chip + '">' + r.label + '</span></td><td class="text-outline whitespace-nowrap">' + (s.created_at ? SK.dateShort(s.created_at.slice(0, 10)) : '-') + '</td>' +
            (admin ? '<td class="text-right whitespace-nowrap"><button type="button" data-us="edit" data-email="' + esc(s.email) + '" class="icon-btn" title="แก้ไขชื่อ/สิทธิ์" aria-label="แก้ไข ' + esc(c.loginName(s.email)) + '">' + icon('edit', 'text-[19px]') + '</button>' +
              (isUser ? '<button type="button" data-us="pw" data-email="' + esc(s.email) + '" class="icon-btn" title="ตั้งรหัสผ่านใหม่" aria-label="ตั้งรหัสผ่านใหม่ ' + esc(c.loginName(s.email)) + '">' + icon('key', 'text-[19px]') + '</button>' : '') +
              (s.email !== my ? '<button type="button" data-us="del" data-email="' + esc(s.email) + '" class="icon-btn hover:!text-error" title="ลบบัญชี" aria-label="ลบ ' + esc(c.loginName(s.email)) + '">' + icon('delete', 'text-[19px]') + '</button>' : '') + '</td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div>';
      box.__rows = rows;
    }).catch(function (err) { box.innerHTML = '<p class="text-error">' + esc(c.errText(err)) + '</p>'; });
  }
  function roleOptions(v) { return [['staff', 'เจ้าหน้าที่'], ['admin', 'ผู้ดูแลระบบ']].map(function (o) { return o; }); }

  function add() {
    var c = SK.cloud;
    SK.formModal({
      title: 'เพิ่มเจ้าหน้าที่', icon: 'person_add',
      fields: [
        { name: 'username', label: 'ชื่อผู้ใช้ (ภาษาอังกฤษ/ตัวเลข)', required: true, placeholder: 'เช่น somchai', help: 'a-z 0-9 . _ - ยาว 3-32 ตัว', autocomplete: 'off' },
        { name: 'password', label: 'รหัสผ่าน', type: 'password', required: true, help: 'อย่างน้อย 6 ตัวอักษร', autocomplete: 'new-password' },
        { name: 'name', label: 'ชื่อ - ตำแหน่ง', span: 2, placeholder: 'เช่น นายสมชาย ใจดี นายช่างโยธา' },
        { name: 'role', label: 'สิทธิ์', type: 'select', options: roleOptions(), value: 'staff', span: 2 }
      ],
      submitLabel: 'สร้างบัญชี', submitIcon: 'person_add',
      onSubmit: function (v) {
        return c.createStaff(v).then(function (r) {
          if (!r.ok) { SK.toast('สร้างบัญชีไม่สำเร็จ: ' + r.message, 'error'); return true; }
          if (r.needsConfirm) SK.toast('สร้างบัญชีแล้ว แต่ Supabase ยังเปิด "Confirm email" — ปิดที่ Authentication › Sign In / Providers › Email ก่อน บัญชีนี้จึงเข้าใช้ได้', 'error');
          else SK.toast('สร้างบัญชี ' + v.username + ' แล้ว — เข้าสู่ระบบได้ทันที', 'success');
          list();
        });
      }
    });
  }
  function edit(email) {
    var c = SK.cloud, s = (el.querySelector('#us-list').__rows || []).filter(function (x) { return x.email === email; })[0];
    if (!s) return;
    SK.formModal({
      title: 'แก้ไข ' + c.loginName(email), icon: 'edit', size: 'sm',
      fields: [{ name: 'name', label: 'ชื่อ - ตำแหน่ง', value: s.name || '' }, { name: 'role', label: 'สิทธิ์', type: 'select', options: roleOptions(), value: s.role }],
      onSubmit: function (v) {
        if (email === String(c.user.email).toLowerCase() && v.role !== 'admin') { SK.toast('ไม่สามารถลดสิทธิ์ของตัวเองได้', 'error'); return true; }
        return c.updateStaff(email, v).then(function () { SK.toast('บันทึกแล้ว', 'success'); list(); });
      }
    });
  }
  function password(email) {
    var c = SK.cloud;
    SK.formModal({
      title: 'ตั้งรหัสผ่านใหม่ให้ ' + c.loginName(email), icon: 'key', size: 'sm',
      fields: [{ name: 'password', label: 'รหัสผ่านใหม่', type: 'password', required: true, help: 'อย่างน้อย 6 ตัวอักษร', autocomplete: 'new-password' }],
      onSubmit: function (v) {
        if (v.password.length < 6) { SK.toast('รหัสผ่านอย่างน้อย 6 ตัวอักษร', 'error'); return true; }
        return c.resetStaffPassword(email, v.password).then(function (r) {
          if (!r.ok) { SK.toast(r.missing ? 'ต้องติดตั้ง Edge Function "staff-user" ใน Supabase ก่อน จึงตั้งรหัสผ่านให้ผู้อื่นได้' : 'ตั้งรหัสไม่สำเร็จ: ' + r.message, 'error'); return true; }
          SK.toast('ตั้งรหัสผ่านใหม่แล้ว', 'success');
        });
      }
    });
  }
  function remove(email) {
    var c = SK.cloud;
    SK.confirm('ลบบัญชี/สิทธิ์ของ ' + c.loginName(email) + ' ? บัญชีนี้จะเข้าใช้ข้อมูลกลางไม่ได้อีก', 'ลบ', 'danger').then(function (ok) {
      if (!ok) return;
      c.deleteStaff(email).then(function () { SK.toast('ลบแล้ว', 'success'); list(); }, function (err) { SK.toast(c.errText(err), 'error'); });
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-us]');
    if (!b || !el || !el.contains(b)) return;
    var k = b.dataset.us;
    if (k === 'add') add(); else if (k === 'edit') edit(b.dataset.email); else if (k === 'pw') password(b.dataset.email); else if (k === 'del') remove(b.dataset.email);
  });
  window.addEventListener('sk:cloud', function () { if (el && document.body.contains(el) && el.querySelector('#us-list') && SK.cloud.status === 'ok') render(el); });
  SK.route('users', { title: 'ผู้ใช้และสิทธิ์', render: render, refresh: function () {} });

  // ---------- ข้อมูล & นำเข้า Excel ----------
  SK.route('data', {
    title: 'ข้อมูล & นำเข้า Excel',
    render: function (root) {
      var c = SK.cloud, info = SK.projects.info;
      root.innerHTML = V.pageHead({
        kicker: '<span class="chip-blue">' + icon('database', 'text-[14px]') + 'ชีทของระบบหลัก</span>',
        title: 'ข้อมูล &amp; นำเข้า Excel',
        desc: 'ข้อมูลโครงการ บุคลากร และประวัติเอกสารของระบบหลักเก็บเป็นชีท (รูปแบบเดียวกับ Google Sheet เดิม) — นำเข้า/ส่งออกเป็นไฟล์ Excel ได้'
      }) +
      '<div class="grid grid-cols-1 lg:grid-cols-3 gap-gutter">' +
        '<section class="card card-pad"><span class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">' + icon('inventory_2') + '</span><h2 class="font-headline-sm text-headline-sm font-semibold">ฐานข้อมูลปัจจุบัน</h2>' +
          '<p class="font-display-lg-mobile text-[34px] font-bold mt-2">' + (info.count || 0) + ' <span class="font-body-md text-body-md text-secondary font-normal">โครงการ</span></p>' +
          '<p class="muted font-body-sm text-body-sm">' + (info.savedAt ? 'บันทึกล่าสุด ' + new Date(info.savedAt).toLocaleString('th-TH') : 'ยังไม่มีข้อมูล') + '</p>' +
          '<p class="font-body-sm text-body-sm mt-3 ' + (c.active ? 'text-[#15803d]' : 'text-outline') + '">' + (c.active ? 'ซิงก์กับฐานข้อมูลกลางแล้ว' : 'ข้อมูลอยู่ในเบราว์เซอร์นี้ (เข้าสู่ระบบเพื่อซิงก์)') + '</p></section>' +
        '<section class="card card-pad"><span class="w-11 h-11 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center mb-3">' + icon('upload_file') + '</span><h2 class="font-headline-sm text-headline-sm font-semibold">นำเข้าจาก Excel</h2>' +
          '<ol class="list-decimal pl-5 my-3 font-body-sm text-body-sm muted flex flex-col gap-1"><li>ดาวน์โหลดไฟล์จาก Google Sheet ของระบบ</li><li>เลือกไฟล์ .xlsx เพื่อนำเข้า (แทนที่ข้อมูลชีททั้งหมด)</li></ol>' +
          '<div class="flex flex-wrap gap-2"><a href="' + esc(window.SKData ? SKData.downloadUrl : '#') + '" target="_blank" rel="noopener" class="btn-glass">' + icon('download') + '<span>ดาวน์โหลดจาก Google Sheet</span></a>' +
          '<button type="button" data-data="import" class="btn-primary">' + icon('upload') + '<span>เลือกไฟล์ Excel</span></button></div></section>' +
        '<section class="card card-pad"><span class="w-11 h-11 rounded-2xl bg-secondary-container text-on-secondary-fixed flex items-center justify-center mb-3">' + icon('save') + '</span><h2 class="font-headline-sm text-headline-sm font-semibold">สำรองข้อมูล</h2>' +
          '<p class="muted font-body-sm text-body-sm my-3">ส่งออกชีททั้งหมดเป็นไฟล์ Excel เพื่อเก็บสำรองหรือเปิดใน Google Sheet</p>' +
          '<div class="flex flex-wrap gap-2"><button type="button" data-data="export" class="btn-primary">' + icon('download') + '<span>ส่งออก Excel</span></button>' +
          (c.active ? '<button type="button" data-data="reload" class="btn-glass">' + icon('cloud_download') + '<span>โหลดจากคลาวด์ใหม่</span></button>' : '') + '</div></section>' +
      '</div>';
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-data]');
    if (!b || !window.SKData) return;
    var k = b.dataset.data;
    if (k === 'export') SKData.exportFile().then(function () { SK.toast('ดาวน์โหลดไฟล์ Excel แล้ว', 'success'); }, function (err) { SK.toast('ส่งออกไม่สำเร็จ: ' + (err.message || err), 'error'); });
    else if (k === 'import') SK.pickFile('.xlsx,.xls', false).then(function (files) {
      if (!files || !files[0]) return;
      SK.confirm('นำเข้า "' + files[0].name + '" แทนที่ข้อมูลชีททั้งหมด?', 'นำเข้า').then(function (ok) {
        if (!ok) return;
        SK.toast('กำลังนำเข้า...');
        SKData.importFile(files[0]).then(function (info) {
          var n = (info.sheets.filter(function (s) { return s.name === 'ฐานข้อมูลโครงการ'; })[0] || {}).rows || 0;
          SK.toast('นำเข้าเรียบร้อย ' + n + ' โครงการ', 'success');
          setTimeout(function () { location.reload(); }, 900);
        }, function (err) { SK.toast('นำเข้าไม่สำเร็จ: ' + (err.message || err), 'error'); });
      });
    });
    else if (k === 'reload') SK.confirm('แทนที่ข้อมูลชีทในเครื่องนี้ด้วยข้อมูลล่าสุดบนคลาวด์?', 'โหลดใหม่').then(function (ok) {
      if (ok) SK.cloud.reloadWorkbook().then(function () { location.reload(); }, function (err) { SK.toast(SK.cloud.errText(err), 'error'); });
    });
  });
})();
