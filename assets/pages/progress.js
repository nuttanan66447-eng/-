// หน้าติดตามความก้าวหน้าโครงการ (progress.html?id=รหัสโครงการ)
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var projectId = params.get('id') || 'SK-67-002';
  var dateFilter = null, miniMap, miniMarker;

  function project() { return SK.db.project(projectId); }

  // งวดงาน: ใช้รายละเอียดที่บันทึกไว้ ถ้าไม่มีให้แบ่งงวดเท่า ๆ กันตามจำนวนงวด
  function milestones(p) {
    var saved = SK.db.data.milestones[p.id];
    if (saved) return saved;
    var n = Math.max(1, p.installments), base = Math.floor(100 / n), list = [];
    for (var i = 1; i <= n; i++) {
      var state = 'pending';
      if (p.status === 'completed' || i < p.installment) state = 'paid';
      else if (i === p.installment && p.status === 'pending-inspection') state = 'review';
      else if (i === p.installment && p.status !== 'signing') state = 'active';
      var passed = SK.db.data.inspections.filter(function (x) { return x.projectId === p.id && x.installment === i && x.result === 'pass'; })[0];
      list.push({
        pct: i === n ? 100 - base * (n - 1) : base,
        title: 'งานงวดที่ ' + i + (i === n ? ' (งวดสุดท้าย)' : '') + ' ตามรายการแนบท้ายสัญญา ' + p.contractNo,
        note: state === 'paid' ? (passed ? 'ตรวจรับเมื่อ ' + ui.dateLong(passed.date) : 'ตรวจรับและเบิกจ่ายแล้ว') : state === 'review' ? 'ผู้รับจ้างส่งงานแล้ว รอคณะกรรมการตรวจรับ' : state === 'active' ? 'อยู่ระหว่างดำเนินการ' : 'รอดำเนินการ',
        state: state
      });
    }
    return list;
  }

  function renderHero(p) {
    var days = Math.round((new Date(p.end) - new Date(p.start)) / 86400000);
    var diff = Math.round((p.actual - p.plan) * 10) / 10;
    var stateText = { 'on-schedule': 'กำลังดำเนินการ', delayed: 'ล่าช้ากว่าแผน', 'pending-inspection': 'รอตรวจรับพัสดุ', completed: 'ส่งมอบงานแล้ว', signing: 'ระหว่างลงนามสัญญา' }[p.status];
    var stateColor = p.status === 'delayed' ? 'text-error' : p.status === 'completed' ? 'text-emerald-700' : 'text-secondary';
    var sup = p.supervisor.match(/^(.*?)\s*\((.*)\)$/) || [0, p.supervisor, ''];
    $('hero').innerHTML =
      '<div class="flex flex-col lg:flex-row lg:items-start justify-between gap-space-lg"><div class="flex-1 min-w-0">' +
        '<div class="flex flex-wrap items-center gap-space-sm mb-space-xs">' +
          '<span class="px-space-sm py-space-2xs rounded-full bg-primary-container text-surface-bright font-label-sm text-label-sm tracking-wide">สัญญาจ้างเลขที่ ' + esc(p.contractNo) + '</span>' +
          '<span class="px-space-sm py-space-2xs rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">' + esc(ref.SOURCES[p.source]) + '</span>' +
          '<span class="px-space-sm py-space-2xs rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm flex items-center gap-space-2xs font-semibold"><span class="material-symbols-outlined text-space-sm">event</span>สิ้นสุดสัญญา ' + ui.dateShort(p.end) + '</span>' +
        '</div>' +
        '<h1 class="font-headline-lg text-headline-lg text-primary tracking-tight mb-space-sm font-bold">' + esc(p.name) + '</h1>' +
        '<p class="font-body-md text-body-md text-on-surface-variant max-w-4xl leading-relaxed">' + esc(ui.villageName(p.village)) + ' ต.สีแก้ว อ.เมืองร้อยเอ็ด — ' + esc(p.location) + '</p>' +
      '</div>' +
      '<div class="flex flex-col items-start lg:items-end shrink-0 gap-space-xs">' +
        '<div class="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container text-on-surface shadow-sm">' +
          '<span class="font-headline-sm text-headline-sm ' + stateColor + ' font-bold">' + stateText + '</span>' +
          '<span class="font-code-sm text-code-sm bg-primary text-on-primary px-space-xs py-space-2xs rounded">แผนงาน ' + p.plan + '%</span></div>' +
        '<span class="font-label-sm text-label-sm text-on-surface-variant">ความก้าวหน้าจริง: <strong class="text-primary font-bold">' + p.actual + '%</strong>' +
          (p.status === 'signing' || p.status === 'completed' ? '' : ' (' + (diff >= 0 ? 'เร็วกว่าแผน +' + diff : 'ช้ากว่าแผน ' + diff) + '%)') + '</span>' +
        '<button type="button" data-action="update-progress" class="font-label-sm text-label-sm text-primary font-semibold hover:underline flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">edit</span>ปรับปรุงผลงาน / สถานะ</button>' +
      '</div></div>' +
      '<div class="grid grid-cols-2 md:grid-cols-4 gap-space-base bg-surface-container-low/60 rounded-lg p-space-md">' +
        meta('วงเงินตามสัญญาจ้าง', money(p.budget) + ' <span class="text-body-sm font-normal text-on-surface-variant">บาท</span>', 'เบิกจ่ายแล้ว ' + money(p.disbursed) + ' บาท (' + (p.budget ? Math.round(p.disbursed / p.budget * 100) : 0) + '%)', 'headline-md text-primary font-bold', 'text-secondary font-code-sm text-code-sm') +
        meta('ระยะเวลาเริ่มต้น - สิ้นสุด', ui.dateShort(p.start) + ' – ' + ui.dateShort(p.end), 'รวมระยะเวลา ' + days + ' วันปฏิทิน') +
        meta('ผู้รับจ้าง', esc(p.contractor), 'เลข e-GP: ' + esc(p.egp || '-')) +
        meta('ผู้ควบคุมงานเทศบาล', esc(sup[1]), esc(sup[2]), null, 'text-primary font-medium font-label-sm text-label-sm') +
      '</div>';
    $('hero-spine').className = 'absolute left-0 top-0 bottom-0 w-1.5 ' + (p.status === 'delayed' ? 'bg-error' : p.status === 'completed' ? 'bg-emerald-600' : 'bg-secondary-container');
  }
  function meta(label, value, sub, valueCls, subCls) {
    return '<div class="flex flex-col min-w-0"><span class="font-label-sm text-label-sm text-on-surface-variant">' + label + '</span>' +
      '<span class="font-' + (valueCls || 'headline-sm text-headline-sm text-on-surface font-semibold') + (valueCls ? ' text-' + valueCls.split(' ')[0] : '') + '">' + value + '</span>' +
      '<span class="' + (subCls || 'font-label-sm text-label-sm text-on-surface-variant') + '">' + sub + '</span></div>';
  }

  function renderMilestones(p) {
    var ms = milestones(p);
    var paid = 0, active = 0;
    ms.forEach(function (m) { if (m.state === 'paid') paid += m.pct; else if (m.state === 'active' || m.state === 'review') active += m.pct; });
    var activeDone = Math.max(0, Math.min(active, p.actual - paid));
    $('ms-sub').textContent = 'การแบ่งงวดงาน ' + ms.length + ' งวด รวม ' + money(p.budget) + ' บาท ตามสัญญาจ้าง';
    $('ms-current').textContent = p.status === 'signing' ? 'ยังไม่เริ่มสัญญา' : p.status === 'completed' ? 'ครบทุกงวด' : 'งวดปัจจุบัน: งวดที่ ' + p.installment;
    $('ms-meter').innerHTML = '<div class="bg-primary h-full" style="width:' + paid + '%" title="งวดที่ส่งมอบแล้ว ' + paid + '%"></div>' +
      '<div class="bg-secondary-container h-full" style="width:' + activeDone + '%" title="งวดปัจจุบัน"></div>';
    $('ms-list').innerHTML = ms.map(function (m, i) {
      var amount = money(p.budget * m.pct / 100);
      var head = 'งวดที่ ' + (i + 1) + (i === ms.length - 1 && ms.length > 1 ? ' งวดสุดท้าย' : '') + ' (' + m.pct + '% - ' + amount + ' บ.)';
      if (m.state === 'paid') {
        return msCard('bg-surface-container-low/40 hover:bg-surface-container-low', '<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0"><span class="material-symbols-outlined text-space-base">check</span></div>',
          head, '<span class="px-space-xs py-space-2xs bg-surface-container text-primary rounded font-label-sm text-label-sm">ส่งมอบแล้ว</span>', m,
          '<span class="px-space-sm py-space-2xs rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">100% เบิกจ่ายแล้ว</span><span class="font-code-sm text-code-sm text-on-surface-variant">อนุมัติเรียบร้อย</span>');
      }
      if (m.state === 'active' || m.state === 'review') {
        var inStage = m.pct ? Math.round(activeDone / m.pct * 100) : 0;
        return msCard('bg-surface-container-high/40 relative overflow-hidden', '<div class="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-primary shrink-0"><span class="material-symbols-outlined text-space-base">' + (m.state === 'review' ? 'fact_check' : 'engineering') + '</span></div>',
          head, '<span class="px-space-xs py-space-2xs bg-secondary-container text-on-primary rounded font-label-sm text-label-sm font-bold">' + (m.state === 'review' ? 'รอตรวจรับ' : 'กำลังดำเนินการ') + '</span>', m,
          '<span class="px-space-sm py-space-2xs rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">ดำเนินงานแล้ว ' + inStage + '%</span>' +
          '<button type="button" data-action="inspect-record" data-project="' + p.id + '" class="font-label-sm text-label-sm text-secondary font-bold hover:underline">บันทึกผลตรวจรับงวดนี้ →</button>', true);
      }
      return msCard('bg-surface-container-low/20 opacity-70', '<div class="w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center text-on-surface-variant shrink-0 font-label-md text-label-md">' + (i + 1) + '</div>',
        head, '<span class="px-space-xs py-space-2xs bg-surface-dim text-on-surface-variant rounded font-label-sm text-label-sm">รอดำเนินการ</span>', m,
        '<span class="px-space-sm py-space-2xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">0% รอดำเนินการ</span>');
    }).join('');
  }
  function msCard(cls, badge, head, chip, m, right, accent) {
    return '<div class="p-space-md rounded-lg ' + cls + ' flex flex-col md:flex-row md:items-center justify-between gap-space-md transition-colors">' +
      (accent ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-secondary-container"></div>' : '') +
      '<div class="flex items-start gap-space-md">' + badge + '<div class="flex flex-col"><div class="flex flex-wrap items-center gap-space-xs"><span class="font-headline-sm text-headline-sm text-primary font-bold">' + head + '</span>' + chip + '</div>' +
      '<p class="font-body-md text-body-md text-on-surface">' + esc(m.title) + '</p><span class="font-label-sm text-label-sm text-on-surface-variant">' + esc(m.note) + '</span></div></div>' +
      '<div class="flex items-center justify-between md:flex-col md:items-end gap-space-xs shrink-0 pl-11 md:pl-0">' + right + '</div></div>';
  }

  function diaryEntries() {
    return SK.flows.sortedDiary(projectId).filter(function (e) {
      return !dateFilter || (e.date >= dateFilter.from && e.date <= dateFilter.to);
    });
  }
  function renderDiary() {
    var list = diaryEntries();
    $('diary-filter-label').textContent = dateFilter ? ui.dateShort(dateFilter.from) + ' – ' + ui.dateShort(dateFilter.to) + ' ✕' : 'กรองตามวันที่';
    $('diary-list').innerHTML = list.map(function (e, idx) {
      var photos = e.photos || [];
      var head = '<div class="flex flex-wrap items-center justify-between gap-space-sm"><div class="flex flex-wrap items-center gap-space-sm">' +
        '<span class="w-3 h-3 rounded-full ' + (idx === 0 ? 'bg-secondary-container' : 'bg-primary') + '"></span>' +
        '<span class="font-headline-sm text-headline-sm text-primary font-bold">บันทึกตรวจหน้างาน: ' + ui.dateFull(e.date) + '</span>' +
        '<span class="px-space-xs py-space-2xs rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">' + esc(e.time || '') + ' น. • งวดที่ ' + esc(e.installment) + '</span></div>' +
        '<div class="flex flex-wrap items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm"><span class="flex items-center gap-space-2xs"><span class="material-symbols-outlined text-space-md text-secondary">partly_cloudy_day</span>' + esc(e.weather) + '</span>' +
        '<span class="flex items-center gap-space-2xs font-code-sm text-code-sm bg-surface-container-lowest px-space-xs py-space-2xs rounded shadow-sm"><span class="material-symbols-outlined text-space-sm text-primary">pin_drop</span>' + esc(e.coords || '-') + '</span></div></div>';
      var body = '<p class="font-headline-sm text-headline-sm text-on-surface font-semibold">' + esc(e.title) + '</p><p class="font-body-md text-body-md text-on-surface-variant">' + esc(e.detail) + '</p>';
      var gallery = photos.length ? '<div class="grid grid-cols-1 sm:grid-cols-3 gap-space-md">' + photos.map(function (ph, i) {
        return '<a href="' + esc(ph.src) + '" target="_blank" rel="noopener" class="flex flex-col rounded-lg overflow-hidden shadow-sm bg-surface-container-lowest group"><div class="relative h-44 overflow-hidden">' +
          '<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="' + esc(ph.caption) + '" src="' + esc(ph.src) + '"/>' +
          '<span class="absolute top-2 left-2 px-space-xs py-space-2xs rounded ' + ['bg-primary/90', 'bg-secondary/90', 'bg-primary-container'][i % 3] + ' text-on-primary font-label-sm text-label-sm">' + esc(ph.caption) + '</span>' +
          '<span class="absolute bottom-2 right-2 px-space-xs py-space-2xs rounded bg-inverse-surface/80 text-inverse-on-surface font-code-sm text-code-sm">' + ui.dateShort(e.date) + ' ' + esc(ph.time || e.time || '') + ' น.</span></div></a>';
      }).join('') + '</div>' : '';
      var tests = e.tests && e.tests.length ? '<div class="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">' +
        '<div class="flex items-center gap-space-md"><div class="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-space-xl">verified</span></div>' +
        '<div><span class="font-headline-sm text-headline-sm text-primary font-bold">ผลทดสอบวัสดุจากห้องปฏิบัติการ</span><p class="font-body-sm text-body-sm text-on-surface-variant">ผ่านเกณฑ์ ' + e.tests.length + ' รายการ</p></div></div>' +
        '<div class="flex flex-wrap items-center gap-space-sm">' + e.tests.map(function (t) {
          return '<div class="px-space-md py-space-xs bg-surface-container rounded-lg flex flex-col items-center"><span class="font-label-sm text-label-sm text-on-surface-variant">' + esc(t.name) + '</span><span class="font-headline-sm text-headline-sm text-primary font-bold">' + esc(t.value) + ' <span class="text-secondary text-body-sm font-semibold">(' + esc(t.spec) + ')</span></span></div>';
        }).join('') + '<button type="button" data-action="test-results" data-entry="' + e.id + '" class="p-space-xs text-primary hover:bg-surface-container-high rounded transition-colors" title="ดูผลการทดสอบฉบับเต็ม" aria-label="ดูผลการทดสอบฉบับเต็ม"><span class="material-symbols-outlined">launch</span></button></div></div>' : '';
      var foot = '<div class="flex flex-wrap items-center justify-between gap-2 pt-space-xs border-t border-surface-dim/40 text-on-surface-variant font-label-sm text-label-sm"><span>ผู้รายงานผล: ' + esc(e.reporter) + '</span>' +
        (e.custom ? '<button type="button" data-action="delete-diary" data-entry="' + e.id + '" class="text-error hover:underline">ลบบันทึก</button>' : '') + '</div>';
      return '<div class="flex flex-col gap-space-md p-space-md rounded-xl ' + (idx === 0 ? 'bg-surface-container-low/30' : 'bg-surface-container-low/20') + '">' + head + body + gallery + tests + foot + '</div>';
    }).join('') || '<div class="p-space-lg rounded-xl bg-surface-container-low/30 text-center text-on-surface-variant">' + (dateFilter ? 'ไม่มีบันทึกในช่วงวันที่ที่เลือก' : 'ยังไม่มีบันทึกตรวจหน้างาน — กดปุ่ม "+ บันทึกตรวจหน้างานประจำวัน" เพื่อเริ่มบันทึก') + '</div>';
  }

  function projectDocs() {
    return SK.db.data.documents.filter(function (d) { return d.projectId === projectId; });
  }
  function renderAttachments() {
    var docs = projectDocs();
    $('att-count').textContent = docs.length + ' ฉบับ';
    $('att-list').innerHTML = docs.map(function (d, i) {
      var icon = SK.flows.FORMAT_ICON[d.format] || 'draft';
      var st = SK.flows.DOC_STATUS[d.status] || SK.flows.DOC_STATUS.approved;
      return '<button type="button" data-action="open-doc" data-index="' + i + '" class="w-full text-left p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container-high/60 transition-all flex items-center justify-between gap-2 group">' +
        '<div class="flex items-center gap-space-sm min-w-0"><span class="material-symbols-outlined ' + (i % 2 ? 'text-primary' : 'text-secondary') + ' text-space-xl shrink-0">' + icon + '</span>' +
        '<div class="flex flex-col min-w-0"><span class="font-body-md text-body-md text-on-surface font-semibold truncate group-hover:text-primary">' + esc(d.fileName || d.title) + '</span>' +
        '<span class="font-label-sm text-label-sm text-on-surface-variant truncate">' + st[0] + ' • ' + (d.fileId ? SK.flows.fileSize(d.fileSize) : 'ยังไม่มีไฟล์ต้นฉบับ') + '</span></div></div>' +
        '<span class="material-symbols-outlined text-outline group-hover:text-primary transition-colors">' + (d.fileId ? 'download' : 'visibility') + '</span></button>';
    }).join('') || '<p class="text-on-surface-variant font-body-sm text-body-sm">ยังไม่มีเอกสารแนบ</p>';
  }

  function renderMap(p) {
    $('gps-chip').textContent = 'GPS: ' + p.lat.toFixed(4) + '° N, ' + p.lng.toFixed(4) + '° E';
    $('map-village').textContent = ui.villageName(p.village);
    $('map-label').textContent = p.name;
    $('maps-link').href = 'https://www.google.com/maps?q=' + p.lat + ',' + p.lng;
    $('map-note').textContent = 'ที่ตั้ง: ' + ui.villageName(p.village) + ' ต.สีแก้ว — ' + p.location;
    if (!window.L) return;
    if (!miniMap) {
      miniMap = L.map('mini-map', { zoomControl: false, attributionControl: false, scrollWheelZoom: false }).setView([p.lat, p.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(miniMap);
      miniMarker = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12], html: '<div class="w-6 h-6 rounded-full bg-secondary-container ring-4 ring-white shadow-lg"></div>' }) }).addTo(miniMap);
    } else {
      miniMap.setView([p.lat, p.lng], 15);
      miniMarker.setLatLng([p.lat, p.lng]);
    }
  }

  function renderSwitcher(p) {
    $('bc-contract').textContent = 'รหัสสัญญา ' + p.contractNo;
    $('project-switch').innerHTML = ui.projectOptions().map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === p.id ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
    document.title = p.id + ' ติดตามความก้าวหน้า | กองช่าง เทศบาลตำบลสีแก้ว';
  }

  function refresh() {
    var p = project();
    if (!p) {
      $('hero').innerHTML = '<div class="py-8 text-center"><p class="font-headline-md text-headline-md text-primary">ไม่พบโครงการ ' + esc(projectId) + '</p><a class="text-primary underline" href="projects.html">กลับไปทะเบียนโครงการ</a></div>';
      return;
    }
    renderSwitcher(p); renderHero(p); renderMilestones(p); renderDiary(); renderAttachments(); renderMap(p);
  }

  function newDiary() {
    var p = project();
    var inst = [];
    for (var i = 1; i <= p.installments; i++) inst.push([i, 'งวดที่ ' + i]);
    ui.formModal({
      title: '+ บันทึกตรวจหน้างานประจำวัน', subtitle: 'รหัสสัญญา: ' + p.contractNo + ' • ' + p.name, icon: 'add_photo_alternate', iconClass: 'bg-secondary-fixed text-secondary',
      size: 'lg', submitLabel: 'บันทึกรายงานตรวจงาน', submitKind: 'accent',
      fields: [
        { name: 'date', label: 'วันที่ตรวจหน้างาน', type: 'date', value: ui.today(), required: true },
        { name: 'time', label: 'เวลา', type: 'time', value: ui.nowTime(), required: true },
        { name: 'weather', label: 'สภาพอากาศ', type: 'select', options: ['แดดจัด ท้องฟ้าโปร่ง (ไม่มีฝน)', 'มีเมฆเป็นส่วนมาก', 'ฝนตกเล็กน้อย (ไม่กระทบการเทคอนกรีต)', 'ฝนตกหนัก (หยุดปฏิบัติงานชั่วคราว)'] },
        { name: 'installment', label: 'ประจำงวดงานที่', type: 'select', options: inst, value: Math.max(1, p.installment) },
        { name: 'coords', label: 'พิกัดจุดตรวจ (กม./ละติจูด, ลองจิจูด)', value: p.lat + ', ' + p.lng, help: 'กดปุ่ม "ใช้ตำแหน่งปัจจุบัน" เพื่อดึงพิกัด GPS ของอุปกรณ์' },
        { name: 'reporter', label: 'ผู้รายงาน', type: 'select', options: ref.STAFF, value: p.supervisor },
        { name: 'title', label: 'หัวข้อการตรวจ', required: true, span: 2, placeholder: 'เช่น ตรวจการเทคอนกรีตช่วง กม. 0+850 ถึง 1+100' },
        { name: 'detail', label: 'รายละเอียดการปฏิบัติงานและข้อสั่งการช่าง', type: 'textarea', span: 2, required: true, placeholder: 'ระบุการปฏิบัติงานของผู้รับจ้าง ผลการควบคุมงาน หรือข้อบกพร่องที่ต้องแก้ไข...' },
        { name: 'actual', label: 'ผลงานสะสม ณ วันนี้ (%) — เว้นว่างได้', type: 'number', min: 0, max: 100, step: '0.1', placeholder: String(p.actual) },
        { name: 'photos', label: 'ภาพถ่ายภาคสนาม (สูงสุด 4 รูป)', type: 'file', accept: 'image/*', multiple: true }
      ],
      extraActions: [{ label: 'ใช้ตำแหน่งปัจจุบัน', icon: 'my_location', onClick: function (m) {
        if (!navigator.geolocation) return ui.toast('อุปกรณ์นี้ไม่รองรับ GPS', 'error');
        navigator.geolocation.getCurrentPosition(function (pos) {
          m.el.querySelector('[name=coords]').value = pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6);
          ui.toast('ได้พิกัดปัจจุบันแล้ว', 'success');
        }, function () { ui.toast('ไม่สามารถอ่านตำแหน่งได้ (ต้องอนุญาตการเข้าถึงตำแหน่ง)', 'error'); }, { enableHighAccuracy: true, timeout: 10000 });
      } }],
      onSubmit: function (v) {
        var files = Array.prototype.slice.call(v.photos || []).slice(0, 4);
        return Promise.all(files.map(function (f) { return ui.resizeImage(f, 800); })).then(function (srcs) {
          var entry = {
            id: 'D-' + Date.now().toString(36), projectId: p.id, date: v.date, time: v.time, weather: v.weather, installment: Number(v.installment),
            coords: v.coords, reporter: v.reporter, title: v.title, detail: v.detail, custom: true,
            photos: srcs.map(function (s, i) { return { src: s, caption: 'ภาพที่ ' + (i + 1), time: v.time }; })
          };
          var d = SK.db.data;
          d.diary.push(entry);
          var prevActual = p.actual;
          if (v.actual != null) p.actual = Math.min(100, Math.max(0, v.actual));
          if (!SK.db.save()) {
            d.diary.pop(); p.actual = prevActual;
            ui.toast('พื้นที่เก็บข้อมูลเต็ม ลองลดจำนวนรูปหรือสำรองข้อมูลแล้วลบบันทึกเก่า', 'error');
            return true;
          }
          dateFilter = null;
          ui.toast('บันทึกตรวจหน้างานเรียบร้อย' + (srcs.length ? ' พร้อมภาพ ' + srcs.length + ' รูป' : ''), 'success');
          refresh();
        }).catch(function () { ui.toast('อ่านไฟล์รูปไม่สำเร็จ', 'error'); return true; });
      }
    });
  }

  Object.assign(SK.actions, {
    'sync': function () { refresh(); ui.toast('อัปเดตข้อมูลล่าสุดแล้ว เวลา ' + ui.nowTime() + ' น.', 'success'); },
    'new-diary': newDiary,
    'print-control': function () { var p = project(); SK.docs.print('supervisorReport', 'บันทึกควบคุมงาน ' + p.id, p, diaryEntries()); },
    'exec-summary': function () { var p = project(); SK.docs.print('execSummary', 'รายงานผู้บริหาร ' + p.id, p, milestones(p), SK.flows.sortedDiary(p.id)); },
    'inspection-history': function () {
      var p = project();
      var rows = SK.db.data.inspections.filter(function (x) { return x.projectId === p.id; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
      ui.modal({
        title: 'ประวัติการตรวจรับงาน', subtitle: p.id + ' • ' + p.name, icon: 'history_edu', size: 'md',
        body: rows.length ? '<ol class="relative border-l-2 border-surface-container ml-2">' + rows.map(function (r) {
          return '<li class="ml-4 mb-4"><span class="absolute -left-[7px] w-3 h-3 rounded-full ' + (r.result === 'pass' ? 'bg-primary' : 'bg-error') + '"></span>' +
            '<div class="font-label-md text-label-md">งวดที่ ' + r.installment + ' • ' + ui.dateLong(r.date) + '</div>' +
            '<div class="' + (r.result === 'pass' ? 'text-primary' : 'text-error') + ' font-semibold">' + (r.result === 'pass' ? 'ตรวจรับถูกต้องครบถ้วน' : 'ให้ผู้รับจ้างแก้ไข') + '</div>' +
            '<div class="font-body-sm text-body-sm text-on-surface-variant">' + esc(r.note || '') + (r.committee ? ' — ประธาน: ' + esc(r.committee) : '') + '</div></li>';
        }).join('') + '</ol>' : '<p class="text-on-surface-variant">ยังไม่มีการตรวจรับงานของโครงการนี้</p>',
        actions: [{ label: 'บันทึกผลตรวจรับใหม่', kind: 'accent', icon: 'fact_check', onClick: function (m) { m.close(); SK.flows.inspection(p.id, refresh); } }]
      });
    },
    'update-progress': function () { ui.openProjectForm(project(), function (p) { if (!p) location.href = 'projects.html'; else refresh(); }); },
    'diary-filter': function () {
      if (dateFilter) { dateFilter = null; renderDiary(); return; }
      ui.formModal({
        title: 'กรองบันทึกตามช่วงวันที่', icon: 'filter_alt', size: 'sm', submitLabel: 'กรองข้อมูล', submitIcon: 'filter_alt',
        fields: [{ name: 'from', label: 'ตั้งแต่วันที่', type: 'date', required: true, value: project().start }, { name: 'to', label: 'ถึงวันที่', type: 'date', required: true, value: ui.today() }],
        onSubmit: function (v) {
          if (v.to < v.from) { ui.toast('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม', 'error'); return true; }
          dateFilter = v; renderDiary();
        }
      });
    },
    'diary-pdf': function () { var p = project(); SK.docs.print('supervisorReport', 'บันทึกหน้างาน ' + p.id, p, diaryEntries()); },
    'test-results': function (el) {
      var e = SK.db.data.diary.filter(function (x) { return x.id === el.dataset.entry; })[0];
      var html = '<table class="w-full"><thead><tr class="text-left text-on-surface-variant"><th class="py-1">รายการทดสอบ</th><th>ผลทดสอบ</th><th>เกณฑ์</th><th>ผล</th></tr></thead><tbody>' +
        e.tests.map(function (t) { return '<tr class="border-t border-surface-container"><td class="py-2">' + esc(t.name) + '</td><td class="font-bold text-primary">' + esc(t.value) + '</td><td>' + esc(t.spec) + '</td><td class="text-emerald-700 font-semibold">ผ่าน</td></tr>'; }).join('') +
        '</tbody></table><p class="mt-3 font-body-sm text-body-sm text-on-surface-variant">วันที่ทดสอบ ' + ui.dateLong(e.date) + ' • ' + esc(e.title) + '</p>';
      ui.modal({ title: 'ผลทดสอบวัสดุ (Certified Test Results)', subtitle: project().name, icon: 'verified', body: html,
        actions: [{ label: 'พิมพ์ผลทดสอบ', icon: 'print', kind: 'primary', onClick: function () {
          ui.printDoc('ผลทดสอบวัสดุ', '<h1>รายงานผลทดสอบวัสดุ</h1><p>' + esc(project().name) + '<br>วันที่ ' + ui.dateLong(e.date) + '</p><table><tr><th>รายการ</th><th>ผล</th><th>เกณฑ์</th></tr>' +
            e.tests.map(function (t) { return '<tr><td>' + esc(t.name) + '</td><td>' + esc(t.value) + '</td><td>' + esc(t.spec) + '</td></tr>'; }).join('') + '</table>');
        } }] });
    },
    'delete-diary': function (el) {
      ui.confirm('ลบบันทึกหน้างานนี้?', 'ลบบันทึก', 'danger').then(function (ok) {
        if (!ok) return;
        SK.db.data.diary = SK.db.data.diary.filter(function (x) { return x.id !== el.dataset.entry; });
        SK.db.save(); renderDiary(); ui.toast('ลบบันทึกแล้ว', 'success');
      });
    },
    'notify-committee': function () {
      var p = project();
      ui.formModal({
        title: 'ส่งหนังสือแจ้งนัดตรวจงานคณะกรรมการ', subtitle: p.name, icon: 'mail', submitLabel: 'ออกหนังสือและพิมพ์', submitIcon: 'print',
        fields: [
          { name: 'installment', label: 'งวดงานที่ตรวจรับ', type: 'number', min: 1, max: p.installments, value: Math.max(1, p.installment) },
          { name: 'date', label: 'วันที่นัดตรวจ', type: 'date', value: ui.today(), required: true },
          { name: 'time', label: 'เวลา', type: 'time', value: '09:30', required: true },
          { name: 'place', label: 'สถานที่นัดพบ', value: 'หน้างาน ' + ui.villageName(p.village) + ' ต.สีแก้ว', required: true },
          { name: 'note', label: 'หมายเหตุ', type: 'textarea', span: 2, placeholder: 'เช่น ให้ผู้รับจ้างเตรียมผลทดสอบวัสดุและเครื่องมือวัด' }
        ],
        onSubmit: function (v) {
          SK.db.data.notifications.unshift({ id: 'N' + Date.now(), icon: 'event', tone: 'primary', title: 'นัดตรวจรับงานงวดที่ ' + v.installment + ' ' + p.id, text: ui.dateLong(v.date) + ' เวลา ' + v.time + ' น. ณ ' + v.place, href: 'progress.html?id=' + p.id, read: false });
          SK.flows.addDocument({ id: 'นัดตรวจ-' + p.id.slice(-3) + '/' + v.installment, type: 'order', title: 'หนังสือแจ้งนัดตรวจรับงานงวดที่ ' + v.installment + ' ' + p.name, detail: ui.dateLong(v.date) + ' ' + v.time + ' น. ณ ' + v.place, projectId: p.id, format: 'doc' });
          SK.db.save(); ui.refreshBell(); renderAttachments();
          SK.docs.print('inspectionNotice', 'หนังสือแจ้งนัดตรวจงาน ' + p.id, p, v);
        }
      });
    },
    'open-doc': function (el) { SK.flows.openDocument(projectDocs()[Number(el.dataset.index)], renderAttachments); },
    'attach-file': function () { SK.flows.uploadNew({ projectId: projectId, type: 'order' }, renderAttachments); }
  });

  SK.page = { refresh: refresh };
  ui.onReady(function () {
    $('project-switch').addEventListener('change', function () { location.href = 'progress.html?id=' + encodeURIComponent(this.value); });
    refresh();
    if (params.get('new') === 'diary' && project()) newDiary();
  });
})();
