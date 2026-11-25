/* Fog Town: scene.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt, brick = FT.brick, stone = FT.stone, stucco = FT.stucco, plate = FT.plate, planks = FT.planks, grime = FT.grime, crack = FT.crack, plaster = FT.plaster, cornice = FT.cornice, band = FT.band, win = FT.win, shopWin = FT.shopWin, door = FT.door, signBoard = FT.signBoard, drainpipe = FT.drainpipe, leaves = FT.leaves, vine = FT.vine, weeds = FT.weeds, STACKS = FT.STACKS, far = FT.far, mid = FT.mid, back = FT.back, B = FT.B, SIGNS = FT.SIGNS, goose = FT.goose, street = FT.street, front = FT.front, LAMP = FT.LAMP, POLE_A = FT.POLE_A, POLE_B = FT.POLE_B, prop = FT.prop, props = FT.props, lampCone = FT.lampCone, glowSprite = FT.glowSprite, finish = FT.finish, fogStrip = FT.fogStrip, puff = FT.puff, wireY = FT.wireY, capsLayer = FT.capsLayer, wetLayer = FT.wetLayer, vehicles = FT.vehicles, stranger = FT.stranger, dogSheet = FT.dogSheet, ratSheet = FT.ratSheet, bankLayer = FT.bankLayer, paintRoom = FT.paintRoom, build = FT.build, GRADE = FT.GRADE, sky = FT.sky, blend = FT.blend, tint = FT.tint, grade = FT.grade, Sound = FT.Sound, ZONES = FT.ZONES, SWX = FT.SWX, ZRANK = FT.ZRANK, LANES = FT.LANES, DOORS = FT.DOORS, SPOTS = FT.SPOTS, Weather = FT.Weather, zoneOf = FT.zoneOf, Power = FT.Power, Crowd = FT.Crowd;
  // ---------------------------------------------------------------- the frame
  var DOORRECT = { about: [72, 460, 26, 60], how: [331, 456, 30, 64], work: [627, 452, 26, 58], writing: [872, 458, 26, 62], toolkit: [1020, 462, 28, 58], hotel: [1228, 460, 32, 60] };
  function Scene(cv, F) {
    this.F = F; this.g = cv.getContext('2d'); this.g.imageSmoothingEnabled = false; this.cache = {}; this.key = '';
    this.smoke = []; this.ash = []; this.steam = []; this.birds = []; this.perched = []; this.leaves = []; this.drops = []; this.flakes = []; this.sparks = []; this.wisps = []; this.cars = []; this.moths = []; this.life = F && FT.Life ? new FT.Life(this) : null;   // the small life of the street (life.js)
    this.nextFlock = rand(4, 20); this.nextSteam = 0; this.flicker = 0; this.nextFlicker = rand(20, 90); this.nextWin = rand(3, 10); this.nextBank = rand(120, 400); this.nextFigure = rand(45, 160); this.nextRing = rand(30, 120); this.nextRat = rand(15, 80); this.nextCar = rand(2, 10); this.nextLand = rand(5, 25); this.nextGust = rand(6, 30); this.nextWisp = 0;
    this.stars = []; for (var s = 0; s < 70; s++) this.stars.push([Math.random() * W, Math.random() * 260, Math.random()]);
    for (var m = 0; m < 5; m++) this.moths.push({ a: rand(0, 6), r: rand(6, 22), sp: rand(1.5, 4), y: rand(-6, 10), j: rand(0, 9) });
    for (var pb = 0; pb < 3; pb++) this.perched.push({ x: rand(150, 1150), k: (Math.random() * 3) | 0, bob: rand(0, 6) });
    this.vendT = -1; this.ring = null; this.figure = null; this.bank = /[?&]bank(&|=|$)/.test(location.search) ? { t: 20, dur: 1e9, side: 1 } : null; this.rat = null; this.hcars = []; this.nextH = rand(0.5, 3); this.neonOff = -1; this.neonUntil = 0; this.nextNeon = rand(12, 40); this.chaseUntil = 0; this.nextChase = rand(6, 25); this.hotelE = 0; this.nextHotel = rand(8, 30); this.curtainT = -1; this.nextCurtain = rand(15, 50);
  }
  // warm up without drawing: smoke already rising and ash already falling when the page first shows
  // a footprint in the snow, left by someone's step (world.js calls this at each footfall)
  Scene.prototype.footprint = function (x, y, dir, f) { if (!this.F || !(this.capsAmt > 0.3)) return; this.prints = true; var pq = FT.scratch('prints', W, KERB - G).getContext('2d'); pq.fillStyle = 'rgba(40,50,62,0.34)'; pq.fillRect(Math.round(x + (f ? 2 : -2) * dir) - 1, Math.round(y - G - (f ? 0 : 1)), 2, 1); };
  Scene.prototype.warm = function () { var self = this; STACKS.forEach(function (s) { for (var i = 0; i < 14; i++) { var life = rand(6, 12), age = rand(0, life), vx = 14 * rand(0.5, 1.1), vy = -rand(8, 16); self.smoke.push({ x: s[0] + vx * age, y: s[1] - 2 + vy * age, vx: vx, vy: vy, age: age, life: life, s0: rand(8, 12), s1: rand(36, 60) }); } }); };
  Scene.prototype.vend = function (sound) { this.vendT = 0; if (sound) sound.clunk(); };
  Scene.prototype.spark = function () { for (var i = 0; i < 40; i++) this.sparks.push({ x: B.switch[0] + 72, y: G - 70, vx: rand(-90, 90), vy: rand(-140, 20), life: rand(0.3, 0.9), age: 0 }); };
  Scene.prototype.regrade = function (L, S) {
    var key = [S.dark, S.warm, S.dawn, S.rain, S.snow || 0].map(function (v) { return Math.round(v * 40); }).join(','); if (key === this.key) return; this.key = key; var c = this.cache, cols = FT.skyCols(S, true); this.cols = cols;
    c.sky = FT.bandedSky(cols, S, c.sky);
    ['horizon', 'far', 'mid', 'hwy', 'rail', 'back'].forEach(function (k) { c[k] = FT.skyGrade(L[k], k, S, cols, c[k]); });   // the background takes the sky's colour
    ['street', 'front', 'fg'].forEach(function (k) { c[k] = grade(L[k], k, S, c[k]); });
    c.cbank = FT.skyGrade(L.cbank.c, 'cloud', S, cols, c.cbank); c.fogA = FT.skyGrade(L.fogA.c, 'fog', S, cols, c.fogA); c.fogB = FT.skyGrade(L.fogB.c, 'fog', S, cols, c.fogB); c.puff = FT.skyGrade(L.puff, 'fog', S, cols, c.puff); if (L.bank) c.bank = FT.skyGrade(L.bank.c, 'fog', S, cols, c.bank);
    c.wisp = L.wisp.map(function (wc, i) { return FT.skyGrade(wc, 'fog', S, cols, (c.wisp || [])[i]); }); if (L.caps) c.caps = grade(L.caps, 'street', S, c.caps);
  };
  // a crisp disc, row by row (no soft edges: it's pixel art)
  function disc(g, cx, cy, r, col) { g.fillStyle = col; for (var y = -r; y <= r; y++) { var hw = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1); } }
  Scene.prototype.draw = function (L, t, dt, hour, env) {
    var g = this.g, K = L.K, F = K.F, self = this, c = this.cache, wx = env.wx, crowd = env.crowd, power = env.power, sound = env.sound, mouse = env.mouse;
    var S = F ? sky(hour) : { dark: 1, warm: 0, dawn: 0, rain: 0 }; if (F) { S.rain = Math.max(wx.rain, wx.snow * 0.5); S.wetRain = wx.rain; S.snow = wx.snow; }   // (rain and snow both grey the sky; only rain turns things teal)
    if (F) this.regrade(L, S); else if (!c.far) { ['far', 'mid', 'back', 'street', 'front'].forEach(function (k) { c[k] = L[k]; }); c.fogA = L.fogA.c; c.fogB = L.fogB.c; c.puff = L.puff; c.cbank = L.cbank.c; ['horizon', 'hwy', 'rail', 'fg'].forEach(function (k) { c[k] = L[k]; }); c.wisp = L.wisp; }
    var Q = FT.Q || { p: 1, motion: true };
    // ---- this frame's light levels: the hour, the power dips, the lamp's flickers (see lighting.js for what they light)
    var night = F ? smooth((S.dark - 0.05) / 0.5) : 1, lampP = power.level(LAMP.x, t), lampOn = (F ? smooth((S.dark - 0.15) / 0.3) : 1) * (lampP > 0.5 ? 1 : 0);
    this.nextFlicker -= dt; if (this.nextFlicker <= 0 && Q.motion) { this.nextFlicker = rand(15, 120); this.flicker = rand(0.3, 1.6); } var fl = 1; if (this.flicker > 0) { this.flicker -= dt; fl = Math.random() < 0.5 ? 0.15 : 1; }
    this.lampLevel = lampOn * fl; var vp = power.level(229, t), blink = Math.sin(t * 1.7) > 0.6, glow = this.glow = [];
    var lit = FT.Lighting.frame(L, F ? { lamp: lampOn * fl, vending: night * vp, neon: night * power.level(640, t) * (this.neonOff >= 0 ? 0.75 : 1), diner: night * power.level(640, t), laundry: night * power.level(457, t), hotel: night * power.level(1244, t), warn: blink ? 0.3 + 0.7 * night : 0, flash: (this.shopLv || {}).flash || 0, tvs: (this.shopLv || {}).tvs || 0, clocks: (this.shopLv || {}).clocks || 0, kiosk: (this.shopLv || {}).kiosk || 0 } : { lamp: lampOn * fl, warn: blink ? 1 : 0 });
    if (this.life) { FT.hourNow = hour; this.life.mouse = mouse; this.life.glowOut = glow; this.life.update(dt, t, hour, S, wx, L, crowd, sound); }
    var wind = 14 + 9 * Math.sin(t * 0.031) + 6 * Math.sin(t * 0.0173 + 1.3) + 4 * Math.sin(t * 0.0071 + 4) + (F ? wx.rain * 10 : 0);
    var vis = 1 - S.rain * 0.8;   // what the cloud leaves of the sky
    // ---- sky
    // ---- the banded sky, its stars, a big crisp sun (sliced by bands of sky as it goes down) or the moon
    var cols = F ? this.cols : FT.skyCols(S, false); if (F) FT.drawSky(g, c.sky); else { if (!c.sky) c.sky = FT.bandedSky(cols, S); FT.drawSky(g, c.sky); }
    if (F) {
      if (S.dark > 0.15) this.stars.forEach(function (s) { if (s[1] > 230) return; var a = Math.min(1, (S.dark - 0.15) * 1.4) * vis * (0.45 + 0.55 * Math.abs(Math.sin(t * (0.2 + s[2] * 0.6) + s[2] * 9))) * (1 - s[1] / 260); g.fillStyle = 'rgba(240,236,250,' + a.toFixed(3) + ')'; g.fillRect(s[0] | 0, s[1] | 0, 1, 1); if (s[2] > 0.93 && a > 0.4) { g.fillRect((s[0] | 0) - 1, s[1] | 0, 3, 1); g.fillRect(s[0] | 0, (s[1] | 0) - 1, 1, 3); } });
      var sunH = (hour - 6.2) / 12.4, moonH = (((hour + 12) % 24) - 6) / 12;   // the sun rises over the gap by the hotel and sets behind the diner, where the sky is widest
      if (sunH > -0.08 && sunH < 1.08 && vis > 0.05) {
        var sx = 1180 - sunH * 560, sy = 405 - Math.sin(clamp(sunH, 0, 1) * Math.PI) * 300, sr = 22, low = Math.min(1, S.warm + S.dawn);   // where the sun is follows the visitor's clock, minute by minute
        var core = mix('#fffbea', '#ffb45a', low), halo = mix('#fff6d8', '#ff9a4a', low);
        var hg = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * (4 + low * 2)); hg.addColorStop(0, rgba(halo, (0.42 + 0.2 * low) * vis)); hg.addColorStop(0.35, rgba(halo, (0.14 + 0.12 * low) * vis)); hg.addColorStop(1, rgba(halo, 0)); g.fillStyle = hg; g.fillRect(sx - sr * 6, sy - sr * 6, sr * 12, sr * 12);
        g.globalAlpha = vis * (0.75 + 0.25 * low); disc(g, sx, sy, sr, core); disc(g, sx - 3, sy - 3, sr - 6, mix(core, '#ffffff', 0.35));
        g.globalAlpha = 1;
      }
      if (moonH > -0.08 && moonH < 1.08 && vis > 0.05) {
        var mx = 1150 - moonH * 620, my = 430 - Math.sin(clamp(moonH, 0, 1) * Math.PI) * 330, mr = 20; g.globalAlpha = vis;
        var mg = g.createRadialGradient(mx, my, mr, mx, my, mr * 3.5); mg.addColorStop(0, 'rgba(200,206,236,0.16)'); mg.addColorStop(1, 'rgba(200,206,236,0)'); g.fillStyle = mg; g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
        disc(g, mx, my, mr, '#e6e4f0'); g.fillStyle = '#cfcce0'; [[-6, -4, 3], [5, 3, 4], [-2, 8, 2], [8, -7, 2]].forEach(function (cr) { disc(g, mx + cr[0], my + cr[1], cr[2], '#cfcce0'); });
        var mph = this.moonPh != null ? this.moonPh : (this.moonPh = +((location.search.match(/[?&]moon=([0-9.]+)/) || [])[1] || ((Date.now() / 864e5 - 10962.76) % 29.5306 + 29.5306) % 29.5306 / 29.5306)), moff = (mph < 0.5 ? -1 : 1) * 2.2 * mr * (mph < 0.5 ? mph * 2 : (1 - mph) * 2);   // tonight's moon: its real phase (waxing, lit from the right)
        if (Math.abs(moff) < mr * 2.1) { g.fillStyle = mix(FT.skyAt(cols, my), '#e6e4f0', 0.1); for (var my2 = -mr; my2 <= mr; my2++) { var mhw = Math.round(Math.sqrt(mr * mr - my2 * my2)), shw = Math.sqrt((mr + 1) * (mr + 1) - my2 * my2), a0 = Math.max(-mhw, Math.round(moff - shw)), a1 = Math.min(mhw, Math.round(moff + shw)); if (a1 > a0) g.fillRect(Math.round(mx) + a0, Math.round(my) + my2, a1 - a0, 1); } }   // the dark side, row by row inside the disc (earthshine)
        g.globalAlpha = 1;
      }
    }
    if (this.life) this.life.sky(g, S, t, dt, hour, vis, wx);   // planes, a shooting star, the starlings, searchlights
    // ---- birds in flight: a passing flock now and then, and any that were startled off the wires
    if (F) { this.nextFlock -= dt; if (this.nextFlock <= 0 && S.dark < 0.7 && S.rain < 0.6) { this.nextFlock = rand(10, 45); var dir = Math.random() < 0.5 ? 1 : -1, n = 3 + (Math.random() * 8 | 0), y0 = rand(90, 260), spd = rand(40, 70); for (var b = 0; b < n; b++) this.birds.push({ x: dir > 0 ? -20 - b * rand(6, 20) : W + 20 + b * rand(6, 20), y: y0 + rand(-20, 20), vx: dir * spd * rand(0.9, 1.1), vy: 0, ph: rand(0, 6) }); }
      this.nextLand -= dt; if (this.nextLand <= 0) { this.nextLand = rand(8, 30); if (this.perched.length < 8 && S.dark < 0.6 && S.rain < 0.5) { var tx = rand(120, 1160), d2 = Math.random() < 0.5 ? 1 : -1; this.birds.push({ x: d2 > 0 ? -10 : W + 10, y: rand(60, 160), vx: d2 * 55, vy: 0, ph: 0, land: { x: tx, k: (Math.random() * 3) | 0 } }); } } }
    g.fillStyle = F ? rgba('#3c3e3c', 0.75 - S.dark * 0.4) : '#0e0807';
    this.birds.forEach(function (bd) { if (bd.land) { var ty2 = wireY(bd.land.x, bd.land.k) - 2, ddx = bd.land.x - bd.x, ddy = ty2 - bd.y, dd = Math.hypot(ddx, ddy); if (dd < 3) { self.perched.push({ x: bd.land.x, k: bd.land.k, bob: 0 }); bd.gone = true; return; } bd.vx = ddx / dd * 55; bd.vy = ddy / dd * 55; }
      bd.x += bd.vx * dt; bd.y += (bd.vy || 0) * dt; if (bd.vy && !bd.land) bd.vy *= 0.98; bd.ph += dt * 11; var up = Math.sin(bd.ph) > 0 ? 1 : 0; g.fillRect(bd.x | 0, bd.y | 0, 1, 1); g.fillRect((bd.x - 2) | 0, (bd.y - up) | 0, 2, 1); g.fillRect((bd.x + 1) | 0, (bd.y - up) | 0, 2, 1); });
    this.birds = this.birds.filter(function (bd) { return !bd.gone && bd.x > -60 && bd.x < W + 60 && bd.y > -40; });
    if (c.cbank) { var bd = (t * (1.2 + wind * 0.05)) % W; g.globalAlpha = F ? 0.55 + 0.45 * S.rain : 0.8; g.drawImage(c.cbank, -bd, 0, W, 180); g.drawImage(c.cbank, W - bd, 0, W, 180); g.globalAlpha = 1; }   // the overcast overhead, drifting
    if (F) this.drawClouds(g, S, t, dt, wind, wx);
    this.drawHorizon(g, L, c, S, t);
    FT.blit(g, c.far); this.lights(g, L, 'far', S, t, env); this.beacons(g, 'far', S, t); if (this.life) this.life.far(g, S, t, dt);
    // ---- smoke: always rising, its rate and the wind always changing
    STACKS.forEach(function (s, i) { if (Math.random() < dt * Q.p * (2.2 + 1.6 * Math.sin(t * 0.05 + i * 2.1))) self.smoke.push({ x: s[0] + rand(-3, 3), y: s[1] - 2, vx: wind * rand(0.5, 1.1), vy: -rand(8, 16), age: 0, life: rand(6, 12), s0: rand(8, 12), s1: rand(36, 60), v: (Math.random() * 4) | 0 }); });
    this.smoke.forEach(function (pf) { pf.age += dt; pf.x += pf.vx * dt; pf.y += pf.vy * dt; pf.vy *= 0.995; var a = pf.age / pf.life, sz = pf.s0 + (pf.s1 - pf.s0) * a; g.globalAlpha = (1 - a) * (F ? 0.85 : 0.9) * Math.min(1, pf.age * 2); g.drawImage(c.wisp[pf.v || 0], pf.x - sz / 2, pf.y - sz * 0.4, sz, sz * 0.75); });
    g.globalAlpha = 1; this.smoke = this.smoke.filter(function (pf) { return pf.age < pf.life; });
    if (Math.sin(t * 2.9) > 0.2 && (!F || S.dark > 0.2)) { g.fillStyle = F ? '#d84a3a' : '#ff5a2a'; g.fillRect(1220, 138, 3, 3); }
    if (F) { var drift0 = (t * (2.5 + wind * 0.12)) % (W * 2); g.globalAlpha = 0.45 + 0.15 * Math.sin(t * 0.029); g.imageSmoothingEnabled = true; g.drawImage(c.fogB, -drift0, 400, W * 2, 90); g.drawImage(c.fogB, W * 2 - drift0, 400, W * 2, 90); g.imageSmoothingEnabled = false; g.globalAlpha = 1; }   // a slow fog band between the far town and the middle one
    FT.blit(g, c.mid); this.lights(g, L, 'mid', S, t, env); this.beacons(g, 'mid', S, t);
    this.drawHighway(g, L, c, S, t, dt, hour);
    FT.blit(g, c.back); this.lights(g, L, 'back', S, t, env); this.beacons(g, 'back', S, t);
    var drift = (t * (4 + wind * 0.25)) % (W * 2); g.globalAlpha = 0.75 + 0.2 * Math.sin(t * 0.043); g.imageSmoothingEnabled = true; g.drawImage(c.fogA, -drift, 360, W * 2, 180); g.drawImage(c.fogA, W * 2 - drift, 360, W * 2, 180); g.imageSmoothingEnabled = false; g.globalAlpha = 1;
    // ---- the street, its windows, its signs in their lamps' light, the clock, the door you are pointing at
    this.drawInside(g, L, t, dt, hour, S, env);
    this.drawLaundry(g, L, t, dt, hour, S, env);
    var LP = FT.Lighting.preset();   // the chosen intensity (dim, soft, bright)
    if (F && night > 0.02) { var DI = FT.DINER.inside, LI = L.lInside; g.fillStyle = rgba("#141c26", LP.room * night); g.fillRect(DI[0], DI[1], DI[2], DI[3]); g.fillRect(LI.x, LI.y, LI.c.width, LI.c.height); }   // lit rooms, toned down at night so you can see in
    FT.blit(g, c.street); this.lights(g, L, 'street', S, t, env);
    if (F && L.wet && wx.wet > 0.02) { g.globalAlpha = wx.wet; FT.blit(g, L.wet); g.globalAlpha = 1; }
    if (F && c.caps && wx.caps > 0.02) { g.globalAlpha = wx.caps; FT.blit(g, c.caps); g.globalAlpha = 1; }
    this.capsAmt = F ? wx.caps : 0;
    if (this.prints && F) { var pr = FT.scratch('prints', W, KERB - G), pq = pr.getContext('2d'); this.printFade = (this.printFade || 0) + dt; if (this.printFade > 2) { this.printFade = 0; pq.globalCompositeOperation = 'destination-out'; pq.fillStyle = 'rgba(0,0,0,0.07)'; pq.fillRect(0, 0, W, KERB - G); pq.globalCompositeOperation = 'source-over'; } if (wx.caps > 0.3) g.drawImage(pr, 0, G); }   // footprints in the snow, filling in
    if (F && S.dark > 0.05) { var slit = smooth((S.dark - 0.05) / 0.5); SIGNS.forEach(function (s) { var pw = power.level(s[0] + s[2] / 2, t); if (pw < 0.5) return; g.globalAlpha = slit * 0.85 * pw; FT.blitRect(g, L.street, s[0], s[1], s[2], s[3]); });
      g.globalCompositeOperation = 'screen'; var sg2 = this.sglow || (this.sglow = glowSprite('#f4e0b0', 30)); SIGNS.forEach(function (s) { if (!s[4] || power.level(s[0] + s[2] / 2, t) < 0.5) return; g.globalAlpha = slit * 0.5; g.drawImage(sg2, s[0] + s[2] / 2 - 30, s[1] - 22); }); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    if (F) { var shp = this.shops || (this.shops = new FT.Shops.Shops()); shp.glowOut = glow; this.shopLv = shp.draw(g, L, t, dt, S, env, this.hour); }
    if (this.life) this.life.walls(g, L, S, t, dt, hour, wx, wind, power);   // washing, signs, curtains, the cat on the sill (life.js)   // the ground-floor shops (shops.js)
    FT.Lighting.statics(g, lit, 'street');   // the lamp, the vending machine, the signs and the shop windows on the walls and the pavement
    if (lampOn * fl > 0.01) { g.globalCompositeOperation = 'screen'; g.globalAlpha = lampOn * fl * (F ? 0.3 : 0.7) * LP.haze; g.drawImage(L.cone.c, LAMP.x - 110, LAMP.y - 6); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }   // its light in the air, behind the people and the car
    if (F) FT.Lighting.reflect(g, wx.wet, t);   // the wet street mirrors what stands above it
    this.drawNeon(g, L, t, dt, S, env);
    if (F && env.hover && DOORRECT[env.hover]) { var dr = DOORRECT[env.hover], dg = g.createLinearGradient(0, dr[1], 0, dr[1] + dr[3]); dg.addColorStop(0, 'rgba(255,214,140,0.85)'); dg.addColorStop(1, 'rgba(200,140,70,0.75)'); g.fillStyle = dg; if (env.hover !== 'hotel') g.fillRect(dr[0] + 2, dr[1] + 2, dr[2] - 4, dr[3] - 2);   // (the hotel's lobby is already lit: keep the clerk in view)
      g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,214,140,0.22)'; g.beginPath(); g.moveTo(dr[0], G); g.lineTo(dr[0] + dr[2], G); g.lineTo(dr[0] + dr[2] + 24, G + 40); g.lineTo(dr[0] - 24, G + 40); g.fill(); g.globalCompositeOperation = 'source-over'; }
    if (F && env.lever.pulled) { var swx = B.switch[0]; g.fillStyle = '#3b4442'; g.fillRect(swx + 54, G - 80, 32, 38); g.fillStyle = '#8a8a84'; for (var lh = 0; lh <= 20; lh++) g.fillRect(Math.round(swx + 70 - lh * 0.4), Math.round(G - 72 - lh), 2, 1); g.fillStyle = '#a83a2a'; g.fillRect(swx + 58, G - 97, 10, 5); }
    // ---- headlights sweeping the walls at night
    if (F && S.dark > 0.3) this.cars.forEach(function (car) { var V = L.veh[car.k], fx = car.dir > 0 ? car.x + V.front : car.x + V.w - V.front; g.globalCompositeOperation = 'screen'; var wg = g.createRadialGradient(fx + car.dir * 150, 470, 4, fx + car.dir * 150, 470, 90); wg.addColorStop(0, rgba('#fff0c8', 0.2 * S.dark)); wg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = wg; g.fillRect(fx + car.dir * 150 - 90, 380, 180, 180); g.globalCompositeOperation = 'source-over'; });
    // ---- events: the stranger, the rat, the payphone
    if (F) {
      this.nextFigure -= dt; if (!this.figure && this.nextFigure <= 0) { this.nextFigure = rand(120, 360); var spot = pick([[1240, 526], [262, 522], [1192, 538], [16, 530]]); if (!crowd.list.some(function (p) { return Math.abs(p.x - spot[0]) < 60; })) this.figure = { x: spot[0], base: spot[1], t: 0, life: rand(30, 80) }; }
      if (this.figure) { var fg2 = this.figure; fg2.t += dt; if (fg2.t > fg2.life || Math.hypot(mouse.x - fg2.x, mouse.y - (fg2.base - 30)) < 150) { if (fg2.t <= fg2.life && fg2.t > 2) sound.thud(); this.figure = null; } }
      this.nextRat -= dt; if (!this.rat && this.nextRat <= 0 && S.dark > 0.6) { this.nextRat = rand(40, 160); this.rat = { x: 446, dir: -1, stop: rand(320, 420), t: 0, pause: 0 }; }
      if (this.rat) { var rt2 = this.rat; if (rt2.pause > 0) rt2.pause -= dt; else { rt2.x += rt2.dir * 70 * dt; rt2.t += dt; if (rt2.stop && Math.abs(rt2.x - rt2.stop) < 3) { rt2.pause = rand(0.8, 2.5); rt2.stop = null; } } if (rt2.x < 262) this.rat = null; }
      this.nextRing -= dt; if (!this.ring && this.nextRing <= 0 && !crowd.phoneBusy) { this.nextRing = rand(90, 300); this.ring = { t0: t, last: -1 }; }
      if (this.ring) { var rr = t - this.ring.t0, k = Math.floor(rr / 3); if (rr > 14) this.ring = null; else if (k !== this.ring.last) { this.ring.last = k; sound.ring(); } }
    }
    // ---- the people and the props (and the dog, the rat, the stranger), nearest last, all in the hour's light
    var AY = 320, actC = FT.scratch('work', W, 400), a = actC.getContext('2d'); a.setTransform(1, 0, 0, 1, 0, -AY); a.imageSmoothingEnabled = false; a.clearRect(0, AY, W, H - AY);   // everyone stands below row 320: the shared work buffer (the clouds used it earlier, the traffic uses it later)
    var items = L.props.map(function (pr) { return { base: pr.base, draw: function (gg) { gg.drawImage(pr.c, pr.x, pr.y); } }; });
    if (F && crowd) items = items.concat(crowd.items(t, L));
    if (F) items = items.concat(this.animals(t, dt, L, crowd, env, S));
    if (this.life) items = items.concat(this.life.items(t, dt, crowd));
    if (F && this.rat) { var R2 = this.rat; items.push({ base: 527, draw: function (gg) { var fr = R2.pause > 0 ? 0 : Math.floor(t * 12) % 2; gg.save(); gg.translate(Math.round(R2.x), 522); if (R2.dir < 0) gg.scale(-1, 1); gg.drawImage(L.rat, fr * 10, 0, 10, 5, -5, 0, 10, 5); gg.restore(); } }); }
    if (F && this.figure) { var FG = this.figure; items.push({ base: FG.base, draw: function (gg) { gg.globalAlpha = Math.min(1, FG.t / 4) * 0.55; gg.drawImage(L.stranger, Math.round(FG.x - L.stranger.ox), FG.base - L.stranger.oy); gg.globalAlpha = 1; } }); }
    items.sort(function (p, q) { return p.base - q.base; }); FT.Lighting.shadows(a, items, lit); items.forEach(function (it) { it.draw(a); });
    FT.Lighting.grab(actC, AY, lit); if (F) tint(a, W, H, S, 'props'); FT.Lighting.give(a, lit);   // lit by what is near them, then the hour
    g.drawImage(actC, 0, AY);
    if (F && S.dark > 0.05) { g.globalAlpha = smooth((S.dark - 0.05) / 0.5) * 0.7; [[L.props[0], 46], [L.props[2], 11]].forEach(function (q) { g.drawImage(q[0].c, 0, 0, q[0].c.width, q[1], q[0].x, q[0].y, q[0].c.width, q[1]); }); g.globalAlpha = 1; }
    if (F) {   // the payphone's receiver: on its hook, shaking when it rings, lifted when someone is using it
      var bx = L.props[2].x, by = L.props[2].y, user = crowd && crowd.phoneBusy && crowd.phoneBusy.state === 'stand' ? crowd.phoneBusy : null, jig = this.ring && (t - this.ring.t0) % 3 < 1.1 ? (Math.random() < 0.5 ? -1 : 1) : 0; g.fillStyle = '#1a1918';
      if (user) { g.fillRect(bx + 22, by + 50, 1, 1); for (var cd = 0; cd < 10; cd++) g.fillRect(Math.round(bx + 22 + (258 - bx - 22) * cd / 10), Math.round(by + 50 - cd * 1.4), 1, 1); }
      else { g.fillRect(bx + 11 + jig, by + 33, 2, 16); g.fillRect(bx + 10 + jig, by + 33, 4, 2); g.fillRect(bx + 10 + jig, by + 47, 4, 2); }
      if (this.ring && (t - this.ring.t0) % 3 < 1.1) { g.font = '13px VT323'; g.textAlign = 'center'; g.fillStyle = 'rgba(16,20,22,0.7)'; g.fillText('RING', bx + 20 + jig, by - 7); g.fillStyle = '#ece6d6'; g.fillText('RING', bx + 19 + jig, by - 8); }
      if (this.vendT >= 0) { this.vendT += dt; var vx = L.props[1].x, vy = L.props[1].y; if (this.vendT < 0.35) { g.fillStyle = '#c84a3a'; g.fillRect(vx + 14, vy + 20 + this.vendT * 90, 3, 5); } else { g.fillStyle = '#c84a3a'; g.fillRect(vx + 12, vy + 55, 5, 3); } if (this.vendT > 2.5) this.vendT = -1; }
    }
    FT.blit(g, c.front); FT.Lighting.statics(g, lit, 'front'); if (this.life) this.life.front(g, S, t, dt, wind);
    // ---- birds on the wires (they scatter when the cursor comes close), moths round the lamp
    if (F) { var near = this.perched.filter(function (pb) { return Math.hypot(mouse.x - pb.x, mouse.y - FT.wireAt(pb.x, pb.k)) < 110; }); if (near.length) { sound.flap((near[0].x / W) * 1.6 - 0.8); near.forEach(function (pb) { self.birds.push({ x: pb.x, y: FT.wireAt(pb.x, pb.k) - 2, vx: rand(-70, 70), vy: rand(-80, -40), ph: 0 }); }); this.perched = this.perched.filter(function (pb) { return near.indexOf(pb) < 0; }); }
      g.fillStyle = S.dark > 0.5 ? '#0e1014' : '#2f302e'; this.perched.forEach(function (pb) { pb.bob += dt; var y = Math.round(FT.wireAt(pb.x, pb.k)) - 3, hb = Math.sin(pb.bob * 1.7) > 0.95 ? 1 : 0; g.fillRect(Math.round(pb.x) - 1, y, 3, 2); g.fillRect(Math.round(pb.x) + 1, y - 1 + hb, 1, 1); }); }
    if (F && lampOn > 0.3) { g.fillStyle = 'rgba(244,236,210,0.8)'; this.moths.forEach(function (mo) { mo.a += dt * mo.sp; mo.j += dt * 7; var x = LAMP.x + Math.cos(mo.a) * mo.r + Math.sin(mo.j) * 2, y = LAMP.y - 12 + Math.sin(mo.a * 1.3) * mo.r * 0.5 + mo.y; g.fillRect(x | 0, y | 0, 1, 1); }); }
    // ---- traffic: one-of-a-kind vehicles pass now and then
    if (F) { this.nextCar -= dt; if (this.nextCar <= 0) { this.nextCar = (S.dark > 0.5 ? rand(30, 90) : rand(12, 45)) * (hour >= 1 && hour < 5 ? 2.5 : 1); var free = ['van', 'taxi', 'courier'].filter(function (kk) { return !self.cars.some(function (cc) { return cc.k === kk; }); }); if (free.length) { var kk = pick(free), dir3 = Math.random() < 0.5 || (this.bus && this.bus.state !== 'stop') ? 1 : -1, V = L.veh[kk]; this.cars.push({ k: kk, dir: dir3, x: dir3 > 0 ? -V.w - 10 : W + 10, base: dir3 > 0 ? NEAR_LANE : FAR_LANE, speed: V.speed * rand(0.85, 1.15) }); sound.whoosh(dir3, (W + V.w) / V.speed); } }
      var NY = 520, nearC = FT.scratch('work', W, 400), nr = nearC.getContext('2d'); nr.setTransform(1, 0, 0, 1, 0, -NY); nr.imageSmoothingEnabled = false; nr.clearRect(0, NY, W, H - NY);   // the road's vehicles: the work buffer's top 200 rows (the bus at the kerb reaches up to row 532)
      this.updateBus(dt, t, hour, S, env, L, nr);
      // a car never joins the far lane while the bus is moving in it; far lane first; nobody drives through the vehicle ahead
      this.cars.sort(function (p, q) { return p.base - q.base; });
      this.cars.forEach(function (car) { var V = L.veh[car.k]; car.v = car.speed; self.cars.forEach(function (o) { var gap = car.dir > 0 ? o.x - (car.x + V.w) : car.x - (o.x + L.veh[o.k].w); if (o !== car && o.dir === car.dir && gap > -V.w && gap < 40) car.v = Math.min(car.v, o.speed * clamp(gap / 40, 0, 1)); });
        var bb2 = self.bus; if (car.dir < 0 && bb2 && bb2.state !== 'stop' && car.x > bb2.x && car.x - (bb2.x + L.bus.w) < 40) car.v = Math.min(car.v, bb2.v * clamp((car.x - (bb2.x + L.bus.w)) / 40, 0, 1));
        if (car.stopX != null) { var rem = (car.stopX - car.x) * car.dir; if (rem <= 0.5) { car.v = 0; car.held = (car.held || 0) + dt; if (car.held > car.holdFor) car.stopX = null; } else car.v = Math.min(car.v, Math.max(8, rem * 1.3)); } });   // a taxi pulling in for someone who hailed it (life.js)
      this.cars.forEach(function (car) { var V = L.veh[car.k]; car.x += car.dir * car.v * dt; car.d = (car.d || 0) + car.v * dt; var fr2 = V.frames ? Math.floor(t * 9) % V.frames : 0, fw = V.w, bob = !V.frames && Math.sin(car.d * 0.09) > 0.93 ? -1 : 0; nr.save(); nr.translate(Math.round(car.x) + (car.dir < 0 ? V.w : 0), car.base - V.h + bob); if (car.dir < 0) nr.scale(-1, 1); nr.drawImage(car.dir < 0 && V.cL ? V.cL : V.c, fr2 * fw, 0, fw, V.h, 0, 0, fw, V.h); spin(nr, V.wheels, car.d); nr.restore(); nr.fillStyle = 'rgba(16,20,22,0.3)'; nr.fillRect(Math.round(car.x) + 4, car.base - 1, V.w - 8, 3); });
      this.cars = this.cars.filter(function (car) { return car.x > -L.veh[car.k].w - 40 && car.x < W + 40; });
      if (this.cars.length || this.bus) { FT.Lighting.grab(nearC, NY, lit, true); tint(nr, W, H, S, 'front'); FT.Lighting.give(nr, lit); g.drawImage(nearC, 0, 0, W, H - NY, 0, NY, W, H - NY); this.busLights(g, S, L);
        if (S.dark > 0.2) { g.globalCompositeOperation = 'screen'; this.cars.forEach(function (car) { var V = L.veh[car.k], fx = car.dir > 0 ? car.x + V.front : car.x + V.w - V.front, fy = car.base - V.h + V.lightY, cg = g.createLinearGradient(fx, 0, fx + car.dir * 170, 0); cg.addColorStop(0, rgba('#fff0c8', 0.45 * S.dark)); cg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = cg; g.beginPath(); g.moveTo(fx, fy - 2); g.lineTo(fx + car.dir * 170, fy - 22); g.lineTo(fx + car.dir * 170, fy + 26); g.lineTo(fx, fy + 3); g.fill();
          var tx2 = car.dir > 0 ? car.x + 5 : car.x + V.w - 5; g.fillStyle = rgba('#ff3a2a', 0.7 * S.dark); g.fillRect(Math.round(tx2) - 1, Math.round(fy), 3, 2);
            // headlights and tail-lights, streaked down the wet road
            if (wx.wet > 0.08) { [[fx, '#fff0c8', 0.4], [tx2, '#ff3a2a', 0.3]].forEach(function (q) { for (var ry = 0; ry < 26; ry += 2) { g.fillStyle = rgba(q[1], q[2] * S.dark * wx.wet * (1 - ry / 26)); g.fillRect(Math.round(q[0] - 2 + Math.sin(t * 3 + ry) * 1.2), car.base + 1 + ry, 4, 1); } }); }
            glow.push([fx - 2, fy - 2, 5, 5, '#fff0c8', S.dark], [tx2 - 2, fy - 1, 4, 4, '#ff3a2a', 0.6 * S.dark]); }); g.globalCompositeOperation = 'source-over'; } } }
    // ---- steam in bursts, smoke from anyone having a cigarette under the awning, sparks
    this.nextSteam -= dt; if (this.nextSteam <= 0) { this.nextSteam = rand(0.05, 0.4) * (Math.random() < 0.1 ? 12 : 1); var burst = Math.random() < 0.15 ? 4 : 1; for (var sb = 0; sb < burst; sb++) this.steam.push({ x: MIDX + rand(-12, 12), y: 688, vx: wind * 0.4 * rand(0.5, 1.2), vy: -rand(14, 30), age: 0, life: rand(2, 4.5), s: rand(10, 18), v: (Math.random() * 4) | 0 }); }
    if (F && crowd) { this.nextWisp -= dt; crowd.list.forEach(function (p) { if (p.state === 'stand' && (p.what === 'smoke' || p.act === 'smoke')) { var hx = p.x + p.dir * 7, hy = LANES[p.lane].y - 34; if (self.nextWisp <= 0) self.wisps.push({ x: hx, y: hy, vx: wind * 0.2, vy: -rand(6, 12), age: 0, life: rand(2, 3.5), s: 3 }); if (S.dark > 0.3 && Math.sin(t * 3 + p.x) > -0.2) { g.fillStyle = '#ff9a4a'; g.fillRect(Math.round(hx), Math.round(hy), 1, 1); } } }); if (this.nextWisp <= 0) this.nextWisp = rand(0.3, 0.6); }
    this.steam.concat(this.wisps).forEach(function (st) { st.age += dt; st.x += st.vx * dt; st.y += st.vy * dt; var q = st.age / st.life, sz = st.s + q * (st.s > 5 ? 50 : 14); g.globalAlpha = (1 - q) * Math.min(1, st.age * 2.5) * (F ? 0.75 : 0.6) * (st.s > 5 ? 1 : 0.6); g.drawImage(c.wisp[st.v || 0], st.x - sz / 2, st.y - sz * 0.4, sz, sz * 0.75); });
    g.globalAlpha = 1; this.steam = this.steam.filter(function (st) { return st.age < st.life; }); this.wisps = this.wisps.filter(function (st) { return st.age < st.life; }); if (this.life) this.life.late(g, S, t, dt);
    g.fillStyle = '#ffd890'; this.sparks.forEach(function (sp) { sp.age += dt; sp.vy += 300 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; if (sp.age < sp.life) g.fillRect(sp.x | 0, sp.y | 0, 1, 1); }); this.sparks = this.sparks.filter(function (sp) { return sp.age < sp.life; });
    // ---- a bank of fog rolls in now and then and swallows one end of the street
    if (F) { this.nextBank -= dt; if (!this.bank && this.nextBank <= 0) { this.nextBank = rand(240, 700); this.bank = { t: 0, dur: rand(50, 90), side: Math.random() < 0.6 ? 1 : -1 }; }
      if (this.bank) { var bk = this.bank; bk.t += dt; var dens = bk.t < 15 ? bk.t / 15 : bk.t < bk.dur - 15 ? 1 : (bk.dur - bk.t) / 15; if (bk.t > bk.dur) this.bank = null; else { dens = smooth(dens); var roll = 14 * Math.sin(t * 0.05) + 6 * Math.sin(t * 0.13 + 1); g.globalAlpha = dens * (0.62 + 0.08 * Math.sin(t * 0.08)); g.imageSmoothingEnabled = true; if (bk.side > 0) g.drawImage(c.bank, W - 900 + (1 - dens) * 500 + roll, 160, 900, 460); else { g.save(); g.translate(900 - (1 - dens) * 500 - roll, 160); g.scale(-1, 1); g.drawImage(c.bank, 0, 0, 900, 460); g.restore(); } g.imageSmoothingEnabled = false; g.globalAlpha = 1; } } }
    var drift2 = (t * (7 + wind * 0.35)) % (W * 2); g.globalAlpha = 0.6 + 0.25 * Math.sin(t * 0.061 + 2); g.imageSmoothingEnabled = true; g.drawImage(c.fogB, -drift2, 470, W * 2, 120); g.drawImage(c.fogB, W * 2 - drift2, 470, W * 2, 120); g.imageSmoothingEnabled = false; g.globalAlpha = 1;
    FT.blit(g, c.fg);   // the near frame, in front of everything but what falls
    // ---- what falls: rain, snow, autumn leaves on the gusts, and the ash
    if (F) {
      // rain in three depths: fine and slow far off, mid-length, long fast streaks close by; the middle layer splashes where
      // it lands; drops in the lamp's cone catch its light; drips run off the awning, the canopy and the shelter roof; the
      // drainpipes spill onto the pavement
      var nd = Math.round(300 * Q.p * wx.rain), LZ = [[300, 380, 3, 4, 0.16], [520, 640, 7, 10, 0.3], [820, 960, 15, 22, 0.36]], lampLit = lampOn * fl > 0.3;
      while (this.drops.length < nd) { var z = Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 2, Lz = LZ[z]; this.drops.push({ z: z, x: rand(-40, W), y: rand(-H, 0), v: rand(Lz[0], Lz[1]), l: rand(Lz[2], Lz[3]), stop: z === 0 ? rand(380, G) : z === 1 ? rand(G, H) : H + 30 }); }
      if (this.drops.length > nd) this.drops.length = nd; this.splashes = this.splashes || [];
      var rc = S.dark > 0.5 ? [150, 162, 176] : [206, 214, 220], selfR = this;
      this.drops.forEach(function (d) { d.y += d.v * dt; d.x += wind * (0.3 + d.z * 0.3) * dt;
        if (d.y > d.stop) { if (d.z === 1 && selfR.splashes.length < 90) selfR.splashes.push({ x: d.x, y: d.stop, a: 0 }); d.y = rand(-60, 0); d.x = rand(-40, W); return; }
        var inCone = lampLit && d.y > LAMP.y && d.y < G + 60 && Math.abs(d.x - LAMP.x) < (d.y - LAMP.y) * 0.5 + 6;
        g.fillStyle = inCone ? 'rgba(255,232,176,' + (0.5 + d.z * 0.12) + ')' : 'rgba(' + rc[0] + ',' + rc[1] + ',' + rc[2] + ',' + LZ[d.z][4] + ')'; g.fillRect(d.x | 0, d.y | 0, 1, d.l | 0); });
      g.fillStyle = 'rgba(' + rc[0] + ',' + rc[1] + ',' + rc[2] + ',0.45)'; this.splashes = this.splashes.filter(function (s) { s.a += dt; var k = s.a < 0.06 ? 1 : 2; g.fillRect((s.x - k) | 0, (s.y - k) | 0, 1, 1); g.fillRect((s.x + k) | 0, (s.y - k) | 0, 1, 1); return s.a < 0.13; });
      this.drips = this.drips || []; var EDGES = [[780, 906, 440], [1201, 1287, 429], [346, 424, 501]];   // the WRITING awning, the hotel canopy, the shelter roof
      if (Math.random() < dt * 14 * wx.rain) { var e = pick(EDGES); this.drips.push({ x: rand(e[0], e[1]), y: e[2], v: 0, stop: e[2] > 495 ? rand(560, 572) : rand(530, 570) }); }
      g.fillStyle = 'rgba(' + rc[0] + ',' + rc[1] + ',' + rc[2] + ',0.6)'; this.drips = this.drips.filter(function (dp) { dp.v += 600 * dt; dp.y += dp.v * dt; if (dp.y > dp.stop) { selfR.splashes.push({ x: dp.x, y: dp.stop, a: 0 }); return false; } g.fillRect(dp.x | 0, dp.y | 0, 1, 2); return true; });
      if (wx.rain > 0.05) [242, 919].forEach(function (px) { for (var s2 = 0; s2 < 4; s2++) { g.fillStyle = 'rgba(' + rc[0] + ',' + rc[1] + ',' + rc[2] + ',' + (0.55 * wx.rain).toFixed(2) + ')'; g.fillRect(px + (s2 % 2), G - 7 + ((t * 30 + s2 * 2.5) % 9) | 0, 1, 2); } g.fillRect(px - 2 + ((t * 7) % 2 | 0), G + 1, 5, 1); });   // the drainpipes spilling
      // snow in three depths: fine and slow far off (it settles on the far side of the street), small flakes, and big soft
      // flakes close by, each swaying on its own; the ones in the lamp's cone catch its light
      var nf = Math.round(420 * Q.p * wx.snow), FZ = [[12, 22, 5, 0.45], [24, 38, 9, 0.75], [40, 62, 15, 0.9]], dim = S.dark > 0.5 ? [196, 206, 220] : [244, 247, 250];
      while (this.flakes.length < nf) { var zf = Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2, Fz = FZ[zf]; this.flakes.push({ z: zf, x: rand(-20, W), y: rand(-H, 0), v: rand(Fz[0], Fz[1]), ph: rand(0, 6), sw: Fz[2] * rand(0.6, 1.2), stop: zf === 0 ? rand(400, G + 10) : H + 4 }); }
      if (this.flakes.length > nf) this.flakes.length = nf; var lampSn = lampOn * fl > 0.3;
      this.flakes.forEach(function (f) { f.y += f.v * dt; f.x += (wind * (0.2 + f.z * 0.15) + Math.sin(t * (0.8 + f.z * 0.3) + f.ph) * f.sw) * dt; if (f.y > f.stop) { f.y = -4; f.x = rand(-20, W); }
        var lit = lampSn && f.y > LAMP.y && f.y < G + 60 && Math.abs(f.x - LAMP.x) < (f.y - LAMP.y) * 0.5 + 6, cl = lit ? [255, 230, 180] : dim, a = FZ[f.z][3], x = f.x | 0, y = f.y | 0;
        g.fillStyle = 'rgba(' + cl[0] + ',' + cl[1] + ',' + cl[2] + ',' + a + ')';
        if (f.z === 0) g.fillRect(x, y, 1, 1); else if (f.z === 1) g.fillRect(x, y, 2, 2); else { g.fillRect(x, y, 2, 2); g.fillStyle = 'rgba(' + cl[0] + ',' + cl[1] + ',' + cl[2] + ',' + (a * 0.4) + ')'; g.fillRect(x - 1, y, 1, 2); g.fillRect(x + 2, y, 1, 2); g.fillRect(x, y - 1, 2, 1); g.fillRect(x, y + 2, 2, 1); } });
      if (wx.season === 'autumn' && wx.rain < 0.5) { this.nextGust -= dt; if (this.nextGust <= 0) { this.nextGust = rand(15, 50); var cnt = 5 + (Math.random() * 10 | 0); for (var lf = 0; lf < cnt; lf++) this.leaves.push({ x: -10 - rand(0, 200), y: rand(380, 560), vx: rand(60, 120), vy: rand(-10, 10), ph: rand(0, 6), col: pick(['#8a5a2a', '#a8703a', '#6b3530', '#9a8a4a']), land: rand(G + 4, KERB - 2) }); } }
      this.leaves.forEach(function (lf) { if (lf.y < lf.land) { lf.x += lf.vx * dt; lf.y += (lf.vy + 18 + Math.sin(t * 3 + lf.ph) * 20) * dt; lf.ph += dt * 6; } else { lf.rest = (lf.rest || 0) + dt; lf.x += lf.vx * dt * 0.08; } g.fillStyle = lf.col; if (Math.sin(lf.ph) > 0) g.fillRect(lf.x | 0, lf.y | 0, 2, 1); else g.fillRect(lf.x | 0, lf.y | 0, 1, 2); });
      this.leaves = this.leaves.filter(function (lf) { return lf.x < W + 20 && (lf.rest || 0) < 25; });
    }
    var na = Math.round(140 * Q.p * (1 - (F ? Math.max(wx.rain, wx.snow) : 0)));
    while (this.ash.length < na) this.ash.push({ x: rand(-20, W), y: this.seeded ? -4 : rand(0, H), vy: rand(8, 26), sw: rand(0.3, 1.2), ph: rand(0, 6), s: Math.random() < 0.12 ? 2 : 1, ember: !F && Math.random() < 0.12 }); this.seeded = true; if (this.ash.length > na) this.ash.length = na;
    this.ash.forEach(function (as) { as.y += as.vy * dt; as.x += (wind * 0.4 + Math.sin(t * as.sw + as.ph) * 8) * dt; g.fillStyle = as.ember ? '#ff8a3a' : F ? rgba(S.dark > 0.5 ? '#9aa0a8' : '#f4f2ec', 0.7) : 'rgba(8,4,3,0.85)'; g.fillRect(as.x | 0, as.y | 0, as.s, 1); });
    this.ash = this.ash.filter(function (as) { return as.y < H + 4; });
    // ---- light: the lamp's reflection on a wet road, the switch box's warning light, then bloom from everything that glows
    g.globalCompositeOperation = 'screen';
    if (F && lampOn * fl > 0.01 && wx.wet > 0.1) { g.globalAlpha = lampOn * fl * wx.wet * 0.35; g.drawImage(this.rf || (this.rf = glowSprite('#f4e0b0', 40)), LAMP.x - 40, 600, 80, 110); }
    if (blink) { g.globalAlpha = F ? 0.3 + 0.5 * S.dark : 0.8; g.drawImage(this.rglow || (this.rglow = glowSprite('#ff4a2a', 14)), B.switch[0] + 81 - 14, G - 58 - 14); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (lit) { var by = lit.by, Dn = FT.DINER, HO = FT.HOTEL;
      if (by.lamp && by.lamp.lv > 0.01) glow.push([LAMP.x - 6, LAMP.y - 4, 12, 5, '#fff2cc', by.lamp.lv * 1.2]);
      if (by.vending && by.vending.lv > 0.01) glow.push([215, 462, 30, 42, '#bfeee4', by.vending.lv * 0.45]);
      if (by.neon && by.neon.lv > 0.01) glow.push([Dn.sign[0] + 6, Dn.sign[1] + 8, Dn.sign[2] - 12, Dn.sign[3] - 16, '#ff5a40', by.neon.lv * 1.1]);
      if (by.hotel && by.hotel.lv > 0.01) glow.push([HO.sign[0] + 2, HO.sign[1] + 4, HO.sign[2] - 4, HO.sign[3] - 8, '#ffa050', by.hotel.lv * 1.2]);
      if (by.diner && by.diner.lv > 0.01) Dn.glass.forEach(function (q) { glow.push([q[0] + 2, q[1] + 1, q[2] - 4, 3, '#f4d8a0', by.diner.lv * 0.9]); });   // the glass glows from its ceiling lights only, so you can still see in
      if (by.laundry && by.laundry.lv > 0.01) glow.push([FT.LAUNDRY.glass[0] + 2, FT.LAUNDRY.glass[1] + 1, FT.LAUNDRY.glass[2] - 4, 3, '#dceeee', by.laundry.lv * 0.9]);
      if (by.warn && by.warn.lv > 0.01) glow.push([B.switch[0] + 79, G - 60, 4, 4, '#ff4a2a', 1]); }
    FT.Lighting.bloom(g, glow, (F ? night * 0.85 : 0.9) * LP.bloom);
    FT.drawFinish(g, L.finish);
    this.S = S;
  };
  // windows: each lit by its own habits, the hour and the power; now and then someone switches one on or off
  // someone at a lit window, seen against the light: a pixel silhouette (facing, side-on, or sitting at a table), never outside the glass
  function figure(g, x, y, pose) {
    x = Math.round(x); y = Math.round(y); var side = pose === 'side';
    g.fillRect(x - 2, y - 3, 5, 7); g.fillRect(x - 3, y - 2, 7, 5); if (side) g.fillRect(x + 3, y, 1, 2);   // head (a nose when side-on)
    g.fillRect(x - 1, y + 4, 3, 2);                                                                          // neck
    var sw = side ? 4 : 6; g.fillRect(x - sw + 1, y + 6, sw * 2 - 1, 1); g.fillRect(x - sw, y + 7, sw * 2 + 1, 60);   // shoulders and body (the window cuts it off)
    if (pose === 'sit') { g.fillRect(x - 12, y + 12, 26, 2); g.fillRect(x - 10, y + 14, 2, 40); }          // a table edge in front of them
  }
  Scene.prototype.lights = function (g, L, layer, S, t, env) {
    var K = L.K, wins = K.wins, hour = this.hour; if (!wins) { if (layer === 'street') this.rustLights(g); return; }
    if (layer === 'street') { this.nextWin -= 1 / 30; if (this.nextWin <= 0) { this.nextWin = rand(3, 14); var w = pick(wins); w.flip = w.flip ? 0 : rand(20, 200); } }
    var gs = this.wglow || (this.wglow = glowSprite('#f0c070', 24)), power = env.power;
    for (var i = 0; i < wins.length; i++) { var w2 = wins[i]; if (w2.layer !== layer) continue;
      var hh = hour < 12 && w2.bed > 24 ? hour + 24 : hour, on = (hh >= w2.home && hh < w2.bed) || (w2.early && hour >= w2.early && hour < 8) || (w2.day && S.dark < 0.3);
      if (w2.never) on = false; if (w2.shop) on = hour >= 8 && hour < 20; if (w2.door) on = S.dark > 0.3 && hour < 23; if (w2.diner || w2.lobby) on = true;
      if (w2.flip > 0) { w2.flip -= 1 / 30; on = !on; }
      if (on && (layer === 'street' || layer === 'back') && power.level(w2.cx, t) < 0.5) on = false;
      w2.isOn = on; if (!on) continue;
      var a = w2.small ? (layer === 'far' ? 0.5 : layer === 'mid' ? 0.6 : 0.75) : 0.92, col = w2.tv ? (Math.sin(t * 5.3 + i) + Math.sin(t * 2.1 + i * 3) > 1.1 ? '#9ab0e8' : '#7a90d0') : w2.col; if (S.dark < 0.3) a *= 0.45;
      if (w2.shop || w2.door) a = S.dark < 0.3 ? 0.16 : 0.42;
      if (S.dark > 0.3 && this.glow) this.glow.push([w2.x, w2.y, w2.w, w2.h, col, a * (layer === 'street' ? 0.5 : 0.3)]);
      g.globalAlpha = a; g.fillStyle = col;
      if (w2.arch) { g.beginPath(); g.arc(w2.x + w2.w / 2, w2.y, w2.w / 2, Math.PI, 0); g.fill(); }
      g.fillRect(w2.x, w2.y, w2.w, w2.h);
      if (layer === 'street' && !w2.small && !w2.shop && !w2.door) this.residentIn(g, w2, t, env);
      if (w2.dress === 'curtain' && !w2.small) { g.fillStyle = 'rgba(122,59,52,0.55)'; g.fillRect(w2.x, w2.y, w2.w * 0.3, w2.h); g.fillRect(w2.x + w2.w * 0.7, w2.y, w2.w * 0.3, w2.h); }
      if (w2.who != null && !w2.small) { if (!w2.pose) w2.pose = pick(['front', 'side', 'sit']); g.save(); g.beginPath(); g.rect(w2.x, w2.y, w2.w, w2.h); g.clip(); g.fillStyle = 'rgba(30,26,24,0.8)'; figure(g, w2.x + w2.w * (w2.who + 0.05 * Math.sin(t * 0.2 + i)), w2.y + w2.h * (w2.pose === 'sit' ? 0.5 : 0.32), w2.pose); g.restore(); }
      g.globalAlpha = 1; g.fillStyle = K.P.frame;
      if (w2.bars) { g.fillRect(w2.cx - 1, w2.y - 2, 2, w2.h + 4); g.fillRect(w2.x - 2, Math.round(w2.by), w2.w + 4, 2); }
      if (w2.grid) { for (var gx = w2.x + 5; gx < w2.x + w2.w; gx += 7) g.fillRect(gx, w2.y, 1, w2.h); for (var gy = w2.y + 7; gy < w2.y + w2.h; gy += 9) g.fillRect(w2.x, gy, w2.w, 1); }
      if (S.dark > 0.3 && !w2.small) { g.globalCompositeOperation = 'screen'; g.globalAlpha = (S.dark - 0.3) * 0.6; g.drawImage(gs, w2.x + w2.w / 2 - 24, w2.y + w2.h / 2 - 24); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    }
  };
  Scene.prototype.rustLights = function (g) { g.fillStyle = '#e0a040'; g.globalAlpha = 0.85; [[B.about[0] + 49, B.about[2] + 86, 18, 32], [FT.DINER.glass[0][0] + 30, 458, 20, 34], [B.toolkit[0] + 104, B.toolkit[2] + 124, 32, 66]].forEach(function (r) { g.fillRect(r[0], r[1], r[2], r[3]); }); g.globalAlpha = 1; };

  // red warning lights on the tall roofs, the stacks and the crane: some steady, some slowly blinking
  Scene.prototype.beacons = function (g, layer, S, t) {
    if (!this.F || !FT.BEACONS) return; var a = 0.45 + 0.55 * S.dark;
    FT.BEACONS.forEach(function (b, i) { if (b[2] !== layer) return; if (i % 3 === 0 && Math.sin(t * 1.4 + i * 1.7) < -0.2) return; g.fillStyle = rgba('#ff4a3a', a * (layer === 'far' ? 0.8 : 1)); g.fillRect(b[0], b[1], 2, 2);
      if (S.dark > 0.3) { g.fillStyle = rgba('#ff4a3a', 0.18 * S.dark); g.fillRect(b[0] - 1, b[1] - 1, 4, 4); } });
  };
  // ---------------------------------------------------------------- the laundromat: drums turning, someone waiting on their wash, a tube that flickers now and then
  Scene.prototype.drawLaundry = function (g, L, t, dt, hour, S, env) {
    this.updateResidents(L, t, dt, env);
    var I = L.lInside, F = this.F, crowd = env.crowd, SB = window.FTBody2; g.drawImage(I.c, I.x, I.y);
    if (!F) { g.fillStyle = 'rgba(14,8,7,' + (Math.random() < 0.05 ? 0.35 : 0.8) + ')'; g.fillRect(I.x, I.y, I.c.width, I.c.height); return; }
    this.drums = this.drums || I.drums.map(function () { return { on: Math.random() < 0.5, next: rand(10, 60) }; });
    this.drums.forEach(function (d, i) { d.next -= dt; if (d.next <= 0) { d.on = !d.on; d.next = rand(20, 90); } var cx = I.drums[i][0], cy = I.drums[i][1], col = ['#c84a3a', '#4a6aa8', '#e0b040', '#e8e2d4'][i];
      if (d.on) { for (var k = 0; k < 2; k++) { var a = t * 5 + i * 2 + k * Math.PI; g.fillStyle = k ? '#e8e2d4' : col; g.fillRect(Math.round(cx + Math.cos(a) * 2) - 1, Math.round(cy + Math.sin(a) * 2) - 1, 2, 2); } } else { g.fillStyle = col; g.fillRect(cx - 2, cy + 1, 4, 2); } });
    this.lp = this.lp || []; this.nextLp = (this.nextLp == null ? rand(2, 10) : this.nextLp) - dt;
    if (this.nextLp <= 0 && crowd && SB) { this.nextLp = rand(25, 80); var want = hour >= 1 && hour < 6 ? 1 : 2;
      if (this.lp.length < want) { var adults = crowd.cast.filter(function (d) { return d.age !== 'kid'; }); this.lp.push({ act: pick(['idle', 'watch', 'idle', 'phone']), def: pick(adults), x: rand(436, 476), dir: Math.random() < 0.5 ? 1 : -1, a: 0, f: 1, life: rand(40, 140) }); }
      else if (this.lp.length) this.lp[0].f = -1; }
    var self = this; this.lp.forEach(function (p) { p.a = clamp(p.a + p.f * dt * 1.2, 0, 1); p.life -= dt; if (p.life < 0 && p.f > 0) p.f = -1; var s = crowd.sheet(p.def, p.act || 'idle', 'summer'), mk = s.mk, fr = Math.floor(t * 1000 / mk.ms) % mk.n;
      g.globalAlpha = p.a; g.save(); g.translate(Math.round(p.x), G - 6); if (p.dir < 0) g.scale(-1, 1); g.drawImage(s.c, fr * mk.fw, 0, mk.fw, mk.fh, -mk.footX, -mk.footY, mk.fw, mk.fh); g.restore(); g.globalAlpha = 1; });
    this.lp = this.lp.filter(function (p) { return p.f > 0 || p.a > 0; });
    this.nextTube = (this.nextTube == null ? rand(20, 60) : this.nextTube) - dt; if (this.nextTube <= 0 && (FT.Q || {}).motion !== false) { this.nextTube = rand(30, 120); this.tubeUntil = t + rand(0.6, 3); }
    var off = env.power.level(I.x, t) < 0.5 || (t < this.tubeUntil && Math.random() < 0.55);
    if (off) { g.fillStyle = 'rgba(10,14,18,0.72)'; g.fillRect(I.x, I.y, I.c.width, I.c.height); }
    else if (S.dark < 0.5) { g.fillStyle = 'rgba(220,230,232,0.12)'; g.fillRect(I.x, I.y, FT.LAUNDRY.glass[2], FT.LAUNDRY.glass[3]); }
  };
  // ---------------------------------------------------------------- people at home, moving about behind the lit windows (a floor at a time: you see them pass from one window to the next)
  Scene.prototype.updateResidents = function (L, t, dt, env) {
    var self = this, wins = L.K.wins, crowd = env.crowd; if (!wins || !crowd || !window.FTBody2) return;
    if (!this.groups) { var map = {}; this.groups = []; wins.forEach(function (w) { if (w.layer !== 'street' || w.small || w.shop || w.door) return; var bk = null; for (var k in B) if (w.cx >= B[k][0] && w.cx < B[k][0] + B[k][1]) bk = k; var key = bk + '|' + Math.round(w.y / 6);
      var gr = map[key] || (map[key] = { wins: [], x0: 1e9, x1: -1e9, res: null }); gr.wins.push(w); gr.x0 = Math.min(gr.x0, w.x - 6); gr.x1 = Math.max(gr.x1, w.x + w.w + 6); w.grp = gr; }); for (var k2 in map) this.groups.push(map[k2]); this.residents = []; }
    this.nextRes = (this.nextRes == null ? rand(0.5, 3) : this.nextRes) - dt;
    if (this.nextRes <= 0) { this.nextRes = rand(3, 11); if (this.residents.length < 9) { var lit = this.groups.filter(function (gr) { return !gr.res && gr.wins.some(function (w) { return w.isOn; }); });
      if (lit.length) { var gr = pick(lit), adults = crowd.cast.filter(function (d) { return d.age !== 'kid'; }), r = { gr: gr, def: pick(adults), x: rand(gr.x0, gr.x1), dir: Math.random() < 0.5 ? 1 : -1, state: 'walk', wait: 0, life: rand(25, 120), a: 0, dist: 0 }; r.target = rand(gr.x0, gr.x1); r.dir = r.target > r.x ? 1 : -1; gr.res = r; this.residents.push(r); } } }
    this.residents.forEach(function (r) { r.life -= dt; r.a = clamp(r.a + (r.life > 0 ? 1 : -1) * dt * 0.8, 0, 1);
      if (r.state === 'walk') { var v = 11 * dt; r.x += r.dir * v; r.dist += v; if ((r.target - r.x) * r.dir <= 0) { r.state = 'stand'; r.wait = rand(2, 10); } }
      else { r.wait -= dt; if (r.wait <= 0) { r.state = 'walk'; r.target = rand(r.gr.x0, r.gr.x1); r.dir = r.target > r.x ? 1 : -1; } } });
    this.residents = this.residents.filter(function (r) { if (r.life <= 0 && r.a <= 0) { r.gr.res = null; return false; } return true; });
  };
  Scene.prototype.residentIn = function (g, w, t, env) {
    var gr = w.grp, r = gr && gr.res; if (!r || r.a <= 0 || r.x < w.x - 12 || r.x > w.x + w.w + 12) return;
    var s = env.crowd.sheet(r.def, r.state === 'stand', 'summer'), mk = s.mk, fr = r.state === 'stand' ? Math.floor(t * 1000 / mk.ms) % mk.n : Math.floor(r.dist / (0.72 * s.h * s.stride) * 8) % 8;
    var sc = FT.scratch('res', 96, 128), sg = sc.getContext('2d'); sg.clearRect(0, 0, 96, 128); sg.globalCompositeOperation = 'source-over'; sg.drawImage(s.c, fr * mk.fw, 0, mk.fw, mk.fh, 0, 0, mk.fw, mk.fh);   // against the light they are a silhouette
    sg.globalCompositeOperation = 'source-atop'; sg.fillStyle = '#1e1a18'; sg.fillRect(0, 0, mk.fw, mk.fh); sg.globalCompositeOperation = 'source-over';
    g.save(); g.beginPath(); g.rect(w.x, w.y, w.w, w.h); g.clip(); g.globalAlpha = r.a * 0.82; g.translate(Math.round(r.x), Math.round(w.y + w.h + 22)); if (r.dir < 0) g.scale(-1, 1); g.drawImage(sc, 0, 0, mk.fw, mk.fh, -mk.footX, -mk.footY, mk.fw, mk.fh); g.restore();
    g.globalAlpha = 0.3 * r.a; g.fillStyle = w.col; g.fillRect(w.x, w.y, w.w, w.h); g.globalAlpha = 1;
  };
  // ---------------------------------------------------------------- the bus
  // the bus runs in the far lane (heading left) and pulls in to the kerb at the stop. Its doors are on the kerb side, the side
  // we cannot see: when it stops it dips, its lights come up inside, the people waiting walk round behind it and are next seen
  // in its windows; whoever gets off comes out from behind it
  var KERB_BASE = 618, FAR_LANE = 642, NEAR_LANE = 704;
  // a wheel turning as its vehicle rolls: a lug nut going round the hub and marks going round the tyre
  function spin(g, wheels, d) { if (!wheels) return; wheels.forEach(function (w) { var a = d / w[2]; g.fillStyle = '#c8c4b8'; for (var q = 0; q < 2; q++) { var aa = a + q * Math.PI; g.fillRect(Math.round(w[0] + Math.cos(aa) * (w[3] - 1.4) - 0.5), Math.round(w[1] + Math.sin(aa) * (w[3] - 1.4) - 0.5), 1, 1); } g.fillStyle = '#44423e'; for (var j = 0; j < 3; j++) { var ab = a + j * 2.094; g.fillRect(Math.round(w[0] + Math.cos(ab) * (w[2] - 1.6) - 0.5), Math.round(w[1] + Math.sin(ab) * (w[2] - 1.6) - 0.5), 1, 1); } }); }
  Scene.prototype.updateBus = function (dt, t, hour, S, env, L, nr) {
    var BS = L.bus; if (!BS) return; var self = this, crowd = env.crowd, sound = env.sound, stopX = 404 - (BS.w - (BS.door[0] + BS.door[2] / 2));
    this.nextBus = (this.nextBus == null ? (/[?&]bus(&|=|$)/.test(location.search) ? 0 : rand(12, 45)) : this.nextBus) - dt;   // (?bus: preview, a bus straight away)
    if (!this.bus && this.nextBus <= 0) {
      if (this.cars.some(function (c) { return c.dir < 0 && c.x > W - 420; })) this.nextBus = 3;   // wait for the far lane to clear
      else { this.nextBus = S.dark > 0.5 ? rand(150, 320) : rand(70, 180); if (!(hour >= 0.5 && hour < 5.5)) { var riders = []; for (var rq = 0, rn = (Math.random() * (S.dark > 0.5 ? 3 : 5)) | 0; rq < rn; rq++) riders.push((Math.random() * 9) | 0); this.bus = { x: W + 20, y: FAR_LANE, state: 'in', v: 150, t: 0, open: 0, out: 0, riders: riders }; sound.whoosh(-1, 4); } } }
    var b = this.bus; if (!b) return;
    if (b.state !== 'stop') b.d = (b.d || 0) + b.v * dt;   // how far it has rolled (its wheels turn by it)
    if (b.state === 'in') { b.v = clamp((b.x - stopX) * 1.1, 12, 150); b.x -= b.v * dt; b.y = KERB_BASE + (FAR_LANE - KERB_BASE) * clamp((b.x - stopX) / 260, 0, 1); if (b.x - stopX < 0.6) { b.x = stopX; b.y = KERB_BASE; b.state = 'stop'; b.t = 0; sound.burst({ f: 2400, type: 'highpass', vol: 0.05, dur: 0.6, pan: -0.4 }); } }
    else if (b.state === 'stop') { b.t += dt; b.open = b.t > 1 && b.t < 9.5 ? 1 : 0;
      if (b.t > 1.5 && !b.boarded) { b.boarded = true; var nb = 0; crowd.list.forEach(function (p) { if (p.state === 'stand' && p.what === 'bus') { p.board = true; p.seat = null; nb++; } }); crowd.list.forEach(function (p) { if (p.follow && p.follow.board) { p.board = true; nb++; } }); b.toBoard = nb; }
      if (b.t > 2.4 && !b.alighted) { b.alighted = true; var busy = {}; crowd.list.forEach(function (p) { busy[p.def.id] = 1; }); var ad = (crowd.cast2 || crowd.cast).filter(function (d) { return d.age !== 'kid' && !busy[d.id]; }); for (var i = 0, n = Math.min(b.riders.length, (Math.random() * 3) | 0); i < n && ad.length; i++) { crowd.spawnAt(ad.splice((Math.random() * ad.length) | 0, 1)[0], 404 + i * 12); b.riders.splice((Math.random() * b.riders.length) | 0, 1); } }
      if (b.t > 3.4 && b.toBoard) { for (var j = 0; j < b.toBoard; j++) b.riders.push((Math.random() * 9) | 0); b.toBoard = 0; }   // the ones who got on, now in its windows
      if (b.t > 11) { b.state = 'out'; b.v = 8; sound.whoosh(-1, 4); } }
    else { b.v = Math.min(150, b.v + 45 * dt); b.x -= b.v * dt; b.out += b.v * dt; b.y = KERB_BASE + (FAR_LANE - KERB_BASE) * clamp(b.out / 200, 0, 1); if (b.x < -BS.w - 30) this.bus = null; }
    var by = Math.round(b.y) - BS.h + (b.open ? 1 : 0);   // it dips a little as it opens
    nr.fillStyle = 'rgba(16,20,22,0.3)'; nr.fillRect(Math.round(b.x) + 6, Math.round(b.y) - 2, BS.w - 12, 4);
    nr.save(); nr.translate(Math.round(b.x) + BS.w, by); nr.scale(-1, 1); nr.drawImage(BS.c, 0, 0); spin(nr, BS.wheels, b.d || 0);
    nr.fillStyle = '#22262a'; b.riders.forEach(function (k) { var wx = 14 + k * 25 + 6; nr.fillRect(wx + 1, 20, 5, 5); nr.fillRect(wx, 21, 7, 3); nr.fillRect(wx - 2, 25, 11, 7); });   // heads and shoulders in the windows
    if (b.open) { nr.fillStyle = 'rgba(240,216,150,0.22)'; nr.fillRect(214, 16, 57, 16); }   // the door is open on the far side: light inside, at the front
    nr.restore();
  };
  Scene.prototype.busLights = function (g, S, L) {
    var b = this.bus, BS = L.bus; if (!b || !BS || S.dark < 0.2) return; var a = S.dark;
    var top = Math.round(b.y) - BS.h + (b.open ? 1 : 0); g.fillStyle = rgba('#f0d890', 0.55 * a); BS.windows.forEach(function (w) { g.fillRect(Math.round(b.x + BS.w - w[0] - w[2]) + 1, top + w[1] + 1, w[2] - 2, w[3] - 2); });
    g.fillStyle = rgba('#14161a', 0.85); b.riders.forEach(function (k) { var wx = Math.round(b.x + BS.w - (14 + k * 25 + 6)); g.fillRect(wx - 5, top + 20, 5, 5); g.fillRect(wx - 6, top + 21, 7, 3); g.fillRect(wx - 8, top + 25, 11, 7); });   // against the light, the riders are silhouettes
    var fx = Math.round(b.x + BS.w - BS.front), fy = top + BS.lightY; g.globalCompositeOperation = 'screen'; var cg = g.createLinearGradient(fx, 0, fx - 180, 0); cg.addColorStop(0, rgba('#fff0c8', 0.45 * a)); cg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = cg; g.beginPath(); g.moveTo(fx, fy - 2); g.lineTo(fx - 180, fy - 22); g.lineTo(fx - 180, fy + 26); g.lineTo(fx, fy + 3); g.fill(); g.globalCompositeOperation = 'source-over';
  };
  // ---------------------------------------------------------------- a stray cat, a stray dog (they chase when they cross paths), pigeons on the pavement
  Scene.prototype.animals = function (t, dt, L, crowd, env, S) {
    var self = this, out = [], sound = env.sound, mouse = env.mouse, motion = (FT.Q || {}).motion !== false;
    var cat = this.cat || (this.cat = { x: 300, base: 526, state: 'sit', dir: 1, wait: rand(4, 12), hidden: false, f: 0 });
    var dog = this.sdog || (this.sdog = { x: 1000, base: 541, state: 'walk', dir: -1, target: 760, f: 0, away: 0, cool: 15 });
    if (cat.hidden) { cat.wait -= dt; if (cat.wait <= 0) { cat.hidden = false; cat.x = 262; cat.state = 'walk'; cat.dir = 1; cat.target = rand(300, 1000); } }
    else if (cat.state === 'sit') { cat.wait -= dt; if (cat.wait <= 0) { cat.state = 'walk'; cat.target = Math.random() < 0.2 ? 262 : rand(60, 1180); cat.dir = cat.target > cat.x ? 1 : -1; } }
    else if (cat.state === 'walk') { cat.x += cat.dir * 22 * dt; cat.f += dt * 22; if ((cat.target - cat.x) * cat.dir <= 0) { if (Math.abs(cat.target - 262) < 2) { cat.hidden = true; cat.wait = rand(20, 60); } else { cat.state = 'sit'; cat.wait = rand(6, 25); } } }
    else if (cat.state === 'flee') { cat.x += cat.dir * 150 * dt; cat.f += dt * 150; if ((cat.escape === 'alley' && Math.abs(cat.x - 262) < 5) || cat.x < -30 || cat.x > W + 30) { cat.hidden = true; cat.wait = rand(25, 70); } }
    if (dog.away > 0) { dog.away -= dt; if (dog.away <= 0) { dog.x = Math.random() < 0.5 ? -20 : W + 20; dog.dir = dog.x < 0 ? 1 : -1; dog.state = 'walk'; dog.target = rand(200, 1100); } }
    else if (dog.state === 'walk') { dog.x += dog.dir * 30 * dt; dog.f += dt * 30; if ((dog.target - dog.x) * dog.dir <= 0) { dog.state = Math.random() < 0.3 ? 'lie' : 'sniff'; dog.wait = rand(4, 16); } if (dog.x < -40 || dog.x > W + 40) dog.away = rand(30, 120); }
    else if (dog.state === 'chase') { dog.x += dog.dir * 115 * dt; dog.f += dt * 115; dog.wait -= dt; if (Math.random() < dt * 3) sound.burst({ f: 520, vol: 0.07, dur: 0.12, pan: dog.x / W * 1.6 - 0.8 }); if (dog.wait <= 0 || cat.hidden) { dog.state = 'sniff'; dog.wait = rand(3, 8); dog.cool = rand(40, 100); } }
    else { dog.wait -= dt; if (dog.wait <= 0) { dog.state = 'walk'; dog.target = Math.random() < 0.15 ? (dog.dir > 0 ? W + 60 : -60) : rand(80, 1180); dog.dir = dog.target > dog.x ? 1 : -1; } }
    dog.cool -= dt;
    if (motion && !cat.hidden && dog.away <= 0 && dog.cool <= 0 && cat.state !== 'flee' && dog.state !== 'chase' && Math.abs(cat.x - dog.x) < 70 && dog.x > 0 && dog.x < W) {   // they've crossed paths
      cat.state = 'flee'; cat.dir = cat.x < dog.x ? -1 : 1; cat.escape = cat.dir < 0 && cat.x > 262 ? 'alley' : 'edge'; dog.state = 'chase'; dog.dir = cat.dir; dog.wait = rand(3, 6); sound.burst({ f: 420, vol: 0.09, dur: 0.15 }); }
    if (!cat.hidden && L.cat) { var C = L.cat, cf = cat.state === 'sit' ? 4 + (Math.floor(t * 1.3) % 2) : cat.state === 'flee' ? 6 + (Math.floor(cat.f / 8) % 2) : Math.floor(cat.f / 5) % 4;
      out.push({ base: cat.base, draw: function (gg) { gg.save(); gg.translate(Math.round(cat.x), cat.base - C.fh); if (cat.dir < 0) gg.scale(-1, 1); gg.drawImage(C.c, cf * C.fw, 0, C.fw, C.fh, -C.fw / 2, 0, C.fw, C.fh); gg.restore(); } }); }
    if (dog.away <= 0 && L.dog2) { var D = L.dog2, df = dog.state === 'walk' || dog.state === 'chase' ? Math.floor(dog.f / 9) % 4 : 4 + (Math.floor(t * 2) % 2);
      out.push({ base: dog.base, draw: function (gg) { gg.save(); gg.translate(Math.round(dog.x), dog.base - D.fh + (dog.state === 'lie' ? 3 : 0)); if (dog.dir < 0) gg.scale(-1, 1); gg.drawImage(D.c, df * D.fw, 0, D.fw, D.fh, -D.fw / 2, 0, D.fw, D.fh); gg.restore(); } }); }
    this.pigeons = this.pigeons || [0, 1, 2, 3].map(function () { return { x: rand(150, 1100), base: Math.round(rand(524, 570)), dir: Math.random() < 0.5 ? 1 : -1, ph: rand(0, 6) }; });
    if (this.pigeons.length < 5 && S.dark < 0.5 && Math.random() < dt * 0.03) this.pigeons.push({ x: rand(150, 1100), base: Math.round(rand(524, 570)), dir: Math.random() < 0.5 ? 1 : -1, ph: 0 });
    var people = crowd ? crowd.list : [];
    this.pigeons = this.pigeons.filter(function (pg) { var scare = Math.hypot(mouse.x - pg.x, mouse.y - pg.base) < 60 || (dog.away <= 0 && Math.abs(dog.x - pg.x) < 40) || (!cat.hidden && Math.abs(cat.x - pg.x) < 26) || people.some(function (p) { return Math.abs(p.x - pg.x) < 22 && Math.abs(LANES[p.lane].y - pg.base) < 14; });
      if (scare) { self.birds.push({ x: pg.x, y: pg.base - 3, vx: rand(-80, 80), vy: rand(-90, -50), ph: 0 }); sound.flap(pg.x / W * 1.6 - 0.8); return false; } return true; });
    this.pigeons.forEach(function (pg) { pg.ph += dt; if (Math.random() < dt * 0.3) pg.dir *= -1; if (Math.sin(pg.ph * 1.7) > 0.3) pg.x += pg.dir * 5 * dt; var peck = Math.sin(pg.ph * 6) > 0.7;
      out.push({ base: pg.base, draw: function (gg) { var x = Math.round(pg.x), y = pg.base; gg.fillStyle = '#5a5c60'; gg.fillRect(x - 2, y - 3, 5, 2); gg.fillRect(x - 1, y - 4, 3, 1); gg.fillStyle = '#6e7276'; gg.fillRect(x + pg.dir * 2, peck ? y - 2 : y - 5, 2, 2); gg.fillStyle = '#c8783a'; gg.fillRect(x - 1, y - 1, 1, 1); gg.fillRect(x + 1, y - 1, 1, 1); } }); });
    return out;
  };
  // ---------------------------------------------------------------- clouds: they drift on the wind; one that leaves is replaced by a new one, never the same shape twice
  Scene.prototype.drawClouds = function (g, S, t, dt, wind, wx) {
    var self = this, Q = FT.Q || { p: 1 }, want = Math.round((7 + (wx ? wx.rain * 10 + wx.snow * 6 : 0)) * Math.max(0.5, Q.p));
    function add(startX) { var big = Math.random() < 0.55, c = FT.makeCloud(big); self.clouds.push({ c: c, x: startX != null ? startX : -c.w - rand(0, 260), y: big ? rand(10, 220) : rand(30, 250), v: big ? rand(5, 11) : rand(2, 5), a: big ? 0.95 : 0.75 }); }
    if (!this.clouds) { this.clouds = []; for (var i = 0; i < want; i++) add(rand(-150, W)); this.clouds.sort(function (p, q) { return p.v - q.v; }); }
    if (this.clouds.length < want && Math.random() < dt * 0.3) { add(); this.clouds.sort(function (p, q) { return p.v - q.v; }); }
    var cc = FT.scratch('work', W, 400), cg = cc.getContext('2d'); cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, W, 330);
    this.clouds.forEach(function (cl) { cl.x += cl.v * (0.55 + wind / 28) * dt; cg.globalAlpha = cl.a; cg.drawImage(cl.c.c, Math.round(cl.x), Math.round(cl.y)); }); cg.globalAlpha = 1;
    this.clouds = this.clouds.filter(function (cl) { return cl.x < W + 20; });
    cg.globalCompositeOperation = 'source-atop';
    if (S.warm > 0.01) { cg.fillStyle = rgba('#e0905a', 0.4 * S.warm); cg.fillRect(0, 0, W, 330); }
    if (S.dawn > 0.01) { cg.fillStyle = rgba('#b49aa8', 0.35 * S.dawn); cg.fillRect(0, 0, W, 330); }
    if (S.rain > 0.01) { cg.fillStyle = rgba('#6c727a', 0.45 * S.rain); cg.fillRect(0, 0, W, 330); }
    if (S.dark > 0.01) { cg.fillStyle = rgba('#0b0f18', 0.8 * S.dark); cg.fillRect(0, 0, W, 330); }
    cg.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.92; g.drawImage(cc, 0, 0, W, 330, 0, 0, W, 330); g.globalAlpha = 1;
  };
  // ---------------------------------------------------------------- the horizon (and the bridge's lights at night)
  Scene.prototype.drawHorizon = function (g, L, c, S, t) {
    FT.blit(g, c.horizon); if (!this.F || S.dark < 0.3) return; var a = (S.dark - 0.3) * (1 - S.rain * 0.7);
    FT.HORIZON_LIGHTS.forEach(function (l, i) { if (l[2] === 'red') { if (Math.sin(t * 1.3 + i * 2) > 0.3) { g.fillStyle = rgba('#e04a3a', a); g.fillRect(l[0] - 1, l[1], 2, 2); } } else { g.fillStyle = rgba('#f0c070', a * 0.55); g.fillRect(l[0], l[1], 1, 1); } });
  };
  // ---------------------------------------------------------------- the elevated highway: the deck, distant cars passing now and then, the parapet in front of them, its lamps
  Scene.prototype.drawHighway = function (g, L, c, S, t, dt, hour) {
    var HWY = FT.HWY, self = this, Q = FT.Q || { p: 1 }; FT.blit(g, c.hwy);
    this.nextH -= dt; if (this.nextH <= 0) { this.nextH = (S.dark > 0.5 ? rand(4, 12) : rand(1.5, 6)) * (hour >= 1 && hour < 5 ? 3 : 1) / Math.max(0.4, Q.p); var dir = Math.random() < 0.5 ? 1 : -1;
      this.hcars.push({ x: dir > 0 ? -20 : W + 20, dir: dir, y: dir > 0 ? HWY.lanes[0] : HWY.lanes[1], v: rand(60, 115), col: pick(['#5a6a7a', '#7a3b34', '#c8c0b0', '#3a3e42', '#8a7a5a', '#4c6a5a']), len: 8 + ((Math.random() * 5) | 0), truck: Math.random() < 0.15 }); }
    var night = S.dark;
    this.hcars.forEach(function (h) { h.x += h.dir * h.v * dt; var col = mix(mix(h.col, self.F ? '#c4c1b8' : '#1a0f0c', 0.35), '#12161c', night * 0.75), x = Math.round(h.x), ht = h.truck ? 6 : 3;
      g.fillStyle = col; g.fillRect(x, h.y - ht, h.truck ? h.len + 8 : h.len, ht); if (!h.truck) g.fillRect(x + (h.dir > 0 ? 2 : h.len - 6), h.y - ht - 2, 4, 2);
      if (night > 0.3) { var fx = h.dir > 0 ? x + (h.truck ? h.len + 8 : h.len) : x - 1; g.fillStyle = rgba('#fff0c8', night); g.fillRect(fx, h.y - 2, 1, 1); g.fillStyle = rgba('#ff3a2a', night * 0.8); g.fillRect(h.dir > 0 ? x - 1 : x + (h.truck ? h.len + 8 : h.len), h.y - 2, 1, 1);
        g.fillStyle = rgba('#fff0c8', night * 0.12); g.fillRect(h.dir > 0 ? fx + 1 : fx - 14, h.y - 3, 14, 3); } });
    this.hcars = this.hcars.filter(function (h) { return h.x > -40 && h.x < W + 40; });
    FT.blit(g, c.rail);
    if (night > 0.25) { g.fillStyle = rgba('#f4e0b0', (night - 0.25) * 0.9); HWY.lamps.forEach(function (l) { g.fillRect(l[0], l[1], 2, 1); }); }
  };
  // ---------------------------------------------------------------- inside the diner: the back wall, whoever works the counter, the counter, the people on the stools, the clock
  Scene.prototype.drawInside = function (g, L, t, dt, hour, S, env) {
    var D = FT.DINER, I = L.inside, ox = D.inside[0], oy = D.inside[1], diner = env.diner, V2 = window.FTBody2, F = this.F;
    g.drawImage(I.bg.c, ox, oy);
    if (F && diner && V2) {   // the waiter, behind the counter: walking (feet planted by distance) or standing (the idle performance)
      var sv = diner.server, ss = diner.sheet(null, sv.state === 'stand' ? 'idle' : 'walk', 'srv' + sv.state), mk = ss.mk, fr = sv.state === 'stand' ? Math.floor(t * 1000 / mk.ms) % mk.n : Math.floor(sv.dist / (0.72 * ss.h * ss.stride) * 8) % 8;
      g.save(); g.translate(Math.round(sv.x), G); if (sv.dir < 0) g.scale(-1, 1); g.drawImage(ss.c, fr * mk.fw, 0, mk.fw, mk.fh, -mk.footX, -mk.footY, mk.fw, mk.fh); g.restore();
    }
    g.drawImage(I.fg.c, ox, oy);
    if (F && diner && V2) diner.stools.forEach(function (s, i) { if (!s.def) return; var sh2 = diner.sheet(s.def, 'back-' + s.kind, s.def.id + 'b' + s.kind), mk2 = sh2.mk, fr2 = Math.floor(t * 1000 / 90 + i * 5) % mk2.n;   // seen from behind, at the counter
      g.globalAlpha = s.alpha; g.drawImage(sh2.c, fr2 * mk2.fw, 0, mk2.fw, mk2.fh, Math.round(s.x - mk2.footX), Math.round(G - mk2.footY), mk2.fw, mk2.fh); g.globalAlpha = 1; });
    var ch = hour >= 3 + 33 / 60 && hour < 5 ? 3 + 33 / 60 : hour < 1 / 60 ? 23 + 59 / 60 : hour,   /* (from 3:33 until five it stops) */ cx = ox + I.clock[0], cy = oy + I.clock[1], ha = (ch % 12) / 12 * Math.PI * 2, ma = (ch % 1) * Math.PI * 2; g.fillStyle = '#22211f';   // the clock keeps the visitor's time, and stops for a minute at midnight
    for (var hi = 0; hi <= 2; hi++) g.fillRect(Math.round(cx + Math.sin(ha) * hi), Math.round(cy - Math.cos(ha) * hi), 1, 1); for (var mi = 0; mi <= 4; mi++) g.fillRect(Math.round(cx + Math.sin(ma) * mi), Math.round(cy - Math.cos(ma) * mi), 1, 1);
    var pw = env.power.level(MIDX, t);
    if (pw < 0.5) { g.fillStyle = 'rgba(8,10,14,0.85)'; g.fillRect(ox, oy, D.inside[2], D.inside[3]); }
    else if (!F) { g.fillStyle = 'rgba(14,8,7,' + (Math.random() < 0.06 ? 0.4 : 0.78) + ')'; g.fillRect(ox, oy, D.inside[2], D.inside[3]); }
    D.glass.forEach(function (gl) { if (F && S.dark < 0.5) { g.fillStyle = 'rgba(220,226,230,0.1)'; g.fillRect(gl[0], gl[1], gl[2], gl[3]); g.fillStyle = 'rgba(255,255,255,0.14)'; for (var k = 0; k < gl[3]; k++) g.fillRect(gl[0] + gl[2] * 0.2 + k * 0.8, gl[1] + gl[3] - k, 6, 1); } });
  };
  // ---------------------------------------------------------------- neon: the diner's MY WORK (a letter fails now and then), its chasing bulbs; the hotel's sign (its T is dead, its E buzzes)
  Scene.prototype.neonArt = function () {
    if (this.neon) return this.neon; var D = FT.DINER, s = D.sign, c = document.createElement('canvas'); c.width = s[2]; c.height = s[3] + 24; var g = c.getContext('2d'), letters = [];
    g.font = D.size + 'px VT323'; g.textBaseline = 'middle'; var word = D.word, total = g.measureText(word).width, x = s[2] / 2 - total / 2, wy = D.wordY - s[1];
    for (var i = 0; i < word.length; i++) { var ch = word[i], wd = g.measureText(ch).width; if (ch !== ' ') { g.fillStyle = '#7a1e14'; g.fillText(ch, x + 1, wy + 1); g.fillStyle = '#ff7a5a'; g.fillText(ch, x, wy); letters.push([x, wd]); } x += wd; }
    g.font = '13px VT323'; g.textAlign = 'center'; g.fillStyle = '#6ad8d0'; var sb = D.subBox; g.fillText(D.sub, s[2] / 2, sb[1] - s[1] + sb[3] / 2 + 1);
    var H = FT.HOTEL, hs = H.sign, h = document.createElement('canvas'); h.width = hs[2]; h.height = hs[3]; var hg = h.getContext('2d'); hg.font = '22px VT323'; hg.textAlign = 'center'; hg.textBaseline = 'middle';
    H.letters.split('').forEach(function (chh, k) { hg.fillStyle = '#6a2a10'; hg.fillText(chh, hs[2] / 2 + 1, 16 + k * 24 + 1); hg.fillStyle = '#ffb060'; hg.fillText(chh, hs[2] / 2, 16 + k * 24); });
    return (this.neon = { c: c, letters: letters, wy: wy, h: h, glow: glowSprite('#ff6a50', 26), hglow: glowSprite('#ffb060', 18) });
  };
  Scene.prototype.drawNeon = function (g, L, t, dt, S, env) {
    var N = this.neonArt(), D = FT.DINER, s = D.sign, H = FT.HOTEL, hs = H.sign, Q = FT.Q || { motion: true }, sound = env.sound, self = this, F = this.F;
    var pw = env.power.level(MIDX, t) > 0.5, glowA = F ? 0.25 + 0.6 * S.dark : 0.8, solid = F ? 0.75 + 0.25 * S.dark : 1;
    // events: one letter fails for a moment; now and then the bulbs start chasing
    this.nextNeon -= dt; if (this.nextNeon <= 0 && Q.motion) { this.nextNeon = rand(15, 70); this.neonOff = (Math.random() * N.letters.length) | 0; this.neonUntil = t + rand(0.4, 2.5); sound.burst({ f: 180, type: 'lowpass', vol: 0.03, dur: 0.3, pan: 0 }); }
    this.nextChase -= dt; if (this.nextChase <= 0 && Q.motion) { this.nextChase = rand(20, 60); this.chaseUntil = t + rand(4, 9); }
    if (pw) {
      N.letters.forEach(function (lt, i) { var on = F ? !(i === self.neonOff && t < self.neonUntil && Math.random() < 0.8) : (i === 4 && Math.random() < 0.3);   // underneath: dead, one letter sputtering
        if (!on) return; g.globalAlpha = solid; g.drawImage(N.c, Math.floor(lt[0]) - 1, 0, Math.ceil(lt[1]) + 3, s[3], s[0] + Math.floor(lt[0]) - 1, s[1], Math.ceil(lt[1]) + 3, s[3]);
        if (glowA > 0.3) { g.globalCompositeOperation = 'screen'; g.globalAlpha = glowA * 0.55; g.drawImage(N.glow, s[0] + lt[0] + lt[1] / 2 - 26, s[1] + N.wy - 26); g.globalCompositeOperation = 'source-over'; } });
      if (F) { g.globalAlpha = solid; g.drawImage(N.c, 0, s[3], s[2], 24, s[0], s[1] + s[3], s[2], 24); }
      g.globalAlpha = 1;
      if (F && S.dark > 0.2) { var chase = t < this.chaseUntil, step = Math.floor(t * 9); g.fillStyle = '#ffe8a0'; D.bulbs.forEach(function (b, i) { if (!chase || (i + step) % 3 === 0) g.fillRect(b[0] - 1, b[1] - 1, 2, 2); }); }
    }
    // the hotel's sign: lit from dusk; its T never lights; its E buzzes off and on as an event
    if (F && S.dark > 0.15 && env.power.level(hs[0], t) > 0.5) {
      this.nextHotel -= dt; if (this.nextHotel <= 0 && Q.motion) { this.nextHotel = rand(10, 45); this.hotelE = t + rand(0.6, 3); }
      H.letters.split('').forEach(function (ch, k) { if (k === 2) { g.fillStyle = 'rgba(120,60,30,0.35)'; g.fillRect(hs[0] + 3, hs[1] + 6 + k * 24, hs[2] - 6, 20); return; } if (k === 3 && t < self.hotelE && Math.random() < 0.6) return;
        var a = smooth((S.dark - 0.15) / 0.4); g.globalAlpha = a; g.drawImage(N.h, 0, k * 24 + 4, hs[2], 24, hs[0], hs[1] + k * 24 + 4, hs[2], 24); g.globalCompositeOperation = 'screen'; g.globalAlpha = a * 0.5; g.drawImage(N.hglow, hs[0] + hs[2] / 2 - 18, hs[1] + 16 + k * 24 - 18); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; });
    }
    // a curtain in an upper room of the hotel moves, though the window is shut
    if (F) { this.nextCurtain -= dt; if (this.nextCurtain <= 0 && Q.motion) { this.nextCurtain = rand(25, 90); this.curtainT = t; }
      if (this.curtainT >= 0) { var ct = t - this.curtainT; if (ct > 7) this.curtainT = -1; else { var cxw = H.x + 18, cyw = H.top + 20 + 4 * 32 + 2, wv = 8 + Math.sin(ct * 2.4) * 4 + Math.sin(ct * 5.1) * 1.5; g.fillStyle = S.dark > 0.5 ? '#2a1c1c' : '#6a3434'; g.fillRect(cxw, cyw, Math.round(wv), 20); g.fillStyle = 'rgba(0,0,0,0.25)'; for (var fx = cxw + 2; fx < cxw + wv; fx += 3) g.fillRect(fx, cyw, 1, 20); } } }
  };
  FT.DOORRECT = DOORRECT; FT.Scene = Scene; 
})(window.FT = window.FT || {});
