// บันทึกเอกสารเป็นไฟล์ Word (.docx) ให้หน้าตาเหมือนหน้าพรีวิว (รวมการจัดรูปแบบมาตรฐานและข้อความที่แก้ไขในพรีวิว)
// สร้างจากหน้าพรีวิวที่แสดงอยู่จริง โดยวัดตำแหน่งจากหน้าจอ:
// - ระยะห่างระหว่างบรรทัด/ย่อหน้า เยื้องซ้ายขวา จัดแนว ตามที่เห็นในพรีวิว
// - แถวหัวหนังสือ (ส่วนราชการ ที่ วันที่ เรื่อง) เป็นย่อหน้าเดียวใช้แท็บ + เส้นประใต้ข้อความ (ไม่ตัดคำแบบตาราง)
// - แถวที่วางเรียงกันหลายช่อง (ลงชื่อกรรมการ ฯลฯ) เป็นตารางไร้เส้น, ตารางคงเส้น/ผสานเซลล์ตามเดิม
// - ตราครุฑวางตำแหน่งตายตัวตามมาตรฐาน, แต่ละหน้าเป็น section ที่มีขอบกระดาษของตัวเอง
(function () {
  'use strict';
  var TW = 15;            // 1px (96dpi) = 15 twips
  var EMU = 9525;         // 1px = 9525 EMU
  var FONT = 'TH Sarabun PSK';
  var STD_MARGIN = { top: 1418, right: 1134, bottom: 1134, left: 1701 }; // 2.5 / 2 / 2 / 3 ซม.

  function xesc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }
  function tw(px) { return Math.round(px * TW); }
  function visible(cs) { return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.visibility !== 'collapse'; }
  function hex(color) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(color || '');
    if (!m || (m[4] !== undefined && Number(m[4]) === 0)) return null;
    return [m[1], m[2], m[3]].map(function (v) { return ('0' + Number(v).toString(16)).slice(-2); }).join('').toUpperCase();
  }
  // ย่อหน้าว่างในเซลล์: เล็กที่สุด ให้ความสูงแถวเท่าพรีวิว (ย่อหน้าปกติ 16pt ทำให้แถวสูงเกิน)
  var EMPTY_P = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>';
  var SKIP_TAGS = /^(script|style|button|input|select|textarea|template|noscript|link|meta)$/;

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
        if (!/^data:/.test(el.currentSrc || el.src)) img.crossOrigin = 'anonymous';
        img.src = el.currentSrc || el.src;
      }
    });
  }

  // ---------- ตัวแปลง ----------
  function Builder(doc) {
    this.doc = doc; this.win = doc.defaultView;
    this.images = []; this.jobs = []; this.lh = {}; this.drawId = 1;
  }
  Builder.prototype.cs = function (el) { return this.win.getComputedStyle(el); };
  // กล่องเนื้อหา (ไม่รวม padding/เส้นขอบ)
  Builder.prototype.box = function (el) {
    var r = el.getBoundingClientRect(), cs = this.cs(el);
    var f = function (k) { return parseFloat(cs[k]) || 0; };
    return {
      left: r.left + f('paddingLeft') + f('borderLeftWidth'), right: r.right - f('paddingRight') - f('borderRightWidth'),
      top: r.top + f('paddingTop') + f('borderTopWidth'), bottom: r.bottom - f('paddingBottom') - f('borderBottomWidth')
    };
  };
  // ความสูงบรรทัดจริงของข้อความ (line-height: normal วัดจากตัวอย่าง)
  Builder.prototype.lineHeight = function (cs) {
    var v = parseFloat(cs.lineHeight);
    if (cs.lineHeight !== 'normal' && v > 0) return v;
    var key = cs.fontFamily + '|' + cs.fontSize + '|' + cs.fontWeight;
    if (!this.lh[key]) {
      var d = this.doc.createElement('div');
      d.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;line-height:normal;white-space:nowrap;font-family:' + cs.fontFamily + ';font-size:' + cs.fontSize + ';font-weight:' + cs.fontWeight;
      d.textContent = 'กขคญฎ';
      this.doc.body.appendChild(d);
      this.lh[key] = d.getBoundingClientRect().height || parseFloat(cs.fontSize) * 1.2;
      d.remove();
    }
    return this.lh[key];
  };
  Builder.prototype.rPr = function (cs, u) {
    var sz = Math.max(2, Math.round(parseFloat(cs.fontSize) * 1.5));
    var bold = parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === 'bold';
    var x = '<w:rPr><w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '" w:eastAsia="' + FONT + '" w:cs="' + FONT + '"/>';
    if (bold) x += '<w:b/><w:bCs/>';
    if (cs.fontStyle === 'italic') x += '<w:i/><w:iCs/>';
    var under = u || (/underline/.test(cs.textDecorationLine) ? (cs.textDecorationStyle === 'dotted' ? 'dotted' : 'single') : '');
    if (/line-through/.test(cs.textDecorationLine)) x += '<w:strike/>';
    var c = hex(cs.color);
    if (c && c !== '000000' && c !== '111827' && c !== '0B1C30') x += '<w:color w:val="' + c + '"/>';
    x += '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>';
    if (under) x += '<w:u w:val="' + under + '"/>';
    return x + '</w:rPr>';
  };
  // เส้นใต้แบบช่องกรอก (มีแค่เส้นล่าง) — เส้นกรอบตาราง/กล่องไม่นับ
  Builder.prototype.underlineOf = function (cs) {
    var s = cs.borderBottomStyle;
    if (!s || s === 'none' || !(parseFloat(cs.borderBottomWidth) > 0)) return '';
    if (/^table/.test(cs.display)) return '';
    var side = function (k) { return cs['border' + k + 'Style'] !== 'none' && parseFloat(cs['border' + k + 'Width']) > 0; };
    if (side('Top') || side('Left') || side('Right')) return '';
    return s === 'dotted' ? 'dotted' : s === 'dashed' ? 'dash' : 'single';
  };

  // เส้นขอบด้านเดียว (เส้นบรรทัด) ของกล่อง ที่ไม่ใช่กรอบ
  Builder.prototype.lineBorder = function (cs, side) {
    if (/^table/.test(cs.display)) return '';
    var on = function (k) { return cs['border' + k + 'Style'] !== 'none' && cs['border' + k + 'Style'] !== 'hidden' && parseFloat(cs['border' + k + 'Width']) > 0; };
    if (!on(side) || on('Left') || on('Right')) return '';
    var st = cs['border' + side + 'Style'];
    return st === 'dotted' ? 'dotted' : st === 'dashed' ? 'dashed' : st === 'double' ? 'double' : 'single';
  };

  // ข้อความ/รูปในบรรทัด -> runs [{t, rpr} | {br} | {img}]
  Builder.prototype.runs = function (nodes, u, out) {
    var self = this;
    out = out || [];
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var t = n.nodeValue.replace(/[\s​]+/g, function (m) { return / /.test(m) ? m.replace(/[^ ]/g, '') || ' ' : ' '; });
        if (!t) return;
        var pcs = self.cs(n.parentElement);
        if (pcs.whiteSpace === 'pre' || pcs.whiteSpace === 'pre-wrap') t = n.nodeValue;
        out.push({ t: t, rpr: self.rPr(pcs, u) });
        return;
      }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if (SKIP_TAGS.test(tag) || n.classList.contains('sk-std-garuda')) return;
      if (tag === 'br') { out.push({ br: true }); return; }
      var cs = self.cs(n);
      if (!visible(cs)) return;
      if (tag === 'img' || tag === 'svg') { var im = self.image(n); if (im) out.push({ img: im }); return; }
      self.runs(Array.prototype.slice.call(n.childNodes), self.underlineOf(cs) || u, out);
    });
    return out;
  };
  Builder.prototype.runsXml = function (runs) {
    // ตัดช่องว่างหัว/ท้ายย่อหน้า
    var list = runs.slice();
    while (list.length && list[0].t !== undefined && !list[0].t.trim()) list.shift();
    while (list.length && list[list.length - 1].t !== undefined && !list[list.length - 1].t.trim()) list.pop();
    if (list.length && list[0].t !== undefined) list[0] = { t: list[0].t.replace(/^ +/, ''), rpr: list[0].rpr };
    var last = list.length - 1;
    if (last >= 0 && list[last].t !== undefined) list[last] = { t: list[last].t.replace(/ +$/, ''), rpr: list[last].rpr };
    // รวม run ที่รูปแบบเดียวกัน
    var merged = [];
    list.forEach(function (r) {
      var p = merged[merged.length - 1];
      if (r.t !== undefined && p && p.t !== undefined && p.rpr === r.rpr) p.t += r.t;
      else merged.push(r.t !== undefined ? { t: r.t, rpr: r.rpr } : r);
    });
    return merged.map(function (r) {
      if (r.br) return '<w:r><w:br/></w:r>';
      if (r.img) return '<w:r>' + r.img + '</w:r>';
      if (r.tab) return '<w:r>' + (r.rpr || '') + '<w:tab/></w:r>';
      var text = r.t.replace(/\.{10,}/g, function (m) { return m.slice(0, Math.floor(m.length * 0.8)); });
      return '<w:r>' + r.rpr + '<w:t xml:space="preserve">' + xesc(text.replace(/ {2,}/g, function (m) { return ' ' + new Array(m.length).join(' '); })) + '</w:t></w:r>';
    }).join('');
  };
  Builder.prototype.hasContent = function (runs) {
    return runs.some(function (r) { return r.img || (r.t !== undefined && r.t.replace(/\s/g, '')); });
  };

  Builder.prototype.image = function (el, anchor) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return '';
    var n = this.images.length + 1, entry = { name: 'image' + n + '.png', rid: 'rIdImg' + n, data: null };
    this.images.push(entry);
    this.jobs.push(rasterize(el, r.width, r.height).then(function (d) { entry.data = d; }));
    var cx = Math.round(r.width * EMU), cy = Math.round(r.height * EMU), id = this.drawId++;
    var graphic = '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="' + entry.name + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + entry.rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>';
    if (anchor) {
      return '<w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="' + (251658240 + id) + '" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="1">' +
        '<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="margin"><wp:posOffset>' + Math.round(anchor.x * EMU) + '</wp:posOffset></wp:positionH>' +
        '<wp:positionV relativeFrom="margin"><wp:posOffset>' + Math.round(anchor.y * EMU) + '</wp:posOffset></wp:positionV>' +
        '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="' + id + '" name="Picture ' + id + '"/><wp:cNvGraphicFramePr/>' + graphic + '</wp:anchor></w:drawing>';
    }
    return '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="' + id + '" name="Picture ' + id + '"/><wp:cNvGraphicFramePr/>' + graphic + '</wp:inline></w:drawing>';
  };

  Builder.prototype.isBlockish = function (el) {
    if (el.nodeType !== 1) return false;
    var tag = el.tagName.toLowerCase();
    if (tag === 'br') return false;
    var d = this.cs(el).display;
    return !/^inline/.test(d) || d === 'inline-block' || d === 'inline-flex' || d === 'inline-grid' || d === 'inline-table';
  };
  Builder.prototype.hasBlockKids = function (el) {
    var self = this;
    return Array.prototype.some.call(el.children, function (k) {
      if (SKIP_TAGS.test(k.tagName.toLowerCase())) return false;
      var cs = self.cs(k);
      return visible(cs) && self.isBlockish(k) && !k.classList.contains('sk-std-garuda');
    });
  };
  // ข้อความในกล่องกว้างแค่ไหน (วัดจากข้อความจริง ไม่ใช่ความกว้างกล่อง)
  Builder.prototype.textRect = function (el) {
    var rg = this.doc.createRange();
    rg.selectNodeContents(el);
    var rects = Array.prototype.filter.call(rg.getClientRects(), function (r) { return r.width > 0 && r.height > 0; });
    if (!rects.length) return el.getBoundingClientRect();
    return rects.reduce(function (a, r) { return { left: Math.min(a.left, r.left), right: Math.max(a.right, r.right), top: Math.min(a.top, r.top), bottom: Math.max(a.bottom, r.bottom) }; },
      { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
  };

  // จำนวนบรรทัดของข้อความในกล่อง (นับตำแหน่งบรรทัดที่ต่างกัน)
  Builder.prototype.lines = function (el) {
    var rg = this.doc.createRange();
    rg.selectNodeContents(el);
    var tops = [];
    Array.prototype.forEach.call(rg.getClientRects(), function (r) {
      if (r.width < 1 || r.height < 1) return;
      var mid = (r.top + r.bottom) / 2;
      if (!tops.some(function (t) { return Math.abs(t - mid) < 6; })) tops.push(mid);
    });
    return tops.length;
  };

  // ตำแหน่งบรรทัดของข้อความ (กล่องข้อความของฟอนต์ไทยสูงกว่าบรรทัด จึงปรับเป็นความสูงบรรทัดจริง)
  Builder.prototype.lineRect = function (range, cs, fallback) {
    var lh = this.lineHeight(cs), tops = [];
    Array.prototype.forEach.call(range.getClientRects(), function (r) {
      if (r.width < 1 || r.height < 1) return;
      var mid = (r.top + r.bottom) / 2;
      if (!tops.some(function (t) { return Math.abs(t - mid) < 6; })) tops.push(mid);
    });
    if (!tops.length) return fallback || range.getBoundingClientRect();
    var a = Math.min.apply(null, tops), b = Math.max.apply(null, tops);
    var rr = range.getBoundingClientRect();
    return { left: rr.left, right: rr.right, top: a - lh / 2, bottom: b + lh / 2 };
  };

  // ---------- ย่อหน้า ----------
  // item = { kind:'p', top, bottom, runs, pPr:{...} } | { kind:'tbl', top, bottom, xml }
  Builder.prototype.para = function (el, cs, ref, runs, rect, extra) {
    extra = extra || {};
    var lh = this.lineHeight(cs);
    var own = extra.box || (el ? this.box(el) : rect);
    var p = {
      kind: 'p', top: rect.top, bottom: rect.bottom, runs: runs,
      line: lh, jc: '', indL: Math.max(0, own.left - ref.left), indR: Math.max(0, ref.right - own.right),
      first: extra.noIndent ? 0 : (parseFloat(cs.textIndent) || 0), tabs: extra.tabs || null, bdr: extra.bdr || '', anchor: '', keep: extra.keep
    };
    var ta = cs.textAlign;
    p.jc = ta === 'center' || ta === '-webkit-center' ? 'center' : (ta === 'right' || ta === 'end' || ta === '-webkit-right') ? 'right' : ta === 'justify' ? 'thaiDistribute' : '';
    return p;
  };
  Builder.prototype.pXml = function (p, before, sect) {
    // บรรทัดเดียวในพรีวิว: เผื่อที่ด้านข้างเล็กน้อย กันข้อความล้นไปบรรทัดใหม่ใน Word (ตัวอักษรกว้างกว่าบนหน้าจอเล็กน้อย)
    if (p.single && p.jc !== 'thaiDistribute') {
      var slack = 24;
      if (p.jc === 'center') { var s2 = Math.min(slack, p.indL, p.indR); p.indL -= s2; p.indR -= s2; }
      else if (p.jc === 'right') p.indL = Math.max(0, p.indL - slack);
      else p.indR = Math.max(0, p.indR - slack);
    }
    var x = '<w:pPr>';
    if (p.keep) x += '<w:keepNext/>';
    if (p.bdr || p.bdrTop) {
      var bl = function (side, v) { return v ? '<w:' + side + ' w:val="' + v + '" w:sz="4" w:space="1" w:color="000000"/>' : ''; };
      // ย่อหน้าติดกันที่มีเส้นแบบเดียวกัน Word รวมเป็นกล่องเดียว: ใส่เส้น between ให้ทุกบรรทัดยังมีเส้น
      x += '<w:pBdr>' + bl('top', p.bdrTop) + bl('bottom', p.bdr) + bl('between', p.bdrTop || p.bdr) + '</w:pBdr>';
    }
    if (p.tabs && p.tabs.length) x += '<w:tabs>' + p.tabs.map(function (t) { return '<w:tab w:val="' + t.val + '" w:pos="' + tw(t.pos) + '"/>'; }).join('') + '</w:tabs>';
    // ย่อหน้าที่มีรูป (เช่น ตราครุฑในหน้าของระบบหลัก): ระยะบรรทัด "อย่างน้อย" ให้รูปสูงได้เต็มขนาด
    var hasImg = p.runs && p.runs.some(function (r) { return r.img; });
    x += '<w:spacing w:before="' + Math.max(0, tw(before)) + '" w:after="0" w:line="' + Math.max(120, tw(p.line)) + '" w:lineRule="' + (hasImg ? 'atLeast' : 'exact') + '"/>';
    var ind = '';
    if (p.indL > 0.5) ind += ' w:left="' + tw(p.indL) + '"';
    if (p.indR > 0.5) ind += ' w:right="' + tw(p.indR) + '"';
    if (p.first > 0.5) ind += ' w:firstLine="' + tw(p.first) + '"';
    else if (p.first < -0.5) ind += ' w:hanging="' + tw(-p.first) + '"';
    if (ind) x += '<w:ind' + ind + '/>';
    if (p.jc) x += '<w:jc w:val="' + p.jc + '"/>';
    x += '<w:rPr><w:rFonts w:cs="' + FONT + '"/></w:rPr>';
    if (sect) x += sect;
    x += '</w:pPr>';
    return '<w:p>' + x + (p.anchor ? '<w:r>' + p.anchor + '</w:r>' : '') + this.runsXml(p.runs) + '</w:p>';
  };

  // เนื้อหาในกล่อง -> รายการย่อหน้า/ตาราง
  Builder.prototype.flow = function (el, ref, items) {
    var self = this;
    items = items || [];
    if (!this.hasBlockKids(el)) {
      var runs = this.runs(Array.prototype.slice.call(el.childNodes), '');
      if (this.hasContent(runs)) {
        var rg0 = this.doc.createRange(); rg0.selectNodeContents(el);
        var lp = this.para(el, this.cs(el), ref, runs, this.lineRect(rg0, this.cs(el), this.box(el)));
        lp.single = this.lines(el) <= 1; items.push(lp);
      }
      return items;
    }
    var pending = [];
    var flush = function () {
      if (!pending.length) return;
      var runs = self.runs(pending, '');
      if (self.hasContent(runs)) {
        var rg = self.doc.createRange();
        rg.setStartBefore(pending[0]); rg.setEndAfter(pending[pending.length - 1]);
        items.push(self.para(el, self.cs(el), ref, runs, self.lineRect(rg, self.cs(el))));
      }
      pending = [];
    };
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) { pending.push(n); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if (SKIP_TAGS.test(tag) || n.classList.contains('sk-std-garuda')) return;
      var cs = self.cs(n);
      if (!visible(cs)) return;
      if (!self.isBlockish(n)) { pending.push(n); return; }
      flush();
      self.block(n, ref, items);
    });
    flush();
    return items;
  };

  Builder.prototype.block = function (el, ref, items) {
    var cs = this.cs(el), tag = el.tagName.toLowerCase();
    if (cs.position === 'absolute' || cs.position === 'fixed') return items;
    if (tag === 'table') { items.push(this.table(el, ref)); return items; }
    if (tag === 'img' || tag === 'svg') {
      var r = el.getBoundingClientRect(), im = this.image(el);
      if (im) items.push(this.para(null, this.cs(el.parentElement), ref, [{ img: im }], r, { box: r, noIndent: true }));
      return items;
    }
    if (el.__skTitle) return this.title(el, ref, items);
    if (/flex|grid/.test(cs.display)) {
      var rows = this.rowsOf(el);
      if (rows.some(function (rr) { return rr.cells.length > 1; })) {
        var self = this;
        rows.forEach(function (row) {
          if (row.cells.length > 1 && self.tabbable(row.cells)) items.push(self.tabLine(el, row.cells, ref));
          else if (row.cells.length > 1) items.push(self.layoutTable(row.cells, ref));
          else self.block(row.cells[0], ref, items);
        });
        return items;
      }
    }
    var start = items.length;
    this.flow(el, ref, items);
    var bt = this.lineBorder(cs, 'Top'), bb = this.lineBorder(cs, 'Bottom');
    // บรรทัดว่างที่มีเส้น (ช่องให้เขียน) -> ย่อหน้าว่างที่มีเส้น สูงเท่าในพรีวิว
    if (items.length === start && (bt || bb)) {
      var bx = el.getBoundingClientRect();
      if (bx.height > 2 && bx.width > 10) {
        var ep = this.para(null, cs, ref, [], { top: bx.top, bottom: bx.bottom }, { box: { left: bx.left, right: bx.right }, noIndent: true });
        ep.line = Math.max(4, bx.height - 2);
        ep.bdr = bb; ep.bdrTop = bt;
        items.push(ep);
      }
      return items;
    }
    // เส้นบน/ล่างของกล่อง -> เส้นของย่อหน้าแรก/สุดท้าย
    if (items.length > start) {
      if (bt && items[start].kind === 'p') items[start].bdrTop = bt;
      if (bb && items[items.length - 1].kind === 'p') items[items.length - 1].bdr = bb;
    }
    return items;
  };

  // ลูกที่วางเรียงซ้ายไปขวาในแถวเดียวกัน
  Builder.prototype.rowsOf = function (el) {
    var self = this;
    var kids = Array.prototype.filter.call(el.children, function (k) {
      if (SKIP_TAGS.test(k.tagName.toLowerCase())) return false;
      var cs = self.cs(k), r = k.getBoundingClientRect();
      return visible(cs) && cs.position !== 'absolute' && r.width > 0 && r.height > 0;
    });
    var rows = [];
    kids.forEach(function (k) {
      var r = k.getBoundingClientRect();
      var row = rows.filter(function (rr) { return r.top < rr.bottom - 2 && r.bottom > rr.top + 2; })[0];
      if (!row) rows.push(row = { top: r.top, bottom: r.bottom, cells: [] });
      row.bottom = Math.max(row.bottom, r.bottom);
      row.cells.push(k);
    });
    rows.forEach(function (rr) { rr.cells.sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; }); });
    return rows;
  };
  // แถวข้อความบรรทัดเดียวทุกช่อง -> ย่อหน้าเดียวใช้แท็บ (ป้ายกับค่าไม่ตัดคำผิดที่เหมือนตาราง)
  Builder.prototype.tabbable = function (cells) {
    var self = this;
    return cells.every(function (c, i) {
      if (self.hasBlockKids(c) || c.querySelector('img,svg,table')) return false;
      return i === cells.length - 1 || self.lines(c) <= 1;
    });
  };
  Builder.prototype.tabLine = function (rowEl, cells, ref) {
    var self = this, runs = [], tabs = [], maxLine = 0, base = null;
    var last = cells[cells.length - 1], wrap = this.lines(last) > 1;
    var lastRect = last.getBoundingClientRect();
    cells.forEach(function (c, i) {
      var cs = self.cs(c), r = c.getBoundingClientRect(), t = self.textRect(c), u = self.underlineOf(cs);
      maxLine = Math.max(maxLine, self.lineHeight(cs));
      if (!base || parseFloat(cs.fontSize) < parseFloat(base.fontSize)) base = cs;
      if (i > 0) {
        var prev = cells[i - 1], pt = self.textRect(prev), pu = self.underlineOf(self.cs(prev));
        var startX = u ? r.left : t.left;
        if (wrap && i === cells.length - 1) runs.push({ tab: true, rpr: '' }); // ไปที่ระยะเยื้องบรรทัดถัดไป
        else if (!pu && startX - pt.right < 14) runs.push({ t: ' ', rpr: self.rPr(cs, '') });
        else {
          tabs.push({ val: 'left', pos: startX - ref.left });
          runs.push({ tab: true, rpr: pu ? self.rPr(self.cs(prev), pu) : '' });
        }
      }
      self.runs(Array.prototype.slice.call(c.childNodes), u, runs);
      if (i === cells.length - 1 && u) {
        tabs.push({ val: 'right', pos: ref.right - ref.left });
        runs.push({ tab: true, rpr: self.rPr(cs, u) });
      }
    });
    var first = cells[0], fu = this.underlineOf(this.cs(first));
    var left = fu ? first.getBoundingClientRect().left : this.textRect(first).left;
    var box = this.box(rowEl);
    var p = this.para(null, base, ref, runs, { top: box.top, bottom: box.bottom }, { box: { left: left, right: ref.right }, tabs: tabs, noIndent: true });
    p.line = maxLine;
    p.jc = '';
    if (wrap) {
      // ค่าที่ยาวหลายบรรทัด: บรรทัดถัดไปเริ่มตรงตำแหน่งค่า (เยื้องแขวน)
      var valueX = (this.underlineOf(this.cs(last)) ? lastRect.left : this.textRect(last).left) - ref.left;
      p.first = -(valueX - p.indL);
      p.indL = valueX;
    }
    return p;
  };
  // แถวหลายช่อง -> ตารางไร้เส้น
  Builder.prototype.layoutTable = function (cells, ref) {
    var self = this, rects = cells.map(function (c) { return c.getBoundingClientRect(); });
    var top = Math.min.apply(null, rects.map(function (r) { return r.top; })), bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
    var ind = Math.max(0, rects[0].left - ref.left);
    var widths = rects.map(function (r, i) { return Math.max(10, (i < rects.length - 1 ? rects[i + 1].left : Math.max(r.right, ref.right)) - r.left); });
    var xml = '<w:tbl><w:tblPr><w:tblW w:w="' + tw(widths.reduce(function (a, b) { return a + b; }, 0)) + '" w:type="dxa"/>' + (ind > 0.5 ? '<w:tblInd w:w="' + tw(ind) + '" w:type="dxa"/>' : '') +
      '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>' +
      '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>' +
      widths.map(function (w) { return '<w:gridCol w:w="' + tw(w) + '"/>'; }).join('') + '</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>';
    cells.forEach(function (c, i) {
      var cb = { left: rects[i].left, right: rects[i].left + widths[i], top: rects[i].top, bottom: rects[i].bottom };
      var inner = self.box(c);
      cb.top = inner.top;
      var body = self.itemsXml(self.block(c, { left: cb.left, right: cb.right }, []), cb.top, null);
      xml += '<w:tc><w:tcPr><w:tcW w:w="' + tw(widths[i]) + '" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders></w:tcPr>' + (body || EMPTY_P) + '</w:tc>';
    });
    xml += '</w:tr></w:tbl>';
    return { kind: 'tbl', top: top, bottom: bottom, xml: xml };
  };
  // ตารางที่มีเส้น: สร้างคอลัมน์จากตำแหน่งขอบเซลล์จริง รองรับผสานเซลล์
  Builder.prototype.table = function (el, ref) {
    var self = this, tr = el.getBoundingClientRect();
    var rows = Array.prototype.filter.call(el.rows, function (row) { var r = row.getBoundingClientRect(); return r.height > 0 && visible(self.cs(row)); });
    var xs = [];
    var addX = function (x) { if (!xs.some(function (v) { return Math.abs(v - x) < 2; })) xs.push(x); };
    rows.forEach(function (row) { Array.prototype.forEach.call(row.cells, function (td) { var r = td.getBoundingClientRect(); addX(r.left); addX(r.right); }); });
    xs.sort(function (a, b) { return a - b; });
    var col = function (x) { var best = 0; xs.forEach(function (v, i) { if (Math.abs(v - x) < Math.abs(xs[best] - x)) best = i; }); return best; };
    var grid = xs.slice(1).map(function (x, i) { return Math.max(1, x - xs[i]); });
    var ind = Math.max(0, xs[0] - ref.left);
    var cont = {}; // rowIndex -> [{start, span, tcPr}]
    var b = function (cs, side) {
      var w = parseFloat(cs['border' + side + 'Width']), s = cs['border' + side + 'Style'];
      if (!w || s === 'none' || s === 'hidden') return '<w:' + side.toLowerCase() + ' w:val="nil"/>';
      return '<w:' + side.toLowerCase() + ' w:val="' + (s === 'dotted' ? 'dotted' : s === 'dashed' ? 'dashed' : s === 'double' ? 'double' : 'single') + '" w:sz="' + Math.max(2, Math.round(w * 0.75 * 8)) + '" w:space="0" w:color="' + (hex(cs['border' + side + 'Color']) || '000000') + '"/>';
    };
    var xml = '<w:tbl><w:tblPr><w:tblW w:w="' + tw(xs[xs.length - 1] - xs[0]) + '" w:type="dxa"/>' + (ind > 0.5 ? '<w:tblInd w:w="' + tw(ind) + '" w:type="dxa"/>' : '') +
      '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>' +
      grid.map(function (w) { return '<w:gridCol w:w="' + tw(w) + '"/>'; }).join('') + '</w:tblGrid>';
    rows.forEach(function (row, ri) {
      var rr = row.getBoundingClientRect(), list = (cont[ri] || []).slice();
      Array.prototype.forEach.call(row.cells, function (td) {
        var cs = self.cs(td), r = td.getBoundingClientRect();
        if (!r.width) return;
        var s = col(r.left), e = col(r.right), span = Math.max(1, e - s);
        var inner = self.box(td);
        var va = cs.verticalAlign === 'middle' ? 'center' : cs.verticalAlign === 'bottom' ? 'bottom' : 'top';
        var fill = hex(cs.backgroundColor);
        var pr = '<w:tcW w:w="' + tw(xs[e] - xs[s]) + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '');
        var tail = '<w:tcBorders>' + b(cs, 'Top') + b(cs, 'Left') + b(cs, 'Bottom') + b(cs, 'Right') + '</w:tcBorders>' +
          (fill && fill !== 'FFFFFF' ? '<w:shd w:val="clear" w:color="auto" w:fill="' + fill + '"/>' : '') +
          '<w:tcMar><w:top w:w="' + tw(parseFloat(cs.paddingTop)) + '" w:type="dxa"/><w:left w:w="' + tw(parseFloat(cs.paddingLeft)) + '" w:type="dxa"/><w:bottom w:w="' + tw(parseFloat(cs.paddingBottom)) + '" w:type="dxa"/><w:right w:w="' + tw(parseFloat(cs.paddingRight)) + '" w:type="dxa"/></w:tcMar>' +
          '<w:vAlign w:val="' + va + '"/>';
        var items = self.flow(td, { left: inner.left, right: inner.right }, []);
        var body = self.itemsXml(items, va === 'top' ? inner.top : null, null);
        var vm = '';
        if (td.rowSpan > 1) {
          vm = '<w:vMerge w:val="restart"/>';
          for (var k = 1; k < td.rowSpan; k++) (cont[ri + k] = cont[ri + k] || []).push({ start: s, xml: '<w:tc><w:tcPr>' + pr + '<w:vMerge/>' + tail + '</w:tcPr><w:p/></w:tc>' });
        }
        list.push({ start: s, xml: '<w:tc><w:tcPr>' + pr + vm + tail + '</w:tcPr>' + (body || EMPTY_P) + '</w:tc>' });
      });
      list.sort(function (a, c) { return a.start - c.start; });
      xml += '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="' + tw(rr.height) + '" w:hRule="atLeast"/>' + (row.parentElement && row.parentElement.tagName === 'THEAD' ? '<w:tblHeader/>' : '') + '</w:trPr>' +
        list.map(function (x) { return x.xml; }).join('') + '</w:tr>';
    });
    xml += '</w:tbl>';
    return { kind: 'tbl', top: tr.top, bottom: tr.bottom, xml: xml };
  };

  // หัว "บันทึกข้อความ" + ตราครุฑ (วางตายตัวที่มุมซ้ายบนของขอบกระดาษ)
  Builder.prototype.title = function (el, ref, items) {
    var page = el.__skPage, garuda = page.querySelector('.sk-std-garuda');
    var t = el.__skTitleText || el;
    var cs = this.cs(t), rect = this.textRect(t);
    var runs = this.runs(Array.prototype.slice.call(t.childNodes), '');
    var p = this.para(null, cs, ref, runs, rect, { box: { left: ref.left, right: ref.right }, noIndent: true });
    p.jc = 'center';
    var lh = parseFloat(cs.lineHeight);
    if (lh > 0) { p.line = lh; var r = t.getBoundingClientRect(); p.top = r.top; p.bottom = r.bottom; }
    if (garuda) {
      var g = garuda.getBoundingClientRect();
      p.anchor = this.image(garuda, { x: g.left - ref.left, y: g.top - ref.top });
    }
    items.push(p);
    return items;
  };

  // รายการ -> XML (ระยะห่างก่อนแต่ละย่อหน้า = ระยะห่างจริงในพรีวิว)
  Builder.prototype.itemsXml = function (items, startTop, sect) {
    var self = this, out = '', prevBottom = startTop, carry = 0;
    items.forEach(function (it, i) {
      var gap = prevBottom === null || prevBottom === undefined ? 0 : it.top - prevBottom;
      var isLast = i === items.length - 1;
      if (it.kind === 'p') {
        out += self.pXml(it, Math.max(0, gap) + carry, isLast ? sect : null);
        carry = 0;
      } else {
        // ช่องว่างก่อนตาราง: ย่อหน้าว่างที่สูงเท่าช่องว่าง
        if (gap > 2) out += '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="' + Math.max(20, tw(gap)) + '" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
        out += it.xml;
        if (isLast && sect) out += '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>' + sect + '<w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
        carry = 0;
      }
      prevBottom = it.bottom;
    });
    if (!items.length && sect) out += '<w:p><w:pPr>' + sect + '</w:pPr></w:p>';
    return out;
  };

  // หน้ากระดาษในเอกสาร = กล่องที่กว้างประมาณ A4 ชั้นในสุด
  function pagesOf(doc) {
    var all = Array.prototype.filter.call(doc.body.querySelectorAll('section, div, article'), function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 690 && r.width < 1200 && r.height > 150;
    });
    // กล่องที่มีสัดส่วนกระดาษ A4 (ตั้งหรือนอน) คือหน้ากระดาษ — กล่องย่อยข้างในไม่นับเป็นหน้าใหม่
    var paper = all.filter(function (el) {
      var r = el.getBoundingClientRect(), q = Math.max(r.width, r.height) / Math.min(r.width, r.height);
      return Math.abs(q - 1.414) < 0.12;
    });
    if (paper.length) return paper.filter(function (el) { return !paper.some(function (o) { return o !== el && o.contains(el); }); });
    return all.filter(function (el) { return !all.some(function (o) { return o !== el && el.contains(o); }); });
  }

  function build(doc) {
    var b = new Builder(doc), win = doc.defaultView;
    var pages = pagesOf(doc);
    if (!pages.length) pages = [doc.body];
    // หัวบันทึกข้อความที่จัดมาตรฐานแล้ว
    Array.prototype.forEach.call(doc.querySelectorAll('.sk-std'), function (page) {
      var t = Array.prototype.filter.call(page.querySelectorAll('div,p,span,h1,h2,h3'), function (e) { return !e.children.length && e.textContent.trim() === 'บันทึกข้อความ'; })[0];
      if (!t) return;
      var box = t;
      while (box.parentElement && box.parentElement !== page && box.parentElement.children.length === 1) box = box.parentElement;
      box.__skTitle = true; box.__skPage = page; box.__skTitleText = t;
    });
    var body = '';
    pages.forEach(function (page, i) {
      var cs = win.getComputedStyle(page), r = page.getBoundingClientRect();
      var landscape = r.width > r.height * 1.1 && r.width > 1000;
      var std = page.classList.contains('sk-std');
      var pad = function (k) { return parseFloat(cs[k]) || 0; };
      var m = std ? STD_MARGIN : {
        top: Math.max(340, tw(pad('paddingTop'))), right: Math.max(340, tw(pad('paddingRight'))),
        bottom: Math.max(340, tw(pad('paddingBottom'))), left: Math.max(340, tw(pad('paddingLeft')))
      };
      var W = landscape ? 16838 : 11906, H = landscape ? 11906 : 16838;
      var sect = '<w:sectPr><w:pgSz w:w="' + W + '" w:h="' + H + '"' + (landscape ? ' w:orient="landscape"' : '') + '/>' +
        '<w:pgMar w:top="' + m.top + '" w:right="' + m.right + '" w:bottom="' + m.bottom + '" w:left="' + m.left + '" w:header="709" w:footer="709" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>';
      var ref = { left: r.left + m.left / TW, right: r.right - m.right / TW, top: r.top + m.top / TW };
      if (!std) { var bx = b.box(page); ref = { left: bx.left, right: bx.right, top: bx.top }; }
      var items = b.flow(page, ref, []);
      body += b.itemsXml(items, ref.top, i < pages.length - 1 ? sect : null);
      if (i === pages.length - 1) body += sect;
    });
    return Promise.all(b.jobs).then(function () {
      var imgs = b.images.filter(function (im) { return im.data; });
      return { files: docxFiles(body, imgs) };
    });
  }

  // ---------- แพ็กเป็นไฟล์ .docx ----------
  function docxFiles(body, imgs) {
    var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    var head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    var fonts = '<w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '" w:eastAsia="' + FONT + '" w:cs="' + FONT + '"/>';
    var files = [
      { name: '[Content_Types].xml', text: head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>' },
      { name: '_rels/.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
        imgs.map(function (im) { return '<Relationship Id="' + im.rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + im.name + '"/>'; }).join('') + '</Relationships>' },
      { name: 'word/styles.xml', text: head + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>' + fonts + '<w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="th-TH" w:eastAsia="en-US" w:bidi="th-TH"/></w:rPr></w:rPrDefault>' +
        '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
        '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>' },
      { name: 'word/settings.xml', text: head + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/>' +
        '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat><w:themeFontLang w:val="en-US" w:bidi="th-TH"/></w:settings>' },
      { name: 'word/document.xml', text: head + '<w:document ' + NS + '><w:body>' + body + '</w:body></w:document>' }
    ];
    imgs.forEach(function (im) { files.push({ name: 'word/media/' + im.name, data: b64bytes(im.data.split(',')[1]) }); });
    return files;
  }
  function b64bytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }

  // ZIP (แบบไม่บีบอัด) สำหรับ .docx
  var CRC = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(a) { var c = 0xFFFFFFFF; for (var i = 0; i < a.length; i++) c = CRC[(c ^ a[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    var d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var data = f.data || enc.encode(f.text), name = enc.encode(f.name), crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var size = central.reduce(function (s, a) { return s + a.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  function toBlob(doc) { return build(doc).then(function (res) { return zip(res.files); }); }
  function download(doc, filename) {
    return toBlob(doc).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = /\.docx$/.test(filename) ? filename : filename.replace(/\.doc$/, '') + '.docx';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    });
  }

  window.SK = window.SK || {};
  window.SK.wordExport = { build: build, toBlob: toBlob, download: download };
})();
