/* Fog Town: street.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt, brick = FT.brick, stone = FT.stone, stucco = FT.stucco, plate = FT.plate, planks = FT.planks, grime = FT.grime, crack = FT.crack, plaster = FT.plaster, cornice = FT.cornice, band = FT.band, win = FT.win, shopWin = FT.shopWin, door = FT.door, signBoard = FT.signBoard, drainpipe = FT.drainpipe, leaves = FT.leaves, vine = FT.vine, weeds = FT.weeds, STACKS = FT.STACKS, far = FT.far, mid = FT.mid, back = FT.back;
  // ---------------------------------------------------------------- the street: buildings (MY WORK in the middle), the pavement, the road
  var B = { edge: [-10, 68, 200], about: [60, 190, 186], how: [272, 148, 262], laundry: [424, 84, 330], work: [MIDX - 127, 254, 420], writing: [778, 130, 286], toolkit: [916, 152, 222], switch: [1104, 92, 430], hotel: [1198, 92, 150] };
  // the diner (MY WORK) and the hotel (CONTACT): where their parts are, for painting and for the live light
  var DINER = { x: MIDX - 127, w: 254, roof: 420, sign: [MIDX - 84, 186, 168, 56], word: 'MY WORK', wordY: 214, size: 36, sub: 'OPEN ALL NIGHT', subBox: [MIDX - 50, 244, 100, 18],
    band: [MIDX - 117, 450, 234, 46], glass: [[MIDX - 115, 452, 103, 42], [MIDX + 24, 452, 91, 42]], door: [627, 452, 26, 58], inside: [MIDX - 127, 448, 254, 50], stools: [535, 562, 589, 700, 727], bulbs: [] };
  (function () { var s = DINER.sign; for (var x = s[0] + 4; x <= s[0] + s[2] - 4; x += 8) { DINER.bulbs.push([x, s[1] + 3]); } for (var y = s[1] + 11; y <= s[1] + s[3] - 4; y += 8) DINER.bulbs.push([s[0] + s[2] - 3, y]); for (x = s[0] + s[2] - 4; x >= s[0] + 4; x -= 8) DINER.bulbs.push([x, s[1] + s[3] - 3]); for (y = s[1] + s[3] - 11; y >= s[1] + 4; y -= 8) DINER.bulbs.push([s[0] + 3, y]); })();
  var LAUNDRY = { glass: [430, G - 88, 54, 72], door: [488, G - 84, 16, 82] };
  var HOTEL = { x: 1198, w: 92, top: 150, sign: [1180, 196, 16, 128], letters: 'HOTEL', canopy: [1208, G - 108, 72, 12], door: [1228, G - 60, 32, 60] };
  // the signs are the links: each has a small lamp over it, so it can still be read at night
  var SIGNS = [[108, 416, 94, 20, 1], [290, 426, 112, 20, 1], [794, 390, 98, 20, 1], [770, 168, 150, 62, 1], [1070, 264, 20, 110, 0], [1208, G - 107, 72, 12, 0]];
  function goose(p, K, x, y) { var c = K.F ? '#2f3438' : '#1a0f0c'; p.R(x, y - 12, 2, 6, c); p.L(x + 1, y - 12, x + 7, y - 16, c); p.P([[x + 4, y - 16], [x + 12, y - 16], [x + 10, y - 12], [x + 6, y - 12]], c); p.R(x + 6, y - 12, 4, 1, K.F ? '#c8bc98' : '#3a2e28'); }
  function street(K) {
    var p = new Pt(W, H), P = K.P, F = K.F, r = K.r;
    p.R(0, G, W, KERB - G, P.joint);
    for (var sx = 0; sx < W; sx += 36) for (var sy = G; sy < KERB; sy += 27) { var c = F ? sh(P.path, 0.94 + r() * 0.12) : sh(P.path, 0.8 + r() * 0.4); p.R(sx + 1, sy + 1, 35, 26, c); p.R(sx + 1, sy + 1, 35, 1, sh(c, 1.08)); if (r() < 0.2) crack(p, sx + 4 + r() * 28, sy + 2, 6 + r() * 18, sh(c, 0.7), r); }
    p.R(0, G, W, 2, F ? '#a9a69c' : '#6e2a17');
    if (!F) { for (var gx = 0; gx < W; gx += 5) p.R(gx, G + 2, 1, KERB - G - 2, '#0e0807'); for (var gy = G + 4; gy < KERB; gy += 5) p.R(0, gy, W, 1, '#0e0807'); }
    else [[118, G + 1, 4], [534, G + 28, 3], [702, KERB, 5], [1006, G + 1, 3], [356, KERB, 4], [1190, G + 28, 2]].forEach(function (w) { weeds(p, K, w[0], w[1], w[2]); });
    p.R(0, KERB, W, ROAD - KERB, P.kerb); for (var kj = 0; kj < W; kj += 48) p.R(kj, KERB, 1, ROAD - KERB, sh(P.kerb, 0.8)); p.R(0, KERB, W, 1, sh(P.kerb, 1.15));
    p.R(0, ROAD, W, H - ROAD, P.road); p.R(0, ROAD, W, 9, P.gutter);
    for (var ad = 0; ad < 12000; ad++) p.R(r() * W, ROAD + r() * (H - ROAD), 1, 1, r() < 0.5 ? sh(P.road, 0.88) : sh(P.road, 1.1));
    [[60, 610, 160, 22], [520, 668, 90, 14], [880, 600, 210, 26]].forEach(function (q) { p.R(q[0], q[1], q[2], q[3], sh(P.road, 0.94)); p.R(q[0], q[1], q[2], 1, sh(P.road, 0.84)); });
    p.E(980, 640, 30, 5, F ? 'rgba(30,30,28,0.35)' : 'rgba(0,0,0,0.3)'); p.E(984, 641, 12, 2, F ? 'rgba(90,70,110,0.25)' : 'rgba(110,42,23,0.3)');   // an oil stain
    for (var dl = 0; dl < W; dl += 70) for (var dd = 0; dd < 38; dd++) if (r() > 0.25) p.R(dl + dd, 650, 1, 3, F ? mix(P.line, P.road, 0.35) : P.line);
    for (var lt = 0; lt < 24; lt++) p.R(r() * W, ROAD + 2 + r() * 8, 2 + r() * 2, 1, F ? ['#7a6a4a', '#6b3530', '#d8d2c2', '#8a7a5a'][(r() * 4) | 0] : '#3a2e28');
    if (F) [[300, 612, 40], [760, 700, 28], [1120, 628, 52]].forEach(function (q) { p.E(q[0], q[1], q[2], 3, 'rgba(212,209,199,0.24)'); p.E(q[0] - 4, q[1], q[2] * 0.3, 1, 'rgba(240,236,226,0.24)'); });
    p.E(MIDX, 690, 24, 6, F ? '#3f3e3a' : '#0b0605'); p.E(MIDX, 690, 20, 4, F ? '#4a4944' : '#1a0f0c'); for (var mh = -16; mh < 18; mh += 4) p.R(MIDX + mh, 687, 2, 6, F ? '#3a3935' : '#0b0605');
    p.R(470, ROAD, 40, 5, '#2a2926'); for (var sd = 472; sd < 508; sd += 4) p.R(sd, ROAD + 1, 2, 3, '#141312');
    var b;
    // the edge building, with a fire escape (one pot of herbs on it)
    b = B.edge; brick(p, K, b[0], b[2], b[1], G - b[2], P.brick2); plaster(p, K, b[0], 380, 60, 110, P.plaster); cornice(p, b[0], b[2], b[1], P.stone);
    for (var ef = 0; ef < 5; ef++) win(p, K, 8, 236 + ef * 56, 22, 34);
    var fe = F ? '#2f2e2b' : '#1a0f0c'; for (var f = 0; f < 4; f++) { var py = 280 + f * 56; p.R(2, py, 52, 2, fe); for (var rx = 2; rx <= 54; rx += 3) p.R(rx, py - 11, 1, 11, fe); p.R(2, py - 11, 52, 1, fe); if (f < 3) p.L(f % 2 ? 7 : 49, py + 2, f % 2 ? 49 : 7, py + 56, fe, 2); }
    if (F) { p.R(34, 331, 7, 5, '#6a4a3a'); leaves(p, K, 37, 329, 5, 3, 14); }
    // ABOUT
    b = B.about; var ax = b[0], aw = b[1], at = b[2];
    brick(p, K, ax, at, aw, G - at, P.brick); plaster(p, K, ax + 96, at + 190, 90, 120, P.plaster2); cornice(p, ax, at, aw, P.trim); band(p, ax, at + 72, aw, P.trim); band(p, ax, at + 182, aw, P.trim);
    for (var af = 0; af < 4; af++) for (var acn = 0; acn < 5; acn++) win(p, K, ax + 14 + acn * 35, at + 26 + af * 58, 22, 36, af === 1 && acn === 4 ? { kind: 'boarded' } : null);
    var ag = G - 80; stone(p, K, ax, ag, aw, 80, P.stone); p.R(ax, ag, aw, 2, sh(P.stone, 1.15));
    door(p, K, ax + 12, G - 60, 26, 60, F ? '#3f3a33' : '#1a0f0c', true); shopWin(p, K, ax + 52, ag + 12, 70, 52, 'studio');   // the portrait studio (shops.js)
    signBoard(p, K, ax + 50, ag - 22, 90, 16, 'ABOUT', 20); drainpipe(p, K, ax + aw - 8, at + 10, G);
    var acx = ax + 150, acy = at + 140, acc = F ? '#a19d92' : '#3a2e28'; p.R(acx, acy, 22, 15, acc); p.R(acx, acy, 22, 1, sh(acc, 1.2)); for (var v = acy + 3; v < acy + 13; v += 2) p.R(acx + 2, v, 18, 1, sh(acc, 0.74)); p.R(acx - 2, acy + 15, 26, 2, '#3b3a37'); p.R(acx + 3, acy + 17, 1, 22, rgba(F ? '#3b3a37' : '#b5562a', 0.35));   // a window unit
    p.R(ax + 128, ag + 12, 11, 16, F ? '#c9a55a' : '#d9cbb0'); p.R(ax + 130, ag + 15, 7, 2, F ? '#7a3b34' : '#6e2a17'); p.R(ax + 130, ag + 19, 5, 1, '#3b3a37');   // one poster: a lost cat
    if (F) vine(p, K, ax + 40, at + 12, 46, 2);
    if (!F) p.T('+971 5_ ___ ____', ax + aw / 2, at + 150, 24, '#c8442a', { rot: -0.05, shadow: '#3d1a12' });
    p.R(250, 300, 22, 220, F ? '#3b3a37' : '#0b0605'); p.V(250, 300, 22, 220, 'rgba(16,20,22,0.5)', 'rgba(16,20,22,0.1)');   // the alley
    // HOW I WORK
    b = B.how; var hx = b[0], hw = b[1], ht = b[2];
    stone(p, K, hx, ht, hw, G - ht, P.stone); plaster(p, K, hx + 8, ht + 150, 70, 70, P.plaster); cornice(p, hx, ht, hw, P.trim);
    for (var ins = 0; ins < 4; ins++) { var ix = hx + 16 + ins * 36; p.R(ix, ht - 30, 2, 30, '#3b3a37'); p.R(ix - 10, ht - 26, 22, 2, '#3b3a37'); for (var ib = 0; ib < 3; ib++) p.E(ix - 7 + ib * 7, ht - 28, 2, 2, F ? '#7a9a94' : '#5a3a2a'); }
    for (var hc = 0; hc < 3; hc++) { win(p, K, hx + 18 + hc * 44, ht + 40, 26, 50, { arch: true }); win(p, K, hx + 18 + hc * 44, ht + 132, 26, 40); }
    door(p, K, hx + hw / 2 - 15, G - 64, 30, 64, F ? '#4a3a2e' : '#1a0f0c', true); p.E(hx + hw / 2, G - 66, 20, 10, P.trim); p.E(hx + hw / 2, G - 65, 15, 7, P.glass);
    signBoard(p, K, hx + 20, G - 92, 108, 16, 'HOW I WORK', 19);
    if (!F) p.T('NO PROJECT', hx + hw / 2, ht + 116, 22, '#c8442a', { rot: 0.04, shadow: '#3d1a12' });
    // the laundromat, open all hours: a big window onto washers and dryers and whoever is waiting on their wash (drawn live, scene.js)
    b = B.laundry; stucco(p, K, b[0], b[2], b[1], G - b[2], P.stucco); p.R(b[0] - 2, b[2], b[1] + 4, 4, sh(P.stucco, 0.85));
    win(p, K, b[0] + 12, b[2] + 30, 24, 40); win(p, K, b[0] + 48, b[2] + 30, 24, 40, { kind: 'boarded' });
    p.R(b[0] + 6, G - 114, b[1] - 12, 16, P.dark); p.R(b[0] + 8, G - 112, b[1] - 16, 12, F ? '#2e3a3c' : '#140a08'); p.T('LAUNDRY', b[0] + b[1] / 2, G - 106, 14, F ? '#7a8a88' : '#2a1d18');
    var lg = LAUNDRY.glass, ld = LAUNDRY.door, alum = F ? '#b8bcba' : '#3a2e28';
    p.R(lg[0] - 3, lg[1] - 3, lg[2] + 6, lg[3] + 6, alum); p.g.clearRect(lg[0], lg[1], lg[2], lg[3]); p.R(lg[0] + Math.round(lg[2] / 2), lg[1], 1, lg[3], alum);
    p.R(ld[0] - 2, ld[1] - 3, ld[2] + 4, ld[3] + 3, alum); p.R(ld[0], ld[1], ld[2], ld[3], P.frame); p.V(ld[0] + 2, ld[1] + 2, ld[2] - 4, ld[3] - 20, P.glassHi, P.glass); p.R(ld[0] + ld[2] - 4, ld[1] + 36, 2, 6, '#b8a77a');
    p.R(b[0] + 4, G - 14, lg[2] + 6, 14, F ? '#6a6c68' : '#1a0f0c'); p.R(b[0] + 4, G - 14, lg[2] + 6, 1, F ? '#8a8c88' : '#2a1d18'); p.R(ld[0] + 3, ld[1] + 8, ld[2] - 6, 6, F ? '#e8e2d4' : '#2a1d18'); p.T('24H', ld[0] + ld[2] / 2, ld[1] + 11, 7, F ? '#3a6a5a' : '#3a2e28');
    // MY WORK: a diner, open all night, in the middle. Its neon, its chasing bulbs and the people inside are drawn live (scene.js)
    var dx = DINER.x, dw = DINER.w, dt = DINER.roof, x1 = dx + dw, steel = F ? '#a9ada8' : '#3a2e28', steelD = F ? '#7d817c' : '#241812', chrome = F ? '#d8dcd6' : '#4a3a30', red = F ? '#9a3a32' : '#5a2214';
    var sg = DINER.sign; p.R(MIDX - 5, sg[1] + sg[3] + 20, 4, dt - sg[1] - sg[3] - 20, P.metal); p.R(MIDX + 2, sg[1] + sg[3] + 20, 4, dt - sg[1] - sg[3] - 20, P.metal); for (var lb = sg[1] + sg[3] + 24; lb < dt - 8; lb += 12) p.L(MIDX - 3, lb, MIDX + 4, lb + 12, sh(P.metal, 0.75));
    p.R(sg[0], sg[1], sg[2], sg[3], P.dark); p.R(sg[0] + 2, sg[1] + 2, sg[2] - 4, sg[3] - 4, chrome); p.R(sg[0] + 6, sg[1] + 6, sg[2] - 12, sg[3] - 12, F ? '#262c30' : '#140a08');
    DINER.bulbs.forEach(function (bb) { p.R(bb[0] - 1, bb[1] - 1, 2, 2, F ? '#7a7a72' : '#2a1d18'); });
    p.T(DINER.word, MIDX, DINER.wordY, DINER.size, F ? '#4a5054' : '#241812');
    var sb = DINER.subBox; p.R(sb[0], sb[1], sb[2], sb[3], P.dark); p.R(sb[0] + 2, sb[1] + 2, sb[2] - 4, sb[3] - 4, F ? '#262c30' : '#140a08'); p.T(DINER.sub, MIDX, sb[1] + sb[3] / 2 + 1, 13, F ? '#40484a' : '#241812');
    p.P([[dx + 14, dt], [x1 - 14, dt], [x1 - 4, dt + 4], [x1, dt + 14], [x1, G], [dx, G], [dx, dt + 14], [dx + 4, dt + 4]], steel);
    for (var rx = dx + 2; rx < x1 - 2; rx += 3) { p.R(rx, dt + 8, 1, 20, steelD); p.R(rx, 502, 1, 10, steelD); }
    p.R(dx + 10, dt - 3, dw - 20, 4, sh(steel, 1.15)); p.R(dx + 10, dt + 1, dw - 20, 1, sh(steel, 0.7));
    var bd = DINER.band; p.R(bd[0], bd[1], bd[2], bd[3], chrome); p.R(bd[0], bd[1], bd[2], 1, sh(chrome, 1.15)); DINER.glass.forEach(function (gl) { p.g.clearRect(gl[0], gl[1], gl[2], gl[3]); });
    for (var mm = dx + 36; mm < x1 - 20; mm += 26) if (mm < 612 || mm > 668) p.R(mm, bd[1] + 2, 2, bd[3] - 4, chrome);
    p.R(dx, 496, dw, 6, red); p.R(dx, 496, dw, 1, sh(red, 1.3)); p.R(dx, 501, dw, 1, sh(red, 0.6));
    for (var ck = dx; ck < x1; ck += 4) { p.R(ck, G - 8, 4, 4, ((ck - dx) / 4) % 2 ? '#22211f' : (F ? '#d8d2c2' : '#2a1d18')); p.R(ck, G - 4, 4, 4, ((ck - dx) / 4) % 2 ? (F ? '#d8d2c2' : '#2a1d18') : '#22211f'); }
    p.R(616, dt + 2, 48, G - dt - 2, steel); for (var vr = 618; vr < 662; vr += 3) p.R(vr, dt + 8, 1, 18, steelD); p.R(612, dt - 2, 56, 5, sh(steel, 1.12));
    p.R(MIDX - 44, dt + 8, 88, 11, P.dark); p.R(MIDX - 44, dt + 8, 88, 1, F ? '#4a4844' : '#1a0f0c'); p.T("TATIANA'S DINER", MIDX, dt + 14, 11, F ? '#c8b890' : '#3a2e28');   // the name over the door
    var dd = DINER.door; p.R(dd[0] - 3, dd[1] - 3, dd[2] + 6, dd[3] + 3, chrome); p.R(dd[0], dd[1], dd[2], dd[3], P.frame); p.V(dd[0] + 2, dd[1] + 2, dd[2] - 4, dd[3] - 20, P.glassHi, P.glass); p.R(dd[0] + 2, dd[1] + dd[3] - 16, dd[2] - 4, 14, steelD); p.R(dd[0] + dd[2] - 5, dd[1] + 30, 2, 8, '#b8a77a');
    p.R(dd[0] + 5, dd[1] + 8, 16, 7, F ? '#c8443a' : '#3d1a12'); p.T('OPEN', dd[0] + 13, dd[1] + 12, 8, '#ece6d6'); p.R(608, G - 2, 64, 2, sh(P.stone, 1.05));
    if (K.wins) K.wins.push({ x: dd[0] + 2, y: dd[1] + 2, w: dd[2] - 4, h: dd[3] - 20, layer: K.layer, door: true, diner: true, cx: MIDX });
    if (F) { vine(p, K, x1 - 12, dt + 2, 22, 1); weeds(p, K, dx + 4, G, 3); }
    if (!F) p.T('200 OK', MIDX, dt + 18, 22, '#c8442a', { rot: -0.04, shadow: '#3d1a12' });
    if (FT.LEDGES) FT.LEDGES.push([dx + 10, dt, dw - 20], [sg[0], sg[1], sg[2]], [612, dt - 2, 56]);
    // WRITING, with the billboard (EARLIER WORK) on its roof
    b = B.writing; var kx = b[0], kw = b[1], kt = b[2];
    p.R(kx + 8, kt - 96, 3, 96, '#3b3a37'); p.R(kx + kw - 16, kt - 96, 3, 96, '#3b3a37'); p.L(kx + 10, kt - 6, kx + kw - 14, kt - 84, '#3b3a37'); p.L(kx + 10, kt - 84, kx + kw - 14, kt - 6, '#3b3a37');
    p.R(kx - 8, kt - 116, kw + 16, 58, P.dark); p.R(kx - 6, kt - 114, kw + 12, 54, F ? '#d8d2c2' : '#2a1d18');
    for (var pz = 0; pz < 4; pz++) { var pc = F ? ['#7a3b34', '#5f7470', '#c9a55a', '#4c5a7a'][pz] : '#3d1a12'; p.R(kx - 1 + pz * 34, kt - 108, 30, 24, pc); p.R(kx + 2 + pz * 34, kt - 104, 22, 2, F ? '#ece6d6' : '#6e2a17'); }
    for (var tear = 0; tear < 14; tear++) p.R(kx - 6 + r() * (kw + 12), kt - 114 + r() * 54, 2 + r() * 6, 1 + r() * 2, F ? '#a8a294' : '#b5562a');
    p.T('EARLIER WORK', kx + kw / 2, kt - 70, 19, F ? '#22211f' : '#d9cbb0');
    brick(p, K, kx, kt, kw, G - kt, P.brick3); cornice(p, kx, kt, kw, P.trim); p.R(kx + 12, kt - 40, 15, 40, P.brick2); p.R(kx + 10, kt - 43, 19, 4, P.trim);
    for (var bf = 0; bf < 2; bf++) for (var bc = 0; bc < 3; bc++) win(p, K, kx + 14 + bc * 38, kt + 22 + bf * 56, 24, 36);
    signBoard(p, K, kx + 18, G - 128, 94, 16, 'WRITING', 20);
    var ay = G - 106; for (var aw2 = 0; aw2 < kw + 8; aw2 += 10) { var stripe = (aw2 / 10) % 2 ? P.awn[1] : P.awn[0]; if (!F && r() < 0.35) continue; p.P([[kx - 4 + aw2, ay], [kx + 6 + aw2, ay], [kx + 10 + aw2, ay + 22], [kx + aw2, ay + 22]], stripe); p.E(kx + 5 + aw2, ay + 22, 5, 3, stripe); if (r() < 0.25) p.R(kx + aw2 + 2, ay + 4 + r() * 14, 2, 2, sh(stripe, 0.7)); if (!F) p.R(kx + aw2 + 3, ay + 22, 2, 10 + r() * 16, stripe); }
    p.P([[kx + 70, ay + 22], [kx + 80, ay + 22], [kx + 78, ay + 30], [kx + 72, ay + 27]], F ? sh(P.awn[0], 0.8) : P.awn[0]);   // a torn flap
    p.R(kx - 4, ay + 25, kw + 14, 3, 'rgba(16,20,22,0.35)');
    shopWin(p, K, kx + 8, G - 74, 76, 60, 'books'); door(p, K, kx + 94, G - 62, 26, 62, F ? '#5f3a2e' : '#1a0f0c', true);
    // TOOLKIT
    b = B.toolkit; var sx2 = b[0], sw = b[1], stt = b[2];
    p.R(sx2 + 20, stt - 52, 16, 52, P.brick); p.R(sx2 + 18, stt - 54, 20, 3, P.trim); p.P([[sx2 + 100, stt], [sx2 + 114, stt - 20], [sx2 + 140, stt - 20], [sx2 + 150, stt]], F ? '#8a877e' : '#3a2e28'); for (var sp = sx2 + 104; sp < sx2 + 146; sp += 6) p.L(sp, stt - 1, sp + 4, stt - 19, P.frame);
    brick(p, K, sx2, stt, sw, G - stt, P.brick2); plaster(p, K, sx2 + 4, stt + 196, 80, 80, P.plaster); cornice(p, sx2, stt, sw, P.trim);
    for (var sf = 0; sf < 2; sf++) for (var sc = 0; sc < 3; sc++) { var wx2 = sx2 + 17 + sc * 46, wy2 = stt + 34 + sf * 96; win(p, K, wx2, wy2, 26, 46, { shop: true, grid: 6, kind: (sf === 1 && sc === 0) ? 'broken' : 'glass' }); for (var gx2 = wx2 + 6; gx2 < wx2 + 26; gx2 += 6) p.R(gx2, wy2, 1, 46, P.frame); for (var gy2 = wy2 + 8; gy2 < wy2 + 46; gy2 += 8) p.R(wx2, gy2, 26, 1, P.frame); }   // factory windows, smaller than they were
    p.R(sx2 + 14, G - 74, 72, 74, P.dark); for (var sl2 = 0; sl2 < 40; sl2 += 3) { p.R(sx2 + 14, G - 74 + sl2, 72, 2, F ? '#7d7a72' : '#3a2e28'); p.R(sx2 + 14, G - 72 + sl2, 72, 1, F ? '#5d5b55' : '#1a0f0c'); }
    door(p, K, sx2 + 104, G - 58, 28, 58, F ? '#3f3a33' : '#1a0f0c', true); drainpipe(p, K, sx2 + 2, stt + 12, G);
    var su = sx2 + 96, sv = stt + 102, suc = F ? '#b8b4a8' : '#3a2e28'; p.R(su, sv, 30, 22, suc); p.R(su, sv, 30, 1, sh(suc, 1.15)); p.ring(su + 19, sv + 11, 7, sh(suc, 0.6)); p.ring(su + 19, sv + 11, 5, sh(suc, 0.7)); p.L(su + 14, sv + 6, su + 24, sv + 16, sh(suc, 0.6)); p.L(su + 24, sv + 6, su + 14, sv + 16, sh(suc, 0.6)); p.R(su + 2, sv + 22, 3, 6, '#3b3a37'); p.R(su + 25, sv + 22, 3, 6, '#3b3a37');   // a split unit with its fan
    if (F) { leaves(p, K, su + 12, sv - 1, 14, 3, 22); vine(p, K, su + 4, sv + 10, 34, 2); }
    p.R(sx2 + 90, G - 98, 14, 20, F ? '#4c5a7a' : '#d9cbb0'); p.R(sx2 + 92, G - 95, 10, 2, F ? '#ece6d6' : '#9c2a1a'); p.R(sx2 + 92, G - 90, 6, 8, F ? '#c9a55a' : '#6e2a17');   // a gig poster
    p.R(sx2 + sw - 2, stt + 40, 22, 4, P.metal); p.R(sx2 + sw + 2, stt + 44, 16, 104, P.dark); p.R(sx2 + sw + 4, stt + 46, 12, 100, F ? '#5f7470' : P.sign); p.R(sx2 + sw + 4, stt + 46, 1, 100, F ? '#7d928d' : '#3a2e28');
    'TOOLKIT'.split('').forEach(function (ch, i) { p.T(ch, sx2 + sw + 10, stt + 58 + i * 13, 17, P.signText, { shadow: 'rgba(16,20,22,0.5)' }); });
    // the substation: the switch that turns the town (the lever on its wall)
    b = B.switch; var wx = b[0], ww = b[1], wt = b[2];
    brick(p, K, wx, wt, ww, G - wt, P.brick); p.R(wx - 3, wt - 4, ww + 6, 6, sh(P.stone, 0.9)); p.R(wx - 3, wt - 4, ww + 6, 1, sh(P.stone, 1.15));
    p.R(wx + 8, G - 70, 30, 70, F ? '#4f5a58' : '#2a1d18'); p.R(wx + 8, G - 70, 30, 1, F ? '#6f7a78' : '#3a2e28'); for (var lv2 = 0; lv2 < 4; lv2++) p.R(wx + 12, G - 60 + lv2 * 6, 22, 2, F ? '#3b4442' : '#1a0f0c'); p.R(wx + 32, G - 38, 3, 6, '#b8a77a');
    p.R(wx + 50, G - 86, 40, 50, F ? '#5f6a68' : '#2a1d18'); p.R(wx + 50, G - 86, 40, 1, F ? '#7f8a88' : '#3a2e28'); p.R(wx + 54, G - 80, 32, 38, F ? '#3b4442' : '#140a08');
    p.R(wx + 62, G - 74, 16, 4, F ? '#b8b4a8' : '#5a3a2a'); p.L(wx + 70, G - 72, wx + 80, G - 52, F ? '#8a8a84' : '#3a2e28', 2); p.R(wx + 76, G - 56, 10, 5, F ? '#a83a2a' : '#c8442a');   // the knife switch, its handle red
    p.R(wx + 52, G - 100, 36, 12, F ? '#e8d84a' : '#3a2e28'); p.P([[wx + 58, G - 90], [wx + 62, G - 98], [wx + 66, G - 90]], F ? '#22211f' : '#9c2a1a'); p.T('DANGER', wx + 77, G - 94, 11, F ? '#22211f' : '#9c2a1a');
    p.L(wx + 70, G - 86, wx + 70, wt, '#22211f', 2); p.L(wx + 76, G - 86, wx + 76, wt, '#22211f', 1);
    if (F) { p.R(wx + 58, G - 30, 26, 12, '#ece6d6'); p.R(wx + 59, G - 29, 24, 10, '#7a3b34'); p.T('PULL', wx + 71, G - 24, 11, '#ece6d6'); }
    // the hotel at the end of the street: CONTACT is its lobby. Its HOTEL sign has a dead letter, and another that buzzes
    var hx = HOTEL.x, hw = HOTEL.w, ht = HOTEL.top, hc = F ? '#6a564a' : '#5a2214';
    brick(p, K, hx, ht, hw, G - ht, hc); cornice(p, hx, ht, hw, P.trim); band(p, hx, G - 96, hw, P.trim);
    p.R(hx + 60, ht - 34, 2, 34, '#3b3a37'); p.R(hx + 54, ht - 28, 14, 1, '#3b3a37'); p.R(hx + 56, ht - 22, 10, 1, '#3b3a37');   // an aerial
    for (var fl = 0; fl < 10; fl++) { var fy = ht + 20 + fl * 32; if (fy > G - 130) break; for (var cl = 0; cl < 2; cl++) win(p, K, hx + 16 + cl * 40, fy, 22, 24, fl === 2 && cl === 1 ? { kind: 'boarded' } : null); }
    var by = ht + 20 + 5 * 32 + 27; p.R(hx + 8, by, 76, 2, '#2f2e2b'); for (var bx = hx + 8; bx <= hx + 84; bx += 4) p.R(bx, by - 10, 1, 10, '#2f2e2b'); p.R(hx + 8, by - 10, 76, 1, '#2f2e2b');   // a balcony
    stone(p, K, hx, G - 92, hw, 92, P.stone); p.R(hx, G - 92, hw, 2, sh(P.stone, 1.15));
    var hd = HOTEL.door; p.R(hd[0] - 4, hd[1] - 5, hd[2] + 8, hd[3] + 5, '#b8a77a'); p.R(hd[0], hd[1], hd[2], hd[3], P.frame); p.V(hd[0] + 2, hd[1] + 2, hd[2] / 2 - 3, hd[3] - 4, P.glassHi, P.glass); p.V(hd[0] + hd[2] / 2 + 1, hd[1] + 2, hd[2] / 2 - 3, hd[3] - 4, P.glassHi, P.glass); p.R(hd[0] + hd[2] / 2 - 3, hd[1] + 26, 2, 8, '#b8a77a'); p.R(hd[0] + hd[2] / 2 + 1, hd[1] + 26, 2, 8, '#b8a77a');
    if (K.wins) K.wins.push({ x: hd[0] + 2, y: hd[1] + 2, w: hd[2] - 4, h: hd[3] - 4, layer: K.layer, door: true, lobby: true, cx: hd[0] + hd[2] / 2 });
    var cn = HOTEL.canopy; p.P([[cn[0] - 4, cn[1]], [cn[0] + cn[2] + 4, cn[1]], [cn[0] + cn[2] + 8, cn[1] + 14], [cn[0] - 8, cn[1] + 14]], F ? '#5a2a2a' : '#2a1510'); p.R(cn[0] - 8, cn[1] + 14, cn[2] + 16, 3, F ? '#3a1a1a' : '#140a08');
    p.R(cn[0], cn[1] + 1, cn[2], cn[3], P.dark); p.T('CONTACT', cn[0] + cn[2] / 2, cn[1] + 7, 13, F ? '#e8d8a8' : '#d9cbb0'); for (var cb = cn[0]; cb <= cn[0] + cn[2]; cb += 6) p.R(cb, cn[1] - 1, 1, 1, F ? '#d8c890' : '#3a2e28');
    p.R(cn[0] + 2, cn[1] + 17, 1, 92 - 20, '#2f2e2b'); p.R(cn[0] + cn[2] - 3, cn[1] + 17, 1, 92 - 20, '#2f2e2b');
    var hs = HOTEL.sign; p.R(hs[0] + hs[2], hs[1] + 10, 4, 2, P.metal); p.R(hs[0] + hs[2], hs[1] + hs[3] - 12, 4, 2, P.metal); p.R(hs[0], hs[1], hs[2], hs[3], P.dark); p.R(hs[0] + 2, hs[1] + 2, hs[2] - 4, hs[3] - 4, F ? '#262c30' : '#140a08');
    HOTEL.letters.split('').forEach(function (ch, i) { p.T(ch, hs[0] + hs[2] / 2, hs[1] + 16 + i * 24, 22, F ? '#4a5054' : '#241812'); });
    if (F) { vine(p, K, hx + 4, ht + 12, 40, 2); weeds(p, K, hx + 2, G, 3); }
    FT.shopWin(p, K, FT.Shops.CLOCKS.win[0], FT.Shops.CLOCKS.win[1], FT.Shops.CLOCKS.win[2], FT.Shops.CLOCKS.win[3], 'clocks'); FT.Shops.paint(p, K);   // the ground-floor shops
    SIGNS.forEach(function (s) { if (s[4]) goose(p, K, s[0] + s[2] / 2 - 8, s[1] + 2); });
    return p;
  }
  // in front of the people: the poles and wires
  function front(K) {
    var p = new Pt(W, H), F = K.F, r = K.r, P = K.P, poleA = [26, 118], poleB = [1262, 140];
    p.R(poleA[0], poleA[1], 6, G + 30 - poleA[1], F ? '#4a3e32' : '#1a0f0c'); p.R(poleA[0] + 1, poleA[1], 1, G + 30 - poleA[1], F ? '#5e5040' : '#2a1d18'); p.R(poleA[0] - 18, poleA[1] + 8, 42, 3, F ? '#4a3e32' : '#1a0f0c'); p.R(poleA[0] - 9, poleA[1] + 30, 14, 22, F ? '#5a5f5e' : '#1a0f0c'); p.R(poleA[0] - 9, poleA[1] + 30, 14, 1, F ? '#7a807e' : '#2a1d18');   // a wooden pole with a transformer
    p.R(poleB[0], poleB[1], 4, G + 30 - poleB[1], F ? '#6f6c66' : '#1a0f0c'); p.R(poleB[0] - 12, poleB[1] + 6, 28, 2, F ? '#6f6c66' : '#1a0f0c'); for (var bo = poleB[1] + 20; bo < G; bo += 30) p.R(poleB[0] - 2, bo, 8, 1, F ? '#5d5b55' : '#1a0f0c');   // a concrete one
    function wireY(x, k) { var u = (x - poleA[0]) / (poleB[0] - poleA[0]); return poleA[1] + 9 + k * 9 + (poleB[1] - poleA[1]) * u + Math.sin(u * Math.PI) * 40 + Math.sin(u * Math.PI * 3) * 3; }
    for (var wk = 0; wk < 3; wk++) for (var wx = poleA[0]; wx < poleB[0]; wx++) p.R(wx, wireY(wx, wk), 1, 1, F ? 'rgba(34,36,36,0.8)' : '#2a1d18');
    p.L(B.switch[0] + 73, B.switch[2], poleB[0], poleB[1] + 30, F ? 'rgba(34,36,36,0.8)' : '#2a1d18');   // the substation's cable to the pole
    if (F) { var sx3 = 470, sy3 = wireY(sx3, 1); p.L(sx3, sy3, sx3 + 3, sy3 + 14, '#2f2e2b'); p.L(sx3 + 3, sy3 + 14, sx3 + 9, sy3 + 13, '#2f2e2b'); p.E(sx3 + 7, sy3 + 15, 4, 2, '#3a3a38'); p.L(sx3, sy3, sx3 - 2, sy3 + 11, '#2f2e2b'); p.E(sx3 - 1, sy3 + 12, 4, 2, '#4a3a2e'); }   // a pair of shoes
    else for (var slp = 0; slp < 34; slp++) { var lx2 = 40 + slp * 36 + r() * 16, ly = wireY(lx2, slp % 3), len = 8 + r() * 40; p.R(lx2, ly, 1, len, '#3a2e28'); p.R(lx2 - 6, ly + len, 13, 17, '#d9cbb0'); for (var tx = 0; tx < 4; tx++) p.R(lx2 - 4, ly + len + 4 + tx * 3, 6 + r() * 4, 1, tx === 0 ? '#9c2a1a' : '#6e2a17'); }
    return p;
  }

  FT.B = B; FT.SIGNS = SIGNS; FT.DINER = DINER; FT.HOTEL = HOTEL; FT.LAUNDRY = LAUNDRY; FT.goose = goose; FT.street = street; FT.front = front;
})(window.FT = window.FT || {});
