// บันทึกเอกสารเป็นไฟล์ Word (.doc) ให้หน้าตาเหมือนหน้าพรีวิว (รวมการจัดรูปแบบมาตรฐานและข้อความที่แก้ไขในพรีวิว)
// สร้างจากหน้าพรีวิวที่แสดงอยู่จริง: แปลงแถวที่วางเรียงกัน (flex/grid) เป็นตารางไร้เส้น, ตารางคงเส้นตามเดิม,
// รูป/ตราครุฑฝังในไฟล์ (MHTML ที่ Word เปิดได้โดยตรง), ฟอนต์ไทยกำหนดทั้ง font และ complex-script (mso-bidi)
(function () {
  'use strict';
  var PX_PT = 0.75, PX_CM = 2.54 / 96;
  var FONT = 'TH Sarabun PSK';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pt(px) { return (Math.round(parseFloat(px) * PX_PT * 10) / 10) + 'pt'; }
  function cm(px) { return (Math.round(parseFloat(px) * PX_CM * 100) / 100) + 'cm'; }
  function visible(cs) { return cs.display !== 'none' && cs.visibility !== 'hidden'; }

  // ---------- รูปภาพ -> PNG ----------
  function rasterize(el, w, h) {
    return new Promise(function (resolve) {
      var scale = 3, canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
      var img = new Image();
      img.onload = function () {
        try { canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/png')); }
        catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      if (el.tagName.toLowerCase() === 'svg') {
        var xml = new XMLSerializer().serializeToString(el);
        if (!/xmlns=/.test(xml)) xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      } else {
        img.crossOrigin = 'anonymous';
        img.src = el.currentSrc || el.src;
      }
    });
  }

  // ---------- แปลง DOM ของหน้าพรีวิว ----------
  function Builder(doc) {
    this.doc = doc; this.win = doc.defaultView; this.images = []; this.jobs = [];
  }
  Builder.prototype.cs = function (el) { return this.win.getComputedStyle(el); };
  Builder.prototype.textStyle = function (cs) {
    var size = pt(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 600;
    var f = "'" + FONT + "'";
    var out = 'font-family:' + f + ';mso-ascii-font-family:' + f + ';mso-hansi-font-family:' + f + ';mso-bidi-font-family:' + f + ';' +
      'font-size:' + size + ';mso-bidi-font-size:' + size + ';';
    if (bold) out += 'font-weight:bold;mso-bidi-font-weight:bold;';
    if (cs.fontStyle === 'italic') out += 'font-style:italic;mso-bidi-font-style:italic;';
    if (/underline/.test(cs.textDecorationLine)) out += 'text-decoration:underline;';
    if (cs.color && cs.color !== 'rgb(0, 0, 0)' && cs.color !== 'rgb(17, 24, 39)') out += 'color:' + cs.color + ';';
    return out;
  };
  Builder.prototype.image = function (el) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return '';
    var name = 'image' + (this.images.length + 1) + '.png', self = this, entry = { name: name, data: null };
    this.images.push(entry);
    this.jobs.push(rasterize(el, r.width, r.height).then(function (d) { entry.data = d; }));
    return '<img width="' + Math.round(r.width) + '" height="' + Math.round(r.height) + '" src="' + name + '" style="width:' + cm(r.width) + ';height:' + cm(r.height) + '">';
  };
  // แถวที่ลูกวางเรียงซ้ายไปขวา
  Builder.prototype.rowsOf = function (el) {
    var kids = Array.prototype.filter.call(el.children, function (k) { var r = k.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    var rows = [];
    kids.forEach(function (k) {
      var top = k.getBoundingClientRect().top, row = rows.filter(function (rr) { return Math.abs(rr.top - top) < 6; })[0];
      if (!row) rows.push(row = { top: top, cells: [] });
      row.cells.push(k);
    });
    rows.forEach(function (rr) { rr.cells.sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; }); });
    return rows;
  };
  Builder.prototype.inline = function (node) {
    var self = this, out = '';
    Array.prototype.forEach.call(node.childNodes, function (n) {
      if (n.nodeType === 3) { out += esc(n.nodeValue.replace(/\s+/g, ' ')); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if (tag === 'br') { out += '<br>'; return; }
      if (tag === 'img' || tag === 'svg') { out += self.image(n); return; }
      var cs = self.cs(n);
      if (!visible(cs)) return;
      out += '<span style="' + self.textStyle(cs) + '">' + self.inline(n) + '</span>';
    });
    return out;
  };
  Builder.prototype.isBlockish = function (el) {
    var d = this.cs(el).display;
    return !/^inline/.test(d) || d === 'inline-block' || d === 'inline-flex';
  };
  Builder.prototype.hasBlockKids = function (el) {
    var self = this;
    return Array.prototype.some.call(el.children, function (k) { return self.isBlockish(k) && k.tagName !== 'BR'; });
  };
  Builder.prototype.paraStyle = function (el, cs, extra) {
    var st = this.textStyle(cs) + 'margin:0;mso-line-height-rule:at-least;';
    var ta = cs.textAlign;
    if (ta === 'center' || ta === 'right' || ta === 'justify') st += 'text-align:' + ta + ';';
    if (ta === 'justify') st += 'text-justify:inter-cluster;';
    var ind = parseFloat(cs.textIndent); if (ind) st += 'text-indent:' + cm(ind) + ';';
    var mt = parseFloat(cs.marginTop) + parseFloat(cs.paddingTop); if (mt > 0.5) st += 'margin-top:' + pt(mt) + ';';
    var mb = parseFloat(cs.marginBottom) + parseFloat(cs.paddingBottom); if (mb > 0.5) st += 'margin-bottom:' + pt(mb) + ';';
    if (extra && extra.left > 0.5) st += 'margin-left:' + cm(extra.left) + ';';
    var bb = cs.borderBottomStyle;
    if (bb && bb !== 'none' && parseFloat(cs.borderBottomWidth) > 0) st += 'border-bottom:' + (bb === 'dotted' ? 'dotted' : 'solid') + ' windowtext 1.0pt;mso-border-bottom-alt:' + (bb === 'dotted' ? 'dotted' : 'solid') + ' windowtext .75pt;padding:0;';
    return st;
  };
  Builder.prototype.table = function (el) {
    var self = this, html = '<table border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:' + cm(el.getBoundingClientRect().width) + ';mso-table-layout-alt:fixed">';
    Array.prototype.forEach.call(el.rows, function (tr) {
      html += '<tr>';
      Array.prototype.forEach.call(tr.cells, function (td) {
        var cs = self.cs(td), r = td.getBoundingClientRect();
        var b = function (side) {
          var w = parseFloat(cs['border' + side + 'Width']), s = cs['border' + side + 'Style'];
          return 'border-' + side.toLowerCase() + ':' + (w && s !== 'none' ? (s === 'dotted' ? 'dotted' : s === 'dashed' ? 'dashed' : 'solid') + ' windowtext ' + Math.max(0.5, w * PX_PT) + 'pt' : 'none') + ';';
        };
        html += '<td' + (td.colSpan > 1 ? ' colspan="' + td.colSpan + '"' : '') + (td.rowSpan > 1 ? ' rowspan="' + td.rowSpan + '"' : '') +
          ' valign="' + (cs.verticalAlign === 'middle' ? 'middle' : cs.verticalAlign === 'bottom' ? 'bottom' : 'top') + '"' +
          ' style="width:' + cm(r.width) + ';height:' + cm(r.height) + ';' + b('Top') + b('Right') + b('Bottom') + b('Left') +
          'padding:' + pt(cs.paddingTop) + ' ' + pt(cs.paddingRight) + ' ' + pt(cs.paddingBottom) + ' ' + pt(cs.paddingLeft) + ';' +
          (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? 'background:' + cs.backgroundColor + ';' : '') + '">' +
          self.blocks(td, true) + '</td>';
      });
      html += '</tr>';
    });
    return html + '</table>';
  };
  // กล่องที่ลูกวางเรียงกันในแนวนอน -> ตารางไร้เส้น
  Builder.prototype.layoutTable = function (el, rows) {
    var self = this, box = el.getBoundingClientRect();
    var html = '<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:' + cm(box.width) + ';mso-table-layout-alt:fixed">';
    rows.forEach(function (row) {
      html += '<tr>';
      var x = box.left;
      row.cells.forEach(function (c, i) {
        var r = c.getBoundingClientRect(), gap = r.left - x;
        if (gap > 3) html += '<td style="width:' + cm(gap) + ';padding:0;border:none"></td>';
        var w = i === row.cells.length - 1 ? Math.max(r.width, box.right - r.left) : r.width;
        var cs = self.cs(c);
        var bb = cs.borderBottomStyle !== 'none' && parseFloat(cs.borderBottomWidth) > 0 ? 'border-bottom:' + (cs.borderBottomStyle === 'dotted' ? 'dotted' : 'solid') + ' windowtext 1.0pt;' : 'border:none;';
        var va = self.hasBlockKids(c) ? 'top' : 'bottom';
        html += '<td valign="' + va + '" style="width:' + cm(w) + ';padding:0;' + bb + '">' + self.blocks(c, true) + '</td>';
        x = r.left + w;
      });
      html += '</tr>';
    });
    return html + '</table>';
  };
  // เนื้อหาของกล่อง -> ย่อหน้า/ตาราง
  Builder.prototype.blocks = function (el, inCell) {
    var self = this, out = '';
    if (!this.hasBlockKids(el)) {
      var cs0 = this.cs(el);
      var content = this.inline(el);
      return '<p style="' + this.paraStyle(el, cs0) + '">' + (content.replace(/\s|&nbsp;/g, '') ? content : '&nbsp;') + '</p>';
    }
    var pendingInline = '';
    var flush = function () {
      if (pendingInline.replace(/\s/g, '')) out += '<p style="' + self.paraStyle(el, self.cs(el)) + '">' + pendingInline + '</p>';
      pendingInline = '';
    };
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) { pendingInline += esc(n.nodeValue.replace(/\s+/g, ' ')); return; }
      if (n.nodeType !== 1) return;
      var cs = self.cs(n);
      if (!visible(cs) || n.classList.contains('sk-std-garuda')) return;
      if (!self.isBlockish(n)) { pendingInline += '<span style="' + self.textStyle(cs) + '">' + self.inline(n) + '</span>'; return; }
      flush();
      out += self.block(n);
    });
    flush();
    return out;
  };
  Builder.prototype.block = function (el) {
    var cs = this.cs(el), tag = el.tagName.toLowerCase();
    if (tag === 'table') return this.table(el);
    if (tag === 'img' || tag === 'svg') return '<p style="margin:0">' + this.image(el) + '</p>';
    if (el.__skTitle) return this.titleRow(el);
    if (/flex|grid/.test(cs.display)) {
      var rows = this.rowsOf(el);
      if (rows.some(function (r) { return r.cells.length > 1; })) return this.layoutTable(el, rows);
    }
    // ลงชื่อ/บล็อกที่เยื้องจากซ้าย: ใช้ตารางคอลัมน์เดียวที่วางตามตำแหน่ง
    // วัดจากขอบเนื้อหาของกล่องแม่ (ไม่รวม padding) และไม่นับ text-indent
    var r = el.getBoundingClientRect(), pe = el.parentElement, parent = pe.getBoundingClientRect(), pcs = this.cs(pe);
    var pl = parent.left + parseFloat(pcs.paddingLeft) + parseFloat(pcs.borderLeftWidth);
    var pw = parent.width - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight) - parseFloat(pcs.borderLeftWidth) - parseFloat(pcs.borderRightWidth);
    var left = r.left - pl;
    if (left > 20 && r.width < pw - 20) {
      return '<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-left:' + cm(left) + ';margin-top:' + pt(cs.marginTop) + '"><tr><td style="width:' + cm(r.width) + ';padding:0;border:none">' + this.blocks(el, true) + '</td></tr></table>';
    }
    return this.blocks(el);
  };
  // หัวบันทึกข้อความ: ตราครุฑซ้าย + "บันทึกข้อความ" กึ่งกลาง
  Builder.prototype.titleRow = function (title) {
    var page = title.__skPage, garuda = page.querySelector('.sk-std-garuda');
    var pw = page.getBoundingClientRect(), cs = this.cs(title);
    var content = pw.width - parseFloat(this.cs(page).paddingLeft) - parseFloat(this.cs(page).paddingRight);
    var side = 3 / PX_CM; // 3 ซม.
    return '<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:' + cm(content) + ';mso-table-layout-alt:fixed"><tr>' +
      '<td valign="bottom" style="width:' + cm(side) + ';padding:0;border:none">' + (garuda ? '<p style="margin:0">' + this.image(garuda) + '</p>' : '') + '</td>' +
      '<td valign="bottom" style="width:' + cm(content - 2 * side) + ';padding:0;border:none"><p align="center" style="' + this.paraStyle(title, cs) + 'text-align:center;line-height:35.0pt;mso-line-height-rule:exactly;">' + this.inline(title) + '</p></td>' +
      '<td style="width:' + cm(side) + ';padding:0;border:none"></td></tr></table>' +
      '<p style="margin:0;font-size:3.0pt;line-height:3.0pt;mso-line-height-rule:exactly">&nbsp;</p>';
  };

  // หน้ากระดาษในเอกสาร = กล่องที่กว้างประมาณ A4 ชั้นในสุด
  function pagesOf(doc) {
    var all = Array.prototype.filter.call(doc.body.querySelectorAll('section, div'), function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 690 && r.width < 1200 && r.height > 150;
    });
    return all.filter(function (el) { return !all.some(function (o) { return o !== el && el.contains(o); }); });
  }

  function build(doc) {
    var b = new Builder(doc), win = doc.defaultView;
    var pages = pagesOf(doc);
    if (!pages.length) pages = [doc.body];
    // หัวบันทึกข้อความที่จัดมาตรฐานแล้ว
    Array.prototype.forEach.call(doc.querySelectorAll('.sk-std'), function (page) {
      var t = Array.prototype.filter.call(page.querySelectorAll('div,p,span'), function (e) { return !e.children.length && e.textContent.trim() === 'บันทึกข้อความ'; })[0];
      if (t) { var box = t.parentElement !== page && t.parentElement.children.length === 1 ? t.parentElement : t; box.__skTitle = true; box.__skPage = page; t.__skTitle = true; t.__skPage = page; }
    });
    var sections = [], css = '';
    pages.forEach(function (page, i) {
      var cs = win.getComputedStyle(page), r = page.getBoundingClientRect();
      var landscape = r.width > r.height * 1.1 && r.width > 1000;
      var std = page.classList.contains('sk-std');
      var margin = std ? '2.5cm 2.0cm 2.0cm 3.0cm' : [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(function (v) { return Math.max(0.5, parseFloat(v) * PX_CM).toFixed(2) + 'cm'; }).join(' ');
      css += '@page Section' + (i + 1) + '{size:' + (landscape ? '29.7cm 21.0cm;mso-page-orientation:landscape' : '21.0cm 29.7cm') + ';margin:' + margin + ';mso-header-margin:1.0cm;mso-footer-margin:1.0cm}' +
        'div.Section' + (i + 1) + '{page:Section' + (i + 1) + '}';
      sections.push('<div class="Section' + (i + 1) + '">' + b.blocks(page) + '</div>');
    });
    var body = sections.join('<br clear="all" style="page-break-before:always;mso-break-type:section-break">');
    return Promise.all(b.jobs).then(function () {
      var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
        '<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="ProgId" content="Word.Document">' +
        '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->' +
        '<style>' + css + 'body{font-family:\'' + FONT + '\';font-size:16pt;mso-bidi-font-family:\'' + FONT + '\';mso-bidi-font-size:16pt}p{margin:0}table{mso-padding-alt:0 0 0 0}</style></head>' +
        '<body lang="TH" style="tab-interval:36.0pt">' + body + '</body></html>';
      return { html: html, images: b.images.filter(function (im) { return im.data; }) };
    });
  }

  // MHTML: Word เปิดไฟล์ .doc ที่เป็น multipart พร้อมรูปที่ฝังไว้ได้
  function toMhtml(res) {
    var boundary = '----=_NextPart_SK_' + Date.now().toString(36);
    var base = 'file:///C:/sikaew/';
    var html = res.html.replace(/src="(image\d+\.png)"/g, 'src="' + base + '$1"');
    var out = 'MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="' + boundary + '"; type="text/html"\r\n\r\n' +
      '--' + boundary + '\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ' + base + 'document.htm\r\n\r\n' +
      wrap(btoa(unescape(encodeURIComponent(html)))) + '\r\n';
    res.images.forEach(function (im) {
      out += '--' + boundary + '\r\nContent-Type: image/png\r\nContent-Transfer-Encoding: base64\r\nContent-Location: ' + base + im.name + '\r\n\r\n' +
        wrap(im.data.split(',')[1]) + '\r\n';
    });
    return out + '--' + boundary + '--\r\n';
  }
  function wrap(b64) { return b64.replace(/.{1,76}/g, '$&\r\n'); }

  function download(doc, filename) {
    return build(doc).then(function (res) {
      var blob = new Blob([toMhtml(res)], { type: 'application/msword' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    });
  }

  window.SK = window.SK || {};
  window.SK.wordExport = { build: build, toMhtml: toMhtml, download: download };
})();
