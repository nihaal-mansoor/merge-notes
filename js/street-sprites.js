/*
  Street sprites, second style (proposed; shown on the character sheet for approval before it replaces the walkers).

  Chunky pixel people: one sprite pixel is one art pixel, a dark one-pixel outline round each body part, two or
  three flat tones per colour, and readable poses. A person is a small rig (hips, knees, ankles, shoulders, elbows,
  hands, head) posed frame by frame and drawn in three outlined layers: the far limbs, the body, the near arm.
  Faces stay vague. Everyone faces right; the street flips them.
*/
window.StreetSprites = (function () {
  'use strict';
  var TAU = Math.PI * 2, OUT = '#141018';
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function tone(h, f) { var c = rgb(h); return 'rgb(' + Math.min(255, Math.round(c[0] * f)) + ',' + Math.min(255, Math.round(c[1] * f)) + ',' + Math.min(255, Math.round(c[2] * f)) + ')'; }
  function rad(d) { return d * Math.PI / 180; }

  // ---------- Drawing on a layer (whole pixels only) ----------
  function layer(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = null; try { g = c.getContext('2d', { willReadFrequently: true }); } catch (e) { g = null; } return { c: c, g: g || c.getContext('2d'), w: w, h: h }; }
  function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
  function disc(g, cx, cy, r, col) { g.fillStyle = col; for (var y = -Math.ceil(r); y <= Math.ceil(r); y++) { var hw = Math.sqrt(Math.max(0, r * r - y * y)); if (hw <= 0 && Math.abs(y) > r) continue; g.fillRect(Math.round(cx - hw), Math.round(cy + y), Math.max(1, Math.round(cx + hw) - Math.round(cx - hw)), 1); } }
  function limb(g, a, b, w0, w1, col) {                 // a thick, tapering limb from a to b
    var n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2)); g.fillStyle = col;
    for (var i = 0; i <= n; i++) { var t = i / n, w = w0 + (w1 - w0) * t, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), Math.round(w), Math.round(w)); }
  }
  function poly(g, pts, col) {
    g.fillStyle = col; var minY = 1e9, maxY = -1e9; pts.forEach(function (p) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    for (var y = Math.floor(minY); y < Math.ceil(maxY); y++) { var yc = y + 0.5, xs = []; for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } xs.sort(function (p, q) { return p - q; }); for (var j = 0; j + 1 < xs.length; j += 2) { var x0 = Math.round(xs[j]), x1 = Math.round(xs[j + 1]); if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1); } }
  }
  function outline(L) {                                 // a dark pixel round everything on the layer
    var img = L.g.getImageData(0, 0, L.w, L.h), d = img.data, o = new Uint8ClampedArray(d), w = L.w, h = L.h, k = rgb(OUT);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4; if (d[i + 3]) continue;
      if ((x > 0 && d[i - 1]) || (x < w - 1 && d[i + 7]) || (y > 0 && d[i - w * 4 + 3]) || (y < h - 1 && d[i + w * 4 + 3])) { o[i] = k[0]; o[i + 1] = k[1]; o[i + 2] = k[2]; o[i + 3] = 255; }
    }
    L.g.putImageData(new ImageData(o, w, h), 0, 0);
  }

  // ---------- Poses: angles in degrees (thighs and arms from straight down, + is forward; knees bend back, elbows forward) ----------
  function swingKnee(q, big, flex) { q = ((q % 1) + 1) % 1; return q >= 0.5 ? big * Math.sin(Math.PI * (q - 0.5) / 0.5) : flex * Math.sin(Math.PI * q / 0.5); }
  var POSES = {
    idle: { n: 6, at: function (f) { var b = [0, 0, 1, 1, 1, 0][f]; return { tN: 3, kN: 2, tF: -5, kF: 5, aN: 6, eN: 24, aF: -6, eF: 10, lean: 1, breathe: b, pocket: true }; } },
    walk: { n: 8, at: function (f) { var p = f / 8, c = Math.cos(TAU * p); return { tN: 24 * c, kN: swingKnee(p, 52, 8), tF: -24 * c, kF: swingKnee(p + 0.5, 52, 8), aN: -26 * c, eN: 16 + 14 * Math.max(0, c), aF: 26 * c, eF: 16 + 14 * Math.max(0, -c), lean: 3, bob: Math.abs(Math.sin(TAU * p)) }; } },
    run: { n: 8, at: function (f) { var p = f / 8, c = Math.cos(TAU * p); return { tN: 40 * c, kN: swingKnee(p, 104, 22), tF: -40 * c, kF: swingKnee(p + 0.5, 104, 22), aN: -48 * c, eN: 88, aF: 48 * c, eF: 88, lean: 13, lift: 2.5 * Math.abs(Math.sin(TAU * p)) }; } },
    stretch: { n: 7, at: function (f) { var k = [0, 0.2, 0.45, 0.7, 0.9, 1, 1][f]; return { tN: 2, kN: 0, tF: -2, kF: 0, aN: 10 + 160 * k, eN: 40 * (1 - k) + 20 * k, aF: -10 + 165 * k, eF: 30 * (1 - k) + 25 * k, lean: -2 * k, breathe: k > 0.6 ? 1 : 0, tilt: -k }; } },
    hips: { n: 6, at: function (f) { var b = [0, 0, 1, 1, 0, 0][f]; return { tN: 5, kN: 3, tF: -6, kF: 6, aN: -38, eN: 100, aF: -30, eF: 95, lean: 0, breathe: b }; } },
    phone: { n: 6, at: function (f) { var b = [0, 1, 1, 0, 0, 0][f]; return { tN: 2, kN: 2, tF: -4, kF: 4, aN: 30, eN: 150, aF: 4, eF: 30, lean: 2, breathe: b, phone: true, tilt: 0.5 }; } }
  };

  // ---------- People: a palette and the parts they wear ----------
  // top: hoodie | jacket | coat | uniform | sport | blazer | tee; bottom: trousers | shorts | skirt; hair: short | long | pony | bun | none;
  // hat: police | cap | beanie | flatcap; build: 0.85 (slight) to 1.3 (broad); h: height in pixels
  var CAST = {
    hoodie:   { name: 'Hoodie, a ponytail', h: 64, build: 0.92, fem: true, skin: '#e2b494', hair: '#2a1c18', hairStyle: 'pony', top: 'hoodie', topC: '#3a8a8a', bottom: 'trousers', botC: '#2a2a3a', shoes: '#e8e4dc' },
    runner:   { name: 'Runner in a tracksuit', h: 63, build: 0.9, fem: true, skin: '#c89070', hair: '#e0b060', hairStyle: 'pony', top: 'sport', topC: '#c83a4a', bottom: 'shorts', botC: '#2a2a40', shoes: '#f0f0f0', socks: '#f0f0f0' },
    officer:  { name: 'Police officer', h: 68, build: 1.12, skin: '#d8a888', hair: '#2a1a14', hairStyle: 'short', hat: 'police', top: 'uniform', topC: '#232a44', bottom: 'trousers', botC: '#20263c', shoes: '#141418', badge: '#e8c040' },
    officer2: { name: 'Police officer', h: 64, build: 0.95, fem: true, skin: '#8a5a40', hair: '#1a1412', hairStyle: 'bun', top: 'uniform', topC: '#232a44', bottom: 'trousers', botC: '#20263c', shoes: '#141418', badge: '#e8c040' },
    coatMan:  { name: 'Long coat and scarf', h: 69, build: 1.02, skin: '#b07a5a', hair: '#141010', hairStyle: 'short', top: 'coat', topC: '#3a3e52', bottom: 'trousers', botC: '#1e1e24', shoes: '#3a2418', scarf: '#c8a03a' },
    elder:    { name: 'Older man, flat cap', h: 62, build: 1.0, skin: '#dcb498', hair: '#c8c4bc', hairStyle: 'short', hat: 'flatcap', hatC: '#5a4a3a', top: 'jacket', topC: '#6a6a52', bottom: 'trousers', botC: '#3a3a3a', shoes: '#2a1a14', stoop: 6 },
    office:   { name: 'Blazer and skirt', h: 65, build: 0.9, fem: true, skin: '#6a4434', hair: '#141010', hairStyle: 'long', top: 'blazer', topC: '#2e3440', bottom: 'skirt', botC: '#2e3440', shoes: '#1a1a1a', tights: '#2a2228', bag: '#a8603a' },
    courier:  { name: 'Courier, a cap and a bag', h: 66, build: 1.05, skin: '#a8765a', hair: '#141010', hairStyle: 'short', hat: 'cap', hatC: '#d85a2a', top: 'jacket', topC: '#d85a2a', bottom: 'trousers', botC: '#2a2a30', shoes: '#e8e8e8', satchel: '#2a2a2a' },
    bigGuy:   { name: 'Broad, a bomber jacket', h: 70, build: 1.28, skin: '#e0b090', hair: '#6a4a2a', hairStyle: 'short', hat: 'beanie', hatC: '#4a6a3a', top: 'jacket', topC: '#2a3a2a', bottom: 'trousers', botC: '#3a4a6a', shoes: '#2a2a2a', beard: '#6a4a2a' },
    teen:     { name: 'Teenager, headphones', h: 58, build: 0.86, skin: '#f0c8a8', hair: '#8a4a24', hairStyle: 'short', hat: 'cap', hatC: '#2a2a2a', capBack: true, top: 'tee', topC: '#e8e0d0', bottom: 'trousers', botC: '#3a5a8a', shoes: '#c83a3a', phones: '#e8e8e8' },
    kid:      { name: 'Child, a backpack', h: 44, build: 0.95, kid: true, skin: '#c89a80', hair: '#141010', hairStyle: 'short', top: 'hoodie', topC: '#e8c030', bottom: 'trousers', botC: '#2a4a8a', shoes: '#c83030', backpack: '#2a6a9a' }
  };

  // ---------- Drawing one frame ----------
  // g, x (the hips), y (the ground); flip: -1 to face left
  function drawPerson(g, ch, poseName, f, x, y) {
    var P = POSES[poseName] || POSES.idle, q = P.at(f % P.n), h = ch.h, bw = ch.build || 1;
    var thigh = 0.25 * h, shin = 0.23 * h, torso = (ch.kid ? 0.27 : 0.3) * h, neck = 0.03 * h, headH = (ch.kid ? 0.21 : 0.17) * h, headW = headH * 0.96;
    var upper = 0.17 * h, fore = 0.155 * h, sc = h / 64;
    var W = Math.ceil(h * 1.1), H = Math.ceil(h * 1.25), ox = Math.round(W / 2), oy = H - 2;
    var back = layer(W, H), body = layer(W, H), front = layer(W, H);
    // legs: the hips sit so that the lower foot touches the ground
    var legY = function (t, k) { return thigh * Math.cos(rad(t)) + shin * Math.cos(rad(t - k)); };
    var hipY = oy - Math.max(legY(q.tN, q.kN), legY(q.tF, q.kF)) - (q.lift || 0) + (q.bob ? 0 : 0);
    var hip = [ox, hipY], lean = rad((q.lean || 0) + (ch.stoop || 0));
    var leg = function (t, k, dx) { var hp = [hip[0] + dx, hip[1]], knee = [hp[0] + thigh * Math.sin(rad(t)), hp[1] + thigh * Math.cos(rad(t))]; var ank = [knee[0] + shin * Math.sin(rad(t - k)), knee[1] + shin * Math.cos(rad(t - k))]; return { hip: hp, knee: knee, ank: ank }; };
    var LN = leg(q.tN, q.kN, 1.2 * sc), LF = leg(q.tF, q.kF, -1.2 * sc);
    var sh = [hip[0] + torso * Math.sin(lean), hip[1] - torso * Math.cos(lean) - (q.breathe || 0) * 0.5];
    var arm = function (a, e) { var el = [sh[0] + upper * Math.sin(rad(a)), sh[1] + upper * Math.cos(rad(a))]; var hd = [el[0] + fore * Math.sin(rad(a + e)), el[1] + fore * Math.cos(rad(a + e))]; return { el: el, hand: hd }; };
    var AN = q.pocket ? { el: [sh[0] + 1 * sc, sh[1] + upper], hand: [hip[0] + 3 * sc, hip[1] + 1] } : arm(q.aN, q.eN), AF = arm(q.aF, q.eF);
    var top = ch.topC, topD = tone(top, 0.7), topL = tone(top, 1.22), bot = ch.botC, botD = tone(bot, 0.7), skin = ch.skin, skinD = tone(skin, 0.8);
    var legBase = ch.bottom === 'shorts' || ch.bottom === 'skirt' ? (ch.tights || skin) : bot, legBaseD = ch.bottom === 'shorts' || ch.bottom === 'skirt' ? tone(ch.tights || skin, 0.8) : botD;
    var thighW = 7 * sc * (0.85 + 0.15 * bw), shinW = 5 * sc, upW = 5 * sc * (0.85 + 0.15 * bw), foreW = 4 * sc;
    var shoe = function (g2, L, col) { var a = L.ank; poly(g2, [[a[0] - 2 * sc, a[1] - 2 * sc], [a[0] + 2 * sc, a[1] - 2 * sc], [a[0] + 5 * sc, a[1]], [a[0] + 5 * sc, a[1] + 1.5 * sc], [a[0] - 2.5 * sc, a[1] + 1.5 * sc]], col); R(g2, a[0] - 2.5 * sc, a[1] + 1.5 * sc - 1, 8 * sc, 1, tone(col, col === '#141418' || col === '#1a1a1a' ? 2 : 0.78)); };
    var drawLeg = function (g2, L, near) {
      var shorts = ch.bottom === 'shorts', c1 = near ? legBase : legBaseD, cb = near ? bot : botD;
      limb(g2, L.hip, L.knee, thighW, shinW + 1, shorts ? c1 : cb); limb(g2, L.knee, L.ank, shinW + 0.5, shinW - 0.5, c1);
      if (near) { var hl = shorts ? tone(legBase, 1.15) : tone(bot, 1.45), off = function (p, w) { return [p[0] + w / 2 - 1, p[1]]; }; limb(g2, off(L.hip, thighW), off(L.knee, shinW + 1), 1, 1, hl); limb(g2, off(L.knee, shinW), off(L.ank, shinW - 1), 1, 1, hl); }   // light down the front of the near leg
      if (shorts) { var mid = [L.hip[0] + (L.knee[0] - L.hip[0]) * 0.55, L.hip[1] + (L.knee[1] - L.hip[1]) * 0.55]; limb(g2, L.hip, mid, thighW + 1, thighW, cb); }
      if (ch.socks) { var s0 = [L.knee[0] + (L.ank[0] - L.knee[0]) * 0.75, L.knee[1] + (L.ank[1] - L.knee[1]) * 0.75]; limb(g2, s0, L.ank, shinW, shinW - 0.5, near ? ch.socks : tone(ch.socks, 0.8)); }
      shoe(g2, L, near ? ch.shoes : tone(ch.shoes, 0.8));
    };
    var sleeveTo = ch.top === 'tee' ? 0.5 : ch.top === 'sport' ? 0 : 1;
    var drawArm = function (g2, A, near) {
      var c1 = near ? top : topD, s1 = near ? skin : skinD;
      if (sleeveTo >= 1) { limb(g2, sh, A.el, upW, foreW + 1, c1); limb(g2, A.el, A.hand, foreW + 1, foreW, c1); if (near) { limb(g2, [sh[0] + upW / 2 - 1, sh[1] + 1], [A.el[0] + foreW / 2 - 0.5, A.el[1]], 1, 1, topL); } }
      else if (sleeveTo > 0) { var m = [sh[0] + (A.el[0] - sh[0]) * sleeveTo, sh[1] + (A.el[1] - sh[1]) * sleeveTo]; limb(g2, sh, A.el, upW - 1, foreW, s1); limb(g2, sh, m, upW + 1, upW, c1); limb(g2, A.el, A.hand, foreW, foreW - 0.5, s1); }
      else { limb(g2, sh, A.el, upW - 1, foreW, s1); limb(g2, A.el, A.hand, foreW, foreW - 0.5, s1); }
      if (near && ch.top === 'uniform') R(g2, sh[0] - 1, sh[1] + 3 * sc, 3 * sc, 3 * sc, ch.badge);   // a shoulder patch
      if (ch.top !== 'sport' && sleeveTo >= 1) { var cuff = [A.el[0] + (A.hand[0] - A.el[0]) * 0.85, A.el[1] + (A.hand[1] - A.el[1]) * 0.85]; R(g2, cuff[0] - 2 * sc, cuff[1] - 1, 4 * sc, 1, near ? topD : tone(top, 0.55)); }
      disc(g2, A.hand[0], A.hand[1], 2.3 * sc, s1);
      if (near && q.phone) R(g2, A.hand[0] - 1, A.hand[1] - 4 * sc, 2 * sc, 4 * sc, '#1a1e24');
    };
    // ----- back layer: the far arm and the far leg -----
    drawLeg(back.g, LF, false); drawArm(back.g, AF, false);
    if (ch.backpack) poly(back.g, [[sh[0] - 8 * sc, sh[1] + 1], [sh[0] - 2 * sc, sh[1]], [sh[0] - 2 * sc, sh[1] + 12 * sc], [sh[0] - 9 * sc, sh[1] + 12 * sc]], ch.backpack);
    // ----- body layer: the near leg, the torso and what is worn on it, the head -----
    var g = body.g;
    drawLeg(g, LN, true);
    var n = [Math.cos(lean), Math.sin(lean)], fw = (ch.fem ? 6.5 : 7.2) * sc * bw, bk = 6.2 * sc * bw;
    var at = function (t, f2, b2) { var p = [hip[0] + (sh[0] - hip[0]) * t, hip[1] + (sh[1] - hip[1]) * t]; return [[p[0] + n[0] * f2, p[1] + n[1] * f2], [p[0] - n[0] * b2, p[1] - n[1] * b2]]; };
    var s1 = at(0.98, fw * 0.85, bk), c1 = at(0.75, fw * (ch.fem ? 1.08 : 1), bk * 1.05), w1 = at(0.38, fw * 0.82 * (ch.belly ? 1.3 : 1), bk * 0.92), h1 = at(0, fw * 0.92, bk * 1.05);
    var torsoPts = [s1[1], s1[0], c1[0], w1[0], h1[0], h1[1], w1[1], c1[1]];
    if (ch.top === 'sport') {                       // a crop top over bare skin
      poly(g, torsoPts, skin); var cropPts = [s1[1], s1[0], c1[0], at(0.6, fw, bk)[0], at(0.6, fw, bk)[1], c1[1]]; poly(g, cropPts, top);
      poly(g, [h1[1], h1[0], at(0.12, fw, bk)[0], at(0.12, fw, bk)[1]], bot);
    } else {
      poly(g, torsoPts, top);
      poly(g, [s1[1], at(0.98, -fw * 0.1, bk)[0], at(0, -fw * 0.15, bk)[0], h1[1], w1[1], c1[1]], topD);   // the back in shadow
      g.fillStyle = topL; for (var t = 0.45; t < 0.95; t += 0.06) { var e = at(t, fw * 0.9, 0)[0]; g.fillRect(Math.round(e[0]) - 1, Math.round(e[1]), 1, 1); }   // light on the chest
      if (ch.top === 'coat' || ch.top === 'blazer') {          // the coat's skirt, swinging with the near leg
        var len = ch.top === 'coat' ? 0.19 * h : 0.07 * h, kn = LN.knee, sw = (kn[0] - hip[0]) * 0.35;
        poly(g, [h1[1], h1[0], [h1[0][0] + sw + 1, h1[0][1] + len], [h1[1][0] + sw * 0.4 - 1, h1[1][1] + len]], top);
        R(g, h1[1][0] + sw * 0.4, h1[1][1] + len - 1, (h1[0][0] - h1[1][0]) + sw * 0.6, 1, topD);
        if (ch.top === 'coat') { var bt = at(0.6, fw * 0.75, 0)[0]; R(g, bt[0], bt[1], 1, 1, topL); R(g, bt[0], bt[1] + 4 * sc, 1, 1, topL); }
      }
      if (ch.top === 'hoodie') { var pk = at(0.2, fw * 0.95, 0)[0]; R(g, pk[0] - 5 * sc, pk[1] - 1, 5 * sc, 1, topD); R(g, h1[1][0], h1[1][1] - 2, h1[0][0] - h1[1][0], 2, topD); }
      if (ch.top === 'uniform') { var bl = at(0.04, fw * 0.95, bk); poly(g, [bl[1], bl[0], [bl[0][0], bl[0][1] + 2 * sc], [bl[1][0], bl[1][1] + 2 * sc]], '#1a1412'); var bd = at(0.72, fw * 0.55, 0)[0]; R(g, bd[0] - 1, bd[1], 2 * sc, 2 * sc, ch.badge); R(g, bl[0][0] - 3 * sc, bl[0][1], 2 * sc, 2 * sc, '#6a4a2a'); }
      if (ch.top === 'jacket') { var zp = at(0.55, fw * 0.95, 0)[0], zb = at(0.05, fw * 0.95, 0)[0]; R(g, zp[0] - 1, zp[1], 1, zb[1] - zp[1], topD); }
    }
    if (ch.bottom === 'skirt') poly(g, [h1[1], h1[0], [h1[0][0] + 2 * sc, h1[0][1] + 0.13 * h], [h1[1][0] - 1 * sc, h1[1][1] + 0.13 * h]], bot);
    if (ch.satchel) { var st = at(0.15, -bk - 1, 0)[0]; R(g, st[0] - 5 * sc, st[1] - 2, 7 * sc, 6 * sc, ch.satchel); }
    if (ch.scarf) { poly(g, [at(1.04, fw * 0.95, bk)[1], at(1.04, fw * 0.95, bk)[0], at(0.86, fw, bk)[0], at(0.86, fw, bk)[1]], ch.scarf); R(g, sh[0] + fw * 0.6, sh[1] + 2 * sc, 2 * sc, 7 * sc, ch.scarf); }
    if (ch.bag) { var bh = [hip[0] + fw + 2 * sc, hip[1] - 2 * sc]; R(g, bh[0], bh[1], 6 * sc, 5 * sc, ch.bag); }
    // neck and head (vague face: no eyes or nose)
    var hc = [sh[0] + n[0] * 1.5 * sc + (q.tilt || 0), sh[1] - neck - headH * 0.5], hx = hc[0] - headW / 2, hy = hc[1] - headH / 2;
    R(g, sh[0] - 1.5 * sc, sh[1] - neck - 1, 3.5 * sc, neck + 2, skinD);
    if (ch.top === 'hoodie') disc(g, hc[0] - headW * 0.5, sh[1], 2.8 * sc, topD);           // the hood, down
    poly(g, [[hx + 1, hy], [hx + headW - 1, hy], [hx + headW, hy + 1], [hx + headW, hy + headH - 2], [hx + headW - 2, hy + headH], [hx + 2, hy + headH], [hx, hy + headH - 3], [hx, hy + 1]], skin);
    R(g, hx, hy + headH * 0.35, headW * 0.35, headH * 0.6, skinD);                           // the back of the head in shadow
    var hair = ch.hair, hairD = tone(hair, 0.72);
    if (ch.hairStyle !== 'none') {
      poly(g, [[hx - 0.5, hy + headH * 0.65], [hx - 0.5, hy - 0.5], [hx + headW + 0.5, hy - 0.5], [hx + headW + 0.5, hy + headH * 0.18], [hx + headW * 0.45, hy + headH * 0.2], [hx + headW * 0.3, hy + headH * 0.65]], hair);
      R(g, hx + 1, hy - 0.5, headW * 0.6, 1, tone(hair, 1.35));
      if (ch.hairStyle === 'long') poly(g, [[hx - 1, hy + headH * 0.3], [hx + headW * 0.35, hy + headH * 0.3], [hx + headW * 0.2, hy + headH + 4 * sc], [hx - 1.5, hy + headH + 3 * sc]], hair);
      if (ch.hairStyle === 'pony') { var swing = (q.aN || 0) / 60; limb(g, [hx - 0.5, hy + headH * 0.25], [hx - 3 * sc - swing, hy + headH * 0.95], 3 * sc, 2 * sc, hairD); }
      if (ch.hairStyle === 'bun') disc(g, hx + headW * 0.15, hy - 0.5, 2.6 * sc, hair);
    }
    if (ch.beard) poly(g, [[hx + headW * 0.45, hy + headH * 0.6], [hx + headW, hy + headH * 0.55], [hx + headW - 1, hy + headH + 1], [hx + headW * 0.4, hy + headH]], ch.beard);
    if (ch.hat === 'police') { R(g, hx - 1, hy - 3 * sc, headW + 2, 3.5 * sc, '#1a2038'); R(g, hx + headW - 2, hy, 5 * sc, 1.2 * sc, '#101014'); R(g, hx + headW * 0.55, hy - 2 * sc, 1.5 * sc, 1.5 * sc, ch.badge); }
    if (ch.hat === 'cap') { R(g, hx - 0.5, hy - 2 * sc, headW + 1, 3 * sc, ch.hatC); if (ch.capBack) R(g, hx - 4 * sc, hy + 0.5, 4 * sc, 1.2 * sc, tone(ch.hatC, 0.7)); else R(g, hx + headW - 1, hy + 0.5, 4 * sc, 1.2 * sc, tone(ch.hatC, 0.7)); }
    if (ch.hat === 'beanie') { poly(g, [[hx - 0.5, hy + 2 * sc], [hx, hy - 2 * sc], [hx + headW * 0.5, hy - 3.5 * sc], [hx + headW + 0.5, hy - 1.5 * sc], [hx + headW + 0.5, hy + 2 * sc]], ch.hatC); R(g, hx - 0.5, hy + 1 * sc, headW + 1, 1.5 * sc, tone(ch.hatC, 0.75)); }
    if (ch.hat === 'flatcap') { poly(g, [[hx - 1, hy + 1], [hx + headW * 0.2, hy - 2.5 * sc], [hx + headW + 0.5, hy - 1.5 * sc], [hx + headW + 4 * sc, hy + 1]], ch.hatC); }
    if (ch.phones) { R(g, hx + headW * 0.1, hy - 1, headW * 0.75, 1, ch.phones); R(g, hx + headW * 0.15, hy + headH * 0.3, 2.5 * sc, 3.5 * sc, ch.phones); }
    // ----- front layer: the near arm -----
    drawArm(front.g, AN, true);
    outline(back); outline(body); outline(front);
    g = null;
    var out = { w: W, h: H, ox: ox, oy: oy };
    return { draw: function (ctx, px, py, flip) { ctx.save(); ctx.translate(px, py); if (flip) ctx.scale(-1, 1); [back, body, front].forEach(function (L) { ctx.drawImage(L.c, -ox, -oy); }); ctx.restore(); }, size: out };
  }
  return { CAST: CAST, POSES: POSES, drawPerson: drawPerson };
})();
