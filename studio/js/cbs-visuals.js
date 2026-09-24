/* Client Build Studio — the visual engine.

   One registry, many renderers. A visual is a *spec* (plain data) that a local
   renderer turns into SVG nodes. The model never authors markup: Tier 2 emits a
   spec object, the spec is validated and clamped here, and only then is anything
   drawn. That is what keeps the XSS door shut — the same lesson the pitch site's
   chat log already learned.

   Every node is built with createElementNS and textContent. Export uses
   XMLSerializer on those same nodes, so the exported string is safe by
   construction rather than by escaping discipline. */
(function (w) {
  'use strict';

  var d = w.document;
  var NS = 'http://www.w3.org/2000/svg';
  var T = w.CBS_TOKENS;

  function svg(tag, attrs, kids) {
    var n = d.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') { n.textContent = String(v); return; }
      n.setAttribute(k, String(v));
    });
    (Array.isArray(kids) ? kids : kids ? [kids] : []).forEach(function (c) {
      if (c) n.appendChild(c);
    });
    return n;
  }

  /* ---------------------------------------------------------- validation */
  function num(v, lo, hi, dflt) {
    var n = typeof v === 'number' && isFinite(v) ? v : parseFloat(v);
    if (!isFinite(n)) return dflt;
    return Math.min(hi, Math.max(lo, n));
  }
  function str(v, max) {
    return String(v === null || v === undefined ? '' : v).slice(0, max || 120);
  }
  function arr(v, max) { return Array.isArray(v) ? v.slice(0, max || 24) : []; }

  /* Every spec passes through here before a renderer sees it. Unknown fields are
     dropped rather than trusted; sizes are clamped so a hostile spec cannot
     produce a 10-million-pixel canvas. */
  function validate(kind, raw) {
    var s = raw && typeof raw === 'object' ? raw : {};
    var out = {
      kind: kind,
      title: str(s.title, 120),
      caption: str(s.caption, 240),
      width: num(s.width, 120, 1600, 640),
      height: num(s.height, 80, 1200, 360)
    };
    var series = arr(s.series, 8).map(function (ser) {
      return {
        name: str(ser && ser.name, 40),
        points: arr(ser && ser.points, 40).map(function (p) {
          return { label: str(p && p.label, 32), value: num(p && p.value, -1e9, 1e9, 0) };
        })
      };
    }).filter(function (ser) { return ser.points.length; });

    out.series = series;
    out.nodes = arr(s.nodes, 24).map(function (n) {
      return { id: str(n && n.id, 40), label: str(n && n.label, 60), note: str(n && n.note, 120) };
    });
    out.axes = { x: str(s.axes && s.axes.x, 40), y: str(s.axes && s.axes.y, 40) };
    out.quadrants = arr(s.quadrants, 4).map(function (q) { return str(q, 40); });
    out.zeroBased = s.zeroBased !== false;
    out.seed = str(s.seed, 80);
    return out;
  }

  /* ------------------------------------------------------------- helpers */
  function palette() {
    var model = (w.CBS_STATE && w.CBS_STATE.get().tokens) || null;
    return T.derive(model);
  }

  function label(x, y, text, opts) {
    opts = opts || {};
    return svg('text', {
      x: x, y: y, fill: opts.fill || 'currentColor',
      'font-size': opts.size || 11,
      'font-family': opts.mono ? 'ui-monospace, monospace' : 'system-ui, sans-serif',
      'font-weight': opts.weight || 400,
      'text-anchor': opts.anchor || 'start',
      'dominant-baseline': opts.baseline || 'auto',
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      text: text
    });
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  }

  /* A tiny deterministic PRNG so a given seed always draws the same mark. */
  function rng(seed) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return function () {
      h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0;
      return h / 4294967296;
    };
  }

  /* ============================================================ RENDERERS */
  var R = {};

  /* --- charts ----------------------------------------------------------- */
  R['chart.bar'] = function (s, p) {
    var W = s.width, H = s.height, m = { t: 28, r: 16, b: 42, l: 52 };
    var pts = (s.series[0] || { points: [] }).points;
    var max = niceMax(Math.max.apply(null, pts.map(function (x) { return x.value; }).concat([0])));
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var bw = pts.length ? Math.min(56, (iw / pts.length) * 0.62) : 10;
    var kids = [];

    [0, .25, .5, .75, 1].forEach(function (f) {
      var y = m.t + ih - ih * f;
      kids.push(svg('line', { x1: m.l, y1: y, x2: W - m.r, y2: y, stroke: p.model.muted, 'stroke-opacity': .15 }));
      kids.push(label(m.l - 8, y + 3, String(Math.round(max * f)), { anchor: 'end', size: 10, fill: p.model.muted, mono: true }));
    });

    pts.forEach(function (pt, i) {
      var x = m.l + (iw / pts.length) * (i + .5) - bw / 2;
      var h = max ? (pt.value / max) * ih : 0;
      kids.push(svg('rect', {
        x: x, y: m.t + ih - h, width: bw, height: Math.max(0, h),
        fill: p.series[0], rx: 3
      }));
      kids.push(label(x + bw / 2, H - m.b + 16, pt.label, { anchor: 'middle', size: 10, fill: p.model.muted }));
    });
    kids.push(svg('line', { x1: m.l, y1: m.t + ih, x2: W - m.r, y2: m.t + ih, stroke: p.model.muted, 'stroke-opacity': .4 }));
    return kids;
  };

  R['chart.line'] = function (s, p) {
    var W = s.width, H = s.height, m = { t: 28, r: 16, b: 42, l: 52 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var all = s.series.reduce(function (a, ser) { return a.concat(ser.points.map(function (x) { return x.value; })); }, [0]);
    var max = niceMax(Math.max.apply(null, all));
    var kids = [];

    [0, .25, .5, .75, 1].forEach(function (f) {
      var y = m.t + ih - ih * f;
      kids.push(svg('line', { x1: m.l, y1: y, x2: W - m.r, y2: y, stroke: p.model.muted, 'stroke-opacity': .15 }));
      kids.push(label(m.l - 8, y + 3, String(Math.round(max * f)), { anchor: 'end', size: 10, fill: p.model.muted, mono: true }));
    });

    s.series.forEach(function (ser, si) {
      var n = ser.points.length;
      var dPath = ser.points.map(function (pt, i) {
        var x = m.l + (n > 1 ? (iw / (n - 1)) * i : iw / 2);
        var y = m.t + ih - (max ? (pt.value / max) * ih : 0);
        return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }).join(' ');
      kids.push(svg('path', { d: dPath, fill: 'none', stroke: p.series[si % p.series.length], 'stroke-width': 2, 'stroke-linejoin': 'round' }));
      ser.points.forEach(function (pt, i) {
        var x = m.l + (n > 1 ? (iw / (n - 1)) * i : iw / 2);
        var y = m.t + ih - (max ? (pt.value / max) * ih : 0);
        kids.push(svg('circle', { cx: x, cy: y, r: 3, fill: p.series[si % p.series.length] }));
        if (si === 0) kids.push(label(x, H - m.b + 16, pt.label, { anchor: 'middle', size: 10, fill: p.model.muted }));
      });
    });

    s.series.forEach(function (ser, si) {
      if (!ser.name) return;
      kids.push(svg('rect', { x: m.l + si * 120, y: 8, width: 9, height: 9, rx: 2, fill: p.series[si % p.series.length] }));
      kids.push(label(m.l + si * 120 + 14, 16, ser.name, { size: 10, fill: p.model.muted }));
    });
    return kids;
  };

  R['chart.donut'] = function (s, p) {
    var W = s.width, H = s.height;
    var cx = W * 0.32, cy = H / 2, rOut = Math.min(W * 0.26, H * 0.38), rIn = rOut * 0.58;
    var pts = (s.series[0] || { points: [] }).points;
    var total = pts.reduce(function (a, x) { return a + Math.max(0, x.value); }, 0) || 1;
    var kids = [], a0 = -Math.PI / 2;

    pts.forEach(function (pt, i) {
      var frac = Math.max(0, pt.value) / total;
      var a1 = a0 + frac * Math.PI * 2;
      var large = frac > .5 ? 1 : 0;
      function pl(r, a) { return [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)]; }
      kids.push(svg('path', {
        d: ['M', pl(rOut, a0), 'A', rOut, rOut, 0, large, 1, pl(rOut, a1),
            'L', pl(rIn, a1), 'A', rIn, rIn, 0, large, 0, pl(rIn, a0), 'Z'].join(' '),
        fill: p.series[i % p.series.length]
      }));
      kids.push(svg('rect', { x: W * 0.62, y: 30 + i * 22, width: 9, height: 9, rx: 2, fill: p.series[i % p.series.length] }));
      kids.push(label(W * 0.62 + 15, 38 + i * 22, pt.label + '  ' + Math.round(frac * 100) + '%', { size: 11, fill: p.model.ink }));
      a0 = a1;
    });
    return kids;
  };

  R['chart.stacked'] = function (s, p) {
    var W = s.width, H = s.height, m = { t: 28, r: 16, b: 42, l: 52 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var cats = (s.series[0] || { points: [] }).points.map(function (x) { return x.label; });
    var totals = cats.map(function (_, i) {
      return s.series.reduce(function (a, ser) { return a + Math.max(0, (ser.points[i] || {}).value || 0); }, 0);
    });
    var max = niceMax(Math.max.apply(null, totals.concat([0])));
    var bw = cats.length ? Math.min(56, (iw / cats.length) * 0.6) : 10;
    var kids = [];

    cats.forEach(function (c, i) {
      var x = m.l + (iw / cats.length) * (i + .5) - bw / 2;
      var yCur = m.t + ih;
      s.series.forEach(function (ser, si) {
        var v = Math.max(0, (ser.points[i] || {}).value || 0);
        var h = max ? (v / max) * ih : 0;
        yCur -= h;
        kids.push(svg('rect', { x: x, y: yCur, width: bw, height: Math.max(0, h), fill: p.series[si % p.series.length] }));
      });
      kids.push(label(x + bw / 2, H - m.b + 16, c, { anchor: 'middle', size: 10, fill: p.model.muted }));
    });
    kids.push(svg('line', { x1: m.l, y1: m.t + ih, x2: W - m.r, y2: m.t + ih, stroke: p.model.muted, 'stroke-opacity': .4 }));
    s.series.forEach(function (ser, si) {
      if (!ser.name) return;
      kids.push(svg('rect', { x: m.l + si * 110, y: 8, width: 9, height: 9, rx: 2, fill: p.series[si % p.series.length] }));
      kids.push(label(m.l + si * 110 + 14, 16, ser.name, { size: 10, fill: p.model.muted }));
    });
    return kids;
  };

  R['chart.slope'] = function (s, p) {
    var W = s.width, H = s.height, m = { t: 34, r: 130, b: 30, l: 130 };
    var ih = H - m.t - m.b;
    /* A slope chart is before-against-after, so it plots the FIRST and LAST
       point of each series — not the first two. Scaling to points it does not
       draw is how a slope chart ends up flat against the floor, which is the
       encoding overstating nothing and understating everything. */
    function ends(ser) {
      var pts = ser.points || [];
      return [pts[0] || { value: 0 }, pts[pts.length - 1] || pts[0] || { value: 0 }];
    }
    var drawn = s.series.reduce(function (a, ser) {
      var e = ends(ser); return a.concat([e[0].value || 0, e[1].value || 0]);
    }, [0]);
    var max = niceMax(Math.max.apply(null, drawn));
    var kids = [];
    var first = s.series[0] ? ends(s.series[0]) : [{}, {}];
    var l0 = first[0].label || 'before';
    var l1 = first[1].label || 'after';
    kids.push(label(m.l, 20, l0, { size: 10, anchor: 'middle', fill: p.model.muted, mono: true }));
    kids.push(label(W - m.r, 20, l1, { size: 10, anchor: 'middle', fill: p.model.muted, mono: true }));
    /* Say so when the series carries points this encoding does not show. */
    var skipped = s.series.reduce(function (n, ser) { return Math.max(n, (ser.points || []).length - 2); }, 0);
    if (skipped > 0) {
      kids.push(label(W / 2, H - 8, skipped + ' intermediate point(s) not shown — a slope chart plots endpoints only',
        { size: 9, anchor: 'middle', fill: p.model.muted, mono: true, opacity: .8 }));
    }

    s.series.forEach(function (ser, si) {
      var e = ends(ser);
      var a = e[0].value || 0, b = e[1].value || 0;
      var ya = m.t + ih - (max ? (a / max) * ih : 0);
      var yb = m.t + ih - (max ? (b / max) * ih : 0);
      var col = p.series[si % p.series.length];
      kids.push(svg('line', { x1: m.l, y1: ya, x2: W - m.r, y2: yb, stroke: col, 'stroke-width': 2 }));
      kids.push(svg('circle', { cx: m.l, cy: ya, r: 4, fill: col }));
      kids.push(svg('circle', { cx: W - m.r, cy: yb, r: 4, fill: col }));
      kids.push(label(m.l - 12, ya + 4, ser.name || String(a), { anchor: 'end', size: 11, fill: p.model.ink }));
      kids.push(label(W - m.r + 12, yb + 4, String(b), { size: 11, fill: p.model.ink, mono: true }));
    });
    return kids;
  };

  /* --- diagrams --------------------------------------------------------- */
  R['diagram.flow'] = function (s, p) {
    var W = s.width, n = s.nodes.length || 1;
    var boxW = Math.min(170, (W - 40 - (n - 1) * 26) / n), boxH = 74;
    var y = s.height / 2 - boxH / 2;
    var kids = [];
    s.nodes.forEach(function (node, i) {
      var x = 20 + i * (boxW + 26);
      kids.push(svg('rect', { x: x, y: y, width: boxW, height: boxH, rx: 10, fill: p.model.surface, stroke: p.model.accent, 'stroke-opacity': .45 }));
      kids.push(label(x + boxW / 2, y + 28, node.label, { anchor: 'middle', size: 12, weight: 700, fill: p.model.ink }));
      if (node.note) kids.push(label(x + boxW / 2, y + 48, node.note, { anchor: 'middle', size: 10, fill: p.model.muted }));
      if (i < n - 1) {
        var ax = x + boxW, mid = y + boxH / 2;
        kids.push(svg('line', { x1: ax + 4, y1: mid, x2: ax + 20, y2: mid, stroke: p.model.accent, 'stroke-width': 1.5 }));
        kids.push(svg('path', { d: 'M' + (ax + 20) + ' ' + mid + ' l-6 -4 v8 z', fill: p.model.accent }));
      }
    });
    return kids;
  };

  R['diagram.matrix'] = function (s, p) {
    var W = s.width, H = s.height, m = 54;
    var iw = W - m * 2, ih = H - m * 2;
    var kids = [
      svg('rect', { x: m, y: m, width: iw, height: ih, fill: 'none', stroke: p.model.muted, 'stroke-opacity': .3 }),
      svg('line', { x1: m + iw / 2, y1: m, x2: m + iw / 2, y2: m + ih, stroke: p.model.muted, 'stroke-opacity': .3 }),
      svg('line', { x1: m, y1: m + ih / 2, x2: m + iw, y2: m + ih / 2, stroke: p.model.muted, 'stroke-opacity': .3 })
    ];
    var q = s.quadrants;
    [[m + iw * .25, m + ih * .25], [m + iw * .75, m + ih * .25],
     [m + iw * .25, m + ih * .75], [m + iw * .75, m + ih * .75]].forEach(function (c, i) {
      if (q[i]) kids.push(label(c[0], c[1], q[i], { anchor: 'middle', size: 12, weight: 700, fill: p.model.ink, opacity: .8 }));
    });
    s.nodes.forEach(function (node, i) {
      var r = rng((s.seed || 'm') + node.id + i);
      var x = m + 24 + r() * (iw - 48), y = m + 24 + r() * (ih - 48);
      kids.push(svg('circle', { cx: x, cy: y, r: 6, fill: p.series[i % p.series.length] }));
      kids.push(label(x + 11, y + 4, node.label, { size: 10, fill: p.model.ink }));
    });
    if (s.axes.x) kids.push(label(W / 2, H - 16, s.axes.x, { anchor: 'middle', size: 10, mono: true, fill: p.model.muted }));
    if (s.axes.y) {
      var t = label(0, 0, s.axes.y, { anchor: 'middle', size: 10, mono: true, fill: p.model.muted });
      t.setAttribute('transform', 'translate(18,' + (H / 2) + ') rotate(-90)');
      kids.push(t);
    }
    return kids;
  };

  R['diagram.timeline'] = function (s, p) {
    var W = s.width, n = s.nodes.length || 1, y = s.height / 2;
    var kids = [svg('line', { x1: 30, y1: y, x2: W - 30, y2: y, stroke: p.model.muted, 'stroke-opacity': .35 })];
    s.nodes.forEach(function (node, i) {
      var x = 30 + (n > 1 ? ((W - 60) / (n - 1)) * i : (W - 60) / 2);
      var up = i % 2 === 0;
      kids.push(svg('circle', { cx: x, cy: y, r: 6, fill: p.series[i % p.series.length] }));
      kids.push(svg('line', { x1: x, y1: y + (up ? -8 : 8), x2: x, y2: y + (up ? -26 : 26), stroke: p.model.muted, 'stroke-opacity': .4 }));
      kids.push(label(x, y + (up ? -34 : 44), node.label, { anchor: 'middle', size: 11, weight: 700, fill: p.model.ink }));
      if (node.note) kids.push(label(x, y + (up ? -20 : 58), node.note, { anchor: 'middle', size: 9, fill: p.model.muted, mono: true }));
    });
    return kids;
  };

  R['diagram.layers'] = function (s, p) {
    var W = s.width, n = s.nodes.length || 1;
    var h = Math.min(52, (s.height - 30) / n), kids = [];
    s.nodes.forEach(function (node, i) {
      var y = 16 + i * (h + 8), inset = i * 10;
      kids.push(svg('rect', {
        x: 24 + inset, y: y, width: W - 48 - inset * 2, height: h, rx: 8,
        fill: p.series[i % p.series.length], 'fill-opacity': .16,
        stroke: p.series[i % p.series.length], 'stroke-opacity': .5
      }));
      kids.push(label(38 + inset, y + h / 2 + 4, node.label, { size: 12, weight: 700, fill: p.model.ink }));
      if (node.note) kids.push(label(W - 38 - inset, y + h / 2 + 4, node.note, { anchor: 'end', size: 10, fill: p.model.muted }));
    });
    return kids;
  };

  R['diagram.arch'] = function (s, p) {
    var W = s.width, H = s.height, n = Math.max(3, s.nodes.length);
    var cx = W / 2, cy = H - 26, r1 = Math.min(W, H * 2) * .22, r2 = r1 * 1.55;
    var kids = [], mid = Math.floor(n / 2);
    for (var i = 0; i < n; i++) {
      var a0 = Math.PI - (i / n) * Math.PI - .005, a1 = Math.PI - ((i + 1) / n) * Math.PI + .005;
      function pt(r, a) { return [(cx + r * Math.cos(a)).toFixed(2), (cy - r * Math.sin(a)).toFixed(2)]; }
      var isKey = i === mid;
      kids.push(svg('path', {
        d: ['M', pt(r1, a0), 'L', pt(r2, a0), 'A', r2, r2, 0, 0, 1, pt(r2, a1),
            'L', pt(r1, a1), 'A', r1, r1, 0, 0, 0, pt(r1, a0), 'Z'].join(' '),
        fill: isKey ? p.model.accent : p.model.surface,
        'fill-opacity': isKey ? .9 : .5,
        stroke: p.model.accent, 'stroke-opacity': isKey ? 1 : .35
      }));
    }
    kids.push(svg('line', { x1: 20, y1: cy + 4, x2: W - 20, y2: cy + 4, stroke: p.model.muted, 'stroke-opacity': .3 }));
    return kids;
  };

  /* --- brand marks ------------------------------------------------------ */
  /* Deterministic from the seed: the same client always yields the same mark. */
  R['mark.monogram'] = function (s, p) {
    var W = s.width, H = s.height, seed = s.seed || s.title || 'studio';
    var r = rng(seed), kids = [];
    var cx = W / 2, cy = H / 2, R0 = Math.min(W, H) * .34;
    var facets = 5 + Math.floor(r() * 4);
    for (var i = 0; i < facets; i++) {
      var a = (i / facets) * Math.PI * 2 + r() * .3;
      var rr = R0 * (.45 + r() * .55);
      kids.push(svg('path', {
        d: ['M', cx, cy,
            'L', (cx + rr * Math.cos(a)).toFixed(1), (cy + rr * Math.sin(a)).toFixed(1),
            'L', (cx + rr * Math.cos(a + 1.1)).toFixed(1), (cy + rr * Math.sin(a + 1.1)).toFixed(1),
            'Z'].join(' '),
        fill: p.series[i % p.series.length], 'fill-opacity': .55 + r() * .35
      }));
    }
    kids.push(svg('circle', { cx: cx, cy: cy, r: R0 * .22, fill: p.model.ground }));
    var initials = seed.split(/\s+/).slice(0, 2).map(function (x) { return (x[0] || '').toUpperCase(); }).join('');
    kids.push(label(cx, cy + 5, initials, { anchor: 'middle', size: R0 * .32, weight: 800, fill: p.model.accent }));
    return kids;
  };

  R['mark.cover'] = function (s, p) {
    var W = s.width, H = s.height, r = rng(s.seed || s.title || 'cover'), kids = [];
    kids.push(svg('rect', { x: 0, y: 0, width: W, height: H, fill: p.model.ground }));
    for (var i = 0; i < 26; i++) {
      var y = r() * H;
      kids.push(svg('line', {
        x1: 0, y1: y, x2: W, y2: y + (r() - .5) * 90,
        stroke: p.series[i % p.series.length], 'stroke-opacity': .06 + r() * .14, 'stroke-width': .5 + r() * 2.5
      }));
    }
    var ry = Math.min(W, H) * .18;
    kids.push(svg('circle', { cx: W * .74, cy: H * .34, r: ry, fill: p.model.accent, 'fill-opacity': .1 }));
    if (s.title) kids.push(label(40, H - 52, s.title, { size: Math.min(30, W / 16), weight: 800, fill: p.model.ink }));
    if (s.caption) kids.push(label(40, H - 26, s.caption, { size: 12, fill: p.model.muted, mono: true }));
    return kids;
  };

  /* --- UI mockup -------------------------------------------------------- */
  R['mockup.screen'] = function (s, p) {
    var W = s.width, H = s.height, kids = [];
    var phone = W < 420;
    kids.push(svg('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: phone ? 22 : 10, fill: p.model.ground, stroke: p.model.muted, 'stroke-opacity': .35 }));
    kids.push(svg('rect', { x: 12, y: 14, width: W - 24, height: 30, rx: 6, fill: p.model.surface }));
    kids.push(svg('circle', { cx: 28, cy: 29, r: 6, fill: p.model.accent }));
    kids.push(label(44, 33, s.title || 'Navigation', { size: 10, fill: p.model.muted, mono: true }));
    var y = 58;
    s.nodes.slice(0, 6).forEach(function (node, i) {
      var h = i === 0 ? 74 : 46;
      kids.push(svg('rect', { x: 12, y: y, width: W - 24, height: h, rx: 8, fill: p.model.surface, stroke: p.model.muted, 'stroke-opacity': .18 }));
      kids.push(label(24, y + 20, node.label, { size: 11, weight: 700, fill: p.model.ink }));
      if (node.note) kids.push(label(24, y + 36, node.note, { size: 9, fill: p.model.muted }));
      if (i === 0) kids.push(svg('rect', { x: 24, y: y + 46, width: 88, height: 18, rx: 9, fill: p.model.accent }));
      y += h + 10;
      if (y > H - 30) return;
    });
    return kids;
  };

  /* ============================================================== render */
  var KINDS = Object.keys(R);

  var META = {
    'chart.bar':        { group: 'Data charts', label: 'Bar chart', needs: 'series' },
    'chart.line':       { group: 'Data charts', label: 'Line chart', needs: 'series' },
    'chart.stacked':    { group: 'Data charts', label: 'Stacked bars', needs: 'series' },
    'chart.donut':      { group: 'Data charts', label: 'Donut', needs: 'series' },
    'chart.slope':      { group: 'Data charts', label: 'Slope (before/after)', needs: 'series' },
    'diagram.flow':     { group: 'Structural diagrams', label: 'Flow', needs: 'nodes' },
    'diagram.matrix':   { group: 'Structural diagrams', label: '2×2 matrix', needs: 'nodes' },
    'diagram.timeline': { group: 'Structural diagrams', label: 'Timeline', needs: 'nodes' },
    'diagram.layers':   { group: 'Structural diagrams', label: 'Layer stack', needs: 'nodes' },
    'diagram.arch':     { group: 'Structural diagrams', label: 'Arch', needs: 'nodes' },
    'mark.monogram':    { group: 'Brand', label: 'Monogram mark', needs: 'seed' },
    'mark.cover':       { group: 'Brand', label: 'Cover art', needs: 'seed' },
    'mockup.screen':    { group: 'UI mockups', label: 'Screen mockup', needs: 'nodes' }
  };

  /* Returns an <svg> element. Unknown kinds render an honest placeholder
     rather than throwing or drawing something misleading. */
  function render(kind, rawSpec) {
    var p = palette();
    var s = validate(kind, rawSpec);
    var fn = R[kind];
    var root = svg('svg', {
      viewBox: '0 0 ' + s.width + ' ' + s.height,
      width: '100%', role: 'img',
      'aria-label': s.title || (META[kind] && META[kind].label) || kind,
      style: 'color:' + p.model.ink + ';background:' + p.model.ground + ';border-radius:10px;display:block'
    });
    if (!fn) {
      root.appendChild(label(s.width / 2, s.height / 2, 'Unknown visual kind: ' + kind,
        { anchor: 'middle', size: 12, fill: p.model.negative }));
      return root;
    }
    if (s.title) root.appendChild(label(16, 18, s.title, { size: 11, weight: 700, fill: p.model.ink, mono: true }));
    fn(s, p).forEach(function (n) { root.appendChild(n); });
    if (s.caption) root.appendChild(label(16, s.height - 8, s.caption, { size: 9, fill: p.model.muted }));
    return root;
  }

  /* Serialize for export. Operates on real nodes, so text is already escaped. */
  function toSVGString(kind, spec) {
    var node = render(kind, spec);
    node.setAttribute('xmlns', NS);
    return new w.XMLSerializer().serializeToString(node);
  }

  /* Tier 1: build a spec deterministically from whatever the artifact knows. */
  function composeSpec(kind, ctx) {
    ctx = ctx || {};
    var intake = (w.CBS_STATE && w.CBS_STATE.get().intake) || {};
    var client = intake.client || 'Client';
    var meta = META[kind] || {};
    var base = { title: ctx.title || meta.label || kind, seed: client, caption: ctx.caption || '' };

    if (meta.needs === 'series') {
      base.series = [{
        name: 'Series A',
        points: ['Q1', 'Q2', 'Q3', 'Q4'].map(function (l, i) {
          return { label: l, value: [3, 5, 4, 8][i] };
        })
      }];
      base.caption = base.caption || '[NEEDS EVIDENCE: replace with real figures and register each as a claim]';
    } else if (meta.needs === 'nodes') {
      base.nodes = ['Frame', 'Ground', 'Shape', 'Prove'].map(function (l, i) {
        return { id: 'n' + i, label: l, note: '' };
      });
      base.quadrants = ['High / Low', 'High / High', 'Low / Low', 'Low / High'];
      base.axes = { x: '[NEEDS DECISION: x axis]', y: '[NEEDS DECISION: y axis]' };
      base.caption = base.caption || '[NEEDS DECISION: replace the placeholder nodes]';
    }
    return validate(kind, base);
  }

  w.CBS_VISUALS = {
    KINDS: KINDS, META: META,
    validate: validate,
    render: render,
    toSVGString: toSVGString,
    composeSpec: composeSpec,
    palette: palette,
    rng: rng
  };
})(window);
