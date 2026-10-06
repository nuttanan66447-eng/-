// หน้าแรก/หน้าเมนู (index.html?page=ฟังก์ชันเปิดหน้าของระบบเดิม): แสดงหน้าของระบบเดิม (system.html) ตามโค้ดทุกหน้า
// ระบบเดิมทำงานใน iframe ที่มองเห็นได้ (ซ่อนเมนูซ้ายของระบบเดิม เพราะใช้เมนูซ้ายของเว็บ ซึ่งสร้างจากเมนูเดียวกันใน tools/sidebar.py)
// ข้อมูลชุดเดียวกับทุกหน้าของเว็บ (ตัวจำลอง Apps Script ใน assets/gas + ซิงก์คลาวด์จาก assets/cloud.js)
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui;
  var holder = document.getElementById('app-holder'), loading = document.getElementById('app-loading');
  var frame = null, ready = null, current = null;
  var params = new URLSearchParams(location.search);
  var TABS = { supervisor: 1, clerk: 1, localRoad: 1 };
  // CSS ที่ใส่ในระบบเดิม: ซ่อนเมนูซ้ายและแถบคำสั่งด้านบนของระบบเดิม (เว็บมีเมนู/แถบบนอยู่แล้ว)
  var HIDE = '.topbar{display:none!important}' +
    'body{padding-left:0!important;margin-left:0!important}' +
    '.app-shell{padding-left:0!important}' +
    '.entry-backdrop{inset:0!important}' +
    '.dashboard-commandbar{display:none!important}';

  function W() { return frame && frame.contentWindow; }
  function run(code) { try { return W().eval(code); } catch (e) { console.warn('ระบบเดิม:', code, e); return null; } }
  function wait(test, ms) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() { var v; try { v = test(); } catch (e) { v = null; } if (v || Date.now() - t0 > ms) return resolve(v); setTimeout(tick, 150); })();
    });
  }

  function load() {
    if (ready) return ready;
    ready = new Promise(function (resolve) {
      frame = document.createElement('iframe');
      frame.title = 'ระบบบริหารโครงการ กองช่าง เทศบาลตำบลสีแก้ว';
      frame.className = 'absolute inset-0 w-full h-full border-0 bg-[#f3f6fc] opacity-0 transition-opacity';
      frame.src = 'system.html?engine=1&app=1';
      frame.onload = function () {
        var w = W(), d = w.document;
        var st = d.createElement('style'); st.textContent = HIDE; d.head.appendChild(st);
        // รหัสยืนยันการบันทึกของระบบเดิม: เว็บจัดการสิทธิ์ด้วยการเข้าสู่ระบบของเว็บแล้ว
        var nativePrompt = w.prompt.bind(w);
        w.prompt = function (msg, def) { return /รหัส/.test(String(msg || '')) ? '223344' : nativePrompt(msg, def); };
        wait(function () { return run('typeof loadData === "function" && typeof enterAuthenticatedApp === "function"'); }, 20000).then(function () {
          run("currentUser={username:'website',fullName:" + JSON.stringify(userName()) + ",department:'กองช่าง',position:'',role:'admin',roleLabel:'ผู้ดูแลระบบ'};enterAuthenticatedApp();");
          return wait(function () { return run('Array.isArray(allRows)'); }, 15000);
        }).then(function () {
          loading.classList.add('hidden');
          frame.classList.remove('opacity-0');
          resolve(w);
        });
      };
      holder.appendChild(frame);
    });
    return ready;
  }
  function userName() { var u = ui.currentUser ? ui.currentUser() : null; return (u && u.signedIn && u.name) || 'ผู้ใช้เว็บไซต์กองช่าง'; }

  // เปิดหน้าตามเมนู
  function open(page) {
    current = page || 'home';
    markMenu(current);
    return load().then(function () {
      run("document.querySelectorAll('.open').forEach(function(x){ if(/[Bb]ackdrop|[Mm]odal/.test(x.id+' '+x.className)) x.classList.remove('open'); }); document.body.classList.remove('modal-open'); if(typeof returnToDashboardHome==='function') returnToDashboardHome();");
      if (TABS[current]) run("switchDashboardPage(" + JSON.stringify(current) + ")");
      else if (current !== 'home' && /^open\w+$/.test(current)) run("typeof " + current + "==='function' && " + current + "()");
    });
  }
  function markMenu(page) {
    document.querySelectorAll('#sidebar [data-page]').forEach(function (a) { a.classList.toggle('is-active', a.dataset.page === page); });
    var grp = document.querySelector('#sidebar .sk-submenu .is-active');
    if (grp) grp.closest('details').open = true;
  }
  function go(page, push) {
    var url = 'index.html' + (page && page !== 'home' ? '?page=' + encodeURIComponent(page) : '');
    try { (push ? history.pushState : history.replaceState).call(history, { page: page }, '', url); } catch (e) {}
    open(page);
  }

  // เมนูด้านซ้าย: เปิดหน้าในระบบที่โหลดอยู่แล้วโดยไม่โหลดหน้าเว็บใหม่
  document.addEventListener('click', function (e) {
    var a = e.target.closest('#sidebar a[data-page], #sidebar a.sk-brand');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    go(a.dataset.page || 'home', true);
    if (window.innerWidth < 1024) { var t = document.getElementById('sidebar-toggle'); if (t && t.getAttribute('aria-expanded') === 'true') t.click(); }
  });
  window.addEventListener('popstate', function () { open(new URLSearchParams(location.search).get('page') || 'home'); });

  // ปิดหน้าของระบบเดิม (ปุ่ม × ในหน้า) แล้วกลับหน้าแรก: ให้เมนูด้านซ้ายตรงกับหน้าที่แสดง
  setInterval(function () {
    if (!W() || !current || current === 'home' || TABS[current]) return;
    var openNow = run("!!document.querySelector('[id$=\"Backdrop\"].open, [id$=\"backdrop\"].open, .entry-backdrop.open')");
    if (openNow === false) { current = 'home'; markMenu('home'); try { history.replaceState({ page: 'home' }, '', 'index.html'); } catch (e) {} }
  }, 1200);

  // ข้อมูลเปลี่ยนจากคลาวด์/นำเข้า Excel: โหลดข้อมูลในระบบเดิมใหม่
  if (window.BroadcastChannel) {
    try { new BroadcastChannel('sikaew-gas').addEventListener('message', function (ev) { if (ev.data && ev.data.type === 'imported' && W()) run('typeof loadData==="function" && loadData()'); }); } catch (e) {}
  }

  SK.app = { open: go, run: run, load: load };
  ui.onReady(function () { open(params.get('page') || params.get('tab') || 'home'); });
})();
