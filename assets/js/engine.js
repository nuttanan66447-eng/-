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
    { key: 'memo', group: 'รายงานช่าง', title: 'บันทึกข้อความรายสัปดาห์', desc: 'รายงานผลการก่อสร้างประจำสัปดาห์', icon: 'description', open: 'openEngineerReportHome();openMemoForm()', root: 'memoForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'weeklyWork', group: 'รายงานช่าง', title: 'บันทึกการปฏิบัติงานประจำสัปดาห์', desc: 'สภาพอากาศ แรงงาน เครื่องจักร รายวัน', icon: 'event_note', open: 'openEngineerReportHome();openWeeklyWorkForm()', root: 'weeklyWorkForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'weeklyPerformance', group: 'รายงานช่าง', title: 'ผลการดำเนินงานประจำสัปดาห์', desc: 'รายงานผลการปฏิบัติงานของผู้รับจ้าง', icon: 'trending_up', open: 'openEngineerReportHome();openWeeklyPerformanceForm()', root: 'weeklyPerformanceForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'sCurve', group: 'รายงานช่าง', title: 'S-Curve', desc: 'กราฟแผน/ผลการดำเนินงานสะสม', icon: 'show_chart', open: 'openEngineerReportHome();openSCurveForm()', root: 'sCurveForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'workReduction', group: 'รายงานช่าง', title: 'ปรับลดปริมาณงาน', desc: 'บันทึกขอปรับลดปริมาณงานพร้อมรายงานการประชุม', icon: 'content_cut', open: 'openEngineerReportHome();openWorkReductionForm()', root: 'workReductionForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'photo', group: 'รูปและป้ายโครงการ', title: 'รูปภาพโครงการ', desc: 'หน้าปริ้นรูปถ่ายก่อน/ระหว่าง/หลังดำเนินการ', icon: 'photo_library', open: 'openEngineerReportHome();openProjectPhotoForm()', root: 'projectPhotoForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'sign', group: 'รูปและป้ายโครงการ', title: 'ป้ายโครงการ', desc: 'ป้ายประชาสัมพันธ์โครงการตามแบบ', icon: 'signpost', open: 'openEngineerReportHome();openProjectSignForm()', root: 'projectSignForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'contractorNotice', group: 'ส่งมอบและตรวจรับ', title: 'แจ้งให้ผู้รับจ้างเข้าดำเนินการ', desc: 'หนังสือแจ้งผู้รับจ้างพร้อมความเห็นคณะกรรมการ', icon: 'mail', open: 'openEngineerReportHome();openContractorNoticeForm()', root: 'contractorNoticeForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'completion', group: 'ส่งมอบและตรวจรับ', title: 'รายงานผลแล้วเสร็จ 100%', desc: 'รายงานวันถึงกำหนดส่งมอบงานของผู้รับจ้าง', icon: 'task_alt', open: 'openEngineerReportHome();openCompletionReportForm()', root: 'completionReportForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'testResult', group: 'ส่งมอบและตรวจรับ', title: 'ผลทดสอบวัสดุ', desc: 'ดิน เหล็ก คอนกรีต AC Job-mix ขออนุมัติวัสดุ', icon: 'science', open: 'openTestResultPage()', root: 'testResultForm', area: 'testResultPrintArea', gen: 'previewSelectedTestResultType()', print: 'printTestResultDocument()' },
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
    { fn: 'openPersonnelManager', title: 'รายชื่อบุคลากร', icon: 'badge' },
    { fn: 'openSystemOptionManager', title: 'ตัวเลือกในฟอร์ม', icon: 'tune' }
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
          run('currentUser={username:"website",fullName:' + JSON.stringify(userName()) + ',department:"กองช่าง",position:"",role:"admin",roleLabel:"ผู้ดูแลระบบ"};enterAuthenticatedApp();');
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
  var PAGE_CSS = 'html,body{font-family:"Sarabun",sans-serif}';
  // หน้าเต็มของระบบหลักในเว็บ: ซ่อนเมนู/แถบบนของระบบหลัก (เว็บมีเมนูของตัวเอง)
  var DOCK_PAGE_CSS = '.topbar{display:none!important}body{padding-left:0!important;margin-left:0!important;background:#f8f9ff!important}' +
    '.app-shell{padding-left:0!important}.entry-backdrop{inset:0!important}.dashboard-commandbar{display:none!important}';
  var NS = '[data-sk-native] ';
  var NATIVE_CSS = [
    'html,body{overflow:hidden!important}',
    'body>:not([data-sk-native]){visibility:hidden!important}',
    '[data-sk-native]{position:fixed!important;inset:0!important;z-index:2147483000!important;overflow:auto!important;margin:0!important;padding:16px 22px 56px!important;max-width:none!important;width:auto!important;height:auto!important;max-height:none!important;transform:none!important;background:#f8f9ff!important;border:0!important;border-radius:0!important;box-shadow:none!important;display:block!important;visibility:visible!important;opacity:1!important}',
    '[data-sk-native],' + NS + '*{font-family:"Hanken Grotesk","Sarabun",sans-serif!important}',
    NS + '.form-section-title,' + NS + '.evaluation-section-title,' + NS + '.completion-section-line{background:#eff4ff!important;color:#004b73!important;border:0!important;border-radius:16px!important;box-shadow:none!important}',
    NS + '.form-section-title *{color:#004b73!important}',
    NS + '.form-section-title::before,' + NS + '.control::before,' + NS + 'label::before{background:#006194!important;box-shadow:none!important}',
    NS + '.control,' + NS + '.control.wide,' + NS + '.manual-entry-control,' + NS + '.computed-control,' + NS + '.project-derived-control{background:#fff!important;background-image:none!important;border:1px solid rgba(100,116,139,.12)!important;border-radius:18px!important;box-shadow:0 1px 2px rgba(15,23,42,.04)!important}',
    NS + '.control > label,' + NS + 'label{color:#3f4850!important}',
    NS + 'input:not([type=checkbox]):not([type=radio]),' + NS + 'select,' + NS + 'textarea{background:rgba(241,245,249,.7)!important;border:1px solid rgba(100,116,139,.18)!important;border-radius:14px!important;color:#0b1c30!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.04)!important}',
    NS + 'input:focus,' + NS + 'select:focus,' + NS + 'textarea:focus{background:#fff!important;border-color:#007bb9!important;outline:2px solid rgba(0,123,185,.25)!important}',
    NS + 'input[type=checkbox],' + NS + 'input[type=radio]{accent-color:#006194!important}',
    NS + 'th{background:#eff4ff!important;color:#004b73!important}',
    NS + '.primary-btn,' + NS + '.performance-mini-btn.add,' + NS + '.completion-signer-mini-btn.add{background:#006194!important;background-image:none!important;color:#fff!important;border:0!important;border-radius:999px!important}',
    NS + '.secondary-btn{background:#eff4ff!important;color:#0b1c30!important;border:0!important;border-radius:999px!important}'
  ].join('');

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
      st.textContent = NATIVE_CSS + (opts.keepActions ? '' : NS + '.form-actions{display:none!important}');
    } else st.textContent = DOCK_PAGE_CSS;
    d.head.appendChild(st);
    var raf = 0;
    function place() {
      raf = 0;
      var r = holder.getBoundingClientRect();
      if (!r.width || !document.body.contains(holder)) { frame.style.cssText = OFFSCREEN; return; }
      var top = Math.max(r.top, 64), clip = top - r.top;
      frame.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;border:0;z-index:30;opacity:1;background:#f8f9ff;' +
        'border-radius:20px;clip-path:inset(' + clip + 'px 0 0 0 round 20px)';
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(place); }
    var timer = setInterval(place, 400);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    place();
    docked = {
      wrap: wrap,
      undock: function () {
        clearInterval(timer);
        window.removeEventListener('resize', schedule);
        window.removeEventListener('scroll', schedule, true);
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
      dock(holder);
    });
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
  function openDoc(doc, rowNumber, holder) {
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
      if (holder) dock(holder, { wrap: wrap, keepActions: doc.keepActions });
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
    DOCS: DOCS, TOOLS: TOOLS, load: load, run: run, W: W, dock: dock, undock: undock, showPage: showPage, pageOpen: pageOpen,
    openDoc: openDoc, generate: generate, closeAll: closeAll, onOutput: null,
    doc: function (key) { return DOCS.filter(function (d) { return d.key === key; })[0] || null; },
    get loaded() { return !!(readyPromise && W() && W().allRows); }
  };
})();
