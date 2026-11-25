/* Fog Town: layers.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt, brick = FT.brick, stone = FT.stone, stucco = FT.stucco, plate = FT.plate, planks = FT.planks, grime = FT.grime, crack = FT.crack, plaster = FT.plaster, cornice = FT.cornice, band = FT.band, win = FT.win, shopWin = FT.shopWin, door = FT.door, signBoard = FT.signBoard, drainpipe = FT.drainpipe, leaves = FT.leaves, vine = FT.vine, weeds = FT.weeds;
  // ---------------------------------------------------------------- the layers behind the street
  var STACKS = [[150, 160, 18], [262, 120, 14], [742, 140, 16], [1112, 104, 20]];
  function far(K) {
    var p = new Pt(W, H), c = K.P.far, d = sh(c, 0.86), l = sh(c, 1.08), r = rng(21), base = 470;
    p.R(0, base - 40, W, 300, c);
    if (K.F) FT.BEACONS = []; STACKS.forEach(function (s, i) { var x = s[0], top = s[1], w = s[2]; if (K.F) FT.BEACONS.push([x - 1, top - 6, 'far']); p.P([[x - w / 2 - 3, base], [x - w / 2, top], [x + w / 2, top], [x + w / 2 + 3, base]], c); p.R(x - w / 2, top, 3, base - top, l); p.R(x + w / 2 - 3, top, 3, base - top, d);
      if (i % 2) for (var b = top + 10; b < top + 40; b += 8) p.R(x - w / 2 - 1, b, w + 2, 2, d); else { p.R(x - w / 2 - 2, top + 6, w + 4, 3, d); for (var lg = top; lg < base; lg += 14) p.R(x + w / 2 - 4, lg, 2, 8, d); } p.R(x - w / 2 - 2, top - 3, w + 4, 4, d); });
    var tx = 60, tt = 250, tw = 64; p.R(tx, tt, 3, base - tt, c); p.R(tx + tw - 3, tt, 3, base - tt, c); for (var y = tt; y < base; y += 34) { p.R(tx, y, tw, 2, c); p.L(tx, y, tx + tw, y + 34, c); p.L(tx + tw, y, tx, y + 34, c); }
    p.R(tx - 6, tt - 50, tw + 12, 50, c); p.E(tx + tw / 2, tt - 50, tw / 2 + 6, 14, c); p.R(tx - 6, tt - 50, 3, 50, l);
    p.E(980, base - 50, 70, 54, c); for (var gx = 912; gx < 1050; gx += 14) p.R(gx, base - 108, 2, 108, d); p.R(910, base - 108, 140, 3, d);
    var cx = 620; if (K.F) FT.BEACONS.push([cx - 120, 204, 'far'], [cx + 3, 172, 'far']); p.R(cx, 210, 6, base - 210, c); for (var cy = 210; cy < base; cy += 12) p.L(cx, cy, cx + 6, cy + 12, d); p.R(cx - 120, 206, 190, 5, c); p.L(cx + 3, 180, cx - 110, 206, d); p.L(cx + 3, 180, cx + 60, 206, d); p.R(cx - 2, 176, 10, 30, c); p.R(cx - 90, 211, 1, 60, d); p.R(cx - 94, 270, 9, 6, d);
    for (var sx = 330; sx < 560; sx += 46) p.P([[sx, base - 110], [sx + 46, base - 140], [sx + 46, base - 110]], c); p.R(330, base - 110, 230, 110, c);
    var mast = 1220; p.R(mast, 140, 3, base - 140, c); for (var my = 150; my < base; my += 20) p.L(mast - 8 + (my - 140) * 0.02, my, mast + 10 - (my - 140) * 0.02, my + 20, d); p.L(mast + 1, 140, mast - 30, base, d); p.L(mast + 1, 140, mast + 34, base, d);
    // a church steeple and, far off, a Ferris wheel that hasn't turned in a while
    var chx = 860; p.R(chx - 7, 372, 14, base - 372, c); p.R(chx - 7, 372, 2, base - 372, l); p.R(chx + 5, 372, 2, base - 372, d); p.R(chx - 9, 370, 18, 3, l); p.R(chx - 3, 380, 6, 10, d); p.E(chx, 398, 3, 3, l);
    p.P([[chx - 8, 370], [chx, 322], [chx + 8, 370]], c); p.L(chx, 322, chx + 8, 370, d); p.R(chx, 314, 1, 8, d); p.R(chx - 3, 317, 7, 1, d); p.R(chx - 30, 430, 24, base - 430, c); p.P([[chx - 32, 430], [chx - 18, 414], [chx - 4, 430]], c);
    var fwx = 330, fwy = 400, fwr = 44; for (var a = 0; a < 360; a += 3) p.R(Math.round(fwx + Math.cos(a * Math.PI / 180) * fwr), Math.round(fwy + Math.sin(a * Math.PI / 180) * fwr), 1, 1, d);
    for (var sp = 0; sp < 12; sp++) { var an = sp / 12 * Math.PI * 2, ex = fwx + Math.cos(an) * fwr, ey = fwy + Math.sin(an) * fwr; p.L(fwx, fwy, ex, ey, d); p.R(Math.round(ex) - 2, Math.round(ey) + 1, 5, 4, c); }
    p.L(fwx, fwy, fwx - 26, base, c, 2); p.L(fwx, fwy, fwx + 26, base, c, 2); p.E(fwx, fwy, 3, 3, l);
    for (var x = 0; x < W;) { var bw = 40 + r() * 60, bh = 40 + r() * 70; p.R(x, base - bh, bw, bh + 20, c); for (var wy = base - bh + 6; wy < base - 8; wy += 8) for (var wx = x + 4; wx < x + bw - 5; wx += 7) { p.R(wx, wy, 2, 3, d); if (K.wins && r() < 0.5) K.wins.push({ x: wx, y: wy, w: 2, h: 3, layer: 'far', small: true, cx: wx }); } if (K.F && bh > 90) FT.BEACONS.push([Math.round(x + bw - 4), base - bh - 2, 'far']); x += bw + r() * 30; }
    p.fog(K.F ? 0.26 : 0.35, K.P.fog, [410, 472, K.F ? 0.35 : 0.3]); return p;
  }
  // one distant building with some character: a roof of its own kind, ledges, windows with sills, a lit side and a shaded side
  function block(p, K, x, top, bw, base, c, r, layer) {
    var lit = sh(c, 1.1), dk = sh(c, 0.82), dd = sh(c, 0.68), roof = (r() * 6) | 0, fh = 11 + ((r() * 3) | 0), pair = r() < 0.5;
    p.R(x, top, bw, base - top + 10, c); p.R(x + bw - 5, top, 5, base - top, dk); p.R(x, top, 2, base - top, lit);
    if (roof === 0) { p.R(x - 2, top - 3, bw + 4, 3, lit); p.R(x - 2, top, bw + 4, 1, dd); for (var dn = x; dn < x + bw; dn += 4) p.R(dn, top + 1, 2, 1, dk); }
    if (roof === 1) { var tw = Math.round(bw * (0.45 + r() * 0.2)), tx = Math.round(x + (bw - tw) / 2), tt = Math.round(top - 14 - r() * 26); p.R(tx, tt, tw, top - tt, c); p.R(tx + tw - 4, tt, 4, top - tt, dk); p.R(tx - 1, tt - 2, tw + 2, 2, lit); for (var ty = tt + 5; ty < top - 4; ty += 8) for (var txx = tx + 3; txx < tx + tw - 5; txx += 6) p.R(txx, ty, 2, 3, dd); p.R(x - 1, top - 2, bw + 2, 2, lit); }
    if (roof === 2) { var rh = Math.round(bw * 0.3); p.P([[x - 2, top + 1], [x + bw / 2, top - rh], [x + bw + 2, top + 1]], dd); p.P([[x + 1, top], [x + bw / 2, top - rh + 2], [x + bw / 2, top]], dk); p.R(x + bw * 0.7, top - rh * 0.7, 5, rh * 0.6, dk); }
    if (roof === 3) { p.P([[x - 2, top + 1], [x + 5, top - 14], [x + bw - 5, top - 14], [x + bw + 2, top + 1]], dd); p.R(x + 5, top - 15, bw - 10, 1, lit); for (var dx = x + 8; dx < x + bw - 10; dx += 13) { p.R(dx, top - 11, 6, 9, dk); p.P([[dx - 1, top - 11], [dx + 3, top - 15], [dx + 7, top - 11]], dk); p.R(dx + 2, top - 9, 2, 4, dd); } }
    if (roof === 4) { for (var st = 0; st < 3; st++) p.R(x + 4 + st * 6, top - 5 * (st + 1), bw - 8 - st * 12, 5, st % 2 ? c : lit); p.R(x + bw / 2, top - 30, 1, 14, dd); }
    if (roof === 5) { var sx = x + 6, sw = bw - 12; p.R(sx + 4, top - 22, 1, 22, dd); p.R(sx + sw - 5, top - 22, 1, 22, dd); p.L(sx + 4, top - 2, sx + sw - 5, top - 18, dd); p.R(sx, top - 34, sw, 14, dd); p.R(sx + 1, top - 33, sw - 2, 12, K.F ? mix(pick(['#7a3b34', '#5f7470', '#c9a55a', '#4c5a7a']), c, 0.55) : '#2a1510'); p.R(sx + 4, top - 29, sw * 0.5, 2, lit); }
    for (var wy = top + 8, fl = 0; wy < base - 12; wy += fh, fl++) {
      if (fl % 3 === 2) p.R(x, wy - 2, bw, 1, lit);
      for (var wx = x + 5, k = 0; wx < x + bw - 8; k++) { p.R(wx, wy, 3, 5, dd); p.R(wx, wy + 5, 3, 1, lit); if (K.wins && r() < 0.8) K.wins.push({ x: wx, y: wy, w: 3, h: 5, layer: layer, small: true, cx: wx + 1 }); wx += pair ? (k % 2 ? 9 : 5) : 7; }
    }
    if (r() < 0.3) { var fx = Math.round(x + bw * (0.25 + r() * 0.3)); for (var fy = top + 14; fy < base - 22; fy += 22) { p.R(fx, fy, 14, 1, dd); for (var rl = 0; rl < 14; rl += 3) p.R(fx + rl, fy - 4, 1, 4, dd); p.L(fx + 1, fy + 1, fx + 13, fy + 21, dd); } }
    if (roof !== 2 && roof !== 5 && r() < 0.35) { var wtx = Math.round(x + 6 + r() * (bw - 30)); p.R(wtx + 2, top - 8, 1, 8, dd); p.R(wtx + 13, top - 8, 1, 8, dd); p.R(wtx, top - 22, 16, 14, dk); p.P([[wtx - 1, top - 22], [wtx + 8, top - 28], [wtx + 17, top - 22]], dd); for (var wb = wtx + 2; wb < wtx + 16; wb += 3) p.R(wb, top - 22, 1, 14, dd); }
    if (r() < 0.4) { var ax = Math.round(x + r() * bw); p.R(ax, top - 18, 1, 18, dd); p.R(ax - 4, top - 14, 9, 1, dd); }
    if (r() < 0.4) p.R(Math.round(x + 4 + r() * (bw - 14)), top - 5, 8, 5, dk);
  }
  function mid(K) {
    var p = new Pt(W, H), c = K.P.mid, r = rng(33), base = 505;
    for (var pass = 0; pass < 2; pass++) for (var x = -30 + pass * 40; x < W;) {   // two rows: the taller one further back and paler, then a lower one in front
      var bw = 46 + r() * 74, bh = pass ? 60 + r() * 110 : 120 + r() * 130, top = Math.round(base - bh);
      if (K.F && bh > 170) FT.BEACONS.push([Math.round(x + bw * 0.5), top - 4, 'mid']);
      block(p, K, Math.round(x), top, Math.round(bw), base, pass ? sh(c, 0.9 + r() * 0.08) : sh(c, 1.08 + r() * 0.06), r, 'mid');
      x += bw + (pass ? 6 + r() * 30 : r() * 8);
    }
    p.fog(K.F ? 0.18 : 0.28, K.P.fog, [450, 505, K.F ? 0.38 : 0.25]); return p;
  }
  function back(K) {
    var p = new Pt(W, H), c = K.P.back, r = rng(44), base = 520;
    [[20, 130, 176, 'tank'], [196, 90, 214, 'ac'], [400, 110, 230, 'none'], [790, 110, 200, 'tree'], [960, 110, 236, 'vent'], [1130, 150, 270, 'none']].forEach(function (b) {
      var x = b[0], w = b[1], top = b[2]; brick(p, K, x, top, w, base - top, c); if (K.F) FT.BEACONS.push([x + w - 8, top - 3, 'back']); cornice(p, x, top, w, sh(c, 1.15));
      for (var wy = top + 16; wy < top + 140; wy += 24) for (var wx = x + 8; wx < x + w - 12; wx += 18) win(p, K, wx, wy, 10, 16, { kind: 'glass', small: true });
      if (b[3] === 'tank') { var tx = x + 70; for (var tr = 0; tr < 3; tr++) p.R(tx + tr * 9, top - 18, 2, 18, '#2f2e2b'); p.R(tx - 2, top - 40, 26, 22, K.F ? '#6a5d4e' : '#2a1d18'); p.P([[tx - 4, top - 40], [tx + 11, top - 50], [tx + 26, top - 40]], K.F ? '#5a4f42' : '#1a0f0c'); for (var st = tx; st < tx + 24; st += 4) p.R(st, top - 40, 1, 22, K.F ? '#5a4f42' : '#1a0f0c'); }
      if (b[3] === 'ac') { p.R(x + 50, top + 60, 18, 12, K.F ? '#8a867c' : '#3a2e28'); p.R(x + 52, top + 62, 8, 8, K.F ? '#6c695f' : '#1a0f0c'); }
      if (b[3] === 'vent') { p.R(x + 30, top - 14, 10, 14, '#3b3a37'); p.P([[x + 27, top - 14], [x + 35, top - 20], [x + 43, top - 14]], '#3b3a37'); }
      if (b[3] === 'tree' && K.F) { var t2 = x + 60, ty = top - 30; p.L(t2, top, t2 - 4, ty + 10, '#3a2e24', 2); p.L(t2 - 4, ty + 10, t2 - 14, ty - 2, '#3a2e24'); p.L(t2 - 3, ty + 14, t2 + 10, ty + 2, '#3a2e24'); leaves(p, K, t2 - 10, ty - 4, 14, 9, 90); leaves(p, K, t2 + 8, ty, 11, 7, 60); }
    });
    p.fog(K.F ? 0.1 : 0.12, K.P.fog, [460, 520, K.F ? 0.3 : 0.14]); return p;
  }

  // ---------------------------------------------------------------- more depth: the horizon, an elevated highway, a dark near frame
  // the horizon: a low ridge of hills and a long bridge, barely there (its lights come on at night: FT.HORIZON_LIGHTS)
  var HORIZON_LIGHTS = [], HWY = { deck: 352, lanes: [347, 344], lamps: [] };
  function horizon(K) {
    var p = new Pt(W, H), c = K.F ? '#9c9a92' : '#2a1410', r = rng(91), base = 440; HORIZON_LIGHTS.length = 0;
    var y = 410, pts = [[0, H]]; for (var x = 0; x <= W; x += 8) { y = clamp(y + (r() - 0.5) * 9, 380, 425); pts.push([x, y]); } pts.push([W, H]); p.P(pts, c);
    var bd = 402, t1 = 760, t2 = 1120;   // a long suspension bridge on the right, over a river we never see
    p.R(640, bd, 640, 3, sh(c, 0.92)); [t1, t2].forEach(function (tx) { p.R(tx - 3, bd - 64, 6, 64 + 30, sh(c, 0.9)); p.R(tx - 5, bd - 64, 10, 3, sh(c, 0.9)); p.R(tx - 4, bd - 36, 8, 2, sh(c, 0.9)); HORIZON_LIGHTS.push([tx, bd - 66, 'red']); });
    function cable(xa, xb, ya, sag) { for (var x2 = xa; x2 <= xb; x2++) { var u = (x2 - xa) / (xb - xa), yy = ya + Math.sin(u * Math.PI) * sag; p.R(x2, yy, 1, 1, sh(c, 0.9)); if ((x2 - xa) % 6 === 0) p.R(x2, yy, 1, bd - yy, sh(c, 0.96)); } }
    cable(t1, t2, bd - 62, 52); cable(640, t1, bd - 30, -26 + 0); cable(t2, W, bd - 62, 30);
    for (var bl = 650; bl < W; bl += 14) HORIZON_LIGHTS.push([bl, bd - 1, 'amber']);
    p.fog(K.F ? 0.34 : 0.4, K.P.fog, [410, 445, K.F ? 0.4 : 0.3]); return p;
  }
  // the elevated highway, in two parts: the deck and its pillars (behind the cars), the parapet (in front of them)
  function highwayDeck(K) {
    var p = new Pt(W, H), c = K.F ? '#6e6c66' : '#2e1610', d = sh(c, 0.82), y = HWY.deck; HWY.lamps.length = 0;
    p.R(0, y, W, 9, c); p.R(0, y + 9, W, 2, d); p.R(0, y, W, 1, sh(c, 1.08));
    for (var px = 40; px < W; px += 150) { p.P([[px - 7, y + 11], [px + 7, y + 11], [px + 5, 505], [px - 5, 505]], d); p.R(px - 11, y + 11, 22, 4, d); p.R(px - 5, y + 15, 2, 490 - y, sh(c, 0.9)); }
    for (var lx = 90; lx < W; lx += 170) { p.R(lx, y - 22, 1, 22, d); p.R(lx, y - 22, 5, 1, d); HWY.lamps.push([lx + 4, y - 21]); }
    p.fog(K.F ? 0.08 : 0.25, K.P.fog, [430, 505, K.F ? 0.4 : 0.25]); return p;
  }
  function highwayRail(K) { var p = new Pt(W, H), c = K.F ? '#7a7872' : '#3a1c14', y = HWY.deck; p.R(0, y - 5, W, 5, c); p.R(0, y - 5, W, 1, sh(c, 1.1)); for (var x = 0; x < W; x += 40) p.R(x, y - 6, 2, 6, sh(c, 0.85)); p.fog(K.F ? 0.08 : 0.25, K.P.fog); return p; }
  // the near frame, dark and cut off by the edges of the picture: a bare tree on the left (its trunk just inside the frame,
  // its branches reaching into the sky), a utility pole on the right with its crossarms, insulators and transformer, the
  // heavy cables across the top right, a parking meter and the near kerb
  function foreground(K) {
    var p = new Pt(W, H), c = K.F ? '#1e2224' : '#0e0807', hi = K.F ? '#323a3c' : '#1a0f0c', r = rng(4417);
    p.P([[-8, H], [6, H], [5, 520], [4, 300], [-8, 290]], c); p.R(3, 300, 1, 420, hi);   // the trunk, mostly off the left edge
    (function branch(x, y, ang, len, w, d) {   // each branch splits into two or three, thinner and shorter, until twigs
      var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len; p.L(x, y, x2, y2, c, Math.max(1, Math.round(w)));
      if (d === 0 || y2 < 4) return; var n = r() < 0.4 ? 3 : 2;
      for (var i = 0; i < n; i++) branch(x2, y2, ang + (i - (n - 1) / 2) * (0.38 + r() * 0.3) + (r() - 0.5) * 0.3, len * (0.62 + r() * 0.16), w * 0.62, d - 1);
    })(2, 330, -1.05, 70, 5, 6);
    (function branch2(x, y, ang, len, w, d) { var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len; p.L(x, y, x2, y2, c, Math.max(1, Math.round(w))); if (d === 0) return; for (var i = 0; i < 2; i++) branch2(x2, y2, ang + (i ? 0.45 : -0.35) + (r() - 0.5) * 0.4, len * 0.66, w * 0.6, d - 1); })(3, 420, -0.55, 48, 3, 4);   // a lower bough
    p.R(1273, 0, 8, H, c); p.R(1274, 0, 1, H, hi); for (var b = 120; b < H; b += 90) p.R(1270, b, 10, 2, c);   // the pole, its step bolts
    [[34, 64], [58, 52]].forEach(function (q) { p.R(W - q[1], q[0], q[1], 4, c); p.R(W - q[1], q[0], q[1], 1, hi); for (var ix = W - q[1] + 4; ix < W - 8; ix += 16) { p.R(ix, q[0] - 4, 3, 4, K.F ? '#5a6460' : '#2a1d18'); p.R(ix + 1, q[0] - 5, 1, 1, K.F ? '#7a8480' : '#3a2e28'); } });   // crossarms, insulators
    p.R(1252, 78, 14, 22, c); p.R(1253, 80, 12, 1, hi); p.R(1252, 100, 14, 2, hi); p.R(1266, 84, 7, 2, c); p.L(1258, 78, 1250, 38, c);   // the transformer, its drop
    for (var k = 0; k < 2; k++) for (var x = 860; x < W - 8; x++) { var u = (x - 860) / (W - 8 - 860), yy = -6 + k * 7 + Math.sin(u * Math.PI * 0.9) * 46 + u * (14 + k * 18); p.R(x, yy, 1, 3 - k, c); }
    for (var x3 = 1040; x3 < W - 8; x3++) { var u3 = (x3 - 1040) / (W - 8 - 1040); p.R(x3, 30 + Math.sin(u3 * Math.PI) * 26 + u3 * 4, 1, 1, c); }   // a slacker line, looping down
    p.R(1190, 642, 6, 78, c); p.R(1184, 618, 18, 26, c); p.R(1186, 622, 14, 9, hi); p.R(1188, 632, 10, 2, hi);
    p.R(0, 708, W, 12, c); p.R(0, 708, W, 1, hi); for (var j = 0; j < W; j += 64) p.R(j, 708, 1, 12, hi);
    return p;
  }
  FT.STACKS = STACKS; FT.far = far; FT.mid = mid; FT.back = back; FT.horizon = horizon; FT.highwayDeck = highwayDeck; FT.highwayRail = highwayRail; FT.foreground = foreground; FT.HORIZON_LIGHTS = HORIZON_LIGHTS; FT.HWY = HWY;
})(window.FT = window.FT || {});
