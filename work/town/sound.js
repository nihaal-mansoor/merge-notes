/* Fog Town: sound.js (see town/engine.js for how the pieces fit together) */
(function (FT) {
  'use strict';
  var W = FT.W, H = FT.H, G = FT.G, KERB = FT.KERB, ROAD = FT.ROAD, MIDX = FT.MIDX, BAYER = FT.BAYER, PAL = FT.PAL, PP = FT.PP, rng = FT.rng, hex = FT.hex, mix = FT.mix, sh = FT.sh, rgba = FT.rgba, clamp = FT.clamp, smooth = FT.smooth, rand = FT.rand, pick = FT.pick, Pt = FT.Pt, brick = FT.brick, stone = FT.stone, stucco = FT.stucco, plate = FT.plate, planks = FT.planks, grime = FT.grime, crack = FT.crack, plaster = FT.plaster, cornice = FT.cornice, band = FT.band, win = FT.win, shopWin = FT.shopWin, door = FT.door, signBoard = FT.signBoard, drainpipe = FT.drainpipe, leaves = FT.leaves, vine = FT.vine, weeds = FT.weeds, STACKS = FT.STACKS, far = FT.far, mid = FT.mid, back = FT.back, B = FT.B, SIGNS = FT.SIGNS, goose = FT.goose, street = FT.street, front = FT.front, LAMP = FT.LAMP, POLE_A = FT.POLE_A, POLE_B = FT.POLE_B, prop = FT.prop, props = FT.props, lampCone = FT.lampCone, glowSprite = FT.glowSprite, finish = FT.finish, fogStrip = FT.fogStrip, puff = FT.puff, wireY = FT.wireY, capsLayer = FT.capsLayer, wetLayer = FT.wetLayer, vehicles = FT.vehicles, stranger = FT.stranger, dogSheet = FT.dogSheet, ratSheet = FT.ratSheet, bankLayer = FT.bankLayer, paintRoom = FT.paintRoom, build = FT.build, GRADE = FT.GRADE, sky = FT.sky, blend = FT.blend, tint = FT.tint, grade = FT.grade;
  // ---------------------------------------------------------------- sound: made in the browser (nothing to download), silent until the visitor turns it on
  function Sound() { this.ctx = null; this.on = false; }
  Sound.prototype.toggle = function () {
    if (!this.ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; try { this.init(new AC()); } catch (e) { return false; } }
    this.on = !this.on; if (this.on && this.ctx.resume) this.ctx.resume(); this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.3); return this.on;
  };
  Sound.prototype.init = function (c) {
    var self = this; this.ctx = c; this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    function buf(brown) { var n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), last = 0; for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; }
    this.white = buf(false); this.brown = buf(true);
    this.pan = function (v) { if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = clamp(v, -1, 1); p.connect(self.master); return p; } return self.master; };
    function bed(b, type, f, p) { var s = c.createBufferSource(); s.buffer = b; s.loop = true; var fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; var g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(self.pan(p || 0)); s.start(); return g; }
    this.wind = bed(this.brown, 'lowpass', 500); this.rain = bed(this.white, 'highpass', 1400); this.traffic = bed(this.brown, 'lowpass', 180, -0.2);
    this.hum = c.createGain(); this.hum.gain.value = 0; this.hum.connect(this.pan(0.75)); [50, 100, 150].forEach(function (f, i) { var o = c.createOscillator(); o.frequency.value = f; var g = c.createGain(); g.gain.value = [1, 0.5, 0.2][i]; o.connect(g); g.connect(self.hum); o.start(); });
    var bz = c.createOscillator(); bz.type = 'sawtooth'; bz.frequency.value = 120; var bf = c.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = 700; this.buzz = c.createGain(); this.buzz.gain.value = 0; bz.connect(bf); bf.connect(this.buzz); this.buzz.connect(this.pan(0.65)); bz.start();
  };
  Sound.prototype.update = function (o) { if (!this.ctx || !this.on) return; var n = this.ctx.currentTime; this.wind.gain.setTargetAtTime(0.16 + o.wind * 0.01, n, 0.8); this.rain.gain.setTargetAtTime(o.rain * 0.2, n, 0.8); this.traffic.gain.setTargetAtTime(0.04 + 0.03 * Math.sin(o.t * 0.07), n, 1); this.buzz.gain.setTargetAtTime(o.lamp * 0.008, n, 0.05); this.hum.gain.setTargetAtTime(o.power * 0.016, n, 0.2); };
  Sound.prototype.burst = function (o) { if (!this.ctx || !this.on) return; var c = this.ctx, n = c.currentTime + (o.at || 0), s = c.createBufferSource(); s.buffer = o.brown ? this.brown : this.white; var f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, n); if (o.glide) f.frequency.exponentialRampToValueAtTime(o.glide, n + o.dur); var g = c.createGain(); g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(o.vol, n + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, n + o.dur); s.connect(f); f.connect(g); g.connect(this.pan(o.pan || 0)); s.start(n, Math.random()); s.stop(n + o.dur + 0.05); };
  Sound.prototype.tone = function (o) { if (!this.ctx || !this.on) return; var c = this.ctx, n = c.currentTime + (o.at || 0), g = c.createGain(); g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(o.vol, n + 0.01); g.gain.setValueAtTime(o.vol, n + Math.max(0.02, o.dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, n + o.dur); g.connect(this.pan(o.pan || 0)); (o.f instanceof Array ? o.f : [o.f]).forEach(function (fr) { var osc = c.createOscillator(); osc.type = o.wave || 'sine'; osc.frequency.setValueAtTime(fr, n); if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, n + o.dur); osc.connect(g); osc.start(n); osc.stop(n + o.dur + 0.05); }); };
  Sound.prototype.ring = function () { this.tone({ f: [440, 480], vol: 0.05, dur: 0.4, pan: -0.6 }); this.tone({ f: [440, 480], vol: 0.05, dur: 0.4, pan: -0.6, at: 0.6 }); };
  Sound.prototype.clunk = function () { this.tone({ f: 90, glide: 40, vol: 0.12, dur: 0.2, pan: -0.62 }); this.burst({ f: 300, vol: 0.06, dur: 0.12, pan: -0.62 }); };
  Sound.prototype.step = function (pan, vol) { this.burst({ f: 600 + Math.random() * 500, vol: vol, dur: 0.05, pan: pan }); };
  Sound.prototype.whoosh = function (dir, dur) { this.burst({ brown: true, type: 'lowpass', f: 250, glide: 900, vol: 0.14, dur: dur, attack: dur * 0.5, pan: 0 }); };
  Sound.prototype.spark = function () { for (var i = 0; i < 7; i++) this.burst({ f: 3200, type: 'highpass', vol: 0.09, dur: 0.03 + Math.random() * 0.06, pan: 0.7, at: i * 0.05 }); this.tone({ f: 120, glide: 28, wave: 'sawtooth', vol: 0.06, dur: 1.4, pan: 0.6, at: 0.4 }); };
  Sound.prototype.powerUp = function () { this.tone({ f: 28, glide: 120, wave: 'sawtooth', vol: 0.05, dur: 1.1, pan: 0.6 }); };
  Sound.prototype.flap = function (pan) { for (var i = 0; i < 5; i++) this.burst({ f: 1600, vol: 0.03, dur: 0.05, pan: pan, at: i * 0.06 }); };
  Sound.prototype.thud = function () { this.tone({ f: 48, glide: 30, vol: 0.09, dur: 0.6 }); };
  Sound.prototype.pickup = function () { this.burst({ f: 900, vol: 0.08, dur: 0.06, pan: -0.6 }); };

  FT.Sound = Sound; 
})(window.FT = window.FT || {});
