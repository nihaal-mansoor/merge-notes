/* Merge Notes street: the people, second style.
   Flat colour, no outlines, the far arm and leg in shadow. One skeleton and one 16-frame walk for everyone,
   with each person's own height, build, pace and clothes. Faces stay blank.
   StreetWalk.make(def, heightPx, stand) gives a sheet painter: { fw, fh, footX, footY, n, cycle, paint(g, f, x0) }.
   cycle: how far (in sprite pixels) one full stride (two steps) carries the body, so the street can pick the
   frame from the distance walked and the planted foot never slides. */
(function () {
  'use strict';
  var N = 16, TAU = Math.PI * 2, rad = Math.PI / 180;
  // One leg through one stride: thigh angle (+ forward), knee bend, foot tilt (+ toe up)
  var LEG = [[21, 4, 14], [17, 15, 0], [5, 9, 0], [-8, 4, 0], [-19, 10, -20], [-12, 34, -34], [7, 40, -14], [20, 13, 4]];
  function cr(a, b, c, d, u) { return 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u); }
  function legKey(t) { t = ((t % 1) + 1) % 1; var x = t * LEG.length, i = Math.floor(x), u = x - i, n = LEG.length, o = []; for (var k = 0; k < 3; k++) o.push(cr(LEG[(i - 1 + n) % n][k], LEG[i][k], LEG[(i + 1) % n][k], LEG[(i + 2) % n][k], u)); return o; }
  function rot(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function dirv(a, l) { return [Math.sin(a) * l, Math.cos(a) * l]; }
  function lerp(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
  function inPoly(pts, x, y) { var c = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  var rgbCache = {};
  function rgb(h) { var r = rgbCache[h]; if (r) return r; var n = parseInt(h.slice(1), 16); return (rgbCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]); }

  // A small paint buffer: one colour per pixel, shapes tested at pixel centres (no anti-aliasing)
  function Cv(w, h) { this.w = w; this.h = h; this.c = new Array(w * h); }
  Cv.prototype.poly = function (pts, col) {
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, W = this.w, H = this.h;
    for (var i = 0; i < pts.length; i++) { var p = pts[i]; if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    for (var y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++)
      for (var x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++)
        if (inPoly(pts, x + 0.5, y + 0.5)) this.c[y * W + x] = col;
  };
  Cv.prototype.ell = function (cx, cy, rx, ry, col) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col;
    }
  };
  Cv.prototype.limb = function (a, b, wa, wb, col, mid) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, f = [], bk = [];
    var st = mid ? [[0, wa], mid, [1, wb]] : [[0, wa], [1, wb]];
    for (var i = 0; i < st.length; i++) { var s = st[i], px = a[0] + dx * s[0], py = a[1] + dy * s[0]; f.push([px + nx * s[1] / 2, py + ny * s[1] / 2]); bk.unshift([px - nx * s[1] / 2, py - ny * s[1] / 2]); }
    this.poly(f.concat(bk), col);
    this.ell(a[0], a[1], wa / 2, wa / 2, col);
  };

  // ---------------------------------------------------------------- one person
  // def: the person (see CAST). heightPx: how tall they stand, in sprite pixels. stand: the standing pose
  function make(def, heightPx, stand) {
    var s = heightPx / 54, wd = def.wd || 1, lw = (def.limb || 1) * s, legL = (def.legL || 1) * s, hs = s * (def.headK || 1);
    var amp = stand ? 0 : (def.amp || 1), armAmp = stand ? 0 : (def.armAmp || 1), sh = def.sh || 1, bust = def.bust || 0, hips = def.hips == null ? 0.4 : def.hips, belly = def.belly || 0;
    var fw = Math.ceil(48 * s * Math.max(1, wd)) + 6, fh = Math.ceil(64 * s) + 8, G = fh - 3, HIPX = Math.round(fw / 2) - 1;
    var FOOT = [[-1.3, -0.9], [1.1, -1.1], [4.3, 0.7], [4.3, 1.8], [-1.5, 1.8]];
    function legs(t) {
      var tw = stand ? 0 : Math.cos(t * TAU);
      function leg(tt, hip) {
        var k = legKey(tt), a = k[0] * amp * rad, kn = (stand ? 2 : k[1] * (0.5 + 0.5 * amp)) * rad, ft = k[2] * amp * rad;
        var knee = add(hip, dirv(a, 11.8 * legL)), ank = add(knee, dirv(a - kn, 11.2 * legL));
        return { hip: hip, knee: knee, ank: ank, foot: FOOT.map(function (p) { return add(ank, rot([p[0] * lw, p[1] * lw], -ft)); }) };
      }
      // both hips twist evenly about one centre, so the two steps match (no limp)
      var n = leg(t, [HIPX + 0.6 * tw * s * wd, 0]), f = leg(t + 0.5, [HIPX - 0.6 * tw * s * wd + (stand ? -1.2 * s : 0), 0]);
      var low = -1e9; n.foot.concat(f.foot).forEach(function (p) { low = Math.max(low, p[1]); });
      return { n: n, f: f, y: G - low };
    }
    // Soft parts (chest, ponytail, hems) trail the hips' up-and-down through a damped spring, run until settled
    // (worked out the first time a frame is painted, so setting up a person stays cheap)
    var springOut = null, SPR = 240;
    function spring(t) {
      if (!springOut) {
        var raw = [], k; for (k = 0; k < SPR; k++) raw.push(legs(k / SPR).y);
        var w = TAU * 2.9, z = 0.32, x = raw[0], v = 0, dt = 1 / SPR; springOut = [];
        for (var c = 0; c < 6; c++) for (k = 0; k < SPR; k++) { for (var q = 0; q < 4; q++) { v += (-w * w * (x - raw[k]) - 2 * z * w * v) * dt / 4; x += v * dt / 4; } if (c === 5) springOut[k] = x - raw[k]; }
      }
      t = ((t % 1) + 1) % 1; return springOut[Math.floor(t * SPR) % SPR];
    }
    // How far the planted foot travels back over the stance: the stride
    var cycle = 0;
    if (!stand) { for (var f = 1; f < N / 2; f++) cycle += legs((f - 1) / N).n.ank[0] - legs(f / N).n.ank[0]; cycle = cycle / (N / 2 - 1) * N; }

    function frame(t) {
      var L = legs(t), py = Math.round(L.y), d = py - L.y;
      [L.n, L.f].forEach(function (g) { ['hip', 'knee', 'ank'].forEach(function (k) { g[k] = [g[k][0], g[k][1] + L.y + d]; }); g.foot = g.foot.map(function (p) { return [p[0], p[1] + L.y + d]; }); });
      var pel = [HIPX, py], tw = stand ? 0 : Math.cos(t * TAU), lean = ((def.lean || 3) + (stand ? 0.4 : 1.2) * Math.sin(t * 2 * TAU)) * rad;
      var wf = stand ? 1 : 1 + 0.1 * Math.cos(t * 2 * TAU);            // the torso turns a touch toward us as each heel lands
      function T(p) { return add(pel, rot([p[0] * s * wd * wf, p[1] * s], lean)); }
      var off = spring(t), jig = Math.max(-0.7, Math.min(0.7, off * 0.9 * (0.3 + 0.7 * bust))) * (bust > 0 ? 1 : 0);
      var hem = stand ? 0 : 0.6 * Math.sin(t * 2 * TAU - 1.1) + off * 0.6;
      var neck = T([0.9, -20.6]);
      function Hd(p) { return add(neck, rot([p[0] * hs, p[1] * hs], -lean * 0.8)); }
      function arm(sw, shift) {
        var a = sw * 22 * armAmp * rad, s0 = T([-0.5 + shift, -17.6]), e = (9 + 26 * Math.max(0, sw) * armAmp) * rad;
        var elb = add(s0, dirv(a, 9.2 * s * (def.armL || 1))), wr = add(elb, dirv(a + e, 8.2 * s * (def.armL || 1)));
        return { sh: s0, elb: elb, wr: wr, hand: add(wr, dirv(a + e * 1.15, 1.2 * s)) };
      }
      var cv = new Cv(fw, fh), top = def.top, bot = def.bottom, shoe = def.shoes, skin = def.skin, hair = def.hair;

      function drawArm(A, far) {
        var k = far ? 1 : 0, sl = top.sleeve || 0;
        cv.limb(A.sh, A.elb, 2.5 * lw, 2.1 * lw, skin[k]);
        cv.limb(A.elb, A.wr, 2.1 * lw, 1.7 * lw, skin[k]);
        cv.ell(A.hand[0], A.hand[1], 1.0 * lw, 1.2 * lw, skin[k]);
        if (sl > 0) cv.limb(A.sh, lerp(A.sh, A.elb, Math.min(1, sl)), 3.0 * lw, (2.6 + (sl < 1 ? 0.5 : 0)) * lw, top.col[k]);
        else if (!far) cv.ell(A.sh[0] + 0.4 * s, A.sh[1] - 1.0 * s, 0.7 * lw, 0.6 * lw, top.col[0]);   // a strap over the near shoulder
        if (sl > 1) cv.limb(A.elb, lerp(A.elb, A.wr, sl - 1), 2.6 * lw, 2.3 * lw, top.col[k]);
      }
      function drawLeg(g, far) {
        var k = far ? 1 : 0;
        cv.limb(g.hip, g.knee, 4.1 * lw, 2.8 * lw, skin[k], [0.35, 3.8 * lw]);
        cv.limb(g.knee, g.ank, 2.7 * lw, 1.9 * lw, skin[k], [0.3, 3.0 * lw]);
        if (bot.kind === 'shorts' || bot.kind === 'trousers') {
          var cov = bot.len, fl = bot.kind === 'shorts' ? 0.9 : 0.4;
          cv.limb(g.hip, lerp(g.hip, g.knee, Math.min(1, cov)), (4.3 + fl * 0.4) * lw, (cov >= 1 ? 3.2 : 3.4 + fl) * lw, bot.col[k], [0.35, (4.1 + fl * 0.4) * lw]);
          if (cov > 1) cv.limb(g.knee, lerp(g.knee, g.ank, cov - 1), 3.2 * lw, (cov > 1.9 ? 2.6 : 2.5) * lw, bot.col[k], [0.3, 3.3 * lw]);
        }
        if (def.socks) cv.limb(lerp(g.ank, g.knee, 0.32), g.ank, 2.3 * lw, 2.1 * lw, def.socks[k]);
        if (shoe.kind === 'boot') { cv.limb(lerp(g.ank, g.knee, 0.26), g.ank, 2.9 * lw, 2.5 * lw, shoe.col[k]); cv.poly(g.foot, shoe.col[k]); }
        else if (shoe.kind === 'sneaker') {
          cv.poly(g.foot, shoe.col[k]);
          var so = g.foot; cv.poly([so[4], so[3], lerp(so[3], so[2], 0.55), lerp(so[4], so[0], 0.45)], shoe.sole || '#d8d4cc');
        } else {                                         // sandal: bare foot, a strap, a thin sole
          cv.poly(g.foot, skin[k]);
          cv.poly([g.foot[4], g.foot[3], lerp(g.foot[3], g.foot[2], 0.4), lerp(g.foot[4], g.foot[0], 0.3)], shoe.col[k]);
          cv.limb(lerp(g.foot[1], g.foot[2], 0.3), lerp(g.foot[4], g.foot[3], 0.45), 0.9 * lw, 0.9 * lw, shoe.col[k]);
        }
      }
      function hemPoint(g, u) { return u <= 1 ? lerp(g.hip, g.knee, u) : lerp(g.knee, g.ank, u - 1); }

      var nA = arm(-tw, -0.8 * tw), fA = arm(tw, 0.8 * tw);
      // hair that hangs behind the body
      if (hair.style === 'pony') { var tie = Hd([-2.7, -5.4]); cv.limb(tie, add(tie, dirv((-24 + 26 * off - (stand ? 0 : 7 * Math.sin(t * 2 * TAU - 0.8))) * rad, 6.2 * hs)), 2.4 * hs, 0.9 * hs, hair.col[1], [0.4, 2.2 * hs]); }
      if (hair.style === 'long') { var r0 = Hd([-2.2, -5.6]); cv.limb(r0, add(r0, dirv((-6 + 10 * off - (stand ? 0 : 3 * Math.sin(t * 2 * TAU - 0.8))) * rad, 11 * hs)), 4.2 * hs, 2.6 * hs, hair.col[1], [0.5, 4.0 * hs]); }
      if (hair.style === 'pigtails') { var p0 = Hd([-2.6, -4.6]); cv.limb(p0, add(p0, dirv((-30 + 30 * off) * rad, 4 * hs)), 1.8 * hs, 1.0 * hs, hair.col[1]); }
      drawArm(fA, true);
      drawLeg(L.f, true);
      var hipsD = hips + (stand ? 0 : 0.5 * hips * Math.pow(Math.sin(t * TAU), 2));   // the seat swings back as the legs pass
      cv.poly([T([-2.2, -6.4]), T([2.2 + belly * 0.6, -6.4]), T([2.6 + belly * 0.4, -3]), T([2.4, 0]), T([1.0, 2.6]), T([-1.6, 2.8]), T([-2.4 - hipsD, 1]), T([-2.6 - hipsD, -1.8]), T([-2.4, -5])], bot.col[0]);
      drawLeg(L.n, false);
      // torso: flat colour, no back shadow
      var pec = def.pec || 0, wa = def.waist || 1, hemY = top.hem || -6.2;
      cv.poly([T([0, -19.8]), T([1.6, -19.3]), T([2.3 + pec * 0.6, -17.2]), T([2.2 + pec, -14.8]), T([2.1 + pec * 0.5 + belly * 0.4, -11.6]), T([1.9 * wa + belly, -8.2]), T([2.3 + belly * 0.9, -6.2]), T([2.4 + belly * 0.6, hemY]), T([-2.4 - (hemY > -6 ? hips * 0.8 : 0), hemY]), T([-2.3, -6.2]), T([-2.0 * wa, -9]), T([-2.6 * (0.5 + sh * 0.5), -13]), T([-3.0 * sh, -17]), T([-2.4 * sh, -19])], top.col[0]);
      if (bust > 0) {                                    // the chest moves with the torso, trailing it by under a pixel
        var b = bust, sag = 0.5 * b, jx = jig * 0.25;
        cv.poly([T([1.9, -17.4]), T([1.9 + 1.0 * b + jx * 0.5, -16.6 + sag * 0.3 + jig * 0.4]), T([1.9 + 1.7 * b + jx, -15.0 + sag + jig]), T([1.9 + 1.6 * b + jx, -13.4 + sag + jig]), T([1.9 + 0.9 * b, -12.4 + sag + jig * 0.7]), T([1.9, -12.2 + sag * 0.5])], top.col[0]);
        cv.poly([T([1.9, -13.0 + sag * 0.6 + jig * 0.6]), T([1.9 + 1.4 * b + jx, -13.6 + sag + jig]), T([1.9 + 0.9 * b, -12.4 + sag + jig * 0.7]), T([1.9, -12.0 + sag * 0.5])], top.col[1]);
      }
      if (top.stripe) for (var k2 = 0; k2 < fw * fh; k2++) if ((cv.c[k2] === top.col[0] || cv.c[k2] === top.col[1]) && Math.floor(k2 / fw) % Math.max(3, Math.round(3 * s)) === 0) cv.c[k2] = top.stripe;
      if (top.kind === 'tank' || top.kind === 'dress') cv.poly([T([0, -19.9]), T([1.7, -19.4]), T([2.3, -17.6]), T([0.6, -17.2]), T([-0.8, -19.6])], skin[0]);
      if (top.kind === 'shirt' || top.kind === 'polo') {
        cv.poly([T([-0.6, -20.3]), T([1.5, -19.8]), T([2.2, -18.4]), T([1.0, -18.6]), T([-0.9, -19.4])], top.trim || top.col[1]);
        if (top.kind === 'shirt') for (var by = -17; by > hemY - 0.5 && by < -4; by += 3) { var bp = T([2.0 + pec * 0.4 + (by > -9 ? belly * 0.8 : 0), by]), bi = Math.round(bp[1]) * fw + Math.round(bp[0]) - 1; if (cv.c[bi]) cv.c[bi] = top.col[1]; }
      }
      if (def.belt) cv.poly([T([-2.3, -6.6]), T([2.3 + belly * 0.8, -6.6]), T([2.35 + belly * 0.8, -5.7]), T([-2.4, -5.7])], def.belt);
      if (bot.kind === 'skirt') {                        // skirt or dress, the hem trailing a little
        var hn = hemPoint(L.n, bot.len), hf = hemPoint(L.f, bot.len), flare = (bot.flare || 1.6) * s;
        var back = Math.min(hn[0], hf[0]) - flare + hem * 0.8, front = Math.max(hn[0], hf[0]) + flare + hem * 0.6, hy = Math.max(hn[1], hf[1]) + 0.5;
        cv.poly([T([-2.3, -6.4]), T([2.3 + belly * 0.8, -6.4]), T([2.6, -3]), [front, hy], [back, hy], T([-2.8 - hips, -1])], bot.col[0]);
        cv.poly([T([-2.3, -6.4]), T([-0.6, -4]), [(back + front) / 2 - 0.6, hy], [back, hy], T([-2.8 - hips, -1])], bot.col[1]);
      }
      if (def.bag && def.bag.kind === 'backpack') {
        cv.poly([T([-2.4, -18.2]), T([-5.6, -17.4]), T([-6.0, -9.6]), T([-2.4, -9.0])], def.bag.col[0]);
        cv.poly([T([-5.6, -17.4]), T([-4.6, -17.6]), T([-5.0, -9.4]), T([-6.0, -9.6])], def.bag.col[1]);
        cv.limb(T([-1.4, -19]), T([1.4, -12]), 1.0 * s, 1.0 * s, def.bag.col[1]);
      }
      if (def.bag && def.bag.kind === 'tote') {
        var bx = hem * 0.6;
        cv.limb(T([0.6, -18.6]), T([-1.4 + bx, -8.4]), 0.9 * s, 0.9 * s, def.bag.col[1]);
        cv.poly([T([-4.8 + bx, -9]), T([0.2 + bx, -9]), T([0.6 + bx, -1.4]), T([-5.0 + bx, -1.2])], def.bag.col[0]);
        cv.poly([T([-5.0 + bx, -2.6]), T([0.5 + bx, -2.6]), T([0.6 + bx, -1.4]), T([-5.0 + bx, -1.2])], def.bag.col[1]);
      }
      // neck and head
      var nk = def.neck || 1;
      cv.poly([T([0.9 - 0.8 * nk, -19.6]), T([0.9 + 0.8 * nk, -19.6]), T([0.9 + 0.9 * nk, -21.4]), T([0.9 - 0.7 * nk, -21.4])], skin[1]);
      var hc = Hd([0.6, -4.3]);
      cv.ell(hc[0], hc[1], 3.3 * hs, 4.0 * hs, hair.style === 'bald' ? skin[0] : hair.col[0]);
      cv.poly([Hd([0.6, -6.1]), Hd([3.0, -6.4]), Hd([3.8, -4.7]), Hd([3.7, -2.6]), Hd([3.2, -0.9]), Hd([2.2, 0.2]), Hd([0.8, 0.0]), Hd([0.2, -1.7])], skin[0]);
      cv.poly([Hd([0.2, -1.9]), Hd([1.2, -0.9]), Hd([2.2, 0.2]), Hd([0.8, 0.1])], skin[1]);
      var ear = Hd([0.3, -3.3]); cv.ell(ear[0], ear[1], 0.7 * hs, 1.0 * hs, skin[1]);
      if (def.beard) cv.poly([Hd([0.4, -2.6]), Hd([3.5, -2.0]), Hd([3.1, -0.6]), Hd([2.2, 0.4]), Hd([0.8, 0.2]), Hd([0.2, -1.6])], def.beard);
      var st = hair.style;
      if (st === 'pony' || st === 'long' || st === 'pigtails') cv.poly([Hd([-1.0, -8.5]), Hd([3.2, -8.1]), Hd([4.0, -6.1]), Hd([2.0, -5.9]), Hd([0.4, -5.0])], hair.col[0]);
      if (st === 'pony') { var tq = Hd([-2.5, -5.4]); cv.ell(tq[0], tq[1], 0.9 * hs, 0.9 * hs, hair.col[1]); }
      if (st === 'short') cv.poly([Hd([-1.0, -8.5]), Hd([3.0, -8.2]), Hd([3.7, -6.7]), Hd([0.9, -6.5])], hair.col[0]);
      if (st === 'buzz') cv.poly([Hd([-2.6, -7.2]), Hd([0, -8.4]), Hd([2.8, -8.0]), Hd([3.3, -6.8]), Hd([0.6, -6.4])], hair.col[0]);
      if (st === 'bob') {
        var sway = off * 0.5;
        cv.poly([Hd([-3.3, -5]), Hd([-1.6, -8.6]), Hd([2.6, -8.4]), Hd([4.0, -6.0]), Hd([3.7, -4.2]), Hd([2.2, -5.4]), Hd([1.2, -4]), Hd([1.0, 0.4 + sway]), Hd([-3.0 + sway, 0.6 + sway])], hair.col[0]);
        cv.poly([Hd([-3.3, -5]), Hd([-2.2, -6]), Hd([-1.8, 0.6 + sway]), Hd([-3.0 + sway, 0.6 + sway])], hair.col[1]);
      }
      if (st === 'bald' && hair.col) cv.poly([Hd([-3.0, -4.4]), Hd([-0.4, -4.6]), Hd([-0.2, -2.0]), Hd([-2.6, -1.8])], hair.col[0]);
      if (st === 'long') cv.poly([Hd([-3.3, -5]), Hd([-1.4, -6]), Hd([-0.6, -1]), Hd([-2.6, 0.4])], hair.col[0]);
      var hat = def.hat;
      if (hat && (hat.kind === 'cap' || hat.kind === 'capback')) {
        cv.poly([Hd([-3.2, -6.0]), Hd([-2.2, -8.6]), Hd([1.0, -9.3]), Hd([3.3, -8.0]), Hd([3.8, -6.2])], hat.col[0]);
        if (hat.kind === 'cap') cv.poly([Hd([2.6, -6.6]), Hd([6.0, -6.1]), Hd([6.0, -5.4]), Hd([2.6, -5.7])], hat.col[1]);
        else cv.poly([Hd([-2.6, -6.6]), Hd([-5.4, -5.8]), Hd([-5.4, -5.1]), Hd([-2.6, -5.6])], hat.col[1]);
      }
      if (hat && hat.kind === 'sunhat') { var sc = Hd([0.4, -6.8]); cv.ell(sc[0], sc[1], 3.3 * hs, 2.4 * hs, hat.col[0]); cv.poly([Hd([-5.6, -6.2]), Hd([6.6, -6.4]), Hd([6.0, -5.4]), Hd([-5.0, -5.2])], hat.col[0]); cv.poly([Hd([-2.8, -6.4]), Hd([3.6, -6.6]), Hd([3.6, -5.8]), Hd([-2.8, -5.6])], hat.col[1]); }
      if (hat && hat.kind === 'flatcap') { cv.poly([Hd([-3.3, -5.8]), Hd([-2.4, -8.4]), Hd([1.6, -8.9]), Hd([4.8, -6.8]), Hd([4.8, -6.0])], hat.col[0]); cv.poly([Hd([2.0, -6.6]), Hd([4.8, -6.8]), Hd([4.8, -6.0]), Hd([2.0, -6.0])], hat.col[1]); }
      if (def.glasses) { cv.poly([Hd([1.8, -5.1]), Hd([4.0, -5.2]), Hd([4.0, -4.1]), Hd([1.8, -4.0])], '#1c1a1e'); cv.limb(Hd([0.6, -4.6]), Hd([1.8, -4.6]), 0.8 * hs, 0.8 * hs, '#1c1a1e'); }
      if (def.phones) { cv.limb(Hd([-0.4, -3.2]), Hd([0.6, -8.6]), 1.0 * hs, 1.0 * hs, '#26242c'); var ec = Hd([0.2, -3.2]); cv.ell(ec[0], ec[1], 1.3 * hs, 1.5 * hs, '#26242c'); }
      drawArm(nA, false);
      return cv;
    }
    return {
      fw: fw, fh: fh, footX: HIPX, footY: G, n: N, cycle: cycle,
      // paint frame f into g with its left edge at x0 (row 0 of the sheet)
      paint: function (g, f, x0) {
        var cv = frame(f / N), img = g.createImageData(fw, fh), d = img.data;
        for (var k = 0; k < fw * fh; k++) { var c = cv.c[k]; if (!c) continue; var q = rgb(c); d[k * 4] = q[0]; d[k * 4 + 1] = q[1]; d[k * 4 + 2] = q[2]; d[k * 4 + 3] = 255; }
        g.putImageData(img, x0, 0);
      }
    };
  }

  // ---------------------------------------------------------------- the cast, summer wear
  function c2(a, b) { return [a, b]; }
  var SKIN = { a: c2('#f0c4a2', '#c8957a'), b: c2('#e3a27c', '#b5735a'), c: c2('#c58c64', '#9a6a4a'), d: c2('#8a5a3c', '#6a4430'), e: c2('#6e4630', '#523222'), f: c2('#4a2e22', '#361f18') };
  var WHITE = c2('#ece8e0', '#bdb7ac');
  var CAST = {
    w1: { name: 'Ponytail, tank top, denim shorts', s: 1, bust: 0.9, hips: 1.0, skin: SKIN.b, hair: { style: 'pony', col: c2('#4b2a20', '#33190f') },
      top: { kind: 'tank', col: c2('#e0705a', '#b4523f'), sleeve: 0, hem: -6.2 }, bottom: { kind: 'shorts', col: c2('#5a7bb0', '#41598a'), len: 0.42 }, shoes: { kind: 'sneaker', col: WHITE, sole: '#c9c4ba' } },
    m1: { name: 'Tall, linen shirt, rolled chinos', s: 1.08, wd: 1.04, sh: 1.2, pec: 0.4, waist: 1.12, hips: 0.3, neck: 1.3, skin: SKIN.c, hair: { style: 'short', col: c2('#2a1c16', '#1a100c') },
      top: { kind: 'shirt', col: c2('#a9c4dc', '#7f9ab4'), sleeve: 0.55, hem: -3.2 }, bottom: { kind: 'trousers', col: c2('#c9b48e', '#a08c6a'), len: 1.82 }, shoes: { kind: 'sneaker', col: c2('#2c3550', '#1e2438'), sole: '#e8e4dc' } },
    m2: { name: 'Broad, polo, cargo shorts, cap', s: 1.0, wd: 1.28, limb: 1.25, sh: 1.25, pec: 0.5, belly: 1.6, waist: 1.2, hips: 0.4, neck: 1.6, amp: 0.85, ms: 72, skin: SKIN.a, beard: '#9a7a66',
      hair: { style: 'short', col: c2('#8a8078', '#6a625c') }, hat: { kind: 'cap', col: c2('#2c3a5c', '#1e2840') },
      top: { kind: 'polo', col: c2('#b8483e', '#8e3630'), sleeve: 0.55, hem: -3.6, trim: '#e8e2d6' }, bottom: { kind: 'shorts', col: c2('#9a8a62', '#7a6c4a'), len: 0.8 }, shoes: { kind: 'sandal', col: c2('#5a3a26', '#3a2418') } },
    w2: { name: 'Short, sundress, sun hat', s: 0.9, wd: 1.08, bust: 1.45, hips: 1.2, skin: SKIN.d, hair: { style: 'bob', col: c2('#221410', '#120a08') }, hat: { kind: 'sunhat', col: c2('#d9c08a', '#8e5a3a') },
      top: { kind: 'dress', col: c2('#e8c04a', '#bc9634'), sleeve: 0, hem: -6.2 }, bottom: { kind: 'skirt', col: c2('#e8c04a', '#bc9634'), len: 1.15, flare: 2.0 }, shoes: { kind: 'sandal', col: c2('#c08a56', '#8e6440') } },
    m3: { name: 'Teen, big tee, basketball shorts', s: 0.94, wd: 0.95, limb: 0.92, sh: 1.08, waist: 1.08, hips: 0.3, amp: 1.1, armAmp: 1.15, ms: 60, skin: SKIN.e, phones: true,
      hair: { style: 'buzz', col: c2('#1a1210', '#0e0a08') }, socks: WHITE,
      top: { kind: 'tee', col: c2('#4d9a6a', '#3a7652'), sleeve: 0.8, hem: -2.2 }, bottom: { kind: 'shorts', col: c2('#2a2a32', '#1c1c22'), len: 0.95 }, shoes: { kind: 'sneaker', col: c2('#c8403a', '#962e2a'), sole: '#ece8e0' } },
    k1: { name: 'Child, tee, skirt, backpack', s: 0.66, headK: 1.32, legL: 0.94, hips: 0.3, amp: 1.05, armAmp: 1.2, ms: 52, skin: SKIN.b, hair: { style: 'pigtails', col: c2('#8a5a30', '#6a4222') },
      top: { kind: 'tee', col: c2('#e89ab0', '#c07890'), sleeve: 0.5, hem: -6.2 }, bottom: { kind: 'skirt', col: c2('#3e8c8c', '#2c6a6a'), len: 0.62, flare: 1.4 }, shoes: { kind: 'sneaker', col: WHITE, sole: '#c9c4ba' },
      bag: { kind: 'backpack', col: c2('#e08a3a', '#b46a28') } },
    m4: { name: 'Older man, short-sleeve shirt, flat cap', s: 0.96, wd: 1.06, sh: 1.08, waist: 1.15, belly: 0.7, hips: 0.3, lean: 9, amp: 0.68, armAmp: 0.55, ms: 88, skin: SKIN.a,
      hair: { style: 'bald', col: c2('#c8c2bc', '#a8a29c') }, hat: { kind: 'flatcap', col: c2('#6a6458', '#4e4a40') }, belt: '#3a2a20',
      top: { kind: 'shirt', col: c2('#8a9ac0', '#6a789a'), sleeve: 0.5, hem: -6.2 }, bottom: { kind: 'trousers', col: c2('#5e5e66', '#46464c'), len: 2 }, shoes: { kind: 'boot', col: c2('#4a3020', '#2e1e14') } },
    m5: { name: 'Athletic, vest, running shorts, cap backwards', s: 1.04, sh: 1.32, limb: 1.15, pec: 0.7, waist: 1.0, hips: 0.4, neck: 1.5, skin: SKIN.f, hair: { style: 'buzz', col: c2('#141010', '#0a0808') },
      hat: { kind: 'capback', col: c2('#1e1e24', '#121216') },
      top: { kind: 'tank', col: c2('#e8e6e0', '#b8b4ac'), sleeve: 0, hem: -5.4 }, bottom: { kind: 'shorts', col: c2('#7d8590', '#5e646e'), len: 0.5 }, shoes: { kind: 'sneaker', col: c2('#3a7ad0', '#2a5aa0'), sole: '#ece8e0' } },
    w3: { name: 'Tall, striped tee, midi skirt, tote', s: 1.06, wd: 0.95, bust: 0.45, hips: 0.9, armL: 1.02, skin: SKIN.a, hair: { style: 'long', col: c2('#d8b26a', '#b08a4a') },
      top: { kind: 'tee', col: c2('#f0ece2', '#c4beb0'), stripe: '#2c3a5c', sleeve: 0.45, hem: -6.2 }, bottom: { kind: 'skirt', col: c2('#8a8a4a', '#6a6a36'), len: 1.5, flare: 1.8 },
      shoes: { kind: 'sandal', col: c2('#3a2a22', '#2a1e18') }, bag: { kind: 'tote', col: c2('#d8ccb0', '#a89c80') } },
    w4: { name: 'Blouse, cropped trousers, sunglasses', s: 0.97, wd: 1.1, bust: 1.2, hips: 1.1, belly: 0.4, skin: SKIN.c, glasses: true, hair: { style: 'short', col: c2('#9a908a', '#7a706a') },
      top: { kind: 'shirt', col: c2('#f3efe6', '#c8c2b4'), sleeve: 0.4, hem: -5.0 }, bottom: { kind: 'trousers', col: c2('#34406a', '#262e4e'), len: 1.62 }, shoes: { kind: 'sneaker', col: c2('#b8483e', '#8e3630'), sole: '#ece8e0' } }
  };
  window.StreetWalk = { make: make, CAST: CAST, FRAMES: N };
})();
