/* Fog Town: kit.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt;
  // ---------------------------------------------------------------- the kit: walls and wear
  function brick(p, K, x, y, w, h, base) {
    if (!K.F) return plate(p, K, x, y, w, h, base);
    var r = K.r; p.R(x, y, w, h, sh(base, 0.74));
    for (var row = 0, yy = y; yy < y + h; yy += 4, row++) for (var xx = x - (row % 2 ? 5 : 0); xx < x + w; xx += 10) {
      var bx = Math.max(xx + 1, x), bw = Math.min(xx + 10, x + w) - bx, bh = Math.min(3, y + h - yy - 1); if (bw <= 0 || bh <= 0) continue;
      var k = r(), c = k < 0.14 ? sh(base, 0.86) : k < 0.27 ? sh(base, 1.08) : k < 0.3 ? sh(base, 0.72) : k < 0.32 ? mix(base, '#c8c0b0', 0.3) : base;
      p.R(bx, yy + 1, bw, bh, c); if (r() < 0.5) p.R(bx, yy + 1, bw, 1, sh(c, 1.08));
    }
    for (var m = 0; m < w * h / 1800; m++) p.R(x + r() * (w - 10), y + r() * (h - 4), 9, 3, sh(base, 0.5));
    grime(p, K, x, y, w, h);
  }
  function stone(p, K, x, y, w, h, base) {
    if (!K.F) return plate(p, K, x, y, w, h, base);
    var r = K.r; p.R(x, y, w, h, sh(base, 0.8));
    for (var row = 0, yy = y; yy < y + h; yy += 12, row++) for (var xx = x - (row % 2 ? 12 : 0); xx < x + w; xx += 24) {
      var bx = Math.max(xx + 1, x), bw = Math.min(xx + 24, x + w) - bx - 1, bh = Math.min(11, y + h - yy - 1); if (bw <= 0 || bh <= 0) continue;
      var c = sh(base, 0.94 + r() * 0.1); p.R(bx, yy + 1, bw, bh, c); p.R(bx, yy + 1, bw, 1, sh(c, 1.08)); p.R(bx, yy + bh, bw, 1, sh(c, 0.86));
      if (r() < 0.1) crack(p, bx + r() * bw, yy + 1, 4 + r() * 10, sh(c, 0.7), r);
    }
    grime(p, K, x, y, w, h);
  }
  function stucco(p, K, x, y, w, h, base) {
    if (!K.F) return plate(p, K, x, y, w, h, base);
    var r = K.r; p.R(x, y, w, h, base); for (var i = 0; i < w * h / 4; i++) p.R(x + r() * w, y + r() * h, 1, 1, r() < 0.5 ? sh(base, 0.95) : sh(base, 1.04));
    for (var c = 0; c < w / 20; c++) crack(p, x + r() * w, y + r() * h, 8 + r() * 20, sh(base, 0.72), r); grime(p, K, x, y, w, h);
  }
  function plate(p, K, x, y, w, h, base) {
    var r = K.r; p.R(x, y, w, h, base);
    for (var xx = x; xx < x + w; xx += 28) { p.R(xx, y, 1, h, '#0e0807'); p.R(xx + 1, y, 1, h, sh(base, 1.15)); for (var yy = y + 4; yy < y + h; yy += 8) { p.R(xx + 3, yy, 1, 1, '#b5562a'); p.R(xx + 24, yy, 1, 1, '#b5562a'); } }
    for (var y2 = y; y2 < y + h; y2 += 44) { p.R(x, y2, w, 1, '#0e0807'); p.R(x, y2 + 1, w, 1, sh(base, 1.12)); }
    for (var s = 0; s < w / 3; s++) p.R(x + r() * w, y + r() * h * 0.9, 1, 6 + r() * 40, rgba('#b5562a', 0.25 + r() * 0.3));
    for (var q = 0; q < w * h / 500; q++) p.E(x + r() * w, y + r() * h, 1 + r() * 4, 1 + r() * 2, rgba(r() < 0.5 ? '#0e0807' : '#8a3a1c', 0.5));
    grime(p, K, x, y, w, h);
  }
  function planks(p, K, x, y, w, h, base) { var r = K.r; for (var xx = x; xx < x + w; xx += 6) { var c = sh(base, 0.9 + r() * 0.2); p.R(xx, y, 6, h, c); p.R(xx, y, 1, h, sh(c, 0.66)); } grime(p, K, x, y, w, h); }
  function grime(p, K, x, y, w, h) {
    var r = K.r; p.V(x, y, w, Math.min(60, h * 0.25), 'rgba(16,20,22,0.32)', 'rgba(16,20,22,0)'); p.V(x, y + h - 40, w, 40, 'rgba(16,20,22,0)', 'rgba(16,20,22,0.3)');
    for (var i = 0; i < w / 6; i++) p.R(x + r() * w, y + r() * h * 0.85, 1, 4 + r() * 34, K.F ? 'rgba(24,30,32,0.14)' : 'rgba(181,86,42,0.3)');
  }
  function crack(p, x, y, len, col, r) { var cx = x, cy = y; for (var i = 0; i < len; i++) { p.R(cx, cy, 1, 1, col); cy += 1; cx += r() < 0.5 ? (r() < 0.5 ? -1 : 1) : 0; } }
  function plaster(p, K, x, y, w, h, col) {
    var r = K.r, top = y + r() * 6, bot = y + h - r() * 6, holes = [];
    for (var n = 0; n < 2 + r() * 2; n++) holes.push([x + r() * w, y + r() * h, 4 + r() * 12, 3 + r() * 8]);
    for (var xx = x; xx < x + w; xx++) {
      top = clamp(top + (r() - 0.5) * 3, y, y + 14); bot = clamp(bot + (r() - 0.5) * 3, y + h - 16, y + h);
      var edge = Math.min(xx - x, x + w - xx), t0 = top + (edge < 8 ? (8 - edge) * (0.5 + r()) : 0), b0 = bot - (edge < 8 ? (8 - edge) * (0.5 + r()) : 0);
      for (var yy = Math.round(t0); yy < b0; yy++) { var hole = false; for (var k = 0; k < holes.length; k++) { var hl = holes[k], dx = (xx - hl[0]) / hl[2], dy = (yy - hl[1]) / hl[3]; if (dx * dx + dy * dy < 1) { hole = true; break; } } if (hole) continue;
        p.R(xx, yy, 1, 1, (xx * 7 + yy * 13) % 23 === 0 ? sh(col, 0.9) : (xx * 3 + yy * 5) % 31 === 0 ? sh(col, 1.06) : col); }
      p.R(xx, Math.round(t0), 1, 1, sh(col, 1.12)); p.R(xx, Math.round(b0), 1, 1, sh(col, 0.55));
    }
    holes.forEach(function (hl) { for (var a = 0; a < 6.28; a += 0.3) p.R(hl[0] + Math.cos(a) * hl[2], hl[1] + Math.sin(a) * hl[3] + 1, 1, 1, sh(col, 0.6)); });
    for (var c2 = 0; c2 < w / 30; c2++) crack(p, x + r() * w, y + r() * h * 0.6, 6 + r() * 16, sh(col, 0.7), r);
  }
  FT.LEDGES = null;   // (while a world is painted: the tops of things, where snow settles)
  function cornice(p, x, y, w, c) { if (FT.LEDGES) FT.LEDGES.push([x - 5, y, w + 10]);
    p.R(x - 5, y, w + 10, 3, sh(c, 1.14)); p.R(x - 5, y + 3, w + 10, 1, sh(c, 0.8)); p.R(x - 4, y + 4, w + 8, 3, c);
    for (var d = x - 3; d < x + w + 3; d += 5) { p.R(d, y + 7, 3, 3, sh(c, 0.88)); p.R(d, y + 7, 3, 1, sh(c, 1.1)); }
    p.R(x - 3, y + 10, w + 6, 2, sh(c, 1.04)); p.R(x - 2, y + 12, w + 4, 2, 'rgba(16,20,22,0.35)');
    for (var b = 0; b < w / 20; b++) if ((b * 37) % 5 === 0) p.R(x + b * 20 + 4, y + 3, 6, 4, sh(c, 0.6));
  }
  function band(p, x, y, w, c) { p.R(x, y, w, 4, sh(c, 1.06)); p.R(x, y, w, 1, sh(c, 1.2)); p.R(x, y + 4, w, 1, sh(c, 0.8)); p.R(x, y + 5, w, 2, 'rgba(16,20,22,0.25)'); }
  // a window; its glass is recorded (K.wins) so its light can come on and go off with the hour
  function win(p, K, x, y, w, h, o) {
    o = o || {}; var P = K.P, r = K.r, F = K.F, trim = o.trim || P.trim;
    if (o.arch) { p.E(x + w / 2, y + 1, w / 2 + 4, w / 2 + 3, trim); p.R(x + w / 2 - 3, y - w / 2 - 5, 6, 7, sh(trim, 1.06)); p.E(x + w / 2, y + 1, w / 2, w / 2, P.frame); }
    else if (!o.small) { p.R(x - 4, y - 5, w + 8, 5, trim); p.R(x - 4, y - 5, w + 8, 1, sh(trim, 1.12)); p.R(x + w / 2 - 3, y - 6, 6, 6, sh(trim, 1.04)); p.R(x - 4, y, w + 8, 1, 'rgba(16,20,22,0.32)'); }
    p.R(x, y, w, h, P.frame);
    var gx = x + 2, gy = y + 2, gw = w - 4, gh = h - 4, kind = o.kind || 'glass';
    if (o.arch) p.E(x + w / 2, y + 2, w / 2 - 2, w / 2 - 2, P.glassHi);
    p.V(gx, gy, gw, gh, P.glassHi, sh(P.glass, 0.72)); if (F && !o.small) p.L(gx + 1, gy + gh * 0.55, gx + gw * 0.55, gy + 1, 'rgba(255,255,255,0.14)');
    var dress = null;
    if (F && !o.shop && !o.small && kind === 'glass') { var k = r();
      if (k < 0.3) { var cc = P.curtain[(r() * 4) | 0]; dress = 'curtain'; [gx, gx + gw * 0.66].forEach(function (cx0) { p.R(cx0, gy, gw * 0.34, gh, cc); for (var fx = cx0 + 1; fx < cx0 + gw * 0.34; fx += 2) p.R(fx, gy, 1, gh, sh(cc, 0.82)); }); }
      else if (k < 0.5) { var bh = gh * (0.3 + r() * 0.6); dress = 'blind'; p.R(gx, gy, gw, bh, '#a39f94'); for (var sl = gy + 1; sl < gy + bh; sl += 3) p.R(gx, sl, gw, 1, '#8a867c'); } }
    if (!o.shop && !o.small) { p.R(x + w / 2 - 1, y, 2, h, P.frame); p.R(x, y + Math.round(h * 0.48), w, 2, P.frame); }
    if (o.small) p.R(x, y + Math.round(h / 2), w, 1, P.frame);
    p.R(x, y, w, 1, sh(P.frame, 1.35)); p.R(x, y, 1, h, sh(P.frame, 1.15));
    if (kind === 'broken') { p.R(gx + gw * 0.2, gy + gh * 0.15, gw * 0.4, gh * 0.3, '#14181a'); p.L(gx + gw * 0.2, gy + gh * 0.15, gx + gw * 0.7, gy + gh * 0.6, 'rgba(255,255,255,0.3)'); }
    if (kind === 'boarded') { var wd = K.F ? '#7d6a52' : '#2a1d18'; for (var b2 = 0; b2 < 3; b2++) { var by = y + 3 + b2 * (h - 6) / 3; p.P([[x - 2, by + (b2 % 2 ? 2 : 0)], [x + w + 2, by - (b2 % 2 ? 0 : 2)], [x + w + 2, by + 5 - (b2 % 2 ? 0 : 2)], [x - 2, by + 5 + (b2 % 2 ? 2 : 0)]], sh(wd, 0.9 + b2 * 0.08)); } }
    if (!F) for (var bb = x + 2; bb < x + w - 1; bb += 4) p.R(bb, y, 1, h, '#3a2e28');
    if (!o.small && FT.LEDGES) FT.LEDGES.push([x - 4, y + h, w + 8]);
    if (!o.small) { p.R(x - 4, y + h, w + 8, 3, sh(trim, 1.04)); p.R(x - 4, y + h, w + 8, 1, sh(trim, 1.2)); p.R(x - 3, y + h + 3, w + 6, 1, 'rgba(16,20,22,0.35)'); if (r() < 0.6) p.R(x + r() * w, y + h + 4, 1, 3 + r() * 20, F ? 'rgba(30,34,34,0.22)' : 'rgba(181,86,42,0.32)'); }
    if (K.wins && kind === 'glass') K.wins.push({ x: gx, y: gy, w: gw, h: gh, arch: !!o.arch, bars: !o.shop && !o.small, grid: o.grid || 0, small: !!o.small, dress: dress, layer: K.layer, cx: x + w / 2, by: y + h * 0.48 });
  }
  function shopWin(p, K, x, y, w, h, kind) {
    var P = K.P, r = K.r, F = K.F;
    p.R(x - 3, y - 3, w + 6, h + 6, P.trim); p.R(x - 3, y - 3, w + 6, 1, sh(P.trim, 1.15)); p.R(x, y, w, h, P.frame); p.V(x + 2, y + 2, w - 4, h - 4, F ? '#6a7073' : '#0e0807', F ? '#3a3e40' : '#0b0605');
    if (kind === 'cabinets') for (var c = 0; c < Math.floor((w - 6) / 14); c++) { var cx = x + 5 + c * 14; p.R(cx, y + h - 34, 11, 32, F ? '#6a6c68' : '#2a1d18'); for (var d = 0; d < 4; d++) { p.R(cx + 1, y + h - 33 + d * 8, 9, 7, F ? '#787a76' : '#3a2e28'); p.R(cx + 4, y + h - 30 + d * 8, 3, 1, '#2f2e2b'); } }
    if (kind === 'books') for (var s = 0; s < 4; s++) { var sy = y + 4 + s * ((h - 8) / 4); p.R(x + 2, sy + 11, w - 4, 1, '#4a3a2e');
      for (var bx = x + 4; bx < x + w - 4;) { var bw = 1 + (r() * 2 | 0), bh = 6 + (r() * 5 | 0); p.R(bx, sy + 11 - bh, bw, bh, F ? ['#7a3b34', '#5f7470', '#c9a55a', '#d8d2c2', '#4c5a7a', '#6a4a3a'][(r() * 6) | 0] : '#2a1d18'); bx += bw + (r() < 0.2 ? 1 : 0); } }
    if (F) { p.R(x + 2, y + 2, w - 4, 3, 'rgba(255,255,255,0.1)'); p.L(x + 4, y + h * 0.7, x + w * 0.4, y + 4, 'rgba(255,255,255,0.12)'); }
    p.R(x - 3, y + h + 3, w + 6, 5, sh(P.trim, 0.88));
    if (K.wins) K.wins.push({ x: x + 2, y: y + 2, w: w - 4, h: h - 4, shop: true, layer: K.layer, cx: x + w / 2 });
  }
  function door(p, K, x, y, w, h, c, glass) {
    var P = K.P; p.R(x - 4, y - 5, w + 8, h + 5, P.trim); p.R(x - 4, y - 5, w + 8, 1, sh(P.trim, 1.15)); p.R(x, y, w, h, sh(c, 0.62)); p.R(x + 1, y + 1, w - 2, h - 1, c);
    if (glass) { p.R(x + 3, y + 3, w - 6, h * 0.36, P.frame); p.V(x + 4, y + 4, w - 8, h * 0.36 - 2, P.glassHi, P.glass); }
    var top = glass ? y + h * 0.45 : y + 4, pw = (w - 7) / 2; for (var i = 0; i < 2; i++) { var px = x + 2 + i * (pw + 3); p.R(px, top, pw, h - (top - y) - 6, sh(c, 0.86)); p.R(px, top, pw, 1, sh(c, 0.7)); }
    p.R(x + w - 5, y + h * 0.52, 2, 5, '#b8a77a'); p.R(x - 6, y + h, w + 12, 3, sh(P.stone, 1.06)); p.R(x - 6, y + h, w + 12, 1, sh(P.stone, 1.25));
  }
  function signBoard(p, K, x, y, w, h, text, size, col) {
    var P = K.P, c = col || P.sign, r = K.r; p.R(x - 2, y - 2, w + 4, h + 4, P.dark); p.V(x, y, w, h, sh(c, 1.12), sh(c, 0.84)); p.R(x, y, w, 1, sh(c, 1.3));
    [[x - 1, y - 1], [x + w, y - 1], [x - 1, y + h], [x + w, y + h]].forEach(function (q) { p.R(q[0], q[1], 1, 1, '#b8b2a2'); });
    for (var i = 0; i < w / (K.F ? 14 : 5); i++) p.R(x + r() * w, y + r() * h, 1 + r() * 3, 1, K.F ? sh(c, 1.35) : '#b5562a');
    p.T(text, x + w / 2, y + h / 2 + 1, size, P.signText, { shadow: 'rgba(16,20,22,0.55)' });
    if (K.F) { p.R(x + 5, y + h + 2, 1, 6, 'rgba(30,34,34,0.3)'); p.R(x + w - 8, y + h + 2, 1, 9, 'rgba(30,34,34,0.25)'); }
  }
  function drainpipe(p, K, x, y0, y1) { var c = K.P.metal; p.R(x, y0, 4, y1 - y0, c); p.R(x + 1, y0, 1, y1 - y0, sh(c, 1.3)); p.R(x + 3, y0, 1, y1 - y0, sh(c, 0.7)); for (var b = y0 + 16; b < y1; b += 48) p.R(x - 1, b, 6, 2, sh(c, 0.75)); p.R(x - 2, y1 - 4, 8, 4, sh(c, 0.9)); p.R(x + 1, y0 + 30, 2, (y1 - y0) * 0.4, rgba('#b5562a', 0.35)); }
  // greenery, used sparingly
  function leaves(p, K, cx, cy, rx, ry, n) { var r = K.r, L = K.P.leaf; for (var i = 0; i < n; i++) { var a = r() * 6.28, d = Math.sqrt(r()), lx = cx + Math.cos(a) * rx * d, ly = cy + Math.sin(a) * ry * d, c = L[1 + (r() * 3 | 0)]; p.R(lx, ly, 2, 1, c); p.R(lx, ly + 1, 1, 1, sh(c, 0.75)); } }
  function vine(p, K, x, y, len, strands) { var r = K.r, L = K.P.leaf; for (var s = 0; s < strands; s++) { var vx = x + (r() - 0.5) * 6, l = len * (0.6 + r() * 0.5); for (var i = 0; i < l; i++) { vx += (r() - 0.5) * 0.9; p.R(vx, y + i, 1, 1, L[0]); if (i % 3 === 0) { var c = L[1 + (r() * 3 | 0)], side = r() < 0.5 ? -1 : 1; p.R(vx + side, y + i, 2, 1, c); } } } }
  function weeds(p, K, x, y, n) { var r = K.r, L = K.P.leaf; for (var i = 0; i < n; i++) { var bx = x + (r() - 0.5) * 6, bh = 2 + r() * 5, lean = (r() - 0.5) * 3, c = L[1 + (r() * 3 | 0)]; for (var k = 0; k < bh; k++) p.R(bx + lean * k / bh, y - k, 1, 1, c); } }

  FT.brick = brick; FT.stone = stone; FT.stucco = stucco; FT.plate = plate; FT.planks = planks; FT.grime = grime; FT.crack = crack; FT.plaster = plaster; FT.cornice = cornice; FT.band = band; FT.win = win; FT.shopWin = shopWin; FT.door = door; FT.signBoard = signBoard; FT.drainpipe = drainpipe; FT.leaves = leaves; FT.vine = vine; FT.weeds = weeds; 
})(window.FT = window.FT || {});
