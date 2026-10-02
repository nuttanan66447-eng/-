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
      frame.style.cssText = 'position:fixed;left:-12000px;top:0;width:1280px;height:900px;border:0;opacity:0;pointer-events:none';
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
          return waitFor(function () { return run('Array.isArray(allRows) && allRows.length > 0 ? allRows.length : 0'); }, 15000).then(function () { resolve(w); });
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

  function openDocument(doc, project) {
    var formBox = document.createElement('div');
    formBox.innerHTML = '<div class="py-10 text-center text-on-surface-variant"><span class="material-symbols-outlined animate-spin">progress_activity</span><p>กำลังเตรียมแบบฟอร์ม...</p></div>';
    var m = ui.modal({
      title: doc.title, subtitle: project ? project.name : doc.desc, icon: doc.icon, size: 'lg', body: formBox,
      actions: [
        { label: 'ยกเลิก', onClick: function (mm) { mm.close(); } },
        { label: 'สร้างเอกสาร', kind: 'primary', icon: 'description', onClick: function () { build(); } }
      ],
      onClose: closeAll
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

    openDoc(doc, project ? project.rowNumber : null).then(function (d) {
      data = d;
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
      var btn = m.el.querySelector('.sk-modal-actions button:last-child');
      var old = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>กำลังสร้างเอกสาร...</span>';
      // ส่งค่าล่าสุดทุกช่องก่อนสร้าง
      formBox.querySelectorAll('[data-i]').forEach(function (el) {
        if (el.type !== 'file') setField(+el.dataset.i, el.type === 'checkbox' ? el.checked : el.value);
      });
      generate(doc).then(function (html) {
        showPreview(doc, project, html);
      }).catch(function (err) {
        ui.toast(err.message || String(err), 'error');
        refresh();
      }).then(function () {
        busy = false; btn.disabled = false; btn.innerHTML = old;
      });
    }
  }

  function showPreview(doc, project, html) {
    // ปิดการสั่งพิมพ์อัตโนมัติของหน้าเอกสาร แล้วให้ปุ่มของเราเป็นผู้สั่งพิมพ์
    var guard = '<script>window.__skPrint=window.print;window.print=function(){};window.close=function(){};<\/script>';
    var doc2 = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (h) { return h + guard; }) : guard + html;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="rounded-lg bg-surface-container overflow-hidden"><iframe title="พรีวิวเอกสาร" class="w-full bg-white" style="height:70vh;border:0"></iframe></div>';
    var iframe = wrap.querySelector('iframe');
    var word = wordButton(doc);
    ui.modal({
      title: 'พรีวิว: ' + doc.title, subtitle: project ? project.name : '', icon: 'preview', size: 'lg', body: wrap,
      actions: [{ label: 'กลับไปแก้ไข', icon: 'edit', onClick: function (m) { m.close(); } }]
        .concat(word ? [{ label: 'บันทึกเป็น Word', icon: 'download', onClick: function () { var b = wordButton(doc); if (b) { b.click(); ui.toast('กำลังดาวน์โหลดไฟล์ Word', 'success'); } } }] : [])
        .concat([{ label: 'พิมพ์ / บันทึกเป็น PDF', kind: 'primary', icon: 'print', onClick: function () {
          var w = iframe.contentWindow;
          w.focus();
          (w.__skPrint || w.print).call(w);
        } }])
    });
    iframe.srcdoc = doc2;
  }

  // ---------- เพิ่ม/แก้ไขโครงการด้วยฟอร์มเดิม ----------
  function openEntry(project) {
    var doc = Object.assign({}, ENTRY, {
      title: project ? 'แก้ไขข้อมูลโครงการ' : 'สร้างโครงการใหม่',
      open: project ? "openEntryGate('edit'," + Number(project.rowNumber) + ',' + JSON.stringify(project.name) + ')' : "openEntryGate('new')"
    });
    var box = document.createElement('div');
    box.innerHTML = '<div class="py-10 text-center text-on-surface-variant"><span class="material-symbols-outlined animate-spin">progress_activity</span><p>กำลังเตรียมแบบฟอร์ม...</p></div>';
    var data = null;
    var m = ui.modal({
      title: doc.title, subtitle: project ? project.name : 'บันทึกลงฐานข้อมูลโครงการ (ชุดเดียวกับที่ใช้พิมพ์เอกสาร)', icon: doc.icon, size: 'lg', body: box,
      actions: [{ label: 'ยกเลิก', onClick: function (mm) { mm.close(); } }, { label: 'บันทึกโครงการ', kind: 'primary', icon: 'save', onClick: save }],
      onClose: closeAll
    });
    load().then(function () {
      closeAll(); messages = [];
      run(doc.open);
      // โหมดแก้ไขโหลดข้อมูลเดิมจากฐานข้อมูลก่อน
      return waitFor(function () { var f = rootEl(doc); return f && visible(f) && (!project || (f.elements.projectName && f.elements.projectName.value)); }, 8000);
    }).then(function () {
      data = collect(doc);
      renderForm(box, data);
    }).catch(function (err) { box.innerHTML = '<div class="p-4 rounded-lg bg-error-container text-on-error-container">' + esc(err.message || err) + '</div>'; });
    box.addEventListener('change', function (e) {
      var el = e.target.closest('[data-i]'); if (!el) return;
      setField(+el.dataset.i, el.type === 'checkbox' ? el.checked : el.value);
      setTimeout(function () { var n = collect(doc); syncValues(box, n); data = n; }, 250);
    });
    function save() {
      if (!data) return;
      box.querySelectorAll('[data-i]').forEach(function (el) { setField(+el.dataset.i, el.type === 'checkbox' ? el.checked : el.value); });
      var root = rootEl(doc);
      var invalid = Array.prototype.filter.call(root.elements, function (e) { return e.willValidate && !e.checkValidity(); });
      if (invalid.length) return ui.toast('กรุณากรอก: ' + invalid.map(labelOf).join(', '), 'error');
      messages = [];
      var ev = new (W().SubmitEvent)('submit', { cancelable: true, submitter: root.querySelector('button[type=submit]') });
      Promise.resolve(W().submitProjectEntry(ev)).then(function () {
        return waitFor(function () { return !visible(root) || errors().length; }, 10000);
      }).then(function () {
        if (errors().length) return ui.toast(errors().join(' • '), 'error');
        m.close();
        ui.toast('บันทึกข้อมูลโครงการแล้ว', 'success');
        setTimeout(function () { location.reload(); }, 600);
      });
    }
  }

  SK.docEngine = { DOCS: DOCS, load: load, openDocument: openDocument, openEntry: openEntry };
})();
