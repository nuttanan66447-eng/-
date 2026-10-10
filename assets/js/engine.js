// เครื่องยนต์ระบบหลัก (system.html = ระบบเดิม v190) ทำงานใน iframe เดียวของเว็บ
// - สร้างเอกสารราชการ: เปิดฟอร์มของระบบหลัก -> สร้าง -> เก็บ HTML ที่ระบบหลักส่งไปพิมพ์ มาแสดงใน Smart Editor ของเว็บ
// - แสดงหน้า/ฟอร์มของระบบหลักในหน้าเว็บ (dock): iframe วางทับกล่องในหน้า (ฟอร์มกรอกข้อมูลโครงการ เครื่องมืออื่น ๆ)
// เนื้อหาเอกสารเหมือนระบบหลักทุกตัวอักษร
(function () {
  'use strict';
  var SK = window.SK;

  // ---------- รายการเอกสาร ----------
  // open: คำสั่งเปิดฟอร์มในระบบหลัก • root: id ฟอร์ม • area: พื้นที่พรีวิว • gen: 'submit' หรือคำสั่งสร้าง • print: คำสั่งพิมพ์
  var DOCS = [
    { key: 'combined', group: 'รายงานช่าง', title: 'รายงานช่างรวม 3 เอกสาร', desc: 'บันทึกข้อความ + บันทึกการปฏิบัติงาน + ผลการดำเนินงาน', icon: 'engineering', open: 'openEngineerReportHome();openEngineerCombinedForm()', root: 'engineerCombinedForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'sCurve', group: 'รายงานช่าง', title: 'S-Curve', desc: 'กราฟแผน/ผลการดำเนินงานสะสม', icon: 'show_chart', open: 'openEngineerReportHome();openSCurveForm()', root: 'sCurveForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'workReduction', group: 'รายงานช่าง', title: 'ปรับลดปริมาณงาน', desc: 'บันทึกขอปรับลดปริมาณงานพร้อมรายงานการประชุม', icon: 'content_cut', open: 'openEngineerReportHome();openWorkReductionForm()', root: 'workReductionForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'photo', group: 'รูปและป้ายโครงการ', title: 'รูปภาพโครงการ', desc: 'หน้าปริ้นรูปถ่ายก่อน/ระหว่าง/หลังดำเนินการ', icon: 'photo_library', open: 'openEngineerReportHome();openProjectPhotoForm()', root: 'projectPhotoForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'sign', group: 'รูปและป้ายโครงการ', title: 'ป้ายโครงการ', desc: 'ป้ายประชาสัมพันธ์โครงการตามแบบ', icon: 'signpost', open: 'openEngineerReportHome();openProjectSignForm()', root: 'projectSignForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'contractorNotice', group: 'ส่งมอบและตรวจรับ', title: 'แจ้งให้ผู้รับจ้างเข้าดำเนินการ', desc: 'หนังสือแจ้งผู้รับจ้างพร้อมความเห็นคณะกรรมการ', icon: 'mail', open: 'openEngineerReportHome();openContractorNoticeForm()', root: 'contractorNoticeForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'completion', group: 'ส่งมอบและตรวจรับ', title: 'รายงานผลแล้วเสร็จ 100%', desc: 'รายงานวันถึงกำหนดส่งมอบงานของผู้รับจ้าง', icon: 'task_alt', open: 'openEngineerReportHome();openCompletionReportForm()', root: 'completionReportForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'testResult', group: 'ส่งมอบและตรวจรับ', title: 'ผลทดสอบวัสดุ', desc: 'ดิน เหล็ก คอนกรีต AC Job-mix ขออนุมัติวัสดุ', icon: 'science', open: 'openTestResultPage()', root: 'testResultForm', area: 'testResultPrintArea', gen: 'createTestResultRecord()', print: 'printTestResultDocument()' },
    { key: 'torSpecific', group: 'จัดซื้อจัดจ้าง', title: 'ร่าง TOR ว159 แบบเจาะจง', desc: 'งบไม่เกินห้าแสนบาท: เชิญประชุม + รายงานการประชุม + ร่างขอบเขตงาน', icon: 'gavel', open: "openTorDraftHome();openTorDraftForm('specific')", root: 'torDraftForm', area: 'torDraftPrintArea', gen: 'submit', print: 'printTorDraftDocument()' },
    { key: 'torEbidding', group: 'จัดซื้อจัดจ้าง', title: 'ร่าง TOR e-bidding', desc: 'งบเกินห้าแสนบาท: เชิญประชุม + รายงานการประชุม + ร่างขอบเขตงาน', icon: 'gavel', open: "openTorDraftHome();openTorDraftForm('ebidding')", root: 'torDraftForm', area: 'torDraftPrintArea', gen: 'submit', print: 'printTorDraftDocument()' },
    { key: 'centralPrice', group: 'จัดซื้อจัดจ้าง', title: 'กำหนดราคากลาง (ชุด 4 ตอน)', desc: 'บันทึก คำสั่ง รายงานการประชุม และรายงานผล', icon: 'calculate', open: 'openCentralPricePage()', root: 'centralPriceForm', area: 'centralPricePrintArea', gen: "createAndPrintCentralPriceDocument('combined')", print: 'printCentralPriceDocument()' },
    { key: 'lowBid', group: 'จัดซื้อจัดจ้าง', title: 'แจ้งราคาต่ำกว่าราคากลาง ๑๕%', desc: 'ชุดเอกสารชี้แจงราคาต่ำกว่าราคากลาง', icon: 'percent', open: 'openLowBidNoticePage()', root: 'lowBidForm', area: 'lowBidPrintArea', gen: 'previewLowBidNotice()', print: 'printLowBidNotice()' },
    { key: 'kValue', group: 'ค่า K และค่าตอบแทน', title: 'คำนวณค่า K', desc: 'Escalation Factor จากดัชนีราคา', icon: 'functions', open: 'openKReportHome();openKValueFromReportHome()', root: 'kValueForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'kInvite', group: 'ค่า K และค่าตอบแทน', title: 'บันทึกเชิญประชุมค่า K', desc: 'เชิญคณะกรรมการพิจารณาค่า K', icon: 'groups', open: "openKReportHome();openKMeetingDocument('invite')", root: 'torDraftForm', area: 'torDraftPrintArea', gen: 'submit', print: 'printTorDraftDocument()' },
    { key: 'kMeeting', group: 'ค่า K และค่าตอบแทน', title: 'รายงานการประชุมค่า K', desc: 'รายงานการประชุมและระเบียบวาระ', icon: 'record_voice_over', open: "openKReportHome();openKMeetingDocument('meeting')", root: 'torDraftForm', area: 'torDraftPrintArea', gen: 'submit', print: 'printTorDraftDocument()' },
    { key: 'compTor', group: 'ค่า K และค่าตอบแทน', title: 'เบิกค่าตอบแทน TOR และราคากลาง', desc: 'บันทึกเบิกค่าตอบแทนคณะกรรมการ', icon: 'payments', open: "openCompensationPage();selectCompensationDocumentType('torPrice')", root: 'compensationForm', area: 'compensationPrintArea', gen: "createCompensationDocument('torPrice')", print: 'printCompensationDocument()' },
    { key: 'compInspection', group: 'ค่า K และค่าตอบแทน', title: 'เบิกค่าตอบแทนกรรมการตรวจรับพัสดุ', desc: 'บันทึกเบิกค่าตอบแทนคณะกรรมการตรวจรับ', icon: 'payments', open: "openCompensationPage();selectCompensationDocumentType('inspection')", root: 'compensationForm', area: 'compensationPrintArea', gen: "createCompensationDocument('inspection')", print: 'printCompensationDocument()' },
    { key: 'compSupervisor', group: 'ค่า K และค่าตอบแทน', title: 'เบิกค่าตอบแทนผู้ควบคุมงาน', desc: 'บันทึกเบิกค่าตอบแทนผู้ควบคุมงาน', icon: 'payments', open: "openCompensationPage();selectCompensationDocumentType('supervisor')", root: 'compensationForm', area: 'compensationPrintArea', gen: "createCompensationDocument('supervisor')", print: 'printCompensationDocument()' },
    { key: 'building', general: true, group: 'งานอาคารและบุคลากร', title: 'บันทึกตรวจสอบสิ่งปลูกสร้างอาคาร', desc: 'บันทึกตรวจสอบพร้อมหน้าความเห็นท้ายรายงาน', icon: 'home_work', open: 'openBuildingInspectionPage();openBuildingInspectionForm()', root: 'buildingInspectionForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'a1', general: true, group: 'งานอาคารและบุคลากร', title: 'ใบ อ.1', desc: 'ใบอนุญาต/คำขอ/หมายเหตุ/ต่ออายุ', icon: 'badge', open: 'openBuildingInspectionPage();openBuildingPermitA1Form()', root: 'buildingPermitA1Form', gen: 'previewBuildingPermitA1Document()', print: 'printMemoDocument()' },
    { key: 'evaluation', general: true, group: 'งานอาคารและบุคลากร', title: 'แบบประเมินผลการปฏิบัติงาน', desc: 'ข้าราชการ / พนักงานจ้างตามภารกิจ / พนักงานจ้างทั่วไป', icon: 'assignment_ind', open: 'openPerformanceEvaluationPage()', root: 'performanceEvaluationBackdrop', area: 'performanceEvaluationPrintArea', gen: null, print: 'printPerformanceEvaluation()', keepActions: true }
  ];
  // หน้าอื่นของระบบหลัก (เปิดทั้งหน้าในเว็บ)
  var TOOLS = [
    { fn: 'openEntryGate', title: 'กรอกข้อมูลโครงการ', icon: 'add_circle' },
    { fn: 'openEngineerReportHome', title: 'รายงานช่าง', icon: 'engineering' },
    { fn: 'openBuildingInspectionPage', title: 'ตรวจสอบอาคาร', icon: 'home_work' },
    { fn: 'openTestResultPage', title: 'ผลทดสอบ', icon: 'science' },
    { fn: 'openTorDraftHome', title: 'ร่าง TOR', icon: 'gavel' },
    { fn: 'openCentralPricePage', title: 'กำหนดราคากลาง', icon: 'calculate' },
    { fn: 'openLowBidNoticePage', title: 'แจ้งราคาต่ำกว่าราคากลาง ๑๕%', icon: 'percent' },
    { fn: 'openKReportHome', title: 'รายงานค่า K', icon: 'functions' },
    { fn: 'openCompensationPage', title: 'เบิกค่าตอบแทน', icon: 'payments' },
    { fn: 'openDocumentLibrary', title: 'เอกสารดาวน์โหลด', icon: 'folder_open' },
    { fn: 'openLocalRoadEntryGate', title: 'คุมสายทาง', icon: 'add_road' },
    { fn: 'openConstructionDurationPage', title: 'คำนวณงวดงาน', icon: 'timer' },
    { fn: 'openPerformanceEvaluationPage', title: 'แบบประเมิน', icon: 'assignment_ind' },
    // หน้าผู้ดูแลระบบ: เฉพาะบัญชีผู้ดูแลระบบของเว็บ (SK.cloud.isAdmin)
    { fn: 'openPersonnelManager', title: 'รายชื่อบุคลากร', icon: 'badge', admin: true },
    { fn: 'openUserManager', title: 'จัดการผู้ใช้งาน', icon: 'manage_accounts', admin: true },
    { fn: 'openRolePermissionManager', title: 'ตัวจัดการสิทธิ์การใช้งาน', icon: 'shield_person', admin: true },
    { fn: 'openSystemOptionManager', title: 'จัดการตัวเลือกทั้งหมด', icon: 'tune', admin: true }
  ];

  var frame = null, readyPromise = null, captured = null, messages = [], currentArea = 'memoPrintArea', generating = false;
  var engineWorker = null, docked = null;
  var OFFSCREEN = 'position:fixed;left:-12000px;top:0;width:1280px;height:900px;border:0;opacity:0;pointer-events:none';

  function W() { return frame && frame.contentWindow; }
  function run(code) { return W().eval(code); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function waitFor(fn, timeout) {
    var t0 = Date.now();
    return new Promise(function (resolve) {
      (function tick() {
        var v; try { v = fn(); } catch (e) { v = null; }
        if (v || Date.now() - t0 > (timeout || 8000)) resolve(v); else setTimeout(tick, 120);
      })();
    });
  }
  function errors() { return messages.filter(function (m) { return !/เรียบร้อย|สำเร็จ/.test(m); }); }
  function userName() { return (SK.cloud && SK.cloud.displayName && SK.cloud.displayName()) || 'ผู้ใช้เว็บไซต์กองช่าง'; }

  // เอกสารที่ระบบหลักสั่ง window.print() ทั้งหน้า: คัดลอกพื้นที่เอกสาร + กรอบที่ครอบ + สไตล์ทั้งหมด
  function snapshotArea() {
    var d = W().document, area = d.getElementById(currentArea);
    if (!area || !area.innerHTML.trim()) return null;
    var attrs = function (el) {
      return ['id', 'class', 'style'].map(function (a) { var v = el.getAttribute(a); return v ? ' ' + a + '="' + v.replace(/"/g, '&quot;') + '"' : ''; }).join('');
    };
    var chain = [], el = area.parentElement;
    while (el && el !== d.body) { chain.unshift(el); el = el.parentElement; }
    var open = chain.map(function (e) { return '<' + e.tagName.toLowerCase() + attrs(e).replace(/ class="/, ' class="sk-chain ').replace(/^(?![\s\S]*class=)/, ' class="sk-chain"') + '>'; }).join('');
    var close = chain.slice().reverse().map(function (e) { return '</' + e.tagName.toLowerCase() + '>'; }).join('');
    var head = Array.prototype.map.call(d.head.querySelectorAll('style:not([data-sk]), link[rel=stylesheet], meta[charset]'), function (n) {
      return n.tagName === 'LINK' ? '<link rel="stylesheet" href="' + new URL(n.getAttribute('href'), d.baseURI).href + '">' : n.outerHTML;
    }).join('');
    return '<!DOCTYPE html><html lang="th"' + attrs(d.documentElement) + '><head><meta charset="UTF-8">' + head +
      '<style>body{background:#fff!important;margin:0}.sk-chain{position:static!important;max-height:none!important;height:auto!important;min-height:0!important;overflow:visible!important;transform:none!important;display:block!important;padding:0!important;margin:0!important;background:none!important;box-shadow:none!important;border:0!important;width:auto!important;max-width:none!important;opacity:1!important;visibility:visible!important}</style></head><body' + attrs(d.body) + '>' + open + area.outerHTML + close + '</body></html>';
  }
  // ผลการพิมพ์จากหน้าของระบบหลักที่ผู้ใช้กดเอง (โหมดหน้า): แสดงใน Smart Editor
  function output(html) {
    captured = html;
    if (generating) return;
    if (api.onOutput) api.onOutput(html);
  }

  function load() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise(function (resolve, reject) {
      frame = document.createElement('iframe');
      frame.title = 'ระบบหลัก กองช่าง';
      frame.tabIndex = -1;
      frame.style.cssText = OFFSCREEN;
      frame.src = 'system.html?engine=1';
      frame.onload = function () {
        var w = W();
        w.open = function () {
          var buf = '';
          var doc = { open: function () { buf = ''; }, write: function (s) { buf += s; }, writeln: function (s) { buf += s + '\n'; }, close: function () { output(buf); } };
          return { document: doc, focus: function () {}, print: function () {}, close: function () {}, addEventListener: function () {}, closed: false, location: { href: '' } };
        };
        w.print = function () { var html = snapshotArea(); if (html) output(html); };
        w.alert = function (m) {
          m = String(m || '');
          if (generating) { messages.push(m); return; }
          SK.toast(m, /ไม่สำเร็จ|ผิดพลาด|กรุณา|ไม่พบ|ไม่ได้/.test(m) ? 'error' : 'success');
        };
        w.confirm = function (m) { return generating ? true : window.confirm(m); };
        var nativePrompt = w.prompt.bind(w);
        w.prompt = function (m, d) { return generating || /รหัส/.test(String(m || '')) ? '223344' : nativePrompt(m, d); };
        waitFor(function () { return run('typeof loadData === "function" && typeof enterAuthenticatedApp === "function" && typeof allRows !== "undefined"'); }, 20000).then(function (ok) {
          if (!ok) return reject(new Error('โหลดระบบหลักไม่สำเร็จ'));
          // สิทธิ์ใช้งานตรวจที่เว็บแล้ว (เข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่): ใช้ระบบหลักในฐานะผู้ดูแล
          // ผู้ดูแลระบบของเว็บใช้ชื่อ website-admin: หน้าผู้ดูแลของระบบหลักยอมรับเฉพาะชื่อนี้ (gas-worker.js)
          run('currentUser={username:' + JSON.stringify(SK.cloud && SK.cloud.isAdmin() ? 'website-admin' : 'website') + ',fullName:' + JSON.stringify(userName()) + ',department:"กองช่าง",position:"",role:"admin",roleLabel:"ผู้ดูแลระบบ"};enterAuthenticatedApp();');
          if (typeof w.showToast === 'function') w.showToast = function (m, type) { if (generating) { if (type === 'error') messages.push(String(m)); } else SK.toast(String(m), type === 'error' ? 'error' : 'success'); };
          var st = w.document.createElement('style');
          st.setAttribute('data-sk', 'base');
          st.textContent = PAGE_CSS;
          w.document.head.appendChild(st);
          w.SKGas.summary().then(function (s) { engineWorker = s && s.worker; }).catch(function () {});
          var expect = SK.projects ? SK.projects.list.length : 0;
          return waitFor(function () { return !expect || run('Array.isArray(allRows) && allRows.length'); }, 15000).then(function () { resolve(w); });
        }, reject);
      };
      frame.onerror = function () { reject(new Error('โหลดระบบหลักไม่สำเร็จ')); };
      document.body.appendChild(frame);
    });
    return readyPromise;
  }
  // ชีทเปลี่ยนจากที่อื่น (นำเข้า Excel / โหลดจากคลาวด์): ให้หน้าของระบบหลักโหลดข้อมูลใหม่
  if (typeof BroadcastChannel === 'function') {
    new BroadcastChannel('sikaew-gas').addEventListener('message', function (e) {
      var m = e.data || {};
      if (!W() || generating || !(m.type === 'imported' || (m.type === 'saved' && m.src && engineWorker && m.src !== engineWorker))) return;
      setTimeout(function () { try { run('typeof loadData==="function" && loadData()'); } catch (err) {} }, 400);
    });
  }

  function closeAll() {
    try { run("document.querySelectorAll('.open').forEach(function(x){ if(/backdrop|Backdrop|modal|Modal|Wrap/.test(x.id+' '+x.className)) x.classList.remove('open'); }); document.body.classList.remove('modal-open'); if(typeof returnToDashboardHome==='function') returnToDashboardHome();"); } catch (e) {}
  }

  // ---------- ธีมของระบบหลักให้เข้ากับเว็บ ----------
  // ธีมของเว็บ (design/DESIGN.md) ทับธีมเดิมของระบบหลักทุกหน้า/ฟอร์ม — เนื้อหาเอกสารที่พิมพ์ไม่เปลี่ยน
  var H = 'html body ';
  var PAGE_CSS = [
    'html,body{font-family:"Hanken Grotesk","Sarabun",sans-serif!important}',
    H + '{background:#f8f9ff!important;color:#0b1c30}',
    H + '.entry-backdrop{background:#f8f9ff!important;backdrop-filter:none!important}',
    H + '.entry-panel{background:#f8f9ff!important;border:0!important;border-radius:0!important;box-shadow:none!important}',
    H + '.entry-head{background:rgba(255,255,255,.92)!important;background-image:none!important;color:#0b1c30!important;border-bottom:1px solid rgba(100,116,139,.12)!important;box-shadow:0 1px 8px rgba(0,0,0,.03)!important}',
    H + '.entry-head h2,' + H + '.entry-head h3{color:#0b1c30!important;font-weight:600!important}',
    H + '.entry-head p,' + H + '.entry-head small{color:#3f4850!important;opacity:1!important}',
    H + '.entry-head button,' + H + '.entry-close{background:#eff4ff!important;color:#0b1c30!important;border:0!important;border-radius:999px!important;box-shadow:none!important}',
    H + '.entry-head button:hover,' + H + '.entry-close:hover{background:#dce9ff!important}',
    H + '.entry-body{background:#f8f9ff!important;padding-bottom:0!important}',
    H + '.form-section-title,' + H + '.evaluation-section-title,' + H + '.completion-section-line{background:#eff4ff!important;background-image:none!important;color:#004b73!important;border:0!important;border-radius:16px!important;box-shadow:none!important}',
    H + '.form-section-title *{color:#004b73!important}',
    H + '.form-section-title::before,' + H + '.control::before,' + H + 'label::before{background:#006194!important;box-shadow:none!important}',
    H + '.control > label,' + H + 'label{color:#3f4850!important}',
    H + 'input:not([type=checkbox]):not([type=radio]):not([type=file]),' + H + 'select,' + H + 'textarea{background:rgba(241,245,249,.7)!important;border:1px solid rgba(100,116,139,.18)!important;border-radius:14px!important;color:#0b1c30!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)!important}',
    H + 'input:focus,' + H + 'select:focus,' + H + 'textarea:focus{background:#fff!important;border-color:#007bb9!important;outline:2px solid rgba(0,123,185,.25)!important;outline-offset:0!important}',
    H + 'input[type=checkbox],' + H + 'input[type=radio]{accent-color:#006194!important}',
    H + 'form th{background:#eff4ff!important;color:#004b73!important}',
    H + '.primary-btn{background:#006194!important;background-image:none!important;color:#fff!important;border:0!important;border-radius:999px!important;box-shadow:0 8px 20px -4px rgba(0,97,148,.35)!important}',
    H + '.primary-btn:hover{background:#007bb9!important}',
    H + '.secondary-btn{background:#eff4ff!important;background-image:none!important;color:#0b1c30!important;border:0!important;border-radius:999px!important;box-shadow:none!important}',
    H + '.secondary-btn:hover{background:#dce9ff!important}',
    // แถบปุ่มด้านล่างอยู่เหนือปุ่มปฏิทินของช่องวันที่ (ไม่ซ้อนกัน)
    H + '.entry-actions{position:sticky!important;bottom:0!important;z-index:40!important;background:rgba(255,255,255,.94)!important;border-top:1px solid rgba(100,116,139,.12)!important;box-shadow:0 -8px 24px rgba(15,23,42,.05)!important}',
    H + '.thai-date-calendar-btn{background:#eff4ff!important;color:#006194!important}',
    H + '.thai-date-picker-wrap:hover .thai-date-calendar-btn{background:#dce9ff!important}',
    H + '.card,' + H + '.kpi,' + H + '.filter-panel{border-radius:20px!important;border-color:rgba(100,116,139,.12)!important;box-shadow:0 1px 3px rgba(15,23,42,.05)!important}',
    H + '.kpi::before{background:#006194!important}'
  ].join('') + EXTRA_CSS();
  // ส่วนที่ธีมเดิมใส่สีเขียว/ส้ม/ม่วง: ใช้สีของเว็บ (เพิ่มน้ำหนักตัวเลือกให้ชนะกฎเดิมที่มี !important)
  function EXTRA_CSS() {
    var X = function (list) { return list.split(',').map(function (c) { c = c.trim(); var m = /^([^:\s]+)(.*)$/.exec(c); return 'html body ' + (/^[a-z]/i.test(m[1]) ? m[1] + ':not(#_sk1):not(#_sk2)' : m[1] + m[1] + m[1]) + m[2]; }).join(','); };
    var rule = function (sel, css) { return X(sel) + '{' + css + '}'; };
    return [
      rule('.control,.manual-entry-control,.computed-control,.project-derived-control,.control.wide', 'background:transparent!important;background-image:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding:0!important'),
      rule('.control label span,.control .badge,.control [class*="badge"],.control [class*="tag"]', 'background:#eff4ff!important;color:#006194!important;border-color:transparent!important'),
      rule('.report-menu-btn,.compensation-action-btn,.duration-type-card,.building-mode-card,.test-type-card', 'background:#fff!important;background-image:none!important;border:1px solid rgba(100,116,139,.14)!important;border-radius:20px!important;box-shadow:0 1px 3px rgba(15,23,42,.05)!important;color:#0b1c30!important'),
      rule('.report-menu-btn.active,.compensation-action-btn.active,.duration-type-card.active,.building-mode-card.active,.test-type-card.active', 'background:#eff4ff!important;border-color:#006194!important;box-shadow:0 0 0 3px rgba(0,97,148,.14)!important'),
      rule('.report-menu-btn *,.compensation-action-btn *,.duration-type-card *', 'color:inherit'),
      rule('.project-completed-toggle,.combined-final-week-tools,.combined-workflow-block,.weekly-work-day-card,.weekly-matrix-wrap,.combined-photo-attachment-card,.compensation-committee-card', 'background:#fff!important;background-image:none!important;border:1px solid rgba(100,116,139,.12)!important;border-radius:18px!important;box-shadow:none!important'),
      rule('.compensation-mode-note,.project-required-note,.memo-filter-note,.duration-result,.form-note,.info-note', 'background:#eff4ff!important;background-image:none!important;color:#004b73!important;border:0!important;border-left:4px solid #006194!important;border-radius:14px!important;box-shadow:none!important'),
      rule('.completion-signer-mini-btn.add,.performance-mini-btn.add,.compensation-save-btn,.personnel-save,.history-save-btn', 'background:#006194!important;background-image:none!important;color:#fff!important;border:0!important;border-radius:999px!important'),
      rule('.completion-signer-mini-btn.delete,.performance-mini-btn.delete,.personnel-delete,.history-delete-btn', 'background:#ffdad6!important;background-image:none!important;color:#93000a!important;border:0!important;border-radius:999px!important'),
      rule('.personnel-tab', 'border-radius:999px!important'),
      rule('.personnel-tab.active', 'background:#006194!important;background-image:none!important;color:#fff!important;border-color:#006194!important'),
      rule('.memo-history-count,.compensation-history-count', 'background:#006194!important;color:#fff!important'),
      rule('.weekly-work-quick-select', 'background:#eff4ff!important;color:#004b73!important;border-color:#bfc7d2!important'),
      rule('.completion-signer-drag-handle', 'background:#eff4ff!important;color:#006194!important;border-color:transparent!important'),
      rule('.primary', 'background:#006194!important;background-image:none!important;border-color:#006194!important;color:#fff!important'),
      rule('.danger', 'background:#ffdad6!important;border-color:#ffdad6!important;color:#93000a!important'),
      // สีสันของแบบฟอร์ม (ตามโทนของเว็บ): หัวหมวดไล่สีฟ้า • แถบสีซ้ายและป้ายตามชนิดช่อง
      rule('.form-section-title,.evaluation-section-title,.completion-section-line', 'background:#eff4ff!important;background-image:none!important;color:#004b73!important;border:0!important;border-radius:14px!important;box-shadow:none!important;font-weight:600!important'),
      rule('.form-section-title *,.evaluation-section-title *,.completion-section-line *', 'color:#004b73!important'),
      rule('.form-section-title::before,.evaluation-section-title::before', 'background:#006194!important;box-shadow:none!important'),
      rule('.control.manual-entry-control', 'border-left:0!important;background:transparent!important'),
      rule('.control.computed-control', 'border-left:0!important;background:transparent!important'),
      rule('.control.project-derived-control', 'border-left:0!important;background:transparent!important'),
      rule('.control::before,.control.manual-entry-control::before', 'display:none!important'),
      
      
      'html body .control.manual-entry-control>label::after{background:rgba(255,189,46,.2)!important;color:#b45309!important;border-color:transparent!important;box-shadow:none!important}',
      'html body .control.computed-control>label::after{background:rgba(39,201,63,.14)!important;color:#15803d!important;border-color:transparent!important;box-shadow:none!important}',
      'html body .control.project-derived-control>label::after,html body .control>label::after{background:#cce5ff!important;color:#004b73!important;border-color:transparent!important;box-shadow:none!important}',
      'html body input:focus,html body select:focus,html body textarea:focus{box-shadow:0 0 0 4px rgba(0,123,185,.15)!important}',
      'html body *::-webkit-scrollbar-thumb{background:rgba(100,116,139,.32)!important;background-clip:padding-box!important}',
      'html body *::-webkit-scrollbar-track{background:transparent!important}',
      rule('.progress-fill', 'background:#006194!important;background-image:none!important'),
      // ปุ่มเลือกแบบ (.active) การ์ดผู้ลงนาม หัวข้อ ปุ่มบันทึก ช่องที่ล็อก
      'html body .entry-backdrop button.active,html body .entry-backdrop button.active.active{background:#eff4ff!important;background-image:none!important;border-color:#006194!important;color:#0b1c30!important;box-shadow:0 0 0 3px rgba(0,97,148,.14)!important}',
      'html body .entry-backdrop h4,html body .entry-backdrop h5{color:#004b73!important}',
      'html body .entry-backdrop th{background:#eff4ff!important;color:#004b73!important;border-color:rgba(100,116,139,.2)!important}',
      rule('.completion-signer-card-head', 'background:#eff4ff!important;background-image:none!important;border-color:rgba(100,116,139,.12)!important;color:#004b73!important'),
      rule('.completion-signer-title-wrap', 'color:#004b73!important;background:transparent!important;border-color:transparent!important'),
      rule('.central-price-save-btn,.test-result-save-btn,.compensation-preview-selected-btn,.compensation-save-btn', 'background:#006194!important;background-image:none!important;color:#fff!important;border:0!important;border-radius:999px!important;box-shadow:0 8px 20px -4px rgba(0,97,148,.35)!important'),
      rule('.central-price-history-count', 'background:#006194!important;color:#fff!important'),
      rule('.duration-result-kpi', 'background:#eff4ff!important;background-image:none!important;border:1px solid rgba(100,116,139,.12)!important;box-shadow:none!important'),
      rule('.duration-result-kpi b', 'color:#006194!important'),
      rule('.project-lock-allowed', 'border-color:rgba(100,116,139,.18)!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)!important'),
      // ---------- แดชบอร์ด/หน้าของระบบหลัก: โทนเดียวกับเว็บ (ฟ้า #006194, การ์ดขาวโค้งมน, ปุ่มแคปซูล) ----------
      rule('.dashboard-welcome', 'background:#fff!important;background-image:none!important;border:1px solid rgba(100,116,139,.12)!important;border-left:1px solid rgba(100,116,139,.12)!important;border-radius:28px!important;box-shadow:0 1px 3px rgba(15,23,42,.05),0 18px 40px -24px rgba(0,97,148,.35)!important;color:#0b1c30!important'),
      rule('.dashboard-welcome h1,.dashboard-welcome h2', 'color:#0b1c30!important;-webkit-text-fill-color:#0b1c30!important;background:none!important'),
      rule('.dashboard-welcome p,.dashboard-welcome small', 'color:#3f4850!important'),
      rule('.dashboard-welcome-kicker,.dashboard-welcome .eyebrow', 'color:#006194!important'),
      rule('.dashboard-welcome::before,.dashboard-welcome::after,.kpi::after,.kpi::before', 'display:none!important'),
      rule('.dashboard-welcome-badge', 'background:#cce5ff!important;background-image:none!important;color:#004b73!important;border:0!important;border-radius:999px!important;box-shadow:none!important'),
      rule('.dashboard-welcome-badge *', 'color:#004b73!important'),
      rule('.dashboard-create-project,.dashboard-welcome-actions button,.dashboard-welcome-actions a', 'background:#006194!important;background-image:none!important;color:#fff!important;border:0!important;border-radius:999px!important;box-shadow:0 8px 20px -4px rgba(0,97,148,.35)!important'),
      rule('.dashboard-create-project:hover', 'background:#007bb9!important'),
      rule('.dashboard-switcher', 'background:#eff4ff!important;background-image:none!important;border:0!important;border-radius:999px!important;box-shadow:none!important;padding:5px!important'),
      rule('.dashboard-tab-btn', 'background:transparent!important;background-image:none!important;color:#3f4850!important;border:0!important;border-radius:999px!important;box-shadow:none!important'),
      rule('.dashboard-tab-btn:hover', 'background:#dce9ff!important;color:#0b1c30!important'),
      rule('.dashboard-tab-btn.active', 'background:#006194!important;background-image:none!important;color:#fff!important;box-shadow:0 6px 16px -6px rgba(0,97,148,.55)!important'),
      rule('.filter-panel,.kpi,.card,.chart-card,.boundary-panel', 'background:rgba(255,255,255,.92)!important;border:1px solid rgba(100,116,139,.12)!important;border-radius:24px!important;box-shadow:0 1px 3px rgba(15,23,42,.05)!important'),
      rule('.boundary-panel', 'background:#eff4ff!important;border-radius:18px!important'),
      rule('.kpi', 'border-left:1px solid rgba(100,116,139,.12)!important;border-top:1px solid rgba(100,116,139,.12)!important;box-shadow:inset 0 3px 0 #006194,0 1px 3px rgba(15,23,42,.05)!important'),
      rule('.kpi strong,.kpi .kpi-value,.kpi b', 'color:#006194!important'),
      rule('.card h2,.card h3,.card-head h2,.card-head h3,.kpi h3,.kpi span:first-child', 'color:#0b1c30!important'),
      rule('.card-head', 'border-bottom-color:rgba(100,116,139,.12)!important;background:transparent!important'),
      rule('.reset-btn,.supervisor-section-toggle-btn,.secondary,.ghost,.map-tool-btn', 'background:#eff4ff!important;background-image:none!important;color:#006194!important;border:0!important;border-radius:999px!important;box-shadow:none!important'),
      rule('.reset-btn:hover,.supervisor-section-toggle-btn:hover', 'background:#dce9ff!important'),
      rule('.completion-chart-toggle', 'background:#eff4ff!important;border:0!important;border-radius:999px!important'),
      rule('.completion-chart-toggle button', 'background:transparent!important;color:#3f4850!important;border:0!important;border-radius:999px!important'),
      rule('.completion-chart-toggle button.active', 'background:#006194!important;color:#fff!important'),
      rule('main th,.table-wrap th', 'background:#eff4ff!important;color:#004b73!important;border-color:rgba(100,116,139,.14)!important'),
      rule('main td', 'border-color:rgba(100,116,139,.1)!important'),
      rule('main tbody tr:hover td', 'background:#f3f8ff!important'),
      rule('.status', 'border-radius:999px!important;padding:3px 10px!important'),
      rule('.status.done', 'background:rgba(39,201,63,.14)!important;color:#15803d!important'),
      rule('.status.doing', 'background:#cce5ff!important;color:#004b73!important'),
      rule('.status.delay', 'background:#ffdad6!important;color:#93000a!important'),
      rule('.progress-track', 'background:#dce9ff!important;border-radius:999px!important'),
      rule('.dashboard-commandbar', 'display:none!important'),
      // การ์ดตัวเลข/กราฟของผู้ควบคุมงาน: เต็มแถวทุกความกว้าง ไม่มีช่องว่าง (จอกว้าง 1 แถว สัดส่วน 1:2:3:1 • กลาง 2 คอลัมน์ • มือถือ 1 คอลัมน์)
      '@media (min-width:1100px){html body .kpi-grid.dashboard-page-supervisor:not(#_sk1):not(#_sk2){grid-template-columns:minmax(150px,1fr) minmax(0,2fr) minmax(0,3fr) minmax(150px,1fr)!important}html body .kpi-grid.dashboard-page-supervisor>*:not(#_sk1):not(#_sk2){grid-column:auto!important;grid-row:auto!important}}',
      '@media (min-width:600px) and (max-width:1099px){html body .kpi-grid.dashboard-page-supervisor:not(#_sk1):not(#_sk2){grid-template-columns:repeat(2,minmax(0,1fr))!important}html body .kpi-grid.dashboard-page-supervisor>:nth-child(1):not(#_sk1):not(#_sk2){order:1;grid-column:auto!important;grid-row:auto!important}html body .kpi-grid.dashboard-page-supervisor>:nth-child(4):not(#_sk1):not(#_sk2){order:2;grid-column:auto!important;grid-row:auto!important}html body .kpi-grid.dashboard-page-supervisor>:nth-child(2):not(#_sk1):not(#_sk2){order:3;grid-column:1/-1!important;grid-row:auto!important}html body .kpi-grid.dashboard-page-supervisor>:nth-child(3):not(#_sk1):not(#_sk2){order:4;grid-column:1/-1!important;grid-row:auto!important}}',
      '@media (max-width:599px){html body .kpi-grid.dashboard-page-supervisor:not(#_sk1):not(#_sk2){grid-template-columns:minmax(0,1fr)!important}html body .kpi-grid.dashboard-page-supervisor>*:not(#_sk1):not(#_sk2){grid-column:auto!important;grid-row:auto!important}}',
      rule('.central-price-mode-note,.document-admin-note', 'background:#eff4ff!important;background-image:none!important;color:#004b73!important;border:0!important;border-left:4px solid #006194!important;border-radius:14px!important;box-shadow:none!important'),
      rule('.document-admin-add', 'background:#006194!important;background-image:none!important;color:#fff!important;border:0!important;border-radius:999px!important;box-shadow:0 8px 20px -4px rgba(0,97,148,.35)!important'),
      rule('.document-view,.document-open,.document-download', 'background:#eff4ff!important;background-image:none!important;color:#006194!important;border:0!important;border-radius:999px!important;box-shadow:none!important'),
      rule('.document-delete', 'background:#ffdad6!important;background-image:none!important;color:#93000a!important;border:0!important;border-radius:999px!important'),
      rule('.document-admin-tools,.document-library-toolbar', 'background:#eff4ff!important;background-image:none!important;border:0!important;border-radius:18px!important;box-shadow:none!important'),
      rule('.document-card', 'background:#fff!important;border:1px solid rgba(100,116,139,.12)!important;border-radius:20px!important;box-shadow:0 1px 3px rgba(15,23,42,.05)!important'),
      // ---------- ระบบปุ่ม: หลัก (ฟ้าเต็ม) • รอง (ฟ้าอ่อน) • แก้ไข (ขอบ) • ลบ (แดงอ่อน) ----------
      rule('.primary-btn,.primary,.dashboard-create-project,.document-admin-add,.central-price-save-btn,.test-result-save-btn,.compensation-save-btn,.personnel-save,.history-save-btn,button[class*="save-btn"],button[class*="submit"]', 'background:#006194!important;background-image:none!important;color:#fff!important;border:0!important;border-radius:999px!important;box-shadow:0 6px 16px -6px rgba(0,97,148,.45)!important;font-weight:600!important'),
      rule('.secondary-btn,.secondary,.ghost,.reset-btn,.supervisor-section-toggle-btn,.map-tool-btn,.document-view,.document-open,.document-download,button[class*="toggle-btn"],button[class*="clear"]', 'background:#eff4ff!important;background-image:none!important;color:#006194!important;border:0!important;border-radius:999px!important;box-shadow:none!important'),
      rule('button[class*="edit"],a[class*="edit"],.edit', 'background:#fff!important;background-image:none!important;color:#006194!important;border:1px solid #bfc7d2!important;border-radius:999px!important;box-shadow:none!important'),
      rule('.danger,.document-delete,.history-delete-btn,.personnel-delete,button[class*="delete"],button[class*="remove"],a[class*="delete"]', 'background:#ffdad6!important;background-image:none!important;color:#93000a!important;border:0!important;border-radius:999px!important;box-shadow:none!important'),
      'html body button:disabled,html body button[disabled]{opacity:.5!important;cursor:not-allowed!important}',
      // ---------- ตาราง หัวข้อ แผงประวัติ ----------
      rule('table th', 'background:#eff4ff!important;background-image:none!important;color:#004b73!important;border-color:rgba(100,116,139,.16)!important;font-weight:600!important'),
      rule('table td', 'border-color:rgba(100,116,139,.12)!important'),
      rule('.table-wrap', 'border-radius:16px!important;border-color:rgba(100,116,139,.12)!important;box-shadow:none!important'),
      rule('.entry-backdrop h2,.entry-backdrop h3,main h2,main h3', 'color:#0b1c30!important;font-weight:600!important;background:none!important;-webkit-text-fill-color:currentColor!important'),
      rule('.project-history-drawer,.memo-history-wrap,.central-price-history-wrap,.compensation-history-wrap,.low-bid-history-wrap,.building-inspection-history-side,.evaluation-history-wrap', 'background:#fff!important;background-image:none!important;border:1px solid rgba(100,116,139,.12)!important;border-radius:20px!important;box-shadow:0 10px 30px -12px rgba(15,23,42,.18)!important'),
      rule('.project-history-toggle', 'background:#eff4ff!important;background-image:none!important;color:#006194!important;border:0!important;border-radius:999px!important;box-shadow:none!important'),
      rule('.form-grid', 'gap:14px 16px!important'),
      // แท็บเล็ต 2 คอลัมน์ • มือถือ 1 คอลัมน์ (ช่องเลือกไม่ถูกบีบ ปุ่มไม่บังช่องกรอก)
      '@media (max-width:900px){html body .form-grid.form-grid.form-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}html body .form-grid .control.wide.wide{grid-column:1/-1!important}}',
      '@media (max-width:600px){html body .form-grid.form-grid.form-grid{grid-template-columns:minmax(0,1fr)!important}html body .entry-actions.entry-actions{flex-wrap:wrap!important}html body .entry-actions.entry-actions button{flex:1 1 auto!important}}',
      // รายการโครงการแบบแบ่งหน้า (เว็บเพิ่ม)
      'html body .sk-pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 18px 16px;border-top:1px solid rgba(100,116,139,.12);font-size:13px;color:#3f4850}',
      'html body .sk-pager-nav{display:flex;align-items:center;gap:4px}',
      'html body .sk-pager button{min-width:34px;height:34px;padding:0 12px;border:0;border-radius:999px;background:#eff4ff;color:#0b1c30;font:inherit;cursor:pointer}',
      'html body .sk-pager button:hover:not(:disabled){background:#dce9ff}',
      'html body .sk-pager button.is-on{background:#006194;color:#fff;font-weight:600}',
      'html body .sk-pager button:disabled{opacity:.45;cursor:default}',
      'html body .sk-pager i{padding:0 4px;color:#707881;font-style:normal}',
      'html body .sk-dash-list tbody tr{cursor:pointer}',
      'html body .sk-dash-list.sk-dash-list{margin-bottom:18px!important}',
      'html body .sk-dash-list .table-wrap,html body .sk-dash-list .table-wrap.table-wrap{max-height:none!important;height:auto!important;overflow-y:visible!important;overflow-x:auto!important}'
    ].join('');
  }
  // หน้าเต็มของระบบหลักในเว็บ: ซ่อนเมนู/แถบบนของระบบหลัก (เว็บมีเมนูของตัวเอง)
  var DOCK_PAGE_CSS = '.topbar{display:none!important}body{padding-left:0!important;margin-left:0!important;background:#f8f9ff!important}' +
    '.app-shell{padding-left:0!important}.entry-backdrop{inset:0!important}.dashboard-commandbar{display:none!important}' +
    'body:has(.entry-backdrop.open){overflow:hidden!important}' +
    '.preview-paper-scroll{max-height:none!important;height:auto!important;overflow:visible!important}';
  var NS = '[data-sk-native] ';
  var NATIVE_CSS = [
    'html,body{overflow:hidden!important}',
    'body>:not([data-sk-native]){visibility:hidden!important}',
    '[data-sk-native] *{box-sizing:border-box!important}',
    // พรีวิวเล็กของระบบหลักในฟอร์ม: ใช้ Smart Editor ของเว็บแทน (กด "สร้างเอกสาร")
    // หัวหน้าต่าง/ประวัติ/ปุ่มบันทึกของระบบหลักในฟอร์มเอกสาร: เว็บมีหัวหน้า ประวัติเอกสาร และปุ่ม "สร้างเอกสาร" ของตัวเอง

    '[data-sk-native] .entry-panel>.entry-body,[data-sk-native] .entry-panel>.entry-head{width:100%!important;max-width:100%!important;margin-right:0!important}',
    // สูงตามเนื้อหาเท่านั้น (ไม่ยืดตามความสูง iframe — กันพื้นที่ว่างใต้ฟอร์ม)
    '[data-sk-native] .entry-panel{height:auto!important;min-height:0!important;max-height:none!important;flex:none!important;align-self:flex-start!important;overflow:visible!important}[data-sk-native] .entry-panel>.entry-body{flex:none!important;height:auto!important;min-height:0!important;overflow:visible!important}',

    '[data-sk-native] .weekly-work-day-card,[data-sk-native] .memo-filter-note,[data-sk-native] .weekly-work-slot-grid,[data-sk-native] .form-grid,[data-sk-native] .control{max-width:100%!important;min-width:0!important}',
    '[data-sk-native] .performance-input-table tr>:nth-child(1),[data-sk-native] .performance-input-table tr>:nth-child(2){width:52px!important}',
    '[data-sk-native] .performance-input-table tr>:nth-child(3){width:24%!important}',
    '[data-sk-native] .weekly-work-slot-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(118px,1fr))!important}',
    '[data-sk-native] .weekly-work-slot{width:auto!important;min-width:0!important}',
    '[data-sk-native] table{max-width:100%!important}',
    '[data-sk-native] .weekly-matrix-table,[data-sk-native] .performance-input-table{width:100%!important;min-width:0!important;table-layout:fixed!important}',
    '[data-sk-native] .weekly-matrix-table th,[data-sk-native] .weekly-matrix-table td,[data-sk-native] .performance-input-table th,[data-sk-native] .performance-input-table td{padding:4px!important;font-size:13px!important;word-break:break-word!important;min-width:0!important;width:auto!important}',
    '[data-sk-native] .weekly-matrix-table select,[data-sk-native] .weekly-matrix-table input,[data-sk-native] .weekly-matrix-table textarea,[data-sk-native] .performance-input-table select,[data-sk-native] .performance-input-table input,[data-sk-native] .performance-input-table textarea{width:100%!important;min-width:0!important;padding-left:4px!important;padding-right:4px!important}',
    '[data-sk-native] .weekly-matrix-wrap,[data-sk-native] .performance-table-input-wrap,[data-sk-native] .s-curve-table-input-wrap,[data-sk-native] .k-formula-table-wrap{max-width:100%!important;overflow-x:auto!important}',
    '[data-sk-native]{position:fixed!important;inset:0!important;z-index:2147483000!important;overflow-x:hidden!important;overflow-y:auto!important;margin:0!important;padding:16px 22px 56px!important;max-width:none!important;width:auto!important;height:auto!important;max-height:none!important;transform:none!important;background:#f8f9ff!important;border:0!important;border-radius:0!important;box-shadow:none!important;display:block!important;visibility:visible!important;opacity:1!important}'
  ].join('');

  // แบบฟอร์มเอกสาร: หัว/ประวัติ/ปุ่มบันทึก/พรีวิวเล็กของระบบหลักไม่แสดง (เว็บมีหัวหน้า ประวัติเอกสาร ปุ่มสร้างเอกสาร และ Smart Editor ของตัวเอง)
  var DOC_HIDE_CSS = [
    '[data-sk-native] .entry-head,[data-sk-native] .project-history-toggle,[data-sk-native] .project-history-drawer,[data-sk-native] .building-inspection-history-side,[data-sk-native] .memo-history-wrap,[data-sk-native] .central-price-history-wrap,[data-sk-native] .compensation-history-wrap,[data-sk-native] .low-bid-history-wrap,[data-sk-native] .central-price-save-row{display:none!important}',
    '[data-sk-native] .preview-document-toolbar,[data-sk-native] .preview-paper-scroll,[data-sk-native] .test-result-preview-action,[data-sk-native] .test-result-preview-wrap,[data-sk-native] .evaluation-preview-shell,[data-sk-native] .low-bid-preview-wrap,[data-sk-native] .central-price-preview{display:none!important}'
  ].join('');
  // หน้าเครื่องมือของระบบหลัก (กรอกข้อมูลโครงการ/ราคากลาง/คุมสายทาง ฯลฯ): สูงตามเนื้อหา ไม่มีแถบเลื่อนซ้อน แถบปุ่มอยู่ท้ายฟอร์ม (ไม่ลอยบังช่องกรอก)
  // หัวหน้าต่างเหลือเฉพาะปุ่ม (ประวัติ/ปิด) — ชื่อหน้าอยู่ที่หัวหน้าเว็บแล้ว
  var TOOL_CSS = '[data-sk-native] .entry-head h2,[data-sk-native] .entry-head h3,[data-sk-native] .entry-head p{display:none!important}[data-sk-native] .entry-head{justify-content:flex-end!important;padding-top:8px!important;padding-bottom:8px!important;background:transparent!important;border:0!important;box-shadow:none!important}' +
    '[data-sk-native] .entry-actions{position:static!important;box-shadow:none!important;border-top:1px solid rgba(100,116,139,.12)!important;margin-top:12px!important}';
  // ---------- วาง iframe ทับกล่องในหน้าเว็บ ----------
  // dock(holder, { wrap: element ของระบบหลักที่จะแสดง (โหมดฟอร์ม) | ไม่ระบุ = ทั้งหน้า })
  function dock(holder, opts) {
    opts = opts || {};
    undock();
    var d = W().document, st = d.createElement('style'), wrap = opts.wrap || null, home = null;
    st.setAttribute('data-sk', 'dock');
    if (wrap) {
      home = { parent: wrap.parentNode, next: wrap.nextSibling };
      wrap.setAttribute('data-sk-native', '1');
      d.body.appendChild(wrap);
      st.textContent = NATIVE_CSS + (opts.tool ? TOOL_CSS : DOC_HIDE_CSS) + (opts.keepActions ? '' : NS + '.form-actions{display:none!important}');
    } else st.textContent = DOCK_PAGE_CSS;
    d.head.appendChild(st);
    var raf = 0;
    // iframe วางแบบ absolute ตามตำแหน่งกล่องในหน้า: เลื่อนไปพร้อมหน้าเว็บ (ไม่ต้องตามด้วยสคริปต์)
    // โหมดฟอร์ม (autoHeight): กล่องสูงเท่าแบบฟอร์ม — เลื่อนเฉพาะหน้าเว็บ ไม่มีแถบเลื่อนซ้อนใน iframe
    function contentHeight() {
      if (!wrap && opts.measure) { var mr = opts.measure.getBoundingClientRect(); return mr.bottom + W().scrollY + 8; }
      if (!wrap) return 0;
      var cs = W().getComputedStyle(wrap), h = 0;
      Array.prototype.forEach.call(wrap.children, function (c) { if (c.offsetParent || c.getClientRects().length) h = Math.max(h, c.offsetTop + c.offsetHeight); });
      return h + (parseFloat(cs.paddingBottom) || 0) + 8;
    }
    function place() {
      raf = 0;
      if (!document.body.contains(holder)) { frame.style.cssText = OFFSCREEN; return; }
      if (opts.autoHeight) {
        holder.__skAuto = true;
        var ch = contentHeight();
        if (ch && Math.abs(holder.offsetHeight - ch) > 2) holder.style.height = Math.max(opts.minHeight || 360, ch) + 'px';
      }
      var r = holder.getBoundingClientRect();
      if (!r.width) { frame.style.cssText = OFFSCREEN; return; }
      frame.style.cssText = 'position:absolute;left:' + (r.left + window.scrollX) + 'px;top:' + (r.top + window.scrollY) + 'px;width:' + r.width + 'px;height:' + r.height + 'px;border:0;z-index:30;opacity:1;background:#f8f9ff;border-radius:20px';
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(place); }
    var timer = setInterval(place, 300);
    window.addEventListener('resize', schedule);
    place();
    docked = {
      wrap: wrap,
      undock: function () {
        clearInterval(timer);
        window.removeEventListener('resize', schedule);
        frame.style.cssText = OFFSCREEN;
        st.remove();
        // คืนฟอร์มกลับที่เดิมก่อนสร้าง/พิมพ์ (ระบบหลักวัดหน้ากระดาษจากหน้าตาปกติ)
        if (wrap && wrap.hasAttribute('data-sk-native')) {
          wrap.removeAttribute('data-sk-native');
          home.parent.insertBefore(wrap, home.next && home.next.parentNode === home.parent ? home.next : null);
        }
      }
    };
    return docked;
  }
  function undock() { if (docked) { var x = docked; docked = null; x.undock(); } }

  // เปิดหน้า/ฟังก์ชันของระบบหลักทั้งหน้าในกล่อง holder
  function showPage(holder, code) {
    return load().then(function () {
      closeAll();
      undock();
      if (code) run(code);
      // หน้าที่เปิดเป็นหน้าต่าง (backdrop) ของระบบหลัก: วางแบบฟอร์มเต็มกล่อง สูงตามเนื้อหา; อื่น ๆ ทั้งหน้า
      var open = W().document.querySelector('.entry-backdrop.open, [id$="Backdrop"].open, .memo-form-wrap.open');
      if (open) dock(holder, { wrap: open, tool: true, keepActions: true, autoHeight: true, minHeight: 420 });
      else dock(holder);
    });
  }
  // หน้าแรก: แดชบอร์ดของระบบหลัก (ผู้ควบคุมงาน / ธุรการกองช่าง / สายทางทางหลวงท้องถิ่น) เต็มกล่อง สูงตามเนื้อหา
  // ปุ่มที่เปิดหน้าอื่นของระบบหลัก (สร้างโครงการ/ลงทะเบียนสายทาง ฯลฯ) ไปหน้าเดียวกันของเว็บ
  function showDashboard(holder) {
    return load().then(function () {
      closeAll();
      undock();
      var d = W().document, main = d.querySelector('.app-shell > main') || d.querySelector('main');
      if (!main) throw new Error('ไม่พบหน้าแดชบอร์ดของระบบหลัก');
      var dk = dock(holder, { autoHeight: true, measure: main, minHeight: 600 });
      var cleanup = enhanceDashboard(d, main);
      var onClick = function (e) {
        var t = e.target.closest && e.target.closest('[onclick]'); if (!t) return;
        // แถวรายการโครงการ: เปิดหน้าโครงการของเว็บ (รายละเอียด แผนที่ รูป เอกสาร)
        var fp = /^\s*focusProject\((\d+)\)/.exec(t.getAttribute('onclick') || '');
        if (fp) { e.preventDefault(); e.stopPropagation(); SK.go('project/P-' + String(fp[1]).padStart(3, '0')); return; }
        var m = /^\s*(open\w+)\s*\(([^)]*)\)/.exec(t.getAttribute('onclick') || ''); if (!m) return;
        var fn = m[1], route = fn === 'openEntryGate' ? 'entry' : TOOLS.some(function (x) { return x.fn === fn; }) ? 'system/' + fn : '';
        if (!route) return;
        e.preventDefault(); e.stopPropagation();
        SK.go(route);
      };
      d.addEventListener('click', onClick, true);
      var base = dk.undock;
      dk.undock = function () { d.removeEventListener('click', onClick, true); cleanup(); base(); };
      return dk;
    });
  }
  // แดชบอร์ด: รายการโครงการอยู่ใต้ตัวกรอง แบ่งหน้า (ยังไม่แล้วเสร็จขึ้นก่อน)
  var DASH_PER = 10;
  function enhanceDashboard(d, main) {
    var tbody = d.getElementById('projectTable'), card = tbody && tbody.closest('section'), filter = main.querySelector('.filter-panel.dashboard-page-supervisor');
    if (!card || !filter) return function () {};
    var home = { parent: card.parentNode, next: card.nextSibling };
    filter.parentNode.insertBefore(card, filter.nextSibling);
    card.classList.add('sk-dash-list');
    var pager = d.createElement('div');
    pager.className = 'sk-pager';
    card.appendChild(pager);
    var page = 1, mo = null;
    function apply() {
      if (mo) mo.disconnect(); // การจัดแถวของเราเองไม่นับเป็นการวาดตารางใหม่
      var rows = Array.prototype.filter.call(tbody.rows, function (r) { return /^\s*focusProject/.test(r.getAttribute('onclick') || ''); });
      var done = function (r) { return !!r.querySelector('.status.done'); };
      rows.sort(function (a, b) { return done(a) - done(b) || (+a.dataset.skOrd || 0) - (+b.dataset.skOrd || 0); });
      rows.forEach(function (r, i) { if (!r.dataset.skOrd) r.dataset.skOrd = String(i + 1); });
      rows.forEach(function (r) { tbody.appendChild(r); });
      var pages = Math.max(1, Math.ceil(rows.length / DASH_PER));
      page = Math.min(page, pages);
      rows.forEach(function (r, i) {
        r.style.display = Math.floor(i / DASH_PER) + 1 === page ? '' : 'none';
        if (r.cells[0]) r.cells[0].textContent = String(i + 1);
      });
      var open = rows.filter(function (r) { return !done(r); }).length;
      var nums = [];
      for (var n = 1; n <= pages; n++) if (n === 1 || n === pages || Math.abs(n - page) <= 1) nums.push(n); else if (nums[nums.length - 1] !== '…') nums.push('…');
      pager.innerHTML = rows.length ? '<span class="sk-pager-info">แสดง ' + Math.min(rows.length, (page - 1) * DASH_PER + 1) + '–' + Math.min(rows.length, page * DASH_PER) + ' จาก ' + rows.length + ' รายการ • ยังไม่แล้วเสร็จ ' + open + ' รายการ (แสดงก่อน)</span>' +
        (pages > 1 ? '<span class="sk-pager-nav"><button type="button" data-sk-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + '>‹ ก่อนหน้า</button>' +
          nums.map(function (n) { return n === '…' ? '<i>…</i>' : '<button type="button" data-sk-page="' + n + '" class="' + (n === page ? 'is-on' : '') + '">' + n + '</button>'; }).join('') +
          '<button type="button" data-sk-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + '>ถัดไป ›</button></span>' : '') : '';
      if (mo) mo.observe(tbody, { childList: true });
    }
    pager.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sk-page]'); if (!b || b.disabled) return;
      page = +b.dataset.skPage; apply();
    });
    // ระบบหลักวาดตารางใหม่เมื่อเปลี่ยนตัวกรอง: เริ่มหน้า 1 แล้วจัดใหม่
    mo = new (d.defaultView.MutationObserver)(function () { page = 1; apply(); });
    apply();
    return function () {
      mo.disconnect(); pager.remove(); card.classList.remove('sk-dash-list');
      Array.prototype.forEach.call(tbody.rows, function (r) { r.style.display = ''; });
      home.parent.insertBefore(card, home.next && home.next.parentNode === home.parent ? home.next : null);
    };
  }
  // หน้าของระบบหลักยังเปิดอยู่ไหม (ผู้ใช้กดปิด × ในหน้า)
  function pageOpen() {
    try { return !!run("document.querySelector('[id$=\"Backdrop\"].open, [id$=\"backdrop\"].open, .entry-backdrop.open, .memo-form-wrap.open')"); } catch (e) { return false; }
  }

  // ---------- เอกสาร ----------
  function rootEl(doc) { return W().document.getElementById(doc.root); }
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').replace(/[*＊]\s*$/, '').trim().slice(0, 80); }
  function labelOf(el) {
    var d = W().document;
    if (el.id) { var l = d.querySelector('label[for="' + el.id + '"]'); if (l) return clean(l.textContent); }
    var box = el.closest('.control, .form-field, .field, .form-row, .entry-field, label, td');
    if (box) {
      var lab = box.tagName === 'LABEL' ? box : box.querySelector('label, .label, .control-label');
      if (lab && !lab.contains(el)) return clean(lab.textContent);
      if (box.tagName === 'LABEL') return clean(box.textContent);
    }
    return clean(el.getAttribute('aria-label') || el.placeholder || el.name || el.id || '');
  }
  function fire(el, types) { types.forEach(function (t) { el.dispatchEvent(new (W().Event)(t, { bubbles: true })); }); }
  function selectProject(doc, rowNumber) {
    var root = rootEl(doc);
    var sel = root && Array.prototype.filter.call(root.querySelectorAll('select'), function (s) { return /ProjectSelect$/.test(s.id); })[0];
    if (!sel) return true;
    var has = function () { return Array.prototype.some.call(sel.options, function (o) { return o.value === String(rowNumber); }); };
    if (!has()) {
      var show = root.querySelector('input[type=checkbox][id*="ShowCompleted"]');
      if (show && !show.checked) { show.checked = true; fire(show, ['change']); }
      ['BudgetYearFilter', 'VillageFilter', 'TypeFilter'].forEach(function (k) {
        var f = root.querySelector('select[id$="' + k + '"]'); if (f && f.value) { f.value = ''; fire(f, ['change']); }
      });
    }
    if (!has()) return false;
    sel.value = String(rowNumber);
    fire(sel, ['change']);
    return true;
  }
  // เปิดฟอร์มเอกสารของระบบหลัก (เลือกโครงการให้) แล้ววางในกล่อง holder
  function openDoc(doc, rowNumber, holder, opts) {
    return load().then(function () {
      undock();
      closeAll();
      messages = [];
      run(doc.open);
      return sleep(500);
    }).then(function () {
      if (doc.general || rowNumber == null || rowNumber === '') return true;
      return selectProject(doc, rowNumber);
    }).then(function (ok) {
      if (!ok) throw new Error('ไม่พบโครงการนี้ในรายการของเอกสาร "' + doc.title + '"');
      return sleep(500);
    }).then(function () {
      var root = rootEl(doc);
      if (!root) throw new Error('ไม่พบแบบฟอร์มของเอกสารนี้ในระบบหลัก');
      var wrap = root.closest('.memo-form-wrap, [id$="FormWrap"], [id$="Backdrop"]') || root;
      if (holder) dock(holder, Object.assign({ wrap: wrap, keepActions: doc.keepActions }, opts || {}));
    });
  }
  function generate(doc) {
    var holderDock = docked;
    var restore = holderDock && holderDock.wrap ? holderDock : null;
    undock();
    messages = []; captured = null; generating = true;
    currentArea = doc.area || 'memoPrintArea';
    var root = rootEl(doc), areaEl = W().document.getElementById(currentArea);
    if (doc.gen && areaEl) areaEl.innerHTML = '';
    return Promise.resolve().then(function () {
      if (root && root.tagName === 'FORM' && doc.gen === 'submit') {
        var invalid = Array.prototype.filter.call(root.elements, function (e) { return e.willValidate && !e.checkValidity(); });
        if (invalid.length && !root.noValidate) throw new Error('กรุณากรอก: ' + invalid.map(labelOf).filter(Boolean).join(', '));
        var m = /^\s*(?:return\s+)?([A-Za-z_]\w*)\s*\(/.exec(root.getAttribute('onsubmit') || '');
        var submitter = root.querySelector('button[type=submit]');
        var ev = new (W().SubmitEvent)('submit', { cancelable: true, submitter: submitter });
        return m ? W()[m[1]](ev) : root.requestSubmit(submitter);
      }
      return doc.gen ? run(doc.gen) : null;
    }).then(function () {
      if (errors().length) throw new Error(errors().join(' • '));
      return areaEl && doc.gen ? waitFor(function () { return areaEl.innerHTML.trim() || errors().length; }, 15000) : null;
    }).then(function () {
      if (errors().length) throw new Error(errors().join(' • '));
      return run(doc.print);
    }).then(function () {
      return waitFor(function () { return captured && captured.length > 200 ? captured : null; }, 15000);
    }).then(function (html) {
      generating = false;
      if (!html) throw new Error(errors().join(' • ') || 'สร้างเอกสารไม่สำเร็จ กรุณาตรวจสอบข้อมูลในฟอร์ม');
      return html;
    }, function (err) {
      generating = false;
      throw err;
    }).finally(function () {
      api.lastDockWrap = restore ? restore.wrap : null;
    });
  }

  var api = SK.engine = {
    DOCS: DOCS, TOOLS: TOOLS, load: load, run: run, W: W, dock: dock, undock: undock, showPage: showPage, showDashboard: showDashboard, pageOpen: pageOpen,
    openDoc: openDoc, generate: generate, closeAll: closeAll, onOutput: null,
    doc: function (key) { return DOCS.filter(function (d) { return d.key === key; })[0] || null; },
    get loaded() { return !!(readyPromise && W() && W().allRows); }
  };
})();
