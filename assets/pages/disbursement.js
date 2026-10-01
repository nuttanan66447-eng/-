// หน้าเบิกจ่ายและรายงาน สถ.
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var TARGET_Q3 = 63; // เกณฑ์ขั้นต่ำการเบิกจ่ายไตรมาส 3 ของ สถ. (%)
  var STEPS = ['sent', 'audit', 'approved', 'paid'];
  var STEP = {
    sent: { label: 'กองช่างส่งเรื่องแล้ว', cls: 'bg-surface-container-low text-secondary', dot: 'bg-secondary-container' },
    audit: { label: 'รอตรวจสอบการคลัง', cls: 'bg-surface-container-high text-primary', dot: 'bg-primary animate-pulse' },
    approved: { label: 'อนุมัติตัดจ่าย (รอเช็ค)', cls: 'bg-primary-fixed text-primary', dot: 'bg-primary' },
    paid: { label: 'จ่ายเงินแล้ว', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-600' }
  };
  var sortByAmount = false;

  function stats() {
    var P = SK.db.data.projects;
    var budget = P.reduce(function (s, p) { return s + p.budget; }, 0);
    var signed = P.filter(function (p) { return p.status !== 'signing'; });
    var po = signed.reduce(function (s, p) { return s + p.budget; }, 0);
    var disb = P.reduce(function (s, p) { return s + p.disbursed; }, 0);
    return { P: P, budget: budget, signed: signed.length, po: po, disb: disb, pct: budget ? disb / budget * 100 : 0 };
  }

  function renderKpis() {
    var s = stats();
    var pending = SK.db.data.payments.filter(function (x) { return x.status !== 'paid'; });
    var paidCount = s.P.reduce(function (n, p) { return n + (p.status === 'completed' ? p.installments : (p.disbursed > 0 ? Math.max(1, p.installment - 1) : 0)); }, 0);
    $('k-budget').textContent = money(s.budget);
    $('k-projects').textContent = s.P.length + ' โครงการ';
    $('k-po').textContent = money(s.po);
    $('k-po-pct').textContent = (s.po / s.budget * 100).toFixed(2) + '%';
    $('k-po-bar').style.width = (s.po / s.budget * 100).toFixed(2) + '%';
    $('k-signed').textContent = 'ลงนามสัญญาแล้ว ' + s.signed + ' โครงการ';
    $('k-po-remain').textContent = 'คงเหลือ ' + ((s.budget - s.po) / 1e6).toFixed(2) + ' ลบ.';
    $('k-disb').textContent = money(s.disb);
    $('k-disb-pct').textContent = s.pct.toFixed(2) + '%';
    $('k-disb-bar').style.width = s.pct.toFixed(2) + '%';
    $('k-paid').textContent = 'จ่ายเงินแล้ว ' + paidCount + ' งวด';
    $('k-wait').textContent = 'รอเบิกจ่าย ' + (pending.reduce(function (t, x) { return t + x.amount; }, 0) / 1e6).toFixed(2) + ' ลบ.';
    $('k-actual').textContent = s.pct.toFixed(2) + '%';
    var diff = s.pct - TARGET_Q3;
    $('k-vs').textContent = diff >= 0 ? 'เร็วกว่าเป้าหมายราชการ' : 'ต่ำกว่าเป้าหมายราชการ';
    $('k-diff').textContent = (diff >= 0 ? '+' : '') + diff.toFixed(2) + '%';
    renderChart(s.pct);
    var linked = s.P.filter(function (p) { return p.status !== 'signing'; });
    var withEgp = linked.filter(function (p) { return /^\d{9,}$/.test(p.egp || ''); });
    $('egp-linked').textContent = withEgp.length + ' / ' + linked.length + ' โครงการ';
    $('egp-state').textContent = withEgp.length === linked.length ? 'ข้อมูลครบถ้วน' : 'ขาด ' + (linked.length - withEgp.length) + ' โครงการ';
    var last = SK.db.data.meta.lastSync;
    $('egp-sync').textContent = last ? new Date(last).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) + ' น.' : 'ยังไม่เคยตรวจสอบ';
    var sg = s.P.filter(function (p) { return p.source === 'specific-grant'; });
    $('sg-text').textContent = 'โครงการเงินอุดหนุนเฉพาะกิจ ' + sg.length + ' โครงการ งบประมาณรวม ' + money(sg.reduce(function (t, p) { return t + p.budget; }, 0)) + ' บาท บันทึกผลใน e-Plan และ e-GP';
    var sgState = SK.db.data.meta.sgReport;
    $('sg-state').textContent = sgState ? 'ส่งรายงานแล้ว ' + ui.dateShort(sgState.date) : 'รอส่งรายงาน';
  }

  function renderChart(actual) {
    var q = [
      { label: 'ไตรมาส 1', target: 30, actual: 34.2 },
      { label: 'ไตรมาส 2', target: 51, actual: 55 },
      { label: 'ไตรมาส 3 ปัจจุบัน', target: TARGET_Q3, actual: actual, current: true },
      { label: 'ไตรมาส 4', target: 93, actual: null }
    ];
    $('q-chart').innerHTML = q.map(function (x) {
      return '<div class="flex-1 flex flex-col items-center gap-space-2xs h-full justify-end ' + (x.current ? 'bg-surface-container-high/40 rounded-lg p-space-2xs' : '') + (x.actual == null ? ' opacity-60' : '') + '">' +
        '<div class="flex items-end gap-space-2xs w-full justify-center h-full">' +
        '<div class="w-7 ' + (x.current ? 'bg-primary-container' : 'bg-primary-container/30') + ' rounded-t" style="height:' + x.target + '%" title="เป้าหมาย สถ. ' + x.target + '%"></div>' +
        (x.actual == null ? '<div class="w-7 bg-surface-container-highest rounded-t" style="height:4%" title="ยังไม่ถึงรอบรายงาน"></div>' : '<div class="w-7 bg-secondary-container rounded-t" style="height:' + Math.min(100, x.actual) + '%" title="ผลการเบิกจ่ายจริง ' + x.actual.toFixed(1) + '%"></div>') +
        '</div><span class="font-label-sm text-label-sm text-center ' + (x.current ? 'text-primary font-bold' : 'text-on-surface-variant') + '">' + x.label + ' (' + (x.actual == null ? 'เป้า ' + x.target : x.actual.toFixed(1)) + '%)</span></div>';
    }).join('');
  }

  function payments() {
    var q = $('pay-search').value.trim().toLowerCase();
    var st = $('pay-status').value;
    return SK.db.data.payments.filter(function (x) {
      if (st === 'all' ? x.status === 'paid' : x.status !== st) return false;
      if (!q) return true;
      var p = SK.db.project(x.projectId) || {};
      return [x.id, x.installment, p.id, p.name, p.contractNo, p.contractor].join(' ').toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return sortByAmount ? b.amount - a.amount : b.submitted.localeCompare(a.submitted); });
  }

  function renderPayments() {
    var rows = payments();
    var pending = SK.db.data.payments.filter(function (x) { return x.status !== 'paid'; });
    $('pending-count').textContent = 'รอเบิกจ่าย ' + pending.length + ' รายการ';
    $('pay-body').innerHTML = rows.map(function (x, i) {
      var p = SK.db.project(x.projectId) || { name: x.projectId, contractNo: '-', contractor: '-', egp: '-' };
      var s = STEP[x.status];
      return '<tr class="' + (i % 2 ? 'bg-surface-container-lowest ' : '') + 'hover:bg-surface-container-low/60 transition-colors">' +
        '<td class="py-space-md px-space-md"><div class="font-code-sm text-code-sm font-bold text-primary whitespace-nowrap">' + esc(x.id) + '</div><div class="font-label-sm text-label-sm text-secondary font-semibold">' + esc(x.installment) + '</div></td>' +
        '<td class="py-space-md px-space-md min-w-[200px]"><a href="progress.html?id=' + encodeURIComponent(p.id || '') + '" class="font-headline-sm text-headline-sm text-on-surface hover:text-primary hover:underline line-clamp-2">' + esc(p.name) + '</a><div class="font-code-sm text-code-sm text-on-surface-variant">สัญญาเลขที่ ' + esc(p.contractNo) + '</div></td>' +
        '<td class="py-space-md px-space-md text-right whitespace-nowrap"><span class="font-code-sm text-code-sm font-bold text-on-surface">' + money(x.amount, 2) + '</span></td>' +
        '<td class="py-space-md px-space-md"><div class="text-on-surface font-semibold">' + esc(p.contractor) + '</div><div class="text-on-surface-variant font-label-sm text-label-sm">e-GP: ' + esc(p.egp) + '</div></td>' +
        '<td class="py-space-md px-space-md whitespace-nowrap"><div class="text-on-surface">' + ui.dateShort(x.inspected || x.submitted) + '</div><div class="text-on-surface-variant font-code-sm text-code-sm">' + esc(x.memo || '-') + '</div></td>' +
        '<td class="py-space-md px-space-md whitespace-nowrap"><button type="button" data-action="advance-payment" data-id="' + esc(x.id) + '" title="เลื่อนสถานะขั้นถัดไป" class="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full font-label-sm text-label-sm font-bold ' + s.cls + '"><span class="w-1.5 h-1.5 rounded-full ' + s.dot + '"></span>' + s.label + '</button></td>' +
        '<td class="py-space-md px-space-md text-center"><button type="button" data-action="payment-docs" data-id="' + esc(x.id) + '" class="p-space-xs bg-surface-container-low hover:bg-surface-container-high text-primary rounded-lg transition-colors" title="ตรวจสอบเอกสารฎีกาและรายงานช่าง" aria-label="เอกสารฎีกา ' + esc(x.id) + '"><span class="material-symbols-outlined">folder_zip</span></button></td></tr>';
    }).join('') || '<tr><td colspan="7" class="py-8 text-center text-on-surface-variant">ไม่มีรายการ</td></tr>';
    $('pay-total').textContent = money(rows.reduce(function (t, x) { return t + x.amount; }, 0), 2) + ' บาท';
    $('pay-sort').classList.toggle('ring-2', sortByAmount);
  }

  function findPay(id) { return SK.db.data.payments.filter(function (x) { return x.id === id; })[0]; }

  function advance(pay) {
    var next = STEPS[STEPS.indexOf(pay.status) + 1];
    if (!next) return ui.toast('ฎีกานี้จ่ายเงินแล้ว', 'info');
    var p = SK.db.project(pay.projectId);
    var msg = next === 'paid' ? 'ยืนยันจ่ายเงิน ' + money(pay.amount, 2) + ' บาท ให้ ' + (p ? p.contractor : '') + '? ยอดเบิกจ่ายของโครงการจะถูกปรับเพิ่ม' : 'เลื่อนสถานะ ' + pay.id + ' เป็น "' + STEP[next].label + '"?';
    ui.confirm(msg, next === 'paid' ? 'ยืนยันจ่ายเงิน' : 'เลื่อนสถานะ').then(function (ok) {
      if (!ok) return;
      pay.status = next;
      if (next === 'paid' && p) {
        p.disbursed = Math.min(p.budget, p.disbursed + pay.amount);
        if (p.disbursed >= p.budget && p.status === 'pending-inspection') { p.status = 'completed'; p.actual = 100; p.plan = 100; p.installment = p.installments; }
        pay.paidAt = ui.today();
      }
      SK.db.save(); refresh();
      ui.toast(pay.id + ': ' + STEP[next].label, 'success');
    });
  }

  function refresh() { renderKpis(); renderPayments(); }

  function closeExport() {
    $('export-menu').classList.add('hidden'); $('export-menu').classList.remove('flex');
    $('export-btn').setAttribute('aria-expanded', 'false');
  }

  Object.assign(SK.actions, {
    'sync-egp': function (el) {
      var orig = el.innerHTML;
      el.innerHTML = '<span class="material-symbols-outlined text-space-lg animate-spin">sync</span><span>กำลังตรวจสอบข้อมูลสัญญา...</span>';
      el.disabled = true;
      setTimeout(function () {
        SK.db.data.meta.lastSync = new Date().toISOString();
        SK.db.save(); refresh();
        el.innerHTML = orig; el.disabled = false;
        var missing = stats().P.filter(function (p) { return p.status !== 'signing' && !/^\d{9,}$/.test(p.egp || ''); });
        ui.toast(missing.length ? 'พบ ' + missing.length + ' โครงการที่ยังไม่มีเลข e-GP: ' + missing.map(function (p) { return p.id; }).join(', ') : 'ตรวจสอบแล้ว ทุกสัญญามีเลขโครงการ e-GP ครบถ้วน', missing.length ? 'error' : 'success');
      }, 700);
    },
    'export-menu': function (el, e) {
      e.stopPropagation();
      var m = $('export-menu'), open = m.classList.contains('hidden');
      m.classList.toggle('hidden', !open); m.classList.toggle('flex', open);
      el.setAttribute('aria-expanded', open);
      if (open) setTimeout(function () { document.addEventListener('click', closeExport, { once: true }); }, 0);
    },
    'export-xlsx': function () {
      closeExport();
      var rows = [['ที่', 'รหัสโครงการ', 'ชื่อโครงการ', 'แหล่งงบประมาณ', 'วงเงินสัญญา', 'เบิกจ่ายแล้ว', 'ร้อยละเบิกจ่าย', 'ผลงาน%', 'สถานะ', 'เลข e-GP']]
        .concat(stats().P.map(function (p, i) { return [i + 1, p.id, p.name, ref.SOURCES[p.source], p.budget, p.disbursed, p.budget ? (p.disbursed / p.budget * 100).toFixed(2) : 0, p.actual, ref.STATUSES[p.status].label, p.egp]; }));
      ui.csv('sla-report-sikaew-' + ui.today() + '.csv', rows);
      ui.toast('ส่งออกรายงานแบบ สถ. 01-03 (เปิดด้วย Excel ได้)', 'success');
    },
    'export-pdf': function () {
      closeExport();
      var list = SK.db.data.payments;
      ui.printDoc('สรุปงวดฎีกา', '<h1>สรุปงวดฎีกาทางการคลัง กองช่าง</h1><table><tr><th>เลขที่ฎีกา</th><th>โครงการ</th><th>งวด</th><th>จำนวนเงิน</th><th>สถานะ</th></tr>' +
        list.map(function (x) { var p = SK.db.project(x.projectId) || {}; return '<tr><td>' + esc(x.id) + '</td><td>' + esc(p.name) + '</td><td>' + esc(x.installment) + '</td><td class="num">' + money(x.amount, 2) + '</td><td>' + STEP[x.status].label + '</td></tr>'; }).join('') +
        '<tr><th colspan="3">รวม</th><th class="num">' + money(list.reduce(function (t, x) { return t + x.amount; }, 0), 2) + '</th><th></th></tr></table>');
    },
    'open-eplan': function () { closeExport(); window.open('https://www.dla.go.th/', '_blank', 'noopener'); ui.toast('เปิดเว็บไซต์กรมส่งเสริมการปกครองท้องถิ่นเพื่อเข้าระบบ e-Plan'); },
    'pay-sort': function () { sortByAmount = !sortByAmount; renderPayments(); ui.toast(sortByAmount ? 'เรียงตามจำนวนเงินมากไปน้อย' : 'เรียงตามวันที่ส่งฎีกาล่าสุด'); },
    'advance-payment': function (el) { advance(findPay(el.dataset.id)); },
    'payment-docs': function (el) {
      var pay = findPay(el.dataset.id), p = SK.db.project(pay.projectId);
      var docs = ['บันทึกขออนุมัติเบิกจ่าย (ฎีกา)', 'ใบแจ้งหนี้ / ใบส่งมอบงานของผู้รับจ้าง', 'ใบรายงานผลการตรวจรับพัสดุ (' + (pay.memo || '-') + ')', 'ภาพถ่ายความก้าวหน้าพร้อมพิกัด GIS', 'สำเนาสัญญาจ้างและหลักประกันสัญญา', 'ใบกำกับภาษี / ใบเสร็จรับเงิน'];
      var next = STEPS[STEPS.indexOf(pay.status) + 1];
      ui.modal({
        title: 'เอกสารประกอบ' + pay.id, subtitle: (p ? p.name : '') + ' • ' + pay.installment, icon: 'folder_zip', size: 'md',
        body: '<div class="p-3 rounded-lg bg-surface-container-low mb-3 flex flex-wrap justify-between gap-2"><span>จำนวนเงิน <strong class="text-primary">' + money(pay.amount, 2) + ' บาท</strong></span><span class="px-2 py-0.5 rounded-full font-label-sm text-label-sm ' + STEP[pay.status].cls + '">' + STEP[pay.status].label + '</span></div>' +
          '<ul class="flex flex-col gap-2">' + docs.map(function (d) { return '<li class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">check_box</span>' + esc(d) + '</li>'; }).join('') + '</ul>',
        actions: [
          { label: 'พิมพ์ชุดเอกสาร', icon: 'print', onClick: function () { SK.docs.print('paymentPackage', 'ชุดเอกสาร ' + pay.id, pay, p); } },
          { label: 'ดูโครงการ', icon: 'construction', onClick: function () { location.href = 'progress.html?id=' + encodeURIComponent(pay.projectId); } }
        ].concat(next ? [{ label: next === 'paid' ? 'ยืนยันจ่ายเงิน' : 'เลื่อนเป็น: ' + STEP[next].label, kind: 'primary', icon: 'arrow_forward', onClick: function (m) { m.close(); advance(pay); } }] : [])
      });
    },
    'new-payment': function () {
      var eligible = ui.projectOptions(function (p) { return p.status !== 'signing' && p.disbursed < p.budget; });
      ui.formModal({
        title: 'ส่งฎีกาขอเบิกจ่ายงวดงาน', icon: 'request_quote', size: 'md', submitLabel: 'ส่งเรื่องเบิกจ่าย', submitIcon: 'send',
        fields: [
          { name: 'projectId', label: 'โครงการ', type: 'select', span: 2, options: eligible },
          { name: 'installment', label: 'งวดงาน', required: true, placeholder: 'เช่น งวดที่ 2' },
          { name: 'amount', label: 'จำนวนเงิน (บาท)', type: 'number', min: 1, step: '0.01', required: true },
          { name: 'inspected', label: 'วันที่ตรวจรับผ่าน', type: 'date', value: ui.today() },
          { name: 'memo', label: 'เลขที่บันทึกตรวจรับ', placeholder: 'ม.ช่าง xx/67' }
        ],
        onSubmit: function (v) {
          var p = SK.db.project(v.projectId);
          var pendingSum = SK.db.data.payments.filter(function (x) { return x.projectId === p.id && x.status !== 'paid'; }).reduce(function (t, x) { return t + x.amount; }, 0);
          if (p.disbursed + pendingSum + v.amount > p.budget) { ui.toast('ยอดเบิกรวมเกินวงเงินสัญญา (คงเหลือเบิกได้ ' + money(p.budget - p.disbursed - pendingSum, 2) + ' บาท)', 'error'); return true; }
          var n = SK.db.data.payments.reduce(function (m, x) { var k = +(/(\d+)$/.exec(x.id) || [0, 0])[1]; return Math.max(m, k); }, 0) + 1;
          SK.db.data.payments.unshift({ id: 'ฎีกา 67-' + String(n).padStart(4, '0'), projectId: p.id, installment: v.installment, amount: v.amount, status: 'sent', submitted: ui.today(), inspected: v.inspected, memo: v.memo });
          SK.db.save(); $('pay-status').value = 'all'; refresh();
          ui.toast('ส่งฎีกาเบิกจ่ายเรียบร้อย', 'success');
        }
      });
    },
    'check-egp': function () {
      var list = stats().P.filter(function (p) { return p.status !== 'signing'; });
      ui.modal({
        title: 'ตรวจสอบรหัสคุมสัญญา e-GP', subtitle: list.length + ' สัญญาที่ลงนามแล้ว', icon: 'sync_alt', size: 'lg',
        body: '<div class="overflow-x-auto"><table class="w-full text-left font-body-sm text-body-sm"><thead><tr class="text-on-surface-variant"><th class="py-1">รหัส</th><th>เลขที่สัญญา</th><th>เลข e-GP</th><th>ผล</th></tr></thead><tbody>' +
          list.map(function (p) { var ok = /^\d{9,}$/.test(p.egp || ''); return '<tr class="border-t border-surface-container"><td class="py-1.5">' + p.id + '</td><td>' + esc(p.contractNo) + '</td><td class="font-code-sm">' + esc(p.egp || '-') + '</td><td class="' + (ok ? 'text-emerald-700' : 'text-error') + ' font-semibold">' + (ok ? 'ถูกต้อง' : 'ไม่พบเลข e-GP') + '</td></tr>'; }).join('') +
          '</tbody></table></div><p class="mt-3 font-body-sm text-body-sm text-on-surface-variant">ตรวจสอบรูปแบบเลขโครงการในทะเบียนของกองช่าง หากต้องการยืนยันกับประกาศจริง ให้ค้นหาเลขโครงการในระบบ e-GP</p>',
        actions: [{ label: 'เปิดระบบ e-GP', kind: 'primary', icon: 'open_in_new', onClick: function () { window.open('https://www.gprocurement.go.th/', '_blank', 'noopener'); } }]
      });
    },
    'print-p01': function () { SK.docs.print('slaReport', 'แบบ ผ.01-ผ.03', stats().P); },
    'preview-p01': function () {
      var P = stats().P;
      ui.modal({
        title: 'ร่างรายงานผลการดำเนินงาน (แบบ ผ.01 - ผ.03)', subtitle: 'ปีงบประมาณ พ.ศ. 2567 • ' + P.length + ' โครงการ', icon: 'visibility', size: 'lg',
        body: '<div class="overflow-x-auto"><table class="w-full text-left font-body-sm text-body-sm"><thead><tr class="text-on-surface-variant"><th class="py-1">รหัส</th><th>โครงการ</th><th class="text-right">วงเงิน</th><th class="text-right">เบิกจ่าย</th><th class="text-right">ผลงาน</th></tr></thead><tbody>' +
          P.map(function (p) { return '<tr class="border-t border-surface-container"><td class="py-1.5 whitespace-nowrap">' + p.id + '</td><td>' + esc(p.name) + '</td><td class="text-right">' + money(p.budget) + '</td><td class="text-right">' + money(p.disbursed) + '</td><td class="text-right">' + p.actual + '%</td></tr>'; }).join('') + '</tbody></table></div>',
        actions: [{ label: 'พิมพ์รายงาน', kind: 'primary', icon: 'print', onClick: function () { SK.docs.print('slaReport', 'แบบ ผ.01-ผ.03', P); } }]
      });
    },
    'update-sg': function () {
      ui.formModal({
        title: 'อัปเดตผลโครงการเงินอุดหนุนเฉพาะกิจ (สถ.)', icon: 'upload_file', submitLabel: 'บันทึกการส่งรายงาน',
        intro: '<p class="mb-3 font-body-sm text-body-sm text-on-surface-variant">บันทึกว่าส่งรายงานเข้าระบบ e-Plan ของ สถ. แล้ว และพิมพ์รายงานแนบหนังสือนำส่ง</p>',
        fields: [
          { name: 'round', label: 'รอบรายงาน', type: 'select', options: ['ไตรมาส 3/2567 (เม.ย. - มิ.ย.)', 'ไตรมาส 4/2567 (ก.ค. - ก.ย.)'] },
          { name: 'date', label: 'วันที่ส่ง', type: 'date', value: ui.today() },
          { name: 'ref', label: 'เลขที่อ้างอิงในระบบ e-Plan', span: 2, placeholder: 'ถ้ามี' },
          { name: 'print', label: 'พิมพ์รายงานโครงการเงินอุดหนุนเฉพาะกิจ', type: 'checkbox', value: true, span: 2 }
        ],
        onSubmit: function (v) {
          SK.db.data.meta.sgReport = v; SK.db.save(); renderKpis();
          ui.toast('บันทึกการส่งรายงาน ' + v.round + ' แล้ว', 'success');
          if (v.print) SK.docs.print('slaReport', 'รายงานเงินอุดหนุนเฉพาะกิจ', stats().P.filter(function (p) { return p.source === 'specific-grant'; }), 'รายงานโครงการเงินอุดหนุนเฉพาะกิจ (สถ.) ' + v.round);
        }
      });
    },
    'extension': function () { SK.docs.print('extension', 'รายงานขยายเวลาเบิกจ่าย'); }
  });

  SK.page = { refresh: refresh };
  ui.onReady(function () {
    var q = new URLSearchParams(location.search).get('q');
    if (q) $('pay-search').value = q;
    $('pay-search').addEventListener('input', renderPayments);
    $('pay-status').addEventListener('change', renderPayments);
    refresh();
  });
})();
