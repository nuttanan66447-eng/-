// ฐานข้อมูลกลาง Supabase เมื่อเจ้าหน้าที่เข้าสู่ระบบ (ใช้ตารางและรูปแบบเดิม ข้อมูลเดิมใช้ต่อได้ทั้งหมด)
// - ข้อมูลเว็บ (SK.store) -> ตาราง records รายการละแถว ส่งเฉพาะที่เปลี่ยน
// - ชีทของระบบหลัก (IndexedDB ของ gas-worker) -> ตาราง workbooks ทั้งเล่ม
// - ไฟล์ -> Storage "files" • สิทธิ์ใช้งาน -> ตาราง staff
// ไม่ได้เข้าสู่ระบบ: ใช้ข้อมูลในเบราว์เซอร์เครื่องนี้
(function () {
  'use strict';
  var SK = window.SK;
  var cfg = (window.SK_CONFIG || {}).supabase || {};
  var cloud = SK.cloud = { enabled: !!(cfg.url && cfg.key && window.supabase), active: false, user: null, staff: null, status: 'off', detail: '', lastSync: null };
  var USER_DOMAIN = 'users.sikaew-kongchang.app';
  function toEmail(login) { var t = String(login || '').trim().toLowerCase(); return /@/.test(t) ? t : t + '@' + USER_DOMAIN; }
  function loginName(email) { var e = String(email || ''); return e.slice(-USER_DOMAIN.length - 1) === '@' + USER_DOMAIN ? e.slice(0, -USER_DOMAIN.length - 1) : e; }
  cloud.toEmail = toEmail;
  cloud.loginName = loginName;
  function errText(e) { return (e && (e.message || e.error_description || e.error)) || String(e); }
  cloud.errText = errText;
  function setStatus(s, detail) {
    cloud.status = s;
    cloud.detail = detail ? errText(detail) : '';
    if (s === 'ok') cloud.lastSync = new Date();
    window.dispatchEvent(new CustomEvent('sk:cloud', { detail: s }));
  }
  if (!cloud.enabled) { cloud.ready = Promise.resolve(); return; }

  var sb = cloud.client = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'sikaew-auth' }
  });
  var NS = 'sikaew-cloud:' + cfg.url.replace(/^https?:\/\//, '') + ':';
  var BASE_KEY = NS + 'base2', WB_KEY = NS + 'wb2', DATASET = 'real-v2';

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function timeout(p, ms, label) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error(label || 'หมดเวลาเชื่อมต่อ')); }, ms); })]); }
  function check(r) { if (r.error) throw r.error; return r.data; }
  cloud.check = check;

  // ---------- SK.store <-> records ----------
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
      } else rows[JSON.stringify(['_kv', k])] = v;
    });
    return rows;
  }
  function fromRows(list) {
    var d = { version: 2 }, items = {}, order = {};
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
    var seed = SK.store.seed();
    Object.keys(seed).forEach(function (k) { if (d[k] === undefined) d[k] = seed[k]; });
    return d;
  }
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return h.toString(36) + '.' + str.length.toString(36);
  }
  function hashes(rows) { var out = {}; Object.keys(rows).forEach(function (k) { out[k] = hash(JSON.stringify(rows[k])); }); return out; }
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
    var rows = toRows(SK.store.data), base = lsGet(BASE_KEY) || {}, next = {}, up = [], del = {};
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
    pushing = p.then(function () { lsSet(BASE_KEY, next); setStatus('ok'); }, function (err) {
      console.error('ซิงก์ข้อมูลขึ้นคลาวด์ไม่สำเร็จ', err);
      setStatus('error', err);
      throw err;
    });
    var done = function () { pushing = null; if (pushAgain) { pushAgain = false; schedulePush(); } };
    pushing.then(done, done);
    return pushing;
  }
  function syncRecords() {
    var hasBase = !!lsGet(BASE_KEY);
    return (hasBase ? pushRecords() : Promise.resolve()).then(fetchRecords).then(function (rows) {
      if (cancelled) return;
      var legacy = rows.length && !rows.some(function (r) { return r.collection === '_kv' && r.id === 'dataset' && r.data === DATASET; });
      if (legacy) {
        // ข้อมูลตัวอย่างชุดเก่ามาก (ก่อนใช้ข้อมูลจริง): ล้างแล้วใช้ข้อมูลในเครื่องนี้
        var byCol = {};
        rows.forEach(function (r) { (byCol[r.collection] = byCol[r.collection] || []).push(r.id); });
        return Object.keys(byCol).reduce(function (acc, c) {
          return acc.then(function () { return sb.from('records').delete().eq('collection', c).in('id', byCol[c]).then(check); });
        }, Promise.resolve()).then(function () { lsSet(BASE_KEY, {}); return pushRecords(); });
      }
      if (!rows.length) { lsSet(BASE_KEY, {}); return pushRecords(); }
      var d = fromRows(rows);
      SK.store.replace(d);
      lsSet(BASE_KEY, hashes(toRows(d)));
    });
  }

  // ---------- ชีทของระบบหลัก <-> workbooks ----------
  function readLocalWorkbook() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('sikaew-gas', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
      req.onerror = function () { reject(req.error); };
      req.onsuccess = function () {
        var db = req.result, t = db.transaction('kv', 'readonly'), g = t.objectStore('kv').get('workbook');
        t.oncomplete = function () { db.close(); resolve(g.result || null); };
        t.onerror = function () { db.close(); reject(t.error); };
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
    }).catch(function (err) { console.error('ซิงก์ชีทขึ้นคลาวด์ไม่สำเร็จ', err); setStatus('error', err); });
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
    return Promise.resolve(SKGas.ready).then(function () {
      return Promise.all([
        sb.from('workbooks').select('saved_at,sample').eq('id', 'main').maybeSingle().then(check),
        readLocalWorkbook().catch(function () { return null; })
      ]);
    }).then(function (res) {
      var remote = res[0], local = res[1], marker = lsGet(WB_KEY);
      if (!remote || remote.sample) { if (marker == null) lsSet(WB_KEY, 0); return local ? pushWorkbook() : null; }
      if (!local) return pullWorkbook();
      if (marker == null) {
        if (remote.sample && !isSampleWb(local)) { lsSet(WB_KEY, 0); return pushWorkbook(); }
        return pullWorkbook();
      }
      if (ms(remote.saved_at) !== marker) return pullWorkbook();
      if (ms(local.savedAt) > marker) return pushWorkbook();
    });
  }
  // ระบบหลักบันทึกชีท (ทุกแท็บ/iframe): ส่งขึ้นคลาวด์
  if (typeof BroadcastChannel === 'function') {
    new BroadcastChannel('sikaew-gas').addEventListener('message', function (e) {
      var m = e.data || {};
      if (m.type !== 'saved' || !cloud.active || ms(m.savedAt) <= (lsGet(WB_KEY) || 0)) return;
      clearTimeout(wbTimer);
      wbTimer = setTimeout(pushWorkbook, 1200);
    });
  }
  cloud.reloadWorkbook = function () { lsSet(WB_KEY, null); return pullWorkbook(); };

  // ---------- ไฟล์ ----------
  function safeName(name) { var m = /\.([A-Za-z0-9]{1,8})$/.exec(name || ''); return 'file' + (m ? '.' + m[1].toLowerCase() : ''); }
  cloud.putFile = function (id, file) {
    var path = id + '/' + safeName(file.name);
    return sb.storage.from('files').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true }).then(check).then(function () {
      return sb.from('files').upsert({ id: id, name: file.name || '', type: file.type || '', size: file.size || 0, path: path }).then(check);
    }).catch(function (err) {
      console.error('อัปโหลดไฟล์ขึ้นคลาวด์ไม่สำเร็จ', err);
      SK.toast('อัปโหลดไฟล์ขึ้นคลาวด์ไม่สำเร็จ (เก็บไว้ในเครื่องนี้แล้ว): ' + errText(err), 'error');
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
        SK.store.onSave(schedulePush);
        return timeout(syncRecords().then(syncWorkbook), 25000, 'โหลดข้อมูลจากคลาวด์นานเกินไป').then(function () { setStatus('ok'); });
      });
    }).catch(function (err) {
      cancelled = true;
      cloud.active = false;
      console.error('เชื่อมคลาวด์ไม่สำเร็จ', err);
      setStatus('error', err);
      setTimeout(function () { SK.toast('เชื่อมต่อคลาวด์ไม่สำเร็จ ใช้ข้อมูลในเครื่องนี้ไปก่อน: ' + errText(err), 'error'); }, 800);
    });
  }
  cloud.ready = start();
  window.addEventListener('online', function () { if (cloud.active) { schedulePush(); pushWorkbook(); } });
  sb.auth.onAuthStateChange(function (event) { if (event === 'PASSWORD_RECOVERY') setTimeout(newPassword, 300); });

  cloud.flush = function () { return pushRecords().catch(function () {}).then(pushWorkbook); };
  cloud.syncNow = function () { setStatus('loading'); return pushRecords().then(pushWorkbook); };
  cloud.isAdmin = function () { return !!(cloud.staff && cloud.staff.role === 'admin'); };
  cloud.displayName = function () {
    if (!cloud.user) return '';
    var m = cloud.user.user_metadata || {};
    return m.full_name || (cloud.staff && cloud.staff.name) || loginName(cloud.user.email);
  };
  cloud.position = function () { var m = (cloud.user && cloud.user.user_metadata) || {}; return m.position || ''; };

  // ---------- เข้าสู่ระบบ / บัญชี ----------
  cloud.signIn = function (login, password) {
    return sb.auth.signInWithPassword({ email: toEmail(login), password: password }).then(function (r) {
      if (!r.error) return { ok: true };
      var msg = r.error.message;
      return { ok: false, message: /confirm/i.test(msg) ? 'บัญชียังไม่ได้ยืนยัน — แจ้งผู้ดูแลระบบ' : /invalid/i.test(msg) ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'เข้าสู่ระบบไม่สำเร็จ: ' + msg };
    });
  };
  cloud.signOut = function () { return cloud.flush().then(function () { return sb.auth.signOut(); }); };
  cloud.updateProfile = function (data) {
    return sb.auth.updateUser({ data: data }).then(function (r) { if (r.error) throw r.error; cloud.user = r.data.user; setStatus(cloud.status); });
  };
  cloud.changePassword = function (pw) { return sb.auth.updateUser({ password: pw }).then(function (r) { if (r.error) throw r.error; }); };
  function newPassword() {
    SK.formModal({
      title: 'ตั้งรหัสผ่านใหม่', icon: 'key', size: 'sm',
      fields: [{ name: 'password', label: 'รหัสผ่านใหม่', type: 'password', required: true, help: 'อย่างน้อย 8 ตัวอักษร', autocomplete: 'new-password' }],
      onSubmit: function (v) {
        if (v.password.length < 8) { SK.toast('รหัสผ่านสั้นเกินไป', 'error'); return true; }
        return cloud.changePassword(v.password).then(function () { SK.toast('ตั้งรหัสผ่านใหม่แล้ว', 'success'); setTimeout(function () { location.reload(); }, 600); });
      }
    });
  }

  // ---------- จัดการเจ้าหน้าที่ (ผู้ดูแลระบบ) ----------
  // Edge Function staff-user (สร้าง/ตั้งรหัส/ลบบัญชีชื่อผู้ใช้) — ยังไม่ติดตั้ง: สร้างจากเบราว์เซอร์ (ต้องปิด Confirm email)
  function staffUser(body) {
    return sb.functions.invoke('staff-user', { body: body }).then(function (r) {
      var res = r.data || {};
      if (r.error && !res.message) return { ok: false, missing: /not found|404|failed to send|fetch/i.test(String(r.error.message || r.error)), message: String(r.error.message || r.error) };
      return res;
    }, function (err) { return { ok: false, missing: true, message: String(err && err.message || err) }; });
  }
  function signUpWithoutSession(email, password, meta) {
    var tmp = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sk-signup-tmp' } });
    return tmp.auth.signUp({ email: email, password: password, options: { data: meta } }).then(function (r) {
      if (r.error) return { ok: false, message: r.error.message };
      return { ok: true, needsConfirm: !(r.data && r.data.session) };
    });
  }
  cloud.staffList = function () { return sb.from('staff').select('email,name,role,created_at').order('created_at').then(check); };
  cloud.createStaff = function (v) {
    var login = String(v.username || '').trim().toLowerCase();
    if (/@/.test(login)) return sb.from('staff').insert({ email: login, name: v.name, role: v.role }).then(check).then(function () { return { ok: true, email: true }; });
    if (!/^[a-z0-9._-]{3,32}$/.test(login)) return Promise.resolve({ ok: false, message: 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3-32 ตัว' });
    if (String(v.password || '').length < 6) return Promise.resolve({ ok: false, message: 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' });
    return staffUser({ action: 'create', username: login, password: v.password, name: v.name, role: v.role }).then(function (r) {
      if (r.ok || !r.missing) return r;
      var email = toEmail(login);
      return sb.from('staff').upsert({ email: email, name: v.name, role: v.role }).then(check).then(function () {
        return signUpWithoutSession(email, v.password, { full_name: v.name, username: login });
      });
    });
  };
  cloud.updateStaff = function (email, v) { return sb.from('staff').update({ name: v.name, role: v.role }).eq('email', email).then(check); };
  cloud.resetStaffPassword = function (email, password) { return staffUser({ action: 'password', username: loginName(email), password: password }); };
  cloud.deleteStaff = function (email) {
    var isUser = loginName(email) !== email;
    return (isUser ? staffUser({ action: 'delete', username: loginName(email) }) : Promise.resolve({ ok: false, missing: true })).then(function (r) {
      if (r.ok) return r;
      return sb.from('staff').delete().eq('email', email).then(check).then(function () { return { ok: true }; });
    });
  };
})();
