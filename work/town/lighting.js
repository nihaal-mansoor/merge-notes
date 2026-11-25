/* Fog Town: lighting.js (see town/engine.js for how the pieces fit together)
   Lights as data. A surface in a light shows its own colour times the light's colour, so brick warms to brick-red and dark
   glass stays dark, instead of a glow being pasted over everything.
   - The street and the near frame never move, so what each light does to them is worked out once per world (from their
     unshaded colours), cropped, and kept. At night it is added back at the light's level: one blit per light.
   - People, props and vehicles move, so they are lit each frame, but only inside each light's box.
   - Lights can have casters (the payphone booth stands in the vending machine's light), and the lamp and the vending
     machine throw people's shadows along the ground away from them.
   - The lamp's light in the air is drawn behind the people and the car, never over them.
   - Bloom comes from a list of what actually glows, blurred at a quarter size.
   Memory: a light's reach is painted at half size; its baked patches keep only the pixels it reaches. */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB;

  // ---------------------------------------------------------------- intensity presets: how hard the lights hit, how much they bloom,
  // how thick the lamp's haze is, and how much the lit shop interiors are toned down at night. Chosen with ?light=, the LIGHT button, or kept from last visit.
  var PRESETS = {
    dim: { label: 'DIM', k: 0.45, bloom: 0.3, haze: 0.45, room: 0.34 },
    soft: { label: 'SOFT', k: 0.65, bloom: 0.5, haze: 0.65, room: 0.26 },
    bright: { label: 'BRIGHT', k: 1, bloom: 1, haze: 1, room: 0.12 }
  }, ORDER = ['dim', 'soft', 'bright'], current = 'soft';
  try { var saved = (location.search.match(/[?&]light=(\w+)/) || [])[1] || localStorage.getItem('ft-light'); if (PRESETS[saved]) current = saved; } catch (e) {}
  function preset(name) {
    if (name === 'next') name = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    if (PRESETS[name]) { current = name; try { localStorage.setItem('ft-light', name); } catch (e) {} }
    return PRESETS[current];
  }
  // ---------------------------------------------------------------- the lights of each world
  function defs(F) {
    var LAMP = FT.LAMP, D = FT.DINER, LA = FT.LAUNDRY, HO = FT.HOTEL, sw = FT.B.switch[0];
    if (!F) return [
      { id: 'lamp', kind: 'cone', x: LAMP.x, y: LAMP.y - 2, reach: 300, spread: 130, pool: 566, col: '#ffb060', k: 1.2, throws: true, road: true },
      { id: 'warn', kind: 'point', x: sw + 81, y: G - 58, r: 70, sq: 1, col: '#ff4a2a', k: 1 }
    ];
    return [
      { id: 'lamp', kind: 'cone', x: LAMP.x, y: LAMP.y - 2, reach: 300, spread: 130, pool: 566, col: '#f4e2b8', k: 1.1, throws: true, road: true },
      { id: 'vending', kind: 'point', x: 230, y: 522, r: 115, sq: 0.55, col: '#bfeee4', k: 1.15, casters: [[238, 466, 40, 112]], throws: true },
      { id: 'neon', kind: 'point', x: D.sign[0] + D.sign[2] / 2, y: D.sign[1] + D.sign[3] + 4, top: D.sign[1] + D.sign[3] + 1, r: 180, sq: 0.85, col: '#ff6a50', k: 0.5, still: true },   // it lights what is below it, not its own board
      { id: 'diner', kind: 'spill', box: [D.glass[0][0], D.glass[0][1], D.glass[1][0] + D.glass[1][2] - D.glass[0][0], D.glass[0][3]], col: '#f4d8a0', k: 0.7 },
      { id: 'laundry', kind: 'spill', box: LA.glass, col: '#dceeee', k: 0.55 },
      { id: 'hotel', kind: 'point', x: HO.sign[0] + HO.sign[2] / 2, y: HO.sign[1] + HO.sign[3] / 2, r: 110, sq: 1.4, col: '#ffb060', k: 0.5, still: true },
      { id: 'warn', kind: 'point', x: sw + 81, y: G - 58, r: 50, sq: 1, col: '#ff4a2a', k: 0.7, still: true },
      { id: 'flash', kind: 'point', x: 147, y: 486, r: 130, sq: 0.55, col: '#f4f8ff', k: 1.3 },   // the portrait studio's camera
      { id: 'tvs', kind: 'spill', box: [932, 487, 68, 31], col: '#a8c4f0', k: 0.55, still: true },   // the TV workshop's screens
      { id: 'clocks', kind: 'spill', box: [286, 464, 34, 32], col: '#f0c890', k: 0.4, still: true }   // the clock repairer's night light
    ];
  }
  // the box a light can reach, in screen pixels (even numbers, so the half-size shape lines up)
  function boxOf(Lt) {
    var b;
    if (Lt.kind === 'point') b = [Lt.x - Lt.r, Lt.y - Lt.r * Lt.sq, Lt.r * 2, Lt.r * 2 * Lt.sq];
    else if (Lt.kind === 'cone') b = [Lt.x - Lt.spread - 10, Lt.y, Lt.spread * 2 + 20, Lt.reach];
    else { var q = Lt.box; b = [q[0] - 32, q[1] - 16, q[2] + 64, KERB + 8 - (q[1] - 16)]; }
    var x0 = Math.max(0, Math.floor(b[0] / 2) * 2), y0 = Math.max(0, Math.floor(b[1] / 2) * 2), x1 = Math.min(W, Math.ceil((b[0] + b[2]) / 2) * 2), y1 = Math.min(H, Math.ceil((b[1] + b[3]) / 2) * 2);
    return [x0, y0, x1 - x0, y1 - y0];
  }
  // the shadow a box throws from a point light: from its two outermost corners (seen from the light) out past the screen
  function wedge(g, lx, ly, r) {
    var cs = [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]], lo = null, hi = null;
    cs.forEach(function (c) { var a = Math.atan2(c[1] - ly, c[0] - lx); if (!lo || a < lo.a) lo = { a: a, c: c }; if (!hi || a > hi.a) hi = { a: a, c: c }; });
    function out(c) { var dx = c[0] - lx, dy = c[1] - ly, n = Math.hypot(dx, dy) || 1; return [c[0] + dx / n * 2000, c[1] + dy / n * 2000]; }
    function inn(c) { var dx = c[0] - lx, dy = c[1] - ly, n = Math.hypot(dx, dy) || 1; return [c[0] + dx / n * 3, c[1] + dy / n * 3]; }   // the side facing the light keeps a lit edge
    var a = inn(lo.c), b = inn(hi.c), a2 = out(lo.c), b2 = out(hi.c);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b2[0], b2[1]); g.lineTo(a2[0], a2[1]); g.closePath(); g.fill();
  }
  // a light's reach, painted once at half size: its colour at the source, falling away to black, with its shadows cut out
  function shapeOf(Lt) {
    var bb = Lt.bb, c = document.createElement('canvas'), g = c.getContext('2d'); c.width = bb[2] / 2; c.height = bb[3] / 2;
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.scale(0.5, 0.5); g.translate(-bb[0], -bb[1]); g.globalCompositeOperation = 'lighter';
    var rgb = FT.hex(Lt.col).join(','), gr;
    function stops(gr, wide) { gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(wide ? 0.45 : 0.3, 'rgba(' + rgb + ',' + (wide ? 0.78 : 0.62) + ')'); gr.addColorStop(wide ? 0.8 : 0.65, 'rgba(' + rgb + ',' + (wide ? 0.32 : 0.2) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); return gr; }   // a lamp's cone carries further than a glow
    if (Lt.kind === 'point') { g.save(); g.translate(Lt.x, Lt.y); g.scale(1, Lt.sq); g.fillStyle = stops(g.createRadialGradient(0, 0, 0, 0, 0, Lt.r)); g.fillRect(-Lt.r, -Lt.r, Lt.r * 2, Lt.r * 2); g.restore(); }
    else if (Lt.kind === 'cone') {
      var wg = Lt.spread * (G - Lt.y) / Lt.reach;   // on the wall a cone down to the ground line; on the ground, a pool round the foot of the post
      g.save(); g.beginPath(); g.moveTo(Lt.x - 7, Lt.y); g.lineTo(Lt.x + 7, Lt.y); g.lineTo(Lt.x + wg, G); g.lineTo(Lt.x - wg, G); g.closePath(); g.clip();
      g.fillStyle = stops(g.createRadialGradient(Lt.x, Lt.y, 0, Lt.x, Lt.y, Lt.reach), true); g.fillRect(bb[0], bb[1], bb[2], bb[3]); g.restore();
      g.save(); g.translate(Lt.x, Lt.pool); g.scale(1, 0.3); g.fillStyle = stops(g.createRadialGradient(0, 0, 0, 0, 0, wg * 1.5), true); g.fillRect(-wg * 1.5, -wg * 1.5, wg * 3, wg * 3); g.restore();
      g.fillStyle = stops(g.createRadialGradient(Lt.x, Lt.y, 0, Lt.x, Lt.y, 34)); g.fillRect(Lt.x - 34, Lt.y - 34, 68, 68);   // the head lights its own bracket
    } else {
      var q = Lt.box, top = q[1] + q[3], lg = g.createLinearGradient(0, top, 0, KERB + 8);   // through the glass and down onto the pavement
      lg.addColorStop(0, 'rgba(' + rgb + ',0.85)'); lg.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = lg;
      g.beginPath(); g.moveTo(q[0], top); g.lineTo(q[0] + q[2], top); g.lineTo(q[0] + q[2] + 28, KERB + 8); g.lineTo(q[0] - 28, KERB + 8); g.closePath(); g.fill();
      for (var i = 1; i <= 5; i++) { g.fillStyle = 'rgba(' + rgb + ',0.09)'; g.fillRect(q[0] - i * 3, q[1] - i * 3, q[2] + i * 6, q[3] + i * 6); }   // and a soft halo on the wall round the window
    }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; (Lt.casters || []).forEach(function (r) { wedge(g, Lt.x, Lt.y, r); });
    if (Lt.top) g.fillRect(bb[0], bb[1], bb[2], Lt.top - bb[1]);
    return c;
  }
  // what one light does to one still layer: the layer's own colours times the light, kept only where it lands
  function bake(Lt, sheet) {
    if (!sheet) return null; var bb = Lt.bb, c = document.createElement('canvas'), g = c.getContext('2d'), m = FT.scratch('bake', bb[2], bb[3]), mg = m.getContext('2d'); c.width = bb[2]; c.height = bb[3];
    mg.clearRect(0, 0, bb[2], bb[3]); FT.blit(mg, sheet, -bb[0], -bb[1]);   // the layer's pieces gathered into one image first: destination-in with many pieces would keep only the last
    g.drawImage(m, 0, 0);
    g.globalCompositeOperation = 'multiply'; g.imageSmoothingEnabled = true; g.drawImage(Lt.shape, 0, 0, bb[2], bb[3]);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0);
    var s = FT.pack(c, 0, 0, 24); if (!s.parts.length) return null;
    s.parts.forEach(function (p) { p.x += bb[0]; p.y += bb[1]; }); return s;
  }
  // set up a world's lights (the first time any of them is on: daytime visitors never pay for this)
  function ready(L) {
    if (L.lit) return L.lit; var lights = defs(L.K.F), by = {};
    lights.forEach(function (Lt) { Lt.bb = boxOf(Lt); Lt.shape = shapeOf(Lt); Lt.lv = 0; Lt.street = bake(Lt, L.street); Lt.front = bake(Lt, L.front); by[Lt.id] = Lt; });
    FT.scratch('bake', 0, 0);   // done with it
    if (/[?&]debug/.test(location.search)) console.log('dbg lights: ' + lights.map(function (Lt) { return Lt.id + ' ' + Lt.bb.join(',') + ' street ' + (Lt.street ? (Lt.street.bytes / 1024 | 0) + 'K/' + Lt.street.parts.length : '-') + ' front ' + (Lt.front ? (Lt.front.bytes / 1024 | 0) + 'K' : '-'); }).join(' | '));
    return (L.lit = { lights: lights, by: by });
  }
  // this frame's levels ({id: 0..1}); returns the lit set, or null when every light is off (by day: no lighting work at all)
  function frame(L, levels) {
    var any = false; for (var k in levels) if (levels[k] > 0.01) any = true;
    if (!any && !L.lit) return null; var lit = ready(L), on = false;
    lit.lights.forEach(function (Lt) { Lt.lv = Math.max(0, levels[Lt.id] || 0) * Lt.k * PRESETS[current].k; if (Lt.lv > 0.01) on = true; });
    return on ? lit : null;
  }
  // the still layers: add each light's baked patch
  function statics(g, lit, which) {
    if (!lit) return; g.globalCompositeOperation = 'lighter';
    lit.lights.forEach(function (Lt) { if (Lt.lv > 0.01 && Lt[which]) { g.globalAlpha = Math.min(1, Lt.lv); FT.blit(g, Lt[which]); } });
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  // what moves: catch each light's share of a buffer (rows from oy down) before it is darkened for the hour, add it back after
  function grab(buf, oy, lit, road) {   // (road: only the lights that reach the road)
    if (!lit) return;
    lit.lights.forEach(function (Lt) {
      Lt.dyn = null; if (Lt.lv <= 0.01 || Lt.still || (road && !Lt.road) || (FT.Q && FT.Q.p < 0.4)) return; var bb = Lt.bb, y0 = Math.max(bb[1], oy), y1 = Math.min(bb[1] + bb[3], oy + buf.height); if (y1 <= y0) return;
      var bw = bb[2], bh = y1 - y0, p = FT.scratch('dyn-' + Lt.id, bw, bb[3]), g = p.getContext('2d');   // always the light's full box: no reallocating between the people and the road
      g.globalCompositeOperation = 'copy'; g.drawImage(buf, bb[0], y0 - oy, bw, bh, 0, 0, bw, bh);
      g.globalCompositeOperation = 'multiply'; g.imageSmoothingEnabled = false; g.drawImage(Lt.shape, 0, (y0 - bb[1]) / 2, bw / 2, bh / 2, 0, 0, bw, bh);
      g.globalCompositeOperation = 'destination-in'; g.drawImage(buf, bb[0], y0 - oy, bw, bh, 0, 0, bw, bh); g.globalCompositeOperation = 'source-over';
      Lt.dyn = { c: p, x: bb[0], y: y0, h: bh };
    });
  }
  function give(a, lit) {
    if (!lit) return; a.globalCompositeOperation = 'lighter';
    lit.lights.forEach(function (Lt) { if (Lt.dyn) { a.globalAlpha = Math.min(1, Lt.lv); a.drawImage(Lt.dyn.c, 0, 0, Lt.bb[2], Lt.dyn.h, Lt.dyn.x, Lt.dyn.y, Lt.bb[2], Lt.dyn.h); } });
    a.globalAlpha = 1; a.globalCompositeOperation = 'source-over';
  }
  // shadows along the ground, away from the lamp and the vending machine, for anyone standing in their light
  function shadows(a, items, lit) {
    if (!lit) return;
    lit.lights.forEach(function (Lt) {
      if (!Lt.throws || Lt.lv < 0.05) return; var reach = Lt.kind === 'cone' ? Lt.spread + 30 : Lt.r;
      items.forEach(function (it) {
        if (it.x == null) return; var dx = it.x - Lt.x, d = Math.abs(dx); if (d > reach) return;
        var up = Math.max(8, it.base - Lt.y - it.h * 0.9), len = Math.min(90, it.h * (d + 6) / up), dir = dx < 0 ? -1 : 1, al = 0.34 * Math.min(1, Lt.lv) * (1 - d / reach);
        if (al < 0.02) return; var x = Math.round(it.x) + dir * 3; a.fillStyle = 'rgba(10,12,16,' + al.toFixed(3) + ')';
        a.fillRect(x, it.base - 1, Math.round(dir * len), 2); a.fillRect(x + dir * Math.round(len * 0.15), it.base - 2, Math.round(dir * len * 0.55), 1);
      });
    });
  }
  // bloom: what glows, drawn at a quarter size, softened twice by halving, and added back over the frame
  function bloom(g, list, amt) {
    if (amt < 0.02 || !list.length || (FT.Q && FT.Q.p < 0.55)) return;   // the first thing a slow machine gives up
    var b0 = FT.scratch('bloom0', W / 4, H / 4), b1 = FT.scratch('bloom1', W / 8, H / 8), b2 = FT.scratch('bloom2', W / 16, H / 16);
    var x0 = b0.getContext('2d'); x0.setTransform(1, 0, 0, 1, 0, 0); x0.globalCompositeOperation = 'source-over'; x0.clearRect(0, 0, W / 4, H / 4); x0.setTransform(0.25, 0, 0, 0.25, 0, 0); x0.globalCompositeOperation = 'lighter';
    for (var i = 0; i < list.length; i++) { var q = list[i]; x0.globalAlpha = Math.min(1, q[5]); x0.fillStyle = q[4]; x0.fillRect(q[0], q[1], q[2], q[3]); } x0.globalAlpha = 1;
    var x1 = b1.getContext('2d'), x2 = b2.getContext('2d'); x1.imageSmoothingEnabled = x2.imageSmoothingEnabled = true;
    x1.globalCompositeOperation = 'copy'; x1.drawImage(b0, 0, 0, W / 8, H / 8); x2.globalCompositeOperation = 'copy'; x2.drawImage(b1, 0, 0, W / 16, H / 16);
    x1.globalCompositeOperation = 'lighter'; x1.drawImage(b2, 0, 0, W / 8, H / 8);   // a wide halo over the tight one
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, amt); g.imageSmoothingEnabled = true; g.drawImage(b1, 0, 0, W, H);
    g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }

  FT.Lighting = { preset: preset, PRESETS: PRESETS, ready: ready, frame: frame, statics: statics, grab: grab, give: give, shadows: shadows, bloom: bloom };
})(window.FT = window.FT || {});
