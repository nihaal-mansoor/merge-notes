/* Fog Town: engine.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt, brick = FT.brick, stone = FT.stone, stucco = FT.stucco, plate = FT.plate, planks = FT.planks, grime = FT.grime, crack = FT.crack, plaster = FT.plaster, cornice = FT.cornice, band = FT.band, win = FT.win, shopWin = FT.shopWin, door = FT.door, signBoard = FT.signBoard, drainpipe = FT.drainpipe, leaves = FT.leaves, vine = FT.vine, weeds = FT.weeds, STACKS = FT.STACKS, far = FT.far, mid = FT.mid, back = FT.back, B = FT.B, SIGNS = FT.SIGNS, goose = FT.goose, street = FT.street, front = FT.front, LAMP = FT.LAMP, POLE_A = FT.POLE_A, POLE_B = FT.POLE_B, prop = FT.prop, props = FT.props, lampCone = FT.lampCone, glowSprite = FT.glowSprite, finish = FT.finish, fogStrip = FT.fogStrip, puff = FT.puff, wireY = FT.wireY, capsLayer = FT.capsLayer, wetLayer = FT.wetLayer, vehicles = FT.vehicles, stranger = FT.stranger, dogSheet = FT.dogSheet, ratSheet = FT.ratSheet, bankLayer = FT.bankLayer, paintRoom = FT.paintRoom, build = FT.build, GRADE = FT.GRADE, sky = FT.sky, blend = FT.blend, tint = FT.tint, grade = FT.grade, Sound = FT.Sound, ZONES = FT.ZONES, SWX = FT.SWX, ZRANK = FT.ZRANK, LANES = FT.LANES, DOORS = FT.DOORS, SPOTS = FT.SPOTS, Weather = FT.Weather, zoneOf = FT.zoneOf, Power = FT.Power, Crowd = FT.Crowd, DOORRECT = FT.DOORRECT, canvas = FT.canvas, Scene = FT.Scene;
  // ---------------------------------------------------------------- start: the clock, the lever (spark, the lights go out street by street, the rust spreads), the torch, the hooks the page uses
  function start(stage) {
    var fogC = stage.querySelector('#fog'), rustC = stage.querySelector('#rust'), torchC = stage.querySelector('#torch');
    fogC.width = W; fogC.height = H; rustC.width = rustC.height = torchC.width = torchC.height = 0;   // the rust world's canvases only take memory while it is showing
    var q = new URLSearchParams(location.search), tb0 = performance.now(), surface = build('fog'), below = null, sound = new Sound(), wx = new Weather(q, new Date()), power = new Power(), crowd = new Crowd(), sF = new Scene(fogC, true), sR = null;
    var env = { crowd: crowd, wx: wx, power: power, sound: sound, mouse: { x: -999, y: -999 }, hover: q.get('hover'), lever: { pulled: false } };   // (?hover=id: preview only, as if pointing at a building)
    // quality: everyone gets the same town, but on a slow machine the extras thin out before anything stutters
    FT.Q = { p: 1, motion: !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) };
    var avg = 8, lastGov = 0;
    function govern(ms, t) { avg = avg * 0.95 + ms * 0.05; if (t - lastGov < 2) return; lastGov = t; if (avg > 20) FT.Q.p = Math.max(0.3, FT.Q.p - 0.15); else if (avg < 10) FT.Q.p = Math.min(1, FT.Q.p + 0.1); }
    var diner = new FT.Diner(); env.diner = diner; sF.diner = diner;
    FT.memRoots(function () { return { surface: surface, rust: below, street: sF, under: sR, crowd: crowd, diner: diner, scratch: FT.SCRATCH, bodies: window.FTBody2 }; });   // (debug=mem only)
    var under = false, reveal = 0, seq = null, last = 0, t0 = performance.now(), prev = t0, tNow = 9, speed = +(q.get('speed') || 1), fixed = q.get('time');
    var clock0 = fixed ? (function () { var m = fixed.split(':'); return +m[0] + (+(m[1] || 0)) / 60; })() : null, real0 = new Date();
    function hourNow(t) { var base = clock0 != null ? clock0 : real0.getHours() + real0.getMinutes() / 60 + real0.getSeconds() / 3600; return ((base + t * speed / 3600) % 24 + 24) % 24; }
    stage.addEventListener('pointermove', function (e) { var b = stage.getBoundingClientRect(); env.mouse.x = (e.clientX - b.left) / b.width * W; env.mouse.y = (e.clientY - b.top) / b.height * H; });
    stage.addEventListener('pointerleave', function () { env.mouse.x = env.mouse.y = -999; });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) prev = last = performance.now(); });   // coming back to the tab: no jump
    // the mask that lets the rust spread out from the switch box, through a dither, with a burning edge
    var MW = 320, MH = 180, maskC = document.createElement('canvas'), edgeC = document.createElement('canvas'); maskC.width = edgeC.width = MW; maskC.height = edgeC.height = MH;
    var mg = maskC.getContext('2d'), eg = edgeC.getContext('2d'), mImg = mg.createImageData(MW, MH), eImg = eg.createImageData(MW, MH), noise = new Float32Array(MW * MH), nr = rng(5), coarse = [];
    for (var cj = 0; cj <= MH / 8 + 1; cj++) { coarse.push([]); for (var ci = 0; ci <= MW / 8 + 1; ci++) coarse[cj].push(nr()); }
    for (var j = 0; j < MH; j++) for (var i = 0; i < MW; i++) { var u = i / 8, v = j / 8, iu = u | 0, iv = v | 0, fu = u - iu, fv = v - iv; noise[j * MW + i] = (coarse[iv][iu] * (1 - fu) * (1 - fv) + coarse[iv][iu + 1] * fu * (1 - fv) + coarse[iv + 1][iu] * (1 - fu) * fv + coarse[iv + 1][iu + 1] * fu * fv) * 160; }
    function mask(p) {
      var R = p * 1420, md = mImg.data, ed = eImg.data, SX = SWX, SY = 470;
      for (var j2 = 0; j2 < MH; j2++) for (var i2 = 0; i2 < MW; i2++) { var idx = j2 * MW + i2, k = idx * 4, d = Math.hypot(i2 * 4 + 2 - SX, (j2 * 4 + 2 - SY) * 1.1) + noise[idx];
        md[k + 3] = d < R - 26 ? 255 : d < R + 26 ? (BAYER[(j2 & 3) * 4 + (i2 & 3)] / 16 < (R + 26 - d) / 52 ? 255 : 0) : 0;
        var e = Math.abs(d - R) < 9 && p < 1; ed[k] = 255; ed[k + 1] = 110 + ((noise[idx] * 3) % 90); ed[k + 2] = 40; ed[k + 3] = e ? 255 : 0; }
      mg.putImageData(mImg, 0, 0); eg.putImageData(eImg, 0, 0);
      [rustC, torchC].forEach(function (cv) { var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.globalCompositeOperation = 'destination-in'; g.drawImage(maskC, 0, 0, W, H); g.globalCompositeOperation = 'source-over'; });
      var rg = rustC.getContext('2d'); rg.drawImage(edgeC, 0, 0, W, H);
    }
    // the torch: darkness with holes in it where the cursor and the lamp are (soft light, so the canvas is half size)
    function torch() { var g = torchC.getContext('2d'); g.setTransform(0.5, 0, 0, 0.5, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(6,3,2,0.82)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'destination-out';
      [[env.mouse.x > -900 ? env.mouse.x : 640, env.mouse.y > -900 ? env.mouse.y : 360, 280, 1], [LAMP.x, 470, 120, 0.8]].forEach(function (s) { var gr = g.createRadialGradient(s[0], s[1], 6, s[0], s[1], s[2]); gr.addColorStop(0, 'rgba(0,0,0,' + s[3] + ')'); gr.addColorStop(0.55, 'rgba(0,0,0,' + s[3] * 0.7 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }); g.globalCompositeOperation = 'source-over'; }
    // the rust world is built while the lights are out (nobody sees the pause), and thrown away once the lights are back
    function makeBelow() { if (!below) { var tb = performance.now(); rustC.width = W; rustC.height = H; torchC.width = W / 2; torchC.height = H / 2; below = build('rust'); sR = new Scene(rustC, false); if (q.has('debug')) console.log('dbg rust built in ' + Math.round(performance.now() - tb) + ' ms'); FT.mem('rust built', 30); } }
    function freeBelow() { below = sR = null; rustC.width = rustC.height = torchC.width = torchC.height = 0; FT.mem('rust freed'); }
    // while the rust world fills the screen the street is not drawn: let its graded layers and its people's sheets go (they come back as the lever goes up)
    function restStreet() { sF.cache = {}; sF.key = ''; crowd.sheets = {}; crowd.bytes = 0; }
    // warm up: a few people already out, smoke and ash already in the air
    var h0 = hourNow(0); diner.fill(crowd.cast, hourNow(0) >= 1 && hourNow(0) < 5 ? 1 : 2 + ((Math.random() * 2) | 0)); for (var wu = 0; wu < 40; wu++) crowd.update(0.5, sky(h0), h0, wx, sF, sound); crowd.list.forEach(function (p) { if (p.x < 0 || p.x > W) p.x = rand(60, W - 60); });
    sF.hour = h0; sF.warm();
    if (q.has('debug')) console.log('dbg surface built in ' + Math.round(performance.now() - tb0) + ' ms'); FT.mem('surface built');
    if (q.has('under')) { makeBelow(); under = true; reveal = 1; env.lever.pulled = true; power.force = { t0: -100, down: true }; restStreet(); }
    function frame(now) { requestAnimationFrame(frame); if (now - last < 33) return; last = now; step(now); }
    function step(now) {
      var dt = Math.min(0.1, (now - prev) / 1000), t = 9 + (now - t0) / 1000; prev = now; tNow = t;
      var hour = hourNow(t - 9), S = sky(hour); wx.update(dt); power.update(dt, t, sound); crowd.update(dt, S, hour, wx, sF, sound); diner.update(dt, crowd, hour); if (!FT.Q.motion) power.next = 1e9; sF.hour = hour; if (sR) sR.hour = hour;
      if (q.has("debug") && Math.random() < 0.05) console.log("dbg t=" + t.toFixed(2) + " seq=" + (seq ? JSON.stringify(seq) : "none") + " reveal=" + reveal.toFixed(2) + " force=" + JSON.stringify(power.force) + " under=" + under);
      if (seq) { var st = t - seq.t0;
        if (seq.dir > 0) { if (st > 0.45 && !seq.dark) { seq.dark = true; power.force = { t0: t, down: true }; } if (st > 0.9 && !below) makeBelow(); reveal = st > 1.9 ? clamp((st - 1.9) / 1.8, 0, 1) : 0; if (reveal >= 1) { seq = null; under = true; restStreet(); FT.mem('rust world, street at rest', 26); } }
        else { reveal = clamp(1 - st / 1.6, 0, 1); if (reveal <= 0 && !seq.up) { seq.up = true; under = false; env.lever.pulled = false; power.force = { t0: t, down: false }; sound.powerUp(); freeBelow(); } if (seq.up && st > 4) seq = null; } }
      var td = performance.now(); if (reveal < 1) sF.draw(surface, t, dt, hour, env); govern(performance.now() - td, t); if (q.has('debug') && Math.random() < 0.05) console.log('dbg frame ' + (performance.now() - td).toFixed(1) + ' ms, quality ' + FT.Q.p.toFixed(2));
      if (reveal > 0 && sR) { sR.draw(below, t, dt, hour, env); torch(); if (reveal < 1) mask(reveal); }
      rustC.style.opacity = torchC.style.opacity = reveal > 0 ? 1 : 0; FT.memTick(under ? 'rust world showing' : reveal > 0 ? 'rust spreading' : 'street');
      sound.update({ wind: 14 + 9 * Math.sin(t * 0.031), rain: wx.rain, t: t, lamp: sF.lampLevel || 0, power: power.level(SWX, t) });
    }
    var api;
    function buildingAt(x) { for (var k in B) { var b = B[k]; if (x >= b[0] && x < b[0] + b[1]) return k; } return null; }
    api = {
      flip: function (u) { if (seq || u === under) return false; if (u) { seq = { t0: tNow, dir: 1 }; env.lever.pulled = true; sF.spark(); sound.spark(); } else seq = { t0: tNow, dir: -1 }; return true; },
      hover: function (id) { env.hover = id; },
      windowAt: function (x, y) { var ws = surface.K.wins; for (var i = 0; i < ws.length; i++) { var w = ws[i]; if (w.layer === 'street' && w.isOn && !w.shop && !w.door && x >= w.x - 3 && x <= w.x + w.w + 3 && y >= w.y - 3 && y <= w.y + w.h + 3) return { b: buildingAt(w.x + w.w / 2) }; } return null; },
      ringing: function () { return !!sF.ring; },
      answer: function () { sF.ring = null; sound.pickup(); },
      vend: function () { sF.vend(sound); },
      sound: function () { return sound.toggle(); },
      under: function () { return under; }
    };
    // preview only: ?sim=N plays N seconds of frames before the first paint (with ?simpull= and ?simback= to work the lever)
    var simN = +(q.get('sim') || 0); if (simN) { var pa = q.has('simpull') ? +q.get('simpull') : -1, ba = q.has('simback') ? +q.get('simback') : -1; var tsim = performance.now(); for (var sk = 0; sk < simN * 30; sk++) { var ft = t0 + sk * 33.4, el = sk * 33.4 / 1000; if (pa >= 0 && el >= pa) { api.flip(true); pa = -1; } if (ba >= 0 && el >= ba) { api.flip(false); ba = -1; } step(ft); } if (q.has('debug')) console.log('dbg sim: ' + ((performance.now() - tsim) / (simN * 30)).toFixed(2) + ' ms a frame over ' + simN * 30 + ' frames'); t0 -= simN * 1000 + 50; prev = last = performance.now(); } FT.mem('after sim ' + simN + 's' + (q.has('simpull') ? ' (lever pulled)' : ''), 24);
    requestAnimationFrame(frame);
    return api;
  }
  FT.start = start; 
  window.FogTown = { start: start, W: W, H: H, G: G, B: B, paintRoom: paintRoom };
})(window.FT = window.FT || {});
