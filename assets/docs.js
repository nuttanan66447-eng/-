// แม่แบบเอกสารราชการสำหรับพิมพ์ / บันทึกเป็น PDF
(function () {
  'use strict';
  // ผู้อำนวยการกองช่างจากรายชื่อบุคลากรจริง (assets/personnel.js)
  function DIRECTOR() {
    var P = window.SK_PERSONNEL || {}, hit = null;
    Object.keys(P).forEach(function (k) {
      if (!hit && Array.isArray(P[k])) hit = P[k].filter(function (x) { return x && x.position === 'ผู้อำนวยการกองช่าง'; })[0];
    });
    return hit ? hit.name : '(ผู้อำนวยการกองช่าง)';
  }
  var SK = window.SK, ui = SK.ui, ref = SK.ref, esc = ui.esc, money = ui.money;

  function memo(o) {
    return '<h1>บันทึกข้อความ</h1>' +
      '<div><strong>ส่วนราชการ</strong> กองช่าง เทศบาลตำบลสีแก้ว อำเภอเมืองร้อยเอ็ด จังหวัดร้อยเอ็ด</div>' +
      '<div class="meta"><span><strong>ที่</strong> ' + esc(o.no || 'รอ.๕๕๓๐๑/') + '</span><span><strong>วันที่</strong> ' + ui.dateLong(o.date || ui.today()) + '</span></div>' +
      '<div><strong>เรื่อง</strong> ' + esc(o.subject) + '</div>' +
      '<div style="margin-top:8px"><strong>เรียน</strong> ' + esc(o.to) + '</div>' + o.body + signBlock(o.signers || [[DIRECTOR(), 'ผู้อำนวยการกองช่าง']]);
  }
  function letter(o) {
    return '<div class="meta"><span>ที่ ' + esc(o.no || 'รอ ๕๕๓๐๑/') + '</span><span class="right">สำนักงานเทศบาลตำบลสีแก้ว<br>อำเภอเมืองร้อยเอ็ด จังหวัดร้อยเอ็ด</span></div>' +
      '<p class="center">' + ui.dateLong(o.date || ui.today()) + '</p>' +
      '<div><strong>เรื่อง</strong> ' + esc(o.subject) + '</div><div><strong>เรียน</strong> ' + esc(o.to) + '</div>' +
      (o.ref ? '<div><strong>อ้างถึง</strong> ' + esc(o.ref) + '</div>' : '') + o.body +
      '<div style="margin-top:32px;margin-left:50%;text-align:center">ขอแสดงความนับถือ<div style="height:48px"></div>(นายกเทศมนตรีตำบลสีแก้ว)<br>นายกเทศมนตรีตำบลสีแก้ว</div>' +
      '<p class="muted" style="margin-top:32px">กองช่าง โทร. ๐-๔๓๕๑-xxxx</p>';
  }
  function signBlock(list) {
    return '<div class="sign">' + list.map(function (s) {
      return '<div>(ลงชื่อ)................................................<br>(' + esc(s[0]) + ')<br>' + esc(s[1]) + (s[2] ? '<br><span class="muted">' + esc(s[2]) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function projectTable(p) {
    return '<table><tr><th style="width:30%">โครงการ</th><td>' + esc(p.name) + '</td></tr>' +
      '<tr><th>รหัส / เลขที่สัญญา</th><td>' + esc(p.id) + ' / ' + esc(p.contractNo) + ' (e-GP ' + esc(p.egp || '-') + ')</td></tr>' +
      '<tr><th>สถานที่</th><td>' + esc(ui.villageName(p.village)) + ' ต.สีแก้ว — ' + esc(p.location) + '</td></tr>' +
      '<tr><th>ผู้รับจ้าง</th><td>' + esc(p.contractor) + '</td></tr>' +
      '<tr><th>วงเงินตามสัญญา</th><td>' + money(p.budget, 2) + ' บาท (' + ui.bahtText(p.budget) + ')</td></tr>' +
      '<tr><th>ระยะเวลาสัญญา</th><td>' + ui.dateLong(p.start) + ' ถึง ' + ui.dateLong(p.end) + '</td></tr>' +
      '<tr><th>ผลงาน</th><td>งานจริง ' + p.actual + '% / แผน ' + p.plan + '% • งวดที่ ' + p.installment + ' จาก ' + p.installments + ' งวด</td></tr>' +
      '<tr><th>เบิกจ่ายแล้ว</th><td>' + money(p.disbursed, 2) + ' บาท</td></tr></table>';
  }
  function committeeSign(p) {
    var list = ref.committeeOf(p);
    if (!list.length) list = [{ name: '', role: 'ประธานกรรมการ' }, { name: '', role: 'กรรมการ' }, { name: '', role: 'กรรมการ' }];
    return signBlock(list.map(function (c) { return [c.name, c.role, c.position]; }));
  }

  var T = {
    urge119: function (p) {
      var late = Math.max(0, Math.round(p.plan - p.actual));
      return letter({
        subject: 'เร่งรัดการปฏิบัติงานตามสัญญาจ้าง', to: 'ผู้จัดการ ' + p.contractor, ref: 'สัญญาจ้างเลขที่ ' + p.contractNo,
        body: '<p class="indent">ตามที่เทศบาลตำบลสีแก้วได้ทำสัญญาจ้างกับท่านเพื่อดำเนินการ' + esc(p.name) + ' ' + esc(ui.villageName(p.village)) +
          ' วงเงิน ' + money(p.budget, 2) + ' บาท กำหนดแล้วเสร็จภายในวันที่ ' + ui.dateLong(p.end) + ' นั้น</p>' +
          '<p class="indent">ผู้ควบคุมงานได้รายงานว่าผลการดำเนินงานจริงอยู่ที่ร้อยละ ' + p.actual + ' ขณะที่แผนงานกำหนดไว้ร้อยละ ' + p.plan +
          ' ล่าช้ากว่าแผนร้อยละ ' + late + ' ซึ่งอาจทำให้งานแล้วเสร็จไม่ทันตามกำหนดในสัญญา</p>' +
          '<p class="indent">เทศบาลตำบลสีแก้วจึงขอให้ท่านเร่งรัดการปฏิบัติงาน เพิ่มเครื่องจักรและแรงงานให้เพียงพอ และส่งแผนการเร่งรัดงานภายใน ๗ วันนับแต่วันที่ได้รับหนังสือฉบับนี้ ' +
          'หากพ้นกำหนดสัญญาแล้วงานยังไม่แล้วเสร็จ เทศบาลจะปรับเป็นรายวันตามเงื่อนไขในสัญญา และดำเนินการตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ ต่อไป</p>' +
          '<p class="indent">จึงเรียนมาเพื่อโปรดดำเนินการ</p>'
      });
    },
    inspectionNotice: function (p, v) {
      return memo({
        subject: 'แจ้งนัดตรวจรับงานจ้าง ' + p.name, to: 'ประธานและคณะกรรมการตรวจรับพัสดุ',
        body: '<p class="indent">ด้วย ' + esc(p.contractor) + ' ได้แจ้งส่งมอบงานงวดที่ ' + esc(v.installment) + ' ตามสัญญาจ้างเลขที่ ' + esc(p.contractNo) +
          ' กองช่างจึงขอเรียนเชิญคณะกรรมการตรวจรับพัสดุร่วมตรวจรับงาน ในวันที่ ' + ui.dateFull(v.date) + ' เวลา ' + esc(v.time) + ' น. ณ ' + esc(v.place) + '</p>' +
          (v.note ? '<p class="indent">' + esc(v.note) + '</p>' : '') + projectTable(p) + '<p class="indent">จึงเรียนมาเพื่อโปรดทราบและเข้าร่วมตรวจรับงานตามวันเวลาดังกล่าว</p>'
      });
    },
    supervisorReport: function (p, entries) {
      return memo({
        subject: 'รายงานการควบคุมงานก่อสร้าง ' + p.name, to: 'ผู้อำนวยการกองช่าง',
        signers: [[p.supervisor.replace(/\s*\(.*\)/, ''), 'ผู้ควบคุมงาน']],
        body: '<p class="indent">ข้าพเจ้าผู้ควบคุมงานขอรายงานผลการควบคุมงานก่อสร้าง ดังนี้</p>' + projectTable(p) +
          '<h2>บันทึกการปฏิบัติงานประจำวัน</h2>' +
          (entries.length ? '<table><tr><th>วันที่</th><th>สภาพอากาศ</th><th>รายละเอียดการปฏิบัติงาน / ข้อสั่งการ</th></tr>' + entries.map(function (e) {
            return '<tr><td>' + ui.dateShort(e.date) + ' ' + esc(e.time || '') + '</td><td>' + esc(e.weather) + '</td><td><strong>' + esc(e.title) + '</strong><br>' + esc(e.detail) + '</td></tr>';
          }).join('') + '</table>' : '<p class="muted">ยังไม่มีบันทึกประจำวัน</p>')
      });
    },
    installmentNotice: function (p) {
      return '<h1>ใบแจ้งส่งมอบงานและขอให้ตรวจรับงานงวด</h1>' + projectTable(p) +
        '<p class="indent">ข้าพเจ้า ' + esc(p.contractor) + ' ผู้รับจ้าง ขอแจ้งส่งมอบงานงวดที่ ' + Math.max(1, p.installment) + ' ตามสัญญาจ้างเลขที่ ' + esc(p.contractNo) +
        ' ซึ่งได้ดำเนินการแล้วเสร็จตามรูปแบบและรายการละเอียด จึงขอให้คณะกรรมการตรวจรับพัสดุตรวจรับงานงวดดังกล่าวต่อไป</p>' +
        signBlock([['....................................', 'ผู้รับจ้าง'], [p.supervisor.replace(/\s*\(.*\)/, ''), 'ผู้ควบคุมงาน (รับเรื่อง)']]);
    },
    handover: function (p) {
      return letter({
        subject: 'ส่งมอบงานจ้างและขอให้ตรวจรับงานงวดสุดท้าย', to: 'นายกเทศมนตรีตำบลสีแก้ว', ref: 'สัญญาจ้างเลขที่ ' + p.contractNo,
        body: '<p class="indent">ตามที่ ' + esc(p.contractor) + ' ได้รับจ้าง' + esc(p.name) + ' นั้น บัดนี้ได้ดำเนินการแล้วเสร็จครบถ้วนตามสัญญาทุกประการ จึงขอส่งมอบงานจ้างและขอให้คณะกรรมการตรวจรับพัสดุตรวจรับงาน เพื่อเบิกจ่ายเงินค่าจ้างงวดสุดท้าย</p>' +
          projectTable(p) + '<p class="indent">จึงเรียนมาเพื่อโปรดพิจารณา</p>'
      });
    },
    inspectionRecord: function (p, v) {
      return '<h1>ใบรายงานผลการตรวจรับพัสดุ (งานจ้างก่อสร้าง)</h1>' + projectTable(p) +
        '<div class="box"><strong>งวดงานที่ตรวจรับ:</strong> งวดที่ ' + esc(v.installment) + ' &nbsp; <strong>วันที่ตรวจรับ:</strong> ' + ui.dateLong(v.date) +
        '<br><strong>ผลการตรวจรับ:</strong> ' + (v.result === 'pass' ? '☑ ถูกต้องครบถ้วนตามสัญญา ☐ ไม่ถูกต้อง' : '☐ ถูกต้องครบถ้วนตามสัญญา ☑ ไม่ถูกต้อง / ให้แก้ไข') +
        (v.note ? '<br><strong>ความเห็นคณะกรรมการ:</strong> ' + esc(v.note) : '') + '</div>' +
        '<p class="indent">คณะกรรมการตรวจรับพัสดุได้ตรวจรับงานตามข้อ ๑๗๖ แห่งระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ แล้ว</p>' + committeeSign(p);
    },
    execSummary: function (p, milestones, entries) {
      return '<h1>รายงานสรุปโครงการสำหรับผู้บริหาร</h1>' + projectTable(p) +
        '<h2>งวดงานและการเบิกจ่าย</h2><table><tr><th>งวด</th><th>รายละเอียด</th><th>สัดส่วน</th><th>สถานะ</th></tr>' + milestones.map(function (m, i) {
          return '<tr><td class="center">' + (i + 1) + '</td><td>' + esc(m.title) + '</td><td class="num">' + m.pct + '% (' + money(p.budget * m.pct / 100) + ' บ.)</td><td>' +
            ({ paid: 'ตรวจรับ/เบิกจ่ายแล้ว', active: 'กำลังดำเนินการ', pending: 'รอดำเนินการ' }[m.state]) + '</td></tr>';
        }).join('') + '</table>' +
        '<h2>บันทึกหน้างานล่าสุด</h2>' + (entries.slice(0, 3).map(function (e) { return '<p>• ' + ui.dateShort(e.date) + ' — ' + esc(e.title) + '</p>'; }).join('') || '<p class="muted">ไม่มีบันทึก</p>') +
        signBlock([[DIRECTOR(), 'ผู้อำนวยการกองช่าง']]);
    },
    appointment: function (v, p) {
      return '<h1>คำสั่งเทศบาลตำบลสีแก้ว<br>ที่ ' + esc(v.no) + '<br>เรื่อง แต่งตั้ง' + esc(v.kind) + '</h1>' +
        '<p class="indent">ตามที่เทศบาลตำบลสีแก้วได้ดำเนินการจัดจ้าง' + esc(p ? p.name : v.project) + ' เพื่อให้การดำเนินงานเป็นไปตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ มาตรา ๑๐๐ ' +
        'จึงแต่งตั้งบุคคลต่อไปนี้เป็น' + esc(v.kind) + '</p><ol>' + v.members.split('\n').filter(Boolean).map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ol>' +
        '<p class="indent">ให้ผู้ได้รับแต่งตั้งปฏิบัติหน้าที่ตามระเบียบกระทรวงการคลังฯ อย่างเคร่งครัด ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป</p>' +
        '<p class="center">สั่ง ณ วันที่ ' + ui.dateLong(v.date) + '</p>' + signBlock([['(นายกเทศมนตรีตำบลสีแก้ว)', 'นายกเทศมนตรีตำบลสีแก้ว']]);
    },
    estimate: function (est) {
      var direct = est.rows.reduce(function (s, r) { return s + r.cost; }, 0);
      var total = direct * est.factor;
      return '<h1>แบบสรุปผลการคำนวณราคากลางงานก่อสร้าง (แบบ ปร.5 (ก))</h1>' +
        '<p><strong>โครงการ:</strong> ' + esc(est.project) + '<br><strong>สถานที่ก่อสร้าง:</strong> ' + esc(est.place) + '<br><strong>ปริมาณงาน:</strong> ' + esc(est.qty) + '<br><strong>วันที่ประเมิน:</strong> ' + ui.dateLong(est.date) + '</p>' +
        '<table><tr><th>ลำดับ</th><th>รายการ</th><th>ค่างานต้นทุน (บาท)</th><th>Factor F</th><th>ค่าก่อสร้าง (บาท)</th></tr>' +
        est.rows.map(function (r, i) {
          return '<tr><td class="center">' + (i + 1) + '</td><td>' + esc(r.name) + '</td><td class="num">' + money(r.cost, 2) + '</td><td class="center">' + est.factor.toFixed(4) + '</td><td class="num">' + money(r.cost * est.factor, 2) + '</td></tr>';
        }).join('') +
        '<tr><th colspan="2">รวมค่างานต้นทุน</th><th class="num">' + money(direct, 2) + '</th><th></th><th class="num">' + money(total, 2) + '</th></tr></table>' +
        '<div class="box"><strong>ราคากลางรวมทั้งสิ้น ' + money(total, 2) + ' บาท</strong><br>(' + ui.bahtText(total) + ')</div>' +
        '<p class="muted">เงื่อนไข Factor F: เงินล่วงหน้าจ่าย 0% • เงินประกันผลงานหัก 0% • ดอกเบี้ยเงินกู้ 6.0% • ภาษีมูลค่าเพิ่ม 7.0%</p>' +
        signBlock((SK.db.data.signatures['estimate-089'] || []).map(function (s) { return [s.name, s.role, s.position]; }));
    },
    slaReport: function (projects, title) {
      var sum = function (f) { return projects.reduce(function (s, p) { return s + f(p); }, 0); };
      return '<h1>' + esc(title || 'รายงานผลการดำเนินงานตามแผนพัฒนาท้องถิ่น (แบบ ผ.01 - ผ.03)') + '</h1>' +
        '<p class="center">ปีงบประมาณ พ.ศ. ๒๕๖๗ • กองช่าง เทศบาลตำบลสีแก้ว</p>' +
        '<table><tr><th>ที่</th><th>รหัส</th><th>โครงการ</th><th>แหล่งงบ</th><th>วงเงิน (บาท)</th><th>เบิกจ่าย (บาท)</th><th>ผลงาน</th><th>สถานะ</th></tr>' +
        projects.map(function (p, i) {
          return '<tr><td class="center">' + (i + 1) + '</td><td>' + esc(p.id) + '</td><td>' + esc(p.name) + '</td><td>' + esc(ref.SOURCES[p.source]) + '</td><td class="num">' + money(p.budget) +
            '</td><td class="num">' + money(p.disbursed) + '</td><td class="num">' + p.actual + '%</td><td>' + esc(ref.STATUSES[p.status].label) + '</td></tr>';
        }).join('') +
        '<tr><th colspan="4">รวม ' + projects.length + ' โครงการ</th><th class="num">' + money(sum(function (p) { return p.budget; })) + '</th><th class="num">' + money(sum(function (p) { return p.disbursed; })) + '</th><th colspan="2"></th></tr></table>' +
        signBlock([[DIRECTOR(), 'ผู้อำนวยการกองช่าง'], ['(ปลัดเทศบาลตำบลสีแก้ว)', 'ปลัดเทศบาล']]);
    },
    paymentPackage: function (pay, p) {
      return '<h1>ชุดเอกสารประกอบการเบิกจ่าย ' + esc(pay.id) + '</h1>' + projectTable(p) +
        '<div class="box"><strong>งวดที่ขอเบิก:</strong> ' + esc(pay.installment) + '<br><strong>จำนวนเงิน:</strong> ' + money(pay.amount, 2) + ' บาท (' + ui.bahtText(pay.amount) + ')<br><strong>วันที่ส่งฎีกา:</strong> ' + ui.dateLong(pay.submitted) + '</div>' +
        '<h2>รายการเอกสารแนบ</h2><table><tr><th>ที่</th><th>เอกสาร</th><th>สถานะ</th></tr>' +
        ['บันทึกขออนุมัติเบิกจ่าย (ฎีกา)', 'ใบแจ้งหนี้ / ใบส่งมอบงานของผู้รับจ้าง', 'ใบรายงานผลการตรวจรับพัสดุ', 'ภาพถ่ายความก้าวหน้าพร้อมพิกัด GIS', 'สำเนาสัญญาจ้างและหลักประกันสัญญา', 'ใบกำกับภาษี / ใบเสร็จรับเงิน'].map(function (d, i) {
          return '<tr><td class="center">' + (i + 1) + '</td><td>' + d + '</td><td>☑ แนบแล้ว</td></tr>';
        }).join('') + '</table>' + signBlock([['(ผู้อำนวยการกองคลัง)', 'ผู้ตรวจฎีกา'], [DIRECTOR(), 'ผู้อำนวยการกองช่าง']]);
    },
    extension: function () {
      return memo({
        subject: 'รายงานสรุปเงินกันไว้เบิกเหลื่อมปีและการขยายเวลาเบิกจ่าย', to: 'นายกเทศมนตรีตำบลสีแก้ว',
        body: '<p class="indent">กองช่างขอรายงานสรุปเงินกันไว้เบิกเหลื่อมปีงบประมาณ พ.ศ. ๒๕๖๖ คงค้าง จำนวน ๑ โครงการ วงเงินคงเหลือเบิกจ่าย ๑,๑๒๐,๐๐๐ บาท ' +
          '(' + ui.bahtText(1120000) + ') ซึ่งต้องเบิกจ่ายให้แล้วเสร็จภายในวันที่ ๓๐ กันยายน ๒๕๖๗ ตามระเบียบกระทรวงมหาดไทยว่าด้วยการรับเงิน การเบิกจ่ายเงิน การฝากเงิน การเก็บรักษาเงิน และการตรวจเงินขององค์กรปกครองส่วนท้องถิ่น</p>' +
          '<p class="indent">จึงเรียนมาเพื่อโปรดทราบและพิจารณาอนุมัติขยายเวลาเบิกจ่ายเงินตามความจำเป็น</p>'
      });
    },
    blankForm: function (title, p) {
      return '<h1>' + esc(title) + '</h1>' + (p ? projectTable(p) : '') +
        '<table>' + Array.from({ length: 12 }).map(function (_, i) { return '<tr><td style="width:6%" class="center">' + (i + 1) + '</td><td style="height:28px"></td><td style="width:18%"></td><td style="width:18%"></td></tr>'; }).join('') + '</table>' +
        signBlock([['....................................', 'ผู้จัดทำ'], ['....................................', 'ผู้ตรวจสอบ']]);
    }
  };

  SK.docs = {
    print: function (kind, title) {
      var args = Array.prototype.slice.call(arguments, 2);
      ui.printDoc(title, T[kind].apply(null, args));
    }
  };
})();
