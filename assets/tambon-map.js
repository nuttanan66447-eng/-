// ขอบเขตตำบลสีแก้วและหมู่บ้านบนแผนที่ (ใช้ทุกแผนที่ในเว็บ)
// - เส้นขอบตำบล: ขอบเขตที่วาดไว้ในชีท "ขอบเขตแผนที่" (ประเภทตำบล) หรือขอบเขตการปกครองจาก OpenStreetMap
// - เส้นแบ่งหมู่บ้าน: ขอบเขตหมู่บ้านที่เจ้าหน้าที่วาดไว้ในชีท "ขอบเขตแผนที่" (ระบบเดิมใช้ชีทเดียวกัน)
// - ชื่อหมู่บ้าน: ตำแหน่งหมู่บ้านจาก OpenStreetMap
// ข้อมูลจาก OpenStreetMap โหลดครั้งแรกแล้วเก็บไว้กับข้อมูลเว็บ (ซิงก์คลาวด์) ไม่ต้องโหลดซ้ำ
(function () {
  'use strict';
  var SK = window.SK, ui = SK.ui, esc = ui.esc;
  var QUERY = 'ตำบลสีแก้ว อำเภอเมืองร้อยเอ็ด จังหวัดร้อยเอ็ด';
  var COLORS = ['#1e3a8a', '#ea580c', '#0f766e', '#7c3aed', '#b91c1c', '#0369a1', '#a16207', '#15803d', '#be185d', '#4338ca', '#c2410c'];

  // ---------- ข้อมูล ----------
  var osmPromise = null;
  function meta() { var d = SK.db.data; return d.meta || (d.meta = {}); }
  function loadOsm() {
    if (osmPromise) return osmPromise;
    var cached = meta().tambonOsm;
    if (cached && cached.geojson) return (osmPromise = Promise.resolve(cached));
    osmPromise = fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=5&accept-language=th&countrycodes=th&q=' + encodeURIComponent(QUERY))
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var hit = (list || []).filter(function (x) { return x.geojson && /Polygon/.test(x.geojson.type) && /สีแก้ว/.test(x.display_name || x.name || ''); })[0];
        if (!hit) throw new Error('ไม่พบขอบเขตตำบลใน OpenStreetMap');
        var out = { geojson: hit.geojson, center: [+hit.lat, +hit.lon], bbox: hit.boundingbox.map(Number), osmType: hit.osm_type, osmId: hit.osm_id, villages: [], fetchedAt: new Date().toISOString() };
        if (hit.osm_type !== 'relation' && hit.osm_type !== 'way') return out;
        var area = (hit.osm_type === 'relation' ? 3600000000 : 2400000000) + Number(hit.osm_id);
        var q = '[out:json][timeout:25];area(' + area + ')->.a;(node["place"~"^(village|hamlet)$"](area.a););out body;';
        return fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            out.villages = (res.elements || []).filter(function (e) { return e.tags && (e.tags['name:th'] || e.tags.name); })
              .map(function (e) { return { name: e.tags['name:th'] || e.tags.name, lat: e.lat, lng: e.lon }; });
            return out;
          }, function () { return out; });
      })
      .then(function (out) { meta().tambonOsm = out; SK.db.save(); return out; })
      .catch(function (err) { console.warn('โหลดขอบเขตตำบลไม่สำเร็จ', err); osmPromise = null; return null; });
    return osmPromise;
  }
  function loadSheetBoundaries() {
    if (!window.SKGas) return Promise.resolve([]);
    return SKGas.call('getMapBoundaries').then(function (r) { return (r && r.boundaries) || []; }, function () { return []; });
  }

  // จุดกลางของพื้นที่หมู่บ้าน (สำหรับวางป้าย ม.): จุดในรูปที่ห่างจากเส้นขอบมากที่สุด
  // (ค่าเฉลี่ยของจุดยอดเบี้ยวไปทางด้านที่มีจุดถี่ และอาจตกนอกรูปเมื่อรูปเว้า)
  function inside(x, y, ring) {
    var c = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function edgeDist(x, y, ring, k) {
    var best = Infinity;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var ax = ring[j][0] * k, ay = ring[j][1], bx = ring[i][0] * k, by = ring[i][1], px = x * k;
      var dx = bx - ax, dy = by - ay, t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
      var ex = ax + t * dx - px, ey = ay + t * dy - y;
      best = Math.min(best, ex * ex + ey * ey);
    }
    return Math.sqrt(best);
  }
  function ringCenter(ring) {
    var xs = ring.map(function (p) { return p[0]; }), ys = ring.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var k = Math.cos((y0 + y1) / 2 * Math.PI / 180), best = null, bestD = -1, N = 24;
    var scan = function (ax, bx, ay, by) {
      for (var i = 0; i <= N; i++) for (var j = 0; j <= N; j++) {
        var x = ax + (bx - ax) * i / N, y = ay + (by - ay) * j / N;
        if (!inside(x, y, ring)) continue;
        var d = edgeDist(x, y, ring, k);
        if (d > bestD) { bestD = d; best = [x, y]; }
      }
    };
    scan(x0, x1, y0, y1);
    if (best) { var sx = (x1 - x0) / N, sy = (y1 - y0) / N; scan(best[0] - sx, best[0] + sx, best[1] - sy, best[1] + sy); }
    if (!best) { var lat = 0, lng = 0; ring.forEach(function (p) { lat += p[1]; lng += p[0]; }); return [lat / ring.length, lng / ring.length]; }
    return [best[1], best[0]];
  }
  function villageLabel(no) {
    var v = SK.ref.VILLAGES['m' + no];
    return v ? v.name : 'หมู่ที่ ' + no;
  }

  // ---------- วาดบนแผนที่ ----------
  // attach(map, { fit: true, labels: true }) -> { group, ready: Promise, refresh() }
  function attach(map, opts) {
    opts = opts || {};
    var group = L.layerGroup().addTo(map);
    var state = { group: group, bounds: null };
    function draw(osm, sheet) {
      group.clearLayers();
      var tambonSheet = sheet.filter(function (b) { return b.boundaryType === 'tambon'; })[0];
      var tambonGeo = tambonSheet ? tambonSheet.geoJson : osm && osm.geojson;
      if (tambonGeo) {
        var t = L.geoJSON(tambonGeo, { interactive: false, style: { color: '#00236f', weight: 3, dashArray: '8 6', fillColor: '#00236f', fillOpacity: 0.04 } }).addTo(group);
        state.bounds = t.getBounds();
      }
      sheet.filter(function (b) { return b.boundaryType !== 'tambon' && b.geoJson; }).forEach(function (b, i) {
        var color = b.color || COLORS[i % COLORS.length];
        var layer = L.geoJSON(b.geoJson, { style: { color: color, weight: 2, dashArray: b.lineStyle === 'dashed' ? '6 4' : null, fillColor: color, fillOpacity: b.fillEnabled ? 0.08 : 0 } }).addTo(group);
        var name = b.villageNo ? villageLabel(b.villageNo) : b.boundaryName;
        layer.bindTooltip(esc(name), { sticky: true, className: 'sk-village-tip' });
        if (opts.labels !== false) {
          var ring = b.geoJson.geometry ? b.geoJson.geometry.coordinates[0] : b.geoJson.coordinates[0];
          L.marker(ringCenter(ring), { interactive: false, icon: L.divIcon({ className: 'sk-village-label', html: '<span>' + esc(b.villageNo ? 'ม.' + b.villageNo : name) + '</span>', iconSize: null }) }).addTo(group);
        }
        if (!state.bounds) state.bounds = layer.getBounds(); else state.bounds.extend(layer.getBounds());
        if (opts.onBoundary) opts.onBoundary(b, layer);
      });
      if (opts.labels !== false && osm && osm.villages) {
        osm.villages.forEach(function (v) {
          L.marker([v.lat, v.lng], { interactive: false, icon: L.divIcon({ className: 'sk-osm-village', html: '<span>' + esc(v.name) + '</span>', iconSize: null }) }).addTo(group);
        });
      }
      if (opts.fit !== false && state.bounds && state.bounds.isValid()) map.fitBounds(state.bounds, { padding: [16, 16] });
    }
    state.refresh = function () {
      return Promise.all([loadOsm(), loadSheetBoundaries()]).then(function (r) { draw(r[0], r[1]); return state; });
    };
    state.ready = state.refresh();
    state.fit = function () { if (state.bounds && state.bounds.isValid()) map.flyToBounds(state.bounds, { padding: [16, 16] }); else map.flyTo(center(), 14); };
    return state;
  }

  // ศูนย์กลางตำบล
  function center() {
    var o = meta().tambonOsm;
    return o && o.center ? o.center : SK.ref.CENTER;
  }

  // ---------- วาดขอบเขตหมู่บ้าน (เจ้าหน้าที่) ----------
  function startDraw(map, done) {
    var pts = [], line = L.polyline([], { color: '#ea580c', weight: 3, dashArray: '4 4', interactive: false }).addTo(map), dots = L.layerGroup().addTo(map);
    var bar = L.control({ position: 'bottomright' });
    bar.onAdd = function () {
      var d = L.DomUtil.create('div', 'sk-draw-bar');
      d.innerHTML = '<b>วาดขอบเขตหมู่บ้าน</b><span data-n>คลิกบนแผนที่เพื่อวางจุดแรก</span>' +
        '<button type="button" data-undo>ย้อนจุด</button><button type="button" data-cancel>ยกเลิก</button><button type="button" data-finish class="ok">เสร็จสิ้น</button>';
      L.DomEvent.disableClickPropagation(d);
      d.addEventListener('click', function (e) {
        if (e.target.hasAttribute('data-undo')) { pts.pop(); redraw(); }
        if (e.target.hasAttribute('data-cancel')) stop(null);
        if (e.target.hasAttribute('data-finish')) {
          if (pts.length < 3) return ui.toast('วางจุดอย่างน้อย 3 จุด', 'error');
          stop(pts.slice());
        }
      });
      return d;
    };
    bar.addTo(map);
    map.getContainer().style.cursor = 'crosshair';
    var dbl = map.doubleClickZoom.enabled();
    map.doubleClickZoom.disable();
    function redraw() {
      line.setLatLngs(pts.length > 2 ? pts.concat([pts[0]]) : pts);
      dots.clearLayers();
      pts.forEach(function (p) { L.circleMarker(p, { radius: 4, color: '#ea580c', fillOpacity: 1, interactive: false }).addTo(dots); });
      var n = bar.getContainer().querySelector('[data-n]');
      n.textContent = pts.length ? pts.length + ' จุด' + (pts.length < 3 ? ' (ต้องมีอย่างน้อย 3 จุด)' : ' — กด "เสร็จสิ้น" เมื่อครบรอบ') : 'คลิกบนแผนที่เพื่อวางจุดแรก';
    }
    function onClick(e) { pts.push([e.latlng.lat, e.latlng.lng]); redraw(); }
    map.on('click', onClick);
    function stop(result) {
      map.off('click', onClick);
      map.getContainer().style.cursor = '';
      if (dbl) map.doubleClickZoom.enable();
      line.remove(); dots.remove(); bar.remove();
      if (result) askVillage(result, done);
    }
  }
  function askVillage(pts, done) {
    var villages = (window.SK_PERSONNEL || {}).villages || [];
    ui.formModal({
      title: 'บันทึกขอบเขตหมู่บ้าน', icon: 'polyline', size: 'sm',
      fields: [
        { name: 'type', label: 'ประเภทขอบเขต', type: 'select', span: 2, options: [['village', 'ขอบเขตหมู่บ้าน'], ['tambon', 'ขอบเขตตำบลสีแก้ว (ทั้งตำบล)']] },
        { name: 'villageNo', label: 'หมู่ที่', type: 'select', span: 2, options: [['', 'เลือกหมู่บ้าน']].concat(villages.map(function (v) { return [String(v.no), 'หมู่ที่ ' + v.no + ' ' + v.name]; })) },
        { name: 'color', label: 'สีเส้น', type: 'select', options: [['#1e3a8a', 'น้ำเงิน'], ['#ea580c', 'ส้ม'], ['#0f766e', 'เขียว'], ['#7c3aed', 'ม่วง'], ['#b91c1c', 'แดง']] }
      ],
      submitLabel: 'บันทึกขอบเขต',
      onSubmit: function (v) {
        if (v.type === 'village' && !v.villageNo) { ui.toast('เลือกหมู่ที่ก่อน', 'error'); return true; }
        var ring = pts.map(function (p) { return [p[1], p[0]]; });
        ring.push(ring[0]);
        var user = SK.ui.currentUser ? SK.ui.currentUser().name : '';
        return SKGas.saveBoundary({
          boundaryType: v.type, villageNo: v.type === 'village' ? v.villageNo : '', color: v.color, fillEnabled: true,
          boundaryName: v.type === 'tambon' ? 'ตำบลสีแก้ว' : 'หมู่ที่ ' + v.villageNo,
          geoJson: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
        }, user).then(function () {
          ui.toast('บันทึกขอบเขตแล้ว', 'success');
          if (done) done();
        }, function (err) { ui.toast('บันทึกไม่สำเร็จ: ' + err, 'error'); return true; });
      }
    });
  }

  SK.tambon = { attach: attach, center: center, loadOsm: loadOsm, startDraw: startDraw };
})();
