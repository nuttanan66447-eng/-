// โครงหน้าเว็บ: เมนู แถบบน บัญชีผู้ใช้ สถานะข้อมูล แล้วเปิดหน้าตามที่อยู่ (#/...)
(function () {
  'use strict';
  var SK = window.SK, esc = SK.esc, icon = SK.icon, $ = function (id) { return document.getElementById(id); };

  // ---------- เมนูบนมือถือ ----------
  var side = $('sidebar'), backdrop = $('sidebar-backdrop'), menuBtn = $('menu-btn');
  function menu(open) {
    side.classList.toggle('-translate-x-full', !open);
    backdrop.classList.toggle('hidden', !open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', function () { menu(side.classList.contains('-translate-x-full')); });
  backdrop.addEventListener('click', function () { menu(false); });
  side.addEventListener('click', function (e) { if (e.target.closest('a') && window.innerWidth < 1024) menu(false); });

  // ---------- ค้นหา ----------
  $('search').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = $('search-input').value.trim();
    SK.go('projects' + (q ? '?q=' + encodeURIComponent(q) : ''));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); $('search-input').focus(); }
  });
  $('fy-chip').lastElementChild.textContent = 'ปีงบประมาณ ' + SK.fiscalYear();

  // ---------- สถานะข้อมูล / บัญชี ----------
  var STATUS = {
    off: ['cloud_off', 'ใช้งานในเครื่องนี้', 'bg-outline', 'ยังไม่ได้เข้าสู่ระบบ — ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้'],
    loading: ['cloud_sync', 'กำลังโหลดจากคลาวด์', 'bg-primary animate-pulse', 'กำลังโหลดข้อมูลล่าสุดจากฐานข้อมูลกลาง'],
    syncing: ['cloud_upload', 'กำลังบันทึกขึ้นคลาวด์', 'bg-primary animate-pulse', 'กำลังบันทึกข้อมูลขึ้นฐานข้อมูลกลาง'],
    ok: ['cloud_done', 'ระบบเครือข่ายออนไลน์', 'bg-emerald-500 animate-pulse', 'ข้อมูลซิงก์กับฐานข้อมูลกลางแล้ว'],
    error: ['cloud_alert', 'ซิงก์ไม่สำเร็จ', 'bg-error', 'ซิงก์ไม่สำเร็จ — ข้อมูลยังอยู่ในเครื่องนี้ จะลองใหม่ภายหลัง'],
    denied: ['no_accounts', 'ยังไม่ได้รับสิทธิ์', 'bg-error', 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้ข้อมูลกลาง — ติดต่อผู้ดูแลระบบ']
  };
  function roleLabel() {
    var c = SK.cloud;
    if (!c.user) return 'ผู้เยี่ยมชม';
    if (!c.staff) return 'ยังไม่ได้รับสิทธิ์';
    return (c.position() || (c.staff.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'));
  }
  function renderStatus() {
    var c = SK.cloud, st = STATUS[c.status] || STATUS.off;
    $('cloud-btn').innerHTML = icon(st[0]);
    $('cloud-btn').title = st[3] + (c.detail ? ' (' + c.detail + ')' : '');
    $('cloud-btn').setAttribute('aria-label', $('cloud-btn').title);
    $('cloud-btn').className = 'icon-btn ' + (c.status === 'ok' ? 'text-[#15803d]' : c.status === 'error' || c.status === 'denied' ? 'text-error' : '');
    $('side-dot').className = 'w-2 h-2 rounded-full ' + st[2];
    $('side-status-text').textContent = st[1];
    $('user-name').textContent = c.user ? c.displayName() : 'เข้าสู่ระบบ';
    $('user-role').textContent = roleLabel();
  }
  window.addEventListener('sk:cloud', renderStatus);
  renderStatus();

  function renderDb() {
    var info = SK.projects.info;
    $('side-db').textContent = info.count ? 'ฐานข้อมูล ' + info.count + ' โครงการ' + (info.savedAt ? ' • ' + SK.timeAgo(info.savedAt) : '') : 'ยังไม่มีโครงการ — เริ่มกรอกที่นี่';
  }
  window.addEventListener('sk:projects', renderDb);

  function loginForm() {
    if (!SK.cloud.enabled) return SK.toast('ยังไม่ได้ตั้งค่าฐานข้อมูลกลาง (assets/config.js)', 'error');
    SK.formModal({
      title: 'เข้าสู่ระบบ', icon: 'login', size: 'sm', subtitle: 'ใช้ชื่อผู้ใช้และรหัสผ่านที่ผู้ดูแลระบบสร้างให้',
      fields: [
        { name: 'login', label: 'ชื่อผู้ใช้', required: true, placeholder: 'เช่น somchai', autocomplete: 'username' },
        { name: 'password', label: 'รหัสผ่าน', type: 'password', required: true }
      ],
      submitLabel: 'เข้าสู่ระบบ', submitIcon: 'login',
      onSubmit: function (v) {
        return SK.cloud.signIn(v.login, v.password).then(function (r) {
          if (!r.ok) { SK.toast(r.message, 'error'); return true; }
          SK.toast('เข้าสู่ระบบแล้ว กำลังโหลดข้อมูล...', 'success');
          setTimeout(function () { location.reload(); }, 500);
        });
      }
    });
  }
  function account() {
    var c = SK.cloud;
    if (!c.user) return loginForm();
    var st = STATUS[c.status] || STATUS.off;
    SK.modal({
      title: c.displayName(), subtitle: c.loginName(c.user.email) + ' • ' + roleLabel(), icon: 'account_circle', size: 'sm',
      body: '<div class="flex flex-col gap-3"><div class="flex items-start gap-3 p-4 rounded-2xl bg-surface-container-low">' + icon(st[0], 'text-primary') +
        '<div><div class="font-label-lg text-label-lg">' + esc(st[3]) + '</div>' + (c.detail ? '<div class="font-body-sm text-body-sm text-error">' + esc(c.detail) + '</div>' : '') +
        (c.lastSync ? '<div class="font-body-sm text-body-sm text-outline">ซิงก์ล่าสุด ' + esc(c.lastSync.toLocaleString('th-TH')) + '</div>' : '') + '</div></div>' +
        '<p class="font-body-sm text-body-sm muted">ข้อมูลที่บันทึก/แก้ไขทุกหน้าส่งขึ้นฐานข้อมูลกลางอัตโนมัติ เครื่องอื่นที่เข้าสู่ระบบจะเห็นข้อมูลชุดเดียวกัน</p></div>',
      actions: [
        { label: 'ออกจากระบบ', icon: 'logout', left: true, onClick: function (m) { c.signOut().then(function () { m.close(); location.reload(); }); } },
        { label: 'ชื่อ-ตำแหน่ง / รหัสผ่าน', icon: 'badge', onClick: function (m) { m.close(); profile(); } },
        c.active ? { label: 'ซิงก์ตอนนี้', icon: 'sync', kind: 'primary', onClick: function (m) {
          m.close();
          c.syncNow().then(function () { location.reload(); }, function (err) { SK.toast('ซิงก์ไม่สำเร็จ: ' + c.errText(err), 'error'); });
        } } : null
      ]
    });
  }
  function profile() {
    var c = SK.cloud, meta = c.user.user_metadata || {};
    SK.formModal({
      title: 'ข้อมูลบัญชี', icon: 'badge', size: 'sm',
      fields: [
        { name: 'full_name', label: 'ชื่อ-นามสกุล (แสดงในเว็บและผู้จัดทำเอกสาร)', value: meta.full_name || (c.staff && c.staff.name) || '', required: true, placeholder: 'เช่น นายสมชาย ใจดี' },
        { name: 'position', label: 'ตำแหน่ง', value: meta.position || '', placeholder: 'เช่น นายช่างโยธาชำนาญงาน' },
        { name: 'password', label: 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)', type: 'password', autocomplete: 'new-password' }
      ],
      onSubmit: function (v) {
        if (v.password && v.password.length < 6) { SK.toast('รหัสผ่านอย่างน้อย 6 ตัวอักษร', 'error'); return true; }
        return c.updateProfile({ full_name: v.full_name, position: v.position }).then(function () {
          return v.password ? c.changePassword(v.password) : null;
        }).then(function () { renderStatus(); SK.toast('บันทึกข้อมูลบัญชีแล้ว', 'success'); });
      }
    });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-action="account"]')) account(); });
  SK.account = account;
  SK.loginForm = loginForm;

  // ---------- เมนูแบบเอกสารสำเร็จรูป (ใต้ "พิมพ์เอกสารราชการ") ----------
  var navDocs = $('nav-docs');
  function buildDocMenu() {
    var groups = [];
    SK.engine.DOCS.forEach(function (d) { if (groups.indexOf(d.group) < 0) groups.push(d.group); });
    navDocs.innerHTML = groups.map(function (g) {
      return '<div class="px-2 pt-2 pb-0.5 font-label-sm text-label-sm text-outline">' + esc(g) + '</div>' +
        SK.engine.DOCS.filter(function (d) { return d.group === g; }).map(function (d) {
          return '<a href="#/documents?doc=' + d.key + '" data-doc-nav="' + d.key + '" class="flex items-center gap-2 px-2.5 py-1.5 rounded-full font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">' +
            icon(d.icon, 'text-[16px]') + '<span class="truncate">' + esc(d.title) + '</span></a>';
        }).join('');
    }).join('');
  }
  function markDocMenu() {
    var r = SK.parseHash(), on = r.name === 'documents';
    var cur = on && SK.documentsState ? SK.documentsState().doc : '';
    navDocs.querySelectorAll('[data-doc-nav]').forEach(function (a) {
      var act = a.dataset.docNav === cur;
      a.classList.toggle('bg-primary/10', act); a.classList.toggle('text-primary', act); a.classList.toggle('font-semibold', act);
      if (act) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  SK.markDocMenu = markDocMenu;
  buildDocMenu();
  // เปิดแบบเอกสาร: ใช้โครงการที่เลือกอยู่ในหน้าเอกสาร
  navDocs.addEventListener('click', function (e) {
    var a = e.target.closest('[data-doc-nav]'); if (!a) return;
    e.preventDefault();
    var proj = SK.documentsState ? SK.documentsState().project : '';
    SK.go('documents?doc=' + a.dataset.docNav + (proj ? '&project=' + encodeURIComponent(proj) : ''));
  });
  window.addEventListener('hashchange', function () { setTimeout(markDocMenu, 0); });

  // ---------- เริ่มทำงาน ----------
  window.addEventListener('hashchange', SK.render);
  window.addEventListener('sk:projects', function () { SK.refresh(); });
  // ลิงก์เมนูของเว็บรุ่นก่อน: index.html?page=openXxx
  var oldPage = new URLSearchParams(location.search).get('page');
  if (oldPage && /^open\w+$/.test(oldPage)) history.replaceState(null, '', location.pathname + (oldPage === 'openEntryGate' ? '#/entry' : '#/system/' + oldPage));
  if (!location.hash) history.replaceState(null, '', '#/overview');
  SK.render();
  SK.projects.load();
})();
