/* Fog Town: life.js. The small life of the street, on top of the crowd (world.js) and the scene (scene.js).
   - the day's routine: the sweeper at dawn, the bin round, the papers dropped at the news stand before it opens,
     the diner's change of shift, the cook's smoke break, a musician at dusk, the bookshop's OPEN sign
   - moments: someone hails the taxi, an old woman feeds the pigeons on the bench, a pram, a couple out walking,
     an apple dropped from a bag of shopping
   - the weather: a snow shoveller, breath and exhaust in the cold, spray from puddles when a car goes by
   - what is always moving: the wires, the blade sign in the alley, the washing across it, litter on the wind,
     steam from the manholes and from the diner's kitchen hood, the tarp on the scaffolding
   - the windows: curtains drawn at bedtime, a rug shaken out, a smoker leaning out, the cat on the sill
   - the sky: planes, a shooting star, the starlings at dusk, the real phase of the moon, searchlights in the fog,
     a siren somewhere in the far town
   - what isn't right: a light behind the boarded window, the diner clock that stops at 3:33 (scene.js), a second
     MISSING poster for people who come back, a bell that strikes thirteen at midnight, the cat that stares at the switch
   Everything here is an event with its own odds and hours, not a loop. People use the v2 body (body2.js) and share the
   crowd's sheet cache, so they count against the same memory. */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, MIDX = FT.MIDX, rand = FT.rand, pick = FT.pick, clamp = FT.clamp, mix = FT.mix, rgba = FT.rgba;
  var PI2 = Math.PI * 2, FAR_LANE = 642;
  function line(g, x0, y0, x1, y1) { var n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (var i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); }

  // ---------------------------------------------------------------- who they are (in the cast's form, cast2.js, so FT.dress can dress them)
  function person(id, o) {
    var jk = o.jacket || null, base = { height: o.height || 55, build: o.build || 1, shape: o.shape || 'm', skin: o.skin || '#c87a54', hair: o.hair || { style: 'short', col: '#3a2418' }, face: o.face || { glasses: null, beard: false },
      shirt: o.shirt || { col: '#c8d0c8', sleeves: 'long' }, tie: null, belt: null, jacket: jk, legs: o.legs || { col: '#2a2a30', type: 'trousers', tights: null }, shoes: { col: o.shoe || '#141212', boots: !!o.boots },
      accent: o.accent || { type: null, col: '#a8463a' }, gait: o.gait || { stride: 0.95, bob: 1, swing: 0.9, lean: 0.3, ms: 84 } };
    return { id: 'x-' + id, v2: true, age: o.age || 'adult', base: base, coat: { col: o.coat || (jk ? jk.col : '#3a4050'), len: o.len || 'hip', open: false }, scarf: false, summerBare: false, short: false };
  }
  var OLD = { stride: 0.62, bob: 0.45, swing: 0.4, lean: 1.3, ms: 118 };
  var DEF = {
    sweeper: person('sweeper', { height: 52, skin: '#c87a54', hair: { style: 'short', col: '#a8a49c' }, jacket: { col: '#6a564a', open: false, len: 'hip', leather: false }, coat: '#6a564a', accent: { type: 'cap', col: '#4a4a3a' }, gait: OLD }),
    binman: person('binman', { height: 56, build: 1.2, skin: '#8a5238', hair: { style: 'short', col: '#141010' }, jacket: { col: '#d8742a', open: false, len: 'hip', leather: false }, coat: '#d8742a', legs: { col: '#2a3040', type: 'trousers', tights: null }, boots: true }),
    courier: person('courier', { height: 55, skin: '#e8a07a', hair: { style: 'short', col: '#5a3a22' }, jacket: { col: '#3a4a3a', open: false, len: 'hip', leather: false }, coat: '#3a4a3a', accent: { type: 'cap', col: '#2a2a2e' } }),
    waiterIn: person('waiter-in', { height: 53, shape: 'f', skin: '#a86a48', hair: { style: 'long', col: '#2a1c16' }, jacket: { col: '#7a6a5a', open: false, len: 'knee', leather: false }, coat: '#7a6a5a', len: 'knee', legs: { col: '#2a2224', type: 'skirt', tights: '#2e2828' } }),
    waiterOut: person('waiter-out', { height: 54, shape: 'f', skin: '#d88a62', hair: { style: 'bun', col: '#6a3a2a' }, jacket: { col: '#3a4050', open: true, len: 'knee', leather: false }, coat: '#3a4050', len: 'knee', legs: { col: '#5f7470', type: 'skirt', tights: '#2e2828' } }),
    cook: person('cook', { height: 56, build: 1.15, skin: '#e0906a', hair: { style: 'short', col: '#2a1c16' }, shirt: { col: '#e8e4da', sleeves: 'short' }, jacket: { col: '#e8e4da', open: false, len: 'hip', leather: false }, coat: '#e8e4da', legs: { col: '#3a3e44', type: 'trousers', tights: null }, accent: { type: 'cap', col: '#e8e4da' } }),
    musician: person('musician', { height: 55, skin: '#6a4030', hair: { style: 'short', col: '#141010' }, face: { glasses: null, beard: true }, jacket: { col: '#4a3a2a', open: true, len: 'hip', leather: true }, coat: '#4a3a2a' }),
    feeder: person('feeder', { height: 50, shape: 'f', skin: '#f0b890', hair: { style: 'bun', col: '#c8c4bc' }, face: { glasses: 'clear', beard: false }, jacket: { col: '#5f7470', open: false, len: 'knee', leather: false }, coat: '#5f7470', len: 'knee', legs: { col: '#4a3a3a', type: 'skirt', tights: '#8a7a6a' }, age: 'elder', gait: OLD }),
    parent: person('parent', { height: 53, shape: 'f', skin: '#c87a54', hair: { style: 'long', col: '#3a2418' }, jacket: { col: '#a8463a', open: true, len: 'hip', leather: false }, coat: '#8a5a3a', legs: { col: '#34446a', type: 'trousers', tights: null } }),
    loverA: person('lover-a', { height: 56, skin: '#e8a07a', hair: { style: 'short', col: '#2a1c16' }, jacket: { col: '#2a2a2e', open: true, len: 'hip', leather: false }, coat: '#2a2a2e', len: 'knee' }),
    loverB: person('lover-b', { height: 52, shape: 'f', skin: '#a86a48', hair: { style: 'long', col: '#141010' }, jacket: { col: '#c9a55a', open: false, len: 'hip', leather: false }, coat: '#b8a27a', len: 'knee', legs: { col: '#1e1a1a', type: 'skirt', tights: '#2e2828' }, boots: true }),
    shopper: person('shopper', { height: 54, skin: '#e0906a', hair: { style: 'short', col: '#8a5a3a' }, face: { glasses: 'clear', beard: false }, jacket: { col: '#5a6a7a', open: true, len: 'hip', leather: false }, coat: '#4c5a7a' }),
    shoveller: person('shoveller', { height: 56, build: 1.2, skin: '#c87a54', hair: { style: 'short', col: '#3a2418' }, face: { glasses: null, beard: true }, jacket: { col: '#6a3a3a', open: false, len: 'hip', leather: false }, coat: '#6a3a3a', accent: { type: 'cap', col: '#3a5a6a' }, boots: true }),
    hailer: person('hailer', { height: 56, skin: '#f0b890', hair: { style: 'short', col: '#141010' }, jacket: { col: '#1e1c1e', open: false, len: 'knee', leather: false }, coat: '#1e1c1e', len: 'knee', shirt: { col: '#e8e2d2', sleeves: 'long' } })
  };

  // ---------------------------------------------------------------- an extra: walks in, does a thing, goes; its steps are a little script
  // steps: { go: x [, as: 'push'] } walk there; { do: pose, for: s [, face, move] } a pose for a while (moving along at 'move' px/s);
  // { until: fn [, as] } a pose until fn(extra) is true; { fn: fn } once; { fade: +1 / -1 }; { y: y } step to another depth
  function Extra(life, def, o) {
    this.life = life; this.def = def; this.x = o.x; this.y = o.y; this.base = o.base; this.dir = o.dir || 1; this.speed = o.speed || 34; this.steps = o.steps; this.si = -1; this.st = 0; this.at = 0; this.dist = 0;
    this.alpha = o.fadeIn ? 0 : 1; this.fade = o.fadeIn ? 1 : 0; this.over = o.over || null; this.under = o.under || null; this.mode = 'walk'; this.data = {}; this.next();
  }
  Extra.prototype.next = function () { this.si++; this.st = 0; var s = this.steps[this.si]; if (!s) { this.gone = true; return; } if (s.do) { this.mode = s.do; this.at = 0; if (s.face) this.dir = s.face; } else if (s.until) { this.mode = s.as || 'idle'; this.at = 0; if (s.face) this.dir = s.face; } };
  Extra.prototype.update = function (dt) {
    if (this.fade) { this.alpha = clamp(this.alpha + this.fade * dt * 1.6, 0, 1); if (this.fade > 0 && this.alpha >= 1) this.fade = 0; if (this.fade < 0 && this.alpha <= 0) { this.gone = true; return; } }
    var s = this.steps[this.si]; if (!s || this.gone) return; this.st += dt; this.at += dt;
    if (s.go != null) { this.mode = s.as || 'walk'; var d = s.go - this.x; if (Math.abs(d) < 0.8) { this.x = s.go; this.next(); return; } this.dir = d > 0 ? 1 : -1; var v = Math.min(Math.abs(d), (s.speed || this.speed) * dt); this.x += this.dir * v; this.dist += v; }
    else if (s.do) { if (s.move) this.x += this.dir * s.move * dt; if (this.st >= s.for) this.next(); }
    else if (s.until) { if (s.until(this)) this.next(); }
    else if (s.fn) { s.fn(this); this.next(); }
    else if (s.fade) { this.fade = s.fade; this.next(); }
    else if (s.y != null) { this.y = s.y; this.base = s.base; this.next(); }
  };
  Extra.prototype.items = function (crowd, t) {
    var self = this, walk = this.mode === 'walk' || this.mode === 'push', s = crowd.sheet(this.def, this.mode === 'walk' ? false : this.mode === 'idle' ? true : this.mode, this.life.clim), mk = s.mk, f;
    if (walk) f = Math.floor(this.dist / (0.72 * s.h * s.stride) * 8) % 8;
    else if (this.mode === 'hail') f = this.at < 0.4 ? Math.min(3, Math.floor(this.at / 0.1)) : 3 + Math.floor(this.at * 5) % 3;
    else f = Math.floor(this.at * 1000 / mk.ms) % mk.n;
    var x = Math.round(this.x), y = this.y, out = [{ base: this.base != null ? this.base : y, draw: function (g) {
      g.globalAlpha = self.alpha; g.fillStyle = 'rgba(30,32,30,0.22)'; g.fillRect(x - 8, y - 1, 16, 2);
      if (self.under) self.under(g, x, y, f, s.h, self, t);
      g.save(); g.translate(x, y); if (self.dir < 0) g.scale(-1, 1); g.drawImage(s.c, f * mk.fw, 0, mk.fw, mk.fh, -mk.footX, -mk.footY, mk.fw, mk.fh); g.restore();
      if (self.over) self.over(g, x, y, f, s.h, self, t); g.globalAlpha = 1; } }];
    return out;
  };

  // ---------------------------------------------------------------- what they carry
  function broom(g, x, y, f, h, e) { var d = e.dir, sw = Math.sin(f / 12 * PI2) * 4, tx = x + d * (15 + sw); g.fillStyle = '#8a6a4a'; line(g, x + d * 6, y - h * 0.5, tx, y - 3); g.fillStyle = '#5a4a32'; g.fillRect(Math.round(tx) - 3, y - 3, 7, 3); g.fillStyle = '#3a2e22'; g.fillRect(Math.round(tx) - 3, y - 1, 7, 1); }
  function binBag(g, x, y, f, h, e) { if (!e.data.bag) return; var d = e.dir, k = e.mode === 'idle' ? clamp(e.at / 3, 0, 1) : 1, bx = x + d * 9, by = e.mode === 'idle' ? (y - 4) + ((y - h * 0.42) - (y - 4)) * k : y - h * 0.38 + (Math.floor(e.dist / 9) % 2); g.fillStyle = '#1a1c1e'; g.fillRect(Math.round(bx) - 3, Math.round(by), 7, 8); g.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 3, 2); g.fillStyle = 'rgba(200,210,214,0.35)'; g.fillRect(Math.round(bx) - 2, Math.round(by) + 1, 1, 4); }
  function bundle(g, x, y, f, h, e) { if (e.data.dropped) return; var d = e.dir, bx = Math.round(x + d * 7), by = Math.round(y - h * 0.42); g.fillStyle = '#d8d2c2'; g.fillRect(bx - 5, by, 10, 6); g.fillStyle = '#8a8680'; g.fillRect(bx - 5, by + 2, 10, 1); g.fillStyle = '#6a4a32'; g.fillRect(bx, by, 1, 6); }
  function guitar(g, x, y, f, h, e) { if (e.mode !== 'play') return; var d = e.dir, gx = x + d * 3, gy = y - h * 0.4; g.fillStyle = '#8a5a2a'; g.fillRect(Math.round(gx) - 4, Math.round(gy) - 2, 8, 6); g.fillRect(Math.round(gx) - 3, Math.round(gy) - 4, 6, 2); g.fillStyle = '#2a1c12'; g.fillRect(Math.round(gx), Math.round(gy), 2, 2); g.fillStyle = '#4a3020'; line(g, gx + d * 4, gy - 1, gx + d * 13, gy - 8); }
  function guitarCase(g, x, y, f, h, e) { if (e.mode !== 'play') return; var cx = x - e.dir * 16; g.fillStyle = '#1e1c1e'; g.fillRect(cx - 9, y - 3, 18, 4); g.fillStyle = '#7a2a2a'; g.fillRect(cx - 8, y - 2, 16, 2); g.fillStyle = '#e0c060'; g.fillRect(cx - 4, y - 2, 1, 1); g.fillRect(cx + 2, y - 2, 1, 1); g.fillStyle = '#c8c4bc'; g.fillRect(cx + 5, y - 2, 1, 1); }
  function pram(g, x, y, f, h, e) { var d = e.dir, fx = x + d * 17, c = '#2a3040'; g.fillStyle = '#5a5e5c'; line(g, x + d * 8, y - h * 0.46, fx - d * 7, y - 18); g.fillStyle = c; g.fillRect(Math.round(fx) - 8, y - 18, 16, 9); g.fillRect(Math.round(fx) - 7, y - 9, 14, 1);
    g.fillRect(Math.round(fx) + (d > 0 ? 1 : -8), y - 24, 7, 6); g.fillStyle = '#3a4252'; g.fillRect(Math.round(fx) + (d > 0 ? 1 : -8), y - 24, 7, 1); g.fillStyle = '#e8e2d2'; g.fillRect(Math.round(fx) - 8, y - 17, 16, 1);
    var spin = Math.floor(e.dist / 3) % 2; g.fillStyle = '#1a1918'; [-5, 5].forEach(function (wx) { var cx = Math.round(fx) + wx; g.fillRect(cx - 2, y - 5, 4, 1); g.fillRect(cx - 2, y - 1, 4, 1); g.fillRect(cx - 3, y - 4, 1, 3); g.fillRect(cx + 2, y - 4, 1, 3); g.fillRect(cx - 1 + spin, y - 3, 1, 1); }); }
  function groceries(g, x, y, f, h, e) { var d = e.dir, bx = Math.round(x + d * 6), by = Math.round(y - h * 0.44) + (Math.floor(e.dist / 9) % 2); g.fillStyle = '#a8845a'; g.fillRect(bx - 4, by, 8, 9); g.fillStyle = '#c8a474'; g.fillRect(bx - 4, by, 8, 1); g.fillStyle = '#5a7a3a'; g.fillRect(bx - 2, by - 3, 1, 3); g.fillRect(bx + 1, by - 2, 1, 2); if (!e.data.dropped) { g.fillStyle = '#a8302a'; g.fillRect(bx + 2, by - 1, 2, 2); } }
  function shovel(g, x, y, f, h, e) { if (e.mode !== 'shovel') return; var d = e.dir, DX = [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0], lift = f > 5 && f < 9 ? [0, 0, 0, 0, 0, 0, 3, 7, 4][f] : 0, tx = x + d * (14 + DX[f]), ty = y - 2 - lift; g.fillStyle = '#6a5040'; line(g, x + d * 5, y - h * 0.44, tx, ty); g.fillStyle = '#8a8e8e'; g.fillRect(Math.round(tx) - 2, Math.round(ty), 6, 2); if (lift) { g.fillStyle = '#eef2f6'; g.fillRect(Math.round(tx) - 1, Math.round(ty) - 2, 4, 2); } }
  function ember(g, x, y, f, h, e) { if (e.mode === 'smoke' && e.life.S.dark > 0.3 && Math.sin(e.at * 3 + e.x) > -0.2) { g.fillStyle = '#ff9a4a'; g.fillRect(Math.round(x + e.dir * 7), Math.round(y - 34), 1, 1); } }

  // ---------------------------------------------------------------- the life of the street
  function Life(scene) {
    this.scene = scene; this.extras = []; this.clim = 'cold'; this.S = { dark: 0 }; this.timers = {}; this.later = [];
    this.pigeons = []; this.apples = []; this.dust = []; this.flecks = []; this.litter = []; this.spray = []; this.curtains = {}; this.cat = { mode: 'none', t: 0, next: rand(20, 60) };
    this.planes = []; this.nextPlane = rand(20, 90); this.star = null; this.nextStar = rand(60, 240); this.flock = null; this.flockDone = false; this.siren = null; this.nextSiren = rand(120, 400);
    this.nextSteam = 0; this.nextVent = 0; this.nextLitter = rand(10, 40); this.nextSlip = rand(30, 80); this.nextRug = rand(60, 300); this.rug = null; this.smoker = null; this.nextSmoker = rand(40, 200);
    this.shape = null; this.nextShape = rand(60, 200); this.lastHour = null; this.visits = null; this.sign = null;
    var q = location.search; this.forces = ((q.match(/[?&]life=([a-z,]+)/) || [])[1] || '').split(','); this.now = {};   // ?life=sweeper,cat (and so on): start them now, to look at
    if (/[?&]bells(&|=|$)/.test(q)) this.bellsAt = 0;
  }
  Life.prototype.want = function (k, once) { var i = this.forces.indexOf(k); if (i < 0) return false; if (once) this.forces.splice(i, 1); return true; };
  // hours and odds for each kind of extra (the hour is the visitor's own)
  var JOBS = {
    sweeper: { when: function (h, S, wx) { return h >= 6 && h < 8.5 && wx.rain < 0.3 && wx.snow < 0.3; }, every: [240, 500] },
    binman: { when: function (h) { return h >= 6.5 && h < 9; }, every: [300, 700] },
    delivery: { when: function (h) { return h >= 4.6 && h < 5; }, every: [600, 900] },
    shift: { when: function (h) { return (h >= 5.85 && h < 6.1) || (h >= 21.85 && h < 22.1); }, every: [900, 1200] },
    cook: { when: function (h) { return h >= 10 && h < 23.5; }, every: [300, 700] },
    musician: { when: function (h, S, wx) { return h >= 17 && h < 21.5 && wx.rain < 0.3 && wx.snow < 0.3; }, every: [400, 900] },
    feeder: { when: function (h, S, wx) { return h >= 8.5 && h < 16 && wx.rain < 0.3 && wx.snow < 0.5; }, every: [300, 700] },
    pram: { when: function (h, S, wx) { return h >= 9 && h < 18 && wx.rain < 0.5; }, every: [180, 420] },
    couple: { when: function (h) { return h >= 17 || h < 0.5; }, every: [240, 600] },
    shopper: { when: function (h) { return h >= 8 && h < 20; }, every: [200, 480] },
    shoveller: { when: function (h, S, wx) { return h >= 7 && h < 16 && wx.caps > 0.5; }, every: [240, 500] },
    hailer: { when: function (h, S, wx, life) { return (h >= 7 || h < 1) && !life.scene.cars.some(function (c) { return c.k === 'taxi'; }) && !(life.scene.bus && life.scene.bus.state !== 'stop'); }, every: [150, 400] }
  };
  Life.prototype.spawn = function (kind, L, hour) {
    var self = this, LN = FT.LANES, D = DEF, e, door = function () { FT.dinerDoor = 1.4; };
    if (kind === 'sweeper') e = new Extra(this, D.sweeper, { x: -20, y: LN[0].y, steps: [{ go: 20, speed: 20 }, { do: 'sweep', move: 6.5, for: 185 }, { go: W + 30, speed: 22 }], over: broom });
    if (kind === 'binman') e = new Extra(this, D.binman, { x: -20, y: LN[2].y, steps: [{ go: 842 }, { fn: function (x) { x.data.bag = 1; } }, { do: 'idle', face: 1, for: 4.5 }, { go: W + 30 }], over: binBag });
    if (kind === 'delivery') e = new Extra(this, D.courier, { x: W + 20, y: LN[0].y, dir: -1, steps: [{ go: 1134 }, { do: 'idle', for: 1.2 }, { fn: function (x) { x.data.dropped = 1; self.bundle = { x: 1124, until: 5.5 }; } }, { do: 'idle', for: 0.8 }, { go: W + 30 }], over: bundle });
    if (kind === 'shift') { e = new Extra(this, D.waiterIn, { x: -20, y: LN[0].y, steps: [{ go: MIDX }, { fn: door }, { fade: -1 }, { do: 'idle', for: 2 }] });
      this.later.push({ t: 45, fn: function () { self.extras.push(new Extra(self, D.waiterOut, { x: MIDX, y: LN[0].y, fadeIn: true, steps: [{ fn: door }, { do: 'idle', for: 1.2 }, { go: W + 30 }] })); } }); }
    if (kind === 'cook') e = new Extra(this, D.cook, { x: MIDX, y: LN[0].y, fadeIn: true, steps: [{ fn: door }, { do: 'idle', for: 1 }, { go: 771 }, { do: 'smoke', face: pick([-1, 1]), for: rand(45, 80) }, { go: MIDX }, { fn: door }, { fade: -1 }, { do: 'idle', for: 1 }], over: ember });
    if (kind === 'musician') e = new Extra(this, D.musician, { x: W + 20, y: LN[0].y, dir: -1, steps: [{ go: 1046 }, { do: 'play', face: -1, for: rand(150, 260) }, { go: W + 30 }], over: guitar, under: guitarCase });
    if (kind === 'feeder') e = new Extra(this, D.feeder, { x: W + 20, y: LN[2].y, dir: -1, speed: 22, steps: [{ go: 722 }, { y: 573, base: 577 }, { fn: function () { self.feeding = true; } }, { do: 'sit', face: -1, for: rand(120, 220) }, { fn: function () { self.feeding = false; } }, { y: LN[2].y }, { go: -30 }] });
    if (kind === 'pram') e = new Extra(this, D.parent, { x: W + 30, y: LN[1].y, dir: -1, speed: 28, steps: [{ go: -50, as: 'push' }], over: pram });
    if (kind === 'couple') { var X = rand(420, 900); e = new Extra(this, D.loverA, { x: -20, y: LN[2].y, speed: 30, steps: [{ go: X }, { do: 'talk', face: -1, for: 7 }, { go: W + 30 }] });
      this.extras.push(new Extra(this, D.loverB, { x: -36, y: LN[2].y - 1, speed: 30, steps: [{ go: X - 15 }, { do: 'idle', face: 1, for: 7 }, { go: W + 15 }] })); }
    if (kind === 'shopper') { var dropAt = rand(300, 1000); e = new Extra(this, D.shopper, { x: W + 20, y: LN[1].y, dir: -1, steps: [{ go: dropAt }, { fn: function (x) { if (Math.random() < 0.6) { x.data.dropped = 1; self.apples.push({ x: x.x - 6, y: x.y - 22, vx: rand(-14, -4), vy: -30, gy: x.y, age: 0, rest: false }); } } }, { go: -30 }], over: groceries }); }
    if (kind === 'shoveller') e = new Extra(this, D.shoveller, { x: W + 20, y: LN[0].y, dir: -1, steps: [{ go: 1262 }, { do: 'shovel', face: -1, move: 3, for: 55 }, { do: 'idle', for: 3 }, { go: W + 30 }], over: shovel });
    if (kind === 'hailer') { var HX = rand(520, 1060); e = new Extra(this, D.hailer, { x: -20, y: LN[2].y, steps: [{ go: HX }, { fn: function () { var V = L.veh.taxi; self.scene.cars.push({ k: 'taxi', dir: -1, x: W + 10, base: FAR_LANE, speed: V.speed, stopX: HX - V.w / 2, holdFor: 2.6 }); } },
      { until: function (x) { var c = self.scene.cars.filter(function (c) { return c.k === 'taxi'; })[0]; return !c || (c.held || 0) > 0.7; }, as: 'hail', face: 1 }, { fade: -1 }, { do: 'idle', for: 1 }] }); }
    if (e) this.extras.push(e);
  };
  Life.prototype.update = function (dt, t, hour, S, wx, L, crowd, sound) {
    var self = this, sc = this.scene; this.S = S; this.L = L; this.clim = wx.rain > 0.3 ? 'rain' : wx.snow > 0.3 ? 'snow' : 'cold';
    // the extras: one of each kind at a time, at their hours
    Object.keys(JOBS).forEach(function (k) { var J = JOBS[k], tm = self.timers[k]; if (tm == null) tm = self.timers[k] = rand(5, J.every[0] * 0.5);
      var busy = self.extras.some(function (e) { return e.kind === k; }); if (!busy && self.want(k, true)) { self.timers[k] = 0; tm = 0; self.now[k] = 1; }
      if (busy) return; self.timers[k] = tm - dt; if (self.timers[k] > 0) return;
      self.timers[k] = rand(J.every[0], J.every[1]); if (self.now[k] || J.when(hour, S, wx, self)) { delete self.now[k]; var n0 = self.extras.length; self.spawn(k, L, hour); for (var i = n0; i < self.extras.length; i++) self.extras[i].kind = k; } });
    this.later.forEach(function (l) { l.t -= dt; if (l.t <= 0) { l.done = true; l.fn(); } }); this.later = this.later.filter(function (l) { return !l.done; });
    this.extras.forEach(function (e) { e.update(dt);
      if (e.mode === 'smoke') { e.puff = (e.puff || 0) - dt; if (e.puff <= 0) { e.puff = rand(0.3, 0.6); sc.wisps.push({ x: e.x + e.dir * 7, y: e.y - 34, vx: rand(2, 6), vy: -rand(6, 12), age: 0, life: rand(2, 3.5), s: 3 }); } }
      if (e.mode === 'sweep') { e.puff = (e.puff || 0) - dt; if (e.puff <= 0) { e.puff = rand(0.25, 0.5); self.dust.push({ x: e.x + e.dir * 16, y: e.y - 2, vx: e.dir * rand(4, 12), vy: -rand(3, 9), age: 0, life: rand(0.8, 1.6) }); } }
      if (e.mode === 'shovel') { var f = Math.floor(e.at * 1000 / 84) % 12; if (f === 7 && e.lastF !== 7) for (var i = 0; i < 6; i++) self.flecks.push({ x: e.x + e.dir * 16, y: e.y - 8, vx: e.dir * rand(10, 30), vy: -rand(30, 60), age: 0, gy: e.y + rand(2, 10) }); e.lastF = f; }
      if (e.mode === 'play' && sound && sound.on && e.alpha > 0.5) { e.note = (e.note || 0) - dt; if (e.note <= 0) { e.note = pick([0.4, 0.4, 0.8, 0.2]); var P = [196, 220, 262, 294, 330, 392]; sound.tone({ f: [pick(P)], vol: 0.012, dur: 0.7, pan: (e.x / W) * 1.6 - 0.8, wave: 'triangle' }); } } });
    this.extras = this.extras.filter(function (e) { return !e.gone; });
    if (this.dbg = (this.dbg || 0) + dt, this.dbg > 4 && /[?&]debug/.test(location.search)) { this.dbg = 0; console.log("dbg life h=" + hour.toFixed(2) + " " + this.extras.map(function (e) { return e.kind + "@" + Math.round(e.x) + ":" + e.mode; }).join(" ") + " cat=" + this.cat.mode); }
    // the cold: breath in the air, exhaust from the cars
    var cold = wx.snow > 0.05 || wx.season === 'winter' || (wx.season === 'autumn' && S.dark > 0.5);
    if (cold && crowd) crowd.list.forEach(function (p) { if (p.alpha < 0.8 || p.def.age === 'kid') return; p.nb = (p.nb == null ? rand(0, 3) : p.nb) - dt; if (p.nb <= 0) { p.nb = rand(2.2, 4); var y = FT.LANES[p.lane].y; sc.wisps.push({ x: p.x + p.dir * 5, y: y - 46, vx: p.dir * 5 + rand(-2, 2), vy: -rand(3, 6), age: 0, life: rand(0.8, 1.3), s: 2 }); } });
    sc.cars.forEach(function (c) { var V = L.veh[c.k]; if (!V) return; if (cold) { c.ex = (c.ex || 0) - dt; if (c.ex <= 0) { c.ex = rand(0.15, 0.35); sc.wisps.push({ x: c.dir > 0 ? c.x + 2 : c.x + V.w - 2, y: c.base - 5, vx: -c.dir * rand(8, 18), vy: -rand(4, 9), age: 0, life: rand(0.8, 1.4), s: 3 }); } }
      // spray from the puddles by the kerb, when a car goes through one
      if (wx.wet > 0.3 && c.base === FAR_LANE && (c.v || c.speed) > 30) [212, 566, 905, 1150].forEach(function (px) { var fx = c.dir > 0 ? c.x + V.w * 0.75 : c.x + V.w * 0.25, was = c.lastFx; if (was != null && (was - px) * (fx - px) <= 0) for (var i = 0; i < 14; i++) self.spray.push({ x: px + rand(-6, 6), y: c.base - 2, vx: c.dir * rand(10, 40) + rand(-10, 10), vy: -rand(40, 110), age: 0 }); }); c.lastFx = c.dir > 0 ? c.x + V.w * 0.75 : c.x + V.w * 0.25; });
    // steam: the manholes (more in the cold, and at night), the diner's kitchen hood (more at meal times)
    this.nextSteam -= dt; if (this.nextSteam <= 0) { this.nextSteam = rand(0.8, 2.2) / (cold ? 1.6 : 1) / (S.dark > 0.5 ? 1.3 : 1); var mh = pick([[300, 652], [1010, 696]]); sc.steam.push({ x: mh[0] + rand(-6, 6), y: mh[1], vx: rand(-2, 6), vy: -rand(8, 14), age: 0, life: rand(2.5, 4), s: 6, v: (Math.random() * 4) | 0 }); }
    var meal = (hour >= 7 && hour < 9.5) || (hour >= 12 && hour < 14) || (hour >= 18 && hour < 21); this.nextVent -= dt; if (this.nextVent <= 0) { this.nextVent = meal ? rand(0.8, 1.6) : rand(2.5, 5); sc.steam.push({ x: 733, y: 402, vx: rand(2, 8), vy: -rand(10, 16), age: 0, life: rand(2, 3.2), s: 6, v: (Math.random() * 4) | 0 }); }
    // litter on the wind (dry days only)
    this.nextLitter -= dt; if (this.nextLitter <= 0) { this.nextLitter = rand(30, 90); if (wx.rain < 0.2 && wx.snow < 0.2 && this.litter.length < 2) this.litter.push({ x: -10, y: rand(530, 568), ph: 0, k: pick([0, 1]), spd: rand(30, 55) }); }
    // a slip on the ice
    if (wx.caps > 0.5 && crowd) { this.nextSlip -= dt; if (this.nextSlip <= 0) { this.nextSlip = rand(40, 110); var ws = crowd.list.filter(function (p) { return p.state === 'walk' && p.alpha >= 1 && !p.follow && p.def.age !== 'kid' && p.x > 60 && p.x < W - 60; }); if (ws.length) pick(ws).slip = 0.9; } }
    // the cat: on a sill by day, staring at the switch at night, after the rat when it runs
    var C = this.cat; C.t += dt; if (C.mode === 'chase') { C.x += C.dir * 95 * dt; if (C.x < 262) C.mode = 'none'; }
    else if (sc.rat && sc.rat !== this.seenRat) { this.seenRat = sc.rat; if (Math.random() < 0.45 && C.mode !== 'switch') { C.mode = 'chase'; C.x = 470; C.dir = -1; } }
    else if (C.mode !== 'none' && C.t > C.until) { C.mode = 'none'; C.next = rand(40, 160); }
    else if (C.mode === 'none') { C.next -= dt; if (C.next <= 0 || this.want('cat', true)) { if (S.dark > 0.6) { C.mode = 'switch'; C.until = rand(60, 140); } else if (wx.rain < 0.3) { C.mode = 'sill'; C.until = rand(90, 220); } C.t = 0; C.next = rand(40, 160); } }
    // the bell: thirteen at midnight
    if (this.lastHour != null && hour < this.lastHour - 12) this.bellsAt = 0; this.lastHour = hour;
    if (this.bellsAt === 0) { this.bellsAt = -1; if (sound && sound.on) for (var b = 0; b < 13; b++) sound.tone({ f: [131, 262, 311], vol: 0.04, dur: 3.2, at: b * 2.3, pan: -0.5, wave: 'sine' }); }
    if (this.visits == null && t > 3) { try { this.visits = +(localStorage.getItem('ft-visits') || 0); } catch (e) { this.visits = 0; } }
  };
  // the street's items (people, the cat, pigeons, apples, dust, litter): sorted with everyone else by how near they stand
  Life.prototype.items = function (t, dt, crowd) {
    var self = this, out = [], S = this.S;
    if (crowd) this.extras.forEach(function (e) { out = out.concat(e.items(crowd, t)); });
    if (this.bundle && FT.hourNow != null && FT.hourNow < this.bundle.until && FT.hourNow > 4) { var bu = this.bundle; out.push({ base: 528, draw: function (g) { g.fillStyle = '#d8d2c2'; g.fillRect(bu.x, 521, 12, 7); g.fillStyle = '#8a8680'; g.fillRect(bu.x, 524, 12, 1); g.fillStyle = '#6a4a32'; g.fillRect(bu.x + 5, 521, 1, 7); g.fillRect(bu.x, 523, 12, 1); } }); }
    // pigeons round the bench while she feeds them; off they go when she leaves
    if (this.feeding && this.pigeons.length < 6 && Math.random() < dt * 0.4) this.pigeons.push({ x: pick([-10, W + 10]), tx: rand(684, 760), y: rand(566, 573), ph: rand(0, 6) });
    if (!this.feeding && this.pigeons.length) { this.pigeons.forEach(function (p) { self.scene.birds.push({ x: p.x, y: p.y - 3, vx: rand(-60, 60), vy: rand(-70, -40), ph: 0 }); }); this.pigeons = []; }
    this.pigeons.forEach(function (p) { p.ph += dt; var d = p.tx - p.x; if (Math.abs(d) > 1) p.x += Math.sign(d) * Math.min(Math.abs(d), (Math.abs(d) > 60 ? 50 : 12) * dt); else if (Math.random() < dt * 0.3) p.tx = clamp(p.x + rand(-14, 14), 680, 764);
      var peck = Math.abs(d) <= 1 && Math.sin(p.ph * 5) > 0.6 ? 1 : 0, fly = Math.abs(d) > 60, x = Math.round(p.x), y = Math.round(p.y) - (fly ? 10 : 0), dir = d >= 0 ? 1 : -1;
      out.push({ base: p.y, draw: function (g) { g.fillStyle = '#6a6e72'; g.fillRect(x - 2, y - 3, 5, 3); g.fillStyle = '#8a8e92'; g.fillRect(x - 1, y - 3, 3, 1); g.fillStyle = '#4a4e52'; g.fillRect(x + dir * 2 - (dir < 0 ? 0 : 0), y - 4 + peck * 2, 2, 2); g.fillStyle = '#3a6a5a'; g.fillRect(x + dir, y - 3 + peck, 1, 1); g.fillStyle = '#c86a4a'; g.fillRect(x, y, 1, 1); if (fly) { g.fillStyle = '#6a6e72'; g.fillRect(x - 3, y - 4 - (Math.sin(p.ph * 20) > 0 ? 1 : 0), 7, 1); } } }); });
    if (this.feeding) { out.push({ base: 574, draw: function (g) { g.fillStyle = '#e0d8c0'; for (var i = 0; i < 7; i++) g.fillRect(690 + ((i * 37) % 64), 570 + ((i * 13) % 4), 1, 1); } }); }
    // the apple, rolling to the gutter
    this.apples.forEach(function (a) { a.age += dt; if (!a.rest) { a.vy += 320 * dt; a.x += a.vx * dt; a.y += a.vy * dt; if (a.y >= a.gy) { a.y = a.gy; if (Math.abs(a.vy) > 40) a.vy *= -0.35; else { a.vy = 0; a.gy = Math.min(573, a.gy + 10 * dt); a.y = a.gy; if (a.gy >= 573) a.rest = true; } } }
      var x = Math.round(a.x), y = Math.round(a.y); out.push({ base: a.y, draw: function (g) { g.globalAlpha = clamp((90 - a.age) / 10, 0, 1); g.fillStyle = '#a8302a'; g.fillRect(x, y - 2, 2, 2); g.fillStyle = '#3a5a2a'; g.fillRect(x + 1, y - 3, 1, 1); g.globalAlpha = 1; } }); });
    this.apples = this.apples.filter(function (a) { return a.age < 90; });
    // dust from the broom, snow off the shovel
    this.dust.forEach(function (d) { d.age += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 6 * dt; }); this.dust = this.dust.filter(function (d) { return d.age < d.life; });
    if (this.dust.length) out.push({ base: 600, draw: function (g) { self.dust.forEach(function (d) { g.fillStyle = rgba('#a89878', 0.6 * (1 - d.age / d.life)); g.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); }); } });
    this.flecks.forEach(function (f) { f.age += dt; if (f.y < f.gy) { f.vy += 260 * dt; f.x += f.vx * dt; f.y += f.vy * dt; } }); this.flecks = this.flecks.filter(function (f) { return f.age < 6; });
    if (this.flecks.length) out.push({ base: 601, draw: function (g) { g.fillStyle = '#eef2f6'; self.flecks.forEach(function (f) { g.fillRect(Math.round(f.x), Math.round(f.y), 2, 1); }); } });
    // litter on the wind: a sheet of newspaper, a plastic bag, tumbling along
    this.litter.forEach(function (l) { l.ph += dt; l.x += l.spd * dt * (0.6 + 0.6 * Math.abs(Math.sin(l.ph * 0.7))); var hop = Math.abs(Math.sin(l.ph * 2.3)) * (l.k ? 9 : 4), x = Math.round(l.x), y = Math.round(l.y - hop), fr = Math.floor(l.ph * 6) % 3;
      out.push({ base: l.y, draw: function (g) { g.fillStyle = l.k ? 'rgba(220,226,228,0.75)' : '#d8d2c2'; if (fr === 0) g.fillRect(x - 3, y - 1, 7, 1); else if (fr === 1) { g.fillRect(x - 2, y - 3, 5, 3); } else { g.fillRect(x - 1, y - 4, 3, 4); } if (!l.k) { g.fillStyle = '#8a8680'; g.fillRect(x - 1, y - 1 - (fr ? 1 : 0), 2, 1); } } }); });
    this.litter = this.litter.filter(function (l) { return l.x < W + 20; });
    // the cat at the switch (its back to you; it turns its head if you come close), and after the rat
    var C = this.cat, mouse = this.mouse || { x: -999, y: -999 };
    if (C.mode === 'switch') { var near = Math.hypot(mouse.x - 1172, mouse.y - 520) < 70; out.push({ base: 529, draw: function (g) { var x = 1172, y = 529; g.fillStyle = '#121214'; g.fillRect(x - 3, y - 7, 7, 7); g.fillRect(x - 2, y - 11, 5, 4); g.fillRect(x - 2, y - 12, 1, 1); g.fillRect(x + 2, y - 12, 1, 1); g.fillRect(x + 4, y - 2, 4, 1); g.fillRect(x + 7, y - 4, 1, 2);
      if (near) { g.fillStyle = '#c8e070'; g.fillRect(x - 1, y - 9, 1, 1); g.fillRect(x + 1, y - 9, 1, 1); } } }); }
    if (C.mode === 'chase') { var cx = Math.round(C.x), run = Math.floor(t * 12) % 2; out.push({ base: 528, draw: function (g) { g.fillStyle = '#121214'; g.save(); g.translate(cx, 528); if (C.dir < 0) g.scale(-1, 1); g.fillRect(-5, -6, 10, 4); g.fillRect(4, -8, 4, 4); g.fillRect(5, -9, 1, 1); g.fillRect(7, -9, 1, 1); g.fillRect(-8, -7 + run, 3, 1); g.fillRect(-4 + run * 2, -2, 1, 2); g.fillRect(3 - run * 2, -2, 1, 2); g.restore(); } }); }
    return out;
  };
  // ---------------------------------------------------------------- the sky: planes, a shooting star, the starlings, searchlights (before the far town)
  Life.prototype.sky = function (g, S, t, dt, hour, vis, wx) {
    var self = this;
    // planes: two lights crossing high up, one of them blinking
    this.nextPlane -= dt; if (this.nextPlane <= 0) { this.nextPlane = rand(90, 300); if (S.dark > 0.35) { var d = pick([-1, 1]); this.planes.push({ x: d > 0 ? -10 : W + 10, y: rand(30, 100), dir: d, v: rand(14, 22) }); } }
    this.planes.forEach(function (p) { p.x += p.dir * p.v * dt; g.fillStyle = rgba('#f4f0e0', 0.8 * vis); g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); if (Math.sin(t * 6) > 0.7) { g.fillStyle = rgba('#ff4a3a', 0.9 * vis); g.fillRect(Math.round(p.x) - p.dir * 3, Math.round(p.y), 1, 1); } });
    this.planes = this.planes.filter(function (p) { return p.x > -20 && p.x < W + 20; });
    // a shooting star, now and then on a clear night
    this.nextStar -= dt; if (this.nextStar <= 0) { this.nextStar = rand(200, 600); if (S.dark > 0.6 && vis > 0.5) this.star = { x: rand(200, 1100), y: rand(20, 120), vx: pick([-1, 1]) * rand(300, 420), vy: rand(90, 150), age: 0 }; }
    if (this.star) { var s = this.star; s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; for (var i = 0; i < 12; i++) { g.fillStyle = rgba('#f4f0ff', (1 - i / 12) * (1 - s.age / 0.5) * vis); g.fillRect(Math.round(s.x - s.vx * i * 0.006), Math.round(s.y - s.vy * i * 0.006), 1, 1); } if (s.age > 0.5) this.star = null; }
    // the starlings at dusk: one flock a dusk, a shape that pours and folds over the town
    if (S.warm > 0.3 && S.dark > 0.08 && S.dark < 0.6 && wx.rain < 0.3 && wx.snow < 0.3 && !this.flock && !this.flockDone && (this.want('flock') || Math.random() < dt / 40)) { this.flockDone = true; var bs = []; for (var b = 0; b < 90; b++) { var a = Math.random() * PI2, r = Math.sqrt(Math.random()); bs.push([Math.cos(a) * r, Math.sin(a) * r, Math.random() * PI2]); } this.flock = { t: 0, life: 70, bs: bs, dir: pick([-1, 1]) }; }
    if (S.dark > 0.7) this.flockDone = false;
    if (this.flock) { var F = this.flock; F.t += dt; var u = F.t / F.life, cx = F.dir > 0 ? -120 + u * (W + 240) : W + 120 - u * (W + 240), cy = 170 + Math.sin(F.t * 0.21) * 40, rx = 40 + 26 * Math.sin(F.t * 0.37), ry = 14 + 9 * Math.sin(F.t * 0.29 + 1), sh = 0.8 * Math.sin(F.t * 0.17), bend = 18 * Math.sin(F.t * 0.23 + 2);
      g.fillStyle = rgba('#26282a', 0.75 * vis); F.bs.forEach(function (q) { var x = cx + q[0] * rx + q[1] * ry * sh * 2 + Math.sin(F.t * 1.3 + q[2]) * 2, y = cy + q[1] * ry + q[0] * q[0] * bend + Math.cos(F.t * 1.1 + q[2]) * 1.5; g.fillRect(Math.round(x), Math.round(y), 1, 1); });
      if (F.t > F.life) this.flock = null; }
    // searchlights, sweeping the fog from somewhere beyond the town (not every night)
    var night = Math.floor((Date.now() / 864e5) - (hour < 12 ? 1 : 0)), lights = this.want('search') || (night * 7919 % 10) < 3;
    if (lights && S.dark > 0.6) { g.globalCompositeOperation = 'screen'; [[330, 0], [930, 2.1]].forEach(function (q) { var a = Math.sin(t * 0.07 + q[1]) * 0.45, bx = q[0], by = 420, len = 520, tx = bx + Math.sin(a) * len, ty = by - Math.cos(a) * len, gr = g.createLinearGradient(bx, by, tx, ty);
      gr.addColorStop(0, 'rgba(210,214,220,0.10)'); gr.addColorStop(0.6, 'rgba(210,214,220,0.04)'); gr.addColorStop(1, 'rgba(210,214,220,0)'); g.fillStyle = gr; var wv = 26, px = Math.cos(a) * wv, py = Math.sin(a) * wv; g.beginPath(); g.moveTo(bx - 2, by); g.lineTo(tx - px, ty - py); g.lineTo(tx + px, ty + py); g.lineTo(bx + 2, by); g.fill(); }); g.globalCompositeOperation = 'source-over'; }
  };
  // ---------------------------------------------------------------- the far town: a siren's lights somewhere in its streets
  Life.prototype.far = function (g, S, t, dt) {
    this.nextSiren -= dt; if (this.nextSiren <= 0 || this.want('siren', true)) { this.nextSiren = rand(200, 600); if (S.dark > 0.5) this.siren = { x: rand(120, 1160), y: rand(440, 470), age: 0, life: rand(8, 16), v: pick([-1, 1]) * rand(0, 14) }; }
    if (this.siren) { var s = this.siren; s.age += dt; s.x += s.v * dt; var on = Math.floor(t * 6) % 2, a = Math.min(1, s.age, s.life - s.age); g.globalCompositeOperation = 'screen'; g.fillStyle = rgba(on ? '#ff3a3a' : '#3a6aff', 0.35 * a); g.fillRect(Math.round(s.x) - 6, Math.round(s.y) - 3, 12, 6); g.fillStyle = rgba(on ? '#ff6a5a' : '#6a9aff', 0.9 * a); g.fillRect(Math.round(s.x) + (on ? -1 : 1), Math.round(s.y), 1, 1); g.globalCompositeOperation = 'source-over'; if (s.age > s.life) this.siren = null; }
  };
  // ---------------------------------------------------------------- on the walls: windows, signs, washing, the tarp, the eerie window, OPEN/CLOSED
  var BLADE = [252, 340, 15, 48], SILL = [186, 364], RUGWIN = [109, 270, 22, 36], SMOKEWIN = [74, 212, 22, 36], BOARD = [472, 360, 24, 40], TARP = [924, 234, 58, 62];
  Life.prototype.walls = function (g, L, S, t, dt, hour, wx, wind, power) {
    var self = this, dk = S.dark, dim = function (c, k) { return mix(c, '#0b0f18', (k == null ? 0.6 : k) * dk); }, gust = clamp(wind / 20, 0.4, 2);
    // the blade sign in the alley, on its chains: it swings in the wind (drawn a row at a time, sheared: no smoothing)
    if (!this.sign) { var c = document.createElement('canvas'); c.width = BLADE[2]; c.height = BLADE[3]; var q = c.getContext('2d'), r = FT.rng(9091); q.fillStyle = '#5a2a26'; q.fillRect(0, 0, 15, 48); q.fillStyle = '#7a4a40'; q.fillRect(0, 0, 15, 1); q.fillStyle = '#d8c8a8'; for (var gi = 0; gi < 7; gi++) for (var px = 0; px < 3; px++) for (var py = 0; py < 5; py++) if (r() < 0.45) q.fillRect(6 + px, 4 + gi * 6 + py, 1, 1); this.sign = c; this.signDim = {}; }
    var bucket = Math.round(dk * 8), sc = this.signDim[bucket]; if (!sc) { sc = this.signDim[bucket] = document.createElement('canvas'); sc.width = 15; sc.height = 48; var sq = sc.getContext('2d'); sq.drawImage(this.sign, 0, 0); sq.globalCompositeOperation = 'source-atop'; sq.fillStyle = 'rgba(11,15,24,' + (0.6 * bucket / 8).toFixed(2) + ')'; sq.fillRect(0, 0, 15, 48); }
    var sw = (Math.sin(t * 1.1) + 0.4 * Math.sin(t * 2.7 + 1)) * 1.6 * gust; g.fillStyle = dim('#22211f', 0.3); g.fillRect(248, 335, 22, 2); g.fillRect(266, 333, 2, 2); g.fillRect(Math.round(254 + sw * 0.05), 337, 1, 3); g.fillRect(Math.round(264 + sw * 0.05), 337, 1, 3);
    for (var row = 0; row < 48; row++) g.drawImage(sc, 0, row, 15, 1, Math.round(BLADE[0] + sw * row / 48), BLADE[1] + row, 15, 1);
    // washing across the alley (in by evening, and never out in the rain)
    if (hour >= 9 && hour < 19.5 && wx.rain < 0.2 && wx.snow < 0.2) { g.fillStyle = dim('#3a3a38', 0.3); for (var lx = 250; lx <= 272; lx++) g.fillRect(lx, Math.round(300 + Math.sin((lx - 250) / 22 * Math.PI) * 3), 1, 1);
      [[252, 7, 8, '#d8d4c8'], [260, 5, 10, '#3a4a6a'], [267, 3, 5, '#a8463a']].forEach(function (q, i) { var top = Math.round(300 + Math.sin((q[0] + q[1] / 2 - 250) / 22 * Math.PI) * 3) + 1; g.fillStyle = dim(q[3], 0.6); for (var r2 = 0; r2 < q[2]; r2++) { var o = Math.round(Math.sin(t * 1.9 + i * 1.3) * gust * 1.4 * r2 / q[2]); g.fillRect(q[0] + o, top + r2, q[1], 1); } g.fillStyle = dim('#8a8680', 0.4); g.fillRect(q[0], top - 1, 1, 1); g.fillRect(q[0] + q[1] - 1, top - 1, 1, 1); }); }
    // the tarp on the scaffolding: tied at the top, flapping at the bottom
    var tp = TARP; for (var tx = 0; tx < tp[2]; tx++) { var flap = Math.round((Math.sin(t * 2.3 + tx * 0.22) + 0.5 * Math.sin(t * 3.7 - tx * 0.4)) * 2.2 * gust * (0.4 + tx / tp[2])), hgt = tp[3] + flap - (tx > tp[2] - 9 ? Math.round((tx - tp[2] + 9) * (1.2 + Math.sin(t * 2) * 0.8) * gust) : 0);
      g.fillStyle = dim(tx % 9 < 1 ? '#3a5656' : tx % 9 < 4 ? '#4a6a6a' : '#527474', 0.6); g.fillRect(tp[0] + tx, tp[1], 1, Math.max(8, hgt)); }
    g.fillStyle = dim('#2a3a3a', 0.4); for (var tie = 0; tie < 4; tie++) g.fillRect(tp[0] + 3 + tie * 17, tp[1], 1, 2);
    // the bookshop's sign in its door, and the news stand's hours on its side
    var open = hour >= 9 && hour < 19; g.fillStyle = dim('#e8e2d2', 0.4); g.fillRect(877, 470, 16, 6); g.font = '6px VT323'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = dim(open ? '#2a6a4a' : '#8a2a2a', 0.3); g.fillText(open ? 'OPEN' : 'CLOSED', 885, 473);
    g.fillStyle = dim('#8a8680', 0.4); g.fillRect(885, 467, 1, 3);
    // curtains: drawn at bedtime in the lit windows, a room at a time; open again in the morning
    var wins = L.K && L.K.wins; if (wins) { if (!this.cw) this.cw = wins.filter(function (w) { return w.layer === 'street' && !w.door && !w.shop && !w.small && !w.diner && !w.lobby && w.w >= 14 && w.h >= 18; });
      var bed = hour >= 22.3 || hour < 6.8; this.cw.forEach(function (w, i) { var hsh = ((i * 7919) % 97) / 97; if (hsh > 0.4) return; var closeAt = 22.3 + hsh * 6, want = bed && (hour >= 22.3 ? hour >= closeAt : true) ? 1 : 0, cur = self.curtains[i] == null ? (w.isOn ? want : 0) : self.curtains[i];   // (four rooms in ten draw them)
        if (want === 1 && !w.isOn && cur === 0) return; cur += clamp(want - cur, -dt / 2.5, dt / 2.5); self.curtains[i] = cur; if (cur <= 0.01) return;
        var cc = ['#8a5a4a', '#b8a27a', '#5f7470', '#c8b8a0', '#6a4a4a'][i % 5], col = w.isOn ? mix(cc, '#ffd090', 0.4) : dim(cc, 0.85), half = Math.round(w.w / 2 * cur); g.fillStyle = col; g.globalAlpha = w.isOn ? 0.9 : 1; g.fillRect(w.x, w.y, half, w.h); g.fillRect(w.x + w.w - half, w.y, half, w.h); g.globalAlpha = 1;
        g.fillStyle = 'rgba(0,0,0,0.18)'; for (var f2 = 2; f2 < half; f2 += 3) { g.fillRect(w.x + f2, w.y, 1, w.h); g.fillRect(w.x + w.w - 1 - f2, w.y, 1, w.h); } }); }
    // a rug shaken out of a window, mid-morning
    this.nextRug -= dt; if (this.nextRug <= 0 || this.want('rug', true)) { this.nextRug = rand(200, 600); if (hour >= 8.5 && hour < 12.5 && wx.rain < 0.2) this.rug = { t: 0 }; }
    if (this.rug) { var rg = this.rug, rw = RUGWIN; rg.t += dt; var shake = Math.sin(rg.t * 14) * (Math.sin(rg.t * 0.9) > 0 ? 1 : 0.2); g.fillStyle = dim('#2a1d18', 0.3); g.fillRect(rw[0] + 2, rw[1] + rw[3] - 12, rw[2] - 4, 6); g.fillStyle = dim('#c87a54', 0.5); g.fillRect(rw[0] + 3, rw[1] + rw[3] - 4, 2, 2); g.fillRect(rw[0] + rw[2] - 5, rw[1] + rw[3] - 4, 2, 2);
      for (var rr = 0; rr < 12; rr++) { var o2 = Math.round(shake * rr / 6); g.fillStyle = dim(rr % 4 === 1 ? '#c9a55a' : rr % 4 === 3 ? '#3a4a6a' : '#8a2a2a', 0.6); g.fillRect(rw[0] + 3 + o2, rw[1] + rw[3] - 2 + rr, rw[2] - 6, 1); }
      if (Math.abs(shake) > 0.8 && Math.random() < 0.5) { g.fillStyle = dim('#a89878', 0.5); g.fillRect(Math.round(rw[0] + rand(0, rw[2])), Math.round(rw[1] + rw[3] + 12 + rand(0, 10)), 1, 1); } if (rg.t > 16) this.rug = null; }
    // a smoker leaning out of their window, late, when it's lit
    var smw = wins && (this.smw || (this.smw = wins.filter(function (w) { return Math.abs(w.x - SMOKEWIN[0]) < 5 && Math.abs(w.y - SMOKEWIN[1]) < 5; })[0]));
    this.nextSmoker -= dt; if (this.nextSmoker <= 0) { this.nextSmoker = rand(150, 500); if ((hour >= 21 || hour < 2) && smw && smw.isOn) this.smoker = { t: 0, life: rand(60, 120) }; }
    if (this.smoker && smw) { var sm = this.smoker; sm.t += dt; var a = clamp(Math.min(sm.t, sm.life - sm.t) / 1.5, 0, 1), hx = smw.x + 12, hy = smw.y + smw.h - 12; g.globalAlpha = a; g.fillStyle = '#16181c'; g.fillRect(hx - 3, hy - 2, 6, 6); g.fillRect(hx - 6, hy + 4, 12, 6); g.fillRect(hx + 4, hy + 6, 6, 2);
      if (Math.sin(sm.t * 2) > -0.3) { g.fillStyle = '#ff9a4a'; g.fillRect(hx + 10, hy + 6, 1, 1); } g.globalAlpha = 1; sm.puff = (sm.puff || 0) - dt; if (sm.puff <= 0) { sm.puff = rand(0.5, 1); this.scene.wisps.push({ x: hx + 10, y: hy + 5, vx: rand(2, 6), vy: -rand(5, 10), age: 0, life: rand(2, 3), s: 3 }); } if (sm.t > sm.life) this.smoker = null; }
    // the cat on the sill, its tail hanging down and flicking; at night its eyes catch the light
    if (this.cat.mode === 'sill') { var cx = SILL[0], cy = SILL[1], a2 = clamp(Math.min(this.cat.t, this.cat.until - this.cat.t) / 2, 0, 1), tail = Math.round(Math.sin(t * 1.3) * 1.5 + (Math.sin(t * 0.37) > 0.9 ? 2 : 0)); g.globalAlpha = a2; g.fillStyle = '#121214';
      g.fillRect(cx - 3, cy - 6, 7, 6); g.fillRect(cx - 2, cy - 10, 5, 4); g.fillRect(cx - 2, cy - 11, 1, 1); g.fillRect(cx + 2, cy - 11, 1, 1); for (var ty = 0; ty < 9; ty++) g.fillRect(cx + 3 + Math.round(tail * ty / 9), cy + ty, 1, 1);
      if (dk > 0.5) { g.fillStyle = '#c8e070'; g.fillRect(cx - 1, cy - 8, 1, 1); g.fillRect(cx + 1, cy - 8, 1, 1); } g.globalAlpha = 1; }
    // the boarded window: some nights, a light behind the boards; now and then something passes in front of it
    var nightNo = Math.floor(Date.now() / 864e5 - (hour < 12 ? 1 : 0)), candle = (this.want('board') || (nightNo * 31 % 7) < 2) && (hour >= 23 || hour < 4.5) && dk > 0.6;
    if (candle) { var b = BOARD; this.nextShape -= dt; if (this.nextShape <= 0) { this.nextShape = rand(90, 260); this.shape = { t: 0 }; } var occl = 1; if (this.shape) { this.shape.t += dt; occl = 1 - Math.sin(clamp(this.shape.t / 3, 0, 1) * Math.PI) * 0.85; if (this.shape.t > 3) this.shape = null; }
      var fl = (0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 2.3)) * occl; g.fillStyle = rgba('#ffb060', 0.55 * fl); g.fillRect(b[0], b[1], b[2], b[3]);
      var wd = dim('#7d6a52', 0.75); for (var b2 = 0; b2 < 3; b2++) { var by = b[1] + 3 + b2 * (b[3] - 6) / 3; g.fillStyle = mix(wd, '#000000', 0.1 - b2 * 0.04); g.beginPath(); g.moveTo(b[0] - 2, by + (b2 % 2 ? 2 : 0)); g.lineTo(b[0] + b[2] + 2, by - (b2 % 2 ? 0 : 2)); g.lineTo(b[0] + b[2] + 2, by + 5 - (b2 % 2 ? 0 : 2)); g.lineTo(b[0] - 2, by + 5 + (b2 % 2 ? 2 : 0)); g.closePath(); g.fill(); }
      if (this.glowOut) this.glowOut.push([b[0], b[1], b[2], b[3], '#ffb060', 0.25 * fl]); }
    // the diner's door, when someone goes in or comes out
    if (FT.dinerDoor > 0) { FT.dinerDoor -= dt; var dr = FT.DOORRECT && FT.DOORRECT.work; if (dr) { var op = Math.sin(clamp(FT.dinerDoor / 1.4, 0, 1) * Math.PI); g.fillStyle = mix('#f4d8a0', '#c89a5a', 0.3 * dk); g.fillRect(dr[0] + 2, dr[1] + 2, Math.round((dr[2] - 4) * op), dr[3] - 4); g.fillStyle = dim('#3a3e44', 0.3); g.fillRect(dr[0] + 2 + Math.round((dr[2] - 4) * op), dr[1] + 2, 2, dr[3] - 4); } }
  };
  // ---------------------------------------------------------------- in front: the wires (swaying), the shoes on them, the poster on the pole
  var wireT = 0, wireAmp = 1;
  function sway(x, k) { var A = FT.POLE_A, B2 = FT.POLE_B, u = (x - A[0]) / (B2[0] - A[0]); return Math.sin(u * Math.PI) * wireAmp * Math.sin(wireT * 0.9 + k * 0.8 + u * 1.7); }
  FT.wireAt = function (x, k) { return FT.wireY(x, k) + sway(x, k); };
  Life.prototype.front = function (g, S, t, dt, wind) {
    var dk = S.dark, A = FT.POLE_A, B2 = FT.POLE_B; wireT = t; wireAmp = 0.8 + clamp(wind, 0, 40) * 0.06;
    g.fillStyle = mix('#222424', '#0b0f18', 0.5 * dk); g.globalAlpha = 0.8;
    for (var k = 0; k < 3; k++) { var x0 = A[0], y0 = Math.round(FT.wireAt(x0, k)); for (var x = A[0] + 1; x <= B2[0]; x++) { var y = x === B2[0] ? -1 : Math.round(FT.wireAt(x, k)); if (y !== y0) { g.fillRect(x0, y0, x - x0, 1); x0 = x; y0 = y; } } }
    g.globalAlpha = 1;
    var sx3 = 470, sy3 = FT.wireAt(sx3, 1), swg = Math.round(Math.sin(t * 1.4) * 1.5); g.fillStyle = mix('#2f2e2b', '#0b0f18', 0.4 * dk); line(g, sx3, sy3, sx3 + 3 + swg, sy3 + 14); line(g, sx3 + 3 + swg, sy3 + 14, sx3 + 9 + swg, sy3 + 13); line(g, sx3, sy3, sx3 - 2 + swg, sy3 + 11);   // a pair of shoes
    g.fillStyle = mix('#3a3a38', '#0b0f18', 0.4 * dk); g.fillRect(sx3 + 4 + swg, Math.round(sy3) + 14, 7, 3); g.fillStyle = mix('#4a3a2e', '#0b0f18', 0.4 * dk); g.fillRect(sx3 - 4 + swg, Math.round(sy3) + 11, 6, 3);
    // the second MISSING poster, on the pole by the town sign: only for people who have been here before
    if (this.visits >= 2) { var px = 20, py = 428, d = function (c) { return mix(c, '#0b0f18', 0.6 * dk); }; g.fillStyle = d('#e8e2d0'); g.fillRect(px, py, 17, 22); g.fillStyle = d('#7a3b34'); g.fillRect(px + 2, py + 2, 13, 3); g.fillStyle = d('#8a8680'); g.fillRect(px + 4, py + 7, 9, 8); g.fillStyle = d('#3a3a38'); g.fillRect(px + 7, py + 8, 3, 3); g.fillRect(px + 6, py + 11, 5, 4);
      g.fillStyle = d('#5a5650'); g.fillRect(px + 3, py + 17, 11, 1); g.fillRect(px + 3, py + 19, 8, 1); g.fillStyle = d('#2a2826'); g.fillRect(px + 1, py, 1, 1); g.fillRect(px + 15, py, 1, 1); }
  };
  // ---------------------------------------------------------------- over the traffic: spray from the puddles
  Life.prototype.late = function (g, S, t, dt) {
    if (!this.spray.length) return; var dk = S.dark; g.fillStyle = mix('#c8d4d8', '#5a6470', 0.6 * dk);
    this.spray.forEach(function (p) { p.age += dt; p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt; g.fillRect(Math.round(p.x), Math.round(p.y), 1, p.vy < 0 ? 2 : 1); });
    this.spray = this.spray.filter(function (p) { return p.age < 0.7; });
  };
  FT.Life = Life;
})(window.FT = window.FT || {});
