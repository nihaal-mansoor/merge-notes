/*
  Home page B: the street scene. A noodle diner on a wet street at night, with your city's skyline
  fading into the fog behind it.

  The scene is drawn on five stacked canvases:
    .street         the painted scene at 640 x 360 (sky, skyline, fog, buildings, the diner, the street, reflections)
    .street-people  the people, at twice the density (1280 x 720), from js/street-people.js
    .street-light   light falling on everything below: windows, the door, the searchlight, scooter lamps (screen blend)
    .street-front   fog, the hover car, rain or snow, the out-of-focus umbrellas, grain and vignette
    .street-glow    a blurred copy of the lights (no text glows, by design)

  Preview with ?time=23:00, ?weather=rain, ?weather=snow or ?weather=clear, and ?speed=600.
  Without JavaScript, a still night picture shows instead.
*/
(function () {
  'use strict';

  var D = window.STREET_DATA;
  var art = document.querySelector('.scene .art');
  var canvas = document.querySelector('.street');
  if (!D || !art || !canvas || !canvas.getContext) return;
  var W = D.width, H = D.height, LW = D.layerWidth, LH = D.layerHeight, MARGIN = D.margin;

  function layer(cls, w, h) {
    var c = art.querySelector('.' + cls);
    if (!c) { c = document.createElement('canvas'); c.className = cls; art.appendChild(c); }
    c.width = w; c.height = h;
    return c.getContext('2d');
  }
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  var crowd = window.StreetPeople ? window.StreetPeople(D) : null;
  var PS = crowd ? crowd.scale : 2;
  var ptx = layer('street-people', W * PS, H * PS);
  var ltx = layer('street-light', W, H);
  var ftx = layer('street-front', W, H);
  var gtx = layer('street-glow', W, H);
  art.appendChild(gtx.canvas);   // keep the glow on top
  [ctx, ptx, ltx, ftx, gtx].forEach(function (g) { g.imageSmoothingEnabled = false; });

  var me = document.currentScript;
  var root = (me && me.src ? me.src : 'js/street.js').replace(/js\/street\.js.*$/, '');
  var query = new URLSearchParams(window.location.search);
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fixedClock = parseClock(query.get('time'));
  var speed = Math.max(1, Number(query.get('speed')) || 1);
  var weatherOverride = query.get('weather');
  var startedAt = Date.now();

  // ---------- Helpers ----------
  function parseClock(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (Number(m[1]) % 24) * 3600 + Number(m[2]) * 60 : null; }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')'; }
  function keyframes(f, pts) {
    for (var i = 1; i < pts.length; i++) { if (f <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * ((f - a[0]) / ((b[0] - a[0]) || 1)); } }
    return pts[pts.length - 1][1];
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---------- Time of day and weather ----------
  var PHASE = {
    dusk: [[0, 0], [0.22, 0], [0.25, 1], [0.285, 0], [0.70, 0], [0.74, 1], [0.77, 1], [0.81, 0], [1, 0]],
    day: [[0, 0], [0.245, 0], [0.29, 1], [0.71, 1], [0.75, 0], [1, 0]],
    lights: [[0, 1], [0.24, 1], [0.275, 0], [0.715, 0], [0.75, 1], [1, 1]]
  };
  var SKY = {
    stops: [0, 0.2, 0.4, 0.6, 0.8],
    night: ['#050d12', '#0a1820', '#10242c', '#1a3038', '#24383e'].map(rgb),
    dusk: ['#1b1846', '#3a2c6a', '#8a3a7a', '#d0566a', '#e88a5a'].map(rgb),
    day: ['#8a9aa2', '#9aaab0', '#a8b6ba', '#b4c0c2', '#c0c8c8'].map(rgb)
  };
  var FOG = { night: rgb('#1e3e48'), dusk: rgb('#7a4a70'), day: rgb('#bcc8cc') };
  function clockSeconds() {
    var elapsed = (Date.now() - startedAt) / 1000, start;
    if (fixedClock !== null) start = fixedClock;
    else { var d = new Date(startedAt); start = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); }
    return ((start + elapsed * speed) % 86400 + 86400) % 86400;
  }
  function weatherNow() {
    if (weatherOverride === 'rain' || weatherOverride === 'snow' || weatherOverride === 'clear') return weatherOverride;
    var slot = Math.floor(Date.now() / 300000), h = Math.sin(slot * 78.233) * 43758.5453; h -= Math.floor(h);
    return h < 0.45 ? 'rain' : h < 0.75 ? 'snow' : 'clear';
  }

  // ---------- State ----------
  var state = { weather: weatherNow(), t: 0, lights: 1, day: 0, dusk: 0 };
  var rainLevel = state.weather === 'rain' ? 1 : 0, snowLevel = state.weather === 'snow' ? 1 : 0;
  var drops = [], flakes = [], splashes = [], ripples = [], steam = [];
  for (var i = 0; i < 380; i++) drops.push(newDrop(true));
  for (var j = 0; j < 220; j++) flakes.push(newFlake(true));
  var fogPuffs = [];
  for (var f = 0; f < 9; f++) fogPuffs.push({ x: rand(0, W), y: rand(120, 300), r: rand(60, 140), v: rand(2, 6) * (Math.random() < 0.5 ? 1 : -1), a: rand(0.08, 0.18) });
  var flash = { start: -99, next: rand(20, 50) };
  var parallax = 0, parallaxTarget = 0;
  var images = {}, ready = false;
  var refl = document.createElement('canvas'); refl.width = W; refl.height = H - D.ground;
  var rtx = refl.getContext('2d');
  var grain = document.createElement('canvas'); grain.width = 128; grain.height = 128;
  (function () {
    var g = grain.getContext('2d');
    for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) { var v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(0,0,0,' + (0.25 * Math.random()) + ')' : 'rgba(255,255,255,' + (0.12 * Math.random()) + ')'; g.fillRect(x, y, 1, 1); }
  })();

  function newDrop(anywhere) { return { x: rand(-20, W + 120), y: anywhere ? rand(-20, H) : rand(-40, -5), len: (rand(4, 9)) | 0, v: rand(240, 320), floor: Math.random() < 0.6 ? rand(D.ground + 4, H) : rand(60, H) }; }
  function newFlake(anywhere) { return { x: rand(-20, W + 20), y: anywhere ? rand(-10, H) : rand(-20, -2), v: rand(10, 26), s: Math.random() < 0.25 ? 2 : 1, p: rand(0, 6.28), sw: rand(4, 14) }; }
  function offset(depth) { return Math.round(parallax * depth); }
  function env() { return { t: state.t, lights: state.lights, day: state.day, rain: rainLevel, wet: 0.45 + 0.55 * Math.max(rainLevel, snowLevel * 0.6), offset: offset }; }

  // ---------- The back canvas: the painted scene ----------
  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, D.ground);
    for (var i = 0; i < SKY.stops.length; i++) g.addColorStop(SKY.stops[i], css(mix(mix(SKY.night[i], SKY.dusk[i], state.dusk), SKY.day[i], state.day)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function drawCity() {
    var dx = offset(0.15) - 12;
    for (var l = 0; l < 3; l++) {
      var sy = l * 360;
      ctx.globalAlpha = 1; ctx.drawImage(images.cityNight, 0, sy, 664, 360, dx, -70, 664, 360);
      if (state.dusk > 0.003) { ctx.globalAlpha = state.dusk; ctx.drawImage(images.cityDusk, 0, sy, 664, 360, dx, -70, 664, 360); }
      if (state.day > 0.003) { ctx.globalAlpha = state.day; ctx.drawImage(images.cityDay, 0, sy, 664, 360, dx, -70, 664, 360); }
    }
    ctx.globalAlpha = 1;
  }
  function fogColor() { return mix(mix(FOG.night, FOG.dusk, state.dusk), FOG.day, state.day); }
  function drawFogWash(g, y0, y1, a0, a1) {
    var c = fogColor(), gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, css(c, a0)); gr.addColorStop(1, css(c, a1));
    g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0);
  }
  function drawFogPuffs(g, strength, yMax) {
    var c = fogColor();
    for (var i = 0; i < fogPuffs.length; i++) {
      var p = fogPuffs[i];
      if (yMax && p.y > yMax) continue;
      var gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      gr.addColorStop(0, css(c, p.a * strength)); gr.addColorStop(1, css(c, 0));
      g.fillStyle = gr; g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
  }
  function drawLayer(l, depth) {
    var dx = offset(depth) - MARGIN, sy = l * LH;
    ctx.globalAlpha = 1; ctx.drawImage(images.night, 0, sy, LW, LH, dx, 0, LW, LH);
    if (state.day > 0.003) { ctx.globalAlpha = state.day; ctx.drawImage(images.day, 0, sy, LW, LH, dx, 0, LW, LH); }
    ctx.globalAlpha = 1;
  }
  // The wet street: the lit buildings mirrored, squashed and wobbling; stronger in the puddles
  function drawReflections(t) {
    var a = state.lights, wet = 0.45 + 0.55 * Math.max(rainLevel, snowLevel * 0.6);
    if (a < 0.02) return;
    rtx.clearRect(0, 0, W, refl.height);
    for (var k = 0; k < refl.height; k++) {
      var srcY = Math.round(D.ground - 2 - k * 1.7);
      if (srcY < 90) break;
      var wob = Math.round(Math.sin(t * 2.4 + k * 0.8) * (0.6 + rainLevel * 1.4));
      rtx.globalAlpha = 1 - k / refl.height * 0.6;
      rtx.drawImage(images.reflect, 0, LH + srcY, LW, 1, offset(0.6) - MARGIN + wob, k, LW, 1);
      rtx.drawImage(images.reflect, 0, srcY, LW, 1, offset(0.4) - MARGIN + wob, k, LW, 1);
    }
    rtx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = a * (0.16 + 0.2 * wet); ctx.drawImage(refl, 0, D.ground + 4);
    ctx.save(); ctx.beginPath();
    var ox = offset(0.8);
    D.puddles.forEach(function (p) { ctx.moveTo(p[0] + ox + p[2], p[1]); ctx.ellipse(p[0] + ox, p[1], p[2], p[3], 0, 0, Math.PI * 2); });
    ctx.clip(); ctx.globalAlpha = a * (0.35 + 0.3 * wet); ctx.drawImage(refl, 0, D.ground + 4); ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function drawSteam() {
    var c = mix(rgb('#c8d4d8'), rgb('#e8ecef'), state.day);
    for (var i = 0; i < steam.length; i++) {
      var s = steam[i], a = (1 - s.age / s.life) * 0.28, size = s.age < 0.8 ? 1 : s.age < 2 ? 2 : 3;
      ctx.fillStyle = css(c, a); ctx.fillRect(Math.round(s.x) + offset(0.6), Math.round(s.y), size, size);
    }
  }
  function drawBarrierLights(t, g, pools) {
    var ox = offset(0.8);
    for (var i = 0; i < D.barrierLights.length; i++) {
      var b = D.barrierLights[i];
      if (((t * 1.5 + i * 0.5) % 1) < 0.5) {
        g.fillStyle = '#ff3b3b'; g.fillRect(b[0] + ox - 1, b[1], 3, 3);
        if (pools) {
          var rg = g.createRadialGradient(b[0] + ox, b[1] + 22, 0, b[0] + ox, b[1] + 22, 34);
          rg.addColorStop(0, 'rgba(255,40,50,0.22)'); rg.addColorStop(1, 'rgba(255,40,50,0)');
          g.fillStyle = rg; g.fillRect(b[0] + ox - 34, b[1] - 12, 68, 68);
        }
      }
    }
  }
  function drawTruckScreen(t, g) {
    var s = D.truckScreen, ox = offset(0.8);
    g.globalAlpha = Math.max(0.5, state.lights);
    g.fillStyle = (Math.floor(t * 2) % 5) ? '#3ef0e6' : '#ff4fa3'; g.fillRect(s[0] + ox, s[1], s[2], s[3]);
    g.fillStyle = 'rgba(10,20,24,0.6)'; g.fillRect(s[0] + ox, s[1] + Math.floor((t * 6) % s[3]), s[2], 1);
    g.globalAlpha = 1;
  }

  // ---------- The light canvas (blended with screen): light falling on the scene and the people ----------
  function drawSpill(g) {
    var a = state.lights;
    if (a < 0.02) return;
    var s = D.sign, ox = offset(0.6), cx = s[0] + s[2] / 2 + ox, cy = s[1] + s[3] / 2;
    var gr = g.createRadialGradient(cx, cy, 10, cx, cy, 210);
    gr.addColorStop(0, 'rgba(255,70,140,' + (0.22 * a) + ')'); gr.addColorStop(1, 'rgba(255,70,140,0)');
    g.fillStyle = gr; g.fillRect(cx - 210, cy - 210, 420, 420);
    for (var i = 0; i + 3 < D.windows.length; i += 4) {
      var wx = D.windows[i] + ox, ww = D.windows[i + 2], gy = D.ground;
      var lg = g.createLinearGradient(0, gy - 30, 0, gy + 70);
      lg.addColorStop(0, 'rgba(255,190,110,' + (0.16 * a) + ')'); lg.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = lg;
      g.beginPath(); g.moveTo(wx - 2, gy - 30); g.lineTo(wx + ww + 2, gy - 30); g.lineTo(wx + ww + 30, gy + 70); g.lineTo(wx - 30, gy + 70); g.closePath(); g.fill();
    }
  }
  function carPosition(t) { return [Math.round(46 + Math.sin(t * 0.25) * 8) + offset(1), Math.round(36 + Math.sin(t * 0.9) * 2)]; }
  function drawSearchlight(g, t) {
    var c = carPosition(t), origin = [c[0] + 22, c[1] + 11], a = Math.max(state.lights, 0.35);
    var tx = origin[0] + 70 + Math.sin(t * 0.32) * 60, ty = 300;
    var gr = g.createLinearGradient(origin[0], origin[1], tx, ty);
    gr.addColorStop(0, 'rgba(255,60,70,' + (0.34 * a) + ')'); gr.addColorStop(1, 'rgba(255,60,70,' + (0.06 * a) + ')');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(origin[0] - 2, origin[1]); g.lineTo(origin[0] + 2, origin[1]); g.lineTo(tx + 34, ty); g.lineTo(tx - 34, ty); g.closePath(); g.fill();
    var pool = g.createRadialGradient(tx, ty, 0, tx, ty, 50);
    pool.addColorStop(0, 'rgba(255,60,70,' + (0.28 * a) + ')'); pool.addColorStop(1, 'rgba(255,60,70,0)');
    g.fillStyle = pool; g.save(); g.translate(tx, ty); g.scale(1, 0.3); g.translate(-tx, -ty); g.fillRect(tx - 50, ty - 50, 100, 100); g.restore();
  }

  // ---------- The front canvas: fog, the hover car, weather, umbrellas, grain ----------
  function drawCar(g, t, lightsOnly) {
    var c = carPosition(t), x = c[0], y = c[1];
    if (!lightsOnly) {
      g.fillStyle = '#10181e'; g.fillRect(x, y + 4, 44, 6); g.fillRect(x + 4, y + 2, 30, 2); g.fillRect(x + 10, y, 18, 2);
      g.fillStyle = '#1c2830'; g.fillRect(x + 2, y + 5, 40, 1);
      g.fillStyle = '#2a6a78'; g.fillRect(x + 12, y + 1, 14, 1);
      g.fillStyle = '#0a1014'; g.fillRect(x + 6, y + 10, 8, 2); g.fillRect(x + 30, y + 10, 8, 2);
    }
    g.fillStyle = '#ff3355'; if ((t % 1.3) < 0.7) { g.fillRect(x, y + 6, 1, 2); g.fillRect(x + 43, y + 6, 1, 2); }
    g.fillStyle = '#ff5a5a'; g.fillRect(x + 20, y + 10, 4, 1);
  }
  function drawPrecipitation(g) {
    var night = 1 - state.day, rc = mix(rgb('#dfe6ee'), rgb('#a8c8d8'), night), count = Math.floor(drops.length * rainLevel);
    if (count) {
      g.fillStyle = css(rc, 0.4);
      for (var i = 0; i < count; i++) { var d = drops[i]; for (var k = 0; k < d.len; k++) g.fillRect(Math.round(d.x + k * 0.25), Math.round(d.y - k), 1, 1); }
    }
    g.fillStyle = css(rc, 0.65);
    for (var j = 0; j < splashes.length; j++) { var sp = splashes[j]; if (sp.age < 0.06) g.fillRect(sp.x, sp.y - 1, 1, 1); else { g.fillRect(sp.x - 1, sp.y - 1, 1, 1); g.fillRect(sp.x + 1, sp.y - 2, 1, 1); } }
    g.fillStyle = css(rc, 0.3);
    for (var q = 0; q < ripples.length; q++) { var rp = ripples[q], rw = 1 + Math.floor(rp.age * 12); g.fillRect(rp.x - rw, rp.y, 1, 1); g.fillRect(rp.x + rw, rp.y, 1, 1); }
    var fcount = Math.floor(flakes.length * snowLevel);
    if (fcount) {
      g.fillStyle = 'rgba(235,242,245,0.85)';
      for (var n = 0; n < fcount; n++) { var fl = flakes[n]; g.fillRect(Math.round(fl.x + Math.sin(state.t * 0.8 + fl.p) * fl.sw * 0.3), Math.round(fl.y), fl.s, fl.s); }
    }
  }
  function drawFore(g) {
    var dx = offset(D.foreDepth) - D.foreMargin * 2, fw = D.foreWidth, fh = D.foreHeight;
    g.globalAlpha = 1; g.drawImage(images.foreNight, 0, 0, fw, fh, dx, 0, fw * 2, fh * 2);
    if (state.day > 0.003) { g.globalAlpha = state.day; g.drawImage(images.foreDay, 0, 0, fw, fh, dx, 0, fw * 2, fh * 2); }
    g.globalAlpha = 1;
  }
  function drawFinish(g, t) {
    var gx = -Math.floor(Math.random() * 128), gy = -Math.floor(Math.random() * 128);
    g.globalAlpha = 0.5;
    for (var y = gy; y < H; y += 128) for (var x = gx; x < W; x += 128) g.drawImage(grain, x, y);
    g.globalAlpha = 1;
    var v = g.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, W * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,6,10,' + (0.5 - 0.25 * state.day) + ')');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    var age = t - flash.start;
    if (age < 0.7) {
      var fl = age < 0.06 ? 0.7 : age < 0.1 ? 0.1 : age < 0.16 ? 0.5 : Math.max(0, 0.5 * (1 - (age - 0.16) / 0.5));
      g.fillStyle = 'rgba(210,230,240,' + (fl * 0.45) + ')'; g.fillRect(0, 0, W, H);
    }
  }

  // ---------- Update ----------
  function update(dt, t) {
    state.weather = weatherNow();
    rainLevel += ((state.weather === 'rain' ? 1 : 0) - rainLevel) * Math.min(1, dt / 8);
    snowLevel += ((state.weather === 'snow' ? 1 : 0) - snowLevel) * Math.min(1, dt / 8);
    parallax += (parallaxTarget - parallax) * Math.min(1, dt * 3);
    if (crowd) crowd.update(dt, t, env());
    for (var f = 0; f < fogPuffs.length; f++) { var fp = fogPuffs[f]; fp.x += fp.v * dt; if (fp.x > W + fp.r) fp.x = -fp.r; else if (fp.x < -fp.r) fp.x = W + fp.r; }
    state.steamClock = (state.steamClock || 0) + dt;
    while (state.steamClock > 0.12) {
      state.steamClock -= 0.12;
      steam.push({ x: D.roofVent[0] + rand(-1, 1), y: D.roofVent[1], vx: rand(-2, 3), vy: -rand(5, 9), age: 0, life: rand(2.5, 4.5) });
    }
    for (var s = steam.length - 1; s >= 0; s--) { var st = steam[s]; st.age += dt; st.x += st.vx * dt; st.y += st.vy * dt; st.vx += rand(-1.5, 2) * dt; if (st.age > st.life) steam.splice(s, 1); }
    var count = Math.floor(drops.length * rainLevel);
    for (var d = 0; d < count; d++) {
      var dr = drops[d]; dr.y += dr.v * dt; dr.x -= dr.v * dt * 0.25;
      if (dr.y >= dr.floor) {
        if (dr.floor > D.ground) { splashes.push({ x: Math.round(dr.x), y: Math.round(dr.floor), age: 0 }); if (Math.random() < 0.3) ripples.push({ x: Math.round(dr.x), y: Math.round(dr.floor), age: 0 }); }
        drops[d] = newDrop(false);
      }
    }
    for (var q = splashes.length - 1; q >= 0; q--) { splashes[q].age += dt; if (splashes[q].age > 0.14) splashes.splice(q, 1); }
    for (var z = ripples.length - 1; z >= 0; z--) { ripples[z].age += dt; if (ripples[z].age > 0.4) ripples.splice(z, 1); }
    var fcount = Math.floor(flakes.length * snowLevel);
    for (var n = 0; n < fcount; n++) { var fl = flakes[n]; fl.y += fl.v * dt; fl.x += (6 + Math.sin(t * 0.3) * 6) * dt; if (fl.y > H || fl.x > W + 20) flakes[n] = newFlake(false); }
    if (rainLevel > 0.6 && state.day < 0.5 && t > flash.next) { flash.start = t; flash.next = t + rand(20, 60); }
  }

  // ---------- Render ----------
  function render(t) {
    var f = clockSeconds() / 86400;
    state.t = t;
    state.dusk = keyframes(f, PHASE.dusk); state.day = keyframes(f, PHASE.day); state.lights = keyframes(f, PHASE.lights);
    var fogAmount = 1 + 0.35 * rainLevel + 0.2 * snowLevel, e = env();

    // Back: the painted scene
    drawSky();
    drawCity();
    drawFogWash(ctx, 0, D.ground, 0.35 * fogAmount, 0.62 * fogAmount);
    drawFogPuffs(ctx, fogAmount);
    drawLayer(0, 0.4);
    drawFogWash(ctx, 20, D.ground, 0.06 * fogAmount, 0.22 * fogAmount);
    drawLayer(1, 0.6);
    drawSteam();
    drawLayer(2, 0.8);
    drawReflections(t);
    drawTruckScreen(t, ctx);
    ctx.globalCompositeOperation = 'screen'; drawBarrierLights(t, ctx, true); ctx.globalCompositeOperation = 'source-over';

    // People, at twice the density
    if (crowd) crowd.draw(ptx, e); else ptx.clearRect(0, 0, ptx.canvas.width, ptx.canvas.height);

    // Light falling on the scene and the people
    ltx.clearRect(0, 0, W, H);
    ltx.globalCompositeOperation = 'lighter';
    drawSpill(ltx);
    drawSearchlight(ltx, t);
    if (crowd) crowd.drawLight(ltx, e);
    ltx.globalCompositeOperation = 'source-over';

    // Front: fog over the far people, the car, weather, umbrellas, grain
    ftx.clearRect(0, 0, W, H);
    drawFogPuffs(ftx, 0.45 * fogAmount, 300);
    drawCar(ftx, t, false);
    drawPrecipitation(ftx);
    drawFore(ftx);
    drawFinish(ftx, t);

    // Glow: a blurred copy of the lights (no text)
    if (state.renderGlow) {
      gtx.clearRect(0, 0, W, H);
      var a = state.lights;
      if (a > 0.01) {
        var glowByLayer = [0.7, 0.85, 0.6], depths = [0.4, 0.6, 0.8];
        for (var gl = 0; gl < 3; gl++) { gtx.globalAlpha = a * glowByLayer[gl]; gtx.drawImage(images.lights, 0, gl * LH, LW, LH, offset(depths[gl]) - MARGIN, 0, LW, LH); }
        gtx.globalAlpha = a;
        drawBarrierLights(t, gtx, false); drawTruckScreen(t, gtx); drawCar(gtx, t, true);
        if (crowd) crowd.drawGlow(gtx, e);
        gtx.globalAlpha = 1;
      }
    }
  }

  // ---------- Loop ----------
  var last = 0, frame = 0;
  function loop(now) {
    window.requestAnimationFrame(loop);
    if (now - last < 32) return;
    var dt = Math.min(0.1, (now - last) / 1000 || 0.033);
    last = now; frame++;
    var t = (Date.now() - startedAt) / 1000;
    update(dt, t);
    state.renderGlow = frame % 2 === 0;
    render(t);
  }
  function start() {
    ready = true;
    rtx.imageSmoothingEnabled = false;
    if (reduceMotion) {
      var still = function () { var t = (Date.now() - startedAt) / 1000; state.renderGlow = true; render(t); };
      still(); window.setInterval(still, 60000);
      return;
    }

    window.requestAnimationFrame(loop);
  }
  var sources = {
    night: 'img/street/street-night.png', day: 'img/street/street-day.png', lights: 'img/street/street-lights.png', reflect: 'img/street/street-reflect.png',
    foreNight: 'img/street/fore-night.png', foreDay: 'img/street/fore-day.png',
    cityNight: 'img/scene/city-night.png', cityDusk: 'img/scene/city-dusk.png', cityDay: 'img/scene/city-day.png'
  };
  var total = Object.keys(sources).length;
  Object.keys(sources).forEach(function (name) {
    var img = new Image();
    img.onload = function () { images[name] = img; if (Object.keys(images).length === total && !ready) start(); };
    img.src = root + sources[name];
  });
})();
