// แผนที่ตำบลสีแก้ว: ขอบเขตตำบล/หมู่บ้าน (ชีท "ขอบเขตแผนที่" ของระบบหลัก หรือ OpenStreetMap) + หมุดโครงการ
(function () {
  'use strict';
  var SK = window.SK, esc = SK.esc;
  var QUERY = 'ตำบลสีแก้ว อำเภอเมืองร้อยเอ็ด จังหวัดร้อยเอ็ด';
  var COLORS = ['#006194', '#b45309', '#0f766e', '#7c3aed', '#b91c1c', '#0369a1', '#a16207', '#15803d', '#be185d', '#4338ca', '#c2410c'];

  function meta() { var d = SK.store.data; return d.meta || (d.meta = {}); }
  var osmP = null;
  function loadOsm() {
    if (osmP) return osmP;
    var cached = meta().tambonOsm;
    if (cached && cached.geojson) return (osmP = Promise.resolve(cached));
    osmP = fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=5&accept-language=th&countrycodes=th&q=' + encodeURIComponent(QUERY))
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var hit = (list || []).filter(function (x) { return x.geojson && /Polygon/.test(x.geojson.type) && /สีแก้ว/.test(x.display_name || ''); })[0];
        if (!hit) return null;
        var out = { geojson: hit.geojson, center: [+hit.lat, +hit.lon], bbox: hit.boundingbox.map(Number), villages: [], fetchedAt: new Date().toISOString() };
        meta().tambonOsm = out; SK.store.save();
        return out;
      })
      .catch(function () { osmP = null; return null; });
    return osmP;
  }
  var sheetP = null;
  function loadSheet() {
    if (!window.SKGas) return Promise.resolve([]);
    if (!sheetP) sheetP = SKGas.call('getMapBoundaries').then(function (r) { return (r && r.boundaries) || []; }, function () { return []; });
    return sheetP;
  }
  if (typeof BroadcastChannel === 'function') new BroadcastChannel('sikaew-gas').addEventListener('message', function () { sheetP = null; });

  function ringOf(g) { var geo = g.geometry || g; return geo.type === 'MultiPolygon' ? geo.coordinates[0][0] : geo.coordinates[0]; }
  function centerOf(ring) { var lat = 0, lng = 0; ring.forEach(function (p) { lat += p[1]; lng += p[0]; }); return [lat / ring.length, lng / ring.length]; }

  // create(el, { projects, pins: true, onPin(p), zoomControl }) -> { map, ready }
  function create(el, opts) {
    opts = opts || {};
    var center = (SK.projects.info && SK.projects.info.center) || SK.projects.CENTER;
    var map = L.map(el, { zoomControl: opts.zoomControl !== false, attributionControl: false, scrollWheelZoom: false }).setView(center, 13);
    var street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    var sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
    (opts.satellite ? sat : street).addTo(map);
    if (opts.layers) L.control.layers({ 'แผนที่ถนน': street, 'ภาพถ่ายดาวเทียม': sat }, null, { position: 'topright' }).addTo(map);
    var bounds = null, pins = L.layerGroup().addTo(map);
    var ready = Promise.all([loadOsm(), loadSheet()]).then(function (r) {
      var osm = r[0], sheet = r[1];
      var tambon = sheet.filter(function (b) { return b.boundaryType === 'tambon'; })[0];
      var geo = tambon ? tambon.geoJson : osm && osm.geojson;
      if (geo) {
        var t = L.geoJSON(geo, { interactive: false, style: { color: '#006194', weight: 2.5, dashArray: '8 6', fillColor: '#006194', fillOpacity: 0.04 } }).addTo(map);
        bounds = t.getBounds();
      }
      sheet.filter(function (b) { return b.boundaryType !== 'tambon' && b.geoJson; }).forEach(function (b, i) {
        var color = b.color || COLORS[i % COLORS.length];
        var layer = L.geoJSON(b.geoJson, { style: { color: color, weight: 1.5, fillColor: color, fillOpacity: 0.06 } }).addTo(map);
        if (b.villageNo && opts.labels !== false) {
          try { L.marker(centerOf(ringOf(b.geoJson)), { interactive: false, icon: L.divIcon({ className: 'sk-village-label', html: '<span>ม.' + esc(b.villageNo) + '</span>', iconSize: null }) }).addTo(map); } catch (e) {}
        }
        layer.bindTooltip(esc(b.villageNo ? 'หมู่ที่ ' + b.villageNo : b.boundaryName || ''), { sticky: true });
        if (!bounds) bounds = layer.getBounds(); else bounds.extend(layer.getBounds());
      });
      fit();
    });
    function fit() {
      var pts = [];
      pins.eachLayer(function (m) { pts.push(m.getLatLng()); });
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [12, 12] });
      else if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 16 });
    }
    function setProjects(list) {
      pins.clearLayers();
      (list || []).forEach(function (p) {
        if (!p.lat || !p.lng) return;
        var color = (SK.projects.STATUSES[p.status] || {}).color || '#006194';
        var m = L.marker([p.lat, p.lng], { title: p.name, icon: L.divIcon({ className: '', html: '<div class="sk-pin" style="background:' + color + '"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }) }).addTo(pins);
        m.bindTooltip('<b>' + esc(p.name) + '</b><br>' + esc(p.place || '') + ' • ' + p.actual + '%', { direction: 'top' });
        if (opts.onPin) m.on('click', function () { opts.onPin(p); });
      });
      if (!bounds) fit();
    }
    if (opts.projects) setProjects(opts.projects);
    setTimeout(function () { map.invalidateSize(); }, 80);
    return { map: map, ready: ready, setProjects: setProjects, fit: fit };
  }
  SK.map = { create: create };
})();
