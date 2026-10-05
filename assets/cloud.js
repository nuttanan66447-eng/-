// ซิงก์ข้อมูลกับ Supabase (ฐานข้อมูลบนคลาวด์) เมื่อเจ้าหน้าที่เข้าสู่ระบบ
// - ข้อมูลหน้าเว็บ (SK.db) เก็บในตาราง records ทีละรายการ ส่งขึ้นเฉพาะรายการที่เปลี่ยน
// - ชีทของระบบเอกสาร v184 (IndexedDB ของ gas-worker) เก็บทั้งเล่มในตาราง workbooks
// - ไฟล์แนบเก็บใน Storage bucket "files"
// ไม่ได้เข้าสู่ระบบ: ทำงานแบบเดิม (ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้)
// ต้องโหลดหลัง data.js, ui.js, gas-bridge.js และก่อน realdata.js
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, esc = ui.esc;
  var cfg = (window.SK_CONFIG || {}).supabase || {};
  var cloud = SK.cloud = { enabled: !!(cfg.url && cfg.key && window.supabase), active: false, user: null, staff: null, status: 'off', lastSync: null };
  if (!cloud.enabled) return;
  // ตัวสร้างเอกสารใน iframe ไม่ต้องซิงก์เอง (หน้าเว็บหลักรับการแจ้งเตือนผ่าน BroadcastChannel)
  if (/[?&]engine=1/.test(location.search)) { cloud.enabled = false; return; }

  var sb = cloud.client = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'sikaew-auth' }
  });
  var NS = 'sikaew-cloud:' + cfg.url.replace(/^https?:\/\//, '') + ':';
  var BASE_KEY = NS + 'base', WB_KEY = NS + 'wb';

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function errText(e) { return (e && (e.message || e.error_description || e.error)) || String(e); }
  function timeout(p, ms, label) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error(label || 'หมดเวลาเชื่อมต่อ')); }, ms); })]);
  }
  function check(r) { if (r.error) throw r.error; return r.data; }

  // ---------- สถานะบนหัวหน้าเว็บ ----------
  var STATUS = {
    off: ['cloud_off', 'ยังไม่ได้เข้าสู่ระบบคลาวด์ (ข้อมูลอยู่ในเครื่องนี้)', 'text-on-surface-variant'],
    loading: ['cloud_sync', 'กำลังโหลดข้อมูลจากคลาวด์...', 'text-primary animate-pulse'],
    syncing: ['cloud_upload', 'กำลังบันทึกขึ้นคลาวด์...', 'text-primary animate-pulse'],
    ok: ['cloud_done', 'ข้อมูลซิงก์กับคลาวด์แล้ว', 'text-emerald-700'],
    error: ['cloud_alert', 'ซิงก์ไม่สำเร็จ — ข้อมูลยังอยู่ในเครื่องนี้ จะลองใหม่ภายหลัง', 'text-error'],
    denied: ['no_accounts', 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้ข้อมูลคลาวด์', 'text-error']
  };
  var statusBtn = null;
  function setStatus(s, detail) {
    cloud.status = s;
    cloud.statusDetail = detail ? errText(detail) : '';
    if (s === 'ok') cloud.lastSync = new Date();
    if (!statusBtn) return;
    var st = STATUS[s] || STATUS.off;
    statusBtn.className = 'relative p-2 rounded-full hover:bg-surface-container transition-colors ' + st[2];
    statusBtn.title = st[1] + (cloud.statusDetail ? ' (' + cloud.statusDetail + ')' : '');
    statusBtn.setAttribute('aria-label', statusBtn.title);
    statusBtn.innerHTML = '<span class="material-symbols-outlined">' + st[0] + '</span>';
  }
  function mountStatus() {
    var bell = document.getElementById('notif-btn');
    if (!bell || statusBtn) return;
    statusBtn = document.createElement('button');
    statusBtn.type = 'button';
    statusBtn.id = 'cloud-btn';
    bell.parentNode.insertBefore(statusBtn, bell);
    statusBtn.addEventListener('click', function () { openPanel(); });
    setStatus(cloud.status, cloud.statusDetail);
  }

  // ---------- ข้อมูลหน้าเว็บ <-> ตาราง records ----------
  // อาร์เรย์ที่ทุกรายการมี id ไม่ซ้ำ: เก็บรายการละแถว + ลำดับไว้ในแถว _order
  // ค่าอื่น ๆ (งวดงาน ราคากลาง ลายเซ็น ฯลฯ): เก็บทั้งก้อนในแถว _kv
  function isList(v) {
    if (!Array.isArray(v) || !v.length) return false;
    var seen = {};
    return v.every(function (x) {
      if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id || seen[x.id]) return false;
      return (seen[x.id] = true);
    });
  }
  function toRows(snap) {
    var rows = {};
    Object.keys(snap).forEach(function (k) {
      var v = snap[k];
      if (k === 'version' || v === undefined) return;
      if (isList(v)) {
        v.forEach(function (x) { rows[JSON.stringify([k, x.id])] = x; });
        rows[JSON.stringify(['_order', k])] = v.map(function (x) { return x.id; });
      } else {
        rows[JSON.stringify(['_kv', k])] = v;
      }
    });
    return rows;
  }
  function fromRows(list) {
    var d = { version: 1 }, items = {}, order = {};
    list.forEach(function (r) {
      if (r.collection === '_kv') d[r.id] = r.data;
      else if (r.collection === '_order') order[r.id] = r.data;
      else (items[r.collection] = items[r.collection] || {})[r.id] = r.data;
    });
    Object.keys(items).forEach(function (k) {
      var m = items[k], arr = [];
      (order[k] || []).forEach(function (id) { if (m[id]) { arr.push(m[id]); delete m[id]; } });
      Object.keys(m).forEach(function (id) { arr.push(m[id]); });
      d[k] = arr;
    });
    Object.keys(order).forEach(function (k) { if (!d[k]) d[k] = []; });
    // ส่วนที่ยังไม่มีบนคลาวด์ใช้ค่าตั้งต้น
    var seed = SK.db.seed();
    Object.keys(seed).forEach(function (k) { if (d[k] === undefined) d[k] = seed[k]; });
    return d;
  }
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(36) + '.' + str.length.toString(36);
  }
  function hashes(rows) {
    var out = {};
    Object.keys(rows).forEach(function (k) { out[k] = hash(JSON.stringify(rows[k])); });
    return out;
  }

  function fetchRecords() {
    var all = [];
    function page(from) {
      return sb.from('records').select('collection,id,data').order('collection').order('id').range(from, from + 999).then(check).then(function (rows) {
        all = all.concat(rows);
        return rows.length === 1000 ? page(from + 1000) : all;
      });
    }
    return page(0);
  }

  var pushing = null, pushAgain = false, pushTimer = null;
  function schedulePush() {
    if (!cloud.active) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushRecords().catch(function () {}); }, 500);
  }
  function pushRecords() {
    if (!cloud.active) return Promise.resolve();
    if (pushing) { pushAgain = true; return pushing; }
    var rows = toRows(SK.db.snapshot()), base = lsGet(BASE_KEY) || {}, next = {}, up = [], del = {};
    Object.keys(rows).forEach(function (k) {
      var json = JSON.stringify(rows[k]), h = hash(json);
      next[k] = h;
      if (base[k] !== h) { var key = JSON.parse(k); up.push({ collection: key[0], id: key[1], data: JSON.parse(json) }); }
    });
    Object.keys(base).forEach(function (k) {
      if (k in rows) return;
      var key = JSON.parse(k);
      (del[key[0]] = del[key[0]] || []).push(key[1]);
    });
    if (!up.length && !Object.keys(del).length) return Promise.resolve();
    setStatus('syncing');
    var chunks = [];
    for (var i = 0, size = 0, cur = []; i < up.length; i++) {
      var s = JSON.stringify(up[i].data).length;
      if (cur.length && (cur.length >= 200 || size + s > 2e6)) { chunks.push(cur); cur = []; size = 0; }
      cur.push(up[i]); size += s;
      if (i === up.length - 1) chunks.push(cur);
    }
    var p = chunks.reduce(function (acc, c) {
      return acc.then(function () { return sb.from('records').upsert(c, { onConflict: 'collection,id' }).then(check); });
    }, Promise.resolve());
    Object.keys(del).forEach(function (c) {
      p = p.then(function () { return sb.from('records').delete().eq('collection', c).in('id', del[c]).then(check); });
    });
    pushing = p.then(function () {
      lsSet(BASE_KEY, next);
      setStatus('ok');
    }, function (err) {
      console.error('ซิงก์ข้อมูลขึ้นคลาวด์ไม่สำเร็จ', err);
      setStatus('error', err);
      throw err;
    });
    var done = function () { pushing = null; if (pushAgain) { pushAgain = false; schedulePush(); } };
    pushing.then(done, done);
    return pushing;
  }

  // เปิดหน้าเว็บ: ส่งรายการที่แก้ไขค้างไว้ในเครื่องนี้ขึ้นก่อน แล้วโหลดข้อมูลล่าสุดจากคลาวด์
  function syncRecords() {
    var hasBase = !!lsGet(BASE_KEY);
    return (hasBase ? pushRecords() : Promise.resolve()).then(fetchRecords).then(function (rows) {
      if (cancelled) return;
      if (!rows.length) {
        // คลาวด์ยังว่าง: ใช้ข้อมูลในเครื่องนี้เป็นข้อมูลตั้งต้น
        lsSet(BASE_KEY, {});
        return pushRecords();
      }
      var d = fromRows(rows);
      SK.db.replace(d);
      lsSet(BASE_KEY, hashes(toRows(d)));
    });
  }

  // ---------- ชีทของระบบเอกสาร <-> ตาราง workbooks ----------
  function readLocalWorkbook() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('sikaew-gas', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
      req.onerror = function () { reject(req.error); };
      req.onsuccess = function () {
        var db = req.result, tx = db.transaction('kv', 'readonly'), g = tx.objectStore('kv').get('workbook');
        tx.oncomplete = function () { db.close(); resolve(g.result || null); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      };
    });
  }
  function ms(t) { return t ? Date.parse(t) || 0 : 0; }
  function isSampleWb(wb) { return !!(wb && wb.props && wb.props.SK_SITE_SAMPLE === '1'); }

  var wbPushing = null, wbTimer = null;
  function pushWorkbook() {
    if (!cloud.active) return Promise.resolve();
    if (wbPushing) return wbPushing.then(pushWorkbook);
    wbPushing = readLocalWorkbook().then(function (wb) {
      if (!wb || ms(wb.savedAt) <= (lsGet(WB_KEY) || 0)) return;
      setStatus('syncing');
      return sb.from('workbooks').upsert({ id: 'main', data: wb, saved_at: wb.savedAt, sample: isSampleWb(wb) }).then(check).then(function () {
        lsSet(WB_KEY, ms(wb.savedAt));
        setStatus('ok');
      });
    }).catch(function (err) {
      console.error('ซิงก์ชีทขึ้นคลาวด์ไม่สำเร็จ', err);
      setStatus('error', err);
    });
    var done = function () { wbPushing = null; };
    wbPushing.then(done, done);
    return wbPushing;
  }
  function pullWorkbook() {
    return sb.from('workbooks').select('data,saved_at').eq('id', 'main').maybeSingle().then(check).then(function (row) {
      if (!row || cancelled) return;
      var savedAt = new Date(ms(row.saved_at) || Date.now()).toISOString();
      return SKGas.importWorkbook(row.data, savedAt).then(function () { lsSet(WB_KEY, ms(savedAt)); });
    });
  }
  function syncWorkbook() {
    if (!window.SKGas) return Promise.resolve();
    return Promise.all([
      sb.from('workbooks').select('saved_at,sample').eq('id', 'main').maybeSingle().then(check),
      readLocalWorkbook().catch(function () { return null; })
    ]).then(function (res) {
      var remote = res[0], local = res[1], marker = lsGet(WB_KEY);
      if (!remote) return local ? pushWorkbook() : null;
      if (!local) return pullWorkbook();
      if (marker == null) {
        // เครื่องนี้ยังไม่เคยซิงก์: ข้อมูลจริงที่นำเข้าไว้ในเครื่องสำคัญกว่าข้อมูลตัวอย่างบนคลาวด์
        if (remote.sample && !isSampleWb(local)) { lsSet(WB_KEY, 0); return pushWorkbook(); }
        return pullWorkbook();
      }
      if (ms(remote.saved_at) !== marker) return pullWorkbook();
      if (ms(local.savedAt) > marker) return pushWorkbook();
    });
  }
  if (typeof BroadcastChannel === 'function') {
    new BroadcastChannel('sikaew-gas').onmessage = function (e) {
      var m = e.data || {};
      if (m.type !== 'saved' || !cloud.active || ms(m.savedAt) <= (lsGet(WB_KEY) || 0)) return;
      clearTimeout(wbTimer);
      wbTimer = setTimeout(pushWorkbook, 1200);
    };
  }
  // ล้างชีทในเครื่องแล้วโหลดจากคลาวด์ใหม่
  cloud.reloadWorkbook = function () { lsSet(WB_KEY, null); return pullWorkbook(); };

  // ---------- ไฟล์แนบ ----------
  function safeName(name) {
    var m = /\.([A-Za-z0-9]{1,8})$/.exec(name || '');
    return 'file' + (m ? '.' + m[1].toLowerCase() : '');
  }
  cloud.putFile = function (id, file) {
    var path = id + '/' + safeName(file.name);
    return sb.storage.from('files').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true }).then(check).then(function () {
      return sb.from('files').upsert({ id: id, name: file.name || '', type: file.type || '', size: file.size || 0, path: path }).then(check);
    }).catch(function (err) {
      console.error('อัปโหลดไฟล์ขึ้นคลาวด์ไม่สำเร็จ', err);
      ui.toast('อัปโหลดไฟล์ขึ้นคลาวด์ไม่สำเร็จ (เก็บไว้ในเครื่องนี้แล้ว): ' + errText(err), 'error');
    });
  };
  cloud.getFile = function (id) {
    return sb.from('files').select('id,name,type,size,path').eq('id', id).maybeSingle().then(check).then(function (row) {
      if (!row) return null;
      return sb.storage.from('files').download(row.path).then(check).then(function (blob) {
        return { id: row.id, name: row.name, type: row.type, size: row.size, blob: blob };
      });
    }).catch(function (err) { console.error(err); return null; });
  };

  // ---------- เริ่มทำงาน ----------
  var cancelled = false;
  function start() {
    return timeout(sb.auth.getSession(), 6000).then(function (r) {
      var session = r.data && r.data.session;
      if (!session) return;
      cloud.user = session.user;
      setStatus('loading');
      return sb.from('staff').select('email,name,role').eq('email', String(session.user.email || '').toLowerCase()).maybeSingle().then(check).then(function (staff) {
        if (!staff) { setStatus('denied'); return; }
        cloud.staff = staff;
        cloud.active = true;
        SK.db.onSave(schedulePush);
        return timeout(syncRecords().then(syncWorkbook), 25000, 'โหลดข้อมูลจากคลาวด์นานเกินไป').then(function () { setStatus('ok'); });
      });
    }).catch(function (err) {
      // โหลดจากคลาวด์ไม่ครบ: หยุดซิงก์ในรอบนี้ (การแก้ไขเก็บในเครื่อง แล้วส่งขึ้นเมื่อเปิดหน้าครั้งถัดไป)
      cancelled = true;
      cloud.active = false;
      console.error('เชื่อมคลาวด์ไม่สำเร็จ', err);
      setStatus('error', err);
      ui.onReady(function () { ui.toast('เชื่อมต่อคลาวด์ไม่สำเร็จ ใช้ข้อมูลในเครื่องนี้ไปก่อน: ' + errText(err), 'error'); });
    });
  }
  SK.cloudReady = SK.dataReady = start();

  sb.auth.onAuthStateChange(function (event) {
    if (event === 'PASSWORD_RECOVERY') ui.onReady(function () { setTimeout(newPasswordForm, 300); });
  });
  window.addEventListener('online', function () { if (cloud.active) { schedulePush(); pushWorkbook(); } });

  // ---------- หน้าต่างบัญชี / เข้าสู่ระบบ ----------
  function redirectUrl() { return location.origin + location.pathname; }

  function loginForm() {
    ui.formModal({
      title: 'เข้าสู่ระบบคลาวด์', icon: 'cloud', size: 'sm',
      subtitle: 'บันทึกข้อมูลไว้บนฐานข้อมูลกลาง ใช้งานร่วมกันได้ทุกเครื่อง',
      intro: '<p class="mb-3 font-body-sm text-body-sm text-on-surface-variant">ใช้อีเมลที่ผู้ดูแลระบบเพิ่มไว้ในรายชื่อเจ้าหน้าที่ ครั้งแรกให้กด <b>สมัครใช้งาน</b> แล้วยืนยันอีเมล</p>',
      fields: [
        { name: 'email', label: 'อีเมล', type: 'email', required: true, span: 2 },
        { name: 'password', label: 'รหัสผ่าน', type: 'password', required: true, span: 2, help: 'อย่างน้อย 8 ตัวอักษร' }
      ],
      submitLabel: 'เข้าสู่ระบบ', submitIcon: 'login',
      extraActions: [
        { label: 'สมัครใช้งาน', icon: 'person_add', onClick: function (m) { authAction(m, 'signup'); } },
        { label: 'ลืมรหัสผ่าน', icon: 'key', onClick: function (m) { authAction(m, 'reset'); } }
      ],
      onSubmit: function (v, m) {
        return sb.auth.signInWithPassword({ email: v.email, password: v.password }).then(function (r) {
          if (r.error) {
            ui.toast(/confirm/i.test(r.error.message) ? 'ยังไม่ได้ยืนยันอีเมล — เปิดลิงก์ในอีเมลก่อน' : 'เข้าสู่ระบบไม่สำเร็จ: ' + r.error.message, 'error');
            return true;
          }
          ui.toast('เข้าสู่ระบบแล้ว กำลังโหลดข้อมูลจากคลาวด์...', 'success');
          setTimeout(function () { location.reload(); }, 500);
        });
      }
    });
  }
  function authAction(m, kind) {
    var form = m.el.querySelector('form'), email = form.elements.email.value.trim(), pw = form.elements.password.value;
    if (!email) { ui.toast('กรอกอีเมลก่อน', 'error'); return; }
    if (kind === 'reset') {
      sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() }).then(function (r) {
        ui.toast(r.error ? 'ส่งอีเมลไม่สำเร็จ: ' + r.error.message : 'ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว', r.error ? 'error' : 'success');
      });
      return;
    }
    if (!pw || pw.length < 8) { ui.toast('ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร', 'error'); return; }
    sb.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: redirectUrl() } }).then(function (r) {
      if (r.error) return ui.toast('สมัครไม่สำเร็จ: ' + r.error.message, 'error');
      if (r.data && r.data.session) { ui.toast('สมัครและเข้าสู่ระบบแล้ว', 'success'); setTimeout(function () { location.reload(); }, 500); return; }
      m.close();
      ui.modal({ title: 'ตรวจสอบอีเมลของคุณ', icon: 'mark_email_read', size: 'sm',
        body: '<p>ส่งลิงก์ยืนยันไปที่ <b>' + esc(email) + '</b> แล้ว เปิดลิงก์ในอีเมลเพื่อยืนยัน จากนั้นกลับมาเข้าสู่ระบบ</p>',
        actions: [{ label: 'ตกลง', kind: 'primary', onClick: function (mm) { mm.close(); } }] });
    });
  }
  function newPasswordForm() {
    ui.formModal({
      title: 'ตั้งรหัสผ่านใหม่', icon: 'key', size: 'sm',
      fields: [{ name: 'password', label: 'รหัสผ่านใหม่', type: 'password', required: true, span: 2, help: 'อย่างน้อย 8 ตัวอักษร' }],
      onSubmit: function (v) {
        if (v.password.length < 8) { ui.toast('รหัสผ่านสั้นเกินไป', 'error'); return true; }
        return sb.auth.updateUser({ password: v.password }).then(function (r) {
          if (r.error) { ui.toast('ตั้งรหัสผ่านไม่สำเร็จ: ' + r.error.message, 'error'); return true; }
          ui.toast('ตั้งรหัสผ่านใหม่แล้ว', 'success');
          setTimeout(function () { location.reload(); }, 600);
        });
      }
    });
  }

  function openPanel() {
    if (!cloud.user) return loginForm();
    var st = STATUS[cloud.status] || STATUS.off;
    var body = '<div class="flex flex-col gap-3">' +
      '<div class="p-3 rounded-lg bg-surface-container-low"><div class="font-label-md text-label-md font-semibold">' + esc(cloud.user.email) + '</div>' +
      '<div class="font-body-sm text-body-sm text-on-surface-variant">' + (cloud.staff ? (cloud.staff.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่') + (cloud.staff.name ? ' • ' + esc(cloud.staff.name) : '') : 'ยังไม่ได้รับสิทธิ์') + '</div></div>' +
      '<div class="flex items-start gap-2 ' + st[2].replace('animate-pulse', '') + '"><span class="material-symbols-outlined">' + st[0] + '</span><span>' + esc(st[1]) +
      (cloud.statusDetail ? '<br><small class="text-on-surface-variant">' + esc(cloud.statusDetail) + '</small>' : '') +
      (cloud.lastSync ? '<br><small class="text-on-surface-variant">ซิงก์ล่าสุด ' + esc(cloud.lastSync.toLocaleString('th-TH')) + '</small>' : '') + '</span></div>' +
      (cloud.staff ? '<p class="font-body-sm text-body-sm text-on-surface-variant">ข้อมูลที่บันทึก/แก้ไขทุกหน้าจะถูกส่งขึ้นคลาวด์อัตโนมัติ เครื่องอื่นที่เข้าสู่ระบบจะเห็นข้อมูลชุดเดียวกันเมื่อเปิดหน้าใหม่</p>'
        : '<p class="font-body-sm text-body-sm">ติดต่อผู้ดูแลระบบให้เพิ่มอีเมลนี้ในรายชื่อเจ้าหน้าที่ แล้วเปิดหน้าเว็บใหม่</p>') + '</div>';
    var actions = [{ label: 'ออกจากระบบ', icon: 'logout', onClick: function (m) {
      sb.auth.signOut().then(function () { m.close(); ui.toast('ออกจากระบบแล้ว', 'success'); setTimeout(function () { location.reload(); }, 500); });
    } }];
    actions.push({ label: 'แก้ไขชื่อ-ตำแหน่ง', icon: 'badge', onClick: function (m) { m.close(); profileForm(); } });
    if (cloud.staff && cloud.staff.role === 'admin') actions.push({ label: 'จัดการเจ้าหน้าที่', icon: 'group', onClick: function (m) { m.close(); staffPanel(); } });
    if (cloud.active) actions.push({ label: 'ซิงก์ตอนนี้', icon: 'sync', kind: 'primary', onClick: function (m) {
      m.close();
      setStatus('loading');
      pushRecords().then(pushWorkbook).then(function () { location.reload(); }, function (err) { ui.toast('ซิงก์ไม่สำเร็จ: ' + errText(err), 'error'); });
    } });
    ui.modal({ title: 'ข้อมูลบนคลาวด์', icon: 'cloud', size: 'sm', body: body, actions: actions });
  }

  // ชื่อ-ตำแหน่งที่แสดงบนหัวหน้าเว็บ (เก็บในบัญชีผู้ใช้ของ Supabase)
  function profileForm() {
    var u = ui.currentUser(), meta = cloud.user.user_metadata || {};
    ui.formModal({
      title: 'ชื่อและตำแหน่งที่แสดง', icon: 'badge', size: 'sm',
      fields: [
        { name: 'full_name', label: 'ชื่อ-นามสกุล', value: meta.full_name || (u.name !== String(cloud.user.email).split('@')[0] ? u.name : ''), required: true, span: 2, placeholder: 'เช่น นายสมชาย ใจดี' },
        { name: 'position', label: 'ตำแหน่ง', value: meta.position || '', span: 2, placeholder: 'เช่น นายช่างโยธาชำนาญงาน' }
      ],
      onSubmit: function (v) {
        return sb.auth.updateUser({ data: { full_name: v.full_name, position: v.position } }).then(function (r) {
          if (r.error) { ui.toast('บันทึกไม่สำเร็จ: ' + r.error.message, 'error'); return true; }
          cloud.user = r.data.user;
          ui.renderProfile();
          ui.toast('บันทึกชื่อแล้ว', 'success');
        });
      }
    });
  }

  function staffPanel() {
    var m = ui.modal({ title: 'รายชื่อเจ้าหน้าที่ที่ใช้คลาวด์ได้', icon: 'group', body: '<p>กำลังโหลด...</p>',
      actions: [{ label: 'เพิ่มเจ้าหน้าที่', icon: 'person_add', kind: 'primary', onClick: function () { addStaff(); } }] });
    function load() {
      sb.from('staff').select('email,name,role,created_at').order('created_at').then(check).then(function (list) {
        m.body.innerHTML = '<p class="mb-3 font-body-sm text-body-sm text-on-surface-variant">เจ้าหน้าที่ใช้อีเมลในรายชื่อนี้กด "สมัครใช้งาน" ในหน้าเข้าสู่ระบบ แล้วยืนยันอีเมลก่อนใช้งาน</p>' +
          '<div class="divide-y divide-surface-container">' + list.map(function (s) {
            return '<div class="flex items-center gap-3 py-2"><span class="material-symbols-outlined text-primary">' + (s.role === 'admin' ? 'admin_panel_settings' : 'person') + '</span>' +
              '<div class="min-w-0 flex-1"><div class="font-label-md text-label-md truncate">' + esc(s.email) + '</div><div class="font-body-sm text-body-sm text-on-surface-variant">' + esc(s.name || '-') + ' • ' + (s.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่') + '</div></div>' +
              (s.email === String(cloud.user.email).toLowerCase() ? '' : '<button type="button" data-del="' + esc(s.email) + '" class="p-1.5 rounded text-error hover:bg-error-container" aria-label="ลบ ' + esc(s.email) + '"><span class="material-symbols-outlined">delete</span></button>') + '</div>';
          }).join('') + '</div>';
      }).catch(function (err) { m.body.innerHTML = '<p class="text-error">' + esc(errText(err)) + '</p>'; });
    }
    m.body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]');
      if (!b) return;
      ui.confirm('ลบสิทธิ์ของ ' + b.dataset.del + ' ?', 'ลบ', 'danger').then(function (ok) {
        if (!ok) return;
        sb.from('staff').delete().eq('email', b.dataset.del).then(check).then(load, function (err) { ui.toast(errText(err), 'error'); });
      });
    });
    function addStaff() {
      ui.formModal({
        title: 'เพิ่มเจ้าหน้าที่', icon: 'person_add', size: 'sm',
        fields: [
          { name: 'email', label: 'อีเมล', type: 'email', required: true, span: 2 },
          { name: 'name', label: 'ชื่อ - ตำแหน่ง', span: 2 },
          { name: 'role', label: 'สิทธิ์', type: 'select', options: [['staff', 'เจ้าหน้าที่ (อ่าน/บันทึกข้อมูล)'], ['admin', 'ผู้ดูแลระบบ (+ จัดการรายชื่อ)']], span: 2 }
        ],
        onSubmit: function (v) {
          return sb.from('staff').insert({ email: v.email.toLowerCase(), name: v.name, role: v.role }).then(function (r) {
            if (r.error) { ui.toast('เพิ่มไม่สำเร็จ: ' + r.error.message, 'error'); return true; }
            ui.toast('เพิ่ม ' + v.email + ' แล้ว', 'success'); load();
          });
        }
      });
    }
    load();
  }

  cloud.open = openPanel;
  ui.onReady(mountStatus);
  if (document.readyState !== 'loading') mountStatus(); else document.addEventListener('DOMContentLoaded', mountStatus);
})();
