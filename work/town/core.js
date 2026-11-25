/* Fog Town: core.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = 1280, H = 720, G = 520, KERB = 574, ROAD = 580, MIDX = 640;
  function rng(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function hex(c) { if (c[0] !== '#') { var m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; } var n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { a = hex(a); b = hex(b); return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; }
  function sh(c, f) { return f < 1 ? mix(c, '#18232a', 1 - f) : mix(c, '#fff3da', f - 1); }   // shadows cool, light warm
  function rgba(c, a) { c = hex(c); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  var PAL = {
    fog: { sky0: '#a7a59c', sky1: '#d2cfc6', fog: '#d4d1c7', far: '#8a8780', mid: '#6c6a64', back: '#57554f',
      brick: '#6e4c42', brick2: '#5c4a44', brick3: '#735848', stone: '#8c897f', stone2: '#9b978c', plaster: '#a9a395', plaster2: '#8f9a92', stucco: '#9a8e7a', wood: '#6a5d4e', trim: '#bdb8ac',
      frame: '#3b3a37', glass: '#4f5759', glassHi: '#8a9294', lit: '#d9b066', curtain: ['#7a3b34', '#5f7470', '#8a7a5a', '#4c4b47'], awn: ['#7a3b34', '#d2cbbb'],
      metal: '#4f5a58', dark: '#22211f', sign: '#6b3530', signText: '#ece6d6', path: '#86837a', joint: '#66635b', kerb: '#9c998f', gutter: '#4f4e48', road: '#55544e', line: '#c9a55a',
      leaf: ['#2f3b2c', '#45553a', '#5f6e45', '#7d8a55'] },
    rust: { sky0: '#0a0504', sky1: '#24100b', fog: '#22100b', far: '#2a1510', mid: '#341a12', back: '#3d1a12',
      brick: '#6e2a17', brick2: '#5a2214', brick3: '#64301c', stone: '#4a2a20', stone2: '#553024', plaster: '#3a2e28', plaster2: '#2a1d18', stucco: '#3a2e28', wood: '#3d1a12', trim: '#3a2e28',
      frame: '#1a0f0c', glass: '#0e0807', glassHi: '#1a0f0c', lit: '#e0a040', curtain: ['#3d1a12', '#2a1510', '#3d1a12', '#2a1510'], awn: ['#3d1a12', '#6e2a17'],
      metal: '#3a2e28', dark: '#0e0807', sign: '#2a1d18', signText: '#d9cbb0', path: '#2a1510', joint: '#0e0807', kerb: '#3a2e28', gutter: '#170d0a', road: '#170d0a', line: '#3d1a12',
      leaf: ['#1a0f0c', '#2a1510', '#3d1a12', '#5a2a18'] }
  };

  // ---------------------------------------------------------------- a painter: whole pixels only
  function Pt(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; this.c = c; this.g = c.getContext('2d'); }
  var PP = Pt.prototype;
  PP.R = function (x, y, w, h, col) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (w <= 0 || h <= 0) return; this.g.fillStyle = col; this.g.fillRect(x, y, w, h); };
  PP.L = function (x0, y0, x1, y1, col, w) { w = w || 1; var n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1; this.g.fillStyle = col; for (var i = 0; i <= n; i++) this.g.fillRect(Math.round(x0 + (x1 - x0) * i / n - (w - 1) / 2), Math.round(y0 + (y1 - y0) * i / n - (w - 1) / 2), w, w); };
  PP.E = function (cx, cy, rx, ry, col) { var g = this.g; g.fillStyle = col; for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) { var dy = (y + 0.5 - cy) / ry; if (Math.abs(dy) > 1) continue; var hw = rx * Math.sqrt(1 - dy * dy), a = Math.round(cx - hw), b = Math.round(cx + hw); if (b > a) g.fillRect(a, y, b - a, 1); } };
  PP.ring = function (cx, cy, r, col) { var g = this.g; g.fillStyle = col; for (var a = 0; a < 360; a += 4) g.fillRect(Math.round(cx + Math.cos(a * Math.PI / 180) * r), Math.round(cy + Math.sin(a * Math.PI / 180) * r), 1, 1); };
  PP.P = function (pts, col) {
    var g = this.g, minY = 1e9, maxY = -1e9; g.fillStyle = col; pts.forEach(function (p) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) { var yc = y + 0.5, xs = [];
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort(function (p, q) { return p - q; }); for (var k = 0; k + 1 < xs.length; k += 2) { var x0 = Math.round(xs[k]), x1 = Math.round(xs[k + 1]); if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1); } }
  };
  PP.D = function (x, y, w, h, col, level) { var g = this.g; g.fillStyle = col; x = Math.round(x); y = Math.round(y); for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) { var l = typeof level === 'function' ? level(xx, yy) : level; if (l > 0 && BAYER[(yy & 3) * 4 + (xx & 3)] / 16 < l) g.fillRect(xx, yy, 1, 1); } };
  PP.V = function (x, y, w, h, c0, c1) { var g = this.g, gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  PP.T = function (text, x, y, size, col, o) { o = o || {}; var g = this.g; g.save(); g.translate(Math.round(x), Math.round(y)); if (o.rot) g.rotate(o.rot); g.font = size + 'px VT323'; g.textAlign = o.left ? 'left' : 'center'; g.textBaseline = 'middle'; if (o.shadow) { g.fillStyle = o.shadow; g.fillText(text, 1, 1); } g.fillStyle = col; g.fillText(text, 0, 0); g.restore(); };
  PP.fog = function (a, col, grad) { var g = this.g; g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgba(col, a); g.fillRect(0, 0, this.c.width, this.c.height);
    if (grad) { var gr = g.createLinearGradient(0, grad[0], 0, grad[1]); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(1, rgba(col, grad[2])); g.fillStyle = gr; g.fillRect(0, grad[0], this.c.width, grad[1] - grad[0]); }
    g.globalCompositeOperation = 'source-over'; };

  // ---------------------------------------------------------------- sparse sheets: a painted layer kept only where it has pixels
  // A full-screen layer costs 3.7 MB even when it is mostly air. pack() cuts it into bands of rows and keeps, in each band,
  // only the runs of columns that hold a pixel (small gaps are merged so the draw calls stay few). Empty space costs nothing.
  var BAND = 48, GAP = 40;
  function pack(src, y0, y1, lum) {   // lum: also drop pixels darker than this (r+g+b), for light patches
    var cv = src.c || src, w = cv.width; y0 = y0 || 0; y1 = Math.min(y1 || cv.height, cv.height);
    var d = cv.getContext('2d').getImageData(0, y0, w, y1 - y0).data, parts = [], bytes = 0;
    function on(i) { return d[i + 3] && (!lum || d[i] + d[i + 1] + d[i + 2] > lum); }
    for (var by = y0; by < y1; by += BAND) {
      var bh = Math.min(BAND, y1 - by), col = new Uint8Array(w), y, x, row;
      for (y = 0; y < bh; y++) { row = (by - y0 + y) * w * 4; for (x = 0; x < w; x++) if (on(row + x * 4)) col[x] = 1; }
      x = 0;
      while (x < w) {
        if (!col[x]) { x++; continue; }
        var xs = x, xe = x, gap = 0;
        for (; x < w; x++) { if (col[x]) { xe = x; gap = 0; } else if (++gap > GAP) break; }
        var t = bh, b = -1;
        for (y = 0; y < bh; y++) { row = (by - y0 + y) * w * 4; for (var xx = xs; xx <= xe; xx++) if (on(row + xx * 4)) { if (y < t) t = y; b = y; break; } }
        var pw = xe - xs + 1, ph = b - t + 1, pc = document.createElement('canvas'); pc.width = pw; pc.height = ph;
        pc.getContext('2d').drawImage(cv, xs, by + t, pw, ph, 0, 0, pw, ph);
        parts.push({ c: pc, x: xs, y: by + t }); bytes += pw * ph * 4;
      }
    }
    if (src.c) { src.c.width = 0; }   // the full-size painting is done with: let it go now, not whenever the collector gets round to it
    return { sheet: true, parts: parts, bytes: bytes };
  }
  function blit(g, s, dx, dy) {
    dx = dx || 0; dy = dy || 0; if (!s.sheet) { g.drawImage(s, dx, dy); return; }
    if (s.scale) { for (var j = 0; j < s.parts.length; j++) { var q = s.parts[j]; g.drawImage(q.c, q.x * s.scale + dx, q.y * s.scale + dy, q.c.width * s.scale, q.c.height * s.scale); } return; }   // a sheet stored small, drawn big
    for (var i = 0; i < s.parts.length; i++) { var p = s.parts[i]; g.drawImage(p.c, p.x + dx, p.y + dy); }
  }
  // part of a sheet, in place (for relighting one sign out of the street)
  function blitRect(g, s, x, y, w, h) {
    for (var i = 0; i < s.parts.length; i++) { var p = s.parts[i], ix = Math.max(x, p.x), iy = Math.max(y, p.y), ex = Math.min(x + w, p.x + p.c.width), ey = Math.min(y + h, p.y + p.c.height);
      if (ex > ix && ey > iy) g.drawImage(p.c, ix - p.x, iy - p.y, ex - ix, ey - iy, ix, iy, ex - ix, ey - iy); }
  }
  // run fn(canvas, previousOutput) over every part, reusing last time's canvases
  function mapSheet(s, fn, out) {
    out = out || { sheet: true, parts: [], bytes: s.bytes };
    for (var i = 0; i < s.parts.length; i++) { var p = s.parts[i], o = out.parts[i]; out.parts[i] = { c: fn(p.c, o && o.c), x: p.x, y: p.y }; }
    return out;
  }
  // a small tile of film grain, repeated over the screen (instead of a whole screen of it)
  function grainTile(seed) {
    var c = document.createElement('canvas'), g = c.getContext('2d'), r = rng(seed); c.width = 256; c.height = 128;
    for (var i = 0; i < 920; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.035)'; g.fillRect(r() * 256 | 0, r() * 128 | 0, 1, 1); }
    return c;
  }
  // one scratch canvas per job, shared by both worlds (they draw one after the other, never at the same time)
  var SCRATCH = {};
  function scratch(name, w, h) { var c = SCRATCH[name] || (SCRATCH[name] = document.createElement('canvas')); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }

  // a painted layer kept at half size (for the rust world's distant layers, which sit in the dark under the torch)
  function packHalf(src, y1) { var cv = src.c || src, c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0, W / 2, H / 2); if (src.c) src.c.width = 0; var s = pack(c, 0, y1 / 2); s.scale = 2; return s; }
  FT.packHalf = packHalf; FT.SCRATCH = SCRATCH; FT.pack = pack; FT.blit = blit; FT.blitRect = blitRect; FT.mapSheet = mapSheet; FT.grainTile = grainTile; FT.scratch = scratch;
  FT.W = W; FT.H = H; FT.G = G; FT.KERB = KERB; FT.ROAD = ROAD; FT.MIDX = MIDX; FT.BAYER = BAYER; FT.PAL = PAL; FT.PP = PP; FT.rng = rng; FT.hex = hex; FT.mix = mix; FT.sh = sh; FT.rgba = rgba; FT.clamp = clamp; FT.smooth = smooth; FT.rand = rand; FT.pick = pick; FT.Pt = Pt; 
})(window.FT = window.FT || {});
