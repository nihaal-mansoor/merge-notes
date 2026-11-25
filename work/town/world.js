/* Fog Town: world.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt, brick = FT.brick, stone = FT.stone, stucco = FT.stucco, plate = FT.plate, planks = FT.planks, grime = FT.grime, crack = FT.crack, plaster = FT.plaster, cornice = FT.cornice, band = FT.band, win = FT.win, shopWin = FT.shopWin, door = FT.door, signBoard = FT.signBoard, drainpipe = FT.drainpipe, leaves = FT.leaves, vine = FT.vine, weeds = FT.weeds, STACKS = FT.STACKS, far = FT.far, mid = FT.mid, back = FT.back, B = FT.B, SIGNS = FT.SIGNS, goose = FT.goose, street = FT.street, front = FT.front, LAMP = FT.LAMP, POLE_A = FT.POLE_A, POLE_B = FT.POLE_B, prop = FT.prop, props = FT.props, lampCone = FT.lampCone, glowSprite = FT.glowSprite, finish = FT.finish, fogStrip = FT.fogStrip, puff = FT.puff, wireY = FT.wireY, capsLayer = FT.capsLayer, wetLayer = FT.wetLayer, vehicles = FT.vehicles, stranger = FT.stranger, dogSheet = FT.dogSheet, ratSheet = FT.ratSheet, bankLayer = FT.bankLayer, paintRoom = FT.paintRoom, build = FT.build, GRADE = FT.GRADE, sky = FT.sky, blend = FT.blend, tint = FT.tint, grade = FT.grade, Sound = FT.Sound;
  // ---------------------------------------------------------------- weather and the season, from the date
  function Weather(q, date) {
    var m = date.getMonth(); this.season = q.get('season') || (m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn');
    this.force = q.get('weather'); this.rain = 0; this.snow = 0; this.wet = 0; this.caps = 0; this.state = null; this.next = rand(120, 600);
    if (this.force === 'rain' || this.force === 'snow') { this.state = { type: this.force, t: 30, hold: 1e9 }; this.rain = this.force === 'rain' ? 1 : 0; this.snow = this.force === 'snow' ? 1 : 0; this.wet = this.rain; this.caps = this.snow; }
  }
  Weather.prototype.update = function (dt) {
    if (!this.state && this.force !== 'clear') { this.next -= dt; if (this.next <= 0) { this.next = rand(400, 1100); var ty = this.season === 'winter' ? (Math.random() < 0.6 ? 'snow' : 'rain') : this.season === 'summer' ? (Math.random() < 0.4 ? 'rain' : null) : 'rain'; if (ty) this.state = { type: ty, t: 0, hold: rand(60, 240) }; } }
    var target = 0; if (this.state) { var s = this.state; s.t += dt; target = s.t < 20 ? s.t / 20 : s.t < 20 + s.hold ? 1 : 1 - (s.t - 20 - s.hold) / 20; if (s.t > 40 + s.hold) this.state = null; }
    var rt = this.state && this.state.type === 'rain' ? clamp(target, 0, 1) : 0, st = this.state && this.state.type === 'snow' ? clamp(target, 0, 1) : 0;
    this.rain += (rt - this.rain) * Math.min(1, dt * 0.5); this.snow += (st - this.snow) * Math.min(1, dt * 0.5);
    this.wet = this.rain > this.wet ? this.wet + (this.rain - this.wet) * Math.min(1, dt * 0.1) : Math.max(this.rain, this.wet - dt / 150);
    this.caps = this.snow > 0.2 ? Math.min(1, this.caps + dt / 120) : Math.max(0, this.caps - dt / 200);
  };

  // ---------------------------------------------------------------- power: now and then the street's lights die, building by building out from the substation
  var ZONES = [[-10, 58], [58, 250], [250, 272], [272, 422], [422, 510], [510, 770], [770, 912], [912, 1040], [1040, 1104], [1104, 1196], [1196, 1300]];
  var SWX = B.switch[0] + 72, ZRANK = [];
  ZONES.map(function (z, i) { return [Math.abs((z[0] + z[1]) / 2 - SWX), i]; }).sort(function (a, b) { return a[0] - b[0]; }).forEach(function (a, rank) { ZRANK[a[1]] = rank; });
  function zoneOf(x) { for (var i = 0; i < ZONES.length; i++) if (x >= ZONES[i][0] && x < ZONES[i][1]) return i; return ZONES.length - 1; }
  function Power() { this.dip = null; this.next = rand(150, 420); this.force = null; }
  Power.prototype.update = function (dt, t, sound) {
    if (this.force) { if (!this.force.down && t > this.force.t0 + 0.16 * ZONES.length + 0.6) this.force = null; return; }
    if (!this.dip) { this.next -= dt; if (this.next <= 0) { this.next = rand(200, 600); this.dip = { t0: t, hold: rand(2, 6), up: false }; sound.tone({ f: 120, glide: 40, wave: 'sawtooth', vol: 0.04, dur: 0.9, pan: 0.6 }); } }
    else { var end = this.dip.t0 + 0.22 * ZONES.length + this.dip.hold; if (!this.dip.up && t > end) { this.dip.up = true; sound.powerUp(); } if (t > end + 0.18 * ZONES.length + 1) this.dip = null; }
  };
  Power.prototype.level = function (x, t) {
    var rk = ZRANK[zoneOf(x)];
    if (this.force) { var at = this.force.t0 + rk * 0.16; if (this.force.down) return t < at ? 1 : 0; at = this.force.t0 + (ZONES.length - rk) * 0.16; return t < at ? 0 : t < at + 0.4 ? (Math.random() < 0.5 ? 0.15 : 1) : 1; }
    if (!this.dip) return 1; var d = this.dip, off = d.t0 + rk * 0.22, on = d.t0 + 0.22 * ZONES.length + d.hold + (ZONES.length - rk) * 0.18;
    return t < off ? 1 : t < on ? 0 : t < on + 0.5 ? (Math.random() < 0.5 ? 0.15 : 1) : 1;
  };

  // ---------------------------------------------------------------- the people (the street's own cast): events, errands, a dog
  var LANES = [{ y: 534, dir: 1 }, { y: 548, dir: -1 }, { y: 562, dir: 1 }];
  var BENCH = [366, 380, 393], SEAT_BASE = 569, SEAT_V2 = 565;   // the bus shelter's bench: three seats in the clear glass (not behind its ad or the poster), and where a sitter's feet rest
  var DOORS = [86, 346, MIDX, 885, 1034];
  var SPOTS = [{ x: 404, lane: 2, what: 'bus', wait: [90, 260] }, { x: 229, lane: 0, what: 'vending', wait: [4, 6] }, { x: 258, lane: 2, what: 'phone', wait: [10, 22] }, { x: 802, lane: 0, what: 'smoke', wait: [10, 18] }, { x: 852, lane: 0, what: 'look', wait: [3, 8] },
    { x: 600, lane: 0, what: 'look', wait: [3, 7] }, { x: 160, lane: 0, what: 'look', wait: [3, 6] }, { x: 540, lane: 1, what: 'look', wait: [2, 5] }];
  function Crowd() { this.list = []; this.timer = 1; this.sheets = {}; this.phoneBusy = null;
    this.V2 = window.FTBody2 && FT.CAST2 ? window.FTBody2 : null; this.cast = this.cast2 = this.V2 ? FT.CAST2 : []; this.nextMeet = rand(20, 60); }   // everyone in town is the v2 body (body2.js) and the v2 cast (cast2.js)
  function pool(self) { return self.cast2 || self.cast; }
  // which v2 performance someone does while they stand at a spot
  function actFor(p) { return p.what === 'smoke' ? 'smoke' : p.what === 'phone' ? 'phone' : p.what === 'meet' ? 'shake' : p.what === 'bus' ? (p.seat != null ? 'sit' : pick(['watch', 'idle'])) : p.what === 'look' ? pick(['idle', 'watch', 'idle']) : 'idle'; }
  // the walk frame for how far someone has gone (so their feet stay planted)
  function walkFrame(p, s) { return s.v2 ? Math.floor(p.dist / (0.72 * s.h * s.stride) * 8) % 8 : Math.floor(p.dist / (s.h * 0.9) * s.mk.n) % s.mk.n; }
  // walking sheets are cached, but only up to a budget: past it, the sheet nobody has drawn for longest is let go (and repainted if they come back)
  var SHEET_CAP = 6 * 1024 * 1024;
  Crowd.prototype.sheet = function (def, stand, clim) {
    var key = def.id + (stand === true ? 's' : stand === false ? 'w' : stand) + clim, now = performance.now(), s = this.sheets[key]; if (s) { s.t = now; return s; }   // stand: true, false, or a pose ('sit', 'smoke', ...)
    var sp = this.V2.spec(FT.dress(def, clim)), mode = stand === true ? 'idle' : stand === false ? 'walk' : stand, sh = this.V2.sheet(sp, mode);   // their description, dressed for the weather, posed
    s = this.sheets[key] = { c: sh.c, mk: { fw: sh.fw, fh: sh.fh, n: sh.n, footX: sh.footX, footY: sh.footY, ms: sh.ms }, h: sp.height, stride: sp.gait.stride, v2: true, t: now, b: sh.c.width * sh.c.height * 4 };
    this.bytes = (this.bytes || 0) + s.b;
    while (this.bytes > SHEET_CAP) { var old = null; for (var k in this.sheets) if (k !== key && (!old || this.sheets[k].t < this.sheets[old].t)) old = k; if (!old) break; this.bytes -= this.sheets[old].b; delete this.sheets[old]; }
    return s;
  };
  Crowd.prototype.update = function (dt, S, hour, wx, scene, sound) {
    if (!this.V2) return; var self = this, busy = {}; this.list.forEach(function (p) { busy[p.def.id] = 1; }); if (scene.diner) scene.diner.stools.forEach(function (s) { if (s.def) busy[s.def.id] = 1; });
    var want = hour >= 1 && hour < 5.5 ? 1 : S.dark > 0.5 ? 3 : 6; if (wx.rain > 0.5 || wx.snow > 0.5) want = Math.max(1, want - 2);
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = rand(2, 9) * (S.dark > 0.5 ? 2 : 1);
      if (this.list.length < want) { var adults = pool(this).filter(function (d) { return d.age !== 'kid' && !busy[d.id]; }); if (adults.length) {
        var def = pick(adults), li = (Math.random() * 3) | 0, lane = LANES[li], fromDoor = Math.random() < 0.3 && li === 0, x = fromDoor ? pick(DOORS) : lane.dir > 0 ? -30 : W + 30;
        var p = { def: def, lane: li, x: x, dir: lane.dir, speed: (def.v2 ? rand(34, 46) : rand(26, 36)) * (def.age === 'elder' ? (def.v2 ? 0.6 : 0.75) : 1), dist: rand(0, 100), state: 'walk', alpha: fromDoor ? 0 : 1, fade: fromDoor ? 1 : 0, clim: wx.rain > 0.3 ? 'rain' : 'cold', lastF: -1 };
        if (Math.random() < 0.4) { var sp = SPOTS.filter(function (s) { return s.lane === li && (s.x - x) * lane.dir > 40 && !(s.what === 'phone' && (self.phoneBusy || scene.ring)); }); if (sp.length) p.stopAt = pick(sp);
          if (p.stopAt && p.stopAt.what === 'bus') { var taken = self.list.map(function (o) { return o.seat; }), free = BENCH.filter(function (bx) { return taken.indexOf(bx) < 0; }); p.seat = free.length ? pick(free) : null; p.stopAt = { x: p.seat != null ? p.seat : 428, lane: 2, what: 'bus', wait: p.stopAt.wait }; } }   // a seat on the shelter's bench, if there is one free
        if (li === 0 && !p.stopAt && Math.random() < 0.25) { var ds = DOORS.filter(function (d) { return (d - x) * lane.dir > 60; }); if (ds.length) p.enterAt = pick(ds); }
        if (def.age !== 'elder' && !this.list.some(function (o) { return o.dog; }) && Math.random() < 0.15) p.dog = true;
        this.list.push(p);
        if (!p.dog && Math.random() < 0.18) { var kids = pool(this).filter(function (d) { return d.age === 'kid' && !busy[d.id]; }); if (kids.length) this.list.push({ def: pick(kids), lane: li, x: x - lane.dir * 22, dir: lane.dir, speed: p.speed, dist: 0, state: 'walk', alpha: p.alpha, fade: p.fade, follow: p, clim: p.clim, lastF: -1 }); }
      } }
    }
    // now and then two people come toward each other along the same stretch of pavement, and stop to meet
    this.nextMeet -= dt;
    if (this.cast2 && this.nextMeet <= 0) { this.nextMeet = rand(45, 140) * (S.dark > 0.5 ? 2 : 1);
      var free2 = this.cast2.filter(function (d) { return d.age === 'adult' && !busy[d.id]; });
      if (!(hour >= 1 && hour < 5.5) && free2.length > 1 && this.list.length <= want) {
        var da = free2.splice((Math.random() * free2.length) | 0, 1)[0], db = pick(free2), cl = wx.rain > 0.3 ? 'rain' : 'cold';
        var A = { def: da, lane: 2, x: -30, dir: 1, speed: rand(34, 42), dist: 0, state: 'walk', alpha: 1, fade: 0, clim: cl, lastF: -1 }, Bq = { def: db, lane: 2, x: W + 30, dir: -1, speed: rand(34, 42), dist: rand(0, 40), state: 'walk', alpha: 1, fade: 0, clim: cl, lastF: -1 };
        A.partner = Bq; Bq.partner = A; this.list.push(A, Bq); } }
    this.list.forEach(function (p) {
      if (p.fade) { p.alpha = clamp(p.alpha + p.fade * dt * 1.6, 0, 1); if (p.alpha >= 1 && p.fade > 0) p.fade = 0; }
      if (p.follow) { p.at = (p.at || 0) + dt; p.x = p.follow.x - p.dir * 22; p.state = p.follow.state; p.dist += p.follow.state === 'walk' ? p.speed * dt : 0; p.alpha = p.follow.alpha; if (p.follow.gone) p.gone = true; return; }
      if (p.board) { p.alpha -= dt * 1.6; p.x += (404 - p.x) * Math.min(1, dt * 2); if (p.alpha <= 0) p.gone = true; return; }   // getting on the bus
      if (p.state === 'stand') { p.wait -= dt; p.waited += dt; p.at = (p.at || 0) + dt;
        if (p.act === 'shake' && p.at > 1.12) { p.act = 'talk'; p.at = p.dir < 0 ? 0.64 : 0; }   // after the handshake they talk, taking turns
        if (p.what === 'vending' && !p.vended && p.waited > 1.4) { p.vended = true; scene.vend(sound); }
        if (p.wait <= 0) { p.state = 'walk'; if (p.what === 'phone') self.phoneBusy = null; p.what = null; p.seat = null; } return; }
      if (p.partner && !p.met && p.partner.state === 'walk' && (p.partner.x - p.x) * p.dir > 0 && Math.abs(p.partner.x - p.x) < 22) { var len = rand(7, 14); [p, p.partner].forEach(function (o) { o.state = 'stand'; o.what = 'meet'; o.act = 'shake'; o.at = 0; o.wait = len; o.waited = 0; o.met = true; }); if (/[?&]debug/.test(location.search)) console.log('dbg meet at ' + Math.round(p.x)); return; }   // two people meet: a handshake, a talk
      var ahead = null; self.list.forEach(function (o) { if (o !== p && !o.follow && o.lane === p.lane && o.dir === p.dir && (o.x - p.x) * p.dir > 0 && (!ahead || Math.abs(o.x - p.x) < Math.abs(ahead.x - p.x))) ahead = o; });
      var v = p.speed; if (ahead && Math.abs(ahead.x - p.x) < 26) v = ahead.state === 'walk' ? Math.min(v, ahead.speed) : 0;
      p.x += p.dir * v * dt; p.dist += v * dt;
      if (v > 0 && sound.on && p.alpha > 0.5 && p.x > 0 && p.x < W) { var s = self.sheet(p.def, false, p.clim), n = s.mk.n, f = walkFrame(p, s); if ((f === 0 || f === n / 2) && f !== p.lastF) sound.step((p.x / W) * 1.6 - 0.8, 0.012 + p.lane * 0.006); p.lastF = f; }
      if (p.stopAt && (p.stopAt.x - p.x) * p.dir <= 0) { if (p.stopAt.what === 'phone') { if (self.phoneBusy || scene.ring) { p.stopAt = null; } else { self.phoneBusy = p; } } if (p.stopAt) { p.state = 'stand'; p.what = p.stopAt.what; p.wait = rand(p.stopAt.wait[0], p.stopAt.wait[1]); p.waited = 0; p.x = p.stopAt.x; if (p.seat != null) p.dir = 1; p.act = p.def.v2 ? actFor(p) : null; p.at = 0; p.stopAt = null; } }   // (sitting, they look the way the bus comes)
      if (p.enterAt != null && (p.enterAt - p.x) * p.dir <= 0) { if (p.enterAt === MIDX && scene.diner && !p.follow) p.toDiner = true; p.x = p.enterAt; p.enterAt = null; p.fade = -1; p.leaving = true; }
      if (p.leaving && p.alpha <= 0) { p.gone = true; if (p.toDiner) scene.diner.arrive(p.def); }
      if (p.x < -50 || p.x > W + 50) p.gone = true;
    });
    if (this.phoneBusy && this.phoneBusy.gone) this.phoneBusy = null;
    this.list = this.list.filter(function (p) { return !p.gone; });
  };
  // someone leaving the diner steps out of its door onto the pavement
  Crowd.prototype.spawnAt = function (def, x) {
    var self = this; if (!def.v2 && this.cast2) { var busy = {}; this.list.forEach(function (o) { busy[o.def.id] = 1; }); var fr = this.cast2.filter(function (d) { return d.age === 'adult' && !busy[d.id]; }); if (fr.length) def = pick(fr); }   // (on the street, the v2 cast)
    var dir = Math.random() < 0.5 ? 1 : -1; self.list.push({ def: def, lane: dir > 0 ? 0 : 1, x: x, dir: dir, speed: def.v2 ? rand(34, 44) : rand(26, 34), dist: 0, state: 'walk', alpha: 0, fade: 1, clim: 'cold', lastF: -1 }); };
  Crowd.prototype.items = function (t, L) {
    var self = this, out = [];
    this.list.forEach(function (p) {
      var sit = p.state === 'stand' && p.seat != null && !p.board, v2 = !!p.def.v2, mode = p.state !== 'stand' || p.board ? false : v2 ? (p.act || (sit ? 'sit' : 'idle')) : (sit ? 'sit' : true);
      var s = self.sheet(p.def, mode, p.clim), mk = s.mk, f = mode === false ? walkFrame(p, s) : v2 ? Math.floor((p.at || 0) * 1000 / mk.ms) % mk.n : Math.floor(t * 6) % mk.n, y = sit ? (v2 ? SEAT_V2 : SEAT_BASE) : LANES[p.lane].y;   // v2: a performance played from its start
      out.push({ base: y, x: p.x, h: s.h, draw: function (g) { var x = Math.round(p.x); g.globalAlpha = p.alpha; g.fillStyle = 'rgba(30,32,30,0.22)'; g.fillRect(x - 8, y - 1, 16, 2); g.save(); g.translate(x, y); if (p.dir < 0) g.scale(-1, 1); g.drawImage(s.c, f * mk.fw, 0, mk.fw, mk.fh, -mk.footX, -mk.footY, mk.fw, mk.fh); g.restore(); g.globalAlpha = 1; } });
      if (p.dog && L.dog) { var D = L.dog, df = p.state === 'stand' ? 4 + (Math.floor(t * 2) % 2) : Math.floor(p.dist / 9) % 4, dx = Math.round(p.x + p.dir * 24);
        out.push({ base: y + 0.5, draw: function (g) { g.globalAlpha = p.alpha; g.save(); g.translate(dx, y - D.fh); if (p.dir < 0) { g.scale(-1, 1); } g.drawImage(D.c, df * D.fw, 0, D.fw, D.fh, -D.fw / 2, 0, D.fw, D.fh); g.restore(); g.globalAlpha = 1; } }); }
    });
    return out;
  };

  // ---------------------------------------------------------------- inside the diner: stools filled by people who walk in off the street, someone working the counter
  // the people at the counter are seen from behind (body2.js 'back-' poses); the waiter walks and waits behind it
  var WAITER = { height: 54, shape: 'f', skin: '#d88a62', hair: { style: 'bun', col: '#6a3a2a' }, jacket: null, tie: null, belt: '#e8e2d2', shirt: { col: '#e8e2d2', sleeves: 'short' }, legs: { col: '#5f7470', type: 'dress', tights: null }, shoes: { col: '#e8e2d2', boots: false }, gait: { stride: 0.8, bob: 0.9, swing: 0.8, lean: 0, ms: 84 } };
  function Diner() { var D = FT.DINER; this.V2 = window.FTBody2; this.sheets = {}; this.next = rand(15, 45); this.stools = D.stools.map(function (x) { return { x: x, def: null, kind: 'eat', alpha: 0, fade: 0 }; }); this.server = { x: 600, dir: 1, state: 'walk', wait: 0, target: 700, dist: 0, alpha: 1 }; }
  Diner.prototype.sheet = function (def, mode, key) {   // def: a cast member (or null for the waiter); mode: a body2.js pose
    if (this.sheets[key]) return this.sheets[key]; var sp = this.V2.spec(def ? FT.dress(def, 'summer') : WAITER), sh = this.V2.sheet(sp, mode);   // (indoors: no coats)
    return (this.sheets[key] = { c: sh.c, mk: { fw: sh.fw, fh: sh.fh, n: sh.n, footX: sh.footX, footY: sh.footY, ms: sh.ms }, h: sp.height, stride: sp.gait.stride }); };
  Diner.prototype.fill = function (cast, n) { var adults = cast.filter(function (d) { return d.age !== 'kid'; }); for (var i = 0; i < n; i++) { var free = adults.filter(function (d) { return !this.has(d.id); }, this); if (free.length) this.arrive(pick(free), true); } };
  Diner.prototype.has = function (id) { return this.stools.some(function (s) { return s.def && s.def.id === id; }); };
  Diner.prototype.arrive = function (def, now) { var free = this.stools.filter(function (s) { return !s.def; }); if (!free.length) return false; var s = pick(free); s.def = def; s.alpha = now ? 1 : 0; s.fade = now ? 0 : 1; s.kind = pick(['eat', 'drink', 'phone', 'talk', 'eat']); return true; };
  Diner.prototype.update = function (dt, crowd, hour) {
    var self = this; this.next -= dt;
    if (this.next <= 0) { this.next = rand(25, 80); var occ = this.stools.filter(function (s) { return s.def && !s.leaving; }); if (occ.length > (hour >= 1 && hour < 5 ? 1 : 0) && Math.random() < 0.6) { var s = pick(occ); s.fade = -1; s.leaving = true; } }
    this.stools.forEach(function (s) { if (s.fade) { s.alpha = clamp(s.alpha + s.fade * dt * 1.4, 0, 1); if (s.alpha >= 1 && s.fade > 0) s.fade = 0; if (s.leaving && s.alpha <= 0) { if (crowd) crowd.spawnAt(s.def, MIDX); s.def = null; s.leaving = false; s.fade = 0; } } });
    var sv = this.server; if (sv.state === 'stand') { sv.wait -= dt; if (sv.wait <= 0) { sv.state = 'walk'; sv.target = rand(540, 740); sv.dir = sv.target > sv.x ? 1 : -1; } }
    else { var step = 16 * dt; sv.x += sv.dir * step; sv.dist += step; if ((sv.target - sv.x) * sv.dir <= 0) { sv.state = 'stand'; sv.wait = rand(2, 7); } }
  };
  FT.Diner = Diner; FT.ZONES = ZONES; FT.SWX = SWX; FT.ZRANK = ZRANK; FT.LANES = LANES; FT.DOORS = DOORS; FT.SPOTS = SPOTS; FT.Weather = Weather; FT.zoneOf = zoneOf; FT.Power = Power; FT.Crowd = Crowd; 
})(window.FT = window.FT || {});
