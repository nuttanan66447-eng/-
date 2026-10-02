/*
 * จำลอง Google Apps Script (SpreadsheetApp และบริการที่เกี่ยวข้อง) ให้โค้ดฝั่งเซิร์ฟเวอร์ (Code.gs)
 * ทำงานได้ในเบราว์เซอร์ โดยเก็บข้อมูลชีททั้งหมดไว้ในหน่วยความจำของ Web Worker
 * และบันทึกลง IndexedDB ผ่าน gas-worker.js
 *
 * รองรับเฉพาะเมธอดที่ Code.gs ใช้จริง (getRange, getValues, setValues, appendRow, TextFinder ฯลฯ)
 */
(function (G) {
  'use strict';

  var TZ = 'Asia/Bangkok';

  // ---------- Workbook state ----------
  // sheet = { id, name, rows: [[value]], disp: {"r,c": "display text"}, frozenRows, maxCols }
  var WB = { sheets: [], props: {}, nextId: 1 };

  function sheetObj(s) { return s.__api || (s.__api = new Sheet(s)); }

  function isEmpty(v) { return v === '' || v === null || v === undefined; }

  // ---------- Display formatting (เหมือน getDisplayValues ของ Google Sheets แบบค่าเริ่มต้น) ----------
  function displayOf(v) {
    if (isEmpty(v)) return '';
    if (v instanceof Date) {
      if (isNaN(v.getTime())) return '';
      var hasTime = v.getHours() || v.getMinutes() || v.getSeconds();
      return formatDate(v, TZ, hasTime ? 'd/M/yyyy H:mm:ss' : 'd/M/yyyy');
    }
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') {
      if (!isFinite(v)) return String(v);
      return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e10) / 1e10);
    }
    return String(v);
  }

  // ---------- Utilities.formatDate (รูปแบบ SimpleDateFormat ที่ใช้บ่อย) ----------
  function partsIn(date, tz) {
    try {
      var f = new Intl.DateTimeFormat('en-US', {
        timeZone: tz || TZ, year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', weekday: 'short'
      });
      var o = {};
      f.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
      return { y: +o.year, M: +o.month, d: +o.day, H: +o.hour % 24, m: +o.minute, s: +o.second, E: o.weekday };
    } catch (e) {
      return { y: date.getFullYear(), M: date.getMonth() + 1, d: date.getDate(), H: date.getHours(), m: date.getMinutes(), s: date.getSeconds(), E: '' };
    }
  }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function formatDate(date, tz, pattern) {
    if (!(date instanceof Date)) date = new Date(date);
    if (isNaN(date.getTime())) throw new Error('Invalid date passed to Utilities.formatDate');
    var p = partsIn(date, tz);
    return String(pattern).replace(/'([^']*)'|y+|M+|d+|H+|h+|m+|s+|S+|E+|a/g, function (tok, lit) {
      if (lit !== undefined) return lit;
      var c = tok[0], n = tok.length;
      switch (c) {
        case 'y': return n === 2 ? pad(p.y % 100, 2) : String(p.y);
        case 'M': return n >= 4 ? MONTHS[p.M - 1] : n === 3 ? MONTHS[p.M - 1].slice(0, 3) : pad(p.M, n);
        case 'd': return pad(p.d, n);
        case 'H': return pad(p.H, n);
        case 'h': return pad((p.H % 12) || 12, n);
        case 'm': return pad(p.m, n);
        case 's': return pad(p.s, n);
        case 'S': return pad(date.getMilliseconds(), n);
        case 'E': return p.E;
        case 'a': return p.H < 12 ? 'AM' : 'PM';
      }
      return tok;
    });
  }

  // ---------- A1 notation ----------
  function colToNum(letters) {
    var n = 0;
    for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
    return n;
  }
  function numToCol(n) {
    var s = '';
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function parseA1(a1, sheet) {
    var ref = String(a1).replace(/^.*!/, '').replace(/\$/g, '').toUpperCase();
    var parts = ref.split(':');
    function cell(t) {
      var m = /^([A-Z]*)(\d*)$/.exec(t);
      if (!m) throw new Error('Range not found: ' + a1);
      return { c: m[1] ? colToNum(m[1]) : null, r: m[2] ? +m[2] : null };
    }
    var a = cell(parts[0]), b = parts[1] ? cell(parts[1]) : a;
    var r1 = a.r || 1, c1 = a.c || 1;
    var r2 = b.r || Math.max(sheet.getMaxRows(), 1), c2 = b.c || Math.max(sheet.getMaxColumns(), 1);
    return [r1, c1, r2 - r1 + 1, c2 - c1 + 1];
  }

  // ---------- Range ----------
  function Range(s, row, col, nr, nc) {
    if (!(row >= 1) || !(col >= 1)) throw new Error('ตำแหน่งช่วงข้อมูลไม่ถูกต้อง (แถว ' + row + ', คอลัมน์ ' + col + ')');
    if (!(nr >= 1) || !(nc >= 1)) throw new Error('จำนวนแถวหรือคอลัมน์ในช่วงข้อมูลต้องมากกว่า 0');
    this._s = s; this._r = row; this._c = col; this._nr = nr; this._nc = nc;
  }
  var RP = Range.prototype;
  RP._get = function (r, c) {
    var row = this._s.rows[r - 1];
    var v = row ? row[c - 1] : undefined;
    return isEmpty(v) ? '' : v;
  };
  RP._set = function (r, c, v) {
    var rows = this._s.rows;
    while (rows.length < r) rows.push([]);
    var row = rows[r - 1];
    while (row.length < c) row.push('');
    row[c - 1] = v === undefined || v === null ? '' : v;
    delete this._s.disp[r + ',' + c];
    if (c > this._s.maxCols) this._s.maxCols = c;
  };
  RP.getValues = function () {
    var out = [];
    for (var i = 0; i < this._nr; i++) {
      var row = [];
      for (var j = 0; j < this._nc; j++) row.push(this._get(this._r + i, this._c + j));
      out.push(row);
    }
    return out;
  };
  RP.getDisplayValues = function () {
    var out = [];
    for (var i = 0; i < this._nr; i++) {
      var row = [];
      for (var j = 0; j < this._nc; j++) {
        var key = (this._r + i) + ',' + (this._c + j);
        var d = this._s.disp[key];
        row.push(d !== undefined ? d : displayOf(this._get(this._r + i, this._c + j)));
      }
      out.push(row);
    }
    return out;
  };
  RP.getValue = function () { return this._get(this._r, this._c); };
  RP.getDisplayValue = function () { return this.getDisplayValues()[0][0]; };
  RP.setValues = function (values) {
    if (!Array.isArray(values) || values.length !== this._nr) {
      throw new Error('จำนวนแถวของข้อมูล (' + (values && values.length) + ') ไม่ตรงกับช่วง (' + this._nr + ')');
    }
    for (var i = 0; i < this._nr; i++) {
      if (!Array.isArray(values[i]) || values[i].length !== this._nc) {
        throw new Error('จำนวนคอลัมน์ของข้อมูล (' + (values[i] && values[i].length) + ') ไม่ตรงกับช่วง (' + this._nc + ')');
      }
      for (var j = 0; j < this._nc; j++) this._set(this._r + i, this._c + j, values[i][j]);
    }
    return this;
  };
  RP.setValue = function (v) {
    for (var i = 0; i < this._nr; i++) for (var j = 0; j < this._nc; j++) this._set(this._r + i, this._c + j, v);
    return this;
  };
  RP.clearContent = RP.clearContents = RP.clear = function () { return this.setValue(''); };
  RP.getRow = function () { return this._r; };
  RP.getColumn = function () { return this._c; };
  RP.getNumRows = function () { return this._nr; };
  RP.getNumColumns = function () { return this._nc; };
  RP.getLastRow = function () { return this._r + this._nr - 1; };
  RP.getLastColumn = function () { return this._c + this._nc - 1; };
  RP.getSheet = function () { return sheetObj(this._s); };
  RP.getA1Notation = function () {
    var a = numToCol(this._c) + this._r;
    return this._nr === 1 && this._nc === 1 ? a : a + ':' + numToCol(this._c + this._nc - 1) + (this._r + this._nr - 1);
  };
  RP.getCell = function (r, c) { return new Range(this._s, this._r + r - 1, this._c + c - 1, 1, 1); };
  RP.offset = function (r, c, nr, nc) { return new Range(this._s, this._r + r, this._c + c, nr || this._nr, nc || this._nc); };
  RP.createTextFinder = function (text) { return new TextFinder(this, text); };
  // การจัดรูปแบบ (สี ตัวหนา ความกว้าง) ไม่มีผลต่อข้อมูล จึงรับคำสั่งไว้เฉย ๆ
  ['setFontWeight', 'setBackground', 'setFontColor', 'setFontSize', 'setFontFamily', 'setHorizontalAlignment', 'setVerticalAlignment',
    'setWrap', 'setWrapStrategy', 'setNumberFormat', 'setNumberFormats', 'setBorder', 'setNote', 'setDataValidation', 'setFontWeights',
    'setBackgrounds', 'setFontStyle', 'merge', 'breakApart', 'activate', 'setShowHyperlink'].forEach(function (m) {
    RP[m] = function () { return this; };
  });

  // ---------- TextFinder ----------
  function TextFinder(range, text) { this._range = range; this._text = String(text); this._entire = false; this._case = false; this._i = 0; }
  TextFinder.prototype.matchEntireCell = function (b) { this._entire = !!b; return this; };
  TextFinder.prototype.matchCase = function (b) { this._case = !!b; return this; };
  TextFinder.prototype.useRegularExpression = function () { return this; };
  TextFinder.prototype.findAll = function () {
    var r = this._range, vals = r.getDisplayValues(), out = [];
    var needle = this._case ? this._text : this._text.toLowerCase();
    for (var i = 0; i < vals.length; i++) for (var j = 0; j < vals[i].length; j++) {
      var hay = this._case ? vals[i][j] : String(vals[i][j]).toLowerCase();
      if (this._entire ? hay === needle : (needle && hay.indexOf(needle) > -1)) out.push(new Range(r._s, r._r + i, r._c + j, 1, 1));
    }
    return out;
  };
  TextFinder.prototype.findNext = function () { var all = this.findAll(); return all[this._i++] || null; };

  // ---------- Sheet ----------
  function Sheet(s) { this._s = s; }
  var SP = Sheet.prototype;
  SP.getName = function () { return this._s.name; };
  SP.setName = function (n) { this._s.name = String(n); return this; };
  SP.getSheetId = function () { return this._s.id; };
  SP.getLastRow = function () {
    var rows = this._s.rows;
    for (var i = rows.length - 1; i >= 0; i--) {
      if (rows[i] && rows[i].some(function (v) { return !isEmpty(v); })) return i + 1;
    }
    return 0;
  };
  SP.getLastColumn = function () {
    var max = 0;
    this._s.rows.forEach(function (row) {
      for (var j = (row || []).length - 1; j >= 0; j--) if (!isEmpty(row[j])) { if (j + 1 > max) max = j + 1; break; }
    });
    return max;
  };
  SP.getMaxRows = function () { return Math.max(1000, this._s.rows.length); };
  SP.getMaxColumns = function () { return Math.max(26, this._s.maxCols || 0); };
  SP.getRange = function (a, b, c, d) {
    if (typeof a === 'string') { var p = parseA1(a, this); return new Range(this._s, p[0], p[1], p[2], p[3]); }
    return new Range(this._s, a, b, c === undefined ? 1 : c, d === undefined ? 1 : d);
  };
  SP.getDataRange = function () {
    return new Range(this._s, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  };
  SP.appendRow = function (values) {
    var r = this.getLastRow() + 1;
    new Range(this._s, r, 1, 1, values.length).setValues([values.slice()]);
    return this;
  };
  SP.deleteRow = function (r) { return this.deleteRows(r, 1); };
  SP.deleteRows = function (r, n) {
    if (r < 1) throw new Error('ตำแหน่งแถวไม่ถูกต้อง');
    this._s.rows.splice(r - 1, n || 1);
    shiftDisp(this._s, r, -(n || 1));
    return this;
  };
  SP.insertRowBefore = function (r) { return this.insertRowsBefore(r, 1); };
  SP.insertRowAfter = function (r) { return this.insertRowsBefore(r + 1, 1); };
  SP.insertRowsBefore = function (r, n) {
    var args = [r - 1, 0];
    for (var i = 0; i < n; i++) args.push([]);
    while (this._s.rows.length < r - 1) this._s.rows.push([]);
    Array.prototype.splice.apply(this._s.rows, args);
    shiftDisp(this._s, r, n);
    return this;
  };
  SP.insertRowsAfter = function (r, n) { return this.insertRowsBefore(r + 1, n); };
  SP.insertColumnsAfter = function (c, n) { this._s.maxCols = Math.max(this._s.maxCols || 0, c + n); return this; };
  SP.insertColumnAfter = function (c) { return this.insertColumnsAfter(c, 1); };
  SP.setFrozenRows = function (n) { this._s.frozenRows = n; return this; };
  SP.getFrozenRows = function () { return this._s.frozenRows || 0; };
  SP.clear = SP.clearContents = function () { this._s.rows = []; this._s.disp = {}; return this; };
  SP.getParent = function () { return SPREADSHEET; };
  SP.sort = function (col, asc) {
    var head = this._s.rows.slice(0, this._s.frozenRows || 0), body = this._s.rows.slice(this._s.frozenRows || 0);
    body.sort(function (a, b) { var x = a[col - 1], y = b[col - 1]; return (x > y ? 1 : x < y ? -1 : 0) * (asc === false ? -1 : 1); });
    this._s.rows = head.concat(body); this._s.disp = {};
    return this;
  };
  ['autoResizeColumns', 'autoResizeColumn', 'setColumnWidth', 'setColumnWidths', 'setRowHeight', 'hideSheet', 'showSheet', 'activate',
    'setTabColor', 'setFrozenColumns', 'hideColumns', 'showColumns', 'protect', 'setConditionalFormatRules'].forEach(function (m) {
    SP[m] = function () { return this; };
  });
  function shiftDisp(s, fromRow, delta) {
    var next = {};
    Object.keys(s.disp).forEach(function (k) {
      var rc = k.split(','), r = +rc[0];
      if (r >= fromRow) { var nr = r + delta; if (nr >= fromRow || delta > 0) { if (nr >= 1) next[nr + ',' + rc[1]] = s.disp[k]; } }
      else next[k] = s.disp[k];
    });
    s.disp = next;
  }

  // ---------- Spreadsheet ----------
  var SPREADSHEET = {
    getId: function () { return 'local-workbook'; },
    getName: function () { return WB.title || 'ข้อมูลกองช่าง'; },
    getSheets: function () { return WB.sheets.map(sheetObj); },
    getSheetByName: function (name) {
      var s = WB.sheets.filter(function (x) { return x.name === name; })[0];
      return s ? sheetObj(s) : null;
    },
    getSheetById: function (id) {
      var s = WB.sheets.filter(function (x) { return x.id === id; })[0];
      return s ? sheetObj(s) : null;
    },
    insertSheet: function (name, index) {
      if (typeof name !== 'string') { index = name; name = 'ชีต' + (WB.sheets.length + 1); }
      if (this.getSheetByName(name)) throw new Error('มีชีตชื่อ "' + name + '" อยู่แล้ว');
      var s = { id: WB.nextId++, name: name, rows: [], disp: {}, frozenRows: 0, maxCols: 26 };
      if (typeof index === 'number') WB.sheets.splice(index, 0, s); else WB.sheets.push(s);
      return sheetObj(s);
    },
    deleteSheet: function (sheet) { WB.sheets = WB.sheets.filter(function (x) { return x !== sheet._s; }); },
    getUrl: function () { return ''; },
    toast: function () {}
  };

  // ---------- Services ----------
  G.SpreadsheetApp = {
    openById: function () { return SPREADSHEET; },
    openByUrl: function () { return SPREADSHEET; },
    getActiveSpreadsheet: function () { return SPREADSHEET; },
    flush: function () {},
    newDataValidation: function () {
      var b = { requireValueInList: function () { return b; }, setAllowInvalid: function () { return b; }, build: function () { return {}; } };
      return b;
    }
  };
  G.Utilities = {
    formatDate: formatDate,
    getUuid: function () {
      if (G.crypto && G.crypto.randomUUID) return G.crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) {
        var r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16);
      });
    },
    sleep: function () {},
    base64Encode: function (s) { return btoa(unescape(encodeURIComponent(s))); },
    base64Decode: function (s) { return atob(s); },
    formatString: function (f) { var a = Array.prototype.slice.call(arguments, 1); var i = 0; return String(f).replace(/%[sdif]/g, function () { return String(a[i++]); }); }
  };
  G.Session = {
    getScriptTimeZone: function () { return TZ; },
    getActiveUser: function () { return { getEmail: function () { return ''; } }; },
    getEffectiveUser: function () { return { getEmail: function () { return ''; } }; }
  };
  var LOCK = { tryLock: function () { return true; }, waitLock: function () {}, releaseLock: function () {}, hasLock: function () { return true; } };
  G.LockService = { getScriptLock: function () { return LOCK; }, getDocumentLock: function () { return LOCK; }, getUserLock: function () { return LOCK; } };
  var props = {
    getProperty: function (k) { return Object.prototype.hasOwnProperty.call(WB.props, k) ? WB.props[k] : null; },
    setProperty: function (k, v) { WB.props[k] = String(v); return props; },
    deleteProperty: function (k) { delete WB.props[k]; return props; },
    getProperties: function () { return Object.assign({}, WB.props); },
    setProperties: function (o) { Object.keys(o || {}).forEach(function (k) { WB.props[k] = String(o[k]); }); return props; }
  };
  G.PropertiesService = { getScriptProperties: function () { return props; }, getDocumentProperties: function () { return props; }, getUserProperties: function () { return props; } };
  var cacheStore = {};
  var cache = {
    get: function (k) { var e = cacheStore[k]; return e && e.exp > Date.now() ? e.v : null; },
    put: function (k, v, sec) { cacheStore[k] = { v: String(v), exp: Date.now() + (sec || 600) * 1000 }; },
    remove: function (k) { delete cacheStore[k]; },
    getAll: function (keys) { var o = {}; keys.forEach(function (k) { var v = cache.get(k); if (v !== null) o[k] = v; }); return o; },
    putAll: function (o, sec) { Object.keys(o).forEach(function (k) { cache.put(k, o[k], sec); }); }
  };
  G.CacheService = { getScriptCache: function () { return cache; }, getDocumentCache: function () { return cache; }, getUserCache: function () { return cache; } };
  G.DriveApp = {
    // ไม่มี Google Drive บนเว็บนี้: โค้ดเดิมครอบด้วย try/catch แล้วใช้ชื่อไฟล์จากชีทแทน
    getFileById: function () { throw new Error('เว็บไซต์นี้ไม่ได้เชื่อมต่อ Google Drive'); }
  };
  G.UrlFetchApp = {
    fetch: function (url, opts) {
      opts = opts || {};
      var xhr = new XMLHttpRequest();
      try {
        xhr.open(String(opts.method || 'GET').toUpperCase(), url, false);
        if (opts.payload) xhr.send(typeof opts.payload === 'string' ? opts.payload : JSON.stringify(opts.payload)); else xhr.send();
      } catch (e) {
        if (opts.muteHttpExceptions) return response(0, '');
        throw new Error('ไม่สามารถเชื่อมต่อ ' + url + ' จากเบราว์เซอร์ได้ (เว็บไซต์ปลายทางไม่อนุญาต)');
      }
      if (xhr.status >= 400 && !opts.muteHttpExceptions) throw new Error('Request failed for ' + url + ' returned code ' + xhr.status);
      return response(xhr.status, xhr.responseText);
      function response(code, text) {
        return { getResponseCode: function () { return code; }, getContentText: function () { return text; }, getHeaders: function () { return {}; } };
      }
    }
  };
  G.Logger = { log: function () { if (G.console) console.log.apply(console, arguments); } };
  G.HtmlService = {
    createTemplateFromFile: function () { throw new Error('HtmlService ไม่รองรับบนเว็บนี้'); },
    createHtmlOutputFromFile: function () { throw new Error('HtmlService ไม่รองรับบนเว็บนี้'); },
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL', DEFAULT: 'DEFAULT' }
  };
  G.ContentService = { MimeType: { JSON: 'JSON', TEXT: 'TEXT' } };

  // ---------- API สำหรับ worker ----------
  G.GasEmu = {
    getWorkbook: function () {
      return {
        title: WB.title, props: WB.props, nextId: WB.nextId,
        sheets: WB.sheets.map(function (s) { return { id: s.id, name: s.name, rows: s.rows, disp: s.disp, frozenRows: s.frozenRows, maxCols: s.maxCols }; })
      };
    },
    setWorkbook: function (wb) {
      WB = { title: wb && wb.title, props: (wb && wb.props) || {}, nextId: (wb && wb.nextId) || 1, sheets: [] };
      ((wb && wb.sheets) || []).forEach(function (s) {
        WB.sheets.push({ id: s.id || WB.nextId++, name: s.name, rows: s.rows || [], disp: s.disp || {}, frozenRows: s.frozenRows || 0, maxCols: s.maxCols || 26 });
        if (s.id >= WB.nextId) WB.nextId = s.id + 1;
      });
    },
    displayOf: displayOf,
    formatDate: formatDate
  };
})(typeof self !== 'undefined' ? self : globalThis);
