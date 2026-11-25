/* Fog Town: cast2.js. The people of the street, as descriptions for the v2 body (town/body2.js).
   About thirty townspeople, generated once from a fixed seed (so the town has the same faces every visit), each with
   a shape, a height, a build, a skin tone, hair, clothes from the town's muted palette with one accent, and their own
   gait. Dressed for the weather: coats and scarves in the cold, coats buttoned in the rain, shirtsleeves in summer.
   Heights fit the street (its doors are 60 px): adults 51-57 px, the elderly a little shorter, kids about 38. */
(function (FT) {
  'use strict';
  var SKIN = ['#f0b890', '#e8a07a', '#e0906a', '#c87a54', '#a86a48', '#8a5238', '#6a4030', '#4e3024'],
    HAIR = ['#141010', '#2a1c16', '#3a2418', '#5a3a22', '#8a5a3a', '#b08850', '#d8b860', '#7a2a1a'], GREY = ['#c8c4bc', '#a8a49c', '#6a6058'],
    SHIRT = ['#c8d0c8', '#d8d0c0', '#e8e2d2', '#8a9aa8', '#a8463a', '#5a6a7a', '#c9a55a', '#7a8a6a', '#d8c8b0', '#4c5a7a'],
    JACKET = ['#4e5a44', '#3a4050', '#6a3a3a', '#5f7470', '#6a564a', '#2a2a2e', '#7a6a5a', '#b8a27a', '#4a4a3a', '#1e1c1e', '#8a5a3a', '#3a4a3a'],
    LEGS = ['#1e1a1a', '#2a2a30', '#34446a', '#3e4a66', '#4a3a3a', '#5a4a3a', '#2a3040', '#4a5a6a', '#2a2224'],
    ACCENT = ['#a8463a', '#c9a55a', '#6a4a32', '#3a5a6a', '#7a2a2a', '#5f7470'];
  function make() {
    var r = FT.rng(20261126), cast = [];
    function pk(a) { return a[(r() * a.length) | 0]; } function rr(a, b) { return a + r() * (b - a); }
    for (var i = 0; i < 30; i++) {
      var age = i < 4 ? 'kid' : i < 8 ? 'elder' : 'adult', shape = r() < 0.5 ? 'm' : 'f', m = shape === 'm';
      var base = {
        height: Math.round(age === 'kid' ? rr(36, 40) : age === 'elder' ? rr(50, 53) : m ? rr(54, 57) : rr(51, 54)),
        build: age === 'kid' ? 0.85 : m ? rr(0.95, 1.25) : rr(0.9, 1.05), shape: shape, skin: pk(SKIN),
        hair: { style: m ? (age !== 'kid' && r() < 0.14 ? 'bald' : 'short') : pk(['long', 'long', 'bun', 'short']), col: age === 'elder' ? pk(GREY) : pk(HAIR) },
        face: { glasses: age !== 'kid' && r() < 0.16 ? (r() < 0.3 ? 'sun' : 'clear') : null, beard: m && age !== 'kid' && r() < 0.22 },
        shirt: { col: pk(SHIRT), sleeves: 'long' }, tie: m && age === 'adult' && r() < 0.3 ? pk(['#7a2a2a', '#3a4a6a', '#c9a55a', '#2a2a2e']) : null, belt: r() < 0.35 ? '#2a2018' : null,
        jacket: r() < 0.55 ? { col: pk(JACKET), open: r() < 0.7, len: 'hip', leather: r() < 0.12 } : null,
        legs: { col: pk(LEGS), type: !m && r() < 0.45 ? 'skirt' : 'trousers', tights: r() < 0.5 ? '#2e2828' : null }, shoes: { col: pk(['#141212', '#2a2018', '#3a2a22']), boots: !m && r() < 0.4 },
        accent: { type: r() < 0.2 ? 'bag' : r() < 0.12 ? 'cap' : null, col: pk(ACCENT) },
        gait: age === 'kid' ? { stride: 1.1, bob: 1.3, swing: 1.2, lean: -0.2, ms: 68 } : age === 'elder' ? { stride: rr(0.58, 0.7), bob: 0.45, swing: 0.35, lean: rr(1, 1.5), ms: Math.round(rr(112, 126)) } :
          { stride: rr(0.92, 1.08), bob: rr(0.85, 1.15), swing: rr(0.8, 1.1), lean: rr(0, 0.4), ms: Math.round(rr(74, 90)) }
      };
      var coat = { col: pk(JACKET), len: pk(['knee', 'knee', 'calf', 'hip']), open: r() < 0.5 }, scarf = r() < 0.35, summerBare = r() < 0.6, short = r() < 0.5;
      cast.push({ id: 'p' + i, v2: true, age: age, base: base, coat: coat, scarf: scarf, summerBare: summerBare, short: short });
    }
    return cast;
  }
  // a person dressed for the weather ('cold', 'snow', 'rain' or 'summer'); in rain and snow they hunch into it a little
  function dress(def, clim) {
    var s = JSON.parse(JSON.stringify(def.base));
    if (clim === 'snow' || clim === 'rain') s.gait = Object.assign({}, s.gait, { lean: (s.gait.lean || 0) + (clim === 'rain' ? 1.6 : 1), ms: Math.round(s.gait.ms * 0.94) });
    if (clim === 'snow') clim = 'cold';
    if (clim === 'cold' || clim === 'rain') {
      if (!s.jacket || s.jacket.len === 'hip' || clim === 'rain') s.jacket = { col: def.coat.col, len: clim === 'rain' ? 'knee' : def.coat.len, open: clim === 'rain' ? false : def.coat.open, leather: false };
      if (def.scarf && def.age !== 'kid' && !s.accent.type) s.accent = { type: 'scarf', col: s.accent.col };
    } else if (clim === 'summer') { if (def.summerBare) s.jacket = null; if (def.short) s.shirt.sleeves = 'short'; }
    return s;
  }
  FT.CAST2 = make(); FT.dress = dress;
})(window.FT = window.FT || {});
