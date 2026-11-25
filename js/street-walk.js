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
  // A colour in shade (f < 1: darker and a little cooler) or in the light (f > 1: lighter, a little warmer)
  var adjCache = {};
  function adj(hex, f) {
    var key = hex + f; if (adjCache[key]) return adjCache[key];
    var n = parseInt(hex.slice(1), 16), c = [((n >> 16) & 255) * f, ((n >> 8) & 255) * f, (n & 255) * f];
    if (f < 1) { var t = (1 - f) * 40; c = [c[0] - t * 0.5, c[1] - t * 0.2, c[2] + t * 0.6]; } else { var u = (f - 1) * 40; c = [c[0] + u * 0.5, c[1] + u * 0.3, c[2] - u * 0.3]; }
    var out = '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
    return (adjCache[key] = out);
  }
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
    // FILL: limbs a good deal fuller than a stick figure; bodies a touch wider too (see T)
    var FILL = def.fill || 1.24, s = heightPx / 54, wd = (def.wd || 1) * 1.1, lw = (def.limb || 1) * s * FILL, legL = (def.legL || 1) * s, hs = s * (def.headK || 1);
    var amp = stand ? 0 : (def.amp || 1), armAmp = stand ? 0 : (def.armAmp || 1), sh = def.sh || 1, bust = def.bust || 0, hips = def.hips == null ? 0.4 : def.hips, belly = def.belly || 0;
    var fw = Math.ceil(48 * s * Math.max(1, wd)) + 6, fh = Math.ceil(64 * s) + 8 + (def.umbrella ? Math.ceil(12 * s) : 0), G = fh - 3, HIPX = Math.round(fw / 2) - 1;
    var FOOT = [[-1.3, -0.9], [1.1, -1.1], [4.3, 0.7], [4.3, 1.8], [-1.5, 1.8]];
    var skate = !!def.skate && !stand, BOARD = 2.6 * s;   // the skateboard lifts the riding foot this far
    function legFrom(hip, a, kn, ft) {
      var knee = add(hip, dirv(a, 11.8 * legL)), ank = add(knee, dirv(a - kn, 11.2 * legL));
      return { hip: hip, knee: knee, ank: ank, foot: FOOT.map(function (p) { return add(ank, rot([p[0] * lw, p[1] * lw], -ft)); }) };
    }
    function legs(t) {
      if (skate) {
        // The front foot rides the board, knee bent; the back foot pushes along the ground, then swings back up
        var u = ((t % 1) + 1) % 1, push = u < 0.55, k = push ? u / 0.55 : (u - 0.55) / 0.45;
        var ba = push ? 6 - 36 * k : -30 + 36 * k, bk = push ? 4 : 4 + 52 * Math.sin(k * Math.PI);
        // While pushing, the riding knee bends just enough for the pushing foot to reach the ground
        var fa = 16 * rad;
        function kneeFor(bDeg) {                         // the riding knee bend that puts the pushing foot on the ground
          var need = 11.8 * Math.cos(bDeg * rad) + 11.2 * Math.cos((bDeg - 4) * rad) - BOARD / legL;
          for (var q = 10; q <= 80; q++) if (11.8 * Math.cos(fa) + 11.2 * Math.cos(fa - q * rad) <= need) return q * rad;
          return 80 * rad;
        }
        // pushing: matched to the foot; gliding: eased from the end of one push to the start of the next
        var fk = push ? kneeFor(ba) : kneeFor(-30) + (kneeFor(6) - kneeFor(-30)) * (0.5 - 0.5 * Math.cos(k * Math.PI));
        var front = legFrom([HIPX + 0.8 * s, 0], fa, fk, 0);
        var back = legFrom([HIPX - 0.6 * s, 0], ba * rad, bk * rad, push ? 0 : -24 * rad);
        var lowF = -1e9; front.foot.forEach(function (p) { lowF = Math.max(lowF, p[1]); });
        return { n: front, f: back, y: G - BOARD - lowF };
      }
      var tw = stand ? 0 : Math.cos(t * TAU);
      function leg(tt, hip) {
        var k = legKey(tt);
        return legFrom(hip, k[0] * amp * rad, (stand ? 2 : k[1] * (0.5 + 0.5 * amp)) * rad, k[2] * amp * rad);
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
    if (skate) cycle = 96 * s;                           // one push carries the board about this far
    else if (!stand) { for (var f = 1; f < N / 2; f++) cycle += legs((f - 1) / N).n.ank[0] - legs(f / N).n.ank[0]; cycle = cycle / (N / 2 - 1) * N; }

    function frame(t) {
      var L = legs(t), py = Math.round(L.y), d = py - L.y;
      [L.n, L.f].forEach(function (g) { ['hip', 'knee', 'ank'].forEach(function (k) { g[k] = [g[k][0], g[k][1] + L.y + d]; }); g.foot = g.foot.map(function (p) { return [p[0], p[1] + L.y + d]; }); });
      var pel = [HIPX, py], tw = stand || skate ? 0 : Math.cos(t * TAU), lean = ((def.lean || 3) + (stand ? 0.4 : 1.2) * Math.sin(t * 2 * TAU)) * rad;
      var wf = stand || skate ? 1 : 1 + 0.1 * Math.cos(t * 2 * TAU);            // the torso turns a touch toward us as each heel lands
      function T(p) { return add(pel, rot([p[0] * s * wd * wf, p[1] * s], lean)); }
      var off = spring(t), jig = Math.max(-0.7, Math.min(0.7, off * 0.9 * (0.3 + 0.7 * bust))) * (bust > 0 ? 1 : 0);
      var hem = stand ? 0 : 0.6 * Math.sin(t * 2 * TAU - 1.1) + off * 0.6;
      var neck = T([0.9, -20.6]);
      function Hd(p) { return add(neck, rot([p[0] * hs, p[1] * hs], -lean * 0.8)); }
      function arm(sw, shift, carry) {                 // carry: this hand holds something, so it hardly swings
        var aa = carry ? 0.2 : armAmp, a = sw * 22 * aa * rad, s0 = T([-0.5 + shift, -17.6]), e = ((carry ? 24 : 9) + 26 * Math.max(0, sw) * aa) * rad;
        var elb = add(s0, dirv(a, 9.2 * s * (def.armL || 1))), wr = add(elb, dirv(a + e, 8.2 * s * (def.armL || 1)));
        return { sh: s0, elb: elb, wr: wr, hand: add(wr, dirv(a + e * 1.15, 1.2 * s)) };
      }
      var cv = new Cv(fw, fh), top = def.top, bot = def.bottom, shoe = def.shoes, skin = def.skin, hair = def.hair;

      // shade along the side of a limb away from the light (light comes from ahead and above)
      function shadeSide(a2, b2, wa, wb, col) {
        var dx = b2[0] - a2[0], dy = b2[1] - a2[1], L2 = Math.hypot(dx, dy) || 1, nx = -dy / L2, ny = dx / L2;   // (nx, ny): the back side for a limb pointing down
        var o1 = wa * 0.32, o2 = wb * 0.32;
        cv.limb([a2[0] + nx * o1, a2[1] + ny * o1], [b2[0] + nx * o2, b2[1] + ny * o2], wa * 0.38, wb * 0.38, col);
      }
      function drawArm(A, far) {
        var k = far ? 1 : 0, coat = def.coat, sl = coat ? 1.95 : top.sleeve || 0, slc = coat ? coat.col : top.col;
        cv.limb(A.sh, A.elb, 2.5 * lw, 2.1 * lw, skin[k]);
        cv.limb(A.elb, A.wr, 2.1 * lw, 1.7 * lw, skin[k]);
        cv.ell(A.hand[0], A.hand[1], 1.0 * lw, 1.2 * lw, def.gloves ? def.gloves[k] : skin[k]);
        if (sl > 0) cv.limb(A.sh, lerp(A.sh, A.elb, Math.min(1, sl)), (coat ? 3.4 : 3.0) * lw, (2.6 + (sl < 1 ? 0.5 : 0.3)) * lw, slc[k]);
        else if (!far) cv.ell(A.sh[0] + 0.4 * s, A.sh[1] - 1.0 * s, 0.7 * lw, 0.6 * lw, top.col[0]);   // a strap over the near shoulder
        if (sl > 1) cv.limb(A.elb, lerp(A.elb, A.wr, sl - 1), (coat ? 2.9 : 2.6) * lw, 2.4 * lw, slc[k]);
        // light and shade on the arm: the underside in shadow, a lit line along the top
        shadeSide(A.sh, A.elb, 2.6 * lw, 2.2 * lw, adj(sl > 0.6 ? slc[k] : skin[k], 0.8));
        shadeSide(A.elb, A.wr, 2.2 * lw, 1.8 * lw, adj(sl > 1.5 ? slc[k] : skin[k], 0.8));
      }
      function drawLeg(g, far) {
        var k = far ? 1 : 0;
        var lc = def.tights || skin;                    // bare legs, or tights (a third colour: a dot pattern)
        cv.limb(g.hip, g.knee, 4.1 * lw, 2.8 * lw, lc[k], [0.35, 3.8 * lw]);
        cv.limb(g.knee, g.ank, 2.7 * lw, 1.9 * lw, lc[k], [0.3, 3.0 * lw]);
        legShade(g, k, lc[k], 0, 2);
        if (def.tights && def.tights[2]) for (var ti = 0.2; ti < 1.9; ti += 0.34) { var tp = hemPoint(g, ti); cv.ell(tp[0] + (k ? 0 : 0.6 * lw), tp[1], 0.55 * lw, 0.55 * lw, def.tights[2]); }
        if (bot.kind === 'shorts' || bot.kind === 'trousers') {
          var cov = bot.len, fl = bot.kind === 'shorts' ? 0.9 : 0.4;
          cv.limb(g.hip, lerp(g.hip, g.knee, Math.min(1, cov)), (4.3 + fl * 0.4) * lw, (cov >= 1 ? 3.2 : 3.4 + fl) * lw, bot.col[k], [0.35, (4.1 + fl * 0.4) * lw]);
          if (cov > 1) cv.limb(g.knee, lerp(g.knee, g.ank, cov - 1), 3.2 * lw, (cov > 1.9 ? 2.6 : 2.5) * lw, bot.col[k], [0.3, 3.3 * lw]);
          legShade(g, k, bot.col[k], 0, cov);
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
      // Shade on a leg (from u0 to u1 along it: 0 hip, 1 knee, 2 ankle) in col: the back of the thigh and calf in
      // shadow, a crease behind a bent knee, the kneecap catching the light
      function legShade(g, k, col, u0, u1) {
        var dk = adj(col, 0.78), lt = adj(col, 1.16);
        if (u0 < 1) { var e1 = Math.min(1, u1); shadeSide(hemPoint(g, u0), hemPoint(g, e1), 4.0 * lw, (e1 >= 1 ? 2.8 : 3.4) * lw, dk); }
        if (u1 > 1) { shadeSide(g.knee, hemPoint(g, Math.min(2, u1)), 2.8 * lw, 2.0 * lw, dk); }
        if (u0 <= 1 && u1 >= 1) {
          var tx = g.knee[0] - g.hip[0], ty = g.knee[1] - g.hip[1], sx2 = g.ank[0] - g.knee[0], sy2 = g.ank[1] - g.knee[1];
          var bend = Math.abs(Math.atan2(tx * sy2 - ty * sx2, tx * sx2 + ty * sy2));
          if (bend > 0.2) cv.ell(g.knee[0] - 1.0 * lw, g.knee[1] + 0.2 * lw, 0.8 * lw, 0.9 * lw, adj(col, 0.68));   // the crease behind the knee
          cv.ell(g.knee[0] + 0.9 * lw, g.knee[1] - 0.2 * lw, 0.55 * lw, 0.75 * lw, lt);                       // the kneecap in the light
        }
      }

      var nA = arm(-tw, -0.8 * tw, !!(def.carry || def.umbrella)), fA = arm(tw, 0.8 * tw);
      if (skate) {                                       // the board under the riding foot, its wheels on the ground
        var fx = L.n.ank[0] + 1 * s, by = G - BOARD, bc = def.board || ['#3a2a24', '#d8d0c0'];
        cv.poly([[fx - 9 * s, by - 0.3 * s], [fx + 8 * s, by - 0.3 * s], [fx + 9.6 * s, by - 1.3 * s], [fx + 9.8 * s, by + 0.6 * s], [fx - 9.6 * s, by + 0.6 * s], [fx - 10.4 * s, by - 1.1 * s]], bc[0]);
        cv.ell(fx - 6 * s, G - 1.0 * s, 1.0 * s, 1.0 * s, bc[1]); cv.ell(fx + 6 * s, G - 1.0 * s, 1.0 * s, 1.0 * s, bc[1]);
      }
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
      if (def.bib) {                                     // dungarees: a bib over the chest and a strap over the shoulder
        cv.poly([T([0.6, -15.6]), T([2.3 + pec + (bust ? 1.2 * bust : 0), -15.2]), T([2.1 + belly * 0.5, -10]), T([2.3 + belly * 0.9, -6.2]), T([-0.4, -6.2]), T([-0.2, -12])], bot.col[0]);
        cv.limb(T([0.9, -15.4]), T([-1.6, -19.2]), 0.9 * s, 0.9 * s, bot.col[0]);
        cv.ell(T([1.4, -14.6])[0], T([1.4, -14.6])[1], 0.5 * s, 0.5 * s, def.bib);
      }
      if (bot.kind === 'skirt') {                        // skirt or dress, the hem trailing a little
        var hn = hemPoint(L.n, bot.len), hf = hemPoint(L.f, bot.len), flare = (bot.flare || 1.6) * s;
        var back = Math.min(hn[0], hf[0]) - flare + hem * 0.8, front = Math.max(hn[0], hf[0]) + flare + hem * 0.6, hy = Math.max(hn[1], hf[1]) + 0.5;
        cv.poly([T([-2.3, -6.4]), T([2.3 + belly * 0.8, -6.4]), T([2.6, -3]), [front, hy], [back, hy], T([-2.8 - hips, -1])], bot.col[0]);
        cv.poly([T([-2.3, -6.4]), T([-0.6, -4]), [(back + front) / 2 - 0.6, hy], [back, hy], T([-2.8 - hips, -1])], bot.col[1]);
      }
      if (def.coat) {                                    // a coat over the top: open at the front, its hem trailing as they walk
        var C = def.coat, cl = C.col, lag = (hem * 1.3 + off * 0.9) * s, kind = C.kind, longish = kind === 'long' || kind === 'rain';
        var fr2, bk2;
        if (longish) { var hn2 = hemPoint(L.n, C.len || 1.05), hf2 = hemPoint(L.f, C.len || 1.05), cy2 = Math.max(hn2[1], hf2[1]); fr2 = [Math.max(hn2[0], hf2[0]) + 1.4 * s, cy2]; bk2 = [Math.min(hn2[0], hf2[0]) - 2.6 * s - Math.abs(lag), cy2 + 1]; }
        else { fr2 = T([2.3 + belly * 0.8, kind === 'puffer' ? -2.6 : -1.6]); bk2 = T([-3.4 - hips * 0.5 - (kind === 'puffer' ? 0.6 : 0), kind === 'puffer' ? -2.6 : -1.6]); }
        var puff = kind === 'puffer' ? 0.7 : 0;
        var coatPts = [T([-1.0, -20.6]), T([0.7, -20.0]), T([1.3 + puff, -18.4]), T([1.4 + puff, -15.4]), T([1.5 + belly * 0.6 + puff, -9.5]), fr2, bk2, T([-3.5 - hips * 0.4 - puff, -3]), T([-3.3 * sh - puff, -12]), T([-3.4 * sh - puff, -17.6]), T([-2.4 * sh, -19.8])];
        cv.poly(coatPts, cl[0]);
        cv.poly([T([1.3 + puff, -18.4]), T([1.4 + puff, -15.4]), T([1.5 + belly * 0.6 + puff, -9.5]), fr2, [fr2[0] - 1.2 * s, fr2[1]], T([0.6 + belly * 0.5, -9.5]), T([0.5, -15.4])], adj(cl[0], 1.12));   // the lit front panel
        cv.limb(T([-1.2, -16]), longish ? [bk2[0] * 0.5 + fr2[0] * 0.5 - 1.5 * s, bk2[1]] : T([-1.6, -2.6]), 0.9 * s, 0.9 * s, adj(cl[0], 0.8));   // a fold down the back
        if (kind === 'puffer') for (var qy = -17; qy < -3; qy += 3) cv.limb(T([-3.4 * sh - 0.6, qy]), T([1.5 + puff, qy]), 0.7 * s, 0.7 * s, adj(cl[0], 0.78));   // quilting
        if (kind === 'rain') cv.limb(T([0.4, -18]), longish ? [fr2[0] - 2 * s, fr2[1] - 1] : T([0.4, -3]), 0.7 * s, 0.7 * s, adj(cl[0], 1.3));   // a wet sheen
        cv.poly([T([-1.2, -20.8]), T([0.9, -20.4]), T([1.5, -18.6]), T([0.2, -18.4]), T([-1.6, -19.6])], cl[1]);   // the collar
        if (C.belt) cv.limb(T([-3.3, -7]), T([1.6 + belly * 0.6, -7]), 1.0 * s, 1.0 * s, cl[1]);
      }
      if (def.bag && def.bag.kind === 'backpack') {
        cv.poly([T([-2.4, -18.2]), T([-5.6, -17.4]), T([-6.0, -9.6]), T([-2.4, -9.0])], def.bag.col[0]);
        cv.poly([T([-5.6, -17.4]), T([-4.6, -17.6]), T([-5.0, -9.4]), T([-6.0, -9.6])], def.bag.col[1]);
        cv.limb(T([-1.4, -19]), T([1.4, -12]), 1.0 * s, 1.0 * s, def.bag.col[1]);
      }
      if (def.bag && def.bag.kind === 'hiking') {        // a tall pack with a rolled mat strapped on top, bobbing a little
        var bb = off * 0.5;
        cv.poly([T([-2.2, -19.4 + bb]), T([-6.4, -18.6 + bb]), T([-7.2, -11 + bb]), T([-6.4, -6.6 + bb]), T([-2.2, -7.4 + bb])], def.bag.col[0]);
        cv.poly([T([-6.4, -18.6 + bb]), T([-5.2, -18.8 + bb]), T([-5.6, -6.8 + bb]), T([-6.4, -6.6 + bb]), T([-7.2, -11 + bb])], def.bag.col[1]);
        cv.poly([T([-6.8, -13 + bb]), T([-4.4, -13 + bb]), T([-4.4, -10.4 + bb]), T([-6.9, -10.4 + bb])], def.bag.col[1]);
        var rl = T([-4.6, -20.8 + bb]); cv.ell(rl[0], rl[1], 3.4 * s, 1.5 * s, def.bag.roll || '#7a8a4a');
        cv.limb(T([-1.4, -19]), T([1.2, -12]), 1.0 * s, 1.0 * s, def.bag.col[1]);
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
      if (st === 'mohawk') {                             // shaved sides, a tall crest
        cv.ell(hc[0], hc[1], 3.3 * hs, 4.0 * hs, skin[1]);
        cv.poly([Hd([0.6, -6.1]), Hd([3.0, -6.4]), Hd([3.8, -4.7]), Hd([3.7, -2.6]), Hd([3.2, -0.9]), Hd([2.2, 0.2]), Hd([0.8, 0.0]), Hd([0.2, -1.7])], skin[0]);
        cv.poly([Hd([-3.0, -6.0]), Hd([-2.4, -9.6]), Hd([-0.8, -11.0]), Hd([1.0, -10.6]), Hd([2.8, -9.8]), Hd([3.4, -7.8]), Hd([1.4, -8.2]), Hd([-1.0, -7.8])], hair.col[0]);
        cv.poly([Hd([-2.4, -9.6]), Hd([-0.8, -11.0]), Hd([0.2, -10.9]), Hd([-1.2, -8.2]), Hd([-3.0, -6.0])], hair.col[1]);
      }
      if (st === 'hood') {                               // the hood up, framing the face, in the top's colour
        cv.poly([Hd([-3.8, -4.4]), Hd([-3.0, -8.4]), Hd([0.2, -9.8]), Hd([3.2, -9.0]), Hd([4.2, -7.0]), Hd([3.0, -6.6]), Hd([1.4, -6.8]), Hd([0.6, -4.2]), Hd([0.4, -0.8]), Hd([-0.4, 1.4]), Hd([-3.4, 1.0])], top.col[0]);
        cv.poly([Hd([1.4, -6.8]), Hd([3.0, -6.6]), Hd([4.2, -7.0]), Hd([3.8, -6.2]), Hd([1.6, -6.0]), Hd([1.0, -4.0]), Hd([0.9, -0.6]), Hd([0.4, -0.8]), Hd([0.6, -4.2])], top.col[1]);
      }
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
      if (hat && hat.kind === 'beanie') { cv.poly([Hd([-3.4, -5.4]), Hd([-2.6, -8.6]), Hd([0.6, -9.8]), Hd([3.2, -8.6]), Hd([3.8, -5.8])], hat.col[0]); cv.limb(Hd([-3.4, -5.6]), Hd([3.8, -6.0]), 1.4 * hs, 1.4 * hs, hat.col[1]); cv.ell(Hd([0.4, -10.2])[0], Hd([0.4, -10.2])[1], 1.2 * hs, 1.0 * hs, hat.col[1]); }
      if (def.scarf) {                                   // a scarf round the neck, its end swinging
        var sc0 = T([0.9, -20.2]), swg = (-8 + 14 * off - (stand ? 0 : 6 * Math.sin(t * 2 * TAU - 0.6))) * rad;
        cv.limb(T([-1.4, -20.4]), T([2.6, -19.6]), 2.2 * s, 2.2 * s, def.scarf[0]); cv.limb(T([-1.4, -21.2]), T([2.4, -20.6]), 1.0 * s, 1.0 * s, adj(def.scarf[0], 1.15));
        cv.limb(sc0, add(sc0, dirv(swg, 6.5 * s)), 1.8 * s, 1.5 * s, def.scarf[1]);
      }
      if (def.carry) {                                   // a basket hanging from the near hand, swinging a little behind it
        var hx = nA.hand[0] + hem * 0.5, hy2 = nA.hand[1], bc2 = def.carry;
        cv.limb([hx - 2.4 * s, hy2 + 2.6 * s], [hx, hy2 - 0.4 * s], 0.7 * s, 0.7 * s, bc2[1]);
        cv.limb([hx + 2.4 * s, hy2 + 2.6 * s], [hx, hy2 - 0.4 * s], 0.7 * s, 0.7 * s, bc2[1]);
        cv.poly([[hx - 3.4 * s, hy2 + 2.4 * s], [hx + 3.4 * s, hy2 + 2.4 * s], [hx + 2.6 * s, hy2 + 6.4 * s], [hx - 2.6 * s, hy2 + 6.4 * s]], bc2[0]);
        cv.poly([[hx - 3.2 * s, hy2 + 3.8 * s], [hx + 3.2 * s, hy2 + 3.8 * s], [hx + 3.0 * s, hy2 + 4.6 * s], [hx - 3.0 * s, hy2 + 4.6 * s]], bc2[1]);
        if (bc2[2]) { cv.ell(hx - 1.4 * s, hy2 + 2.0 * s, 1.1 * s, 1.0 * s, bc2[2]); cv.ell(hx + 1.2 * s, hy2 + 1.8 * s, 1.0 * s, 1.0 * s, bc2[3] || bc2[2]); }
      }
      drawArm(nA, false);
      if (def.umbrella) {                                // an umbrella held up in the near hand, bobbing with each step
        var uh = nA.hand, top2 = [uh[0] + 1.5 * s, Hd([0, -12])[1] - 2 * s], uc = def.umbrella, ur = 12 * s;
        cv.limb(uh, top2, 0.8 * s, 0.8 * s, '#2a2624');
        var dome = [], crown = [], uhgt = 7 * s;
        for (var ua = 0; ua <= 16; ua++) { var an4 = Math.PI * ua / 16; dome.push([top2[0] + Math.cos(an4) * ur, top2[1] + 1 * s - Math.sin(an4) * uhgt]); crown.push([top2[0] - 2 * s + Math.cos(an4) * ur * 0.55, top2[1] - 2 * s - Math.sin(an4) * uhgt * 0.6]); }
        cv.poly(dome, uc); cv.poly(crown, adj(uc, 1.18));   // the canopy, lit on top
        for (var rb = -2; rb <= 2; rb++) cv.limb(top2, [top2[0] + rb * ur * 0.45, top2[1] + 0.2 * s], 0.6 * s, 0.6 * s, adj(uc, 0.72));   // ribs
        for (var sc2 = -ur; sc2 < ur; sc2 += 3 * s) cv.ell(top2[0] + sc2 + 1.5 * s, top2[1] + 0.4 * s, 1.5 * s, 0.8 * s, uc);   // the scalloped edge
        cv.ell(top2[0], top2[1] - 6.4 * s, 0.6 * s, 0.8 * s, '#2a2624');
      }
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
    h1: { name: 'Hood up, hoodie, jeans', s: 0.98, sh: 1.1, waist: 1.08, hips: 0.3, armAmp: 0.35, skin: SKIN.c, hair: { style: 'hood', col: c2('#1a1210', '#0e0a08') },
      top: { kind: 'tee', col: c2('#2f6a4a', '#214c35'), sleeve: 1.85, hem: -3.4 }, bottom: { kind: 'trousers', col: c2('#3a5a86', '#2a4264'), len: 2 }, shoes: { kind: 'sneaker', col: c2('#26242a', '#18161c'), sole: '#d8d4cc' } },
    b1: { name: 'Big man, white shirt, green trousers', s: 1.02, wd: 1.5, limb: 1.45, sh: 1.3, pec: 0.8, belly: 2.8, waist: 1.3, hips: 0.6, neck: 1.9, amp: 0.78, armAmp: 0.8, ms: 78, skin: SKIN.a,
      hair: { style: 'bald', col: c2('#d89a6a', '#b07a50') }, beard: '#c88a5a',
      top: { kind: 'shirt', col: c2('#eeeae2', '#c4bfb4'), sleeve: 0.55, hem: -4.2 }, bottom: { kind: 'trousers', col: c2('#2f5a3a', '#22432b'), len: 2 }, shoes: { kind: 'boot', col: c2('#5a3a26', '#3a2418') } },
    s1: { name: 'Skateboarder, red jumper, cap', s: 0.96, wd: 0.95, limb: 0.95, hips: 0.3, lean: 8, armAmp: 0.4, skate: true, ms: 55, skin: SKIN.b, hair: { style: 'short', col: c2('#3a2418', '#24160e') },
      hat: { kind: 'cap', col: c2('#e08a3a', '#b46a28') }, board: ['#3e2a22', '#e8e0cc'],
      top: { kind: 'tee', col: c2('#b8343e', '#8c2630'), sleeve: 1.8, hem: -3.6 }, bottom: { kind: 'trousers', col: c2('#86b6da', '#6690b4'), len: 2 }, shoes: { kind: 'sneaker', col: c2('#e8e4dc', '#bdb7ac'), sole: '#c8403a' } },
    p1: { name: 'Backpacker, bedroll, beard', s: 1.04, sh: 1.15, limb: 1.05, pec: 0.4, waist: 1.1, hips: 0.35, lean: 7, amp: 0.92, ms: 70, skin: SKIN.a, beard: '#3a2418',
      hair: { style: 'buzz', col: c2('#3a2418', '#24160e') }, bag: { kind: 'hiking', col: c2('#5a4a3a', '#3e3226'), roll: '#8a9a4a' },
      top: { kind: 'tee', col: c2('#3a8ab0', '#2a6a8a'), sleeve: 0.5, hem: -4.0 }, bottom: { kind: 'shorts', col: c2('#a8383a', '#842a2c'), len: 0.75 }, shoes: { kind: 'boot', col: c2('#7a5232', '#54361e') }, socks: c2('#d8d0c0', '#a8a090') },
    g1: { name: 'Green mohawk, orange tee', s: 1.0, wd: 0.92, limb: 0.92, sh: 1.05, hips: 0.3, amp: 1.05, ms: 62, skin: SKIN.a, hair: { style: 'mohawk', col: c2('#5ac04a', '#3e9634') },
      top: { kind: 'tee', col: c2('#e0702a', '#b4561e'), sleeve: 0.5, hem: -4.4 }, bottom: { kind: 'trousers', col: c2('#2e5a96', '#22446e'), len: 2 }, shoes: { kind: 'boot', col: c2('#b8303a', '#8a2229') } },
    d1: { name: 'Dungarees, market basket', s: 0.95, wd: 1.05, bust: 0.8, hips: 1.0, skin: SKIN.e, hair: { style: 'bob', col: c2('#1a1210', '#0e0a08') }, bib: '#e8c84a',
      carry: ['#b8864a', '#8a6034', '#d8402a', '#e8b030'],
      top: { kind: 'tee', col: c2('#e8d8c0', '#bcae96'), sleeve: 0.5, hem: -6.2 }, bottom: { kind: 'trousers', col: c2('#4a6a9a', '#364e74'), len: 1.7 }, shoes: { kind: 'sneaker', col: c2('#e8e4dc', '#bdb7ac'), sole: '#c9c4ba' } },
    t1: { name: 'Purple dress, patterned tights', s: 0.98, wd: 1.12, bust: 1.05, hips: 1.25, belly: 0.5, skin: SKIN.d, tights: ['#3a2a30', '#2a1e24', '#c8506a'],
      hair: { style: 'short', col: c2('#e8d8b0', '#c8b890') },
      top: { kind: 'dress', col: c2('#6a2a7a', '#4e1e5a'), sleeve: 0, hem: -6.2 }, bottom: { kind: 'skirt', col: c2('#d8506a', '#b03a52'), len: 0.75, flare: 1.8 }, shoes: { kind: 'boot', col: c2('#d88a3a', '#a8682a') } },
    w4: { name: 'Blouse, cropped trousers, sunglasses', s: 0.97, wd: 1.1, bust: 1.2, hips: 1.1, belly: 0.4, skin: SKIN.c, glasses: true, hair: { style: 'short', col: c2('#9a908a', '#7a706a') },
      top: { kind: 'shirt', col: c2('#f3efe6', '#c8c2b4'), sleeve: 0.4, hem: -5.0 }, bottom: { kind: 'trousers', col: c2('#34406a', '#262e4e'), len: 1.62 }, shoes: { kind: 'sneaker', col: c2('#b8483e', '#8e3630'), sole: '#ece8e0' } }
  };
  // ---------------------------------------------------------------- dressed for the weather
  // climate: 'summer' (as drawn), 'rain' (a raincoat or an umbrella, covered legs, shoes), 'cold' (a coat, scarf,
  // hat, gloves, trousers or tights, boots). Each person's choice is fixed by their own seed, so it never flickers.
  function seeded(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var RAIN_COATS = [c2('#d8b030', '#a88620'), c2('#2e4a6a', '#20344e'), c2('#8a2e2e', '#662020'), c2('#3e5a3a', '#2c422a'), c2('#c8c2b4', '#9c9688')];
  var UMBRELLAS = ['#c23a5a', '#2a8a96', '#d8b040', '#2a2a3a', '#5a7a3a', '#8a3ac2', '#e0e0e0', '#c86a2a'];
  var COATS = [c2('#5a3a26', '#3e2818'), c2('#2a2e3a', '#1c1f28'), c2('#7a6a4a', '#5a4e36'), c2('#6a2a34', '#4a1e26'), c2('#3a4a5a', '#2a3644'), c2('#8a8478', '#6a655c'), c2('#2e4a3a', '#20342a')];
  var KNITS = [c2('#c83a3a', '#9a2a2a'), c2('#e0c050', '#b09030'), c2('#3a7ab0', '#2a5a84'), c2('#e8e4d8', '#bcb6a8'), c2('#5a8a4a', '#406a34'), c2('#8a4a8a', '#663666')];
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function dress(def, climate, key) {
    if (!climate || climate === 'summer') return def;
    var d = copy(def), r = function (i) { return seeded((key || 1) * 7.3 + i * 13.7); };
    if (d.bottom && (d.bottom.kind === 'shorts' || (d.bottom.kind === 'trousers' && d.bottom.len < 1.8))) d.bottom = { kind: 'trousers', col: r(1) < 0.5 ? c2('#2e3a56', '#222a40') : c2('#3a3632', '#2a2724'), len: 2 };
    if (climate === 'rain') {
      if (r(2) < 0.55) d.coat = { kind: 'rain', col: RAIN_COATS[Math.floor(r(3) * RAIN_COATS.length)], len: 0.9 }; else d.umbrella = UMBRELLAS[Math.floor(r(4) * UMBRELLAS.length)];
      if (d.shoes && d.shoes.kind === 'sandal') d.shoes = { kind: 'sneaker', col: c2('#3a3a42', '#26262c'), sole: '#d8d4cc' };
      if (d.hat && d.hat.kind === 'sunhat') d.hat = null;
    } else {
      var pf = r(5) < 0.45;
      d.coat = { kind: pf ? 'puffer' : 'long', col: (pf ? KNITS : COATS)[Math.floor(r(6) * (pf ? KNITS.length : COATS.length))], len: 1.1, belt: !pf && r(7) < 0.4 };
      if (r(8) < 0.7) { var sk = KNITS[Math.floor(r(9) * KNITS.length)]; d.scarf = [sk[0], sk[1]]; }
      if (!d.hat || d.hat.kind === 'sunhat' || d.hat.kind === 'capback') d.hat = r(10) < 0.55 ? { kind: 'beanie', col: KNITS[Math.floor(r(11) * KNITS.length)] } : d.hat && d.hat.kind !== 'sunhat' ? d.hat : null;
      if (r(12) < 0.45) d.gloves = c2('#2a2420', '#1c1814');
      if (d.bottom && d.bottom.kind === 'skirt' && !d.tights) d.tights = c2('#2a2428', '#1c181c');
      d.shoes = { kind: 'boot', col: r(13) < 0.5 ? c2('#4a3020', '#2e1e14') : c2('#26242a', '#18161c') };
      d.socks = null;
    }
    return d;
  }

  // ---------------------------------------------------------------- many more people, built from parts
  // Each is made from a seed: a build, a skin tone, hair, a top, bottoms, shoes and extras, in good colours.
  var BUILDS = [
    { s: 1.0 }, { s: 1.04, wd: 0.94, limb: 0.92 }, { s: 0.94, wd: 1.08 }, { s: 1.06, wd: 1.18, limb: 1.15, sh: 1.2, pec: 0.5 },
    { s: 1.0, wd: 1.36, limb: 1.32, belly: 2.0, waist: 1.25, amp: 0.85, ms: 74 }, { s: 1.1, wd: 0.96 }, { s: 0.88, wd: 1.0 },
    { s: 0.97, wd: 1.12, belly: 1.0, lean: 8, amp: 0.72, armAmp: 0.6, ms: 84 }, { s: 0.92, wd: 0.92, limb: 0.94, amp: 1.08, ms: 60 }
  ];
  var SKINS = [SKIN.a, SKIN.b, SKIN.c, SKIN.d, SKIN.e, SKIN.f];
  var HAIRS = [c2('#141010', '#0a0808'), c2('#3a2418', '#24160e'), c2('#6a4a2a', '#4a3220'), c2('#c8a060', '#a07c44'), c2('#d8b26a', '#b08a4a'), c2('#8a8078', '#6a625c'), c2('#d8d0c8', '#b0a8a0'), c2('#8a3a1a', '#682a12')];
  var TOPCOLS = [c2('#e0705a', '#b4523f'), c2('#a9c4dc', '#7f9ab4'), c2('#4d9a6a', '#3a7652'), c2('#f0ece2', '#c4beb0'), c2('#e8c04a', '#bc9634'), c2('#2c3a5c', '#1e2840'), c2('#b8483e', '#8e3630'),
    c2('#8a6ab0', '#6a4e8a'), c2('#3a8ab0', '#2a6a8a'), c2('#e89ab0', '#c07890'), c2('#5a5a62', '#42424a'), c2('#c8b48e', '#a08c6a'), c2('#2a2a32', '#1c1c22'), c2('#e8e6e0', '#b8b4ac')];
  var BOTCOLS = [c2('#46638f', '#304768'), c2('#5a7bb0', '#41598a'), c2('#2a2a32', '#1c1c22'), c2('#c9b48e', '#a08c6a'), c2('#5e5e66', '#46464c'), c2('#7d8590', '#5e646e'), c2('#3e5a3a', '#2c422a'), c2('#8a3a3a', '#662a2a')];
  var SHOECOLS = [c2('#ece8e0', '#bdb7ac'), c2('#2c3550', '#1e2438'), c2('#c8403a', '#962e2a'), c2('#3a7ad0', '#2a5aa0'), c2('#4a3020', '#2e1e14'), c2('#26242a', '#18161c')];
  function generate(n, seed0) {
    var out = {};
    for (var i = 0; i < n; i++) {
      var k = (seed0 || 1) * 1000 + i, r = function (j) { return seeded(k * 3.1 + j * 17.3); }, of = function (arr, j) { return arr[Math.floor(r(j) * arr.length)]; };
      var f = r(1) < 0.5, b = copy(of(BUILDS, 2)), d = b;
      d.name = 'person ' + (i + 1); d.skin = of(SKINS, 3);
      if (f) { d.bust = 0.45 + r(4) * 1.0; d.hips = 0.8 + r(5) * 0.5; } else { d.pec = Math.max(d.pec || 0, 0.25 + r(4) * 0.4); d.hips = 0.3; d.sh = Math.max(d.sh || 1, 1.08 + r(5) * 0.15); }
      var hs = f ? of(['pony', 'long', 'bob', 'short', 'long', 'bob'], 6) : of(['short', 'short', 'buzz', 'bald', 'short', 'long', 'mohawk'], 6);
      d.hair = { style: hs, col: hs === 'mohawk' ? of([c2('#5ac04a', '#3e9634'), c2('#c84a8a', '#9a3468'), c2('#3a8ad8', '#2a6aa8')], 7) : of(HAIRS, 7) };
      if (hs === 'bald') d.hair.col = of(HAIRS, 8);
      var tk = f ? of(['tee', 'tank', 'shirt', 'dress', 'tee', 'shirt'], 9) : of(['tee', 'tee', 'shirt', 'polo', 'tank'], 9), tc = of(TOPCOLS, 10);
      d.top = { kind: tk, col: tc, sleeve: tk === 'tank' || tk === 'dress' ? 0 : 0.4 + r(11) * 0.4, hem: tk === 'dress' ? -6.2 : r(12) < 0.5 ? -6.2 : -3.4 - r(13) * 1.5 };
      if (tk === 'polo') d.top.trim = '#e8e2d6';
      if (r(14) < 0.15 && tk === 'tee') d.top.stripe = of(['#2c3a5c', '#b8483e', '#2a2a32'], 15);
      if (tk === 'dress') d.bottom = { kind: 'skirt', col: tc, len: 0.7 + r(16) * 0.8, flare: 1.6 + r(17) * 0.6 };
      else if (f && r(16) < 0.3) d.bottom = { kind: 'skirt', col: of(BOTCOLS, 17), len: 0.6 + r(18) * 0.9, flare: 1.5 + r(19) * 0.5 };
      else d.bottom = { kind: r(16) < 0.45 ? 'shorts' : 'trousers', col: of(BOTCOLS, 17), len: 0 };
      if (d.bottom.kind === 'shorts') d.bottom.len = 0.4 + r(18) * 0.55; else if (d.bottom.kind === 'trousers') d.bottom.len = r(18) < 0.25 ? 1.6 + r(19) * 0.2 : 2;
      d.shoes = { kind: of(['sneaker', 'sneaker', 'sandal', 'boot'], 20), col: of(SHOECOLS, 21), sole: '#e8e4dc' };
      if (d.shoes.kind === 'sandal') d.shoes.col = of([c2('#5a3a26', '#3a2418'), c2('#c08a56', '#8e6440'), c2('#2a2a32', '#1c1c22')], 22);
      if (r(23) < 0.15) d.glasses = true;
      if (r(24) < 0.16) d.hat = { kind: of(['cap', 'capback', 'flatcap'], 25), col: of(TOPCOLS, 26) };
      if (!f && r(27) < 0.3) d.beard = of(['#2a1c16', '#6a4a2a', '#8a8078', '#3a2418'], 28);
      if (r(29) < 0.1) d.phones = true;
      var bg = r(30); if (bg < 0.12) d.bag = { kind: 'tote', col: of([c2('#d8ccb0', '#a89c80'), c2('#c8508a', '#9a3a68'), c2('#5a7a8a', '#40606c')], 31) }; else if (bg < 0.24) d.bag = { kind: 'backpack', col: of([c2('#26262c', '#18181c'), c2('#3a4a5a', '#2a3644'), c2('#e08a3a', '#b46a28')], 31) };
      if (r(32) < 0.08) d.socks = c2('#ece8e0', '#bdb7ac');
      out['p' + i] = d;
    }
    return out;
  }
  window.StreetWalk = { make: make, CAST: CAST, FRAMES: N, dress: dress, generate: generate };
})();
