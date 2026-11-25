/* Fog Town: body2.js. The base character, version 2, after the reference walk the user chose:
   - Proportions: 64 px, long legs (hips at half the height), slim limbs, a small head.
   - Three-quarter view: the chest and hips turn toward us while the legs stride side-on, so the front of the clothes shows
     (open jacket, shirt, tie, belt, hems). The far arm hangs behind the body and shows its hand as it swings forward.
   - Walk, as measured from the reference: 8 posed frames a stride, each held about 80 ms (snappy, not smooth): contact
     (legs straight and wide, the hips at their lowest), down, passing (the hips at their highest), up. The bob comes from
     planting the feet, about 2.5 px; the hips sway; the arms swing wide and the forearm follows a frame late; the head
     follows the body's rise and fall a frame late. Everything moves every frame.
   - Gait: each person's own stride, bounce, arm swing, lean and tempo, so no two people walk alike.
   - Idle: a 24-frame performance made of holds (the same pose kept, then a quick change): breathe, shift the weight to
     the other leg, glance down, touch the collar.
   - An everyday action built the same way: hailing (a small dip first, the arm overshoots, settles, holds).
   - No outline: shapes read by contrast between layers. Two tones per material, a highlight only on hair, leather and
     skin, and about six colours a person. Skin is warmer. Faces are a hairline, eyes or glasses, a beard, a shadow side.
   Usage: FTBody2.frame(spec, pose, i, opts) -> canvas. pose: 'walk' (0-7), 'idle' (0-23), 'hail' (0-5), 'front', 'sit'.
   opts: { night: 0..1, rim: 'left' | 'right' }. FTBody2.sheet(spec, pose, opts) -> { c, fw, fh, n, footX, footY, ms }. */
(function () {
  'use strict';
  var FW = 48, FH = 76, GX = 22, GY = 72, D = Math.PI / 180;

  // ---------------------------------------------------------------- colour: two tones and a highlight
  function hex(c) { var n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mixc(a, b, t) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }); }
  function tones(col) { var c = hex(col); return { base: c, shade: mixc(c, [30, 26, 44], 0.36), light: mixc(c, [255, 236, 206], 0.26), far: mixc(c, [30, 26, 44], 0.26), farShade: mixc(c, [30, 26, 44], 0.5) }; }

  // ---------------------------------------------------------------- a person, described
  var BASE = {
    height: 64, build: 1, shape: 'm',                      // shape: 'm' (straighter, wider shoulders) or 'f' (narrower shoulders, more hip)
    skin: '#e0906a', hair: { style: 'short', col: '#2a1c16' }, face: { glasses: null, beard: false },
    shirt: { col: '#c8d0c8', sleeves: 'long' }, tie: '#7a2a2a', belt: null,
    jacket: { col: '#4e5a44', open: true, len: 'hip', leather: false },
    legs: { col: '#1e1a1a', type: 'trousers', tights: null }, shoes: { col: '#141212', boots: false },
    accent: { type: null, col: '#a8463a' },
    gait: { stride: 1, bob: 1, swing: 1, lean: 0, ms: 80 }   // how this person walks: stride length, bounce, arm swing, forward lean, and the time a frame is held
  };
  function spec(over) { var s = JSON.parse(JSON.stringify(BASE)); for (var k in over) s[k] = over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && s[k] ? Object.assign({}, s[k], over[k]) : over[k]; return s; }

  // ---------------------------------------------------------------- posing
  function limb2(a, up, bend, L1, L2) { var m = [a[0] + Math.sin(up) * L1, a[1] + Math.cos(up) * L1], e = [m[0] + Math.sin(up - bend) * L2, m[1] + Math.cos(up - bend) * L2]; return [a, m, e]; }
  function armOf(a, up, bend, L1, L2) { var m = [a[0] + Math.sin(up) * L1, a[1] + Math.cos(up) * L1], e = [m[0] + Math.sin(up + bend) * L2, m[1] + Math.cos(up + bend) * L2]; return [a, m, e]; }
  // The walk, as measured from the reference: 8 posed frames a stride, each held 80 ms, everything moving every frame.
  // One leg's 8 poses (thigh, knee, foot angles in degrees): contact, down, passing, up while it carries the weight; then
  // toe-off, lift, passing (swinging under the body), reach. The other leg is four frames behind. The bob is not added:
  // it comes from planting the feet (straight legs spread wide at contact put the hips lowest, the straight leg under the
  // body at passing puts them highest), about 2.5 px, as in the reference.
  var STEP = [[24, 2, -14], [17, 15, 0], [5, 3, 0], [-9, 0, 6], [-21, 6, 26], [-14, 34, 30], [6, 58, 10], [21, 24, -4]];
  function legKey(j, g) { var q = STEP[((j % 8) + 8) % 8]; return { th: q[0] * g.stride * D, kn: q[1] * Math.min(1.2, 0.5 + 0.5 * g.stride) * D, ft: q[2] * D }; }
  // The idle, a performance made of holds: [breath 0-2, weight on 'n' (near) or 'f' (far) leg, nod, hand]
  var IDLE = [[0, 'n'], [0, 'n'], [0, 'n'], [0, 'n'], [1, 'n'], [2, 'n'], [2, 'n'], [2, 'n'], [1, 'n'], [0, 'n'], [0, 'n'], [0, 'm'],
    [0, 'f'], [0, 'f'], [0, 'f'], [0, 'f', 1], [0, 'f', 1], [0, 'f', 1], [0, 'f'], [0, 'f', 0, 1], [0, 'f', 0, 2], [0, 'f', 0, 1], [0, 'f'], [0, 'm']];
  // Reaching: given the shoulder and a target for the hand, the angles of the upper arm and forearm (elbow kept low)
  function ik(sh, t, L1, L2) {
    var dx = t[0] - sh[0], dy = t[1] - sh[1], d = Math.max(0.5, Math.min(Math.hypot(dx, dy), L1 + L2 - 0.3)), a = Math.atan2(dx, dy), c = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)))), best = null;
    [a - c, a + c].forEach(function (up) { var e = [sh[0] + Math.sin(up) * L1, sh[1] + Math.cos(up) * L1], fa = Math.atan2(sh[0] + dx - e[0], sh[1] + dy - e[1]); if (!best || e[1] > best.ey) best = { up: up, el: fa - up, ey: e[1] }; });
    return { up: best.up, el: best.el };
  }
  // Things people do standing about, and with each other. Each is a list of frames, held 80 ms each (a hold is a frame
  // repeated). A frame: n / f = the near / far arm (null: at rest; ['to', place, dx, dy]: the hand reaches a place;
  // ['ang', upper, elbow]: angles in degrees), nod (the head down), w (the weight on the 'n' or 'f' leg), hold (what the
  // near hand holds), puff (a breath of smoke, 1-4), ember (the cigarette glowing as it is drawn on).
  function F(o) { return o; }
  var ACTIONS = {
    smoke: [F({ hold: 'cig' }), F({ hold: 'cig' }), F({ hold: 'cig' }), F({ hold: 'cig', n: ['to', 'chest', 0, 0] }), F({ hold: 'cig', n: ['to', 'mouth', 0, 0] }), F({ hold: 'cig', n: ['to', 'mouth', 0, 0] }),
      F({ hold: 'cig', n: ['to', 'mouth', 0, 0], ember: 1 }), F({ hold: 'cig', n: ['to', 'mouth', 0, 0], ember: 1 }), F({ hold: 'cig', n: ['to', 'chest', 0, 0] }), F({ hold: 'cig', nod: -1 }), F({ hold: 'cig', nod: -1 }),
      F({ hold: 'cig', nod: -1, puff: 1 }), F({ hold: 'cig', puff: 2 }), F({ hold: 'cig', puff: 3 }), F({ hold: 'cig', puff: 4 }), F({ hold: 'cig' }), F({ hold: 'cig', w: 'f' }), F({ hold: 'cig', w: 'f' }), F({ hold: 'cig', w: 'f' }), F({ hold: 'cig' })],
    phone: [F({}), F({ hold: 'phone', n: ['to', 'chest', 0, 0] }), F({ hold: 'phone', n: ['to', 'ear', 0, 0] }), F({ hold: 'phone', n: ['to', 'ear', 0, 0] }), F({ hold: 'phone', n: ['to', 'ear', 0, 0] }), F({ hold: 'phone', n: ['to', 'ear', 0, 0], nod: 1 }),
      F({ hold: 'phone', n: ['to', 'ear', 0, 0], nod: 1 }), F({ hold: 'phone', n: ['to', 'ear', 0, 0] }), F({ hold: 'phone', n: ['to', 'ear', 0, 0], w: 'f' }), F({ hold: 'phone', n: ['to', 'ear', 0, 0], w: 'f' }), F({ hold: 'phone', n: ['to', 'ear', 0, 0], w: 'f', f: ['ang', 16, 70] }),
      F({ hold: 'phone', n: ['to', 'ear', 0, 0], w: 'f', f: ['ang', 22, 96] }), F({ hold: 'phone', n: ['to', 'ear', 0, 0], w: 'f', f: ['ang', 16, 70] }), F({ hold: 'phone', n: ['to', 'ear', 0, 0], w: 'f' }), F({ hold: 'phone', n: ['to', 'ear', 0, 0] }), F({ hold: 'phone', n: ['to', 'ear', 0, 0] })],
    watch: [F({}), F({ f: ['to', 'watch', 0, 1] }), F({ f: ['to', 'watch', 0, 0], nod: 1 }), F({ f: ['to', 'watch', 0, 0], nod: 1 }), F({ f: ['to', 'watch', 0, 0], nod: 1 }), F({ f: ['to', 'watch', 0, 0], nod: 1 }),
      F({ f: ['to', 'watch', 0, 0], nod: 1 }), F({ f: ['to', 'watch', 0, 1] }), F({}), F({ w: 'f' }), F({ w: 'f' }), F({})],
    wave: [F({}), F({ n: ['to', 'chest', 0, 1] }), F({ n: ['to', 'up', 0, 0] }), F({ n: ['to', 'up', 3, 1] }), F({ n: ['to', 'up', -1, 0] }), F({ n: ['to', 'up', 3, 1] }), F({ n: ['to', 'up', -1, 0] }), F({ n: ['to', 'up', 1, 0] }), F({ n: ['to', 'up', 1, 0] }), F({ n: ['to', 'chest', 0, 0] }), F({}), F({})],
    shake: [F({}), F({}), F({ n: ['to', 'front', -4, 3] }), F({ n: ['to', 'front', 0, 0] }), F({ n: ['to', 'front', 0, 0], nod: 1 }), F({ n: ['to', 'front', 0, -1.4] }), F({ n: ['to', 'front', 0, 1.2] }), F({ n: ['to', 'front', 0, -1.4] }),
      F({ n: ['to', 'front', 0, 1.2] }), F({ n: ['to', 'front', 0, 0] }), F({ n: ['to', 'front', 0, 0] }), F({ n: ['to', 'chest', 0, 2] }), F({}), F({})],
    talk: [F({}), F({ n: ['ang', 14, 74] }), F({ n: ['ang', 20, 96] }), F({ n: ['ang', 14, 74] }), F({ n: ['ang', 24, 108] }), F({ n: ['ang', 24, 108] }), F({ n: ['ang', 12, 60] }), F({ nod: 1 }),
      F({}), F({}), F({ nod: 1 }), F({ nod: 1 }), F({ w: 'f' }), F({ w: 'f' }), F({ w: 'f', nod: 1 }), F({})],
    // work: sweeping the pavement, strumming a guitar, shovelling snow
    sweep: (function () { var a = []; for (var i = 0; i < 12; i++) { var s2 = Math.sin(i / 12 * Math.PI * 2); a.push(F({ n: ['to', 'front', -2 + s2 * 3, 6], f: ['to', 'front', -7 + s2 * 2, -3], nod: 1, w: i < 6 ? 'n' : 'f' })); } return a; })(),
    play: (function () { var a = []; for (var i = 0; i < 12; i++) a.push(F({ n: ['to', 'chest', 2, 7 + (i % 2 ? -2 : 1)], f: ['to', 'front', 3, -5], nod: i % 6 < 3 ? 1 : 0, w: i < 6 ? 'n' : 'f' })); return a; })(),
    shovel: (function () { var a = [], DX = [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0], DY = [13, 13, 13, 13, 13, 12, 8, 4, 6, 9, 12, 13]; for (var i = 0; i < 12; i++) a.push(F({ n: ['to', 'front', DX[i] - 3, DY[i]], f: ['to', 'front', DX[i] - 9, DY[i] - 7], nod: 1, w: i > 5 && i < 9 ? 'f' : 'n' })); return a; })()
  };
  function pose(kind, i, s) {
    var k = s.height / 64, P = { kind: kind, k: k, Lt: 14.5 * k, Ls: 14.5 * k, Lu: 11.5 * k, Lf: 10.5 * k, To: 20.5 * k }, hipH = P.Lt + P.Ls + 2.8;   // (the sole of the shoe is 2.8 below the ankle)
    function plant(legs) { var low = -1e9; legs.forEach(function (L) { var an = limb2([0, 0], L.th, L.kn, P.Lt, P.Ls)[2], sn = Math.sin(L.ft), c = Math.cos(L.ft); low = Math.max(low, an[1] + 0.6 - 1.7 * sn + 2.2 * c, an[1] + 0.6 + 4.7 * sn + 2.2 * c); }); return -low; }   // the lowest heel or toe sole on the ground
    var gt = s.gait || BASE.gait;
    if (kind === 'walk' || kind === 'push') {   // (push: walking behind a pram or a bin, both hands on the handle)
      var hipAt = function (j) { return -hipH + (plant([legKey(j, gt), legKey(j + 4, gt)]) + hipH) * gt.bob; };
      var hy = hipAt(i), sway = 0.9 * Math.sin(i / 8 * Math.PI * 2);   // the hips shift toward the leg carrying the weight
      P.hip = [sway, hy]; P.legN = legKey(i, gt); P.legF = legKey(i + 4, gt); P.sh = [1.2 + gt.lean, hy - P.To];
      P.headDy = (hipAt(i - 1) - hy) * 0.5;   // the head follows the body's rise and fall a frame late
      var arm = function (j, sd) { return sd * -22 * gt.swing * Math.cos(j / 8 * Math.PI * 2); };   // the arms swing against the legs
      P.armN = { up: arm(i, 1) * D, el: (8 + 0.9 * Math.max(0, arm(i - 1, 1))) * D };   // the forearm bends as the arm comes forward, a frame late
      P.armF = { up: arm(i, -1) * D, el: (8 + 0.9 * Math.max(0, arm(i - 1, -1))) * D };
      if (kind === 'push') { P.armN = { up: 44 * D, el: 26 * D }; P.armF = { up: 38 * D, el: 32 * D }; }
    } else if (kind === 'cycle') {   // riding a bicycle: on the saddle, leaning to the bars, the feet going round with the pedals
      var a = i / 8 * Math.PI * 2, BB = [0, -8.5 * k], cr = 3.3 * k, hipC = [-4.5 * k, -30 * k], swc = (s.shape === 'f' ? 4.6 : 6.1) * s.build;
      function legIK(h, t) { var best = null;   // the same reach, but the knee kept forward
        var dx = t[0] - h[0], dy = t[1] - h[1], d = Math.max(0.5, Math.min(Math.hypot(dx, dy), P.Lt + P.Ls - 0.3)), an = Math.atan2(dx, dy), c = Math.acos(Math.max(-1, Math.min(1, (P.Lt * P.Lt + d * d - P.Ls * P.Ls) / (2 * P.Lt * d))));
        [an - c, an + c].forEach(function (th) { var m = [h[0] + Math.sin(th) * P.Lt, h[1] + Math.cos(th) * P.Lt], sa = Math.atan2(t[0] - m[0], t[1] - m[1]); if (!best || m[0] > best.mx) best = { th: th, kn: th - sa, mx: m[0] }; });
        return { th: best.th, kn: best.kn, ft: 0.1 }; }
      function pedal(ph) { return [BB[0] + Math.cos(ph) * cr, BB[1] + Math.sin(ph) * cr - 2]; }   // (the ankle sits just above the pedal)
      P.hip = hipC; P.sh = [hipC[0] + 8 * k, hipC[1] - P.To * 0.92]; P.headDy = 0; P.cycling = true;
      P.legN = legIK([hipC[0] - 0.6, hipC[1]], pedal(a)); P.legF = legIK([hipC[0] + 1, hipC[1]], pedal(a + Math.PI));
      var bar = [11.5 * k, -32 * k]; P.armN = ik([P.sh[0] - swc * 0.8, P.sh[1] + 2.6], bar, P.Lu, P.Lf + 1.6); P.armF = ik([P.sh[0] + swc * 0.78, P.sh[1] + 2.6], [bar[0] + 1, bar[1]], P.Lu, P.Lf + 1.6);
    } else if (kind === 'sit') {
      var sy = -16 * k; P.hip = [0, sy]; P.sitting = true; P.sh = [0.4, sy - P.To]; P.headDy = 0;
      P.armN = { up: 16 * D, el: 62 * D }; P.armF = { up: 20 * D, el: 60 * D };
    } else {   // standing: idle (with holds), hail, front
      var I = kind === 'idle' ? IDLE[i % IDLE.length] : [0, 'n'], b = I[0], wgt = I[1], dip = kind === 'hail' && i === 1 ? 1 : 0, easy = { th: 9 * D, kn: 16 * D, ft: 8 * D }, firm = { th: 0, kn: 0, ft: 0 };
      P.hip = [wgt === 'n' ? 0.8 : wgt === 'f' ? -0.6 : 0.1, -hipH + dip + (wgt === 'm' ? 0.5 : 0)];   // weight on one leg, the hip over it; 'm' is the moment of shifting
      P.legN = wgt === 'f' ? { th: -5 * D, kn: 14 * D, ft: 12 * D } : firm; P.legF = wgt === 'f' ? firm : wgt === 'm' ? { th: 4 * D, kn: 7 * D, ft: 4 * D } : easy;
      P.sh = [0.9 + (wgt === 'f' ? -0.4 : 0), -hipH - P.To + dip - b * 0.5 + (wgt === 'm' ? 0.5 : 0)]; P.headDy = 0; P.nod = I[2] || 0; P.breath = b;
      P.armN = { up: (3 + b) * D, el: (8 + b * 2) * D }; P.armF = { up: -4 * D, el: 12 * D };
      if (I[3] === 1) P.armN = { up: 28 * D, el: 80 * D }; if (I[3] === 2) P.armN = { up: 40 * D, el: 128 * D };   // a hand up to the collar
      if (kind === 'hail') { var UP = [4, -12, 70, 162, 146, 150], EL = [8, 6, 40, 12, 24, 22]; P.armN = { up: UP[i] * D, el: EL[i] * D }; }
      var A = ACTIONS[kind]; if (A) {
        var fr = A[i % A.length], fem = s.shape === 'f', sw = (fem ? 4.6 : 6.1) * s.build;
        if (fr.w === 'f') { P.hip[0] = -0.6; P.legN = { th: -5 * D, kn: 14 * D, ft: 12 * D }; P.legF = firm; P.sh[0] -= 0.4; }
        P.nod = fr.nod || 0; P.hold = fr.hold; P.puff = fr.puff || 0; P.ember = fr.ember;
        var hc = [P.sh[0] + 1.5 + (P.nod > 0 ? 0.6 : 0), P.sh[1] - 5.7 * k + P.nod * 0.8];
        var PLACE = { mouth: [hc[0] + 3.8, hc[1] + 2.6], ear: [hc[0] + 0.6, hc[1] + 1.6], chest: [P.sh[0] + 3, P.sh[1] + 7], front: [P.sh[0] + 11, P.sh[1] + 13], up: [P.sh[0] + 7, P.sh[1] - 13], watch: [P.sh[0] + 6, P.sh[1] + 9] };
        var set = function (spec, shX) { if (!spec) return null; if (spec[0] === 'ang') return { up: spec[1] * D, el: spec[2] * D }; var t = PLACE[spec[1]]; return ik([shX, P.sh[1] + 2.6], [t[0] + spec[2], t[1] + spec[3]], P.Lu, P.Lf + 1.6); };
        P.armN = set(fr.n, P.sh[0] - sw * 0.8) || P.armN; P.armF = set(fr.f, P.sh[0] + sw * 0.78) || P.armF;
      }
    }
    return P;
  }

  // ---------------------------------------------------------------- the part map
  var ID = { skin: 1, hair: 2, shirt: 3, jacket: 4, legs: 5, shoes: 6, accent: 7, eye: 8, tie: 9, belt: 10, lapel: 11, tights: 12, glass: 13, beard: 14, seam: 15, sleeve: 16, cig: 17, ember: 18, emberHot: 19, phone: 20, smoke: 21 }, FAR = 32;   // sleeves are their own part, so a shadow line parts arm from body
  function Map2() { this.m = new Uint8Array(FW * FH); }
  Map2.prototype.px = function (x, y, id) { x = Math.round(x + GX); y = Math.round(y + GY); if (x >= 0 && y >= 0 && x < FW && y < FH) this.m[y * FW + x] = id; };
  Map2.prototype.disc = function (x, y, r, id) { var c = Math.ceil(r); for (var dy = -c; dy <= c; dy++) for (var dx = -c; dx <= c; dx++) if (dx * dx + dy * dy <= r * r + 0.3) this.px(x + dx, y + dy, id); };
  Map2.prototype.limb = function (a, b, r0, r1, id) { var n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2) + 1; for (var j = 0; j <= n; j++) { var t = j / n; this.disc(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r0 + (r1 - r0) * t, id); } };
  Map2.prototype.poly = function (pts, id) {
    var ys = pts.map(function (p) { return p[1]; }), y0 = Math.floor(Math.min.apply(null, ys)), y1 = Math.ceil(Math.max.apply(null, ys));
    for (var y = y0; y <= y1; y++) { var yc = y + 0.5, xs = []; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort(function (p, q) { return p - q; }); for (var k = 0; k + 1 < xs.length; k += 2) for (var x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, id); }
  };
  Map2.prototype.rect = function (x, y, w, h, id) { for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) this.px(x + xx, y + yy, id); };
  Map2.prototype.oval = function (cx, cy, rx, ry, id) { for (var dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) for (var dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.08) this.px(cx + dx, cy + dy, id); };

  // ---------------------------------------------------------------- drawing, side-on legs and a three-quarter body
  function drawBody(M, s, P) {
    var b = s.build, k = P.k, hk = Math.max(k, 0.84), fem = s.shape === 'f', J = s.jacket && s.jacket.col ? s.jacket : null, skirt = s.legs.type === 'skirt' || s.legs.type === 'dress';   // hk: a child's head stays big for its body
    var hp = P.hip, sh = P.sh, hw = (fem ? 4.3 : 3.9) * b, sw = (fem ? 4.6 : 6.1) * b;
    function legPaint(L, hipX, far) {
      var f = far ? FAR : 0, ch, upper, lower;
      if (P.sitting) ch = [[hipX, hp[1]], [hipX + 13 * k, hp[1] + (far ? 0.6 : 0)], [hipX + (far ? 11.5 : 13) * k, -2.8]];
      else ch = limb2([hipX, hp[1]], L.th, L.kn, P.Lt, P.Ls);
      upper = skirt ? (s.legs.tights ? ID.tights : ID.skin) : ID.legs; lower = s.shoes.boots ? ID.shoes : skirt ? (s.legs.tights ? ID.tights : ID.skin) : ID.legs;
      M.limb(ch[0], ch[1], 2.15 * b, 1.7 * b, upper + f); M.limb(ch[1], ch[2], 1.6 * b, 1.2, lower + f);
      footPaint(ch[2], P.sitting ? 0 : L.ft, ID.shoes + f);
    }
    // a shoe: heel, sole, the toe cap tapering, the instep up to the ankle; it rolls heel to toe with the step
    function footPaint(an, ft, id) {
      var c = Math.cos(ft), sn = Math.sin(ft), FOOT = [[-1.6, -1.2], [0.8, -1.2], [2.4, 0.2], [4.3, 1.1], [4.7, 2.2], [-1.7, 2.2]];
      M.poly(FOOT.map(function (p) { return [an[0] + p[0] * c - p[1] * sn, an[1] + 0.6 + p[0] * sn + p[1] * c]; }), id);
    }
    function armPaint(A, shX, far) {
      var f = far ? FAR : 0, ch = armOf([shX, sh[1] + 2.6], A.up, A.el, P.Lu, P.Lf), sleeve = ID.sleeve, fore = s.shirt.sleeves === 'short' && !J ? ID.skin : sleeve;   // the arm hangs from the shoulder's point
      M.limb(ch[0], ch[1], 1.75 * b, 1.45 * b, sleeve + f); M.limb(ch[1], ch[2], 1.35 * b, 1.1, fore + f);
      return handPaint(ch[2], Math.atan2(ch[2][0] - ch[1][0], ch[2][1] - ch[1][1]), ID.skin + f);
    }
    // a hand: a palm a little longer than it is wide, along the forearm, and a thumb on the side toward the front
    function handPaint(wr, dir, id) {
      var ux = Math.sin(dir), uy = Math.cos(dir), px = uy, py = -ux;   // along the forearm, and across it toward the front
      M.disc(wr[0] + ux * 0.9, wr[1] + uy * 0.9, 1, id); M.disc(wr[0] + ux * 2, wr[1] + uy * 2, 0.8, id);
      M.px(wr[0] + ux * 1.1 + px * 1.5, wr[1] + uy * 1.1 + py * 1.5, id);
      return { x: wr[0] + ux * 2, y: wr[1] + uy * 2, ux: ux, uy: uy, px: px, py: py };
    }
    // behind: long hair, the far arm, the far leg
    if (s.hair.style === 'long') M.poly([[sh[0] - 3.6, sh[1] - 9.5], [sh[0] + 0.5, sh[1] - 9.5], [sh[0] - 0.6, sh[1] + 7], [sh[0] - 4.6, sh[1] + 6]], ID.hair);
    armPaint(P.armF, sh[0] + sw * 0.78, true); legPaint(P.legF, hp[0] + 1, true);
    // the torso, three-quarter: back edge on the left, the chest turned toward us on the right. The shoulders slope down
    // from the base of the neck to rounded points, wider than the hips
    var waistY = hp[1] - 7 * k, nk = sh[1] - 1, torso = [[sh[0] - 1.4, nk], [sh[0] + 2.6, nk], [sh[0] + sw * 0.8, sh[1] + 0.9], [sh[0] + sw * 0.98, sh[1] + 2.1], [sh[0] + sw * 1.0 + (fem ? 0.6 : 0), sh[1] + 6 * k],
      [hp[0] + hw * (fem ? 0.78 : 0.9), waistY], [hp[0] + hw * 1.05, hp[1] + 1], [hp[0] - hw * 1.05, hp[1] + 1], [hp[0] - hw * (fem ? 0.75 : 0.88), waistY], [sh[0] - sw * 0.98, sh[1] + 5 * k], [sh[0] - sw * 0.98, sh[1] + 2.1], [sh[0] - sw * 0.78, sh[1] + 0.9]];
    M.poly(torso, ID.shirt);
    var cx0 = sh[0] + 1.3, cx1 = hp[0] + 1;                   // the front line of the body, where buttons and a tie hang
    function cxAt(y) { return cx0 + (cx1 - cx0) * (y - sh[1]) / (hp[1] - sh[1]); }
    if (skirt && s.legs.type === 'dress') M.poly(torso, ID.legs);   // a dress: the top in the dress colour too
    if (J) {
      M.poly(torso, ID.jacket);
      if (J.open) { var vy = waistY + 1; M.poly([[cxAt(sh[1]) - 2, sh[1]], [cxAt(sh[1]) + 2.2, sh[1]], [cxAt(vy) + 0.6, vy], [cxAt(vy) - 0.4, vy]], s.legs.type === 'dress' ? ID.legs : ID.shirt);
        for (var ly = sh[1]; ly < vy; ly++) { var t = (ly - sh[1]) / (vy - sh[1]); M.px(cxAt(ly) - 2 + 1.6 * t, ly, ID.lapel); M.px(cxAt(ly) + 2.2 - 1.6 * t, ly, ID.lapel); }
        if (s.tie) { for (var ty = sh[1] + 1; ty < waistY + 2; ty++) M.px(cxAt(ty) + 0.2, ty, ID.tie); M.px(cxAt(sh[1] + 1) + 1, sh[1] + 1, ID.tie); } }
      else for (var by = sh[1] + 3; by < hp[1]; by += 3) M.px(cxAt(by) + 0.4, by, ID.seam);
    } else { if (s.tie) for (var ty2 = sh[1] + 1; ty2 < waistY + 2; ty2++) M.px(cxAt(ty2) + 0.2, ty2, ID.tie); }
    if (s.belt && (!J || J.open) && !(J && J.len !== 'hip')) for (var bx = -hw - 1; bx <= hw + 1; bx++) M.px(hp[0] + bx, waistY + 2, ID.belt);
    M.px(cxAt(sh[1]) - 1.5, sh[1], s.legs.type === 'dress' ? ID.legs : ID.shirt); M.px(cxAt(sh[1]) + 1.8, sh[1], s.legs.type === 'dress' ? ID.legs : ID.shirt);   // the collar
    // the near leg, then the skirt or the coat's tails over the legs
    legPaint(P.legN, hp[0] - 0.6, false);
    var kn = P.sitting ? [hp[0] + 13 * k, hp[1]] : limb2([hp[0] - 0.6, hp[1]], P.legN.th, P.legN.kn, P.Lt, P.Ls)[1], kf = P.sitting ? kn : limb2([hp[0] + 1, hp[1]], P.legF.th, P.legF.kn, P.Lt, P.Ls)[1];
    if (skirt) { var hemY = P.sitting ? hp[1] + 2 : hp[1] + 12 * k, fx = Math.max(kn[0], kf[0], hp[0] + hw) + 1.2, bx2 = Math.min(kn[0], kf[0], hp[0] - hw) - 1.2; M.poly([[hp[0] - hw * 1.05, waistY + 1], [hp[0] + hw * 1.05, waistY + 1], [fx, hemY], [bx2, hemY]], ID.legs); }
    if (J && J.len !== 'hip') { var hem = hp[1] + (J.len === 'calf' ? 23 : 15) * k, fx2 = Math.max(kn[0], kf[0], hp[0]) + 3.2 * b, bx3 = Math.min(kn[0], kf[0], hp[0]) - 3.4 * b;
      if (P.sitting) { hem = hp[1] + 3; fx2 = hp[0] + 13 * k; }
      M.poly([[hp[0] - hw * 1.05, hp[1] - 5], [hp[0] + hw * 1.05, hp[1] - 5], [fx2, hem], [bx3, hem]], ID.jacket);
      for (var oy = hp[1] - 5; oy < hem; oy++) M.px(hp[0] + hw * 0.7 + (fx2 - hp[0] - hw) * 0.55 * (oy - hp[1] + 5) / (hem - hp[1] + 5), oy, J.open ? ID.lapel : ID.seam); }
    // the head, three-quarter: a short neck, an oval skull, a chin, the nose, the far ear; then hair, glasses, beard. No eyes:
    // like the reference, a face is a hairline and a shadow side
    var hc = [sh[0] + 1.5 + (P.nod > 0 ? 0.6 : 0), sh[1] - 5.9 * hk + (P.headDy || 0) + (P.nod || 0) * 0.8]; M.rect(sh[0] + 0.1, sh[1] - 2.4 * k, 2.6, 1.8 * k, ID.skin);
    M.oval(hc[0], hc[1], 3.1 * hk, 4.1 * hk, ID.skin); M.px(hc[0] + 1.6, hc[1] + 4.2 * hk, ID.skin); M.px(hc[0] + 3.2 * hk, hc[1] + 0.4, ID.skin); M.px(hc[0] - 2.2, hc[1] + 0.4, ID.skin + FAR);
    var hs = s.hair.style;
    if (hs !== 'bald') { for (var y = -5; y <= 4; y++) for (var x = -5; x <= 5; x++) { if (Math.hypot(x / (3.3 * hk), y / (4.3 * hk)) > 1.12) continue; var top = y < -1.8 - (x > 1 ? 0.5 : 0), back = x < -1.2 && y < (hs === 'short' || hs === 'slick' ? 1.2 : 3.5); if (top || back) M.px(hc[0] + x, hc[1] + y, ID.hair); }
      if (hs === 'bun') M.disc(hc[0] - 3.2, hc[1] - 3, 1.7, ID.hair);
      if (hs === 'long') { M.poly([[hc[0] - 4.2, hc[1] - 1], [hc[0] - 1, hc[1] - 1], [hc[0] - 1.6, hc[1] + 9], [hc[0] - 4.8, hc[1] + 8]], ID.hair); M.px(hc[0] + 3, hc[1] - 2, ID.hair); } }
    else M.px(hc[0] - 2.6, hc[1] - 1.5, ID.skin + FAR);
    var fc = s.face || {}; if (fc.glasses) { for (var gx = -0.6; gx <= 3.6; gx++) M.px(hc[0] + gx, hc[1] - 0.4, ID.glass); if (fc.glasses === 'sun') { M.px(hc[0] + 0.4, hc[1] + 0.6, ID.glass); M.px(hc[0] + 2.6, hc[1] + 0.6, ID.glass); } }
    if (fc.beard) { for (var bxx = -1.5; bxx <= 3; bxx++) { M.px(hc[0] + bxx, hc[1] + 3, ID.beard); M.px(hc[0] + bxx, hc[1] + 2, bxx > 0.5 ? ID.beard : ID.skin); } M.px(hc[0] - 1.5, hc[1] + 1, ID.beard); }
    // the near arm last, over the body; what its hand holds; a breath of smoke; then the accent
    var hand = armPaint(P.armN, sh[0] - sw * 0.8, false);
    if (P.hold === 'cig') { for (var ci = 0; ci < 3; ci++) M.px(hand.x + hand.px * (0.8 + ci), hand.y + hand.py * (0.8 + ci) - 0.4, ID.cig); M.px(hand.x + hand.px * 3.8, hand.y + hand.py * 3.8 - 0.4, P.ember ? ID.emberHot : ID.ember); }
    if (P.hold === 'phone') M.rect(hand.x - 1, hand.y - 2.4, 2, 4, ID.phone);
    if (P.puff) { var mx = hc[0] + 4.2, my = hc[1] + 2.2, PUFF = [[[0, 0], [1, 0]], [[1, -1], [2, -1], [2, 0], [3, -1]], [[2, -3], [3, -3], [4, -2], [3, -2], [4, -4]], [[3, -6], [5, -5], [4, -7]]][P.puff - 1];
      PUFF.forEach(function (q) { M.px(mx + q[0], my + q[1], ID.smoke); }); }
    var ac = s.accent || {};
    if (ac.type === 'scarf') { M.limb([sh[0] - 2.5, sh[1] - 0.6], [sh[0] + 3, sh[1] - 0.8], 1.3, 1.3, ID.accent); M.limb([cxAt(sh[1]) + 0.5, sh[1]], [cxAt(sh[1]) + 0.8, sh[1] + 7], 1, 0.8, ID.accent); }
    if (ac.type === 'cap') { for (var cx = -4; cx <= 4; cx++) for (var cy = -5; cy <= -2; cy++) if (Math.hypot(cx, cy + 1) < 4.3) M.px(hc[0] + cx, hc[1] + cy, ID.accent); M.rect(hc[0] + 2, hc[1] - 2.4, 4, 1, ID.accent); }
    if (ac.type === 'bag') { for (var t2 = 0; t2 <= 1; t2 += 0.05) M.px(sh[0] - sw * 0.4 + t2 * (sw * 1.4), sh[1] + t2 * 16 * k, ID.accent); var swg = P.kind === 'walk' ? Math.round(Math.sin(P.legN.th * 3)) : 0; M.rect(hp[0] + hw - 1 + swg, hp[1] - 4, 4, 5, ID.accent); }
  }

  function drawFront(M, s, P) {   // looking straight out of the screen
    var b = s.build, k = P.k, hk = Math.max(k, 0.84), fem = s.shape === 'f', J = s.jacket && s.jacket.col ? s.jacket : null, skirt = s.legs.type === 'skirt' || s.legs.type === 'dress', hy = P.hip[1] + 0.6, sy = P.sh[1], sw = (fem ? 4.7 : 6.1) * b, hw = (fem ? 4 : 3.7) * b, waistY = hy - 7 * k;
    [-1, 1].forEach(function (sd) { var hip = [sd * 1.8 * b, hy], kn = [sd * 1.9 * b, hy / 2], an = [sd * 2 * b, -2], up = skirt ? (s.legs.tights ? ID.tights : ID.skin) : ID.legs, lo = s.shoes.boots ? ID.shoes : up;
      M.limb(hip, kn, 1.9 * b, 1.6 * b, up); M.limb(kn, an, 1.5 * b, 1.2, lo);
      M.poly([[an[0] - 1.3, -3], [an[0] + 1.3, -3], [an[0] + 1.6 + sd * 0.6, -1.2], [an[0] + 1.7 + sd * 0.8, 0], [an[0] - 1.7 + sd * 0.8, 0], [an[0] - 1.6 + sd * 0.6, -1.2]], ID.shoes); });   // shoes seen from the front: the toes turned a little out
    var torso = [[-1.8, sy - 1], [1.8, sy - 1], [sw * 0.8, sy + 0.9], [sw, sy + 2.1], [sw * 0.98, sy + 6 * k], [hw * 1.02, hy + 1], [-hw * 1.02, hy + 1], [-sw * 0.98, sy + 6 * k], [-sw, sy + 2.1], [-sw * 0.8, sy + 0.9]];   // sloping shoulders
    M.poly(torso, s.legs.type === 'dress' ? ID.legs : ID.shirt);
    if (J) { M.poly(torso, ID.jacket); if (J.open) { M.poly([[-2, sy], [2, sy], [0.5, waistY + 1], [-0.5, waistY + 1]], s.legs.type === 'dress' ? ID.legs : ID.shirt); for (var ly = sy; ly < waistY + 1; ly++) { var t = (ly - sy) / (waistY + 1 - sy); M.px(-2 + 1.6 * t, ly, ID.lapel); M.px(1.6 - 1.6 * t, ly, ID.lapel); } } }
    if (s.tie) for (var ty = sy + 1; ty < waistY + 2; ty++) M.px(0, ty, ID.tie);
    if (skirt) M.poly([[-hw, waistY + 1], [hw, waistY + 1], [hw * 1.25, hy + 12 * k], [-hw * 1.25, hy + 12 * k]], ID.legs);
    if (J && J.len !== 'hip') { var hem = hy + (J.len === 'calf' ? 23 : 15) * k; M.poly([[-hw * 1.02, hy - 4], [-0.5, hy - 4], [-0.8, hem], [-hw * 1.3, hem]], ID.jacket); M.poly([[0.5, hy - 4], [hw * 1.02, hy - 4], [hw * 1.3, hem], [0.8, hem]], ID.jacket); }
    [-1, 1].forEach(function (sd) { var a = [sd * (sw - 0.2), sy + 2.8], e = [sd * (sw + 0.8), sy + 12 * k], w = [sd * (sw + 0.6), sy + 21 * k], sl = ID.sleeve; M.limb(a, e, 1.5 * b, 1.3 * b, sl); M.limb(e, w, 1.25 * b, 1.05, s.shirt.sleeves === 'short' && !J ? ID.skin : sl);
      M.rect(w[0] - 0.8, w[1] + 0.3, 2, 3, ID.skin); M.px(w[0] - sd * 1.4, w[1] + 1, ID.skin); });   // hands: a palm and a thumb turned in
    var hc = [0, sy - 5.9 * hk]; M.rect(-1.2, sy - 2.4 * k, 3, 1.8 * k, ID.skin); M.oval(0, hc[1], 3.3 * hk, 4.1 * hk, ID.skin);   // an oval face, no eyes
    if (s.hair.style !== 'bald') { for (var y = -5; y <= 3; y++) for (var x = -5; x <= 5; x++) if (Math.hypot(x, y) < 4.5 && (y < -1.9 || (Math.abs(x) > 3.2 && y < 1))) M.px(x, hc[1] + y, ID.hair); if (s.hair.style === 'long') { M.rect(-4.5, hc[1] - 1, 1.6, 9, ID.hair); M.rect(3.6, hc[1] - 1, 1.6, 9, ID.hair); } if (s.hair.style === 'bun') M.disc(0, hc[1] - 4.6, 1.6, ID.hair); }
    var fc = s.face || {}; if (fc.glasses) for (var gx = -3; gx <= 3; gx++) M.px(gx, hc[1] - 0.3, ID.glass); if (fc.beard) for (var bx = -2.5; bx <= 2.5; bx++) { M.px(bx, hc[1] + 3, ID.beard); if (Math.abs(bx) > 1) M.px(bx, hc[1] + 2, ID.beard); }
    var ac = s.accent || {}; if (ac.type === 'scarf') M.limb([-3.4, sy - 0.4], [3.4, sy - 0.4], 1.3, 1.3, ID.accent); if (ac.type === 'cap') { for (var cx = -4; cx <= 4; cx++) for (var cy = -5; cy <= -2; cy++) if (Math.hypot(cx, cy + 1) < 4.4) M.px(cx, hc[1] + cy, ID.accent); M.rect(-4, hc[1] - 2, 9, 1, ID.accent); }
    if (ac.type === 'bag') for (var t2 = 0; t2 <= 1; t2 += 0.06) M.px(sw - t2 * sw * 2, sy + 1 + t2 * 14 * k, ID.accent);
  }

  // ---------------------------------------------------------------- shade (no outline), light
  var SHINY = {}; SHINY[ID.hair] = 1; SHINY[ID.skin] = 1; SHINY[ID.shoes] = 1;
  function paint(M, s, opts) {
    opts = opts || {}; var night = opts.night || 0, rim = opts.rim, NIGHT = [20, 24, 40], RIM = [255, 206, 140], J = s.jacket || {};
    var cols = {}; cols[ID.skin] = s.skin; cols[ID.hair] = s.hair.col; cols[ID.shirt] = s.shirt.col; cols[ID.jacket] = J.col || s.shirt.col; cols[ID.legs] = s.legs.col; cols[ID.shoes] = s.shoes.col;
    cols[ID.accent] = (s.accent && s.accent.col) || '#888888'; cols[ID.eye] = '#1a1210'; cols[ID.tie] = s.tie || '#7a2a2a'; cols[ID.belt] = s.belt || '#2a2018'; cols[ID.tights] = s.legs.tights || s.legs.col; cols[ID.glass] = '#121014'; cols[ID.beard] = s.hair.col;
    cols[ID.sleeve] = J.col || (s.legs.type === 'dress' ? s.legs.col : s.shirt.col);
    var T = {}; for (var id in cols) T[id] = tones(cols[id]);
    // the small things are flat, not shaded: a cigarette, its ember, a phone, smoke
    T[ID.cig] = { base: [232, 226, 214] }; T[ID.ember] = { base: [200, 90, 50] }; T[ID.emberHot] = { base: [255, 150, 70] }; T[ID.phone] = { base: [26, 28, 32] }; T[ID.smoke] = { base: [206, 206, 200] }; T[ID.lapel] = { base: tones(cols[ID.jacket]).light }; T[ID.seam] = { base: tones(cols[ID.jacket]).shade };
    if (J.leather) SHINY[ID.jacket] = SHINY[ID.sleeve] = 1; else { delete SHINY[ID.jacket]; delete SHINY[ID.sleeve]; }
    var m = M.m, c = document.createElement('canvas'); c.width = FW; c.height = FH; var g = c.getContext('2d'), img = g.createImageData(FW, FH), d = img.data;
    function at(x, y) { return x < 0 || y < 0 || x >= FW || y >= FH ? 0 : m[y * FW + x]; }
    for (var y = 0; y < FH; y++) for (var x = 0; x < FW; x++) {
      var v = at(x, y); if (!v) continue; var far = v >= FAR, id2 = far ? v - FAR : v, t = T[id2] || T[ID.shirt], col, o = (y * FW + x) * 4;
      if (!t.shade) col = t.base;
      else { var up = at(x, y - 1), right = at(x + 1, y), left = at(x - 1, y), down = at(x, y + 1);
        var shade = right !== v || (down === 0) || (up && up !== v && up % FAR !== id2 && (up % FAR === ID.hair || up % FAR === ID.jacket || up % FAR === ID.skin) && id2 !== ID.eye);
        var light = SHINY[id2] && !far && (up !== v || left !== v) && !(right !== v);
        col = far ? (shade ? t.farShade : t.far) : shade ? t.shade : light ? t.light : t.base; }
      if (rim && night && !far) { var edge = rim === 'right' ? at(x + 1, y) === 0 : at(x - 1, y) === 0; if (edge) col = mixc(col, RIM, 0.7 * night); }
      if (night) col = mixc(col, NIGHT, 0.36 * night);
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0); return c;
  }

  // ---------------------------------------------------------------- seen from behind, sitting on a stool (the diner's counter)
  // Four performances, 12 frames each, made of holds: eating (the elbow lifts, the head dips to the fork), drinking (the
  // far elbow rises, the head tips back), on the phone (the hand and the phone beside the head), talking (the head turns
  // to a neighbour, a hand gestures). Per frame: [near elbow lift, far elbow lift, head turn, nod, tip back]
  var BACK = {
    eat: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 0, 0, 1, 0], [2, 0, 0, 1, 0], [2, 0, 0, 1, 0], [1, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0]],
    drink: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 3, 0, 0, 1], [0, 3, 0, 0, 1], [0, 3, 0, 0, 1], [0, 1, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 0]],
    phone: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, -1, 0, 0], [0, 0, -1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 0]],
    talk: [[0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [2, 0, 1, 0, 0], [2, 0, 1, 0, 0], [0, 0, 1, 1, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 2, -1, 0, 0], [0, 0, -1, 0, 0], [0, 0, 0, 0, 0]]
  };
  function drawBack(M, s, kind, i) {
    var k = s.height / 64, hk = Math.max(k, 0.84), b = s.build, fem = s.shape === 'f', J = s.jacket && s.jacket.col ? s.jacket : null, skirt = s.legs.type === 'skirt' || s.legs.type === 'dress';
    var fr = BACK[kind][i % 12], To = 20.5 * k, hy = -26 * k, sy = hy - To, sw = (fem ? 4.6 : 6.1) * b, hw = (fem ? 4.3 : 3.9) * b, sleeve = ID.sleeve, body = s.legs.type === 'dress' ? ID.legs : J ? ID.jacket : ID.shirt;
    [-1, 1].forEach(function (sd) { var an = [sd * 1.9 * b, -2.8]; M.limb([sd * 1.8 * b, hy + 1], an, 1.7 * b, 1.3, s.shoes.boots ? ID.shoes : skirt ? (s.legs.tights ? ID.tights : ID.skin) : ID.legs); M.rect(an[0] - 1.3, -2.8, 2.8, 2.8, ID.shoes); });   // the legs hanging to the footrest
    M.poly([[-hw * 1.05, hy - 5], [hw * 1.05, hy - 5], [hw * 1.1, hy + 2], [-hw * 1.1, hy + 2]], J && J.len !== 'hip' ? ID.jacket : ID.legs);   // on the seat
    var torso = [[-1.8, sy - 1], [1.8, sy - 1], [sw * 0.8, sy + 0.9], [sw, sy + 2.1], [sw * 0.98, sy + 6 * k], [hw * 1.02, hy + 1], [-hw * 1.02, hy + 1], [-sw * 0.98, sy + 6 * k], [-sw, sy + 2.1], [-sw * 0.8, sy + 0.9]];
    M.poly(torso, body); if (J) for (var y = sy + 1; y < hy; y++) M.px(0, y, ID.seam);   // a jacket's back seam
    if (s.belt && !J) for (var bx = -hw; bx <= hw; bx++) M.px(bx, hy - 6 * k, ID.belt);
    var hc = [fr[2] * 0.8, sy - 5.9 * hk + fr[3] * 0.8 - fr[4] * 0.6], phone = kind === 'phone';
    [-1, 1].forEach(function (sd) {   // the arms: from behind, the upper arms and the elbows; a raised elbow lifts out and up
      var lift = sd < 0 ? fr[0] : fr[1], a = [sd * (sw - 0.3), sy + 2.6], e = [sd * (sw + 0.6 + lift * 0.9), sy + 11 * k - lift * 3.2];
      if (phone && sd < 0) { e = [-(sw + 1.6), sy + 4]; var hd = [hc[0] - 3.8, hc[1] + 1.6]; M.limb(a, e, 1.6 * b, 1.4 * b, sleeve); M.limb(e, hd, 1.3 * b, 1.1, sleeve); M.rect(hd[0] - 0.6, hd[1] - 0.8, 2, 2.4, ID.skin); M.rect(hd[0] + 1.2, hd[1] - 2, 1, 3.6, ID.phone); return; }
      M.limb(a, e, 1.6 * b, 1.4 * b, sleeve); M.limb(e, [e[0] - sd * 1.6, e[1] + 1.2], 1.3 * b, 1.2, sleeve);
      if (kind === 'talk' && lift > 1) { var w = [e[0] + sd * 3, e[1] - 4]; M.limb(e, w, 1.2 * b, 1, sleeve); M.rect(w[0] - 0.8, w[1] - 2.4, 2, 2.6, ID.skin); }   // a hand up, gesturing
    });
    // the head from behind: the back of the hair, the nape, the ears; turned, a sliver of cheek
    M.rect(hc[0] - 1.2, sy - 2.4 * hk, 3, 2, ID.skin); M.oval(hc[0], hc[1], 3.3 * hk, 4.1 * hk, ID.skin);
    var hs = s.hair.style;
    for (var yy = -5; yy <= 5; yy++) for (var xx = -5; xx <= 5; xx++) { if (Math.hypot(xx / (3.4 * hk), yy / (4.2 * hk)) > 1.08) continue; var nape = yy > 2.2 * hk, side = fr[2] && xx * fr[2] > 2.4 && yy > -1 && yy < 2;
      if (hs === 'bald') { if (yy > 0.5 && yy < 2 && Math.abs(xx) > 1) M.px(hc[0] + xx, hc[1] + yy, ID.hair); } else if (!nape && !side) M.px(hc[0] + xx, hc[1] + yy, ID.hair); }
    if (hs !== 'long') { M.px(hc[0] - 3.5 * hk, hc[1] + 0.6, ID.skin); M.px(hc[0] + 3.5 * hk, hc[1] + 0.6, ID.skin); }   // the ears
    if (hs === 'long') M.rect(hc[0] - 3.2, hc[1], 6.6, sy - hc[1] + 6, ID.hair);
    if (hs === 'bun') M.disc(hc[0], hc[1] - 3.6 * hk, 1.7, ID.hair);
    var ac = s.accent || {}; if (ac.type === 'scarf') M.limb([-3.4, sy - 0.4], [3.4, sy - 0.4], 1.3, 1.3, ID.accent);
    if (ac.type === 'cap') for (var cx = -4; cx <= 4; cx++) for (var cy = -5; cy <= -1; cy++) if (Math.hypot(cx, cy + 0.5) < 4.4) M.px(hc[0] + cx, hc[1] + cy, ID.accent);
    if (ac.type === 'bag') for (var t2 = 0; t2 <= 1; t2 += 0.06) M.px(-sw + t2 * sw * 2, sy + 1 + t2 * 14 * k, ID.accent);
  }

  function frame(s, kind, i, opts) { var M = new Map2(); if (kind.indexOf('back-') === 0) drawBack(M, s, kind.slice(5), i || 0); else { var P = pose(kind, i || 0, s); if (kind === 'front') drawFront(M, s, P); else drawBody(M, s, P); } return paint(M, s, opts); }
  var N = { walk: 8, push: 8, sweep: 12, play: 12, shovel: 12, idle: 24, hail: 6, front: 1, sit: 1, smoke: 20, phone: 16, watch: 12, wave: 12, shake: 14, talk: 16, 'back-eat': 12, 'back-drink': 12, 'back-phone': 12, 'back-talk': 12, cycle: 8 };
  function sheet(s, kind, opts) { var n = N[kind], c = document.createElement('canvas'); c.width = FW * n; c.height = FH; var g = c.getContext('2d'); for (var i = 0; i < n; i++) g.drawImage(frame(s, kind, i, opts), i * FW, 0); return { c: c, fw: FW, fh: FH, n: n, footX: GX, footY: GY, ms: (s.gait || BASE.gait).ms }; }

  window.FTBody2 = { BASE: BASE, spec: spec, frame: frame, sheet: sheet, FW: FW, FH: FH, GX: GX, GY: GY, N: N };
})();
