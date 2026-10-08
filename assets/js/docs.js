// เอกสารราชการ: Smart Editor (พรีวิว/แก้ไขข้อความ/พิมพ์/บันทึก Word) + ประวัติเอกสาร
// ทุกเอกสารที่สร้างเก็บสำเนา HTML ไว้ในประวัติ (SK.store.data.documents) — สร้างซ้ำแบบ+โครงการ+สัปดาห์/งวดเดียวกัน แทนที่ฉบับเดิม
(function () {
  'use strict';
  var SK = window.SK, esc = SK.esc, icon = SK.icon;

  function userName() { return (SK.cloud && SK.cloud.active && SK.cloud.displayName()) || ''; }
  function docs() { return SK.store.list('documents'); }

  // ชื่อเอกสารภาษาไทยสำหรับแสดง
  function docName(d) {
    if (!d) return '';
    var t = String(d.title || '');
    if (t && !/\.(html|docx?|pdf|xlsx?)$/i.test(t) && !/^sikaew-/.test(t)) return t;
    var def = SK.engine && SK.engine.doc(d.docKey);
    return (def ? def.title : t.replace(/\.[^.]+$/, '')) + (d.variant ? ' ' + d.variant : '');
  }
  function historyType(doc) {
    var t = (doc.group || '') + ' ' + doc.title;
    return /ตรวจรับ|ส่งมอบ|ผลทดสอบ/.test(t) ? 'inspection' : /ราคากลาง|ปร\.|TOR/.test(t) ? 'estimate' : 'order';
  }
  function variantOf(doc, html) {
    var text = String(html).replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    var m = /ประจำสัปดาห์(?:ที่)?\s*([0-9๐-๙]+)/.exec(text) || /สัปดาห์ที่\s*([0-9๐-๙]+)/.exec(text);
    if (m) return 'สัปดาห์ที่ ' + SK.arabic(m[1]);
    if (/งวด|ตรวจรับ/.test(doc.title + ' ' + (doc.desc || ''))) {
      m = /งวดที่\s*([0-9๐-๙]+)/.exec(text);
      if (m) return 'งวดที่ ' + SK.arabic(m[1]);
    }
    return '';
  }
  function saveHistory(doc, project, html, entry) {
    var now = new Date(), stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '');
    var name = 'sikaew-' + doc.key + (project ? '-' + project.id.toLowerCase() : '') + '-' + stamp + '.html';
    var file = new File([html], name, { type: 'text/html' });
    return SK.store.files.put(file).then(function (fileId) {
      var variant = entry ? entry.variant : variantOf(doc, html);
      var regenerated = !entry;
      if (!entry) entry = docs().filter(function (d) {
        return d.docKey === doc.key && (d.projectId || '') === (project ? project.id : '') && (d.variant || '') === variant;
      })[0];
      if (entry) {
        entry.fileId = fileId; entry.fileSize = file.size; entry.fileName = name; entry.updatedAt = now.toISOString(); entry.updatedBy = userName();
        entry.edited = !regenerated;
        entry.date = SK.todayIso();
        var list = docs(), at = list.indexOf(entry);
        if (at > 0) { list.splice(at, 1); list.unshift(entry); }
      } else {
        entry = {
          id: 'DOC-' + stamp.slice(2) + Math.random().toString(36).slice(2, 4).toUpperCase(), type: historyType(doc), variant: variant,
          title: doc.title + (variant ? ' ' + variant : '') + (project ? ' — ' + project.name : ''),
          detail: doc.desc || '', projectId: project ? project.id : '', status: 'approved', format: 'html', fileId: fileId,
          docKey: doc.key, fileName: name, fileSize: file.size, owner: userName(), date: SK.todayIso(), createdAt: now.toISOString()
        };
        docs().unshift(entry);
      }
      SK.store.save();
      window.dispatchEvent(new CustomEvent('sk:documents'));
      return entry;
    }).catch(function (err) { console.warn('บันทึกประวัติเอกสารไม่สำเร็จ', err); return null; });
  }
  function readHtml(entry) {
    return SK.store.files.get(entry.fileId).then(function (rec) {
      if (!rec) throw new Error('ไม่พบสำเนาเอกสารในระบบ');
      return rec.blob.text ? rec.blob.text() : new Response(rec.blob).text();
    });
  }
  function removeEntry(entry) {
    var d = SK.store.data;
    d.documents = docs().filter(function (x) { return x !== entry; });
    SK.store.save();
    window.dispatchEvent(new CustomEvent('sk:documents'));
  }
  function snapshotDoc(d) {
    var root = d.documentElement.cloneNode(true);
    root.setAttribute('data-sk-std', '1'); // จัดรูปแบบมาตรฐานแล้ว
    root.style.zoom = '';
    // ส่วนช่วยแสดงผลของตัวแก้ไข (เส้นขอบกระดาษ/ตัวแบ่งหน้า) ไม่เก็บลงสำเนา
    Array.prototype.forEach.call(root.querySelectorAll('.sk-guide,.sk-break,#sk-paper-css'), function (x) { x.remove(); });
    var body = root.querySelector('body'); if (body) body.removeAttribute('contenteditable');
    Array.prototype.forEach.call(root.querySelectorAll('.sk-paper'), function (x) { x.classList.remove('sk-paper'); });
    Array.prototype.forEach.call(root.querySelectorAll('script'), function (x) { x.remove(); });
    return '<!DOCTYPE html>' + root.outerHTML;
  }

  // ---------- มุมมองหน้ากระดาษ: กระดาษแต่ละแผ่น เส้นขอบเขตการพิมพ์ (ระยะขอบ) และตัวแบ่งหน้า ----------
  var MM = 96 / 25.4;
  function paperPages(d) {
    var boxes = Array.prototype.filter.call(d.body.querySelectorAll('section, div, article'), function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 690 && r.width < 1200 && r.height > 400;
    });
    // แผ่นกระดาษ = กล่องสัดส่วน A4 (ตั้ง/นอน) ชั้นนอกสุด; ไม่มีเลย = กล่องสูงชั้นในสุด
    var a4 = boxes.filter(function (el) { var r = el.getBoundingClientRect(), q = Math.max(r.width, r.height) / Math.min(r.width, r.height); return Math.abs(q - 1.414) < 0.14; });
    if (a4.length) return a4.filter(function (el) { return !a4.some(function (o) { return o !== el && o.contains(el); }); });
    return boxes.filter(function (el) { return !boxes.some(function (o) { return o !== el && el.contains(o); }); }).slice(0, 1);
  }
  function decoratePages(d) {
    Array.prototype.forEach.call(d.querySelectorAll('.sk-guide,.sk-break'), function (x) { x.remove(); });
    if (!d.getElementById('sk-paper-css')) {
      var st = d.createElement('style'); st.id = 'sk-paper-css';
      st.textContent = '@media screen{html,body{background:#e9eef7!important}.sk-paper{background:#fff!important;box-shadow:0 1px 3px rgba(15,23,42,.14),0 10px 30px rgba(15,23,42,.10)!important;margin:0 auto 22px!important}' +
        '.sk-guide{position:absolute;pointer-events:none;border:1px dashed rgba(0,97,148,.35);border-radius:2px;z-index:5}' +
        '.sk-break{position:absolute;left:0;right:0;height:0;border-top:2px dashed rgba(186,26,26,.55);pointer-events:none;z-index:6}' +
        '.sk-break span{position:absolute;right:6px;top:-11px;background:#ba1a1a;color:#fff;font:600 11px Sarabun,sans-serif;padding:1px 8px;border-radius:999px}}' +
        '@media print{.sk-guide,.sk-break{display:none!important}}';
      d.head.appendChild(st);
    }
    var win = d.defaultView;
    paperPages(d).forEach(function (page) {
      page.classList.add('sk-paper');
      var cs = win.getComputedStyle(page);
      if (cs.position === 'static') page.style.position = 'relative';
      var landscape = page.offsetWidth > page.offsetHeight * 1.1 && page.offsetWidth > 1000;
      var pageH = (landscape ? 210 : 297) * MM;
      var pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0, pb = parseFloat(cs.paddingBottom) || 0, pl = parseFloat(cs.paddingLeft) || 0;
      var mk = function (cls, css, html) { var x = d.createElement('div'); x.className = cls; x.setAttribute('contenteditable', 'false'); x.setAttribute('aria-hidden', 'true'); x.style.cssText = css; if (html) x.innerHTML = html; page.appendChild(x); return x; };
      // เส้นขอบเขตการพิมพ์ (ระยะขอบกระดาษ) ของแผ่นแรก
      if (pt || pl) mk('sk-guide', 'top:' + pt + 'px;left:' + pl + 'px;right:' + pr + 'px;height:' + Math.max(0, Math.min(page.offsetHeight, pageH) - pt - pb) + 'px');
      // เนื้อหายาวเกิน 1 แผ่น: แสดงตำแหน่งขึ้นหน้าใหม่
      for (var n = 1; n * pageH < page.offsetHeight - 8; n++) mk('sk-break', 'top:' + Math.round(n * pageH) + 'px', '<span>หน้า ' + (n + 1) + '</span>');
    });
  }
  // แผ่นที่สูงตายตัว (เช่น รายงานผลแนวนอน) แต่เนื้อหายาวเกินแผ่น: ย่อตัวอักษรในแผ่นนั้นจนพอดี ลายเซ็นไม่ตกขอบ/ไม่ล้นไปหน้าใหม่ใน Word
  function fitOverflow(d) {
    var win = d.defaultView;
    paperPages(d).forEach(function (page) {
      var els = Array.prototype.filter.call(page.querySelectorAll('*'), function (e) { return !e.closest('.sk-guide,.sk-break'); });
      var bottom = function () {
        var top = page.getBoundingClientRect().top, b = 0;
        els.forEach(function (e) { if (e.children.length && e.tagName !== 'TD' && e.tagName !== 'TH') return; var r = e.getBoundingClientRect(); if (r.height && r.bottom - top > b) b = r.bottom - top; });
        return b;
      };
      var limit = page.offsetHeight - 4;
      if (bottom() <= limit) return;
      els.forEach(function (e) { if (!e.dataset.skFs) e.dataset.skFs = parseFloat(win.getComputedStyle(e).fontSize) || 16; });
      for (var f = 0.97; f >= 0.7; f -= 0.03) {
        els.forEach(function (e) { e.style.setProperty('font-size', (e.dataset.skFs * f).toFixed(2) + 'px', 'important'); });
        if (bottom() <= limit) break;
      }
    });
  }
  // ป้ายหัวบันทึก/ตราครุฑ: แก้ไม่ได้ (กด Backspace แล้วข้อความไม่รวมเข้ากับป้าย หัวบันทึกไม่เสียรูป)
  function protectLabels(d) {
    var LABEL = /^(บันทึกข้อความ|ส่วนราชการ|ที่|วันที่|เรื่อง|เรียน|สิ่งที่ส่งมาด้วย|อ้างถึง)$/;
    Array.prototype.forEach.call(d.querySelectorAll('b, strong, span, div, p, h1, h2'), function (el) {
      if (!el.children.length && LABEL.test((el.textContent || '').replace(/\s+/g, ' ').trim())) el.setAttribute('contenteditable', 'false');
    });
    Array.prototype.forEach.call(d.querySelectorAll('img, svg'), function (g) { g.setAttribute('contenteditable', 'false'); });
  }

  // Backspace/Delete ข้างป้ายที่ล็อกไว้ ไม่ให้ลบป้ายหรือดึงข้อความไปรวมกับป้าย
  function isLocked(n) { return n.nodeType === 1 && n.getAttribute('contenteditable') === 'false'; }
  function blank(t) { return !/[^\s\u00a0\u200b]/.test(t || ''); }
  function hitsLocked(n, back) {
    // true = ตัวถัดไปที่จะถูกลบเป็นป้ายที่ล็อกไว้, false = เป็นข้อความธรรมดา, null = ว่าง (ดูต่อ)
    for (; n; n = back ? n.previousSibling : n.nextSibling) {
      if (n.nodeType === 3) { if (!blank(n.data)) return false; continue; }
      if (n.nodeType !== 1) continue;
      if (isLocked(n)) return !n.classList.contains('sk-guide') && !n.classList.contains('sk-break');
      if (blank(n.textContent) && !n.querySelector('img,svg')) continue;
      var r = hitsLocked(back ? n.lastChild : n.firstChild, back);
      if (r !== null) return r;
    }
    return null;
  }
  // Enter แบบ Word: บรรทัดใหม่ห่างเท่าระยะบรรทัดปกติ ไม่พาระยะเว้นก่อนย่อหน้า/ความสูงของกล่องเดิมไปด้วย
  function tidyNewLine(d) {
    var sel = d.getSelection(); if (!sel || !sel.rangeCount) return;
    var n = sel.getRangeAt(0).startContainer; if (n.nodeType === 3) n = n.parentNode;
    var win = d.defaultView, block = n;
    while (block && block !== d.body && !/^(block|list-item|flex|grid|table-cell)$/.test(win.getComputedStyle(block).display)) block = block.parentNode;
    if (!block || block === d.body || /^(TD|TH|SECTION|BODY)$/.test(block.tagName) || block.classList.contains('sk-paper')) return;
    ['margin-top', 'padding-top', 'margin-bottom', 'padding-bottom'].forEach(function (k) { block.style.setProperty(k, '0', 'important'); });
    block.style.setProperty('min-height', '0', 'important');
    block.style.removeProperty('height');
  }
  function guardKey(d, e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      // ช่องในแถว ป้าย|ข้อความ (เรื่อง/เรียน/สิ่งที่ส่งมาด้วย ฯลฯ): ขึ้นบรรทัดใหม่ในช่องเดิม ไม่สร้างช่องใหม่ไปอยู่ใต้ป้าย
      var s0 = d.getSelection(), win = d.defaultView;
      if (s0 && s0.rangeCount) {
        var b = s0.getRangeAt(0).startContainer; if (b.nodeType === 3) b = b.parentNode;
        while (b && b !== d.body && !/^(block|list-item|flex|grid|table-cell)$/.test(win.getComputedStyle(b).display)) b = b.parentNode;
        var inRow = function (x) { return x && x !== d.body && /flex|grid/.test(win.getComputedStyle(x).display); };
        if (b && b !== d.body && (inRow(b) || inRow(b.parentNode))) { e.preventDefault(); d.execCommand('insertLineBreak'); }
      }
      return;
    }
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    var sel = d.getSelection(); if (!sel || !sel.rangeCount) return;
    var rg = sel.getRangeAt(0), back = e.key === 'Backspace';
    if (!rg.collapsed) {
      var hit = Array.prototype.some.call(d.querySelectorAll('[contenteditable=false]'), function (x) { return !x.classList.contains('sk-guide') && !x.classList.contains('sk-break') && rg.intersectsNode(x); });
      if (hit) { e.preventDefault(); SK.toast('ป้ายหัวเอกสาร (เช่น ที่ วันที่ เรื่อง) แก้ไขไม่ได้ — เลือกเฉพาะข้อความที่ต้องการลบ', 'info'); }
      return;
    }
    var node = rg.startContainer, off = rg.startOffset, start;
    if (node.nodeType === 3) {
      if (!blank(back ? node.data.slice(0, off) : node.data.slice(off))) return;
      start = back ? node.previousSibling : node.nextSibling;
    } else start = back ? node.childNodes[off - 1] : node.childNodes[off];
    var r = hitsLocked(start, back);
    for (var cur = node; r === null && cur && cur !== d.body; cur = cur.parentNode) r = hitsLocked(back ? cur.previousSibling : cur.nextSibling, back);
    if (r === true) e.preventDefault();
  }

  // ---------- Smart Editor ----------
  // editor(box, { doc, project, html, entry(Promise|obj), onBack, compact }) วาดตัวแก้ไขเอกสารลงในกล่อง
  function editor(box, o) {
    var doc = o.doc || { key: 'doc', title: 'เอกสาร' }, project = o.project || null;
    var guard = '<script>window.__skPrint=window.print;window.print=function(){};window.close=function(){};<\/script>' +
      '<style>html{background:#e9eef7}body{margin:0 auto!important}@media screen{body{padding:18px 0!important}}[contenteditable],body{caret-color:#006194}::selection{background:#cce5ff}</style>';
    var html2 = /<head[^>]*>/i.test(o.html) ? o.html.replace(/<head[^>]*>/i, function (h) { return h + guard; }) : guard + o.html;
    var b = function (cmd, ic, label) { return '<button type="button" data-cmd="' + cmd + '" title="' + label + '" aria-label="' + label + '" class="icon-btn w-8 h-8">' + icon(ic, 'text-[19px]') + '</button>'; };
    var sep = '<span class="w-px h-6 bg-[rgba(100,116,139,0.18)] mx-1"></span>';
    var sizes = [12, 14, 15, 16, 18, 20, 22, 24, 29];
    box.innerHTML =
      '<div class="flex flex-col gap-3">' +
        '<div class="flex flex-wrap items-center gap-2">' +
          (o.onBack ? '<button type="button" data-back class="btn-glass">' + icon('arrow_back') + '<span>กลับไปแก้ไขข้อมูล</span></button>' : '') +
          '<span class="chip-green">' + icon('check_circle', 'text-[14px]') + 'สร้างเอกสารแล้ว • แก้ไขบนเอกสารได้ทันที (บันทึกอัตโนมัติ)</span>' +
          '<span data-saved class="font-body-sm text-body-sm text-outline"></span>' +
          '<span class="flex-1"></span>' +
          '<button type="button" data-word class="btn-glass">' + icon('description') + '<span>บันทึกเป็น Word</span></button>' +
          '<button type="button" data-print class="btn-primary">' + icon('print') + '<span>พิมพ์ / บันทึก PDF</span></button>' +
        '</div>' +
        // แถบเครื่องมือแบบ Word: แก้ไขบนหน้าเอกสารได้ทันที
        '<div class="card px-3 py-2 flex flex-wrap items-center gap-1 sticky top-[72px] z-20">' +
          '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low font-label-md text-label-md text-on-surface-variant">' + icon('text_fields', 'text-[16px]') + 'TH Sarabun PSK</span>' +
          '<label class="sr-only" for="ed-size">ขนาดตัวอักษร</label><select id="ed-size" data-size class="input !w-auto !py-1 !px-3 !rounded-full">' +
            '<option value="">ขนาด</option>' + sizes.map(function (n) { return '<option value="' + n + '">' + n + ' pt</option>'; }).join('') + '</select>' + sep +
          b('bold', 'format_bold', 'ตัวหนา (Ctrl+B)') + b('italic', 'format_italic', 'ตัวเอียง (Ctrl+I)') + b('underline', 'format_underlined', 'ขีดเส้นใต้ (Ctrl+U)') + b('strikeThrough', 'strikethrough_s', 'ขีดฆ่า') +
          '<label class="icon-btn w-8 h-8 relative cursor-pointer" title="สีตัวอักษร">' + icon('format_color_text', 'text-[19px]') + '<input type="color" data-color="foreColor" value="#000000" class="absolute inset-0 opacity-0 cursor-pointer" aria-label="สีตัวอักษร"/></label>' +
          '<label class="icon-btn w-8 h-8 relative cursor-pointer" title="ไฮไลต์">' + icon('ink_highlighter', 'text-[19px]') + '<input type="color" data-color="hiliteColor" value="#fff59d" class="absolute inset-0 opacity-0 cursor-pointer" aria-label="สีไฮไลต์"/></label>' + sep +
          b('justifyLeft', 'format_align_left', 'ชิดซ้าย') + b('justifyCenter', 'format_align_center', 'กึ่งกลาง') + b('justifyRight', 'format_align_right', 'ชิดขวา') + b('justifyFull', 'format_align_justify', 'กระจายแบบไทย') + sep +
          b('insertUnorderedList', 'format_list_bulleted', 'สัญลักษณ์แสดงหัวข้อย่อย') + b('insertOrderedList', 'format_list_numbered', 'ลำดับเลข') + b('outdent', 'format_indent_decrease', 'ลดการเยื้อง') + b('indent', 'format_indent_increase', 'เพิ่มการเยื้อง') +
          '<label class="sr-only" for="ed-line">ระยะบรรทัด</label><select id="ed-line" data-line class="input !w-auto !py-1 !px-3 !rounded-full" title="ระยะบรรทัด"><option value="">ระยะบรรทัด</option><option value="1">1.0</option><option value="1.15">1.15</option><option value="1.5">1.5</option><option value="2">2.0</option></select>' + sep +
          b('removeFormat', 'format_clear', 'ล้างรูปแบบ') + b('undo', 'undo', 'เลิกทำ (Ctrl+Z)') + b('redo', 'redo', 'ทำซ้ำ (Ctrl+Y)') +
          '<span class="flex-1"></span>' +
          '<div class="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container-low">' +
            '<button type="button" data-zoom="-1" class="icon-btn w-7 h-7" aria-label="ย่อ">' + icon('remove', 'text-[16px]') + '</button>' +
            '<span data-zoomlabel class="font-label-md text-label-md w-12 text-center">100%</span>' +
            '<button type="button" data-zoom="1" class="icon-btn w-7 h-7" aria-label="ขยาย">' + icon('add', 'text-[16px]') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="rounded-[28px] bg-[#e9eef7] shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)] overflow-x-auto">' +
          '<iframe title="เอกสาร" class="block w-full border-0" style="height:900px"></iframe>' +
        '</div>' +
      '</div>';
    var iframe = box.querySelector('iframe'), dirty = false, zoom = 1, entryP = Promise.resolve(o.entry || null), saveTimer = null;
    var savedEl = box.querySelector('[data-saved]');
    function keepEdits() {
      clearTimeout(saveTimer);
      if (!dirty) return;
      dirty = false;
      var html = snapshotDoc(iframe.contentDocument);
      entryP = entryP.then(function (entry) { return entry ? saveHistory(doc, project, html, entry) : null; }).then(function (e) {
        if (e) savedEl.textContent = 'บันทึกการแก้ไขแล้ว ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        return e;
      });
    }
    // เอกสารสูงเท่าเนื้อหา: เลื่อนเฉพาะหน้าเว็บ (ไม่มีแถบเลื่อนซ้อน)
    function fit() {
      var d = iframe.contentDocument; if (!d || !d.documentElement) return;
      d.documentElement.style.zoom = zoom;
      var h = Math.max(d.documentElement.scrollHeight, d.body ? d.body.scrollHeight : 0);
      iframe.style.height = Math.max(420, Math.min(h + 4, 60000)) + 'px';
      box.querySelector('[data-zoomlabel]').textContent = Math.round(zoom * 100) + '%';
    }
    function exec(cmd, val) {
      var d = iframe.contentDocument; if (!d) return;
      iframe.contentWindow.focus();
      try { d.execCommand('styleWithCSS', false, true); } catch (e) {}
      d.execCommand(cmd, false, val == null ? null : val);
      dirty = true; schedule();
    }
    function schedule() { clearTimeout(saveTimer); saveTimer = setTimeout(keepEdits, 1500); setTimeout(fit, 50); }
    function blockOfSelection() {
      var w = iframe.contentWindow, sel = w.getSelection();
      if (!sel || !sel.rangeCount) return null;
      var n = sel.getRangeAt(0).startContainer;
      if (n.nodeType === 3) n = n.parentNode;
      return n.closest ? n.closest('p,div,li,td,h1,h2,h3') : null;
    }
    iframe.addEventListener('load', function () {
      var d = iframe.contentDocument;
      // มาตรฐานการพิมพ์หนังสือราชการ (assets/js/doc-standard.js) — สำเนาในประวัติที่จัดแล้วไม่ต้องจัดซ้ำ
      if (!d.documentElement.hasAttribute('data-sk-std')) { try { if (SK.docStandard) SK.docStandard.apply(d); } catch (e) { console.warn('จัดรูปแบบมาตรฐานไม่สำเร็จ', e); } }
      protectLabels(d);
      d.body.setAttribute('contenteditable', 'true');
      d.body.setAttribute('spellcheck', 'false');
      fitOverflow(d);
      decoratePages(d);
      d.addEventListener('keydown', function (e) { guardKey(d, e); });
      d.addEventListener('input', function (e) { if (e.inputType === 'insertParagraph') tidyNewLine(d); dirty = true; schedule(); });
      var deco = null;
      d.addEventListener('keyup', function () { setTimeout(fit, 30); clearTimeout(deco); deco = setTimeout(function () { decoratePages(d); }, 600); });
      var w = iframe.clientWidth;
      zoom = w && w < 830 ? Math.max(0.4, Math.floor((w - 24) / 794 * 20) / 20) : 1;
      fit();
      setTimeout(fit, 400);
      setTimeout(fit, 1500);
    });
    box.addEventListener('mousedown', function (e) { if (e.target.closest('[data-cmd],[data-zoom]')) e.preventDefault(); }); // ไม่ให้เสียตำแหน่งเคอร์เซอร์ในเอกสาร
    box.addEventListener('click', function (e) {
      var c = e.target.closest('[data-cmd]');
      if (c) { exec(c.dataset.cmd); return; }
      var z = e.target.closest('[data-zoom]');
      if (z) { zoom = Math.max(0.4, Math.min(2, Math.round((zoom + 0.1 * z.dataset.zoom) * 10) / 10)); fit(); }
    });
    box.querySelector('[data-size]').addEventListener('change', function () {
      var pt = this.value; this.value = ''; if (!pt) return;
      var d = iframe.contentDocument;
      exec('fontSize', 7);
      Array.prototype.forEach.call(d.querySelectorAll('font[size="7"], span[style*="xxx-large"]'), function (x) { x.removeAttribute('size'); x.style.fontSize = pt + 'pt'; });
    });
    box.querySelector('[data-line]').addEventListener('change', function () {
      var v = this.value; this.value = ''; if (!v) return;
      var blk = blockOfSelection(); if (blk) { blk.style.setProperty('line-height', v, 'important'); dirty = true; schedule(); }
    });
    box.querySelectorAll('[data-color]').forEach(function (inp) { inp.addEventListener('input', function () { exec(inp.dataset.color, inp.value); }); });
    var fileBase = 'sikaew-' + doc.key + (project ? '-' + project.id.toLowerCase() : '') + '-' + SK.todayIso();
    box.querySelector('[data-word]').addEventListener('click', function () {
      if (!SK.wordExport) return SK.toast('ไม่พบตัวสร้างไฟล์ Word', 'error');
      keepEdits();
      var z = zoom; zoom = 1; fit();
      SK.toast('กำลังสร้างไฟล์ Word...');
      SK.wordExport.download(iframe.contentDocument, fileBase + '.docx').then(function () { SK.toast('ดาวน์โหลดไฟล์ Word แล้ว', 'success'); },
        function (err) { SK.toast('สร้างไฟล์ Word ไม่สำเร็จ: ' + (err && err.message || err), 'error'); }).then(function () { zoom = z; fit(); });
    });
    box.querySelector('[data-print]').addEventListener('click', function () {
      keepEdits();
      var w = iframe.contentWindow, z = zoom;
      zoom = 1; fit();
      w.focus();
      (w.__skPrint || w.print).call(w);
      setTimeout(function () { zoom = z; fit(); }, 500);
    });
    var back = box.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { keepEdits(); o.onBack(); });
    iframe.srcdoc = html2;
    return { leave: function () { keepEdits(); }, entry: function () { return entryP; } };
  }

  // เอกสารในหน้าต่างลอย (เปิดจากประวัติ หรือพิมพ์จากหน้าของระบบหลัก)
  function previewModal(o) {
    var box = document.createElement('div'), ed = null;
    SK.modal({
      title: o.title || docName(o.entry) || (o.doc && o.doc.title) || 'เอกสาร', subtitle: o.project ? o.project.name : '', icon: 'description', size: 'xl', body: box,
      onClose: function () { if (ed) ed.leave(); }
    });
    ed = editor(box, o);
  }
  function reopen(entry) {
    return readHtml(entry).then(function (html) {
      var doc = (SK.engine && SK.engine.doc(entry.docKey)) || { key: entry.docKey || 'doc', title: docName(entry) };
      previewModal({ doc: doc, project: entry.projectId ? SK.projects.byId(entry.projectId) : null, html: html, entry: entry, title: docName(entry) });
    }).catch(function (err) { SK.toast(err.message || String(err), 'error'); });
  }

  // รายการประวัติเอกสาร (ใช้หลายหน้า)
  function historyList(list, opts) {
    opts = opts || {};
    if (!list.length) return '<p class="muted font-body-sm text-body-sm py-2">' + (opts.empty || 'ยังไม่มีเอกสาร') + '</p>';
    return '<ol class="relative flex flex-col gap-3 ' + (opts.timeline === false ? '' : 'pl-4 border-l-2 border-surface-container-high') + '">' + list.map(function (d) {
      var p = d.projectId && SK.projects.byId(d.projectId);
      return '<li class="relative">' + (opts.timeline === false ? '' : '<span class="absolute -left-[23px] top-2 w-3 h-3 rounded-full bg-primary ring-4 ring-white"></span>') +
        '<div class="flex items-start gap-2"><button type="button" data-open-doc="' + esc(d.id) + '" class="min-w-0 flex-1 text-left rounded-xl px-2 py-1 -mx-2 hover:bg-surface-container-low">' +
        '<span class="block font-label-lg text-label-lg font-semibold text-on-surface line-clamp-2">' + esc(docName(d)) + '</span>' +
        '<span class="block font-body-sm text-body-sm text-outline">' + (d.updatedBy || d.owner ? 'โดย ' + esc(d.updatedBy || d.owner) + ' • ' : '') + esc(SK.timeAgo(d.updatedAt || d.createdAt) || SK.dateShort(d.date)) +
        (opts.project !== false && p ? ' • ' + esc(p.id) : '') + (d.edited ? ' • แก้ไขข้อความแล้ว' : '') + '</span></button>' +
        (opts.remove ? '<button type="button" data-del-doc="' + esc(d.id) + '" class="icon-btn w-8 h-8 shrink-0" aria-label="ลบเอกสาร">' + icon('delete', 'text-[18px]') + '</button>' : '') +
        '</div></li>';
    }).join('') + '</ol>';
  }
  // การ์ดประวัติเอกสาร (แบบเดียวกันทุกหน้า): พับเก็บได้ จำสถานะแยกตาม key
  function histState(key, v) {
    var k = 'sk-hist-' + (key || 'docs');
    try { if (v === undefined) return localStorage.getItem(k) !== '0'; localStorage.setItem(k, v ? '1' : '0'); } catch (e) { return true; }
  }
  function historyCard(list, opts) {
    opts = opts || {};
    var open = histState(opts.key), shown = opts.limit ? list.slice(0, opts.limit) : list;
    return '<details data-hist-key="' + esc(opts.key || 'docs') + '" class="card group ' + (opts.cls || '') + '"' + (open ? ' open' : '') + '>' +
      '<summary class="list-none cursor-pointer card-pad flex flex-wrap items-center gap-3 select-none">' +
        '<h2 class="card-title flex-1 flex-wrap">' + icon('history') + (opts.title || 'ประวัติเอกสาร') + ' <span class="chip-blue">' + list.length + '</span>' + (opts.chip ? '<span class="chip-gray">' + esc(opts.chip) + '</span>' : '') + '</h2>' +
        (opts.more || '') +
        '<span data-hist-label class="font-label-md text-label-md text-primary">' + (open ? 'พับเก็บ' : 'แสดง') + '</span>' + icon('expand_more', 'text-primary transition-transform group-open:rotate-180') + '</summary>' +
      '<div class="px-5 md:px-space-lg pb-5 -mt-2 max-h-[420px] overflow-y-auto">' + historyList(shown, { remove: opts.remove !== false, timeline: false, project: opts.project, empty: opts.empty }) + '</div></details>';
  }
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || !d.matches || !d.matches('details[data-hist-key]')) return;
    histState(d.dataset.histKey, d.open);
    var lab = d.querySelector('[data-hist-label]'); if (lab) lab.textContent = d.open ? 'พับเก็บ' : 'แสดง';
  }, true);

  // ปุ่มในรายการประวัติ (คลิกที่ใดก็ได้ในหน้า)
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open-doc]');
    if (o) { var d = docs().filter(function (x) { return x.id === o.dataset.openDoc; })[0]; if (d) reopen(d); return; }
    var del = e.target.closest('[data-del-doc]');
    if (del) {
      var x = docs().filter(function (y) { return y.id === del.dataset.delDoc; })[0];
      if (x) SK.confirm('ลบ "' + docName(x) + '" ออกจากประวัติเอกสาร?', 'ลบ', 'danger').then(function (ok) { if (ok) { removeEntry(x); SK.toast('ลบเอกสารแล้ว', 'success'); } });
    }
  });

  // ผลการพิมพ์จากหน้าของระบบหลักที่เปิดในเว็บ: แสดงใน Smart Editor
  if (SK.engine) SK.engine.onOutput = function (html) { previewModal({ html: html, title: 'เอกสารจากระบบหลัก' }); };

  SK.docs = { docName: docName, saveHistory: saveHistory, reopen: reopen, editor: editor, previewModal: previewModal, historyList: historyList, historyCard: historyCard, readHtml: readHtml, list: docs };
})();
