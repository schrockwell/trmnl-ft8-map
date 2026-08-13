// RBN-Digest API (rbn.schrockwell.com) -> spots with precomputed great-circle
// SVG paths for an equirectangular map, viewBox 0 0 720 360 (2 units/degree).
// Polling URL always passes loc=1, so both stations have grid + lat/lon.

function px(lon) { return Math.round((lon + 180) * 2 * 10) / 10; }
function py(lat) { return Math.round((90 - lat) * 2 * 10) / 10; }

// Great-circle polyline between two lat/lons, as projected [x,y] pairs with
// longitudes unwrapped (x may run past 0..720 when crossing the date line).
function greatCircle(lat1, lon1, lat2, lon2) {
  var d2r = Math.PI / 180;
  var p1 = lat1 * d2r, l1 = lon1 * d2r, p2 = lat2 * d2r, l2 = lon2 * d2r;
  var x1 = Math.cos(p1) * Math.cos(l1), y1 = Math.cos(p1) * Math.sin(l1), z1 = Math.sin(p1);
  var x2 = Math.cos(p2) * Math.cos(l2), y2 = Math.cos(p2) * Math.sin(l2), z2 = Math.sin(p2);
  var dot = x1 * x2 + y1 * y2 + z1 * z2;
  dot = Math.max(-1, Math.min(1, dot));
  var ang = Math.acos(dot);
  var pts = [];
  var N = 20;
  var prevLon = lon1;
  for (var i = 0; i <= N; i++) {
    var t = i / N, lat, lon;
    if (ang < 1e-6) { lat = lat1; lon = lon1; }
    else {
      var A = Math.sin((1 - t) * ang) / Math.sin(ang);
      var B = Math.sin(t * ang) / Math.sin(ang);
      var x = A * x1 + B * x2, y = A * y1 + B * y2, z = A * z1 + B * z2;
      lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / d2r;
      lon = Math.atan2(y, x) / d2r;
    }
    while (lon - prevLon > 180) lon -= 360;
    while (lon - prevLon < -180) lon += 360;
    prevLon = lon;
    pts.push([px(lon), py(lat)]);
  }
  return pts;
}

function pathFrom(pts, xoff) {
  var d = '';
  for (var i = 0; i < pts.length; i++) {
    var x = Math.round((pts[i][0] + xoff) * 10) / 10;
    d += (i === 0 ? 'M' : 'L') + x + ' ' + pts[i][1];
  }
  return d;
}

function transform(input) {
  var raw = [];
  if (input && Array.isArray(input.spots)) raw = input.spots;
  else if (input && input.IDX_0 && Array.isArray(input.IDX_0.spots)) raw = input.IDX_0.spots;

  var spots = [];
  var counts = {};
  for (var i = 0; i < raw.length; i++) {
    var s = raw[i];
    if (typeof s.de_lat !== 'number' || typeof s.de_lon !== 'number' ||
        typeof s.dx_lat !== 'number' || typeof s.dx_lon !== 'number') continue;

    var pts = greatCircle(s.de_lat, s.de_lon, s.dx_lat, s.dx_lon);
    var minX = 9999, maxX = -9999;
    for (var j = 0; j < pts.length; j++) {
      if (pts[j][0] < minX) minX = pts[j][0];
      if (pts[j][0] > maxX) maxX = pts[j][0];
    }
    var d = pathFrom(pts, 0);
    if (minX < 0) d += pathFrom(pts, 720);
    if (maxX > 720) d += pathFrom(pts, -720);

    counts[s.band] = (counts[s.band] || 0) + 1;
    spots.push({
      de: s.de,
      dx: s.dx,
      de_grid: s.de_grid || '',
      dx_grid: s.dx_grid || '',
      band: s.band,
      mode: s.mode,
      freq: s.freq,
      snr: s.snr,
      time: (s.heard_at || '').slice(11, 16),
      path: d,
      x1: pts[0][0], y1: pts[0][1],
      x2: pts[pts.length - 1][0], y2: pts[pts.length - 1][1]
    });
  }

  return { spots: spots, counts: counts, total: spots.length };
}

function run(input) { return transform(input); }
