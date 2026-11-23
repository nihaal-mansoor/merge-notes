/*
  The people of the street scenes (home pages B and C), version 3.

  People are drawn at twice the scene's pixel density, on their own canvas (1280 x 720), so they have room
  for real shapes. Nobody is an image file: each character is a recipe (build, clothes, cloth, colours, hair,
  hat, bag, umbrella, cane...) drawn from filled shapes - a rounded head with a vague face (soft light on the
  front, shade toward the back, no eyes, nose or mouth), a neck, sloped shoulders, a chest, waist and hips,
  tapered arms and legs with knees, hands, and shoes with a heel, a toe and a sole - then given a soft dark
  outline and, at night, a rim of neon light.

  Clothes have cloth: tiny repeating weaves (twill, tweed, denim, corduroy, knit ribs, a check, a stripe)
  baked into the sprite sheets, a dithered shadow down the back and along long hems, and the details that
  make a garment read: lapels, collars, buttons, belts and buckles, zips, pockets, ribbed cuffs and hems,
  hoodie strings, puffer quilting and knitted scarves and hats.

  The walk is a 24-frame cycle. The planted foot stays put while the body moves over it; the hip rides over
  the stance leg like a compass (high over a straight leg, dipping when both feet are down), so the stance
  knee is nearly straight and the knee bends in the swing - heel strike, foot flat, heel off, toe off. The
  run is 24 frames too, with more knee bend, a flight phase and a forward lean. Arms swing with the elbow
  trailing, and coats, scarves and ponytails follow a moment behind.

  The street: people go in and out of the diner, stop at the poster and the menu, wait by the wall on their
  phones in the rain, run with a bag over their heads, walk in pairs, walk the dog, or ride past on a scooter.
  Inside the diner: customers sit at the counter with their forearms on it and eat with chopsticks, drink,
  talk and check their phones, and a waiter carries a tray between them. Road workers in high-vis vests talk,
  hold a sign, dig, and break the road with a jackhammer; each can stand at its own depth (wk.y), and only the
  part above the barrier shows.

  Standing still is animated too (16 frames at 6 a second): people breathe, shift their weight from foot to
  foot (the legs stay straight; only the relaxed leg bends as its heel lifts), and glance about. When they stop
  they might wait with their hands in their pockets, look up at the signs, check a watch or a phone, or smoke.
  Couples and a parent with a child turn to face each other and talk. The waiter wipes the counter; the dog
  wags and sniffs. A scene can set the layout, a colour grade and the rim colour in D.people (home C does).
*/
window.StreetPeople = function (D) {
  'use strict';
  // A scene can describe its own layout in D.people; otherwise this is home page B's street.
  var P = D.people || {};
  var S = 2, W = D.width;
  var DOOR = P.door || { x: 306, w: 38, top: 172 };
  var BARRIER = P.barrier || { x0: 548, x1: 644, top: 238 };
  var COUNTER = P.counter || 210;                     // top of the counter inside the windows (art pixels)
  var DINER_DEPTH = P.dinerDepth || 0.6, WORKER_DEPTH = P.workerDepth || 0.8, WORKER_Y = P.workerY || 253;
  var WAITER = P.waiter || { y: 226, x0: 250, x1: 456 };
  var SHELTER = P.shelter || null;                     // [x0, x1]: where people without umbrellas wait out the rain
  var WIN = P.windows ? P.windows.slice() : [];
  if (!P.windows) for (var wi = 0; wi + 3 < D.windows.length; wi += 4) WIN.push({ x: D.windows[wi], y: D.windows[wi + 1], w: D.windows[wi + 2], h: D.windows[wi + 3] });
  var SPOTS = P.spots || [
    { x: 48, kind: 'look', time: [3, 6] }, { x: 199, kind: 'look', time: [3, 5] }, { x: 383, kind: 'look', time: [3, 6] },
    { x: 158, kind: 'wait', time: [8, 16] }, { x: 466, kind: 'wait', time: [8, 16] }
  ];
  var LANES = P.lanes || [
    { y: 271, h: 22, depth: 0.78, max: 5, fade: 0.86 },
    { y: 297, h: 28, depth: 0.84, max: 4, fade: 0.95 },
    { y: 325, h: 34, depth: 0.9, max: 3, fade: 1 },
    { y: 357, h: 46, depth: 0.98, max: 2, fade: 1 }
  ];
  var RIM = P.rim || [255, 92, 170];                    // the neon edge light on people at night
  var GRADE = P.grade || null;                          // an optional colour grade, multiplied into every person
  var RIDE = []; LANES.forEach(function (l, i) { if (l.ride) RIDE.push(i); }); // lanes kept for scooters (the road)
  if (!RIDE.length) RIDE = [1, 2];
  // Standing-still poses (16 frames each, played at 6 frames a second)
  var IDLE_POSES = { idle: 1, look: 1, pockets: 1, watch: 1, smoke: 1, phone: 1, talk: 1, wipe: 1 };
  var GAIT_FRAMES = 24;                                 // frames in one walk or run cycle
  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }
  // 0 outside [a, b], 1 inside, with smooth ramps r wide at both ends
  function smoothWin(v, a, b, r) { var k = Math.min(Math.max(0, Math.min(1, (v - a) / r)), Math.max(0, Math.min(1, (b - v) / r))); return k * k * (3 - 2 * k); }

  // ---------- The cast ----------
  // weave: the cloth of the coat or top; pantsWeave: the trousers (twill when not given). See WEAVE below.
  var CAST = {
    coatWoman: { sex: 'f', build: 0.92, coat: '#7a3440', coatType: 'long', coatLen: 0.62, belt: true, weave: 'check', pants: '#1a1a22', shoes: '#2a1a14', skin: '#c89a80', hair: '#2a1a14', hairStyle: 'long', scarf: '#3ec8be', bag: 'tote', bagColor: '#d8c8a8', umbrella: '#c23a5a', speed: [8, 11] },
    hoodie: { sex: 'm', build: 1.05, coat: '#2e3a34', coatType: 'hoodie', weave: 'fleece', head: 'hood', pants: '#2a3448', pantsWeave: 'denim', shoes: '#e8e8e8', skin: '#a8765a', hair: '#141010', hairStyle: 'short', bag: 'backpack', bagColor: '#151515', speed: [10, 13], runs: true },
    oldMan: { sex: 'm', build: 1, stoop: 1, coat: '#6a6a5e', coatType: 'long', coatLen: 0.55, belt: true, weave: 'tweed', shirt: '#d8d0c0', head: 'fedora', headColor: '#2a2420', pants: '#2a2a2a', shoes: '#1a1410', skin: '#d0a88c', hair: '#b8b0a8', hairStyle: 'short', cane: true, umbrella: '#2a2a3a', speed: [5, 7] },
    jacketWoman: { sex: 'f', build: 0.88, coat: '#5a3a7a', coatType: 'jacket', weave: 'stripe', pants: '#1a1a2a', pantsWeave: 'denim', shoes: '#c8c8d0', skin: '#e0b49a', hair: '#c8a060', hairStyle: 'pony', umbrella: '#2a8a96', speed: [9, 11] },
    coatMan: { sex: 'm', build: 1.05, coat: '#1e2a44', coatType: 'long', coatLen: 0.5, weave: 'twill', shirt: '#c8ccd0', pants: '#1a1a1a', shoes: '#2a1a14', skin: '#8a5a40', hair: '#141010', hairStyle: 'short', scarf: '#d8b848', speed: [9, 11] },
    kid: { sex: 'm', scale: 0.62, build: 1.15, coat: '#e0b830', coatType: 'cape', coatLen: 0.45, gloss: true, head: 'hood', headColor: '#e0b830', pants: '#3a4a7a', pantsWeave: 'denim', shoes: '#b03030', skin: '#e0b49a', speed: [9, 11] },
    puffer: { sex: 'm', build: 1.15, coat: '#3a6a8a', coatType: 'puffer', head: 'beanie', headColor: '#b03a3a', pants: '#2a2a30', shoes: '#2a2a2a', skin: '#c89a80', speed: [7, 9], dog: true },
    cape: { sex: 'm', build: 1, coat: '#2a5a5a', coatType: 'cape', coatLen: 0.75, weave: 'twill', head: 'hood', headColor: '#2a5a5a', pants: '#1a1a1a', shoes: '#1a1a1a', skin: '#b08068', speed: [9, 12] },
    student: { sex: 'm', build: 0.95, coat: '#4a4a52', coatType: 'jacket', weave: 'denim', head: 'cap', headColor: '#1a1a1a', pants: '#4a3c28', pantsWeave: 'cord', shoes: '#e8e0d0', skin: '#6a4430', hair: '#101010', hairStyle: 'short', bag: 'tote', bagColor: '#c8508a', speed: [10, 13], runs: true },
    nurse: { sex: 'f', build: 0.9, coat: '#2a3a4a', coatType: 'long', coatLen: 0.4, weave: 'twill', pants: '#7ab0b8', pantsWeave: 'canvas', shoes: '#e8e8e8', skin: '#d8a888', hair: '#3a2010', hairStyle: 'bun', umbrella: '#d8b040', speed: [9, 12] },
    rider: { sex: 'm', build: 1.05, coat: '#c8642a', coatType: 'jacket', weave: 'canvas', head: 'helmet', headColor: '#e8d050', pants: '#1a1a24', pantsWeave: 'denim', shoes: '#1a1a1a', skin: '#b08068', bag: 'box', bagColor: '#1e6a70', speed: [46, 56] },
    waiter: { sex: 'f', build: 0.9, coat: '#ece6dc', coatType: 'apron', weave: 'canvas', apron: '#1a1a20', pants: '#1a1a20', shoes: '#101010', skin: '#c08a6a', hair: '#1a1010', hairStyle: 'bun', speed: [9, 11] },
    workerA: { sex: 'm', build: 1.1, coat: '#2a3038', coatType: 'vest', weave: 'canvas', head: 'helmet', headColor: '#f0d040', pants: '#2a2e34', pantsWeave: 'canvas', shoes: '#1a1a1a', skin: '#b07a5a', glove: '#c8b040' },
    workerB: { sex: 'm', build: 1.05, coat: '#2a3038', coatType: 'vest', weave: 'canvas', head: 'helmet', headColor: '#e8e8e8', pants: '#2a2e34', pantsWeave: 'canvas', shoes: '#1a1a1a', skin: '#d8a888', glove: '#c8b040' },
    workerC: { sex: 'f', build: 0.95, coat: '#2a3038', coatType: 'vest', weave: 'canvas', head: 'helmet', headColor: '#f08030', pants: '#2a2e34', pantsWeave: 'canvas', shoes: '#1a1a1a', skin: '#8a5a40', hair: '#101010', hairStyle: 'pony', glove: '#c8b040' }
  };
  var WALKERS = ['coatWoman', 'hoodie', 'oldMan', 'coatMan', 'puffer', 'cape', 'student', 'nurse', 'jacketWoman'];
  var DINERS = ['coatWoman', 'coatMan', 'jacketWoman', 'student', 'nurse', 'hoodie', 'oldMan'];
  // More people, built from parts (rule 5 of the street's design rules): build and height, skin tone, hair, top,
  // cloth, trousers, shoes, and extras. Seeded, so the same 18 people live on the street on every visit.
  (function () {
    var seed = 7177, r = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }, of = function (a) { return a[Math.floor(r() * a.length)]; };
    var SKIN = ['#f0c8a8', '#e0b49a', '#c89a80', '#a8765a', '#8a5a40', '#6a4430'];
    var HAIR = ['#141010', '#2a1a14', '#3a2010', '#6a4a2a', '#c8a060', '#8a8a8a', '#d8d0c8'];
    var COAT = ['#2a3a4a', '#5a3a2a', '#3a4a3a', '#6a2a3a', '#2e2e34', '#7a6a4a', '#3a5a6a', '#8a4a2a', '#4a3a5a', '#b8a888', '#5a5a62', '#2a4a5a'];
    var PANTS = ['#1a1a22', '#2a3448', '#3a3a3a', '#4a3c28', '#2a2a30', '#5a5a60', '#3a2a22'];
    var SHOES = ['#1a1a1a', '#2a1a14', '#e8e8e8', '#c8c8d0', '#6a3a2a'];
    var UMB = ['#c23a5a', '#2a8a96', '#d8b040', '#2a2a3a', '#5a7a3a', '#8a3ac2', '#e0e0e0'];
    for (var i = 0; i < 18; i++) {
      var f = r() < 0.5, type = of(['long', 'long', 'jacket', 'jacket', 'hoodie', 'puffer', 'cape']), coat = of(COAT);
      var p = { sex: f ? 'f' : 'm', build: 0.86 + r() * 0.22, scale: 0.94 + r() * 0.1, coat: coat, coatType: type, weave: of(['twill', 'check', 'stripe', 'tweed', 'denim', 'canvas', 'cord', 'fleece']),
        pants: of(PANTS), pantsWeave: of(['twill', 'denim', 'cord']), shoes: of(SHOES), skin: of(SKIN), hair: of(HAIR), speed: [8 + r() * 2, 10.5 + r() * 2.5] };
      p.hairStyle = f ? of(['long', 'pony', 'bun', 'short', 'long']) : of(['short', 'short', 'none', 'short']);
      if (type === 'long') { p.coatLen = 0.42 + r() * 0.2; p.belt = r() < 0.4; if (r() < 0.6) p.shirt = of(['#d8d0c0', '#c8ccd0', '#e8e0d8']); }
      if (type === 'cape') p.coatLen = 0.5 + r() * 0.2;
      if (type === 'hoodie' && r() < 0.5) { p.head = 'hood'; } else { var hr = r(); if (hr < 0.14) { p.head = 'beanie'; p.headColor = of(COAT); } else if (hr < 0.26) { p.head = 'cap'; p.headColor = of(['#1a1a1a', '#2a3a5a', '#8a2a2a']); } else if (hr < 0.32 && type === 'long') { p.head = 'fedora'; p.headColor = '#2a2420'; } }
      if (r() < 0.25) p.scarf = of(['#3ec8be', '#d8b848', '#b8483a', '#8a8aa8', '#c8c0b0']);
      var br = r(); if (br < 0.2) { p.bag = 'tote'; p.bagColor = of(['#d8c8a8', '#c8508a', '#5a7a8a']); } else if (br < 0.38) { p.bag = 'backpack'; p.bagColor = of(['#151515', '#3a4a5a', '#6a3a2a']); }
      if (r() < 0.6) p.umbrella = of(UMB); else p.runs = true;
      CAST['g' + i] = p; WALKERS.push('g' + i); if (type !== 'cape' && p.head !== 'hood') DINERS.push('g' + i);
    }
  })();
  // The second style (street-walk.js): flat colour, no outlines, one shared body and walk. When it is loaded,
  // the people on the footpath are this cast. Their pace comes from their stride, so a walk plays at its
  // own rhythm (about 65 ms a frame) and the planted foot stays put.
  // The third style (street-body.js, the approved one): everyone on the footpath, at the bar and behind its counter,
  // each dressed for the weather they set out in (summer, rain or cold).
  var BODY = !!(window.StreetBody && !P.oldCast), SB = window.StreetBody, CLIM = 'summer';
  var HD = P.hd || 1;                                   // the scene's people canvas is HD times its size: the third style is drawn that much finer
  var V2 = !BODY && !!(window.StreetWalk && !P.oldCast);
  if (BODY) {
    WALKERS = []; DINERS = [];
    SB.cast().forEach(function (def) {
      var ms = def.age === 'elder' ? 82 : def.age === 'kid' ? 58 : 66, mk = SB.make(def, 'summer', 35 * def.k, false);
      var pace = mk.cycle / (mk.n * ms / 1000);
      CAST['b_' + def.id] = { body: def, scale: def.k, speed: [pace * 0.95, pace * 1.05], sex: def.sex };
      WALKERS.push('b_' + def.id); if (def.age !== 'kid') DINERS.push('b_' + def.id);
    });
    CAST.b_waiter = { body: SB.staff.waiter, scale: 1, speed: [9, 11], sex: 'f' };
  }
  if (V2) {
    WALKERS = [];
    Object.keys(window.StreetWalk.CAST).forEach(function (k) {
      var def = window.StreetWalk.CAST[k], mk = window.StreetWalk.make(def, Math.round(35 * S * def.s), false);
      var pace = mk.cycle / S / (mk.n * (def.ms || 65) / 1000);
      // glide: on a skateboard, so never stops to stand about (a standing pose would lose the board)
      CAST['v_' + k] = { v2: def, scale: def.s, speed: [pace * 0.94, pace * 1.04], sex: def.bust ? 'f' : 'm', glide: !!def.skate };
      WALKERS.push('v_' + k);
    });
  }

  // ---------- Small helpers ----------
  var rgbCache = {};
  function toRgb(c) {
    var r = rgbCache[c];
    if (r) return r;
    if (c.charAt(0) === '#') { var n = parseInt(c.slice(1), 16); r = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    else { var m = c.match(/[\d.]+/g); r = [+m[0], +m[1], +m[2]]; }
    return (rgbCache[c] = r);
  }
  function shade(c, f) { var k = toRgb(c); return 'rgb(' + Math.min(255, k[0] * f | 0) + ',' + Math.min(255, k[1] * f | 0) + ',' + Math.min(255, k[2] * f | 0) + ')'; }
  function mix(c, d, t) { var a = toRgb(c), b = toRgb(d); return 'rgb(' + (a[0] + (b[0] - a[0]) * t | 0) + ',' + (a[1] + (b[1] - a[1]) * t | 0) + ',' + (a[2] + (b[2] - a[2]) * t | 0) + ')'; }
  function luma(c) { var k = toRgb(c); return k[0] * 0.3 + k[1] * 0.59 + k[2] * 0.11; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- Crisp shape drawing (no anti-aliasing, so it stays pixel art) ----------
  // fillStyle can be a colour or one of the cloth patterns below: every shape is painted in 1-pixel spans.
  function span(g, x0, x1, y) { if (x1 >= x0) g.fillRect(x0, y, x1 - x0 + 1, 1); }
  function fillPoly(g, pts, col) {
    g.fillStyle = col;
    var minY = 1e9, maxY = -1e9, i, j;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var yc = y + 0.5, xs = [];
      for (i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var a = pts[i], b = pts[j];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) span(g, Math.round(xs[k]), Math.round(xs[k + 1]) - 1, y);
    }
  }
  function fillEllipse(g, cx, cy, rx, ry, col) {
    g.fillStyle = col; rx = Math.max(rx, 0.7); ry = Math.max(ry, 0.7);
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      var dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      var hw = rx * Math.sqrt(1 - dy * dy);
      span(g, Math.round(cx - hw), Math.round(cx + hw) - 1, y);
    }
  }
  function capsule(g, x0, y0, x1, y1, r0, r1, col) {
    r0 = Math.max(r0, 0.75); r1 = Math.max(r1, 0.75);
    var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    fillPoly(g, [[x0 + nx * r0, y0 + ny * r0], [x1 + nx * r1, y1 + ny * r1], [x1 - nx * r1, y1 - ny * r1], [x0 - nx * r0, y0 - ny * r0]], col);
    fillEllipse(g, x0, y0, r0, r0, col); fillEllipse(g, x1, y1, r1, r1, col);
  }
  function line(g, x0, y0, x1, y1, col, w) {
    g.fillStyle = col; w = w || 1;
    var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (var i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n - (w - 1) / 2), Math.round(y0 + (y1 - y0) * i / n), w, w);
  }
  function dot(g, x, y, col, w) { g.fillStyle = col; w = w || 1; g.fillRect(Math.round(x), Math.round(y), w, w); }
  // Two-bone IK: where the knee (bendForward) or the elbow goes
  function joint(x0, y0, x1, y1, a, b, bendForward) {
    var dx = x1 - x0, dy = y1 - y0, d = clamp(Math.hypot(dx, dy), 0.01, a + b - 0.01);
    var ang = Math.atan2(dy, dx), A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    var t = bendForward ? ang - A : ang + A;
    return [x0 + Math.cos(t) * a, y0 + Math.sin(t) * a];
  }
  function fromAngle(x, y, len, ang) { return [x + Math.sin(ang) * len, y + Math.cos(ang) * len]; }

  // ---------- Cloth ----------
  // Tiny repeating weaves, painted with the clothes and baked into the sheets (so they cost nothing at run time).
  // In a weave '.' is the cloth's own colour, 'a' and 'c' darker, 'b' lighter, 'x' the colour with ' ' left clear.
  // Each pattern is pinned to the figure's hip, so it moves with the body instead of crawling over it.
  var WEAVE = {
    twill: { rows: ['a...', '.a..', '..a.', '...a'], a: 0.9 },
    tweed: { rows: ['.a..', '...b', 'b.a.', '....'], a: 0.84, b: 1.14 },
    denim: { rows: ['b..a', '.a..', '..b.', 'a...'], a: 0.86, b: 1.12 },
    cord: { rows: ['.a'], a: 0.86 },
    knit: { rows: ['.a'], a: 0.78 },
    strand: { rows: ['.a.b'], a: 0.8, b: 1.18 },
    canvas: { rows: ['.a', 'a.'], a: 0.93 },
    fleece: { rows: ['....', '.b..', '....', '...a'], a: 0.88, b: 1.12 },
    stripe: { rows: ['.', '.', '.', 'c', 'c'], c: 0.72 },
    dither: { rows: ['x ', ' x'] }
  };
  (function () {                                       // a soft check: dark bars both ways and a thin light line
    var rows = [];
    for (var y = 0; y < 8; y++) {
      var r = '';
      for (var x = 0; x < 8; x++) { var v = y < 2 ? 'a' : '.'; if (x < 2) v = v === 'a' ? 'c' : 'a'; if ((y === 5 || x === 5) && v === '.') v = 'b'; r += v; }
      rows.push(r);
    }
    WEAVE.check = { rows: rows, a: 0.84, b: 1.12, c: 0.72 };
  })();
  var texCache = {}, texM = null;
  function anchor(x, y) { texM = typeof DOMMatrix === 'function' ? new DOMMatrix([1, 0, 0, 1, Math.round(x), Math.round(y)]) : null; }
  function cloth(col, kind) {
    var w = kind && WEAVE[kind];
    if (!w) return col;
    var key = col + '|' + kind, p = texCache[key];
    if (p === undefined) {
      // (a readable canvas: the sheets it is painted into are kept off the GPU, and a GPU-side pattern would be
      // copied back for every fill, which made each frame take hundreds of milliseconds on graphics cards)
      var rows = w.rows, c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
      var g = readableContext(c);
      for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) {
        var ch = rows[y].charAt(x);
        if (ch === ' ') continue;
        g.fillStyle = ch === '.' || ch === 'x' ? col : shade(col, w[ch]); g.fillRect(x, y, 1, 1);
      }
      p = texCache[key] = g.createPattern(c, 'repeat') || null;
    }
    if (!p) return col;
    if (texM && p.setTransform) p.setTransform(texM);
    return p;
  }

  // ---------- Body and gaits ----------
  // Lengths are fractions of the figure's height s. The legs are a touch longer than the standing hip-to-ankle
  // distance, so a standing leg is straight but never over-stretched.
  var THIGH = 0.2245, SHIN = 0.2115, HIP_H = 0.455, ANKLE_H = 0.02, UPPER = 0.165, FORE = 0.15;
  // The shoe around the ankle (x forward, y down, the sole on the ground at ANKLE_H), and its toe and heel
  var SHOE = [[-0.034, -0.014], [0.022, -0.013], [0.058, -0.003], [0.086, 0.008], [0.09, 0.02], [-0.036, 0.02]];
  var SOLE = [[-0.036, 0.009], [0.09, 0.009], [0.09, 0.02], [-0.036, 0.02]], TOE = 0.09, HEEL = -0.036;
  // step: how far a planted foot travels under the body in one stance; stance: the share of the cycle a foot is
  // down (over 0.5 gives both feet down for a moment); front: the share of the step that lands ahead of the hip;
  // lift: swing height; dip: how much of the compass gait's hip drop is kept; rise: a run's bounce
  var GAITS = {
    walk: { step: 0.37, stance: 0.6, front: 0.52, lift: 0.055, dip: 0.6, lean: 0.03, armAmp: 0.4, elbow: 0.3, elbowExtra: 0.3 },
    run: { step: 0.5, stance: 0.38, front: 0.36, lift: 0.16, dip: 1, rise: 0.035, lean: 0.14, armAmp: 0.75, elbow: 1.45, elbowExtra: 0.15 }
  };
  function gaitOf(pose) { return pose === 'run' || pose === 'shield' ? GAITS.run : pose === 'walk' || pose === 'tray' ? GAITS.walk : null; }
  // Ground covered in one cycle, in figure heights (a planted foot moves step in stance of the cycle)
  function strideOf(gt) { return gt.step / gt.stance; }
  // One foot at cycle phase uu: x from under the hip, y lift (up is negative), pitch (+ toes up, - heel up)
  function footAt(gt, uu, s) {
    uu = ((uu % 1) + 1) % 1;
    var len = gt.step * s, xf = len * gt.front, x, y = 0, pitch = 0, stance = uu < gt.stance;
    if (stance) {
      var k = uu / gt.stance; x = xf - len * k;
      if (k < 0.12) pitch = 0.22 * (1 - k / 0.12);                 // heel strike, then the toes come down
      else if (k > 0.68) pitch = -0.7 * (k - 0.68) / 0.32;          // heel off, then toe off
    } else {
      var v = (uu - gt.stance) / (1 - gt.stance), e = v * v * (3 - 2 * v);
      x = xf - len + len * e;
      var w = v < 0.4 ? v / 0.4 * 0.5 : 0.5 + (v - 0.4) / 0.6 * 0.5;  // the foot is highest early in the swing
      y = -gt.lift * s * Math.sin(Math.PI * w);
      pitch = v < 0.5 ? -0.7 * (1 - v / 0.5) : 0.22 * (v - 0.5) / 0.5;
    }
    return { x: x, y: y, pitch: pitch, stance: stance };
  }
  // Where the ankle is for a foot pose: a heel-up foot turns about its toe, a toes-up foot about its heel
  function footPose(F, ox, oy, s) {
    var th = -F.pitch, c = Math.cos(th), sn = Math.sin(th);
    var px = (th > 0 ? TOE : th < 0 ? HEEL : 0) * s, py = ANKLE_H * s;
    return { x: ox + F.x + px - (px * c - py * sn), y: oy + F.y - (px * sn + py * c), c: c, s: sn };
  }

  // ---------- Heads ----------
  // A vague face: a clean head lit a touch on the front and shaded toward the back, and a faint brow shadow.
  function face(g, skin, cx, cy, rx, ry) {
    var lit = shade(skin, 1.07), dark = shade(skin, 0.84);
    var back = Math.round(cx - rx * 0.22), front = Math.round(cx + rx * 0.38);
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      var dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      var hw = rx * Math.sqrt(1 - dy * dy), xa = Math.round(cx - hw), xb = Math.round(cx + hw) - 1;
      g.fillStyle = dark; span(g, xa, Math.min(xb, back - 1), y);
      g.fillStyle = skin; span(g, Math.max(xa, back), Math.min(xb, front - 1), y);
      g.fillStyle = dy > -0.8 && dy < 0.6 ? lit : skin; span(g, Math.max(xa, front), xb, y);
    }
    g.fillStyle = shade(skin, 0.95); span(g, Math.round(cx + rx * 0.2), Math.round(cx + rx * 0.8) - 1, Math.round(cy - ry * 0.15));
  }
  function drawCollar(g, sp, s, shX, shY) {
    var t = sp.coatType, c = sp.coat;
    if (t === 'long') {                                // a coat collar turned up behind the neck, a shirt collar in front
      fillPoly(g, [[shX - 0.044 * s, shY + 0.012 * s], [shX - 0.038 * s, shY - 0.052 * s], [shX - 0.012 * s, shY - 0.044 * s], [shX - 0.004 * s, shY + 0.004 * s]], cloth(shade(c, 0.86), sp.weave));
      if (sp.shirt && !sp.scarf) fillPoly(g, [[shX + 0.0 * s, shY - 0.03 * s], [shX + 0.03 * s, shY - 0.012 * s], [shX + 0.012 * s, shY + 0.012 * s]], sp.shirt);
    }
    if (t === 'jacket') fillPoly(g, [[shX - 0.036 * s, shY + 0.006 * s], [shX - 0.03 * s, shY - 0.036 * s], [shX + 0.024 * s, shY - 0.03 * s], [shX + 0.032 * s, shY + 0.004 * s]], cloth(shade(c, 0.9), sp.weave));
    if (t === 'puffer') fillEllipse(g, shX - 0.004 * s, shY - 0.012 * s, 0.05 * s, 0.032 * s, shade(c, 0.92));
    if (t === 'apron' || t === 'vest') fillPoly(g, [[shX - 0.002 * s, shY - 0.026 * s], [shX + 0.034 * s, shY - 0.008 * s], [shX + 0.012 * s, shY + 0.018 * s]], t === 'apron' ? shade(c, 0.9) : shade(c, 1.3));
    if (t === 'hoodie' && sp.head !== 'hood') fillEllipse(g, shX - 0.045 * s, shY - 0.002 * s, 0.05 * s, 0.03 * s, shade(c, 0.8));
  }
  function drawScarf(g, sp, s, shX, shY, sway) {
    var sc = sp.scarf, k = cloth(sc, 'knit');
    capsule(g, shX - 0.056 * s, shY + 0.02 * s, shX - 0.1 * s - sway * 0.6, shY + 0.11 * s, 0.02 * s, 0.016 * s, cloth(shade(sc, 0.8), 'knit'));
    fillPoly(g, [[shX - 0.062 * s, shY - 0.014 * s], [shX + 0.058 * s, shY - 0.014 * s], [shX + 0.052 * s, shY + 0.03 * s], [shX - 0.062 * s, shY + 0.036 * s]], k);
    line(g, shX - 0.05 * s, shY + 0.008 * s, shX + 0.05 * s, shY + 0.006 * s, shade(sc, 0.74));   // the fold of the wrap
    var ex = shX - 0.1 * s - sway * 0.6, ey = shY + 0.11 * s + 0.016 * s;                       // a fringe at the end
    dot(g, ex - 0.012 * s, ey, shade(sc, 0.8)); dot(g, ex + 0.008 * s, ey, shade(sc, 0.8));
  }
  // The neck, collar, hair, head and hat. Returns where the head is.
  function drawNeckHead(g, sp, s, shX, shY, hdx, hdy, sway) {
    var hry = 0.068 * s, hrx = 0.058 * s, hcx = shX + 0.012 * s + hdx, hcy = shY - 0.035 * s - hry + hdy, skin = sp.skin;
    var ny = Math.round(hcy + hry * 0.5);
    g.fillStyle = shade(skin, 0.86); g.fillRect(Math.round(shX - 0.02 * s), ny, Math.max(2, Math.round(0.038 * s)), Math.max(1, Math.round(shY - ny) + 1));
    drawCollar(g, sp, s, shX, shY);
    var hair = sp.hair || '#141010', style = sp.hairStyle, hk = cloth(hair, 'strand');
    var hatted = sp.head === 'hood' || sp.head === 'helmet' || sp.head === 'beanie' || sp.head === 'fedora';
    if (style === 'long') fillPoly(g, [[hcx - hrx * 0.95, hcy - hry * 0.4], [hcx + hrx * 0.05, hcy - hry * 0.3], [hcx - hrx * 0.1 + sway * 0.3, shY + 0.08 * s], [hcx - hrx * 0.7 + sway * 0.3, shY + 0.095 * s], [hcx - hrx * 1.4 + sway * 0.3, shY + 0.07 * s]], hk);
    if (style === 'pony') { capsule(g, hcx - hrx * 0.8, hcy - hry * 0.3, hcx - hrx * 1.8 - sway * 0.6, hcy + hry * 1.15, 0.024 * s, 0.013 * s, hk); }
    face(g, skin, hcx, hcy, hrx, hry);
    if (sp.beard) fillPoly(g, [[hcx + hrx * 0.88, hcy + hry * 0.12], [hcx + hrx * 0.62, hcy + hry * 0.98], [hcx - hrx * 0.15, hcy + hry * 1.02], [hcx - hrx * 0.32, hcy + hry * 0.35], [hcx + hrx * 0.1, hcy + hry * 0.45]], cloth(sp.beard, 'strand'));
    if (!hatted && style && style !== 'none') {
      var low = style === 'long' || style === 'bob' ? 0.95 : style === 'pony' || style === 'bun' ? 0.55 : 0.35;
      fillEllipse(g, hcx - hrx * 0.15, hcy - hry * 0.46, hrx * 1.0, hry * 0.64, style === 'short' ? hair : hk);
      fillPoly(g, [[hcx - hrx * 1.05, hcy - hry * 0.4], [hcx - hrx * 0.4, hcy - hry * 0.5], [hcx - hrx * 0.42, hcy + hry * low], [hcx - hrx * 1.02, hcy + hry * low]], style === 'short' ? hair : hk);
      g.fillStyle = mix(hair, '#ffffff', 0.16); span(g, Math.round(hcx - hrx * 0.55), Math.round(hcx + hrx * 0.2), Math.round(hcy - hry * 0.98));  // a sheen
      if (style === 'bun') fillEllipse(g, hcx - hrx * 0.85, hcy - hry * 0.8, hrx * 0.44, hry * 0.38, hair);
      if (style === 'pony') dot(g, hcx - hrx * 0.95, hcy - hry * 0.3, shade(hair, 0.5), Math.max(1, Math.round(s * 0.016)));
    }
    if (sp.phones) {                                    // headphones: the band over the top, a cup over the ear
      line(g, hcx - hrx * 0.25, hcy - hry * 1.08, hcx + hrx * 0.35, hcy - hry * 1.02, sp.phones, Math.max(1, Math.round(s * 0.016)));
      line(g, hcx - hrx * 0.25, hcy - hry * 1.08, hcx - hrx * 0.3, hcy - hry * 0.15, sp.phones, Math.max(1, Math.round(s * 0.016)));
      fillEllipse(g, hcx - hrx * 0.25, hcy + hry * 0.05, hrx * 0.32, hry * 0.36, shade(sp.phones, 0.8));
    }
    if (sp.head === 'hood') {
      var hc = sp.headColor || sp.coat, hood = [[hcx - hrx * 1.25, hcy + hry * 1.25], [hcx - hrx * 1.32, hcy - hry * 0.4], [hcx - hrx * 0.5, hcy - hry * 1.28], [hcx + hrx * 0.55, hcy - hry * 1.18], [hcx + hrx * 0.98, hcy - hry * 0.3], [hcx + hrx * 0.35, hcy - hry * 0.45], [hcx - hrx * 0.25, hcy + hry * 0.2], [hcx - hrx * 0.15, hcy + hry * 1.3]];
      fillPoly(g, hood, cloth(hc, sp.weave));
      fillPoly(g, hood.map(function (q) { return [Math.min(q[0], hcx - hrx * 0.7), q[1]]; }), cloth(shade(hc, 0.72), 'dither'));
      line(g, hcx + hrx * 0.4, hcy - hry * 0.42, hcx - hrx * 0.18, hcy + hry * 0.2, shade(hc, 0.55));    // the shadow inside the hood
      line(g, hcx - hrx * 0.18, hcy + hry * 0.2, hcx - hrx * 0.1, hcy + hry * 1.2, shade(hc, 0.55));
      if (sp.gloss) line(g, hcx - hrx * 0.6, hcy - hry * 1.05, hcx + hrx * 0.3, hcy - hry * 1.05, shade(hc, 1.3));
    }
    if (sp.head === 'fedora') {
      var fc = sp.headColor;
      fillPoly(g, [[hcx - hrx * 0.9, hcy - hry * 0.45], [hcx - hrx * 0.72, hcy - hry * 1.35], [hcx - hrx * 0.05, hcy - hry * 1.22], [hcx + hrx * 0.75, hcy - hry * 1.35], [hcx + hrx * 0.9, hcy - hry * 0.45]], cloth(fc, 'canvas'));
      line(g, hcx - hrx * 1.5, hcy - hry * 0.45, hcx + hrx * 1.55, hcy - hry * 0.5, shade(fc, 0.8), Math.max(1, Math.round(s * 0.014)));
      line(g, hcx - hrx * 0.85, hcy - hry * 0.7, hcx + hrx * 0.85, hcy - hry * 0.7, '#4a2a22');
    }
    if (sp.head === 'cap') {
      fillEllipse(g, hcx - hrx * 0.05, hcy - hry * 0.55, hrx * 1.05, hry * 0.55, cloth(sp.headColor, 'canvas'));
      line(g, hcx + hrx * 0.6, hcy - hry * 0.4, hcx + hrx * 1.7, hcy - hry * 0.3, sp.headColor, Math.max(1, Math.round(s * 0.014)));
      dot(g, hcx - hrx * 0.1, hcy - hry * 1.1, shade(sp.headColor, 1.8));
    }
    if (sp.head === 'beanie') {
      var bc = sp.headColor;
      fillEllipse(g, hcx - hrx * 0.05, hcy - hry * 0.55, hrx * 1.1, hry * 0.75, cloth(bc, 'knit'));
      fillPoly(g, [[hcx - hrx * 1.12, hcy - hry * 0.42], [hcx + hrx * 1.02, hcy - hry * 0.42], [hcx + hrx * 1.0, hcy - hry * 0.1], [hcx - hrx * 1.12, hcy - hry * 0.1]], cloth(shade(bc, 0.8), 'knit'));
    }
    if (sp.head === 'helmet') {
      var mc = sp.headColor;
      fillEllipse(g, hcx - hrx * 0.05, hcy - hry * 0.5, hrx * 1.2, hry * 0.8, mc);
      line(g, hcx - hrx * 0.7, hcy - hry * 1.05, hcx + hrx * 0.3, hcy - hry * 1.12, shade(mc, 1.25));             // a glint on the shell
      line(g, hcx - hrx * 1.3, hcy - hry * 0.15, hcx + hrx * 1.4, hcy - hry * 0.15, shade(mc, 0.72), Math.max(1, Math.round(s * 0.014)));
      g.fillStyle = '#1a1a1a'; g.fillRect(Math.round(hcx + hrx * 0.6), Math.round(hcy - hry * 0.75), Math.max(1, Math.round(s * 0.02)), Math.max(1, Math.round(s * 0.02)));
    }
    if (sp.scarf) drawScarf(g, sp, s, shX, shY, sway);
    if (sp.coatType === 'hoodie') {                     // hoodie strings
      var str = mix(sp.coat, '#d8d2c4', 0.45);
      line(g, shX + 0.03 * s, shY - 0.004 * s, shX + 0.036 * s + sway * 0.2, shY + 0.06 * s, str);
      if (s >= 60) line(g, shX + 0.016 * s, shY, shX + 0.02 * s + sway * 0.2, shY + 0.05 * s, shade(str, 0.85));
    }
    return { cx: hcx, cy: hcy, rx: hrx, ry: hry };
  }

  // ---------- Torso and arms ----------
  // The coat or top from the shoulders down to its hem, with its cloth, shading and details. B: hipX, hipY,
  // shX, shY (the top of the shoulders), sway (how far a coat's hem trails), seated (no skirt).
  function drawTorso(g, sp, s, B) {
    var hipX = B.hipX, hipY = B.hipY, shX = B.shX, shY = B.shY, sway = B.sway || 0, seated = !!B.seated;
    var bw = sp.build || 1, fem = sp.sex === 'f', type = sp.coatType, cape = type === 'cape', wv = sp.weave;
    var legLen = (THIGH + SHIN) * s;
    var hemLen = seated ? 0.05 * s : type === 'long' ? (sp.coatLen || 0.5) * legLen : cape ? (sp.coatLen || 0.6) * legLen : type === 'apron' ? 0.22 * s : 0.035 * s;
    var hemY = hipY + hemLen, wide = type === 'puffer' ? 1.1 : type === 'long' ? 1.05 : 1;
    var sf = 0.062 * s * bw * wide, sb = 0.064 * s * bw * wide;
    var chest = (fem ? 0.088 : 0.08) * s * bw * wide, back = 0.085 * s * bw * wide;
    var belly = sp.belly || 0, waistF = (fem ? 0.05 : 0.058) * s * bw * wide * (1 + belly * 0.75), waistB = (fem ? 0.058 : 0.064) * s * bw * wide * (1 + belly * 0.1);
    var hipF = (fem ? 0.07 : 0.064) * s * bw * wide * (1 + belly * 0.3), hipB = (fem ? 0.088 : 0.078) * s * bw * wide;
    var skirt = type === 'long' && !seated;
    var flareF = skirt ? 0.1 * s : cape ? 0.16 * s : hipF, flareB = skirt ? 0.12 * s : cape ? 0.17 * s : hipB;
    var wY = shY + 0.17 * s;
    function at(y) { var t = (y - shY) / Math.max(1, hipY - shY); return shX + (hipX - shX) * clamp(t, 0, 1); }
    var swayK = hemLen > 0.1 * s ? 1 : 0.2, hx0 = hipX - flareB + sway * swayK, hx1 = hipX + flareF + sway * swayK;
    var body = cape ? [
      [shX - 0.034 * s, shY - 0.03 * s], [shX + 0.022 * s, shY - 0.026 * s], [at(shY) + chest * 1.1, shY + 0.07 * s], [hipX + flareF + sway, hemY], [hipX - flareB + sway, hemY], [at(shY) - back * 1.1, shY + 0.07 * s]
    ] : [
      [shX + 0.022 * s, shY - 0.02 * s], [at(shY) + sf, shY + 0.008 * s], [at(shY + 0.09 * s) + chest, shY + 0.09 * s], [at(wY) + waistF, wY], [hipX + hipF, hipY],
      [hx1, hemY], [hx0, hemY],
      [hipX - hipB, hipY], [at(wY) - waistB, wY], [at(shY + 0.08 * s) - back, shY + 0.08 * s], [at(shY) - sb, shY + 0.012 * s], [shX - 0.032 * s, shY - 0.022 * s]
    ];
    var coat = sp.coat, coatD = shade(coat, 0.68), coatL = shade(coat, 1.22), seam = shade(coat, 0.58);
    // The cloth, a dithered edge into the shadow, then the shadow down the back
    fillPoly(g, body, cloth(coat, wv));
    fillPoly(g, body.map(function (q) { return [Math.min(q[0], at(q[1]) + 0.012 * s), q[1]]; }), cloth(coatD, 'dither'));
    fillPoly(g, body.map(function (q) { return [Math.min(q[0], at(q[1]) - 0.022 * s), q[1]]; }), cloth(coatD, wv));
    // Long hems fall into shade
    if ((skirt || cape) && !seated) {
      var fi = cape ? [2, 3] : [4, 5], bi = cape ? [5, 4] : [7, 6], yb = hemY - Math.min(0.07 * s, hemLen * 0.3);
      var ex = function (i, y) { var p = body[i[0]], q = body[i[1]], t = (y - p[1]) / ((q[1] - p[1]) || 1); return p[0] + (q[0] - p[0]) * t; };
      fillPoly(g, [[ex(bi, yb), yb], [ex(fi, yb), yb], [ex(fi, hemY), hemY], [ex(bi, hemY), hemY]], cloth(coatD, 'dither'));
    }
    // Light catching the front edge
    for (var yy = Math.ceil(shY + 0.02 * s); yy < Math.min(hemY, hipY); yy++) dot(g, at(yy) + (yy < wY ? chest * 0.9 : waistF * 0.9), yy, coatL);
    var big = s >= 40;
    if (type === 'long') {
      // lapel, buttons, a pocket flap and the back vent
      fillPoly(g, [[shX + 0.012 * s, shY - 0.012 * s], [at(shY + 0.03 * s) + chest * 0.96, shY + 0.03 * s], [at(shY + 0.14 * s) + chest * 0.5, shY + 0.14 * s]], cloth(shade(coat, 1.12), wv));
      line(g, shX + 0.012 * s, shY - 0.008 * s, at(shY + 0.14 * s) + chest * 0.5, shY + 0.14 * s, seam);
      if (big) {
        [wY - 0.035 * s, wY + 0.06 * s].forEach(function (by) { dot(g, at(by) + (by < wY ? chest : waistF) * 0.6, by, shade(coat, 0.4)); });
        if (!seated) { line(g, hipX - 0.005 * s, hipY + 0.035 * s, hipX + hipF * 0.75, hipY + 0.035 * s, seam); line(g, hipX - 0.04 * s, hipY + 0.04 * s, hipX - 0.06 * s + sway, hemY - 1, seam); line(g, hipX + 0.025 * s, wY + 0.04 * s, hipX + 0.03 * s + sway, hemY - 1, coatD); }
      }
    }
    if (type === 'jacket') {
      line(g, at(shY + 0.02 * s) + sf * 0.85, shY + 0.02 * s, hipX + hipF * 0.82, hipY, seam);           // the zip
      if (big) line(g, at(shY + 0.1 * s) + chest * 0.15, shY + 0.1 * s, at(shY + 0.1 * s) + chest * 0.55, shY + 0.1 * s, seam);
      var jb = hemY - 0.032 * s;
      fillPoly(g, [[at(jb) - waistB * 1.02 - 1, jb], [at(jb) + waistF + 1, jb], [hx1, hemY], [hx0, hemY]], cloth(shade(coat, 0.8), 'knit'));
    }
    if (type === 'hoodie') {
      var pk = wY + 0.03 * s;                          // the kangaroo pocket and a ribbed hem
      fillPoly(g, [[at(pk) + waistF * 0.1, pk], [at(pk) + waistF * 0.95, pk], [hipX + hipF * 0.98, hipY - 0.004 * s], [hipX + hipF * 0.05, hipY - 0.004 * s]], cloth(shade(coat, 0.9), wv));
      line(g, at(pk) + waistF * 0.1, pk, at(pk) + waistF * 0.95, pk, seam);
      fillPoly(g, [[hipX - hipB - 1, hemY - 0.03 * s], [hipX + hipF + 1, hemY - 0.03 * s], [hx1, hemY], [hx0, hemY]], cloth(shade(coat, 0.82), 'knit'));
    }
    if (type === 'puffer') {
      for (var q = 1; q < 5; q++) {
        var qy = shY + q * (hemY - shY) / 5, qw = (qy < wY ? chest : waistF) * 0.86, qb = (qy < wY ? back : waistB) * 0.9;
        line(g, at(qy) - qb, qy, at(qy) + qw, qy, coatD);
        line(g, at(qy + 1.5) - qb * 0.4, qy + 1.5, at(qy + 1.5) + qw * 0.8, qy + 1.5, coatL);
      }
    }
    if (cape) {
      line(g, at(shY + 0.1 * s) + chest * 0.3, shY + 0.1 * s, hipX + flareF * 0.45 + sway, hemY - 1, coatD);
      line(g, at(shY + 0.12 * s) - back * 0.3, shY + 0.12 * s, hipX - flareB * 0.4 + sway, hemY - 1, coatD);
      if (sp.gloss) line(g, at(shY + 0.06 * s) + chest * 0.75, shY + 0.06 * s, hipX + flareF * 0.72 + sway, hemY - 0.06 * s, shade(coat, 1.3));
      if (sp.gloss && big) [0.08, 0.16, 0.24].forEach(function (k) { var y = shY + k * s; dot(g, at(y) + chest * 0.7 + (y - shY) * 0.15, y, shade(coat, 0.5)); });
    }
    if (type === 'apron') {
      fillPoly(g, [[at(shY + 0.06 * s) - 0.01 * s, shY + 0.06 * s], [at(wY) + waistF + 1, wY], [hipX + hipF + 1, hipY], [hipX + hipF + 2, hemY], [hipX - 0.02 * s, hemY], [at(wY) - 0.01 * s, wY]], cloth(sp.apron, 'canvas'));
      line(g, shX + 0.01 * s, shY - 0.01 * s, at(shY + 0.06 * s) - 0.005 * s, shY + 0.06 * s, sp.apron);
      line(g, at(wY) - waistB, wY, at(wY), wY, sp.apron);
      dot(g, at(wY) - waistB - 1, wY - 1, sp.apron, 2);                             // the tie at the back
    }
    if (type === 'vest') {
      var vest = '#c8e040', refl = '#e8eef0', rw = Math.max(1, Math.round(s * 0.015));
      fillPoly(g, [[at(shY) + sf * 0.7, shY + 0.01 * s], [at(shY + 0.09 * s) + chest, shY + 0.09 * s], [at(wY) + waistF, wY], [hipX + hipF, hipY - 0.01 * s], [hipX - hipB, hipY - 0.01 * s], [at(wY) - waistB, wY], [at(shY + 0.08 * s) - back, shY + 0.08 * s], [at(shY) - sb * 0.7, shY + 0.01 * s]], cloth(vest, 'canvas'));
      fillPoly(g, [[at(shY + 0.08 * s) - back, shY + 0.08 * s], [at(shY + 0.08 * s) - back * 0.2, shY + 0.08 * s], [hipX - hipB * 0.2, hipY - 0.01 * s], [hipX - hipB, hipY - 0.01 * s]], cloth(shade(vest, 0.72), 'dither'));
      line(g, at(wY - 0.04 * s) - back * 0.9, wY - 0.04 * s, at(wY - 0.04 * s) + chest * 0.9, wY - 0.04 * s, refl, rw);
      line(g, at(hipY - 0.04 * s) - hipB * 0.9, hipY - 0.04 * s, at(hipY - 0.04 * s) + hipF * 0.9, hipY - 0.04 * s, refl, rw);
      if (big) line(g, at(shY + 0.05 * s) + chest * 0.2, shY + 0.05 * s, at(shY + 0.05 * s) + chest * 0.6, shY + 0.05 * s, shade(vest, 0.7));
    }
    if (sp.belt) {
      var by = wY + 0.03 * s;
      fillPoly(g, [[at(by) - waistB, by - 0.005 * s], [at(by) + waistF + 1, by - 0.005 * s], [at(by) + waistF + 1, by + 0.015 * s], [at(by) - waistB, by + 0.015 * s]], shade(coat, 0.5));
      dot(g, at(by) + waistF * 0.55, by - 0.003 * s, '#b8a070', Math.max(1, Math.round(s * 0.018)));   // the buckle
    }
    if (sp.bag === 'backpack') line(g, shX + 0.01 * s, shY + 0.01 * s, at(wY) - 0.01 * s, wY, shade(sp.bagColor, 1.6));
  }
  // An arm from the shoulder (sx, sy): by angles (upper arm a, forearm fore) or reaching for the point T
  function drawArm(g, sp, s, sx, sy, a, fore, tone, hand, T) {
    var bw = sp.build || 1, el, hd;
    if (T) { el = joint(sx, sy, T[0], T[1], UPPER * s, FORE * s, false); hd = T; }
    else { el = fromAngle(sx, sy, UPPER * s, a); hd = fromAngle(el[0], el[1], FORE * s, fore); }
    var base = shade(sp.coat, tone === 1 ? 1.05 : tone), cc = cloth(base, sp.weave), t = sp.coatType;
    capsule(g, sx, sy, el[0], el[1], 0.036 * s * bw * (t === 'puffer' ? 1.2 : 1), 0.029 * s, cc);
    capsule(g, el[0], el[1], hd[0], hd[1], 0.028 * s, 0.022 * s, cc);
    if (t === 'jacket' || t === 'hoodie' || t === 'puffer') capsule(g, lerp(el[0], hd[0], 0.78), lerp(el[1], hd[1], 0.78), hd[0], hd[1], 0.024 * s, 0.023 * s, cloth(shade(base, 0.78), 'knit'));
    if (hand) fillEllipse(g, hd[0], hd[1] + 0.005 * s, 0.024 * s, 0.026 * s, hand);
    return hd;
  }

  // ---------- The figure ----------
  // Draws one frame, facing right, with the feet on (ox, oy). Sizes are fractions of s, the figure's height.
  // over (optional, used by the road workers) can set: feet [near x, far x], lean, hipDy (pixels), headDx/Dy,
  // armN/foreN/armF/foreF angles, place(R) -> { nearT, farT } hand targets, and beforeNear(R) to draw a tool
  // between the body and the near arm. Returns R: the hip, shoulders, head and hands.
  function drawFigure(g, sp, s, pose, f, umb, ox, oy, over) {
    over = over || {};
    umb = umb && sp.umbrella ? sp.umbrella : null;
    var gait = gaitOf(pose), u = f / GAIT_FRAMES;
    var bw = sp.build || 1, L = (THIGH + SHIN) * s;
    var nearF, farF, lean = (sp.stoop || 0) * 0.12, armN, armF, foreN, foreF, sway = 0;
    var hipShift = 0, breath = 0, headDx = 0, headDy = 0, pocketN = false, pocketF = false, held = null;
    if (gait) {
      nearF = footAt(gait, u, s); farF = footAt(gait, u + 0.5, s);
      lean += gait.lean;
      armN = -gait.armAmp * Math.cos(TAU * u); armF = -armN;
      var lagN = -gait.armAmp * Math.cos(TAU * (u - 0.08)), lagF = -lagN;
      foreN = lagN + gait.elbow + gait.elbowExtra * Math.max(0, lagN); foreF = lagF + gait.elbow + gait.elbowExtra * Math.max(0, lagF);
      sway = 0.03 * s * Math.cos(TAU * (u - 0.12));
    } else if (pose === 'ride') {
      nearF = { x: 0.04 * s, y: 0, pitch: 0 }; farF = { x: -0.06 * s, y: 0, pitch: 0 }; lean += 0.12;
      armN = armF = 1.05; foreN = foreF = 1.5;
    } else {
      // Standing still: breathing, the weight moving from foot to foot (the free heel lifts and only that knee
      // bends), and whatever the hands are doing. One loop is 16 frames.
      var v = f / 16;
      breath = Math.sin(v * TAU * 2);
      var w = Math.sin(v * TAU + 0.6);
      hipShift = 0.01 * s * w;
      nearF = { x: 0.045 * s, y: 0, pitch: w < -0.35 ? -0.4 * (-w - 0.35) : 0 };
      farF = { x: -0.035 * s, y: 0, pitch: w > 0.35 ? -0.4 * (w - 0.35) : 0 };
      armN = 0.07 + 0.025 * breath; foreN = 0.14 + 0.03 * breath; armF = -0.04 - 0.02 * breath; foreF = 0.06;
      if (pose === 'pockets' || pose === 'look') { armN = -0.12; foreN = 0.52; armF = -0.2; foreF = 0.42; pocketN = pocketF = true; }
      if (pose === 'look') { headDx = -0.006 * s; headDy = -0.006 * s; }  // looking up at the signs
      if (pose === 'watch') {
        var kw = smoothWin(v, 0.25, 0.75, 0.1);
        armN = lerp(armN, 0.6, kw); foreN = lerp(foreN, 1.95, kw); headDx = 0.01 * s * kw; headDy = 0.008 * s * kw;
        held = 'watch';
      }
      if (pose === 'phone') {
        var up = smoothWin(v, 0.68, 0.86, 0.05);       // looks up from the screen for a moment
        armN = 0.35; foreN = 2.58 + 0.05 * Math.sin(v * TAU * 4); armF = 0.25; foreF = 2.2;
        headDx = 0.012 * s * (1 - up); headDy = 0.01 * s * (1 - up); held = 'phone';
      }
      if (pose === 'smoke') {
        var km = smoothWin(v, 0.14, 0.5, 0.1);         // hand up to the mouth, a draw, then down and breathe out
        armN = lerp(0.25, 1.25, km); foreN = lerp(1.3, 3.71, km); armF = -0.1; foreF = 0.5; pocketF = true;
        headDy = -0.004 * s * smoothWin(v, 0.55, 0.8, 0.06); held = km > 0.6 ? 'cig-lit' : 'cig';
      }
      if (pose === 'talk') { armN = 0.45 + 0.4 * Math.max(0, Math.sin(v * TAU * 2)); foreN = 1.6 + 0.6 * Math.sin(v * TAU * 3 + 1); headDy = 0.004 * s * Math.sin(v * TAU * 4); }
      if (pose === 'wipe') { lean += 0.2; armN = 0.62 + 0.12 * Math.sin(v * TAU * 2); foreN = 1.75 + 0.25 * Math.cos(v * TAU * 2); held = 'cloth'; }
    }
    if (umb) { armN = 0.7; foreN = 2.7; pocketN = false; if (held !== 'watch') held = null; }
    if (pose === 'shield') { armN = 2.8; foreN = 3.05; armF = 2.6; foreF = 3.0; }
    if (pose === 'tray') { armN = 0.45; foreN = 1.62; }
    if (sp.cane && !umb && pose !== 'shield' && !held) { armN = 0.32 + 0.06 * Math.sin(u * TAU); foreN = 0.3; pocketN = false; }
    if (over.feet) { nearF.x = over.feet[0] * s; farF.x = over.feet[1] * s; }
    if (over.lean !== undefined) lean = over.lean;
    ['armN', 'foreN', 'armF', 'foreF'].forEach(function (k) { if (over[k] !== undefined) { if (k === 'armN') armN = over[k]; if (k === 'foreN') foreN = over[k]; if (k === 'armF') armF = over[k]; if (k === 'foreF') foreF = over[k]; } });
    if (over.headDx) headDx += over.headDx;
    if (over.headDy) headDy += over.headDy;

    // The hip: over a straight leg when standing; in a walk it rides the stance leg's arc (a compass gait),
    // dipping when both feet are down; a run sinks into the stance and rises in flight
    var hipX = ox + hipShift, hipY, need = -1e9, r = (gait ? 0.995 : pose === 'ride' ? 0.965 : 0.997) * L;
    [nearF, farF].forEach(function (F) {
      if (gait && !F.stance) return;
      var A = footPose(F, ox, oy, s), dx = A.x - hipX;
      need = Math.max(need, A.y - Math.sqrt(Math.max(0, r * r - dx * dx)));
    });
    if (gait === GAITS.run) hipY = Math.max(oy - ANKLE_H * s - 0.93 * L - gait.rise * s * (1 - Math.cos(2 * TAU * (u - gait.stance / 2))) / 2, need);
    else if (gait) { var top = oy - ANKLE_H * s - r; hipY = top + gait.dip * Math.max(0, need - top); }
    else hipY = need;
    hipY += over.hipDy || 0;
    var torso = 0.29 * s * (1 + 0.012 * breath);
    var shX = hipX + Math.sin(lean) * torso + (sp.stoop || 0) * 0.03 * s, shY = hipY - Math.cos(lean) * torso;
    var sx = shX - 0.01 * s, sy = shY + 0.03 * s;
    var skinD = shade(sp.skin, 0.72), handN = sp.glove || sp.skin, handF = sp.glove ? shade(sp.glove, 0.72) : skinD;
    var R = { ox: ox, oy: oy, hipX: hipX, hipY: hipY, shX: shX, shY: shY, sx: sx, sy: sy, nearHand: null, farHand: null };
    var nearT = null, farT = null;
    if (over.place) { var pl = over.place(R); nearT = pl.nearT || null; farT = pl.farT || null; }
    anchor(hipX, hipY);

    function leg(F, tone) {
      var A = footPose(F, ox, oy, s);
      var knee = joint(hipX, hipY, A.x, A.y, THIGH * s, SHIN * s, true);
      var pc = cloth(tone === 1 ? sp.pants : shade(sp.pants, tone), sp.pantsWeave || 'twill');
      capsule(g, hipX, hipY, knee[0], knee[1], 0.05 * s * bw, 0.036 * s, pc);
      capsule(g, knee[0], knee[1], A.x, A.y, 0.035 * s, 0.026 * s, pc);
      var sc = tone === 1 ? sp.shoes : shade(sp.shoes, tone), light = luma(sp.shoes) > 140;
      var place = function (q) { return [A.x + (q[0] * A.c - q[1] * A.s) * s, A.y + (q[0] * A.s + q[1] * A.c) * s]; };
      fillPoly(g, SHOE.map(place), sc);
      fillPoly(g, SOLE.map(place), light ? shade(sc, 0.72) : shade(sc, 0.5));
      if (s >= 50) { var tp = place([0.062, -0.002]); dot(g, tp[0], tp[1], light ? shade(sc, 1.08) : mix(sc, '#ffffff', 0.25)); }
    }
    function arm(a, fore, tone, hand, T) { return drawArm(g, sp, s, sx, sy, a, fore, tone, hand, T); }

    var cape = sp.coatType === 'cape';
    if (!cape) R.farHand = arm(armF, foreF, 0.62, pocketF ? null : handF, farT);
    leg(farF, 0.62);
    leg(nearF, 1);

    if (sp.bag === 'backpack') {
      var bp = [[shX - 0.08 * s, shY + 0.02 * s], [shX - 0.16 * s, shY + 0.05 * s], [shX - 0.165 * s, shY + 0.22 * s], [shX - 0.07 * s, shY + 0.24 * s]];
      fillPoly(g, bp, cloth(sp.bagColor, 'canvas'));
      fillPoly(g, [[shX - 0.15 * s, shY + 0.13 * s], [shX - 0.1 * s, shY + 0.13 * s], [shX - 0.1 * s, shY + 0.21 * s], [shX - 0.155 * s, shY + 0.21 * s]], shade(sp.bagColor, 1.8));
      line(g, shX - 0.15 * s, shY + 0.07 * s, shX - 0.09 * s, shY + 0.06 * s, shade(sp.bagColor, 2.4));
    }
    if (sp.bag === 'box') { var bx = 0.24 * s; g.fillStyle = sp.bagColor; g.fillRect(Math.round(shX - 0.07 * s - bx), Math.round(shY - 0.06 * s), Math.round(bx), Math.round(bx)); g.fillStyle = shade(sp.bagColor, 0.7); g.fillRect(Math.round(shX - 0.07 * s - bx), Math.round(shY - 0.06 * s), Math.round(bx), 1); g.fillRect(Math.round(shX - 0.07 * s - bx), Math.round(shY - 0.06 * s), 1, Math.round(bx)); g.fillStyle = '#e8d050'; g.fillRect(Math.round(shX - 0.07 * s - bx * 0.55), Math.round(shY + 0.02 * s), Math.max(1, Math.round(s * 0.02)), Math.max(1, Math.round(s * 0.02))); }

    var nearHand = null;
    if (cape) nearHand = arm(armN, foreN, 0.85, pocketN ? null : handN, nearT);
    drawTorso(g, sp, s, { hipX: hipX, hipY: hipY, shX: shX, shY: shY, sway: sway });
    var H = drawNeckHead(g, sp, s, shX, shY, headDx, headDy, sway), hcx = H.cx, hcy = H.cy, hry = H.ry;
    R.hcx = hcx; R.hcy = hcy;
    if (over.beforeNear) { R.nearHand = nearT; over.beforeNear(R); }

    // Near arm on top, and what it holds
    if (!cape) nearHand = arm(armN, foreN, 1, pocketN ? null : handN, nearT);
    else if (held || umb || pose === 'shield' || pose === 'talk') nearHand = arm(armN, foreN, 0.95, handN, nearT);
    R.nearHand = nearHand;
    if (sp.bag === 'tote' && !umb && !held && !pocketN && pose !== 'shield' && pose !== 'talk') {
      fillPoly(g, [[nearHand[0] - 0.04 * s, nearHand[1] + 0.02 * s], [nearHand[0] + 0.05 * s, nearHand[1] + 0.02 * s], [nearHand[0] + 0.055 * s, nearHand[1] + 0.13 * s], [nearHand[0] - 0.045 * s, nearHand[1] + 0.13 * s]], cloth(sp.bagColor, 'canvas'));
      line(g, nearHand[0] - 0.035 * s, nearHand[1] + 0.045 * s, nearHand[0] + 0.048 * s, nearHand[1] + 0.045 * s, shade(sp.bagColor, 0.78));
      line(g, nearHand[0] - 0.02 * s, nearHand[1] + 0.02 * s, nearHand[0], nearHand[1] - 0.01 * s, shade(sp.bagColor, 0.7));
    }
    if (sp.cane && !umb && pose !== 'shield') line(g, nearHand[0], nearHand[1], nearHand[0] + 0.05 * s, oy, '#3a2a1a', Math.max(1, Math.round(s * 0.014)));
    if (sp.cup && !umb && !held && sp.bag !== 'tote' && pose !== 'shield') { fillPoly(g, [[nearHand[0] - 0.012 * s, nearHand[1] - 0.05 * s], [nearHand[0] + 0.03 * s, nearHand[1] - 0.05 * s], [nearHand[0] + 0.025 * s, nearHand[1] + 0.012 * s], [nearHand[0] - 0.008 * s, nearHand[1] + 0.012 * s]], '#e8e0d0'); line(g, nearHand[0] - 0.012 * s, nearHand[1] - 0.03 * s, nearHand[0] + 0.03 * s, nearHand[1] - 0.03 * s, '#8a5a3a'); }
    if (held === 'phone') { g.fillStyle = '#101418'; g.fillRect(Math.round(nearHand[0]), Math.round(nearHand[1] - 0.03 * s), Math.max(1, Math.round(s * 0.016)), Math.max(2, Math.round(s * 0.04))); }
    if (held === 'watch') { g.fillStyle = '#c8bca8'; g.fillRect(Math.round(nearHand[0] - 0.035 * s), Math.round(nearHand[1] - 0.012 * s), Math.max(1, Math.round(s * 0.018)), Math.max(1, Math.round(s * 0.022))); }
    if (held === 'cig' || held === 'cig-lit') {
      var cl = Math.max(2, Math.round(s * 0.05)), tipX = Math.round(nearHand[0] + cl), tipY = Math.round(nearHand[1] - 0.006 * s);
      line(g, nearHand[0], nearHand[1] - 0.006 * s, tipX - 1, tipY, '#e8e0d0');
      g.fillStyle = held === 'cig-lit' ? '#ffd080' : '#ff6a2a'; g.fillRect(tipX, tipY, 1, 1);
    }
    if (held === 'cloth') fillEllipse(g, nearHand[0] + 0.01 * s, nearHand[1] + 0.012 * s, 0.035 * s, 0.018 * s, '#e8e2d6');
    if (pose === 'tray') { line(g, nearHand[0] - 0.02 * s, nearHand[1] - 0.01 * s, nearHand[0] + 0.14 * s, nearHand[1] - 0.01 * s, '#c8c8c8', Math.max(1, Math.round(s * 0.014))); fillEllipse(g, nearHand[0] + 0.06 * s, nearHand[1] - 0.04 * s, 0.04 * s, 0.025 * s, '#e8e0d0'); fillEllipse(g, nearHand[0] + 0.06 * s, nearHand[1] - 0.055 * s, 0.035 * s, 0.01 * s, '#c86a2a'); }
    if (pose === 'shield') { var shw = 0.36 * s; fillPoly(g, [[hcx - shw / 2, hcy - hry * 1.7], [hcx + shw / 2, hcy - hry * 1.8], [hcx + shw / 2, hcy - hry * 1.35], [hcx - shw / 2, hcy - hry * 1.25]], cloth(sp.bagColor || '#6a5a4a', 'canvas')); }
    if (umb) {
      var ucx = nearHand[0] + 1, uw = 0.46 * s, uh = 0.14 * s, utop = hcy - hry - 0.2 * s - uh;
      line(g, ucx, utop + uh, ucx, nearHand[1], '#101418', Math.max(1, Math.round(s * 0.012)));
      for (var rr = 0; rr <= uh; rr++) { var ww = uw * Math.sqrt(1 - Math.pow((uh - rr) / uh, 2)); g.fillStyle = rr < uh * 0.35 ? shade(umb, 1.18) : umb; span(g, Math.round(ucx - ww), Math.round(ucx + ww), Math.round(utop + rr)); }
      g.fillStyle = shade(umb, 0.62); for (var ux = -uw; ux <= uw; ux += Math.max(2, s * 0.06)) g.fillRect(Math.round(ucx + ux), Math.round(utop + uh + 1), Math.max(1, Math.round(s * 0.02)), 1);
      line(g, ucx, utop - 0.02 * s, ucx, utop, '#101418');
    }
    if (pose === 'ride') {
      var deckY = oy + 0.012 * s, d0 = ox - 0.3 * s, d1 = ox + 0.32 * s, wr = 0.045 * s;
      fillPoly(g, [[d0, deckY], [d1, deckY], [d1, deckY + 0.03 * s], [d0, deckY + 0.03 * s]], '#1a2026');
      line(g, d1, deckY, d1 - 0.04 * s, nearHand[1], '#1a2026', Math.max(1, Math.round(s * 0.02)));
      line(g, d1 - 0.1 * s, nearHand[1], d1 + 0.02 * s, nearHand[1], '#1a2026', Math.max(1, Math.round(s * 0.016)));
      fillEllipse(g, d0, deckY + wr, wr, wr, '#0a0c10'); fillEllipse(g, d1, deckY + wr, wr, wr, '#0a0c10');
      g.fillStyle = '#fff3c4'; g.fillRect(Math.round(d1 - 0.02 * s), Math.round(nearHand[1] + 0.03 * s), Math.max(1, Math.round(s * 0.02)), Math.max(1, Math.round(s * 0.02)));
    }
    return R;
  }

  // Seated at the counter, facing right; cy is the top of the counter (only what is above it shows). The seat is
  // a little below the counter, so the forearms rest on it. kind: eat, drink, talk, phone (12 frames).
  function drawSeated(g, sp, s, kind, f, ox, cy) {
    var u = f / 12, breath = Math.sin(u * TAU * 2);
    var hipX = ox, hipY = cy + Math.round(0.08 * s);
    var lift = kind === 'eat' ? Math.max(0, Math.sin(Math.min(1, u * 2) * Math.PI)) : kind === 'drink' ? Math.max(0, Math.sin(clamp((u - 0.2) * 2.2, 0, 1) * Math.PI)) : 0;
    var lean = kind === 'eat' ? 0.16 + 0.04 * lift : kind === 'phone' ? 0.2 : kind === 'drink' ? 0.08 - 0.06 * lift : 0.1;
    var torso = 0.29 * s * (1 + 0.01 * breath);
    var shX = hipX + Math.sin(lean) * torso, shY = hipY - Math.cos(lean) * torso;
    var sx = shX - 0.01 * s, sy = shY + 0.03 * s, headDx = 0, headDy = 0;
    if (kind === 'eat') { headDx = 0.008 * s * lift; headDy = 0.006 * s * (1 - lift); }
    if (kind === 'drink') { headDx = -0.006 * s * lift; headDy = -0.006 * s * lift; }
    if (kind === 'talk') headDy = 0.006 * s * Math.sin(u * TAU * 3);
    if (kind === 'phone') { headDx = 0.014 * s; headDy = 0.016 * s; }
    var hry = 0.068 * s, hrx = 0.058 * s, hcx = shX + 0.012 * s + headDx, hcy = shY - 0.035 * s - hry + headDy;
    anchor(hipX, hipY);
    // Where the hands go: by default both forearms lie on the counter
    var farT = [sx + 0.13 * s, cy - 0.022 * s], nearT = [sx + 0.165 * s, cy - 0.022 * s];
    if (kind === 'eat') nearT = [lerp(hipX + 0.15 * s, hcx + hrx * 1.1, lift), lerp(cy - 0.04 * s, hcy + hry * 0.6, lift)];
    if (kind === 'drink') nearT = [lerp(hipX + 0.17 * s, hcx + hrx * 1.25, lift), lerp(cy - 0.035 * s, hcy + hry * 0.55, lift)];
    if (kind === 'talk') { var gk = Math.max(0, Math.sin(u * TAU * 2 + 1)); nearT = [sx + 0.15 * s + 0.03 * s * Math.sin(u * TAU * 2), lerp(cy - 0.03 * s, sy + 0.08 * s, gk)]; }
    if (kind === 'phone') { nearT = [sx + 0.16 * s, sy + 0.12 * s]; farT = [sx + 0.13 * s, sy + 0.135 * s]; }
    // The low back of the stool behind them: a thin post and a curved rail
    var cb = '#2e2420', rail = hipY - 0.17 * s;
    line(g, hipX - 0.125 * s, hipY + 0.1 * s, hipX - 0.12 * s, rail, cb, Math.max(1, Math.round(s * 0.018)));
    fillPoly(g, [[hipX - 0.15 * s, rail - 0.02 * s], [hipX - 0.085 * s, rail - 0.012 * s], [hipX - 0.085 * s, rail + 0.012 * s], [hipX - 0.15 * s, rail + 0.016 * s]], cb);
    line(g, hipX - 0.148 * s, rail - 0.02 * s, hipX - 0.09 * s, rail - 0.013 * s, '#5a463a');
    drawArm(g, sp, s, sx, sy, 0, 0, 0.62, shade(sp.skin, 0.72), farT);
    drawTorso(g, sp, s, { hipX: hipX, hipY: hipY, shX: shX, shY: shY, sway: 0, seated: true });
    drawNeckHead(g, sp, s, shX, shY, headDx, headDy, 0);
    var hand = drawArm(g, sp, s, sx, sy, 0, 0, 1, sp.skin, nearT);
    if (kind === 'eat') {                              // chopsticks: down into the bowl, then up to the mouth
      var ca = lerp(1.15, 2.9, lift), cl = 0.085 * s;
      line(g, hand[0], hand[1], hand[0] + Math.cos(ca) * cl, hand[1] + Math.sin(ca) * cl * (lift > 0.5 ? 0.3 : 1), '#d8c8a0');
      line(g, hand[0] + 0.006 * s, hand[1] - 0.006 * s, hand[0] + Math.cos(ca - 0.15) * cl, hand[1] + Math.sin(ca - 0.15) * cl * (lift > 0.5 ? 0.3 : 1) - 0.006 * s, '#c8b890');
    }
    if (kind === 'drink') { fillPoly(g, [[hand[0] - 0.008 * s, hand[1] - 0.05 * s], [hand[0] + 0.042 * s, hand[1] - 0.05 * s], [hand[0] + 0.036 * s, hand[1] + 0.022 * s], [hand[0] - 0.002 * s, hand[1] + 0.022 * s]], '#e8e0d0'); line(g, hand[0] - 0.008 * s, hand[1] - 0.05 * s, hand[0] + 0.042 * s, hand[1] - 0.05 * s, '#b8ae9e'); }
    if (kind === 'phone') { g.fillStyle = '#101418'; g.fillRect(Math.round(hand[0]), Math.round(hand[1] - 0.03 * s), Math.max(1, Math.round(s * 0.016)), Math.max(2, Math.round(s * 0.04))); }
  }

  // A customer on a stool at an open counter, seen from behind (facing into the bar). seatH: from the feet up
  // to the seat. kind: eat (the head dips to the bowl), drink (a cup comes up), talk (turns to a neighbour), phone.
  function drawSeatedBack(g, sp, s, kind, f, ox, footY, seatH) {
    var u = f / 12, bw = sp.build || 1, seatY = footY - seatH;
    var lift = kind === 'eat' ? Math.max(0, Math.sin(u * TAU)) : kind === 'drink' ? Math.max(0, Math.sin(clamp((u - 0.2) * 2.2, 0, 1) * Math.PI)) : 0;
    var bow = kind === 'eat' ? 0.016 * s * (1 - lift) : kind === 'phone' ? 0.02 * s : 0;
    var turn = kind === 'talk' ? 0.012 * s * Math.sin(u * TAU) : 0, breath = 0.004 * s * Math.sin(u * TAU * 2);
    var wide = sp.coatType === 'puffer' ? 1.08 : sp.coatType === 'long' ? 1.05 : 1;
    var hipW = 0.074 * s * bw * wide, shW = 0.098 * s * bw * wide * (sp.sex === 'f' ? 0.92 : 1);
    var hipY = seatY - 0.012 * s, shY = hipY - 0.27 * s - breath;
    anchor(ox, footY);
    var pc = cloth(sp.pants || '#22222a', sp.pantsWeave || 'twill'), pd = cloth(shade(sp.pants || '#22222a', 0.62), sp.pantsWeave || 'twill'), cc = cloth(sp.coat, sp.weave), cd = cloth(shade(sp.coat, 0.74), sp.weave);
    // Calves hanging from the seat's front edge to the stool's footrest, and the heels of the shoes
    [-1, 1].forEach(function (sd) {
      var lx = ox + sd * 0.042 * s;
      fillPoly(g, [[lx - 0.02 * s, seatY + 0.03 * s], [lx + 0.02 * s, seatY + 0.03 * s], [lx + 0.017 * s, footY - 0.03 * s], [lx - 0.017 * s, footY - 0.03 * s]], pd);   // in the counter's shadow
      fillEllipse(g, lx, footY - 0.02 * s, 0.026 * s, 0.017 * s, sp.shoes || '#1a1a1a');
    });
    fillEllipse(g, ox, hipY + 0.01 * s, hipW * 1.22, 0.034 * s, pc);                  // sitting on the stool (spread on the seat)
    // Upper arms out to the elbows on the counter; for a drink, the right forearm comes up to the mouth
    var eY = shY + 0.14 * s, rx = kind === 'drink' ? lerp(ox + shW * 1.18, ox + shW * 0.55, lift) : ox + shW * 1.18, ry = kind === 'drink' ? lerp(eY, shY - 0.03 * s, lift) : eY;
    capsule(g, ox - shW * 0.86 + turn, shY + 0.03 * s, ox - shW * 1.18, eY, 0.027 * s, 0.023 * s, cd);
    capsule(g, ox + shW * 0.86 + turn, shY + 0.03 * s, rx, ry, 0.027 * s, 0.023 * s, cd);
    if (kind === 'drink' && lift > 0.2) fillEllipse(g, rx, ry - 0.02 * s, 0.02 * s, 0.026 * s, '#e8e0d0');   // the cup over the shoulder
    // The back: a coat or top from the hips to the shoulders, shaded at the sides, a seam, a hem
    var back = [[ox - hipW, hipY], [ox + hipW, hipY], [ox + shW + turn, shY + 0.03 * s], [ox + shW * 0.72 + turn, shY - 0.004 * s], [ox - shW * 0.72 + turn, shY - 0.004 * s], [ox - shW + turn, shY + 0.03 * s]];
    fillPoly(g, back, cc);
    fillPoly(g, [[ox - hipW, hipY], [ox - hipW * 0.55, hipY], [ox - shW * 0.55 + turn, shY + 0.03 * s], [ox - shW + turn, shY + 0.03 * s]], cd);
    line(g, ox + turn * 0.6, shY + 0.03 * s, ox, hipY - 0.01 * s, shade(sp.coat, 0.7));
    line(g, ox - hipW, hipY - 0.006 * s, ox + hipW, hipY - 0.006 * s, shade(sp.coat, 0.66));
    if (sp.coatType === 'apron' || sp.coatType === 'vest') { line(g, ox - shW * 0.5 + turn, shY + 0.01 * s, ox - hipW * 0.6, hipY - 0.04 * s, sp.apron || '#f0c040'); line(g, ox + shW * 0.5 + turn, shY + 0.01 * s, ox + hipW * 0.6, hipY - 0.04 * s, sp.apron || '#f0c040'); }
    if (sp.coatType === 'hoodie' && sp.head !== 'hood') fillEllipse(g, ox + turn, shY + 0.045 * s, shW * 0.55, 0.04 * s, cd);   // the hood, down
    if (sp.bag === 'backpack') { fillPoly(g, [[ox - shW * 0.6 + turn, shY + 0.05 * s], [ox + shW * 0.6 + turn, shY + 0.05 * s], [ox + hipW * 0.75, hipY - 0.04 * s], [ox - hipW * 0.75, hipY - 0.04 * s]], cloth(sp.bagColor || '#1a1a1a', 'canvas')); }
    // Collar, neck, and the head from behind (hair, or a hat or hood)
    fillPoly(g, [[ox - 0.05 * s + turn, shY - 0.006 * s], [ox + 0.05 * s + turn, shY - 0.006 * s], [ox + 0.04 * s + turn, shY + 0.022 * s], [ox - 0.04 * s + turn, shY + 0.022 * s]], cd);
    if (sp.scarf) fillPoly(g, [[ox - 0.056 * s + turn, shY - 0.012 * s], [ox + 0.056 * s + turn, shY - 0.012 * s], [ox + 0.05 * s + turn, shY + 0.024 * s], [ox - 0.05 * s + turn, shY + 0.024 * s]], cloth(sp.scarf, 'knit'));
    var hry = 0.068 * s, hrx = 0.058 * s, hcx = ox + turn * 1.6, hcy = shY - 0.032 * s - hry + bow;
    g.fillStyle = shade(sp.skin, 0.78); g.fillRect(Math.round(hcx - 0.017 * s), Math.round(hcy + hry * 0.4), Math.max(2, Math.round(0.034 * s)), Math.max(1, Math.round(shY - hcy - hry * 0.4) + 1));
    fillEllipse(g, hcx, hcy, hrx, hry, shade(sp.skin, 0.82));                      // (only the ears and the nape show)
    var hair = sp.hair || '#141010', hk = cloth(hair, 'strand'), style = sp.hairStyle || 'short', hc = sp.headColor || sp.coat;
    if (sp.head === 'hood') {
      fillEllipse(g, hcx, hcy - hry * 0.05, hrx * 1.28, hry * 1.22, cloth(hc, sp.weave));
      line(g, hcx, hcy - hry * 1.1, hcx, hcy + hry * 0.9, shade(hc, 0.7));
      fillPoly(g, [[hcx - hrx * 1.2, hcy + hry * 0.6], [hcx + hrx * 1.2, hcy + hry * 0.6], [hcx + shW * 0.7, shY + 0.02 * s], [hcx - shW * 0.7, shY + 0.02 * s]], cloth(hc, sp.weave));
    } else {
      if (style === 'long') fillPoly(g, [[hcx - hrx * 1.02, hcy - hry * 0.2], [hcx + hrx * 1.02, hcy - hry * 0.2], [hcx + hrx * 0.9, shY + 0.1 * s], [hcx - hrx * 0.9, shY + 0.1 * s]], hk);
      if (style !== 'none') fillEllipse(g, hcx, hcy - hry * 0.1, hrx * 1.04, hry * (style === 'short' ? 0.86 : 0.98), style === 'short' ? hair : hk);
      if (style === 'pony') capsule(g, hcx, hcy - hry * 0.2, hcx + turn, hcy + hry * 1.6, 0.022 * s, 0.012 * s, hk);
      if (style === 'bun') fillEllipse(g, hcx, hcy - hry * 0.75, hrx * 0.46, hry * 0.4, hair);
      if (style !== 'none') { g.fillStyle = mix(hair, '#ffffff', 0.16); span(g, Math.round(hcx - hrx * 0.4), Math.round(hcx + hrx * 0.3), Math.round(hcy - hry * 0.92)); }
      if (sp.head === 'fedora') {
        fillPoly(g, [[hcx - hrx * 0.95, hcy - hry * 0.35], [hcx - hrx * 0.75, hcy - hry * 1.3], [hcx + hrx * 0.75, hcy - hry * 1.3], [hcx + hrx * 0.95, hcy - hry * 0.35]], cloth(hc, 'canvas'));
        line(g, hcx - hrx * 1.5, hcy - hry * 0.38, hcx + hrx * 1.5, hcy - hry * 0.38, shade(hc, 0.8), Math.max(1, Math.round(s * 0.014)));
        line(g, hcx - hrx * 0.88, hcy - hry * 0.62, hcx + hrx * 0.88, hcy - hry * 0.62, '#4a2a22');
      }
      if (sp.head === 'cap') { fillEllipse(g, hcx, hcy - hry * 0.5, hrx * 1.06, hry * 0.6, cloth(hc, 'canvas')); line(g, hcx - hrx * 0.3, hcy - hry * 0.05, hcx + hrx * 0.3, hcy - hry * 0.05, shade(hc, 0.6)); }
      if (sp.head === 'beanie') { fillEllipse(g, hcx, hcy - hry * 0.5, hrx * 1.1, hry * 0.76, cloth(hc, 'knit')); fillPoly(g, [[hcx - hrx * 1.1, hcy - hry * 0.36], [hcx + hrx * 1.1, hcy - hry * 0.36], [hcx + hrx * 1.08, hcy - hry * 0.06], [hcx - hrx * 1.08, hcy - hry * 0.06]], cloth(shade(hc, 0.8), 'knit')); }
      if (sp.head === 'helmet') { fillEllipse(g, hcx, hcy - hry * 0.45, hrx * 1.2, hry * 0.82, hc); line(g, hcx - hrx * 0.5, hcy - hry * 1.05, hcx + hrx * 0.4, hcy - hry * 1.1, shade(hc, 1.25)); }
    }
  }

  // Road workers: talk, sign, shovel, drill (a jackhammer). 16 frames; the drill plays them fast.
  var WORK_LEAN = { shovel: 0.38, drill: 0.26 };
  function drawWorker(g, sp, s, kind, f, ox, oy) {
    var u = f / 16, o = { feet: [0.05, -0.04] };
    if (kind === 'talk') { o.armN = 0.4 + 0.5 * Math.max(0, Math.sin(u * TAU * 2)); o.foreN = 1.6 + 0.6 * Math.sin(u * TAU * 4); o.armF = -0.25; o.foreF = 0.7; o.headDy = 0.004 * s * Math.sin(u * TAU * 4); }
    if (kind === 'sign') {
      o.place = function (R) { return { nearT: [R.sx + 0.13 * s, R.sy + 0.09 * s + 0.004 * s * Math.sin(u * TAU)] }; };
      o.beforeNear = function (R) {
        var hd = R.nearHand;
        line(g, hd[0], hd[1] + 0.25 * s, hd[0], hd[1] - 0.32 * s, '#2a2a2a', Math.max(1, Math.round(s * 0.02)));
        fillEllipse(g, hd[0], hd[1] - 0.4 * s, 0.09 * s, 0.09 * s, '#c83a3a');
        fillEllipse(g, hd[0], hd[1] - 0.4 * s, 0.075 * s, 0.075 * s, '#b83434');
        fillPoly(g, [[hd[0] - 0.055 * s, hd[1] - 0.415 * s], [hd[0] + 0.055 * s, hd[1] - 0.415 * s], [hd[0] + 0.055 * s, hd[1] - 0.385 * s], [hd[0] - 0.055 * s, hd[1] - 0.385 * s]], '#f0f0f0');
      };
    }
    if (kind === 'shovel') {
      // A slow dig: push the blade in, lever it, lift the load and drop it
      var dig = Math.max(0, Math.sin(u * TAU)), lift = 0.1 * s * dig;
      o.lean = WORK_LEAN.shovel - 0.1 * dig; o.feet = [0.07, -0.06];
      var T = [ox + 0.1 * s, oy - 0.47 * s - lift * 0.4], Bl = [ox + 0.4 * s, oy - 0.02 * s - lift];
      o.place = function () { return { farT: T, nearT: [lerp(T[0], Bl[0], 0.32), lerp(T[1], Bl[1], 0.32)] }; };
      o.beforeNear = function () {
        line(g, T[0] - 0.02 * s, T[1] - 0.02 * s, Bl[0], Bl[1], '#6a4a2a', Math.max(1, Math.round(s * 0.02)));
        line(g, T[0] - 0.04 * s, T[1] - 0.025 * s, T[0] + 0.0 * s, T[1] - 0.015 * s, '#3a2a1a', Math.max(1, Math.round(s * 0.02)));
        fillPoly(g, [[Bl[0] - 0.02 * s, Bl[1] - 0.06 * s], [Bl[0] + 0.05 * s, Bl[1] - 0.07 * s], [Bl[0] + 0.07 * s, Bl[1] + 0.01 * s], [Bl[0] + 0.0 * s, Bl[1] + 0.02 * s]], '#7a8088');
        if (dig > 0.3) fillEllipse(g, Bl[0] + 0.03 * s, Bl[1] - 0.05 * s, 0.035 * s, 0.018 * s, '#5a4a3a');
      };
    }
    if (kind === 'drill') {
      // Hammering for 12 frames (the body and the tool shake), then a breather with the tool lifted a little
      var on = f < 12, jit = on ? (f % 2 ? 1 : 0) : 0, up = on ? 0 : Math.round(0.025 * s);
      o.lean = WORK_LEAN.drill; o.feet = [0.075, -0.06]; o.hipDy = jit; o.headDy = on ? (f % 4 < 2 ? 0.006 * s : 0) : 0;
      var tx = ox + 0.21 * s, hy = oy - 0.5 * s + jit - up;
      o.place = function () { return { nearT: [tx + 0.04 * s, hy + 0.005 * s], farT: [tx - 0.035 * s, hy + 0.005 * s] }; };
      o.beforeNear = function () {
        // the air hose, back down to the ground
        for (var k = 0; k <= 16; k++) { var t = k / 16; dot(g, lerp(tx - 0.03 * s, ox - 0.3 * s, t), lerp(hy + 0.08 * s, oy - 0.01 * s, t) + Math.sin(t * Math.PI) * 0.06 * s, '#141414', Math.max(1, Math.round(s * 0.018))); }
        var bw2 = 0.036 * s;
        fillPoly(g, [[tx - bw2, hy + 0.02 * s], [tx + bw2, hy + 0.02 * s], [tx + bw2, oy - 0.15 * s - up], [tx - bw2, oy - 0.15 * s - up]], '#a8502e');
        line(g, tx - bw2 * 0.4, hy + 0.03 * s, tx - bw2 * 0.4, oy - 0.16 * s - up, '#d07a4e');                     // a highlight down the body
        line(g, tx - bw2, hy + 0.12 * s, tx + bw2, hy + 0.12 * s, '#5a2a1a');
        fillPoly(g, [[tx - bw2 * 0.6, oy - 0.15 * s - up], [tx + bw2 * 0.6, oy - 0.15 * s - up], [tx + bw2 * 0.5, oy - 0.08 * s - up], [tx - bw2 * 0.5, oy - 0.08 * s - up]], '#4a4e54');
        line(g, tx, oy - 0.08 * s - up, tx, oy - up + jit, '#9aa0a8', Math.max(1, Math.round(s * 0.016)));        // the bit
        line(g, tx - 0.07 * s, hy, tx + 0.07 * s, hy, '#222222', Math.max(1, Math.round(s * 0.024)));            // the handles
        if (on) for (var d = 0; d < 5; d++) {                // dust and chips kicked up at the bit
          var px = tx + (((f * 37 + d * 53) % 13) - 6) * 0.014 * s, py = oy - (((f * 17 + d * 29) % 7) + 1) * 0.012 * s;
          dot(g, px, py, d % 2 ? '#c8bcae' : '#a89c8e', d < 2 ? Math.max(1, Math.round(s * 0.03)) : 1);
        }
      };
    }
    drawFigure(g, sp, s, 'idle', f, false, ox, oy, o);
  }

  // ---------- Sprite sheets: drawn once on first use, then cached ----------
  var sheets = {}, SEAT_DROP = 4;                      // diners are placed SEAT_DROP scene pixels below the counter top
  function frameCount(pose) { return gaitOf(pose) ? GAIT_FRAMES : /^(sit|back)-/.test(pose) ? 12 : /^work-/.test(pose) || IDLE_POSES[pose] ? 16 : 4; }
  // Canvases that are read back (getImageData) must say so, or the browser keeps them on the GPU and every
  // read stalls it
  function readableContext(c) { var g = null; try { g = c.getContext('2d', { willReadFrequently: true }); } catch (e) { g = null; } return g || c.getContext('2d'); }
  function finish(g, fw, fh, n, x0, plain) {
    // A soft dark outline (each edge pixel takes a darker copy of its neighbour), then the night row with its neon rim.
    // x0: where this strip starts on the sheet (a single frame can be finished on its own). plain: no outline
    // (the second style has none)
    x0 = x0 || 0;
    var w = fw * n, src = g.getImageData(x0, 0, w, fh), d = src.data, out = g.createImageData(w, fh), o = out.data, x, y, i;
    for (y = 0; y < fh; y++) for (x = 0; x < w; x++) {
      i = (y * w + x) * 4;
      if (d[i + 3]) { o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = 255; continue; }
      if (plain) continue;
      var best = -1;
      if (x > 0 && d[i - 1]) best = i - 4; else if (x < w - 1 && d[i + 7]) best = i + 4; else if (y > 0 && d[i - w * 4 + 3]) best = i - w * 4; else if (y < fh - 1 && d[i + w * 4 + 3]) best = i + w * 4;
      if (best >= 0) { o[i] = d[best] * 0.35; o[i + 1] = d[best + 1] * 0.35; o[i + 2] = d[best + 2] * 0.4; o[i + 3] = 230; }
    }
    if (GRADE) for (i = 0; i < o.length; i += 4) { if (!o[i + 3]) continue; o[i] *= GRADE[0]; o[i + 1] *= GRADE[1]; o[i + 2] *= GRADE[2]; }
    g.putImageData(out, x0, 0);
    var night = g.createImageData(w, fh), nn = night.data;
    for (y = 0; y < fh; y++) for (x = 0; x < w; x++) {
      i = (y * w + x) * 4;
      if (!o[i + 3]) continue;
      var up = y === 0 || !o[i - w * 4 + 3], side = x === 0 || x === w - 1 || !o[i - 1] || !o[i + 7];
      var k = up ? 0.6 : side ? 0.28 : 0;
      nn[i] = o[i] * 0.68 * (1 - k) + RIM[0] * k; nn[i + 1] = o[i + 1] * 0.68 * (1 - k) + RIM[1] * k; nn[i + 2] = o[i + 2] * 0.72 * (1 - k) + RIM[2] * k; nn[i + 3] = o[i + 3];
    }
    g.putImageData(night, x0, fh);
  }
  // A sheet is made empty, and each frame is drawn (and outlined) the first time it is shown. That spreads the
  // work over many frames, so a new pose never makes the animation stutter. eager: draw every frame now.
  // The third style's poses (street-body.js options): arms are [angle from straight down (+ forward), elbow bend]
  var TAU_ = Math.PI * 2;
  function bodyOpts(pose) {
    if (pose === 'walk' || pose === 'run' || pose === 'shield') return {};
    if (pose === 'tray') return { tray: true, arms: function () { return { n: [-8, 98] }; } };
    if (pose === 'wipe') return { stand: true, cloth: '#7ab0c8', n: 16, arms: function (t) { return { n: [46 + 16 * Math.sin(t * TAU_), 30] }; } };
    if (/^back-/.test(pose)) return { back: true, kind: pose.slice(5), seat: BACK_SEAT, n: 12 };
    if (/^sit-/.test(pose)) return { sit: true, n: 12, arms: function (t) { return { n: [62, 40 + (pose === 'sit-eat' ? 20 * Math.max(0, Math.sin(t * TAU_)) : 0)], f: [58, 40] }; } };
    if (pose === 'phone') return { stand: true, n: 1, arms: function () { return { n: [28, 105] }; } };
    if (pose === 'watch') return { stand: true, n: 1, arms: function () { return { n: [55, 95] }; } };
    if (pose === 'pockets') return { stand: true, n: 1, arms: function () { return { n: [-6, 12], f: [-6, 12] }; } };
    if (pose === 'talk') return { stand: true, n: 16, arms: function (t) { return { n: [22 + 12 * Math.sin(t * TAU_), 45 + 15 * Math.sin(t * TAU_ * 2)] }; } };
    return { stand: true, n: 1 };
  }
  function sheet(id, s, pose, umb, eager, clim) {
    var body = CAST[id] && CAST[id].body;
    if (body) {
      var bkey = id + '|' + s + '|' + pose + '|' + (clim || 'summer'), bsh = sheets[bkey];
      if (!bsh) {
        var bmk = SB.make(body, clim || 'summer', s / S * HD, bodyOpts(pose)), bc = document.createElement('canvas');
        bc.width = bmk.fw * bmk.n; bc.height = bmk.fh * 2;
        var bg = readableContext(bc);
        bsh = sheets[bkey] = { canvas: bc, g: bg, fw: bmk.fw, fh: bmk.fh, footX: bmk.footX, footY: bmk.footY, n: bmk.n, ready: new Uint8Array(bmk.n), cycle: bmk.cycle * S / HD, v2: true, body: true, hd: HD,
          paint: function (f) { bmk.paint(bg, f, f * bmk.fw); finish(bg, bmk.fw, bmk.fh, 1, f * bmk.fw, true); } };
      }
      if (eager) for (var bf = 0; bf < bsh.n; bf++) ensureFrame(bsh, bf);
      return bsh;
    }
    var v2 = CAST[id] && CAST[id].v2, moving = pose === 'walk' || pose === 'run' || pose === 'shield';
    if (v2) { pose = moving ? 'walk' : 'stand'; umb = false; }
    var key = id + '|' + s + '|' + pose + '|' + (umb ? 1 : 0), sh = sheets[key];
    if (!sh && v2) {                                      // the second style: its own painter, no outline
      var mk = window.StreetWalk.make(v2, s, pose === 'stand'), vc = document.createElement('canvas');
      vc.width = mk.fw * mk.n; vc.height = mk.fh * 2;
      var vg = readableContext(vc);
      sh = sheets[key] = { canvas: vc, g: vg, fw: mk.fw, fh: mk.fh, footX: mk.footX, footY: mk.footY, n: mk.n, ready: new Uint8Array(mk.n), cycle: mk.cycle, v2: true,
        paint: function (f) { mk.paint(vg, f, f * mk.fw); finish(vg, mk.fw, mk.fh, 1, f * mk.fw, true); } };
    }
    if (!sh) {
      var sp = CAST[id], n = frameCount(pose);
      var fw = Math.ceil(s * 1.25) + 8, fh = Math.ceil(s * 1.5) + 8, footX = Math.round(fw * 0.5), footY = fh - 6;
      var c = document.createElement('canvas'); c.width = fw * n; c.height = fh * 2;
      var g = readableContext(c);
      sh = sheets[key] = { canvas: c, g: g, fw: fw, fh: fh, footX: footX, footY: footY, n: n, ready: new Uint8Array(n),
        paint: function (f) {
          var ox = f * fw + footX;
          if (/^sit-/.test(pose)) drawSeated(g, sp, s, pose.slice(4), f, ox, footY - SEAT_DROP * S);   // the counter's top
          else if (/^back-/.test(pose)) drawSeatedBack(g, sp, s, pose.slice(5), f, ox, footY, BACK_SEAT * S);   // feet on the stool's rest
          else if (/^work-/.test(pose)) drawWorker(g, sp, s, pose.slice(5), f, ox, footY);
          else drawFigure(g, sp, s, pose, f, umb, ox, footY);
          finish(g, fw, fh, 1, f * fw);
        } };
    }
    if (eager) for (var f = 0; f < sh.n; f++) ensureFrame(sh, f);
    return sh;
  }
  function ensureFrame(sh, f) { if (sh.ready && !sh.ready[f]) { sh.ready[f] = 1; sh.paint(f); } }
  // How many milliseconds of new sprite frames may be painted in the current animation frame (draw() resets it).
  // When it runs out, the nearest frame already painted is shown instead, so a burst of new poses never stalls.
  var paintBudget = Infinity, clock = window.performance && performance.now ? function () { return performance.now(); } : function () { return Date.now(); };
  function frameFor(sh, f) {
    if (!sh.ready || sh.ready[f]) return f;
    if (paintBudget > 0) { var t0 = clock(); ensureFrame(sh, f); paintBudget -= clock() - t0; return f; }
    for (var d = 1; d < sh.n; d++) { var b = (f - d + sh.n) % sh.n, a = (f + d) % sh.n; if (sh.ready[b]) return b; if (sh.ready[a]) return a; }
    ensureFrame(sh, f); return f;                     // nothing painted yet: this one is needed now
  }

  // A dog (a brown mutt, facing right): 4 trotting frames, then standing ones: tail one way, tail the other,
  // and nose down, sniffing. At people density.
  var dogSheets = {};
  var DOG_IDLE = [4, 5, 4, 5, 4, 4, 6, 6, 6, 6, 4, 5, 4, 5];
  function dogSheet(Hd) {
    if (dogSheets[Hd]) return dogSheets[Hd];
    var fw = Math.ceil(Hd * 2.3) + 8, fh = Math.ceil(Hd * 1.6) + 6, c = document.createElement('canvas'); c.width = fw * 7; c.height = fh * 2;
    var g = readableContext(c), coat = '#7a5232', back = '#4e321e', belly = '#c09468';
    for (var f = 0; f < 7; f++) {
      var ox = f * fw + 6, oy = fh - 3, ll = Hd * 0.5, top = oy - ll - Hd * 0.42, bl = Hd * 1.25, step = f >= 4 ? 0 : [1, 0, -1, 0][f] * Hd * 0.12;
      var nose = f === 6 ? Hd * 0.3 : 0, wag = f === 5 ? 1 : 0;
      capsule(g, ox + Hd * 0.25, top + Hd * 0.3, ox + Hd * 0.25 - step, oy, Hd * 0.07, Hd * 0.05, back);
      capsule(g, ox + bl - Hd * 0.15, top + Hd * 0.3, ox + bl - Hd * 0.15 + step, oy, Hd * 0.07, Hd * 0.05, back);
      fillEllipse(g, ox + bl * 0.55, top + Hd * 0.22, bl * 0.55, Hd * 0.22, coat);
      fillEllipse(g, ox + bl * 0.5, top + Hd * 0.32, bl * 0.4, Hd * 0.1, belly);
      fillEllipse(g, ox + bl * 0.5, top + Hd * 0.08, bl * 0.42, Hd * 0.07, back);
      capsule(g, ox + Hd * 0.35, top + Hd * 0.3, ox + Hd * 0.35 + step, oy, Hd * 0.075, Hd * 0.055, coat);
      capsule(g, ox + bl - Hd * 0.3, top + Hd * 0.3, ox + bl - Hd * 0.3 - step, oy, Hd * 0.075, Hd * 0.055, coat);
      capsule(g, ox + Hd * 0.1, top + Hd * 0.1, ox - Hd * (0.12 + 0.1 * wag), top - Hd * (0.25 + 0.06 * (f % 2)), Hd * 0.06, Hd * 0.04, back);
      var hx = ox + nose * 0.4, hy = top + nose;      // the head, lowered when sniffing
      capsule(g, ox + bl * 0.95, top + Hd * 0.1, hx + bl * 1.05, hy - Hd * 0.2, Hd * 0.13, Hd * 0.11, coat);
      fillEllipse(g, hx + bl * 1.12, hy - Hd * 0.25, Hd * 0.2, Hd * 0.17, coat);
      fillEllipse(g, hx + bl * 1.3, hy - Hd * 0.2, Hd * 0.11, Hd * 0.08, belly);
      g.fillStyle = '#101010'; g.fillRect(Math.round(hx + bl * 1.39), Math.round(hy - Hd * 0.24), Math.max(1, Math.round(Hd * 0.06)), Math.max(1, Math.round(Hd * 0.06)));
      g.fillRect(Math.round(hx + bl * 1.16), Math.round(hy - Hd * 0.3), 1, 1);
      fillPoly(g, [[hx + bl * 1.02, hy - Hd * 0.34], [hx + bl * 1.08, hy - Hd * 0.55], [hx + bl * 1.14, hy - Hd * 0.36]], back);
      g.fillStyle = '#d84a3a'; g.fillRect(Math.round(ox + bl * 0.98), Math.round(top - Hd * 0.04), Math.max(1, Math.round(Hd * 0.12)), Math.max(1, Math.round(Hd * 0.05)));
    }
    finish(g, fw, fh, 7);
    return (dogSheets[Hd] = { canvas: c, fw: fw, fh: fh });
  }

  // ---------- Agents on the street ----------
  var thinned = false, agents = [], exits = [], door = { open: 0 }, scooterTimer = rand(6, 18), puffs = [];
  function sizeOf(a) { return Math.round(LANES[a.lane].h * S * (CAST[a.id].scale || 1)); }
  function makeAgent(id, lane, x, dir) {
    var sp = CAST[id];
    return { id: id, lane: lane, x: x, dir: dir, walkDir: dir, speed: rand(sp.speed[0], sp.speed[1]), dist: rand(0, 50), state: 'walk', timer: 0, alpha: 1, cooldown: rand(2, 6), active: true, phase: rand(0, 20), idle: null, glance: 0, climate: CLIM };
  }
  function spawn(lane, atEdge) {
    var dir = Math.random() < 0.5 ? 1 : -1, x = atEdge ? (dir > 0 ? -40 : W + 40) : rand(20, W - 20), r = Math.random(), h = LANES[lane].h;
    var taken = function (id) { return agents.some(function (o) { return o.active && o.id === id; }) || (diners || []).some(function (d) { return d.id === id; }); };
    if (!V2 && r < 0.12 && !taken('jacketWoman') && !taken('coatMan')) { var a = makeAgent('jacketWoman', lane, x, dir), b = makeAgent('coatMan', lane, x, dir); b.speed = a.speed; b.follow = a; b.gap = -h * 0.42; a.partner = b; agents.push(a, b); return; }
    if (!V2 && r < 0.2 && !taken('coatWoman') && !taken('kid')) { var pa = makeAgent('coatWoman', lane, x, dir), kd = makeAgent('kid', lane, x, dir); kd.speed = pa.speed; kd.follow = pa; kd.gap = h * 0.38; pa.partner = kd; agents.push(pa, kd); return; }
    // No two identical people on screen: only someone who is not already out (on the footpath, at the counter, or
    // about to come out of the bar)
    var busy = {}; agents.forEach(function (o) { if (o.active) busy[o.id] = 1; }); (diners || []).forEach(function (d) { busy[d.id] = 1; }); exits.forEach(function (e) { busy[e.id] = 1; });
    var free = WALKERS.filter(function (id) { return !busy[id]; }); if (!free.length) return;
    var ag = makeAgent(pick(free), lane, x, dir);
    if (CAST[ag.id].dog) ag.dog = { x: ag.x + dir * h * 0.8, dist: 0, dir: dir };
    agents.push(ag);
  }
  LANES.forEach(function (lane, li) { for (var i = 0; i < lane.max; i++) spawn(li, false); });
  function sheltering() { var n = 0; agents.forEach(function (a) { if (a.shelter && a.active) n++; }); return n; }
  function laneCount(li) { var n = 0; agents.forEach(function (a) { if (a.active && a.lane === li && !a.follow) n++; }); return n; }

  // ---------- Standing about ----------
  // What someone does when they stop: pairs talk; alone, people wait, check a watch or a phone, put their
  // hands in their pockets, look up at the signs, or smoke (not in the rain). Umbrellas keep one hand busy.
  function chooseIdle(a, raining) {
    if (a.partner && a.partner.active) return Math.random() < 0.75 ? 'talk' : 'look';
    if (a.umb) return pick(['idle', 'look', 'idle', 'watch']);
    var list = ['idle', 'pockets', 'watch', 'phone', 'look', 'phone'];
    if (!raining && !CAST[a.id].body) list.push('smoke', 'smoke');   // (the third style has no cigarette yet)
    return pick(list);
  }
  function stopAgent(a, pose, time, state) {
    if (CAST[a.id].glide) return;                       // the skateboarder rolls on
    if (CAST[a.id].v2 && !CAST[a.id].body) pose = 'idle';   // the second style has one standing pose
    a.state = state || 'look'; a.timer = time; a.idle = pose; a.walkDir = a.dir; a.glance = 0;
    var p = a.partner;
    if (p && p.active) {
      if (pose === 'talk') { a.dir = p.x > a.x ? 1 : -1; p.idle = 'talk'; }
      else p.idle = p.umb ? 'idle' : pick(['idle', 'look', 'pockets']);
    }
  }
  // Where a smoker's cigarette is, and when they breathe out (matches the 16-frame smoking loop)
  function smokeSpot(a, t) {
    var s = sizeOf(a) / S, L = LANES[a.lane], v = (Math.floor((t + a.phase) * 6) % 16) / 16;
    var atMouth = v > 0.24 && v < 0.42, exhale = v > 0.52 && v < 0.78;
    return {
      exhale: exhale, lit: atMouth,
      x: exhale ? a.x + a.dir * 0.08 * s : a.x + a.dir * (atMouth ? 0.12 : 0.22) * s,
      y: exhale ? L.y - 0.82 * s : L.y - (atMouth ? 0.79 : 0.52) * s
    };
  }
  function smokeFrom(a, dt, t) {
    var sp = smokeSpot(a, t);
    a.smokeAcc = (a.smokeAcc || 0) + dt * (sp.exhale ? 16 : 3);
    while (a.smokeAcc >= 1) {
      a.smokeAcc -= 1;
      puffs.push({ x: sp.x, y: sp.y, vx: sp.exhale ? a.dir * rand(4, 9) : rand(-0.6, 0.6), vy: sp.exhale ? rand(-3, -0.5) : rand(-7, -4), age: 0, life: sp.exhale ? rand(1.4, 2.4) : rand(1.1, 1.9), lane: a.lane, big: sp.exhale });
    }
  }

  // ---------- People inside the diner, and the road workers ----------
  var diners = [];
  // P.stools: customers sit outside on stools at an open counter, backs to the street (feet at P.stoolFoot, the
  // seat BACK_SEAT higher). Otherwise (P.seats) they sit inside at the counter, side on.
  var STOOLS = P.stools || null, STOOL_FOOT = P.stoolFoot || 264, BACK_SEAT = P.stoolSeat || 11;
  var SEATS = STOOLS ? STOOLS.map(function (x) { return [x, 1]; }) : P.seats || [[214, 1], [226, -1], [256, 1], [270, -1], [288, 1], [358, 1], [370, -1], [434, 1], [450, -1]];
  function diner(i, x, dir, id, kind, fresh) { return { stool: i, x: x, dir: dir, id: id, kind: kind, clock: rand(0, 10), pace: rand(2.6, 4.2), pause: rand(0, 2), back: !!STOOLS, alpha: fresh ? 0 : 1, state: fresh ? 'come' : 'sit', stay: fresh ? rand(70, 170) : rand(15, 160), served: !fresh, climate: CLIM }; }
  SEATS.forEach(function (seat, i) { if (Math.random() < (STOOLS ? 0.6 : 0.72)) diners.push(diner(i, seat[0], seat[1], pick(DINERS), pick(['eat', 'eat', 'drink', 'talk', 'phone']), false)); });
  if (STOOLS && !diners.length) diners.push(diner(1, STOOLS[1], 1, pick(DINERS), 'eat', false));
  // The counter's life (with stools): people who go in through the door sit down a little later and order; a small
  // printer prints the ticket, the server brings the food, and when they have eaten they come back out of the door.
  var arrivals = [], orders = [];
  function freeStool() { if (!STOOLS) return -1; var free = []; STOOLS.forEach(function (x, i) { if (!diners.some(function (d) { return d.stool === i; })) free.push(i); }); return free.length ? free[Math.floor(Math.random() * free.length)] : -1; }
  function wantDiners(h) { return h >= 19 && h < 23 ? 7 : h >= 12 && h < 14.5 ? 5 : h >= 1 && h < 6 ? 1 : 3; }   // how full the counter is through the day
  var waiter = { x: WAITER.x0 + 12, dir: 1, dist: 0, state: 'walk', timer: 0, pose: 'idle' };
  var workers = P.workers || [{ id: 'workerA', x: 566, dir: 1, kind: 'talk' }, { id: 'workerB', x: 590, dir: -1, kind: 'shovel' }, { id: 'workerC', x: 626, dir: -1, kind: 'sign' }];

  function update(dt, t, env) {
    if (env.climate) CLIM = env.climate;               // what people put on when they set out (those already out keep theirs)
    var raining = env.rain > 0.3;
    door.open = Math.max(0, door.open - dt);
    for (var i = 0; i < agents.length; i++) {
      var a = agents[i];
      if (!a.active) continue;
      var sp = CAST[a.id];
      a.umb = raining && !!(sp.body ? (sp.body[a.climate] || sp.body.summer).umbrella : sp.umbrella) && a.state !== 'shield';
      if (a.follow) {
        var L = a.follow;
        a.state = L.state; a.alpha = L.alpha; a.active = L.active;
        if (L.state === 'look' || L.state === 'wait') {
          // Standing with the person they walk with: stay put, and face them when talking
          if (!a.idle) a.idle = 'idle';
          a.dir = a.idle === 'talk' ? (L.x > a.x ? 1 : -1) : (L.walkDir || L.dir);
          continue;
        }
        a.idle = null; a.dir = L.dir;
        var target = L.x + L.dir * a.gap; a.dist += Math.abs(target - a.x); a.x = target;
        continue;
      }
      if (a.cooldown > 0) a.cooldown -= dt;
      if ((a.state === 'walk' || a.state === 'run' || a.state === 'shield') && SHELTER && !a.umb && !a.follow && !a.dog && !sp.glide && a.lane <= 1 && env.rain > 0.45 && a.cooldown <= 0 &&
          a.x > SHELTER[0] && a.x < SHELTER[1] && Math.abs(a.x - (DOOR.x + DOOR.w / 2)) > DOOR.w * 0.7 && sheltering() < 4 && Math.random() < dt * 2) {
        a.dir = a.walkDir; stopAgent(a, pick(['phone', 'look', 'idle']), 999, 'wait'); a.shelter = true; continue;
      }
      if (a.state === 'walk' || a.state === 'run' || a.state === 'shield' || a.state === 'ride') {
        if (a.state !== 'ride') {
          if (env.rain > 0.5 && !sp.umbrella && sp.runs && a.state === 'walk') a.state = sp.bag === 'tote' ? 'shield' : 'run';
          if (env.rain < 0.3 && (a.state === 'run' || a.state === 'shield')) a.state = 'walk';
        }
        var v = a.speed * (a.state === 'run' || a.state === 'shield' ? 1.9 : 1);
        a.x += a.dir * v * dt; a.dist += v * dt;
        if (a.state === 'walk' && a.cooldown <= 0) {
          var doorC = DOOR.x + DOOR.w / 2;
          if (a.lane === 0 && !a.dog && !sp.v2 && Math.abs(a.x - doorC) < 2 && Math.random() < 0.35) { a.state = 'enter'; a.timer = 0.4; door.open = 1.8; a.cooldown = 99; }
          for (var k = 0; k < SPOTS.length && a.state === 'walk' && a.lane <= 1; k++) {
            var spot = SPOTS[k];
            if (Math.abs(a.x - spot.x) < 1.5) {
              if (spot.kind === 'look' && Math.random() < 0.3) stopAgent(a, a.partner ? 'talk' : (a.umb ? 'look' : pick(['look', 'look', 'pockets'])), rand(spot.time[0], spot.time[1]));
              else if (spot.kind === 'wait' && Math.random() < 0.45) stopAgent(a, raining ? (a.umb ? 'idle' : 'phone') : pick(['smoke', 'phone', 'watch']), rand(spot.time[0], spot.time[1]), 'wait');
              a.cooldown = 3;
            }
          }
          // ...or anywhere, now and then
          if (a.state === 'walk' && a.cooldown <= 0 && a.x > 24 && a.x < W - 24 && Math.random() < dt * 0.035) { stopAgent(a, chooseIdle(a, raining), rand(4, 9)); a.cooldown = 8; }
        }
        if (a.x < -60 || a.x > W + 60) a.active = false;
      } else if (a.state === 'look' || a.state === 'wait') {
        a.timer -= dt;
        if (a.shelter && env.rain < 0.3 && a.timer > 8) a.timer = rand(1, 7);      // the rain eases: off they go, one by one
        // A glance one way and back while standing about
        if (!a.partner && a.idle !== 'phone' && a.idle !== 'smoke' && a.idle !== 'talk') {
          if (a.glance > 0) { a.glance -= dt; if (a.glance <= 0) a.dir = a.walkDir; }
          else if (Math.random() < dt * 0.18) { a.glance = rand(0.8, 1.8); a.dir = -a.walkDir; }
        }
        if (a.idle === 'smoke') smokeFrom(a, dt, t);
        if (a.timer <= 0) { a.state = 'walk'; a.dir = a.walkDir; a.glance = 0; a.idle = null; a.cooldown = rand(5, 9); if (!a.partner && !a.shelter && Math.random() < 0.25) a.dir = -a.dir; a.shelter = false; }
      } else if (a.state === 'enter') {
        a.timer -= dt;
        if (a.timer <= 0) { a.alpha -= dt / 0.7; if (a.alpha <= 0) { a.active = false; if (STOOLS && freeStool() >= 0) arrivals.push({ id: a.id, at: t + rand(2, 4) }); else exits.push({ id: a.id, at: t + rand(10, 30) }); } }
      } else if (a.state === 'exit') {
        a.alpha += dt / 0.7;
        if (a.alpha >= 1) { a.alpha = 1; a.state = 'walk'; a.cooldown = 6; }
      }
      if (a.dog) {
        // The dog keeps to its own pace and turns round to follow; it never slides sideways or backwards
        var want = a.x + a.dir * LANES[a.lane].h * 0.85, moving = a.state === 'walk' || a.state === 'run', gap = want - a.dog.x;
        var vmax = (a.speed * (a.state === 'run' ? 1.9 : 1) * 1.7 + 6) * dt, step = Math.max(-vmax, Math.min(vmax, gap * Math.min(1, dt * 3)));
        if (Math.abs(gap) > 1.5) a.dog.dir = gap > 0 ? 1 : -1; else if (!moving) a.dog.dir = a.dir;
        a.dog.x += step; a.dog.dist += Math.abs(step); a.dog.still = Math.abs(step) < 0.02 * dt * 60 && !moving;
      }
    }
    agents = agents.filter(function (a) { return a.active; });
    for (var e = exits.length - 1; e >= 0; e--) {
      if (t >= exits[e].at) {
        if ((V2 || BODY) && !CAST[exits[e].id].v2 && !CAST[exits[e].id].body) {               // someone from the bar steps out: as one of the new cast
          var out = {}; agents.forEach(function (o) { if (o.active) out[o.id] = 1; });
          var freeV = WALKERS.filter(function (id) { return !out[id]; });
          if (!freeV.length) { exits.splice(e, 1); continue; }
          exits[e].id = pick(freeV);
        }
        var ex = makeAgent(exits[e].id, 0, DOOR.x + DOOR.w / 2, Math.random() < 0.5 ? 1 : -1);
        ex.state = 'exit'; ex.alpha = 0; ex.cooldown = 8; door.open = 1.8; agents.push(ex); exits.splice(e, 1);
      }
    }
    var busy = env.crowd === undefined ? 1 : env.crowd;                           // how busy the street is at this hour
    if (!thinned) {                                     // the first time the hour is known: start with the right crowd
      thinned = true;
      for (var tl = 0; tl < LANES.length; tl++) {
        if (LANES[tl].ride) continue;
        var keep = Math.max(1, Math.round(LANES[tl].max * busy)), mine = agents.filter(function (a) { return a.lane === tl && !a.follow; });
        while (mine.length > keep) { var gone = mine.splice(Math.floor(Math.random() * mine.length), 1)[0]; gone.active = false; if (gone.partner) gone.partner.active = false; }
      }
      agents = agents.filter(function (a) { return a.active; });
    }
    for (var li = 0; li < LANES.length; li++) if (laneCount(li) < Math.max(LANES[li].max ? 1 : 0, Math.round(LANES[li].max * busy)) && Math.random() < dt * 0.6 * Math.max(0.4, busy)) spawn(li, true);
    scooterTimer -= dt;
    if (scooterTimer <= 0) {
      scooterTimer = rand(18, 40);
      var lane = pick(RIDE), dir = Math.random() < 0.5 ? 1 : -1, sc = makeAgent('rider', lane, dir > 0 ? -40 : W + 40, dir);
      sc.state = 'ride'; agents.push(sc);
    }
    // Cigarette smoke drifts with the wind and fades
    var drift = (env.wind || 6) * 0.25;
    for (var q = puffs.length - 1; q >= 0; q--) { var pf = puffs[q]; pf.age += dt; pf.x += (pf.vx + drift) * dt; pf.y += pf.vy * dt; pf.vx *= Math.pow(0.5, dt); pf.vy = pf.vy * Math.pow(0.6, dt) - 2 * dt; if (pf.age >= pf.life) puffs.splice(q, 1); }
    if (STOOLS) {
      var hour = env.hour === undefined ? 20 : env.hour;
      if (diners.length + arrivals.length < wantDiners(hour) && Math.random() < dt * 0.02) { arrivals.push({ id: pick(DINERS), at: t + 1.5 }); door.open = 1.8; }   // someone slips in
      for (var ar = arrivals.length - 1; ar >= 0; ar--) {
        if (t < arrivals[ar].at) continue;
        var si = freeStool(), nid = arrivals[ar].id; arrivals.splice(ar, 1);
        if (si < 0) { exits.push({ id: nid, at: t + rand(4, 10) }); continue; }
        var nd = diner(si, STOOLS[si], 1, DINERS.indexOf(nid) >= 0 ? nid : pick(DINERS), pick(['talk', 'phone']), true); diners.push(nd); orders.push(nd);
      }
      for (var di = diners.length - 1; di >= 0; di--) {
        var d = diners[di];
        if (d.state === 'come') { d.alpha = Math.min(1, d.alpha + dt / 0.8); if (d.alpha >= 1) d.state = 'sit'; }
        else if (d.state === 'sit') { if (d.served) d.stay -= dt * (diners.length > wantDiners(hour) + 1 ? 2 : 1); if (d.stay <= 0) d.state = 'go'; }
        else { d.alpha -= dt / 0.8; if (d.alpha <= 0) { diners.splice(di, 1); exits.push({ id: d.id, at: t + 0.6 }); } }
      }
      // The server takes the oldest ticket: walks to that customer, sets the food down, and goes back to wiping
      if (orders.length && waiter.state !== 'serve') {
        var od = orders[0], tx = Math.max(WAITER.x0, Math.min(WAITER.x1, od.x));
        if (diners.indexOf(od) < 0) orders.shift();
        else if (Math.abs(waiter.x - tx) < 1.5) { waiter.state = 'serve'; waiter.timer = 1.4; waiter.pose = 'idle'; }
        else { waiter.state = 'walk'; waiter.dir = tx > waiter.x ? 1 : -1; waiter.x += waiter.dir * 14 * dt; waiter.dist += 14 * dt; }
      } else if (waiter.state === 'serve') {
        waiter.timer -= dt;
        if (waiter.timer <= 0) { var sv = orders.shift(); if (sv) { sv.served = true; sv.kind = pick(['eat', 'eat', 'drink']); } waiter.state = 'walk'; }
      }
    }
    // The waiter walks behind the counter, stopping now and then to wipe it down or wait
    if (orders.length || waiter.state === 'serve') { /* serving, above */ }
    else if (waiter.state === 'walk') {
      waiter.x += waiter.dir * 9 * dt; waiter.dist += 9 * dt;
      if (waiter.x > WAITER.x1) waiter.dir = -1;
      if (waiter.x < WAITER.x0) waiter.dir = 1;
      if (Math.random() < dt * 0.25) { waiter.state = 'stop'; waiter.timer = rand(2, 4.5); waiter.pose = Math.random() < 0.6 ? 'wipe' : 'idle'; }
    } else { waiter.timer -= dt; if (waiter.timer <= 0) { waiter.state = 'walk'; if (Math.random() < 0.4) waiter.dir = -waiter.dir; } }
  }

  function poseOf(a) {
    if (a.state === 'ride') return 'ride';
    if (a.state === 'look' || a.state === 'wait') return a.idle || (a.state === 'wait' ? 'phone' : 'look');
    if (a.state === 'enter') return 'idle';
    if (a.state === 'run' || a.state === 'shield') return a.state;
    return 'walk';
  }
  function blit(ctx, sh, frame, row, x, y, dir, alpha, flipY) {
    if (alpha <= 0.01) return;
    frame = frameFor(sh, frame);
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(dir, flipY ? -0.5 : 1);
    var k = 1 / (sh.hd || 1);                         // (a sheet drawn at twice the density goes in at half size: one of its pixels per pixel of a 2x canvas)
    ctx.drawImage(sh.canvas, frame * sh.fw, row * sh.fh, sh.fw, sh.fh, -sh.footX * k, -sh.footY * k, sh.fw * k, sh.fh * k);
    ctx.restore();
  }
  function drawSprite(ctx, sh, frame, x, y, dir, alpha, env) {
    blit(ctx, sh, frame, 0, x, y, dir, alpha, false);
    blit(ctx, sh, frame, 1, x, y, dir, alpha * env.lights, false);
  }

  // Everything on the people canvas (twice the scene's density), back to front.
  // opts.skipRide leaves out the road (draw those with drawRiders); opts.skipWorkers leaves out the road
  // workers (draw them with drawWorkers), so a scene can put its own layers in between.
  function draw(ctx, env, opts) {
    opts = opts || {};
    paintBudget = 6;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.imageSmoothingEnabled = false;
    var ox6 = env.offset(DINER_DEPTH) * S;
    // Inside the bar, seen through its windows: the server (and, without stools, the customers at the counter)
    ctx.save(); ctx.beginPath();
    WIN.forEach(function (w) { ctx.rect((w.x + env.offset(DINER_DEPTH)) * S, w.y * S, w.w * S, (COUNTER - w.y) * S); });
    ctx.clip();
    var dS = (P.dinerSize || 36) * S;
    if (!STOOLS) diners.forEach(function (d) {
      var sh = sheet(d.id, dS, 'sit-' + d.kind, false, false, d.climate);
      var cycle = (env.t + d.clock) % (d.pace + d.pause), frame = cycle < d.pace ? Math.floor(cycle / d.pace * 12) % 12 : 0;
      drawSprite(ctx, sh, frame, Math.round(d.x * S + ox6), Math.round((COUNTER + SEAT_DROP) * S), d.dir, 1, env);
      light(ctx, opts, dinerGlow(d, env));
    });
    var wS = (P.waiterSize || 36) * S, wsh = sheet(BODY ? 'b_waiter' : 'waiter', wS, waiter.state === 'walk' ? 'tray' : waiter.pose, false);
    var wf = wsh.body ? (waiter.state === 'walk' ? Math.floor(waiter.dist / (wsh.cycle / S) * wsh.n) % wsh.n : Math.floor(env.t * 6) % wsh.n) : waiter.state === 'walk' ? Math.floor(waiter.dist / (wS / S * strideOf(GAITS.walk)) * GAIT_FRAMES) % GAIT_FRAMES : Math.floor(env.t * 6) % 16;
    drawSprite(ctx, wsh, wf, Math.round(waiter.x * S + ox6), Math.round(WAITER.y * S), waiter.dir, 1, env);
    if (STOOLS && WIN.length) {                         // order tickets on a rail, and the printer that prints them
      var w0 = WIN[0], rx = (w0.x + env.offset(DINER_DEPTH)) * S, ry = (w0.y + 3) * S;
      ctx.fillStyle = '#2a2a2e'; ctx.fillRect(rx + 4, ry, Math.min(orders.length + 2, 8) * 8 + 4, 1);
      for (var oi = 0; oi < Math.min(orders.length, 7); oi++) { ctx.fillStyle = '#f2ece0'; ctx.fillRect(rx + 8 + oi * 8, ry + 1, 5, 8); ctx.fillStyle = '#9a8a7a'; ctx.fillRect(rx + 9 + oi * 8, ry + 3, 3, 1); ctx.fillRect(rx + 9 + oi * 8, ry + 5, 2, 1); }
      var py = (COUNTER - 6) * S;
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(rx + 4, py, 14, 9); ctx.fillStyle = '#e8e4dc'; ctx.fillRect(rx + 7, py - 2 - (orders.length && (env.t % 2) < 1 ? 2 : 0), 8, 3);
      ctx.fillStyle = orders.length && (env.t % 0.8) < 0.4 ? '#ff4a3a' : '#5a2a2a'; ctx.fillRect(rx + 14, py + 3, 2, 2);
    }
    WIN.forEach(function (w) { ctx.fillStyle = 'rgba(170,225,235,0.06)'; ctx.fillRect((w.x + env.offset(DINER_DEPTH)) * S, w.y * S, w.w * S, (COUNTER - w.y) * S); });
    ctx.restore();
    // Outside: customers on the stools, backs to the street, facing the server. A phone lights up in front of
    // its owner (so behind the head, from here), and steam rises from the bowls of those eating.
    if (STOOLS) diners.forEach(function (d) {
      light(ctx, opts, dinerGlow(d, env));
      var sh = sheet(d.id, dS, 'back-' + d.kind, false, false, d.climate);
      var cycle = (env.t + d.clock) % (d.pace + d.pause), frame = cycle < d.pace ? Math.floor(cycle / d.pace * 12) % 12 : 0;
      var bx = Math.round(d.x * S + ox6), fy = Math.round(STOOL_FOOT * S);
      drawSprite(ctx, sh, frame, bx, fy, 1, d.alpha === undefined ? 1 : d.alpha, env);
      if (d.kind !== 'eat' || d.alpha < 1) return;
      var hy = fy - Math.round(BACK_SEAT * S + 0.46 * dS);
      ctx.fillStyle = 'rgba(230,235,240,0.3)';
      for (var k = 0; k < 3; k++) ctx.fillRect(bx + 4 + k * 2 + Math.round(Math.sin(env.t * 2 + k + d.x) * 1.5), hy - 2 - k * 3 - Math.floor((env.t * 6 + k * 4) % 6), 1, 2);
    });
    // Bowls with a wisp of steam in front of the people eating
    if (!STOOLS) diners.forEach(function (d) {
      if (d.kind !== 'eat') return;
      var bx = Math.round((d.x + d.dir * 6) * S + ox6), by = COUNTER * S - 1;
      fillEllipse(ctx, bx, by - 2, 6, 3, '#e8e0d0'); ctx.fillStyle = '#b03a2a'; ctx.fillRect(bx - 5, by - 3, 10, 1);
      ctx.fillStyle = 'rgba(230,235,240,0.35)';
      for (var k = 0; k < 3; k++) ctx.fillRect(bx - 2 + k * 2 + Math.round(Math.sin(env.t * 2 + k + d.x) * 1.5), by - 7 - k * 3 - Math.floor((env.t * 6 + k * 4) % 6), 1, 2);
    });
    if (!opts.skipWorkers) drawWorkers(ctx, env, opts);
    for (var li = 0; li < LANES.length; li++) { if (opts.skipRide && LANES[li].ride) continue; drawLane(ctx, li, env, opts); }
    // Cigarette smoke, in soft little pixel clouds
    puffs.forEach(function (p) {
      var k = p.age / p.life, sz = Math.round((p.big ? 3 : 2) + k * (p.big ? 9 : 5)), al = (p.big ? 0.3 : 0.2) * (1 - k) * Math.min(1, k * 8);
      if (al < 0.01) return;
      var x = Math.round((p.x + env.offset(LANES[p.lane].depth)) * S), y = Math.round(p.y * S);
      ctx.fillStyle = 'rgba(216,204,190,' + al + ')';
      ctx.fillRect(x - (sz >> 1), y - (sz >> 2), sz, sz >> 1 || 1); ctx.fillRect(x - (sz >> 2), y - (sz >> 1), sz >> 1 || 1, sz);
    });
  }

  // Road workers, hidden below the top of the barrier (each stands at its own depth wk.y, so one can be down
  // in a trench with only its shoulders showing). The jackhammer plays at 12 frames a second.
  function drawWorkers(ctx, env, opts) {
    // (the clip is everything above the barrier's top, wherever the canvas has been moved to)
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.beginPath(); ctx.rect(-1e5, -1e5, 2e5, 1e5 + BARRIER.top * S); ctx.clip();
    var kS = (P.workerSize || 30) * S, ox8 = env.offset(WORKER_DEPTH) * S;
    if (env.crewOff) { ctx.restore(); return; }                // nobody on the dig in the small hours
    workers.forEach(function (wk, i) {
      var kind = env.tea ? 'talk' : wk.kind;                        // tea break: tools down, a chat
      var sh = sheet(wk.id, kS, 'work-' + kind, false), fps = kind === 'drill' ? 12 : 6;
      drawSprite(ctx, sh, Math.floor(env.t * fps + i * 5) % 16, Math.round(wk.x * S + ox8), Math.round((wk.y || WORKER_Y) * S), wk.dir, 1, env);
      light(ctx, opts, workerGlow(wk, i, env));
    });
    ctx.restore();
  }
  // The road's lanes only (scooters), without clearing the canvas
  function drawRiders(ctx, env, opts) {
    ctx.imageSmoothingEnabled = false;
    for (var li = 0; li < LANES.length; li++) if (LANES[li].ride) drawLane(ctx, li, env, opts);
  }
  // opts.light(ctx, point): called right after each person is drawn, with their own small light (see glowPoints),
  // so a scene can add its glow there: in front of them, and behind anyone drawn later
  function light(ctx, opts, p) { if (p && opts && opts.light) opts.light(ctx, p); }
  function drawLane(ctx, li, env, opts) {
    var L = LANES[li], ox = env.offset(L.depth) * S;
    for (var i = 0; i < agents.length; i++) {
      var a = agents[i];
      if (a.lane !== li) continue;
      var s = sizeOf(a), pose = poseOf(a), sh = sheet(a.id, s, pose, a.umb && pose !== 'ride', false, a.climate);
      // Walking and running frames follow the distance walked, so planted feet stay put on the pavement
      var gt = gaitOf(pose), stride = gt ? (s / S) * strideOf(gt) : 1;
      var frame = gt ? Math.floor(a.dist / stride * GAIT_FRAMES) % GAIT_FRAMES : sh.n === 16 ? Math.floor((env.t + a.phase) * 6) % 16 : Math.floor(env.t * 1.2 + i) % sh.n;
      if (sh.v2) frame = sh.cycle ? Math.floor(a.dist / (sh.cycle / S) * sh.n) % sh.n : Math.floor((env.t + a.phase) * 3) % sh.n;
      var x = Math.round(a.x * S) + ox, y = L.y * S, alpha = a.alpha * L.fade;
      ctx.fillStyle = 'rgba(0,0,0,' + (0.3 * alpha) + ')';
      var sw = Math.round(s * 0.2); ctx.fillRect(x - sw, y, sw * 2, 1); ctx.fillRect(x - Math.round(sw * 0.7), y + 1, Math.round(sw * 1.4), 1);
      if (!env.puddles) blit(ctx, sh, frame, 0, x, y + 2, a.dir, alpha * 0.2 * env.wet, true);
      else {                                          // mirrored only where they stand in a puddle
        var pools = env.puddles(x, y);
        if (pools.length) {
          ctx.save(); ctx.beginPath(); pools.forEach(function (e) { ctx.moveTo(e[0] + e[2], e[1]); ctx.ellipse(e[0], e[1], e[2], e[3], 0, 0, TAU); }); ctx.clip();
          blit(ctx, sh, frame, 0, x, y + 2, a.dir, alpha * 0.4, true); ctx.restore();
        }
      }
      drawSprite(ctx, sh, frame, x, y, a.dir, alpha, env);
      if (a.dog) {
        var Hd = Math.max(8, Math.round(s * 0.26)), ds = dogSheet(Hd), df = a.dog.still ? DOG_IDLE[Math.floor((env.t + a.phase) * 3) % DOG_IDLE.length] : Math.floor(a.dog.dist / (s / S * 0.25)) % 4, dx = Math.round(a.dog.x * S) + ox;
        var dd = a.dog.dir || a.dir;
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(dx, y); ctx.scale(dd, 1);
        ctx.drawImage(ds.canvas, df * ds.fw, 0, ds.fw, ds.fh, -Math.round(ds.fw * 0.5), -ds.fh + 3, ds.fw, ds.fh);
        ctx.globalAlpha = alpha * env.lights; ctx.drawImage(ds.canvas, df * ds.fw, ds.fh, ds.fw, ds.fh, -Math.round(ds.fw * 0.5), -ds.fh + 3, ds.fw, ds.fh);
        ctx.restore();
        ctx.fillStyle = 'rgba(20,20,24,' + (0.85 * alpha) + ')';
        var hx = x + a.dir * Math.round(s * 0.1), hy = y - Math.round(s * 0.42), ex2 = dx + dd * Math.round(Hd * 0.75), ey = y - Math.round(Hd * 0.75);
        for (var st = 0; st <= 24; st++) { var tt = st / 24; ctx.fillRect(Math.round(hx + (ex2 - hx) * tt), Math.round(hy + (ey - hy) * tt + Math.sin(tt * Math.PI) * 4), 1, 1); }
      }
      if (pose === 'phone' && env.lights > 0.2) { ctx.fillStyle = 'rgba(127,243,255,' + (0.9 * alpha) + ')'; ctx.fillRect(x + a.dir * Math.round(s * 0.1), y - Math.round(s * 0.72), 2, 3); }
      light(ctx, opts, agentGlow(a, env));
    }
  }

  // Light the people add to the scene (on the light canvas, at the scene's density)
  function drawLight(g, env) {
    if (door.open > 0 && env.lights > 0.05) {
      var dx = DOOR.x + env.offset(DINER_DEPTH), k = Math.min(1, door.open) * env.lights;
      g.fillStyle = 'rgba(255,200,120,' + (0.35 * k) + ')'; g.fillRect(dx, DOOR.top, DOOR.w, D.ground - DOOR.top);
      var pool = g.createRadialGradient(dx + DOOR.w / 2, D.ground + 8, 0, dx + DOOR.w / 2, D.ground + 8, 40);
      pool.addColorStop(0, 'rgba(255,190,110,' + (0.3 * k) + ')'); pool.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = pool; g.fillRect(dx + DOOR.w / 2 - 40, D.ground - 32, 80, 80);
    }
    agents.forEach(function (a) {
      if (poseOf(a) !== 'ride' || env.lights < 0.05) return;
      var L = LANES[a.lane], s = sizeOf(a) / S, x = a.x + env.offset(L.depth), lx = x + a.dir * s * 0.3, ly = L.y - s * 0.4;
      var beam = g.createLinearGradient(lx, ly, lx + a.dir * 70, L.y);
      beam.addColorStop(0, 'rgba(255,243,196,' + (0.35 * env.lights) + ')'); beam.addColorStop(1, 'rgba(255,243,196,0)');
      g.fillStyle = beam; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + a.dir * 70, L.y - 2); g.lineTo(lx + a.dir * 70, L.y + 6); g.closePath(); g.fill();
    });
  }
  // The people's own small lights, as points in these (half-size) units: phones, scooter lamps, cigarettes,
  // helmet lamps. kind: phone, lamp, ember or helmet; ride: on a scooter (the road); w: width in units
  function agentGlow(a, env) {
    var L = LANES[a.lane], s = sizeOf(a) / S, x = Math.round(a.x + env.offset(L.depth)), pose = poseOf(a);
    if (pose === 'phone') return { x: x + a.dir * Math.round(s * 0.1), y: L.y - Math.round(s * 0.72), c: '#7ff3ff', kind: 'phone' };
    if (pose === 'ride') return { x: x + a.dir * Math.round(s * 0.3), y: L.y - Math.round(s * 0.4), c: '#fff3c4', kind: 'lamp', ride: true };
    if (pose === 'smoke') { var sm = smokeSpot(a, env.t); if (!sm.exhale) return { x: Math.round(sm.x + env.offset(L.depth)), y: Math.round(sm.y), c: sm.lit ? '#ffb050' : '#ff6a2a', kind: 'ember' }; }
    return null;
  }
  // Helmet lamps, blinking, where each worker's head is (leaning forward over a shovel or a drill)
  function workerGlow(wk, i, env) {
    var kh = P.workerSize || 30;
    if (env.crewOff) return null;
    if (((env.t + i * 0.7) % 1.6) >= 1.1) return null;
    var ln = WORK_LEAN[wk.kind] || 0, wy = (wk.y || WORKER_Y) - Math.round(kh * (0.9 - (1 - Math.cos(ln)) * 0.5));
    if (wy >= BARRIER.top) return null;
    return { x: Math.round(wk.x + env.offset(WORKER_DEPTH) + wk.dir * kh * (0.04 + Math.sin(ln) * 0.34)), y: wy, w: 2, c: '#6dff8f', kind: 'helmet' };
  }
  function dinerGlow(d, env) {
    if (d.kind !== 'phone') return null;
    if (d.back) return { x: Math.round(d.x + env.offset(DINER_DEPTH)), y: Math.round(STOOL_FOOT - BACK_SEAT - 0.4 * (P.dinerSize || 36)), c: '#7ff3ff', kind: 'phone' };
    return { x: Math.round(d.x + d.dir * 3 + env.offset(DINER_DEPTH)), y: COUNTER - 8, c: '#7ff3ff', kind: 'phone' };
  }
  function glowPoints(env) {
    var out = [], push = function (p) { if (p) out.push(p); };
    agents.forEach(function (a) { push(agentGlow(a, env)); });
    workers.forEach(function (wk, i) { push(workerGlow(wk, i, env)); });
    diners.forEach(function (d) { push(dinerGlow(d, env)); });
    return out;
  }
  // The same lights as dots, for a scene that blurs its own glow canvas (scene density)
  function drawGlow(g, env) { glowPoints(env).forEach(function (p) { g.fillStyle = p.c; g.fillRect(p.x, p.y, p.w || 1, 1); }); }

  // ---------- People inside: backlit silhouettes, one activity per room, 4 frames each (also the bus passengers) ----------
  // roomActor(g, kind, f, x, y, h, c, lc): x the middle, y the floor (or the seat for 'sit' kinds), h a standing
  // person's height, c the silhouette colour, lc the colour of any light they hold (a screen, a stove's steam).
  var ROOM_KINDS = ['water', 'iron', 'stretch', 'read', 'type', 'cook', 'pace', 'dance', 'fold', 'paint', 'bulb', 'guitar', 'tea',
    'cashier', 'browse', 'vendor', 'tech', 'clerk', 'bus-read', 'bus-phone', 'bus-doze', 'bus-stand'];
  // In the third style, the people inside are the street's own people (who: 0..1 picks one, and the way they face),
  // in their summer clothes, doing the same things, with what they hold in their hands.
  var ROOM_POSE = {
    water: { stand: true, arms: function () { return { n: [72, 8], f: [12, 20] }; } },
    iron: { stand: true, arms: function (t) { return { n: [28 + 14 * Math.sin(t * TAU_), 52], f: [18, 30] }; } },
    stretch: { stand: true, arms: function (t) { return t < 0.5 ? { n: [172, 0], f: [166, 0] } : { n: [150, 25], f: [140, 25] }; } },
    read: { sit: true, arms: function () { return { n: [25, 85], f: [20, 80] }; } },
    type: { sit: true, arms: function (t) { return { n: [35, 55 + 8 * (Math.floor(t * 4) % 2)], f: [30, 55] }; } },
    cook: { stand: true, arms: function (t) { return { n: [34 + 8 * Math.cos(t * TAU_), 56], f: [10, 20] }; } },
    pace: { arms: function () { return { n: [25, 150] }; } },
    dance: { arms: function (t) { return t < 0.5 ? { n: [150, 30], f: [40, 40] } : { n: [40, 40], f: [150, 30] }; } },
    fold: { stand: true, arms: function (t) { return { n: [60, 30 - 14 * (Math.floor(t * 4) % 2)], f: [55, 30] }; } },
    paint: { stand: true, arms: function (t) { return { n: [100 + 10 * Math.sin(t * TAU_), 10], f: [12, 20] }; } },
    bulb: { stand: true, arms: function () { return { n: [178, 0], f: [12, 15] }; } },
    guitar: { sit: true, arms: function (t) { return { n: [48, 22 + 10 * Math.sin(t * TAU_)], f: [72, 60] }; } },
    tea: { stand: true, arms: function (t) { return t < 0.5 ? { n: [20, 140] } : { n: [22, 70] }; } },
    cashier: { stand: true, arms: function (t) { return { n: [45, 40 + 14 * Math.abs(Math.sin(t * TAU_))], f: [40, 40] }; } },
    browse: { stand: true, arms: function (t) { return { n: [100, Math.floor(t * 4) === 2 ? 12 : 0], f: [10, 15] }; } },
    vendor: { stand: true, arms: function () { return { n: [55, 35], f: [50, 35] }; } },
    tech: { stand: true, arms: function (t) { return { n: [122, 15 + 6 * Math.sin(t * TAU_)], f: [10, 15] }; } },
    clerk: { stand: true, arms: function (t) { return t < 0.5 ? { n: [25, 150] } : { n: [42, 42], f: [38, 40] }; } },
    'bus-read': { sit: true, arms: function () { return { n: [25, 85] }; } }, 'bus-phone': { sit: true, arms: function () { return { n: [30, 100] }; } },
    'bus-doze': { sit: true }, 'bus-stand': { stand: true, arms: function () { return { n: [176, 0] }; } }
  };
  var roomSprites = {}, SHOPKINDS = /^(cashier|browse|vendor|tech|clerk)$/;
  function roomBody(g, kind, f, x, y, h, lc, who) {
    var cast = SB.cast(), adults = SHOPKINDS.test(kind) ? cast.filter(function (d) { return d.age !== 'kid'; }) : cast;
    var def = adults[Math.floor(who * 997) % adults.length], hu = Math.max(8, Math.round(h / 2 * (def.age === 'kid' ? 0.72 : 1) * 2) / 2), fr = f % 4;
    var key = def.id + '|' + kind + '|' + fr + '|' + hu, spr = roomSprites[key];
    if (!spr) {
      var base = ROOM_POSE[kind] || { stand: true }, opts = { stand: base.stand, sit: base.sit, arms: base.arms, n: 4 };
      var mk = SB.make(def, 'summer', hu, opts), cv = document.createElement('canvas'); cv.width = mk.fw; cv.height = mk.fh;
      var info = mk.paint(cv.getContext('2d'), fr, 0, 0);
      spr = roomSprites[key] = { c: cv, fx: mk.footX, fy: mk.footY, hn: info.hands ? info.hands.n : [mk.footX, mk.footY - h * 0.5], hf: info.hands && info.hands.f ? info.hands.f : null, sit: !!base.sit };
    }
    var dir = SHOPKINDS.test(kind) || (who * 7) % 1 < 0.5 ? 1 : -1, feet = spr.sit ? y + Math.round(h * 0.27) : y;
    var hn = [spr.hn[0] - spr.fx, spr.hn[1] - spr.fy], hf = spr.hf ? [spr.hf[0] - spr.fx, spr.hf[1] - spr.fy] : hn, q = h / 44;
    g.save(); g.translate(Math.round(x), Math.round(feet)); g.scale(dir, 1);
    var R = function (x0, y0, w, hh, col) { g.fillStyle = col; g.fillRect(Math.round(x0), Math.round(y0), Math.max(1, Math.round(w)), Math.max(1, Math.round(hh))); };
    var L = function (x0, y0, x1, y1, w, col) { var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); g.fillStyle = col; for (var i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n - w / 2), Math.round(y0 + (y1 - y0) * i / n), w, w); };
    // behind them: a chair's back, a shelf, an easel
    if (kind === 'read' || kind === 'type') { R(-0.2 * h, -0.62 * h, 0.05 * h, 0.62 * h, '#4a3022'); R(-0.2 * h, -0.62 * h, 0.05 * h, 1, '#6a4a32'); }
    if (kind === 'browse') { R(0.3 * h, -0.98 * h, 2, 0.98 * h, '#5a4030'); for (var sv = 0; sv < 3; sv++) { var sy = -0.9 * h + sv * 0.3 * h; R(0.3 * h, sy, 0.2 * h, 1, '#5a4030'); for (var bk = 0; bk < 5; bk++) R(0.31 * h + bk * 2 * q, sy - 4 * q, 1.5 * q, 4 * q, ['#a83a3a', '#3a6a8a', '#d8b040', '#4a7a4a', '#e8e0d0'][(bk + sv) % 5]); } }
    if (kind === 'paint') { L(hn[0] + 0.1 * h, 0, hn[0] + 0.13 * h, -0.78 * h, Math.max(1, Math.round(q)), '#6a4a2a'); R(hn[0] + 0.05 * h, -0.72 * h, 0.2 * h, 0.26 * h, '#e8e2d4'); R(hn[0] + 0.08 * h, -0.66 * h, 2 * q, 2 * q, '#c84a3a'); R(hn[0] + 0.14 * h, -0.6 * h, 3 * q, 2 * q, '#3a6aa8'); }
    g.drawImage(spr.c, -spr.fx, -spr.fy);
    // in their hands, or in front of them
    switch (kind) {
      case 'water': R(hn[0] - 1, hn[1] - 1, 4 * q, 3 * q, '#4a7a8a'); L(hn[0] + 3 * q, hn[1], hn[0] + 6 * q, hn[1] - 2 * q, 1, '#4a7a8a'); if (fr % 2) R(hn[0] + 6 * q, hn[1] + 1, 1, 2, lc); break;
      case 'iron': R(hn[0] - 0.22 * h, hn[1] + 2, 0.45 * h, 2, '#c8c0b0'); L(hn[0] - 0.1 * h, hn[1] + 3, hn[0] + 0.05 * h, 0, 1, '#6a6a6a'); R(hn[0] - 2, hn[1] - 1, 4 * q, 2, '#d8d8dc'); break;
      case 'read': R(hn[0] - 1, hn[1] - 0.1 * h, 0.07 * h, 0.1 * h, lc); break;
      case 'type': R(hn[0] - 0.14 * h, hn[1] + 1, 0.42 * h, 2, '#6a4a32'); L(hn[0] + 0.24 * h, hn[1] + 2, hn[0] + 0.24 * h, 0, 1, '#4a3022'); R(hn[0] + 0.02 * h, hn[1] - 0.12 * h, 0.1 * h, 0.12 * h, lc); break;
      case 'cook': R(hn[0] - 0.06 * h, hn[1] + 0.04 * h, 0.3 * h, -hn[1] - 0.04 * h, '#8a8a86'); R(hn[0] - 0.06 * h, hn[1] + 0.04 * h, 0.3 * h, 1, '#b8b8b2'); R(hn[0] - 0.02 * h, hn[1] - 0.03 * h, 0.14 * h, 0.06 * h, '#3a3a3e'); for (var s2 = 0; s2 < 3; s2++) R(hn[0] + s2 * 3 + ((fr + s2) % 2), hn[1] - 0.08 * h - s2 * 3 - fr, 1, 2, lc); break;
      case 'pace': case 'clerk': case 'bus-phone': if (kind !== 'clerk' || fr < 2) R(hn[0] - 1, hn[1] - 2, 2, 3, lc); break;
      case 'fold': R(Math.min(hn[0], hf[0]) - 1, Math.min(hn[1], hf[1]), Math.abs(hn[0] - hf[0]) + 3, Math.max(2, 0.05 * h), '#d8c8b0'); break;
      case 'bulb': R(hn[0] - 1, hn[1] - 3, 3, 3, fr % 2 ? lc : '#c8c0a8'); break;
      case 'guitar': g.fillStyle = '#8a5a2a'; g.beginPath(); g.ellipse(Math.round(hn[0] - 0.04 * h), Math.round(hn[1] + 0.03 * h), Math.max(2, 0.08 * h), Math.max(2, 0.06 * h), 0, 0, Math.PI * 2); g.fill(); L(hn[0] - 0.04 * h, hn[1] + 0.02 * h, hf[0], hf[1], 1, '#4a3020'); break;
      case 'tea': R(hn[0] - 1, hn[1] - 2, 3, 3, '#e8e4dc'); if (fr < 2) R(hn[0], hn[1] - 5 - fr, 1, 2, lc); break;
      case 'vendor': case 'bus-read': R(hn[0] - 1, hn[1] - 0.08 * h, 0.14 * h, 0.1 * h, '#e8e2d4'); break;
      case 'tech': R(hn[0] + 0.04 * h, hn[1] - 0.12 * h, 0.2 * h, 0.14 * h, lc); break;
      case 'browse': if (fr === 2) R(hn[0] - 1, hn[1] - 4 * q, 3, 6 * q, '#a83a3a'); break;
    }
    if (kind === 'cashier' || kind === 'clerk') { R(0.06 * h, -0.5 * h, 0.55 * h, 0.5 * h, '#5a4a3a'); R(0.06 * h, -0.5 * h, 0.55 * h, 2, '#7a6a58'); if (kind === 'cashier') R(0.3 * h, -0.62 * h, 0.12 * h, 0.1 * h, lc); }
    g.restore();
  }
  function roomActor(g, kind, f, x, y, h, c, lc, who) {
    if (BODY && who !== undefined) { roomBody(g, kind, f, x, y, h, lc, who); return; }
    var R = function (x0, y0, w, hh, col) { g.fillStyle = col || c; g.fillRect(Math.round(x0), Math.round(y0), Math.max(1, Math.round(w)), Math.max(1, Math.round(hh))); };
    var L = function (x0, y0, x1, y1, w, col) { var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); g.fillStyle = col || c; for (var i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n - w / 2), Math.round(y0 + (y1 - y0) * i / n), w, w); };
    var D = function (cx, cy, r, col) { g.fillStyle = col || c; for (var yy = -r; yy <= r; yy++) { var w = Math.round(Math.sqrt(r * r - yy * yy + r * 0.5)); g.fillRect(Math.round(cx - w), Math.round(cy + yy), w * 2 + 1, 1); } };
    var aw = Math.max(2, Math.round(h * 0.085)), hr = Math.max(3, Math.round(h * 0.1));
    var sit = /^(read|type|guitar|bus-read|bus-phone|bus-doze)$/.test(kind);
    var hipY = sit ? y - h * 0.08 : y - h * 0.47, shY = hipY - h * 0.3, shX = x, headY = shY - hr * 1.3;
    // the body: legs, torso, head (arms come with each activity)
    if (!sit) { var st = kind === 'pace' ? Math.round(Math.sin(f / 4 * Math.PI * 2) * h * 0.06) : 0; L(x - h * 0.03 - st, hipY, x - h * 0.05 - st, y, aw + 2); L(x + h * 0.03 + st, hipY, x + h * 0.05 + st, y, aw + 2); }
    else { L(x, hipY, x + h * 0.22, hipY, aw + 1); L(x + h * 0.22, hipY, x + h * 0.24, hipY + h * 0.2, aw); }
    var lean = kind === 'browse' || kind === 'tech' ? h * 0.04 : kind === 'bus-doze' ? -h * 0.02 : 0;
    g.fillStyle = c; for (var ty = 0; ty <= hipY - shY; ty++) { var k = ty / (hipY - shY), wd = h * (0.24 - 0.05 * k) - (ty < 2 ? 2 - ty : 0) * 2; g.fillRect(Math.round(x - wd / 2 + lean * (1 - k)), Math.round(shY + ty), Math.round(wd), 1); }
    var hx = x + lean + (kind === 'bus-doze' ? h * 0.03 : 0), hy = headY + (kind === 'bus-doze' ? hr * 0.6 : 0) + (kind === 'read' && f === 2 ? 1 : 0);
    D(hx, hy, hr);
    var sx = shX + lean, sy = shY + 2, u = f / 4, sw = Math.sin(u * Math.PI * 2);
    var arm = function (dx, dy) { L(sx, sy, sx + dx * h, sy + dy * h, aw); return [sx + dx * h, sy + dy * h]; };
    switch (kind) {
      case 'water': { var hd = arm(0.22, 0.12); R(hd[0] - 1, hd[1] - 2, h * 0.12, h * 0.07); L(hd[0] + h * 0.1, hd[1], hd[0] + h * 0.2, hd[1] + h * 0.06 + (f % 2), 2); if (f % 2) R(hd[0] + h * 0.22, hd[1] + h * 0.14, 1, 2, lc); R(x + h * 0.26, y - h * 0.12, h * 0.1, h * 0.12); D(x + h * 0.31, y - h * 0.2, Math.round(h * 0.07)); break; }
      case 'iron': { R(x + h * 0.05, hipY + h * 0.02, h * 0.4, 2); L(x + h * 0.4, hipY + 2, x + h * 0.35, y, 2); var ih = arm(0.18 + 0.08 * sw, 0.26); R(ih[0] - 2, ih[1] - 3, h * 0.1, h * 0.05); break; }
      case 'stretch': { var up = f % 2 === 0; arm(up ? -0.06 : -0.2, up ? -0.42 : -0.3); arm(up ? 0.06 : 0.2, up ? -0.42 : -0.34); break; }
      case 'read': { R(x - h * 0.14, y - h * 0.45, h * 0.08, h * 0.45); R(x - h * 0.12, y - h * 0.08, h * 0.42, h * 0.08); arm(0.2, 0.1); var bk = arm(0.24, 0.06); R(bk[0] - 2, bk[1] - h * 0.1, h * 0.06 + (f === 3 ? 2 : 0), h * 0.12, lc); break; }
      case 'type': { R(x + h * 0.25, hipY - h * 0.02, h * 0.36, 2); L(x + h * 0.5, hipY, x + h * 0.5, y + h * 0.1, 2); R(x + h * 0.32, hipY - h * 0.15, h * 0.16, h * 0.13, lc); arm(0.28, 0.12 + (f % 2) * 0.02); break; }
      case 'cook': { R(x + h * 0.18, hipY - h * 0.02, h * 0.3, h * 0.47 + 2); var sp2 = arm(0.22 + 0.04 * Math.cos(u * Math.PI * 2), 0.18 + 0.03 * sw); L(sp2[0], sp2[1], sp2[0] + 2, sp2[1] + h * 0.1, 1); R(x + h * 0.22, hipY - h * 0.1, h * 0.16, h * 0.08); for (var s2 = 0; s2 < 3; s2++) R(x + h * 0.26 + s2 * 3 + ((f + s2) % 2), hipY - h * 0.16 - s2 * 3 - f, 1, 2, lc); break; }
      case 'pace': { arm(0.06, -0.08); R(hx + hr * 0.4, hy - 1, 2, 4, lc); arm(-0.06, 0.2); break; }
      case 'dance': { arm(f % 2 ? 0.2 : -0.1, f % 2 ? -0.3 : -0.18); arm(f % 2 ? -0.12 : 0.22, f % 2 ? -0.1 : -0.3); break; }
      case 'fold': { var o2 = f % 2 ? 0.2 : 0.1; arm(o2, 0.12); arm(-o2 * 0.4, 0.12); R(x + h * (o2 - 0.04), sy + h * 0.1, h * o2 * 0.9 + 2, h * 0.05, lc); break; }
      case 'paint': { L(x + h * 0.3, y, x + h * 0.36, y - h * 0.7, 2); R(x + h * 0.22, y - h * 0.65, h * 0.2, h * 0.24, lc); arm(0.2 + 0.03 * sw, -0.02 + 0.04 * sw); break; }
      case 'bulb': { L(x - h * 0.1, y, x, y - h * 0.3, 2); L(x + h * 0.1, y, x, y - h * 0.3, 2); var bh = arm(0.04, -0.36); D(bh[0], bh[1] - 2, 2, f % 2 ? lc : c); break; }
      case 'guitar': { R(x - h * 0.14, y - h * 0.4, h * 0.08, h * 0.4); D(x + h * 0.14, hipY - h * 0.08, Math.round(h * 0.07)); L(x + h * 0.14, hipY - h * 0.08, x + h * 0.36, hipY - h * 0.26, 2); arm(0.14, 0.04 + 0.03 * sw); arm(0.3, -0.12); break; }
      case 'tea': { var th = arm(f < 2 ? 0.1 : 0.14, f < 2 ? -0.08 : 0.06); R(th[0], th[1] - 3, 3, 3); if (f < 2) R(th[0] + 1, th[1] - 6 - f, 1, 2, lc); break; }
      case 'cashier': { R(x - h * 0.2, hipY + h * 0.02, h * 0.62, h * 0.47, lc === c ? c : c); var ch = arm(0.18 + 0.1 * Math.abs(sw), 0.08); if (f % 2) R(ch[0], ch[1], 3, 1, '#ff4a3a'); break; }
      case 'browse': { R(x + h * 0.24, y - h * 0.95, 2, h * 0.95); R(x + h * 0.26, y - h * 0.7, h * 0.12, 2); R(x + h * 0.26, y - h * 0.45, h * 0.12, 2); var bb = arm(0.24, -0.18 - (f === 2 ? 0.04 : 0)); if (f >= 2) R(bb[0] - 1, bb[1] - 4, 3, 7, lc); break; }
      case 'vendor': { arm(0.18, 0.1); arm(0.2, 0.06); R(x + h * 0.14, sy + h * 0.02 - (f === 3 ? 2 : 0), h * 0.18, h * 0.16, lc); break; }
      case 'tech': { R(x + h * 0.22, y - h * 0.8, h * 0.2, h * 0.16, lc); var th2 = arm(0.22, -0.14 + 0.03 * sw); R(th2[0], th2[1], 2, 2); break; }
      case 'clerk': { R(x - h * 0.2, hipY + h * 0.02, h * 0.62, h * 0.47); arm(0.04, -0.06); R(hx + hr * 0.5, hy - 1, 2, 4, lc); arm(0.2 + 0.06 * sw, 0.02 - 0.06 * Math.abs(sw)); break; }
      case 'bus-read': { var rb = arm(0.18, 0.08); R(rb[0] - 1, rb[1] - h * 0.1, h * 0.07, h * 0.1, lc); break; }
      case 'bus-phone': { var pb = arm(0.14, 0.04); R(pb[0], pb[1] - 3, 2, 3, lc); break; }
      case 'bus-doze': { arm(0.08, 0.2); break; }
      case 'bus-stand': { arm(0.04, -0.4); R(sx + h * 0.02, sy - h * 0.42, 4, 1); break; }
    }
  }

  // ---------- Proposed new people (shown on the character sheet; not on the street until approved) ----------
  var PROPOSED = {
    tallThin: { sex: 'm', scale: 1.14, build: 0.82, coat: '#2a3a4a', coatType: 'jacket', weave: 'twill', pants: '#1a1a22', shoes: '#2a1a14', skin: '#c89a80', hair: '#2a1a14', hairStyle: 'short', cup: true, speed: [10, 12] },
    shortStout: { sex: 'm', scale: 0.86, build: 1.34, belly: 0.9, coat: '#6a4a2a', coatType: 'jacket', weave: 'cord', pants: '#2a2a30', pantsWeave: 'twill', shoes: '#1a1a1a', skin: '#a8765a', hair: '#141010', hairStyle: 'none', beard: '#2a1a14', head: 'cap', headColor: '#2a3a5a', speed: [6, 8] },
    teen: { sex: 'f', scale: 0.86, build: 0.84, coat: '#c84a6a', coatType: 'hoodie', weave: 'fleece', pants: '#2a3448', pantsWeave: 'denim', shoes: '#e8e8e8', skin: '#e0b49a', hair: '#3a2010', hairStyle: 'pony', phones: '#e8e8e8', speed: [9, 11], runs: true },
    elder: { sex: 'f', scale: 0.9, build: 0.96, stoop: 1, coat: '#5a4a6a', coatType: 'long', coatLen: 0.6, weave: 'tweed', pants: '#2a2a30', shoes: '#2a1a14', skin: '#d8b49a', hair: '#d8d0c8', hairStyle: 'bun', cane: true, speed: [4, 6] },
    bigBeard: { sex: 'm', scale: 1.08, build: 1.26, belly: 0.4, coat: '#3a4a3a', coatType: 'puffer', weave: 'canvas', pants: '#2a2a2a', shoes: '#1a1a1a', skin: '#e0b49a', hair: '#6a4a2a', hairStyle: 'short', beard: '#6a4a2a', head: 'beanie', headColor: '#8a2a2a', speed: [8, 10] },
    office: { sex: 'f', scale: 1.0, build: 0.9, coat: '#2e2e34', coatType: 'long', coatLen: 0.44, weave: 'twill', shirt: '#e8e0d8', pants: '#2e2e34', shoes: '#1a1a1a', skin: '#8a5a40', hair: '#141010', hairStyle: 'bun', cup: true, speed: [10, 12] },
    courier: { sex: 'm', scale: 0.98, build: 1.02, coat: '#2a6a8a', coatType: 'jacket', weave: 'canvas', pants: '#2a2a30', shoes: '#e8e8e8', skin: '#6a4430', hair: '#141010', hairStyle: 'short', head: 'cap', headColor: '#2a6a8a', bag: 'box', bagColor: '#c8a060', speed: [10, 12] },
    tourist: { sex: 'm', scale: 1.02, build: 1.1, belly: 0.3, coat: '#d8c8a0', coatType: 'jacket', weave: 'canvas', pants: '#6a6a5a', shoes: '#c8c8d0', skin: '#f0c8a8', hair: '#c8a060', hairStyle: 'short', head: 'cap', headColor: '#e8e0d0', bag: 'backpack', bagColor: '#3a5a6a', speed: [6, 8] },
    jogger: { sex: 'f', scale: 1.0, build: 0.86, coat: '#2a8a7a', coatType: 'jacket', weave: 'fleece', pants: '#1a1a22', shoes: '#ff6a5a', skin: '#a8765a', hair: '#141010', hairStyle: 'pony', phones: '#1a1a1a', runs: true, speed: [14, 16] },
    longHair: { sex: 'f', scale: 1.08, build: 0.88, coat: '#7a6a4a', coatType: 'long', coatLen: 0.56, belt: true, weave: 'check', pants: '#1a1a22', shoes: '#4a2a1a', skin: '#e0b49a', hair: '#6a3a1a', hairStyle: 'long', scarf: '#b8483a', umbrella: '#5a7a3a', speed: [9, 11] }
  };
  Object.keys(PROPOSED).forEach(function (id) { CAST[id] = PROPOSED[id]; });

  // For the scene: open the bar's door (a sign pointed at), have the nearest walker stop and look up, and where the
  // walkers are (in scene pixels, for the pigeons)
  function openDoor() { door.open = Math.max(door.open, 1.2); }
  function lookUp(x) {
    var best = null;
    agents.forEach(function (a) { if (a.active && !a.follow && a.state === 'walk' && !CAST[a.id].glide && LANES[a.lane] && !LANES[a.lane].ride && Math.abs(a.x - x) < 70 && (!best || Math.abs(a.x - x) < Math.abs(best.x - x))) best = a; });
    if (best) { best.dir = x > best.x ? 1 : -1; stopAgent(best, 'look', rand(1.6, 3)); best.cooldown = 4; }
  }
  function walkers() { var out = []; agents.forEach(function (a) { if (a.active && LANES[a.lane] && !LANES[a.lane].ride) out.push({ x: a.x * S, lane: a.lane, dog: a.dog ? a.dog.x * S : null }); }); return out; }
  return { update: update, draw: draw, openDoor: openDoor, lookUp: lookUp, walkers: walkers, roomActor: roomActor, roomKinds: ROOM_KINDS, proposed: Object.keys(PROPOSED), castOf: function (id) { return CAST[id]; }, drawRiders: drawRiders, drawWorkers: drawWorkers, drawLight: drawLight, drawGlow: drawGlow, glowPoints: glowPoints, sheet: sheet, dogSheet: dogSheet, cast: Object.keys(CAST), scale: S };
};
