/* Merge Notes street: the people, third style (approved 2026-11-23 as "Woman redesign v5").
   Drawn at twice the street's pixel density (each street pixel is 2 x 2 fine ones), from one body shape per sex,
   with an upright back, a plain face (no features), two tones per material placed as shapes, a fixed-width brush
   for limbs (no flicker) and a clean-up pass for stray pixels. Women walk the catwalk step; men a steadier one.
   Everyone has three outfits: summer, rain and cold.
   StreetBody.make(def, climate, heightPx, stand) -> { fw, fh, footX, footY (fine pixels), n, cycle (street px),
   paint(g, frame, x0) }. StreetBody.cast() -> the cast. */
(function () {
  'use strict';
  var D = 2, N = 16, TAU = Math.PI * 2, rad = Math.PI / 180;
  var FW = 64, FH = 98, GY = 93, CX = 30, W2 = FW * D, H2 = FH * D;

  // ---------------------------------------------------------------- the pixel buffer (fine pixels, scaled about the feet)
  // (sized to the person: a small person gets a small buffer, so the little ones in windows and cars cost little)
  function Buf(k) { this.k = k; this.w = Math.ceil(FW * k * D) + 2; this.h = Math.ceil(FH * k * D) + 2; this.c = new Array(this.w * this.h); }
  Buf.prototype.mx = function (x) { return x * this.k * D; };
  Buf.prototype.my = function (y) { return y * this.k * D; };
  Buf.prototype.px = function (x, y, col) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col; };
  Buf.prototype.set = function (x, y, col) { this.px(Math.floor(this.mx(x)), Math.floor(this.my(y)), col); };
  function inPoly(pts, x, y) { var c = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  Buf.prototype.poly = function (pts, col) {
    var self = this, q = pts.map(function (p) { return [self.mx(p[0]), self.my(p[1])]; }), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    q.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    for (var y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++) for (var x = Math.max(0, Math.floor(x0)); x <= Math.min(this.w - 1, Math.ceil(x1)); x++) if (inPoly(q, x + 0.5, y + 0.5)) this.px(x, y, col);
  };
  Buf.prototype.ell = function (cx, cy, rx, ry, col) {
    cx = this.mx(cx); cy = this.my(cy); rx *= D * this.k; ry *= D * this.k;
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.px(x, y, col); }
  };
  var BRUSH = {};
  function brush(d) { if (BRUSH[d]) return BRUSH[d]; var out = [], r = d / 2; for (var y = 0; y < d; y++) for (var x = 0; x < d; x++) { var dx = x + 0.5 - r, dy = y + 0.5 - r; if (dx * dx + dy * dy <= r * r + 0.3) out.push([x - Math.floor(r), y - Math.floor(r)]); } return (BRUSH[d] = out); }
  Buf.prototype.seg = function (a, b, wa, wb, col) {
    var A = [this.mx(a[0]), this.my(a[1])], Bq = [this.mx(b[0]), this.my(b[1])], n = Math.max(1, Math.ceil(Math.hypot(Bq[0] - A[0], Bq[1] - A[1]) * 2)), self = this, kk = D * this.k;
    for (var i = 0; i <= n; i++) { var u = i / n, d = Math.max(1, Math.round((wa + (wb - wa) * u) * kk)), x = A[0] + (Bq[0] - A[0]) * u, y = A[1] + (Bq[1] - A[1]) * u;
      brush(d).forEach(function (o) { self.px(Math.round(x) + o[0], Math.round(y) + o[1], col); }); }
  };
  Buf.prototype.clean = function () {
    var c = this.c, out = c.slice(), W = this.w;
    for (var y = 1; y < this.h - 1; y++) for (var x = 1; x < W - 1; x++) {
      var i = y * W + x, me = c[i], nb = [c[i - 1], c[i + 1], c[i - W], c[i + W]];
      if (nb.indexOf(me) >= 0) continue;
      var cnt = {}, best = null, bn = 0; nb.forEach(function (v) { var k = v || '_'; cnt[k] = (cnt[k] || 0) + 1; if (cnt[k] > bn) { bn = cnt[k]; best = v; } });
      if (bn >= 3) out[i] = best;
    }
    this.c = out;
  };
  function rot(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function dirv(a, l) { return [Math.sin(a) * l, Math.cos(a) * l]; }
  function lerp(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
  function cr(a, b, c, d, u) { return 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u); }
  // a colour lighter (f > 1, a little warmer) or darker (f < 1, a little cooler)
  var adjC = {};
  function adj(hex, f) {
    var key = hex + f; if (adjC[key]) return adjC[key];
    var n = parseInt(hex.slice(1), 16), c = [((n >> 16) & 255) * f, ((n >> 8) & 255) * f, (n & 255) * f];
    if (f < 1) { var t = (1 - f) * 40; c = [c[0] - t * 0.5, c[1] - t * 0.2, c[2] + t * 0.6]; } else { var u = (f - 1) * 40; c = [c[0] + u * 0.5, c[1] + u * 0.3, c[2] - u * 0.3]; }
    return (adjC[key] = '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''));
  }
  function tones(hex) { return { b: hex, s: adj(hex, 0.78), d: adj(hex, 0.62), h: adj(hex, 1.16) }; }

  // ---------------------------------------------------------------- walks
  // one leg through a stride: thigh (+ forward), knee bend, foot pitch. Women: the catwalk step (approved).
  var WALK_F = [[16, 2, 0], [12, 5, 0], [3, 3, 0], [-7, 2, 0], [-15, 6, -12], [-10, 30, -32], [4, 36, -20], [14, 10, -6]];
  var WALK_M = [[19, 4, 10], [15, 12, 0], [4, 7, 0], [-8, 4, 0], [-17, 9, -16], [-11, 32, -30], [6, 38, -12], [17, 11, 4]];
  function legKey(keys, t) { t = ((t % 1) + 1) % 1; var x = t * keys.length, i = Math.floor(x), u = x - i, n = keys.length, o = []; for (var k = 0; k < 3; k++) o.push(cr(keys[(i - 1 + n) % n][k], keys[i][k], keys[(i + 1) % n][k], keys[(i + 2) % n][k], u)); return o; }
  // shoes in a foot's own frame (ankle at 0,0, toe +x): a stiletto, a flat shoe, a boot (ankle height comes from its shaft)
  var SHOES = {
    heels: { pts: [[-1.3, -0.9], [0.9, -0.9], [4.4, 1.7], [5.8, 2.9], [5.6, 3.2], [1.4, 3.1], [0.4, 2.2], [-0.2, 2.2], [-0.25, 4.3], [-0.85, 4.3], [-1.5, 1.0]], instep: [[-0.6, -0.9], [0.9, -0.9], [3.4, 0.9], [2.2, 1.3], [0.2, 0.6]], pitch: 14, sole: 4.3 },
    flat: { pts: [[-1.6, -1.0], [1.2, -1.2], [4.8, 0.8], [5.2, 2.2], [4.6, 2.6], [-1.6, 2.6], [-2.0, 1.2]], pitch: 0, sole: 2.6 },
    boot: { pts: [[-1.8, -2.2], [1.4, -2.2], [1.6, -0.6], [5.0, 0.8], [5.4, 2.2], [4.8, 2.8], [-1.8, 2.8], [-2.2, 1.0]], pitch: 0, sole: 2.8 }
  };

  // ---------------------------------------------------------------- one person, one outfit
  // def: { sex, age, k (height: 1 = 70 px), wide, bust, hips, belly, skin: [b, s, d, h], hair: { style, col }, beard }
  // outfit: { top, bottom, legs, shoes, coat, scarf, hat, umbrella, bag, gloves } (see the cast below)
  // opts (or true for standing): { stand, sit (on a chair: thighs forward, shins down), arms: function (t) -> { n: [a, e],
  // f: [a, e] } (the upper arm's angle from straight down, + forward, and the elbow's bend, in degrees; either may be
  // left out), back (seen from behind, sitting on a stool: kind eat, drink, phone or talk; seat: its height in the
  // same units as heightPx), tray, cloth (something in the near hand), n (frames) }
  function make(def, outfit, heightPx, opts) {
    if (opts === true || opts === false) opts = { stand: opts };
    opts = opts || {};
    var stand = !!(opts.stand || opts.sit || opts.back), sit = !!opts.sit, NF = opts.n || N;
    var f = def.sex === 'f', kid = def.age === 'kid', elder = def.age === 'elder';
    var K = (heightPx || 70) / 70, keys = f ? WALK_F : WALK_M, amp = elder ? 0.7 : kid ? 1.05 : 1;
    var shoe = SHOES[outfit.shoes.kind === 'heels' ? 'heels' : outfit.shoes.kind === 'boots' ? 'boot' : 'flat'];
    var legScale = kid ? 0.86 : 1, THIGH = 17 * legScale, SHIN = 16.4 * legScale, headK = kid ? 1.32 : 1;
    var XS = (f ? 1.38 : 1.5) * (def.wide || 1);       // how wide the body is drawn (the side view of a person in three-quarter)
    function legFrom(hip, a, kn, ft) {
      var knee = add(hip, dirv(a * rad, THIGH)), ank = add(knee, dirv((a - kn) * rad, SHIN)), r = -(ft - shoe.pitch) * rad;
      return { hip: hip, knee: knee, ank: ank, foot: shoe.pts.map(function (p) { return add(ank, rot(p, r)); }), instep: shoe.instep ? shoe.instep.map(function (p) { return add(ank, rot(p, r)); }) : null };
    }
    function legs(t) {
      var tw = stand ? 0 : Math.cos(t * TAU), nL, fL;
      if (sit) { nL = legFrom([CX + 0.7, 0], 84, 84, 0); fL = legFrom([CX - 0.6, 0], 78, 74, 0); }
      else if (stand) { nL = legFrom([CX + 0.8, 0], 2, 1, 0); fL = legFrom([CX - 0.6, 0], f ? 9 : 4, f ? 18 : 6, f ? -8 : 0); }
      else { var kn = legKey(keys, t), kf = legKey(keys, t + 0.5); nL = legFrom([CX + 0.7 * tw, 0], kn[0] * amp, kn[1] * (0.5 + 0.5 * amp), kn[2] * amp); fL = legFrom([CX - 0.7 * tw, 0], kf[0] * amp, kf[1] * (0.5 + 0.5 * amp), kf[2] * amp); }
      var low = -1e9; nL.foot.concat(fL.foot).forEach(function (p) { low = Math.max(low, p[1]); });
      return { n: nL, f: fL, dy: GY - low };
    }
    var cycle = 0;
    if (!stand) { for (var q = 1; q < N / 2; q++) cycle += legs((q - 1) / N).n.ank[0] - legs(q / N).n.ank[0]; cycle = cycle / (N / 2 - 1) * N * K; }

    var S = tones(def.skin), H = tones(def.hair.col), top = outfit.top ? tones(outfit.top.col) : null, bot = tones(outfit.bottom.col), sh = tones(outfit.shoes.col);
    var coat = outfit.coat ? tones(outfit.coat.col) : null, legCol = outfit.legs && outfit.legs !== 'bare' ? tones(outfit.legs) : null;

    function frame(t) {
      var B = new Buf(K), L = legs(t), tw = stand ? 0 : Math.cos(t * TAU);
      var dy = Math.round(L.dy * D * K) / (D * K);
      [L.n, L.f].forEach(function (g) { ['hip', 'knee', 'ank'].forEach(function (k) { g[k] = [g[k][0], g[k][1] + dy]; }); g.foot = g.foot.map(function (p) { return [p[0], p[1] + dy]; }); if (g.instep) g.instep = g.instep.map(function (p) { return [p[0], p[1] + dy]; }); });
      var nL = L.n, fL = L.f, pel = [CX, dy], sway = stand ? (f ? 0.9 : 0) : (f ? 0.5 : 0.15) * Math.sin(t * TAU * 2), shTw = stand ? 0 : -0.25 * tw;
      var lean = elder ? 0.4 : 0;                        // (an upright back for everyone; the elderly just a touch forward)
      function T(p) { return [pel[0] + p[0] * XS * (p[1] < -12 ? 1 - 0.14 * Math.min(1, (-p[1] - 12) / 10) : 1) + (p[1] < -10 ? shTw * (-p[1] - 10) / 12 : 0) + (p[1] < -8 ? lean * (-p[1] - 8) / 15 : 0), pel[1] + p[1]]; }
      var lag = stand ? 0 : 0.9 * Math.sin(t * TAU * 2 - 0.9);
      var bust = f && !kid ? (def.bust === undefined ? 1 : def.bust) : 0, hips = def.hips || (f ? 1 : 0.4), belly = def.belly || 0;
      // the chest follows the step a moment late, a little (more for a fuller bust); still when standing or sitting
      var bb = stand ? 0 : 0.32 * bust * Math.sin(t * TAU * 2 - 1.3), gv = Math.max(0, bust - 1) * 0.8;   // (a fuller bust sits a little lower)
      var AR = opts.arms ? opts.arms(t) : null;

      // ----- arms
      var UA = (f ? 10.5 : 11) * (kid ? 0.84 : 1), FA = (f ? 9.5 : 10) * (kid ? 0.84 : 1), swingAmp = (f ? 12 : 17) * (elder ? 0.6 : 1);
      function armSwing(sw, s0, carry) { var a = sw * swingAmp * (carry ? 0.2 : 1) * rad, e = ((carry ? 40 : 12) + 10 * Math.max(0, sw)) * rad, el = add(s0, dirv(a, UA)), wr = add(el, dirv(a + e, FA)); return { s: s0, e: el, w: wr, h: add(wr, dirv(a + e, 1.6)) }; }
      function armPose(s0, p) { var a = p[0] * rad, e = (p[1] || 0) * rad, el = add(s0, dirv(a, UA)), wr = add(el, dirv(a + e, FA)); return { s: s0, e: el, w: wr, h: add(wr, dirv(a + e, 1.6)) }; }
      var aw = f ? [2.8, 2.3, 1.7] : [3.3, 2.8, 2.2];
      if (def.wide > 1.15) aw = aw.map(function (v) { return v * 1.18; });
      function sleeveOf() { if (coat) return { len: 2, c: coat }; if (!outfit.top) return null; var k = outfit.top.kind; return k === 'tank' ? null : k === 'tee' || k === 'polo' ? { len: 0.5, c: top } : k === 'knit' || k === 'shirtL' ? { len: 2, c: top } : { len: 0.45, c: top }; }
      function drawArm(A, far) {
        var c = far ? S.s : S.b, s2 = far ? S.d : S.s, sl = sleeveOf();
        B.seg(A.s, A.e, aw[0], aw[1], c); B.seg(A.e, A.w, aw[1], aw[2], c);
        B.seg([A.s[0] - 0.8, A.s[1] + 0.6], [A.e[0] - 0.7, A.e[1]], 0.9, 0.7, s2); B.seg([A.e[0] - 0.6, A.e[1]], [A.w[0] - 0.5, A.w[1]], 0.7, 0.5, s2);
        if (sl) {
          var sc = far ? sl.c.s : sl.c.b, ss = far ? sl.c.d : sl.c.s, end = sl.len <= 1 ? lerp(A.s, A.e, sl.len) : A.e;
          B.seg(A.s, end, aw[0] + 0.6, aw[1] + 0.5, sc); B.seg([A.s[0] - 0.8, A.s[1] + 0.6], [end[0] - 0.7, end[1]], 0.9, 0.7, ss);
          if (sl.len > 1) { var cuff = lerp(A.e, A.w, 0.84); B.seg(A.e, cuff, aw[1] + 0.5, aw[2] + 0.6, sc); B.seg([A.e[0] - 0.6, A.e[1]], [cuff[0] - 0.5, cuff[1]], 0.7, 0.6, ss); }
          if (!far) B.seg([A.s[0] + 0.6, A.s[1] - 0.4], lerp(A.s, end, 0.6), 0.5, 0.5, sl.c.h);
        } else if (!far) B.seg([A.s[0] + 0.6, A.s[1] - 0.4], lerp(A.s, A.e, 0.6), 0.5, 0.5, S.h);
        var hc = outfit.gloves ? (far ? '#1a161a' : '#2a2428') : c; B.ell(A.h[0], A.h[1], 1.0, 1.3, hc); B.ell(A.h[0] + 0.3, A.h[1] + 0.8, 0.6, 0.6, outfit.gloves ? '#141014' : s2);
      }
      var fA = AR && AR.f ? armPose(T([-0.2, -21]), AR.f) : stand ? armSwing(0.15, T([-0.2, -21])) : armSwing(tw, T([-0.2, -21]));
      drawArm(fA, true);

      // ----- hair that hangs behind
      var hs = def.hair.style, tip = T([-2.7 - lag * 0.8, hs === 'long' ? -15.5 : -21]);
      if (hs === 'long' || hs === 'curly') {
        B.poly([T([-2.9, -32]), T([0.2, -34.6]), T([-0.4, -23]), [tip[0] + 2.2, tip[1]], [tip[0] - 0.9, tip[1] + 1.2], [tip[0] - 1.5, tip[1] - 1.5], T([-3.4, -26])], H.s);
        for (var st = 0; st < 3; st++) B.seg(T([-2.3 + st * 0.8, -30]), [tip[0] - 0.4 + st * 0.9, tip[1] - 0.4], 0.5, 0.5, st === 1 ? H.h : H.b);
      }
      if (hs === 'pony') { var tie = T([-2.6, -31.4]), end = add(tie, dirv((-20 + 12 * Math.sin(t * TAU * 2 - 0.8)) * rad, 8)); B.seg(tie, end, 2.2, 0.8, H.s); B.seg(tie, lerp(tie, end, 0.7), 0.6, 0.5, H.h); }

      // ----- legs
      function drawLeg(g, far) {
        var lc = legCol || S, c = far ? lc.s : lc.b, s2 = far ? lc.d : lc.s;
        var thick = (f ? [6.6, 3.8, 4.4, 2.0] : [7.0, 4.4, 4.6, 2.6]).map(function (v) { return v * (def.wide > 1.15 ? 1.15 : 1) * (kid ? 0.82 : 1); });
        B.seg(g.hip, g.knee, thick[0], thick[1], c); B.seg(g.knee, g.ank, thick[1] - 0.2, thick[3], c); B.seg(lerp(g.knee, g.ank, 0.18), lerp(g.knee, g.ank, 0.45), thick[2], thick[2] - 0.8, c);
        B.seg([g.hip[0] - 2.2, g.hip[1]], [g.knee[0] - 1.2, g.knee[1]], 1.4, 0.8, s2); B.seg([lerp(g.knee, g.ank, 0.15)[0] - 1.4, lerp(g.knee, g.ank, 0.15)[1]], [g.ank[0] - 0.6, g.ank[1]], 1.2, 0.6, s2);
        if (!far) { B.ell(g.knee[0] + 0.9, g.knee[1] - 0.2, 0.7, 0.9, lc.h); B.seg([lerp(g.knee, g.ank, 0.25)[0] + 0.8, lerp(g.knee, g.ank, 0.25)[1]], [lerp(g.knee, g.ank, 0.7)[0] + 0.5, lerp(g.knee, g.ank, 0.7)[1]], 0.5, 0.5, lc.h); }
        // trousers and shorts over the leg
        var bk = outfit.bottom.kind;
        if (bk === 'trousers' || bk === 'jeans' || bk === 'shorts') {
          var len = outfit.bottom.len || (bk === 'shorts' ? 0.45 : 2), bc = far ? bot.s : bot.b, bs = far ? bot.d : bot.s;
          var e1 = len <= 1 ? lerp(g.hip, g.knee, len) : g.knee;
          B.seg(g.hip, e1, thick[0] + 0.7, (len <= 1 ? thick[0] - 1 : thick[1]) + 0.9, bc); B.seg([g.hip[0] - 2.2, g.hip[1]], [e1[0] - 1.4, e1[1]], 1.4, 1.0, bs);
          if (len > 1) { var e2 = lerp(g.knee, g.ank, len - 1); B.seg(g.knee, e2, thick[1] + 0.9, thick[3] + 1.4, bc); B.seg([g.knee[0] - 1.3, g.knee[1]], [e2[0] - 0.9, e2[1]], 1.1, 0.8, bs); if (!far) { B.set(g.knee[0] + 1.2, g.knee[1], bot.h); B.seg([g.knee[0] + 1.0, g.knee[1] + 1], [e2[0] + 0.8, e2[1] - 1], 0.5, 0.5, bot.h); } }
          if (bk === 'jeans' && !far) B.seg([g.hip[0] + 1.4, g.hip[1] + 1], [e1[0] + 1.2, e1[1]], 0.5, 0.5, bot.d);   // a seam
        }
        // shoes
        var scol = far ? sh.s : sh.b;
        if (shoe === SHOES.boot) { B.seg(lerp(g.ank, g.knee, outfit.shoes.tall ? 0.6 : 0.28), g.ank, thick[3] + 1.6, thick[3] + 1.6, scol); }
        if (g.instep && (!legCol)) B.poly(g.instep, c);
        B.poly(g.foot, scol); if (g.instep && !legCol) B.poly(g.instep, c); else if (g.instep) B.poly(g.instep, far ? legCol.s : legCol.b);
        if (shoe === SHOES.heels) B.seg([g.ank[0] - 1.1, g.ank[1] - 0.2], [g.ank[0] + 1.1, g.ank[1] - 0.6], 0.6, 0.6, scol);
        if (outfit.shoes.kind === 'sneakers') B.seg(g.foot[5], g.foot[3], 0.8, 0.8, '#ece8e0');
        if (outfit.shoes.kind === 'sandals') { B.poly(g.foot, c); B.seg(g.foot[5], g.foot[4], 0.6, 0.6, scol); B.seg([g.ank[0] + 0.2, g.ank[1] + 0.4], [g.ank[0] + 2.6, g.ank[1] + 1.8], 0.6, 0.6, scol); }
        if (!far) B.seg(g.foot[1], g.foot[2], 0.5, 0.5, sh.h);
      }
      drawLeg(fL, true); drawLeg(nL, false);

      // ----- the body (an upright back), then what they wear on it
      var body = f
        ? [[-0.8, -23.4], [1.4, -23], [2.4, -19.4], [2.4 + 1.0 * bust, -17.8 + gv * 0.3 + bb * 0.4], [2.4 + 1.85 * bust, -16.0 + gv * 0.7 + bb * 0.7], [2.4 + 2.0 * bust, -14.8 + gv + bb], [2.4 + 1.75 * bust, -13.7 + gv + bb * 0.8], [2.4 + 1.1 * bust, -12.7 + gv * 0.8 + bb * 0.6], [2.4 + 0.3 * bust, -12.2 + gv * 0.5 + bb * 0.4], [2.0, -11], [1.8 + belly * 0.6, -8.6], [2.6 + belly * 0.8, -4.4], [2.2, -1], [-2.4 - hips * 1.2, -1], [-2.4 - hips * 0.6, -5], [-2.2, -8.8], [-2.3, -13], [-2.4, -18], [-2.1, -21.8]]
        : [[-1.0, -23.6], [1.5, -23.2], [2.6, -20.4], [2.95, -17], [3.0 + belly * 0.3, -13], [2.6 + belly * 0.9, -9], [2.6 + belly * 0.8, -4.4], [2.2, -1], [-2.6 - hips, -1], [-2.5, -5], [-2.4, -9], [-2.6, -13], [-2.7, -18], [-2.4, -22]];
      var bodyT = body.map(T);
      B.poly(bodyT, S.b);
      B.poly([T([-2.4, -18]), T([-2.1, -21.8]), T([-1.8, -21.9]), T([-2.0, -17.6]), T([-2.0, -13]), T([-2.3, -13])], S.s);
      // the top: from the shoulders to the waist (a tank scoops at the neck and leaves the shoulders bare)
      if (outfit.top) {
        var tk = outfit.top.kind, hem = outfit.top.hem || -8.6, upper = tk === 'tank' ? [[-1.6, -21.4], [-0.8, -21.0], [0.6, -19.0], [2.2, -18.6], [2.6, -19.6]] : [[-1.0, -23.0], [1.4, -22.8], [2.4, -19.6]];
        var shape = upper.concat(body.filter(function (p) { return p[1] > -19.6 && p[1] < hem && p[0] > 0; }), [[body[f ? 10 : 7][0] + 0.2, hem], [-2.4 - (hem > -6 ? hips * 0.6 : 0), hem]], body.filter(function (p) { return p[1] < hem && p[1] > -22.6 && p[0] < 0 && p[1] < -6; }).reverse());
        B.poly(shape.map(T), top.b);
        B.poly([T([-2.4, -18]), T([-2.2, -20.8]), T([-1.9, -20.8]), T([-2.0, -17]), T([-2.0, hem + 0.2]), T([-2.4, hem])], top.s);   // its far side
        if (f && bust > 0.15) { B.poly([T([2.0, -13.6 + gv + bb]), T([2.4 + 1.4 * bust, -14.2 + gv + bb]), T([2.4 + 0.6 * bust, -12.8 + gv + bb * 0.5]), T([2.0, -12.0])], top.s); B.seg(T([2.4 + 1.6 * bust, -16.2 + gv * 0.7 + bb * 0.7]), T([2.4 + 1.9 * bust, -15.0 + gv + bb]), 0.5, 0.5, top.h); }
        B.seg(T([-1.0, -12.0]), T([0.8, -10.4]), 0.5, 0.5, top.s); B.seg(T([-1.6, -10.4]), T([-0.2, -9.6]), 0.5, 0.5, top.d);   // folds
        if (tk === 'tank') { B.seg(T([-1.6, -21.4]), T([-0.4, -23.2]), 0.5, 0.5, top.b); B.seg(T([0.0, -21.6]), T([1.6, -21.0]), 0.5, 0.5, S.s); }
        if (tk === 'shirt' || tk === 'polo' || tk === 'shirtL') { B.poly([T([-1.2, -23.6]), T([1.6, -23.2]), T([2.2, -21.8]), T([0.6, -22.0])], top.h); for (var by = -20; by > hem; by -= 3) B.set(T([2.2 + (by < -15 ? bust * 1.4 : 0), by])[0], T([0, by])[1], top.d); }
        if (outfit.top.stripe) for (var sy = -21; sy < hem; sy += 2) { var fx = null; for (var bi = 1; bi < body.length - 1 && fx === null; bi++) { var p0 = body[bi - 1], p1 = body[bi]; if (p0[0] > 0 && p1[0] > 0 && (p0[1] - sy) * (p1[1] - sy) <= 0 && p0[1] !== p1[1]) fx = p0[0] + (p1[0] - p0[0]) * (sy - p0[1]) / (p1[1] - p0[1]); } B.seg(T([-2.0, sy]), T([(fx === null ? 2.0 : fx) - 0.5, sy]), 0.5, 0.5, outfit.top.stripe); }   // (each stripe ends at the front of the body)
      }
      // the bottom: a skirt or dress over the legs, or a waistband over trousers
      var bk2 = outfit.bottom.kind, hn = lerp(nL.hip, nL.knee, outfit.bottom.len || 0.3), hf = lerp(fL.hip, fL.knee, outfit.bottom.len || 0.3);
      if (bk2 === 'skirt' || bk2 === 'dress') {
        var L2 = outfit.bottom.len || 0.3; if (L2 > 1) { hn = lerp(nL.knee, nL.ank, L2 - 1); hf = lerp(fL.knee, fL.ank, L2 - 1); }
        var seat = T([-2.4 - hips * 1.2 - sway * 0.6, -1.4]), bel = T([2.8 + belly * 0.8, -4]);
        var hy = Math.max(hn[1], hf[1], seat[1] + 3) + 0.4, hF = Math.max(hn[0], hf[0], bel[0]) + 1.4 + (L2 > 1 ? 0.8 : 0), hB = Math.min(hn[0], hf[0], seat[0]) - 1.0 - Math.abs(lag) * (L2 > 1 ? 1.6 : 1);
        var wy = bk2 === 'dress' ? -12 : -9.4;
        B.poly([T([-2.4, wy]), T([2.0, wy]), bel, [hF, hy], [hB, hy + 0.5], seat, T([-2.4 - hips * 0.6, -6])], bot.b);
        B.poly([seat, T([-2.4 - hips * 0.6, -6]), T([-1.6, -6]), [(hF + hB) / 2 - 1, hy], [hB, hy + 0.5]], bot.s);
        B.seg(T([1.9 + belly * 0.6, -7.4]), [hF - 1.0, hy - 0.8], 0.6, 0.5, bot.h); B.seg([hB + 0.8, hy], [hF - 0.6, hy], 0.5, 0.5, bot.s);
        if (bk2 === 'skirt') { B.seg(T([-2.4, -9.0]), T([2.0, -9.0]), 0.9, 0.9, bot.s); B.seg(T([-2.2, -9.4]), T([1.9, -9.4]), 0.5, 0.5, bot.h); }
        if (bk2 === 'dress') { B.poly(bodyT.filter(function (p, i) { return body[i][1] < -8 && body[i][1] > -21; }).concat([T([-2.3, -8.6])]), bot.b); B.poly([T([-1.6, -21.4]), T([-0.8, -21.0]), T([0.6, -19.0]), T([2.2, -18.6]), T([2.4, -21]), T([0.4, -22.6])], S.b); if (f && bust > 0.15) B.poly([T([2.0, -13.6 + gv + bb]), T([2.4 + 1.4 * bust, -14.2 + gv + bb]), T([2.4 + 0.6 * bust, -12.8 + gv + bb * 0.5]), T([2.0, -12.0])], bot.s); }
      } else {
        B.poly([T([-2.6 - hips, -9.6]), T([2.2 + belly * 0.8, -9.6]), T([2.6 + belly * 0.8, -4.4]), T([2.2, -1]), T([1.0, 1.6]), T([-1.8, 1.8]), T([-2.6 - hips, -1])], bot.b);
        B.poly([T([-2.6 - hips, -9.6]), T([-1.6, -9.6]), T([-1.6, 1.4]), T([-1.8, 1.8]), T([-2.6 - hips, -1])], bot.s);
        B.seg(T([-2.6 - hips, -9.2]), T([2.2 + belly * 0.8, -9.2]), 0.9, 0.9, outfit.bottom.belt || bot.d); B.set(T([1.0, -9.2])[0], T([0, -9.2])[1], '#c8b070');
      }
      // an apron (the waiter's): from the waist to the knee in front, a strap round the neck, its ties at the back
      if (outfit.apron) {
        var ap = tones(outfit.apron), kF = nL.knee[0] > fL.knee[0] ? nL.knee : fL.knee, ky = Math.max(nL.knee[1], fL.knee[1]) - 1;
        B.poly([T([-0.6, -10.2]), T([2.4 + belly * 0.8, -10.2]), T([2.9 + belly * 0.8, -4.4]), [kF[0] + 1.6, ky], [kF[0] - 3.2, ky + 0.4]], ap.b);
        B.seg(T([0.2, -9.6]), [kF[0] - 2.4, ky], 0.5, 0.5, ap.s); B.seg(T([2.3 + belly * 0.8, -9.8]), [kF[0] + 1.2, ky - 0.6], 0.5, 0.5, ap.h);
        B.seg(T([1.4, -22.8]), T([2.2 + bust * 0.8, -15]), 0.5, 0.5, ap.b); B.seg(T([-2.4, -9.8]), T([-3.8, -7.4 + lag * 0.4]), 0.6, 0.5, ap.s);
      }
      // a suit: a dark jacket closed at the waist, the shirt and tie showing in the V of its lapels
      if (outfit.coat && outfit.coat.kind === 'suit') {
        var su = tones(outfit.coat.col);
        B.poly([T([-1.4, -24.0]), T([0.2, -23.8]), T([2.2, -15.4]), T([3.1 + belly * 0.3, -13]), T([2.8 + belly * 0.9, -9]), T([2.9 + belly * 0.8, -3.4]), T([2.5, 0.8]), T([-3.0 - hips * 0.5, 1.0]), T([-2.9, -9]), T([-2.9, -18]), T([-2.6, -22.6])], su.b);
        B.poly([T([-2.9, -18]), T([-2.6, -22.6]), T([-2.0, -22.6]), T([-2.1, -9]), T([-2.2, 0.6]), T([-3.0 - hips * 0.5, 1.0]), T([-2.9, -9])], su.s);
        B.seg(T([0.3, -23.6]), T([2.1, -15.8]), 0.6, 0.5, su.h);                                     // the lapel, catching the light
        B.seg(T([1.7, -22.6]), T([2.3, -16.0]), 0.9, 1.1, outfit.coat.tie || '#0e0e12');             // the tie
        B.set(T([2.9, -12.0])[0], T([0, -12.0])[1], su.h); B.seg(T([0.6, -5.6]), T([2.4, -5.6]), 0.5, 0.5, su.d);   // a button, a pocket flap
      } else if (outfit.coat) {
        var ck = outfit.coat.kind, longC = ck === 'trench' || ck === 'long', cl = outfit.coat.len || (longC ? 1.05 : 0), fr, bkp;
        if (longC) { var cn = cl <= 1 ? lerp(nL.hip, nL.knee, cl) : lerp(nL.knee, nL.ank, cl - 1), cf = cl <= 1 ? lerp(fL.hip, fL.knee, cl) : lerp(fL.knee, fL.ank, cl - 1), cy = Math.max(cn[1], cf[1]); fr = [Math.max(cn[0], cf[0]) + 1.4, cy]; bkp = [Math.min(cn[0], cf[0]) - 2.0 - Math.abs(lag) * 1.4, cy + 0.6]; }
        else { var cy2 = ck === 'puffer' ? -2.6 : -1.4; fr = T([2.4 + belly * 0.8, cy2]); bkp = T([-2.8 - hips * (f ? 0.9 : 0.5), cy2]); }
        var pf = ck === 'puffer' ? 0.5 : 0;
        var cpts = [T([-1.2, -24.0]), T([0.6, -23.6]), T([1.0 + pf, -21.4]), T([1.2 + pf, -16.6]), T([1.4 + belly * 0.6 + pf, -9.6]), fr, bkp, T([-2.8 - hips * (f ? 0.9 : 0.5) - pf, -3.0]), T([-2.6 - pf, -9.0]), T([-2.7 - pf, -13]), T([-2.8 - pf, -18]), T([-2.5, -22.4])];
        B.poly(cpts, coat.b);
        B.poly([T([-2.8 - pf, -18]), T([-2.5, -22.4]), T([-2.0, -22.4]), T([-2.1, -18]), T([-2.0, -9.4]), longC ? [bkp[0] + 1.6, bkp[1] - 0.4] : T([-2.2, -3.2]), bkp, T([-2.8 - hips * (f ? 0.9 : 0.5) - pf, -3.0]), T([-2.6 - pf, -9.0]), T([-2.7 - pf, -13])], coat.s);   // its far side
        B.seg(T([1.0 + pf, -21.0]), [fr[0] - 0.6, fr[1] - 0.6], 0.6, 0.5, coat.h);                                                           // its lit front edge
        B.poly([T([-1.4, -24.4]), T([0.8, -24.0]), T([1.4, -22.2]), T([0.2, -22.0]), T([-1.6, -23.2])], coat.d);                             // the collar
        if (ck === 'puffer') for (var qy = -21; qy < -3; qy += 3) B.seg(T([-2.7 - pf, qy]), T([1.2 + pf, qy]), 0.5, 0.5, coat.s);
        if (ck === 'trench' || outfit.coat.belt) { B.seg(T([-2.6, -9.2]), T([1.4 + belly * 0.6, -9.2]), 0.9, 0.9, coat.d); B.set(T([0.4, -9.2])[0], T([0, -9.2])[1], '#c8b070'); }
        if (ck === 'rain') B.seg(T([0.2, -20]), longC ? [fr[0] - 2, fr[1] - 1] : T([0.4, -3]), 0.5, 0.5, coat.h);
        if (ck === 'rain' && outfit.coat.hood) { B.poly([T([-1.9, -21.8]), T([-2.7, -22.3]), T([-2.7, -23.7]), T([-1.6, -24.0])], coat.s); B.seg(T([-2.5, -23.4]), T([-1.7, -23.6]), 0.5, 0.5, coat.d); }   // a hood folded down at the back of the neck
      }
      if (outfit.bag) {
        var bg = tones(outfit.bag.col);
        if (outfit.bag.kind === 'backpack') { B.poly([T([-2.4, -21]), T([-5.0, -20]), T([-5.4, -11]), T([-2.4, -10.4])], bg.b); B.poly([T([-5.0, -20]), T([-4.2, -20.2]), T([-4.6, -11]), T([-5.4, -11])], bg.s); B.seg(T([-1.0, -22]), T([1.2, -13]), 0.8, 0.8, bg.d); }
        else { var sw2 = lag * 0.6; B.seg(T([0.8, -22.4]), T([-1.6 + sw2, -9.4]), 0.6, 0.6, bg.d); B.poly([T([-4.4 + sw2, -10.2]), T([0.0 + sw2, -10.2]), T([0.4 + sw2, -4.0]), T([-4.6 + sw2, -3.8])], bg.b); B.poly([T([-4.6 + sw2, -5.2]), T([0.3 + sw2, -5.2]), T([0.4 + sw2, -4.0]), T([-4.6 + sw2, -3.8])], bg.s); B.seg(T([-4.2 + sw2, -9.8]), T([-0.2 + sw2, -9.8]), 0.5, 0.5, bg.h); }
      }
      if (outfit.scarf) { var sc2 = tones(outfit.scarf); B.seg(T([-1.6, -22.6]), T([1.6, -22.0]), 2.0, 2.0, sc2.b); B.seg(T([-1.4, -23.4]), T([1.4, -22.8]), 0.6, 0.6, sc2.h); var se = T([0.8, -22.2]); B.seg(se, add(se, dirv((-6 + 10 * Math.sin(t * TAU * 2 - 0.6)) * rad, 7)), 1.6, 1.3, sc2.s); }

      // ----- neck and head: a plain face (no features), hair over it
      B.poly([T([0.2, -23]), T([1.6, -23]), T([1.9, -25.6]), T([0.4, -25.8])], S.s);
      var H0 = [T([0, 0])[0] - 1.1, T([0, 0])[1]];   // (the head over the shoulders, not ahead of them)
      function Hd(p) { return [H0[0] + p[0] * headK, H0[1] - 25.4 + (p[1] + 25.4) * headK]; }
      var bald = hs === 'bald' || hs === 'buzz';
      B.ell(Hd([1.2, -30.2])[0], Hd([1.2, -30.2])[1], 3.9 * headK, 4.7 * headK, bald ? S.b : H.b);
      var face = f ? [[1.6, -33.2], [4.2, -32.8], [5.0, -31.2], [5.3, -29.4], [5.1, -27.6], [4.4, -26.4], [3.0, -25.5], [1.0, -27.4], [1.2, -30.4]]
                   : [[1.6, -33.4], [4.4, -33.0], [5.2, -31.2], [5.5, -29.4], [5.4, -27.2], [4.8, -25.8], [3.0, -25.2], [1.0, -27.4], [1.2, -30.4]];
      B.poly(face.map(Hd), S.b);
      B.poly([Hd([1.0, -27.4]), Hd([3.0, -25.5]), Hd([2.4, -25.4]), Hd([0.8, -26.6])], S.s);                 // under the jaw
      if (def.beard) B.poly([Hd([1.4, -28.6]), Hd([5.0, -28.4]), Hd([5.2, -27.0]), Hd([4.6, -25.8]), Hd([3.0, -25.2]), Hd([1.0, -27.4])], tones(def.beard).b);
      if (outfit.shades) { B.poly([Hd([2.4, -31.6]), Hd([5.4, -31.5]), Hd([5.4, -30.3]), Hd([4.2, -29.9]), Hd([2.6, -30.4])], '#0a0a0e'); B.seg(Hd([4.4, -31.2]), Hd([5.0, -31.2]), 0.4, 0.4, '#5a6478'); }   // dark glasses (an accessory: the face stays plain)
      if (hs === 'long' || hs === 'pony' || hs === 'bun' || hs === 'curly' || hs === 'bob') B.poly([Hd([-1.6, -34.6]), Hd([2.6, -35.2]), Hd([5.0, -33.0]), Hd([5.2, -31.4]), Hd([4.2, -31.8]), Hd([3.4, -31.4]), Hd([2.0, -30.2]), Hd([1.2, -31.6])], H.b);   // a fringe swept across
      if (hs === 'short' || hs === 'buzz') B.poly([Hd([-2.2, -33.4]), Hd([-0.6, -35.2]), Hd([2.8, -35.4]), Hd([4.8, -33.8]), Hd([4.6, -33.0]), Hd([2.2, -33.2]), Hd([0.8, -31.6]), Hd([-1.8, -30.6])], hs === 'buzz' ? H.s : H.b);
      if (hs === 'bob') B.poly([Hd([-2.8, -31.4]), Hd([-1.0, -34.6]), Hd([1.6, -32]), Hd([1.2, -26.4]), Hd([-2.2, -26.6])], H.b);
      if (hs === 'bun') { B.ell(Hd([-1.6, -35.0])[0], Hd([-1.6, -35.0])[1], 2.2 * headK, 1.9 * headK, H.b); B.seg(Hd([-2.4, -35.6]), Hd([-0.8, -36.2]), 0.5, 0.5, H.h); }
      if (hs === 'curly') for (var cu = 0; cu < 7; cu++) { var ca = cu / 7 * Math.PI * 1.3 + 0.6; B.ell(Hd([1.0 + Math.cos(ca) * -4.2, -31 - Math.sin(ca) * 4.6])[0], Hd([1.0 + Math.cos(ca) * -4.2, -31 - Math.sin(ca) * 4.6])[1], 1.5 * headK, 1.5 * headK, cu % 2 ? H.b : H.s); }
      if (hs === 'bald' && def.age === 'elder') B.poly([Hd([-2.8, -30.6]), Hd([0.4, -30.8]), Hd([0.6, -27.6]), Hd([-2.4, -27.4])], H.b);
      if (!bald) { B.seg(Hd([-0.6, -34.8]), Hd([3.4, -34.4]), 0.5, 0.5, H.h); for (var hz = 0; hz < 3; hz++) B.seg(Hd([-1.8 + hz * 0.9, -34.2]), Hd([-2.2 + hz * 0.9, -31.0]), 0.5, 0.5, hz % 2 ? H.h : H.s); }   // strands at the back of the head only (nothing on the face)
      if (outfit.hat) {
        var ht = tones(outfit.hat.col), hk = outfit.hat.kind;
        if (hk === 'beanie') { B.poly([Hd([-3.2, -31.6]), Hd([-2.4, -35.6]), Hd([1.2, -36.8]), Hd([4.4, -35.4]), Hd([5.0, -32.4])], ht.b); B.seg(Hd([-3.2, -31.8]), Hd([5.0, -32.6]), 1.2, 1.2, ht.s); B.ell(Hd([1.0, -37.2])[0], Hd([1.0, -37.2])[1], 1.0, 0.9, ht.h); }
        if (hk === 'cap') { B.poly([Hd([-3.0, -32.0]), Hd([-2.0, -35.6]), Hd([1.6, -36.4]), Hd([4.4, -35.0]), Hd([4.8, -32.6])], ht.b); B.poly([Hd([3.6, -33.0]), Hd([7.2, -32.6]), Hd([7.2, -31.9]), Hd([3.6, -32.1])], ht.s); }
        if (hk === 'sunhat') { B.ell(Hd([1.0, -34.4])[0], Hd([1.0, -34.4])[1], 3.6 * headK, 2.4 * headK, ht.b); B.poly([Hd([-5.4, -32.4]), Hd([7.4, -32.6]), Hd([6.8, -31.6]), Hd([-4.8, -31.4])], ht.b); B.seg(Hd([-2.6, -33.0]), Hd([4.6, -33.2]), 0.8, 0.8, ht.d); }
      }

      // ----- the near arm, and an umbrella in its hand
      var ns = T([0.4, -21]), nA;
      if (AR && AR.n) nA = armPose(ns, AR.n);
      else if (stand && f && opts.hip) { var hand = T([1.6, -7.2]), el = [ns[0] - 6.5, ns[1] + 8]; nA = { s: ns, e: el, w: hand, h: add(hand, [0.6, 0.4]) }; }   // (a hand on the hip, when asked for)
      else if (stand) nA = armPose(ns, [5, 12]);                                       // standing: the arm hangs easy
      else nA = armSwing(-tw, ns, !!outfit.umbrella);
      drawArm(nA, false);
      if (opts.tray) { var th0 = nA.h; B.poly([[th0[0] - 4.2, th0[1] - 1.2], [th0[0] + 5.2, th0[1] - 1.2], [th0[0] + 5.0, th0[1] - 0.2], [th0[0] - 4.0, th0[1] - 0.2]], '#b8b4ac'); B.ell(th0[0] + 1.2, th0[1] - 2.4, 2.2, 1.3, '#ece6dc'); B.seg([th0[0] - 0.4, th0[1] - 3.0], [th0[0] + 2.8, th0[1] - 3.0], 0.5, 0.5, '#c84a2a'); }   // a tray with a bowl
      if (opts.cloth) B.ell(nA.h[0] + 0.6, nA.h[1] + 0.6, 1.6, 0.9, opts.cloth);
      B.hands = { n: nA.h, f: fA.h }; B.head = Hd([1.6, -30.2]);
      if (outfit.top && outfit.top.kind === 'tank' && !outfit.coat) B.seg(T([2.4, -19.4]), T([1.8, -21.8]), 0.5, 0.5, top.b);
      if (outfit.umbrella) {
        var uc = tones(outfit.umbrella), uh = nA.h, ut = [uh[0] + 1.2, Hd([0, -37])[1] - 3], ur = 11;
        B.seg(uh, ut, 0.5, 0.5, '#2a2624');
        var dome = [], crown = []; for (var ua = 0; ua <= 16; ua++) { var a4 = Math.PI * ua / 16; dome.push([ut[0] + Math.cos(a4) * ur, ut[1] + 1 - Math.sin(a4) * 6]); crown.push([ut[0] - 2 + Math.cos(a4) * ur * 0.55, ut[1] - 1.6 - Math.sin(a4) * 3.4]); }
        B.poly(dome, uc.b); B.poly(crown, uc.h);
        for (var rb = -2; rb <= 2; rb++) B.seg(ut, [ut[0] + rb * ur * 0.45, ut[1] + 0.6], 0.5, 0.5, uc.s);
        for (var sc3 = -ur; sc3 < ur; sc3 += 2.6) B.ell(ut[0] + sc3 + 1.3, ut[1] + 1.1, 1.3, 0.6, uc.b);
      }
      B.clean();
      return B;
    }

    // ----- seen from behind, sitting on a stool (the bar's customers): calves down to the footrest, the seat, the
    // back of the top or coat, upper arms out to the counter, and the back of the head. Eating bows the head, a
    // drink comes up over the shoulder, a phone bows it further, talking turns it so the edge of the cheek shows.
    function backFrame(t) {
      var B = new Buf(K), kind = opts.kind || 'talk', u = t;
      var lift = kind === 'eat' ? Math.max(0, Math.sin(u * TAU)) : kind === 'drink' ? Math.max(0, Math.sin(Math.max(0, Math.min(1, (u - 0.2) * 2.2)) * Math.PI)) : 0;
      var bow = kind === 'eat' ? 0.9 * (1 - lift) : kind === 'phone' ? 1.3 : 0, turn = kind === 'talk' ? 0.9 * Math.sin(u * TAU) : 0, breath = 0.3 * Math.sin(u * TAU * 2);
      var wd = def.wide || 1, hips = def.hips || (f ? 1 : 0.4), belly = def.belly || 0, ts = kid ? 0.82 : 1;
      var hipY = GY - (opts.seat || 8.5) / K, shY = hipY - 21.5 * ts - breath;
      var bulk = coat ? (outfit.coat.kind === 'puffer' ? 1.14 : 1.06) : 1;
      var shW = (f ? 4.1 : 4.8) * wd * bulk * (kid ? 0.8 : 1), waW = ((f ? 3.1 : 3.7) + belly * 0.7) * wd * bulk * (kid ? 0.85 : 1), hpW = (f ? 3.4 + hips * 1.0 : 3.9) * wd * bulk * (kid ? 0.85 : 1);
      var bk = outfit.bottom.kind, longLeg = (bk === 'trousers' || bk === 'jeans') && (outfit.bottom.len || 2) > 1.5 || (bk === 'dress' || bk === 'skirt') && (outfit.bottom.len || 0.3) > 1.6;
      var calf = longLeg ? bot : legCol || S;
      // calves and heels
      [-1, 1].forEach(function (sd) {
        var x = CX + sd * 2.3 * wd;
        B.seg([x, hipY + 1.4], [x + sd * 0.3, GY - 1.6], 2.8 * (kid ? 0.8 : 1), 2.0, calf.s); B.seg([x - 0.6, hipY + 1.6], [x - 0.3 + sd * 0.3, GY - 2], 0.8, 0.6, calf.d);
        if (shoe === SHOES.boot) B.seg([x + sd * 0.2, outfit.shoes.tall ? hipY + 5 : GY - 4], [x + sd * 0.3, GY - 1.4], 2.6, 2.4, sh.s);
        B.ell(x + sd * 0.3, GY - 0.9, 1.6, 1.0, sh.s); B.ell(x + sd * 0.3, GY - 1.2, 0.9, 0.4, sh.b);
        if (shoe === SHOES.heels) B.seg([x + sd * 0.3, GY - 0.6], [x + sd * 0.3, GY + 0.6], 0.5, 0.5, sh.d);
      });
      // on the seat
      var seatC = coat && (outfit.coat.kind === 'long' || outfit.coat.kind === 'trench') ? coat : bot;
      B.ell(CX, hipY + 0.6, hpW * 1.12, 2.0, seatC.s); B.ell(CX, hipY - 0.2, hpW * 1.04, 1.5, seatC.b);
      // the top or coat across the back (lit from the right)
      var tc = coat || (bk === 'dress' ? bot : top) || S, tank = !coat && (bk === 'dress' || (outfit.top && outfit.top.kind === 'tank'));
      var sl = coat ? coat : outfit.top && outfit.top.kind !== 'tank' ? top : null, slLen = coat || (outfit.top && /knit|shirtL/.test(outfit.top.kind)) ? 2 : 0.5;
      // upper arms out to the elbows on the counter; a drink comes up to the mouth
      var eL = [CX - shW * 1.16 + turn * 0.3, shY + 10], eR = [CX + shW * 1.16 + turn * 0.3, shY + 10];
      if (kind === 'drink') eR = lerp(eR, [CX + shW * 0.7, shY - 0.5], lift);
      [[-1, eL], [1, eR]].forEach(function (q) {
        var sd = q[0], e = q[1], s0 = [CX + sd * shW * 0.82 + turn, shY + 1.6], col = sl && slLen > 1 ? sl : S, colS = col === S ? S : sl;
        B.seg(s0, e, aw0 + 0.4, aw0, sd < 0 ? colS.s : col.b);
        if (sl && slLen <= 1) B.seg(s0, lerp(s0, e, 0.5), aw0 + 0.9, aw0 + 0.6, sd < 0 ? sl.s : sl.b);
        B.seg([s0[0] - 0.6 * sd, s0[1] + 1], [e[0] - 0.5 * sd, e[1]], 0.6, 0.5, (col === S ? S : sl).d);
      });
      if (kind === 'drink' && lift > 0.25) { B.ell(eR[0] - 1.2, eR[1] - 4.2, 1.2, 1.6, '#e8e0d0'); B.ell(eR[0] - 0.6, eR[1] - 1.6, 1.0, 1.2, S.b); }
      var back = [[CX - hpW, hipY], [CX + hpW, hipY], [CX + waW, hipY - 8], [CX + shW + turn, shY + 1.8], [CX + shW * 0.72 + turn, shY], [CX - shW * 0.72 + turn, shY], [CX - shW + turn, shY + 1.8], [CX - waW, hipY - 8]];
      if (tank) { B.poly(back, S.b); B.ell(CX - shW * 0.62 + turn, shY + 1.4, 1.8, 1.4, S.s); }
      var tb = tank ? [[CX - hpW, hipY], [CX + hpW, hipY], [CX + waW, hipY - 8], [CX + shW * 0.74 + turn, shY + 4.4], [CX + shW * 0.45 + turn, shY + 2.0], [CX - shW * 0.45 + turn, shY + 2.0], [CX - shW * 0.74 + turn, shY + 4.4], [CX - waW, hipY - 8]] : back;
      B.poly(tb, tc.b);
      B.poly([tb[0], [CX - hpW * 0.45, hipY], [CX - shW * 0.4 + turn, shY + 2], tb[6], tb[7]], tc.s);                 // the side away from the light
      if (tank) { B.seg([CX - shW * 0.45 + turn, shY + 2.2], [CX - shW * 0.35 + turn, shY - 0.2], 0.6, 0.6, tc.b); B.seg([CX + shW * 0.45 + turn, shY + 2.2], [CX + shW * 0.35 + turn, shY - 0.2], 0.6, 0.6, tc.b); }
      if (coat) { B.seg([CX + turn * 0.6, shY + 1], [CX, hipY - 0.6], 0.5, 0.5, coat.s); if (outfit.coat.kind === 'puffer') for (var qy = shY + 3.5; qy < hipY - 1; qy += 3) B.seg([CX - waW - 0.4, qy], [CX + waW + 0.4, qy], 0.5, 0.5, coat.s); if (outfit.coat.kind === 'trench' || outfit.coat.belt) B.seg([CX - waW, hipY - 6], [CX + waW, hipY - 6], 0.9, 0.9, coat.d); }
      else if (bk !== 'dress' && outfit.top) { B.poly([[CX - hpW, hipY], [CX + hpW, hipY], [CX + hpW * 0.98, hipY - 2.2], [CX - hpW * 0.98, hipY - 2.2]], bot.b); B.seg([CX - hpW, hipY - 2.0], [CX + hpW, hipY - 2.0], 0.6, 0.6, outfit.bottom.belt || bot.d); B.seg([CX - waW + 0.4, hipY - 3.4], [CX + waW - 0.4, hipY - 3.2], 0.5, 0.5, top.s); }
      if (outfit.top && outfit.top.stripe && !coat) for (var sy = shY + 3; sy < hipY - 2.5; sy += 2) B.seg([CX - waW, sy], [CX + waW, sy], 0.5, 0.5, outfit.top.stripe);
      if (outfit.coat && outfit.coat.kind === 'rain' && outfit.coat.hood) B.ell(CX + turn, shY + 1.6, shW * 0.6, 1.6, coat.s);      // the hood, down
      if (outfit.apron) { var apc = tones(outfit.apron).b; B.seg([CX - shW * 0.45 + turn, shY + 0.6], [CX - waW * 0.5, hipY - 5], 0.5, 0.5, apc); B.seg([CX + shW * 0.45 + turn, shY + 0.6], [CX + waW * 0.5, hipY - 5], 0.5, 0.5, apc); B.seg([CX - waW, hipY - 5], [CX + waW, hipY - 5], 0.6, 0.6, apc); }
      if (outfit.bag && outfit.bag.kind === 'backpack') { var bp = tones(outfit.bag.col); B.poly([[CX - shW * 0.6 + turn, shY + 3], [CX + shW * 0.6 + turn, shY + 3], [CX + waW * 0.8, hipY - 3], [CX - waW * 0.8, hipY - 3]], bp.b); B.seg([CX - waW * 0.8, hipY - 3.6], [CX + waW * 0.8, hipY - 3.6], 0.5, 0.5, bp.s); }
      // neck, collar, scarf
      var hx = CX + turn * 1.6, hy = shY - 2.2 - 4.7 * headK + bow;
      B.poly([[hx - 1.2, hy + 3], [hx + 1.2, hy + 3], [CX + 1.4 + turn, shY + 0.6], [CX - 1.4 + turn, shY + 0.6]], S.s);
      if (coat) B.poly([[CX - 2.2 + turn, shY - 0.8], [CX + 2.2 + turn, shY - 0.8], [CX + 2.6 + turn, shY + 1.2], [CX - 2.6 + turn, shY + 1.2]], coat.d);
      else if (outfit.top && /shirt|polo/.test(outfit.top.kind)) B.poly([[CX - 1.8 + turn, shY - 0.4], [CX + 1.8 + turn, shY - 0.4], [CX + 2.0 + turn, shY + 0.8], [CX - 2.0 + turn, shY + 0.8]], top.h);
      if (outfit.scarf) { var scf = tones(outfit.scarf); B.poly([[CX - 2.6 + turn, shY - 1.2], [CX + 2.6 + turn, shY - 1.2], [CX + 2.8 + turn, shY + 1.0], [CX - 2.8 + turn, shY + 1.0]], scf.b); B.seg([CX - 2.4 + turn, shY - 0.6], [CX + 2.4 + turn, shY - 0.6], 0.5, 0.5, scf.h); }
      // the back of the head: ears and nape, then the hair (or a bald head), then any hat
      var hs = def.hair.style, rx = 3.8 * headK, ry = 4.6 * headK;
      B.ell(hx, hy, rx, ry, S.s);
      if (turn > 0.45) B.ell(hx + rx * 0.82, hy + 0.8, 0.9, ry * 0.5, S.b);                             // the edge of the cheek as they turn
      if (hs === 'bald') { B.ell(hx, hy - 0.3, rx * 0.96, ry * 0.94, S.b); B.ell(hx + rx * 0.3, hy - ry * 0.5, rx * 0.35, ry * 0.2, S.h); if (elder) B.poly([[hx - rx, hy - 0.4], [hx + rx, hy - 0.4], [hx + rx * 0.9, hy + ry * 0.55], [hx - rx * 0.9, hy + ry * 0.55]], H.b); }
      else {
        if (hs === 'long') B.poly([[hx - rx * 1.02, hy - ry * 0.2], [hx + rx * 1.02, hy - ry * 0.2], [hx + rx * 0.86, shY + 7], [hx - rx * 0.9, shY + 7.4]], H.b);
        if (hs === 'bob') B.poly([[hx - rx * 1.08, hy - ry * 0.2], [hx + rx * 1.08, hy - ry * 0.2], [hx + rx * 1.02, hy + ry * 0.95], [hx - rx * 1.02, hy + ry * 0.95]], H.b);
        var cy = hs === 'short' || hs === 'buzz' ? hy - ry * 0.16 : hy - ry * 0.06;
        B.ell(hx, cy, rx * (hs === 'curly' ? 1.2 : 1.03), ry * (hs === 'curly' ? 1.12 : hs === 'short' || hs === 'buzz' ? 0.86 : 0.98), hs === 'buzz' ? H.s : H.b);
        if (hs === 'curly') for (var cu = 0; cu < 8; cu++) { var ca = cu / 8 * TAU; B.ell(hx + Math.cos(ca) * rx * 1.05, cy + Math.sin(ca) * ry * 1.0, 1.4 * headK, 1.4 * headK, cu % 2 ? H.b : H.s); }
        if (hs === 'pony') { B.seg([hx, hy - ry * 0.3], [hx + turn * 0.6, hy + ry * 1.7], 2.0, 1.0, H.s); B.seg([hx, hy - ry * 0.3], [hx + turn * 0.4, hy + ry * 0.9], 0.6, 0.5, H.h); }
        if (hs === 'bun') { B.ell(hx, hy - ry * 0.85, rx * 0.5, ry * 0.42, H.b); B.seg([hx - 1, hy - ry * 1.05], [hx + 0.6, hy - ry * 1.12], 0.5, 0.5, H.h); }
        B.seg([hx - rx * 0.5, hy - ry * 0.86], [hx + rx * 0.4, hy - ry * 0.9], 0.6, 0.5, H.h);
        for (var hz = -1; hz <= 1; hz++) B.seg([hx + hz * rx * 0.4, hy - ry * 0.6], [hx + hz * rx * 0.46, hy + ry * 0.4], 0.5, 0.5, H.s);
      }
      if (outfit.hat) {
        var ht = tones(outfit.hat.col), hk = outfit.hat.kind;
        if (hk === 'beanie') { B.ell(hx, hy - ry * 0.4, rx * 1.1, ry * 0.8, ht.b); B.poly([[hx - rx * 1.1, hy - ry * 0.3], [hx + rx * 1.1, hy - ry * 0.3], [hx + rx * 1.08, hy + ry * 0.05], [hx - rx * 1.08, hy + ry * 0.05]], ht.s); }
        if (hk === 'cap') { B.ell(hx, hy - ry * 0.45, rx * 1.06, ry * 0.62, ht.b); B.seg([hx - rx * 0.4, hy - ry * 0.02], [hx + rx * 0.4, hy - ry * 0.02], 0.6, 0.6, ht.s); }
        if (hk === 'sunhat') { B.ell(hx, hy - ry * 0.3, rx * 1.75, ry * 0.32, ht.b); B.ell(hx, hy - ry * 0.7, rx * 0.95, ry * 0.5, ht.b); B.seg([hx - rx * 0.95, hy - ry * 0.4], [hx + rx * 0.95, hy - ry * 0.4], 0.8, 0.8, ht.d); }
      }
      B.clean();
      B.hands = { n: eR, f: eL }; B.head = [hx, hy];
      return B;
    }
    var aw0 = (f ? 2.8 : 3.3) * (def.wide > 1.15 ? 1.18 : 1) * (kid ? 0.84 : 1);
    var proto = new Buf(K), fwF = proto.w, fhF = proto.h;
    return {
      fw: fwF, fh: fhF, footX: Math.round(proto.mx(CX)), footY: Math.round(proto.my(GY)), n: NF, cycle: cycle, density: D,
      // paints frame fr at (x0, y0) and returns where the hands and the head are (in the same pixels)
      paint: function (g, fr, x0, y0) {
        var B = opts.back ? backFrame(fr / NF) : frame(fr / NF), img = g.createImageData(fwF, fhF), d = img.data;
        for (var i = 0; i < fwF * fhF; i++) { var c = B.c[i]; if (!c) continue; var n = parseInt(c.slice(1), 16); d[i * 4] = (n >> 16) & 255; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255; }
        g.putImageData(img, x0, y0 || 0);
        var P = function (p) { return p ? [B.mx(p[0]), B.my(p[1])] : null; };
        return { hands: B.hands ? { n: P(B.hands.n), f: P(B.hands.f) } : null, head: P(B.head) };
      }
    };
  }

  // ---------------------------------------------------------------- the cast: each person with three outfits
  function c(h) { return h; }
  var SKIN = ['#f2c4a4', '#eaa88a', '#d0906c', '#a8704e', '#7e5034', '#5a3624'];
  var CAST = [
    // women
    { id: 'f1', name: 'Black hair, the approved look', sex: 'f', k: 1, bust: 1, hips: 1, skin: SKIN[1], hair: { style: 'long', col: '#1c1820' },
      summer: { top: { kind: 'tank', col: '#f4f0e8' }, bottom: { kind: 'skirt', col: '#1a181e', len: 0.3 }, shoes: { kind: 'heels', col: '#141016' } },
      rain: { top: { kind: 'tank', col: '#f4f0e8' }, bottom: { kind: 'skirt', col: '#1a181e', len: 0.3 }, legs: '#2a2228', shoes: { kind: 'boots', col: '#141016', tall: true }, coat: { kind: 'trench', col: '#c8a878', len: 0.8 } },
      cold: { top: { kind: 'knit', col: '#e8e0d2' }, bottom: { kind: 'skirt', col: '#1a181e', len: 0.3 }, legs: '#1e1a20', shoes: { kind: 'boots', col: '#141016', tall: true }, coat: { kind: 'long', col: '#2a2630', len: 1.05, belt: true }, scarf: '#a83040' } },
    { id: 'f2', name: 'Copper bob', sex: 'f', k: 0.97, bust: 0.55, hips: 1.1, skin: SKIN[0], hair: { style: 'bob', col: '#a8502a' },
      summer: { top: { kind: 'tee', col: '#4a8a9a' }, bottom: { kind: 'shorts', col: '#e8e2d4', len: 0.4 }, shoes: { kind: 'sneakers', col: '#ece8e0' }, bag: { kind: 'tote', col: '#d8ccb0' } },
      rain: { top: { kind: 'tee', col: '#4a8a9a' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'boots', col: '#d8b030' }, coat: { kind: 'rain', col: '#d8b030', len: 0, hood: true } },
      cold: { top: { kind: 'knit', col: '#c8a060' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'puffer', col: '#3a6a5a' }, hat: { kind: 'beanie', col: '#e8e0d2' }, gloves: true } },
    { id: 'f3', name: 'Curly hair, sundress', sex: 'f', k: 0.92, bust: 1.4, hips: 1.3, skin: SKIN[4], hair: { style: 'curly', col: '#1a1210' },
      summer: { bottom: { kind: 'dress', col: '#e8b030', len: 1.15 }, shoes: { kind: 'sandals', col: '#8e5a3a' }, hat: { kind: 'sunhat', col: '#d9c08a' } },
      rain: { bottom: { kind: 'dress', col: '#e8b030', len: 1.15 }, legs: '#3a2a24', shoes: { kind: 'boots', col: '#2a2024' }, umbrella: '#c23a5a' },
      cold: { top: { kind: 'knit', col: '#8a3a4a' }, bottom: { kind: 'skirt', col: '#3a3a42', len: 1.4 }, legs: '#241c20', shoes: { kind: 'boots', col: '#2a2024', tall: true }, coat: { kind: 'long', col: '#6a4a3a', len: 1.3 }, scarf: '#e8c050' } },
    { id: 'f4', name: 'Ponytail, runner', sex: 'f', k: 1.02, bust: 0.4, hips: 0.9, skin: SKIN[2], hair: { style: 'pony', col: '#3a2418' },
      summer: { top: { kind: 'tank', col: '#e0705a' }, bottom: { kind: 'shorts', col: '#2a2a32', len: 0.3 }, shoes: { kind: 'sneakers', col: '#3a7ad0' } },
      rain: { top: { kind: 'tee', col: '#e0705a' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'sneakers', col: '#3a7ad0' }, coat: { kind: 'rain', col: '#2e4a6a', hood: true } },
      cold: { top: { kind: 'knit', col: '#e0705a' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'sneakers', col: '#3a7ad0' }, coat: { kind: 'puffer', col: '#1e1e26' }, hat: { kind: 'beanie', col: '#e0705a' }, gloves: true } },
    { id: 'f5', name: 'Bun, office', sex: 'f', k: 1.0, bust: 1.2, hips: 1.0, skin: SKIN[3], hair: { style: 'bun', col: '#2a1c16' },
      summer: { top: { kind: 'shirt', col: '#f0ece2' }, bottom: { kind: 'trousers', col: '#2c3a5c', len: 1.85 }, shoes: { kind: 'heels', col: '#2a2024' }, bag: { kind: 'tote', col: '#8a4a2a' } },
      rain: { top: { kind: 'shirt', col: '#f0ece2' }, bottom: { kind: 'trousers', col: '#2c3a5c', len: 2 }, shoes: { kind: 'flat', col: '#2a2024' }, coat: { kind: 'trench', col: '#3a3a42', len: 0.9 }, umbrella: '#2a2a3a' },
      cold: { top: { kind: 'shirtL', col: '#f0ece2' }, bottom: { kind: 'trousers', col: '#2c3a5c', len: 2 }, shoes: { kind: 'boots', col: '#2a2024' }, coat: { kind: 'long', col: '#8a7a68', len: 1.1, belt: true }, scarf: '#2a4a6a', bag: { kind: 'tote', col: '#8a4a2a' } } },
    { id: 'f6', name: 'Older woman, short grey hair', sex: 'f', age: 'elder', k: 0.95, bust: 1.35, hips: 1.2, belly: 0.6, skin: SKIN[0], hair: { style: 'short', col: '#a8a29c' },
      summer: { top: { kind: 'shirt', col: '#8ab0c8' }, bottom: { kind: 'skirt', col: '#5a5a62', len: 1.2 }, shoes: { kind: 'flat', col: '#6a4a3a' }, hat: { kind: 'sunhat', col: '#e8e0c8' } },
      rain: { top: { kind: 'shirt', col: '#8ab0c8' }, bottom: { kind: 'trousers', col: '#5a5a62', len: 2 }, shoes: { kind: 'boots', col: '#3a2a22' }, coat: { kind: 'rain', col: '#3e5a3a', len: 0 }, umbrella: '#5a7a3a' },
      cold: { top: { kind: 'knit', col: '#a84a5a' }, bottom: { kind: 'trousers', col: '#4a4a52', len: 2 }, shoes: { kind: 'boots', col: '#3a2a22' }, coat: { kind: 'long', col: '#4a3a5a', len: 1.15 }, hat: { kind: 'beanie', col: '#c8c2b4' }, gloves: true } },
    { id: 'f7', name: 'Teen, high ponytail', sex: 'f', age: 'teen', k: 0.92, bust: 0.6, hips: 0.8, skin: SKIN[5], hair: { style: 'pony', col: '#141010' },
      summer: { top: { kind: 'tee', col: '#e89ab0' }, bottom: { kind: 'jeans', col: '#5a7bb0', len: 0.35 }, shoes: { kind: 'sneakers', col: '#ece8e0' }, bag: { kind: 'backpack', col: '#2a2a32' } },
      rain: { top: { kind: 'tee', col: '#e89ab0' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'sneakers', col: '#ece8e0' }, coat: { kind: 'rain', col: '#8a3ac2', hood: true }, bag: { kind: 'backpack', col: '#2a2a32' } },
      cold: { top: { kind: 'knit', col: '#e89ab0' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'sneakers', col: '#ece8e0' }, coat: { kind: 'puffer', col: '#e8e4dc' }, hat: { kind: 'beanie', col: '#2a2a32' }, bag: { kind: 'backpack', col: '#2a2a32' } } },
    { id: 'f8', name: 'Long blonde hair, midi skirt', sex: 'f', k: 1.06, bust: 0.8, hips: 0.95, skin: SKIN[0], hair: { style: 'long', col: '#d8b26a' },
      summer: { top: { kind: 'tee', col: '#f0ece2', stripe: '#2c3a5c' }, bottom: { kind: 'skirt', col: '#8a8a4a', len: 1.5 }, shoes: { kind: 'sandals', col: '#3a2a22' }, bag: { kind: 'tote', col: '#d8ccb0' } },
      rain: { top: { kind: 'tee', col: '#f0ece2', stripe: '#2c3a5c' }, bottom: { kind: 'skirt', col: '#8a8a4a', len: 1.5 }, legs: '#3a3236', shoes: { kind: 'boots', col: '#2a1e18' }, umbrella: '#e0e0e0' },
      cold: { top: { kind: 'knit', col: '#c8a878' }, bottom: { kind: 'skirt', col: '#6a6a36', len: 1.5 }, legs: '#2a2226', shoes: { kind: 'boots', col: '#2a1e18', tall: true }, coat: { kind: 'long', col: '#c8b496', len: 1.2, belt: true }, scarf: '#5a2a2a' } },
    // men
    { id: 'm1', name: 'Tall, linen shirt', sex: 'm', k: 1.08, hips: 0.3, skin: SKIN[2], hair: { style: 'short', col: '#2a1c16' },
      summer: { top: { kind: 'shirt', col: '#a9c4dc' }, bottom: { kind: 'trousers', col: '#c9b48e', len: 1.85 }, shoes: { kind: 'sneakers', col: '#2c3550' } },
      rain: { top: { kind: 'shirt', col: '#a9c4dc' }, bottom: { kind: 'trousers', col: '#3a3632', len: 2 }, shoes: { kind: 'boots', col: '#3a2a22' }, coat: { kind: 'trench', col: '#6a5a44', len: 0.9 }, umbrella: '#2a2a3a' },
      cold: { top: { kind: 'knit', col: '#3a4a5a' }, bottom: { kind: 'trousers', col: '#3a3632', len: 2 }, shoes: { kind: 'boots', col: '#3a2a22' }, coat: { kind: 'long', col: '#2a2e3a', len: 1.1 }, scarf: '#a8a29c', gloves: true } },
    { id: 'm2', name: 'Broad, beard', sex: 'm', k: 1.0, wide: 1.25, belly: 1.6, hips: 0.4, skin: SKIN[0], hair: { style: 'short', col: '#8a8078' }, beard: '#9a8a7a',
      summer: { top: { kind: 'polo', col: '#b8483e' }, bottom: { kind: 'shorts', col: '#9a8a62', len: 0.75 }, shoes: { kind: 'sandals', col: '#5a3a26' }, hat: { kind: 'cap', col: '#2c3a5c' } },
      rain: { top: { kind: 'polo', col: '#b8483e' }, bottom: { kind: 'trousers', col: '#5a5244', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'rain', col: '#2c3a5c', hood: true }, hat: { kind: 'cap', col: '#2c3a5c' } },
      cold: { top: { kind: 'knit', col: '#6a3a2a' }, bottom: { kind: 'trousers', col: '#4a4438', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'puffer', col: '#3a4a3a' }, hat: { kind: 'beanie', col: '#b8483e' }, gloves: true } },
    { id: 'm3', name: 'Athletic, buzz cut', sex: 'm', k: 1.04, wide: 1.1, hips: 0.4, skin: SKIN[5], hair: { style: 'buzz', col: '#141010' },
      summer: { top: { kind: 'tank', col: '#e8e6e0' }, bottom: { kind: 'shorts', col: '#7d8590', len: 0.5 }, shoes: { kind: 'sneakers', col: '#3a7ad0' } },
      rain: { top: { kind: 'tee', col: '#e8e6e0' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'sneakers', col: '#3a7ad0' }, coat: { kind: 'rain', col: '#1e1e26', hood: true } },
      cold: { top: { kind: 'knit', col: '#5a5a62' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'sneakers', col: '#3a7ad0' }, coat: { kind: 'puffer', col: '#c83a3a' }, hat: { kind: 'beanie', col: '#1e1e26' } } },
    { id: 'm4', name: 'Older man, flat walk', sex: 'm', age: 'elder', k: 0.96, belly: 0.8, hips: 0.3, skin: SKIN[1], hair: { style: 'bald', col: '#c8c2bc' },
      summer: { top: { kind: 'shirt', col: '#8a9ac0' }, bottom: { kind: 'trousers', col: '#5e5e66', len: 2, belt: '#3a2a20' }, shoes: { kind: 'flat', col: '#4a3020' }, hat: { kind: 'cap', col: '#6a6458' } },
      rain: { top: { kind: 'shirt', col: '#8a9ac0' }, bottom: { kind: 'trousers', col: '#5e5e66', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'trench', col: '#5a5244', len: 0.95 }, umbrella: '#2a2a3a' },
      cold: { top: { kind: 'knit', col: '#7a6a4a' }, bottom: { kind: 'trousers', col: '#46464c', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'long', col: '#4a4a44', len: 1.15 }, scarf: '#8a3a2a', hat: { kind: 'beanie', col: '#4a4a52' }, gloves: true } },
    { id: 'm5', name: 'Curly hair, jeans', sex: 'm', k: 1.0, hips: 0.35, skin: SKIN[3], hair: { style: 'curly', col: '#2a1c16' }, beard: '#2a1c16',
      summer: { top: { kind: 'tee', col: '#e8c04a' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'sneakers', col: '#ece8e0' }, bag: { kind: 'backpack', col: '#3a4a5a' } },
      rain: { top: { kind: 'tee', col: '#e8c04a' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'rain', col: '#3e5a3a', hood: true }, bag: { kind: 'backpack', col: '#3a4a5a' } },
      cold: { top: { kind: 'knit', col: '#e8c04a' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'long', col: '#5a3a26', len: 1.05 }, scarf: '#3a6a8a', bag: { kind: 'backpack', col: '#3a4a5a' } } },
    { id: 'm6', name: 'Slim, office', sex: 'm', k: 1.02, wide: 0.92, hips: 0.3, skin: SKIN[4], hair: { style: 'short', col: '#141010' },
      summer: { top: { kind: 'shirt', col: '#f0ece2' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'flat', col: '#1a1410' }, bag: { kind: 'tote', col: '#3a2a22' } },
      rain: { top: { kind: 'shirt', col: '#f0ece2' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'flat', col: '#1a1410' }, coat: { kind: 'trench', col: '#2a2a32', len: 0.9 }, umbrella: '#1a1a20' },
      cold: { top: { kind: 'shirtL', col: '#f0ece2' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'boots', col: '#1a1410' }, coat: { kind: 'long', col: '#2a2e3a', len: 1.1 }, scarf: '#c8c2b4', gloves: true } },
    { id: 'm7', name: 'Teen, cap and big tee', sex: 'm', age: 'teen', k: 0.94, wide: 0.95, hips: 0.3, skin: SKIN[3], hair: { style: 'short', col: '#1a1210' },
      summer: { top: { kind: 'tee', col: '#4d9a6a', hem: -3 }, bottom: { kind: 'shorts', col: '#2a2a32', len: 0.95 }, shoes: { kind: 'sneakers', col: '#c8403a' }, hat: { kind: 'cap', col: '#e8e4dc' } },
      rain: { top: { kind: 'tee', col: '#4d9a6a', hem: -3 }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'sneakers', col: '#c8403a' }, coat: { kind: 'rain', col: '#2a2a32', hood: true } },
      cold: { top: { kind: 'knit', col: '#4d9a6a' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'sneakers', col: '#c8403a' }, coat: { kind: 'puffer', col: '#2a2a32' }, hat: { kind: 'beanie', col: '#c8403a' } } },
    // children
    { id: 'k1', name: 'Girl, pigtails', sex: 'f', age: 'kid', k: 0.64, bust: 0, hips: 0.4, skin: SKIN[1], hair: { style: 'bob', col: '#8a5a30' },
      summer: { top: { kind: 'tee', col: '#e89ab0' }, bottom: { kind: 'skirt', col: '#3e8c8c', len: 0.55 }, shoes: { kind: 'sneakers', col: '#ece8e0' }, bag: { kind: 'backpack', col: '#e08a3a' } },
      rain: { top: { kind: 'tee', col: '#e89ab0' }, bottom: { kind: 'jeans', col: '#5a7bb0', len: 2 }, shoes: { kind: 'boots', col: '#d8402a' }, coat: { kind: 'rain', col: '#d8b030', hood: true }, bag: { kind: 'backpack', col: '#e08a3a' } },
      cold: { top: { kind: 'knit', col: '#e89ab0' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'boots', col: '#d8402a' }, coat: { kind: 'puffer', col: '#8a3ac2' }, hat: { kind: 'beanie', col: '#e8e0d2' }, gloves: true } },
    { id: 'k2', name: 'Boy, cap', sex: 'm', age: 'kid', k: 0.6, hips: 0.3, skin: SKIN[4], hair: { style: 'short', col: '#141010' },
      summer: { top: { kind: 'tee', col: '#3a8ab0' }, bottom: { kind: 'shorts', col: '#c9b48e', len: 0.7 }, shoes: { kind: 'sneakers', col: '#c8403a' }, hat: { kind: 'cap', col: '#c8403a' } },
      rain: { top: { kind: 'tee', col: '#3a8ab0' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'boots', col: '#2a6a3a' }, coat: { kind: 'rain', col: '#3a7ad0', hood: true } },
      cold: { top: { kind: 'knit', col: '#3a8ab0' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'boots', col: '#2a6a3a' }, coat: { kind: 'puffer', col: '#d8402a' }, hat: { kind: 'beanie', col: '#3a8ab0' }, scarf: '#e8c050' } },
    // more people
    { id: 'm8', name: 'Black suit, dark glasses', sex: 'm', k: 1.06, wide: 1.05, hips: 0.35, skin: SKIN[3], hair: { style: 'short', col: '#141010' },
      summer: { top: { kind: 'shirtL', col: '#f2f0ea' }, bottom: { kind: 'trousers', col: '#141418', len: 2 }, shoes: { kind: 'flat', col: '#0c0c0e' }, coat: { kind: 'suit', col: '#18181c' }, shades: true },
      rain: { top: { kind: 'shirtL', col: '#f2f0ea' }, bottom: { kind: 'trousers', col: '#141418', len: 2 }, shoes: { kind: 'flat', col: '#0c0c0e' }, coat: { kind: 'suit', col: '#18181c' }, shades: true, umbrella: '#141418' },
      cold: { top: { kind: 'shirtL', col: '#f2f0ea' }, bottom: { kind: 'trousers', col: '#141418', len: 2 }, shoes: { kind: 'boots', col: '#0c0c0e' }, coat: { kind: 'long', col: '#141418', len: 1.1 }, shades: true, gloves: true } },
    { id: 'f9', name: 'Fuller figure, long hair', sex: 'f', k: 0.98, wide: 1.2, bust: 1.5, hips: 1.5, belly: 0.8, skin: SKIN[4], hair: { style: 'long', col: '#2a1810' },
      summer: { top: { kind: 'tee', col: '#e85a4a' }, bottom: { kind: 'skirt', col: '#2a2a3a', len: 1.15 }, shoes: { kind: 'sandals', col: '#c8a060' }, bag: { kind: 'tote', col: '#e8d8b0' } },
      rain: { top: { kind: 'tee', col: '#e85a4a' }, bottom: { kind: 'skirt', col: '#2a2a3a', len: 1.15 }, legs: '#2a2026', shoes: { kind: 'boots', col: '#2a2024' }, coat: { kind: 'rain', col: '#3a7a8a', len: 0, hood: true } },
      cold: { top: { kind: 'knit', col: '#e85a4a' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'boots', col: '#2a2024' }, coat: { kind: 'puffer', col: '#6a3a5a' }, hat: { kind: 'beanie', col: '#e8d8b0' }, gloves: true } },
    { id: 'f10', name: 'Tall, platinum pixie cut', sex: 'f', k: 1.08, bust: 0.45, hips: 0.85, skin: SKIN[1], hair: { style: 'short', col: '#e8dcc0' },
      summer: { top: { kind: 'shirt', col: '#2e6a5a' }, bottom: { kind: 'trousers', col: '#e8e2d4', len: 1.9 }, shoes: { kind: 'sneakers', col: '#ece8e0' } },
      rain: { top: { kind: 'shirt', col: '#2e6a5a' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'boots', col: '#1a1416' }, coat: { kind: 'trench', col: '#1e1e24', len: 0.9 }, umbrella: '#e0b030' },
      cold: { top: { kind: 'knit', col: '#e8e2d4' }, bottom: { kind: 'trousers', col: '#2a2a32', len: 2 }, shoes: { kind: 'boots', col: '#1a1416' }, coat: { kind: 'long', col: '#b8905a', len: 1.15, belt: true }, scarf: '#2e6a5a' } },
    { id: 'f11', name: 'Older woman, white bun', sex: 'f', age: 'elder', k: 0.93, bust: 1.3, hips: 1.3, belly: 0.5, skin: SKIN[3], hair: { style: 'bun', col: '#dcd8d0' },
      summer: { bottom: { kind: 'dress', col: '#5a7aa8', len: 1.3 }, shoes: { kind: 'flat', col: '#5a3a26' }, bag: { kind: 'tote', col: '#8a4a2a' } },
      rain: { bottom: { kind: 'dress', col: '#5a7aa8', len: 1.3 }, legs: '#4a3a34', shoes: { kind: 'boots', col: '#3a2a22' }, coat: { kind: 'rain', col: '#8a6a3a', len: 0 }, umbrella: '#7a2a4a' },
      cold: { top: { kind: 'knit', col: '#8a5a6a' }, bottom: { kind: 'skirt', col: '#3a3a46', len: 1.4 }, legs: '#2a2226', shoes: { kind: 'boots', col: '#3a2a22' }, coat: { kind: 'long', col: '#2e3a4a', len: 1.25 }, scarf: '#c8a050', gloves: true } },
    { id: 'm9', name: 'Man bun, beard', sex: 'm', k: 1.03, hips: 0.4, skin: SKIN[2], hair: { style: 'bun', col: '#3a2418' }, beard: '#3a2418',
      summer: { top: { kind: 'tee', col: '#6a7a4a' }, bottom: { kind: 'shorts', col: '#c9b48e', len: 0.6 }, shoes: { kind: 'sneakers', col: '#ece8e0' }, bag: { kind: 'backpack', col: '#2a2a32' } },
      rain: { top: { kind: 'tee', col: '#6a7a4a' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'rain', col: '#c84a2a', hood: true }, bag: { kind: 'backpack', col: '#2a2a32' } },
      cold: { top: { kind: 'knit', col: '#6a7a4a' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'boots', col: '#4a3020' }, coat: { kind: 'puffer', col: '#2a3a4a' }, hat: { kind: 'beanie', col: '#c84a2a' } } },
    { id: 'm10', name: 'Long hair, slim', sex: 'm', k: 1.0, wide: 0.9, hips: 0.3, skin: SKIN[0], hair: { style: 'long', col: '#6a4a2a' },
      summer: { top: { kind: 'tank', col: '#2a2a32' }, bottom: { kind: 'jeans', col: '#5a7bb0', len: 2 }, shoes: { kind: 'boots', col: '#5a3a26' } },
      rain: { top: { kind: 'tee', col: '#2a2a32' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'boots', col: '#5a3a26' }, coat: { kind: 'trench', col: '#4a4a3a', len: 0.95 }, umbrella: '#3a5a3a' },
      cold: { top: { kind: 'knit', col: '#8a3a2a' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'boots', col: '#5a3a26' }, coat: { kind: 'long', col: '#3a2a2a', len: 1.1 }, scarf: '#c8b890' } },
    { id: 'k3', name: 'Boy, curly hair', sex: 'm', age: 'kid', k: 0.66, hips: 0.3, skin: SKIN[5], hair: { style: 'curly', col: '#141010' },
      summer: { top: { kind: 'tee', col: '#e8c04a' }, bottom: { kind: 'shorts', col: '#2a3a5a', len: 0.7 }, shoes: { kind: 'sneakers', col: '#3a7ad0' }, bag: { kind: 'backpack', col: '#c8403a' } },
      rain: { top: { kind: 'tee', col: '#e8c04a' }, bottom: { kind: 'jeans', col: '#46638f', len: 2 }, shoes: { kind: 'boots', col: '#e8c04a' }, coat: { kind: 'rain', col: '#3a8a4a', hood: true } },
      cold: { top: { kind: 'knit', col: '#e8c04a' }, bottom: { kind: 'jeans', col: '#2e3a56', len: 2 }, shoes: { kind: 'boots', col: '#2a2a32' }, coat: { kind: 'puffer', col: '#2a6aa8' }, hat: { kind: 'beanie', col: '#e8c04a' }, gloves: true } }
  ];
  // People who work on the street (not in the crowd): the bar's waiter
  var STAFF = {
    waiter: { id: 'waiter', name: 'The waiter', sex: 'f', k: 0.98, bust: 0.9, hips: 1.0, skin: SKIN[2], hair: { style: 'bun', col: '#141010' },
      summer: { top: { kind: 'tee', col: '#1e1e24' }, bottom: { kind: 'trousers', col: '#1a1a20', len: 2 }, shoes: { kind: 'flat', col: '#0e0e10' }, apron: '#ece6dc' } }
  };
  window.StreetBody = {
    // climate: 'summer', 'rain' or 'cold'; opts: true (standing) or the options make() takes
    make: function (def, climate, heightPx, opts) { return make(def, def[climate || 'summer'] || def.summer, heightPx, opts); },
    cast: function () { return CAST; }, staff: STAFF, FRAMES: N
  };
})();
