// หน้าแรก: แดชบอร์ดของระบบหลัก (เหมือนหน้าแรกในโค้ดระบบหลัก) — ผู้ควบคุมงาน / ธุรการกองช่าง / สายทางทางหลวงท้องถิ่น
// ข้อมูลชุดเดียวกับเว็บ (ชีท "ฐานข้อมูลโครงการ"); ปุ่มสร้างโครงการ/ลงทะเบียนสายทาง เปิดหน้าเดียวกันของเว็บ
(function () {
  'use strict';
  var SK = window.SK, V = SK.view, icon = SK.icon;

  function render(root) {
    root.innerHTML =
      '<div id="ov-holder" class="relative rounded-[20px] overflow-hidden" style="min-height:600px">' +
        '<div id="ov-wait" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-on-surface-variant">' + icon('progress_activity', 'animate-spin text-primary text-[32px]') + '<span>กำลังเปิดแดชบอร์ด...</span></div></div>';
    var holder = root.querySelector('#ov-holder');
    SK.engine.showDashboard(holder).then(function () {
      var w = root.querySelector('#ov-wait'); if (w) w.remove();
    }).catch(function (err) {
      holder.innerHTML = '<div class="card p-6">' + V.empty('error', 'เปิดแดชบอร์ดไม่สำเร็จ', SK.esc(err.message || err), '<a href="#/projects" class="btn-primary">ทะเบียนโครงการ</a>') + '</div>';
    });
  }

  SK.route('overview', {
    title: 'ภาพรวมโครงการ', render: render,
    refresh: function () {}, // แดชบอร์ดของระบบหลักโหลดข้อมูลใหม่เองเมื่อหน้าอื่นบันทึก
    leave: function () { SK.engine.undock(); }
  });
})();
