/*
  The neon city behind every page.

  Draws the painted layers (img/scene/city-*.png) on a 640 x 360 canvas that CSS scales up with
  crisp pixels, and adds what a still picture can't: the real time of day, rain, wet-street
  reflections and lightning, windows switching on and off, the scrolling billboard, a blimp with an ad,
  drones, the train, flying cars, people, steam, an arcade, a hologram, a traffic light,
  searchlights and a little parallax when the mouse moves.

  Preview with ?time=23:00, ?weather=rain or ?weather=clear, and ?speed=600 to run the day fast.
  Without JavaScript, a still night picture shows instead.
*/
(function () {
  'use strict';

  // The billboard: a fixed top line and a scrolling bottom line. Update them when a new article goes up.
  var BILLBOARD_TOP = 'NEW ARTICLE';
  var BILLBOARD = 'WHERE LEADS LEAK  +  THE TRAIN DRIVER  +  ONE DEVELOPER, EIGHT APPS  +  ';
  var BLIMP_AD = 'NIHAAL.  NOTES FROM BUILDING WITH AI  //  ';

  var D = window.CITY_DATA;
  var canvas = document.querySelector('.city');
  var glowCanvas = document.querySelector('.city-glow');
  if (!D || !canvas || !canvas.getContext) return;
  var W = D.width, H = D.height, LW = D.layerWidth, LH = D.layerHeight, MARGIN = D.margin;
  canvas.width = W; canvas.height = H;
  if (glowCanvas) { glowCanvas.width = W; glowCanvas.height = H; }
  var ctx = canvas.getContext('2d');
  var gtx = glowCanvas && glowCanvas.getContext ? glowCanvas.getContext('2d') : null;

  var me = document.currentScript;
  var base = (me && me.src ? me.src : 'js/city.js').replace(/js\/city\.js.*$/, 'img/scene/');
  var query = new URLSearchParams(window.location.search);
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fixedClock = parseClock(query.get('time'));
  var speed = Math.max(1, Number(query.get('speed')) || 1);
  var weatherOverride = query.get('weather');
  var startedAt = Date.now();

  // ---------- Small helpers ----------
  function parseClock(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
    return m ? (Number(m[1]) % 24) * 3600 + Number(m[2]) * 60 : null;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')'; }
  function keyframes(f, pts) {
    for (var i = 1; i < pts.length; i++) {
      if (f <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * ((f - a[0]) / ((b[0] - a[0]) || 1)); }
    }
    return pts[pts.length - 1][1];
  }
  var seed = 20771;
  function seeded() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  function px(g, x, y, w, h) { g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }

  // ---------- The day ----------
  // Fractions of the day: dawn 05:15-06:45, day 07:00-17:00, dusk 17:00-19:30, night the rest.
  var PHASE = {
    dusk: [[0, 0], [0.22, 0], [0.25, 1], [0.285, 0], [0.70, 0], [0.74, 1], [0.77, 1], [0.81, 0], [1, 0]],
    day: [[0, 0], [0.245, 0], [0.29, 1], [0.71, 1], [0.75, 0], [1, 0]],
    stars: [[0, 1], [0.215, 1], [0.25, 0], [0.78, 0], [0.815, 1], [1, 1]],
    lights: [[0, 1], [0.24, 1], [0.275, 0], [0.715, 0], [0.75, 1], [1, 1]],
    birds: [[0, 0], [0.23, 0], [0.26, 1], [0.74, 1], [0.77, 0], [1, 0]]
  };
  var SKY = {
    stops: [0, 0.18, 0.32, 0.44, 0.58],
    night: ['#06051a', '#0b0a24', '#151032', '#2a1848', '#4a2050'].map(rgb),
    dusk: ['#1b1846', '#4a2c78', '#a33f85', '#ef5f7d', '#ffb066'].map(rgb),
    day: ['#7e9fb4', '#93b0bc', '#a8bfc0', '#c4cdb9', '#ddd3a8'].map(rgb),
    rainNight: rgb('#141220'), rainDay: rgb('#8a9099')
  };
  var HAZE = { night: [rgb('#34205a'), 0.32], dusk: [rgb('#e2688c'), 0.24], day: [rgb('#cdd0c4'), 0.38] };

  function clockSeconds() {
    var elapsed = (Date.now() - startedAt) / 1000, start;
    if (fixedClock !== null) start = fixedClock;
    else { var d = new Date(startedAt); start = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000; }
    return ((start + elapsed * speed) % 86400 + 86400) % 86400;
  }
  function weatherTarget() {
    if (weatherOverride === 'rain') return 1;
    if (weatherOverride === 'clear') return 0;
    var slot = Math.floor(Date.now() / 300000);           // the weather can change every 5 minutes
    var h = Math.sin(slot * 12.9898) * 43758.5453;
    return (h - Math.floor(h)) < 0.5 ? 1 : 0;
  }

  // ---------- Pixel font (3 x 5) ----------
  var FONT = {
    A: '.X. X.X XXX X.X X.X', B: 'XX. X.X XX. X.X XX.', C: '.XX X.. X.. X.. .XX', D: 'XX. X.X X.X X.X XX.', E: 'XXX X.. XX. X.. XXX',
    F: 'XXX X.. XX. X.. X..', G: '.XX X.. X.X X.X .XX', H: 'X.X X.X XXX X.X X.X', I: 'XXX .X. .X. .X. XXX', J: '..X ..X ..X X.X .X.',
    K: 'X.X X.X XX. X.X X.X', L: 'X.. X.. X.. X.. XXX', M: 'X.X XXX XXX X.X X.X', N: 'XX. X.X X.X X.X X.X', O: '.X. X.X X.X X.X .X.',
    P: 'XX. X.X XX. X.. X..', Q: '.X. X.X X.X XX. .XX', R: 'XX. X.X XX. X.X X.X', S: '.XX X.. .X. ..X XX.', T: 'XXX .X. .X. .X. .X.',
    U: 'X.X X.X X.X X.X XXX', V: 'X.X X.X X.X X.X .X.', W: 'X.X X.X XXX XXX X.X', X: 'X.X X.X .X. X.X X.X', Y: 'X.X X.X .X. .X. .X.',
    Z: 'XXX ..X .X. X.. XXX', '0': 'XXX X.X X.X X.X XXX', '1': '.X. XX. .X. .X. XXX', '2': 'XX. ..X .X. X.. XXX', '3': 'XX. ..X .X. ..X XX.',
    '4': 'X.X X.X XXX ..X ..X', '5': 'XXX X.. XX. ..X XX.', '6': '.XX X.. XXX X.X XXX', '7': 'XXX ..X .X. .X. .X.', '8': 'XXX X.X XXX X.X XXX',
    '9': 'XXX X.X XXX ..X XX.', ':': '... .X. ... .X. ...', '.': '... ... ... ... .X.', ',': '... ... ... .X. X..', '+': '... .X. XXX .X. ...',
    '-': '... ... XXX ... ...', '!': '.X. .X. .X. ... .X.', '/': '..X ..X .X. X.. X..', "'": '.X. .X. ... ... ...', '?': 'XX. ..X .X. ... .X.'
  };
  function drawText(g, text, x, y, scale, clipX0, clipX1) {
    for (var i = 0; i < text.length; i++) {
      var cx = x + i * 4 * scale;
      if (cx + 3 * scale < clipX0 || cx > clipX1) continue;
      var glyph = FONT[text[i].toUpperCase()];
      if (!glyph) continue;
      for (var p = 0; p < 19; p++) {
        if (glyph[p] !== 'X') continue;
        var gx = cx + (p % 4) * scale, gy = y + Math.floor(p / 4) * scale;
        if (gx >= clipX0 && gx + scale <= clipX1) g.fillRect(gx, gy, scale, scale);
      }
    }
  }

  // ---------- Scene state ----------
  var stars = [];
  for (var s = 0; s < 190; s++) {
    stars.push({ x: (seeded() * W) | 0, y: (Math.pow(seeded(), 1.4) * H * 0.55) | 0, c: ['#ffffff', '#c9d2ff', '#ffc9ec'][(seeded() * 3) | 0], p: seeded() * 6.28, s: 0.6 + seeded() * 2 });
  }
  var LIT = ['#ffc95e', '#7ff3ff', '#ffb347', '#ff9f5a', '#ff9ad5'];
  var OFF = ['#221a3a', '#221a3a', '#221a3a', '#1a1426', '#221a3a'];
  var windows = [];
  for (var w = 0; w + 6 < D.windows.length; w += 7) {
    var v = D.windows;
    windows.push({ l: v[w], x: v[w + 1], y: v[w + 2], w: v[w + 3], h: v[w + 4], c: v[w + 5], lit: !!v[w + 6], on: !!v[w + 6], tv: false });
  }
  windows.filter(function (x) { return x.lit && x.l >= 2; }).sort(function () { return seeded() - 0.5; }).slice(0, 7).forEach(function (x) { x.tv = true; });
  var beacons = [];
  for (var b = 0; b + 2 < D.beacons.length; b += 3) beacons.push({ l: D.beacons[b], x: D.beacons[b + 1], y: D.beacons[b + 2], p: seeded() * 2.4 });
  var signs = D.flicker.map(function (f) { return { l: f[0], x: f[1], y: f[2], text: f[3], color: f[4], next: rand(2, 8), until: 0 }; });
  var arcade = [];
  for (var a = 1; a + 3 < D.arcade.length; a += 4) arcade.push({ x: D.arcade[a], y: D.arcade[a + 1], w: D.arcade[a + 2], h: D.arcade[a + 3], c: '#7ff3ff' });
  var ARCADE_COLORS = ['#7ff3ff', '#ff4fa3', '#ffe45e', '#6dff8f', '#9b7bff', '#ffffff'];

  var cars = [];
  for (var c = 0; c < 12; c++) {
    var far = c < 6, dir = Math.random() < 0.5 ? 1 : -1;
    cars.push({ far: far, x: rand(-30, W + 30), y: far ? rand(H * 0.42, H * 0.5) | 0 : rand(H * 0.55, H * 0.72) | 0, v: dir * (far ? rand(10, 18) : rand(24, 40)), glow: pick(['#3ef0e6', '#ff4fa3', '#9b7bff']) });
  }
  var drones = [];
  for (var dn = 0; dn < 4; dn++) drones.push({ x: rand(60, W - 60), y: rand(H * 0.25, H * 0.5), p: rand(0, 10), sx: rand(0.05, 0.12), sy: rand(0.08, 0.17), ax: rand(40, 110), ay: rand(8, 22) });
  var COATS = ['#2a2240', '#3a2a50', '#1f3040', '#402038', '#26364a', '#3a3a3a', '#4a2a2a'];
  var UMBRELLAS = ['#ff4fa3', '#3ef0e6', '#ffe45e', '#6dff8f', '#ff3b5c', '#9b7bff'];
  var people = [];
  for (var p = 0; p < 16; p++) {
    people.push({
      x: rand(0, W), dir: Math.random() < 0.5 ? 1 : -1, v: rand(6, 13), coat: pick(COATS), head: Math.random() < 0.6 ? '#c8a088' : '#1a1428',
      accent: Math.random() < 0.4 ? pick(UMBRELLAS) : null, phone: Math.random() < 0.3, umbrella: Math.random() < 0.75 ? pick(UMBRELLAS) : null, phase: rand(0, 2)
    });
  }
  var steam = [], drops = [], splashes = [], ripples = [];
  for (var r = 0; r < 460; r++) drops.push(newDrop(true));
  var rainLevel = weatherTarget();
  var flash = { start: -99, next: rand(15, 40), bolt: null };
  var parallax = 0, parallaxTarget = 0;
  var images = {}, ready = false;
  var BLIMP = (function () {
    var rows = [];
    for (var row = 0; row < 18; row++) rows.push(Math.round(32 * Math.sqrt(Math.max(0, 1 - Math.pow((row - 8.5) / 9, 2)))));
    return rows;
  })();

  function newDrop(anywhere) {
    var toStreet = Math.random() < 0.55;
    return {
      x: rand(-10, W + 100), y: anywhere ? rand(-20, H) : rand(-40, -5), len: (rand(3, 8)) | 0, v: rand(220, 300),
      floor: toStreet ? rand(D.streetTop, H) : rand(H * 0.3, H)
    };
  }

  // ---------- Drawing pieces ----------
  var state = {};
  function offset(layer) { return Math.round(parallax * D.depth[layer]); }

  function drawLayer(layer) {
    var dx = offset(layer) - MARGIN, sy = layer * LH;
    ctx.globalAlpha = 1;
    ctx.drawImage(images.night, 0, sy, LW, LH, dx, 0, LW, LH);
    if (state.dusk > 0.003) { ctx.globalAlpha = state.dusk; ctx.drawImage(images.dusk, 0, sy, LW, LH, dx, 0, LW, LH); }
    if (state.day > 0.003) { ctx.globalAlpha = state.day; ctx.drawImage(images.day, 0, sy, LW, LH, dx, 0, LW, LH); }
    ctx.globalAlpha = 1;
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    for (var i = 0; i < SKY.stops.length; i++) {
      var col = mix(mix(SKY.night[i], SKY.dusk[i], state.dusk), SKY.day[i], state.day);
      col = mix(col, mix(SKY.rainNight, SKY.rainDay, state.day), 0.35 * rainLevel);
      g.addColorStop(SKY.stops[i], css(col));
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars(t) {
    var a = state.stars * (1 - 0.85 * rainLevel);
    if (a < 0.02) return;
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(t * st.s + st.p));
      ctx.fillStyle = st.c;
      ctx.fillRect(st.x, st.y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function disc(cx, cy, radius, color) {
    ctx.fillStyle = color;
    for (var row = 0; row < radius * 2; row++) {
      var half = Math.round(Math.sqrt(Math.max(0, radius * radius - Math.pow(row - radius + 0.5, 2))));
      ctx.fillRect(Math.round(cx - half), Math.round(cy - radius + row), half * 2, 1);
    }
  }
  function glowAt(x, y, radius, color, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, css(color, alpha)); g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function drawSunAndMoon(f) {
    var angle = f * Math.PI * 2, R = H * 0.4, cx = W / 2, cy = H * 0.47;
    var sx = cx - R * Math.sin(angle), sy = cy + R * Math.cos(angle);
    var mx = cx + R * Math.sin(angle), my = cy - R * Math.cos(angle);
    var clear = 1 - 0.75 * rainLevel;
    if (sy < H * 0.9) {
      var height = clamp((cy - sy) / R, 0, 1);
      glowAt(sx, sy, 56, rgb('#ffe6b4'), 0.45 * clear);
      disc(sx, sy, 9, css(mix(rgb('#ffb070'), rgb('#fff3d6'), height), clear));
    }
    if (my < H * 0.9) {
      glowAt(mx, my, 52, rgb('#ff96d2'), 0.28 * clear);
      disc(mx, my, 9, css(rgb('#ffd8ee'), clear));
      ctx.fillStyle = css(rgb('#f0b3d6'), clear);
      px(ctx, mx - 4, my - 3, 3, 2); px(ctx, mx + 1, my + 2, 4, 2); px(ctx, mx - 1, my - 7, 2, 1); px(ctx, mx + 4, my - 4, 2, 2);
    }
  }

  function drawHaze(strength) {
    var c = mix(mix(HAZE.night[0], HAZE.dusk[0], state.dusk), HAZE.day[0], state.day);
    var a = (HAZE.night[1] + (HAZE.dusk[1] - HAZE.night[1]) * state.dusk) * (1 - state.day) + HAZE.day[1] * state.day;
    a = Math.min(0.6, a * strength * (1 + 0.6 * rainLevel));
    var top = H * 0.37;
    var g = ctx.createLinearGradient(0, top, 0, D.rail);
    g.addColorStop(0, css(c, 0)); g.addColorStop(1, css(c, a));
    ctx.fillStyle = g; ctx.fillRect(0, top, W, D.rail - top);
  }

  function drawBeams(t) {
    var a = state.stars * 0.3;
    if (a < 0.01) return;
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < D.beams.length; i++) {
      var bm = D.beams[i], bx = bm[0] + offset(1), by = bm[1], ang = Math.sin(t * 0.33 + i * 2.1) * 0.34, L = H * 0.8;
      var tx = bx + Math.sin(ang) * L, ty = by - Math.cos(ang) * L, nx = Math.cos(ang), ny = Math.sin(ang);
      var g = ctx.createLinearGradient(bx, by, tx, ty);
      g.addColorStop(0, 'rgba(' + bm[2] + ',' + a + ')'); g.addColorStop(1, 'rgba(' + bm[2] + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - 3 * nx, by - 3 * ny); ctx.lineTo(bx + 3 * nx, by + 3 * ny);
      ctx.lineTo(tx + 22 * nx, ty + 22 * ny); ctx.lineTo(tx - 22 * nx, ty - 22 * ny);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawBolt() {
    if (!flash.bolt) return;
    var age = state.t - flash.start;
    if (age > 0.18) return;
    ctx.fillStyle = 'rgba(235,235,255,' + (age < 0.06 || (age > 0.1 && age < 0.16) ? 0.95 : 0.3) + ')';
    for (var i = 0; i < flash.bolt.length; i++) ctx.fillRect(flash.bolt[i][0], flash.bolt[i][1], 1, 1);
  }

  function drawBirds(t) {
    var a = state.birds * (1 - rainLevel);
    if (a < 0.05) return;
    ctx.fillStyle = 'rgba(43,42,58,' + a + ')';
    var cycle = (t % 70) / 70;
    for (var i = 0; i < 4; i++) {
      var x = Math.round(-30 + cycle * (W + 60) - i * 10), y = Math.round(H * 0.16 + (i % 2) * 4 + Math.sin(t * 1.3 + i) * 2);
      if ((Math.floor(t * 3.3 + i) % 2) === 0) {
        px(ctx, x, y); px(ctx, x + 6, y); px(ctx, x + 1, y + 1); px(ctx, x + 5, y + 1); px(ctx, x + 2, y + 2, 3, 1);
      } else {
        px(ctx, x + 1, y + 1, 5, 1); px(ctx, x, y + 2); px(ctx, x + 6, y + 2);
      }
    }
  }

  function drawBlimp(t, g, forGlow) {
    var cycle = ((t + 40) % 170) / 170;
    var x = Math.round(-90 + cycle * (W + 180)) + offset(1), y = Math.round(H * 0.105 + Math.sin(t * 0.4) * 2);
    var day = state.day;
    if (!forGlow) {
      var body = css(mix(rgb('#241f44'), rgb('#6a7484'), day)), top = css(mix(rgb('#3a3368'), rgb('#8a94a4'), day));
      for (var row = 0; row < BLIMP.length; row++) {
        var half = BLIMP[row];
        g.fillStyle = row < 4 ? top : body;
        g.fillRect(x - half, y + row, half * 2, 1);
      }
      g.fillStyle = body;
      g.fillRect(x - 36, y + 3, 6, 4); g.fillRect(x - 38, y + 1, 4, 3); g.fillRect(x - 36, y + 11, 6, 4); g.fillRect(x - 38, y + 14, 4, 3);
      g.fillRect(x - 6, y + 18, 14, 4);
    }
    var a = forGlow ? state.lights : Math.max(0.55, state.lights);
    g.globalAlpha = a;
    g.fillStyle = '#7ff3ff'; for (var wx = x - 4; wx < x + 7; wx += 3) g.fillRect(wx, y + 19, 2, 2);
    if (forGlow) { g.globalAlpha = 1; return; }
    g.fillStyle = '#16051a'; g.fillRect(x - 20, y + 5, 40, 8);
    g.fillStyle = (Math.floor(t / 6) % 2) ? '#3ef0e6' : '#ff4fa3';
    var adWidth = BLIMP_AD.length * 4, scroll = (t * 9) % adWidth;
    drawText(g, BLIMP_AD + BLIMP_AD, Math.round(x - 19 - scroll), y + 7, 1, x - 20, x + 20);
    if ((t % 1.5) < 0.75) { g.fillStyle = '#ff3b3b'; g.fillRect(x - 33, y + 8, 1, 1); g.fillStyle = '#6dff8f'; g.fillRect(x + 32, y + 8, 1, 1); }
    if ((t % 2.2) < 0.15) { g.fillStyle = '#ffffff'; g.fillRect(x, y - 1, 1, 1); }
    g.globalAlpha = 1;
  }

  function drawDrones(t, g) {
    for (var i = 0; i < drones.length; i++) {
      var dr = drones[i];
      var x = dr.x + Math.sin(t * dr.sx + dr.p) * dr.ax + offset(1), y = dr.y + Math.sin(t * dr.sy + dr.p * 2) * dr.ay;
      if (g === ctx) { g.fillStyle = '#1a1530'; px(g, x - 1, y, 3, 1); px(g, x - 2, y - 1); px(g, x + 2, y - 1); }
      if (((t + dr.p) % 1.2) < 0.6) { g.fillStyle = i % 2 ? '#ff3b3b' : '#6dff8f'; px(g, x, y + 1); }
    }
  }

  function drawCars(far, g, lightsOnly) {
    var layer = far ? 1 : 2;
    for (var i = 0; i < cars.length; i++) {
      var car = cars[i];
      if (car.far !== far) continue;
      var x = Math.round(car.x) + offset(layer), y = car.y, right = car.v > 0;
      var head = '#fff3c4', tail = '#ff3355';
      if (far) {
        g.fillStyle = right ? tail : head; g.fillRect(x, y, 1, 1);
        g.fillStyle = right ? head : tail; g.fillRect(x + 1, y, 1, 1);
      } else {
        if (!lightsOnly) { g.fillStyle = '#2d2545'; g.fillRect(x + 1, y, 5, 2); g.fillStyle = '#3b3160'; g.fillRect(x + 2, y - 1, 3, 1); }
        g.fillStyle = '#7ff3ff'; g.fillRect(right ? x + 4 : x + 2, y - 1, 1, 1);
        g.fillStyle = car.glow; g.fillRect(x + 1, y + 2, 5, 1);
        g.fillStyle = right ? tail : head; g.fillRect(x, y, 1, 1);
        g.fillStyle = right ? head : tail; g.fillRect(x + 6, y, 1, 1);
      }
    }
  }

  function drawWindows(layer, g, forGlow) {
    if (state.lights < 0.02) return;
    var ox = offset(layer);
    g.globalAlpha = state.lights;
    for (var i = 0; i < windows.length; i++) {
      var win = windows[i];
      if (win.l !== layer || (win.on === win.lit && !(win.tv && win.on))) continue;
      if (!win.on) g.fillStyle = forGlow ? '#000' : OFF[win.c];
      else if (win.tv) g.fillStyle = state.tvColor;
      else g.fillStyle = LIT[win.c];
      g.fillRect(win.x + ox, win.y, win.w, win.h);
    }
    g.globalAlpha = 1;
  }

  function drawBillboard(t, g, alpha) {
    var bb = D.billboard, ox = offset(bb[0]), x0 = bb[1] + ox + 1, y0 = bb[2] + 1, w = bb[3] - 2, h = bb[4] - 2;
    g.globalAlpha = alpha;
    g.fillStyle = '#16051a'; g.fillRect(x0, y0, w, h);
    g.fillStyle = '#3ef0e6';
    drawText(g, BILLBOARD_TOP, x0 + Math.round((w - BILLBOARD_TOP.length * 4 + 1) / 2), y0 + 3, 1, x0, x0 + w);
    g.fillStyle = '#5a1648'; g.fillRect(x0 + 2, y0 + 10, w - 4, 1);
    var textWidth = BILLBOARD.length * 4, scroll = (t * 10) % textWidth;
    g.fillStyle = (Math.floor(t / 9) % 2) ? '#ffe45e' : '#ff4fa3';
    drawText(g, BILLBOARD + BILLBOARD, Math.round(x0 + 1 - scroll), y0 + 13, 1, x0 + 1, x0 + w - 1);
    g.globalAlpha = 1;
  }

  function drawHolo(t, g) {
    var hl = D.holo, ox = offset(hl[0]), x0 = hl[1] + ox + 1, y0 = hl[2] + 1, w = hl[3] - 2, h = hl[4] - 2;
    if (state.lights < 0.05) return;
    g.globalAlpha = state.lights * (0.75 + 0.25 * Math.sin(t * 13));
    g.fillStyle = '#b8fbff';
    g.fillRect(x0, y0 + Math.floor((t * 9) % h), w, 1);
    // A little logo: a rotating ring
    var cx = x0 + w / 2, cy = y0 + h / 2, rx = Math.abs(Math.cos(t * 1.4)) * 6 + 1;
    g.fillStyle = '#7ff3ff';
    for (var k = 0; k < 16; k++) { var ang = k / 16 * Math.PI * 2; px(g, cx + Math.cos(ang) * rx, cy + Math.sin(ang) * 5); }
    g.globalAlpha = 1;
  }

  function drawArcade(g) {
    if (state.lights < 0.05 && state.day > 0.5) return;
    var ox = offset(3);
    g.globalAlpha = Math.max(0.6, state.lights);
    for (var i = 0; i < arcade.length; i++) { var sc = arcade[i]; g.fillStyle = sc.c; g.fillRect(sc.x + ox, sc.y, sc.w, sc.h); }
    g.globalAlpha = 1;
  }

  function drawTrafficLight(t, g) {
    var tl = D.trafficLight, x = tl[1] + offset(tl[0]) + 1, y = tl[2];
    var c = t % 20, lamp = c < 9 ? 2 : c < 11 ? 1 : 0;
    g.globalAlpha = Math.max(0.7, state.lights);
    g.fillStyle = ['#ff3b3b', '#ffb020', '#6dff8f'][lamp];
    g.fillRect(x, y + 1 + lamp * 2, 1, 2);
    g.globalAlpha = 1;
  }

  function drawSigns(layer, g) {
    if (state.lights < 0.02) return;
    g.globalAlpha = state.lights;
    for (var i = 0; i < signs.length; i++) {
      var sg = signs[i];
      if (sg.l !== layer || sg.off) continue;
      g.fillStyle = sg.color;
      drawText(g, sg.text, sg.x + offset(layer), sg.y, 1, -999, 9999);
    }
    g.globalAlpha = 1;
  }

  function drawBeacons(layer, g) {
    g.globalAlpha = Math.max(state.lights, 0.5); g.fillStyle = '#ff3b3b';
    for (var i = 0; i < beacons.length; i++) {
      var bc = beacons[i];
      if (bc.l === layer && ((state.t + bc.p) % 2.4) < 1.1) g.fillRect(bc.x + offset(layer), bc.y, 1, 1);
    }
    g.globalAlpha = 1;
  }

  function drawTrain(g, alpha) {
    var tw = images.train.width, cycle = ((state.t + 6) % 42) / 26;
    if (cycle > 1) return;
    g.globalAlpha = alpha;
    g.drawImage(images.train, Math.round(-tw - 10 + cycle * (W + tw + 20)) + offset(3), D.rail - images.train.height);
    g.globalAlpha = 1;
  }

  function drawPeople(t, g, forGlow) {
    var y = D.walkY, ox = offset(3), raining = rainLevel > 0.3;
    for (var i = 0; i < people.length; i++) {
      var pp = people[i], x = Math.round(pp.x) + ox, step = Math.floor(t * 6 + pp.phase * 3) % 2;
      if (forGlow) { if (pp.phone && state.lights > 0.3) { g.fillStyle = '#7ff3ff'; px(g, x + (pp.dir > 0 ? 3 : 0), y - 7); } continue; }
      g.fillStyle = pp.head; px(g, x + 1, y - 9, 2, 2);
      g.fillStyle = pp.coat; px(g, x, y - 7, 4, 4);
      if (pp.accent) { g.fillStyle = pp.accent; px(g, x + (pp.dir > 0 ? 3 : 0), y - 6, 1, 2); }
      g.fillStyle = '#120e1e';
      if (step) { px(g, x + 1, y - 3, 2, 1); px(g, x, y - 2, 1, 3); px(g, x + 3, y - 2, 1, 3); }
      else { px(g, x + 1, y - 3, 2, 4); }
      if (pp.phone && state.lights > 0.3) { g.fillStyle = '#7ff3ff'; px(g, x + (pp.dir > 0 ? 3 : 0), y - 7); }
      if (raining && pp.umbrella) {
        g.fillStyle = pp.umbrella; px(g, x - 2, y - 12, 8, 1); px(g, x - 1, y - 13, 6, 1); px(g, x + 1, y - 14, 2, 1);
        g.fillStyle = '#120e1e'; px(g, x + 2, y - 11, 1, 2);
      }
    }
  }

  function drawSteam() {
    var ox = offset(3), night = 1 - state.day;
    var col = mix(rgb('#e8ecef'), rgb('#c8c0e8'), night);
    for (var i = 0; i < steam.length; i++) {
      var pf = steam[i], a = (1 - pf.age / pf.life) * 0.3;
      ctx.fillStyle = css(col, a);
      var size = pf.age < 0.6 ? 1 : pf.age < 1.6 ? 2 : 3;
      ctx.fillRect(Math.round(pf.x) + ox, Math.round(pf.y), size, size);
    }
  }

  // Wet street: the lit shop fronts mirrored and squashed onto the street, wobbling a little
  function drawReflections(t, g) {
    var a = (0.2 + 0.35 * rainLevel) * state.lights;
    if (a < 0.02) return;
    var top = D.streetTop + 5, srcBottom = D.streetTop - 2, dx = offset(3) - MARGIN;
    for (var y = top; y < H; y++) {
      var k = y - top, srcY = srcBottom - k * 4;
      g.globalAlpha = a * (1 - k / (H - top) * 0.5);
      g.drawImage(images.lights, 0, 3 * LH + srcY, LW, 1, dx + Math.round(Math.sin(t * 3 + k * 0.9) * (0.6 + rainLevel)), y, LW, 1);
    }
    g.globalAlpha = 1;
  }

  function drawRain() {
    var count = Math.floor(drops.length * rainLevel);
    var col = mix(rgb('#9fb0ff'), rgb('#dfe6ee'), state.day);
    if (count > 0) {
      ctx.fillStyle = css(col, 0.42);
      for (var i = 0; i < count; i++) {
        var d = drops[i];
        for (var k = 0; k < d.len; k++) ctx.fillRect(Math.round(d.x + k * 0.3), Math.round(d.y - k), 1, 1);
      }
    }
    ctx.fillStyle = css(col, 0.7);
    for (var j = 0; j < splashes.length; j++) {
      var sp = splashes[j];
      if (sp.age < 0.06) ctx.fillRect(sp.x, sp.y - 1, 1, 1);
      else { ctx.fillRect(sp.x - 1, sp.y - 1, 1, 1); ctx.fillRect(sp.x + 1, sp.y - 2, 1, 1); }
    }
    ctx.fillStyle = css(col, 0.35);
    for (var q = 0; q < ripples.length; q++) {
      var rp = ripples[q], rw = 1 + Math.floor(rp.age * 10);
      ctx.fillRect(rp.x - rw, rp.y, 1, 1); ctx.fillRect(rp.x + rw, rp.y, 1, 1);
    }
  }

  function flashLevel() {
    var age = state.t - flash.start;
    if (age < 0.06) return 0.75;
    if (age < 0.1) return 0.1;
    if (age < 0.16) return 0.55;
    return Math.max(0, 0.55 * (1 - (age - 0.16) / 0.5));
  }

  // ---------- Update ----------
  function update(dt, t) {
    rainLevel += (weatherTarget() - rainLevel) * Math.min(1, dt / 8);
    parallax += (parallaxTarget - parallax) * Math.min(1, dt * 3);

    for (var i = 0; i < cars.length; i++) {
      var car = cars[i]; car.x += car.v * dt;
      if (car.x > W + 30) car.x = -30; else if (car.x < -30) car.x = W + 30;
    }
    for (var p = 0; p < people.length; p++) {
      var pp = people[p]; pp.x += pp.dir * pp.v * dt;
      if (pp.x > W + 16) pp.x = -16; else if (pp.x < -16) pp.x = W + 16;
    }
    // Windows go on and off through the evening; a few TVs flicker; arcade screens change
    state.toggleClock = (state.toggleClock || 0) + dt;
    if (state.toggleClock > 0.3) {
      state.toggleClock = 0;
      if (state.lights > 0.5) { var win = pick(windows); if (Math.random() < 0.45) win.on = !win.on; }
      else if (state.lights < 0.05) windows.forEach(function (x) { x.on = x.lit; });
      for (var ac = 0; ac < arcade.length; ac++) if (Math.random() < 0.4) arcade[ac].c = pick(ARCADE_COLORS);
    }
    state.tvClock = (state.tvClock || 0) + dt;
    if (state.tvClock > 0.15) { state.tvClock = 0; state.tvColor = pick(['#5a7bff', '#8fb0ff', '#3e5ae0', '#b8c8ff']); }
    for (var s = 0; s < signs.length; s++) {
      var sg = signs[s];
      if (t > sg.next) { sg.until = t + rand(0.15, 0.6); sg.next = t + rand(3, 10); }
      sg.off = t < sg.until && Math.sin(t * 70 + s * 3) > -0.2;
    }
    // Steam from the manholes
    state.steamClock = (state.steamClock || 0) + dt;
    while (state.steamClock > 0.1) {
      state.steamClock -= 0.1;
      var vent = pick(D.vents);
      steam.push({ x: vent[0] + rand(-2, 2), y: vent[1] - 1, vx: rand(-2, 2), vy: -rand(5, 10), age: 0, life: rand(2.2, 4) });
    }
    for (var k = steam.length - 1; k >= 0; k--) {
      var pf = steam[k]; pf.age += dt; pf.x += pf.vx * dt; pf.y += pf.vy * dt; pf.vx += rand(-1.5, 1.5) * dt;
      if (pf.age > pf.life) steam.splice(k, 1);
    }
    // Rain, splashes and ripples
    var count = Math.floor(drops.length * rainLevel);
    for (var d = 0; d < count; d++) {
      var dr = drops[d]; dr.y += dr.v * dt; dr.x -= dr.v * dt * 0.3;
      if (dr.y >= dr.floor) {
        if (dr.floor >= D.streetTop) {
          splashes.push({ x: Math.round(dr.x), y: Math.round(dr.floor), age: 0 });
          if (dr.floor > D.streetTop + 5 && Math.random() < 0.35) ripples.push({ x: Math.round(dr.x), y: Math.round(dr.floor), age: 0 });
        }
        drops[d] = newDrop(false);
      }
    }
    for (var q = splashes.length - 1; q >= 0; q--) { splashes[q].age += dt; if (splashes[q].age > 0.14) splashes.splice(q, 1); }
    for (var z = ripples.length - 1; z >= 0; z--) { ripples[z].age += dt; if (ripples[z].age > 0.35) ripples.splice(z, 1); }
    // Lightning in heavy rain after dark
    if (rainLevel > 0.6 && state.day < 0.5 && t > flash.next) {
      flash.start = t; flash.next = t + rand(18, 55);
      var bx = rand(80, W - 80), by = 0, end = rand(H * 0.22, H * 0.34); flash.bolt = [];
      while (by < end) { flash.bolt.push([Math.round(bx), by]); by += 1; bx += rand(-1.2, 1.2); }
    }
  }

  // ---------- Render ----------
  function render(t) {
    var f = clockSeconds() / 86400;
    state.t = t;
    state.dusk = keyframes(f, PHASE.dusk); state.day = keyframes(f, PHASE.day);
    state.stars = keyframes(f, PHASE.stars); state.lights = keyframes(f, PHASE.lights); state.birds = keyframes(f, PHASE.birds);
    if (!state.tvColor) state.tvColor = '#5a7bff';

    drawSky();
    drawStars(t);
    drawSunAndMoon(f);
    drawBolt();
    drawLayer(0); drawBeacons(0, ctx); drawHaze(1);
    drawLayer(1); drawCars(true, ctx); drawBeacons(1, ctx); drawHaze(0.5);
    drawBeams(t);
    drawBlimp(t, ctx, false);
    drawDrones(t, ctx);
    drawBirds(t);
    drawLayer(2); drawWindows(2, ctx); drawBillboard(t, ctx, 1); drawHolo(t, ctx); drawSigns(2, ctx); drawBeacons(2, ctx);
    drawCars(false, ctx);
    drawLayer(3); drawWindows(3, ctx); drawSigns(3, ctx); drawBeacons(3, ctx); drawArcade(ctx); drawTrafficLight(t, ctx);
    drawReflections(t, ctx); drawTrain(ctx, 1); drawPeople(t, ctx); drawSteam();
    drawLayer(4); drawWindows(4, ctx);
    drawRain();
    var fl = flashLevel();
    if (fl > 0.01) { ctx.fillStyle = 'rgba(225,225,255,' + (fl * 0.55) + ')'; ctx.fillRect(0, 0, W, H); }

    if (gtx && state.renderGlow) {
      gtx.clearRect(0, 0, W, H);
      var a = Math.min(1, state.lights * (1 + 0.25 * rainLevel));
      if (a > 0.01) {
        var glowByLayer = [1, 1, 1, 0.55, 0.6];   // softer glow on the street, so shop windows stay sharp
        for (var l = 1; l < D.layers; l++) {
          gtx.globalAlpha = a * glowByLayer[l];
          gtx.drawImage(images.lights, 0, l * LH, LW, LH, offset(l) - MARGIN, 0, LW, LH);
        }
        gtx.globalAlpha = a;
        drawWindows(2, gtx, true); drawWindows(3, gtx, true); drawWindows(4, gtx, true);
        drawHolo(t, gtx);   // text (billboard, signs, the blimp ad) stays out of the glow, so it reads crisp
        drawArcade(gtx); drawTrafficLight(t, gtx); drawBlimp(t, gtx, true); drawDrones(t, gtx);
        drawCars(true, gtx, true); drawCars(false, gtx, true); drawTrain(gtx, a); drawPeople(t, gtx, true);
        gtx.globalAlpha = 1;
      }
    }
  }

  // ---------- Loop ----------
  var last = 0, frame = 0;
  function loop(now) {
    window.requestAnimationFrame(loop);
    if (now - last < 32) return;                 // about 30 frames a second is plenty for pixel art
    var dt = Math.min(0.1, (now - last) / 1000 || 0.033);
    last = now; frame++;
    var t = (Date.now() - startedAt) / 1000;
    update(dt, t);
    state.renderGlow = frame % 2 === 0;
    render(t);
  }

  function start() {
    ready = true;
    ctx.imageSmoothingEnabled = false;
    if (gtx) gtx.imageSmoothingEnabled = false;
    if (reduceMotion) {
      // A still frame at the current time, refreshed every minute
      var still = function () { var t = (Date.now() - startedAt) / 1000; state.renderGlow = true; render(t); };
      still(); window.setInterval(still, 60000);
      return;
    }
    window.addEventListener('mousemove', function (e) { parallaxTarget = -((e.clientX / window.innerWidth) - 0.5) * 2 * 10; }, { passive: true });
    window.requestAnimationFrame(loop);
  }

  ['night', 'dusk', 'day', 'lights', 'train'].forEach(function (name) {
    var img = new Image();
    img.onload = function () { images[name] = img; if (Object.keys(images).length === 5 && !ready) start(); };
    img.src = base + (name === 'train' ? 'train.png' : 'city-' + name + '.png');
  });
})();
