// รูปภาพโครงการ: แต่ละโครงการเก็บรูปได้หลายรูป (SK.db.data.photos)
// ไฟล์รูปเก็บในที่เก็บไฟล์ของเว็บ (IndexedDB + Supabase Storage "files" เมื่อเข้าสู่ระบบ) ย่อขนาดก่อนเก็บ
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, esc = ui.esc;
  var MAX = 1600, urls = {};

  function list() { var d = SK.db.data; if (!Array.isArray(d.photos)) d.photos = []; return d.photos; }
  function of(projectId) {
    return list().filter(function (x) { return x.projectId === projectId; })
      .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) || String(b.id).localeCompare(String(a.id)); });
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function owner() { var u = ui.currentUser ? ui.currentUser() : null; return (u && u.signedIn && u.name) || ''; }

  // ย่อรูปให้ด้านยาวไม่เกิน 1600 px (JPEG) ก่อนเก็บ
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
        c.toBlob(function (b) {
          resolve(b ? new File([b], (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(src); resolve(null); };
      img.src = src;
    });
  }

  function add(projectId, onDone) {
    ui.pickFile('image/*', true).then(function (files) {
      if (!files || !files.length) return;
      var all = Array.prototype.slice.call(files);
      ui.toast('กำลังบันทึกรูป ' + all.length + ' รูป...');
      var p = SK.db.project(projectId), added = 0;
      // เก็บทีละรูปตามลำดับ (ไม่ส่งพร้อมกันหลายไฟล์)
      all.reduce(function (chain, f) {
        return chain.then(function () {
          if (!/^image\//.test(f.type || '')) return;
          return shrink(f).then(function (img) {
            if (!img) { ui.toast(f.name + ' ไม่ใช่ไฟล์รูปภาพ', 'error'); return; }
            return SK.db.files.put(img).then(function (fileId) {
              list().unshift({
                id: 'PH-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
                projectId: projectId, projectName: p ? p.name : '', fileId: fileId, fileName: img.name, fileSize: img.size,
                caption: (f.name || '').replace(/\.[^.]+$/, '').replace(/^(IMG|DSC|PXL|image)[_-]?\d.*$/i, ''), date: today(), owner: owner()
              });
              added++;
            });
          });
        });
      }, Promise.resolve()).then(function () {
        if (!added) return;
        SK.db.save();
        ui.toast('เพิ่มรูปภาพโครงการ ' + added + ' รูปแล้ว', 'success');
        if (onDone) onDone();
      }).catch(function (err) { ui.toast('บันทึกรูปไม่สำเร็จ: ' + (err && err.message || err), 'error'); });
    });
  }

  function url(ph) {
    if (urls[ph.fileId]) return Promise.resolve(urls[ph.fileId]);
    return SK.db.files.get(ph.fileId).then(function (rec) {
      if (!rec || !rec.blob) return '';
      return (urls[ph.fileId] = URL.createObjectURL(rec.blob));
    });
  }
  // เติมรูปให้ <img data-photo-id> ในหน้า (โหลดจากที่เก็บไฟล์)
  function hydrate(root) {
    (root || document).querySelectorAll('img[data-photo-id]:not([src])').forEach(function (img) {
      var ph = list().filter(function (x) { return x.id === img.dataset.photoId; })[0];
      if (!ph) return;
      url(ph).then(function (u) {
        if (u) img.src = u;
        else { img.alt = 'ไม่พบไฟล์รูป'; img.classList.add('opacity-40'); img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; }
      });
    });
  }
  function thumb(ph, cls) {
    return '<button type="button" data-action="photo-view" data-id="' + esc(ph.id) + '" class="group relative block overflow-hidden rounded-lg bg-surface-container ' + (cls || 'aspect-[4/3]') + '" data-search="' + esc(((ph.caption || '') + ' ' + (ph.owner || '')).toLowerCase()) + '">' +
      '<img data-photo-id="' + esc(ph.id) + '" alt="' + esc(ph.caption || 'รูปภาพโครงการ') + '" class="w-full h-full object-cover transition-transform group-hover:scale-105"/>' +
      (ph.caption ? '<span class="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent text-white text-left font-label-sm text-label-sm line-clamp-1">' + esc(ph.caption) + '</span>' : '') + '</button>';
  }

  function view(id, onChange) {
    var ph = list().filter(function (x) { return x.id === id; })[0];
    if (!ph) return;
    var box = document.createElement('div');
    box.innerHTML = '<div class="flex flex-col gap-space-md"><div class="bg-black/90 rounded-lg flex items-center justify-center min-h-[40vh]"><img data-photo-id="' + esc(ph.id) + '" alt="" class="max-h-[65vh] max-w-full object-contain"/></div>' +
      '<label class="flex flex-col gap-1"><span class="font-label-md text-label-md text-on-surface-variant">คำอธิบายรูป</span><input data-caption type="text" value="' + esc(ph.caption || '') + '" placeholder="เช่น ภาพก่อนดำเนินการ / ระหว่างดำเนินการ / หลังดำเนินการ" class="px-3 py-2 rounded-lg bg-surface-container-low"/></label>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant">เพิ่มเมื่อ ' + ui.dateLong(ph.date) + (ph.owner ? ' • ' + esc(ph.owner) : '') + '</p></div>';
    hydrate(box);
    ui.modal({
      title: 'รูปภาพโครงการ', subtitle: ph.projectName || '', icon: 'photo_library', size: 'xl', body: box,
      actions: [
        { label: 'ลบรูป', kind: 'danger', icon: 'delete', onClick: function (m) {
          ui.confirm('ลบรูปนี้ออกจากโครงการ?', 'ลบรูป', 'danger').then(function (ok) {
            if (!ok) return;
            SK.db.data.photos = list().filter(function (x) { return x.id !== ph.id; });
            SK.db.save(); m.close(); ui.toast('ลบรูปแล้ว', 'success');
            if (onChange) onChange();
          });
        } },
        { label: 'ดาวน์โหลด', icon: 'download', onClick: function () {
          SK.db.files.get(ph.fileId).then(function (rec) { if (rec) ui.download('project-photo-' + ph.id.toLowerCase() + '.jpg', rec.blob); });
        } },
        { label: 'บันทึก', kind: 'primary', icon: 'save', onClick: function (m) {
          ph.caption = box.querySelector('[data-caption]').value.trim();
          SK.db.save(); m.close(); ui.toast('บันทึกคำอธิบายรูปแล้ว', 'success');
          if (onChange) onChange();
        } }
      ]
    });
  }

  SK.photos = { of: of, add: add, view: view, thumb: thumb, hydrate: hydrate, url: url };
})();
