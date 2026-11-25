/* Fog Town: props.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt, brick = FT.brick, stone = FT.stone, stucco = FT.stucco, plate = FT.plate, planks = FT.planks, grime = FT.grime, crack = FT.crack, plaster = FT.plaster, cornice = FT.cornice, band = FT.band, win = FT.win, shopWin = FT.shopWin, door = FT.door, signBoard = FT.signBoard, drainpipe = FT.drainpipe, leaves = FT.leaves, vine = FT.vine, weeds = FT.weeds, STACKS = FT.STACKS, far = FT.far, mid = FT.mid, back = FT.back, B = FT.B, SIGNS = FT.SIGNS, goose = FT.goose, street = FT.street, front = FT.front;
  // ---------------------------------------------------------------- props: one of each, at different depths (base = where it stands)
  function prop(K, x, base, w, h, fn) { var p = new Pt(w, h); fn(p, K, w, h); return { c: p.c, x: x, y: base - h, base: base }; }
  function props(K) {
    var F = K.F, P = K.P, list = [];
    list.push(prop(K, 6, 574, 104, 96, function (p) { p.R(8, 40, 4, 56, P.dark); p.R(90, 40, 4, 56, P.dark); p.R(0, 0, 102, 46, F ? '#ece6d6' : '#3a2e28'); p.R(3, 3, 96, 40, F ? '#5f7470' : '#3d1a12'); p.R(3, 3, 96, 1, F ? '#7d928d' : '#5a2214');
      p.T('MERGE NOTES', 51, 18, 21, F ? '#ece6d6' : '#d9cbb0'); p.T('POP. 1', 51, 33, 17, F ? '#d6dcd8' : '#b5562a'); p.R(70, 34, 8, 6, F ? '#6f8480' : '#2a1510'); }));   // the town sign
    list.push(prop(K, 212, 524, 36, 68, function (p) { var c = F ? '#2f4a48' : '#1a0f0c'; p.R(0, 0, 34, 66, c); p.R(0, 0, 34, 2, sh(c, 1.3)); p.R(30, 0, 4, 66, sh(c, 0.7)); p.R(3, 4, 22, 46, F ? '#d8f0ea' : '#140a08');
      if (F) for (var s = 0; s < 4; s++) { p.R(3, 14 + s * 10, 22, 1, '#9fbab4'); for (var b = 0; b < 5; b++) { var bc = ['#c84a3a', '#3a8a6a', '#e0b040', '#4a6aa8', '#d8d2c2'][(b + s) % 5]; if ((b + s * 3) % 7 !== 3) { p.R(5 + b * 4, 8 + s * 10, 2, 6, bc); p.R(5 + b * 4, 8 + s * 10, 2, 1, sh(bc, 1.3)); } } }
      p.R(27, 10, 2, 16, F ? '#c9a55a' : '#3a2e28'); p.R(4, 54, 20, 6, '#1a1918'); p.R(8, 24, 14, 1, 'rgba(255,255,255,0.35)'); }));   // the vending machine (one bottle sold out per row)
    list.push(prop(K, 238, 578, 40, 112, function (p) { p.R(2, 6, 34, 106, F ? '#4f5a58' : '#2a1d18'); p.R(2, 6, 34, 1, F ? '#6f7a78' : '#3a2e28'); p.R(0, 0, 38, 10, P.dark); p.T('CONTACT', 19, 5, 12, F ? '#ece6d6' : '#d9cbb0');
      p.R(6, 14, 26, 76, P.frame); p.g.clearRect(7, 15, 24, 74); p.V(7, 15, 24, 74, F ? 'rgba(138,146,148,0.42)' : 'rgba(26,15,12,0.6)', F ? 'rgba(79,87,89,0.3)' : 'rgba(14,8,7,0.5)'); p.R(7, 15, 1, 74, P.frame); p.R(30, 15, 1, 74, P.frame); p.R(13, 32, 12, 20, '#2f2e2b'); p.R(16, 36, 6, 4, F ? '#c9a55a' : '#e0a040'); p.L(8, 18, 22, 64, 'rgba(255,255,255,0.12)'); p.R(10, 92, 18, 3, sh(F ? '#4f5a58' : '#2a1d18', 0.8)); }));   // the payphone, its receiver off the hook
    list.push(prop(K, 382, 541, 18, 28, function (p) { var c = F ? '#7a3b34' : '#3d1a12'; p.R(3, 6, 12, 22, c); p.E(9, 6, 7, 4, c); p.R(0, 12, 18, 4, sh(c, 0.85)); p.R(5, 6, 2, 22, sh(c, 1.2)); p.R(7, 0, 4, 3, sh(c, 0.8)); p.R(4, 22, 10, 2, rgba('#b5562a', 0.6)); }));   // a hydrant
    list.push(prop(K, 428, 526, 46, 26, function (p) { var c1 = F ? '#22272b' : '#0e0807', c2 = F ? '#5d6a72' : '#1a0f0c'; p.R(28, 10, 16, 16, F ? '#8a7a5a' : '#2a1d18'); p.L(28, 10, 44, 26, F ? '#6a5d48' : '#1a0f0c'); p.R(28, 10, 16, 1, F ? '#a89870' : '#3a2e28');
      p.E(12, 16, 12, 10, c1); p.E(10, 12, 7, 6, sh(c1, 1.15)); p.R(11, 4, 3, 4, c1); p.L(5, 12, 9, 18, 'rgba(200,210,214,0.35)');
      p.E(26, 19, 8, 7, c2); p.R(25, 11, 2, 3, c2); p.R(22, 17, 2, 1, 'rgba(230,236,240,0.4)'); }));   // a black bag, a grey one, a flattened box
    list.push(prop(K, 480, 525, 22, 34, function (p) { var c = F ? '#3b4a5a' : '#2a1d18'; p.R(1, 4, 20, 26, c); p.E(11, 4, 10, 4, c); p.R(4, 10, 14, 2, '#22211f'); p.R(8, 30, 6, 4, '#22211f'); p.R(4, 16, 4, 6, F ? '#d8d2c2' : '#3a2e28'); p.R(1, 4, 2, 26, sh(c, 1.2)); }));   // a mailbox
    list.push(prop(K, 684, 576, 60, 32, function (p) { var c = F ? '#5a4a3a' : '#2a1d18'; p.R(0, 0, 60, 3, c); p.R(0, 7, 60, 3, c); p.R(0, 14, 60, 4, c); p.R(0, 14, 60, 1, sh(c, 1.3)); p.R(24, 7, 8, 3, sh(c, 0.6)); p.R(3, 18, 3, 14, '#22211f'); p.R(54, 18, 3, 14, '#22211f'); p.R(3, 0, 2, 18, '#22211f'); p.R(55, 0, 2, 18, '#22211f'); p.R(40, 11, 10, 3, F ? '#d8d2c2' : '#3a2e28'); }));   // a bench, one slat broken, a newspaper left on it
    list.push(prop(K, 790, 525, 18, 30, function (p) { var c = F ? '#6a4a32' : '#2a1d18', bd = F ? '#2a2e2c' : '#140a08'; p.L(2, 30, 6, 2, c, 2); p.L(16, 30, 12, 2, c, 2); p.R(5, 2, 8, 2, sh(c, 1.2)); p.R(4, 5, 10, 19, c); p.R(5, 6, 8, 17, bd);
      if (F) { p.R(6, 8, 6, 1, '#d8d2c2'); p.R(6, 10, 4, 1, '#d8d2c2'); p.R(6, 13, 6, 1, '#c9a55a'); p.R(7, 15, 4, 1, '#d8d2c2'); p.R(6, 17, 5, 1, '#d8d2c2'); p.R(6, 20, 6, 1, 'rgba(216,210,194,0.5)'); } }));   // the bookshop's chalk board: the hours, and what's new
    list.push(prop(K, 896, 526, 20, 15, function (p) { var c = F ? '#7d6a52' : '#2a1d18'; p.R(0, 0, 20, 15, c); for (var s = 1; s < 15; s += 4) p.R(0, s, 20, 1, sh(c, 0.75)); p.L(2, 13, 18, 2, sh(c, 0.8)); p.R(4, 4, 8, 3, F ? '#c8c0b0' : '#3a2e28'); }));   // a crate
    list.push(prop(K, 856, 578, 18, 28, function (p) { var c = F ? '#4c4b47' : '#1a0f0c'; p.R(1, 4, 16, 24, c); p.R(0, 2, 18, 3, sh(c, 1.15)); for (var s = 3; s < 16; s += 4) p.R(s, 8, 1, 18, sh(c, 0.8)); p.R(4, 0, 6, 3, F ? '#d8d2c2' : '#3a2e28'); }));   // a bin, a cup on top
    list.push(prop(K, 960, 524, 36, 24, function (p) { var c = F ? '#2f3438' : '#1a0f0c', f = F ? '#6b3530' : '#3d1a12'; p.ring(6, 17, 6, c); p.ring(6, 17, 5, c); p.ring(29, 17, 6, c); p.ring(29, 17, 5, c); p.L(6, 17, 14, 7, f); p.L(14, 7, 27, 7, f); p.L(27, 7, 29, 17, f); p.L(14, 7, 17, 17, f); p.L(17, 17, 6, 17, f); p.R(12, 4, 5, 2, c); p.L(27, 7, 26, 2, c); p.R(24, 1, 5, 1, c); }));   // a bike, leaning on the wall
    list.push(prop(K, 1060, 580, 90, 220, function (p) { var c = F ? '#2f3438' : '#1a0f0c'; p.R(40, 20, 5, 200, c); p.R(37, 212, 11, 8, c); p.R(41, 20, 1, 200, F ? '#4a5054' : '#2a1d18');
      for (var a2 = 0; a2 < 26; a2++) { var ang = a2 / 26 * Math.PI * 0.9; p.R(42 - Math.sin(ang) * 26, 20 - Math.cos(ang) * 14 + 6, 3, 3, c); }
      p.P([[6, 6], [26, 6], [22, 14], [10, 14]], c); p.R(10, 14, 12, 2, F ? '#f6eccc' : '#ffd08a'); p.R(45, 58, 50, 10, F ? '#3a5a4a' : '#2a1d18'); p.T('MERGE ST', 70, 63, 12, '#ece6d6'); }));   // the lamp, with the street's name
    list.push(prop(K, 1160, 556, 14, 26, function (p) { var c = F ? '#c8642a' : '#6e2a17'; p.P([[1, 24], [7, 0], [13, 24]], c); p.R(4, 10, 6, 3, F ? '#ece6d6' : '#d9cbb0'); p.R(0, 23, 14, 3, '#22211f'); p.R(9, 4, 2, 12, sh(c, 0.75)); }));   // a cone
    list.push(prop(K, 1082, 527, 16, 22, function (p) { var c = F ? '#3b4a5a' : '#2a1d18'; p.R(1, 2, 14, 20, c); p.R(1, 2, 3, 20, sh(c, 1.2)); p.R(12, 2, 3, 20, sh(c, 0.7)); p.R(1, 7, 14, 2, sh(c, 0.7)); p.R(1, 15, 14, 2, sh(c, 0.7)); p.E(8, 2, 7, 2, sh(c, 0.6)); for (var s = 0; s < 6; s++) p.R(2 + s * 2, 4 + (s * 7) % 16, 2, 1, '#8a4a2a'); }));   // a barrel
    // the bus stop: a shelter with see-through glass, a bench, the route sign, a timetable and a small missing-pet poster
    list.push(prop(K, 344, 578, 92, 80, function (p) { var fr = F ? '#5a6064' : '#1a0f0c', gl = F ? 'rgba(160,176,180,0.3)' : 'rgba(26,15,12,0.55)';
      p.R(0, 4, 3, 76, fr); p.R(76, 4, 3, 76, fr); p.R(0, 4, 79, 4, fr); p.R(-1, 2, 81, 3, F ? '#7a8084' : '#2a1d18'); p.R(3, 8, 73, 54, gl); p.R(3, 8, 73, 1, F ? 'rgba(220,230,232,0.5)' : 'rgba(58,46,40,0.5)'); p.R(38, 8, 1, 54, fr);
      p.R(8, 52, 62, 3, F ? '#6a5040' : '#2a1d18'); p.R(10, 55, 2, 13, fr); p.R(66, 55, 2, 13, fr);
      p.R(56, 14, 16, 22, F ? '#d8d2c2' : '#3a2e28'); p.R(58, 16, 12, 9, F ? '#5f7470' : '#2a1510'); p.R(58, 27, 10, 1, F ? '#22211f' : '#6e2a17'); p.R(58, 30, 7, 1, F ? '#22211f' : '#6e2a17');   // a faded ad
      p.R(6, 20, 9, 12, F ? '#ece6d6' : '#d9cbb0'); p.R(7, 21, 7, 2, F ? '#7a3b34' : '#9c2a1a'); p.R(8, 24, 5, 4, F ? '#8a8680' : '#3a2e28'); for (var tb = 7; tb < 15; tb += 2) p.R(tb, 32, 1, 3, F ? '#ece6d6' : '#d9cbb0');   // MISSING (with tear-off tabs)
      p.R(84, 0, 2, 80, fr); p.E(85, 6, 6, 6, F ? '#3a6a8a' : '#2a1d18'); p.T('9', 85, 6, 10, '#ece6d6'); p.R(81, 18, 9, 14, F ? '#e8e2d4' : '#3a2e28'); for (var tl = 21; tl < 31; tl += 2) p.R(82, tl, 7, 1, F ? '#8a8680' : '#6e2a17'); }));
    ["sign", "vending", "phone", "hydrant", "bags", "mailbox", "bench", "board", "crate", "bin", "bike", "lamp", "cone", "barrel", "shelter"].forEach(function (id, i) { if (list[i]) list[i].id = id; });
    return list;
  }
  // the lamp's light (soft by day, a dithered cone at night), the vending machine's glow
  var LAMP = { x: 1074, y: 386 };
  function lampCone(F) { var p = new Pt(220, 240), lc = F ? '#f4e6be' : '#e0a040', lx = 110, ly = 0;
    p.D(0, 0, 220, 240, lc, function (x, y) { var t = y / 200, half = 8 + t * 86, dx = Math.abs(x - lx); if (y < 200) { if (dx > half) return 0; return 0.5 * (1 - t * 0.5) * (1 - Math.pow(dx / half, 3)); } var ex = (x - lx) / 100, ey = (y - 214) / 22, d = ex * ex + ey * ey; return d < 1 ? 0.55 * (1 - d) : 0; }); return p; }
  function glowSprite(col, r) { var c = document.createElement('canvas'); c.width = c.height = r * 2; var g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, rgba(col, 0.8)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c; }
  // the last pass: a vignette and film grain, baked together at half size (0.9 MB) and stretched without smoothing:
  // one blit a frame (the grain comes out 2x2, which suits the pixel style)
  function finish(F) {   // (the rust world has its torch and ash for texture: just a vignette, at a quarter size)
    var s = F ? 2 : 4, v = document.createElement('canvas'), g = v.getContext('2d'), r = rng(7); v.width = W / s; v.height = H / s;
    var gr = g.createRadialGradient(W / s / 2, H / s / 2, 260 / s, W / s / 2, H / s / 2, 820 / s); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, F ? 'rgba(40,42,44,0.38)' : 'rgba(0,0,0,0.6)'); g.fillStyle = gr; g.fillRect(0, 0, v.width, v.height);
    if (F) for (var i = 0; i < 6500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.035)'; g.fillRect(r() * W / 2 | 0, r() * H / 2 | 0, 1, 1); }
    return { c: v };
  }
  function drawFinish(g, f) { g.drawImage(f.c, 0, 0, W, H); }
  // the fog strips and the fog bank are soft, so they are painted at half size and drawn at double: a quarter of the memory
  function fogStrip(F, seed, h, a) { var p = new Pt(W, h / 2), r = rng(seed), col = F ? '#e2dfd6' : '#1c0b08', g = p.g; g.scale(0.5, 0.5); for (var i = 0; i < 40; i++) { var x = r() * W * 2, y = h * (0.3 + r() * 0.4), rx = 80 + r() * 220, ry = h * (0.2 + r() * 0.25), gr = g.createRadialGradient(0, 0, 0, 0, 0, ry); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    [x, x + W * 2, x - W * 2].forEach(function (xx) { g.save(); g.translate(xx, y); g.scale(rx / ry, 1); g.fillStyle = gr; g.fillRect(-ry, -ry, ry * 2, ry * 2); g.restore(); }); } return p; }
  function puff(col) { var c = document.createElement('canvas'); c.width = c.height = 24; var g = c.getContext('2d'), gr = g.createRadialGradient(12, 12, 0, 12, 12, 12); gr.addColorStop(0, rgba(col, 0.9)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, 24, 24); return c; }

  // ---------------------------------------------------------------- painted once more: snow on the ledges, the wet street, the passing vehicles, the stranger, the dog, the rat, a bank of fog
  var POLE_A = [26, 118], POLE_B = [1262, 140];
  function wireY(x, k) { var u = (x - POLE_A[0]) / (POLE_B[0] - POLE_A[0]); return POLE_A[1] + 9 + k * 9 + (POLE_B[1] - POLE_A[1]) * u + Math.sin(u * Math.PI) * 40 + Math.sin(u * Math.PI * 3) * 3; }
  // snow, settled: thick lumpy caps (a highlight on top, a shadow lip under) on every ledge, roof, sign, awning, canopy and
  // the tops of the street furniture; on the ground a soft sheet (blotched in three tones, not dithered), banked against the
  // walls, trodden grey along the walking lanes, heaped in a ridge on the kerb; and slush on the road with dark tyre ruts
  function capsLayer(K) {
    var p = new Pt(W, H), r = rng(77), S0 = '#eef1f4', S1 = '#e0e6ea', S2 = '#cbd3da', S3 = '#b3bdc6', HI = '#fbfcfd';
    function cap(x, y, w, th) { x = Math.round(x); w = Math.round(w); for (var xx = x; xx < x + w; xx++) { var u = (xx - x + 0.5) / w, edge = Math.min(1, Math.min(u, 1 - u) * 7), lump = Math.max(1, Math.round(th * edge * (0.75 + 0.35 * Math.sin(xx * 0.55) * Math.sin(xx * 0.23 + 1)))); p.R(xx, y - lump, 1, lump, S0); p.R(xx, y - lump, 1, 1, HI); if (lump > 1) p.R(xx, y - 1, 1, 1, S1); } p.R(x, y, w, 1, 'rgba(120,132,146,0.35)'); }
    K.ledges.forEach(function (l) { cap(l[0], l[1], l[2], 2.6); });
    [[774, 414, 138, 3], [762, 170, 162, 4], [1102, 432, 50, 3], [1151, 410, 46, 3], [422, 330, 88, 4], [513, 420, 254, 4], [1200, 412, 88, 3], [343, 500, 82, 3], [1066, 384, 16, 2], [556, 186, 168, 3],   // awning, billboard, substation, laundry roof, the diner, the canopy, the shelter, the lamp, MY WORK
      [212, 456, 36, 3], [238, 466, 40, 3], [684, 545, 60, 2], [480, 491, 22, 3], [791, 497, 16, 2], [856, 551, 18, 2], [1082, 505, 16, 2]].forEach(function (q) { cap(q[0], q[1], q[2], q[3]); });   // vending, booth, bench, mailbox, news box, bins
    Object.keys(FT.B).forEach(function (k) { var b = FT.B[k]; if (k !== 'work' && k !== 'edge') cap(b[0], b[2], b[1], 4); });   // the roofs
    SIGNS.forEach(function (s) { cap(s[0] - 1, s[1], s[2] + 2, 2); });
    // the ground, pixel by pixel: value noise blotches the sheet; banks against the walls; trodden lanes; the kerb ridge; the road's slush and ruts
    var img = p.g.getImageData(0, G - 6, W, H - G + 6), d = img.data, cols = [S0, S1, S2, S3, HI].map(FT.hex), grid = [];
    for (var gy = 0; gy < 40; gy++) { grid.push([]); for (var gx = 0; gx < 70; gx++) grid[gy].push(r()); }
    function vn(x, y) { var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, a = grid[iy % 40][ix % 70], b = grid[iy % 40][(ix + 1) % 70], c = grid[(iy + 1) % 40][ix % 70], e = grid[(iy + 1) % 40][(ix + 1) % 70]; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); return a + (b - a) * fx + (c - a) * fy + (a - b - c + e) * fx * fy; }
    function put(x, yy, col, a) { var o = ((yy - (G - 6)) * W + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = Math.round(255 * a); }
    for (var x = 0; x < W; x++) {
      var bank = Math.round(1 + vn(x / 9, 3) * 4); for (var by = G - bank; by < G; by++) put(x, by, by === G - bank ? cols[4] : cols[0], 1);   // banked against the walls
      for (var y = G; y < KERB; y++) { var n = vn(x / 23, y / 6) * 0.7 + vn(x / 5, y / 2) * 0.3, lane = [534, 548, 562].some(function (ly) { return Math.abs(y - ly + 1) < 2; }), ci = n < 0.55 ? 0 : n < 0.8 ? 1 : 2;
        if (y < G + 3) ci = Math.max(ci, 2);   // the shadow at the foot of the walls
        if (lane && n > 0.35) ci = n > 0.7 ? 3 : 2; put(x, y, cols[ci], 1); }
      var ridge = Math.round(2 + vn(x / 7, 9) * 4); for (var ry = KERB - ridge; ry < ROAD + 2; ry++) put(x, ry, ry === KERB - ridge ? cols[4] : ry > ROAD - 1 ? cols[3] : cols[0], 1);   // the ridge on the kerb
      for (var sy = ROAD + 2; sy < H; sy++) { var plow = sy < ROAD + 10 + vn(x / 11, 5) * 6, rut = [620, 640, 684, 702].some(function (ry2) { return Math.abs(sy - ry2) < 2; }), m = vn(x / 17, sy / 5);
        if (plow) put(x, sy, cols[m > 0.6 ? 2 : 1], 1); else if (rut) put(x, sy, [86, 88, 92], 0.55); else put(x, sy, m > 0.55 ? [176, 180, 184] : [150, 150, 146], 0.42 + m * 0.2); }   // slush, ruts
    }
    p.g.putImageData(img, 0, G - 6);
    return p;
  }
  function wetLayer() {
    var p = new Pt(W, H), r = rng(19); p.V(0, ROAD, W, H - ROAD, 'rgba(20,24,28,0.25)', 'rgba(20,24,28,0.4)'); p.V(0, G, W, KERB - G, 'rgba(20,24,28,0.16)', 'rgba(20,24,28,0.24)');
    for (var i = 0; i < 60; i++) p.R(r() * W, ROAD + 12 + r() * 120, 20 + r() * 80, 1, 'rgba(220,226,230,0.18)');
    for (var j = 0; j < 30; j++) p.R(r() * W, G + 3 + r() * 50, 6 + r() * 16, 1, 'rgba(220,226,230,0.16)');
    [[300, 612, 70], [760, 700, 50], [1120, 628, 90], [560, 640, 40], [980, 690, 60], [180, 540, 30], [900, 560, 26]].forEach(function (q) { p.E(q[0], q[1], q[2], 5, 'rgba(200,206,210,0.32)'); p.E(q[0] - 6, q[1] - 1, q[2] * 0.4, 1.5, 'rgba(240,244,246,0.4)'); });
    return p;
  }
  // a copy of a vehicle for driving left (it is drawn flipped): its lettering repainted back to front, so it reads the right way round
  function lettered(src, box, fill, text, x, y, size, col) { var c = document.createElement('canvas'); c.width = src.width; c.height = src.height; var g = c.getContext('2d'); g.drawImage(src, 0, 0); g.fillStyle = fill; g.fillRect(box[0], box[1], box[2], box[3]); mirrorText({ g: g }, text, x, y, size, col); return c; }
  function vehicles() {
    var r = rng(55), v = {};
    var a = new Pt(150, 66), c = '#7a7d78';   // a delivery van
    a.R(4, 8, 104, 46, c); a.R(4, 8, 104, 2, sh(c, 1.2)); a.P([[108, 20], [128, 22], [146, 38], [148, 54], [108, 54]], sh(c, 1.04)); a.R(116, 25, 20, 13, '#4f5759'); a.R(116, 25, 20, 1, '#8a9294');
    a.R(12, 16, 54, 18, '#5f6a68'); a.T('PARCELS', 39, 25, 12, '#d8d2c2'); a.R(72, 10, 1, 44, sh(c, 0.7)); a.R(108, 22, 1, 32, sh(c, 0.7)); a.R(2, 50, 146, 5, '#3b3a37'); a.R(142, 42, 5, 4, '#e8d8a0'); a.R(4, 42, 3, 5, '#8a2a2a');
    for (var s = 0; s < 18; s++) a.R(6 + r() * 100, 10 + r() * 40, 2, 1, '#6a4a3a'); [30, 122].forEach(function (x) { a.E(x, 57, 8, 8, '#1a1918'); a.E(x, 57, 4, 4, '#6c695f'); });
    v.van = { c: a.c, cL: lettered(a.c, [12, 16, 54, 18], '#5f6a68', 'PARCELS', 39, 25, 12, '#d8d2c2'), w: 150, h: 66, front: 147, lightY: 44, speed: 120, wheels: [[30, 57, 8, 4], [122, 57, 8, 4]] };   // wheels: x, y, radius, hub (they turn live, scene.js)
    var b = new Pt(198, 52), tc = '#b89a4a';   // a taxi
    b.P([[0, 42], [6, 26], [48, 22], [68, 8], [128, 8], [148, 22], [192, 26], [198, 42]], tc); b.R(72, 11, 26, 11, '#4f5759'); b.R(102, 11, 24, 11, '#4f5759'); b.R(72, 11, 54, 1, '#8a9294');
    b.R(94, 1, 22, 7, '#d8c890'); b.T('TAXI', 105, 4, 8, '#22211f'); for (var k = 4; k < 192; k += 6) b.R(k, 30, 3, 2, (k / 6 | 0) % 2 ? '#22211f' : '#e8e2d4'); b.R(0, 36, 198, 6, sh(tc, 0.7)); b.R(192, 28, 5, 4, '#e8d8a0'); b.R(1, 28, 4, 4, '#8a2a2a');
    [40, 158].forEach(function (x) { b.E(x, 44, 9, 9, '#1a1918'); b.E(x, 44, 4, 4, '#8a877e'); }); v.taxi = { c: b.c, cL: lettered(b.c, [94, 1, 22, 7], '#d8c890', 'TAXI', 105, 4, 8, '#22211f'), w: 198, h: 52, front: 196, lightY: 30, speed: 170, wheels: [[40, 44, 9, 4], [158, 44, 9, 4]] };
    // the courier: a v2 rider (body2.js 'cycle') on a bike drawn here, 8 frames: the wheels turn, the cranks go round, the legs follow the pedals
    var V2 = window.FTBody2, rider = V2.spec({ height: 54, skin: '#a86a48', hair: { style: 'short', col: '#141010' }, tie: null, shirt: { col: '#c8b890', sleeves: 'long' }, jacket: { col: '#3a4050', open: false, len: 'hip', leather: false }, legs: { col: '#2a2a30', type: 'trousers', tights: null }, accent: { type: 'cap', col: '#e8d84a' } });
    var CF = V2.FW, ck = 54 / 64, cr = new Pt(CF * 8, V2.FH), cc = '#2a2e32', fc = '#4c5a7a';
    for (var f = 0; f < 8; f++) { var gx = f * CF + V2.GX, gy = V2.GY, rw = [gx - 14 * ck, gy - 9 * ck], fw2 = [gx + 15 * ck, gy - 9 * ck], bb = [gx, gy - 8.5 * ck], seat = [gx - 4.5 * ck, gy - 29 * ck], head = [gx + 11 * ck, gy - 24 * ck], bar = [gx + 11.5 * ck, gy - 32 * ck];
      [rw, fw2].forEach(function (w) { cr.ring(w[0], w[1], 9 * ck, cc); cr.ring(w[0], w[1], 8 * ck, cc); for (var sp = 0; sp < 2; sp++) { var sa = f * Math.PI / 8 + sp * Math.PI / 2; cr.L(w[0] - Math.cos(sa) * 7 * ck, w[1] - Math.sin(sa) * 7 * ck, w[0] + Math.cos(sa) * 7 * ck, w[1] + Math.sin(sa) * 7 * ck, '#5a5e62'); } cr.R(w[0] - 0.5, w[1] - 0.5, 1, 1, '#8a8e92'); });   // wheels, their spokes turning
      cr.L(rw[0], rw[1], bb[0], bb[1], fc); cr.L(bb[0], bb[1], seat[0], seat[1], fc); cr.L(seat[0], seat[1], rw[0], rw[1], fc); cr.L(bb[0], bb[1], head[0], head[1], fc); cr.L(seat[0] + 1, seat[1] + 1, head[0], head[1], fc); cr.L(head[0], head[1], fw2[0], fw2[1], fc); cr.L(head[0], head[1], bar[0], bar[1], cc);
      cr.R(seat[0] - 2, seat[1] - 1, 5, 1, cc); cr.R(bar[0] - 1, bar[1], 3, 1, cc);   // the saddle and the bars
      cr.L(rw[0], rw[1] - 1, rw[0] - 4, gy - 21 * ck, cc); cr.R(gx - 24 * ck, gy - 29 * ck, 11 * ck, 8 * ck, '#c8642a'); cr.R(gx - 24 * ck, gy - 29 * ck, 11 * ck, 1, '#e0844a');   // a rack and the delivery box
      var ca = f / 8 * Math.PI * 2; cr.L(bb[0], bb[1], bb[0] + Math.cos(ca + Math.PI) * 3.3 * ck, bb[1] + Math.sin(ca + Math.PI) * 3.3 * ck, cc);   // the far crank
      cr.g.drawImage(V2.frame(rider, 'cycle', f), f * CF, 0);   // the rider
      cr.L(bb[0], bb[1], bb[0] + Math.cos(ca) * 3.3 * ck, bb[1] + Math.sin(ca) * 3.3 * ck, '#8a8e92'); cr.R(bar[0] + 1, bar[1] + 2, 2, 2, '#e8d8a0'); }   // the near crank over the leg; a lamp on the bars
    v.courier = { c: cr.c, w: CF, h: V2.GY, frames: 8, front: V2.GX + 17, lightY: V2.GY - 30, speed: 60 };
    return v;
  }
  // the stranger: a tall figure in a long dark coat who stands and faces straight out at you, then is gone (the v2 body, looking out)
  function stranger() { var V = window.FTBody2, c = V.frame(V.spec({ height: 60, build: 1.05, skin: '#b89a8a', hair: { style: 'short', col: '#141212' }, tie: null, shirt: { col: '#3a3a3a', sleeves: 'long' }, jacket: { col: '#1e1e22', open: false, len: 'calf' }, legs: { col: '#141416', type: 'trousers' }, shoes: { col: '#0e0e10', boots: false }, accent: { type: null } }), 'front', 0); c.ox = V.GX; c.oy = V.GY; return c; }
  function dogSheet(c0, d0) { var fw = 18, fh = 12, p = new Pt(fw * 6, fh), c = c0 || "#6a4a32", d = d0 || "#4a3222";
    for (var f = 0; f < 6; f++) { var ox = f * fw, walk = f < 4, ph = f % 4, hy = walk ? 3 : 6;
      p.E(ox + 8, 5, 6, 2.5, c); p.E(ox + 14, hy, 2.5, 2, c); p.R(ox + 14, hy - 2, 1, 2, d); p.R(ox + 16, hy + 1, 2, 1, d); p.L(ox + 2, 4, ox, walk ? 1 : f === 4 ? 0 : 3, c);
      (walk ? [[4, ph < 2 ? 1 : -1], [6, ph < 2 ? -1 : 1], [10, ph < 2 ? -1 : 1], [12, ph < 2 ? 1 : -1]] : [[4, 0], [6, 0], [10, 0], [12, 0]]).forEach(function (l) { p.L(ox + l[0], 7, ox + l[0] + l[1], 11, d); }); }
    return { c: p.c, fw: fw, fh: fh }; }
  function ratSheet() { var p = new Pt(20, 5), c = '#4a4844'; for (var f = 0; f < 2; f++) { var ox = f * 10; p.E(ox + 4, 2.5, 3.5, 1.8, c); p.R(ox + 7, 2, 2, 1, c); p.R(ox + 8, 1, 1, 1, '#2a2826'); p.L(ox, 3, ox - 2 + 2, 4, '#5a5450'); p.R(ox + 2 + f, 4, 1, 1, c); p.R(ox + 5 - f, 4, 1, 1, c); } return p.c; }
  // a bank of fog: separate billows, thick at its far end and near the ground, torn into tufts at the edge it leads
  // with, so the street still shows through it as shapes (it hides the town's end, it doesn't paint over it)
  function bankLayer() { var p = new Pt(450, 230), r = rng(61), g = p.g; g.scale(0.5, 0.5);
    for (var i = 0; i < 72; i++) { var u = Math.pow(r(), 0.75), x = 60 + u * 840, top = 330 - u * 150 - r() * 50, y = top + r() * (450 - top), rr = 30 + r() * 70 * (0.55 + u), a = (0.1 + 0.22 * u) * (0.55 + 0.45 * (y - 150) / 300);
      var gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(226,223,214,' + a.toFixed(3) + ')'); gr.addColorStop(0.6, 'rgba(226,223,214,' + (a * 0.55).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(226,223,214,0)');
      g.save(); g.translate(x, y); g.scale(1.6, 0.8); g.translate(-x, -y); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); }
    return p; }
  // a room seen through a lit window (for the glimpse)
  function paintRoom(cv, kind) {
    var p = new Pt(160, 100), r = rng(kind.length * 97 + 3), wall = { office: '#b89870', study: '#a8a078', late: '#2a3040', reading: '#9a7858', bench: '#8a7a62', home: '#b0a080' }[kind] || '#a89878', who = '#2a2420', g = p.g;
    p.R(0, 0, 160, 100, wall); p.D(0, 0, 160, 100, sh(wall, 0.78), function (x, y) { return 0.12 + 0.3 * (y / 100); }); p.R(0, 78, 160, 22, sh(wall, 0.6)); p.R(0, 78, 160, 1, sh(wall, 0.45));
    function glow(x, y, rr, col, a) { var gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    if (kind === 'office') { for (var d = 0; d < 4; d++) { p.R(10, 40 + d * 9, 24, 8, '#6a6c68'); p.R(18, 43 + d * 9, 8, 1, '#3b3a37'); } p.R(60, 62, 64, 4, '#5a4030'); p.R(62, 66, 3, 12, '#3a2a20'); p.R(118, 66, 3, 12, '#3a2a20'); p.R(70, 58, 14, 4, '#e8e2d4'); p.R(86, 59, 10, 3, '#d8d2c2'); p.R(110, 48, 2, 14, '#3b3a37'); p.R(106, 46, 9, 4, '#3b3a37'); glow(110, 54, 30, '#ffd890', 0.5);
      p.E(90, 46, 5, 6, who); p.P([[82, 52], [98, 52], [100, 78], [80, 78]], who); }
    if (kind === 'study') { p.R(16, 16, 66, 42, '#ece8e0'); p.R(16, 16, 66, 1, '#b8b4ac'); [[22, 22, '#e0c050'], [34, 22, '#c86a5a'], [46, 30, '#6aa0c8'], [24, 40, '#7ac08a'], [60, 24, '#e0c050']].forEach(function (s) { p.R(s[0], s[1], 8, 8, s[2]); }); p.R(56, 38, 20, 14, 'rgba(0,0,0,0)'); g.strokeStyle = '#3b3a37'; g.strokeRect(56.5, 38.5, 20, 14); g.strokeRect(36.5, 46.5, 14, 8);
      p.R(100, 64, 50, 4, '#5a4030'); p.R(110, 54, 20, 10, '#2f3438'); glow(120, 58, 24, '#a0c8ff', 0.5); p.E(92, 34, 5, 6, who); p.P([[85, 40], [99, 40], [98, 78], [86, 78]], who); p.L(86, 44, 70, 32, who, 2); }
    if (kind === 'late') { p.R(56, 64, 70, 4, '#2a2420'); p.R(70, 42, 30, 20, '#1a1e24'); p.R(72, 44, 26, 16, '#7ab0e8'); glow(85, 52, 50, '#7ab0e8', 0.45); p.R(84, 62, 4, 2, '#1a1e24'); p.R(108, 58, 6, 6, '#e8e2d4');
      p.E(86, 40, 5, 6, '#0e1014'); p.P([[76, 46], [96, 46], [100, 78], [72, 78]], '#0e1014'); p.R(81, 37, 10, 1, '#7ab0e8'); }
    if (kind === 'reading') { p.R(112, 12, 40, 66, '#4a3222'); for (var sh2 = 0; sh2 < 4; sh2++) { p.R(112, 26 + sh2 * 15, 40, 2, '#2a1a12'); for (var bk = 114; bk < 150; bk += 3) p.R(bk, 16 + sh2 * 15, 2, 10, ['#7a3b34', '#5f7470', '#c9a55a', '#d8d2c2', '#4c5a7a'][(r() * 5) | 0]); }
      p.R(26, 52, 46, 26, '#6b3530'); p.R(26, 44, 10, 34, '#5a2c28'); p.R(64, 50, 10, 28, '#5a2c28'); p.R(84, 30, 2, 48, '#3b3a37'); p.P([[78, 24], [92, 24], [89, 32], [81, 32]], '#d8c890'); glow(85, 32, 40, '#ffd890', 0.5);
      p.E(50, 38, 5, 6, who); p.P([[42, 44], [58, 44], [60, 62], [40, 62]], who); p.R(52, 46, 10, 7, '#e8e2d4'); }
    if (kind === 'bench') { p.R(10, 14, 140, 38, '#7a6a52'); for (var hx = 14; hx < 146; hx += 6) for (var hy = 18; hy < 50; hy += 6) p.R(hx, hy, 1, 1, '#5a4a3a'); [[20, 20, 4, 18], [32, 22, 14, 3], [52, 20, 3, 20], [64, 24, 10, 10], [90, 20, 18, 4], [118, 22, 4, 16], [130, 26, 12, 3]].forEach(function (t2) { p.R(t2[0], t2[1], t2[2], t2[3], '#3b3a37'); });
      p.R(16, 60, 128, 5, '#5a4030'); p.R(20, 65, 3, 13, '#3a2a20'); p.R(138, 65, 3, 13, '#3a2a20'); p.R(80, 0, 1, 10, '#22211f'); p.E(80, 12, 3, 3, '#fff0c0'); glow(80, 14, 50, '#ffe0a0', 0.5); p.E(104, 38, 5, 6, who); p.P([[96, 44], [112, 44], [113, 78], [95, 78]], who); }
    if (kind === 'hotel') { p.R(20, 56, 70, 14, '#e8e2d4'); p.R(20, 52, 70, 5, '#8a3a3a'); p.R(20, 70, 3, 8, '#3a2a20'); p.R(87, 70, 3, 8, '#3a2a20'); p.R(14, 44, 10, 26, '#5a3a2a'); p.R(104, 50, 3, 28, '#3b3a37'); p.P([[98, 44], [112, 44], [109, 52], [101, 52]], '#d8c890'); glow(105, 52, 34, '#ffd890', 0.45); p.R(120, 62, 26, 16, '#6a5a3a'); p.R(120, 62, 26, 2, '#8a7a5a'); p.R(130, 58, 6, 4, '#3b3a37'); }
    if (kind === 'home') { p.R(20, 60, 60, 4, '#6a5040'); p.R(24, 64, 3, 14, '#4a3828'); p.R(72, 64, 3, 14, '#4a3828'); p.R(40, 54, 8, 6, '#c8c0b0'); p.R(110, 40, 40, 38, '#d8d2c2'); p.R(112, 42, 36, 4, '#b8b2a2'); p.R(128, 32, 8, 8, '#3b3a37'); glow(70, 30, 50, '#ffd890', 0.4); p.E(94, 36, 5, 6, who); p.P([[87, 42], [101, 42], [102, 78], [86, 78]], who); }
    var fr = '#2a2826'; p.R(0, 0, 160, 5, fr); p.R(0, 95, 160, 5, fr); p.R(0, 0, 5, 100, fr); p.R(155, 0, 5, 100, fr); p.R(78, 0, 4, 100, fr); p.R(0, 47, 160, 4, fr); p.R(0, 5, 160, 1, '#5a5652');
    var g2 = cv.getContext('2d'); g2.imageSmoothingEnabled = false; g2.drawImage(p.c, 0, 0, cv.width, cv.height);
  }

  // smoke and steam: soft, uneven wisps (not round glows), four of them to pick from
  function wisps(col) { var out = []; for (var v = 0; v < 4; v++) { var c = document.createElement('canvas'); c.width = 32; c.height = 24; var g = c.getContext('2d'), r = rng(300 + v * 17);
    for (var k = 0; k < 7; k++) { var x = 8 + r() * 16, y = 7 + r() * 10, rr = 4 + r() * 6, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, rgba(col, 0.32)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } out.push(c); } return out; }
  // inside the diner, seen through its windows: the back wall, then (in front of whoever works the counter) the counter itself
  function dinerInside(K) {
    var D = FT.DINER, w = D.inside[2], h = D.inside[3], bg = new Pt(w, h), fg = new Pt(w, h), F = K.F, r = rng(808);
    var wall = F ? '#d8c8a4' : '#1a0f0c', wood = F ? '#6a4430' : '#140a08';
    bg.R(0, 0, w, h, wall); for (var tx = 0; tx < w; tx += 6) bg.R(tx, 18, 1, 24, sh(wall, 0.92)); for (var ty = 18; ty < 42; ty += 6) bg.R(0, ty, w, 1, sh(wall, 0.92));
    bg.R(0, 0, w, 6, wood); bg.R(0, 16, w, 2, wood);
    bg.R(10, 4, 84, 15, F ? '#22262a' : '#0e0807'); bg.R(10, 4, 84, 1, F ? '#4a4e52' : '#1a0f0c'); bg.T('TODAY', 52, 8, 8, F ? '#e8c070' : '#9c2a1a'); bg.T('4 CASE STUDIES', 52, 14, 8, F ? '#e8e2d4' : '#9c2a1a');
    for (var cup = 0; cup < 7; cup++) bg.R(150 + cup * 5, 9, 3, 3, F ? '#f4f0e8' : '#2a1d18'); bg.R(146, 12, 40, 1, wood);
    bg.R(196, 4, 12, 26, F ? '#a9ada8' : '#2a1d18'); bg.R(198, 4, 2, 26, F ? '#d8dcd6' : '#3a2e28'); bg.R(200, 14, 3, 2, F ? '#d84a3a' : '#5a2214');
    bg.E(122, 9, 5, 5, F ? '#f4f0e8' : '#2a1d18'); bg.ring(122, 9, 5, F ? '#3b3a37' : '#0e0807');    // the clock (its hands are live)
    [40, 120, 214].forEach(function (lx) { bg.R(lx, 0, 1, 3, '#22211f'); bg.P([[lx - 4, 6], [lx + 5, 6], [lx + 3, 3], [lx - 2, 3]], F ? '#3a5a4a' : '#1a0f0c'); });
    var top = F ? '#c8c0b0' : '#2a1d18'; fg.R(0, 41, w, 3, top); fg.R(0, 41, w, 1, sh(top, 1.15)); fg.R(0, 44, w, h - 44, F ? '#9a3a32' : '#2a1510');
    fg.R(226, 32, 18, 9, F ? 'rgba(220,232,236,0.55)' : 'rgba(40,20,14,0.6)'); fg.R(230, 36, 10, 4, F ? '#c8783a' : '#3d1a12'); fg.R(226, 32, 18, 1, F ? '#e8f0f2' : '#3a2e28');   // the pie case
    for (var sp = 0; sp < 3; sp++) fg.R(60 + sp * 60 + r() * 20, 39, 4, 2, F ? '#f4f0e8' : '#2a1d18');   // cups left on the counter
    return { bg: bg, fg: fg, clock: [122, 9] };
  }
  // a stray cat: four walking frames, two sitting (the tail moves), two running
  function catSheet() { var fw = 16, fh = 10, p = new Pt(fw * 8, fh), c = '#1e1c20', h = '#34303a';
    for (var f = 0; f < 8; f++) { var ox = f * fw, walk = f < 4, sit = f === 4 || f === 5, run = f > 5;
      if (sit) { p.E(ox + 7, 6, 3.5, 3.2, c); p.E(ox + 9, 3, 2.4, 2.2, c); p.R(ox + 8, 0, 1, 2, c); p.R(ox + 10, 0, 1, 2, c); p.L(ox + 4, 8, ox + 1, f === 4 ? 4 : 6, c); p.R(ox + 6, 9, 4, 1, c); p.R(ox + 10, 2, 1, 1, '#c8b040'); continue; }
      var stretch = run ? 2 : 0; p.E(ox + 7, 5, 5 + stretch, 2, c); p.R(ox + 5, 4, 5, 1, h); p.E(ox + 13 + stretch, 3, 2.2, 2, c); p.R(ox + 12 + stretch, 0, 1, 2, c); p.R(ox + 14 + stretch, 0, 1, 2, c); p.R(ox + 14 + stretch, 2, 1, 1, '#c8b040');
      p.L(ox + 2, 5, ox, run ? 3 : 1 + (f % 2), c); var ph = f % 2, lg = run ? [[3, ph ? -2 : 2], [5, ph ? 2 : -2], [10, ph ? -2 : 2], [12, ph ? 2 : -2]] : [[4, ph ? 1 : -1], [5, ph ? -1 : 1], [10, ph ? -1 : 1], [11, ph ? 1 : -1]];
      lg.forEach(function (l) { p.L(ox + l[0], 6, ox + l[0] + l[1], 9, c); }); }
    return { c: p.c, fw: fw, fh: fh }; }
  // the bus (route 9): it pulls in, opens its door, people get on and off, it goes
  // the bus is drawn flipped (it always heads left), so its lettering is painted back to front, to read the right way round
  function mirrorText(p, text, x, y, size, col) { var g = p.g; g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(-1, 1); g.font = size + 'px VT323'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, 0, 0); g.restore(); }
  function busSprite() { var p = new Pt(300, 86), body = '#5f6e58', cream = '#d8d0b8', r = rng(909);
    p.R(4, 10, 290, 64, body); p.R(4, 10, 290, 26, cream); p.R(4, 8, 286, 3, sh(cream, 0.9)); p.R(4, 36, 290, 2, sh(body, 0.7)); p.R(4, 60, 290, 6, sh(body, 0.75));
    p.P([[294, 10], [300, 22], [300, 70], [294, 74]], sh(body, 0.85)); p.R(276, 14, 20, 26, '#3a4446'); p.R(276, 14, 20, 1, '#8a9294');   // the windscreen
    p.R(240, 1, 50, 9, '#1e2224'); mirrorText(p, '9  LOCAL', 265, 5, 9, '#e8c060');
    for (var wi = 0; wi < 9; wi++) { var wx = 14 + wi * 25; if (wx > 236) break; p.R(wx, 16, 21, 16, '#3a4446'); p.R(wx, 16, 21, 1, '#8a9294'); }   // (its riders are drawn live, scene.js)
    p.R(241, 16, 30, 16, '#3a4446'); p.R(241, 16, 30, 1, '#8a9294'); p.E(266, 22, 3, 3, '#22262a'); p.R(262, 25, 8, 7, '#22262a');   // the driver's window (the doors are on the kerb side, the side we cannot see)
    p.R(282, 52, 8, 5, '#e8d8a0'); p.R(6, 52, 5, 6, '#8a2a2a'); p.R(20, 44, 60, 12, sh(cream, 0.92)); mirrorText(p, 'MERGE ST', 50, 50, 9, '#3a4446');
    [52, 236].forEach(function (x) { p.E(x, 74, 12, 12, '#1a1918'); p.E(x, 74, 6, 6, '#6c695f'); p.R(x - 16, 60, 32, 4, sh(body, 0.6)); });
    return { c: p.c, w: 300, h: 86, door: [246, 14, 24, 52], front: 299, lightY: 54, wheels: [[52, 74, 12, 6], [236, 74, 12, 6]], windows: (function () { var a = []; for (var k = 0; k < 9; k++) { var x = 14 + k * 25; if (x <= 236) a.push([x, 16, 21, 16]); } a.push([241, 16, 30, 16]); return a; })() }; }
  // inside the laundromat: dryers above, washers below with round doors (their drums turn live), a folding table
  function laundryInside(K) { var LA = FT.LAUNDRY, g0 = LA.glass, x0 = g0[0], y0 = g0[1], w = g0[2] + LA.door[2] + 8, h = g0[3] + 10, p = new Pt(w, h), F = K.F, wall = F ? '#c8d6ce' : '#1a0f0c', steel = F ? '#e4e6e2' : '#2a1d18';
    p.R(0, 0, w, h, wall); for (var tx = 0; tx < w; tx += 5) p.R(tx, 0, 1, h, sh(wall, 0.95)); p.R(0, 0, w, 3, sh(wall, 0.8));
    for (var d = 0; d < 4; d++) { var dx = 2 + d * 14; p.R(dx, 6, 12, 18, steel); p.R(dx, 6, 12, 1, '#ffffff'); p.ring(dx + 6, 16, 4, '#5a6064'); p.E(dx + 6, 16, 3, 3, F ? '#3a4044' : '#0e0807'); }
    for (var m = 0; m < 4; m++) { var mx = 2 + m * 14; p.R(mx, 46, 12, 22, steel); p.R(mx, 46, 12, 1, '#ffffff'); p.R(mx + 2, 48, 8, 2, F ? '#8a9094' : '#1a0f0c'); p.ring(mx + 6, 58, 5, '#5a6064'); p.E(mx + 6, 58, 4, 4, F ? '#3a4044' : '#0e0807'); }
    p.R(0, 40, w, 2, F ? '#a0a8a4' : '#1a0f0c'); p.R(0, h - 4, w, 4, F ? '#8a8a80' : '#0e0807');
    return { c: p.c, x: x0, y: y0, drums: [0, 1, 2, 3].map(function (m2) { return [x0 + 2 + m2 * 14 + 6, y0 + 58]; }) }; }
  // ---------------------------------------------------------------- weathering: one pass over a painted layer's pixels, once
  // A little per-pixel variation (no wall is one flat colour), damp rising at the foot of the walls, water stains running
  // down from every sill and ledge, rust bleeding from the metal signs, moss where the walls meet the pavement. noiseOnly
  // (for the layers further back): just the variation.
  function weathering(pt, K, noiseOnly) {
    var c = pt.c, g = pt.g, img = g.getImageData(0, 0, W, H), d = img.data, r = rng(K.F ? 5151 : 6262), F = K.F;
    function hash(x, y) { var n = (x * 374761393 + y * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) & 1023) / 1023; }
    function shade(x, y, f, tint, ta) { if (x < 0 || y < 0 || x >= W || y >= H) return; var o = (y * W + x) * 4; if (!d[o + 3]) return; for (var i = 0; i < 3; i++) { var v = d[o + i] * f; if (tint) v = v * (1 - ta) + tint[i] * ta; d[o + i] = v < 0 ? 0 : v > 255 ? 255 : v; } }
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var o = (y * W + x) * 4; if (!d[o + 3]) continue; var n = (hash(x, y) - 0.5) * (noiseOnly ? 0.05 : 0.07) + 1;   // the variation
      if (!noiseOnly && y < G && y >= G - 18) { var damp = (y - (G - 18)) / 18; if (BAYER[(y & 3) * 4 + (x & 3)] / 16 < damp * 1.2) n *= 1 - 0.16 * damp; }   // rising damp, dithered at its top
      d[o] = Math.min(255, d[o] * n); d[o + 1] = Math.min(255, d[o + 1] * n); d[o + 2] = Math.min(255, d[o + 2] * n); }
    if (!noiseOnly) {
      (K.ledges || []).forEach(function (l) { var k = Math.max(1, Math.round(l[2] / 9 * r())); for (var i = 0; i < k; i++) { var sx = Math.round(l[0] + r() * l[2]), len = 4 + r() * 14; for (var j = 1; j < len; j++) if (j < len * 0.6 || (j & 1)) shade(sx, l[1] + j, 0.9 - 0.1 * (1 - j / len)); } });   // stains under sills
      (FT.SIGNS || []).forEach(function (s) { for (var i = 0; i < 3; i++) { var sx = Math.round(s[0] + 3 + r() * (s[2] - 6)), len = 5 + r() * 12; for (var j = 0; j < len; j++) if (j < len * 0.7 || (j & 1)) shade(sx, s[1] + s[3] + j, 0.96, F ? [138, 74, 42] : [110, 40, 20], 0.28 * (1 - j / len)); } });   // rust from the signs
      if (F) for (var mx = 0; mx < W; mx++) if (r() < 0.06) { var h2 = 1 + (r() * 3 | 0); for (var my = 0; my < h2; my++) shade(mx, G - 1 - my, 0.85, [58, 74, 46], 0.55); }   // moss at the foot of the walls
    }
    g.putImageData(img, 0, 0); return pt;
  }
  function build(name) {
    var K = { F: name === 'fog', P: PAL[name], r: rng(1234), wins: name === 'fog' ? [] : null, ledges: [] };
    var pack = FT.pack;   // each layer is packed the moment it is painted, so only one full-size painting is ever alive
    var bgPack = function (src) { return K.F ? pack(src, 0, G) : FT.packHalf(src, G); };   // (the rust world keeps its distant layers at half size: they sit in the dark)
    K.layer = 'far'; var fa = bgPack(far(K)); K.layer = 'mid'; var mi = bgPack(weathering(mid(K), K, true)); K.layer = 'back'; var ba = bgPack(weathering(back(K), K, true));   // (the street hides everything below G)
    FT.LEDGES = K.F ? K.ledges : null; K.layer = 'street'; var st = pack(weathering(street(K), K)); FT.LEDGES = null; K.layer = 'front'; var fr = pack(front(K));
    var L = { K: K, far: fa, mid: mi, back: ba, street: st, front: fr, props: props(K), finish: finish(K.F), cone: lampCone(K.F), fogA: fogStrip(K.F, 3, 180, K.F ? 0.26 : 0.34), fogB: fogStrip(K.F, 8, 120, K.F ? 0.22 : 0.3), puff: puff(K.F ? '#e4e1d8' : '#2a120c') };
    L.cbank = FT.cloudBank(K.F); L.horizon = bgPack(FT.horizon(K)); L.hwy = bgPack(FT.highwayDeck(K)); L.rail = bgPack(FT.highwayRail(K)); L.fg = pack(FT.foreground(K)); L.inside = dinerInside(K); L.wisp = wisps(K.F ? '#e4e1d8' : '#2a120c');
    L.lInside = laundryInside(K); if (K.F) { L.cat = catSheet(); L.dog2 = dogSheet('#9a968e', '#6a6660'); L.bus = busSprite(); }
    if (K.F) { L.caps = pack(capsLayer(K)); L.wet = pack(wetLayer()); L.veh = vehicles(); L.bank = bankLayer(); L.stranger = stranger(); L.dog = dogSheet(); L.rat = ratSheet(); }
    if (K.wins) K.wins.forEach(function (w) { w.home = rand(16.5, 21.5); w.bed = rand(21.5, 26.5); w.early = Math.random() < 0.25 ? rand(5.2, 7.2) : null; w.day = Math.random() < 0.12; w.col = pick(['#f0c070', '#e8b060', '#f4d8a0', '#d8e4e0', '#f0c070']); w.tv = Math.random() < 0.1; w.never = Math.random() < (w.layer === 'mid' ? 0.55 : 0.42); w.who = Math.random() < 0.3 ? rand(0.25, 0.75) : null; w.flip = 0; w.isOn = false; });
    return L;
  }

  FT.wisps = wisps; FT.dinerInside = dinerInside; FT.LAMP = LAMP; FT.POLE_A = POLE_A; FT.POLE_B = POLE_B; FT.prop = prop; FT.props = props; FT.lampCone = lampCone; FT.glowSprite = glowSprite; FT.finish = finish; FT.drawFinish = drawFinish; FT.fogStrip = fogStrip; FT.puff = puff; FT.wireY = wireY; FT.capsLayer = capsLayer; FT.wetLayer = wetLayer; FT.vehicles = vehicles; FT.stranger = stranger; FT.dogSheet = dogSheet; FT.ratSheet = ratSheet; FT.bankLayer = bankLayer; FT.paintRoom = paintRoom; FT.build = build; 
})(window.FT = window.FT || {});
