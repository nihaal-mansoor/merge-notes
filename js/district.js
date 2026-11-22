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
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { closePop(true); setHud(false); } });
  document.addEventListener('click', function (ev) { if (pop && !pop.contains(ev.target) && !(pop.opener && pop.opener.contains(ev.target))) closePop(false); });

  // ---------- Stepping into a shop ----------
  // A click on a link moves in on the sign that was clicked while the street dissolves, in big pixels, into
  // the dark navy of the other pages; then the page opens and fades in from that navy (see style.css). The
  // links in the corner menu step into the shop with the same address. Coming back (the Back button, or the
  // street opened again within half an hour) the street steps out of that shop. Ctrl, Shift or middle clicks
  // open new tabs as usual, and with reduced motion the links simply open.
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var NAVY = [11, 10, 31], ZOOM = 2.6, IN_MS = 520, OUT_MS = 640, BACK_KEY = 'mn-back';
  var leaving = false, zoomAnim = null, wipe = null, stepOutPending = null, giveUp = 0;
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
    var href = a.href, spot = spotFor(a), went = false;
    leaving = true; root.classList.add('is-leaving'); wipeAt(0);
    try { sessionStorage.setItem(BACK_KEY, JSON.stringify({ sx: spot.sx, sy: spot.sy, t: Date.now() })); } catch (err) { /* no storage: no way back, fine */ }
    zoomAnim = zoom(spot, 1, ZOOM, IN_MS, 'cubic-bezier(.45,0,.9,.55)');
    var go = function () {
      if (went) return; went = true; window.location.href = href;
      giveUp = window.setTimeout(function () { if (leaving) stepOut(spot); }, 8000);   // the page never came (offline?): back out
    };
    run(IN_MS, function (k) { wipeAt(Math.max(0, (k - 0.15) / 0.85)); }, go);
    window.setTimeout(go, IN_MS + 150);                 // (frames stop in a background tab; the timer does not)
  }
  function stepOut(spot) {
    window.clearTimeout(giveUp); leaving = false; root.classList.remove('is-leaving');
    zoomAnim = zoom(spot, ZOOM, 1, OUT_MS, 'cubic-bezier(.15,.6,.3,1)');
    run(OUT_MS, function (k) { wipeAt(1 - Math.min(1, k / 0.8)); }, function () {
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
    if (leaving) { ev.preventDefault(); return; }        // already on the way
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
    wipeAt(1); zoomAnim = zoom(backSpot, ZOOM, ZOOM, 1, 'linear');
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
  var GROUND = 530, FOOT = 628, ROAD = 642;           // building line, front edge of the footpath, top of the road
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // How far away a point on the ground is: the building line is 0.45, the bottom of the picture 0.95
  function depthAt(y) { return y <= GROUND ? 0.45 : 0.45 + (y - GROUND) / (H - GROUND) * 0.5; }
  var NEAR_Z = depthAt(FOOT), HOLE_Z = depthAt(592);

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
    '.': '..... ..... ..... ..... ..... .XX.. .XX..', "'": '..X.. ..X.. .X... ..... ..... ..... .....'
  };
  var F3 = {
    A: '.X. X.X XXX X.X X.X', B: 'XX. X.X XX. X.X XX.', C: '.XX X.. X.. X.. .XX', D: 'XX. X.X X.X X.X XX.', E: 'XXX X.. XX. X.. XXX', F: 'XXX X.. XX. X.. X..',
    G: '.XX X.. X.X X.X .XX', H: 'X.X X.X XXX X.X X.X', I: 'XXX .X. .X. .X. XXX', J: '..X ..X ..X X.X .X.', K: 'X.X X.X XX. X.X X.X', L: 'X.. X.. X.. X.. XXX',
    M: 'X.X XXX XXX X.X X.X', N: 'XX. X.X X.X X.X X.X', O: '.X. X.X X.X X.X .X.', P: 'XX. X.X XX. X.. X..', R: 'XX. X.X XX. X.X X.X', S: '.XX X.. .X. ..X XX.',
    T: 'XXX .X. .X. .X. .X.', U: 'X.X X.X X.X X.X XXX', V: 'X.X X.X X.X X.X .X.', W: 'X.X X.X XXX XXX X.X', Y: 'X.X X.X .X. .X. .X.',
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
    PLANT: { a: ['#4e5e36', '#3e4e2c'] }, CAT: { a: ['#1c1816'] }, WIRE: { a: ['#221e1c'] }, SNOW: { a: ['#ecece8'] },
    SIL: { a: ['#2a2420'] }, COUNTER: { a: ['#6a4a30'] }, COUNTER2: { a: ['#8a8680'] }, INTDK: { a: ['#3a2a20'] }, NOREN: { a: ['#3a3e5e', '#323654'] }, NORENL: { a: ['#c8c4d8'] },
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
    CURB: { a: ['#8a8478', '#7c766a'] }, CURBHI: { a: ['#aca698'] }, ASPH: { a: ['#5a5248', '#4e463e'] }, ASPH2: { a: ['#6c645a'] }, STRIPE: { a: ['#cac6ba'] },
    POLE: { a: ['#5a4a3c', '#4e4034'] }, POLED: { a: ['#2e2620'] },
    LAMP: { a: ['#d8d8d0'], e: ['#f2f6ff'], k: 0.9, h: '#8a9ad8' },
    KIOSK: { a: ['#5a6a6a', '#4e5e5e'] }, KIOSKD: { a: ['#2a3434'] },
    SUBDARK: { a: ['#1a1816'] }, SUBRAIL: { a: ['#3e5a4a', '#344e40'] }, SUBG: { a: ['#2e5a46'], e: ['#3e9a6e'], k: 0.6, d: 0.2, h: '#1e6a48' },
    GLOBE: { a: ['#d8d0b8'], e: ['#fff4d8'], k: 0.8, h: '#c09050' },
    TILEW: { a: ['#c8c4b4', '#b4b0a0'], e: ['#a8b4b0', '#8a9894'], k: 0.6, d: 0.3, h: '#26342f' }, TILEG: { a: ['#7a786c'], e: ['#5a6460'], k: 0.6, d: 0.3, noGlow: true },
    STEP: { a: ['#6a6660', '#5a5650'], e: ['#4e5654', '#444c4a'], k: 0.6, d: 0.2, noGlow: true }, STEPHI: { a: ['#9a968c'], e: ['#9aaaa6'], k: 0.6, d: 0.3, noGlow: true },
    SUBLIT: { a: ['#8a9a98'], e: ['#e8fff8', '#c8e8e0'], k: 0.8, d: 0.6, h: '#5a9a90' },
    WORKL: { a: ['#c8ccd0'], e: ['#f8fcff'], k: 0.9, d: 0.4, h: '#9ab0d8' },
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
  function win(x, y, w, h, m, sill) {
    box(x - 2, y - 2, w + 4, h + 4, K.CONCD);
    box(x, y, w, h, m, y, h);
    if (m !== K.GLASS && m !== K.WIND && rnd() < 0.34) { var r = rnd(); person(x + 6 + rnd() * (w - 12), y + h, Math.min(h * 0.62, 26), r < 0.3 ? 'cup' : r < 0.55 ? 'phone' : r < 0.75 ? 'hair' : ''); }
    box(x, y + Math.floor(h / 2), w, 1, K.METALD); box(x + Math.floor(w / 2), y, 1, h, K.METALD);
    if (sill !== false) box(x - 3, y + h + 2, w + 6, 2, K.CONC2);
    if (m !== K.GLASS && rnd() < 0.35) box(x + 1, y + 1, Math.floor(w / 3), h - 2, K.CURT, y, h);
  }
  function ac(x, y) { box(x, y, 20, 13, K.AC); ellipse(x + 8, y + 6.5, 4, 4, K.ACD); box(x + 15, y + 2, 3, 9, K.ACD); box(x + 2, y + 13, 2, 3, K.METALD); box(x + 16, y + 13, 2, 3, K.METALD); }
  function balcony(x, y, w, laundry) {
    box(x, y + 26, w, 3, K.CONC2); box(x, y + 29, w, 2, K.CONCD);
    if (laundry) { box(x + 4, y - 18, w - 8, 1, K.METALD); [[8, K.LAUN1, 14], [22, K.LAUN2, 18], [38, K.LAUN3, 12], [52, K.LAUN1, 16]].forEach(function (l) { if (l[0] < w - 10) box(x + l[0], y - 17, 10, l[2], l[1]); }); }
    for (var bx = x; bx < x + w; bx += 4) box(bx, y, 1, 26, K.LATT);
    box(x, y, w, 2, K.LATT); box(x, y + 13, w, 1, K.LATT);
  }
  function slab(x, y, w) { box(x, y, w, 2, K.CONCD); }
  function stains(x0, x1, y0, y1) { for (var k = 0; k < (x1 - x0) / 6; k++) { var sx = x0 + Math.floor(rnd() * (x1 - x0)), len = 6 + Math.floor(rnd() * 30), sy = y0 + Math.floor(rnd() * (y1 - y0)); box(sx, sy, 1, len, K.STAIN, sy, len); } }
  function lantern(x, cy, rx, ry, top) { box(x, top, 1, cy - ry - top, K.LANTD); ellipse(x, cy, rx, ry, K.LANT, 0.5); box(x - rx, cy - 1, rx * 2, 1, K.LANTD); box(x - rx + 3, cy - ry, rx * 2 - 6, 2, K.LANTD); box(x - rx + 3, cy + ry - 1, rx * 2 - 6, 2, K.LANTD); box(x, cy + ry + 1, 1, 4, K.LANT); }

  // ---------- Where things are (art pixels, 1280 x 720) ----------
  var MARQUEE = { x: 512, y: 140, w: 316, h: 106, z: 0.45, text: 'MERGE NOTES', cell: 5, by: 'BY NIHAAL', byCell: 3 };
  var LANTERNS = [[548, 452], [600, 452], [740, 452], [792, 452]], AWNING_Z = 0.56;
  var LAMPHEAD = [1198, 336], WORKLIGHT = [1151, 562];
  // Each sign's light, which brightens when its link is pointed at or focused: x, y, radius, colour, depth
  var SPILLS = {
    feed: [96, 428, 150, [140, 230, 170], 0.43], linkedin: [148, 366, 90, [130, 230, 200], 0.43], articles: [418, 316, 150, [255, 200, 90], 0.53],
    books: [266, 478, 110, [255, 190, 120], 0.47], kiosk: [478, 470, 80, [255, 140, 110], 0.47], about: [670, 470, 150, [255, 200, 140], 0.5],
    menu: [670, 370, 130, [255, 236, 210], 0.5], data: [895, 470, 140, [140, 255, 190], 0.42], contact: [1080, 470, 130, [150, 230, 255], 0.46],
    billboard: [1080, 172, 140, [200, 200, 255], 0.46], network: [1189, 220, 110, [255, 120, 200], 0.43], subway: [1085, 600, 120, [200, 230, 255], HOLE_Z]
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
    box(18, 120, 44, 30, K.TANK, 120, 30); box(22, 150, 3, 4, K.METALD); box(54, 150, 3, 4, K.METALD); box(16, 118, 48, 3, K.METAL);
    line(160, 96, 160, 152, K.METAL); line(150, 108, 170, 108, K.METAL); line(152, 120, 168, 120, K.METAL);
    [160, 246, 332].forEach(function (fy, f) {
      slab(-M, fy + 84, 196 + M);
      win(-56, fy + 16, 30, 42, pickWin());
      box(-12, fy + 18, 46, 62, pickWin(), fy + 18, 62); box(40, fy + 24, 44, 40, pickWin(), fy + 24, 40);
      if (rnd() < 0.5) person(52, fy + 64, 26, rnd() < 0.5 ? 'cup' : '');
      balcony(-16, fy + 54, 106, f !== 1);
      if (f < 2) { win(112, fy + 16, 72, 42, pickWin()); ac(140, fy + 64); }
    });
    box(108, 338, 80, 56, K.POSTER, 338, 56); frame(106, 336, 84, 60, K.METALD, 2);
    sign('FOLLOW', 148, 346, { font: F3, scale: 2, fill: K.POSTERD }); sign('LINKEDIN', 148, 362, { font: F3, scale: 2, fill: K.POSTERD }); box(118, 380, 60, 2, K.POSTERD);
    stains(-M, 196, 170, 410);
    // FEED
    box(-M, 416, 196 + M, 22, K.BOXG, 416, 22); box(-M, 416, 196 + M, 1, K.METALD); box(-M, 437, 196 + M, 1, K.METALD);
    sign('FEED', 60, 420, { font: FB, scale: 2, fill: K.LETW, shade: K.BOXGD });
    text('OPEN 24H', 128, 425, K.LETW, 1);
    box(-M, 438, 196 + M, 92, K.CONC2);
    box(-4, 444, 190, 84, K.SHOPF, 444, 84);
    [462, 484, 506].forEach(function (sy) { box(0, sy, 182, 2, K.SHELF); for (var x = 2; x < 180; x += 4) if (rnd() < 0.8) box(x, sy - 6, 3, 6, rnd() < 0.4 ? K.SHELFR : rnd() < 0.5 ? K.SHELFY : K.SHELFB); });
    person(150, 528, 34, 'phone');
    frame(-4, 444, 190, 84, K.METAL, 2); box(60, 444, 2, 84, K.METAL); box(124, 444, 2, 84, K.METAL);
  }

  // B: an old wooden shop-house with a tiled roof: a bookshop, ARTICLES
  function paintB() {
    seed = 202;
    box(196, 328, 224, 202, K.WOOD, 328, 202);
    woodGrain(200, 330, 420, 418, 8);
    poly([[186, 330], [430, 330], [418, 300], [198, 300]], K.ROOF, 0.4);
    for (var tx = 200; tx < 418; tx += 5) box(tx, 302, 1, 26, K.ROOFD);
    for (var ty = 304; ty < 328; ty += 6) for (var tx2 = 201; tx2 < 418; tx2 += 5) px(tx2, ty, K.ROOFHI);
    box(198, 297, 220, 4, K.ROOFHI); box(186, 328, 244, 3, K.ROOFD); box(196, 331, 224, 3, K.DARK);
    box(250, 270, 10, 30, K.METAL); box(248, 268, 14, 3, K.METALD);       // the stove pipe that smokes
    [[212, 344], [318, 344]].forEach(function (p, i) {
      box(p[0] - 3, p[1] - 3, 84, 58, K.WOODD); box(p[0], p[1], 78, 52, K.WINW, p[1], 52);
      if (i === 0) person(p[0] + 40, p[1] + 52, 30, 'cup');            // a shadow on the paper screen
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
    person(300, 518, 36, 'hair'); box(296, 440, 2, 8, K.INTDK); box(291, 448, 12, 3, K.LAMPS);
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
    win(436, 262, 34, 46, pickWin()); win(490, 262, 34, 46, pickWin());
    win(436, 348, 34, 46, pickWin()); box(490, 348, 34, 28, pickWin()); balcony(482, 376, 54, false);
    slab(420, 330, 120); slab(420, 416, 120);
    box(530, 250, 4, 280, K.METAL);
    box(486, 440, 40, 90, K.WINC, 440, 90); frame(484, 438, 44, 92, K.METALD, 2); box(505, 440, 1, 90, K.METALD);
    ellipse(500, 234, 7, 5, K.CAT); ellipse(507, 228, 4, 4, K.CAT); poly([[504, 226], [505, 220], [507, 225]], K.CAT); poly([[508, 225], [510, 220], [511, 226]], K.CAT);
    line(493, 235, 488, 238, K.CAT, 2); line(488, 238, 486, 246, K.CAT, 2);
  }

  // D: the bar, NIHAAL'S (about me): a wooden house with a flat roof
  function paintD() {
    seed = 404;
    box(540, 330, 260, 200, K.WOOD, 330, 200);
    woodGrain(542, 332, 800, 404, 8);
    box(536, 322, 268, 8, K.WOODD); box(536, 322, 268, 2, K.ROOFHI);
    box(566, 338, 208, 64, K.MENUBG); frame(563, 335, 214, 70, K.MENUFR, 3);
    [600, 740].forEach(function (lx) { box(lx - 6, 330, 14, 3, K.LAMPS); });                  // two little lamps on the roof edge, shining down on the board
    box(540, 424, 260, 16, K.BOARD); frame(540, 424, 260, 16, K.WOODD);
    sign("NIHAAL'S", 670, 425, { font: FB, scale: 2, fill: K.GOLD, hi: K.GOLDHI, outline: K.LETD, wear: 0.05 });
    box(540, 440, 260, 90, K.WOODD);
    [[556, 84], [698, 92]].forEach(function (p) {
      var x0 = p[0], w = p[1];
      box(x0, 446, w, 70, K.SHOPW, 446, 70);
      box(x0, 452, w, 1, K.INTDK); for (var sx2 = x0 + 4; sx2 < x0 + w - 4; sx2 += 4) if (rnd() < 0.7) box(sx2, 455, 2, 7, rnd() < 0.5 ? K.SHELFR : K.SHELFY);
      for (var lx2 = x0 + 14; lx2 < x0 + w - 8; lx2 += 30) { box(lx2, 446, 1, 14, K.INTDK); box(lx2 - 3, 460, 7, 3, K.LAMPS); }
      box(x0, 496, w, 8, K.COUNTER); box(x0, 496, w, 1, K.SHOPW);
      for (var st = x0 + 8; st < x0 + w - 6; st += 16) { box(st, 506, 9, 3, K.INTDK); box(st + 4, 509, 2, 7, K.INTDK); }
      frame(x0 - 2, 444, w + 4, 74, K.WOODL, 2);
    });
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
    [[548, 558], [782, 792]].forEach(function (p) {
      box(p[0], 246, 2, 78, K.METAL); box(p[1], 246, 2, 78, K.METAL);
      for (var y = 248; y < 320; y += 12) { line(p[0], y, p[1], y + 12, K.METALD); line(p[1], y, p[0], y + 12, K.METALD); }
    });
    box(520, 258, 300, 3, K.METAL); box(520, 251, 300, 1, K.METALD); for (var x = 522; x < 820; x += 10) box(x, 251, 1, 7, K.METALD);
    [600, 670, 740].forEach(function (lx) { box(lx, 261, 2, 6, K.METALD); box(lx - 6, 266, 14, 4, K.METAL); box(lx - 5, 266, 12, 2, K.LAMPS); });
    box(MARQUEE.x, MARQUEE.y, MARQUEE.w, MARQUEE.h, K.METALD, MARQUEE.y, MARQUEE.h); frame(MARQUEE.x, MARQUEE.y, MARQUEE.w, MARQUEE.h, K.METAL, 2);
  }

  // E: a concrete block with DATA, an electronics shop whose monitors show charts (Dubai data)
  function paintE() {
    seed = 505;
    box(800, 160, 190, 370, K.CONC, 160, 400); box(796, 152, 198, 8, K.CONC2); box(796, 152, 198, 1, K.CONCD);
    speckle(800, 160, 990, 412, 0.015);
    box(940, 118, 36, 34, K.TANK, 118, 34); box(938, 116, 40, 3, K.METAL);
    box(962, 120, 8, 32, K.METAL);                                            // a vent that smokes
    [160, 246, 332].forEach(function (fy, f) {
      slab(800, fy + 84, 190);
      [812, 870, 928].forEach(function (wx) { win(wx, fy + 18, 40, 44, pickWin()); });
      if (f === 1) balcony(806, fy + 40, 104, true);
      if (f !== 1) ac(822 + f * 40, fy + 66);
    });
    stains(800, 990, 170, 400);
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
    for (var by = 248; by < 412; by += 6) { box(990, by + 5, 180, 1, K.BRICKD); var off = ((by / 6) % 2) * 7; for (var bx2 = 990 + off; bx2 < 1170; bx2 += 14) { box(bx2, by, 1, 5, K.BRICKD); if (rnd() < 0.12) box(bx2 + 1, by, 12, 5, K.BRICKHI); } }
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
    person(1120, 528, 34, '');
    frame(996, 448, 168, 80, K.METAL, 2);
  }

  // G: a tall building at the end of the street (its NETWORK sign is LinkedIn)
  function paintG() {
    seed = 707;
    box(1170, 74, 134 + M, 456, K.CONC2, 74, 480); box(1166, 66, 142 + M, 8, K.CONCD);
    speckle(1170, 74, W + M, 418, 0.015);
    [74, 160, 246, 332].forEach(function (fy) { slab(1170, fy + 84, 134 + M); win(1214, fy + 20, 34, 44, pickWin()); win(1262, fy + 20, 34, 44, pickWin()); win(1310, fy + 20, 30, 44, pickWin()); });
    box(1170, 418, 134 + M, 112, K.CONCD); box(1180, 430, 120, 100, K.SHUT, 430, 100); for (var sy2 = 432; sy2 < 520; sy2 += 4) box(1180, sy2, 120, 1, K.METAL);
    box(1180, 520, 120, 10, K.SHOPW);
    stains(1170, W + M, 90, 410);
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
    box(446, 474, 64, 22, K.SHOPW, 474, 22); person(478, 496, 18, '');
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
  }

  // The ground: footpath, the subway stairwell dug into it, curb, gutter, road, crosswalk, a manhole
  function paintGround() {
    seed = 555;
    box(-M, GROUND, W + 2 * M, FOOT - GROUND, K.PAVE, GROUND, FOOT - GROUND);
    var VX = 640, VY = 160;
    [530, 538, 548, 560, 574, 590, 608].forEach(function (y) { box(-M, y, W + 2 * M, 1, K.PAVED); box(-M, y + 1, W + 2 * M, 1, K.PAVEHI); });
    for (var xf = -760; xf <= 2040; xf += 72) for (var y = GROUND; y < FOOT; y++) px(VX + (xf - VX) * (y - VY) / (FOOT - VY), y, K.PAVED);
    for (var n = 0; n < 1600; n++) px(-M + Math.floor(rnd() * (W + 2 * M)), GROUND + 2 + Math.floor(rnd() * (FOOT - GROUND - 3)), rnd() < 0.5 ? K.PAVED : K.PAVEHI);
    box(270, 598, 60, 7, K.METALD); for (var gx = 272; gx < 328; gx += 4) box(gx, 599, 2, 5, K.METAL);   // a grate that steams
    // the subway stairwell: a tiled wall, steps going down to the right, a lit passage at the bottom
    poly([[1004, 588], [1166, 588], [1170, 628], [1000, 628]], K.SUBDARK);
    box(1004, 588, 162, 22, K.TILEW, 588, 22);
    for (var ty = 591; ty < 610; ty += 4) box(1004, ty, 162, 1, K.TILEG);
    for (var tx = 1006; tx < 1166; tx += 7) box(tx, 588, 1, 22, K.TILEG);
    box(1004, 588, 162, 2, K.METALD);
    box(1020, 592, 34, 2, K.TUBEW); box(1100, 592, 34, 2, K.TUBEW);
    for (var i = 0; i < 9; i++) { var sx = 1004 + i * 18, sy = Math.round(604 + i * 2.6); box(sx, sy, 18, 628 - sy, K.STEP, sy, 628 - sy); box(sx, sy, 18, 1, K.STEPHI); }
    line(1006, 598, 1150, 614, K.SUBRAIL, 2);
    box(1148, 600, 18, 28, K.SUBLIT, 600, 28);
    // curb, gutter, road
    box(-M, FOOT, W + 2 * M, 3, K.CURBHI); box(-M, FOOT + 3, W + 2 * M, 9, K.CURB); box(-M, FOOT + 12, W + 2 * M, 2, K.METALD);
    box(-M, ROAD, W + 2 * M, H - ROAD, K.ASPH, ROAD, H - ROAD);
    for (var rx = -M; rx < W + M; rx += 96) box(rx, 700, 44, 2, K.ASPH2);
    for (var c = 0; c < 10; c++) {
      var xt = 530 + c * 24, spread = function (x, yy) { return 640 + (x - 640) * (1 + (yy - 648) / 66 * 0.2); };
      poly([[spread(xt, 648), 648], [spread(xt + 13, 648), 648], [spread(xt + 13, 716), 716], [spread(xt, 716), 716]], K.STRIPE);
    }
    for (var m = 0; m < 900; m++) { var rgx = -M + Math.floor(rnd() * (W + 2 * M)), rgy = ROAD + 1 + Math.floor(rnd() * (H - ROAD - 2)); if (rnd() < 0.5) px(rgx, rgy, K.ASPH2); }
    ellipse(900, 692, 26, 6, K.METALD); ellipse(900, 692, 22, 4.6, K.METAL); for (var mh = 886; mh < 916; mh += 6) box(mh, 690, 3, 1, K.METALD);
  }

  // Around the stairwell: green railings, a lamp post with a globe and the SUBWAY sign, a work light
  function paintSubway() {
    box(1004, 570, 162, 3, K.SUBRAIL); box(1004, 580, 162, 2, K.SUBRAIL);
    for (var x = 1004; x <= 1166; x += 12) box(x, 570, 2, 18, K.SUBRAIL);
    line(1166, 570, 1172, 596, K.SUBRAIL, 2);
    box(1004, 534, 4, 54, K.SUBRAIL); ellipse(1006, 528, 7, 7, K.GLOBE, 0.4); box(1003, 534, 6, 2, K.METALD);
    box(1012, 538, 56, 16, K.SUBG); frame(1012, 538, 56, 16, K.METALD);
    sign('SUBWAY', 1040, 543, { font: F3, scale: 2, fill: K.LETW });
    line(1151, 566, 1143, 590, K.METALD); line(1151, 566, 1159, 590, K.METALD); line(1151, 566, 1151, 590, K.METALD);
    box(1144, 552, 15, 10, K.METALD); box(1146, 554, 11, 4, K.WORKL);
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
      for (var st = 120; st < 600; st += 26) box(x + (i ? -8 : 6), st, 3, 2, K.METALD);
      if (i === 1) { box(x + 6, 104, 20, 34, K.METAL, 104, 34); box(x + 8, 100, 16, 4, K.METALD); line(x + 16, 104, x + 16, 82, K.WIRE); }
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
      if (!gap(x)) box(x, 598, 4, FOOT + 10 - 598, K.RAIL);
      for (var a = 0; a <= 64; a++) { var ax = x + a; if (gap(ax)) continue; px(ax, 598, K.RAIL); px(ax, 599, K.RAIL); px(ax, 600, K.RAIL); px(ax, 601, K.METALHI); px(ax, 616, K.RAIL); px(ax, 617, K.RAIL); if (a > 3 && a < 64) { var tt = (a - 4) / 60, ay = 602 + Math.sin(tt * Math.PI) * 9; px(ax, ay, K.RAIL); px(ax, ay + 1, K.RAIL); } }
    }
    // the works barrier, with a sign
    box(1000, 608, 172, 12, K.BAR1); for (var bx = 1000; bx < 1172; bx++) for (var by = 608; by < 620; by++) if ((((bx + by) / 8) % 2) < 1) px(bx, by, K.BAR2);
    frame(1000, 608, 172, 12, K.BAR2); [1004, 1084, 1166].forEach(function (p) { box(p, 620, 3, 14, K.BAR2); });
    box(1058, 592, 56, 14, K.BOXY); frame(1058, 592, 56, 14, K.BAR2); centred('OPENING', 1086, 594, K.LETD, 1); centred('SOON', 1086, 600, K.LETD, 1);
    [988, 1178].forEach(function (cx2) { box(cx2 + 3, 614, 4, 4, K.CONE); box(cx2 + 2, 618, 6, 3, K.CONEW); box(cx2 + 1, 621, 8, 6, K.CONE); box(cx2, 627, 10, 3, K.BAR2); });
  }

  // ---------- Build the parts (each is coloured only when a time of day first needs it) ----------
  function part(name, z, x0, y0, x1, y1, paint) { B = buffer(x0, y0, x1, y1); paint(); var p = { name: name, z: z, x0: x0, y0: y0, buf: B, c: {} }; B = null; return p; }
  function canvasOf(p, kind) { if (!(kind in p.c)) p.c[kind] = colorize(p.buf, palOf(kind)); return p.c[kind]; }
  var FAR = part('far', 0.15, -M, 20, W + M, GROUND, paintFar);
  var PA = part('A', 0.43, -M, 90, 198, GROUND, paintA), PB = part('B', 0.47, 184, 262, 432, GROUND, paintB), PC = part('C', 0.44, 414, 214, 546, GROUND, paintC);
  var PD = part('D', 0.5, 528, 316, 812, GROUND, paintD), PE = part('E', 0.42, 792, 100, 998, GROUND, paintE), PF = part('F', 0.46, 984, 100, 1176, GROUND, paintF);
  var PG = part('G', 0.4, 1162, 56, W + M, GROUND, paintG);
  var PART_SIGN = part('articles', 0.53, 388, 196, 442, 432, paintArticlesSign), PART_NET = part('network', 0.43, 1166, 116, 1206, 324, paintNetworkSign);
  var PART_MARQ = part('marquee', MARQUEE.z, 506, 134, 834, 334, paintMarquee), PART_AWN = part('awning', AWNING_Z, 528, 400, 812, 470, paintAwning);
  var PROPS = part('props', 0.47, 0, 398, 812, GROUND + 2, paintProps);
  var GROUNDP = part('ground', 0.45, -M, GROUND, W + M, H, paintGround);
  var SUBWAY = part('subway', HOLE_Z, 990, 516, 1182, 600, paintSubway);
  var NEAR = part('near', NEAR_Z, -M, 20, W + M, 648, paintNear);
  // The buildings in drawing order (far first), with the extent of their side walls
  var SA = { p: PA, xL: -M, xR: 196, top: 152, wall: 'CONC' }, SB = { p: PB, xL: 196, xR: 420, top: 330, wall: 'WOOD' }, SC = { p: PC, xL: 420, xR: 540, top: 240, wall: 'CONC2' },
    SD = { p: PD, xL: 540, xR: 800, top: 322, wall: 'WOOD' }, SE = { p: PE, xL: 800, xR: 990, top: 152, wall: 'CONC' }, SF = { p: PF, xL: 990, xR: 1170, top: 240, wall: 'BRICK' },
    SG = { p: PG, xL: 1170, xR: W + M, top: 66, wall: 'CONC2' };
  [[SA, SB], [SB, SC], [SC, SD], [SD, SE], [SE, SF], [SF, SG]].forEach(function (pair) { pair[0].right = pair[1]; pair[1].left = pair[0]; });   // neighbours
  var STREET = [SG, SE, SA, { p: PART_NET }, SC, { p: PART_MARQ, marquee: true }, SF, SB, SD, { p: PART_SIGN }, { p: PART_AWN }];

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
        { y: 273, h: 34, depth: depthAt(546), max: 3, fade: 1 }, { y: 283, h: 36, depth: depthAt(566), max: 3, fade: 1 },
        { y: 292, h: 38, depth: depthAt(584), max: 3, fade: 1 },
        { y: 346, h: 46, depth: depthAt(692), max: 0, fade: 1, ride: true }
      ],
      door: { x: 322, w: 25, top: 226 }, counter: 248, dinerDepth: 0.5, workerDepth: HOLE_Z, workerY: 325,
      windows: [{ x: 278, y: 223, w: 42, h: 35 }, { x: 349, y: 223, w: 46, h: 35 }],
      seats: [[286, 1], [299, -1], [312, 1], [358, 1], [372, -1], [386, 1]],
      waiter: { y: 260, x0: 280, x1: 393 }, dinerSize: 36, waiterSize: 36, workerSize: 30,
      barrier: { x0: 502, x1: 584, top: 314 },
      workers: [{ id: 'workerA', x: 515, y: 306, dir: 1, kind: 'drill' }, { id: 'workerB', x: 563, y: 318, dir: -1, kind: 'shovel' }, { id: 'workerC', x: 592, y: 306, dir: -1, kind: 'sign' }],
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
    var set = function () { hover = el.getAttribute('data-area'); }, clear = function () { if (hover === el.getAttribute('data-area')) hover = null; };
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
    state.lights = keyframes(fr, PHASE.lights);
  }
  // About ten minutes ahead, colour the parts for the coming time of day in spare moments (one part at a time),
  // so dusk or morning never arrives with a stall
  var ALL_PARTS = null, bakeQueue = [], bakeKeys = {}, lastLook = -1e9, bakeScheduled = false;
  var idleCall = window.requestIdleCallback ? function (fn) { window.requestIdleCallback(fn, { timeout: 2000 }); }
    : function (fn) { window.setTimeout(function () { fn({ didTimeout: false, timeRemaining: function () { return 8; } }); }, 60); };
  function lookAhead() {
    var now = performance.now(); if (now - lastLook < 3000) return; lastLook = now;
    if (!ALL_PARTS) ALL_PARTS = [FAR, PA, PB, PC, PD, PE, PF, PG, PART_SIGN, PART_NET, PART_MARQ, PART_AWN, PROPS, GROUNDP, SUBWAY, NEAR];
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
  function env() { return { t: state.t, lights: state.lights, day: state.day, rain: rainLevel, wind: wind(), wet: 0.3 + 0.7 * wet, offset: function (d) { return Math.round(CAMX * d) / 2; } }; }
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
    { x: 900, y: 690, rate: 11, life: [3.5, 5.5], vy: [-28, -44], vx: [-4, 4], r: [6, 50], a: 0.2, layer: 'front', z: depthAt(690) },
    { x: 300, y: 600, rate: 4, life: [2, 3.2], vy: [-18, -28], vx: [-3, 3], r: [5, 24], a: 0.09, layer: 'front', z: depthAt(600) },
    { x: 1060, y: 622, rate: 5, life: [1.2, 2.2], vy: [-10, -18], vx: [-6, 6], r: [3, 16], a: 0.16, layer: 'front', z: HOLE_Z }
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
  var PUDDLES = [[118, 586, 58, 5.5], [430, 562, 34, 3.5], [716, 606, 84, 6.5], [884, 552, 46, 4], [1226, 604, 34, 4.5], [520, 638, 190, 2.4], [300, 682, 104, 8], [640, 704, 62, 6], [1060, 694, 140, 9]]
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
  function bulb(g, x, y, s, on) {
    if (!on) { g.fillStyle = css(mix([58, 50, 48], [176, 170, 160], state.day)); g.fillRect(x, y, s, s); return; }   // unlit bulbs: pale glass by day
    g.fillStyle = '#ffb860'; g.fillRect(x, y, s, s);
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
      bulbText(g, m.text, cx, m.y + 14, m.cell, 3, lit);
      bulbText(g, m.by, cx, m.y + 58, m.byCell, 3, lit);
    }
    var step = 10, run = Math.floor(t * 6);
    for (var bx = m.x + 6; bx < m.x + m.w - 6; bx += step) {
      var idx = Math.round((bx - m.x) / step), lamp = lit && ((idx + run) % 3 !== 0);
      bulb(g, bx + ox, m.y + 3, 5, lamp); bulb(g, bx + ox, m.y + m.h - 8, 5, lamp);
    }
  }
  // The street, far to near: buildings with their side walls, signs, the ground, things on the footpath
  function drawStreet(t) {
    STREET.forEach(function (b) {
      if (b.wall) sideWall(ctx, b);
      drawPart(ctx, b.p);
      if (b.marquee) drawMarquee(ctx, t, false);
    });
  }
  // Service wires from the poles to three buildings, drawn live so each end moves with what it is tied to
  var DROPS = [[196, 80, 150, 214, 10, 0.43], [992, 80, 1100, 250, 12, 0.46], [992, 80, 900, 168, 8, 0.42]];
  function drawDropWires(g) {
    g.strokeStyle = css(litColor('WIRE')); g.lineWidth = 1; g.beginPath();
    DROPS.forEach(function (d) { var x0 = d[0] + offset(NEAR_Z) + 0.5, x1 = d[2] + offset(d[5]) + 0.5; g.moveTo(x0, d[1] + 0.5); g.quadraticCurveTo((x0 + x1) / 2, (d[1] + d[3]) / 2 + d[4] * 2, x1, d[3] + 0.5); });
    g.stroke();
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
    glowAt(g, 670 + offset(MARQUEE.z), 196, 250, '255,170,90', 0.14 * a);
    FRONTS.forEach(function (f) {
      var x = f[0] + offset(f[3]), w = f[1], lg = g.createLinearGradient(0, GROUND, 0, FOOT + 6);
      lg.addColorStop(0, 'rgba(' + f[2] + ',' + (0.24 * a) + ')'); lg.addColorStop(1, 'rgba(' + f[2] + ',0)'); g.fillStyle = lg;
      g.beginPath(); g.moveTo(x - 2, GROUND); g.lineTo(x + w + 2, GROUND); g.lineTo(x + w + 40 + offset(0.15), FOOT + 6); g.lineTo(x - 40 + offset(0.15), FOOT + 6); g.closePath(); g.fill();
    });
    var oa = offset(AWNING_Z);
    LANTERNS.forEach(function (l) { glowAt(g, l[0] + oa, l[1], 30, '255,110,60', 0.22 * a); pool(g, l[0] + oa, GROUND + 10, 46, '255,120,70', 0.2 * a); });
    pool(g, LAMPHEAD[0] + offset(NEAR_Z), FOOT - 30, 150, '200,214,255', 0.32 * a);
    glowAt(g, 1150 + offset(HOLE_Z), 610, 70, '200,236,240', 0.28 * a);
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
  function drawPeopleLights(e) {
    var a = state.lights; if (a < 0.05 || !crowd || !crowd.glowPoints) return;
    var pts = crowd.glowPoints(e);
    [ptx, rtx].forEach(function (g) { if (g) { g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.globalAlpha = Math.min(1, a); } });
    pts.forEach(function (p) {
      var g = p.ride ? rtx : ptx; if (!g) return;
      var s = DOT_SIZE[p.kind] || 16, x = p.x * 2 + (p.w || 1), y = p.y * 2 + 1 - (p.ride ? RIDE_TOP : 0);
      g.drawImage(glowDot(p.c), Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    });
    [ptx, rtx].forEach(function (g) { if (g) g.restore(); });
  }
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
    wet = wet < target ? Math.min(target, wet + dt / 45) : Math.max(target, wet - dt / 240);
    EMITTERS.forEach(function (e) { e.acc += dt * e.rate; while (e.acc >= 1) { e.acc -= 1; smoke.push(emit(e)); } });
    for (var s = smoke.length - 1; s >= 0; s--) { var p = smoke[s]; p.age += dt; stepSmoke(p, dt); if (p.age >= p.life) smoke.splice(s, 1); }
    var n = Math.floor(drops.length * rainLevel);
    for (var d = 0; d < n; d++) {
      var dr = drops[d]; dr.y += dr.v * dt; dr.x -= dr.v * dt * 0.25;
      if (dr.y >= dr.floor) {
        if (dr.floor > GROUND) { var hx = Math.round(dr.x), hy = Math.round(dr.floor); if (inPuddle(hx, hy)) { if (Math.random() < 0.5) ripples.push({ x: hx, y: hy, age: 0 }); } else if (Math.random() < 0.5) splashes.push({ x: hx, y: hy, age: 0 }); }
        drops[d] = newDrop(false);
      }
    }
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
    drawSmoke(ctx, 'mid');
    drawGround(ctx); drawPuddles(ctx); drawPart(ctx, PROPS); drawReflections(t);
    drawPart(ctx, PART_SIGN);                            // the sign hangs in front of the newsstand
    drawLiveBits(ctx, t, false); drawGroundLight(ctx);
    // The light of the shops, windows and signs, and the halos round them: laid on the street, behind the people
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    drawSpillLights(ctx);
    if (crowd) { ctx.save(); ctx.scale(2, 2); crowd.drawLight(ctx, e); ctx.restore(); }
    if (state.lights > 0.01) drawHalos(ctx);
    ctx.restore();
    // Front: the stairwell's railings, the railing, poles and wires, the lamp; steam, low fog, weather, grain
    ftx.clearRect(0, 0, W, H);
    if (!(crowd && crowd.drawWorkers)) drawPart(ftx, SUBWAY);   // (otherwise it goes between the walkers and the workers)
    drawPart(ftx, NEAR); drawDropWires(ftx);
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
    crowd.draw(ptx, e, { skipRide: !!rtx, skipWorkers: !!crowd.drawWorkers });
    shadePeople(ptx, 380, H);
    ptx.save(); ptx.beginPath(); ptx.rect(0, 430, W, 40); ptx.clip(); drawPart(ptx, PART_AWN); ptx.restore();   // the lanterns hang in front of the diners
    if (crowd.drawWorkers) {
      drawPart(ptx, SUBWAY);
      wkx.clearRect(0, 0, WK.w, WK.h); wkx.save(); wkx.translate(-WK.x, -WK.y); crowd.drawWorkers(wkx, e); wkx.restore();
      shadePeople(wkx, 0, WK.h); ptx.drawImage(wkx.canvas, WK.x, WK.y);
    }
    if (rtx) { rtx.clearRect(0, 0, W, H - RIDE_TOP); rtx.save(); rtx.translate(0, -RIDE_TOP); crowd.drawRiders(rtx, e); rtx.restore(); shadePeople(rtx, 0, H - RIDE_TOP); }
    drawPeopleLights(e);
  }
  // Halos (lights only, never letters): a tight one, and a wide one made from the same picture
  function renderGlow(t) {
    gtx.clearRect(0, 0, W, H);
    if (state.lights > 0.01) {
      partLights(gtx, FAR, 0.6);
      STREET.forEach(function (b) { partLights(gtx, b.p, 0.95); });
      gtx.save(); groundTransform(gtx); lights(gtx, GROUNDP, 0.8, function (c) { gtx.drawImage(c, 0, 0); }); gtx.restore();
      partLights(gtx, PROPS, 0.9); partLights(gtx, SUBWAY, 1); partLights(gtx, NEAR, 1);
      gtx.globalAlpha = state.lights;
      drawMarquee(gtx, t, true); drawLiveBits(gtx, t, true); drawDrone(gtx, t, true);
      gtx.globalAlpha = 1;
    }
    var src = gtx.canvas;
    GLOW.forEach(function (g) { g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, g.canvas.width, g.canvas.height); src = g.canvas; });
    mergeHalos();
  }

  // People are drawn every frame (smooth walking); the street every second frame; the halos every fourth
  var last = 0, tick = 0, worldDt = 0;
  function frameAt(now) {
    var dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now; tick++;
    var t = (Date.now() - startedAt) / 1000, scene = tick % 2 === 1;
    state.t = t; setTime(); worldDt += dt;
    if (scene) { updateCamera(); lookAhead(); }
    if (crowd) crowd.update(dt, t, env());
    if (scene) {
      var p0 = PERF ? performance.now() : 0;
      updateWorld(worldDt, t); worldDt = 0; renderScene(t);
      if (PERF) { PERF.scene += performance.now() - p0; PERF.n.scene++; }
    }
    else if (tick % 4 === 0 && tick > 6) {               // otherwise every 4th frame, on a frame without the street
      var p3 = PERF ? performance.now() : 0; renderGlow(t); if (PERF) { PERF.glow += performance.now() - p3; PERF.n.glow++; }
    }
    var p1 = PERF ? performance.now() : 0;
    renderPeople();
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
    if (stepOutPending) stepOutPending();               // back from a shop: step out now that the street is drawn
  }
  // Reduced motion: one still picture (redrawn each minute, and when a sign is pointed at), weather as it is now
  function still() {
    var t = (Date.now() - startedAt) / 1000; state.t = t; setTime();
    state.weather = weatherNow(); rainLevel = state.weather === 'rain' ? 1 : 0; snowLevel = state.weather === 'snow' ? 1 : 0; wet = rainLevel ? 1 : snowLevel ? 0.35 : 0;
    if (crowd) crowd.update(0.016, t, env());
    eagerLights = true; renderGlow(t); renderScene(t); renderPeople();
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
  // Phones held upright: start the panorama on the bar and its sign (or on the shop just stepped out of)
  function centre() { if (root.scrollWidth > root.clientWidth) root.scrollLeft = Math.round((backAtLoad ? backAtLoad.sx : 670) * root.scrollWidth / W - root.clientWidth / 2); }
  window.addEventListener('load', centre); centre();
  root.addEventListener('wheel', function (ev) {
    if (root.scrollWidth <= root.clientWidth || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
    root.scrollLeft += ev.deltaY; ev.preventDefault();
  }, { passive: false });
  if (shot) document.body.classList.add('d-shot');
  start();
  } catch (err) { fail(err); }
  function fail(err) { root.classList.add('is-broken'); if (window.console) console.error('district:', err); if (stepOutPending) stepOutPending(); }
})();
