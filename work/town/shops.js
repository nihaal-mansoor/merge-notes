/* Fog Town: shops.js (see town/engine.js for how the pieces fit together)
   The ground-floor shops. Each is painted once into the street (paint) and kept alive each frame (draw), and each has
   one small hint that the town is turning:
   - ABOUT: a portrait studio. Point at it and the camera flashes; the newest print on the easel is stamped with the time
     you were there. Now and then, at night, the closed studio flashes with nobody in it.
   - HOW I WORK: a clock repairer. Every clock in the window tells a different time. When the power dips they all stop,
     and they all start again together, at the same time, before drifting apart. The street clock over the door keeps the real time.
   - TOOLKIT: a TV and radio repair workshop under the half-raised shutter. The sets show static; now and then (and when
     you point at the building) every screen shows the same picture: the street, as you are looking at it.
   - CONTACT (the hotel): a night clerk behind the desk, who looks up when you point at the door, and a VACANCY sign.
     Once you have pulled the lever, its NO comes on.
   Memory: nothing but a 24x16 noise tile; everything else is drawn into the street layer or straight onto the frame. */
(function (FT) {
  'use strict';
  var G = FT.G, rgba = FT.rgba, mix = FT.mix, rand = FT.rand, pick = FT.pick, clamp = FT.clamp;
  var STUDIO = { win: [112, 452, 70, 52], easel: [164, 470, 12, 14] },
    CLOCKS = { win: [284, 462, 38, 36], faces: [[294, 474, 6], [300, 486, 3, 'sq'], [312, 486, 3]], street: [384, 458, 5] },
    TVS = { gap: [930, 486, 72, 34], screens: [[936, 489, 11, 7], [953, 489, 11, 7], [970, 489, 11, 7], [987, 504, 9, 6]] },
    HOTEL = FT.HOTEL, VAC = [1199, 463, 27, 16];

  // ---------------------------------------------------------------- painted once, into the street layer
  function paint(p, K) {
    var F = K.F, P = K.P, wood = F ? '#4a3626' : '#1a0f0c', gold = F ? '#b8954a' : '#3a2e28', glassSheen = 'rgba(255,255,255,0.1)';
    // the portrait studio: a mottled backdrop, framed portraits, a camera on its tripod, an easel for the newest print
    var s = STUDIO.win, bx = s[0] + 2, by = s[1] + 2, bw = s[2] - 4, bh = s[3] - 4;
    p.V(bx, by, bw, bh, F ? '#5a6670' : '#140a08', F ? '#3a434a' : '#0b0605');
    for (var m = 0; m < 40; m++) p.R(bx + K.r() * bw, by + K.r() * bh, 2, 1, F ? 'rgba(140,152,160,0.25)' : 'rgba(40,20,14,0.3)');
    [[bx + 4, by + 4, 12, 15], [bx + 20, by + 6, 9, 11], [bx + 33, by + 3, 14, 17], [bx + 6, by + 24, 9, 11]].forEach(function (f, i) {
      p.R(f[0] - 1, f[1] - 1, f[2] + 2, f[3] + 2, i % 2 ? gold : (F ? '#22211f' : '#0e0807')); p.R(f[0], f[1], f[2], f[3], F ? '#c8c0ae' : '#2a1d18');
      var fx = f[0] + f[2] / 2, fy = f[1] + f[3] * 0.42, skin = F ? ['#c89a7a', '#8a5a3e', '#e0b898', '#6a4632'][i] : '#3a2e28';
      p.R(f[0] + 1, f[1] + f[3] - 4, f[2] - 2, 4, F ? ['#3a4a5a', '#5a3a3a', '#4a4a3a', '#2a2a2a'][i] : '#1a0f0c');   // shoulders
      p.E(fx, fy, f[2] * 0.22, f[3] * 0.22, skin); p.R(fx - f[2] * 0.25, fy - f[3] * 0.25, f[2] * 0.5, 2, F ? ['#2a1d18', '#1a1410', '#8a6a3a', '#3a2a1a'][i] : '#140a08');   // face and hair
    });
    var tx = bx + 52, ty = by + 22; p.R(tx, ty, 8, 5, F ? '#2a2826' : '#0e0807'); p.R(tx + 8, ty + 1, 3, 3, F ? '#5a5856' : '#1a0f0c'); p.R(tx + 2, ty - 2, 3, 2, F ? '#2a2826' : '#0e0807');   // the camera
    p.L(tx + 4, ty + 5, tx, ty + 24, F ? '#3a3836' : '#0e0807'); p.L(tx + 4, ty + 5, tx + 8, ty + 24, F ? '#3a3836' : '#0e0807'); p.L(tx + 4, ty + 5, tx + 4, ty + 24, F ? '#3a3836' : '#0e0807');
    var e = STUDIO.easel; p.L(e[0] + 2, e[1] + e[3], e[0] - 1, e[1] + 26, wood); p.L(e[0] + e[2] - 2, e[1] + e[3], e[0] + e[2] + 1, e[1] + 26, wood); p.R(e[0] - 1, e[1] + e[3], e[2] + 2, 2, wood);
    p.R(s[0] + 4, s[1] + s[3] - 10, 30, 6, F ? 'rgba(236,230,214,0.85)' : 'rgba(42,29,24,0.8)'); p.T('PORTRAITS', s[0] + 19, s[1] + s[3] - 7, 7, F ? '#7a3b34' : '#3a2e28');   // lettering on the glass
    p.R(bx, by, bw, 2, glassSheen);
    // the clock repairer: a dark wooden back wall, clocks of every kind, pocket watches on a rail
    var c = CLOCKS.win; p.R(c[0] + 2, c[1] + 2, c[2] - 4, c[3] - 4, F ? '#3a2a1e' : '#0e0807'); p.R(c[0] + 2, c[1] + c[3] - 8, c[2] - 4, 6, wood); p.R(c[0] + 2, c[1] + c[3] - 8, c[2] - 4, 1, F ? '#6a4a32' : '#2a1d18');
    CLOCKS.faces.forEach(function (f, i) { if (f[3] === 'sq') { p.R(f[0] - 4, f[1] - 4, 9, 9, wood); p.R(f[0] - 3, f[1] - 3, 7, 7, F ? '#e8e0c8' : '#2a1d18'); return; }
      p.E(f[0], f[1], f[2] + 1, f[2] + 1, i === 0 ? gold : wood); p.E(f[0], f[1], f[2], f[2], F ? '#ece4cc' : '#2a1d18'); if (f[2] > 3) for (var h = 0; h < 12; h += 3) p.R(Math.round(f[0] + Math.sin(h / 6 * Math.PI) * (f[2] - 1)), Math.round(f[1] - Math.cos(h / 6 * Math.PI) * (f[2] - 1)), 1, 1, '#3a3836'); });
    p.R(c[0] + 26, c[1] + 4, 8, 12, wood); p.P([[c[0] + 25, c[1] + 4], [c[0] + 30, c[1]], [c[0] + 35, c[1] + 4]], wood); p.R(c[0] + 29, c[1] + 7, 3, 3, F ? '#c8b890' : '#2a1d18');   // a cuckoo house, its door shut
    p.R(c[0] + 2, c[1] + 2, c[2] - 4, 2, glassSheen);
    // the street clock on its bracket, over the shelter
    var sc = CLOCKS.street; p.R(362, sc[1] - 1, sc[0] - 362, 2, F ? '#2a2826' : '#0e0807'); p.ring(368, sc[1] - 3, 2, F ? '#2a2826' : '#0e0807'); p.R(sc[0] - 1, sc[1] - sc[2] - 4, 2, 3, F ? '#2a2826' : '#0e0807');
    p.E(sc[0], sc[1] + 2, sc[2] + 1, sc[2] + 1, F ? '#2a2826' : '#0e0807'); p.E(sc[0], sc[1] + 2, sc[2], sc[2], F ? '#ece6d6' : '#3a2e28');
    // the TV and radio workshop under TOOLKIT's shutter: a shelf of sets, a bench, a radio, a set with its back off
    var t = TVS.gap; p.R(t[0], t[1], t[2], t[3], F ? '#1e1c1a' : '#0b0605'); p.R(t[0] + 2, t[1] + 12, t[2] - 4, 2, wood); p.R(t[0] + 2, t[1] + 24, t[2] - 4, 3, wood); p.R(t[0] + 4, t[1] + 27, 2, 7, wood); p.R(t[0] + t[2] - 6, t[1] + 27, 2, 7, wood);
    TVS.screens.forEach(function (q, i) { p.R(q[0] - 2, q[1] - 2, q[2] + 4, q[3] + 4, F ? ['#5a4632', '#6a6a66', '#3a3a3a', '#7a5a3a'][i] : '#1a0f0c'); p.R(q[0], q[1], q[2], q[3], '#0e1012'); if (i < 3) p.R(q[0] + q[2] - 2, q[1] + q[3] + 1, 1, 1, '#c84a3a'); });
    p.R(t[0] + 8, t[1] + 19, 15, 5, F ? '#8a6a4a' : '#1a0f0c'); for (var g2 = 0; g2 < 5; g2++) p.R(t[0] + 9 + g2 * 2, t[1] + 20, 1, 3, F ? '#3a2a1e' : '#0b0605'); p.R(t[0] + 18, t[1] + 20, 3, 3, F ? '#d8c898' : '#2a1d18');   // a valve radio
    p.L(t[0] + 30, t[1] + 26, t[0] + 40, t[1] + 33, '#0e0e0e'); p.L(t[0] + 44, t[1] + 26, t[0] + 52, t[1] + 33, '#0e0e0e');   // cables down to the floor
    // the hotel: a VACANCY sign beside the door (lit live), and the lobby behind the glass (drawn live)
    p.R(VAC[0] - 1, VAC[1] - 1, VAC[2] + 2, VAC[3] + 2, F ? '#22211f' : '#0e0807'); p.R(VAC[0], VAC[1], VAC[2], VAC[3], F ? '#16181a' : '#0b0605'); p.R(VAC[0] + 6, VAC[1] + VAC[3] + 1, 1, 4, F ? '#22211f' : '#0e0807'); p.R(VAC[0] + VAC[2] - 7, VAC[1] + VAC[3] + 1, 1, 4, F ? '#22211f' : '#0e0807');
    p.T('NO', VAC[0] + VAC[2] / 2, VAC[1] + 4, 7, F ? '#3a2422' : '#2a1510'); p.T('VACANCY', VAC[0] + VAC[2] / 2, VAC[1] + 11, 7, F ? '#2a3a30' : '#1a0f0c');
  }

  // ---------------------------------------------------------------- alive, each frame
  function hand(g, cx, cy, len, ang) { for (var i = 1; i <= len; i++) g.fillRect(Math.round(cx + Math.sin(ang) * i), Math.round(cy - Math.cos(ang) * i), 1, 1); }
  function face(g, cx, cy, r, minutes, sec) {
    hand(g, cx, cy, Math.max(1, r - 3), minutes / 720 * Math.PI * 2); hand(g, cx, cy, r - 1, (minutes % 60) / 60 * Math.PI * 2);
    if (sec != null && r > 4) { g.fillStyle = '#a83a2a'; hand(g, cx, cy, r - 1, sec / 60 * Math.PI * 2); }
  }
  function Shops() { this.offs = CLOCKS.faces.map(function () { return rand(-300, 300); }); this.sync = 1; this.frozen = null; this.flash = 0; this.nextFlash = rand(60, 200); this.printAt = null; this.same = 0; this.nextSame = rand(40, 120); this.noise = null; this.look = 0; this.hover = null; this.ever = false; }
  Shops.prototype.draw = function (g, L, t, dt, S, env, hour) {
    var self = this, power = env.power, night = clamp((S.dark - 0.05) / 0.5, 0, 1), sound = env.sound, hv = env.hover, start = hv !== this.hover ? hv : null; this.hover = hv;
    if (env.lever.pulled) this.ever = true;
    var dim = function (col, k) { return mix(col, '#0b0f18', (k == null ? 0.6 : k) * S.dark); };
    // ---- the studio: a flash (when you point at it, or by itself at night), then the newest print shows the time
    this.nextFlash -= dt; if (start === 'about' || (this.nextFlash <= 0 && S.dark > 0.4 && FT.Q.motion)) { this.nextFlash = rand(90, 260); this.flash = 1; this.printAt = hour; if (sound) sound.burst({ f: 2400, vol: 0.03, dur: 0.05, pan: -0.8 }); }
    this.flash = Math.max(0, this.flash - dt * 7);
    var e = STUDIO.easel; g.fillStyle = dim('#e8e2d0', 0.45); g.fillRect(e[0], e[1], e[2], e[3]);
    if (this.printAt == null) this.printAt = hour - rand(0.4, 3);   // the last one was taken a while ago
    if (this.printAt != null) { g.fillStyle = dim('#3a3e44', 0.3); g.fillRect(e[0] + 1, e[1] + 1, e[2] - 2, e[3] - 5); g.fillStyle = dim('#1a1816', 0.2); g.fillRect(e[0] + 5, e[1] + 3, 2, 2); g.fillRect(e[0] + 4, e[1] + 5, 4, 4);   // a lone figure on a pavement, at night
      var pa = ((this.printAt % 24) + 24) % 24, hh = Math.floor(pa), mm = Math.floor((pa % 1) * 60); g.font = '7px VT323'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = dim('#7a3b34', 0.3); g.fillText((hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm, e[0] + e[2] / 2, e[1] + e[3] - 2); }
    if (this.flash > 0) { var s = STUDIO.win; g.fillStyle = 'rgba(244,248,255,' + (this.flash * 0.85).toFixed(2) + ')'; g.fillRect(s[0] + 2, s[1] + 2, s[2] - 4, s[3] - 4); }
    // ---- the clocks: each its own time; stopped by a power dip; started again all together
    var cp = power.level(303, t) >= 0.5, now = hour * 60;
    if (!cp && !this.frozen) this.frozen = now; if (cp && this.frozen != null) { this.base = this.frozen - now; this.frozen = null; this.sync = 0; if (sound) sound.tone({ f: [1320, 1980], vol: 0.025, dur: 0.5, pan: -0.4 }); }
    if (start === 'how') { this.sync = 0; this.base = this.base || 0; if (sound) sound.tone({ f: [880, 1320], vol: 0.03, dur: 0.7, pan: -0.4 }); }
    this.sync = Math.min(1, this.sync + dt / 40); var shown = this.frozen != null ? this.frozen : now + (this.base || 0) * (1 - this.sync);
    g.fillStyle = dim('#2a2826', 0.1); CLOCKS.faces.forEach(function (f, i) { if (f[2] < 3) return; face(g, f[0], f[1], f[2], shown + self.offs[i] * self.sync, i === 0 && self.frozen == null ? (hour * 3600) % 60 : null); g.fillStyle = dim('#2a2826', 0.1); });
    var sc = CLOCKS.street; g.fillStyle = dim('#1a1816', 0.2); face(g, sc[0], sc[1] + 2, sc[2], this.frozen != null ? this.frozen : now);
    // ---- the TVs: static, until every screen shows the street, as you are looking at it
    this.nextSame -= dt; if (start === 'toolkit' || (this.nextSame <= 0 && FT.Q.motion)) { this.nextSame = rand(50, 160); this.same = start === 'toolkit' ? 2.5 : rand(2, 5); }
    this.same -= dt; var tvp = power.level(966, t) >= 0.5;
    if (!this.noise) { this.noise = document.createElement('canvas'); this.noise.width = 24; this.noise.height = 16; this.nctx = this.noise.getContext('2d'); this.nimg = this.nctx.createImageData(24, 16); }
    if (tvp) {
      if (this.same <= 0) { var d = this.nimg.data; for (var k = 0; k < d.length; k += 4) { var v = 60 + Math.random() * 170; d[k] = v * 0.92; d[k + 1] = v * 0.96; d[k + 2] = v; d[k + 3] = 255; } this.nctx.putImageData(this.nimg, 0, 0); }
      var tvOpen = hour >= 8 && hour < 22;   // after hours the workshop's sets are off, all but one
      g.globalAlpha = 0.55 + 0.4 * night; TVS.screens.forEach(function (q, qi) { if (!tvOpen && qi > 0) return;
        if (self.same > 0) g.drawImage(g.canvas, 0, 300, g.canvas.width, g.canvas.height * 0.42, q[0], q[1], q[2], q[3]);
        else g.drawImage(self.noise, (Math.random() * 12) | 0, (Math.random() * 8) | 0, q[2], q[3], q[0], q[1], q[2], q[3]); });
      g.globalAlpha = 1; }
    // ---- the hotel: the lobby behind the glass, the clerk (who looks up when you point at the door), the VACANCY sign
    var hd = HOTEL.door, lx = hd[0] + 2, ly = hd[1] + 2, lw = hd[2] - 4, lh = hd[3] - 4;
    if (start === 'hotel') { this.look = 3.5; if (sound) sound.tone({ f: [2093, 2637], vol: 0.04, dur: 0.9, pan: 0.85 }); } this.look -= dt;
    g.save(); g.beginPath(); g.rect(lx, ly, lw / 2 - 1, lh); g.rect(lx + lw / 2 + 1, ly, lw / 2 - 1, lh); g.clip();
    g.fillStyle = dim('#c8a878', 0.25); g.fillRect(lx, ly, lw, lh);                                                       // the lobby wall, lamp-lit
    g.fillStyle = dim('#5a4632', 0.3); g.fillRect(lx + 1, ly + 8, 9, 8); g.fillStyle = dim('#d8b860', 0.2); for (var kk = 0; kk < 8; kk++) if (kk !== 5) g.fillRect(lx + 2 + (kk % 4) * 2, ly + 10 + ((kk / 4) | 0) * 3, 1, 2);   // the key board: one key gone
    // the clerk (the v2 body): turned to the key board, breathing, shifting his weight; point at the door and he faces you
    var V = window.FTBody2, up = this.look > 0, ccx = lx + lw - 8;
    if (V) { if (!this.clerk) { var cs = V.spec({ height: 54, skin: '#d89a74', hair: { style: 'short', col: '#3a2a1e' }, face: { glasses: 'clear', beard: false }, tie: '#5a2a2a', shirt: { col: '#d8d0c0', sleeves: 'long' }, jacket: { col: '#2a2e36', open: true, len: 'hip', leather: false }, legs: { col: '#1e1a1a', type: 'trousers', tights: null } }); this.clerk = { idle: V.sheet(cs, 'idle'), front: V.frame(cs, 'front', 0) }; }
      var ck = this.clerk; if (up) g.drawImage(ck.front, ccx - V.GX, G - V.GY);
      else { var cf = Math.floor(t * 1000 / ck.idle.ms) % ck.idle.n; g.save(); g.translate(ccx, G); g.scale(-1, 1); g.drawImage(ck.idle.c, cf * ck.idle.fw, 0, ck.idle.fw, ck.idle.fh, -V.GX, -V.GY, ck.idle.fw, ck.idle.fh); g.restore(); } }
    g.fillStyle = dim('#4a3020', 0.3); g.fillRect(lx, ly + 34, lw, lh - 34); g.fillStyle = dim('#6a4a30', 0.3); g.fillRect(lx, ly + 34, lw, 1);   // the desk
    g.fillStyle = dim('#c8a040', 0.2); g.fillRect(lx + 3, ly + 31, 3, 2); g.fillRect(lx + 4, ly + 30, 1, 1);                // its bell
    g.fillStyle = dim('#3a6a4a', 0.2); g.fillRect(lx + 7, ly + 28, 5, 2); g.fillRect(lx + 9, ly + 30, 1, 4);               // and a green lamp
    g.restore(); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(lx, ly, lw, 2);
    var vp = power.level(VAC[0], t) >= 0.5, buzz = Math.random() < 0.04;
    if (vp && night > 0.05) { g.font = '7px VT323'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = rgba('#7adfa0', 0.4 + 0.6 * night); g.fillText('VACANCY', VAC[0] + VAC[2] / 2, VAC[1] + 11);
      if (this.ever && !buzz) { g.fillStyle = rgba('#ff5a40', 0.4 + 0.6 * night); g.fillText('NO', VAC[0] + VAC[2] / 2, VAC[1] + 4); } }
    // ---- the news stand: the vendor, behind a paper held up over their face; point at the stand and it comes down.
    // Open five in the morning to eleven at night; in between the shutter is down and the bulb under the awning is off
    var nx = FT.B.switch[0] + 6, ny = G - 58, nw = 34, nh = 28, hr = ((hour % 24) + 24) % 24, nOpen = hr >= 5 && hr < 23, np = power.level(nx + 17, t) >= 0.5;
    if (start === 'news') { this.nlook = 4; if (sound) sound.burst({ f: 900, vol: 0.02, dur: 0.12, pan: 0.7 }); } this.nlook = (this.nlook || 0) - dt;
    if (nOpen) { g.save(); g.beginPath(); g.rect(nx, ny, nw, nh); g.clip();
      g.fillStyle = dim(np ? '#7a6248' : '#4a3a2a', 0.5); g.fillRect(nx, ny, nw, nh);                                                     // the back wall, bulb-lit
      for (var sr = 0; sr < 2; sr++) { g.fillStyle = dim('#3a2a1e', 0.3); g.fillRect(nx, ny + 6 + sr * 8, nw, 1); for (var sp = 0; sp < 8; sp++) { g.fillStyle = dim(['#a8463a', '#d8d0c0', '#3a5a6a', '#c9a55a'][(sp + sr) % 4], 0.5); g.fillRect(nx + 2 + sp * 4, ny + 3 + sr * 8, 3, 3); } }   // cigarettes, sweets
      if (V) { if (!this.vendor) { var vs = V.spec({ height: 52, shape: 'f', skin: '#c87a54', hair: { style: 'bun', col: '#a8a49c' }, face: { glasses: 'clear', beard: false }, shirt: { col: '#8a9aa8', sleeves: 'long' }, jacket: { col: '#6a3a3a', open: true, len: 'hip', leather: false }, legs: { col: '#2a2a30', type: 'trousers', tights: null } }); this.vendor = V.frame(vs, 'front', 0); }
        var vcx = nx + 17, bob = Math.sin(t * 1.3) > 0.2 ? 1 : 0; g.drawImage(this.vendor, vcx - V.GX, G - V.GY + bob);
        var down = this.nlook > 0, turn = (t % 23) < 0.5, py = down ? G - 36 : G - 49 + bob, pw = turn ? 9 : 17;   // the paper: up, or lowered to the counter; every so often a page turns
        g.fillStyle = dim('#e0dccc', 0.45); g.fillRect(vcx - 8, py, pw, 12); g.fillStyle = dim('#2a2826', 0.3); g.fillRect(vcx - 8, py, pw, 2);
        g.fillStyle = dim('#8a8680', 0.4); for (var pl = 0; pl < 4; pl++) { g.fillRect(vcx - 7, py + 4 + pl * 2, 6, 1); if (!turn) g.fillRect(vcx + 2, py + 4 + pl * 2, 6, 1); } if (!turn) { g.fillStyle = dim('#b8b4a8', 0.4); g.fillRect(vcx, py, 1, 12); }
        g.fillStyle = dim('#c87a54', 0.4); g.fillRect(vcx - 9, py + 5, 1, 3); g.fillRect(vcx - 8 + pw, py + 5, 1, 3); }                  // her hands on it
      g.restore();
      if (np) { g.fillStyle = night > 0.05 ? '#ffe2a8' : '#b8b0a0'; g.fillRect(nx + 16, ny - 2, 3, 2); if (night > 0.05 && this.glowOut) this.glowOut.push([nx + 15, ny - 3, 5, 4, '#ffd090', 0.8 * night]); } }
    else { var sh2 = G - 3 - ny; g.fillStyle = dim('#6a6e6a', 0.5); g.fillRect(nx - 2, ny, nw + 4, sh2); g.fillStyle = dim('#4a4e4a', 0.5); for (var sl = ny + 2; sl < ny + sh2; sl += 3) g.fillRect(nx - 2, sl, nw + 4, 1); g.fillStyle = dim('#2a2826', 0.3); g.fillRect(nx + 15, G - 9, 4, 4); g.fillStyle = dim('#a8a49a', 0.4); g.fillRect(nx + 16, G - 11, 2, 2); }   // (the rack taken in)   // the shutter, padlocked
    // ---- the bulbs along the WRITING awning and the hotel canopy, lit at night (one or two dead, one that flickers)
    if (night > 0.08) [[782, 906, 10, 442, 840], [1202, 1286, 6, 430, 1244]].forEach(function (row, ri) {
      if (power.level(row[4], t) < 0.5) return; var i = 0;
      for (var bx = row[0]; bx <= row[1]; bx += row[2], i++) { if ((i * 7 + ri * 3) % 11 === 4) continue; var a = (i * 5 + ri) % 13 === 2 && Math.random() < 0.3 ? 0.2 : 1; g.fillStyle = 'rgba(255,214,140,' + (a * (0.45 + 0.55 * night)).toFixed(2) + ')'; g.fillRect(bx, row[3], 1, 2); }
      if (self.glowOut) self.glowOut.push([row[0], row[3] - 1, row[1] - row[0], 3, '#ffc070', 0.35 * night]); });
    // ---- what glows (for bloom), and the levels of the shops' own lights
    if (S.dark > 0.3) { var glow = this.glowOut; if (glow) { if (tvp) TVS.screens.forEach(function (q, qi) { if (qi > 0 && !(hour >= 8 && hour < 22)) return; glow.push([q[0], q[1], q[2], q[3], '#b8d0f0', 0.5]); });
      if (vp) { glow.push([VAC[0] + 2, VAC[1] + 8, VAC[2] - 4, 6, '#7adfa0', 0.5]); if (this.ever) glow.push([VAC[0] + 8, VAC[1] + 1, VAC[2] - 16, 6, '#ff5a40', 0.5]); }
      if (this.flash > 0) glow.push([STUDIO.win[0], STUDIO.win[1], STUDIO.win[2], STUDIO.win[3], '#f4f8ff', this.flash]); } }
    return { flash: this.flash, tvs: tvp ? (0.35 + 0.65 * night) * (0.75 + Math.random() * 0.25) * (hour >= 8 && hour < 22 ? 1 : 0.35) : 0, clocks: cp ? night : 0, kiosk: nOpen && np ? night : 0 };
  };

  FT.Shops = { paint: paint, Shops: Shops, STUDIO: STUDIO, CLOCKS: CLOCKS, TVS: TVS };
})(window.FT = window.FT || {});
