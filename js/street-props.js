/*
  Street props for the Merge Notes street (proposed; shown on the props sheet for approval before any is placed).

  Each prop paints itself with a small painter (box, px, line, ellipse, poly, frame) in named materials, so the street
  can colour it for night, dusk and day like everything else (district.js maps the names to its materials). x is the
  left edge, y the ground the prop stands on. w and h are its size in art pixels.
*/
window.StreetProps = (function () {
  'use strict';
  // The colours of the materials (albedo; e is their own light, where they have any)
  var MATS = {
    BINM: { a: '#7a7e80' }, BINMD: { a: '#4a4e50' }, BINMH: { a: '#aab0b2' }, BAG: { a: '#24242a' }, BAGHI: { a: '#4a4a54' },
    RECB: { a: '#2e5a9a' }, RECG: { a: '#3a7a4a' }, RECY: { a: '#d8b040' }, RECD: { a: '#1e2a3a' }, WHITE: { a: '#e8e6e0' },
    BINW: { a: '#3a5a42' }, BINWD: { a: '#24382a' },
    WOOD: { a: '#8a6a48' }, WOODD: { a: '#4a3626' }, WOODL: { a: '#b08a60' }, IRON: { a: '#2a2a2e' }, IRONHI: { a: '#5a5a62' },
    BIKE: { a: '#2a6a8a' }, BIKE2: { a: '#a83a3a' }, TYRE: { a: '#141414' }, CHROME: { a: '#b8bcc0' },
    MOPED: { a: '#c8c0a8' }, MOPEDD: { a: '#8a8270' }, BOXR: { a: '#b83a3a' },
    NEWS: { a: '#2a5a8a' }, NEWSW: { a: '#d8d4c8' }, POST: { a: '#b8282a' }, POSTD: { a: '#6a1416' }, GOLD: { a: '#c8a050' },
    METER: { a: '#5a6268' }, METERG: { a: '#8ab0a0', e: '#bfffe0' }, BOLL: { a: '#3a3a40' }, BOLLY: { a: '#d8b040' },
    STONE: { a: '#9a9286' }, STONED: { a: '#6a645a' }, LEAF: { a: '#3e5a32' }, LEAFD: { a: '#2a4224' }, LEAFL: { a: '#6a8a48' }, FLOWR: { a: '#c84a5a' }, FLOWY: { a: '#e8c850' },
    POT: { a: '#9a5a32' }, POTD: { a: '#5a3018' }, TRUNK: { a: '#7a5a3a' }, TRUNKD: { a: '#4a3422' },
    SLATE: { a: '#2a3330' }, CHALK: { a: '#e8e6dc' }, CRATE: { a: '#a07a4a' }, CRATED: { a: '#6a4a2a' }, CARD: { a: '#b8946a' }, CARDD: { a: '#8a6a44' }, TAPE: { a: '#d8c898' },
    CAB: { a: '#7a8278' }, CABD: { a: '#4a524a' }, STICK1: { a: '#e85a5a' }, STICK2: { a: '#5ab0e8' }, STICK3: { a: '#f0d050' },
    ATM: { a: '#4a4e58' }, ATMD: { a: '#262830' }, SCREEN: { a: '#3a5a7a', e: '#9ad8ff' }, KEYS: { a: '#8a8e98' },
    SIGNB: { a: '#2a4a8a' }, SIGNW: { a: '#e8e6e0' }, POLE: { a: '#5a5e62' },
    PARA: { a: '#c83a3a' }, PARAW: { a: '#e8e2d6' }, TABLE: { a: '#3a3a3e' }, CUP: { a: '#f0ece4' },
    TROL: { a: '#9aa0a6' }, TROLD: { a: '#5a6066' }, LAMPW: { a: '#c8c0a8', e: '#fff0c8' }, LAMPB: { a: '#2a2a2e' },
    VEND: { a: '#b83a3a' }, VENDW: { a: '#4a5a6a', e: '#e8f4ff' }, CANS: { a: '#e8c850' },
    // set 2: the bar's kit, and more of the street
    FRIDGE: { a: '#3a4048' }, FRIDGEW: { a: '#5a7a8a', e: '#dff4ff' }, BOTR: { a: '#c8403a' }, BOTG: { a: '#3a9a5a' }, BOTB: { a: '#3a6ac8' }, BOTO: { a: '#e8902a' },
    STEEL: { a: '#9aa2a8' }, STEELD: { a: '#5a6268' }, KNOB: { a: '#c83a3a' }, HOTPLATE: { a: '#2a2a2e' }, SAUCER: { a: '#d8402a' }, MUSTARD: { a: '#e8c030' },
    TVF: { a: '#1a1a1e' }, TVS: { a: '#2a6a4a', e: '#7ae0a0' }, TVL: { a: '#e8e6e0', e: '#ffffff' },
    BOOTH: { a: '#2a5a5e' }, BOOTHD: { a: '#1a3a3e' }, GLASS: { a: '#8eb4bc', see: 0.38 }, GLASSD: { a: '#6a8e98', see: 0.5 }, PHONE: { a: '#2a2a2e' }, BOOTHL: { a: '#e8e0c0', e: '#fff4d0' },
    PAY: { a: '#2a5ab0' }, PAYD: { a: '#1a3a78' }, PAYS: { a: '#4a6a5a', e: '#a8ffd0' },
    DRUMG: { a: '#3a7a4a' }, DRUMGD: { a: '#24502e' }, DRUMB: { a: '#2e6aa8' }, DRUMBD: { a: '#1e4a78' }, RUST: { a: '#8a4a2a' },
    PAPER: { a: '#d8d4c8' }, CAN: { a: '#c83a3a' }, CANS2: { a: '#b8bcc0' }, BOTTLE: { a: '#4a8a5a' },
    ROOF: { a: '#3a3e44' }, AD: { a: '#c8a8d8', e: '#ffe8ff' }, ADD: { a: '#6a4a8a' },
    SUV: { a: '#2a3a5a' }, SUVD: { a: '#1a2438' }, SUVW: { a: '#5a7080' }, SUVL: { a: '#e8e0b0', e: '#fff8d8' }, SUVR: { a: '#a8282a', e: '#ff5040' }, RIM: { a: '#8a9098' }
  };
  function P0(p) { return p; }
  MATS.SHADOW = { a: '#000000', alpha: 0.3 };            // soft shadows on the pavement (drawn see-through)
  // Shading on top of the plain painter. A material can carry a brightness: 'WOOD*1.3' is wood in the light,
  // 'WOOD*0.7' wood in shade. Light comes from the upper left.
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function deep(P) {
    var Q = Object.create(P);
    function k(m, f) { var i = m.indexOf('*'); return (i < 0 ? m : m.slice(0, i)) + '*' + (Math.round((i < 0 ? 1 : +m.slice(i + 1)) * f * 100) / 100); }
    // a dithered vertical gradient, top brightness k0 to bottom k1, in three tones
    Q.grad = function (x, y, w, h, m, k0, k1) {
      for (var r = 0; r < h; r++) for (var c = 0; c < w; c++) {
        var v = (h > 1 ? r / (h - 1) : 0) * 2, lo = Math.floor(v), fr = v - lo, t = Math.min(2, lo + (BAYER[((y + r) & 3) * 4 + ((x + c) & 3)] / 16 < fr ? 1 : 0));
        P.px(x + c, y + r, k(m, k0 + (k1 - k0) * t / 2));
      }
    };
    // a solid seen slightly from above: its top face (d rows), a lit left edge, a shaded right edge, a dark foot.
    // x: left, y: the ground it stands on, w by h: its front face
    Q.block = function (x, y, w, h, d, m) {
      if (d > 0) { P.box(x, y - h - d, w, d, k(m, 1.3)); P.box(x, y - h - d, w, 1, k(m, 1.12)); }
      Q.grad(x, y - h, w, h, m, 1.06, 0.88);
      P.box(x, y - h, w, 1, k(m, 1.18)); P.box(x, y - h, 1, h, k(m, 1.16)); P.box(x + w - 1, y - h, 1, h, k(m, 0.72)); P.box(x, y - 1, w, 1, k(m, 0.6));
    };
    // a cylinder standing up: rounded shading across it, its top as a lit ellipse (d tall)
    Q.cyl = function (x, y, w, h, d, m) {
      for (var c = 0; c < w; c++) {
        var u = (c + 0.5) / w, f = 0.68 + 0.62 * Math.pow(Math.max(0, Math.cos((u - 0.32) * Math.PI)), 0.8);
        P.box(x + c, y - h, 1, h, k(m, Math.round(f * 5) / 5));
      }
      P.box(x, y - 1, w, 1, k(m, 0.6));
      if (d > 0) { P.ellipse(x + w / 2, y - h, w / 2, d / 2 + 0.3, k(m, 1.28)); P.px(x + Math.floor(w * 0.3), y - h - Math.floor(d / 2), k(m, 1.5)); }
    };
    Q.cylBand = function (x, y, w, m) { P.box(x, y, w, 1, m); };
    // glass: reflections running up and to the right, and a bright top edge
    Q.glass = function (x, y, w, h) {
      // faint and broken, so what is behind the glass still reads
      [[0.2, 0], [0.6, 4]].forEach(function (s) {
        for (var r = 0; r < h; r++) { if ((r + s[1]) % 10 > 5) continue; var cx = x + Math.round(w * s[0]) + Math.round((h - r) * 0.45) - Math.round(h * 0.2); if (cx >= x && cx < x + w) P.px(cx, y + r, 'GLASS*1.15'); }
      });
      P.box(x, y, w, 1, 'GLASS*1.25');
    };
    // texture: speckles of a lighter and a darker tone (concrete, grime, plastic), the same every time it is drawn
    function hash(a, b) { var n = (a * 374761393 + b * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
    Q.noise = function (x, y, w, h, m, kLo, kHi, dens) {
      for (var r = 0; r < h; r++) for (var c = 0; c < w; c++) { var v = hash(x + c, y + r); if (v < dens / 2) P.px(x + c, y + r, k(m, kLo)); else if (v < dens) P.px(x + c, y + r, k(m, kHi)); }
    };
    // wood grain: long darker streaks along the boards, with the odd knot
    Q.grain = function (x, y, w, h, m) {
      for (var r = 0; r < h; r++) for (var c = 0; c < w; c++) { var v = hash(Math.floor((x + c) / 5), y + r); if (v < 0.22 && (c + r * 3) % 7 < 5) P.px(x + c, y + r, k(m, 0.82)); }
      for (var q = 0; q < Math.floor(w / 18); q++) { var kx = x + 4 + Math.floor(hash(x + q, y) * (w - 8)), ky = y + Math.floor(hash(y, x + q) * h); P.px(kx, ky, k(m, 0.6)); P.px(kx + 1, ky, k(m, 0.75)); }
    };
    // a hoop round a standing drum: a lit ridge with a shadow under it
    Q.hoop = function (x, y, w, m) { for (var c = 0; c < w; c++) { var u = (c + 0.5) / w, f = 0.7 + 0.7 * Math.max(0, Math.cos((u - 0.32) * Math.PI)); P.px(x + c, y, k(m, Math.round(f * 1.15 * 5) / 5)); P.px(x + c, y + 1, k(m, Math.round(f * 0.7 * 5) / 5)); } };
    // a bigger wheel: tyre wall, tread, five spokes, a brake disc, a glint
    Q.wheelHi = function (cx, cy, r) {
      P.ellipse(cx, cy, r, r, 'TYRE'); P.ellipse(cx, cy, r - 1, r - 1, 'TYRE*1.5'); P.ellipse(cx, cy, r - 2.5, r - 2.5, 'TYRE');
      P.ellipse(cx, cy, r * 0.62, r * 0.62, 'RIM*0.7'); P.ellipse(cx, cy, r * 0.5, r * 0.5, 'STEELD');
      for (var a = 0; a < 5; a++) { var an = a * 1.2566 - 1.57; for (var t = 0.15; t <= 0.62; t += 0.08) P.px(Math.round(cx + Math.cos(an) * r * t), Math.round(cy + Math.sin(an) * r * t), t < 0.4 ? 'RIM*1.2' : 'RIM'); }
      P.ellipse(cx, cy, 1.4, 1.4, 'RIM*1.3'); P.px(cx, cy, 'IRON');
      for (var tr = 0; tr < 12; tr++) { var ta = tr * 0.5236; P.px(Math.round(cx + Math.cos(ta) * (r - 0.5)), Math.round(cy + Math.sin(ta) * (r - 0.5)), 'TYRE*2'); }
      P.px(cx - Math.round(r * 0.3), cy - Math.round(r * 0.4), 'WHITE'); P.px(cx - Math.round(r * 0.35), cy - Math.round(r * 0.35), 'RIM*1.5');
    };
    Q.dither = function (x, y, w, h, m) { for (var r = 0; r < h; r++) for (var c = 0; c < w; c++) if ((x + c + y + r) % 2 === 0) P.px(x + c, y + r, m); };
    Q.shadow = function (cx, y, rx) { P.ellipse(cx, y - 0.5, rx, 1.6, 'SHADOW'); };
    Q.wheel = function (cx, cy, r) {
      P.ellipse(cx, cy, r, r, 'TYRE'); P.ellipse(cx, cy, r * 0.55, r * 0.55, 'RIM');
      for (var a = 0; a < 5; a++) P.px(cx + Math.round(Math.cos(a * 1.257) * r * 0.35), cy + Math.round(Math.sin(a * 1.257) * r * 0.35), 'RIM*0.6');
      P.px(cx, cy, 'IRON'); P.px(cx - Math.round(r * 0.3), cy - Math.round(r * 0.35), 'WHITE');
      P.px(cx - Math.round(r * 0.75), cy - Math.round(r * 0.6), 'TYRE*2.6'); P.px(cx - Math.round(r * 0.55), cy - Math.round(r * 0.8), 'TYRE*2.6');
    };
    return Q;
  }
  // The props: name, what it is, size, and how it paints itself
  var LIST = [
    { id: 'trashcan', name: 'Metal bin', w: 16, h: 24, paint: function (P, x, y) {
      P.box(x + 2, y - 20, 12, 20, 'BINM'); for (var i = 0; i < 3; i++) P.box(x + 2, y - 17 + i * 6, 12, 1, 'BINMD');
      P.box(x + 3, y - 20, 1, 20, 'BINMH'); P.box(x + 1, y - 22, 14, 2, 'BINMD'); P.box(x + 6, y - 24, 4, 2, 'BINMD');
      P.ellipse(x + 13, y - 22, 3, 2, 'BAG'); P.px(x + 12, y - 23, 'BAGHI'); P.px(x + 4, y - 23, 'WHITE'); P.px(x + 5, y - 24, 'WHITE');
    } },
    { id: 'recycling', name: 'Recycling bins', w: 42, h: 24, paint: function (P, x, y) {
      ['RECB', 'RECG', 'RECY'].forEach(function (m, i) { var bx = x + i * 14; P.box(bx, y - 22, 12, 22, m); P.box(bx, y - 22, 12, 2, 'RECD'); P.box(bx + 3, y - 16, 6, 4, 'WHITE'); P.box(bx + 4, y - 15, 4, 2, m); P.box(bx + 1, y - 1, 10, 1, 'RECD'); });
    } },
    { id: 'wheelie', name: 'Wheelie bin, lid up', w: 18, h: 30, paint: function (P, x, y) {
      P.box(x + 1, y - 22, 16, 22, 'BINW'); P.box(x + 1, y - 22, 16, 1, 'BINWD'); P.box(x + 3, y - 14, 12, 1, 'BINWD'); P.poly([[x + 1, y - 23], [x + 17, y - 23], [x + 15, y - 30], [x + 3, y - 30]], 'BINWD');
      P.ellipse(x + 9, y - 24, 5, 2, 'BAG'); P.box(x + 3, y - 2, 3, 2, 'TYRE'); P.box(x + 13, y - 2, 3, 2, 'TYRE');
    } },
    { id: 'bench', name: 'Bench', w: 46, h: 20, paint: function (P, x, y) {
      for (var i = 0; i < 3; i++) P.box(x + 2, y - 18 + i * 4, 42, 2, i === 2 ? 'WOODD' : 'WOOD'); P.box(x + 2, y - 18, 42, 1, 'WOODL');
      P.box(x + 1, y - 8, 44, 2, 'WOOD'); P.box(x + 1, y - 8, 44, 1, 'WOODL');
      [x + 4, x + 38].forEach(function (lx) { P.box(lx, y - 19, 3, 19, 'IRON'); P.box(lx - 1, y - 1, 5, 1, 'IRON'); P.px(lx, y - 19, 'IRONHI'); });
    } },
    { id: 'bikerack', name: 'Bike rack with two bikes', w: 54, h: 24, paint: function (P, x, y) {
      [x + 6, x + 22, x + 38].forEach(function (rx) { P.line(rx, y, rx, y - 12, 'IRON'); P.line(rx + 10, y, rx + 10, y - 12, 'IRON'); P.line(rx, y - 12, rx + 10, y - 12, 'IRON'); });
      [[x + 8, 'BIKE'], [x + 30, 'BIKE2']].forEach(function (b) { var bx = b[0];
        [[bx, y - 8], [bx + 18, y - 8]].forEach(function (w) { for (var a = 0; a < 24; a++) { var an = a / 24 * Math.PI * 2; P.px(w[0] + Math.round(Math.cos(an) * 6), w[1] + Math.round(Math.sin(an) * 6), 'TYRE'); } P.px(w[0], w[1], 'CHROME'); });
        P.line(bx, y - 8, bx + 7, y - 16, b[1]); P.line(bx + 7, y - 16, bx + 15, y - 16, b[1]); P.line(bx + 15, y - 16, bx + 18, y - 8, b[1]); P.line(bx + 7, y - 16, bx + 9, y - 8, b[1]); P.line(bx + 9, y - 8, bx, y - 8, b[1]);
        P.box(bx + 4, y - 19, 6, 2, 'IRON'); P.line(bx + 15, y - 16, bx + 16, y - 20, 'CHROME'); P.box(bx + 14, y - 21, 5, 1, 'IRON'); });
    } },
    { id: 'moped', name: 'Parked scooter', w: 38, h: 26, paint: function (P, x, y) {
      [[x + 7, y - 5], [x + 30, y - 5]].forEach(function (w) { P.ellipse(w[0], w[1], 5, 5, 'TYRE'); P.ellipse(w[0], w[1], 2, 2, 'CHROME'); });
      P.poly([[x + 4, y - 10], [x + 26, y - 10], [x + 30, y - 6], [x + 4, y - 6]], 'MOPED'); P.box(x + 8, y - 14, 14, 4, 'MOPEDD'); P.box(x + 8, y - 15, 14, 1, 'IRON');
      P.poly([[x + 24, y - 10], [x + 28, y - 22], [x + 31, y - 22], [x + 29, y - 9]], 'MOPED'); P.box(x + 27, y - 24, 7, 2, 'IRON'); P.box(x + 2, y - 22, 9, 8, 'BOXR'); P.box(x + 2, y - 22, 9, 1, 'POSTD');
    } },
    { id: 'newsbox', name: 'Newspaper box', w: 16, h: 26, paint: function (P, x, y) {
      P.box(x + 1, y - 26, 14, 18, 'NEWS'); P.box(x + 3, y - 23, 10, 8, 'NEWSW'); for (var i = 0; i < 3; i++) P.box(x + 4, y - 22 + i * 2, 8, 1, 'RECD');
      P.box(x + 3, y - 13, 10, 2, 'RECD'); P.box(x + 3, y - 8, 2, 8, 'IRON'); P.box(x + 11, y - 8, 2, 8, 'IRON');
    } },
    { id: 'postbox', name: 'Post box', w: 14, h: 30, paint: function (P, x, y) {
      P.box(x + 2, y - 26, 10, 24, 'POST'); P.ellipse(x + 7, y - 26, 5, 3, 'POST'); P.box(x + 4, y - 21, 6, 1, 'POSTD'); P.box(x + 5, y - 17, 4, 3, 'GOLD'); P.box(x + 1, y - 2, 12, 2, 'POSTD');
    } },
    { id: 'meter', name: 'Parking meter', w: 8, h: 32, paint: function (P, x, y) {
      P.box(x + 3, y - 22, 2, 22, 'POLE'); P.box(x + 1, y - 32, 6, 10, 'METER'); P.box(x + 2, y - 30, 4, 3, 'METERG'); P.box(x + 2, y - 25, 4, 1, 'IRON');
    } },
    { id: 'bollards', name: 'Bollards', w: 40, h: 14, paint: function (P, x, y) {
      [x + 4, x + 18, x + 32].forEach(function (bx) { P.box(bx, y - 13, 5, 13, 'BOLL'); P.ellipse(bx + 2, y - 13, 2.5, 1.5, 'BOLL'); P.box(bx, y - 10, 5, 2, 'BOLLY'); });
    } },
    { id: 'planter', name: 'Planter with shrubs', w: 42, h: 22, paint: function (P, x, y) {
      P.box(x + 1, y - 10, 40, 10, 'STONE'); P.box(x + 1, y - 10, 40, 1, 'STONED'); P.box(x + 1, y - 1, 40, 1, 'STONED');
      [[x + 8, 7], [x + 20, 8], [x + 32, 7]].forEach(function (s) { P.ellipse(s[0], y - 14, s[1], 6, 'LEAF'); P.ellipse(s[0] - 2, y - 15, s[1] * 0.5, 3, 'LEAFL'); P.px(s[0] + 3, y - 12, 'LEAFD'); });
      [[x + 6, 'FLOWR'], [x + 19, 'FLOWY'], [x + 34, 'FLOWR']].forEach(function (f) { P.px(f[0], y - 18, f[1]); P.px(f[0] + 4, y - 16, f[1]); });
    } },
    { id: 'tree', name: 'Small tree in a pot', w: 30, h: 66, paint: function (P, x, y) {
      P.poly([[x + 8, y - 14], [x + 22, y - 14], [x + 20, y], [x + 10, y]], 'POT'); P.box(x + 7, y - 15, 16, 2, 'POTD');
      P.box(x + 14, y - 44, 3, 30, 'TRUNK'); P.box(x + 14, y - 44, 1, 30, 'TRUNKD');
      P.ellipse(x + 15, y - 52, 13, 12, 'LEAF'); P.ellipse(x + 10, y - 56, 6, 5, 'LEAFL'); P.ellipse(x + 20, y - 48, 6, 5, 'LEAFD'); P.px(x + 16, y - 60, 'LEAFL');
    } },
    { id: 'aframe', name: 'A-frame chalk sign', w: 18, h: 24, paint: function (P, x, y) {
      P.poly([[x + 4, y - 24], [x + 14, y - 24], [x + 17, y], [x + 1, y]], 'WOOD'); P.poly([[x + 5, y - 22], [x + 13, y - 22], [x + 15, y - 3], [x + 3, y - 3]], 'SLATE');
      P.box(x + 6, y - 19, 6, 1, 'CHALK'); P.box(x + 5, y - 15, 8, 1, 'CHALK'); P.box(x + 6, y - 12, 5, 1, 'CHALK'); P.box(x + 5, y - 8, 7, 1, 'CHALK');
    } },
    { id: 'crates', name: 'Crates on a pallet', w: 36, h: 26, paint: function (P, x, y) {
      P.box(x, y - 3, 36, 3, 'CRATED'); P.box(x + 2, y - 2, 4, 2, 'WOODD'); P.box(x + 16, y - 2, 4, 2, 'WOODD'); P.box(x + 30, y - 2, 4, 2, 'WOODD');
      [[x + 1, y - 13], [x + 18, y - 13], [x + 9, y - 23]].forEach(function (c) { P.box(c[0], c[1], 16, 10, 'CRATE'); P.box(c[0], c[1] + 3, 16, 1, 'CRATED'); P.box(c[0], c[1] + 7, 16, 1, 'CRATED'); P.box(c[0], c[1], 1, 10, 'CRATED'); });
    } },
    { id: 'boxes', name: 'Delivery boxes', w: 28, h: 20, paint: function (P, x, y) {
      [[x, y - 10, 14, 10], [x + 13, y - 8, 14, 8], [x + 4, y - 19, 12, 9]].forEach(function (b) { P.box(b[0], b[1], b[2], b[3], 'CARD'); P.box(b[0], b[1], b[2], 1, 'CARDD'); P.box(b[0] + Math.floor(b[2] / 2), b[1], 1, b[3], 'TAPE'); });
    } },
    { id: 'cabinet', name: 'Utility cabinet with stickers', w: 24, h: 32, paint: function (P, x, y) {
      P.box(x + 1, y - 32, 22, 32, 'CAB'); P.box(x + 1, y - 32, 22, 2, 'CABD'); P.box(x + 11, y - 30, 1, 28, 'CABD'); P.box(x + 8, y - 18, 2, 3, 'CABD');
      P.box(x + 3, y - 26, 5, 3, 'STICK1'); P.box(x + 14, y - 22, 6, 4, 'STICK2'); P.box(x + 4, y - 12, 4, 4, 'STICK3'); P.box(x + 15, y - 10, 5, 2, 'WHITE');
    } },
    { id: 'atm', name: 'Cash machine in the wall', w: 24, h: 38, paint: function (P, x, y) {
      P.box(x, y - 38, 24, 30, 'ATM'); P.box(x + 3, y - 34, 18, 10, 'ATMD'); P.box(x + 4, y - 33, 16, 8, 'SCREEN');
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) P.box(x + 5 + c * 4, y - 21 + r * 3, 3, 2, 'KEYS'); P.box(x + 18, y - 21, 3, 8, 'ATMD');
    } },
    { id: 'busstop', name: 'Bus stop sign', w: 18, h: 66, paint: function (P, x, y) {
      P.box(x + 8, y - 62, 2, 62, 'POLE'); P.ellipse(x + 9, y - 58, 8, 8, 'SIGNB'); P.ellipse(x + 9, y - 58, 6, 6, 'SIGNW'); P.box(x + 5, y - 60, 8, 4, 'SIGNB');
      P.box(x + 3, y - 44, 12, 10, 'SIGNW'); P.box(x + 4, y - 42, 10, 1, 'RECD'); P.box(x + 4, y - 39, 8, 1, 'RECD'); P.box(x + 4, y - 36, 9, 1, 'RECD');
    } },
    { id: 'cafe', name: 'Cafe table and chairs', w: 46, h: 46, paint: function (P, x, y) {
      P.box(x + 22, y - 44, 2, 44, 'TABLE'); P.poly([[x + 3, y - 36], [x + 23, y - 46], [x + 43, y - 36]], 'PARA'); for (var i = 0; i < 4; i++) P.poly([[x + 8 + i * 10, y - 36], [x + 13 + i * 10, y - 37], [x + 13 + i * 10, y - 36]], 'PARAW');
      P.box(x + 14, y - 16, 18, 2, 'TABLE'); P.box(x + 22, y - 14, 2, 14, 'TABLE'); P.box(x + 18, y - 1, 10, 1, 'TABLE'); P.box(x + 17, y - 19, 3, 3, 'CUP');
      [[x + 4, 1], [x + 36, -1]].forEach(function (c) { var cx = c[0]; P.box(cx, y - 10, 7, 2, 'IRON'); P.box(cx + (c[1] > 0 ? 0 : 6), y - 20, 1, 10, 'IRON'); P.box(cx, y - 8, 1, 8, 'IRON'); P.box(cx + 6, y - 8, 1, 8, 'IRON'); });
    } },
    { id: 'trolley', name: 'Shopping trolley', w: 26, h: 22, paint: function (P, x, y) {
      P.poly([[x + 2, y - 20], [x + 22, y - 20], [x + 20, y - 8], [x + 5, y - 8]], 'TROLD'); for (var i = 0; i < 6; i++) P.box(x + 4 + i * 3, y - 19, 1, 10, 'TROL'); for (var j = 0; j < 3; j++) P.box(x + 3, y - 17 + j * 3, 18, 1, 'TROL');
      P.line(x + 22, y - 20, x + 25, y - 22, 'TROLD'); P.box(x + 5, y - 7, 14, 1, 'TROLD'); P.box(x + 5, y - 2, 2, 2, 'TYRE'); P.box(x + 17, y - 2, 2, 2, 'TYRE');
    } },
    { id: 'vending', name: 'Drinks machine', w: 22, h: 42, paint: function (P, x, y) {
      P.box(x, y - 42, 22, 42, 'VEND'); P.box(x + 3, y - 38, 16, 18, 'VENDW'); for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) P.box(x + 4 + c * 4, y - 36 + r * 5, 2, 3, r === 1 ? 'CANS' : 'WHITE');
      P.box(x + 4, y - 16, 8, 2, 'IRON'); P.box(x + 3, y - 9, 16, 5, 'IRON');
    } },
    { id: 'sconce', name: 'Wall lamp', w: 10, h: 12, paint: function (P, x, y) { P.box(x + 4, y - 12, 2, 4, 'LAMPB'); P.box(x + 1, y - 8, 8, 2, 'LAMPB'); P.box(x + 2, y - 6, 6, 5, 'LAMPW'); P.box(x + 3, y - 1, 4, 1, 'LAMPB'); } },

    // ---------- Set 2: ideas from the Street Settings pack, drawn our own way, shaded in 2.5D ----------
    // Light comes from the upper left. Every solid shows a sliver of its top (lighter), a lit left edge, a shaded
    // right edge and a dark line where it meets the ground, and casts a soft shadow on the pavement.
    // scale: 'bar' props sit inside Татьяна's Bar (its people are 36 px tall); 'street' props stand by the 70 px walkers.
    { id: 'fridge', set: 2, scale: 'bar', name: 'Drinks fridge, lit', w: 24, h: 42, paint: function (P, x, y) {
      var Q = deep(P); Q.shadow(x + 11, y, 13);
      Q.block(x, y, 22, 38, 3, 'FRIDGE'); Q.noise(x + 1, y - 38, 20, 38, 'FRIDGE', 0.9, 1.1, 0.08);
      Q.box(x + 2, y - 36, 18, 3, 'SIGNB'); Q.box(x + 4, y - 35, 8, 1, 'SIGNW*0.9'); Q.px(x + 16, y - 35, 'KNOB*1.3'); Q.px(x + 18, y - 35, 'FLOWY');
      Q.grad(x + 2, y - 32, 18, 26, 'FRIDGEW', 1.15, 0.8);
      var C = ['BOTR', 'BOTG', 'BOTB', 'BOTO', 'CANS', 'BOTG'];
      for (var r = 0; r < 4; r++) {
        var sy = y - 26 + r * 6;
        Q.box(x + 2, sy, 18, 1, 'STEEL*1.1'); Q.box(x + 2, sy + 1, 18, 1, 'FRIDGE*1.2');
        for (var c = 0; c < 6; c++) { var m = C[(r * 2 + c) % 6], bh = r % 2 ? 3 : 4; Q.box(x + 3 + c * 3, sy - bh, 2, bh, m); Q.px(x + 3 + c * 3, sy - bh, m + '*1.5'); Q.px(x + 4 + c * 3, sy - 1, m + '*0.7'); if (!(r % 2)) Q.px(x + 3 + c * 3, sy - bh - 1, 'STEELD'); if (c === 2) Q.px(x + 4 + c * 3, sy - 2, 'WHITE'); }
      }
      Q.glass(x + 2, y - 32, 18, 26);
      Q.box(x + 19, y - 24, 1, 10, 'CHROME'); Q.px(x + 19, y - 24, 'WHITE');
      Q.box(x + 1, y - 5, 20, 4, 'FRIDGE*0.75'); for (var v = 0; v < 6; v++) Q.box(x + 3 + v * 3, y - 4, 2, 1, 'IRON');
      Q.box(x + 3, y - 30, 3, 2, 'STICK1'); Q.px(x + 3, y - 30, 'STICK1*1.3');
    } },
    { id: 'coffee', set: 2, scale: 'bar', name: 'Coffee machine with cups', w: 24, h: 22, paint: function (P, x, y) {
      var Q = deep(P); Q.shadow(x + 9, y, 10);
      Q.block(x + 1, y, 16, 15, 2, 'STEEL'); Q.noise(x + 2, y - 15, 14, 3, 'STEEL', 0.9, 1.15, 0.3);
      for (var i = 0; i < 3; i++) Q.cyl(x + 3 + i * 4, y - 17, 3, 2, 1, 'CUP');
      Q.box(x + 3, y - 13, 12, 4, 'IRON'); Q.px(x + 4, y - 12, 'METERG'); Q.px(x + 6, y - 12, 'METERG'); Q.box(x + 9, y - 12, 5, 2, 'SCREEN');
      [x + 4, x + 11].forEach(function (gx) { Q.box(gx, y - 8, 3, 2, 'STEELD'); Q.px(gx, y - 8, 'STEEL*1.4'); Q.px(gx + 1, y - 6, 'POTD'); });
      Q.cyl(x + 4, y - 1, 3, 3, 1, 'CUP'); Q.box(x + 3, y - 1, 12, 1, 'STEELD'); for (var g = 0; g < 6; g++) Q.px(x + 3 + g * 2, y - 1, 'STEEL*1.3');
      Q.cyl(x + 18, y, 4, 4, 1, 'CUP'); Q.cyl(x + 18, y - 5, 4, 4, 1, 'CUP');
      Q.px(x + 2, y - 14, 'WHITE'); Q.px(x + 5, y - 6, 'CUP*0.9'); Q.px(x + 5, y - 7, 'CUP*0.8');   // a thread of steam
    } },
    { id: 'grill', set: 2, scale: 'bar', name: 'Flat-top grill', w: 32, h: 16, paint: function (P, x, y) {
      var Q = deep(P); Q.shadow(x + 15, y, 16);
      Q.box(x + 1, y - 16, 28, 4, 'STEEL*0.85'); Q.box(x + 1, y - 16, 28, 1, 'STEEL*1.2'); Q.noise(x + 1, y - 15, 28, 3, 'STEEL', 0.75, 1.1, 0.2);
      Q.block(x, y, 30, 9, 4, 'STEEL');
      Q.box(x + 1, y - 12, 28, 3, 'HOTPLATE'); Q.box(x + 3, y - 12, 10, 1, 'HOTPLATE*1.8');
      [x + 6, x + 13, x + 21].forEach(function (fx, i) { var fm = i === 1 ? 'POT' : 'POTD'; Q.box(fx, y - 12, 5, 2, fm); Q.box(fx, y - 12, 5, 1, fm + '*1.4'); Q.px(fx + 1, y - 13, 'CUP*0.7'); });
      for (var k = 0; k < 4; k++) { Q.box(x + 3 + k * 7, y - 6, 3, 3, 'STEELD'); Q.px(x + 4 + k * 7, y - 5, 'KNOB'); Q.px(x + 3 + k * 7, y - 6, 'STEEL*1.4'); }
      Q.box(x + 1, y - 2, 28, 1, 'STEELD');
    } },
    { id: 'condiments', set: 2, scale: 'bar', name: 'Sauce bottles and napkins', w: 20, h: 13, paint: function (P, x, y) {
      var Q = deep(P);
      Q.cyl(x + 1, y, 3, 8, 1, 'SAUCER'); Q.box(x + 2, y - 10, 1, 2, 'WHITE'); Q.px(x + 2, y - 11, 'SAUCER*0.7'); Q.px(x + 1, y - 5, 'WHITE');
      Q.cyl(x + 5, y, 3, 8, 1, 'MUSTARD'); Q.box(x + 6, y - 10, 1, 2, 'WHITE'); Q.px(x + 6, y - 11, 'MUSTARD*0.7'); Q.px(x + 5, y - 5, 'WHITE');
      Q.block(x + 10, y, 8, 6, 2, 'STEEL'); Q.box(x + 11, y - 9, 6, 3, 'PAPER'); Q.box(x + 11, y - 9, 6, 1, 'PAPER*1.1'); Q.px(x + 16, y - 7, 'PAPER*0.8');
    } },
    { id: 'menuboard', set: 2, scale: 'bar', name: 'Chalk menu board with a clip-on lamp', w: 26, h: 34, paint: function (P, x, y) {
      var Q = deep(P);
      Q.box(x + 11, y - 34, 2, 4, 'IRON'); Q.box(x + 7, y - 31, 10, 2, 'LAMPB'); Q.box(x + 8, y - 29, 8, 1, 'LAMPW');
      Q.block(x, y, 24, 28, 2, 'WOOD'); Q.grain(x, y - 28, 24, 28, 'WOOD');
      Q.grad(x + 3, y - 25, 18, 22, 'SLATE', 1.25, 0.8); Q.noise(x + 3, y - 25, 18, 22, 'SLATE', 0.85, 1.2, 0.12);
      var L = [13, 9, 15, 7, 12, 10];
      for (var r = 0; r < 6; r++) { Q.box(x + 5, y - 22 + r * 3, L[r], 1, 'CHALK'); Q.px(x + 5 + L[r], y - 22 + r * 3, 'CHALK*0.6'); Q.box(x + 18, y - 22 + r * 3, 2, 1, r % 2 ? 'FLOWY' : 'CHALK*0.85'); }
      Q.box(x + 6, y - 5, 4, 1, 'CHALK*0.5'); Q.px(x + 12, y - 6, 'CHALK*0.4');
    } },
    { id: 'walltv', set: 2, scale: 'bar', name: 'TV on a wall bracket, a match on', w: 28, h: 24, paint: function (P, x, y) {
      var Q = deep(P);
      Q.box(x + 11, y - 22, 4, 5, 'IRON'); Q.box(x + 11, y - 22, 1, 5, 'IRONHI');
      Q.block(x, y - 2, 26, 15, 2, 'TVF');
      Q.grad(x + 1, y - 16, 24, 12, 'TVS', 1.25, 0.85);
      for (var st = 0; st < 4; st++) Q.box(x + 1 + st * 6, y - 16, 3, 12, 'TVS*1.08');
      Q.box(x + 12, y - 16, 1, 12, 'TVL'); Q.box(x + 1, y - 10, 24, 1, 'TVL*0.9'); Q.box(x + 10, y - 12, 5, 5, 'TVS*0.95'); Q.frame(x + 10, y - 12, 5, 5, 'TVL*0.9');
      Q.px(x + 6, y - 13, 'BOXR'); Q.px(x + 18, y - 8, 'BOXR'); Q.px(x + 15, y - 14, 'SIGNB*1.5'); Q.px(x + 8, y - 7, 'SIGNB*1.5'); Q.px(x + 14, y - 9, 'WHITE');
      Q.box(x + 2, y - 15, 6, 2, 'TVF'); Q.px(x + 3, y - 14, 'TVL'); Q.px(x + 5, y - 14, 'TVL');
      Q.line(x + 16, y - 16, x + 22, y - 5, 'TVL*0.5');
      Q.box(x + 20, y - 2, 1, 2, 'IRON');
    } },

    // ----- On the street, at true size (a 70 px person is about 1.75 m, so 1 px is about 2.5 cm) -----
    { id: 'phonebox', set: 2, scale: 'street', name: 'Phone box', w: 46, h: 100, paint: function (P, x, y) {
      var Q = deep(P); Q.shadow(x + 22, y, 24);
      Q.block(x, y, 44, 5, 3, 'STONE'); Q.noise(x, y - 8, 44, 8, 'STONE', 0.8, 1.15, 0.22);          // the plinth
      Q.box(x + 3, y - 87, 38, 82, 'BOOTH');
      Q.grad(x + 9, y - 84, 26, 76, 'IRON', 1.6, 1.38);             // the dim inside
      Q.block(x + 11, y - 52, 7, 12, 1, 'AD*0.8'); Q.box(x + 12, y - 61, 5, 3, 'ADD'); Q.box(x + 12, y - 57, 4, 1, 'ADD');   // a faded poster
      Q.block(x + 22, y - 44, 12, 18, 2, 'STEELD');                 // the phone unit
      Q.box(x + 24, y - 60, 8, 3, 'IRON'); Q.grad(x + 25, y - 59, 6, 1, 'PAYS', 1.2, 1.2);
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) { Q.px(x + 25 + c * 2, y - 55 + r * 2, 'KEYS*1.3'); }
      Q.cyl(x + 19, y - 42, 3, 14, 0, 'PHONE'); Q.px(x + 19, y - 55, 'IRONHI');
      for (var k = 0; k < 6; k++) Q.px(x + 20 + (k % 2), y - 41 + k, 'PHONE');
      Q.block(x + 20, y - 30, 16, 2, 2, 'STEELD'); Q.block(x + 22, y - 32, 10, 3, 1, 'CRATE'); Q.box(x + 22, y - 33, 10, 1, 'CRATE*1.3');   // shelf, directory
      Q.glass(x + 9, y - 84, 26, 76);
      Q.box(x + 9, y - 84, 26, 1, 'BOOTH'); [y - 62, y - 40, y - 18].forEach(function (gy) { Q.box(x + 9, gy, 26, 1, 'BOOTH*1.15'); Q.box(x + 9, gy + 1, 26, 1, 'BOOTH*0.7'); });
      Q.box(x + 22, y - 84, 1, 76, 'BOOTH');
      Q.box(x + 9, y - 14, 26, 6, 'BOOTH'); Q.grad(x + 9, y - 13, 26, 5, 'BOOTH', 1.05, 0.8);        // kick plate
      Q.cyl(x + 3, y - 5, 6, 82, 0, 'BOOTH'); Q.cyl(x + 35, y - 5, 6, 82, 0, 'BOOTH');               // corner posts
      Q.noise(x + 3, y - 22, 6, 17, 'BOOTH', 0.6, 1.0, 0.25); Q.noise(x + 35, y - 22, 6, 17, 'BOOTH', 0.6, 1.0, 0.25);   // grime low down
      Q.box(x + 4, y - 40, 3, 4, 'STICK1'); Q.box(x + 5, y - 34, 3, 3, 'STICK3'); Q.px(x + 4, y - 40, 'STICK1*1.3');
      Q.box(x + 32, y - 54, 2, 14, 'CHROME'); Q.px(x + 32, y - 54, 'WHITE'); Q.px(x + 33, y - 41, 'CHROME*0.6');   // door handle
      Q.block(x, y - 87, 44, 7, 4, 'BOOTHD');                       // the crown
      Q.box(x + 6, y - 93, 32, 5, 'BOOTHL'); Q.box(x + 6, y - 93, 32, 1, 'BOOTHL*1.1');
      Q.box(x + 18, y - 92, 2, 3, 'BOOTHD'); Q.box(x + 20, y - 92, 4, 1, 'BOOTHD'); Q.box(x + 24, y - 92, 2, 3, 'BOOTHD');   // a handset icon
      Q.block(x + 4, y - 94, 36, 3, 2, 'BOOTH');
    } },
    { id: 'payphone', set: 2, scale: 'street', name: 'Payphone on a post', w: 30, h: 84, paint: function (P, x, y) {
      var Q = deep(P); Q.shadow(x + 13, y, 9);
      Q.block(x + 6, y, 14, 3, 2, 'POLE'); Q.px(x + 7, y - 4, 'IRONHI'); Q.px(x + 18, y - 4, 'IRONHI');
      Q.cyl(x + 10, y - 3, 6, 44, 0, 'POLE'); Q.box(x + 10, y - 32, 6, 3, 'STICK3'); Q.px(x + 10, y - 32, 'STICK3*1.3'); Q.noise(x + 10, y - 14, 6, 11, 'POLE', 0.65, 1.1, 0.3);
      Q.block(x + 3, y - 47, 20, 2, 2, 'PAYD');                     // the shelf
      Q.block(x + 2, y - 49, 22, 25, 1, 'PAY');                     // the box
      Q.box(x + 2, y - 64, 22, 1, 'SIGNW'); Q.box(x + 2, y - 63, 22, 1, 'PAY*0.7');
      Q.box(x + 5, y - 72, 13, 6, 'IRON'); Q.grad(x + 6, y - 71, 11, 4, 'PAYS', 1.25, 0.9); Q.px(x + 7, y - 70, 'PAYS*0.7'); Q.px(x + 9, y - 70, 'PAYS*0.7');
      for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) { var kx = x + 6 + c * 4, ky = y - 61 + r * 3; Q.box(kx, ky, 2, 2, 'KEYS'); Q.px(kx, ky, 'KEYS*1.4'); Q.px(kx + 1, ky + 1, 'KEYS*0.6'); }
      Q.box(x + 18, y - 60, 3, 1, 'IRON'); Q.box(x + 18, y - 56, 3, 1, 'IRON'); Q.box(x + 17, y - 53, 5, 3, 'IRON'); Q.box(x + 17, y - 53, 5, 1, 'CHROME');
      Q.box(x + 24, y - 72, 2, 12, 'PAYD');                         // the cradle
      Q.cyl(x + 24, y - 54, 4, 16, 0, 'PHONE'); Q.ellipse(x + 26, y - 70, 2.5, 1.6, 'PHONE'); Q.ellipse(x + 26, y - 55, 2.5, 1.6, 'PHONE'); Q.px(x + 25, y - 69, 'IRONHI');
      for (var q = 0; q < 7; q++) Q.px(x + 25 - Math.round(q * 0.4), y - 53 + q, q % 2 ? 'CHROME' : 'CHROME*0.6');   // the armoured cord
      Q.block(x, y - 74, 28, 3, 4, 'PAYD'); Q.box(x + 1, y - 74, 26, 1, 'PAYD*0.6');                     // the hood
    } },
    { id: 'drums', set: 2, scale: 'street', name: 'Oil drums, one on its side, and a stain', w: 92, h: 44, paint: function (P, x, y) {
      var Q = deep(P); Q.shadow(x + 44, y, 44);
      Q.ellipse(x + 62, y - 0.5, 16, 2.5, 'SHADOW'); Q.px(x + 56, y - 1, 'SUVW*1.4'); Q.px(x + 66, y - 1, 'BOTB*1.2'); Q.px(x + 71, y - 2, 'FLOWY*0.8');   // oil, with a sheen
      [[x, 'DRUMG'], [x + 26, 'DRUMB']].forEach(function (d, j) {
        var dx = d[0], m = d[1];
        Q.cyl(dx, y, 24, 36, 6, m);
        Q.ellipse(dx + 12, y - 36, 10.5, 2.2, m + '*0.85'); Q.ellipse(dx + 12, y - 36.5, 9.5, 1.5, m + '*1.05');   // the lid inside its rim
        Q.cyl(dx + 15, y - 36, 3, 1, 1, 'STEEL'); Q.px(dx + 6, y - 37, 'STEEL*0.8');                          // bung caps
        Q.hoop(dx, y - 25, 24, m); Q.hoop(dx, y - 13, 24, m);
        Q.box(dx + 6, y - 22, 12, 6, m + '*1.3'); Q.frame(dx + 6, y - 22, 12, 6, m + '*0.8');                // a stencilled panel
        Q.poly([[dx + 12, y - 21], [dx + 14, y - 19], [dx + 12, y - 17], [dx + 10, y - 19]], j ? 'FLOWY' : 'BOXR');
        for (var s = 0; s < 3; s++) { var sx = dx + 4 + Math.floor((s * 7 + j * 3) % 18), len = 2 + (s * 3 + j) % 5; Q.box(sx, y - 35, 1, len, 'RUST*1.15'); Q.px(sx, y - 35 + len, 'RUST'); }   // rust runs
        Q.ellipse(dx + 17 - j * 9, y - 7, 2.5, 2, m + '*0.7'); Q.px(dx + 16 - j * 9, y - 9, m + '*1.4');     // a dent
      });
      [[5, -30], [6, -29], [8, -29], [6, -27], [3, -8], [4, -8], [4, -7], [44, -5], [45, -5], [46, -4], [30, -31]].forEach(function (q) { Q.px(x + q[0], y + q[1], 'RUST'); });
      // the one on its side: rings round it, its end towards us
      var lx = x + 54;
      Q.grad(lx, y - 24, 32, 24, 'DRUMG', 1.3, 0.62);
      [lx + 10, lx + 21].forEach(function (rx) { Q.box(rx, y - 24, 1, 24, 'DRUMG*1.2'); Q.box(rx + 1, y - 24, 1, 24, 'DRUMG*0.65'); });
      Q.ellipse(lx + 32, y - 12, 5.5, 12, 'DRUMG*0.95'); Q.ellipse(lx + 32, y - 12, 4.2, 10.4, 'DRUMG*0.72'); Q.ellipse(lx + 32, y - 12, 3.4, 9, 'DRUMG*0.82');
      Q.px(lx + 33, y - 17, 'STEEL'); Q.px(lx + 32, y - 6, 'STEEL*0.8'); Q.box(lx, y - 24, 32, 1, 'DRUMG*1.45');
      Q.box(lx, y - 1, 32, 1, 'IRON*1.3'); Q.box(lx + 4, y - 14, 4, 3, 'RUST*0.9'); Q.px(lx + 5, y - 15, 'RUST');
    } },
    { id: 'pallets', set: 2, scale: 'street', name: 'Pallets and a broken plastic chair', w: 86, h: 46, paint: function (P, x, y) {
      var Q = deep(P); Q.shadow(x + 40, y, 42);
      for (var i = 0; i < 3; i++) {
        var px0 = x + i * 2, py = y - i * 8, wm = i % 2 ? 'WOODL' : 'WOOD';
        [0, 23, 46].forEach(function (b) { Q.block(px0 + b, py, 5, 4, 0, 'WOODD'); Q.grain(px0 + b, py - 4, 5, 4, 'WOODD'); });
        Q.block(px0, py - 4, 51, 3, 3, wm); Q.grain(px0, py - 7, 51, 3, wm);
        for (var g = 1; g < 6; g++) Q.box(px0 + g * 9 - 1, py - 10, 1, 3, 'WOODD*0.8');   // gaps between the deck boards
        for (var n = 0; n < 6; n++) Q.px(px0 + 3 + n * 9, py - 9, 'IRONHI');
      }
      Q.poly([[x + 8, y - 26], [x + 30, y - 38], [x + 32, y - 35], [x + 10, y - 23]], 'WOODL'); Q.line(x + 9, y - 25, x + 30, y - 37, 'WOODL*1.25'); Q.px(x + 20, y - 31, 'IRONHI');   // a board come loose
      // the chair: white plastic, on its back legs, one leg snapped
      var cx = x + 60;
      Q.block(cx, y - 14, 20, 2, 5, 'PARAW'); Q.noise(cx, y - 21, 20, 5, 'PARAW', 0.92, 1.05, 0.15);
      Q.box(cx + 1, y - 14, 2, 14, 'PARAW*0.9'); Q.box(cx + 1, y - 14, 1, 14, 'PARAW*1.05');
      Q.box(cx + 16, y - 14, 2, 7, 'PARAW*0.8'); Q.line(cx + 17, y - 7, cx + 21, y - 1, 'PARAW*0.75'); Q.px(cx + 16, y - 7, 'PARAW*0.6');
      Q.block(cx + 15, y - 21, 6, 22, 1, 'PARAW'); for (var sl = 0; sl < 3; sl++) Q.box(cx + 16, y - 39 + sl * 6, 4, 2, 'PARAW*0.55');
    } },
    { id: 'litter', set: 2, scale: 'street', name: 'Litter: cans, a cup, a crisp packet, paper, butts', w: 64, h: 9, paint: function (P, x, y) {
      var Q = deep(P);
      Q.ellipse(x + 31, y - 0.5, 30, 1.6, 'SHADOW');
      Q.cyl(x + 1, y, 5, 3, 0, 'CAN'); Q.px(x + 1, y - 3, 'CANS2'); Q.px(x + 2, y - 2, 'CAN*1.4');
      Q.cyl(x + 9, y, 4, 7, 2, 'CUP'); Q.box(x + 9, y - 8, 4, 1, 'IRON*1.6'); Q.line(x + 12, y - 9, x + 14, y - 12, 'KNOB');   // a cup, lid and straw
      Q.box(x + 17, y - 2, 7, 2, 'PAPER'); Q.px(x + 18, y - 3, 'PAPER*1.15'); Q.px(x + 21, y - 1, 'PAPER*0.75'); Q.px(x + 23, y - 3, 'PAPER*0.9');
      Q.poly([[x + 27, y - 1], [x + 29, y - 4], [x + 35, y - 3], [x + 34, y]], 'BOTO'); Q.px(x + 30, y - 3, 'WHITE'); Q.px(x + 32, y - 2, 'BOTO*0.7');   // a crisp packet
      Q.box(x + 38, y - 3, 8, 3, 'BOTTLE'); Q.box(x + 46, y - 2, 3, 1, 'BOTTLE*0.8'); Q.px(x + 39, y - 3, 'WHITE'); Q.px(x + 40, y - 3, 'BOTTLE*1.5');
      Q.cyl(x + 51, y, 4, 2, 0, 'CANS2'); [[56, 'WHITE'], [58, 'WHITE'], [61, 'WHITE']].forEach(function (b) { Q.px(x + b[0], y - 1, b[1]); Q.px(x + b[0] + 1, y - 1, 'BOTO'); });
      Q.px(x + 25, y - 1, 'LEAFL'); Q.px(x + 26, y - 1, 'LEAF');
    } },
    { id: 'shelter', set: 2, scale: 'street', name: 'Bus shelter with a lit poster', w: 168, h: 112, paint: function (P, x, y) {
      var Q = deep(P);
      for (var sr = 0; sr < 6; sr++) Q.box(x + 4 + sr, y - 6 + sr, 158 - sr * 2, 1, 'SHADOW');   // the roof's shade on the pavement
      Q.cyl(x + 4, y, 5, 98, 0, 'POLE'); Q.cyl(x + 82, y, 5, 98, 0, 'POLE'); Q.cyl(x + 158, y, 5, 98, 0, 'POLE');
      // glass back panels, with a frosted band and the shop fronts reflected faintly
      [[x + 9, 73], [x + 87, 42]].forEach(function (g) {
        Q.box(g[0], y - 94, g[1], 82, 'GLASS*0.95'); Q.glass(g[0], y - 94, g[1], 82);   // (glass is see-through)
        Q.dither(g[0], y - 60, g[1], 5, 'GLASS*1.3'); Q.frame(g[0], y - 94, g[1], 82, 'POLE*0.9'); Q.box(g[0], y - 13, g[1], 1, 'POLE*0.7');
      });
      Q.block(x + 1, y - 64, 12, 14, 1, 'SIGNB'); Q.box(x + 3, y - 74, 8, 4, 'SIGNW'); Q.box(x + 4, y - 70, 1, 1, 'IRON'); Q.box(x + 9, y - 70, 1, 1, 'IRON'); Q.box(x + 3, y - 76, 8, 1, 'SIGNW*0.9');   // a route sign with a bus on it
      Q.block(x + 92, y - 48, 18, 24, 1, 'SIGNW'); Q.box(x + 92, y - 72, 18, 4, 'SIGNB'); for (var tl = 0; tl < 6; tl++) Q.box(x + 94, y - 66 + tl * 3, tl % 2 ? 10 : 14, 1, 'IRON*1.6');   // the timetable
      // the lightbox
      Q.block(x + 131, y - 12, 29, 84, 2, 'ADD');
      Q.grad(x + 134, y - 93, 23, 78, 'AD', 1.2, 0.95);
      Q.grad(x + 135, y - 92, 21, 30, 'BOTB', 1.6, 1.1);            // the poster: sky, a sun, hills, a band at the foot
      Q.ellipse(x + 146, y - 74, 5, 5, 'FLOWY'); Q.ellipse(x + 145, y - 75, 2.5, 2.5, 'FLOWY*1.2');
      Q.poly([[x + 135, y - 62], [x + 142, y - 68], [x + 149, y - 63], [x + 156, y - 67], [x + 156, y - 48], [x + 135, y - 48]], 'LEAFL'); Q.poly([[x + 135, y - 55], [x + 146, y - 60], [x + 156, y - 56], [x + 156, y - 48], [x + 135, y - 48]], 'LEAF');
      Q.box(x + 137, y - 42, 17, 3, 'ADD'); Q.box(x + 137, y - 36, 12, 2, 'ADD'); Q.box(x + 137, y - 28, 8, 5, 'BOXR'); Q.px(x + 137, y - 28, 'BOXR*1.3');
      // the bench: steel frame, wooden slats
      [x + 18, x + 74].forEach(function (lx2) { Q.block(lx2, y, 3, 18, 0, 'IRON*1.5'); Q.box(lx2 - 2, y - 2, 7, 2, 'IRON*1.3'); });
      Q.block(x + 14, y - 18, 66, 2, 3, 'WOOD'); Q.grain(x + 14, y - 23, 66, 5, 'WOOD'); Q.block(x + 14, y - 15, 66, 1, 0, 'WOODD');
      Q.block(x + 14, y - 28, 66, 2, 1, 'WOOD'); Q.block(x + 14, y - 33, 66, 2, 1, 'WOOD'); Q.grain(x + 14, y - 35, 66, 7, 'WOOD');
      Q.box(x + 14, y - 26, 2, 8, 'IRON*1.5'); Q.box(x + 78, y - 26, 2, 8, 'IRON*1.5');
      // the roof: a deep top, a gutter, its shaded underside, a strip light
      Q.block(x, y - 98, 168, 5, 7, 'ROOF'); Q.box(x, y - 98, 168, 1, 'ROOF*0.5'); Q.box(x + 3, y - 97, 162, 2, 'ROOF*0.45');
      Q.box(x + 14, y - 95, 140, 1, 'LAMPW'); Q.noise(x, y - 110, 168, 7, 'ROOF', 0.85, 1.12, 0.12);
    } },
    { id: 'suv', set: 2, scale: 'street', name: 'SUV (for the traffic)', w: 180, h: 76, paint: function (P, x, y) {
      var Q = deep(P);
      Q.ellipse(x + 88, y - 0.5, 86, 3, 'SHADOW'); Q.box(x + 20, y - 12, 140, 6, 'SHADOW');
      var body = [[x + 4, y - 18], [x + 4, y - 58], [x + 9, y - 65], [x + 110, y - 65], [x + 132, y - 44], [x + 166, y - 40], [x + 173, y - 33], [x + 174, y - 18]];
      Q.poly(body, 'SUV');
      Q.grad(x + 5, y - 64, 104, 20, 'SUV', 1.32, 1.05);            // the roof and upper body catch the sky
      Q.grad(x + 4, y - 44, 170, 22, 'SUV', 1.0, 0.72);             // the lower body falls into shade
      Q.box(x + 6, y - 41, 166, 1, 'SUV*1.45'); Q.box(x + 6, y - 40, 166, 1, 'SUV*0.85');   // a crease that catches the light
      Q.poly([[x + 110, y - 64], [x + 131, y - 44], [x + 166, y - 40], [x + 172, y - 34], [x + 131, y - 42], [x + 110, y - 62]], 'SUV*1.15');   // the bonnet
      // windows: tinted, darker below, with reflections; black pillars between
      [[x + 12, 26], [x + 42, 32], [x + 78, 28]].forEach(function (wd) { Q.grad(wd[0], y - 60, wd[1], 15, 'SUVW', 1.25, 0.7); Q.line(wd[0] + 4, y - 59, wd[0] + 11, y - 47, 'SUVW*1.5'); Q.line(wd[0] + 8, y - 59, wd[0] + 13, y - 51, 'SUVW*1.3'); });
      Q.poly([[x + 110, y - 60], [x + 127, y - 45], [x + 110, y - 45]], 'SUVW*0.9'); Q.line(x + 112, y - 57, x + 116, y - 49, 'SUVW*1.5');
      [x + 38, x + 74, x + 106].forEach(function (pl) { Q.box(pl, y - 61, 4, 17, 'SUVD*0.6'); });
      Q.box(x + 12, y - 45, 98, 1, 'CHROME*0.8');                   // window trim
      Q.box(x + 12, y - 69, 92, 2, 'IRON*1.6'); Q.box(x + 12, y - 69, 92, 1, 'IRON*2'); [x + 16, x + 56, x + 98].forEach(function (rs) { Q.box(rs, y - 67, 3, 2, 'IRON'); });   // roof rails
      Q.box(x + 41, y - 44, 1, 24, 'SUVD'); Q.box(x + 77, y - 44, 1, 24, 'SUVD'); Q.box(x + 108, y - 44, 1, 22, 'SUVD');   // door shut lines
      Q.box(x + 64, y - 37, 7, 2, 'CHROME'); Q.px(x + 64, y - 37, 'WHITE'); Q.box(x + 97, y - 37, 7, 2, 'CHROME'); Q.px(x + 97, y - 37, 'WHITE');
      Q.ellipse(x + 26, y - 38, 2.5, 2.5, 'SUVD');                  // the fuel cap
      Q.block(x + 118, y - 44, 9, 5, 1, 'SUVD');                    // the mirror
      Q.box(x + 4, y - 28, 170, 8, 'SUVD*0.75'); Q.noise(x + 4, y - 28, 170, 8, 'SUVD', 0.6, 0.95, 0.25); Q.box(x + 4, y - 28, 170, 1, 'SUVD*1.2');   // plastic cladding
      Q.box(x + 4, y - 60, 4, 18, 'SUVR'); Q.box(x + 4, y - 60, 4, 1, 'SUVR*1.3'); Q.box(x + 4, y - 52, 4, 1, 'SUVR*0.6'); Q.box(x + 4, y - 47, 4, 1, 'SUVR*0.6');   // tail light
      Q.block(x + 162, y - 36, 11, 5, 1, 'SUVL'); Q.px(x + 165, y - 35, 'WHITE'); Q.box(x + 156, y - 33, 8, 1, 'SUVL*0.9');   // headlight
      Q.block(x + 166, y - 20, 9, 8, 0, 'SUVD'); Q.box(x + 167, y - 24, 6, 1, 'CHROME*0.7'); Q.block(x + 2, y - 20, 8, 8, 0, 'SUVD');   // bumpers
      Q.box(x + 6, y - 14, 6, 2, 'CHROME*0.8');                     // exhaust
      [x + 36, x + 142].forEach(function (cx) { Q.ellipse(cx, y - 17, 19, 18, 'SUVD*0.45'); Q.wheelHi(cx, y - 14, 14); });
    } }
  ];
  return { mats: MATS, list: LIST };
})();
