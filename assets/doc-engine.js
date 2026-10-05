// ตัวสร้างเอกสารราชการของกองช่าง: ใช้โค้ดเอกสารชุดเดิม (v184) ที่ทำงานเบื้องหลังในหน้าเว็บนี้
// แสดงฟอร์มและพรีวิวในหน้าตาของเว็บเรา เนื้อหาเอกสารเหมือนระบบเดิมทุกตัวอักษร
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, esc = ui.esc;

  // ---------- รายการเอกสาร ----------
  // open: คำสั่งเปิดฟอร์มในระบบเดิม, root: id ของฟอร์ม, gen: 'submit' หรือคำสั่งสร้างเอกสาร, print: คำสั่งพิมพ์
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
    { key: 'completion', group: 'ส่งมอบและตรวจรับ', title: 'รายงานผลแล้วเสร็จ 100%', desc: 'รายงานผลการดำเนินงานแล้วเสร็จ', icon: 'task_alt', open: 'openEngineerReportHome();openCompletionReportForm()', root: 'completionReportForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'testResult', group: 'ส่งมอบและตรวจรับ', title: 'ผลทดสอบวัสดุ', desc: 'ดิน เหล็ก คอนกรีต AC Job-mix ขออนุมัติวัสดุ (เลือกชนิดในฟอร์ม)', icon: 'science', open: 'openTestResultPage()', root: 'testResultForm', area: 'testResultPrintArea', gen: 'previewSelectedTestResultType()', print: 'printTestResultDocument()' },
    { key: 'torSpecific', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'ร่าง TOR ว159 แบบเจาะจง', desc: 'งบไม่เกินห้าแสนบาท: เชิญประชุม + รายงานการประชุม + ร่างขอบเขตงาน', icon: 'gavel', open: "openTorDraftHome();openTorDraftForm('specific')", root: 'torDraftForm', area: 'torDraftPrintArea', gen: 'submit', print: 'printTorDraftDocument()' },
    { key: 'torEbidding', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'ร่าง TOR e-bidding', desc: 'งบเกินห้าแสนบาท: เชิญประชุม + รายงานการประชุม + ร่างขอบเขตงาน', icon: 'gavel', open: "openTorDraftHome();openTorDraftForm('ebidding')", root: 'torDraftForm', area: 'torDraftPrintArea', gen: 'submit', print: 'printTorDraftDocument()' },
    { key: 'centralPrice', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'กำหนดราคากลาง (ชุด 4 ตอน)', desc: 'บันทึก คำสั่ง รายงานการประชุม และรายงานผล', icon: 'calculate', open: 'openCentralPricePage()', root: 'centralPriceForm', area: 'centralPricePrintArea', gen: "createAndPrintCentralPriceDocument('combined')", print: 'printCentralPriceDocument()' },
    { key: 'lowBid', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'แจ้งราคาต่ำกว่าราคากลาง ๑๕%', desc: 'ชุดเอกสารชี้แจงราคาต่ำกว่าราคากลาง', icon: 'percent', open: 'openLowBidNoticePage()', root: 'lowBidForm', area: 'lowBidPrintArea', gen: 'previewLowBidNotice()', print: 'printLowBidNotice()' },
    { key: 'kValue', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'คำนวณค่า K', desc: 'Escalation Factor จากดัชนีราคา', icon: 'functions', open: 'openKReportHome();openKValueFromReportHome()', root: 'kValueForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'kInvite', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'บันทึกเชิญประชุมค่า K', desc: 'เชิญคณะกรรมการพิจารณาค่า K', icon: 'groups', open: "openKReportHome();openKMeetingDocument('invite')", root: 'torDraftForm', area: 'torDraftPrintArea', gen: 'submit', print: 'printTorDraftDocument()' },
    { key: 'kMeeting', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'รายงานการประชุมค่า K', desc: 'รายงานการประชุมและระเบียบวาระ', icon: 'record_voice_over', open: "openKReportHome();openKMeetingDocument('meeting')", root: 'torDraftForm', area: 'torDraftPrintArea', gen: 'submit', print: 'printTorDraftDocument()' },
    { key: 'compTor', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'เบิกค่าตอบแทน TOR และราคากลาง', desc: 'บันทึกเบิกค่าตอบแทนคณะกรรมการ', icon: 'payments', open: "openCompensationPage();selectCompensationDocumentType('torPrice')", root: 'compensationForm', area: 'compensationPrintArea', gen: "createCompensationDocument('torPrice')", print: 'printCompensationDocument()' },
    { key: 'compInspection', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'เบิกค่าตอบแทนกรรมการตรวจรับพัสดุ', desc: 'บันทึกเบิกค่าตอบแทนคณะกรรมการตรวจรับ', icon: 'payments', open: "openCompensationPage();selectCompensationDocumentType('inspection')", root: 'compensationForm', area: 'compensationPrintArea', gen: "createCompensationDocument('inspection')", print: 'printCompensationDocument()' },
    { key: 'compSupervisor', group: 'จัดซื้อจัดจ้างและการเงิน', title: 'เบิกค่าตอบแทนผู้ควบคุมงาน', desc: 'บันทึกเบิกค่าตอบแทนผู้ควบคุมงาน', icon: 'payments', open: "openCompensationPage();selectCompensationDocumentType('supervisor')", root: 'compensationForm', area: 'compensationPrintArea', gen: "createCompensationDocument('supervisor')", print: 'printCompensationDocument()' },
    // เอกสารที่ไม่ผูกกับโครงการ
    { key: 'building', general: true, group: 'งานอาคาร', title: 'บันทึกตรวจสอบสิ่งปลูกสร้างอาคาร', desc: 'บันทึกตรวจสอบพร้อมหน้าความเห็นท้ายรายงาน', icon: 'home_work', open: 'openBuildingInspectionPage();openBuildingInspectionForm()', root: 'buildingInspectionForm', gen: 'submit', print: 'printMemoDocument()' },
    { key: 'a1', general: true, group: 'งานอาคาร', title: 'ใบ อ.1', desc: 'ใบอนุญาต/คำขอ/หมายเหตุ/ต่ออายุ', icon: 'badge', open: 'openBuildingInspectionPage();openBuildingPermitA1Form()', root: 'buildingPermitA1Form', gen: 'previewBuildingPermitA1Document()', print: 'printMemoDocument()' },
    { key: 'evaluation', general: true, group: 'บุคลากร', title: 'แบบประเมินผลการปฏิบัติงาน', desc: 'ข้าราชการ / พนักงานจ้างตามภารกิจ / พนักงานจ้างทั่วไป', icon: 'assignment_ind', open: 'openPerformanceEvaluationPage()', root: 'performanceEvaluationBackdrop', area: 'performanceEvaluationPrintArea', gen: null, print: 'printPerformanceEvaluation()' }
  ];
  var ENTRY = { key: 'entry', title: 'ข้อมูลโครงการ', icon: 'edit_note', root: 'projectEntryForm', gen: 'submit' };

  // ---------- เครื่องยนต์ (ระบบเดิมใน iframe ที่ซ่อนไว้) ----------
  var frame = null, readyPromise = null, captured = null, messages = [], currentArea = 'memoPrintArea';

  // เอกสารที่ระบบเดิมสั่ง window.print() ทั้งหน้า (เช่น บันทึกข้อความรายสัปดาห์):
  // คัดลอกเฉพาะพื้นที่เอกสารพร้อมกรอบที่ครอบอยู่และสไตล์ทั้งหมด เพื่อให้ CSS สำหรับพิมพ์ทำงานเหมือนเดิม
  function snapshot() {
    var d = W().document, area = d.getElementById(currentArea);
    if (!area || !area.innerHTML.trim()) return null;
    var attrs = function (el) {
      return ['id', 'class', 'style'].map(function (a) { var v = el.getAttribute(a); return v ? ' ' + a + '="' + v.replace(/"/g, '&quot;') + '"' : ''; }).join('');
    };
    var chain = [], el = area.parentElement;
    while (el && el !== d.body) { chain.unshift(el); el = el.parentElement; }
    // กรอบที่ครอบเอกสารในหน้าเดิมเป็นแผงเลื่อน/ป๊อปอัป: ให้แสดงเต็มความสูงในพรีวิว
    var open = chain.map(function (e) { return '<' + e.tagName.toLowerCase() + attrs(e).replace(/ class="/, ' class="sk-chain ').replace(/^(?![\s\S]*class=)/, ' class="sk-chain"') + '>'; }).join('');
    var close = chain.slice().reverse().map(function (e) { return '</' + e.tagName.toLowerCase() + '>'; }).join('');
    var head = Array.prototype.map.call(d.head.querySelectorAll('style, link[rel=stylesheet], meta[charset]'), function (n) {
      return n.tagName === 'LINK' ? '<link rel="stylesheet" href="' + new URL(n.getAttribute('href'), d.baseURI).href + '">' : n.outerHTML;
    }).join('');
    return '<!DOCTYPE html><html lang="th"' + attrs(d.documentElement) + '><head><meta charset="UTF-8">' + head +
      '<style>body{background:#fff!important;margin:0}.sk-chain{position:static!important;max-height:none!important;height:auto!important;min-height:0!important;overflow:visible!important;transform:none!important;display:block!important;padding:0!important;margin:0!important;background:none!important;box-shadow:none!important;border:0!important;width:auto!important;max-width:none!important;opacity:1!important;visibility:visible!important}</style></head><body' + attrs(d.body) + '>' + open + area.outerHTML + close + '</body></html>';
  }

  function W() { return frame.contentWindow; }
  // ระบบเดิมใช้ alert ทั้งข้อความสำเร็จและข้อผิดพลาด: นับเฉพาะข้อผิดพลาด
  function errors() { return messages.filter(function (m) { return !/เรียบร้อย|สำเร็จ/.test(m); }); }
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

  function load() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise(function (resolve, reject) {
      frame = document.createElement('iframe');
      frame.title = 'ตัวสร้างเอกสาร';
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      // ต้องวางไว้นอกจอแทนการซ่อน เพราะโค้ดเดิมวัดขนาดหน้ากระดาษจากการแสดงผลจริง
      frame.style.cssText = OFFSCREEN;
      frame.src = 'system.html?engine=1';
      frame.onload = function () {
        var w = W();
        // หน้าต่างพิมพ์: เก็บ HTML เอกสารไว้แสดงในพรีวิวของเราแทนการเปิดหน้าต่างใหม่
        w.open = function () {
          var buf = '';
          var doc = {
            open: function () { buf = ''; },
            write: function (s) { buf += s; },
            writeln: function (s) { buf += s + '\n'; },
            close: function () { captured = buf; }
          };
          return { document: doc, focus: function () {}, print: function () {}, close: function () {}, addEventListener: function () {}, closed: false, location: { href: '' } };
        };
        w.alert = function (m) { messages.push(String(m)); };
        w.print = function () { var html = snapshot(); if (html) captured = html; };
        w.confirm = function () { return true; };
        w.prompt = function () { return '223344'; };
        waitFor(function () { return run('typeof loadData === "function" && typeof allRows !== "undefined"'); }, 15000).then(function (ok) {
          if (!ok) return reject(new Error('โหลดตัวสร้างเอกสารไม่สำเร็จ'));
          // ใช้งานในฐานะผู้ดูแลระบบของเว็บไซต์ (ข้อมูลอยู่ในเครื่องนี้เท่านั้น)
          run("currentUser={username:'website',fullName:'ผู้ใช้เว็บไซต์กองช่าง',department:'กองช่าง',position:'',role:'admin',roleLabel:'ผู้ดูแลระบบ'};enterAuthenticatedApp();");
          if (typeof w.showToast === 'function') w.showToast = function (m, type) { if (type === 'error') messages.push(String(m)); };
          // ยังไม่มีโครงการในฐานข้อมูล: ไม่ต้องรอข้อมูลโครงการ
          var expect = SK.db.data.projects.length;
          return waitFor(function () { return !expect || run('Array.isArray(allRows) && allRows.length > 0 ? allRows.length : 0'); }, 15000).then(function () { resolve(w); });
        }, reject);
      };
      frame.onerror = function () { reject(new Error('โหลดตัวสร้างเอกสารไม่สำเร็จ')); };
      document.body.appendChild(frame);
    });
    return readyPromise;
  }

  function closeAll() {
    try { run("document.querySelectorAll('.open').forEach(function(x){ if(/backdrop|Backdrop|modal|Modal|Wrap/.test(x.id+' '+x.className)) x.classList.remove('open'); }); returnToDashboardHome && returnToDashboardHome();"); } catch (e) {}
  }

  // ---------- อ่าน/เขียนช่องข้อมูลของฟอร์มเดิม ----------
  var SKIP_ID = /(BudgetYear|Village|Type)Filter$|ProjectSelect$|ShowCompleted|HistoryId$|^entryPassword/;
  function rootEl(doc) { return W().document.getElementById(doc.root); }
  function labelOf(el) {
    var d = W().document;
    if (el.id) { var l = d.querySelector('label[for="' + el.id + '"]'); if (l) return clean(l.textContent); }
    var box = el.closest('.control, .form-field, .field, .form-row, .entry-field, label, .signer-row, td');
    if (box) {
      var lab = box.tagName === 'LABEL' ? box : box.querySelector('label, .label, .control-label');
      if (lab && !lab.contains(el)) return clean(lab.textContent);
      if (box.tagName === 'LABEL') return clean(box.textContent);
      if (box.tagName === 'TD') {
        var table = box.closest('table'), idx = box.cellIndex, th = table && table.querySelector('thead tr, tr');
        if (th && th.cells[idx]) return clean(th.cells[idx].textContent);
      }
    }
    return clean(el.getAttribute('aria-label') || el.placeholder || el.name || el.id || '');
  }
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').replace(/[*＊]\s*$/, '').trim().slice(0, 80); }
  function visible(el) { return !!(el.offsetParent || el.getClientRects().length); }

  function collect(doc) {
    var root = rootEl(doc);
    if (!root) return { fields: [], tools: [] };
    var els = Array.prototype.filter.call(root.querySelectorAll('input, select, textarea'), function (el) {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button' || el.disabled) return false;
      if (SKIP_ID.test(el.id || '')) return false;
      return visible(el);
    });
    W().__skFields = els;
    var fields = els.map(function (el, i) {
      var f = { i: i, tag: el.tagName.toLowerCase(), type: el.type, label: labelOf(el), value: el.value, required: !!el.required,
        placeholder: el.placeholder || '', readonly: !!el.readOnly, sig: el.tagName + el.type + (el.id || el.name || '') };
      if (el.tagName === 'SELECT') f.options = Array.prototype.map.call(el.options, function (o) { return [o.value, o.text]; });
      if (el.type === 'checkbox' || el.type === 'radio') f.checked = el.checked;
      if (el.type === 'file') { f.accept = el.accept || ''; f.multiple = el.multiple; f.files = el.files ? el.files.length : 0; }
      return f;
    });
    var tools = Array.prototype.filter.call(root.querySelectorAll('button'), function (b) {
      var t = clean(b.textContent);
      return visible(b) && b.type !== 'submit' && t.length > 2 && !/พิมพ์|Word|PDF|ปิด|ยกเลิก|บันทึกประวัติ|สร้างพรีวิว|แก้ไขข้อความพรีวิว|ล้างแบบฟอร์ม|ลบ/.test(t);
    });
    W().__skTools = tools;
    return { fields: fields, tools: tools.map(function (b, i) { return { i: i, label: clean(b.textContent) }; }) };
  }

  function fire(el, types) { types.forEach(function (t) { el.dispatchEvent(new (W().Event)(t, { bubbles: true })); }); }
  function setField(i, value, files) {
    var el = W().__skFields && W().__skFields[i];
    if (!el) return;
    if (el.type === 'file') {
      if (!files) return;
      var dt = new (W().DataTransfer)();
      Array.prototype.forEach.call(files, function (f) { dt.items.add(f); });
      el.files = dt.files;
      fire(el, ['change']);
      return;
    }
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!value;
    else el.value = value;
    fire(el, ['input', 'change']);
  }

  function selectProject(doc, rowNumber) {
    var root = rootEl(doc);
    var sel = root && Array.prototype.filter.call(root.querySelectorAll('select'), function (s) { return /ProjectSelect$/.test(s.id); })[0];
    if (!sel) return true;
    var has = function () { return Array.prototype.some.call(sel.options, function (o) { return o.value === String(rowNumber); }); };
    if (!has()) {
      // โครงการที่แล้วเสร็จถูกซ่อนในรายการ: เปิดตัวเลือก "แสดงโครงการที่แล้วเสร็จ"
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

  function openDoc(doc, rowNumber) {
    return load().then(function () {
      closeAll();
      messages = [];
      run(doc.open);
      return sleep(500);
    }).then(function () {
      if (doc.general || rowNumber == null) return true;
      return selectProject(doc, rowNumber);
    }).then(function (ok) {
      if (!ok) throw new Error('ไม่พบโครงการนี้ในรายการของเอกสาร "' + doc.title + '"');
      return sleep(700);
    }).then(function () { return collect(doc); });
  }

  function generate(doc) {
    messages = [];
    captured = null;
    currentArea = doc.area || 'memoPrintArea';
    var root = rootEl(doc);
    var areaEl = W().document.getElementById(currentArea);
    // หลายเอกสารใช้พื้นที่พรีวิวร่วมกัน: ล้างของเก่าก่อน เพื่อไม่ให้พิมพ์เอกสารเดิมที่ค้างอยู่
    if (doc.gen && areaEl) areaEl.innerHTML = '';
    return Promise.resolve().then(function () {
      if (root && root.tagName === 'FORM' && doc.gen === 'submit') {
        var invalid = Array.prototype.filter.call(root.elements, function (e) { return e.willValidate && !e.checkValidity(); });
        if (invalid.length && !root.noValidate) {
          var labels = invalid.map(labelOf).filter(Boolean);
          throw new Error('กรุณากรอก: ' + labels.join(', '));
        }
        var m = /^\s*(?:return\s+)?([A-Za-z_]\w*)\s*\(/.exec(root.getAttribute('onsubmit') || '');
        var submitter = root.querySelector('button[type=submit]');
        var ev = new (W().SubmitEvent)('submit', { cancelable: true, submitter: submitter });
        return m ? W()[m[1]](ev) : root.requestSubmit(submitter);
      }
      return doc.gen ? run(doc.gen) : null;
    }).then(function () {
      if (errors().length) throw new Error(errors().join(' • '));
      // บางเอกสารสร้างแบบไม่รอ (เช่น อ่านไฟล์รูป): รอจนพื้นที่เอกสารมีเนื้อหา
      return areaEl && doc.gen ? waitFor(function () { return areaEl.innerHTML.trim() || errors().length; }, 15000) : null;
    }).then(function () {
      if (errors().length) throw new Error(errors().join(' • '));
      // พิมพ์ทันทีหลังสร้าง (ก่อนระบบเดิมล้างพรีวิวหลังบันทึกประวัติ)
      return run(doc.print);
    }).then(function () {
      return waitFor(function () { return captured && captured.length > 200 ? captured : null; }, 15000);
    }).then(function (html) {
      if (!html) throw new Error(errors().join(' • ') || 'สร้างเอกสารไม่สำเร็จ กรุณาตรวจสอบข้อมูลในฟอร์ม');
      return html;
    });
  }

  function wordButton(doc) {
    var root = rootEl(doc);
    var scope = root && (root.closest('[id$="Wrap"], [id$="Backdrop"]') || root.parentElement);
    return scope ? Array.prototype.filter.call(scope.querySelectorAll('button'), function (b) { return /Word/.test(b.textContent) && visible(b); })[0] : null;
  }

  // ---------- หน้าต่างของเว็บเรา ----------
  var inputCls = 'w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md outline-none border border-transparent focus:border-primary-container focus:ring-2 focus:ring-primary/20';

  function fieldHtml(f) {
    var id = 'skf-' + f.i, req = f.required ? ' <span class="text-error">*</span>' : '';
    var label = '<label for="' + id + '" class="font-label-md text-label-md text-on-surface font-semibold">' + esc(f.label || 'ช่องข้อมูล') + req + '</label>';
    var attrs = ' id="' + id + '" data-i="' + f.i + '"' + (f.readonly ? ' readonly' : '');
    var input;
    if (f.tag === 'select') {
      input = '<select' + attrs + ' class="' + inputCls + '">' + f.options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (o[0] === f.value ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select>';
    } else if (f.tag === 'textarea') {
      input = '<textarea' + attrs + ' rows="3" class="' + inputCls + ' resize-y" placeholder="' + esc(f.placeholder) + '">' + esc(f.value) + '</textarea>';
    } else if (f.type === 'checkbox' || f.type === 'radio') {
      return '<label class="flex items-center gap-2 sm:col-span-2"><input type="checkbox"' + attrs + (f.checked ? ' checked' : '') + ' class="w-4 h-4"/> <span>' + esc(f.label) + '</span></label>';
    } else if (f.type === 'file') {
      input = '<input type="file"' + attrs + (f.accept ? ' accept="' + esc(f.accept) + '"' : '') + (f.multiple ? ' multiple' : '') + ' class="block w-full text-body-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary"/>' +
        (f.files ? '<span class="font-body-sm text-body-sm text-on-surface-variant">เลือกไว้ ' + f.files + ' ไฟล์</span>' : '');
    } else {
      var type = f.type === 'number' ? 'number' : 'text';
      input = '<input type="' + type + '"' + attrs + ' value="' + esc(f.value) + '" placeholder="' + esc(f.placeholder) + '" class="' + inputCls + '"/>';
    }
    var wide = f.tag === 'textarea' || (f.label || '').length > 30;
    return '<div class="flex flex-col gap-1' + (wide ? ' sm:col-span-2' : '') + '">' + label + input + '</div>';
  }

  function renderForm(box, data) {
    var need = data.fields.filter(function (f) { return f.required; });
    var rest = data.fields.filter(function (f) { return !f.required; });
    box.innerHTML =
      (need.length ? '<h4 class="font-headline-sm text-headline-sm text-primary mb-2">ข้อมูลที่ต้องกรอก</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">' + need.map(fieldHtml).join('') + '</div>' : '') +
      (data.tools.length ? '<div class="flex flex-wrap gap-2 mb-4">' + data.tools.map(function (t) {
        return '<button type="button" data-tool="' + t.i + '" class="' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">add</span>' + esc(t.label) + '</button>';
      }).join('') + '</div>' : '') +
      (rest.length ? '<details class="rounded-lg bg-surface-container-low/50 p-3"' + (need.length ? '' : ' open') + '><summary class="cursor-pointer font-label-md text-label-md text-primary">ข้อมูลเอกสาร (เติมจากข้อมูลโครงการแล้ว ' + rest.length + ' ช่อง — แก้ไขได้)</summary>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">' + rest.map(fieldHtml).join('') + '</div></details>' : '') +
      (!data.fields.length ? '<p class="text-on-surface-variant">เอกสารนี้ใช้ข้อมูลโครงการทั้งหมดอัตโนมัติ กด "สร้างเอกสาร" ได้เลย</p>' : '');
    box.__sig = data.fields.map(function (f) { return f.sig + f.label; }).join('|');
  }

  function syncValues(box, data) {
    data.fields.forEach(function (f) {
      var el = box.querySelector('[data-i="' + f.i + '"]');
      if (!el || el === document.activeElement || f.type === 'file') return;
      if (f.tag === 'select') {
        var opts = f.options.map(function (o) { return o[0] + '\u0001' + o[1]; }).join('\u0002');
        if (el.__opts !== opts) {
          el.innerHTML = f.options.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
          el.__opts = opts;
        }
      }
      if (el.type === 'checkbox') el.checked = !!f.checked; else if (el.value !== f.value) el.value = f.value;
    });
  }

  // ---------- โหมดฟอร์มเดิม: เอกสารที่มีตารางรายวัน/ตารางรายการ แสดงฟอร์มของระบบเดิมในหน้าต่างของเรา ----------
  // (ย่อเป็นช่องเดี่ยว ๆ แล้ววันที่และหัวตารางหาย) ใช้ฟอร์มเดิมทั้งหมด จึงเห็นวันที่ทุกวัน ตาราง และปุ่มเพิ่ม/ลบรายการครบ
  var OFFSCREEN = 'position:fixed;left:-12000px;top:0;width:1280px;height:900px;border:0;opacity:0;pointer-events:none';
  var COMPLEX = '.weekly-work-days, .weekly-matrix-wrap, .performance-table-input-wrap, .completion-signer-list, table, [contenteditable="true"]';
  // สีและรูปแบบของฟอร์มเดิมปรับให้เข้ากับธีมเว็บ (น้ำเงินกรมท่า พื้นขาว ช่องกรอกแบบเดียวกับฟอร์มอื่นในเว็บ)
  var NS = '[data-sk-native] ';
  var NATIVE_THEME = [
    '[data-sk-native],' + NS + '*{font-family:"Sarabun","Noto Sans Thai","Inter",sans-serif!important}',
    '[data-sk-native]{background:#f8f9ff!important;color:#0b1c30!important}',
    NS + '.form-section-title,' + NS + '.evaluation-section-title,' + NS + '.completion-section-line{background:#e5eeff!important;color:#00236f!important;border:0!important;border-left:4px solid #00236f!important;border-radius:6px!important;box-shadow:none!important}',
    NS + '.form-section-title *{color:#00236f!important}',
    NS + '.form-section-title::before,' + NS + '.control::before,' + NS + 'label::before{background:#00236f!important;box-shadow:none!important}',
    NS + '.control,' + NS + '.control.wide,' + NS + '.manual-entry-control,' + NS + '.computed-control,' + NS + '.project-derived-control{background:#fff!important;background-image:none!important;border:1px solid #e5eeff!important;border-left:1px solid #e5eeff!important;border-radius:8px!important;box-shadow:none!important}',
    NS + '.control > label,' + NS + '.control .label,' + NS + 'label{color:#444651!important}',
    NS + '.control > label{font-weight:600!important}',
    NS + '.control span[class*="badge"],' + NS + '.control label span{background:#eff4ff!important;color:#264191!important;border-color:#dce1ff!important}',
    NS + 'input:not([type=checkbox]):not([type=radio]),' + NS + 'select,' + NS + 'textarea{background:#fff!important;border:1px solid #c5c5d3!important;border-radius:6px!important;color:#0b1c30!important;box-shadow:none!important}',
    NS + 'input:focus,' + NS + 'select:focus,' + NS + 'textarea:focus{border-color:#00236f!important;outline:2px solid rgba(0,35,111,.15)!important}',
    NS + 'input[type=checkbox],' + NS + 'input[type=radio]{accent-color:#00236f!important}',
    NS + '.performance-auto-field,' + NS + 'input[readonly]{background:#eff4ff!important}',
    NS + '.project-required-note,' + NS + '.memo-filter-note{background:#eff4ff!important;color:#264191!important;border:0!important;border-left:4px solid #1e3a8a!important}',
    NS + '.project-completed-toggle,' + NS + '.combined-final-week-tools,' + NS + '.combined-workflow-block,' + NS + '.weekly-work-day-card,' + NS + '.weekly-matrix-wrap,' + NS + '.combined-photo-attachment-card{background:#fff!important;border:1px solid #e5eeff!important;border-radius:8px!important;box-shadow:none!important}',
    NS + '.weekly-work-day-card h5,' + NS + 'h4,' + NS + 'h5{color:#00236f!important}',
    NS + 'th{background:#e5eeff!important;color:#00236f!important;border-color:#c5c5d3!important}',
    NS + 'td{background:#fff!important;border-color:#c5c5d3!important}',
    NS + '.memo-prefix{background:#eff4ff!important;color:#00236f!important;border-color:#c5c5d3!important}',
    NS + '.weekly-work-quick-select{background:#eff4ff!important;color:#00236f!important;border-color:#b6c4ff!important}',
    NS + '.thai-date-calendar-btn{background:#e5eeff!important;color:#00236f!important}',
    NS + '.primary-btn,' + NS + '.performance-mini-btn.add,' + NS + '.completion-signer-mini-btn.add{background:#00236f!important;background-image:none!important;color:#fff!important;border:0!important;box-shadow:none!important}',
    NS + '.secondary-btn{background:#fff!important;color:#00236f!important;border:1px solid #c5c5d3!important}',
    NS + '.performance-mini-btn.delete,' + NS + '.completion-signer-mini-btn.delete,' + NS + '.history-delete-btn{background:#ffdad6!important;color:#93000a!important;border:0!important}'
  ].join('');
  function needsNative(doc) {
    var root = rootEl(doc);
    return !!(root && root.querySelector(COMPLEX));
  }
  function nativeView(doc, holder) {
    var d = W().document, root = rootEl(doc);
    var wrap = root.closest('.memo-form-wrap, [id$="FormWrap"]') || root;
    var home = { parent: wrap.parentNode, next: wrap.nextSibling };
    var st = d.createElement('style');
    st.textContent = 'html,body{overflow:hidden!important}' +
      'body>:not([data-sk-native]){visibility:hidden!important}' +
      '[data-sk-native]{position:fixed!important;inset:0!important;z-index:2147483000!important;overflow:auto!important;margin:0!important;' +
      'padding:12px 18px 48px!important;max-width:none!important;width:auto!important;height:auto!important;max-height:none!important;transform:none!important;' +
      'background:#fff!important;border:0!important;border-radius:0!important;box-shadow:none!important;display:block!important;visibility:visible!important;opacity:1!important}' +
      '[data-sk-native] .form-actions{display:none!important}' + NATIVE_THEME;
    var timer = null, shown = false;
    function place() {
      var r = holder.getBoundingClientRect();
      if (!r.width) return;
      frame.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;border:0;z-index:1105;opacity:1;background:#fff;border-radius:10px;box-shadow:0 0 0 1px #e5eeff';
    }
    return {
      show: function () {
        if (!wrap.hasAttribute('data-sk-native')) { wrap.setAttribute('data-sk-native', '1'); d.body.appendChild(wrap); d.head.appendChild(st); }
        shown = true; place();
        clearInterval(timer); timer = setInterval(function () { if (shown) place(); }, 300);
        window.addEventListener('resize', place);
      },
      hide: function () {
        shown = false; clearInterval(timer); window.removeEventListener('resize', place);
        frame.style.cssText = OFFSCREEN;
        // คืนฟอร์มกลับตำแหน่งเดิมก่อนสร้าง/พิมพ์ (โค้ดเดิมวัดหน้ากระดาษจากหน้าตาปกติ)
        if (wrap.hasAttribute('data-sk-native')) {
          wrap.removeAttribute('data-sk-native'); st.remove();
          home.parent.insertBefore(wrap, home.next && home.next.parentNode === home.parent ? home.next : null);
        }
      }
    };
  }

  function openDocument(doc, project) {
    var formBox = document.createElement('div');
    formBox.innerHTML = '<div class="py-10 text-center text-on-surface-variant"><span class="material-symbols-outlined animate-spin">progress_activity</span><p>กำลังเตรียมแบบฟอร์ม...</p></div>';
    var m = ui.modal({
      title: doc.title, subtitle: project ? project.name : doc.desc, icon: doc.icon, size: 'xl', body: formBox,
      actions: [
        { label: 'ยกเลิก', onClick: function (mm) { mm.close(); } },
        { label: 'สร้างเอกสาร', kind: 'primary', icon: 'description', onClick: function () { build(); } }
      ],
      onClose: function () { if (native) native.hide(); closeAll(); }
    });
    var data = null, busy = false, refreshTimer = null;

    function refresh() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        var next = collect(doc);
        var sig = next.fields.map(function (f) { return f.sig + f.label; }).join('|');
        if (sig !== formBox.__sig) renderForm(formBox, next); else syncValues(formBox, next);
        data = next;
      }, 250);
    }

    var native = null;
    openDoc(doc, project ? project.rowNumber : null).then(function (d) {
      data = d;
      if (needsNative(doc)) {
        formBox.innerHTML = '<div class="flex items-start gap-2 mb-2 p-2.5 rounded-lg bg-primary-fixed/40 font-body-sm text-body-sm"><span class="material-symbols-outlined text-primary text-[20px]">info</span>' +
          '<span>กรอกตามแบบฟอร์มด้านล่าง — แต่ละวันมีวันที่กำกับ ตารางสภาพอากาศ/แรงงาน/เครื่องจักรเลือกตามวัน แล้วกด <b>สร้างเอกสาร</b></span></div>' +
          '<div data-native-holder style="height:calc(92vh - 220px);min-height:360px" class="rounded-lg bg-surface-container-low"></div>';
        native = nativeView(doc, formBox.querySelector('[data-native-holder]'));
        native.show();
        return;
      }
      renderForm(formBox, d);
    }).catch(function (err) {
      formBox.innerHTML = '<div class="p-4 rounded-lg bg-error-container text-on-error-container">' + esc(err.message || err) + '</div>';
    });

    formBox.addEventListener('change', function (e) {
      var el = e.target.closest('[data-i]');
      if (!el) return;
      setField(+el.dataset.i, el.type === 'checkbox' ? el.checked : el.value, el.type === 'file' ? el.files : null);
      refresh();
    });
    formBox.addEventListener('input', function (e) {
      var el = e.target.closest('[data-i]');
      if (!el || el.tagName === 'SELECT' || el.type === 'file' || el.type === 'checkbox') return;
      setField(+el.dataset.i, el.value);
    });
    formBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tool]');
      if (!b) return;
      var t = W().__skTools[+b.dataset.tool];
      if (t) { t.click(); refresh(); }
    });

    function build() {
      if (busy || !data) return;
      busy = true;
      if (native) data = collect(doc);
      var btn = m.el.querySelector('.sk-modal-actions button:last-child');
      var old = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>กำลังสร้างเอกสาร...</span>';
      // ส่งค่าล่าสุดทุกช่องก่อนสร้าง
      formBox.querySelectorAll('[data-i]').forEach(function (el) {
        if (el.type !== 'file') setField(+el.dataset.i, el.type === 'checkbox' ? el.checked : el.value);
      });
      if (native) native.hide();
      generate(doc).then(function (html) {
        var entry = saveHistory(doc, project, html, null);
        showPreview(doc, project, html, function () { if (native && document.body.contains(m.el)) native.show(); }, entry);
      }).catch(function (err) {
        ui.toast(err.message || String(err), 'error');
        if (native) native.show(); else refresh();
      }).then(function () {
        busy = false; btn.disabled = false; btn.innerHTML = old;
      });
    }
  }

  // ---------- ประวัติเอกสาร ----------
  // ทุกครั้งที่สร้างเอกสาร เก็บสำเนา (HTML) ไว้ในทะเบียนเอกสาร พร้อมผู้จัดทำ วันเวลา และโครงการ
  // เปิดจากทะเบียน/หน้าโครงการได้อีกครั้ง (พรีวิว แก้ไขข้อความ พิมพ์ บันทึกเป็น Word) — ข้อความที่แก้ในพรีวิวบันทึกทับสำเนานี้
  function historyType(doc) {
    var t = (doc.group || '') + ' ' + doc.title;
    return /ตรวจรับ|ส่งมอบ|ผลทดสอบ/.test(t) ? 'inspection' : /ราคากลาง|ปร\.|TOR/.test(t) ? 'estimate' : 'order';
  }
  function userName() { var u = ui.currentUser ? ui.currentUser() : null; return (u && u.signedIn && u.name) || ''; }
  function saveHistory(doc, project, html, entryP) {
    if (!SK.db.files || !SK.flows) return Promise.resolve(null);
    var now = new Date(), stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '');
    var name = 'sikaew-' + doc.key + (project && project.id ? '-' + String(project.id).toLowerCase() : '') + '-' + stamp + '.html';
    return Promise.resolve(entryP).then(function (entry) {
      var file = new File([html], name, { type: 'text/html' });
      return SK.db.files.put(file).then(function (fileId) {
        if (entry) {
          entry.fileId = fileId; entry.fileSize = file.size; entry.edited = true; entry.updatedAt = now.toISOString(); entry.updatedBy = userName();
        } else {
          entry = {
            id: 'DOC-' + stamp.slice(2), type: historyType(doc), title: doc.title + (project ? ' — ' + project.name : ''),
            detail: doc.desc || '', projectId: project ? project.id : '', status: 'approved', format: 'html', fileId: fileId,
            docKey: doc.key, fileName: name, fileSize: file.size, owner: userName(), date: now.toISOString().slice(0, 10), createdAt: now.toISOString()
          };
          SK.db.data.documents.unshift(entry);
        }
        SK.db.save();
        if (SK.page && SK.page.refresh) try { SK.page.refresh(); } catch (e) {}
        return entry;
      });
    }).catch(function (err) { console.warn('บันทึกประวัติเอกสารไม่สำเร็จ', err); return null; });
  }
  function snapshot(d) {
    var root = d.documentElement.cloneNode(true);
    root.setAttribute('data-sk-std', '1');
    Array.prototype.forEach.call(root.querySelectorAll('script'), function (x) { x.remove(); });
    return '<!DOCTYPE html>' + root.outerHTML;
  }
  // เปิดเอกสารจากประวัติ
  function reopen(entry) {
    return SK.db.files.get(entry.fileId).then(function (rec) {
      if (!rec) throw new Error('ไม่พบสำเนาเอกสารในระบบ');
      return (rec.blob.text ? rec.blob.text() : new Response(rec.blob).text()).then(function (html) {
        var doc = DOCS.filter(function (d) { return d.key === entry.docKey; })[0] || { key: entry.docKey || 'doc', title: entry.title };
        var p = entry.projectId ? SK.db.project(entry.projectId) : null;
        showPreview(doc, p, html, null, Promise.resolve(entry));
      });
    }).catch(function (err) { ui.toast(err.message || String(err), 'error'); });
  }

  function showPreview(doc, project, html, onBack, entryP) {
    // ปิดการสั่งพิมพ์อัตโนมัติของหน้าเอกสาร แล้วให้ปุ่มของเราเป็นผู้สั่งพิมพ์
    var guard = '<script>window.__skPrint=window.print;window.print=function(){};window.close=function(){};<\/script>';
    var doc2 = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (h) { return h + guard; }) : guard + html;
    var wrap = document.createElement('div');
    var tb = function (cmd, icon, label) {
      return '<button type="button" data-cmd="' + cmd + '" title="' + label + '" aria-label="' + label + '" class="p-1.5 rounded hover:bg-surface-container-high disabled:opacity-40" disabled><span class="material-symbols-outlined text-[20px]">' + icon + '</span></button>';
    };
    wrap.innerHTML =
      '<div class="flex flex-wrap items-center gap-1 mb-2 p-1.5 rounded-lg bg-surface-container-low">' +
        '<button type="button" data-edit class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest ring-1 ring-surface-container font-label-md text-label-md font-semibold text-primary"><span class="material-symbols-outlined text-[18px]">edit_note</span><span>แก้ไขข้อความ</span></button>' +
        '<span class="w-px h-6 bg-surface-container-high mx-1"></span>' +
        tb('bold', 'format_bold', 'ตัวหนา') + tb('italic', 'format_italic', 'ตัวเอียง') + tb('underline', 'format_underlined', 'ขีดเส้นใต้') +
        '<span class="w-px h-6 bg-surface-container-high mx-1"></span>' +
        tb('justifyLeft', 'format_align_left', 'ชิดซ้าย') + tb('justifyCenter', 'format_align_center', 'กึ่งกลาง') + tb('justifyRight', 'format_align_right', 'ชิดขวา') + tb('justifyFull', 'format_align_justify', 'กระจายเต็มบรรทัด') +
        '<span class="w-px h-6 bg-surface-container-high mx-1"></span>' +
        tb('undo', 'undo', 'เลิกทำ') + tb('redo', 'redo', 'ทำซ้ำ') +
        '<span data-edit-hint class="hidden ml-auto font-body-sm text-body-sm text-secondary">คลิกที่ข้อความในเอกสารเพื่อแก้ไข — ผลการแก้ไขใช้ทั้งการพิมพ์และไฟล์ Word</span>' +
      '</div>' +
      '<div class="rounded-lg bg-surface-container overflow-hidden"><iframe title="พรีวิวเอกสาร" class="w-full bg-white" style="height:66vh;border:0"></iframe></div>';
    var iframe = wrap.querySelector('iframe'), editing = false, dirty = false;
    // ข้อความที่แก้ในพรีวิว: บันทึกทับสำเนาในประวัติเอกสาร
    function keepEdits() {
      if (!dirty || !entryP) return;
      dirty = false;
      entryP = saveHistory(doc, project, snapshot(iframe.contentDocument), entryP);
    }
    var editBtn = wrap.querySelector('[data-edit]');
    editBtn.addEventListener('click', function () {
      var d = iframe.contentDocument; if (!d) return;
      editing = !editing;
      d.designMode = editing ? 'on' : 'off';
      editBtn.classList.toggle('bg-primary', editing); editBtn.classList.toggle('text-on-primary', editing);
      editBtn.querySelector('span:last-child').textContent = editing ? 'เสร็จสิ้นการแก้ไข' : 'แก้ไขข้อความ';
      if (!editing) keepEdits();
      wrap.querySelectorAll('[data-cmd]').forEach(function (b) { b.disabled = !editing; });
      wrap.querySelector('[data-edit-hint]').classList.toggle('hidden', !editing);
      if (editing) iframe.contentWindow.focus();
    });
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cmd]'); if (!b || b.disabled) return;
      var d = iframe.contentDocument;
      d.execCommand(b.dataset.cmd, false, null);
      iframe.contentWindow.focus();
    });
    var fileBase = 'sikaew-' + doc.key + (project && project.id ? '-' + String(project.id).toLowerCase() : '') + '-' + new Date().toISOString().slice(0, 10);
    ui.modal({
      title: 'พรีวิว: ' + doc.title, subtitle: project ? project.name : '', icon: 'preview', size: 'lg', body: wrap,
      onClose: function () { if (editing) editBtn.click(); keepEdits(); if (onBack) onBack(); },
      actions: [{ label: 'กลับไปแก้ไข', icon: 'edit', onClick: function (m) { m.close(); } },
        { label: 'บันทึกเป็น Word', icon: 'download', onClick: function () {
          if (!SK.wordExport) return ui.toast('ไม่พบตัวสร้างไฟล์ Word', 'error');
          if (editing) editBtn.click();
          ui.toast('กำลังสร้างไฟล์ Word...');
          SK.wordExport.download(iframe.contentDocument, fileBase + '.docx').then(function () { ui.toast('ดาวน์โหลดไฟล์ Word แล้ว', 'success'); },
            function (err) { ui.toast('สร้างไฟล์ Word ไม่สำเร็จ: ' + (err && err.message || err), 'error'); });
        } },
        { label: 'พิมพ์ / บันทึกเป็น PDF', kind: 'primary', icon: 'print', onClick: function () {
          var w = iframe.contentWindow;
          if (editing) editBtn.click();
          w.focus();
          (w.__skPrint || w.print).call(w);
        } }]
    });
    // จัดรูปแบบบันทึกข้อความตามมาตรฐานการพิมพ์หนังสือราชการ (assets/doc-standard.js)
    iframe.addEventListener('load', function () {
      var d = iframe.contentDocument;
      d.addEventListener('input', function () { dirty = true; });
      // สำเนาที่จัดรูปแบบแล้ว (จากประวัติ) ไม่ต้องจัดซ้ำ
      if (d.documentElement.hasAttribute('data-sk-std')) return;
      try { if (SK.docStandard) SK.docStandard.apply(d); } catch (e) { console.warn('จัดรูปแบบมาตรฐานไม่สำเร็จ', e); }
    });
    iframe.srcdoc = doc2;
  }

  // ---------- เพิ่ม/แก้ไขโครงการด้วยฟอร์มเดิม ----------
  // ---------- ฟอร์มลงทะเบียน/แก้ไขโครงการ: แสดงทุกช่องของฟอร์มเดิมตามลำดับและหมวดเดิม ----------
  var MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  function isoToThai(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? +m[3] + ' ' + MONTHS_TH[+m[2] - 1] + ' ' + (+m[1] + 543) : '';
  }
  function thaiToIso(text) {
    var m = /^(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec(String(text || '').trim());
    var mo = m ? MONTHS_TH.indexOf(m[2]) + 1 : 0;
    if (!mo) return '';
    var y = +m[3] - (+m[3] > 2400 ? 543 : 0);
    return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (+m[1] < 10 ? '0' : '') + (+m[1]);
  }

  // หมวดของฟอร์มโครงการ (จัดกลุ่มช่องของฟอร์มเดิมตามชื่อช่อง ให้อ่านง่ายและกรอกตามลำดับงานจริง)
  var ENTRY_GROUPS = [
    { key: 'info', icon: 'description', title: 'ข้อมูลโครงการ', desc: 'ชื่อโครงการ ประเภทงาน และแหล่งงบประมาณ', names: ['projectName', 'localAgency', 'workScope', 'type', 'budgetType', 'budgetYear'] },
    { key: 'site', icon: 'location_on', title: 'ที่ตั้งโครงการ', desc: 'หมู่บ้าน และพิกัดบนแผนที่', names: ['constructionSite', 'coordinate'] },
    { key: 'contract', icon: 'contract', title: 'คำสั่งและสัญญาจ้าง', desc: 'เลขที่คำสั่ง สัญญา ระยะเวลา และค่างาน', names: ['orderNo', 'orderDate', 'contractNo', 'contractDate', 'startDate', 'endDate', 'workValue', 'finePerDay'] },
    { key: 'delivery', icon: 'event_available', title: 'การส่งมอบและตรวจรับงาน', desc: 'กรอกเมื่อถึงขั้นตอน (เว้นว่างไว้ก่อนได้)', names: ['contractorNoticeDate', 'contractorDeliveryDate', 'acceptanceDate'] },
    { key: 'auto', icon: 'auto_awesome', title: 'สถานะโครงการ', desc: 'ระบบคำนวณให้อัตโนมัติจากวันที่และผลงาน', names: ['status', 'remainingDaysText', 'progress'], auto: true },
    { key: 'sup', icon: 'engineering', title: 'ผู้ควบคุมงาน', desc: 'เลือกจำนวน แล้วเลือกรายชื่อ — ตำแหน่งเติมให้อัตโนมัติ', match: /^supervisor/ },
    { key: 'contractor', icon: 'storefront', title: 'ผู้รับจ้าง', desc: 'พิมพ์ชื่อห้าง/บริษัทเพื่อค้นหา — ที่อยู่ เบอร์โทร เลขภาษีเติมให้', match: /^(contractor|taxId)/ },
    { key: 'committee', icon: 'groups', title: 'คณะกรรมการตรวจรับงานจ้าง', desc: 'เลือก 3 หรือ 5 คน — ตำแหน่งและสังกัดเติมให้อัตโนมัติ', match: /^(committee|chairman)/ },
    { key: 'tor', icon: 'gavel', title: 'กรรมการ TOR / ราคากลาง', desc: 'ใช้กับเอกสาร TOR และกำหนดราคากลาง (ถ้ามี)', match: /^(tor|price)/, optional: true },
    { key: 'other', icon: 'sticky_note_2', title: 'หมายเหตุ', desc: 'รายละเอียดเพิ่มเติม' }
  ];

  // อ่านช่องของฟอร์มเดิม (ลำดับตามหน้าฟอร์ม) แล้วจัดลงหมวด
  function entryLayout(doc) {
    var root = rootEl(doc);
    Array.prototype.forEach.call(root.querySelectorAll('details'), function (d) { d.open = true; });
    var data = collect(doc), els = W().__skFields;
    var groups = ENTRY_GROUPS.map(function (g) { return Object.assign({ fields: [] }, g); });
    var byKey = {}; groups.forEach(function (g) { byKey[g.key] = g; });
    data.fields.forEach(function (f, i) {
      var el = els[i], node = el.closest('.control') || el.parentElement;
      var name = el.name || el.id || '';
      f.name = name;
      f.wide = node.classList.contains('wide') || node.classList.contains('committee-count-control') || f.tag === 'textarea';
      f.trio = !!node.closest('.project-committee-person');
      f.thaiDate = el.getAttribute('data-thai-date') === '1';
      f.coord = name === 'coordinate';
      if (el.list) f.list = Array.prototype.map.call(el.list.options, function (o) { return o.value; });
      f.note = Array.prototype.map.call(node.querySelectorAll('.memo-filter-note'), function (n) { return clean(n.textContent); }).join(' ');
      var g = groups.filter(function (x) { return x.names && x.names.indexOf(name) >= 0; })[0] ||
        groups.filter(function (x) { return x.match && x.match.test(name); })[0] || byKey.other;
      if (g.names) f.order = g.names.indexOf(name);
      g.fields.push(f);
    });
    groups.forEach(function (g) { if (g.names) g.fields.sort(function (x, y) { return x.order - y.order; }); });
    data.groups = groups.filter(function (g) { return g.fields.length; });
    return data;
  }

  function entryFieldHtml(f, auto) {
    var id = 'skf-' + f.i, ro = f.readonly;
    var label = '<label for="' + id + '" class="font-label-md text-label-md text-on-surface font-semibold">' + esc(f.label || 'ช่องข้อมูล') + (f.required ? ' <span class="text-error">*</span>' : '') + '</label>';
    if (auto) {
      return '<div class="sm:col-span-2 rounded-lg bg-surface-container-low px-3 py-2 flex flex-col">' +
        '<span class="font-label-sm text-label-sm text-on-surface-variant">' + esc(f.label) + '</span>' +
        '<input id="' + id + '" data-i="' + f.i + '" readonly tabindex="-1" value="' + esc(f.value) + '" placeholder="คำนวณเมื่อบันทึก" class="bg-transparent border-0 p-0 font-headline-sm text-headline-sm text-primary font-bold outline-none placeholder:text-outline placeholder:font-normal"/></div>';
    }
    var cls = inputCls + (ro ? ' !bg-surface-container text-on-surface-variant cursor-not-allowed' : '');
    var attrs = ' id="' + id + '" data-i="' + f.i + '"' + (ro ? ' readonly tabindex="-1"' : '') + (f.required ? ' required' : '');
    var input;
    if (f.tag === 'select') {
      input = '<select' + attrs + ' class="' + cls + '">' + f.options.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (o[0] === f.value ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select>';
    } else if (f.tag === 'textarea') {
      input = '<textarea' + attrs + ' rows="2" class="' + cls + ' resize-y" placeholder="' + esc(f.placeholder) + '">' + esc(f.value) + '</textarea>';
    } else {
      var listId = f.list ? 'skl-' + f.i : '';
      input = '<input type="' + (f.type === 'number' ? 'number' : 'text') + '"' + attrs + ' value="' + esc(f.value) + '" placeholder="' + esc(ro ? 'เติมให้อัตโนมัติ' : f.placeholder) + '" class="' + cls + '"' +
        (listId ? ' list="' + listId + '" autocomplete="off"' : '') + (f.thaiDate ? ' autocomplete="off"' : '') + '/>' +
        (listId ? '<datalist id="' + listId + '">' + f.list.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>' : '');
      if (f.thaiDate) {
        input = '<div class="flex gap-1">' + input +
          '<button type="button" data-date-for="' + f.i + '" class="shrink-0 px-2.5 rounded-lg bg-primary-fixed/50 text-primary hover:bg-primary-fixed" title="เลือกจากปฏิทิน" aria-label="เลือก' + esc(f.label) + 'จากปฏิทิน">' +
          '<span class="material-symbols-outlined text-[20px]">calendar_month</span></button>' +
          '<button type="button" data-clear="' + f.i + '" class="shrink-0 px-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40" title="ล้างวันที่" aria-label="ล้าง' + esc(f.label) + '"><span class="material-symbols-outlined text-[18px]">close</span></button></div>';
      } else if (f.coord) {
        input = '<div class="flex gap-1">' + input + '<button type="button" data-pick-map="' + f.i + '" class="' + ui.btnClass('accent') + ' shrink-0"><span class="material-symbols-outlined text-[18px]">map</span>เลือกจากแผนที่</button></div>';
      }
    }
    return '<div class="flex flex-col gap-1 min-w-0 ' + (f.wide ? 'sm:col-span-6' : f.trio ? 'sm:col-span-2' : 'sm:col-span-3') + '">' + label + input +
      (f.note ? '<span class="font-body-sm text-body-sm text-on-surface-variant">' + esc(f.note) + '</span>' : '') + '</div>';
  }

  function groupFilled(g) {
    var editable = g.fields.filter(function (f) { return !f.readonly; });
    return [editable.filter(function (f) { return String(f.value || '').trim(); }).length, editable.length];
  }

  function renderEntry(box, data) {
    var nav = '', body = '';
    data.groups.forEach(function (g, n) {
      var cnt = groupFilled(g);
      nav += '<button type="button" data-goto="' + g.key + '" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-surface-container-high">' +
        '<span class="material-symbols-outlined text-[20px] text-primary">' + g.icon + '</span><span class="flex-1 min-w-0 font-label-md text-label-md leading-tight">' + esc(g.title) + '</span>' +
        (g.auto ? '' : '<span data-count="' + g.key + '" class="font-label-sm text-label-sm ' + (cnt[0] ? 'text-emerald-700' : 'text-outline') + '">' + cnt[0] + '/' + cnt[1] + '</span>') + '</button>';
      var head = '<span class="w-8 h-8 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">' + (n + 1) + '</span>' +
        '<span class="material-symbols-outlined text-primary mt-1">' + g.icon + '</span>' +
        '<span class="flex-1 min-w-0"><span class="block font-headline-sm text-headline-sm text-primary font-bold">' + esc(g.title) + '</span>' +
        '<span class="block font-body-sm text-body-sm text-on-surface-variant">' + esc(g.desc) + '</span></span>' +
        (g.optional ? '<span class="shrink-0 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">ไม่บังคับ</span>' : '');
      var grid = '<div class="p-4 grid grid-cols-1 sm:grid-cols-6 gap-3">' + g.fields.map(function (f) { return entryFieldHtml(f, g.auto); }).join('') + '</div>';
      body += g.optional
        ? '<details id="entry-sec-' + g.key + '" data-tor class="rounded-xl ring-1 ring-surface-container bg-surface-container-lowest scroll-mt-2"' + (box.__openTor ? ' open' : '') + '>' +
          '<summary class="flex items-start gap-3 px-4 py-3 cursor-pointer bg-surface-container-low/60 rounded-xl list-none">' + head + '<span class="material-symbols-outlined text-on-surface-variant mt-1">expand_more</span></summary>' + grid + '</details>'
        : '<section id="entry-sec-' + g.key + '" class="rounded-xl ring-1 ring-surface-container bg-surface-container-lowest scroll-mt-2">' +
          '<header class="flex items-start gap-3 px-4 py-3 border-b border-surface-container bg-surface-container-low/60 rounded-t-xl">' + head + '</header>' + grid + '</section>';
    });
    box.innerHTML = '<div class="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-5">' +
      '<nav class="hidden lg:flex flex-col gap-0.5 sticky top-0 self-start py-1" aria-label="หมวดของฟอร์ม">' + nav +
        '<p class="mt-3 px-3 font-body-sm text-body-sm text-on-surface-variant">ช่องที่มี <span class="text-error">*</span> จำเป็นต้องกรอก ช่องอื่นเว้นว่างแล้วมาแก้ไขภายหลังได้</p></nav>' +
      '<div class="flex flex-col gap-4 min-w-0">' +
        '<div class="flex items-start gap-3 p-3 rounded-xl bg-primary-fixed/40 text-on-surface font-body-sm text-body-sm"><span class="material-symbols-outlined text-primary">tips_and_updates</span>' +
        '<span>กรอกข้อมูลเท่าที่มีตอนนี้แล้วกด <b>บันทึก</b> ได้เลย — ช่องสีเทาระบบเติมให้เอง ข้อมูลชุดนี้ใช้พิมพ์เอกสารทุกฉบับของโครงการ</span></div>' +
        body + '</div></div>';
    box.__sig = data.fields.map(function (f) { return f.sig + f.label; }).join('|');
  }
  function updateCounts(box, data) {
    data.groups.forEach(function (g) {
      var el = box.querySelector('[data-count="' + g.key + '"]'); if (!el) return;
      var cnt = groupFilled(g);
      el.textContent = cnt[0] + '/' + cnt[1];
      el.className = 'font-label-sm text-label-sm ' + (cnt[0] ? 'text-emerald-700' : 'text-outline');
    });
  }

  // ---------- เลือกพิกัดจากแผนที่ ----------
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'assets/vendor/leaflet/leaflet.css'; document.head.appendChild(css);
      var js = document.createElement('script'); js.src = 'assets/vendor/leaflet/leaflet.js'; js.onload = resolve; js.onerror = function () { reject(new Error('โหลดแผนที่ไม่สำเร็จ')); };
      document.head.appendChild(js);
    });
  }
  function pickCoordinate(current) {
    return new Promise(function (resolve) {
      var m0 = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(current || '');
      var pos = m0 ? [+m0[1], +m0[2]] : null, chosen = null;
      var body = document.createElement('div');
      body.innerHTML = '<p class="mb-2 font-body-sm text-body-sm text-on-surface-variant">คลิกตำแหน่งโครงการบนแผนที่ (ลากหมุดเพื่อปรับได้) <b data-picked class="text-primary"></b></p>' +
        '<div class="relative isolate h-[60vh] rounded-lg overflow-hidden bg-surface-container"><div data-map class="absolute inset-0"></div></div>';
      var mm = ui.modal({
        title: 'เลือกพิกัดโครงการ', icon: 'map', size: 'lg', body: body,
        actions: [{ label: 'ยกเลิก', onClick: function (x) { x.close(); } },
          { label: 'ใช้พิกัดนี้', kind: 'primary', icon: 'check', onClick: function (x) { if (!chosen) return ui.toast('คลิกเลือกตำแหน่งบนแผนที่ก่อน', 'error'); resolve(chosen); x.close(); } }],
        onClose: function () { resolve(null); }
      });
      loadLeaflet().then(function () {
        var center = pos || (SK.tambon ? SK.tambon.center() : SK.ref.CENTER);
        var map = L.map(body.querySelector('[data-map]'), { scrollWheelZoom: false }).setView(center, pos ? 16 : 14);
        if (SK.tambon) SK.tambon.attach(map, { fit: !pos });
        var street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
        var sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '&copy; Esri' });
        sat.addTo(map);
        L.control.layers({ 'ภาพถ่ายดาวเทียม': sat, 'แผนที่ถนน': street }).addTo(map);
        var marker = null;
        function set(ll) {
          chosen = ll.lat.toFixed(6) + ', ' + ll.lng.toFixed(6);
          body.querySelector('[data-picked]').textContent = '• ' + chosen;
          if (!marker) marker = L.marker(ll, { draggable: true }).addTo(map).on('dragend', function (e) { set(e.target.getLatLng()); });
          else marker.setLatLng(ll);
        }
        if (pos) set(L.latLng(pos[0], pos[1]));
        map.on('click', function (e) { set(e.latlng); });
        setTimeout(function () { map.invalidateSize(); }, 150);
      }).catch(function (err) { ui.toast(err.message, 'error'); });
      return mm;
    });
  }

  function openEntry(project) {
    var doc = Object.assign({}, ENTRY, {
      title: project ? 'แก้ไขข้อมูลโครงการ' : 'ลงทะเบียนโครงการใหม่',
      open: project ? "openEntryGate('edit'," + Number(project.rowNumber) + ',' + JSON.stringify(project.name) + ')' : "openEntryGate('new')"
    });
    var box = document.createElement('div');
    box.innerHTML = '<div class="py-10 text-center text-on-surface-variant"><span class="material-symbols-outlined animate-spin">progress_activity</span><p>กำลังเตรียมแบบฟอร์ม...</p></div>';
    var data = null, saving = false;
    var m = ui.modal({
      title: doc.title, subtitle: project ? project.name : 'กองช่าง เทศบาลตำบลสีแก้ว • บันทึกลงฐานข้อมูลโครงการ (ชุดเดียวกับที่ใช้พิมพ์เอกสาร)', icon: project ? 'edit_note' : 'add_circle', size: 'xl', body: box,
      actions: [{ label: 'ยกเลิก', onClick: function (mm) { mm.close(); } }, { label: project ? 'บันทึกการแก้ไข' : 'ลงทะเบียนโครงการ', kind: 'primary', icon: 'save', onClick: save }],
      onClose: closeAll
    });
    load().then(function () {
      closeAll(); messages = [];
      run(doc.open);
      // โหมดแก้ไขโหลดข้อมูลเดิมจากฐานข้อมูลก่อน
      return waitFor(function () { var f = rootEl(doc); return f && visible(f) && (!project || (f.elements.projectName && f.elements.projectName.value)); }, 8000);
    }).then(function () {
      data = entryLayout(doc);
      // โครงการใหม่: เลือกปีงบประมาณปัจจุบันไว้ให้
      var fy = String(SK.currentFiscalYear()), yf = !project && data.fields.filter(function (f) { return f.name === 'budgetYear' && !f.value; })[0];
      if (yf && yf.options.some(function (o) { return o[0] === fy; })) { setField(yf.i, fy); data = entryLayout(doc); }
      renderEntry(box, data);
    }).catch(function (err) { box.innerHTML = '<div class="p-4 rounded-lg bg-error-container text-on-error-container">' + esc(err.message || err) + '</div>'; });

    function refreshFields() {
      setTimeout(function () {
        var n = entryLayout(doc);
        var sig = n.fields.map(function (f) { return f.sig + f.label; }).join('|');
        if (sig !== box.__sig) {
          // ช่องเพิ่ม/ลด (เช่น จำนวนผู้ควบคุมงาน/กรรมการ): วาดฟอร์มใหม่โดยคงตำแหน่งเลื่อน
          var body = m.body, top = body.scrollTop, tor = box.querySelector('details[data-tor]');
          box.__openTor = tor && tor.open;
          renderEntry(box, n);
          body.scrollTop = top;
        } else { syncValues(box, n); updateCounts(box, n); }
        data = n;
      }, 250);
    }
    box.addEventListener('change', function (e) {
      var el = e.target.closest('[data-i]'); if (!el) return;
      setField(+el.dataset.i, el.type === 'checkbox' ? el.checked : el.value);
      refreshFields();
    });
    box.addEventListener('click', function (e) {
      var go = e.target.closest('[data-goto]');
      if (go) { var sec = box.querySelector('#entry-sec-' + go.dataset.goto); if (sec) { if (sec.tagName === 'DETAILS') sec.open = true; sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
      var d = e.target.closest('[data-date-for]');
      if (d) {
        var target = box.querySelector('[data-i="' + d.dataset.dateFor + '"]');
        SK.thaiDate.open(target, { value: thaiToIso(target.value), onPick: function (iso) {
          target.value = isoToThai(iso); setField(+d.dataset.dateFor, target.value); refreshFields();
        } });
        return;
      }
      var c = e.target.closest('[data-clear]');
      if (c) {
        var t = box.querySelector('[data-i="' + c.dataset.clear + '"]');
        t.value = ''; setField(+c.dataset.clear, ''); refreshFields();
        return;
      }
      var p = e.target.closest('[data-pick-map]');
      if (p) {
        var inp = box.querySelector('[data-i="' + p.dataset.pickMap + '"]');
        pickCoordinate(inp.value).then(function (v) {
          if (!v) return;
          inp.value = v; setField(+p.dataset.pickMap, v); refreshFields();
        });
      }
    });
    function save() {
      if (!data || saving) return;
      box.querySelectorAll('[data-i]').forEach(function (el) { if (!el.readOnly) setField(+el.dataset.i, el.type === 'checkbox' ? el.checked : el.value); });
      var root = rootEl(doc);
      var invalid = Array.prototype.filter.call(root.elements, function (e) { return e.willValidate && !e.checkValidity(); });
      if (invalid.length) return ui.toast('กรุณากรอก: ' + invalid.map(labelOf).join(', '), 'error');
      messages = [];
      saving = true;
      var ev = new (W().SubmitEvent)('submit', { cancelable: true, submitter: root.querySelector('button[type=submit]') });
      Promise.resolve(W().submitProjectEntry(ev)).then(function () {
        return waitFor(function () { return !visible(root) || errors().length; }, 10000);
      }).then(function () {
        if (errors().length) { saving = false; return ui.toast(errors().join(' • '), 'error'); }
        ui.toast('บันทึกข้อมูลโครงการแล้ว', 'success');
        // ข้อมูลตัวอย่าง: นำแถวที่บันทึกในชีทกลับมาเป็นโครงการของเว็บ แล้วรอส่งขึ้นคลาวด์ก่อนโหลดหน้าใหม่
        return Promise.resolve(SK.afterEntrySave ? SK.afterEntrySave(project) : null).catch(function (err) { console.error(err); })
          .then(function () { return sleep(400); })
          .then(function () { return SK.cloud && SK.cloud.active ? SK.cloud.flush() : null; })
          .then(function () { m.close(); location.reload(); });
      });
    }
  }

  // เรียกฟังก์ชันฝั่งเซิร์ฟเวอร์ของระบบเดิมผ่านตัวสร้างเอกสาร (ข้อมูลชุดเดียวกับที่ฟอร์มเพิ่งบันทึก)
  function call(fn) {
    var args = Array.prototype.slice.call(arguments);
    return load().then(function (w) { return w.SKGas.call.apply(null, args); });
  }

  SK.docEngine = { DOCS: DOCS, load: load, openDocument: openDocument, openEntry: openEntry, call: call, reopen: reopen };
})();
