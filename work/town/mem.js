/* Fog Town: mem.js. The memory budget, and the meter that checks it.
   Almost all of the town's memory is canvas pixels (width x height x 4 bytes). The budget for them is FT.MEM_CAP.
   With ?debug=mem the meter walks everything the town holds, from its roots (both worlds, both scenes, the crowd,
   the shared scratch buffers, the page's own canvases), adds up every canvas it reaches, and keeps the peak.
   Otherwise none of this runs. */
(function (FT) {
  'use strict';
  FT.MEM_CAP = 48 * 1024 * 1024;   // the budget for canvas pixels: 48 MB, rust world and all
  FT.memRoots = function () {}; FT.mem = function () {}; FT.memTick = function () {};
  if (!/[?&]debug=mem/.test(location.search)) return;
  var roots = null, peak = 0, peakAt = '', ticks = 0;
  FT.memRoots = function (fn) { roots = fn; };
  function walk() {
    var seen = new Set(), by = {}, total = 0, n = 0;
    function add(c, label) { if (seen.has(c)) return; seen.add(c); var b = c.width * c.height * 4; if (!b) return; total += b; n++; (by[label] = by[label] || { n: 0, b: 0 }); by[label].n++; by[label].b += b; }
    function visit(v, label, depth) {
      if (!v || typeof v !== 'object') return;
      if (v instanceof HTMLCanvasElement) { add(v, label); return; }
      if (v instanceof Node || v instanceof CanvasRenderingContext2D || v === window || seen.has(v)) return; seen.add(v);
      var arr = Array.isArray(v), ks = Object.keys(v);
      for (var i = 0; i < ks.length; i++) visit(v[ks[i]], arr || depth >= 2 ? label : label + '.' + ks[i], depth + (arr ? 0 : 1));
    }
    var r = roots ? roots() : {}; Object.keys(r).forEach(function (k) { visit(r[k], k, 1); });
    Array.prototype.forEach.call(document.querySelectorAll('canvas'), function (c) { add(c, 'page #' + c.id); });
    return { total: total, n: n, by: by };
  }
  function mb(b) { return (b / 1048576).toFixed(1) + ' MB'; }
  FT.memTick = function (label) { if (++ticks % 15) return; var w = walk(); if (w.total > peak) { peak = w.total; peakAt = label; } };
  FT.mem = function (label, rows) {
    var w = walk(); if (w.total > peak) { peak = w.total; peakAt = label; }
    var out = 'MEM ' + label + ': ' + mb(w.total) + ' in ' + w.n + ' canvases | peak ' + mb(peak) + ' (' + peakAt + ') | cap ' + mb(FT.MEM_CAP) + (peak > FT.MEM_CAP ? ' | OVER THE CAP' : '');
    if (performance.memory) out += ' | JS heap ' + mb(performance.memory.usedJSHeapSize);
    if (rows) out += '\n' + Object.keys(w.by).sort(function (a, b) { return w.by[b].b - w.by[a].b; }).slice(0, rows).map(function (k) { return '  ' + mb(w.by[k].b) + '  x' + w.by[k].n + '  ' + k; }).join('\n');
    console.log(out); return w.total;
  };
})(window.FT = window.FT || {});
