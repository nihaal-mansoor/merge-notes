/* Fog Town: light.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt, brick = FT.brick, stone = FT.stone, stucco = FT.stucco, plate = FT.plate, planks = FT.planks, grime = FT.grime, crack = FT.crack, plaster = FT.plaster, cornice = FT.cornice, band = FT.band, win = FT.win, shopWin = FT.shopWin, door = FT.door, signBoard = FT.signBoard, drainpipe = FT.drainpipe, leaves = FT.leaves, vine = FT.vine, weeds = FT.weeds, STACKS = FT.STACKS, far = FT.far, mid = FT.mid, back = FT.back, B = FT.B, SIGNS = FT.SIGNS, goose = FT.goose, street = FT.street, front = FT.front, LAMP = FT.LAMP, POLE_A = FT.POLE_A, POLE_B = FT.POLE_B, prop = FT.prop, props = FT.props, lampCone = FT.lampCone, glowSprite = FT.glowSprite, finish = FT.finish, fogStrip = FT.fogStrip, puff = FT.puff, wireY = FT.wireY, capsLayer = FT.capsLayer, wetLayer = FT.wetLayer, vehicles = FT.vehicles, stranger = FT.stranger, dogSheet = FT.dogSheet, ratSheet = FT.ratSheet, bankLayer = FT.bankLayer, paintRoom = FT.paintRoom, build = FT.build;
  // ---------------------------------------------------------------- the light of the hour
  function sky(h) {
    var dark = h < 5 ? 1 : h < 7 ? 1 - smooth((h - 5) / 2) : h < 17.5 ? 0 : h < 19.5 ? smooth((h - 17.5) / 2) : 1;
    return { dark: dark, warm: Math.max(0, 1 - Math.abs(h - 18.2) / 1.3), dawn: Math.max(0, 1 - Math.abs(h - 6) / 1.1), rain: 0 };
  }
  function blend(stops) { var tot = 0, acc = [0, 0, 0]; stops.forEach(function (s) { var c = hex(s[0]); tot += s[1]; acc[0] += c[0] * s[1]; acc[1] += c[1] * s[1]; acc[2] += c[2] * s[1]; }); return 'rgb(' + acc.map(function (v) { return Math.round(v / tot); }).join(',') + ')'; }
  var GRADE = { horizon: ['#2e3646', 0.58], hwy: ['#1a2230', 0.64], rail: ['#1a2230', 0.64], fg: ['#0a0e14', 0.72], far: ['#2a3242', 0.6], mid: ['#1e2634', 0.64], back: ['#141d26', 0.66], street: ['#0e181e', 0.66], front: ['#0e181e', 0.68], fog: ['#2e3644', 0.62], props: ['#10161f', 0.66] };
  function tint(g, w, h, S, which) {
    g.globalCompositeOperation = 'source-atop';
    var wr = S.wetRain != null ? S.wetRain : S.rain;
    if (wr > 0.01) { g.fillStyle = rgba('#3e5a58', 0.27 * wr); g.fillRect(0, 0, w, h); }   // rain pulls everything toward teal-grey (the lights, drawn later, stay warm)
    if (S.snow > 0.01) { g.fillStyle = rgba('#dde4ec', 0.13 * S.snow); g.fillRect(0, 0, w, h); }   // snow: pale and cool
    if (S.warm > 0.01) { g.fillStyle = rgba('#c8804a', 0.2 * S.warm * (1 - S.rain * 0.7)); g.fillRect(0, 0, w, h); }
    if (S.dawn > 0.01) { g.fillStyle = rgba('#9a8aa8', 0.16 * S.dawn); g.fillRect(0, 0, w, h); }
    if (S.dark > 0.01) { g.fillStyle = rgba(GRADE[which][0], GRADE[which][1] * S.dark); g.fillRect(0, 0, w, h); }
    g.globalCompositeOperation = 'source-over';
  }
  function grade(src, which, S, out) { if (src.sheet) return FT.mapSheet(src, function (c, o) { return grade(c, which, S, o); }, out); out = out || document.createElement('canvas'); out.width = src.width; out.height = src.height; var g = out.getContext('2d'); g.clearRect(0, 0, out.width, out.height); g.drawImage(src, 0, 0); tint(g, out.width, out.height, S, which); return out; }

  // ---------------------------------------------------------------- the sky, in bands: four colours from the top down to the horizon, by the hour
  var SKIES = {
    day: ['#a7a59c', '#b6b4ac', '#c4c2b9', '#d2cfc6'], dusk: ['#6a5660', '#8e6a64', '#b18266', '#d49a6a'], dawn: ['#6a6a80', '#8e8892', '#b0a2a2', '#d0b8b0'],
    night: ['#070a10', '#0e121a', '#161b25', '#1e2530'], rain: ['#4e5e5c', '#5e6e6a', '#70807a', '#84948c'], rust: ['#0a0504', '#1a0806', '#2a0e08', '#3a140c']
  };
  function skyCols(S, F) {
    if (!F) return SKIES.rust.slice();
    var wd = (1 - S.dark) * (1 - S.warm) * (1 - S.dawn), wk = S.warm * (1 - S.dark * 0.45), wa = S.dawn * (1 - S.dark * 0.45), wn = S.dark * (1 - S.warm * 0.6) * (1 - S.dawn * 0.6), wr = S.rain * 1.4 * (1 - S.dark * 0.7);
    return [0, 1, 2, 3].map(function (i) { return blend([[SKIES.day[i], wd + 0.001], [SKIES.dusk[i], wk], [SKIES.dawn[i], wa], [SKIES.night[i], wn], [SKIES.rain[i], wr]]); });
  }
  function skyAt(cols, y) { var u = clamp(y / 470, 0, 1) * 3, i = Math.min(2, u | 0); return mix(cols[i], cols[i + 1], u - i); }
  // the sky painted as flat bands with a dithered seam between each, and a few thin streaks of cloud.
  // Kept as a strip 4 pixels wide (the dither repeats every 4) that is tiled across the screen, plus a list of streaks: 11 KB, not 3.7 MB.
  function bandedSky(cols, S, out) {
    out = out || { c: document.createElement('canvas') }; var c = out.c; c.width = 4; c.height = 470; var g = c.getContext('2d'), n = 15, bh = 470 / n, r = rng(41);
    for (var b = 0; b < n; b++) { var y0 = Math.round(b * bh), y1 = Math.round((b + 1) * bh), col = skyAt(cols, (b + 0.5) * bh); g.fillStyle = col; g.fillRect(0, y0, 4, y1 - y0 + 1);
      if (b > 0) { var prev = skyAt(cols, (b - 0.5) * bh); g.fillStyle = prev; for (var yy = y0; yy < y0 + 4; yy++) for (var xx = 0; xx < 4; xx++) if (BAYER[(yy & 3) * 4 + (xx & 3)] / 16 < 0.75 - (yy - y0) * 0.22) g.fillRect(xx, yy, 1, 1); } }
    out.low = cols[3]; out.streaks = []; out.pat = null; out.bands = []; for (var b2 = 0; b2 < n; b2++) { var ya = Math.round(b2 * bh); out.bands.push([skyAt(cols, (b2 + 0.5) * bh), ya, Math.round((b2 + 1) * bh) - ya + 1]); }
    var streak = S.dark > 0.7 ? 0.05 : 0.14; for (var s = 0; s < 22; s++) { var sy = 40 + r() * 300, sx = r() * W, len = 20 + r() * 170, c2 = mix(skyAt(cols, sy), '#ffffff', streak); out.streaks.push([c2, Math.round(sx), Math.round(sy), Math.round(len)]); if (r() < 0.5) out.streaks.push([c2, Math.round(sx + len * 0.2), Math.round(sy) + 2, Math.round(len * 0.5)]); }
    return out;
  }
  function drawSky(g, s) {   // flat bands are cheap fills; only the 4-row dithered seams need the pattern. Nothing below the ground line is ever seen.
    if (!s.pat || s.pg !== g) { s.pat = g.createPattern(s.c, 'repeat-x'); s.pg = g; }
    for (var b = 0; b < s.bands.length; b++) { var k = s.bands[b]; g.fillStyle = k[0]; g.fillRect(0, k[1], W, k[2]); }
    g.fillStyle = s.pat; for (var j = 1; j < s.bands.length; j++) g.fillRect(0, s.bands[j][1], W, 4);
    g.fillStyle = s.low; g.fillRect(0, 470, W, G - 470);
    for (var i = 0; i < s.streaks.length; i++) { var q = s.streaks[i]; g.fillStyle = q[0]; g.fillRect(q[1], q[2], q[3], 1); }
  }
  // a background layer tinted toward the sky at its height (far layers melt into the sky, near ones stay dark)
  var SKYTINT = { cloud: [60, 0.42, 0.45], horizon: [452, 0.82, 0.1], far: [440, 0.68, 0.22], mid: [420, 0.54, 0.32], hwy: [380, 0.4, 0.38], rail: [380, 0.4, 0.38], back: [300, 0.3, 0.46], fog: [440, 0.55, 0.3] };
  function skyGrade(src, which, S, cols, out) {
    if (src.sheet) return FT.mapSheet(src, function (c, o) { return skyGrade(c, which, S, cols, o); }, out);
    out = out || document.createElement('canvas'); out.width = src.width; out.height = src.height; var g = out.getContext('2d'), st = SKYTINT[which]; g.clearRect(0, 0, out.width, out.height); g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgba(skyAt(cols, st[0]), st[1]); g.fillRect(0, 0, out.width, out.height);
    if (S.dark > 0.01) { g.fillStyle = rgba('#04050c', st[2] * S.dark); g.fillRect(0, 0, out.width, out.height); }
    g.globalCompositeOperation = 'source-over'; return out;
  }
  // the overcast overhead: a bank of cloud in four tones, darkest at the top, its bottom edge ragged and dithered, a few
  // breaks where the light comes through. Painted at half size (it is drawn at double: chunky, like the reference) and
  // seamless across its width, so it can drift for ever
  function cloudBank(F) {
    var p = new Pt(W / 2, 90), r = rng(3131), tones = F ? ['#666a6c', '#767a7a', '#888c8a', '#9c9e9a'] : ['#1a0806', '#240c08', '#2e100a', '#38140c'];
    tones.forEach(function (tc, li) { for (var i = 0; i < 34; i++) { var x = r() * W / 2, y = 6 + li * 11 + r() * 12, rx = 16 + r() * 34, ry = 5 + r() * 7 - li;
      [x, x - W / 2, x + W / 2].forEach(function (xx) { p.E(xx, y - (li === 0 ? 10 : 0), rx, ry + (li === 0 ? 10 : 0), tc); }); } });
    var g = p.g, img = g.getImageData(0, 0, W / 2, 90), d = img.data;
    for (var x = 0; x < W / 2; x++) for (var y = 88; y > 0; y--) { var o = (y * W / 2 + x) * 4; if (d[o + 3]) { for (var k = 0; k < 4; k++) { var oo = ((y - k) * W / 2 + x) * 4; if (oo > 0 && BAYER[((y - k) & 3) * 4 + (x & 3)] / 16 < 0.7 - k * 0.2) d[oo + 3] = 0; } break; } }   // the ragged bottom edge
    g.putImageData(img, 0, 0);
    for (var b = 0; b < 4; b++) { var bx = 30 + r() * (W / 2 - 60), by = 34 + r() * 20; g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(bx, by, 8 + r() * 10, 2 + r() * 2, 0, 0, 7); g.fill(); g.restore(); }   // breaks in the cloud
    return p;
  }
  // a cloud, made fresh each time (so none ever repeats): puffs with a shaded underside, a lit top, a flat base and a dithered edge
  function makeCloud(big) {
    var r = rng(((Math.random() * 2147483000) | 0) + 1), w = big ? 140 + r() * 170 : 60 + r() * 90, h = big ? 34 + r() * 30 : 14 + r() * 16, p = new Pt(Math.ceil(w) + 10, Math.ceil(h) + 10), n = big ? 7 + ((r() * 6) | 0) : 4 + ((r() * 3) | 0), puffs = [], bl = 5 + h;
    for (var i = 0; i < n; i++) { var u = i / (n - 1), cx = 5 + w * (0.1 + 0.8 * u) + (r() - 0.5) * w * 0.08, ry = h * (0.38 + r() * 0.45) * (1 - Math.abs(u - 0.45) * 0.9), rx = Math.max(ry * (1.1 + r() * 0.9), w / (n - 1) * 0.8); ry = Math.max(ry, h * 0.3); puffs.push([cx, bl - ry * 0.85, rx, ry]); }
    puffs.forEach(function (q) { p.E(q[0], q[1] + 2, q[2], q[3], '#8e959c'); });
    puffs.forEach(function (q) { p.E(q[0], q[1], q[2], q[3] * 0.92, '#cdd2d4'); });
    puffs.forEach(function (q) { p.E(q[0] - q[2] * 0.18, q[1] - q[3] * 0.28, q[2] * 0.6, q[3] * 0.52, '#eeefeb'); if (r() < 0.6) p.E(q[0] - q[2] * 0.3, q[1] - q[3] * 0.45, q[2] * 0.28, q[3] * 0.22, '#fbfbf8'); });
    p.g.clearRect(0, bl + 1, p.c.width, p.c.height); p.R(4, bl - 1, w + 2, 2, '#8e959c');
    var img = p.g.getImageData(0, 0, p.c.width, p.c.height), d = img.data, W2 = p.c.width, H2 = p.c.height, kill = [];
    for (var y = 1; y < H2 - 1; y++) for (var x = 1; x < W2 - 1; x++) { var k = (y * W2 + x) * 4; if (!d[k + 3]) continue; if (!d[k - 1] || !d[k + 7] || !d[k - W2 * 4 + 3] || !d[k + W2 * 4 + 3]) { if (BAYER[(y & 3) * 4 + (x & 3)] < 8) kill.push(k); } }
    kill.forEach(function (k2) { d[k2 + 3] = 0; }); p.g.putImageData(img, 0, 0);
    return { c: p.c, w: W2, h: H2 };
  }
  FT.GRADE = GRADE; FT.sky = sky; FT.blend = blend; FT.tint = tint; FT.grade = grade; FT.SKIES = SKIES; FT.skyCols = skyCols; FT.skyAt = skyAt; FT.bandedSky = bandedSky; FT.drawSky = drawSky; FT.skyGrade = skyGrade; FT.makeCloud = makeCloud; FT.cloudBank = cloudBank;
})(window.FT = window.FT || {});
