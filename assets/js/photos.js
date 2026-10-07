// รูปภาพโครงการ (SK.store.data.photos: projectId, fileId, caption, date, owner) — รูปเดิมที่เคยเพิ่มไว้ใช้ต่อได้
// ไฟล์ย่อให้ด้านยาวไม่เกิน 1600px เก็บในที่เก็บไฟล์ (IndexedDB + Storage "files" เมื่อเข้าสู่ระบบ)
(function () {
  'use strict';
  var SK = window.SK, esc = SK.esc, icon = SK.icon;
  var MAX = 1600, urls = {};

  function list() { return SK.store.list('photos'); }
  function of(projectId) {
    return list().filter(function (x) { return !projectId || x.projectId === projectId; })
      .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) || String(b.id).localeCompare(String(a.id)); });
  }
  function owner() { return (SK.cloud && SK.cloud.active && SK.cloud.displayName()) || ''; }
  function shrink(file) {
    return new Promise(function (resolve) {
      var img = new Image(), src = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(src);
        var s = Math.min(1, MAX / Math.max(img.width, img.height));
        if (s === 1 && file.size < 900 * 1024) return resolve(file);
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { resolve(b ? new File([b], (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(src); resolve(null); };
      img.src = src;
    });
  }
  // เพิ่มรูป (เลือกได้หลายรูป) stage: ก่อน/ระหว่าง/หลังดำเนินการ
  function add(projectId, stage) {
    return SK.pickFile('image/*', true).then(function (files) {
      if (!files || !files.length) return 0;
      var all = Array.prototype.slice.call(files), p = SK.projects.byId(projectId), added = 0;
      SK.toast('กำลังบันทึกรูป ' + all.length + ' รูป...');
      return all.reduce(function (chain, f) {
        return chain.then(function () {
          if (!/^image\//.test(f.type || '')) return;
          return shrink(f).then(function (img) {
            if (!img) return SK.toast(f.name + ' ไม่ใช่ไฟล์รูปภาพ', 'error');
            return SK.store.files.put(img).then(function (fileId) {
              list().unshift({
                id: SK.uid('PH'), projectId: projectId, projectName: p ? p.name : '', fileId: fileId, fileName: img.name, fileSize: img.size,
                caption: stage || '', stage: stage || '', date: SK.todayIso(), owner: owner()
              });
              added++;
            });
          });
        });
      }, Promise.resolve()).then(function () {
        if (!added) return 0;
        SK.store.save();
        SK.toast('เพิ่มรูปภาพโครงการ ' + added + ' รูปแล้ว', 'success');
        window.dispatchEvent(new CustomEvent('sk:photos'));
        return added;
      });
    }).catch(function (err) { SK.toast('บันทึกรูปไม่สำเร็จ: ' + (err && err.message || err), 'error'); return 0; });
  }
  function url(ph) {
    if (urls[ph.fileId]) return Promise.resolve(urls[ph.fileId]);
    return SK.store.files.get(ph.fileId).then(function (rec) { return rec && rec.blob ? (urls[ph.fileId] = URL.createObjectURL(rec.blob)) : ''; });
  }
  // เติมรูปให้ <img data-photo-id>
  function hydrate(root) {
    (root || document).querySelectorAll('img[data-photo-id]:not([src])').forEach(function (img) {
      var ph = list().filter(function (x) { return x.id === img.dataset.photoId; })[0];
      if (!ph) return;
      url(ph).then(function (u) {
        if (u) img.src = u;
        else { img.alt = 'ไม่พบไฟล์รูป'; img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; img.classList.add('opacity-30'); }
      });
    });
  }
  function thumb(ph, cls) {
    return '<button type="button" data-photo="' + esc(ph.id) + '" class="group relative block overflow-hidden rounded-2xl bg-surface-container ' + (cls || 'aspect-[4/3]') + '">' +
      '<img data-photo-id="' + esc(ph.id) + '" alt="' + esc(ph.caption || 'รูปภาพโครงการ') + '" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>' +
      (ph.caption ? '<span class="absolute inset-x-0 bottom-0 px-3 py-1.5 bg-gradient-to-t from-black/70 to-transparent text-white text-left font-label-md text-label-md line-clamp-1">' + esc(ph.caption) + '</span>' : '') + '</button>';
  }
  function view(id) {
    var ph = list().filter(function (x) { return x.id === id; })[0];
    if (!ph) return;
    var box = document.createElement('div');
    box.innerHTML = '<div class="flex flex-col gap-4"><div class="rounded-2xl bg-black/90 flex items-center justify-center min-h-[40vh] overflow-hidden"><img data-photo-id="' + esc(ph.id) + '" alt="" class="max-h-[62vh] max-w-full object-contain"/></div>' +
      '<label class="field"><span>คำอธิบายรูป</span><input data-caption type="text" value="' + esc(ph.caption || '') + '" placeholder="เช่น ก่อนดำเนินการ / ระหว่างดำเนินการ / หลังดำเนินการ" class="input"/></label>' +
      '<p class="font-body-sm text-body-sm text-outline">เพิ่มเมื่อ ' + SK.dateLong(ph.date) + (ph.owner ? ' • ' + esc(ph.owner) : '') + '</p></div>';
    hydrate(box);
    SK.modal({
      title: 'รูปภาพโครงการ', subtitle: ph.projectName || '', icon: 'photo_library', size: 'lg', body: box,
      actions: [
        { label: 'ลบรูป', kind: 'danger', icon: 'delete', left: true, onClick: function (m) {
          SK.confirm('ลบรูปนี้ออกจากโครงการ?', 'ลบรูป', 'danger').then(function (ok) {
            if (!ok) return;
            SK.store.data.photos = list().filter(function (x) { return x.id !== ph.id; });
            SK.store.save(); m.close(); SK.toast('ลบรูปแล้ว', 'success');
            window.dispatchEvent(new CustomEvent('sk:photos'));
          });
        } },
        { label: 'ดาวน์โหลด', icon: 'download', onClick: function () {
          SK.store.files.get(ph.fileId).then(function (rec) { if (rec) SK.download('project-photo-' + ph.id.toLowerCase() + '.jpg', rec.blob); });
        } },
        { label: 'บันทึก', kind: 'primary', icon: 'save', onClick: function (m) {
          ph.caption = box.querySelector('[data-caption]').value.trim();
          SK.store.save(); m.close(); SK.toast('บันทึกคำอธิบายรูปแล้ว', 'success');
          window.dispatchEvent(new CustomEvent('sk:photos'));
        } }
      ]
    });
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-photo]'); if (b) view(b.dataset.photo); });

  SK.photos = { of: of, add: add, view: view, thumb: thumb, hydrate: hydrate, url: url, icon: icon };
})();
