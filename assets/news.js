// ข่าวและภาพกิจกรรมจากเพจ Facebook กองช่าง (https://www.facebook.com/TechnicianSeekaew)
// - โพสต์ถูกดึงลงตาราง news_posts โดย Edge Function facebook-sync (เจ้าหน้าที่กด "ดึงข่าวล่าสุด" หรือดึงเองทุก 1 ชม. เมื่อเปิดเว็บ)
// - ยังไม่มีโพสต์ในฐานข้อมูล: ซ่อนส่วนข่าว (เจ้าหน้าที่เห็นปุ่มดึงข่าว)
// - โพสต์ที่ข้อความตรงกับโครงการ: แสดงรูปในหน้าโครงการนั้น (เจ้าหน้าที่ผูก/ยกเลิกเองได้)
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, esc = ui.esc;
  var PAGE = 'https://www.facebook.com/TechnicianSeekaew';
  var SYNC_EVERY = 60 * 60 * 1000;
  var $ = function (id) { return document.getElementById(id); };

  function client() { return SK.cloud && SK.cloud.enabled ? SK.cloud.client : null; }
  function staff() { return !!(SK.cloud && SK.cloud.active); }

  var cache = null;
  function load(force) {
    if (cache && !force) return cache;
    var c = client();
    if (!c) return (cache = Promise.resolve({ posts: [], sync: null }));
    cache = Promise.all([
      c.from('news_posts').select('id,message,created_time,permalink,images,project_ids,hidden').order('created_time', { ascending: false }).limit(120),
      c.from('news_sync').select('synced_at,ok,message').eq('id', 'facebook').maybeSingle()
    ]).then(function (r) { return { posts: (r[0].data || []).filter(function (p) { return !p.hidden; }), sync: r[1].data || null }; },
      function () { return { posts: [], sync: null }; });
    return cache;
  }

  // ---------- จับคู่โพสต์กับโครงการ ----------
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s​.,:;!?()[\]"'“”‘’\-–—/#]+/g, ''); }
  function grams(s) { var g = {}; for (var i = 0; i + 3 <= s.length; i++) g[s.substr(i, 3)] = 1; return Object.keys(g); }
  function villageOf(text) { var m = /(?:หมู่ที่|หมู่|ม\.)\s*(\d{1,2})/.exec(text || ''); return m ? m[1] : ''; }
  function score(post, p) {
    var name = norm(p.name).replace(/^โครงการ/, '');
    if (name.length < 8) return 0;
    var keys = grams(name), msg = norm(post.message);
    var s = keys.filter(function (k) { return msg.indexOf(k) >= 0; }).length / keys.length;
    var pv = String(p.village || '').replace(/\D/g, ''), mv = villageOf(post.message);
    if (pv && mv && pv !== mv) s *= 0.5;
    return s;
  }
  function projectsFor(post) {
    if (Array.isArray(post.project_ids)) return post.project_ids;
    return SK.db.data.projects.map(function (p) { return [p.id, score(post, p)]; })
      .filter(function (x) { return x[1] >= 0.7; }).sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 2).map(function (x) { return x[0]; });
  }
  function postsFor(projectId) {
    return load().then(function (d) { return d.posts.filter(function (p) { return projectsFor(p).indexOf(projectId) >= 0; }); });
  }

  // ---------- ดึงข่าวจาก Facebook ----------
  function sync(manual) {
    var c = client();
    if (!c || !staff()) return Promise.resolve(null);
    return c.functions.invoke('facebook-sync', { body: {} }).then(function (r) {
      var res = r.data || {};
      if (r.error && !res.message) res = { ok: false, message: r.error.message };
      if (manual) {
        if (res.needsToken) setupHelp();
        else ui.toast(res.ok ? 'ดึงข่าวแล้ว ' + res.count + ' โพสต์' : 'ดึงข่าวไม่สำเร็จ: ' + res.message, res.ok ? 'success' : 'error');
      }
      return res;
    });
  }
  function autoSync() {
    if (!staff()) return;
    load().then(function (d) {
      var last = d.sync && d.sync.synced_at ? Date.parse(d.sync.synced_at) : 0;
      if (Date.now() - last < SYNC_EVERY || (d.sync && d.sync.message === 'needs-token' && Date.now() - last < 24 * SYNC_EVERY)) return;
      sync(false).then(function (res) { if (res && res.ok) { load(true); renderCard(); } });
    });
  }
  function setupHelp() {
    ui.modal({
      title: 'ตั้งค่าดึงข่าวจากเพจ Facebook อัตโนมัติ', icon: 'campaign', size: 'md',
      body: '<ol class="list-decimal pl-5 space-y-2 font-body-md text-body-md">' +
        '<li>ผู้ดูแลเพจ "กองช่าง เทศบาลตำบลสีแก้ว" เข้า <a class="text-primary underline" target="_blank" rel="noopener" href="https://developers.facebook.com/apps">developers.facebook.com/apps</a> → สร้างแอป (ประเภท Business)</li>' +
        '<li>เปิด <a class="text-primary underline" target="_blank" rel="noopener" href="https://developers.facebook.com/tools/explorer/">Graph API Explorer</a> → เลือกแอป → Get Page Access Token → เลือกเพจกองช่าง (สิทธิ์ pages_read_engagement, pages_read_user_content)</li>' +
        '<li>นำ token ไปแปลงเป็นแบบไม่หมดอายุที่ <a class="text-primary underline" target="_blank" rel="noopener" href="https://developers.facebook.com/tools/debug/accesstoken/">Access Token Debugger</a> (Extend Access Token) แล้วขอ Page token อีกครั้ง</li>' +
        '<li>ใน Supabase → Edge Functions → Secrets เพิ่ม <code>FB_PAGE_TOKEN</code> = token ที่ได้</li>' +
        '<li>กลับมากด "ดึงข่าวล่าสุด" — จากนั้นเว็บจะดึงข่าวใหม่ให้เองทุกชั่วโมงเมื่อเจ้าหน้าที่เปิดเว็บ</li></ol>' +
        '<p class="mt-3 font-body-sm text-body-sm text-on-surface-variant">ระหว่างนี้เจ้าหน้าที่เพิ่มข่าวและรูปกิจกรรมเองได้ด้วยปุ่ม "เพิ่มข่าว"</p>',
      actions: [{ label: 'ปิด', kind: 'primary', onClick: function (m) { m.close(); } }]
    });
  }

  // ---------- แสดงผล ----------
  function dateText(t) { return t ? new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : ''; }
  function gallery(images, start) {
    var i = start || 0;
    var body = document.createElement('div');
    function draw() {
      body.innerHTML = '<div class="relative bg-black rounded-lg flex items-center justify-center" style="height:62vh"><img src="' + esc(images[i].src) + '" alt="" class="max-h-full max-w-full object-contain"/>' +
        (images.length > 1 ? '<button type="button" data-g="-1" class="absolute left-2 p-2 rounded-full bg-white/80" aria-label="รูปก่อนหน้า"><span class="material-symbols-outlined">chevron_left</span></button>' +
          '<button type="button" data-g="1" class="absolute right-2 p-2 rounded-full bg-white/80" aria-label="รูปถัดไป"><span class="material-symbols-outlined">chevron_right</span></button>' : '') + '</div>' +
        (images.length > 1 ? '<div class="flex gap-1 mt-2 overflow-x-auto">' + images.map(function (im, k) {
          return '<button type="button" data-k="' + k + '" class="shrink-0 w-16 h-12 rounded overflow-hidden ' + (k === i ? 'ring-2 ring-primary' : 'opacity-70') + '"><img src="' + esc(im.src) + '" alt="" class="w-full h-full object-cover"/></button>';
        }).join('') + '</div>' : '');
    }
    body.addEventListener('click', function (e) {
      var g = e.target.closest('[data-g]'), k = e.target.closest('[data-k]');
      if (g) { i = (i + Number(g.dataset.g) + images.length) % images.length; draw(); }
      if (k) { i = Number(k.dataset.k); draw(); }
    });
    draw();
    ui.modal({ title: 'ภาพจากเพจกองช่าง', subtitle: (i + 1) + ' / ' + images.length + ' รูป', icon: 'photo_library', size: 'lg', body: body });
  }

  function manual(post) { return /^manual-/.test(post.id); }

  // ---------- เจ้าหน้าที่ลงข่าวเอง (ใช้ได้ทันทีโดยไม่ต้องเชื่อมเพจ) ----------
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve({ blob: b, w: c.width, h: c.height }) : reject(new Error('แปลงรูปไม่สำเร็จ')); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('อ่านไฟล์รูปไม่ได้: ' + file.name)); };
      img.src = url;
    });
  }
  function addDialog() {
    var c = client();
    if (!c || !staff()) return ui.toast('ต้องเข้าสู่ระบบเจ้าหน้าที่ก่อน', 'error');
    var inp = 'w-full px-3 py-2 rounded-lg bg-surface-container-low font-body-md text-body-md';
    var body = document.createElement('div');
    body.className = 'flex flex-col gap-3';
    body.innerHTML =
      '<label class="flex flex-col gap-1 font-label-md text-label-md">รายละเอียดข่าว / กิจกรรม *<textarea data-f="message" rows="5" class="' + inp + '" placeholder="เช่น กองช่างตรวจรับงานก่อสร้างถนน คสล. หมู่ที่ 6 ..."></textarea></label>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><label class="flex flex-col gap-1 font-label-md text-label-md">วันที่<input data-f="date" type="date" value="' + ui.today() + '" class="' + inp + '"/></label>' +
      '<label class="flex flex-col gap-1 font-label-md text-label-md">ผูกกับโครงการ<select data-f="project" class="' + inp + '"><option value="">— จับคู่อัตโนมัติจากข้อความ —</option>' +
        SK.db.data.projects.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.id + ' • ' + p.name) + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="flex flex-col gap-1 font-label-md text-label-md">ลิงก์โพสต์ Facebook (ถ้ามี)<input data-f="link" type="url" class="' + inp + '" placeholder="https://www.facebook.com/TechnicianSeekaew/posts/..."/></label>' +
      '<label class="flex flex-col gap-1 font-label-md text-label-md">รูปภาพ (เลือกได้หลายรูป)<input data-f="files" type="file" accept="image/*" multiple class="' + inp + '"/></label>' +
      '<div data-prev class="flex flex-wrap gap-2"></div>';
    var files = body.querySelector('[data-f=files]');
    files.addEventListener('change', function () {
      body.querySelector('[data-prev]').innerHTML = Array.prototype.map.call(files.files, function (f) {
        return '<img src="' + URL.createObjectURL(f) + '" alt="" class="w-20 h-16 object-cover rounded"/>';
      }).join('');
    });
    var busy = false;
    ui.modal({ title: 'เพิ่มข่าวและภาพกิจกรรม', icon: 'add_photo_alternate', size: 'md', body: body, actions: [
      { label: 'ยกเลิก', onClick: function (m) { m.close(); } },
      { label: 'บันทึกข่าว', kind: 'primary', icon: 'save', onClick: function (m) {
        if (busy) return;
        var f = function (k) { return body.querySelector('[data-f=' + k + ']'); };
        var message = f('message').value.trim();
        if (!message && !files.files.length) return ui.toast('ใส่รายละเอียดหรือรูปอย่างน้อย 1 อย่าง', 'error');
        busy = true;
        ui.toast('กำลังบันทึกข่าว...');
        var id = 'manual-' + Date.now(), list = Array.prototype.slice.call(files.files);
        var uploads = list.map(function (file, i) {
          return shrink(file).then(function (r) {
            var path = id + '/' + i + '.jpg';
            return c.storage.from('news').upload(path, r.blob, { contentType: 'image/jpeg', upsert: true }).then(function (up) {
              if (up.error) throw up.error;
              return { src: c.storage.from('news').getPublicUrl(path).data.publicUrl, w: r.w, h: r.h, stored: true, path: path };
            });
          });
        });
        Promise.all(uploads).then(function (images) {
          var date = f('date').value || ui.today();
          return c.from('news_posts').insert({
            id: id, message: message, created_time: new Date(date + 'T12:00:00+07:00').toISOString(), permalink: f('link').value.trim(),
            images: images, project_ids: f('project').value ? [f('project').value] : null, fetched_at: new Date().toISOString()
          });
        }).then(function (r) {
          if (r && r.error) throw r.error;
          ui.toast('บันทึกข่าวแล้ว', 'success');
          m.close(); load(true); renderCard();
        }).catch(function (err) { busy = false; ui.toast('บันทึกไม่สำเร็จ: ' + (err.message || err), 'error'); });
      } }
    ] });
  }
  function deletePost(post) {
    var c = client();
    ui.confirm('ลบข่าวนี้ออกจากเว็บ?', 'ลบข่าว', 'danger').then(function (ok) {
      if (!ok) return;
      var paths = (post.images || []).map(function (im) { return im.path; }).filter(Boolean);
      (paths.length ? c.storage.from('news').remove(paths) : Promise.resolve()).then(function () {
        return c.from('news_posts').delete().eq('id', post.id);
      }).then(function (r) {
        if (r && r.error) throw r.error;
        ui.toast('ลบข่าวแล้ว', 'success'); load(true); renderCard();
      }).catch(function (err) { ui.toast('ลบไม่สำเร็จ: ' + (err.message || err), 'error'); });
    });
  }

  function postCard(post, opts) {
    var imgs = post.images || [], ids = projectsFor(post);
    var chips = ids.map(function (id) {
      var p = SK.db.project(id);
      return p ? '<a href="progress.html?id=' + encodeURIComponent(id) + '" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed/60 text-primary font-label-sm text-label-sm max-w-full"><span class="material-symbols-outlined text-[14px]">construction</span><span class="truncate">' + esc(p.name) + '</span></a>' : '';
    }).join('');
    return '<article class="flex flex-col rounded-xl overflow-hidden ring-1 ring-surface-container bg-surface-container-lowest">' +
      (imgs.length ? '<button type="button" data-news-gallery="' + esc(post.id) + '" class="relative block h-44 bg-surface-container"><img loading="lazy" src="' + esc(imgs[0].src) + '" alt="" class="w-full h-full object-cover"/>' +
        (imgs.length > 1 ? '<span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white font-label-sm text-label-sm">+' + (imgs.length - 1) + ' รูป</span>' : '') + '</button>' : '') +
      '<div class="p-3 flex flex-col gap-2 flex-1">' +
        '<span class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px] text-[#1877f2]">thumb_up</span>' + esc(dateText(post.created_time)) + '</span>' +
        '<p class="font-body-sm text-body-sm text-on-surface whitespace-pre-line line-clamp-5">' + esc(post.message || '(โพสต์รูปภาพ)') + '</p>' +
        (chips ? '<div class="flex flex-wrap gap-1">' + chips + '</div>' : '') +
        '<div class="mt-auto flex items-center justify-between gap-2 pt-1">' +
          (post.permalink || !manual(post) ? '<a href="' + esc(post.permalink || PAGE) + '" target="_blank" rel="noopener" class="font-label-md text-label-md text-primary font-semibold hover:underline">อ่านต่อบน Facebook</a>' : '<span class="font-label-sm text-label-sm text-on-surface-variant">ลงข่าวโดยกองช่าง</span>') +
          (staff() ? '<span class="flex items-center gap-2">' + (manual(post) ? '<button type="button" data-news-del="' + esc(post.id) + '" class="font-label-sm text-label-sm text-error hover:underline flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">delete</span>ลบ</button>' : '') +
            '<button type="button" data-news-link="' + esc(post.id) + '" class="font-label-sm text-label-sm text-on-surface-variant hover:text-primary flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">link</span>ผูกโครงการ</button></span>' : '') +
        '</div></div></article>';
  }

  var showAll = false;
  function renderCard() {
    var box = $('news-body');
    if (!box) return;
    $('news-sync').classList.toggle('hidden', !staff());
    if ($('news-add')) $('news-add').classList.toggle('hidden', !staff());
    load().then(function (d) {
      // ยังไม่มีข่าวในระบบ: ไม่แสดงส่วนข่าว (เจ้าหน้าที่ยังเห็นปุ่ม "ดึงข่าวล่าสุด")
      $('news').classList.toggle('hidden', !d.posts.length && !staff());
      var noToken = d.sync && d.sync.message === 'needs-token';
      if (!d.posts.length) {
        box.innerHTML = noToken
          ? '<div class="p-4 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex flex-col gap-2">' +
              '<p class="font-body-md text-body-md"><b>ยังเชื่อมต่อเพจ Facebook ไม่ได้</b> — Facebook ไม่อนุญาตให้เว็บอื่นอ่านโพสต์ของเพจโดยไม่มีรหัสเชื่อมต่อ (Page Access Token) ที่ผู้ดูแลเพจสร้างให้ จึงยังไม่มีข่าวในระบบ</p>' +
              '<div class="flex flex-wrap gap-2"><button type="button" data-action="news-setup" class="' + ui.btnClass('primary') + '"><span class="material-symbols-outlined text-[18px]">key</span>วิธีเชื่อมต่อเพจ (ทำครั้งเดียว)</button>' +
              '<button type="button" data-action="news-add" class="' + ui.btnClass('ghost') + '"><span class="material-symbols-outlined text-[18px]">add_photo_alternate</span>เพิ่มข่าวเอง</button></div></div>'
          : '<p class="font-body-sm text-body-sm text-on-surface-variant">ยังไม่มีข่าวในระบบ — กด "ดึงข่าวล่าสุด" เพื่อดึงโพสต์จากเพจ หรือ "เพิ่มข่าว" เพื่อลงข่าวและรูปเอง</p>';
        return;
      }
      var list = showAll ? d.posts : d.posts.slice(0, 6);
      box.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">' + list.map(function (p) { return postCard(p); }).join('') + '</div>' +
        (d.posts.length > 6 ? '<div class="text-center mt-4"><button type="button" data-action="news-more" class="' + ui.btnClass('ghost') + '">' + (showAll ? 'แสดงน้อยลง' : 'ดูข่าวทั้งหมด (' + d.posts.length + ')') + '</button></div>' : '') +
        (d.sync && d.sync.synced_at ? '<p class="mt-3 text-right font-label-sm text-label-sm text-on-surface-variant">อัปเดตจาก Facebook ' + esc(new Date(d.sync.synced_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })) + '</p>' : '');
    });
  }

  // หน้าโครงการ: ภาพจากเพจที่ตรงกับโครงการนี้
  function renderProject(projectId) {
    var anchor = $('diary-list');
    if (!anchor || !projectId) return;
    var host = $('fb-photos');
    if (!host) {
      host = document.createElement('section');
      host.id = 'fb-photos';
      host.className = 'bg-surface-container-lowest rounded-xl shadow-sm p-space-lg hidden';
      var sec = anchor.closest('section') || anchor.parentElement;
      sec.insertAdjacentElement('afterend', host);
    }
    postsFor(projectId).then(function (posts) {
      host.classList.toggle('hidden', !posts.length);
      if (!posts.length) return;
      var all = [];
      posts.forEach(function (p) { (p.images || []).forEach(function (im) { all.push({ src: im.src, post: p }); }); });
      host.innerHTML = '<div class="flex flex-wrap items-center justify-between gap-2 mb-space-md"><div class="flex items-center gap-2"><span class="material-symbols-outlined text-[#1877f2]">photo_library</span>' +
        '<h3 class="font-headline-md text-headline-md text-primary font-bold">ภาพจากเพจ Facebook กองช่าง</h3></div>' +
        '<span class="font-label-sm text-label-sm text-on-surface-variant">' + posts.length + ' โพสต์ • ' + all.length + ' รูป</span></div>' +
        '<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">' + all.slice(0, 12).map(function (im, k) {
          return '<button type="button" data-fb-photo="' + k + '" class="relative aspect-square rounded-lg overflow-hidden bg-surface-container"><img loading="lazy" src="' + esc(im.src) + '" alt="" class="w-full h-full object-cover"/>' +
            (k === 11 && all.length > 12 ? '<span class="absolute inset-0 bg-black/50 text-white font-bold flex items-center justify-center">+' + (all.length - 12) + '</span>' : '') + '</button>';
        }).join('') + '</div>' +
        '<div class="mt-3 flex flex-col gap-1">' + posts.map(function (p) {
          return '<div class="flex items-center justify-between gap-2 font-body-sm text-body-sm"><a href="' + esc(p.permalink || PAGE) + '" target="_blank" rel="noopener" class="text-primary hover:underline truncate">' + esc(dateText(p.created_time) + ' • ' + (p.message || 'โพสต์รูปภาพ').split('\n')[0]) + '</a>' +
            (staff() ? '<button type="button" data-fb-unlink="' + esc(p.id) + '" class="shrink-0 text-on-surface-variant hover:text-error font-label-sm text-label-sm">ไม่เกี่ยวกับโครงการนี้</button>' : '') + '</div>';
        }).join('') + '</div>';
      host.onclick = function (e) {
        var ph = e.target.closest('[data-fb-photo]');
        if (ph) return gallery(all, Number(ph.dataset.fbPhoto));
        var un = e.target.closest('[data-fb-unlink]');
        if (un) {
          var post = posts.filter(function (x) { return x.id === un.dataset.fbUnlink; })[0];
          setLinks(post, projectsFor(post).filter(function (id) { return id !== projectId; })).then(function () { renderProject(projectId); });
        }
      };
    });
  }

  function setLinks(post, ids) {
    var c = client();
    return c.from('news_posts').update({ project_ids: ids }).eq('id', post.id).then(function (r) {
      if (r.error) { ui.toast('บันทึกไม่สำเร็จ: ' + r.error.message, 'error'); return; }
      post.project_ids = ids;
      ui.toast('บันทึกการผูกโครงการแล้ว', 'success');
    });
  }
  function linkDialog(post) {
    var current = projectsFor(post);
    var P = SK.db.data.projects.slice().sort(function (a, b) { return score(post, b) - score(post, a); });
    var body = document.createElement('div');
    body.innerHTML = '<p class="mb-2 font-body-sm text-body-sm text-on-surface-variant line-clamp-3">' + esc(post.message) + '</p>' +
      '<input type="search" data-q placeholder="ค้นหาโครงการ" class="w-full mb-2 px-3 py-2 rounded-lg bg-surface-container-low"/>' +
      '<div data-list class="max-h-[50vh] overflow-y-auto flex flex-col gap-1">' + P.map(function (p) {
        return '<label data-name="' + esc(p.name.toLowerCase()) + '" class="flex items-start gap-2 p-2 rounded-lg hover:bg-surface-container-low"><input type="checkbox" value="' + esc(p.id) + '"' + (current.indexOf(p.id) >= 0 ? ' checked' : '') + ' class="mt-1"/>' +
          '<span class="font-body-sm text-body-sm"><b>' + esc(p.id) + '</b> ' + esc(p.name) + '</span></label>';
      }).join('') + '</div>';
    body.querySelector('[data-q]').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      body.querySelectorAll('[data-name]').forEach(function (l) { l.classList.toggle('hidden', q && l.dataset.name.indexOf(q) < 0 && l.querySelector('input').value.toLowerCase().indexOf(q) < 0); });
    });
    ui.modal({ title: 'ผูกโพสต์กับโครงการ', icon: 'link', size: 'md', body: body, actions: [
      { label: 'ยกเลิก', onClick: function (m) { m.close(); } },
      { label: 'บันทึก', kind: 'primary', icon: 'save', onClick: function (m) {
        var ids = Array.prototype.map.call(body.querySelectorAll('input[type=checkbox]:checked'), function (x) { return x.value; });
        setLinks(post, ids).then(function () { m.close(); renderCard(); });
      } }
    ] });
  }

  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-news-gallery]'), l = e.target.closest('[data-news-link]'), x = e.target.closest('[data-news-del]');
    if (!g && !l && !x) return;
    load().then(function (d) {
      var key = g ? g.dataset.newsGallery : l ? l.dataset.newsLink : x.dataset.newsDel;
      var post = d.posts.filter(function (p) { return p.id === key; })[0];
      if (!post) return;
      if (g) gallery(post.images || [], 0); else if (l) linkDialog(post); else deletePost(post);
    });
  });
  Object.assign(SK.actions, {
    'news-sync': function () { sync(true).then(function (res) { if (res && res.ok) { load(true); renderCard(); } }); },
    'news-setup': setupHelp,
    'news-add': addDialog,
    'news-more': function () { showAll = !showAll; renderCard(); }
  });

  // หลังลบโครงการ: เปลี่ยนรหัสโครงการที่ผูกกับโพสต์ไว้ (map(id) คืนรหัสใหม่ หรือ null = ลบการผูก)
  function remapProjects(map) {
    var c = client();
    if (!c || !staff()) return Promise.resolve();
    return c.from('news_posts').select('id,project_ids').not('project_ids', 'is', null).then(function (r) {
      var jobs = (r.data || []).map(function (post) {
        var ids = (post.project_ids || []).map(map).filter(Boolean);
        if (JSON.stringify(ids) === JSON.stringify(post.project_ids)) return null;
        return c.from('news_posts').update({ project_ids: ids }).eq('id', post.id);
      }).filter(Boolean);
      cache = null;
      return Promise.all(jobs);
    }).then(null, function (err) { console.warn('ปรับการผูกข่าวไม่สำเร็จ', err); });
  }

  SK.news = { load: load, postsFor: postsFor, renderProject: renderProject, sync: sync, remapProjects: remapProjects };
  ui.onReady(function () { renderCard(); autoSync(); });
})();
