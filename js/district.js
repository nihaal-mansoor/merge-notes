/*
  Home page C: Merge Notes. A whole street is the home page, and every shop's name is a link to a page.

  Everything is painted by this script when the page loads, at 1280 x 720: seven buildings under an open sky,
  a hazy skyline behind them, and in front a paved footpath, a road, power poles and wires, a street lamp and
  a railing. Shop names are the navigation: FEED (a 24-hour grocery: the RSS feed), ARTICLES (a bookshop),
  NEWSLETTER (a newsstand), NIHAAL'S (the bar: about me), DATA (an electronics shop full of charts: Dubai
  data), CONTACT (a phone shop) and NETWORK (LinkedIn). The bar has the MERGE NOTES bulb sign on a steel frame
  on its roof. A subway entrance is being dug into the footpath ("coming up": the next articles).

  The view stays still. Every building still stands at its own depth, so ?cam=-1 or ?cam=1 shows the street
  from one side (near things slide more than far ones, side walls show, the ground tilts in perspective).

  Light: every surface has its own colour, lit by the time of day (olive-gold at dusk, mauve at night, pale in
  the day); windows, shops, lanterns, signs and lamps give off their own light. Halos are a tight glow and a
  wide soft one, laid on the street itself, so people walk in front of the shops' light; only the lamp's beam,
  the work light and the people's own little lights are in front of them. Painted words never glow. When it
  rains, puddles fill and mirror the street; they dry after.

  Clicking a link steps into that shop: the view moves in on the sign while the street dissolves, in big
  pixels, into the next page's colour. Coming back, the street steps out of the shop again.

  For speed: each part is painted once, only for the times of day that are actually shown; people are drawn
  every frame, the rest of the street every second frame, the halos every fourth.

  Preview with ?time=18:20 (dusk), ?time=23:00, ?time=12:30, ?weather=rain|snow|clear, ?speed=600.
*/
(function () {
  'use strict';

  var root = document.getElementById('district');
  var stage = root && root.querySelector('.stage');
  if (!stage) return;

  // ---------- The menu in the corner and the newsletter box (these work without the canvas) ----------
  var hud = document.getElementById('hud'), hudBtn = hud && hud.querySelector('.hud-toggle');
  function setHud(open) { if (!hud) return; hud.classList.toggle('is-open', open); hudBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  if (hudBtn) {
    hud.classList.add('is-ready'); setHud(false);
    hudBtn.addEventListener('click', function () { setHud(!hud.classList.contains('is-open')); });
    document.addEventListener('click', function (ev) { if (!hud.contains(ev.target)) setHud(false); });
  }
  var pop = null;
  function closePop(back) { if (!pop) return; var opener = pop.opener; pop.hidden = true; pop = null; if (back && opener) opener.focus(); }
  Array.prototype.forEach.call(stage.querySelectorAll('[data-opens]'), function (a) {
    var form = document.getElementById(a.getAttribute('data-opens')); if (!form) return;
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (pop === form) { closePop(true); return; }
      closePop(false); pop = form; form.opener = a; form.hidden = false;
      var input = form.querySelector('input'); if (input) input.focus();
    });
    var x = form.querySelector('.d-pop-x'); if (x) x.addEventListener('click', function () { closePop(true); });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (pop) { closePop(true); return; }
    var open = hud && hud.classList.contains('is-open'); setHud(!open);                 // Esc: the pause menu, like a game
    if (!open && hud) { var first = hud.querySelector('.links a'); if (first) first.focus(); } else if (hudBtn) hudBtn.focus();
  });
  document.addEventListener('click', function (ev) { if (pop && !pop.contains(ev.target) && !(pop.opener && pop.opener.contains(ev.target))) closePop(false); });

  // ---------- Stepping into a shop ----------
  // A click on a link moves in on the sign that was clicked while the street dissolves, in big pixels, into
  // the dark navy of the other pages; then the page opens and fades in from that navy (see style.css). The
  // links in the corner menu step into the shop with the same address. Coming back (the Back button, or the
  // street opened again within half an hour) the street steps out of that shop. Ctrl, Shift or middle clicks
  // open new tabs as usual, and with reduced motion the links simply open.
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var NAVY = [11, 10, 31], ZOOM = 2.6, IN_MS = 520, OUT_MS = 640, BACK_KEY = 'mn-back';
  var leaving = false, gone = false, busy = false, zoomAnim = null, wipe = null, stepOutPending = null, giveUp = 0;   // busy: stepping out
  function bayer(n) {                                   // the classic ordered-dither matrix, n x n, values 0 to n*n-1
    var m = [[0]];
    for (var size = 1; size < n; size *= 2) {
      var next = [];
      for (var y = 0; y < size * 2; y++) {
        next.push([]);
        for (var x = 0; x < size * 2; x++) next[y].push(m[y % size][x % size] * 4 + [0, 2, 3, 1][(y < size ? 0 : 2) + (x < size ? 0 : 1)]);
      }
      m = next;
    }
    return m;
  }
  function stageRect() { return stage.getBoundingClientRect(); }
  function wipeAt(p) {                                  // p: 0 nothing, 1 all navy; blocks of about 8 art pixels
    if (!wipe) {                                        // (made before any zoom, so the block size is measured unscaled)
      var c = document.createElement('canvas'); c.className = 'd-wipe'; c.setAttribute('aria-hidden', 'true');
      document.body.appendChild(c);
      wipe = { c: c, g: c.getContext('2d'), m: bayer(8), img: null, block: Math.max(4, Math.round(8 * stageRect().width / 1280)) };
    }
    var w = Math.ceil(window.innerWidth / wipe.block), h = Math.ceil(window.innerHeight / wipe.block);
    if (wipe.c.width !== w || wipe.c.height !== h || !wipe.img) { wipe.c.width = w; wipe.c.height = h; wipe.img = wipe.g.createImageData(w, h); }
    var d = wipe.img.data, m = wipe.m, k = p * 64;
    for (var y = 0, i = 0; y < h; y++) for (var x = 0; x < w; x++, i += 4) { d[i] = NAVY[0]; d[i + 1] = NAVY[1]; d[i + 2] = NAVY[2]; d[i + 3] = m[y & 7][x & 7] < k ? 255 : 0; }
    wipe.g.putImageData(wipe.img, 0, 0);
  }
  function wipeOff() { if (wipe) { wipe.c.parentNode.removeChild(wipe.c); wipe = null; } }
  function run(ms, each, done) {                        // each(k) on every frame, k from 0 to 1
    var t0 = performance.now();
    (function step() { var k = Math.min(1, (performance.now() - t0) / ms); each(k); if (k < 1) window.requestAnimationFrame(step); else if (done) done(); })();
  }
  // Where to move in: the sign that was clicked (or, from the corner menu, the shop with the same address),
  // in pixels from the stage's corner (for the zoom) and in art units (to come back to it after a reload)
  function spotFor(a) {
    var el = a.closest('.d-area'), href = a.getAttribute('href');
    if (!el) Array.prototype.some.call(stage.querySelectorAll('.d-area[href]'), function (s) { if (s.getAttribute('href') === href) { el = s; return true; } return false; });
    var r = stageRect(), b = el ? el.getBoundingClientRect() : null;
    var cx = b ? b.left + b.width / 2 : r.left + r.width / 2, cy = b ? b.top + b.height / 2 : r.top + r.height / 2;
    return { ox: cx - r.left, oy: cy - r.top, sx: (cx - r.left) / r.width * 1280, sy: (cy - r.top) / r.height * 720 };
  }
  function spotOf(art) { var r = stageRect(); return { ox: art.sx / 1280 * r.width, oy: art.sy / 720 * r.height, sx: art.sx, sy: art.sy }; }
  function zoom(spot, from, to, ms, easing) {
    if (!stage.animate) return null;
    if (zoomAnim) { zoomAnim.cancel(); zoomAnim = null; }
    var base = window.getComputedStyle(stage).transform; base = base && base !== 'none' ? base + ' ' : '';
    stage.style.transformOrigin = spot.ox + 'px ' + spot.oy + 'px';
    return stage.animate([{ transform: base + 'scale(' + from + ')' }, { transform: base + 'scale(' + to + ')' }], { duration: ms, easing: easing, fill: 'forwards' });
  }
  function goInto(a) {
    var href = a.href, spot = spotFor(a), went = false, local = a.protocol === location.protocol && a.host === location.host;
    leaving = true; root.classList.add('is-leaving'); wipeAt(0);
    try { sessionStorage.setItem(BACK_KEY, JSON.stringify({ sx: spot.sx, sy: spot.sy, t: Date.now() })); } catch (err) { /* no storage: no way back, fine */ }
    zoomAnim = zoom(spot, 1, ZOOM, IN_MS, 'cubic-bezier(.45,0,.9,.55)');
    var go = function () {
      if (went || !leaving) return;                     // (not after Back during the zoom: Forward must not jump to the shop)
      went = true; window.location.href = href;
      // The page never came (cancelled, a download, offline): step back out. Pages of this site come quickly;
      // other sites get longer. Meanwhile another click simply opens its link.
      giveUp = window.setTimeout(function () {
        if (!leaving) return;
        try { sessionStorage.removeItem(BACK_KEY); } catch (err) { /* fine */ }
        stepOut(spot);
      }, local ? 3000 : 8000);
      gone = true;
    };
    run(IN_MS, function (k) { if (leaving) wipeAt(Math.max(0, (k - 0.15) / 0.85)); }, go);
    window.setTimeout(go, IN_MS + 150);                 // (frames stop in a background tab; the timer does not)
  }
  function stepOut(spot) {
    window.clearTimeout(giveUp); leaving = false; gone = false; busy = true; root.classList.remove('is-leaving');
    zoomAnim = zoom(spot, ZOOM, 1, OUT_MS, 'cubic-bezier(.15,.6,.3,1)');
    run(OUT_MS, function (k) { if (!leaving) wipeAt(1 - Math.min(1, k / 0.8)); }, function () {
      busy = false; if (leaving) return;
      wipeOff(); if (zoomAnim) { zoomAnim.cancel(); zoomAnim = null; } stage.style.transformOrigin = '';
    });
  }
  function readBack() {
    var b = null;
    try { b = JSON.parse(sessionStorage.getItem(BACK_KEY) || 'null'); sessionStorage.removeItem(BACK_KEY); } catch (err) { b = null; }
    return b && typeof b.sx === 'number' && Date.now() - b.t < 30 * 60 * 1000 ? b : null;
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || ev.defaultPrevented) return;
    if (leaving && !gone) { ev.preventDefault(); return; }   // already on the way
    if (busy || gone) return;                           // (stepping out, or the last page never came: just open it)
    var href = a.getAttribute('href') || '';
    if (calm || href.charAt(0) === '#' || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    ev.preventDefault();
    try { goInto(a); } catch (err) { window.location.href = a.href; }   // (whatever happens, the link still opens)
  });
  // Opened again soon after stepping into a shop: start inside it (under the navy) and step out once the
  // street is drawn. Restored by the Back button with the page still in memory: step out straight away.
  var backAtLoad = readBack();
  if (backAtLoad && !calm) {
    var backSpot = spotOf(backAtLoad);
    wipeAt(1); zoomAnim = zoom(backSpot, ZOOM, ZOOM, 1, 'linear'); busy = true;
    stepOutPending = function () { stepOutPending = null; stepOut(backSpot); };
    window.setTimeout(function () { if (stepOutPending) stepOutPending(); }, 1500);   // (if the street is slow to draw, or cannot be)
  }
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted || !leaving) return;
    var b = readBack();
    if (zoomAnim) { zoomAnim.cancel(); zoomAnim = null; }
    stepOut(b ? spotOf(b) : spotFor(stage));
  });

  if (!document.createElement('canvas').getContext) return;
  try {                                                  // (if painting fails, fail() shows the still picture)
  var W = 1280, H = 720, M = 64, CAM = 56;           // M: painted beyond the edges, so the view can slide; CAM: how far it slides
  var GROUND = 530, FOOT = 600, ROAD = 614;           // building line, front edge of the footpath, top of the road
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // How far away a point on the ground is: the building line is 0.45, the bottom of the picture 0.95
  function depthAt(y) { return y <= GROUND ? 0.45 : 0.45 + (y - GROUND) / (H - GROUND) * 0.5; }
  var NEAR_Z = depthAt(FOOT), HOLE_Z = depthAt(580);

  var query = new URLSearchParams(window.location.search);
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fixedClock = parseClock(query.get('time'));
  var speed = Math.max(1, Number(query.get('speed')) || 1);
  var weatherOverride = query.get('weather');
  var shot = !!query.get('shot');
  var camFixed = query.get('cam') === null ? null : clamp(Number(query.get('cam')) || 0, -1, 1);   // for testing: pin the view (-1 to 1)
  var startedAt = Date.now();
  // ?perf=1 shows timings in the corner: painting at load, and the average cost of each kind of frame
  var PERF = query.get('perf') ? { t0: performance.now(), scene: 0, people: 0, glow: 0, n: { scene: 0, people: 0, glow: 0 }, el: null } : null;

  // ---------- Helpers ----------
  function parseClock(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (Number(m[1]) % 24) * 3600 + Number(m[2]) * 60 : null; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hex(h) { return parseInt(h.slice(1), 16); }
  function rgbOf(n) { return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbH(h) { return rgbOf(hex(h)); }
  function pack(c) { return (clamp(Math.round(c[0]), 0, 255) << 16) | (clamp(Math.round(c[1]), 0, 255) << 8) | clamp(Math.round(c[2]), 0, 255); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')'; }
  function keyframes(f, pts) {
    for (var i = 1; i < pts.length; i++) { if (f <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * ((f - a[0]) / ((b[0] - a[0]) || 1)); } }
    return pts[pts.length - 1][1];
  }
  var seed = 7331;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---------- Fonts: a 5x7, a bold 6x7 made from it, and a tiny 3x5 ----------
  var F5 = {
    A: '.XXX. X...X X...X XXXXX X...X X...X X...X', B: 'XXXX. X...X X...X XXXX. X...X X...X XXXX.', C: '.XXXX X.... X.... X.... X.... X.... .XXXX',
    D: 'XXXX. X...X X...X X...X X...X X...X XXXX.', E: 'XXXXX X.... X.... XXXX. X.... X.... XXXXX', F: 'XXXXX X.... X.... XXXX. X.... X.... X....',
    G: '.XXXX X.... X.... X..XX X...X X...X .XXX.', H: 'X...X X...X X...X XXXXX X...X X...X X...X', I: 'XXXXX ..X.. ..X.. ..X.. ..X.. ..X.. XXXXX',
    K: 'X...X X..X. X.X.. XX... X.X.. X..X. X...X', L: 'X.... X.... X.... X.... X.... X.... XXXXX', M: 'X...X XX.XX X.X.X X.X.X X...X X...X X...X',
    N: 'X...X XX..X X.X.X X..XX X...X X...X X...X', O: '.XXX. X...X X...X X...X X...X X...X .XXX.', P: 'XXXX. X...X X...X XXXX. X.... X.... X....',
    R: 'XXXX. X...X X...X XXXX. X.X.. X..X. X...X', S: '.XXXX X.... X.... .XXX. ....X ....X XXXX.', T: 'XXXXX ..X.. ..X.. ..X.. ..X.. ..X.. ..X..',
    U: 'X...X X...X X...X X...X X...X X...X .XXX.', W: 'X...X X...X X...X X.X.X X.X.X XX.XX X...X', Y: 'X...X X...X .X.X. ..X.. ..X.. ..X.. ..X..',
    '.': '..... ..... ..... ..... ..... .XX.. .XX..', "'": '..X.. ..X.. .X... ..... ..... ..... .....',
    J: '....X ....X ....X ....X X...X X...X .XXX.', Q: '.XXX. X...X X...X X...X X.X.X X..X. .XX.X', V: 'X...X X...X X...X X...X X...X .X.X. ..X..',
    X: 'X...X X...X .X.X. ..X.. .X.X. X...X X...X', Z: 'XXXXX ....X ...X. ..X.. .X... X.... XXXXX',
    '0': '.XXX. X...X X..XX X.X.X XX..X X...X .XXX.', '1': '..X.. .XX.. ..X.. ..X.. ..X.. ..X.. .XXX.', '2': '.XXX. X...X ....X ...X. ..X.. .X... XXXXX',
    '3': 'XXXX. ....X ....X .XXX. ....X ....X XXXX.', '4': '...X. ..XX. .X.X. X..X. XXXXX ...X. ...X.', '5': 'XXXXX X.... XXXX. ....X ....X X...X .XXX.',
    '6': '.XXX. X.... X.... XXXX. X...X X...X .XXX.', '7': 'XXXXX ....X ...X. ..X.. .X... .X... .X...', '8': '.XXX. X...X X...X .XXX. X...X X...X .XXX.',
    '9': '.XXX. X...X X...X .XXXX ....X ....X .XXX.', ',': '..... ..... ..... ..... ..... ..X.. .X...', '·': '..... ..... ..... ..X.. ..... ..... .....',
    '>': 'X.... .X... ..X.. ...X. ..X.. .X... X....', '+': '..... ..X.. ..X.. XXXXX ..X.. ..X.. .....', ':': '..... ..X.. ..... ..... ..... ..X.. .....',
    '-': '..... ..... ..... XXXXX ..... ..... .....', '!': '..X.. ..X.. ..X.. ..X.. ..X.. ..... ..X..', '?': '.XXX. X...X ....X ...X. ..X.. ..... ..X..',
    '(': '...X. ..X.. .X... .X... .X... ..X.. ...X.', ')': '.X... ..X.. ...X. ...X. ...X. ..X.. .X...', '/': '....X ...X. ...X. ..X.. .X... .X... X....',
    '▶': '.X... .XX.. .XXX. .XXXX .XXX. .XX.. .X...'
  };
  // Cyrillic for the bar's sign: Т, А and Н look like T, A and H; Ь and Я are drawn here
  F5['Т'] = F5.T; F5['А'] = F5.A; F5['Н'] = F5.H;
  F5['Ь'] = 'X.... X.... X.... XXXX. X...X X...X XXXX.';
  F5['Я'] = '.XXXX X...X X...X .XXXX ..X.X .X..X X...X';
  var F3 = {
    A: '.X. X.X XXX X.X X.X', B: 'XX. X.X XX. X.X XX.', C: '.XX X.. X.. X.. .XX', D: 'XX. X.X X.X X.X XX.', E: 'XXX X.. XX. X.. XXX', F: 'XXX X.. XX. X.. X..',
    G: '.XX X.. X.X X.X .XX', H: 'X.X X.X XXX X.X X.X', I: 'XXX .X. .X. .X. XXX', J: '..X ..X ..X X.X .X.', K: 'X.X X.X XX. X.X X.X', L: 'X.. X.. X.. X.. XXX',
    M: 'X.X XXX XXX X.X X.X', N: 'XX. X.X X.X X.X X.X', O: '.X. X.X X.X X.X .X.', P: 'XX. X.X XX. X.. X..', R: 'XX. X.X XX. X.X X.X', S: '.XX X.. .X. ..X XX.',
    T: 'XXX .X. .X. .X. .X.', U: 'X.X X.X X.X X.X XXX', V: 'X.X X.X X.X X.X .X.', W: 'X.X X.X XXX XXX X.X', Y: 'X.X X.X .X. .X. .X.',
    '0': 'XXX X.X X.X X.X XXX', '1': '.X. XX. .X. .X. XXX', '3': 'XX. ..X .X. ..X XX.', '5': 'XXX X.. XX. ..X XX.', '6': '.XX X.. XXX X.X XXX', '8': 'XXX X.X XXX X.X XXX', '9': 'XXX X.X XXX ..X XX.', X: 'X.X X.X .X. X.X X.X', Z: 'XXX ..X .X. X.. XXX',
    '2': 'XX. ..X .X. X.. XXX', '4': 'X.X X.X XXX ..X ..X', '7': 'XXX ..X .X. .X. .X.', '/': '..X ..X .X. X.. X..', ',': '... ... ... .X. X..', '>': 'X.. .X. ..X .X. X..', '-': '... ... XXX ... ...', '·': '... ... .X. ... ...'
  };
  var FB = {};                                          // bold: every stroke one pixel wider
  Object.keys(F5).forEach(function (ch) { FB[ch] = F5[ch].split(' ').map(function (row) { var out = ''; for (var k = 0; k < 6; k++) out += (row[k] === 'X' || row[k - 1] === 'X') ? 'X' : '.'; return out; }).join(' '); });
  function glyphRows(font, ch) { var g = font[ch]; return g ? g.split(' ') : null; }
  function fontSize(font) { return font === F3 ? [3, 5] : font === FB ? [6, 7] : [5, 7]; }

  // ---------- Materials: a surface colour (a), and for lights a glow colour (e) ----------
  // k: how much a light is on at dusk (0-1), d: in the day (shops keep their lights on). h: the colour of its halo.
  // haze: how far it sinks into the air. noGlow: lit, but kept out of the halo layers (painted words, things inside shops).
  var GLASS = ['#4e5864', '#46505a'];
  var MATS = {
    CONC: { a: ['#b4a892', '#a89c86'] }, CONC2: { a: ['#9a9080', '#8e8474'] }, CONCD: { a: ['#5e564a'] }, STAIN: { a: ['#857864'] },
    WOOD: { a: ['#8a6a48', '#7c5e3e'] }, WOODD: { a: ['#4a3626', '#40301f'] }, WOODL: { a: ['#a8865e'] }, DARK: { a: ['#3a2e26', '#30261e'] },
    BRICK: { a: ['#9a5c44', '#8c523c'] }, BRICKD: { a: ['#5a3626'] }, BRICKHI: { a: ['#ac6a50'] },
    ROOF: { a: ['#7c7468', '#6e665a'] }, ROOFD: { a: ['#4a443c'] }, ROOFHI: { a: ['#a09888'] },
    METAL: { a: ['#5e5a54'] }, METALD: { a: ['#2e2c2a', '#262422'] }, METALHI: { a: ['#8e8a84'] }, RAIL: { a: ['#3e3a36'] },
    LATT: { a: ['#847a6a'] }, GLASS: { a: GLASS }, SHUT: { a: ['#8e8e88', '#7e7e78'] },
    AC: { a: ['#ccc8bc'] }, ACD: { a: ['#6a6660'] }, TANK: { a: ['#a8a090', '#989080'] }, LAUN1: { a: ['#d8c8b0'] }, LAUN2: { a: ['#8aa0b8'] }, LAUN3: { a: ['#c87a6a'] },
    PLANT: { a: ['#4e5e36', '#3e4e2c'] }, CAT: { a: ['#2a221c'] }, CAT2: { a: ['#141010'] }, CAT3: { a: ['#6a5a4c'] }, CATEYE: { a: ['#5a6a2a'], e: ['#d8ff7a'], k: 0.7, noGlow: true }, WIRE: { a: ['#221e1c'] }, SNOW: { a: ['#ecece8'] },
    SIL: { a: ['#2a2420'] }, COUNTER: { a: ['#6a4a30'] }, STOOL: { a: ['#7a5a3a'] }, COUNTER2: { a: ['#8a8680'] }, INTDK: { a: ['#3a2a20'] }, NOREN: { a: ['#3a3e5e', '#323654'] }, NORENL: { a: ['#c8c4d8'] },
    BOARD: { a: ['#3a2618', '#30201a'] }, WEAR: { a: ['#6a5238'] }, CRATE: { a: ['#9a7448'] }, FRUIT1: { a: ['#e07a2a'] }, FRUIT2: { a: ['#7aa83a'] }, FRUIT3: { a: ['#c8342a'] },
    // windows and shop fronts
    WINW: { a: GLASS, e: ['#ffcc88', '#e8a868'], k: 0.55, h: '#c88040' },
    WINC: { a: GLASS, e: ['#c8dcd8', '#a8c0c0'], k: 0.5, h: '#6898a0' },
    WIND: { a: GLASS, e: ['#7e8898', '#727c8c'], k: 0.45, h: '#3a4050' },
    CURT: { a: ['#a89070'], e: ['#f0c890'], k: 0.55, h: '#a87040' },
    SHOPW: { a: ['#5a5048', '#4e4440'], e: ['#ffbc78', '#e89452'], k: 0.8, d: 0.3, h: '#7a4420' },
    SHOPF: { a: ['#5e605c', '#525450'], e: ['#ecf6ee', '#cfe6d8'], k: 0.85, d: 0.45, h: '#5a7a6a' },
    SHELF: { a: ['#6a6058'] },
    SHELFR: { a: ['#a04a3a'], e: ['#ff8a6a'], k: 0.8, d: 0.4, noGlow: true }, SHELFY: { a: ['#b09040'], e: ['#ffd878'], k: 0.8, d: 0.4, noGlow: true }, SHELFB: { a: ['#4a6a9a'], e: ['#9ac0ff'], k: 0.8, d: 0.4, noGlow: true },
    BOOK1: { a: ['#7a3a2a'], e: ['#e07a5a'], k: 0.8, d: 0.35, noGlow: true }, BOOK2: { a: ['#3a5a6a'], e: ['#7ab0d0'], k: 0.8, d: 0.35, noGlow: true },
    BOOK3: { a: ['#6a6a3a'], e: ['#d8c878'], k: 0.8, d: 0.35, noGlow: true }, BOOK4: { a: ['#5a3a5a'], e: ['#b884b8'], k: 0.8, d: 0.35, noGlow: true },
    MAG1: { a: ['#a04a4a'], e: ['#ff8a7a'], k: 0.6, d: 0.3, noGlow: true }, MAG2: { a: ['#4a6a9a'], e: ['#a0c4ff'], k: 0.6, d: 0.3, noGlow: true }, MAG3: { a: ['#c8b040'], e: ['#ffe48a'], k: 0.6, d: 0.3, noGlow: true },
    PAPER: { a: ['#d8d4c8'], e: ['#f4eee0'], k: 0.5, d: 0.2, noGlow: true },
    DOORGL: { a: GLASS, e: ['#ffb870', '#e89450'], k: 0.7, d: 0.2, h: '#c07030' },
    LANT: { a: ['#a04030', '#8a3628'], e: ['#ff6a3a', '#e8482a'], k: 0.9, h: '#d03818' }, LANTD: { a: ['#4a1e14'] },
    MONCASE: { a: ['#5a5a58', '#4e4e4c'] },
    MON: { a: ['#2a3430', '#26302c'], e: ['#2e6a4e', '#285e44'], k: 0.7, d: 0.5, h: '#1a5a3a' },
    MONB: { a: ['#4a6a5a'], e: ['#9affc0'], k: 0.7, d: 0.5, h: '#2aa060' }, MONA: { a: ['#6a5a3a'], e: ['#ffc860'], k: 0.7, d: 0.5, h: '#a07020' },
    PHONEC: { a: ['#2a2a2c'] }, PHONEL: { a: ['#3a4048'], e: ['#c8e4ff'], k: 0.7, d: 0.5, h: '#5a7ab0' },
    // signs
    BOXW: { a: ['#d8d4c4'], e: ['#fff2e4'], k: 0.35, h: '#7e705c' },
    BOXY: { a: ['#c8a840'], e: ['#ffd448'], k: 0.35, h: '#8c6a14' }, BOXYD: { a: ['#9a822c'], e: ['#d4a428'], k: 0.35, noGlow: true },
    BOXR: { a: ['#9a3a34'], e: ['#ff4c4c'], k: 0.35, h: '#a01420' },
    BOXG: { a: ['#5a8a6a'], e: ['#7ae6a4'], k: 0.75, d: 0.3, h: '#207a48' }, BOXGD: { a: ['#3e6a4e'], e: ['#48b070'], k: 0.75, d: 0.3, noGlow: true },
    BOXB: { a: ['#c8d4e0'], e: ['#eef6ff'], k: 0.45, d: 0.2, h: '#5a6e8e' }, BOXBD: { a: ['#8a98aa'], e: ['#9cb0cc'], k: 0.45, d: 0.2, noGlow: true },
    SIGNR: { a: ['#8a2a24'], e: ['#d8483a'], k: 0.6, d: 0.2, h: '#8a1810' },
    TUBEC: { a: ['#4a7a7a'], e: ['#c4fff4'], k: 0.3, h: '#18b0a0' }, TUBECD: { a: ['#1e3432'] },
    TUBEP: { a: ['#8a4a6a'], e: ['#ffc4e2'], k: 0.3, h: '#e0207a' }, TUBEPD: { a: ['#3a1e2c'] },
    TUBEW: { a: ['#c8c8c0'], e: ['#f4fffc'], k: 0.8, d: 0.6, h: '#6aa098' },
    LETD: { a: ['#2a2018'] }, LETW: { a: ['#cfcabe'], e: ['#fff6ea'], k: 0.75, d: 0.3, noGlow: true },
    LETY: { a: ['#8a7a40'], e: ['#ffe49a'], k: 0.3, noGlow: true }, LETR: { a: ['#7a3030'], e: ['#ff9a86'], k: 0.3, noGlow: true },
    LETC: { a: ['#5a7a7a'], e: ['#b4f4ec'], k: 0.3, noGlow: true }, LETP: { a: ['#8a5a70'], e: ['#ffc0dc'], k: 0.3, noGlow: true },
    GOLD: { a: ['#c8a050'], e: ['#ffd890'], k: 0.5, noGlow: true }, GOLDHI: { a: ['#e8c878'], e: ['#fff0c0'], k: 0.5, noGlow: true },
    SIGNBG: { a: ['#2a2624', '#221e1c'] },
    POSTER: { a: ['#7aa898', '#6a9888'], e: ['#b0f2dc', '#90dcc4'], k: 0.5, h: '#246e5e' }, POSTERD: { a: ['#1a2a26'] },
    MENUBG: { a: ['#e8e0cc'], e: ['#fff6e6'], k: 0.6, h: '#6e604c' }, MENUFR: { a: ['#4a3626'] },
    LAMPS: { a: ['#c8c0a8'], e: ['#fff0c8'], k: 0.8, h: '#d0a060' },
    BILLFR: { a: ['#4a4644'] }, BILLBG: { a: ['#1a1820'] }, TICKBG: { a: ['#1a1010'] },
    LEDR: { a: ['#7a3030'], e: ['#ff5a4a'], k: 0.6, h: '#d02020' }, LEDG: { a: ['#4a7a4a'], e: ['#8aff9a'], k: 0.6, h: '#30c050' },
    // the street, the subway
    PAVE: { a: ['#7e7468', '#706658'] }, PAVED: { a: ['#4c463e'] }, PAVEHI: { a: ['#988e80'] },
    CURB: { a: ['#8a8478', '#7c766a'] }, CURBHI: { a: ['#aca698'] }, ASPH: { a: ['#5a5248', '#4e463e'] }, ASPH2: { a: ['#6c645a'] }, STRIPE: { a: ['#cac6ba'] }, STRIPE2: { a: ['#a8a294'] },
    GRIME: { a: ['#5e564c'] }, GUM: { a: ['#2e2a26'] }, OIL: { a: ['#3a342e'] }, PATCH: { a: ['#47413a'] }, LITTER: { a: ['#d4cec0'] }, LITTERB: { a: ['#8a6a46'] },
    BIKE: { a: ['#2a6a8a'] }, BIN: { a: ['#3a5a42', '#345038'] }, BIND: { a: ['#24382a'] }, BAG: { a: ['#26262a', '#1e1e22'] }, BAGHI: { a: ['#4a4a52'] },
    POT: { a: ['#8a4a2a'] }, POTD: { a: ['#5a2e1a'] }, PLANTHI: { a: ['#6a8a4a'] },
    VEND: { a: ['#b83a3a', '#a83434'] }, VENDW: { a: GLASS, e: ['#e8f4ff', '#c8dcec'], k: 0.7, d: 0.4, h: '#3a5a7a' },
    SIGNGR: { a: ['#2e6a4a'] }, SIGNBL: { a: ['#2a4a8a'] }, SIGNRD: { a: ['#c82a2a'] },
    LEAF1: { a: ['#9a6a2a'] }, LEAF2: { a: ['#6e5a28'] }, BUTT: { a: ['#e4dccc'] }, BUTTE: { a: ['#c87a3a'] },
    POLE: { a: ['#5a4a3c', '#4e4034'] }, POLED: { a: ['#2e2620'] },
    LAMP: { a: ['#d8d8d0'], e: ['#f2f6ff'], k: 0.9, h: '#8a9ad8' },
    KIOSK: { a: ['#5a6a6a', '#4e5e5e'] }, KIOSKD: { a: ['#2a3434'] },
    SUBDARK: { a: ['#1a1816'] }, SUBRAIL: { a: ['#3e5a4a', '#344e40'] }, SUBG: { a: ['#2e5a46'], e: ['#3e9a6e'], k: 0.6, d: 0.2, h: '#1e6a48' },
    GLOBE: { a: ['#d8d0b8'], e: ['#fff4d8'], k: 0.8, h: '#c09050' },
    TILEW: { a: ['#c8c4b4', '#b4b0a0'], e: ['#a8b4b0', '#8a9894'], k: 0.6, d: 0.3, h: '#26342f' }, TILEG: { a: ['#7a786c'], e: ['#5a6460'], k: 0.6, d: 0.3, noGlow: true },
    STEP: { a: ['#6a6660', '#5a5650'], e: ['#4e5654', '#444c4a'], k: 0.6, d: 0.2, noGlow: true }, STEPHI: { a: ['#9a968c'], e: ['#9aaaa6'], k: 0.6, d: 0.3, noGlow: true },
    SUBLIT: { a: ['#8a9a98'], e: ['#e8fff8', '#c8e8e0'], k: 0.8, d: 0.6, h: '#5a9a90' },
    WORKL: { a: ['#c8ccd0'], e: ['#f8fcff'], k: 0.9, d: 0.4, h: '#9ab0d8' },
    // weathering on the walls: block joints and their lit edges, chips, cracks, patched render, crust, moss, rust, soot,
    // tags, peeling paint, more brick tones, missing bricks, and an old painted sign fading on the brick
    CONCL: { a: ['#c6baa4', '#bcb09a'] }, CONCJ: { a: ['#8e826e'] }, CRACK: { a: ['#4a4238'] }, PATCHC: { a: ['#aa9e88', '#9e927c'] }, EFFLO: { a: ['#d8d4c6'] },
    MOSS: { a: ['#5c6c3c', '#4e5e32'] }, RUSTST: { a: ['#8a5a3a', '#7a4e32'] }, SOOT: { a: ['#4c4640'] },
    GRAF1: { a: ['#c04a78'] }, GRAF2: { a: ['#3a86c0'] }, GRAF3: { a: ['#e0b83c'] }, PEEL: { a: ['#c0b292'] },
    BRICKR: { a: ['#a8644a'] }, BRICKO: { a: ['#7e4c38'] }, BRICKX: { a: ['#34241c'] }, GHOST: { a: ['#b8987a'] },
    LAUNW: { a: ['#5e605c', '#525450'], e: ['#e8f4ec', '#cfe2d8'], k: 0.8, d: 0.45, noGlow: true }, WASHER: { a: ['#d8d8d2'], e: ['#f2f6f2'], k: 0.6, d: 0.3, noGlow: true },
    BAR1: { a: ['#d4ac40'] }, BAR2: { a: ['#2a2622'] }, CONE: { a: ['#d46c2a'] }, CONEW: { a: ['#ece8e0'] }, HYDRANT: { a: ['#a83a2a'] },
    // far away
    SKYB: { a: ['#706c74'], haze: 0.72 }, SKYB2: { a: ['#625e66'], haze: 0.55 },
    SKYWIN: { a: ['#706c74'], e: ['#ffd4e2'], k: 0.3, h: '#a86080', haze: 0.35 }, SKYWIN2: { a: ['#625e66'], e: ['#ffe2b8'], k: 0.35, h: '#a07040', haze: 0.25 },
    SKYRED: { a: ['#706c74'], e: ['#ff3030'], k: 0.6, h: '#c01010', haze: 0.2 }
  };
  // The light of each time of day, and the colour of the air
  var AMB = { night: [0.4, 0.36, 0.52], dusk: [0.5, 0.47, 0.38], day: [0.95, 0.93, 0.88] };
  var HAZE = { night: rgbH('#5c4658'), dusk: rgbH('#949466'), day: rgbH('#c6cac4') };
  var NAMES = Object.keys(MATS), MAT = {};
  NAMES.forEach(function (n, i) { MAT[n] = i + 1; });
  var K = MAT;
  // kind: night, dusk or day (what the eye sees), or lightsNight / lightsDusk (what reaches the halo layers)
  function palette(kind) {
    var pal = [];
    NAMES.forEach(function (n) {
      var m = MATS[n], out = [];
      for (var j = 0; j < 2; j++) {
        var A = rgbH(m.a[j] || m.a[0]), E = m.e ? rgbH(m.e[j] || m.e[0]) : null, c;
        if (kind === 'lightsNight' || kind === 'lightsDusk') {
          if (!E || m.noGlow) { out = null; break; }
          var lvl = kind === 'lightsDusk' ? (m.k === undefined ? 0.5 : m.k) : 1, Hc = m.h ? rgbH(m.h) : E;
          c = [Hc[0] * lvl, Hc[1] * lvl, Hc[2] * lvl];
          if (m.haze) c = mix(c, [0, 0, 0], m.haze * 0.6);
        } else {
          var amb = AMB[kind], lit = kind === 'night' ? 1 : kind === 'dusk' ? (m.k === undefined ? 0.5 : m.k) : (m.d || 0);
          c = [A[0] * amb[0], A[1] * amb[1], A[2] * amb[2]];
          if (E) c = mix(c, E, lit);
          if (m.haze) c = mix(c, HAZE[kind], m.haze);
        }
        out.push(pack(c));
      }
      if (out) pal[MAT[n]] = out;
    });
    return pal;
  }
  var PALS = {};
  function palOf(kind) { return PALS[kind] || (PALS[kind] = palette(kind)); }

  // ---------- The painter: a material buffer for one part, crisp shapes, ordered dithering ----------
  var B = null;
  function buffer(x0, y0, x1, y1) { var w = x1 - x0, h = y1 - y0; return { x0: x0, y0: y0, w: w, h: h, m: new Uint8Array(w * h), s: new Float32Array(w * h) }; }
  function px(x, y, m, s) { x = Math.round(x) - B.x0; y = Math.round(y) - B.y0; if (x < 0 || y < 0 || x >= B.w || y >= B.h) return; var i = y * B.w + x; B.m[i] = m; B.s[i] = s || 0; }
  function box(x, y, w, h, m, f0, fl) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    var ya = Math.max(y, B.y0), yb = Math.min(y + h, B.y0 + B.h), xa = Math.max(x, B.x0), xb = Math.min(x + w, B.x0 + B.w);
    for (var yy = ya; yy < yb; yy++) {
      var s = f0 === undefined ? 0 : clamp((yy - f0) / fl, 0, 1), row = (yy - B.y0) * B.w - B.x0;
      for (var xx = xa; xx < xb; xx++) { B.m[row + xx] = m; B.s[row + xx] = s; }
    }
  }
  function frame(x, y, w, h, m, t) { t = t || 1; box(x, y, w, t, m); box(x, y + h - t, w, t, m); box(x, y, t, h, m); box(x + w - t, y, t, h, m); }
  function poly(pts, m, s) {
    var minY = 1e9, maxY = -1e9, i, j;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var yc = y + 0.5, xs = [];
      for (i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort(function (p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) for (var x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) px(x, y, m, s);
    }
  }
  function ellipse(cx, cy, rx, ry, m, s) { for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) { var dy = (y + 0.5 - cy) / ry; if (Math.abs(dy) > 1) continue; var hw = rx * Math.sqrt(1 - dy * dy); for (var x = Math.round(cx - hw); x < Math.round(cx + hw); x++) px(x, y, m, s); } }
  function line(x0, y0, x1, y1, m, w) { w = w || 1; var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (var i = 0; i <= n; i++) box(Math.round(x0 + (x1 - x0) * i / n - (w - 1) / 2), Math.round(y0 + (y1 - y0) * i / n), w, w, m); }
  function text(str, x, y, m, scale, font) {
    font = font || F3; scale = scale || 1;
    var gw = fontSize(font)[0];
    for (var c = 0; c < str.length; c++) {
      var rows = glyphRows(font, str[c]);
      if (rows) for (var r = 0; r < rows.length; r++) for (var k = 0; k < gw; k++) if (rows[r][k] === 'X') box(x + k * scale, y + r * scale, scale, scale, m);
      x += (gw + 1) * scale;
    }
  }
  function textWidth(str, scale, font) { var gw = fontSize(font || F3)[0]; return str.length * (gw + 1) * scale - scale; }
  function centred(str, cx, y, m, scale, font) { text(str, Math.round(cx - textWidth(str, scale, font) / 2), y, m, scale, font); }
  // Sign lettering with texture: an outline, a drop shadow, a lit top edge on every stroke, and wear
  function sign(str, cx, y, o) {
    var font = o.font || F5, scale = o.scale || 1, fs = fontSize(font), gw = fs[0], gh = fs[1];
    var w = str.length * (gw + 1) * scale - scale, h = gh * scale, bits = new Uint8Array(w * h), x = 0;
    for (var c = 0; c < str.length; c++) {
      var rows = glyphRows(font, str[c]);
      if (rows) for (var r = 0; r < gh; r++) for (var k = 0; k < gw; k++) if (rows[r][k] === 'X') for (var dy = 0; dy < scale; dy++) for (var dx = 0; dx < scale; dx++) bits[(r * scale + dy) * w + x + k * scale + dx] = 1;
      x += (gw + 1) * scale;
    }
    var at = function (u, v) { return u >= 0 && v >= 0 && u < w && v < h && bits[v * w + u] === 1; };
    var x0 = o.left !== undefined ? o.left : Math.round(cx - w / 2), u, v;
    if (o.outline) for (v = -1; v <= h; v++) for (u = -1; u <= w; u++) if (!at(u, v) && (at(u - 1, v) || at(u + 1, v) || at(u, v - 1) || at(u, v + 1))) px(x0 + u, y + v, o.outline);
    if (o.shade) for (v = 0; v < h; v++) for (u = 0; u < w; u++) if (at(u, v) && !at(u + 1, v + 1)) px(x0 + u + 1, y + v + 1, o.shade);
    for (v = 0; v < h; v++) for (u = 0; u < w; u++) {
      if (!at(u, v)) continue;
      var m = o.fill;
      if (o.hi && !at(u, v - 1)) m = o.hi;
      if (o.wear && rnd() < o.wear) m = o.wearMat || K.WEAR;
      px(x0 + u, y + v, m);
    }
  }
  function vsign(str, cx, y, step, o) { for (var i = 0; i < str.length; i++) sign(str[i], cx, y + i * step, o); }
  // A sagging wire between two points
  function wire(x0, y0, x1, y1, sag, m) {
    var n = Math.ceil(Math.abs(x1 - x0)), py = null;
    for (var i = 0; i <= n; i++) { var t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t); if (py !== null && Math.abs(y - py) > 1) line(x - 1, py, x, y, m); else px(x, y, m); py = y; }
  }
  // Paint a part into its palette colours; returns null when nothing in it uses that palette
  function colorize(buf, pal) {
    var c = document.createElement('canvas'); c.width = buf.w; c.height = buf.h;
    var g = c.getContext('2d'), img = g.createImageData(buf.w, buf.h), d = img.data, used = 0;
    for (var y = 0; y < buf.h; y++) {
      var row = y * buf.w, by = (y & 3) * 4, bx = (buf.x0 & 3);
      for (var x = 0; x < buf.w; x++) {
        var i = row + x, m = buf.m[i];
        if (!m) continue;
        var p = pal[m]; if (!p) continue;
        var col = (buf.s[i] * 16 > BAYER[by + ((x + bx) & 3)]) ? p[1] : p[0], j = i * 4;
        d[j] = (col >> 16) & 255; d[j + 1] = (col >> 8) & 255; d[j + 2] = col & 255; d[j + 3] = 255; used++;
      }
    }
    if (!used) return null;
    g.putImageData(img, 0, 0);
    return c;
  }

  // ---------- Small painted things ----------
  function speckle(x0, y0, x1, y1, rate) { var n = Math.round((x1 - x0) * (y1 - y0) * rate); for (var k = 0; k < n; k++) px(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), rnd() < 0.6 ? K.CONCD : K.STAIN); }
  function woodGrain(x0, y0, x1, y1, step) {
    for (var x = x0; x < x1; x += step) box(x, y0, 1, y1 - y0, K.WOODD);
    var n = Math.round((x1 - x0) * (y1 - y0) / 50);
    for (var k = 0; k < n; k++) { var gx = x0 + rnd() * (x1 - x0), gy = y0 + rnd() * (y1 - y0), len = 2 + Math.floor(rnd() * 5); box(gx, gy, 1, len, rnd() < 0.55 ? K.WOODD : K.WOODL); }
  }
  // Someone seen through a window: head, neck, shoulders, arms, cut off at the sill (by)
  function person(cx, by, h, pose) {
    var hr = Math.max(2.2, h * 0.16), hy = by - h + hr, sh = hy + hr * 1.55, sw = hr * 2.5, aw = Math.max(1, Math.round(hr * 0.5));
    if (pose === 'hair') ellipse(cx - hr * 0.45, hy + hr * 0.9, hr * 0.55, hr * 1.1, K.SIL);
    ellipse(cx, hy, hr * 0.86, hr, K.SIL);
    box(cx - hr * 0.32, hy + hr * 0.7, hr * 0.64 + 1, hr, K.SIL);
    poly([[cx - sw * 0.5, sh + hr * 0.7], [cx - sw * 0.36, sh], [cx + sw * 0.36, sh], [cx + sw * 0.5, sh + hr * 0.7], [cx + sw * 0.44, by], [cx - sw * 0.44, by]], K.SIL);
    if (pose === 'cup') { line(cx + sw * 0.42, sh + hr * 1.7, cx + sw * 0.12, hy + hr * 0.9, K.SIL, aw); box(cx + sw * 0.02, hy + hr * 0.2, hr * 0.7, hr * 0.9, K.SIL); }
    if (pose === 'phone') { line(cx - sw * 0.42, sh + hr * 1.7, cx - hr * 0.5, hy + hr * 0.5, K.SIL, aw); px(cx - hr * 0.9, hy + hr * 0.2, K.PHONEL); }
  }
  function pickWin() { var r = rnd(); return r < 0.32 ? K.WINW : r < 0.46 ? K.WINC : r < 0.66 ? K.WIND : K.GLASS; }
  // Each lit window has its own light: a warm bulb, a deep amber shade, a pale paper lamp, a candle, a red bulb,
  // a neon strip, the cold tube of a kitchen, a green desk or aquarium lamp. Some have blinds.
  function pickTone(m) {
    var r = rnd();
    if (m === K.WINC) return r < 0.6 ? 'cool' : r < 0.8 ? 'green' : 'neon';
    return r < 0.42 ? 'warm' : r < 0.62 ? 'amber' : r < 0.77 ? 'pale' : r < 0.87 ? 'candle' : r < 0.93 ? 'red' : 'neon';
  }
  // People at home, drawn live (see drawPeeps): what they are doing, where, and their own pace
  var WINPEEPS = [], HOME_KINDS = ['water', 'iron', 'stretch', 'read', 'type', 'cook', 'pace', 'dance', 'fold', 'paint', 'tea', 'guitar', 'pace', 'tea'];
  function peep(o) { o.part = curPart; o.z = curZ; o.seed = rnd(); o.roam = rnd() < 0.5; WINPEEPS.push(o); return o; }
  function win(x, y, w, h, m, sill) {
    box(x - 2, y - 2, w + 4, h + 4, K.CONCD);
    box(x, y, w, h, m, y, h);
    var lit = (m === K.WINW || m === K.WINC) && curPart !== 'far', curtain = m !== K.GLASS && rnd() < 0.35, rec = null;
    var open = lit && !curtain && rnd() < 0.16;           // an open window: its curtain stirs in the breeze (drawn live)
    if (lit) { rec = { part: curPart, z: curZ, x: x, y: y, w: w, h: h, cold: m === K.WINC, s: rnd(), s2: rnd(), s3: rnd(), tone: pickTone(m), lamp: rnd(), blinds: !open && rnd() < 0.22, open: open }; LITWIN.push(rec); }
    if (lit && rnd() < 0.62) peep({ win: rec, x: x, y: y, w: w, h: h, left: curtain ? x + Math.floor(w / 3) : x, kind: HOME_KINDS[Math.floor(rnd() * HOME_KINDS.length)], mull: true });
    if (m !== K.GLASS && rnd() < 0.22) for (var pp = 0; pp < 1 + Math.floor(rnd() * 2); pp++) {   // pot plants on the inner sill
      var ppx = x + 3 + Math.floor(rnd() * (w - 10)); box(ppx, y + h - 4, 4, 4, K.POT); box(ppx, y + h - 4, 4, 1, K.POTD); ellipse(ppx + 2, y + h - 7, 3, 3, K.PLANT); px(ppx + 1, y + h - 9, K.PLANTHI); px(ppx + 3, y + h - 7, K.PLANTHI);
    }
    if (m !== K.GLASS && rnd() < 0.1) for (var hb = 0; hb < 3; hb++) { var hx = x + 4 + hb * 5; box(hx, y + 1, 1, 3, K.WIRE); ellipse(hx, y + 6, 1.6, 2.5, K.PLANT); px(hx, y + 8, K.LEAF2); }   // herbs hung up to dry
    box(x, y + Math.floor(h / 2), w, 1, K.METALD); box(x + Math.floor(w / 2), y, 1, h, K.METALD);
    if (sill !== false) {
      box(x - 3, y + h + 2, w + 6, 2, K.CONC2); box(x - 3, y + h + 2, w + 6, 1, K.CONCL); box(x - 3, y + h + 4, w + 6, 1, K.CONCD);
      SILLS.push([x - 3, y + h + 2, w + 6, curZ]);
      for (var k = 0; k < w / 7; k++) { var sx = x - 2 + Math.floor(rnd() * (w + 4)), len = 5 + Math.floor(rnd() * 22); box(sx, y + h + 5, 1, len, K.STAIN, y + h + 5, len); if (rnd() < 0.4) box(sx + 1, y + h + 5, 1, Math.floor(len / 2), K.STAIN); }   // rain stains from the sill
      if (rnd() < 0.14) {                                // a window box of flowers; someone waters it in the morning
        box(x - 1, y + h + 5, w + 2, 6, K.WOOD); box(x - 1, y + h + 5, w + 2, 1, K.WOODL); box(x - 1, y + h + 10, w + 2, 1, K.WOODD);
        for (var fl = x; fl < x + w; fl += 3) { ellipse(fl + 1, y + h + 3, 2, 2, K.PLANT); if (rnd() < 0.5) px(fl + 1, y + h + 1, rnd() < 0.5 ? K.FRUIT3 : K.FRUIT1); else px(fl, y + h + 2, K.PLANTHI); }
        if (rec) peep({ win: rec, x: x, y: y, w: w, h: h, left: x, kind: 'water', mull: true, hours: [7, 9.3] });
      }
    }
    if (curtain) box(x + 1, y + 1, Math.floor(w / 3), h - 2, K.CURT, y, h);
  }
  var SILLS = [], SLABS = [], LAUNDRY = [], FAIRY = [], RUG = null;
  function ac(x, y) {
    box(x, y, 20, 13, K.AC); ellipse(x + 8, y + 6.5, 4, 4, K.ACD); box(x + 15, y + 2, 3, 9, K.ACD); box(x + 2, y + 13, 2, 3, K.METALD); box(x + 16, y + 13, 2, 3, K.METALD);
    box(x, y, 20, 1, K.CONCL); for (var gx = x + 3; gx < x + 13; gx += 2) px(gx, y + 6, K.ACD);
    for (var k = 0; k < 4; k++) { var rx = x + 3 + Math.floor(rnd() * 14), len = 6 + Math.floor(rnd() * 16); box(rx, y + 16, 1, len, K.RUSTST, y + 16, len); }   // rust run down from its brackets
  }
  // extra: 'bike' (one parked behind the rails), 'fairy' (a string of little lights along the rail, drawn live),
  // 'rug' (where someone shakes out a rug in the morning). Laundry hangs from its line live, and sways.
  function balcony(x, y, w, laundry, extra) {
    box(x, y + 26, w, 3, K.CONC2); box(x, y + 29, w, 2, K.CONCD); box(x, y + 26, w, 1, K.CONCL);
    if (laundry) { box(x + 4, y - 18, w - 8, 1, K.METALD); LAUNDRY.push({ x: x, y: y - 17, z: curZ, items: [[8, 'LAUN1', 14], [22, 'LAUN2', 18], [38, 'LAUN3', 12], [52, 'LAUN1', 16], [66, 'LAUN2', 11], [80, 'LAUN3', 15]].filter(function (l) { return l[0] < w - 10; }) }); }
    if (extra === 'bike') {
      [x + 16, x + 38].forEach(function (wx) { ellipse(wx, y + 18, 7, 7, K.METALD); ellipse(wx, y + 18, 5.5, 5.5, K.DARK); px(wx, y + 18, K.METALHI); });
      line(x + 16, y + 18, x + 26, y + 10, K.BIKE, 2); line(x + 26, y + 10, x + 38, y + 18, K.BIKE, 2); line(x + 24, y + 18, x + 36, y + 10, K.BIKE, 2); box(x + 22, y + 8, 5, 2, K.METALD); box(x + 35, y + 7, 4, 1, K.METALHI);
    }
    if (extra === 'fairy') FAIRY.push({ x: x, y: y + 1, w: w, z: curZ });
    if (extra === 'rug') RUG = { x: x, y: y, w: w, z: curZ };
    for (var bx = x; bx < x + w; bx += 4) { box(bx, y, 1, 26, K.LATT); if (rnd() < 0.3) px(bx, y + 18 + Math.floor(rnd() * 8), K.RUSTST); }
    box(x, y, w, 2, K.LATT); box(x, y, w, 1, K.CONCL); box(x, y + 13, w, 1, K.LATT);
  }
  function slab(x, y, w) { box(x, y, w, 2, K.CONCD); SLABS.push([x, y, w, curZ]); for (var mx = x; mx < x + w; mx++) if (rnd() < 0.08) px(mx, y - 1, K.MOSS); }   // (moss creeps along the ledges)
  // A conduit run down a wall, held by brackets, with a bend in at the top
  function conduit(x, y0, y1) { box(x, y0, 2, y1 - y0, K.METALD); box(x, y0, 1, y1 - y0, K.METAL); box(x - 4, y0, 6, 2, K.METALD); for (var yy = y0 + 10; yy < y1; yy += 22) { box(x - 1, yy, 4, 2, K.METAL); px(x + 2, yy + 2, K.RUSTST); } }
  // ---------- Worn walls ----------
  // Big cast blocks in staggered courses: each block shaded from its lit top to its foot, joints between them, the
  // odd block a different pour or a patch, corners chipped back to the aggregate
  function blocks(x0, y0, x1, y1, bw, bh, base) {
    for (var y = y0, row = 0; y < y1; y += bh, row++) {
      var off = (row % 2) * Math.floor(bw / 2), hh = Math.min(bh, y1 - y);
      for (var x = x0 - off; x < x1; x += bw) {
        var bx = Math.max(x, x0), be = Math.min(x + bw, x1), r = rnd();
        if (be - bx < 2) continue;
        box(bx, y + 1, be - bx, hh - 1, r < 0.16 ? K.CONC2 : r < 0.22 ? K.PATCHC : base, y - 2, hh + 6);
        if (rnd() < 0.55) box(bx + 1, y + 1, be - bx - 2, 1, K.CONCL);
        if (x > x0) box(x, y, 1, hh, K.CONCJ);
        if (rnd() < 0.14) { var cx = rnd() < 0.5 ? bx + 1 : be - 4, cy = rnd() < 0.5 ? y + 1 : y + hh - 3; box(cx, cy, 3, 2, K.CONCD); px(cx + (cx === bx + 1 ? 0 : 2), cy, K.CONCL); px(cx + 1, cy + 1, K.CONC2); }
      }
      box(x0, y, x1 - x0, 1, K.CONCJ);
    }
  }
  // Hairline cracks wandering down from a corner or a ledge, lit along one edge
  function cracks(x0, y0, x1, y1, n) {
    for (var k = 0; k < n; k++) {
      var x = x0 + Math.floor(rnd() * (x1 - x0)), y = y0 + Math.floor(rnd() * (y1 - y0)), len = 8 + Math.floor(rnd() * 26);
      for (var s = 0; s < len; s++) { px(x, y, K.CRACK); px(x + 1, y, K.CONCL); var r = rnd(); x += r < 0.3 ? -1 : r < 0.6 ? 1 : 0; y++; if (rnd() < 0.08) { px(x - 1, y, K.CRACK); px(x - 2, y + 1, K.CRACK); } }
    }
  }
  // Where the render has fallen away: the brick underneath, a broken edge round it
  function bareBrick(cx, cy, rw, rh) {
    for (var y = Math.floor(cy - rh); y <= cy + rh; y++) {
      var dy = (y - cy) / rh, half = rw * Math.sqrt(Math.max(0, 1 - dy * dy)) * (0.75 + rnd() * 0.3);
      for (var x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        var brick = ((y % 4) === 3) || (((x + (Math.floor(y / 4) % 2) * 4) % 8) === 0);
        px(x, y, brick ? K.BRICKD : rnd() < 0.2 ? K.BRICKHI : K.BRICK);
      }
      px(Math.round(cx - half) - 1, y, K.CONCD); px(Math.round(cx + half) + 1, y, K.CONCD); px(Math.round(cx + half) + 2, y, K.CONCL);
    }
  }
  // Soot along a roofline, thinning as it goes down; white crust (salt) along a damp foot of wall
  function soot(x0, x1, y, depth) { for (var d = 0; d < depth; d++) for (var x = x0; x < x1; x++) if (rnd() < 0.5 * (1 - d / depth)) px(x, y + d, K.SOOT); }
  function crust(x0, x1, y, depth) { for (var d = 0; d < depth; d++) for (var x = x0; x < x1; x++) if (rnd() < 0.35 * (1 - d / depth)) px(x, y - d, K.EFFLO); }
  // A wordless tag: a looping 2 px line with a darker outline under it
  function tag(x, y, w, m) {
    var cx = x, cy = y, pts = [];
    for (var s = 0; s < w; s++) { pts.push([cx, cy]); cx += 1; cy += Math.round(Math.sin(s * 0.7 + rnd()) * 1.6); }
    pts.forEach(function (p) { box(p[0], p[1] + 1, 2, 2, K.DARK); });
    pts.forEach(function (p) { box(p[0], p[1], 2, 2, m); });
    for (var q = 0; q < 3; q++) px(x + rnd() * w, y + 4 + rnd() * 3, m);   // drips
  }
  function stains(x0, x1, y0, y1) { for (var k = 0; k < (x1 - x0) / 6; k++) { var sx = x0 + Math.floor(rnd() * (x1 - x0)), len = 6 + Math.floor(rnd() * 30), sy = y0 + Math.floor(rnd() * (y1 - y0)); box(sx, sy, 1, len, K.STAIN, sy, len); } }
  function lantern(x, cy, rx, ry, top) { box(x, top, 1, cy - ry - top, K.LANTD); ellipse(x, cy, rx, ry, K.LANT, 0.5); box(x - rx, cy - 1, rx * 2, 1, K.LANTD); box(x - rx + 3, cy - ry, rx * 2 - 6, 2, K.LANTD); box(x - rx + 3, cy + ry - 1, rx * 2 - 6, 2, K.LANTD); box(x, cy + ry + 1, 1, 4, K.LANT); }

  // ---------- Where things are (art pixels, 1280 x 720) ----------
  var MARQUEE = { x: 540, y: 160, w: 260, h: 84, z: 0.45, text: 'MERGE NOTES', cell: 4, gap: 2, by: 'BY NIHAAL', byCell: 2, byY: 52 };
  var LANTERNS = [[548, 452], [600, 452], [740, 452], [792, 452]], AWNING_Z = 0.56;
  var LAMPHEAD = [1198, 336], WORKLIGHT = [1151, 548];
  var STOOLS = [570, 591, 612, 633, 712, 734, 756, 778];   // along the bar's outside counter
  // Each sign's light, which brightens when its link is pointed at or focused: x, y, radius, colour, depth
  var SPILLS = {
    feed: [96, 428, 150, [140, 230, 170], 0.43], linkedin: [148, 366, 90, [130, 230, 200], 0.43], articles: [418, 316, 150, [255, 200, 90], 0.53],
    books: [266, 478, 110, [255, 190, 120], 0.47], kiosk: [478, 470, 80, [255, 140, 110], 0.47], about: [670, 470, 150, [255, 200, 140], 0.5],
    menu: [670, 370, 130, [255, 236, 210], 0.5], data: [895, 470, 140, [140, 255, 190], 0.42], contact: [1080, 470, 130, [150, 230, 255], 0.46],
    billboard: [1080, 172, 140, [200, 200, 255], 0.46], network: [1189, 220, 110, [255, 120, 200], 0.43], subway: [1085, 580, 110, [200, 230, 255], HOLE_Z]
  };
  // Shop fronts whose light falls across the footpath: x, width, colour, depth
  var FRONTS = [[-4, 190, '226,244,236', 0.43], [206, 120, '255,190,120', 0.47], [446, 64, '255,200,140', 0.47], [486, 40, '210,236,240', 0.44],
    [556, 84, '255,186,116', 0.5], [644, 50, '255,186,116', 0.5], [698, 92, '255,186,116', 0.5], [812, 166, '150,255,200', 0.42], [996, 168, '210,236,255', 0.46]];

  // ---------- The parts of the street ----------
  function paintFar() {
    seed = 4242;
    var x = -M;
    while (x < W + M) {
      var w = 34 + Math.floor(rnd() * 58), top = 80 + Math.floor(rnd() * 190);
      if (rnd() < 0.22) top = 34 + Math.floor(rnd() * 60);
      box(x, top, w, GROUND - top, K.SKYB);
      for (var wy = top + 6; wy < GROUND; wy += 7) for (var wx = x + 4; wx < x + w - 4; wx += 6) if (rnd() < 0.2) box(wx, wy, 2, 3, K.SKYWIN);
      if (top < 110) { box(x + Math.floor(w / 2) - 1, top - 16, 2, 16, K.SKYB); px(x + Math.floor(w / 2), top - 17, K.SKYRED); }
      x += w + Math.floor(rnd() * 12);
    }
    x = -M;
    while (x < W + M) {
      var w2 = 46 + Math.floor(rnd() * 84), top2 = 214 + Math.floor(rnd() * 120);
      box(x, top2, w2, GROUND - top2, K.SKYB2);
      for (var vy = top2 + 8; vy < GROUND; vy += 9) for (var vx = x + 5; vx < x + w2 - 5; vx += 8) if (rnd() < 0.14) box(vx, vy, 3, 4, K.SKYWIN2);
      if (rnd() < 0.45) { box(x + 8, top2 - 12, 16, 12, K.SKYB2); box(x + 10, top2 - 15, 12, 3, K.SKYB2); }
      x += w2 + Math.floor(rnd() * 6);
    }
  }

  // A: an apartment block with balconies, a LinkedIn lightbox, and FEED, a grocery that never closes (the RSS feed)
  function paintA() {
    seed = 101;
    box(-M, 160, 196 + M, 370, K.CONC, 160, 400); box(-M, 152, 196 + M, 8, K.CONC2); box(-M, 152, 196 + M, 1, K.CONCD);
    speckle(-M, 160, 196, 416, 0.015);
    blocks(-M, 160, 196, 416, 26, 13, K.CONC); soot(-M, 196, 160, 6);
    box(18, 120, 44, 30, K.TANK, 120, 30); box(22, 150, 3, 4, K.METALD); box(54, 150, 3, 4, K.METALD); box(16, 118, 48, 3, K.METAL);
    box(18, 128, 44, 1, K.METALD); box(18, 140, 44, 1, K.METALD); box(18, 120, 2, 30, K.ROOFHI);   // the tank's bands and lit edge
    box(64, 118, 1, 34, K.METALD); box(68, 118, 1, 34, K.METALD); for (var ld = 120; ld < 152; ld += 4) box(64, ld, 5, 1, K.METAL);   // a ladder up the tank
    line(160, 96, 160, 152, K.METAL); line(150, 108, 170, 108, K.METAL); line(152, 120, 168, 120, K.METAL);
    for (var ae = 0; ae < 5; ae++) { box(155 - ae, 100 + ae * 4, 11 + ae * 2, 1, K.METALD); }   // an aerial's rods
    ellipse(112, 144, 6, 5, K.AC); ellipse(113, 144, 4, 3, K.ACD); box(112, 146, 2, 6, K.METALD); line(112, 144, 118, 139, K.METALD);   // a satellite dish
    // a rooftop garden: pots, a trellis, a striped deck chair and a little table
    [[76, 7], [86, 9], [130, 6], [140, 8]].forEach(function (p) { box(p[0], 144, 8, 8, K.POT); box(p[0], 144, 8, 1, K.CRATE); ellipse(p[0] + 4, 140, p[1] * 0.6, p[1] * 0.55, K.PLANT); px(p[0] + 2, 137, K.PLANTHI); px(p[0] + 6, 139, K.FRUIT3); });
    for (var tr = 0; tr < 4; tr++) { box(96 + tr * 4, 128, 1, 24, K.WOODD); } box(96, 132, 14, 1, K.WOODD); box(96, 140, 14, 1, K.WOODD); ellipse(100, 130, 4, 3, K.PLANT); ellipse(106, 137, 3, 3, K.PLANT);
    poly([[112, 151], [116, 140], [126, 140], [121, 151]], K.LAUN3); for (var st = 0; st < 4; st++) line(114 + st * 2, 150, 118 + st * 2, 141, K.LAUN1);   // the deck chair's canvas
    line(112, 151, 117, 139, K.WOODD); line(121, 151, 126, 139, K.WOODD); box(110, 146, 18, 1, K.WOODD);
    box(122, 145, 7, 1, K.WOODL); box(124, 146, 1, 6, K.WOODD); box(123, 143, 2, 2, K.PAPER);
    conduit(108, 176, 416);
    [160, 246, 332].forEach(function (fy, f) {
      slab(-M, fy + 84, 196 + M);
      win(-56, fy + 16, 30, 42, pickWin());
      var bigW = pickWin(), smallW = pickWin();
      box(-12, fy + 18, 46, 62, bigW, fy + 18, 62); box(40, fy + 24, 44, 40, smallW, fy + 24, 40);
      if (rnd() < 0.5 && (smallW === K.WINW || smallW === K.WINC)) peep({ win: null, x: 40, y: fy + 24, w: 44, h: 40, left: 40, kind: HOME_KINDS[Math.floor(rnd() * HOME_KINDS.length)] });
      balcony(-16, fy + 54, 106, f !== 1, f === 1 ? 'bike' : null);
      if (f < 2) { win(112, fy + 16, 72, 42, pickWin()); ac(140, fy + 64); }
    });
    box(108, 338, 80, 56, K.POSTER, 338, 56); frame(106, 336, 84, 60, K.METALD, 2);
    sign('FOLLOW', 148, 346, { font: F3, scale: 2, fill: K.POSTERD }); sign('LINKEDIN', 148, 362, { font: F3, scale: 2, fill: K.POSTERD }); box(118, 380, 60, 2, K.POSTERD);
    stains(-M, 196, 170, 410); cracks(-M, 196, 170, 406, 6); bareBrick(98, 300, 7, 9); bareBrick(-30, 236, 5, 4);
    // FEED
    box(-M, 416, 196 + M, 22, K.BOXG, 416, 22); box(-M, 416, 196 + M, 1, K.METALD); box(-M, 437, 196 + M, 1, K.METALD);
    sign('FEED', 60, 420, { font: FB, scale: 2, fill: K.LETW, shade: K.BOXGD });
    text('OPEN 24H', 128, 425, K.LETW, 1);
    box(-M, 438, 196 + M, 92, K.CONC2);
    box(-4, 444, 190, 84, K.SHOPF, 444, 84);
    [462, 484, 506].forEach(function (sy) { box(0, sy, 182, 2, K.SHELF); for (var x = 2; x < 180; x += 4) if (rnd() < 0.8) box(x, sy - 6, 3, 6, rnd() < 0.4 ? K.SHELFR : rnd() < 0.5 ? K.SHELFY : K.SHELFB); });
    peep({ win: null, shop: true, x: -4, y: 444, w: 190, h: 84, left: 110, kind: 'browse', ah: 40 });   // someone filling the shelves
    frame(-4, 444, 190, 84, K.METAL, 2); box(60, 444, 2, 84, K.METAL); box(124, 444, 2, 84, K.METAL);
    // sale stickers on the glass: a red starburst and a yellow disc, no words
    [[30, 452, K.SIGNRD], [96, 456, K.BOXY], [160, 450, K.SIGNRD]].forEach(function (s, i) {
      var sx = s[0], sy = s[1]; ellipse(sx, sy, 6, 6, s[2]); if (i !== 1) for (var a = 0; a < 8; a++) px(sx + Math.round(Math.cos(a * 0.785) * 7), sy + Math.round(Math.sin(a * 0.785) * 7), s[2]);
      box(sx - 3, sy - 1, 7, 1, K.SNOW); box(sx - 2, sy + 2, 5, 1, K.SNOW); px(sx - 2, sy - 3, K.SNOW);
    });
  }

  // B: an old wooden shop-house with a tiled roof: a bookshop, ARTICLES
  function paintB() {
    seed = 202;
    box(196, 328, 224, 202, K.WOOD, 328, 202);
    woodGrain(200, 330, 420, 418, 8);
    for (var pk = 0; pk < 34; pk++) { var ppx = 200 + Math.floor(rnd() * 218), ppy = 334 + Math.floor(rnd() * 80); box(ppx, ppy, 2 + Math.floor(rnd() * 4), 1 + Math.floor(rnd() * 2), K.PEEL); if (rnd() < 0.5) px(ppx, ppy + 2, K.WOODD); }   // old paint flaking off
    for (var nx = 204; nx < 418; nx += 16) { px(nx, 340, K.METALD); px(nx, 396, K.METALD); }   // nail heads
    poly([[186, 330], [430, 330], [418, 300], [198, 300]], K.ROOF, 0.4);
    for (var tx = 200; tx < 418; tx += 5) box(tx, 302, 1, 26, K.ROOFD);
    for (var ty = 304; ty < 328; ty += 6) for (var tx2 = 201; tx2 < 418; tx2 += 5) px(tx2, ty, K.ROOFHI);
    box(198, 297, 220, 4, K.ROOFHI); box(186, 328, 244, 3, K.ROOFD); box(196, 331, 224, 3, K.DARK);
    box(250, 270, 10, 30, K.METAL); box(248, 268, 14, 3, K.METALD);       // the stove pipe that smokes
    [[212, 344], [318, 344]].forEach(function (p, i) {
      box(p[0] - 3, p[1] - 3, 84, 58, K.WOODD); box(p[0], p[1], 78, 52, K.WINW, p[1], 52);
      if (i === 0) peep({ win: null, screen: true, x: p[0], y: p[1], w: 78, h: 52, left: p[0], kind: 'tea', ah: 44 });   // a shadow on the paper screen
      for (var lx = p[0] + 6; lx < p[0] + 78; lx += 8) box(lx, p[1], 1, 52, K.WOODD); box(p[0], p[1] + 26, 78, 1, K.WOODD); box(p[0] - 4, p[1] + 54, 86, 3, K.WOODL);
    });
    box(208, 402, 200, 14, K.BOXW); centred('BOOKS · PAPERS', 308, 405, K.LETD, 2);
    box(196, 418, 224, 3, K.DARK);
    // the shop window: shelves of books, a lamp, someone reading
    box(206, 438, 120, 80, K.SHOPW, 438, 80);
    [452, 470, 488, 506].forEach(function (sy) {
      box(208, sy, 116, 2, K.WOODD);
      for (var bx = 209; bx < 322;) { var bw = 2 + Math.floor(rnd() * 3), bh = 9 + Math.floor(rnd() * 6), r = rnd(); if (rnd() < 0.88) box(bx, sy - bh, bw, bh, r < 0.25 ? K.BOOK1 : r < 0.5 ? K.BOOK2 : r < 0.75 ? K.BOOK3 : K.BOOK4); bx += bw + (rnd() < 0.2 ? 2 : 0); }
    });
    peep({ win: null, shop: true, x: 206, y: 438, w: 120, h: 80, left: 270, kind: 'read', ah: 44 }); box(296, 440, 2, 8, K.INTDK); box(291, 448, 12, 3, K.LAMPS);   // a reader by the lamp
    frame(204, 436, 124, 84, K.WOODD, 2); box(266, 438, 1, 80, K.WOODD);
    box(336, 436, 48, 94, K.DOORGL, 436, 94); frame(334, 434, 52, 96, K.WOODD, 2); box(358, 436, 2, 94, K.WOODD); box(338, 470, 18, 2, K.WOODL); box(362, 470, 18, 2, K.WOODL);
    box(206, 518, 120, 12, K.DARK); ellipse(396, 520, 9, 8, K.PLANT); box(390, 524, 12, 6, K.METALD);
  }
  function paintArticlesSign() {
    box(392, 222, 6, 4, K.METAL); box(392, 404, 6, 4, K.METAL);
    box(398, 204, 40, 224, K.BOXY, 204, 224); frame(398, 204, 40, 224, K.METALD, 2);
    vsign('ARTICLES', 418, 211, 26, { font: FB, scale: 3, fill: K.LETD, shade: K.BOXYD });
  }

  // C: a narrow walk-up with a cat on the roof
  function paintC() {
    seed = 303;
    box(420, 246, 120, 284, K.CONC2, 246, 300); box(416, 240, 128, 7, K.CONCD);
    speckle(420, 246, 540, 416, 0.015);
    blocks(420, 246, 540, 416, 20, 10, K.CONC2); soot(420, 540, 246, 5);
    win(436, 262, 34, 46, pickWin()); win(490, 262, 34, 46, pickWin());
    win(436, 348, 34, 46, pickWin()); box(490, 348, 34, 28, pickWin()); balcony(482, 376, 54, false, 'fairy');
    slab(420, 330, 120); slab(420, 416, 120);
    box(530, 250, 4, 280, K.METAL);
    box(486, 440, 40, 90, K.WIND, 440, 90); frame(484, 438, 44, 92, K.METALD, 2); box(505, 440, 1, 90, K.METALD);
    cracks(420, 250, 540, 410, 3); bareBrick(468, 322, 6, 5);
    tag(424, 470, 24, K.GRAF1); tag(440, 500, 18, K.GRAF2); crust(420, 484, 528, 7);   // tags and salt low on the wall
    // a torn poster: old layers showing through, one corner peeled down
    box(422, 442, 20, 24, K.PAPER); box(424, 444, 16, 8, K.MAG1); box(424, 454, 12, 2, K.LETD); box(424, 458, 9, 2, K.LETD); box(434, 456, 5, 6, K.MAG3);
    poly([[436, 442], [442, 442], [442, 452]], K.CONC2); poly([[436, 442], [442, 452], [437, 450]], K.PAPER); px(438, 449, K.CONCD);
    for (var tp = 0; tp < 9; tp++) px(422 + Math.floor(rnd() * 20), 465 + Math.floor(rnd() * 2), K.PAPER);   // ragged foot
    // the building's electricity: a meter box with its dial, a junction box, conduit up the wall
    box(448, 446, 14, 18, K.METAL); frame(448, 446, 14, 18, K.METALD); box(450, 448, 10, 7, K.GLASS); ellipse(455, 451, 2.5, 2.5, K.PAPER); px(455, 450, K.LETD); box(452, 458, 6, 1, K.METALD);
    box(466, 450, 10, 12, K.METALD); box(466, 450, 10, 1, K.METALHI); px(468, 455, K.SIGNRD);
    conduit(455, 424, 446); conduit(471, 432, 450);
    // cracked tiles round the door, and a worn tiled step
    for (var ty = 440; ty < 528; ty += 5) for (var tx = 476; tx < 484; tx += 4) { box(tx, ty, 3, 4, K.CONCL); if (rnd() < 0.15) px(tx + 1, ty + 1 + Math.floor(rnd() * 2), K.CRACK); }
    for (var ty2 = 440; ty2 < 528; ty2 += 5) { box(528, ty2, 3, 4, K.CONCL); if (rnd() < 0.15) px(529, ty2 + 2, K.CRACK); }
    for (var sx3 = 476; sx3 < 532; sx3 += 4) { box(sx3, 527, 3, 3, K.CONC2); if (rnd() < 0.3) px(sx3 + 1, 528, K.CRACK); }
    ellipse(516, 238, 3, 1.4, K.METALHI); box(514, 237, 5, 1, K.FRUIT1);   // a dish out for the roof cat
    // (the cat on this roof is drawn live: see drawCat)

  }

  // D: the bar, ТАТЬЯНА'S BAR (about me): a wooden house with a flat roof. Customers sit outside at the counter on
  // stools, facing in; the server works inside
  function paintD() {
    seed = 404;
    box(540, 330, 260, 200, K.WOOD, 330, 200);
    woodGrain(542, 332, 800, 404, 8);
    box(536, 322, 268, 8, K.WOODD); box(536, 322, 268, 2, K.ROOFHI);
    box(566, 336, 208, 66, K.MENUBG); frame(563, 333, 214, 72, K.MENUFR, 3);
    [600, 740].forEach(function (lx) { box(lx - 6, 330, 14, 3, K.LAMPS); });                  // two little lamps on the roof edge, shining down on the board
    box(540, 424, 260, 16, K.BOARD); frame(540, 424, 260, 16, K.WOODD);
    sign("ТАТЬЯНА'S BAR", 670, 425, { font: FB, scale: 2, fill: K.GOLD, hi: K.GOLDHI, outline: K.LETD, wear: 0.05 });
    box(540, 440, 260, 90, K.WOODD);
    [[556, 84], [698, 92]].forEach(function (p) {
      var x0 = p[0], w = p[1];
      box(x0, 446, w, 46, K.SHOPW, 446, 46);
      box(x0, 452, w, 1, K.INTDK); for (var sx2 = x0 + 4; sx2 < x0 + w - 4; sx2 += 4) if (rnd() < 0.7) box(sx2, 455, 2, 7, rnd() < 0.5 ? K.SHELFR : K.SHELFY);
      for (var lx2 = x0 + 14; lx2 < x0 + w - 8; lx2 += 30) { box(lx2, 446, 1, 14, K.INTDK); box(lx2 - 3, 460, 7, 3, K.LAMPS); }
      box(x0, 486, w, 6, K.COUNTER2); box(x0, 486, w, 1, K.METALHI);                   // the steel pass inside
      frame(x0 - 2, 444, w + 4, 50, K.WOODL, 2);
      box(x0 - 6, 492, w + 12, 5, K.COUNTER); box(x0 - 6, 492, w + 12, 1, K.WOODL); box(x0 - 6, 497, w + 12, 2, K.INTDK);   // the counter outside
    });
    box(546, 516, 8, 14, K.WOODD);                                             // (the stool row starts after the plant)
    STOOLS.forEach(function (sx) { box(sx - 9, 502, 18, 4, K.STOOL); box(sx - 9, 502, 18, 1, K.WOODL); box(sx - 9, 505, 18, 1, K.INTDK); line(sx - 7, 506, sx - 9, 528, K.METALD, 2); line(sx + 7, 506, sx + 9, 528, K.METALD, 2); box(sx - 8, 519, 16, 1, K.METAL); });
    box(644, 452, 50, 78, K.DOORGL, 452, 78); frame(642, 450, 54, 80, K.WOODL, 2); box(668, 452, 2, 78, K.WOODL);
    box(642, 452, 54, 24, K.NOREN); for (var nx2 = 650; nx2 < 694; nx2 += 11) box(nx2, 454, 1, 22, K.NORENL);
    box(540, 516, 260, 14, K.DARK);
  }
  // The bar's tiled awning, a little in front of it, with lanterns
  function paintAwning() {
    poly([[532, 424], [808, 424], [798, 406], [542, 406]], K.ROOF, 0.4);
    for (var x = 544; x < 800; x += 6) box(x, 407, 1, 16, K.ROOFD);
    for (var y = 410; y < 422; y += 5) for (var x2 = 546; x2 < 798; x2 += 6) px(x2, y, K.ROOFHI);
    box(540, 404, 260, 3, K.ROOFHI); box(532, 423, 276, 3, K.ROOFD);
    LANTERNS.forEach(function (l) { lantern(l[0], l[1], 7, 9, 426); });
  }
  // The MERGE NOTES bulb sign on a steel frame standing on the bar's roof (the bulbs are drawn live)
  function paintMarquee() {
    [[566, 576], [764, 774]].forEach(function (p) {
      box(p[0], 244, 2, 80, K.METAL); box(p[1], 244, 2, 80, K.METAL);
      for (var y = 250; y < 320; y += 12) { line(p[0], y, p[1], y + 12, K.METALD); line(p[1], y, p[0], y + 12, K.METALD); }
    });
    box(552, 250, 236, 3, K.METAL); box(552, 245, 236, 1, K.METALD); for (var x = 554; x < 788; x += 10) box(x, 245, 1, 5, K.METALD);
    [620, 670, 720].forEach(function (lx) { box(lx, 253, 2, 6, K.METALD); box(lx - 6, 258, 14, 4, K.METAL); box(lx - 5, 258, 12, 2, K.LAMPS); });
    box(MARQUEE.x, MARQUEE.y, MARQUEE.w, MARQUEE.h, K.METALD, MARQUEE.y, MARQUEE.h); frame(MARQUEE.x, MARQUEE.y, MARQUEE.w, MARQUEE.h, K.METAL, 2);
  }

  // E: a concrete block with DATA, an electronics shop whose monitors show charts (Dubai data)
  function paintE() {
    seed = 505;
    box(800, 160, 190, 370, K.CONC, 160, 400); box(796, 152, 198, 8, K.CONC2); box(796, 152, 198, 1, K.CONCD);
    speckle(800, 160, 990, 412, 0.015);
    blocks(800, 160, 990, 412, 24, 12, K.CONC); soot(800, 990, 160, 6);
    box(940, 118, 36, 34, K.TANK, 118, 34); box(938, 116, 40, 3, K.METAL);
    box(962, 120, 8, 32, K.METAL);                                            // a vent that smokes
    ellipse(836, 144, 8, 6, K.AC); box(836, 146, 2, 7, K.METALD); line(836, 144, 843, 139, K.METALD);   // a satellite dish
    box(984, 152, 3, 378, K.METAL); [200, 300, 400].forEach(function (y) { box(983, y, 5, 2, K.METALD); });   // a downpipe
    box(796, 158, 198, 1, K.METALD);                                          // the gutter
    [160, 246, 332].forEach(function (fy, f) {
      slab(800, fy + 84, 190);
      [812, 870, 928].forEach(function (wx) { win(wx, fy + 18, 40, 44, pickWin()); });
      if (f === 1) balcony(806, fy + 40, 104, true, 'rug');
      if (f !== 1) ac(822 + f * 40, fy + 66);
    });
    stains(800, 990, 170, 400); cracks(800, 990, 170, 404, 5); bareBrick(918, 234, 7, 5); bareBrick(860, 400, 5, 4);
    conduit(862, 166, 412);
    box(976, 118, 1, 34, K.METALD); box(980, 118, 1, 34, K.METALD); for (var ld2 = 120; ld2 < 152; ld2 += 4) box(976, ld2, 5, 1, K.METAL);   // a ladder up the tank
    line(900, 108, 900, 152, K.METAL); for (var ae2 = 0; ae2 < 4; ae2++) box(894 + ae2, 112 + ae2 * 4, 12 - ae2 * 2, 1, K.METALD);   // an aerial
    box(856, 126, 2, 26, K.METALD); box(886, 126, 2, 26, K.METALD); box(854, 150, 36, 2, K.METALD);   // the frame for a rooftop neon (lit live)
    // ivy up the left corner: thick at the foot, thinning as it climbs
    for (var iy = 410; iy > 196; iy -= 1) {
      var reach = Math.round(2 + 10 * (iy - 196) / 214 + Math.sin(iy * 0.21) * 2);
      for (var ix = 0; ix < reach; ix++) if (rnd() < 0.55 - ix * 0.03) px(800 + ix, iy, rnd() < 0.25 ? K.PLANTHI : rnd() < 0.5 ? K.PLANT : K.MOSS);
      if (iy % 9 === 0) px(800 + Math.floor(rnd() * reach), iy, K.WOODD);   // a woody stem showing
    }
    box(800, 412, 190, 30, K.BOXB, 412, 30); frame(800, 412, 190, 30, K.METALD, 2);
    sign('DATA', 868, 416, { font: FB, scale: 3, fill: K.LETD, shade: K.BOXBD });
    centred('DUBAI', 950, 419, K.LETD, 1); centred('NUMBERS', 950, 427, K.LETD, 1);
    box(800, 442, 190, 88, K.DARK);
    box(812, 448, 166, 80, K.INTDK);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) {
      var mx = 816 + c * 27, my = 451 + r * 25, on = rnd() < 0.85;
      box(mx, my, 23, 21, K.MONCASE); box(mx + 2, my + 2, 19, 14, on ? K.MON : K.GLASS, my + 2, 14);
      if (on) for (var b = 0; b < 4; b++) { var bh = 2 + Math.floor(rnd() * 10); box(mx + 4 + b * 4, my + 15 - bh, 3, bh, rnd() < 0.55 ? K.MONB : K.MONA); }
      box(mx + 9, my + 17, 5, 3, K.MONCASE);
    }
    frame(810, 446, 170, 84, K.METAL, 2);
  }

  // F: brick, CONTACT (a phone shop), a ticker, a billboard on the roof
  function paintF() {
    seed = 606;
    box(990, 246, 180, 284, K.BRICK, 246, 300);
    // bricks of four fired tones, mortar between, chips, and here and there one gone
    for (var by = 248; by < 412; by += 6) {
      box(990, by + 5, 180, 1, K.BRICKD); var off = ((by / 6) % 2) * 7;
      for (var bx2 = 990 + off; bx2 < 1170; bx2 += 14) {
        box(bx2, by, 1, 5, K.BRICKD); var br = rnd();
        if (br < 0.1) box(bx2 + 1, by, 12, 5, K.BRICKHI); else if (br < 0.22) box(bx2 + 1, by, 12, 5, K.BRICKR); else if (br < 0.33) box(bx2 + 1, by, 12, 5, K.BRICKO);
        else if (br < 0.345) { box(bx2 + 1, by, 12, 5, K.BRICKX); box(bx2 + 1, by, 12, 1, K.BRICKD); px(bx2 + 12, by + 4, K.BRICKHI); }
        if (br >= 0.345) { box(bx2 + 1, by, 12, 1, br < 0.6 ? K.BRICKHI : K.BRICK); if (rnd() < 0.35) px(bx2 + 2 + rnd() * 10, by + 1 + rnd() * 3, K.BRICKD); }
      }
    }
    for (var gy = 328; gy < 346; gy++) for (var gx = 1000; gx < 1160; gx++) if ((gx + gy) % 2 === 0 && rnd() < (gy < 331 || gy > 342 ? 0.55 : 0.25)) px(gx, gy, K.GHOST);   // an old painted sign, nearly gone
    soot(990, 1170, 247, 6); crust(990, 1170, 410, 6);
    box(986, 240, 188, 7, K.CONCD);
    box(996, 254, 168, 24, K.TICKBG); frame(996, 254, 168, 24, K.METAL);
    for (var tx2 = 1000; tx2 < 1162; tx2 += 4) { px(tx2, 257, K.LEDR); px(tx2, 275, K.LEDR); }
    [1004, 1064, 1124].forEach(function (wx) { win(wx, 290, 36, 34, pickWin()); win(wx, 350, 36, 44, pickWin()); });
    [1010, 1150].forEach(function (lx) { line(lx, 232, lx, 246, K.METAL, 3); });
    box(994, 112, 172, 120, K.BILLFR); box(1000, 118, 160, 108, K.BILLBG);
    [1020, 1080, 1140].forEach(function (lx) { box(lx, 104, 2, 8, K.METALD); box(lx - 6, 102, 14, 3, K.LAMPS); });
    box(990, 412, 180, 30, K.SIGNBG); frame(990, 412, 180, 30, K.METALD, 2);
    sign('CONTACT', 1092, 420, { font: F5, scale: 2, fill: K.LETC, outline: K.TUBECD });
    box(990, 442, 180, 88, K.CONC2);
    box(996, 448, 168, 80, K.SHOPF, 448, 80);
    box(1000, 500, 160, 10, K.COUNTER2); box(1000, 500, 160, 1, K.METALHI);
    for (var x = 1006; x < 1152; x += 18) { box(x + 5, 490, 2, 10, K.METALD); box(x, 474, 12, 17, K.PHONEC); box(x + 2, 476, 8, 12, K.PHONEL, 476, 12); }
    box(1004, 452, 22, 16, K.BOXR); box(1134, 452, 22, 16, K.BOXY);
    peep({ win: null, shop: true, x: 996, y: 448, w: 168, h: 80, left: 1090, kind: 'clerk', ah: 44 });   // the assistant behind the counter
    frame(996, 448, 168, 80, K.METAL, 2);
  }

  // G: a tall building at the end of the street (its NETWORK sign is LinkedIn)
  function paintG() {
    seed = 707;
    box(1170, 74, 134 + M, 456, K.CONC2, 74, 480); box(1166, 66, 142 + M, 8, K.CONCD);
    speckle(1170, 74, W + M, 418, 0.015);
    blocks(1170, 74, W + M, 418, 22, 11, K.CONC2); soot(1170, W + M, 74, 7);
    [74, 160, 246, 332].forEach(function (fy) { slab(1170, fy + 84, 134 + M); win(1214, fy + 20, 34, 44, pickWin()); win(1262, fy + 20, 34, 44, pickWin()); win(1310, fy + 20, 30, 44, pickWin()); });
    box(1170, 418, 134 + M, 112, K.CONCD);
    // behind the shutter: a laundromat (the shutter itself is its own part, rolled up by day: see SHUTTER)
    box(1180, 430, 120, 100, K.LAUNW, 430, 100);
    box(1182, 438, 116, 2, K.WOODD); for (var dx2 = 1184; dx2 < 1296; dx2 += 6) box(dx2, 432 + (dx2 % 4), 4, 6 - (dx2 % 4), dx2 % 12 ? K.MAG2 : K.MAG3);   // soap on a shelf
    for (var wm = 0; wm < 5; wm++) { var wx2 = 1184 + wm * 23; box(wx2, 484, 20, 44, K.WASHER); box(wx2, 484, 20, 4, K.METAL); ellipse(wx2 + 10, 505, 7, 7, K.METALD); ellipse(wx2 + 10, 505, 5.5, 5.5, wm % 2 ? K.LAUN2 : K.GLASS); px(wx2 + 7, 502, K.SNOW); px(wx2 + 3, 486, K.LEDG); }
    box(1182, 460, 40, 3, K.WOODL); box(1184, 455, 10, 5, K.LAUN1); box(1198, 456, 8, 4, K.LAUN3);   // a folding table with a folded pile
    box(1176, 424, 128, 7, K.METALD); box(1176, 424, 128, 1, K.METALHI);   // the shutter's roller box
    stains(1170, W + M, 90, 410); cracks(1170, W + M, 90, 410, 5); bareBrick(1300, 300, 8, 6);
    [74, 160, 246].forEach(function (fy) {                                     // a fire escape: landings, rails, and stairs between
      box(1206, fy + 66, 96, 2, K.METALD); box(1206, fy + 56, 96, 1, K.METALD);
      for (var rx = 1206; rx <= 1302; rx += 6) box(rx, fy + 56, 1, 10, K.METALD);
      if (fy < 246) { line(1214, fy + 68, 1290, fy + 152, K.METALD, 2); for (var st = 0; st < 12; st++) box(1218 + st * 6, fy + 72 + st * 7, 5, 1, K.METAL); }
    });
    line(1230, 400, 1230, 418, K.METALD, 2); box(1222, 398, 18, 2, K.METALD);   // the drop ladder, pulled up
    [74, 160, 246].forEach(function (fy) { for (var rr = 0; rr < 7; rr++) { var rxx = 1208 + Math.floor(rnd() * 92), rl = 4 + Math.floor(rnd() * 14); box(rxx, fy + 68, 1, rl, K.RUSTST, fy + 68, rl); } for (var rp = 1206; rp < 1302; rp += 3) if (rnd() < 0.3) px(rp, fy + 66, K.RUSTST); });   // rust bleeding from the landings
    ellipse(1262, 58, 7, 5, K.AC); box(1262, 60, 2, 6, K.METALD); line(1262, 58, 1268, 54, K.METALD);   // a satellite dish
    box(1172, 74, 3, 456, K.METAL); [140, 260, 380].forEach(function (y) { box(1171, y, 5, 2, K.METALD); });   // a downpipe
  }
  // The laundromat's roller shutter, with its tags: a part of its own, so it can roll up in the morning
  function paintShutter() {
    seed = 717;
    box(1180, 430, 120, 100, K.SHUT, 430, 100); for (var sy2 = 432; sy2 < 526; sy2 += 4) { box(1180, sy2, 120, 1, K.METAL); box(1180, sy2 + 1, 120, 1, K.SHUT); }
    box(1180, 526, 120, 4, K.METALD); box(1236, 522, 8, 4, K.METAL);   // the bottom bar and its handle
    tag(1194, 468, 30, K.GRAF2); tag(1236, 488, 26, K.GRAF1); tag(1262, 456, 20, K.GRAF3);
    for (var r = 0; r < 30; r++) px(1180 + Math.floor(rnd() * 120), 430 + Math.floor(rnd() * 96), rnd() < 0.5 ? K.RUSTST : K.STAIN);
  }
  function paintNetworkSign() {
    box(1170, 130, 6, 3, K.METAL); box(1170, 308, 6, 3, K.METAL);
    box(1176, 120, 26, 200, K.SIGNBG); frame(1176, 120, 26, 200, K.TUBEP, 2);
    vsign('NETWORK', 1189, 128, 26, { font: F5, scale: 2, fill: K.LETP, outline: K.TUBEPD });
  }

  // Things standing on the footpath at the building line: the NEWSLETTER newsstand, fruit crates, a hydrant
  function paintProps() {
    seed = 808;
    box(434, 404, 88, 6, K.METALD); box(438, 410, 80, 14, K.SIGNR); frame(438, 410, 80, 14, K.METALD);
    sign('NEWSLETTER', 478, 413, { font: F5, scale: 1, fill: K.LETW, shade: K.LETD });
    box(440, 424, 76, 106, K.KIOSK, 424, 106); frame(440, 424, 76, 106, K.METALHI);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 7; c++) { var mm = rnd(); box(444 + c * 10, 430 + r * 14, 8, 11, mm < 0.33 ? K.MAG1 : mm < 0.66 ? K.MAG2 : K.MAG3); box(445 + c * 10, 432 + r * 14, 5, 1, K.PAPER); }
    box(446, 474, 64, 22, K.SHOPW, 474, 22); peep({ win: null, shop: true, x: 446, y: 474, w: 64, h: 22, left: 466, kind: 'vendor', ah: 30 });   // the newsagent
    box(440, 496, 76, 4, K.WOODL); box(446, 500, 22, 8, K.PAPER); for (var ly = 502; ly < 508; ly += 2) box(447, ly, 20, 1, K.LETD);
    box(474, 502, 38, 15, K.BOARD); centred('JOIN FREE', 493, 507, K.LETW, 1);
    box(440, 522, 76, 8, K.KIOSKD);
    // fruit crates outside FEED
    [6, 42, 78].forEach(function (x, i) {
      box(x, 514, 32, 16, K.CRATE); box(x, 520, 32, 1, K.WOODD); box(x, 525, 32, 1, K.WOODD);
      var f = [K.FRUIT1, K.FRUIT2, K.FRUIT3][i];
      for (var k = 0; k < 7; k++) ellipse(x + 4 + k * 4, 512 + (k % 2), 2.5, 2.5, f);
    });
    box(790, 514, 10, 16, K.HYDRANT); box(788, 512, 14, 3, K.HYDRANT); box(787, 518, 16, 3, K.HYDRANT);
    // a wheelie bin and rubbish bags beside FEED
    box(150, 506, 16, 24, K.BIN); box(148, 503, 20, 4, K.BIND); box(152, 512, 12, 1, K.BIND); box(152, 527, 3, 3, K.METALD); box(161, 527, 3, 3, K.METALD);
    ellipse(174, 524, 7, 6, K.BAG); ellipse(184, 526, 5, 4, K.BAG); px(174, 517, K.BAGHI); px(173, 518, K.BAGHI); px(184, 521, K.BAGHI);
    // a potted plant beside the bar's stools
    box(543, 520, 10, 10, K.POT); box(542, 519, 12, 2, K.POTD); ellipse(548, 513, 7, 7, K.PLANT); ellipse(545, 509, 4, 4, K.PLANT); px(551, 508, K.PLANTHI); px(546, 512, K.PLANTHI);
    // a drinks machine by CONTACT
    box(1142, 488, 22, 42, K.VEND); frame(1142, 488, 22, 42, K.METALD); box(1145, 492, 16, 18, K.VENDW, 492, 18);
    for (var vr = 0; vr < 3; vr++) for (var vc = 0; vc < 4; vc++) box(1146 + vc * 4, 494 + vr * 5, 2, 3, [K.FRUIT1, K.FRUIT2, K.MAG2, K.MAG3][(vr + vc) % 4]);
    box(1146, 514, 8, 2, K.METALD); box(1157, 513, 3, 6, K.LEDG); box(1145, 521, 16, 5, K.METALD);
  }

  // The ground: footpath, the subway stairwell dug into it, curb, gutter, road with its lane line and crosswalk,
  // a manhole. It is a lived-in street: stains, cracks, gum, litter and leaves, oil and patches on the road.
  function paintGround() {
    seed = 555;
    box(-M, GROUND, W + 2 * M, FOOT - GROUND, K.PAVE, GROUND, FOOT - GROUND);
    var VX = 640, VY = 160;
    [530, 537, 545, 554, 564, 575, 587].forEach(function (y) { box(-M, y, W + 2 * M, 1, K.PAVED); box(-M, y + 1, W + 2 * M, 1, K.PAVEHI); });
    for (var xf = -760; xf <= 2040; xf += 72) for (var y = GROUND; y < FOOT; y++) px(VX + (xf - VX) * (y - VY) / (FOOT - VY), y, K.PAVED);
    for (var n = 0; n < 1300; n++) px(-M + Math.floor(rnd() * (W + 2 * M)), GROUND + 2 + Math.floor(rnd() * (FOOT - GROUND - 3)), rnd() < 0.5 ? K.PAVED : K.PAVEHI);
    mess(GROUND + 3, FOOT - 3, true);
    box(270, 588, 60, 6, K.METALD); for (var gx = 272; gx < 328; gx += 4) box(gx, 589, 2, 4, K.METAL);   // a grate that steams
    // the subway stairwell: a tiled wall, steps going down to the right, a lit passage at the bottom
    poly([[1004, 572], [1166, 572], [1170, 600], [1000, 600]], K.SUBDARK);
    box(1004, 572, 162, 14, K.TILEW, 572, 14);
    for (var ty = 575; ty < 586; ty += 4) box(1004, ty, 162, 1, K.TILEG);
    for (var tx = 1006; tx < 1166; tx += 7) box(tx, 572, 1, 14, K.TILEG);
    box(1004, 572, 162, 2, K.METALD);
    box(1020, 575, 34, 2, K.TUBEW); box(1100, 575, 34, 2, K.TUBEW);
    for (var i = 0; i < 9; i++) { var sx = 1004 + i * 18, sy = Math.round(585 + i * 1.6); box(sx, sy, 18, 600 - sy, K.STEP, sy, 600 - sy); box(sx, sy, 18, 1, K.STEPHI); }
    line(1006, 580, 1150, 591, K.SUBRAIL, 2);
    box(1148, 586, 18, 14, K.SUBLIT, 586, 14);
    // curb, gutter (with a drain), road
    box(-M, FOOT, W + 2 * M, 3, K.CURBHI); box(-M, FOOT + 3, W + 2 * M, 9, K.CURB); box(-M, FOOT + 12, W + 2 * M, 2, K.METALD);
    for (var cc = 0; cc < 60; cc++) px(-M + Math.floor(rnd() * (W + 2 * M)), FOOT + 3 + Math.floor(rnd() * 8), rnd() < 0.6 ? K.GRIME : K.CURBHI);
    box(-M, ROAD, W + 2 * M, H - ROAD, K.ASPH, ROAD, H - ROAD);
    for (var m = 0; m < 900; m++) { var rgx = -M + Math.floor(rnd() * (W + 2 * M)), rgy = ROAD + 1 + Math.floor(rnd() * (H - ROAD - 2)); if (rnd() < 0.5) px(rgx, rgy, K.ASPH2); }
    // patches where the road was dug up before, and a pothole
    [[150, 640, 70, 14], [760, 690, 54, 18], [1120, 650, 90, 10]].forEach(function (r) { box(r[0], r[1], r[2], r[3], K.PATCH); frame(r[0], r[1], r[2], r[3], K.ASPH2); });
    ellipse(436, 700, 9, 3, K.OIL); ellipse(436, 699, 7, 2, K.METALD); box(430, 697, 10, 1, K.ASPH2);
    // tyre-darkened bands down each lane, oil drips where cars stand
    [[644, 652], [694, 702]].forEach(function (b) { for (var x = -M; x < W + M; x += 2) { if (rnd() < 0.35) px(x, b[0] + Math.floor(rnd() * 3), K.OIL); if (rnd() < 0.35) px(x, b[1] + Math.floor(rnd() * 3), K.OIL); } });
    for (var o = 0; o < 14; o++) { var ox2 = -M + Math.floor(rnd() * (W + 2 * M)), oy2 = rnd() < 0.5 ? 646 : 698; ellipse(ox2, oy2 + rnd() * 6, 4 + rnd() * 9, 1.2 + rnd() * 1.8, K.OIL); }
    // the lane line (worn), and the crosswalk
    for (var rx = -M; rx < W + M; rx += 96) for (var dx = 0; dx < 44; dx++) if (rnd() < 0.86) { px(rx + dx, 672, K.STRIPE2); px(rx + dx, 673, K.STRIPE2); }
    for (var c = 0; c < 10; c++) {
      var xt = 530 + c * 24, spread = function (x, yy) { return 640 + (x - 640) * (1 + (yy - 620) / 96 * 0.2); };
      poly([[spread(xt, 620), 620], [spread(xt + 13, 620), 620], [spread(xt + 13, 716), 716], [spread(xt, 716), 716]], K.STRIPE);
      for (var wv = 0; wv < 40; wv++) px(spread(xt, 620) + rnd() * 14, 620 + rnd() * 96, K.STRIPE2);     // worn paint
    }
    poly([[300, 640], [318, 634], [318, 638], [352, 638], [352, 642], [318, 642], [318, 646]], K.STRIPE2);      // arrows in the lanes
    poly([[1040, 694], [1022, 688], [1022, 692], [988, 692], [988, 696], [1022, 696], [1022, 700]], K.STRIPE2);
    ellipse(900, 696, 26, 6, K.METALD); ellipse(900, 696, 22, 4.6, K.METAL); for (var mh = 886; mh < 916; mh += 6) box(mh, 694, 3, 1, K.METALD);
    box(612, FOOT + 9, 30, 5, K.METALD); for (var dg = 614; dg < 640; dg += 4) box(dg, FOOT + 10, 2, 3, K.SUBDARK);   // a storm drain
    mess(ROAD + 2, H - 2, false);
  }
  // Grime and litter, scattered with the street's seed: stains, cracks, gum, cups, papers, cigarette ends, leaves
  function mess(y0, y1, footpath) {
    var span = function () { return -M + Math.floor(rnd() * (W + 2 * M)); }, row = function () { return y0 + Math.floor(rnd() * (y1 - y0)); };
    for (var s = 0; s < (footpath ? 26 : 10); s++) { var sx = span(), sy = row(), r = 3 + rnd() * 10; ellipse(sx, sy, r, 1 + rnd() * 2, K.GRIME); if (rnd() < 0.6) ellipse(sx + r * 0.6, sy + 1, r * 0.5, 1, K.GRIME); }
    if (footpath) for (var k = 0; k < 16; k++) {                                   // cracks in the paving
      var cx = span(), cy = row(), ang = rnd() * Math.PI;
      for (var q = 0; q < 6 + rnd() * 8; q++) { ang += (rnd() - 0.5) * 1.2; var nx = cx + Math.cos(ang) * 3, ny = cy + Math.sin(ang) * 1.2; if (ny < y0 || ny > y1) break; line(cx, cy, nx, ny, K.PAVED); cx = nx; cy = ny; }
    }
    for (var gm = 0; gm < (footpath ? 70 : 20); gm++) px(span(), row(), K.GUM);
    for (var b = 0; b < (footpath ? 22 : 8); b++) { var bx = span(), by = row(); px(bx, by, K.BUTT); px(bx + 1, by, K.BUTTE); }
    for (var pc = 0; pc < (footpath ? 9 : 4); pc++) {                              // crumpled papers and a few cups
      var qx = span(), qy = row();
      if (rnd() < 0.4) { box(qx, qy - 3, 3, 4, K.LITTER); box(qx, qy - 2, 3, 1, K.LITTERB); }
      else { px(qx, qy, K.LITTER); px(qx + 1, qy, K.LITTER); px(qx, qy - 1, K.LITTER); px(qx + 2, qy + 1, K.PAVEHI); }
    }
    for (var lf = 0; lf < (footpath ? 40 : 30); lf++) {                            // leaves, mostly blown against the curb and the walls
      var lx = span(), ly = rnd() < 0.6 ? (rnd() < 0.5 ? y0 + Math.floor(rnd() * 3) : y1 - Math.floor(rnd() * 3)) : row();
      px(lx, ly, rnd() < 0.5 ? K.LEAF1 : K.LEAF2); if (rnd() < 0.5) px(lx + 1, ly, K.LEAF2);
    }
  }

  // Around the stairwell: green railings, a lamp post with a globe and the SUBWAY sign, a work light
  function paintSubway() {
    box(1004, 554, 162, 3, K.SUBRAIL); box(1004, 563, 162, 2, K.SUBRAIL);
    for (var x = 1004; x <= 1166; x += 12) box(x, 554, 2, 18, K.SUBRAIL);
    line(1166, 554, 1172, 578, K.SUBRAIL, 2);
    box(1004, 520, 4, 52, K.SUBRAIL); ellipse(1006, 514, 7, 7, K.GLOBE, 0.4); box(1003, 520, 6, 2, K.METALD);
    box(1012, 524, 56, 16, K.SUBG); frame(1012, 524, 56, 16, K.METALD);
    sign('SUBWAY', 1040, 529, { font: F3, scale: 2, fill: K.LETW });
    line(1151, 552, 1143, 574, K.METALD); line(1151, 552, 1159, 574, K.METALD); line(1151, 552, 1151, 574, K.METALD);
    box(1144, 538, 15, 10, K.METALD); box(1146, 540, 11, 4, K.WORKL);
  }

  // In front of everyone: power poles and wires, the street lamp, the railing, the barrier round the works
  function paintNear() {
    seed = 9090;
    var P1 = 196, P2 = 992;
    [P1, P2].forEach(function (x, i) {
      box(x - 6, 24, 12, FOOT + 12 - 24, K.POLE, 24, FOOT); box(x - 6, 24, 3, FOOT - 12, K.POLED);
      box(x - 34, 46, 68, 5, K.POLED); box(x - 26, 76, 52, 4, K.POLED);
      [-30, -14, 14, 30].forEach(function (d) { box(x + d - 1, 40, 3, 6, K.METALHI); });
      [-22, 22].forEach(function (d) { box(x + d - 1, 71, 3, 5, K.METALHI); });
      for (var st = 120; st < 580; st += 26) box(x + (i ? -8 : 6), st, 3, 2, K.METALD);
      if (i === 1) { box(x + 6, 104, 20, 34, K.METAL, 104, 34); box(x + 8, 100, 16, 4, K.METALD); line(x + 16, 104, x + 16, 82, K.WIRE); }
      if (i === 0) { box(x + 6, 296, 44, 9, K.SIGNGR); frame(x + 6, 296, 44, 9, K.LITTER); text('MERGE ST', x + 13, 298, K.LITTER, 1, F3); box(x + 6, 300, 1, 1, K.METALD); }
      if (i === 1) { ellipse(x - 10, 322, 6, 6, K.SIGNRD); ellipse(x - 10, 322, 4.5, 4.5, K.SIGNBL); line(x - 14, 318, x - 6, 326, K.SIGNRD, 2); box(x - 6, 321, 4, 2, K.METALD); }
      box(x - 4, 300, 8, 18, K.LITTER); box(x - 4, 300, 8, 1, K.PAVED); for (var fl = 303; fl < 316; fl += 3) box(x - 3, fl, 6, 1, K.GRIME);   // an old flyer, peeling
    });
    [[-30, 40, 54], [-14, 40, 48], [14, 40, 50], [30, 40, 58], [-22, 71, 40], [22, 71, 44]].forEach(function (w, j) {
      var y0 = w[1];
      wire(-M, y0 + 26 + j * 5, P1 + w[0], y0, w[2] * 0.45, K.WIRE);
      wire(P1 + w[0], y0, P2 + w[0], y0, w[2], K.WIRE);
      wire(P2 + w[0], y0, W + M, y0 + 20 + j * 6, w[2] * 0.4, K.WIRE);
    });
    box(1226, 332, 7, FOOT + 12 - 332, K.POLE); box(1226, 332, 2, FOOT - 332, K.POLED);
    line(1229, 334, 1206, 326, K.POLED, 3); box(1186, 324, 26, 6, K.METALD); box(1190, 330, 18, 3, K.LAMP);
    // the railing along the curb, open in front of the works
    for (var x = -M + 4; x < W + M; x += 64) {
      var gap = function (xx) { return xx > 996 && xx < 1176; };
      if (!gap(x)) box(x, 572, 4, FOOT + 10 - 572, K.RAIL);
      for (var a = 0; a <= 64; a++) { var ax = x + a; if (gap(ax)) continue; px(ax, 572, K.RAIL); px(ax, 573, K.RAIL); px(ax, 574, K.RAIL); px(ax, 575, K.METALHI); px(ax, 590, K.RAIL); px(ax, 591, K.RAIL); if (a > 3 && a < 64) { var tt = (a - 4) / 60, ay = 576 + Math.sin(tt * Math.PI) * 9; px(ax, ay, K.RAIL); px(ax, ay + 1, K.RAIL); } }
    }
    // a bicycle chained to the railing
    var bk = 640;
    [[bk, 596], [bk + 26, 596]].forEach(function (w) { for (var a2 = 0; a2 < 28; a2++) { var an = a2 / 28 * Math.PI * 2; px(w[0] + Math.round(Math.cos(an) * 8), w[1] + Math.round(Math.sin(an) * 8), K.METALD); } px(w[0], w[1], K.METAL); });
    line(bk, 596, bk + 10, 584, K.BIKE); line(bk + 10, 584, bk + 22, 584, K.BIKE); line(bk + 22, 584, bk + 26, 596, K.BIKE); line(bk + 10, 584, bk + 13, 596, K.BIKE); line(bk + 13, 596, bk, 596, K.BIKE);
    line(bk + 13, 596, bk + 22, 584, K.BIKE); line(bk + 10, 584, bk + 9, 580, K.BIKE); box(bk + 6, 579, 7, 2, K.METALD); line(bk + 22, 584, bk + 23, 578, K.BIKE); box(bk + 21, 577, 6, 1, K.METALD);
    line(bk + 12, 592, bk + 18, 586, K.METALHI); px(bk + 19, 586, K.METALHI);                     // the chain, round the railing
    box(1000, 580, 172, 12, K.BAR1); for (var bx = 1000; bx < 1172; bx++) for (var by = 580; by < 592; by++) if ((((bx + by) / 8) % 2) < 1) px(bx, by, K.BAR2);
    frame(1000, 580, 172, 12, K.BAR2); [1004, 1084, 1166].forEach(function (p) { box(p, 592, 3, 16, K.BAR2); });
    box(1058, 564, 56, 14, K.BOXY); frame(1058, 564, 56, 14, K.BAR2);   // (its words are drawn live: a countdown to the next article)
    [988, 1178].forEach(function (cx2) { box(cx2 + 3, 592, 4, 4, K.CONE); box(cx2 + 2, 596, 6, 3, K.CONEW); box(cx2 + 1, 599, 8, 6, K.CONE); box(cx2, 605, 10, 3, K.BAR2); });
  }
  // ---------- Build the parts (each is coloured only when a time of day first needs it) ----------
  var curPart = '', curZ = 0, LITWIN = [];                      // lit flat windows, so they can keep their own hours
  function part(name, z, x0, y0, x1, y1, paint) { B = buffer(x0, y0, x1, y1); curPart = name; curZ = z; paint(); var p = { name: name, z: z, x0: x0, y0: y0, buf: B, c: {} }; B = null; return p; }
  function canvasOf(p, kind) { if (!(kind in p.c)) p.c[kind] = p.make ? p.make(kind) : colorize(p.buf, palOf(kind)); return p.c[kind]; }
  var FAR = part('far', 0.15, -M, 20, W + M, GROUND, paintFar);
  var PA = part('A', 0.43, -M, 90, 198, GROUND, paintA), PB = part('B', 0.47, 184, 262, 432, GROUND, paintB), PC = part('C', 0.44, 414, 214, 546, GROUND, paintC);
  var PD = part('D', 0.5, 528, 316, 812, GROUND, paintD), PE = part('E', 0.42, 792, 100, 998, GROUND, paintE), PF = part('F', 0.46, 984, 100, 1176, GROUND, paintF);
  var PG = part('G', 0.4, 1162, 56, W + M, GROUND, paintG);
  var SHUTTER = part('shutter', 0.4, 1180, 430, 1300, 530, paintShutter);
  var PART_SIGN = part('articles', 0.53, 388, 196, 442, 432, paintArticlesSign), PART_NET = part('network', 0.43, 1166, 116, 1206, 324, paintNetworkSign);
  var PART_MARQ = part('marquee', MARQUEE.z, 506, 134, 834, 334, paintMarquee), PART_AWN = part('awning', AWNING_Z, 528, 400, 812, 470, paintAwning);
  var PROPS = part('props', 0.47, 0, 398, W + M, GROUND + 2, paintProps);
  var GROUNDP = part('ground', 0.45, -M, GROUND, W + M, H, paintGround);
  var SUBWAY = part('subway', HOLE_Z, 990, 504, 1182, 584, paintSubway);
  var NEAR = part('near', NEAR_Z, -M, 20, W + M, 616, paintNear);

  // ---------- Props (street-props.js): shaded in 2.5D, so they bring their own tones ----------
  // A prop names a material with a brightness ('WOOD*0.7'); darker tones drift cool, lighter ones warm, and each
  // silhouette gets edge tones (darker below and right, lit above and left). They are coloured once per time of
  // day like every other part, so they cost nothing per frame. inside: lit by the bar's own lamps, not the sky.
  var PROP_LIGHT = { night: AMB.night, dusk: AMB.dusk, day: AMB.day }, PROP_INSIDE = { night: [1.0, 0.82, 0.64], dusk: [0.96, 0.86, 0.72], day: [0.92, 0.9, 0.86] };
  function propTone(name, kind, inside) {
    var i = name.indexOf('*'), f = i < 0 ? 1 : +name.slice(i + 1), m = window.StreetProps.mats[i < 0 ? name : name.slice(0, i)];
    if (!m) return null;
    var glow = kind === 'lightsNight' || kind === 'lightsDusk';
    if (m.alpha) return glow ? null : 'rgba(0,0,0,' + (kind === 'night' ? m.alpha * 0.85 : m.alpha) + ')';
    var c;
    if (glow) { if (!m.e) return null; c = rgbH(m.e); var lv = kind === 'lightsDusk' ? 0.4 : 0.8; c = [c[0] * lv, c[1] * lv, c[2] * lv]; }
    else {
      var a = rgbH(m.a), amb = (inside ? PROP_INSIDE : PROP_LIGHT)[kind];
      c = [a[0] * amb[0], a[1] * amb[1], a[2] * amb[2]];
      if (m.e) c = mix(c, rgbH(m.e), kind === 'night' ? 1 : kind === 'dusk' ? 0.5 : 0);
    }
    c = [c[0] * f, c[1] * f, c[2] * f];
    if (f < 1) { var t = (1 - f) * 40; c = [c[0] - t * 0.5, c[1] - t * 0.2, c[2] + t * 0.6]; }
    if (f > 1) { var u = (f - 1) * 40; c = [c[0] + u * 0.5, c[1] + u * 0.3, c[2] - u * 0.3]; }
    return m.see && !glow ? css(c, m.see) : css(c);     // glass lets what is behind it show through
  }
  function propPainter(g, kind, inside) {
    var cache = {};
    var fill = function (m) { var s = cache[m]; if (s === undefined) s = cache[m] = propTone(m, kind, inside); if (s === null) return false; g.fillStyle = s; return true; };
    var px2 = function (x, y, m) { if (fill(m)) g.fillRect(Math.round(x), Math.round(y), 1, 1); };
    var box2 = function (x, y, w, h, m) { if (fill(m)) g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    return {
      px: px2, box: box2,
      frame: function (x, y, w, h, m) { box2(x, y, w, 1, m); box2(x, y + h - 1, w, 1, m); box2(x, y, 1, h, m); box2(x + w - 1, y, 1, h, m); },
      line: function (x0, y0, x1, y1, m) { var n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (var i = 0; i <= n; i++) px2(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, m); },
      ellipse: function (cx, cy, rx, ry, m) { if (!fill(m)) return; for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) { var dy = (y + 0.5 - cy) / ry; if (Math.abs(dy) > 1) continue; var hw = rx * Math.sqrt(1 - dy * dy), a = Math.round(cx - hw), b = Math.round(cx + hw); if (b > a) g.fillRect(a, y, b - a, 1); } },
      poly: function (pts, m) { if (fill(m)) pxPoly(g, pts); }
    };
  }
  function propEdges(g, w, h) {                         // edge tones round every silhouette
    var im = g.getImageData(0, 0, w, h), d = im.data, src = new Uint8ClampedArray(d);
    var solid = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 200; };
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4; if (src[i + 3] <= 200) continue;
      var f = !solid(x, y + 1) || !solid(x + 1, y) ? 0.74 : !solid(x, y - 1) || !solid(x - 1, y) ? 1.12 : 1;
      if (f === 1) continue;
      var t = (f < 1 ? 1 - f : 1 - f) * 40;
      d[i] = clamp(src[i] * f - t * 0.5, 0, 255); d[i + 1] = clamp(src[i + 1] * f - t * 0.2, 0, 255); d[i + 2] = clamp(src[i + 2] * f + t * 0.6, 0, 255);
    }
    g.putImageData(im, 0, 0);
  }
  // A group of props as one part. items: [id, x, ground y, clip rect or null]
  function propPart(name, z, items, inside) {
    var SP = window.StreetProps; if (!SP) return null;
    var byId = {}; SP.list.forEach(function (pr) { byId[pr.id] = pr; });
    items = items.filter(function (it) { return byId[it[0]]; });
    if (!items.length) return null;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    items.forEach(function (it) { var pr = byId[it[0]]; x0 = Math.min(x0, it[1] - 10); x1 = Math.max(x1, it[1] + pr.w + 10); y0 = Math.min(y0, it[2] - pr.h - 14); y1 = Math.max(y1, it[2] + 6); });
    x0 = Math.floor(x0); y0 = Math.floor(y0);
    var w = Math.ceil(x1) - x0, h = Math.ceil(y1) - y0;
    return { name: name, z: z, x0: x0, y0: y0, buf: null, c: {}, make: function (kind) {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var g = cv.getContext('2d', { willReadFrequently: true }), glow = kind === 'lightsNight' || kind === 'lightsDusk';
      items.forEach(function (it) {
        var t2 = document.createElement('canvas'); t2.width = w; t2.height = h; var tg = t2.getContext('2d');
        byId[it[0]].paint(propPainter(tg, kind, inside), it[1] - x0, it[2] - y0);
        g.save(); if (it[3]) { g.beginPath(); g.rect(it[3][0] - x0, it[3][1] - y0, it[3][2], it[3][3]); g.clip(); } g.drawImage(t2, 0, 0); g.restore();
      });
      if (!glow) propEdges(g, w, h);
      return cv;
    } };
  }
  // Where they stand. Back: against the shop fronts (behind the walkers). Front: at the curb (in front of them).
  // Inside: through the bar's two windows, behind the server.
  var BARWIN = [[556, 446, 84, 40], [698, 446, 92, 40]];
  var PROPS_BACK = propPart('props-back', 0.47, [['shelter', 1180, 530], ['phonebox', 1086, 530], ['payphone', 806, 530], ['litter', 196, 548]], false);
  var PROPS_FRONT = propPart('props-front', depthAt(598), [['pallets', 10, 598], ['drums', 904, 598], ['litter', 690, 604]], false);
  var BARKIT = propPart('barkit', 0.5, [['menuboard', 562, 486, BARWIN[0]], ['fridge', 610, 488, BARWIN[0]], ['walltv', 702, 474, BARWIN[1]], ['grill', 732, 486, BARWIN[1]],
    ['coffee', 764, 486, BARWIN[1]], ['condiments', 566, 492], ['condiments', 760, 492]], true);
  TVWIN = LITWIN.filter(function (w) { return w.cold && (w.part === 'A' || w.part === 'E'); })[0] || LITWIN[0] || null;
  // The buildings in drawing order (far first), with the extent of their side walls
  var SA = { p: PA, xL: -M, xR: 196, top: 152, wall: 'CONC' }, SB = { p: PB, xL: 196, xR: 420, top: 330, wall: 'WOOD' }, SC = { p: PC, xL: 420, xR: 540, top: 240, wall: 'CONC2' },
    SD = { p: PD, xL: 540, xR: 800, top: 322, wall: 'WOOD' }, SE = { p: PE, xL: 800, xR: 990, top: 152, wall: 'CONC' }, SF = { p: PF, xL: 990, xR: 1170, top: 240, wall: 'BRICK' },
    SG = { p: PG, xL: 1170, xR: W + M, top: 66, wall: 'CONC2' };
  [[SA, SB], [SB, SC], [SC, SD], [SD, SE], [SE, SF], [SF, SG]].forEach(function (pair) { pair[0].right = pair[1]; pair[1].left = pair[0]; });   // neighbours
  var STREET = [SG, SE, SA, { p: PART_NET }, SC, { p: PART_MARQ, marquee: true }, SF, SB, SD, { p: PART_SIGN }, { p: PART_AWN }];
  if (BARKIT) STREET.splice(STREET.indexOf(SD) + 1, 0, { p: BARKIT });   // the bar's kit, seen through its windows
  STREET.splice(STREET.indexOf(SG) + 1, 0, { p: SHUTTER, roll: true });   // the laundromat's shutter, rolled by the clock
  var PROP_PARTS = [PROPS_BACK, PROPS_FRONT, BARKIT].filter(Boolean);

  if (PERF) PERF.paint = performance.now() - PERF.t0;

  // ---------- Canvases ----------
  function canvasFor(cls, w, h) {
    var c = stage.querySelector('canvas.' + cls);
    if (!c) { c = document.createElement('canvas'); c.className = cls; stage.insertBefore(c, stage.querySelector('.d-overlays')); }
    c.width = w; c.height = h; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g;
  }
  function offscreen(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
  // On the page: the street (with the light of its shops and signs laid on it, so people walk in front of that
  // light), the people, and the front (railing, poles, weather, and the light in the air in front of the people).
  // No blended layers and no CSS filters: the glow and the soft reflections are made here by scaling pictures
  // down and up, which costs far less to show.
  var ctx = canvasFor('d-scene', W, H), ptx = canvasFor('d-people', W, H), ftx = canvasFor('d-front', W, H);
  var RW = W / 2, RH = (H - GROUND) / 2, xtx = offscreen(RW, RH);       // the puddles' mirror, at half size
  var WK = { x: 930, y: 500, w: 350, h: 140 }, wkx = offscreen(WK.w, WK.h);   // the road workers, tinted on their own
  var RIDE_TOP = 540, rtx = null;

  // ---------- People (in half-size units, drawn at full density). They keep to the footpath. ----------
  var crowd = null;
  try { crowd = window.StreetPeople ? window.StreetPeople({
    width: 640, ground: 265, windows: [],
    people: {
      lanes: [
        { y: 270, h: 34, depth: depthAt(540), max: 3, fade: 1 }, { y: 276, h: 35, depth: depthAt(552), max: 3, fade: 1 },
        { y: 282, h: 36, depth: depthAt(564), max: 3, fade: 1 },
        { y: 316, h: 42, depth: depthAt(632), max: 0, fade: 1, ride: true }
      ],
      door: { x: 322, w: 25, top: 226 }, counter: 246, dinerDepth: 0.5, workerDepth: HOLE_Z, workerY: 298,
      windows: [{ x: 278, y: 223, w: 42, h: 35 }, { x: 349, y: 223, w: 46, h: 35 }],
      stools: STOOLS.map(function (x) { return x / 2; }), stoolFoot: 260, stoolSeat: 8.5, shelter: [270, 402],
      waiter: { y: 260, x0: 280, x1: 393 }, dinerSize: 36, waiterSize: 36, workerSize: 30,
      barrier: { x0: 502, x1: 584, top: 290 },
      workers: [{ id: 'workerA', x: 515, y: 296, dir: 1, kind: 'drill' }, { id: 'workerB', x: 563, y: 304, dir: -1, kind: 'shovel' }, { id: 'workerC', x: 592, y: 296, dir: -1, kind: 'sign' }],
      spots: [{ x: 50, kind: 'look', time: [3, 6] }, { x: 74, kind: 'look', time: [3, 6] }, { x: 133, kind: 'look', time: [3, 5] }, { x: 239, kind: 'look', time: [3, 5] },
        { x: 335, kind: 'look', time: [4, 7] }, { x: 447, kind: 'look', time: [4, 7] }, { x: 160, kind: 'wait', time: [8, 16] }, { x: 470, kind: 'wait', time: [8, 16] }, { x: 540, kind: 'wait', time: [6, 12] }],
      rim: [255, 168, 196], grade: [0.97, 0.93, 0.97]
    }
  }) : null; } catch (err) { crowd = null; if (window.console) console.warn('people skipped:', err); }   // the street still draws without them
  if (crowd && crowd.drawRiders) {                     // scooters ride the road, in front of the railing: their own strip of canvas
    rtx = canvasFor('d-riders', W, H - RIDE_TOP);
    rtx.canvas.style.top = (RIDE_TOP / H * 100) + '%'; rtx.canvas.style.height = ((H - RIDE_TOP) / H * 100) + '%';
  }
  // The halos: every light drawn sharp, then shrunk step by step; the small copies, enlarged, are the soft glow
  var gtx = offscreen(W, H), GLOW = [offscreen(W / 2, H / 2), offscreen(W / 4, H / 4), offscreen(W / 8, H / 8), offscreen(W / 16, H / 16)], halo = offscreen(W / 4, H / 4);

  // ---------- The links over the signs (placed by CSS; this lights the sign you point at) ----------
  var hover = null;
  Array.prototype.forEach.call(stage.querySelectorAll('[data-area]'), function (el) {
    var set = function () { var k = el.getAttribute('data-area'); if (hover !== k) { hoverAt = performance.now(); if (crowd && crowd.lookUp && SPILLS[k]) crowd.lookUp(SPILLS[k][0] / 2); } hover = k; }, clear = function () { if (hover === el.getAttribute('data-area')) hover = null; };
    el.addEventListener('mouseenter', set); el.addEventListener('mouseleave', clear); el.addEventListener('focusin', set); el.addEventListener('focusout', clear);
  });
  root.classList.add('is-live');

  // ---------- Time, weather and the world ----------
  // Fractions of the day. Dusk peaks around 17:30-18:35 (and briefly at dawn); lights come on through dusk.
  var PHASE = {
    dusk: [[0, 0], [0.21, 0], [0.245, 1], [0.28, 0], [0.69, 0], [0.73, 1], [0.775, 1], [0.815, 0], [1, 0]],
    day: [[0, 0], [0.24, 0], [0.285, 1], [0.7, 1], [0.735, 0], [1, 0]],
    lights: [[0, 1], [0.22, 1], [0.25, 0.5], [0.285, 0], [0.7, 0], [0.73, 0.45], [0.775, 0.6], [0.815, 1], [1, 1]]
  };
  var SKY = {
    stops: [0, 0.25, 0.5, 0.75, 1],
    night: ['#2c1a28', '#3e2835', '#4e3644', '#5e4652', '#6d565c'].map(rgbH),
    dusk: ['#747e5c', '#818a66', '#8b946b', '#92915c', '#9a9058'].map(rgbH),
    day: ['#93a6b4', '#a2b2bc', '#b2bec2', '#c0c8c6', '#ccd0c8'].map(rgbH)
  };
  var WEIGHTS = { night: 1, dusk: 0, day: 0 };
  function clockSeconds() {
    var elapsed = (Date.now() - startedAt) / 1000, start;
    if (fixedClock !== null) start = fixedClock;
    else { var d = new Date(startedAt); start = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); }
    return ((start + elapsed * speed) % 86400 + 86400) % 86400;
  }
  function weatherNow() {
    if (weatherOverride === 'rain' || weatherOverride === 'snow' || weatherOverride === 'clear') return weatherOverride;
    var slot = Math.floor(Date.now() / 300000), h = Math.sin(slot * 78.233) * 43758.5453; h -= Math.floor(h);
    return h < 0.4 ? 'rain' : h < 0.65 ? 'snow' : 'clear';
  }
  var state = { t: 0, lights: 1, day: 0, dusk: 0, night: 1, weather: weatherNow() };
  function setTime() {
    var fr = clockSeconds() / 86400, d = keyframes(fr, PHASE.dusk), y = keyframes(fr, PHASE.day), s = d + y;
    if (s > 1) { d /= s; y /= s; }
    state.dusk = WEIGHTS.dusk = d; state.day = WEIGHTS.day = y; state.night = WEIGHTS.night = Math.max(0, 1 - d - y);
    state.lights = keyframes(fr, PHASE.lights); state.hour = fr * 24;
  }
  // About ten minutes ahead, colour the parts for the coming time of day in spare moments (one part at a time),
  // so dusk or morning never arrives with a stall
  var ALL_PARTS = null, bakeQueue = [], bakeKeys = {}, lastLook = -1e9, bakeScheduled = false;
  var idleCall = window.requestIdleCallback ? function (fn) { window.requestIdleCallback(fn, { timeout: 2000 }); }
    : function (fn) { window.setTimeout(function () { fn({ didTimeout: false, timeRemaining: function () { return 8; } }); }, 60); };
  function lookAhead() {
    var now = performance.now(); if (now - lastLook < 3000) return; lastLook = now;
    if (!ALL_PARTS) ALL_PARTS = [FAR, PA, PB, PC, PD, PE, PF, PG, SHUTTER, PART_SIGN, PART_NET, PART_MARQ, PART_AWN, PROPS, GROUNDP, SUBWAY, NEAR].concat(PROP_PARTS);
    var fr = ((clockSeconds() + 600) % 86400) / 86400, d = keyframes(fr, PHASE.dusk), y = keyframes(fr, PHASE.day), s = d + y, need = [];
    if (s > 1) { d /= s; y /= s; }
    if (1 - d - y > 0.002) need.push('night', 'lightsNight');
    if (d > 0.002) need.push('dusk', 'lightsDusk');
    if (y > 0.002) need.push('day');
    need.forEach(function (k) { ALL_PARTS.forEach(function (p) { var key = p.name + '|' + k; if (!(k in p.c) && !bakeKeys[key]) { bakeKeys[key] = 1; bakeQueue.push([p, k]); } }); });
    if (bakeQueue.length && !bakeScheduled) { bakeScheduled = true; idleCall(bakeSome); }
  }
  function bakeSome(deadline) {
    bakeScheduled = false;
    var first = true;
    while (bakeQueue.length && (first || deadline.timeRemaining() > 4)) { first = false; var job = bakeQueue.shift(); canvasOf(job[0], job[1]); }
    if (bakeQueue.length) { bakeScheduled = true; idleCall(bakeSome); }
  }
  var rainLevel = state.weather === 'rain' ? 1 : 0, snowLevel = state.weather === 'snow' ? 1 : 0;
  var wet = state.weather === 'rain' ? 1 : state.weather === 'snow' ? 0.35 : 0;
  var drops = [], flakes = [], splashes = [], ripples = [], smoke = [];
  for (var i = 0; i < 640; i++) drops.push(newDrop(true));
  for (var j = 0; j < 360; j++) flakes.push(newFlake(true));
  var flash = { start: -99, next: rand(20, 50) };
  var grain = document.createElement('canvas'); grain.width = 128; grain.height = 128;
  (function () {
    var g = null; try { g = grain.getContext('2d', { willReadFrequently: true }); } catch (e) { g = null; } g = g || grain.getContext('2d');
    var img = g.createImageData(128, 128), d = img.data;
    for (var i = 0; i < d.length; i += 4) { var dark = Math.random() < 0.5, v = dark ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.round(255 * (dark ? 0.2 : 0.09) * Math.random()); }
    g.putImageData(img, 0, 0);
  })();
  // Film grain and the vignette sit in one still layer over the canvases (CSS moves the grain; nothing is redrawn)
  var grainEl = document.createElement('div'); grainEl.className = 'd-grain'; grainEl.setAttribute('aria-hidden', 'true');
  try { grainEl.style.setProperty('--grain', 'url(' + grain.toDataURL() + ')'); } catch (err) { /* no grain, still fine */ }
  stage.insertBefore(grainEl, stage.querySelector('.d-overlays'));
  function newDrop(any) { return { x: rand(-40, W + 240), y: any ? rand(-40, H) : rand(-80, -10), len: (rand(7, 16)) | 0, v: rand(480, 640), floor: Math.random() < 0.6 ? rand(GROUND + 8, H) : rand(120, H) }; }
  function newFlake(any) { return { x: rand(-40, W + 40), y: any ? rand(-20, H) : rand(-40, -4), v: rand(20, 50), s: Math.random() < 0.25 ? 3 : 2, p: rand(0, 6.28), sw: rand(8, 28) }; }
  function wind() { return 6 + 10 * rainLevel + 4 * Math.sin(state.t * 0.13); }

  // ---------- The view: it stays still. Only ?cam=-1..1 (for checking the depth) sets it to one side. ----------
  var CAMX = 0, lastCam = null;
  function offset(depth) { return Math.round(CAMX * depth); }
  function env() { return { t: state.t, lights: state.lights, day: state.day, rain: rainLevel, wind: wind(), wet: 0.3 + 0.7 * wet, offset: function (d) { return Math.round(CAMX * d) / 2; }, puddles: puddlesNear, hour: state.hour, crowd: crowdAt(state.hour), tea: teaBreak(state.hour), crewOff: state.hour >= 1 && state.hour < 6.5, climate: state.weather === 'rain' ? 'rain' : state.weather === 'snow' ? 'cold' : 'summer' }; }
  function updateCamera() {
    CAMX = camFixed !== null && !reduceMotion ? camFixed * CAM : 0;
    var r = Math.round(CAMX * 2) / 2;
    if (r !== lastCam) { stage.style.setProperty('--cam', r); lastCam = r; }
  }
  function skyAt(i) { return mix(mix(SKY.night[i], SKY.dusk[i], state.dusk), SKY.day[i], state.day); }
  function hazeColor() { return mix(mix(HAZE.night, HAZE.dusk, state.dusk), HAZE.day, state.day); }

  // ---------- Fog: a soft noise texture, tiled sideways and drifting ----------
  var FOGW = 256, FOGH = 64;
  var fogNoise = (function () {
    var c = document.createElement('canvas'); c.width = FOGW; c.height = FOGH;
    var g = c.getContext('2d'), img = g.createImageData(FOGW, FOGH), d = img.data, octaves = [[32, 0.55], [16, 0.3], [8, 0.15]], grids = [];
    octaves.forEach(function (o) { var gw = FOGW / o[0], gh = Math.ceil(FOGH / o[0]) + 1, arr = []; for (var k = 0; k < gw * gh; k++) arr.push(Math.random()); grids.push({ cell: o[0], amp: o[1], gw: gw, arr: arr }); });
    function smooth(t) { return t * t * (3 - 2 * t); }
    for (var y = 0; y < FOGH; y++) for (var x = 0; x < FOGW; x++) {
      var v = 0;
      grids.forEach(function (G) {
        var fx = x / G.cell, fy = y / G.cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
        var a = G.arr[y0 * G.gw + (x0 % G.gw)], b = G.arr[y0 * G.gw + ((x0 + 1) % G.gw)], c2 = G.arr[(y0 + 1) * G.gw + (x0 % G.gw)], e = G.arr[(y0 + 1) * G.gw + ((x0 + 1) % G.gw)];
        v += G.amp * ((a + (b - a) * tx) * (1 - ty) + (c2 + (e - c2) * tx) * ty);
      });
      var rise = smooth(clamp(y / (FOGH * 0.55), 0, 1)), i = (y * FOGW + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(255 * clamp((v - 0.32) * 1.9, 0, 1) * rise);
    }
    g.putImageData(img, 0, 0);
    return c;
  })();
  var fogTint = document.createElement('canvas'); fogTint.width = FOGW; fogTint.height = FOGH;
  var fogTintKey = '';
  function tintedFog() {
    var c = hazeColor(), key = (c[0] >> 2) + ',' + (c[1] >> 2) + ',' + (c[2] >> 2);
    if (key !== fogTintKey) {
      var g = fogTint.getContext('2d');
      g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, FOGW, FOGH); g.fillStyle = css(c); g.fillRect(0, 0, FOGW, FOGH);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(fogNoise, 0, 0); g.globalCompositeOperation = 'source-over';
      fogTintKey = key;
    }
    return fogTint;
  }
  var fogScaled = {};
  function scaledFog(k) {                              // the fog tile enlarged once per size (and again when its colour moves)
    var tile = tintedFog(), c = fogScaled[k];
    if (!c) { c = fogScaled[k] = document.createElement('canvas'); c.width = FOGW * k; c.height = FOGH * k; }
    if (c.key !== fogTintKey) { var g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = true; g.drawImage(tile, 0, 0, c.width, c.height); c.key = fogTintKey; }
    return c;
  }
  function fogBand(g, y, k, v, alpha, t, depth) {
    var tile = scaledFog(k), w = tile.width, x = ((t * v + offset(depth || 0)) % w + w) % w - w;
    g.globalAlpha = alpha;
    for (; x < W; x += w) g.drawImage(tile, Math.round(x), y);
    g.globalAlpha = 1;
  }
  function fogWash(g, y0, y1, a0, a1) { var c = hazeColor(), gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, css(c, a0)); gr.addColorStop(1, css(c, a1)); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); }

  // ---------- Smoke and steam ----------
  var puff = (function () {
    var c = document.createElement('canvas'); c.width = 64; c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = 'destination-out';
    for (var k = 0; k < 26; k++) { var x = rand(6, 58), y = rand(6, 58), r = rand(3, 9), hg = g.createRadialGradient(x, y, 0, x, y, r); hg.addColorStop(0, 'rgba(0,0,0,0.35)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    return c;
  })();
  var puffTint = document.createElement('canvas'); puffTint.width = 64; puffTint.height = 64; var puffKey = '';
  function tintedPuff() {
    var c = mix(hazeColor(), [236, 232, 228], 0.55), key = (c[0] >> 3) + ',' + (c[1] >> 3) + ',' + (c[2] >> 3);
    if (key !== puffKey) { var g = puffTint.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, 64, 64); g.fillStyle = css(c); g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'destination-in'; g.drawImage(puff, 0, 0); g.globalCompositeOperation = 'source-over'; puffKey = key; }
    return puffTint;
  }
  // back: far chimneys; mid: the bookshop's stove pipe and a roof vent; front: steam from the street, dust from the works
  var EMITTERS = [
    { x: 300, y: 250, rate: 3, life: [8, 11], vy: [-12, -18], vx: [-1, 2], r: [8, 48], a: 0.12, layer: 'back', z: 0.15 },
    { x: 1110, y: 180, rate: 3, life: [8, 11], vy: [-12, -18], vx: [-1, 2], r: [8, 44], a: 0.1, layer: 'back', z: 0.15 },
    { x: 255, y: 268, rate: 6, life: [4, 6.5], vy: [-14, -20], vx: [-2, 2], r: [4, 30], a: 0.16, layer: 'mid', z: 0.47 },
    { x: 966, y: 118, rate: 4, life: [4, 6], vy: [-12, -18], vx: [-2, 2], r: [4, 26], a: 0.13, layer: 'mid', z: 0.42 },
    { x: 150, y: 146, rate: 3, life: [3, 5], vy: [-10, -16], vx: [-2, 2], r: [3, 20], a: 0.1, layer: 'mid', z: 0.43, cold: true },    // roof vents, steaming
    { x: 1150, y: 236, rate: 3, life: [3, 5], vy: [-10, -16], vx: [-2, 2], r: [3, 18], a: 0.1, layer: 'mid', z: 0.46, cold: true },
    { x: 1244, y: 62, rate: 3, life: [4, 6], vy: [-10, -16], vx: [-2, 2], r: [4, 24], a: 0.1, layer: 'mid', z: 0.4, cold: true },
    { x: 900, y: 694, rate: 11, life: [3.5, 5.5], vy: [-28, -44], vx: [-4, 4], r: [6, 50], a: 0.2, layer: 'front', z: depthAt(694) },
    { x: 300, y: 590, rate: 4, life: [2, 3.2], vy: [-18, -28], vx: [-3, 3], r: [5, 24], a: 0.09, layer: 'front', z: depthAt(590) },
    { x: 1060, y: 596, rate: 5, life: [1.2, 2.2], vy: [-10, -18], vx: [-6, 6], r: [3, 16], a: 0.16, layer: 'front', z: HOLE_Z }
  ];
  function emit(e) { return { x: e.x + rand(-3, 3), y: e.y, vx: rand(e.vx[0], e.vx[1]), vy: rand(e.vy[0], e.vy[1]), age: 0, life: rand(e.life[0], e.life[1]), r0: e.r[0], r1: e.r[1] * rand(0.75, 1.1), a: e.a, layer: e.layer, z: e.z }; }
  function stepSmoke(p, dt) { p.x += (p.vx + wind() * 0.8) * dt; p.y += p.vy * dt; p.vy *= Math.pow(0.9, dt); }
  EMITTERS.forEach(function (e) { e.acc = 0; for (var k = 0; k < e.rate * e.life[1]; k++) { var p = emit(e), age = rand(0, p.life); stepSmoke(p, age); p.age = age; smoke.push(p); } });
  function drawSmoke(g, layer) {
    var tile = tintedPuff();
    g.save(); g.imageSmoothingEnabled = true;
    smoke.forEach(function (p) {
      if (p.layer !== layer) return;
      var k = p.age / p.life, r = p.r0 + (p.r1 - p.r0) * Math.sqrt(k), a = p.a * Math.min(1, k * 6) * (1 - k);
      if (a <= 0.004) return;
      g.globalAlpha = a; g.drawImage(tile, Math.round(p.x - r + offset(p.z)), Math.round(p.y - r), Math.round(r * 2), Math.round(r * 2));
    });
    g.restore();
  }

  // ---------- Puddles: they fill while it rains and dry slowly after; only they mirror the street ----------
  var PUDDLES = [[118, 574, 52, 4.5], [430, 552, 30, 3], [716, 584, 70, 5], [884, 548, 40, 3.5], [1226, 584, 30, 4], [520, 610, 190, 2.2], [300, 668, 100, 7], [640, 704, 62, 6], [1060, 690, 140, 8]]
    .map(function (p, i) { seed = 900 + i * 7; return { x: p[0], y: p[1], rx: p[2], ry: p[3], lobes: [[0, 0, 1], [-0.45 + rnd() * 0.2, 0.2, 0.55 + rnd() * 0.15], [0.4 + rnd() * 0.15, -0.15, 0.5 + rnd() * 0.2]] }; });
  var GW = W + 2 * M, GH = H - GROUND;
  var pmask = document.createElement('canvas'), ptint = document.createElement('canvas'); pmask.width = ptint.width = GW; pmask.height = ptint.height = GH;
  var maskAt = { wet: -1, rain: -1, tint: '' };
  function puddleScale() { return 0.3 + 0.7 * wet; }
  function buildPuddles() {
    var g = pmask.getContext('2d'), k = puddleScale();
    g.clearRect(0, 0, GW, GH);
    g.fillStyle = 'rgba(255,255,255,' + Math.min(1, wet * 1.6) + ')';
    PUDDLES.forEach(function (p) { p.lobes.forEach(function (l) { g.beginPath(); g.ellipse(p.x + l[0] * p.rx + M, p.y - GROUND + l[1] * p.ry, Math.max(0.5, p.rx * l[2] * k), Math.max(0.5, p.ry * l[2] * k), 0, 0, Math.PI * 2); g.fill(); }); });
    maskAt.wet = wet; maskAt.tint = '';
  }
  function puddleTint() {
    var c = mix(skyAt(0), [8, 6, 10], 0.55), key = (c[0] >> 3) + ',' + (c[1] >> 3) + ',' + (c[2] >> 3);
    if (key !== maskAt.tint) { var g = ptint.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, GW, GH); g.fillStyle = css(c); g.fillRect(0, 0, GW, GH); g.globalCompositeOperation = 'destination-in'; g.drawImage(pmask, 0, 0); g.globalCompositeOperation = 'source-over'; maskAt.tint = key; }
    return ptint;
  }
  function groundShift(y) { return CAMX * (0.45 + 0.5 * (y - GROUND) / (H - GROUND)); }   // how far the view has slid the ground at row y
  // Is a point on the screen over water? (back into ground space first, then the same lobes as the mask)
  function inPuddle(x, y) {
    var k = puddleScale(), gx = x - groundShift(y);
    for (var i = 0; i < PUDDLES.length; i++) {
      var p = PUDDLES[i];
      for (var j = 0; j < p.lobes.length; j++) { var l = p.lobes[j], dx = (gx - p.x - l[0] * p.rx) / (p.rx * l[2] * k), dy = (y - p.y - l[1] * p.ry) / (p.ry * l[2] * k); if (dx * dx + dy * dy < 1) return true; }
    }
    return false;
  }
  // The puddles under a point where someone stands, as ellipses on the screen (their reflections are cut to these)
  function puddlesNear(x, y) {
    var out = []; if (wet < 0.05) return out;
    var k = puddleScale();
    for (var i = 0; i < PUDDLES.length; i++) {
      var p = PUDDLES[i];
      for (var j = 0; j < p.lobes.length; j++) {
        var l = p.lobes[j], cx = p.x + l[0] * p.rx + groundShift(p.y), cy = p.y + l[1] * p.ry, rx = p.rx * l[2] * k, ry = p.ry * l[2] * k;
        if (Math.abs(x - cx) < rx + 30 && y > cy - ry - 3 && y < cy + ry + 40) out.push([cx, cy, rx, ry]);
      }
    }
    return out;
  }
  function groundTransform(g) { g.setTransform(1, 0, CAMX * 0.5 / (H - GROUND), 1, -M + CAMX * 0.45, GROUND); }

  // ---------- Drawing ----------
  var lastTop = '';
  // The sky, the far city and the haze over it: one picture, redrawn only when the light, the weather or the view moves it
  var back = offscreen(W, GROUND), backKey = '';
  function drawBackdrop(fogAmount) {
    var key = offset(FAR.z) + '|' + Math.round(state.dusk * 96) + '|' + Math.round(state.day * 96) + '|' + Math.round(fogAmount * 40);
    if (key !== backKey) {
      backKey = key;
      var g = back.createLinearGradient(0, 0, 0, GROUND - 120);
      for (var i = 0; i < SKY.stops.length; i++) g.addColorStop(SKY.stops[i], css(skyAt(i)));
      back.fillStyle = g; back.fillRect(0, 0, W, GROUND);
      drawPart(back, FAR);
      fogWash(back, 0, GROUND, 0.05 * fogAmount, 0.22 * fogAmount);
    }
    ctx.drawImage(back.canvas, 0, 0);
    drawSky();
  }
  function drawSky() {
    var top = css(skyAt(0));
    if (top !== lastTop) {
      root.style.backgroundColor = top; lastTop = top;
      var vc = mix(mix([16, 8, 18], [24, 22, 8], state.dusk), [30, 30, 30], state.day);
      stage.style.setProperty('--vig', css(vc, 0.5 - 0.28 * state.day));
    }
  }
  function drawBirds(t) {
    var a = Math.max(state.dusk, state.day * 0.7); if (a < 0.05) return;
    ctx.fillStyle = css(mix(rgbH('#2a2620'), rgbH('#3a3a3a'), state.day), a);
    for (var b = 0; b < 6; b++) {
      var x = ((t * 14 + b * 37 + Math.sin(b * 7) * 40) % 1500) - 110 + offset(0.2), y = 70 + b * 7 + Math.sin(t * 0.6 + b) * 5, f = Math.floor(t * 5 + b) % 2;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1); ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1 + f, 2, 1); ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1 + f, 2, 1);
    }
  }
  // A part, in the right mix of night, dusk and day
  function blend(g, p, dx, dy) {
    var acc = 0, kinds = ['night', 'dusk', 'day'];
    for (var i = 0; i < 3; i++) {
      var w = WEIGHTS[kinds[i]]; if (w < 0.002) continue;
      acc += w; var c = canvasOf(p, kinds[i]); if (!c) continue;
      g.globalAlpha = w / acc; g.drawImage(c, dx, dy);
    }
    g.globalAlpha = 1;
  }
  function drawPart(g, p) { blend(g, p, p.x0 + offset(p.z), p.y0); }
  function drawGround(g) { g.save(); groundTransform(g); blend(g, GROUNDP, 0, 0); g.restore(); }
  var eagerLights = false;                           // the still picture (reduced motion) colours them straight away
  function lightsOf(p, kind) {
    if (kind in p.c || eagerLights) return canvasOf(p, kind);
    var key = p.name + '|' + kind;
    if (!bakeKeys[key]) { bakeKeys[key] = 1; bakeQueue.push([p, kind]); if (!bakeScheduled) { bakeScheduled = true; idleCall(bakeSome); } }
    return null;
  }
  function lights(g, p, k, draw) {
    var wn = WEIGHTS.night * k, wd = WEIGHTS.dusk * k, c;
    if (wn > 0.01 && (c = lightsOf(p, 'lightsNight'))) { g.globalAlpha = wn; draw(c); }
    if (wd > 0.01 && (c = lightsOf(p, 'lightsDusk'))) { g.globalAlpha = wd; draw(c); }
    g.globalAlpha = 1;
  }
  function partLights(g, p, k) { var dx = p.x0 + offset(p.z); lights(g, p, k, function (c) { g.drawImage(c, dx, p.y0); }); }
  // The side wall of a building, seen when the view slides past its edge
  var SIDE_DEPTH = 0.3;
  // A material's colour in the current light (for things drawn live, like side walls and wires)
  function litColor(name) {
    var A = rgbH(MATS[name].a[0]), c = [0, 0, 0];
    ['night', 'dusk', 'day'].forEach(function (k) { var wgt = WEIGHTS[k], amb = AMB[k]; c[0] += A[0] * amb[0] * wgt; c[1] += A[1] * amb[1] * wgt; c[2] += A[2] * amb[2] * wgt; });
    return c;
  }
  function sideWall(g, b) {
    if (Math.abs(CAMX) < 0.6) return;
    // Above the neighbour's roof the wall shows its whole depth; lower down it stops where it meets the
    // neighbour's front, and it is hidden altogether behind a neighbour that stands nearer
    var right = CAMX < 0, n = right ? b.right : b.left, z = b.p.z, full = z - SIDE_DEPTH, split = n ? clamp(n.top, b.top, GROUND) : GROUND;
    wallBand(g, b, right, z, full, b.top, split);
    if (n && n.p.z < z) wallBand(g, b, right, z, Math.max(full, n.p.z), split, GROUND);
  }
  function wallBand(g, b, right, z, zb, y0, y1) {
    if (y1 - y0 < 1) return;
    var edge = right ? b.xR : b.xL, xa = right ? edge + CAMX * z : edge + CAMX * zb, xb = right ? edge + CAMX * zb : edge + CAMX * z;
    var x0 = Math.round(xa), w = Math.round(xb) - x0; if (w < 1) return;
    var c = litColor(b.wall), gr = g.createLinearGradient(x0, 0, x0 + w, 0);
    gr.addColorStop(0, css(mix(c, [0, 0, 0], right ? 0.32 : 0.5))); gr.addColorStop(1, css(mix(c, [0, 0, 0], right ? 0.5 : 0.32)));
    g.fillStyle = gr; g.fillRect(x0, y0, w, y1 - y0);
    g.fillStyle = css(mix(c, [0, 0, 0], 0.62));
    for (var fy = GROUND - 112; fy > b.top + 8; fy -= 86) if (fy >= y0 && fy < y1) g.fillRect(x0, fy, w, 2);
    g.fillRect(right ? x0 : x0 + w - 1, y0, 1, y1 - y0);
  }
  // Bulbs: letters never glow; only the border bulbs reach the halo layers
  function bulb(g, x, y, s, on, col) {
    if (!on) { g.fillStyle = css(mix([58, 50, 48], [176, 170, 160], state.day)); g.fillRect(x, y, s, s); return; }   // unlit bulbs: pale glass by day
    g.fillStyle = col || '#ffb860'; g.fillRect(x, y, s, s);
    if (s > 2) { g.fillStyle = '#fff0c8'; g.fillRect(x + 1, y + 1, s - 2, Math.max(1, s - 3)); }
  }
  function bulbText(g, str, cx, y, c, gap, on) {
    var widths = str.split('').map(function (ch) { return ch === ' ' ? 3 * c : 5 * c; }), total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (str.length - 1);
    var x = Math.round(cx - total / 2), bs = Math.max(2, c - 1);
    for (var i = 0; i < str.length; i++) {
      var rows = glyphRows(F5, str[i]);
      if (rows) for (var r = 0; r < 7; r++) for (var k = 0; k < 5; k++) if (rows[r][k] === 'X') bulb(g, x + k * c, y + r * c, bs, on);
      x += widths[i] + gap;
    }
  }
  function drawMarquee(g, t, glowOnly) {
    var m = MARQUEE, ox = offset(m.z), lit = state.lights > 0.08, cx = m.x + m.w / 2 + ox;
    if (!glowOnly) {
      bulbText(g, m.text, cx, m.y + 12, m.cell, m.gap, lit);
      bulbText(g, m.by, cx, m.y + m.byY, m.byCell, m.gap, lit);
    }
    var step = 10, run = Math.floor(t * 6);
    for (var bx = m.x + 6; bx < m.x + m.w - 6; bx += step) {
      var idx = Math.round((bx - m.x) / step), lamp = lit && ((idx + run) % 3 !== 0);
      var bc = XMAS ? ['#ff5a4a', '#6aff8a', '#fff0d8'][(idx + run) % 3] : null;
      bulb(g, bx + ox, m.y + 3, 5, lamp, bc); bulb(g, bx + ox, m.y + m.h - 8, 5, lamp, bc);
    }
  }
  // The street, far to near: buildings with their side walls, signs, the ground, things on the footpath
  function drawStreet(t) {
    STREET.forEach(function (b) {
      if (b.roll) {                                    // the shutter, rolled up as far as the clock says
        var open = shutterOpen(); if (open > 0.995) return;
        var lift = Math.round(100 * open); ctx.save(); ctx.beginPath(); ctx.rect(1180 + offset(b.p.z), 430, 120, 100 - lift); ctx.clip();
        blend(ctx, b.p, b.p.x0 + offset(b.p.z), b.p.y0 - lift); ctx.restore(); return;
      }
      if (b.wall) sideWall(ctx, b);
      drawPart(ctx, b.p); drawWindowHours(ctx, b.p.name, t);
      if (b.marquee) drawMarquee(ctx, t, false);
    });
  }
  // Service wires from the poles to three buildings, drawn live so each end moves with what it is tied to
  var DROPS = [[196, 80, 150, 158, 8, 0.43], [992, 80, 966, 158, 4, 0.42]];
  function drawDropWires(g) {
    g.strokeStyle = css(litColor('WIRE')); g.lineWidth = 1; g.beginPath();
    DROPS.forEach(function (d) { var x0 = d[0] + offset(NEAR_Z) + 0.5, x1 = d[2] + offset(d[5]) + 0.5; g.moveTo(x0, d[1] + 0.5); g.quadraticCurveTo((x0 + x1) / 2, (d[1] + d[3]) / 2 + d[4] * 2, x1, d[3] + 0.5); });
    g.stroke();
    g.fillStyle = css(litColor('METALD'));                   // the brackets they are tied to
    DROPS.forEach(function (d) { var x1 = Math.round(d[2] + offset(d[5])); g.fillRect(x1 - 1, d[3] - 1, 3, 3); g.fillRect(x1, d[3] + 2, 1, 6); });
  }
  // Charts moving on two of the DATA monitors, and the blinking lamps on the subway barrier
  function drawLiveBits(g, t, glow) {
    var oe = offset(0.42);
    [[870, 453], [924, 478]].forEach(function (s, i) {
      if (state.day > 0.85 && !glow) return;
      g.fillStyle = glow ? '#2aa060' : '#b4ffd2';
      for (var k = 0; k < 17; k++) { var v = Math.sin((t * 1.6 + i * 2) + k * 0.55) * 3 + Math.sin(t * 0.7 + k * 1.3 + i) * 2; g.fillRect(s[0] + 2 + k + oe, Math.round(s[1] + 8 + v), 1, 1); }
    });
    var on = ((t * 1.4) % 1) < 0.5, ob = offset(NEAR_Z);
    g.fillStyle = '#ff4a2a'; if (on) { g.fillRect(1002 + ob, 603, 3, 3); g.fillRect(1167 + ob, 603, 3, 3); }
  }
  // The puddles' dark water, laid on the ground
  function drawPuddles(g) {
    if (wet < 0.01 && rainLevel < 0.02) return;
    if (Math.abs(maskAt.wet - wet) > 0.02) buildPuddles();
    g.save(); groundTransform(g);
    if (rainLevel > 0.02) { g.globalAlpha = 0.12 * rainLevel; g.fillStyle = '#0c0a10'; g.fillRect(0, 0, GW, GH); }   // the street a little darker while it rains
    g.globalAlpha = 0.5; g.drawImage(puddleTint(), 0, 0); g.restore();
  }
  // What the puddles mirror: the street above, upside down, rippling in the rain; made at half size (so it comes
  // out soft), masked to the water, then laid on the ground
  var reflCount = 0;
  function drawReflections(t) {
    if (wet < 0.01 && rainLevel < 0.02) { reflCount = 0; return; }
    if (reflCount++ % 2 === 0) refreshReflection(t);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(xtx.canvas, 0, GROUND, W, H - GROUND); ctx.restore();
  }
  function refreshReflection(t) {
    var sy = -1 / 1.3, f = GROUND * (1 + 1 / 1.3), top = Math.round(GROUND - (H - GROUND) * 1.3) - 2;   // only rows that land on the ground
    xtx.setTransform(1, 0, 0, 1, 0, 0); xtx.clearRect(0, 0, RW, RH); xtx.imageSmoothingEnabled = true;
    if (rainLevel > 0.2) {
      for (var y = top; y < GROUND; y += 6) { var wob = Math.sin(t * 3 + y * 0.35) * 2 * rainLevel; xtx.setTransform(0.5, 0, 0, 0.5 * sy, 0.5 * wob, 0.5 * (f - GROUND)); xtx.drawImage(ctx.canvas, 0, y, W, 6, 0, y, W, 6); }
    } else { xtx.setTransform(0.5, 0, 0, 0.5 * sy, 0, 0.5 * (f - GROUND)); xtx.drawImage(ctx.canvas, 0, top, W, GROUND - top, 0, top, W, GROUND - top); }
    xtx.setTransform(1, 0, 0, 1, 0, 0);
    xtx.globalCompositeOperation = 'source-atop'; xtx.fillStyle = css(mix(skyAt(0), [6, 4, 8], 0.6), 0.24); xtx.fillRect(0, 0, RW, RH);
    xtx.globalCompositeOperation = 'destination-in';
    xtx.setTransform(0.5, 0, 0.5 * CAMX * 0.5 / (H - GROUND), 0.5, 0.5 * (-M + CAMX * 0.45), 0); xtx.drawImage(pmask, 0, 0);
    xtx.setTransform(1, 0, 0, 1, 0, 0); xtx.globalCompositeOperation = 'source-over';
  }
  // The glow: the sharp lights shrunk in four steps; the 1/4 and 1/16 copies, enlarged, make a tight and a wide halo
  function drawHalos(g) { g.save(); g.imageSmoothingEnabled = true; g.drawImage(halo.canvas, 0, 0, W, H); g.restore(); }
  function mergeHalos() {                               // once per glow update: the three levels into one small picture
    var w = W / 4, h = H / 4;
    halo.clearRect(0, 0, w, h); halo.imageSmoothingEnabled = true; halo.globalCompositeOperation = 'lighter';
    halo.globalAlpha = 0.9; halo.drawImage(GLOW[1].canvas, 0, 0, w, h);
    halo.globalAlpha = 0.45; halo.drawImage(GLOW[2].canvas, 0, 0, w, h);
    halo.globalAlpha = 0.85; halo.drawImage(GLOW[3].canvas, 0, 0, w, h);
    halo.globalAlpha = 1; halo.globalCompositeOperation = 'source-over';
  }
  function dronePos(t) { return [Math.round(640 + Math.sin(t * 0.17) * 420) + offset(0.3), Math.round(40 + Math.sin(t * 0.8) * 4)]; }
  function drawDrone(g, t, lightsOnly) {
    if (state.night < 0.3) return;
    var p = dronePos(t), x = p[0], y = p[1];
    if (!lightsOnly) { g.fillStyle = '#16121a'; g.fillRect(x - 11, y, 22, 6); g.fillRect(x - 7, y - 3, 14, 3); g.fillRect(x - 16, y + 1, 5, 2); g.fillRect(x + 11, y + 1, 5, 2); }
    g.fillStyle = '#ff3a3a'; if ((t % 1.2) < 0.6) { g.fillRect(x - 16, y + 1, 2, 2); g.fillRect(x + 14, y + 1, 2, 2); }
    g.fillStyle = '#f0f4ff'; g.fillRect(x - 1, y + 6, 2, 1);
  }
  function cone(g, x, y, spread, len, rgb, alpha) {
    var lg = g.createLinearGradient(0, y, 0, y + len);
    lg.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')'); lg.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = lg;
    g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.lineTo(x + spread, y + len); g.lineTo(x - spread, y + len); g.closePath(); g.fill();
  }
  function pool(g, x, y, r, rgb, alpha) {
    g.save(); g.translate(x, y); g.scale(1, 0.3);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
  }
  function glowAt(g, x, y, r, rgb, alpha) { var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // Light that lands on the ground and walls: drawn under the people, so they stand in it
  function drawGroundLight(g) {
    var a = state.lights; if (a < 0.02) return;
    g.save(); g.globalCompositeOperation = 'screen';
    glowAt(g, 670 + offset(MARQUEE.z), 202, 200, '255,170,90', 0.13 * a);
    FRONTS.forEach(function (f) {
      var x = f[0] + offset(f[3]), w = f[1], lg = g.createLinearGradient(0, GROUND, 0, FOOT + 6);
      lg.addColorStop(0, 'rgba(' + f[2] + ',' + (0.24 * a) + ')'); lg.addColorStop(1, 'rgba(' + f[2] + ',0)'); g.fillStyle = lg;
      g.beginPath(); g.moveTo(x - 2, GROUND); g.lineTo(x + w + 2, GROUND); g.lineTo(x + w + 40 + offset(0.15), FOOT + 6); g.lineTo(x - 40 + offset(0.15), FOOT + 6); g.closePath(); g.fill();
    });
    var oa = offset(AWNING_Z);
    LANTERNS.forEach(function (l) { glowAt(g, l[0] + oa, l[1], 30, '255,110,60', 0.22 * a); pool(g, l[0] + oa, GROUND + 10, 46, '255,120,70', 0.2 * a); });
    pool(g, LAMPHEAD[0] + offset(NEAR_Z), FOOT - 30, 150, '200,214,255', 0.32 * a);
    glowAt(g, 1150 + offset(HOLE_Z), 588, 60, '200,236,240', 0.28 * a);
    g.restore();
  }
  // The light round each sign, on the street behind the people; it brightens when the sign's link is pointed at
  function drawSpillLights(g) {
    var a = state.lights;
    if (a > 0.02) {
      Object.keys(SPILLS).forEach(function (k) {
        var s = SPILLS[k], hv = hover === k ? 3 : 1, r = s[2] * (hover === k ? 1.25 : 1);
        glowAt(g, s[0] + offset(s[4]), s[1], r, s[3].join(','), 0.07 * a * hv);
      });
    } else if (hover && SPILLS[hover]) {
      var s2 = SPILLS[hover]; glowAt(g, s2[0] + offset(s2[4]), s2[1], s2[2], '255,250,240', 0.12);
    }
  }
  // Light in the air in front of the people: the street lamp's beam, and the work light shining down into the
  // stairwell. Added after the rain ('lighter'), so the drops show where they fall through a beam
  function drawFrontLights(g) {
    var a = state.lights, wl = Math.max(a, 0.25), ow = offset(HOLE_Z);
    g.save(); g.globalCompositeOperation = 'lighter';
    if (a > 0.02) cone(g, LAMPHEAD[0] + offset(NEAR_Z), LAMPHEAD[1] + 2, 120, FOOT - LAMPHEAD[1], '200,214,255', 0.12 * a);
    g.translate(WORKLIGHT[0] + ow, WORKLIGHT[1]); g.rotate(0.55);
    var lg = g.createLinearGradient(0, 0, 0, 70); lg.addColorStop(0, 'rgba(230,240,255,' + (0.3 * wl) + ')'); lg.addColorStop(1, 'rgba(230,240,255,0)'); g.fillStyle = lg;
    g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.lineTo(34, 70); g.lineTo(-34, 70); g.closePath(); g.fill();
    g.restore();
  }
  // The people's own little lights (phones, cigarettes, helmet lamps, scooter lamps): a small soft glow over each,
  // stamped every frame with the people, so it stays on them (and in front of them)
  var DOTS = {};
  function glowDot(c) {
    if (DOTS[c]) return DOTS[c];
    var g = offscreen(32, 32), rgb = rgbH(c), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, css(rgb, 0.85)); gr.addColorStop(0.22, css(rgb, 0.4)); gr.addColorStop(0.55, css(rgb, 0.1)); gr.addColorStop(1, css(rgb, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return (DOTS[c] = g.canvas);
  }
  var DOT_SIZE = { phone: 18, ember: 10, helmet: 18, lamp: 26 };
  function stampLight(g, p) {                           // (called by the people module, in its own canvas's space)
    var a = state.lights; if (a < 0.05) return;
    var s = DOT_SIZE[p.kind] || 16, x = p.x * 2 + (p.w || 1), y = p.y * 2 + 1;
    g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.globalAlpha = Math.min(1, a);
    g.drawImage(glowDot(p.c), Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    g.restore();
  }
  var PEOPLE_OPTS = { light: stampLight };
  function drawPrecip(g) {
    var rc = mix(hazeColor(), [236, 236, 240], 0.6), n = Math.floor(drops.length * rainLevel);
    if (n) { g.fillStyle = css(rc, 0.34); for (var i = 0; i < n; i++) { var d = drops[i]; g.fillRect(Math.round(d.x), Math.round(d.y - d.len), 1, Math.ceil(d.len / 2)); g.fillRect(Math.round(d.x + d.len * 0.12), Math.round(d.y - d.len / 2), 1, Math.ceil(d.len / 2)); } }
    g.fillStyle = css(rc, 0.6); splashes.forEach(function (s) { if (s.age < 0.06) g.fillRect(s.x, s.y - 2, 2, 2); else { g.fillRect(s.x - 3, s.y - 2, 2, 1); g.fillRect(s.x + 2, s.y - 3, 2, 1); } });
    g.fillStyle = css(rc, 0.3); ripples.forEach(function (r) { var w = 2 + Math.floor(r.age * 24); g.fillRect(r.x - w, r.y, 2, 1); g.fillRect(r.x + w, r.y, 2, 1); });
    var fn = Math.floor(flakes.length * snowLevel);
    if (fn) { g.fillStyle = 'rgba(244,242,240,0.85)'; for (var q = 0; q < fn; q++) { var fl = flakes[q]; g.fillRect(Math.round(fl.x + Math.sin(state.t * 0.8 + fl.p) * fl.sw * 0.3), Math.round(fl.y), fl.s, fl.s); } }
  }
  // People get the same light as the street: an olive cast at dusk, a mauve one at night
  function shadePeople(g, y0, y1) {
    var a = 0.3 * state.dusk + 0.16 * state.night; if (a < 0.01) return;
    var c = mix(rgbH('#2c2a12'), rgbH('#26162e'), state.night / Math.max(0.001, state.night + state.dusk));
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = css(c, a); g.fillRect(0, y0, W, y1 - y0); g.globalCompositeOperation = 'source-over';
  }
  // Lightning (grain and the vignette are a CSS layer, see grainEl)
  function drawFinish(g, t) {
    var age = t - flash.start;
    if (age < 0.7) { var fl = age < 0.06 ? 0.7 : age < 0.1 ? 0.1 : age < 0.16 ? 0.5 : Math.max(0, 0.5 * (1 - (age - 0.16) / 0.5)); g.fillStyle = 'rgba(236,232,244,' + (fl * 0.4) + ')'; g.fillRect(0, 0, W, H); }
  }

  // ---------- Update and render ----------
  function updateWorld(dt, t) {
    state.weather = weatherNow();
    rainLevel += ((state.weather === 'rain' ? 1 : 0) - rainLevel) * Math.min(1, dt / 8);
    snowLevel += ((state.weather === 'snow' ? 1 : 0) - snowLevel) * Math.min(1, dt / 8);
    var target = rainLevel > 0.5 ? 1 : snowLevel > 0.5 ? 0.35 : 0;
    wet = wet < target ? Math.min(target, wet + dt / 45) : Math.max(target, wet - dt / 150);   // dry about two and a half minutes after the rain
    var cold = Math.max(snowLevel, state.night * 0.8, rainLevel * 0.5);   // vents only steam when the air is cold
    EMITTERS.forEach(function (e) { e.acc += dt * e.rate * (e.cold ? cold : 1); while (e.acc >= 1) { e.acc -= 1; smoke.push(emit(e)); } });
    updateSnowCover(dt);
    for (var s = smoke.length - 1; s >= 0; s--) { var p = smoke[s]; p.age += dt; stepSmoke(p, dt); if (p.age >= p.life) smoke.splice(s, 1); }
    var n = Math.floor(drops.length * rainLevel);
    for (var d = 0; d < n; d++) {
      var dr = drops[d]; dr.y += dr.v * dt; dr.x -= dr.v * dt * 0.25;
      if (dr.y >= dr.floor) {
        if (dr.floor > GROUND) { var hx = Math.round(dr.x), hy = Math.round(dr.floor); if (inPuddle(hx, hy)) { if (Math.random() < 0.5) ripples.push({ x: hx, y: hy, age: 0 }); } else if (Math.random() < 0.5) splashes.push({ x: hx, y: hy, age: 0 }); }
        drops[d] = newDrop(false);
      }
    }
    updateDrips(dt); updateCat(dt); updatePigeons(dt); if (!tickHeld) tickOff += dt * 28;
    for (var q = splashes.length - 1; q >= 0; q--) { splashes[q].age += dt; if (splashes[q].age > 0.14) splashes.splice(q, 1); }
    for (var z = ripples.length - 1; z >= 0; z--) { ripples[z].age += dt; if (ripples[z].age > 0.45) ripples.splice(z, 1); }
    var fn = Math.floor(flakes.length * snowLevel);
    for (var k = 0; k < fn; k++) { var fl = flakes[k]; fl.y += fl.v * dt; fl.x += (12 + Math.sin(t * 0.3) * 12) * dt; if (fl.y > H || fl.x > W + 40) flakes[k] = newFlake(false); }
    if (rainLevel > 0.6 && state.day < 0.5 && t > flash.next) { flash.start = t; flash.next = t + rand(20, 60); }
  }
  function renderScene(t) {
    var fogAmount = 1 + 0.35 * rainLevel + 0.2 * snowLevel, e = env();
    // Sky, the far city in its haze, chimney smoke, the street of buildings, the ground and its puddles
    drawBackdrop(fogAmount); drawBirds(t);
    fogBand(ctx, 40, 5, 3, 0.45 * fogAmount, t, 0.15);
    drawSmoke(ctx, 'back');
    drawDrone(ctx, t, false);
    drawStreet(t);
    if (state.lights > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'screen'; drawHalos(ctx); ctx.restore(); }   // (before the footpath things, which stand in front)
    drawHomes(ctx, t);
    drawBoards(ctx);                                    // the billboard, the specials and the ticker, in pixel letters
    drawSmoke(ctx, 'mid');
    drawGround(ctx); drawPuddles(ctx); drawPart(ctx, PROPS); drawPeeps(ctx, 'props', t); if (PROPS_BACK) drawPart(ctx, PROPS_BACK); drawReflections(t); drawWetTrails(ctx, t);
    drawPart(ctx, PART_SIGN);                            // the sign hangs in front of the newsstand
    drawXmasStreet(ctx, t); drawCat(ctx, t); drawPigeons(ctx, t, true); drawDrips(ctx);
    drawLiveBits(ctx, t, false); drawReactions(ctx, t); drawGroundLight(ctx);
    // The light round the signs and from the bar's door: laid on the street, behind the people
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    drawSpillLights(ctx);
    if (crowd) { ctx.save(); ctx.scale(2, 2); crowd.drawLight(ctx, e); ctx.restore(); }
    ctx.restore();
    // Front: the stairwell's railings, the railing, poles and wires, the lamp; steam, low fog, weather, grain
    ftx.clearRect(0, 0, W, H);
    if (!(crowd && crowd.drawWorkers)) drawPart(ftx, SUBWAY);   // (otherwise it goes between the walkers and the workers)
    if (PROPS_FRONT) drawPart(ftx, PROPS_FRONT);            // things at the curb stand in front of the walkers
    drawPart(ftx, NEAR); drawDropWires(ftx); drawCountdown(ftx); drawXmasFront(ftx, t); drawPigeons(ftx, t, false);
    drawSmoke(ftx, 'front');
    fogBand(ftx, 450, 4, 9, 0.16 * fogAmount, t, 0.5);
    fogBand(ftx, 540, 3, -6, 0.12 * fogAmount, t + 40, 0.7);
    drawPrecip(ftx); drawFrontLights(ftx); drawFinish(ftx, t);
  }
  function renderPeople() {
    if (!crowd) { ptx.clearRect(0, 0, W, H); return; }
    var e = env();
    // Walkers on the footpath, then the stairwell's railings (they are in front of the walkers), then the workers
    // down in the stairwell (in front of the railings); the barrier at the curb is on the front canvas, over them all
    crowd.draw(ptx, e, { skipRide: !!rtx, skipWorkers: !!crowd.drawWorkers, light: stampLight });
    shadePeople(ptx, 380, H);
    ptx.save(); ptx.beginPath(); ptx.rect(0, 430, W, 40); ptx.clip(); drawPart(ptx, PART_AWN); ptx.restore();   // the lanterns hang in front of the diners
    if (crowd.drawWorkers) {
      drawPart(ptx, SUBWAY);
      wkx.clearRect(0, 0, WK.w, WK.h); wkx.save(); wkx.translate(-WK.x, -WK.y); crowd.drawWorkers(wkx, e, PEOPLE_OPTS); wkx.restore();
      shadePeople(wkx, 0, WK.h); ptx.drawImage(wkx.canvas, WK.x, WK.y);
    }
    if (rtx) {                                          // the road: scooters, then cars far lane to near, then their lights
      rtx.clearRect(0, 0, W, H - RIDE_TOP); rtx.save(); rtx.translate(0, -RIDE_TOP);
      crowd.drawRiders(rtx, e, PEOPLE_OPTS); drawCars(rtx);
      rtx.restore(); shadePeople(rtx, 0, H - RIDE_TOP);
      rtx.save(); rtx.translate(0, -RIDE_TOP); drawCarLights(rtx); rtx.restore();
    }
  }
  // Halos (lights only, never letters): a tight one, and a wide one made from the same picture
  function renderGlow(t) {
    gtx.clearRect(0, 0, W, H);
    if (state.lights > 0.01) {
      partLights(gtx, FAR, 0.6);
      STREET.forEach(function (b) { partLights(gtx, b.p, 0.95); }); clearDarkWindows(gtx);
      gtx.save(); groundTransform(gtx); lights(gtx, GROUNDP, 0.8, function (c) { gtx.drawImage(c, 0, 0); }); gtx.restore();
      partLights(gtx, PROPS, 0.9); partLights(gtx, SUBWAY, 1); partLights(gtx, NEAR, 1);
      if (PROPS_BACK) partLights(gtx, PROPS_BACK, 0.9); if (PROPS_FRONT) partLights(gtx, PROPS_FRONT, 0.9);
      smokerGlow(gtx, state.t); outsideGlow(gtx, state.t);
      gtx.globalAlpha = state.lights;
      drawMarquee(gtx, t, true); drawLiveBits(gtx, t, true); drawDrone(gtx, t, true);
      gtx.globalAlpha = 1;
    }
    var src = gtx.canvas;
    GLOW.forEach(function (g) { g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, g.canvas.width, g.canvas.height); src = g.canvas; });
    mergeHalos();
  }

  // ---------- The street's hours ----------
  function crowdAt(h) { return h < 5 ? 0.34 : h < 7 ? 0.5 : h < 10 ? 1 : h < 17 ? 0.72 : h < 22 ? 1 : 0.6; }   // how busy the footpath is
  function teaBreak(h) { return (h >= 10.5 && h < 10.85) || (h >= 15.5 && h < 15.85); }                          // the road crew's tea
  // A colour in today's light (for things drawn live)
  var ambMemo = {}, ambKey = '';
  function amb(hex) {
    var key = Math.round(state.dusk * 64) + '|' + Math.round(state.day * 64);
    if (key !== ambKey) { ambMemo = {}; ambKey = key; }
    if (!ambMemo[hex]) { var A = rgbH(hex), c = [0, 0, 0]; ['night', 'dusk', 'day'].forEach(function (k) { var w = WEIGHTS[k], m = AMB[k]; c[0] += A[0] * m[0] * w; c[1] += A[1] * m[1] * w; c[2] += A[2] * m[2] * w; }); ambMemo[hex] = css(c); }
    return ambMemo[hex];
  }
  // Windows keep their own hours, on the visitor's clock: they come on one by one as it gets dark, go dark as people
  // go to bed (a few night owls stay up), early risers switch on before dawn, and now and then someone goes into
  // another room. One flat has a TV on in the evening.
  var TVWIN;                                            // (chosen when the parts are built; not reset here)
  function windowOn(w, h) {
    if (w.smoker) return false;                         // the smoker keeps the light off
    if (w.party && partyNow()) return true;             // the party flat stays lit
    if (w.kid && (h >= 20 || h < 7)) return false;      // a child's bedtime: just the night-light
    var hh = h < 12 ? h + 24 : h, bed = w.s < 0.12 ? 99 : 21.5 + w.s2 * 5, wake = 5 + w.s3 * 1.6;
    var on = hh < bed || (h >= wake && h < 10);
    var slot = Math.floor(Date.now() / 40000), r = Math.sin((slot + w.s * 977) * 12.9898) * 43758.5453; r -= Math.floor(r);
    if (r < 0.05) on = !on;
    return on && state.lights >= w.s * 0.85;
  }
  var winByPart = null, winAt = -1;
  function windowsNow() {                              // each window's state, worked out once per frame
    if (winAt === state.t) return; winAt = state.t;
    if (!winByPart) { winByPart = {}; LITWIN.forEach(function (w) { (winByPart[w.part] = winByPart[w.part] || []).push(w); }); }
    LITWIN.forEach(function (w) { w.on = windowOn(w, state.hour); });
  }
  // Each lit window's own light: mul tints the room, glow is the lamp's pool in one corner
  var TONES = { warm: { glow: '255,214,150', k: 0 }, cool: { glow: '220,240,255', k: 0 }, amber: { mul: '#ffa860', glow: '255,170,90', k: 0.5 },
    pale: { mul: '#fff2d6', glow: '255,246,224', k: 0.3 }, candle: { mul: '#ff9a48', glow: '255,150,60', k: 0.62, flicker: true }, red: { mul: '#ff6a5a', glow: '255,80,70', k: 0.55 },
    neon: { mul: '#c87aff', glow: '255,90,210', k: 0.55 }, green: { mul: '#8affc0', glow: '110,230,160', k: 0.45 } };
  function drawWindowHours(g, partName, t) {
    var a = state.lights;
    windowsNow(); var list = winByPart[partName];
    if (list && a >= 0.03) {
      var off = css(litColor('GLASS'));
      list.forEach(function (w) {
        var x = w.x + offset(w.z);
        if (!w.on) {
          g.globalAlpha = Math.min(1, a * 1.15); g.fillStyle = off; g.fillRect(x, w.y, w.w, w.h);
          g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 2, w.y + 2, Math.max(1, w.w - 10), 1); g.fillRect(x + 2, w.y + 3, 1, Math.max(1, w.h - 12));
          g.globalAlpha = 1;
          if (w.kid && a > 0.3) nightLight(g, w, x, t);
        } else if (w === TVWIN && (state.hour >= 19 || state.hour < 1)) {
          var fl = 0.16 + 0.1 * Math.sin(t * 13.1) * Math.sin(t * 3.7) + (Math.sin(t * 0.9) > 0.7 ? 0.08 : 0);
          g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(110,150,255,' + (fl * a).toFixed(3) + ')'; g.fillRect(x, w.y, w.w, w.h); g.restore();
        } else {
          var T = TONES[w.tone] || TONES.warm, fk = T.flicker ? 0.8 + 0.2 * Math.sin(t * 9.3 + w.s * 40) * Math.sin(t * 2.3) : 1;
          g.save();
          if (T.mul) { g.globalCompositeOperation = 'multiply'; g.globalAlpha = a * T.k * fk; g.fillStyle = T.mul; g.fillRect(x, w.y, w.w, w.h); }
          // the lamp's pool of light, in one top corner or low down, so no two windows are lit the same way
          var lx = x + (w.lamp < 0.4 ? w.w * 0.2 : w.lamp < 0.8 ? w.w * 0.8 : w.w * 0.5), ly = w.y + (w.lamp < 0.8 ? w.h * 0.25 : w.h * 0.85), rr = w.w * 0.75;
          var gr = g.createRadialGradient(lx, ly, 0, lx, ly, rr); gr.addColorStop(0, 'rgba(' + T.glow + ',' + (0.32 * a * fk).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + T.glow + ',0)');
          g.globalCompositeOperation = 'screen'; g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(x, w.y, w.w, w.h);
          g.restore();
        }
        windowExtras(g, w, x, t, a);
      });
    }
  }
  // The people at home, and the blinds in front of them: drawn after the glow, so they stay dark against their light
  // (the glow would otherwise light them up). The newsagent goes with the footpath things (see renderScene).
  function drawHomes(g, t) {
    STREET.forEach(function (b) { drawPeeps(g, b.p.name, t); });
    var a = state.lights;
    if (a >= 0.03) LITWIN.forEach(function (w) {
      if (!w.blinds || !w.on) return;
      var x = w.x + offset(w.z); g.fillStyle = 'rgba(24,16,14,' + (0.42 * a).toFixed(3) + ')';
      for (var by = w.y + 1; by < w.y + w.h; by += 3) g.fillRect(x, by, w.w, 1);
    });
    drawOutside(g, t);
  }
  // People at home and in the shops: each has something to do, wanders a little, now and then steps out of the
  // room and comes back. Seen as dark shapes against their light; faint by day, gone when their room is dark.
  var peepsByPart = null, SMOKER = null;
  function drawPeeps(g, partName, t) {
    if (!crowd || !crowd.roomActor) return;
    if (!peepsByPart) {
      // the smoker's window: on the middle floor of E if it can be, otherwise any flat's window (not the TV one)
      var cands = LITWIN.filter(function (w) { return w !== TVWIN && (w.part === 'E' || w.part === 'A' || w.part === 'G'); });
      var sw = cands.filter(function (w) { return w.part === 'E' && w.y > 240 && w.y < 300; })[0] || cands[0];
      if (sw) {
        sw.smoker = true; WINPEEPS = WINPEEPS.filter(function (p) { return p.win !== sw; });
        SMOKER = { smoker: true, part: sw.part, z: sw.z, x: sw.x, y: sw.y, w: sw.w, h: sw.h, seed: 0.37, win: sw }; WINPEEPS.push(SMOKER);
      }
      pickSpecialWindows();
      peepsByPart = {}; WINPEEPS.forEach(function (p) { (peepsByPart[p.part] = peepsByPart[p.part] || []).push(p); });
    }
    var list = peepsByPart[partName]; if (!list) return;
    var a = state.lights, mull = css(litColor('METALD'));
    list.forEach(function (p) {
      var ox = offset(p.z), x = p.x + ox;
      if (p.smoker) { drawSmoker(g, p, x, t, a); return; }
      if (p.partyOnly && !partyNow()) return;              // the party's guests come and go with the party
      if (p.hours && !between(state.hour, p.hours[0], p.hours[1])) return;   // only at their hour (watering the window box)
      if (p.win && p.win.party && partyNow() && !p.partyOnly) return;
      var lit = p.shop || p.screen || !p.win || p.win.on;
      if (!lit && a > 0.25) return;                       // a dark room at night: nobody to see
      var per = 50 + p.seed * 70, ph = ((t + p.seed * 300) / per) % 1;
      if (!p.shop && ph > 0.84) return;                   // stepped out of the room for a while
      var edge = p.shop ? 0 : ph < 0.04 ? 1 - ph / 0.04 : ph > 0.8 ? (ph - 0.8) / 0.04 : 0;   // walking in or out
      var left = p.left + ox, span = x + p.w - left;
      var cx = left + span * (0.28 + 0.44 * p.seed) + (p.roam && !p.shop ? Math.sin(t * 0.22 + p.seed * 9) * span * 0.22 : 0) + edge * span * 0.9;
      var kind = edge > 0 ? 'pace' : p.kind, f = Math.floor(t * (2 + p.seed * 2) + p.seed * 10) % 4;
      var ah = p.ah || Math.min(44, p.h * 1.05), sit = /^(read|type|guitar)$/.test(kind), by = p.y + p.h + (sit ? 2 : p.shop ? ah * 0.18 : ah * 0.3);
      var dark = lit && a > 0.2 ? [26, 18, 16] : mix([40, 34, 30], [70, 72, 76], state.day);
      g.save(); g.beginPath(); g.rect(x, p.y, p.w, p.h); g.clip();
      g.globalAlpha = p.screen ? 0.55 : lit && a > 0.2 ? 0.9 : 0.35;
      crowd.roomActor(g, kind, f, Math.round(cx), Math.round(by), ah, css(dark), a > 0.3 ? '#9ad4ff' : '#c8d8e0', p.seed);
      g.restore();
      if (p.mull) { g.fillStyle = mull; g.fillRect(x, p.y + Math.floor(p.h / 2), p.w, 1); g.fillRect(x + Math.floor(p.w / 2), p.y, 1, p.h); }
    });
  }
  // A man at a dark window, the sash pushed up, leaning on the sill with a cigarette. Every few seconds he draws on
  // it (the tip flares), then rests his hand on the sill again; smoke curls out and up.
  function smokerPose(p, x, t) {
    var sill = p.y + p.h, cx = x + Math.round(p.w * 0.55), c = (t + p.seed * 5) % 7, up = c < 1.4;
    return { sill: sill, cx: cx, up: up, ember: up ? [cx + 5, sill - 16] : [cx + 11, sill - 4] };
  }
  function drawSmoker(g, p, x, t, a) {
    var s = smokerPose(p, x, t), sill = s.sill, cx = s.cx, night = a > 0.2;
    g.fillStyle = 'rgba(6,4,8,' + (night ? 0.55 : 0.3) + ')'; g.fillRect(x + 1, p.y + Math.floor(p.h / 2) + 1, p.w - 2, Math.floor(p.h / 2) - 1);   // the open lower half
    g.fillStyle = night ? 'rgba(50,40,46,0.96)' : 'rgba(40,34,30,0.6)';   // (a little street light on him, so he reads against the dark room)
    for (var yy = -4; yy <= 4; yy++) { var hw = Math.round(Math.sqrt(16 - yy * yy + 2)); g.fillRect(cx - hw, sill - 19 + yy, hw * 2 + 1, 1); }   // head
    g.fillRect(cx - 2, sill - 15, 4, 3); g.fillRect(cx - 7, sill - 12, 14, 12); g.fillRect(cx - 10, sill - 3, 20, 3);   // neck, shoulders, arms on the sill
    if (s.up) { g.fillRect(cx + 5, sill - 12, 3, 8); g.fillRect(cx + 3, sill - 17, 3, 6); }   // forearm raised to the mouth
    else { g.fillRect(cx + 8, sill - 5, 4, 2); g.fillStyle = 'rgba(232,226,214,' + (night ? 0.7 : 0.9) + ')'; g.fillRect(cx + 9, sill - 4, 2, 1); }
    g.fillStyle = s.up ? '#ffb24a' : '#d0602a'; g.fillRect(s.ember[0], s.ember[1], s.up ? 2 : 1, s.up ? 2 : 1);
    if (s.up) { g.fillStyle = '#fff0c4'; g.fillRect(s.ember[0], s.ember[1], 1, 1); if (night) { g.fillStyle = 'rgba(255,150,70,0.5)'; g.fillRect(cx + 2, sill - 20, 2, 4); g.fillRect(cx + 3, sill - 16, 2, 1); } }   // the glow on his face
    g.fillStyle = night ? 'rgba(120,96,104,0.5)' : 'rgba(0,0,0,0)'; g.fillRect(cx - 4, sill - 23, 6, 1); g.fillRect(cx - 7, sill - 12, 1, 9);   // a faint rim of light
    for (var k = 0; k < 7; k++) {                       // smoke, drifting out and up with the wind
      var age = ((t * 0.32 + k / 7) % 1), sz = Math.round(1 + age * 4), al = (1 - age) * (night ? 0.4 : 0.26);
      var sx = cx + 11 + age * 12 + Math.sin(t * 0.8 + k * 2.1) * 3 * age, sy = sill - 6 - age * 44;
      g.fillStyle = 'rgba(206,200,192,' + al.toFixed(3) + ')'; g.fillRect(Math.round(sx - sz / 2), Math.round(sy), sz, Math.max(1, sz - 1));
    }
  }
  // ---------- The buildings' day: the shutter, the party flat, the child's night-light, deliveries, signs ----------
  function between(h, a, b) { return a <= b ? h >= a && h < b : h >= a || h < b; }
  function ease(h, at, mins) { return clamp((h - at) * 60 / mins, 0, 1); }        // 0 before at, 1 a few minutes after
  // The laundromat opens at 8 and shuts at 20: the shutter takes a minute to roll
  function shutterOpen() { var h = state.hour; return h < 12 ? ease(h, 8, 1) : 1 - ease(h, 20, 1); }
  // A party on Friday and Saturday nights (?party to see it any night)
  var PARTY_Q = /[?&]party\b/.test(location.search);
  function partyNow() {
    var h = state.hour, d = new Date().getDay();
    if (PARTY_Q) return h >= 19 || h < 3;
    return ((d === 5 || d === 6) && h >= 21) || ((d === 6 || d === 0) && h < 2.5);
  }
  var PARTYWIN = null, KIDWIN = null;
  function pickSpecialWindows() {                       // (once): the party flat in G, a child's room in A
    PARTYWIN = LITWIN.filter(function (w) { return w.part === 'G' && !w.smoker; })[1] || null;
    KIDWIN = LITWIN.filter(function (w) { return w.part === 'A' && !w.smoker && w !== PARTYWIN && w !== TVWIN; })[0] || null;
    if (PARTYWIN) { PARTYWIN.party = true; for (var k = 0; k < 3; k++) WINPEEPS.push({ part: PARTYWIN.part, z: PARTYWIN.z, win: PARTYWIN, x: PARTYWIN.x, y: PARTYWIN.y, w: PARTYWIN.w, h: PARTYWIN.h, left: PARTYWIN.x, kind: 'dance', seed: 0.2 + k * 0.3, roam: true, mull: true, partyOnly: true }); }
    if (KIDWIN) KIDWIN.kid = true;
  }
  // Snow settles on sills, ledges and roof edges while it snows, and melts slowly after
  var snowCover = state.weather === 'snow' ? 0.6 : 0;
  function updateSnowCover(dt) { snowCover = snowLevel > 0.2 ? Math.min(1, snowCover + dt * 0.01 * snowLevel) : Math.max(0, snowCover - dt * 0.004); }
  var ROOFLINES = [[-M, 196, 152, 0.43], [420, 540, 240, 0.44], [536, 806, 322, 0.5], [796, 994, 152, 0.42], [986, 1174, 240, 0.46], [1166, W + M, 66, 0.4], [198, 418, 297, 0.47]];

  // A window's live extras, drawn with the rest of its light (before the glow): the party's colours, the night-light,
  // and the light that spills from the window onto the wall below it
  function windowExtras(g, w, x, t, a) {
    if (w.party && partyNow()) {
      var hue = (t * 40 + w.s * 360) % 360, beat = 0.7 + 0.3 * Math.abs(Math.sin(t * 6.2));
      g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.7 * beat; g.fillStyle = 'hsl(' + hue.toFixed(0) + ',90%,62%)'; g.fillRect(x, w.y, w.w, w.h);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.5;
      for (var d = 0; d < 6; d++) { g.fillStyle = 'hsl(' + ((hue + d * 60) % 360).toFixed(0) + ',100%,70%)'; g.fillRect(Math.round(x + ((t * 9 + d * 13) % w.w)), Math.round(w.y + 2 + ((d * 7 + t * 3) % (w.h - 4))), 2, 2); }   // a mirror ball's spots
      g.restore();
    }
    if (w.on && a > 0.05) {                             // light spilling onto the wall under the window
      var T = TONES[w.tone] || TONES.warm, gr = g.createLinearGradient(0, w.y + w.h + 4, 0, w.y + w.h + 22);
      gr.addColorStop(0, 'rgba(' + T.glow + ',' + (0.2 * a).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + T.glow + ',0)');
      g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(x - 6, w.y + w.h + 4, w.w + 12, 18); g.restore();
    }
  }
  function nightLight(g, w, x, t) {                     // a child's room after bedtime: a dim lamp and stars turning on the walls
    g.fillStyle = 'rgba(70,90,170,0.32)'; g.fillRect(x, w.y, w.w, w.h);
    g.fillStyle = 'rgba(190,210,255,0.8)';
    for (var s = 0; s < 9; s++) { var sx = ((s * 11 + t * 2.2) % (w.w - 2)), sy = (s * 7 + Math.sin(s) * 5 + 40) % (w.h - 4); g.fillRect(Math.round(x + 1 + sx), Math.round(w.y + 2 + sy), 1, 1); }
    g.fillStyle = 'rgba(255,214,140,0.7)'; g.fillRect(x + w.w - 6, w.y + w.h - 5, 3, 3);   // the lamp itself
  }

  // The outside of the buildings, live: curtains in open windows, laundry, fairy lights, a rug being shaken, the
  // rooftop neon, wet walls and shining ledges in the rain, snow on the ledges, the low sun, shop signs, the awning,
  // the morning's deliveries
  var WETMASK = null;
  function buildWetMask() {                             // dark streaks under the ledges and sills, where rain soaks in
    var c = document.createElement('canvas'); c.width = W; c.height = GROUND; var g = c.getContext('2d'), s0 = seed; seed = 4711;
    SILLS.concat(SLABS).forEach(function (s) {
      for (var k = 0; k < s[2] / 5; k++) {
        var x = s[0] + rnd() * s[2], len = 10 + rnd() * 50, gr = g.createLinearGradient(0, s[1] + 3, 0, s[1] + 3 + len);
        gr.addColorStop(0, 'rgba(14,16,30,0.55)'); gr.addColorStop(1, 'rgba(14,16,30,0)'); g.fillStyle = gr; g.fillRect(Math.round(x), s[1] + 3, 1 + Math.floor(rnd() * 3), len);
      }
    });
    ROOFLINES.forEach(function (r) { var gr = g.createLinearGradient(0, r[2], 0, r[2] + 40); gr.addColorStop(0, 'rgba(14,16,30,0.45)'); gr.addColorStop(1, 'rgba(14,16,30,0)'); g.fillStyle = gr; g.fillRect(r[0], r[2], r[1] - r[0], 40); });
    seed = s0; return c;
  }
  function hexOf(name) { return MATS[name].a[0]; }
  function drawOutside(g, t) {
    var a = state.lights, h = state.hour, wnd = wind();
    // curtains stirring in the open windows (lit from behind when the room is lit)
    LITWIN.forEach(function (w) {
      if (!w.open) return;
      var x = w.x + offset(w.z), cw = Math.floor(w.w / 3), col = w.on && a > 0.2 ? 'rgba(236,196,140,0.9)' : amb('#a89070');
      g.fillStyle = col;
      for (var r = 1; r < w.h - 1; r++) { var bil = Math.sin(t * 1.9 + r * 0.22 + w.s * 9) * (1.5 + wnd * 0.18) * (r / w.h); g.fillRect(x + 1, w.y + r, Math.max(2, Math.round(cw + bil)), 1); }
      g.fillStyle = 'rgba(0,0,0,0.18)'; for (var f2 = 3; f2 < cw; f2 += 4) g.fillRect(x + 1 + f2, w.y + 1, 1, w.h - 2);   // folds
    });
    // laundry on the lines, swaying with the wind; brought in when it rains
    if (rainLevel < 0.3) LAUNDRY.forEach(function (l) {
      var ox = offset(l.z);
      l.items.forEach(function (it, i) {
        var col = amb(hexOf(it[1])), sw = Math.sin(t * 1.6 + i * 1.3) * (1 + wnd * 0.12), x0 = l.x + it[0] + ox;
        for (var r = 0; r < it[2]; r++) { g.fillStyle = col; g.fillRect(Math.round(x0 + sw * r / it[2]), l.y + r, 10, 1); }
        g.fillStyle = amb('#2e2c2a'); g.fillRect(x0 + 1, l.y - 1, 1, 2); g.fillRect(x0 + 8, l.y - 1, 1, 2);   // pegs
      });
    });
    // fairy lights along a balcony rail
    FAIRY.forEach(function (fy) {
      var ox = offset(fy.z), on = a > 0.15;
      for (var bx = 2; bx < fy.w - 2; bx += 4) {
        var sag = Math.round(Math.sin((bx / fy.w) * Math.PI) * 3), i = bx / 4, c = XCOL[i % 4], tw = 0.55 + 0.45 * Math.sin(t * 1.4 + i * 1.7);
        g.fillStyle = amb('#221e1c'); g.fillRect(fy.x + bx + ox, fy.y + sag, 4, 1);
        g.globalAlpha = on ? tw : 0.6; g.fillStyle = on ? c : amb('#9a9488'); g.fillRect(fy.x + bx + 1 + ox, fy.y + sag + 1, 1, 2); g.globalAlpha = 1;
      }
    });
    // someone shaking a rug out over the balcony rail, mid-morning
    if (RUG && between(h, 8.5, 10.5) && ((t / 30) % 1) < 0.5) {
      var rx = RUG.x + 70 + offset(RUG.z), ry = RUG.y, flap = Math.sin(t * 9), body = amb('#4a3e5a'), skin = amb('#c89a80');
      g.fillStyle = body; g.fillRect(rx - 5, ry - 14, 10, 14); g.fillStyle = skin; for (var yy = -4; yy <= 4; yy++) { var hw = Math.round(Math.sqrt(16 - yy * yy + 2)); g.fillRect(rx - hw, ry - 19 + yy, hw * 2 + 1, 1); }
      g.fillStyle = body; g.fillRect(rx + 4, ry - 10, 10, 3);
      g.fillStyle = amb('#a8402a');
      for (var c2 = 0; c2 < 18; c2++) { var dy = Math.round(Math.sin(c2 * 0.45 - t * 9) * 2 * (c2 / 18) + flap * c2 * 0.15); g.fillRect(rx + 13 + c2, ry - 11 + dy, 1, 7); }
      g.fillStyle = amb('#e8d8b0'); g.fillRect(rx + 14, ry - 9, 16, 1);
      g.fillStyle = 'rgba(200,190,170,0.35)'; for (var dp = 0; dp < 6; dp++) { var age = (t * 1.3 + dp / 6) % 1; g.fillRect(Math.round(rx + 22 + dp * 3 + age * 8), Math.round(ry - 6 + age * 18), 2, 2); }   // dust
    }
    // the rooftop neon: a crescent moon and a star, buzzing on and off now and then
    var nx = 856 + offset(0.42), nOn = a > 0.08 && !(Math.sin(t * 7.3) > 0.93 || (Math.floor(t * 3) % 23 === 0));
    neonShape(g, nx, nOn ? 1 : 0.2);
    // wet walls while it rains, drying slowly after
    if (wet > 0.04) { if (!WETMASK) WETMASK = buildWetMask(); g.save(); g.globalAlpha = Math.min(1, wet * 0.9); g.drawImage(WETMASK, 0, 0); g.restore(); }
    // ledges and sills shining in the rain
    if (wet > 0.15) {
      g.fillStyle = 'rgba(210,220,240,' + (0.35 * wet).toFixed(3) + ')';
      SILLS.concat(SLABS).forEach(function (s, i) { var ox = offset(s[3]); g.fillRect(s[0] + ox, s[1], s[2], 1); if (((t * 2 + i) % 3) < 0.15) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(s[0] + ox + Math.floor((i * 37 + t * 20) % s[2]), s[1], 2, 1); g.fillStyle = 'rgba(210,220,240,' + (0.35 * wet).toFixed(3) + ')'; } });
    }
    // snow on the sills, ledges and roof edges
    if (snowCover > 0.03) {
      var snow = amb('#f0f0ec'), d2 = 1 + Math.round(snowCover * 2);
      g.fillStyle = snow;
      SILLS.concat(SLABS).forEach(function (s, i) { var ox = offset(s[3]); g.fillRect(s[0] + ox, s[1] - d2 + 1, s[2], d2); for (var k = 0; k < s[2]; k += 5) if ((k + i) % 3 === 0) g.fillRect(s[0] + ox + k, s[1] - d2, 3, 1); });
      ROOFLINES.forEach(function (r) { g.fillRect(r[0] + offset(r[3]), r[2] - d2 - 1, r[1] - r[0], d2 + 1); });
    }
    // the low sun: facades warm up at the start and end of the day, and the poles throw long shadows up the walls
    var low = state.dusk * (between(h, 5, 9) || between(h, 15.5, 20) ? 1 : 0);
    if (low > 0.03) {
      var evening = h > 12, gr = g.createLinearGradient(evening ? 0 : W, 0, evening ? W : 0, 0);
      gr.addColorStop(0, 'rgba(255,170,90,' + (0.26 * low).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,150,80,' + (0.06 * low).toFixed(3) + ')');
      g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = gr; g.fillRect(0, 0, W, GROUND); g.restore();
      g.fillStyle = 'rgba(20,10,30,' + (0.22 * low).toFixed(3) + ')';
      [205, 1000].forEach(function (px0) {             // the poles' shadows, slanting up the facades away from the sun
        var dir = evening ? 1 : -1; g.beginPath(); g.moveTo(px0, GROUND); g.lineTo(px0 + 7, GROUND); g.lineTo(px0 + 7 + dir * 150, 120); g.lineTo(px0 + dir * 150, 120); g.closePath(); g.fill();
      });
    }
    drawShopSigns(g, t); drawAwning(g, t); drawDeliveries(g, h);
  }
  function neonShape(g, x, k) {                         // tubes: a crescent (cut from a disc) and a five-point star
    var pink = 'rgba(255,110,200,' + k + ')', cyan = 'rgba(140,240,255,' + k + ')';
    g.fillStyle = pink;
    for (var a2 = 0; a2 < 40; a2++) { var an = a2 / 40 * Math.PI * 2, px1 = x + 10 + Math.cos(an) * 8, py1 = 136 + Math.sin(an) * 8, dx = px1 - (x + 13), dy = py1 - 133; if (dx * dx + dy * dy > 49) g.fillRect(Math.round(px1), Math.round(py1), 1, 1); }
    g.fillStyle = cyan;
    for (var s = 0; s < 10; s++) { var r1 = s % 2 ? 2.5 : 6, an2 = -Math.PI / 2 + s * Math.PI / 5, r2 = (s + 1) % 2 ? 2.5 : 6, an3 = -Math.PI / 2 + (s + 1) * Math.PI / 5;
      for (var u = 0; u <= 1; u += 0.15) g.fillRect(Math.round(x + 24 + (Math.cos(an2) * r1) * (1 - u) + Math.cos(an3) * r2 * u), Math.round(134 + (Math.sin(an2) * r1) * (1 - u) + Math.sin(an3) * r2 * u), 1, 1); }
  }
  // OPEN / CLOSED boards on the doors, turning over when the hours change
  var SHOPSIGNS = [{ x: 352, y: 444, open: [9, 21] }, { x: 658, y: 478, open: [17, 2] }, { x: 1110, y: 454, open: [10, 22] }];
  function drawShopSigns(g, t) {
    SHOPSIGNS.forEach(function (s) {
      var on = between(state.hour, s.open[0], s.open[1]);
      if (s.was === undefined) s.was = on;
      if (s.was !== on) { s.flip = t; s.was = on; }
      var k = s.flip !== undefined && t - s.flip < 0.5 ? Math.abs(Math.cos((t - s.flip) / 0.5 * Math.PI)) : 1, w = Math.max(1, Math.round(27 * k)), x = s.x + 13 - Math.round(w / 2);
      g.fillStyle = amb('#2a2018'); g.fillRect(s.x + 12, s.y - 4, 1, 4); g.fillRect(x, s.y, w, 9);
      if (k > 0.6) pxText(g, F3, on ? 'OPEN' : 'CLOSED', s.x + (on ? 6 : 2), s.y + 2, on ? (state.lights > 0.3 ? '#7aff9a' : '#3a9a5a') : (state.lights > 0.3 ? '#ff7a6a' : '#b83a2a'), 1);
    });
  }
  // The bookshop's striped awning: out by day, rolled in for the night
  function drawAwning(g, t) {
    var h = state.hour, ext = h < 12 ? ease(h, 8.5, 1) : 1 - ease(h, 20.5, 1), x0 = 204, y0 = 421, w = 124, drop = Math.round(15 * ext);
    var red = amb('#b8483a'), cream = amb('#ece6d8'), dark = amb('#5a2e26');
    g.fillStyle = amb('#3a3632'); g.fillRect(x0, y0 - 1, w, 3);                 // the roller
    if (drop < 1) return;
    for (var r = 0; r < drop; r++) for (var sx = 0; sx < w; sx += 8) { g.fillStyle = (sx / 8) % 2 ? cream : red; g.fillRect(x0 + sx, y0 + 2 + r, 8, 1); }
    for (var sc = 0; sc < w; sc += 8) { g.fillStyle = (sc / 8) % 2 ? cream : red; g.fillRect(x0 + sc + 1, y0 + 2 + drop, 6, 2); g.fillRect(x0 + sc + 2, y0 + 4 + drop, 4, 1); }   // the scalloped edge
    g.fillStyle = dark; g.fillRect(x0, y0 + 2 + drop, w, 1); g.globalAlpha = 0.25; g.fillStyle = '#000'; g.fillRect(x0, y0 + 5 + drop, w, 3); g.globalAlpha = 1;   // its shade on the glass
  }
  // Boxes left outside FEED before it opens its stock room, taken in one by one through the morning
  function drawDeliveries(g, h) {
    if (!between(h, 5.5, 10)) return;
    var n = Math.max(0, Math.ceil(5 * (10 - h) / 4.5)), card = amb('#b8946a'), top = amb('#d0ae84'), dark = amb('#8a6a44'), tape = amb('#d8c898');
    for (var i = 0; i < Math.min(5, n); i++) {
      var bx = 112 + (i % 3) * 12, by = 530 - (i < 3 ? 0 : 12) - 12, bw = 11;
      if (i >= 3) bx += 6;
      g.fillStyle = card; g.fillRect(bx, by, bw, 12); g.fillStyle = top; g.fillRect(bx, by, bw, 2); g.fillStyle = dark; g.fillRect(bx + bw - 1, by, 1, 12); g.fillStyle = tape; g.fillRect(bx + 4, by, 2, 12);
    }
  }
  function outsideGlow(g, t) {                          // fairy lights, the neon and the party in the glow layer
    if (state.lights < 0.1) return;
    FAIRY.forEach(function (fy) { for (var bx = 2; bx < fy.w - 2; bx += 4) { var i = bx / 4; g.fillStyle = XCOL[i % 4]; g.fillRect(fy.x + bx + offset(fy.z), fy.y + Math.round(Math.sin((bx / fy.w) * Math.PI) * 3), 3, 3); } });
    neonShape(g, 856 + offset(0.42), 1);
    if (PARTYWIN && partyNow()) { g.fillStyle = 'hsl(' + ((t * 40) % 360).toFixed(0) + ',90%,55%)'; g.fillRect(PARTYWIN.x + offset(PARTYWIN.z), PARTYWIN.y, PARTYWIN.w, PARTYWIN.h); }
  }
  function smokerGlow(g, t) {                           // the cigarette tip, in the glow layer
    if (!SMOKER || state.lights < 0.1) return;
    var p = SMOKER, s = smokerPose(p, p.x + offset(p.z), t);
    g.fillStyle = s.up ? '#ff9a3a' : '#a8401a'; g.fillRect(s.ember[0] - 1, s.ember[1] - 1, s.up ? 4 : 3, s.up ? 4 : 3);
  }
  function clearDarkWindows(g) { windowsNow(); LITWIN.forEach(function (w) { if (!w.on) g.clearRect(w.x + offset(w.z) - 2, w.y - 2, w.w + 4, w.h + 4); }); }

  // ---------- Rain on things: light on the wet ground, drips off the eaves ----------
  // Every light leaves a broken column on the wet footpath (and the tall ones on the road), shivering in the rain
  var TRAILS = [];
  function buildTrails() {
    FRONTS.forEach(function (f) { TRAILS.push([f[0] + f[1] / 2, Math.min(8, Math.max(3, f[1] / 10)), f[2], FOOT - 3, f[3]]); });
    LANTERNS.forEach(function (l) { TRAILS.push([l[0], 3, '255,110,60', FOOT - 3, AWNING_Z]); });
    TRAILS.push([LAMPHEAD[0], 5, '210,220,255', 704, NEAR_Z], [670, 8, '255,190,110', 690, MARQUEE.z], [1189, 3, '255,120,200', FOOT - 3, 0.43]);
  }
  function drawWetTrails(g, t) {
    var a = Math.min(1, wet * 1.4) * state.lights; if (a < 0.03) return;
    if (!TRAILS.length) buildTrails();
    g.save(); g.globalCompositeOperation = 'lighter';
    TRAILS.forEach(function (s, i) {
      var x0 = s[0] + offset(s[4]), y0 = GROUND + 3, y1 = s[3], w = s[1];
      for (var y = y0; y < y1; y += 4) {
        if (y > FOOT - 2 && y < ROAD + 2) continue;   // (not on the curb)
        var k = (y - y0) / (y1 - y0), n = Math.sin(y * 0.9 + t * 7 + i * 3) + Math.sin(y * 0.37 - t * 4.3 + i);
        if (n < -0.3) continue;
        g.fillStyle = 'rgba(' + s[2] + ',' + (a * 0.2 * (1 - k * 0.85) * (0.55 + 0.2 * n)).toFixed(3) + ')';
        g.fillRect(Math.round(x0 - w / 2 + Math.sin(y * 0.5 + t * 6 + i) * 1.5), y, w, 3);
      }
    });
    g.restore();
  }
  // Water drips off the bar's awning and the bookshop's eaves while it rains, and for a while after
  var EAVES = [[536, 806, 427, AWNING_Z], [204, 418, 331, 0.47], [1206, 1302, 140, 0.4], [1206, 1302, 226, 0.4], [1206, 1302, 312, 0.4], [982, 988, 412, 0.42], [1170, 1176, 418, 0.4]], drips = [];   // (and off the fire escape's landings, and out of the downpipes)
  function updateDrips(dt) {
    var rate = 22 * Math.max(rainLevel, Math.min(1, Math.max(0, (wet - 0.45) * 1.6)));
    EAVES.forEach(function (e) { e.acc = (e.acc || 0) + dt * rate * (e[1] - e[0]) / 270; while (e.acc >= 1) { e.acc -= 1; drips.push({ x: rand(e[0], e[1]), y: e[2], v: 0, z: e[3] }); } });
    for (var i = drips.length - 1; i >= 0; i--) {
      var d = drips[i]; d.v += 520 * dt; d.y += d.v * dt;
      if (d.y >= GROUND + 3) { if (Math.random() < 0.6) splashes.push({ x: Math.round(d.x + offset(d.z)), y: GROUND + 3 + Math.floor(Math.random() * 6), age: 0 }); drips.splice(i, 1); }
    }
  }
  function drawDrips(g) {
    if (!drips.length) return;
    g.fillStyle = css(mix(hazeColor(), [236, 236, 240], 0.7), 0.55);
    drips.forEach(function (d) { g.fillRect(Math.round(d.x + offset(d.z)), Math.round(d.y), 1, d.v > 120 ? 3 : 2); });
  }

  // ---------- The roof cat ----------
  // It lives on the walk-up's roof: sits and flicks its tail, grooms, wanders along the parapet, watches the
  // pigeons, and curls up to sleep in the small hours.
  var CAT = { x: 500, dir: 1, state: 'sit', timer: 6, to: 500, step: 0 };
  function updateCat(dt) {
    var c = CAT, sleepy = state.hour >= 1 && state.hour < 5.5;
    c.timer -= dt;
    if (c.state === 'walk') { var d = c.to - c.x; c.dir = d > 0 ? 1 : -1; c.x += c.dir * Math.min(Math.abs(d), 9 * dt); c.step += dt; if (Math.abs(d) < 0.5) { c.state = 'sit'; c.timer = rand(5, 12); } return; }
    if (c.timer > 0) return;
    if (sleepy) { c.state = 'sleep'; c.timer = 30; return; }
    var r = Math.random();
    if (r < 0.4) { c.state = 'walk'; c.to = rand(430, 532); }
    else if (r < 0.7) { c.state = 'groom'; c.timer = rand(3, 6); }
    else { c.state = 'sit'; c.timer = rand(6, 14); if (Math.random() < 0.3) c.dir = -c.dir; }
  }
  function drawCat(g, t) {
    var c = CAT, x = Math.round(c.x + offset(0.44)), y = 240, d = c.dir;
    var body = amb('#2a221c'), dark = amb('#141010'), light = amb('#6a5a4c');
    var R = function (dx, dy, w, h, col) { g.fillStyle = col; g.fillRect(d > 0 ? x + dx : x - dx - w + 1, y + dy, w, h); };
    if (c.state === 'sleep') {
      R(-6, -5, 11, 4, body); R(-5, -6, 8, 1, body); R(-6, -2, 13, 1, dark); R(3, -6, 3, 3, body); R(-3, -5, 1, 2, dark); R(1, -5, 1, 2, dark);
    } else if (c.state === 'walk') {
      var ph = Math.floor(c.step * 8) % 2;
      R(-6, -8, 11, 4, body); R(-4, -8, 1, 3, dark); R(-1, -8, 1, 3, dark); R(2, -8, 1, 3, dark);
      R(-5, -4, 1, 4 - ph, body); R(-2, -4, 1, 3 + ph, body); R(1, -4, 1, 4 - ph, body); R(3, -4, 1, 3 + ph, body);
      R(4, -11, 4, 4, body); R(4, -12, 1, 1, body); R(7, -12, 1, 1, body); R(6, -9, 2, 1, light);
      R(-8, -11, 1, 4, body); R(-7, -12, 1, 1, body);
    } else {
      var groom = c.state === 'groom' && Math.sin(t * 5) > -0.3, flick = c.state === 'sit' && Math.sin(t * 1.7 + c.x) > 0.85 ? -1 : 0;
      R(-6, -6, 8, 5, body); R(-5, -7, 6, 1, body); R(-7, -4, 2, 3, body); R(-4, -6, 1, 3, dark); R(-2, -6, 1, 3, dark);
      R(1, -10, 3, 9, body); R(2, -8, 2, 6, light);
      var hy = groom ? -9 : -14;
      R(1, hy, 5, 4, body); R(1, hy - 1, 1, 1, body); R(5, hy - 1, 1, 1, body); R(4, hy + 2, 2, 1, light);
      if (!groom && state.lights > 0.4) R(4, hy + 1, 1, 1, '#c8ff6a');                     // an eye catching the light
      R(-9, -1, 4, 1, body); R(-10, -2 + flick, 1, 1, body); R(-9, -1, 1, 1, dark);
      if (XMAS && !groom) { R(1, hy - 1, 6, 1, '#f0ece4'); R(2, hy - 3, 4, 2, amb('#c8282a')); R(4, hy - 4, 2, 1, amb('#c8282a')); R(6, hy - 5, 1, 1, '#f0ece4'); }   // a Santa hat
    }
  }

  // ---------- Pigeons ----------
  // A few peck about on the footpath by the shops; when someone walks close (or a dog trots by, or lightning
  // flashes) they burst up to the poles' crossbars, and drift back down in ones and twos. At night they roost.
  var PERCH = [[176, 76], [184, 76], [192, 76], [204, 76], [212, 76], [970, 76], [978, 76], [1006, 76], [1012, 76],
    [826, 243], [842, 243], [944, 243], [958, 243], [20, 243], [34, 243], [1228, 157], [1250, 157], [450, 329], [466, 329]];   // and the ledges
  var GROUNDS = [[236, 390], [560, 640], [820, 980]];
  var pigeons = [];
  for (var pg = 0; pg < 7; pg++) { var gr = GROUNDS[pg % 3]; pigeons.push({ x: rand(gr[0], gr[1]), y: 534 + Math.floor(Math.random() * 4), state: 'peck', dir: Math.random() < 0.5 ? 1 : -1, timer: rand(0, 3), f: 0, seed: Math.random() * 9 }); }
  function freePerch() { var used = pigeons.map(function (p) { return p.perch; }); for (var k = 0; k < 20; k++) { var i = Math.floor(Math.random() * PERCH.length); if (used.indexOf(i) < 0) return i; } return 0; }
  function flyTo(p, x, y, perch) { p.state = 'fly'; p.fx = p.x; p.fy = p.y; p.tx = x; p.ty = y; p.f = 0; p.dur = rand(0.9, 1.6); p.perch = perch; p.dir = x > p.x ? 1 : -1; }
  function startle(p) { if (p.state !== 'peck') return; var i = freePerch(); flyTo(p, PERCH[i][0] + offset(NEAR_Z), PERCH[i][1], i); }
  var lastFlash = -1;
  function updatePigeons(dt) {
    var roost = state.lights > 0.75 || rainLevel > 0.55, near = crowd && crowd.walkers ? crowd.walkers() : [], flashed = flash0();
    pigeons.forEach(function (p) {
      if (p.state === 'peck') {
        p.timer -= dt;
        if (p.timer <= 0) { p.timer = rand(0.5, 2); if (Math.random() < 0.4) { p.x += p.dir * rand(2, 6); } if (Math.random() < 0.2) p.dir = -p.dir; }
        var scare = roost || flashed || near.some(function (w) { return Math.abs(w.x - p.x) < 24 || (w.dog !== null && Math.abs(w.dog - p.x) < 30); });
        if (scare) { startle(p); pigeons.forEach(function (q) { if (q !== p && Math.abs(q.x - p.x) < 30 && Math.random() < 0.8) startle(q); }); }
      } else if (p.state === 'fly') {
        p.f += dt / p.dur;
        if (p.f >= 1) { p.x = p.tx; p.y = p.ty; if (p.perch >= 0) { p.state = 'perch'; p.timer = rand(10, 26); } else { p.state = 'peck'; p.timer = rand(0.5, 2); } }
      } else if (p.state === 'perch') {
        p.timer -= dt;
        if (p.timer <= 0 && !roost) { var gr2 = GROUNDS[Math.floor(Math.random() * 3)]; flyTo(p, rand(gr2[0], gr2[1]), 534 + Math.floor(Math.random() * 4), -1); p.perch = -1; }
      }
    });
  }
  function flash0() { var f = flash.start; if (f !== lastFlash && state.t - f < 0.2) { lastFlash = f; return true; } return false; }
  function drawPigeon(g, p, t) {
    var grey = amb('#8a8a94'), wing = amb('#62626c'), head = amb('#74747e'), neck = amb('#5a8a7a'), d = p.dir, x, y;
    var R = function (dx, dy, w, h, col) { g.fillStyle = col; g.fillRect(d > 0 ? x + dx : x - dx - w + 1, y + dy, w, h); };
    if (p.state === 'fly') {
      var k = p.f, e = k * k * (3 - 2 * k); x = Math.round(p.fx + (p.tx - p.fx) * e); y = Math.round(p.fy + (p.ty - p.fy) * e - Math.sin(k * Math.PI) * 30);
      var up = Math.floor(t * 14 + p.seed) % 2;
      R(-2, -3, 5, 2, grey); R(2, -4, 2, 2, head); R(-1, up ? -6 : -1, 3, 3, wing);
      return;
    }
    x = Math.round(p.x); y = p.y;
    var hunch = p.state === 'perch' && (state.lights > 0.75 || rainLevel > 0.5), peck = p.state === 'peck' && ((t * 1.3 + p.seed) % 1) < 0.18 ? 2 : 0;
    R(-3, -3, 5, 2, grey); R(-3, -4, 4, 1, wing); R(-4, -3, 1, 1, wing);
    if (hunch) R(1, -4, 2, 2, head); else { R(2, -5 + peck, 2, 2, head); R(2, -3, 1, 1, neck); R(4, -4 + peck, 1, 1, amb('#c8b890')); }
    if (p.state === 'peck') { g.fillStyle = amb('#b0605a'); g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); }
  }
  function drawPigeons(g, t, onGround) { pigeons.forEach(function (p) { if ((p.state === 'peck') === onGround) drawPigeon(g, p, t); }); }

  // ---------- Shops that react when their sign is pointed at (or reached with Tab) ----------
  var hoverAt = 0;
  function drawReactions(g, t) {
    if (!hover) return;
    var k = (performance.now() - hoverAt) / 1000, ease = Math.min(1, k / 0.35);
    if (hover === 'about' && crowd && crowd.openDoor) crowd.openDoor();                       // the bar's door swings open
    g.save();
    if (hover === 'data') {                                                                  // the monitors sweep a big tick
      var pts = [[848, 488], [878, 514], [960, 456]], o = offset(0.42);
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(140,255,170,' + (0.75 * (k < 1.2 ? 1 : 0.55)) + ')'; g.lineWidth = 5; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(pts[0][0] + o, pts[0][1]);
      var len1 = 0.4, p2 = Math.min(1, ease / len1), p3 = Math.max(0, (ease - len1) / (1 - len1));
      g.lineTo(pts[0][0] + o + (pts[1][0] - pts[0][0]) * p2, pts[0][1] + (pts[1][1] - pts[0][1]) * p2);
      if (p3 > 0) g.lineTo(pts[1][0] + o + (pts[2][0] - pts[1][0]) * p3, pts[1][1] + (pts[2][1] - pts[1][1]) * p3);
      g.stroke();
    }
    if (hover === 'contact') {                                                               // a phone on the stand rings
      var px0 = 1062 + offset(0.46), ring = (t % 0.5) < 0.25;
      g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(200,236,255,0.7)'; g.fillRect(px0 + (ring ? 1 : 0), 476, 8, 12);
      g.fillStyle = 'rgba(255,255,255,0.8)'; if (ring) { g.fillRect(px0 - 4, 474, 1, 4); g.fillRect(px0 + 11, 474, 1, 4); g.fillRect(px0 - 6, 472, 1, 7); g.fillRect(px0 + 13, 472, 1, 7); }
    }
    if (hover === 'books' || hover === 'articles') {                                         // a book slides up off the shelf
      var bx = 288 + offset(0.47); g.fillStyle = amb('#b84a3a'); g.fillRect(bx, Math.round(486 - 12 * ease), 4, 13); g.fillStyle = amb('#e8c870'); g.fillRect(bx + 1, Math.round(489 - 12 * ease), 2, 1);
    }
    if (hover === 'feed') {                                                                  // a tin pops onto a shelf
      var hop = Math.abs(Math.sin(Math.min(k, 0.9) * Math.PI * 2.2)) * 6 * Math.max(0, 1 - k / 0.9), fx = 124 + offset(0.43);
      g.fillStyle = amb('#c83a2a'); g.fillRect(fx, Math.round(478 - hop), 5, 6); g.fillStyle = amb('#e8e0d0'); g.fillRect(fx, Math.round(480 - hop), 5, 1);
    }
    if (hover === 'kiosk') { g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,220,160,' + (0.3 * ease) + ')'; g.fillRect(446 + offset(0.47), 474, 64, 22); }
    if (hover === 'linkedin') { g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(180,255,230,' + (0.22 * ease) + ')'; g.fillRect(108 + offset(0.43), 338, 80, 56); }
    g.restore();
  }

  // ---------- The subway board counts down to the next article; the billboard's NEW turns into LATEST ----------
  var subwayLink = stage.querySelector('[data-area=subway]'), NEXT = null;
  function readNext() {
    var list = ((subwayLink && subwayLink.getAttribute('data-next')) || '').split(';').map(function (s) { var p = s.split('|'); return { d: new Date((p[0] || '').trim() + 'T00:00:00'), title: (p[1] || '').trim() }; }).filter(function (n) { return !isNaN(n.d); });
    var today = new Date(); today.setHours(0, 0, 0, 0);
    NEXT = null; for (var i = 0; i < list.length; i++) if (list[i].d >= today) { NEXT = list[i]; break; }
    if (NEXT) NEXT.days = Math.round((NEXT.d - today) / 86400000);
    var tag = subwayLink && subwayLink.querySelector('.d-tag');
    if (tag && NEXT) tag.textContent = 'Next: ' + NEXT.title + ', ' + NEXT.d.getDate() + ' ' + MONTHS[NEXT.d.getMonth()].charAt(0) + MONTHS[NEXT.d.getMonth()].slice(1).toLowerCase() + ' >>';
    var bill = stage.querySelector('.d-bill'), when = bill && new Date((bill.getAttribute('data-date') || '') + 'T00:00:00'), kick = bill && bill.querySelector('.d-bill-k');
    if (kick && !isNaN(when) && today - when > 14 * 86400000) kick.textContent = 'Latest article';
    boards = {};                                        // (the boards' pixel letters are drawn again from the new words)
  }
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  readNext(); window.setInterval(readNext, 60000);
  function pixText(g, str, cx, y, col) {
    var x = Math.round(cx - (str.length * 4 - 1) / 2); g.fillStyle = col;
    for (var i = 0; i < str.length; i++) { var r = glyphRows(F3, str[i]); if (r) for (var yy = 0; yy < 5; yy++) for (var xx = 0; xx < 3; xx++) if (r[yy][xx] === 'X') g.fillRect(x + i * 4 + xx, y + yy, 1, 1); }
  }
  function drawCountdown(g) {
    var cx = 1086 + offset(NEAR_Z), col = amb('#2a2018');
    if (!NEXT) { pixText(g, 'OPENING', cx, 566, col); pixText(g, 'SOON', cx, 572, col); return; }
    pixText(g, 'NEXT ' + NEXT.d.getDate() + ' ' + MONTHS[NEXT.d.getMonth()], cx, 566, col);
    pixText(g, NEXT.days === 0 ? 'OUT TODAY' : NEXT.days === 1 ? 'TOMORROW' : 'IN ' + NEXT.days + ' DAYS', cx, 572, col);
  }

  // ---------- Christmas (20 Nov to 6 Jan; ?xmas=1 or ?xmas=0 to preview) ----------
  var XMAS = (function () { var q = query.get('xmas'); if (q === '1') return true; if (q === '0') return false; var d = new Date(), m = d.getMonth(), day = d.getDate(); return (m === 10 && day >= 20) || m === 11 || (m === 0 && day <= 6); })();
  var XCOL = ['#ff4a4a', '#5aff7a', '#ffd24a', '#5aa0ff', '#fff2dc'];
  function twinkle(i, t) { return 0.55 + 0.45 * Math.sin(t * (1.3 + (i % 5) * 0.37) + i * 2.1); }
  function bulbs(g, list, t, glow) {                    // list of [x, y]; lit at night, coloured glass by day
    var a = state.lights;
    list.forEach(function (b, i) {
      var c = XCOL[i % XCOL.length], k = twinkle(i, t);
      g.fillStyle = a > 0.05 ? c : amb(c); g.globalAlpha = a > 0.05 ? 0.45 + 0.55 * k : 1; g.fillRect(b[0], b[1], 2, 2);
    });
    g.globalAlpha = 1;
    if (glow && a > 0.05) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
      for (var i = 0; i < list.length; i += 2) { var b = list[i]; g.globalAlpha = a * 0.8 * twinkle(i, t); g.drawImage(glowDot(XCOL[i % XCOL.length]), b[0] - 6, b[1] - 6, 14, 14); }
      g.restore();
    }
  }
  var WIRE_BULBS = [], AWN_BULBS = [], TREE_BULBS = [];
  (function () {
    var x0 = 196 - 22, x1 = 992 - 22;
    for (var x = x0 + 10; x < x1 - 6; x += 15) { var tt = (x - x0) / (x1 - x0); WIRE_BULBS.push([x, Math.round(71 + 40 * 4 * tt * (1 - tt)) + 2]); }
    for (var ax = 538; ax < 806; ax += 9) AWN_BULBS.push([ax, 428 + ((ax / 9) % 2 ? 1 : 0)]);
    [[412, 497, 9], [412, 507, 12], [412, 517, 15]].forEach(function (r) { for (var k = -r[2] + 2; k <= r[2] - 2; k += 5) TREE_BULBS.push([r[0] + k, r[1] + (k % 2 ? 2 : 0)]); });
  })();
  function drawXmasFront(g, t) { if (XMAS) bulbs(g, WIRE_BULBS.map(function (b) { return [b[0] + offset(NEAR_Z), b[1]]; }), t, true); }
  function drawXmasStreet(g, t) {
    if (!XMAS) return;
    bulbs(g, AWN_BULBS.map(function (b) { return [b[0] + offset(AWNING_Z), b[1]]; }), t, true);
    // a wreath on the bar's door
    var wx = 669 + offset(0.5), wy = 494;
    g.fillStyle = amb('#2e6a3a'); for (var a = 0; a < 24; a++) { var an = a / 24 * Math.PI * 2; g.fillRect(Math.round(wx + Math.cos(an) * 7) - 1, Math.round(wy + Math.sin(an) * 7) - 1, 3, 3); }
    g.fillStyle = amb('#1e4a28'); for (var b2 = 0; b2 < 12; b2++) { var an2 = b2 / 12 * Math.PI * 2 + 0.3; g.fillRect(Math.round(wx + Math.cos(an2) * 7), Math.round(wy + Math.sin(an2) * 7), 1, 1); }
    g.fillStyle = amb('#d02a2a'); [[wx - 5, wy - 4], [wx + 5, wy - 2], [wx - 2, wy + 6], [wx + 6, wy + 4]].forEach(function (p) { g.fillRect(Math.round(p[0]), Math.round(p[1]), 2, 2); });
    g.fillRect(wx - 3, wy + 6, 7, 2); g.fillRect(wx - 1, wy + 8, 1, 3); g.fillRect(wx + 1, wy + 8, 1, 3);
    // a small tree between the bookshop and the newsstand, with its own lights and a star
    var tx = 412 + offset(0.47);
    g.fillStyle = amb('#5a3a22'); g.fillRect(tx - 5, 524, 10, 6); g.fillStyle = amb('#3a2414'); g.fillRect(tx - 1, 519, 3, 5);
    [[486, 9, 12], [495, 12, 13], [505, 15, 14]].forEach(function (r, i) {
      g.fillStyle = amb(i % 2 ? '#2a5a32' : '#2e6a38'); pxPoly(g, [[tx, r[0]], [tx + r[1] + 0.5, r[0] + r[2] + 0.5], [tx - r[1] - 0.5, r[0] + r[2] + 0.5]]);
      g.fillStyle = amb('#1e4026'); pxPoly(g, [[tx - 1, r[0] + 3], [tx - r[1] + 1, r[0] + r[2] + 0.5], [tx - r[1] * 0.4, r[0] + r[2] + 0.5]]);
    });
    bulbs(g, TREE_BULBS.map(function (b) { return [b[0] + offset(0.47), b[1]]; }), t, true);
    g.fillStyle = state.lights > 0.05 ? '#ffe27a' : amb('#d8b040'); g.fillRect(tx - 1, 481, 3, 3); g.fillRect(tx, 480, 1, 5); g.fillRect(tx - 2, 482, 5, 1);
    if (state.lights > 0.05) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = state.lights * 0.8; g.imageSmoothingEnabled = true; g.drawImage(glowDot('#ffd24a'), tx - 8, 474, 18, 18); g.restore(); }
  }

  // ---------- Words in the street's own pixel fonts (design rule 3) ----------
  // The page keeps the real text (links, screen readers, search); this draws what the eye sees.
  function hash2(x, y) { var h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); }
  function up(s) { return (s || '').replace(/\s+/g, ' ').replace(/[’‘]/g, "'").trim().toUpperCase(); }
  function pxWidth(font, str, sc) { sc = sc || 1; var cw = fontSize(font)[0], w = 0; for (var i = 0; i < str.length; i++) w += str[i] === ' ' ? (cw - 1) * sc : (cw + 1) * sc; return Math.max(0, w - sc); }
  function pxText(g, font, str, x, y, col, sc, worn) {
    sc = sc || 1; var cw = fontSize(font)[0], cx = x;
    g.fillStyle = col;
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (c === ' ') { cx += (cw - 1) * sc; continue; }
      var r = glyphRows(font, c);
      if (r) for (var yy = 0; yy < r.length; yy++) for (var xx = 0; xx < r[yy].length; xx++) if (r[yy][xx] === 'X' && !(worn && hash2(cx + xx * sc, y + yy * sc) < worn)) g.fillRect(cx + xx * sc, y + yy * sc, sc, sc);
      cx += (cw + 1) * sc;
    }
    return cx;
  }
  function pxWrap(font, str, maxW, sc) { var lines = [], cur = ''; str.split(' ').forEach(function (w) { var t2 = cur ? cur + ' ' + w : w; if (cur && pxWidth(font, t2, sc) > maxW) { lines.push(cur); cur = w; } else cur = t2; }); if (cur) lines.push(cur); return lines; }

  // ---------- The boards: billboard, specials board and ticker, drawn once and redrawn only when they change ----------
  var billEl = stage.querySelector('.d-bill'), menuEl = stage.querySelector('.d-menu'), tickEl = stage.querySelector('.d-ticker');
  var boards = {}, menuHi = -1, tickOff = 0, tickHeld = false;
  function boardBill(hot) {
    var key = 'bill' + (hot ? 1 : 0); if (boards[key] || !billEl) return boards[key];
    var g = offscreen(160, 108), kick = up(billEl.querySelector('.d-bill-k').textContent), title = up(billEl.querySelector('.d-bill-t').textContent), meta = up(billEl.querySelector('.d-bill-m').textContent);
    var lines = pxWrap(F5, title, 142, 2), y = Math.round((108 - (7 + 7 + lines.length * 17 + 4 + 7)) / 2);
    pxText(g, F5, kick, 9, y, '#ff7a82'); y += 14;
    lines.forEach(function (ln) { pxText(g, F5, ln, 9, y, hot ? '#ffcf70' : '#f2ece6', 2); y += 17; });
    pxText(g, F5, meta, 9, y + 4, '#ffcf70');
    return (boards[key] = g.canvas);
  }
  function boardMenu(hi) {
    var key = 'menu' + hi; if (boards[key] || !menuEl) return boards[key];
    var g = offscreen(208, 66), y = 5, head = up(menuEl.querySelector('.d-menu-h').textContent);
    pxText(g, F5, head, Math.round((208 - pxWidth(F5, head)) / 2), y, '#a8281a', 1, 0.07); y += 12;
    Array.prototype.forEach.call(menuEl.querySelectorAll('li a'), function (a, i) {
      var col = i === hi ? '#a8281a' : '#3a1e12';
      pxText(g, F5, (i + 1) + '.', 7, y, '#a8281a', 1, 0.07);
      pxWrap(F5, up(a.textContent), 180).forEach(function (ln) { var end = pxText(g, F5, ln, 21, y, col, 1, 0.07); if (i === hi) { g.fillStyle = col; g.fillRect(21, y + 8, end - 22, 1); } y += 9; });
      y += 2;
    });
    return (boards[key] = g.canvas);
  }
  function boardTicker() {
    if (boards.tick || !tickEl) return boards.tick;
    var span = tickEl.querySelector('.d-ticker-run span'), text = up(span ? span.textContent : '') + '   ', w = pxWidth(F5, text, 2) + 12;
    var g = offscreen(w, 14); pxText(g, F5, text, 0, 0, '#ffb040', 2);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(0,0,0,0.42)'; for (var x = 1; x < w; x += 2) g.fillRect(x, 0, 1, 14); for (var y = 1; y < 14; y += 2) g.fillRect(0, y, w, 1);   // LED dots
    return (boards.tick = g.canvas);
  }
  if (menuEl) Array.prototype.forEach.call(menuEl.querySelectorAll('li a'), function (a, i) {
    var on = function () { menuHi = i; }, off = function () { if (menuHi === i) menuHi = -1; };
    a.addEventListener('mouseenter', on); a.addEventListener('focus', on); a.addEventListener('mouseleave', off); a.addEventListener('blur', off);
  });
  if (tickEl) ['mouseenter', 'focusin'].forEach(function (ev) { tickEl.addEventListener(ev, function () { tickHeld = true; }); });
  if (tickEl) ['mouseleave', 'focusout'].forEach(function (ev) { tickEl.addEventListener(ev, function () { tickHeld = false; }); });
  function drawBoards(g) {
    var ob = offset(0.46);
    if (billEl) g.drawImage(boardBill(hover === 'billboard'), 1000 + ob, 118);
    if (menuEl) g.drawImage(boardMenu(menuHi), 566 + offset(0.5), 336);
    var tk = boardTicker();
    if (tk) { g.save(); g.beginPath(); g.rect(998 + ob, 256, 164, 20); g.clip(); var o = Math.floor(tickOff % tk.width); g.drawImage(tk, 998 + ob - o, 259); g.drawImage(tk, 998 + ob - o + tk.width, 259); g.restore(); }
  }

  // ---------- The game interface (design rule 7): a prompt by the sign, a dialogue box, a clock corner, a title ----------
  var uiCanvas = document.createElement('canvas'); uiCanvas.className = 'd-ui'; uiCanvas.width = W; uiCanvas.height = H; uiCanvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(uiCanvas);
  var utx = uiCanvas.getContext('2d'); utx.imageSmoothingEnabled = false;
  // (the full layer is shown only while it has something on it; the clock has its own small canvas, so the browser
  // never has to blend an empty full-screen layer: design rule 9)
  var clockCanvas = document.createElement('canvas'); clockCanvas.className = 'd-clock'; clockCanvas.width = 86; clockCanvas.height = 27; clockCanvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(clockCanvas); var ktx = clockCanvas.getContext('2d'); ktx.imageSmoothingEnabled = false;
  uiCanvas.style.display = 'none';
  var UI = { area: null, since: 0, said: '', title: false, dirty: true, clock: '' };
  function panel(g, x, y, w, h) {                       // the kit's frame: notched corners, a one-pixel border, a shadow
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + 3, y + 3, w, h);
    g.fillStyle = '#18111c'; g.fillRect(x + 1, y, w - 2, h); g.fillRect(x, y + 1, w, h - 2);
    g.fillStyle = '#ffcf70'; g.fillRect(x + 2, y, w - 4, 1); g.fillRect(x + 2, y + h - 1, w - 4, 1); g.fillRect(x, y + 2, 1, h - 4); g.fillRect(x + w - 1, y + 2, 1, h - 4);
    g.fillRect(x + 1, y + 1, 1, 1); g.fillRect(x + w - 2, y + 1, 1, 1); g.fillRect(x + 1, y + h - 2, 1, 1); g.fillRect(x + w - 2, y + h - 2, 1, 1);
  }
  function areaBox(el) { var s = el.style; return { x: +s.getPropertyValue('--x'), y: +s.getPropertyValue('--y'), w: +s.getPropertyValue('--w'), h: +s.getPropertyValue('--h') }; }
  function sayFor(el) {
    var k = el.getAttribute('data-area');
    if (k === 'subway' && NEXT) return 'Coming up next: ' + NEXT.title + ', ' + NEXT.d.getDate() + ' ' + MONTHS[NEXT.d.getMonth()].charAt(0) + MONTHS[NEXT.d.getMonth()].slice(1).toLowerCase() + '.';
    if (k === 'billboard' && billEl) return billEl.querySelector('.d-bill-t').textContent + '. ' + billEl.querySelector('.d-bill-s').textContent + '.';
    return el.getAttribute('data-say') || '';
  }
  function setArea(el) { if (UI.area === el) return; UI.area = el; UI.since = performance.now(); UI.dirty = true; root.classList.toggle('is-talking', !!el); }
  Array.prototype.forEach.call(stage.querySelectorAll('.d-area[data-name]'), function (el) {
    var on = function () { setArea(el); }, off = function () { if (UI.area === el) setArea(null); };
    el.addEventListener('mouseenter', on); el.addEventListener('focus', on); el.addEventListener('mouseleave', off); el.addEventListener('blur', off);
  });
  if (menuEl) Array.prototype.forEach.call(menuEl.querySelectorAll('li a'), function (a) {   // the specials: each dish is an article
    a.setAttribute('data-name', "TODAY'S SPECIALS"); a.setAttribute('data-say', a.textContent.trim() + '.');
    var on = function () { UI.area = a; UI.since = performance.now(); UI.box = areaBox(menuEl); UI.dirty = true; }, off = function () { if (UI.area === a) setArea(null); };
    a.addEventListener('mouseenter', on); a.addEventListener('focus', on); a.addEventListener('mouseleave', off); a.addEventListener('blur', off);
  });
  var WEATHER_ICON = { sun: ['..X..', 'X.X.X', '.XXX.', 'XXXXX', '.XXX.', 'X.X.X', '..X..'], moon: ['.XXX.', 'XX...', 'X....', 'X....', 'X....', 'XX...', '.XXX.'],
    rain: ['.XXX.', 'XXXXX', 'XXXXX', '.....', 'X.X.X', '.X.X.', 'X.X.X'], snow: ['.XXX.', 'XXXXX', 'XXXXX', '.....', 'X...X', '..X..', 'X...X'] };
  function drawUI(t) {
    if (shot) return;                                   // (no interface in a picture of the street)
    var reduce = reduceMotion, el = UI.area, typing = false;
    var clock = (function () { var s = clockSeconds(), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; })();
    var wkNow = state.weather + (state.lights > 0.5 ? 'n' : 'd');
    if (!UI.dirty && !el && clock + wkNow === UI.clockKey) return;
    UI.clockKey = clock + wkNow;
    var wk = state.weather === 'rain' ? 'rain' : state.weather === 'snow' ? 'snow' : state.lights > 0.5 ? 'moon' : 'sun';
    if (clock + wk !== UI.clock) {                     // the clock and the weather, top right, on their own small canvas
      UI.clock = clock + wk; ktx.clearRect(0, 0, 86, 27);
      panel(ktx, 0, 0, 78, 21); pxText(ktx, F5, clock, 8, 7, '#f2ece6', 1);
      var ic = WEATHER_ICON[wk]; ktx.fillStyle = wk === 'sun' ? '#ffcf70' : wk === 'moon' ? '#f2ece6' : '#9ac0ff';
      for (var iy = 0; iy < 7; iy++) for (var ix = 0; ix < 5; ix++) if (ic[iy][ix] === 'X') ktx.fillRect(56 + ix * 2, 4 + iy * 2, 2, 2);
    }
    UI.dirty = false;
    var show = !!(el && !root.classList.contains('is-leaving'));
    if (uiCanvas.style.display !== (show ? '' : 'none')) uiCanvas.style.display = show ? '' : 'none';
    if (!show) return;
    utx.clearRect(0, 0, W, H);
    if (el && !root.classList.contains('is-leaving')) {
      // the prompt, by the sign
      var b = UI.box && UI.area === el && !el.classList.contains('d-area') ? UI.box : areaBox(el), name = up(el.getAttribute('data-name') || '');
      var label = '▶ ENTER  ' + name, pw = pxWidth(F5, label) + 14, px0 = Math.max(6, Math.min(W - pw - 6, Math.round(b.x + b.w / 2 - pw / 2))), py0 = b.y > 40 ? b.y - 24 : b.y + b.h + 6;
      panel(utx, px0, py0, pw, 17); pxText(utx, F5, label, px0 + 7, py0 + 5, (Math.floor(t * 2.5) % 2 || reduce) ? '#ffcf70' : '#f2ece6');
      // the dialogue box, at the bottom
      var say = up(sayFor(el)), n = reduce ? say.length : Math.min(say.length, Math.floor((performance.now() - UI.since) / 1000 * 48));
      typing = n < say.length;
      var lines = pxWrap(F5, say, 712, 2), bh = 26 + lines.length * 17, by = H - bh - 22, bx = 272;
      panel(utx, bx, by, 736, bh); panel(utx, bx + 12, by - 10, pxWidth(F5, name) + 14, 17); pxText(utx, F5, name, bx + 19, by - 5, '#ffcf70');
      var left = n, yy = by + 14;
      lines.forEach(function (ln) { var part = ln.slice(0, Math.max(0, left)); left -= ln.length + 1; pxText(utx, F5, part, bx + 12, yy, '#f2ece6', 2); yy += 17; });
      if (!typing && Math.floor(t * 2) % 2 === 0) pxText(utx, F5, '▶', bx + 718, by + bh - 14, '#ffcf70');
    }
    if (typing || el) UI.dirty = true;     // keep drawing while something moves
  }
  // ---------- Traffic: cars, taxis, vans and now and then a bus, both ways on the road ----------
  // Each kind is drawn once (facing right) as a body picture and a lights picture (lamps, a taxi's roof sign, a
  // bus's lit windows); a car is two drawImage calls a frame, plus its beams at night.
  var CAR_LANES = [{ y: 661, dir: -1, f: 1.55, next: 1.5 }, { y: 714, dir: 1, f: 1.75, next: 3 }];   // f: how big a car is drawn in that lane
  var CAR_COLORS = ['#7a2a2a', '#2a4466', '#d8d4c8', '#3a3a3e', '#6a6e72', '#1c1c20', '#4e5e44', '#8a7a5a', '#a8a49c'];
  var cars = [], carSprites = {};
  function pxPoly(g, pts) {                             // a polygon in whole pixels (no soft edges)
    var minY = 1e9, maxY = -1e9, i, n = pts.length;
    for (i = 0; i < n; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y < Math.ceil(maxY); y++) {
      var yc = y + 0.5, xs = [];
      for (i = 0; i < n; i++) { var a = pts[i], b = pts[(i + 1) % n]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort(function (p, q) { return p - q; });
      for (var j = 0; j + 1 < xs.length; j += 2) { var x0 = Math.round(xs[j]), x1 = Math.round(xs[j + 1]); if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1); }
    }
  }
  function pxDisc(g, cx, cy, r) { for (var y = -r; y <= r; y++) { var w = Math.round(Math.sqrt(r * r - y * y + r * 0.6)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
  function hexShade(c, f) { var v = rgbH(c); return css([v[0] * f, v[1] * f, v[2] * f]); }
  // A car drawn at scale f (all its numbers are in design units; every shape lands on whole pixels, so it stays crisp)
  function carSprite(kind, color, f, drv) {
    var key = kind + color + f + '|' + (drv || 0); if (carSprites[key]) return carSprites[key];
    if (kind === 'suv') return (carSprites[key] = suvSprite());
    var bus = kind === 'bus', van = kind === 'van', pick = kind === 'pickup', L = bus ? 212 : van ? 108 : kind === 'hatch' ? 88 : pick ? 106 : 102, Hh = bus ? 56 : van ? 40 : 36, top = Hh - 32;
    var b = offscreen(Math.ceil(L * f), Math.ceil(Hh * f)), l = offscreen(Math.ceil(L * f), Math.ceil(Hh * f)), c = color, wheels = [], glass = '#1e2630', glassHi = '#56646e';
    var R = function (g, x, y, w, h) { g.fillRect(Math.round(x * f), Math.round(y * f), Math.max(1, Math.round((x + w) * f) - Math.round(x * f)), Math.max(1, Math.round((y + h) * f) - Math.round(y * f))); };
    var P = function (g, pts) { pxPoly(g, pts.map(function (q) { return [q[0] * f, q[1] * f]; })); };
    var D = function (g, cx, cy, r) { pxDisc(g, Math.round(cx * f), Math.round(cy * f), Math.max(1, Math.round(r * f))); };
    var W2 = function (x, r) { wheels.push([x, Hh - 6, r]); };
    var plate = function (x) { b.fillStyle = '#d8d4c4'; R(b, x, Hh - 13, 8, 3); b.fillStyle = '#5a5a5a'; R(b, x + 1, Hh - 12, 6, 1); };          // a plain plate
    // At the wheel: one of the street's own people (street-body.js), sitting, hands forward on the wheel, seen
    // through the glass (clip: the window, in design units). Without it, a dark head and shoulders.
    var seated = function (g, x, y, clip, seed, arms, tint) {   // someone sitting, their head at (x, y), seen through clip
      var SB = window.StreetBody, adults = SB.cast().filter(function (d) { return d.age !== 'kid'; }), who = adults[seed % adults.length];
      var mk = SB.make(who, 'summer', 19.5 * f, { sit: true, n: 1, arms: function () { return arms; } }), cv = offscreen(mk.fw, mk.fh), info = mk.paint(cv, 0, 0, 0);
      g.save(); g.beginPath(); clip.forEach(function (q, i) { if (i) g.lineTo(q[0] * f, q[1] * f); else g.moveTo(q[0] * f, q[1] * f); }); g.closePath(); g.clip();
      g.drawImage(cv.canvas, Math.round(x * f - info.head[0]), Math.round(y * f - info.head[1]));
      g.fillStyle = tint; g.fill(); g.restore();                                         // (the glass between us and them)
    };
    var driver = function (x, y, clip) {
      if (window.StreetBody && clip) { seated(b, x, y, clip, (drv || 0) * 5 + (parseInt((color || '#3').slice(1), 16) || 0) % 7, { n: [70, 20], f: [64, 26] }, 'rgba(24,32,42,0.32)'); return; }
      b.fillStyle = '#0c0e12'; D(b, x, y, 2.6); R(b, x - 4, y + 2, 8, 4); b.fillStyle = '#2a323c'; R(b, x - 1, y - 2, 2, 1);
    };
    if (bus) {
      b.fillStyle = c; R(b, 1, 3, L - 2, Hh - 12); b.fillStyle = hexShade(c, 1.15); R(b, 1, 3, L - 2, 2);
      b.fillStyle = '#2a6a7a'; R(b, 1, Hh - 22, L - 2, 4); b.fillStyle = hexShade(c, 0.6); R(b, 1, Hh - 12, L - 2, 3);
      for (var wi = 0; wi < 11; wi++) { var wx = 10 + wi * 17; b.fillStyle = glass; R(b, wx, 9, 14, 17); b.fillStyle = glassHi; R(b, wx + 1, 10, 4, 1);
        l.fillStyle = '#ffe2a8'; R(l, wx, 9, 14, 17);
        if ((wi * 7) % 3) {                                // a passenger (lit when the bus's lights are on)
          if (window.StreetBody) seated(l, wx + 7, 18, [[wx, 9], [wx + 14, 9], [wx + 14, 26], [wx, 26]], wi * 3 + (drv || 0), (wi % 3) ? { n: [25, 85] } : { n: [30, 100] }, 'rgba(255,214,150,0.18)');
          else { l.fillStyle = '#5a4030'; D(l, wx + 7, 19, 3); R(l, wx + 3, 22, 9, 4); }
        } }
      b.fillStyle = glass; R(b, L - 14, 7, 12, 26); b.fillStyle = glassHi; R(b, L - 12, 9, 1, 10);
      b.fillStyle = '#3a3a3a'; R(b, L - 34, 9, 12, Hh - 21); b.fillStyle = hexShade(c, 0.7); R(b, L - 29, 9, 1, Hh - 21);   // the door
      l.fillStyle = '#ffb030'; R(l, L - 48, 4, 30, 4);                                    // the route sign
      driver(L - 8, 20, [[L - 14, 7], [L - 2, 7], [L - 2, 33], [L - 14, 33]]); plate(4);
      W2(36, 8); W2(L - 46, 8);
      l.fillStyle = '#fff6d8'; R(l, L - 4, Hh - 20, 3, 4); l.fillStyle = '#ff3a2a'; R(l, 1, Hh - 22, 3, 6);
    } else if (van) {
      b.fillStyle = c; P(b, [[1, 4], [78, 4], [96, 15], [L - 1, 19], [L - 1, Hh - 8], [1, Hh - 8]]);
      b.fillStyle = hexShade(c, 1.15); R(b, 2, 4, 76, 1); b.fillStyle = hexShade(c, 0.62); R(b, 1, Hh - 11, L - 2, 3);
      b.fillStyle = glass; P(b, [[80, 7], [93, 15], [80, 15]]); R(b, 60, 8, 16, 8); b.fillStyle = glassHi; R(b, 81, 9, 1, 4);
      b.fillStyle = hexShade(c, 0.75); R(b, 58, 6, 1, Hh - 15); R(b, 30, 6, 1, Hh - 15); R(b, 30, 6, 28, 1);
      b.fillStyle = hexShade(c, 1.3); R(b, 52, 18, 4, 1); R(b, 86, 19, 3, 1);
      b.fillStyle = glass; R(b, 3, 8, 10, 7); b.fillStyle = '#141414'; R(b, 59, 16, 18, 1);
      driver(85, 11, [[80, 7], [93, 15], [80, 15]]); plate(3); plate(L - 10); b.fillStyle = '#e08a2a'; R(b, L - 9, 23, 2, 1);
      W2(20, 6); W2(L - 22, 6);
      l.fillStyle = '#fff6d8'; R(l, L - 4, 19, 3, 4); l.fillStyle = '#ff3a2a'; R(l, 1, 12, 3, 6);
    } else if (pick) {
      b.fillStyle = c; P(b, [[1, top + 12], [54, top + 12], [L - 8, top + 14], [L - 1, top + 18], [L - 1, Hh - 8], [1, Hh - 8]]); P(b, [[56, top + 13], [62, top + 2], [84, top + 2], [92, top + 14]]);
      b.fillStyle = hexShade(c, 0.6); R(b, 4, top + 12, 48, 2); b.fillStyle = hexShade(c, 1.2); R(b, 1, top + 11, 53, 1); R(b, 62, top + 1, 22, 1);
      b.fillStyle = '#3a3630'; R(b, 6, top + 7, 10, 5); R(b, 20, top + 9, 14, 3);                  // something in the bed: a crate and a sack
      b.fillStyle = glass; P(b, [[64, top + 12], [65, top + 4], [76, top + 4], [76, top + 12]]); P(b, [[78, top + 12], [78, top + 4], [83, top + 4], [89, top + 12]]);
      b.fillStyle = '#202020'; R(b, 76, top + 4, 2, 9); b.fillStyle = glassHi; R(b, 66, top + 5, 5, 1);
      driver(82, top + 7, [[78, top + 12], [78, top + 4], [83, top + 4], [89, top + 12]]);
      b.fillStyle = hexShade(c, 0.62); R(b, 1, Hh - 11, L - 2, 3); b.fillStyle = hexShade(c, 0.7); R(b, 55, top + 14, 1, Hh - top - 23); b.fillStyle = hexShade(c, 1.35); R(b, 60, top + 17, 3, 1);
      b.fillStyle = '#3a3a3c'; R(b, L - 4, Hh - 14, 4, 4); R(b, 0, Hh - 14, 3, 4); plate(2); plate(L - 11);
      W2(20, 6); W2(L - 22, 6);
      l.fillStyle = '#fff6d8'; R(l, L - 5, top + 16, 4, 3); l.fillStyle = '#ff3a2a'; R(l, 1, top + 13, 3, 4);
      b.fillStyle = '#e8e4d0'; R(b, L - 5, top + 16, 4, 3); b.fillStyle = '#7a1a1a'; R(b, 1, top + 13, 3, 4);
    } else {
      var hatch = kind === 'hatch', cab = hatch ? [[16, top + 13], [28, top + 2], [62, top + 2], [74, top + 11]] : [[22, top + 13], [36, top + 2], [66, top + 2], [80, top + 13]];
      b.fillStyle = c; P(b, [[2, top + 14], [L - 6, top + 14], [L - 1, top + 18], [L - 1, Hh - 8], [1, Hh - 8], [1, top + 16]]); P(b, cab);
      b.fillStyle = hexShade(c, 1.2); R(b, 4, top + 13, L - 10, 1);
      b.fillStyle = hexShade(c, 0.62); R(b, 1, Hh - 11, L - 2, 3);
      b.fillStyle = glass; P(b, hatch ? [[20, top + 12], [29, top + 4], [44, top + 4], [44, top + 12]] : [[26, top + 12], [37, top + 4], [50, top + 4], [50, top + 12]]);
      P(b, hatch ? [[47, top + 12], [47, top + 4], [61, top + 4], [70, top + 11]] : [[53, top + 12], [53, top + 4], [65, top + 4], [76, top + 12]]);
      b.fillStyle = glassHi; R(b, hatch ? 31 : 39, top + 5, 6, 1); R(b, hatch ? 49 : 55, top + 5, 5, 1);
      b.fillStyle = '#141414'; R(b, hatch ? 20 : 26, top + 12, hatch ? 50 : 50, 1); R(b, hatch ? 45 : 51, top + 4, 2, 9);   // rubber trim and the pillar
      driver(hatch ? 56 : 62, top + 7, hatch ? [[47, top + 12], [47, top + 4], [61, top + 4], [70, top + 11]] : [[53, top + 12], [53, top + 4], [65, top + 4], [76, top + 12]]); plate(3); plate(L - 11); b.fillStyle = '#e08a2a'; R(b, L - 9, top + 15, 2, 1);
      b.fillStyle = hexShade(c, 0.7); R(b, hatch ? 46 : 51, top + 14, 1, Hh - top - 23);
      b.fillStyle = hexShade(c, 1.35); R(b, hatch ? 38 : 43, top + 17, 3, 1); R(b, hatch ? 54 : 60, top + 17, 3, 1);
      b.fillStyle = '#3a3a3c'; R(b, L - 4, Hh - 14, 4, 4); R(b, 0, Hh - 14, 3, 4);           // bumpers
      b.fillStyle = hexShade(c, 0.85); R(b, hatch ? 70 : 78, top + 13, 3, 2);                 // a wing mirror
      if (kind === 'taxi') { b.fillStyle = '#c83a2a'; R(b, 44, top - 2, 14, 4); l.fillStyle = '#ffa070'; R(l, 45, top - 1, 12, 2); }
      W2(hatch ? 18 : 22, 6); W2(hatch ? L - 20 : L - 24, 6);
      l.fillStyle = '#fff6d8'; R(l, L - 5, top + 16, 4, 3); l.fillStyle = '#ff3a2a'; R(l, 1, top + 16, 3, 4);
      b.fillStyle = '#e8e4d0'; R(b, L - 5, top + 16, 4, 3); b.fillStyle = '#7a1a1a'; R(b, 1, top + 16, 3, 4);
    }
    wheels.forEach(function (w) { b.fillStyle = hexShade(c, 0.35); D(b, w[0], w[1] - 1, w[2] + 2); });
    wheels.forEach(function (w) { b.fillStyle = '#100e0e'; D(b, w[0], w[1] - 1, w[2] + 1); b.fillStyle = '#141414'; D(b, w[0], w[1], w[2]); b.fillStyle = '#7e7e7a'; D(b, w[0], w[1], w[2] * 0.5); b.fillStyle = '#5a5a58'; R(b, w[0] - w[2] * 0.4, w[1], w[2] * 0.8, 1); R(b, w[0], w[1] - w[2] * 0.4, 1, w[2] * 0.8); b.fillStyle = '#2a2a2a'; R(b, w[0], w[1], 1, 1); });
    var head = bus ? [L - 3, Hh - 18] : van ? [L - 3, 21] : [L - 3, top + 17], tail = bus ? [2, Hh - 19] : van ? [2, 15] : [2, top + 18];
    var sc = function (q) { return [q[0] * f, q[1] * f]; };
    return (carSprites[key] = { b: b.canvas, l: l.canvas, L: Math.ceil(L * f), H: Math.ceil(Hh * f), wheels: wheels.map(function (w) { return [w[0] * f, w[1] * f, w[2] * f]; }), head: sc(head), tail: sc(tail) });
  }
  // The SUV is a shaded prop (street-props.js), drawn at its own size, which is the near lane's scale
  function suvSprite() {
    var pr = null; window.StreetProps.list.forEach(function (q) { if (q.id === 'suv') pr = q; });
    var L = pr.w, Hh = pr.h + 2, gy = Hh - 2, b = offscreen(L, Hh), l = offscreen(L, Hh);
    pr.paint(propPainter(b, 'day', false), 0, gy); propEdges(b, L, Hh);
    pr.paint(propPainter(l, 'lightsNight', false), 0, gy);
    return { b: b.canvas, l: l.canvas, L: L, H: Hh, wheels: [[36, gy - 14, 14], [142, gy - 14, 14]], head: [173, gy - 35], tail: [5, gy - 52] };
  }
  function pickCar(li) {
    var r = Math.random();
    if (li === 1 && window.StreetProps && (r > 0.86 || /[?&]suv\b/.test(location.search))) return { kind: 'suv', color: '' };   // the near lane only: it is drawn at that lane's size (?suv: always, to preview it)
    if (r < 0.08 || (/[?&]bus\b/.test(location.search) && r < 0.6)) return { kind: 'bus', color: '#c8c0a8' };   // (?bus: more buses, to preview them)
    if (r < 0.3) return { kind: 'taxi', color: '#e4d8b0' };
    return { kind: r < 0.4 ? 'van' : r < 0.52 ? 'pickup' : r < 0.7 ? 'hatch' : 'sedan', color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] };
  }
  function addCar(li, x) { var pk = pickCar(li); cars.push({ lane: li, kind: pk.kind, color: pk.color, x: x, v: pk.kind === 'bus' ? rand(55, 70) : rand(75, 120), dist: 0, drv: Math.floor(Math.random() * 8) }); }   // (drv: which of eight drivers is at the wheel)
  function updateCars(dt) {
    CAR_LANES.forEach(function (ln, li) {
      ln.next -= dt; if (ln.next > 0) return;
      ln.next = rand(2.5, 8);
      var entry = ln.dir > 0 ? -260 : W + 260;
      if (!cars.some(function (c) { return c.lane === li && Math.abs(c.x - entry) < 420; })) addCar(li, entry);
    });
    cars.forEach(function (c) {
      var ln = CAR_LANES[c.lane], v = c.v, sp = carSprite(c.kind, c.color, ln.f, c.drv);
      cars.forEach(function (o) {                       // keep a gap behind the car in front
        if (o === c || o.lane !== c.lane || (o.x - c.x) * ln.dir <= 0) return;
        var gap = Math.abs(o.x - c.x) - (sp.L + carSprite(o.kind, o.color, ln.f, o.drv).L) / 2;
        if (gap < 46) v = Math.min(v, o.v);
      });
      c.x += ln.dir * v * dt; c.dist += v * dt;
    });
    cars = cars.filter(function (c) { return c.x > -420 && c.x < W + 420; });
  }
  CAR_LANES.forEach(function (ln, li) { addCar(li, 260 + li * 520 + rand(-80, 80)); });   // the road is never empty at first
  function eachCar(fn) { [0, 1].forEach(function (li) { cars.forEach(function (c) { if (c.lane === li) fn(c, CAR_LANES[li], carSprite(c.kind, c.color, CAR_LANES[li].f, c.drv)); }); }); }
  function drawCars(g) {
    g.imageSmoothingEnabled = false;
    eachCar(function (c, ln, sp) {
      g.save(); g.translate(Math.round(c.x), ln.y); g.scale(ln.dir, 1);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-sp.L / 2 + 4, -2, sp.L - 8, 3);                  // the shadow under it
      g.drawImage(sp.b, -Math.round(sp.L / 2), -sp.H + 1);
      g.fillStyle = '#9a9a96';                                                                      // wheels turning
      sp.wheels.forEach(function (w) { var an = c.dist / w[2], wx = Math.round(w[0] - sp.L / 2 + Math.cos(an) * (w[2] - 3)), wy = Math.round(w[1] - sp.H + 1 + Math.sin(an) * (w[2] - 3)); g.fillRect(wx, wy, 2, 2); });
      g.restore();
    });
  }
  function drawCarLights(g) {
    var a = state.lights; if (a < 0.05) return;
    g.save(); g.imageSmoothingEnabled = false;
    eachCar(function (c, ln, sp) {
      var sx = ln.dir, ox = Math.round(c.x), hx = ox + (sp.head[0] - sp.L / 2) * sx, hy = ln.y + sp.head[1] - sp.H + 1, tx = ox + (sp.tail[0] - sp.L / 2) * sx, ty = ln.y + sp.tail[1] - sp.H + 1;
      g.save(); g.globalAlpha = Math.min(1, a); g.translate(ox, ln.y); g.scale(sx, 1); g.drawImage(sp.l, -Math.round(sp.L / 2), -sp.H + 1); g.restore();
      g.save(); g.globalCompositeOperation = 'lighter';
      var beam = g.createLinearGradient(hx, 0, hx + ln.dir * 170, 0);                 // the headlights' beam on the road
      beam.addColorStop(0, 'rgba(255,240,200,' + (0.2 * a) + ')'); beam.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = beam;
      g.beginPath(); g.moveTo(hx, hy - 3); g.lineTo(hx + ln.dir * 170, ln.y - 20); g.lineTo(hx + ln.dir * 170, ln.y + 6); g.lineTo(hx, hy + 4); g.closePath(); g.fill();
      g.globalAlpha = Math.min(1, a); g.imageSmoothingEnabled = true;
      g.drawImage(glowDot('#fff3c4'), Math.round(hx - 16), Math.round(hy - 16), 32, 32); g.drawImage(glowDot('#ff3a2a'), Math.round(tx - 11), Math.round(ty - 11), 22, 22);
      if (wet > 0.2) {                                                                // their reflections on the wet road
        var rf = g.createLinearGradient(0, ln.y, 0, ln.y + 26); rf.addColorStop(0, 'rgba(255,236,190,' + (0.22 * wet * a) + ')'); rf.addColorStop(1, 'rgba(255,236,190,0)');
        g.fillStyle = rf; g.fillRect(Math.round(hx) - 3, ln.y, 6, 26);
        rf = g.createLinearGradient(0, ln.y, 0, ln.y + 20); rf.addColorStop(0, 'rgba(255,60,40,' + (0.2 * wet * a) + ')'); rf.addColorStop(1, 'rgba(255,60,40,0)');
        g.fillStyle = rf; g.fillRect(Math.round(tx) - 2, ln.y, 4, 20);
      }
      g.restore();
    });
    g.restore();
  }

  // People are drawn every frame (smooth walking); the street every second frame; the halos every fourth
  var last = 0, tick = 0, worldDt = 0;
  function frameAt(now) {
    var dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now; tick++;
    var t = (Date.now() - startedAt) / 1000, scene = tick % 2 === 1;
    state.t = t; setTime(); worldDt += dt;
    if (scene) { updateCamera(); lookAhead(); }
    if (crowd) crowd.update(dt, t, env());
    updateCars(dt);
    if (scene) {
      var p0 = PERF ? performance.now() : 0;
      updateWorld(worldDt, t); worldDt = 0; renderScene(t);
      if (PERF) { PERF.scene += performance.now() - p0; PERF.n.scene++; }
    }
    else if (tick % 4 === 0 && tick > 6) {               // otherwise every 4th frame, on a frame without the street
      var p3 = PERF ? performance.now() : 0; renderGlow(t); if (PERF) { PERF.glow += performance.now() - p3; PERF.n.glow++; }
    }
    var p1 = PERF ? performance.now() : 0;
    renderPeople(); drawUI(t);
    if ((tick % 36 === 0 || tick === 3) && typeof mob !== 'undefined') mob.draw();
    if (PERF) { PERF.people += performance.now() - p1; PERF.n.people++; showPerf(); }
  }
  function showPerf() {
    if (!PERF.first) PERF.first = performance.now() - PERF.t0;
    if (PERF.n.people % 30 !== 1) return;
    if (!PERF.el) { PERF.el = document.createElement('pre'); PERF.el.style.cssText = 'position:fixed;z-index:99;right:8px;bottom:8px;margin:0;padding:6px 8px;background:#000c;color:#9f9;font:12px monospace'; document.body.appendChild(PERF.el); }
    var avg = function (k) { return PERF.n[k] ? (PERF[k] / PERF.n[k]).toFixed(2) : '-'; }, made = 0, px2 = 0;
    [FAR, PA, PB, PC, PD, PE, PF, PG, PART_SIGN, PART_NET, PART_MARQ, PART_AWN, PROPS, GROUNDP, SUBWAY, NEAR].forEach(function (p) { Object.keys(p.c).forEach(function (k) { if (p.c[k]) { made++; px2 += p.c[k].width * p.c[k].height; } }); });
    PERF.el.textContent = 'paint ' + PERF.paint.toFixed(0) + ' ms, first frame ' + PERF.first.toFixed(0) + ' ms\nscene ' + avg('scene') + ' ms, people ' + avg('people') + ' ms, glow ' + avg('glow') + ' ms\nbaked canvases ' + made + ' (' + (px2 * 4 / 1048576).toFixed(1) + ' MB)';
  }
  var acc = 0, prevNow = 0, broken = false;
  function loop(now) {
    if (broken) return;
    window.requestAnimationFrame(loop);
    acc += Math.min(100, now - (prevNow || now)); prevNow = now;
    if (acc < 12) return;                               // at most about 72 frames a second, evenly spaced on any screen
    acc = Math.max(0, Math.min(acc - 13.9, 13.9));
    try { frameAt(now); } catch (err) { broken = true; fail(err); }
    if (stepOutPending && tick >= 9) stepOutPending();  // back from a shop: step out once the street and its halos are drawn
    if (tick >= 2 && !root.classList.contains('is-ready')) root.classList.add('is-ready');   // the loading screen fades away
  }
  // Reduced motion: one still picture (redrawn each minute, and when a sign is pointed at), weather as it is now
  function still() {
    var t = (Date.now() - startedAt) / 1000; state.t = t; setTime();
    state.weather = weatherNow(); rainLevel = state.weather === 'rain' ? 1 : 0; snowLevel = state.weather === 'snow' ? 1 : 0; wet = rainLevel ? 1 : snowLevel ? 0.35 : 0;
    if (crowd) crowd.update(0.016, t, env());
    eagerLights = true; renderGlow(t); renderScene(t); renderPeople(); UI.dirty = true; drawUI(t); root.classList.add('is-ready');
  }
  function start() {
    if (reduceMotion) {
      try { still(); } catch (err) { fail(err); return; }
      window.setInterval(function () { try { still(); } catch (err) { fail(err); } }, 60000);
      var pending = false, again = function () { if (pending) return; pending = true; window.requestAnimationFrame(function () { pending = false; try { still(); } catch (err) { fail(err); } }); };
      ['mouseover', 'mouseout', 'focusin', 'focusout'].forEach(function (ev) { stage.addEventListener(ev, again); });
      return;
    }
    window.requestAnimationFrame(loop);
  }
  // ---------- Phones held upright: a side-scroller (design rule 8) ----------
  // The street fills the screen's height; swipe and it settles on a shop. Arrows on the edges say there is more, a
  // small map at the bottom shows where you are (tap it to jump), and the shop in the middle has an ENTER button.
  var STOPS = [[96, 'feed'], [266, 'books'], [478, 'kiosk'], [670, 'about'], [895, 'data'], [1080, 'contact'], [1189, 'network']];
  var upright = window.matchMedia ? window.matchMedia('(max-aspect-ratio: 1/1)') : { matches: false };
  var mob = (function () {
    STOPS.forEach(function (s) { var d = document.createElement('div'); d.className = 'd-snap'; d.style.left = 'calc(' + s[0] + ' * var(--px))'; stage.appendChild(d); });
    var mk = function (tag, cls, html, label) { var e = document.createElement(tag); e.className = cls; if (html) e.innerHTML = html; if (label) e.setAttribute('aria-label', label); root.appendChild(e); return e; };
    var left = mk('button', 'd-arrow d-arrow-l is-new', '&#9664;', 'Look left'), right = mk('button', 'd-arrow d-arrow-r is-new', '&#9654;', 'Look right');
    var enter = mk('button', 'd-enter', '', ''), map = mk('canvas', 'd-map', '', ''); map.setAttribute('aria-hidden', 'true'); map.width = 320; map.height = 75;
    left.type = right.type = enter.type = 'button';
    var mtx = map.getContext('2d'); mtx.imageSmoothingEnabled = true;
    var scale = function () { return stage.offsetWidth / W; };
    var current = function () { var c = (root.scrollLeft + root.clientWidth / 2) / scale(), best = 0; STOPS.forEach(function (s, i) { if (Math.abs(s[0] - c) < Math.abs(STOPS[best][0] - c)) best = i; }); return best; };
    var go = function (i) { i = Math.max(0, Math.min(STOPS.length - 1, i)); root.scrollTo({ left: STOPS[i][0] * scale() - root.clientWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' }); };
    var calm = function () { left.classList.remove('is-new'); right.classList.remove('is-new'); };
    left.addEventListener('click', function () { calm(); go(current() - 1); });
    right.addEventListener('click', function () { calm(); go(current() + 1); });
    var areaOf = function (i) { return stage.querySelector('[data-area=' + STOPS[i][1] + ']'); };
    enter.addEventListener('click', function () { var a = areaOf(current()); if (a) a.click(); });
    map.addEventListener('click', function (ev) { var r = map.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W; calm(); root.scrollTo({ left: x * scale() - root.clientWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' }); });
    var last = -1;
    function refresh() {
      if (!upright.matches) return;
      var max = root.scrollWidth - root.clientWidth;
      left.hidden = root.scrollLeft < 4; right.hidden = root.scrollLeft > max - 4;
      var i = current(); if (i !== last) { last = i; var a = areaOf(i), name = a ? a.getAttribute('data-name') : ''; enter.textContent = '▶ ENTER ' + name; enter.setAttribute('aria-label', 'Enter ' + name); }
    }
    root.addEventListener('scroll', function () { calm(); refresh(); }, { passive: true });
    window.addEventListener('resize', refresh);
    return {
      refresh: refresh,
      draw: function () {                               // the map: the shopfronts of the whole street, and a frame for the view
        if (!upright.matches) return;
        mtx.drawImage(ctx.canvas, 0, 290, W, 300, 0, 0, 320, 75);
        var sc = scale(), x0 = root.scrollLeft / sc / W * 320, w = root.clientWidth / sc / W * 320;
        mtx.strokeStyle = '#ffcf70'; mtx.lineWidth = 2; mtx.strokeRect(Math.round(x0) + 1, 1, Math.round(w) - 2, 73);
      }
    };
  })();
  window.setTimeout(function () { mob.refresh(); }, 50);
  // Even pixels (design rule 2): when the street's size on screen is within 8% of a whole number of screen pixels
  // per art pixel, it is set to exactly that, so every art pixel is the same size
  function snapPixels() {
    root.style.removeProperty('--px');
    if (upright.matches) return;
    var dpr = window.devicePixelRatio || 1, s = stage.getBoundingClientRect().width * dpr / W, n = Math.round(s);
    if (n >= 1 && Math.abs(s - n) / n < 0.08) root.style.setProperty('--px', (n / dpr) + 'px');
  }
  snapPixels(); window.addEventListener('resize', snapPixels);
  // Wide windows trim the sky: the clock corner moves down to stay on screen
  function placeClock() { var r = stage.getBoundingClientRect(), k = r.height / H, top = Math.max(0, -r.top) / k; clockCanvas.style.top = 'calc(' + Math.round(top + 8) + ' * var(--px))'; }
  placeClock(); window.addEventListener('resize', placeClock);
  // Phones held upright: start the panorama on the bar and its sign (or on the shop just stepped out of)
  function centre() { var sw = stage.offsetWidth; if (sw > root.clientWidth) root.scrollLeft = Math.round((backAtLoad ? backAtLoad.sx : 670) * sw / W - root.clientWidth / 2); }   // (offsetWidth: unzoomed)
  window.addEventListener('load', centre); centre();
  root.addEventListener('wheel', function (ev) {
    if (root.scrollWidth <= root.clientWidth || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
    root.scrollLeft += ev.deltaY; ev.preventDefault();
  }, { passive: false });
  if (shot) document.body.classList.add('d-shot');
  start();
  } catch (err) { fail(err); }
  function fail(err) { root.classList.add('is-broken', 'is-ready'); if (window.console) console.error('district:', err); if (stepOutPending) stepOutPending(); }
})();
