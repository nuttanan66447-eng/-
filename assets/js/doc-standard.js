// มาตรฐานการพิมพ์หนังสือราชการ (บันทึกข้อความ และหนังสือภายนอก) ตาม design/formstandard (ผู้ใช้ส่งมา) ตามคำแนะนำและแบบมาตรฐานการพิมพ์หนังสือราชการภาษาไทย
// (แบบหนังสือภายในที่ใช้กระดาษบันทึกข้อความ):
//   ขอบซ้าย ๓ ซม. ขวา ๒ ซม. บน ๒.๕ ซม. ล่าง ๒ ซม. • TH Sarabun PSK ๑๖ พอยต์ • ระยะบรรทัด ๑ เท่า
//   ตราครุฑสูง ๑.๕ ซม. ชิดขอบบนด้านซ้าย • "บันทึกข้อความ" ตัวหนา ๒๙ พอยต์ ระยะบรรทัดแน่นอน ๓๕ พอยต์
//   "ส่วนราชการ ที่ วันที่ เรื่อง" ตัวหนา ๒๐ พอยต์ ใช้จุดไข่ปลาแสดงเส้นบรรทัด • "วันที่" ตรงตัว "ข" เดือนตรงหลังตัว "ม"
//   คำขึ้นต้นและย่อหน้า: 1 Enter + Before 6 pt • ย่อหน้า ๒.๕ ซม. • ลงชื่อ: เริ่มที่แนวกึ่งกลางหน้ากระดาษ เว้น 2 Enter
// ทำงานกับเอกสารที่ระบบเดิมสร้าง (แก้หน้าตาหลังสร้าง ไม่แตะเนื้อหา) ใช้ทั้งพรีวิวและการพิมพ์/บันทึก PDF
(function () {
  'use strict';
  var FONT = "'TH Sarabun PSK','TH SarabunPSK','TH Sarabun New','Sarabun',sans-serif";
  var LABELS = { 'ส่วนราชการ': 1, 'ที่': 1, 'วันที่': 1, 'เรื่อง': 1 };

  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function set(el, props) { Object.keys(props).forEach(function (k) { el.style.setProperty(k, props[k], 'important'); }); }
  function charRect(textEl, index, doc) {
    var node = textEl.firstChild;
    while (node && node.nodeType !== 3) node = node.nextSibling;
    if (!node || node.length <= index) return null;
    var r = doc.createRange();
    r.setStart(node, index); r.setEnd(node, index + 1);
    return r.getBoundingClientRect();
  }

  function apply(doc) {
    if (!doc || doc.__skStandard) return 0;
    var win = doc.defaultView, pages = [], css = '@page skstd{size:A4 portrait;margin:25mm 20mm 20mm 30mm}';
    // ใส่สไตล์ระยะขอบก่อนวัดตำแหน่ง (ตำแหน่งตัว "ข" "ม" ขึ้นกับระยะขอบหน้ากระดาษ)
    var st = doc.createElement('style');
    st.id = 'sk-doc-standard';
    doc.head.appendChild(st);
    var titles = Array.prototype.filter.call(doc.querySelectorAll('div,p,h1,h2,span'), function (el) {
      return !el.children.length && txt(el) === 'บันทึกข้อความ';
    });
    titles.forEach(function (title, n) {
      // หน้ากระดาษ = กรอบที่กว้างเกือบเท่า A4
      var page = title.parentElement;
      while (page && page !== doc.body && page.getBoundingClientRect().width < 700) page = page.parentElement;
      if (!page || page === doc.body || pages.indexOf(page) >= 0) return;
      pages.push(page);
      var id = 'skstd' + n;
      page.id = page.id || id;
      id = page.id;
      page.classList.add('sk-std');
      var sel = '#' + id + '.sk-std.sk-std.sk-std';
      css += '@media screen{' + sel + '{width:210mm!important;max-width:none!important;min-height:297mm!important;height:auto!important;max-height:none!important;padding:25mm 20mm 20mm 30mm!important;overflow:visible!important;box-sizing:border-box!important}' +
        sel + ' .sk-std-garuda{top:25mm!important;left:30mm!important}}' +
        '@media print{' + sel + '{page:skstd!important;width:auto!important;max-width:none!important;min-height:0!important;height:auto!important;max-height:none!important;padding:0!important;margin:0!important;overflow:visible!important;box-sizing:border-box!important}' +
        sel + ' .sk-std-garuda{top:0!important;left:0!important}}';
      st.textContent = css;
      set(page, { position: 'relative', 'font-family': FONT, 'font-size': '16pt', color: '#000' });

      // ตัวอักษรเนื้อหา ๑๖ พอยต์ (ยกเว้นตาราง)
      Array.prototype.forEach.call(page.querySelectorAll('*'), function (el) {
        if (el.closest('table') || el.tagName === 'IMG' || el.tagName === 'svg' || el.closest('svg')) return;
        set(el, { 'font-family': FONT, 'font-size': '16pt' });
      });

      // ตราครุฑ สูง ๑.๕ ซม. ชิดขอบบนด้านซ้าย
      var garuda = Array.prototype.filter.call(page.querySelectorAll('img, svg'), function (g) {
        return (g.compareDocumentPosition(title) & 4) && !(g.parentElement && g.parentElement.closest('svg'));
      })[0];
      if (garuda) {
        var holder = garuda.parentElement;
        if (holder && holder !== page && !holder.contains(title)) set(holder, { height: '0', 'min-height': '0', 'max-height': 'none', margin: '0', padding: '0', position: 'static' });
        garuda.classList.add('sk-std-garuda');
        set(garuda, { position: 'absolute', height: '1.5cm', 'max-height': '1.5cm', width: 'auto', 'max-width': 'none', margin: '0', transform: 'none' });
      }

      // "บันทึกข้อความ" ๒๙ พอยต์ ระยะบรรทัด ๓๕ พอยต์ ฐานบรรทัดตรงกับขอบล่างตราครุฑ
      var head = title.parentElement !== page && title.parentElement.children.length === 1 ? title.parentElement : null;
      if (head) set(head, { margin: '0', padding: '0', 'min-height': '0', height: 'auto', 'text-align': 'center' });
      set(title, { 'font-size': '29pt', 'font-weight': '700', 'line-height': '35pt', height: '35pt', 'text-align': 'center', margin: '2.65mm 0 3mm 0', padding: '0', display: 'block', position: 'static' });
      // (เว้นใต้หัวเรื่อง ๓ มม. ให้บรรทัด "ส่วนราชการ" ๒๐ พอยต์ไม่ทับตราครุฑ)

      // หัวบันทึก: ส่วนราชการ ที่ วันที่ เรื่อง
      var labels = Array.prototype.filter.call(page.querySelectorAll('b, strong, span, div'), function (el) {
        return !el.children.length && LABELS[txt(el)] && el !== title;
      });
      var rows = [];
      labels.forEach(function (lab) {
        var row = lab.parentElement;
        if (rows.indexOf(row) < 0) rows.push(row);
        set(lab, { 'font-size': '20pt', 'font-weight': '700', 'white-space': 'nowrap', 'margin-right': '4px', 'flex': '0 0 auto' });
      });
      // "วันที่" แยกบรรทัด: ย้ายมาอยู่บรรทัดเดียวกับ "ที่"
      var noRow = rows.filter(function (r) { var l = r.querySelector('b,strong,span'); return l && txt(l) === 'ที่'; })[0];
      var dateRow = rows.filter(function (r) { var l = r.firstElementChild; return l && txt(l) === 'วันที่' && r !== noRow; })[0];
      if (noRow && dateRow && dateRow.children.length <= 2) {
        while (dateRow.firstChild) noRow.appendChild(dateRow.firstChild);
        dateRow.remove();
        rows.splice(rows.indexOf(dateRow), 1);
      }
      rows.forEach(function (row) {
        set(row, { display: 'flex', 'align-items': 'baseline', gap: '0', margin: '0', padding: '0', border: '0', position: 'relative', 'grid-template-columns': 'none' });
        Array.prototype.forEach.call(row.children, function (c) {
          if (LABELS[txt(c)] && !c.children.length) return;
          set(c, { flex: '1 1 auto', 'min-width': '0', 'border-bottom': '1.5px dotted #000', 'line-height': '1.15', padding: '0 0 0 4px', margin: '0', position: 'static', transform: 'none', left: 'auto' });
          if (c.children.length && c.querySelector('b,strong')) {
            // กลุ่ม "วันที่ + ค่า" ที่ระบบเดิมจัดไว้ในกล่องเดียว
            set(c, { display: 'flex', 'align-items': 'baseline', 'border-bottom': '0', padding: '0' });
            Array.prototype.forEach.call(c.children, function (cc) { if (!LABELS[txt(cc)]) set(cc, { flex: '1 1 auto', 'border-bottom': '1.5px dotted #000', padding: '0 0 0 4px' }); });
          }
        });
      });
      // "วันที่" ตรงตัวอักษร "ข" และวันที่ตรงหลังตัว "ม" ของคำว่า "บันทึกข้อความ"
      if (noRow) {
        var dLab = Array.prototype.filter.call(noRow.querySelectorAll('b,strong,span'), function (el) { return txt(el) === 'วันที่'; })[0];
        var kho = charRect(title, 6, doc), mo = charRect(title, 12, doc);
        if (dLab && kho && mo) {
          // ช่องเลขที่กว้างถึงตัว "ข" แล้ว "วันที่" กว้างถึงหลังตัว "ม"
          var noVal = dLab.previousElementSibling && !LABELS[txt(dLab.previousElementSibling)] ? dLab.previousElementSibling : null;
          var dateVal = dLab.nextElementSibling;
          set(dLab, { 'margin-right': '0', 'margin-left': '0', 'box-sizing': 'border-box' });
          if (noVal) set(noVal, { flex: '0 0 auto', 'box-sizing': 'border-box', width: Math.max(10, kho.left - noVal.getBoundingClientRect().left) + 'px' });
          set(dLab, { flex: '0 0 auto', width: Math.max(10, mo.right - kho.left) + 'px' });
          if (dateVal) set(dateVal, { 'padding-left': '0' });
          // วัดซ้ำแล้วชดเชยส่วนต่าง (ช่องว่าง/ขอบของระบบเดิม)
          for (var pass = 0; pass < 2; pass++) {
            var dx = dLab.getBoundingClientRect().left - kho.left;
            if (noVal && Math.abs(dx) > 0.5) set(noVal, { width: (noVal.getBoundingClientRect().width - dx) + 'px' });
            if (dateVal) {
              var dv = dateVal.getBoundingClientRect().left - mo.right;
              if (Math.abs(dv) > 0.5) set(dLab, { width: (dLab.getBoundingClientRect().width - dv) + 'px' });
            }
          }
        }
      }
      // คำขึ้นต้น (เรียน) และย่อหน้า
      Array.prototype.forEach.call(page.querySelectorAll('b, strong'), function (el) {
        if (txt(el) !== 'เรียน' || el.children.length) return;
        var row = el.parentElement;
        set(row, { display: 'flex', gap: '0', 'margin-top': '6pt', border: '0', 'grid-template-columns': 'none' });
        set(el, { 'font-weight': '400', 'margin-right': '8px' });
      });
      Array.prototype.forEach.call(page.querySelectorAll('p, div'), function (el) {
        if (el.closest('table')) return;
        var ind = parseFloat(win.getComputedStyle(el).textIndent) || 0;
        if (ind > 0) set(el, { 'text-indent': '2.5cm', 'margin-top': '6pt', 'margin-bottom': '0', 'line-height': '1.15' });
      });

      // ลงชื่อ (ผู้ลงชื่อคนเดียว): เริ่มตัวอักษรแรกที่แนวกึ่งกลางหน้ากระดาษ เว้น 2 บรรทัดจากข้อความ
      Array.prototype.forEach.call(page.querySelectorAll('div'), function (el) {
        var first = el.firstElementChild;
        // บล็อกลงชื่อจริง = บรรทัดแรกเป็นข้อความ "ลงชื่อ..." (ไม่ใช่กล่องที่ครอบบล็อกลงชื่ออีกชั้น)
        if (!first || el.closest('.sk-std-sign') || first.querySelector('div,p') || !/^\(?ลงชื่อ/.test(txt(first)) || el.children.length > 5) return;
        el.classList.add('sk-std-sign');
        var group = el.parentElement;
        if (group === page) group = el;
        var signers = group === el ? [el] : Array.prototype.filter.call(group.children, function (c) { return c.firstElementChild && !c.firstElementChild.querySelector('div,p') && /^\(?ลงชื่อ/.test(txt(c.firstElementChild)); });
        if (signers.length > 1) {
          // ลงชื่อหลายคนในแถวเดียว: ย่อเส้นจุดให้อยู่ในระยะขอบกระดาษ
          set(group, { width: '100%', 'max-width': '100%', 'column-gap': '4mm', 'margin-left': '0', 'margin-right': '0' });
          Array.prototype.forEach.call(el.querySelectorAll('*'), function (x) {
            if (!x.children.length) x.textContent = x.textContent.replace(/\.{16,}/g, '..........................');
          });
          set(el, { 'min-width': '0', overflow: 'hidden' });
          return;
        }
        if (signers.length !== 1) return;
        if (group !== el && group.children.length === 1) set(group, { width: 'auto', margin: '0', padding: '0', display: 'block', 'text-align': 'left' });
        set(el, { width: 'max-content', 'max-width': '75mm', 'margin': '2.4em 0 0 75mm', 'text-align': 'center' });
      });
    });
    // หนังสือภายนอก (ตราครุฑกลางหน้า สูง ๓ ซม.): ระยะขอบ ๓/๒/๒.๕/๒ ซม. ตัวอักษร ๑๖ พอยต์
    var boxes = Array.prototype.filter.call(doc.body.querySelectorAll('section, div, article'), function (el) {
      var r = el.getBoundingClientRect(), q = Math.max(r.width, r.height) / Math.max(1, Math.min(r.width, r.height));
      return r.width > 690 && r.width < 1200 && Math.abs(q - 1.414) < 0.12;
    }).filter(function (el, i, all) { return !all.some(function (o) { return o !== el && o.contains(el); }); });
    boxes.forEach(function (page, n) {
      if (pages.indexOf(page) >= 0 || page.querySelector('.sk-std') || page.closest('.sk-std')) return;
      var text = txt(page);
      var garuda = page.querySelector('img');
      if (!garuda || !/เรื่อง/.test(text) || !/เรียน/.test(text) || /บันทึกข้อความ/.test(text.slice(0, 200))) return;
      var gr = garuda.getBoundingClientRect(), pr = page.getBoundingClientRect();
      if (gr.top - pr.top > 260) return; // ครุฑต้องอยู่บนสุดของหน้า
      pages.push(page);
      page.id = page.id || 'skext' + n;
      page.classList.add('sk-std-ext');
      var sel = '#' + page.id + '.sk-std-ext.sk-std-ext.sk-std-ext';
      css += '@media screen{' + sel + '{width:210mm!important;max-width:none!important;min-height:297mm!important;height:auto!important;max-height:none!important;padding:25mm 20mm 20mm 30mm!important;overflow:visible!important;box-sizing:border-box!important}}' +
        '@media print{' + sel + '{page:skstd!important;width:auto!important;max-width:none!important;min-height:0!important;height:auto!important;max-height:none!important;padding:0!important;margin:0!important;overflow:visible!important;box-sizing:border-box!important}}';
      set(page, { 'font-family': FONT, 'font-size': '16pt', color: '#000' });
      Array.prototype.forEach.call(page.querySelectorAll('*'), function (el) {
        if (el.closest('table') || el.tagName === 'IMG' || el.tagName === 'svg' || el.closest('svg')) return;
        set(el, { 'font-family': FONT, 'font-size': '16pt' });
      });
      set(garuda, { height: '3cm', 'max-height': '3cm', width: 'auto', 'max-width': 'none' });
    });
    if (pages.length) st.textContent = css; else st.remove();
    doc.__skStandard = true;
    return pages.length;
  }

  window.SK = window.SK || {};
  window.SK.docStandard = { apply: apply };
})();
