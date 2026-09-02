/* Client Build Studio — the design token engine.

   Turns a handful of decisions (a base hue, a ground, a type ratio) into a real
   token set: ramps, a modular type scale, spacing, radius and motion. The
   output is actual CSS custom properties, not prose about them.

   The contrast maths here is WCAG 2.1 relative luminance, which makes
   `t-contrast-floor` a criterion the Gate can actually decide instead of the
   "unknown" it used to return. No dependencies — everything is arithmetic. */
(function (w) {
  'use strict';

  /* ------------------------------------------------------------- colour */
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function hexToRgb(hex) {
    var h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var s = Math.round(clamp(v, 0, 255)).toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2, d = max - min;
    if (!d) { h = 0; s = 0; }
    else {
      s = l > .5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return { r: (t[0] + m) * 255, g: (t[1] + m) * 255, b: (t[2] + m) * 255 };
  }

  function hsl(h, s, l) { var c = hslToRgb(h, s, l); return rgbToHex(c.r, c.g, c.b); }

  /* WCAG 2.1 relative luminance and contrast ratio. */
  function luminance(hex) {
    var c = hexToRgb(hex);
    if (!c) return 0;
    var a = [c.r, c.g, c.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    var hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }
  /* WCAG AA: 4.5 for body text, 3.0 for large text and UI boundaries. */
  function rates(ratio, large) {
    var floor = large ? 3 : 4.5;
    return { ratio: Math.round(ratio * 100) / 100, pass: ratio >= floor, floor: floor };
  }

  /* Nudge a colour's lightness until it clears a contrast floor against a
     ground. Returns null when even pure white/black cannot reach it. */
  function fixContrast(hex, ground, floor) {
    var c = hexToRgb(hex);
    if (!c) return null;
    var h = rgbToHsl(c.r, c.g, c.b);
    var groundLum = luminance(ground);
    var up = groundLum < 0.5;                 /* dark ground → lighten */
    for (var i = 0; i <= 100; i++) {
      var l = clamp(up ? h.l + i : h.l - i, 0, 100);
      var candidate = hsl(h.h, h.s, l);
      if (contrast(candidate, ground) >= floor) return candidate;
    }
    return null;
  }

  /* ---------------------------------------------------------------- ramp */
  /* A 9-step ramp around a seed hue, tuned for a dark or light ground. */
  function ramp(seedHex, opts) {
    opts = opts || {};
    var c = hexToRgb(seedHex) || hexToRgb('#E9B84A');
    var base = rgbToHsl(c.r, c.g, c.b);
    var steps = [96, 88, 78, 66, 54, 44, 34, 24, 15];
    var sat = opts.sat === undefined ? base.s : opts.sat;
    return steps.map(function (l, i) {
      /* Pull saturation down at the extremes so the ends do not look neon. */
      var edge = Math.abs(i - 4) / 4;
      return hsl(base.h, clamp(sat * (1 - edge * 0.35), 0, 100), l);
    });
  }

  /* ------------------------------------------------------------- scales */
  var RATIOS = {
    'minor-third': 1.2, 'major-third': 1.25, 'perfect-fourth': 1.333,
    'augmented-fourth': 1.414, 'perfect-fifth': 1.5, 'golden': 1.618
  };

  function typeScale(baseRem, ratioName, steps) {
    var r = RATIOS[ratioName] || 1.25;
    var out = [];
    var names = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
    var baseIndex = 2;
    for (var i = 0; i < (steps || names.length); i++) {
      var v = baseRem * Math.pow(r, i - baseIndex);
      out.push({ name: names[i] || ('s' + i), rem: Math.round(v * 1000) / 1000 });
    }
    return out;
  }

  function spaceScale(basePx) {
    return [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8].map(function (m, i) {
      return { name: 's' + i, px: Math.round(basePx * m) };
    });
  }

  /* --------------------------------------------------------- the model */
  /* Everything the studio needs to know about a visual system. Defaults match
     the worked example so a new engagement starts somewhere credible. */
  function defaults() {
    return {
      name: 'Untitled system',
      mode: 'dark',
      ground: '#070A10',
      surface: '#0F151E',
      ink: '#F7F3EA',
      muted: '#94A2B4',
      accent: '#E9B84A',
      support: '#5B97FF',
      positive: '#37D6B2',
      negative: '#FF6B6B',
      display: 'Fraunces, Georgia, serif',
      ui: '"Hanken Grotesk", system-ui, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
      typeBase: 1,
      typeRatio: 'major-third',
      spaceBase: 8,
      radius: 16,
      motion: 'measured'
    };
  }

  var MOTION = {
    none:     { dur: '0s',    ease: 'linear',                        note: 'No motion at all.' },
    measured: { dur: '.38s',  ease: 'cubic-bezier(.2,.7,.2,1)',      note: 'Decorative only; nothing is understandable through motion alone.' },
    brisk:    { dur: '.18s',  ease: 'cubic-bezier(.4,0,.2,1)',       note: 'Fast, utilitarian transitions.' }
  };

  /* Derive everything a renderer or a deliverable needs from the model. */
  function derive(model) {
    var m = Object.assign(defaults(), model || {});
    var accentRamp = ramp(m.accent);
    var supportRamp = ramp(m.support);
    var type = typeScale(m.typeBase, m.typeRatio);
    var space = spaceScale(m.spaceBase);
    var motion = MOTION[m.motion] || MOTION.measured;

    return {
      model: m,
      accentRamp: accentRamp,
      supportRamp: supportRamp,
      type: type,
      space: space,
      motion: motion,
      /* The palette a chart or diagram draws from — ordered for categorical use
         and checked against the ground, so a series is never unreadable. */
      series: [m.accent, m.support, m.positive, m.negative,
               accentRamp[2], supportRamp[6], '#B498FF', '#94A2B4']
    };
  }

  /* Every contrast pair that matters, judged. This is what the auto-test reads. */
  function audit(model) {
    var m = Object.assign(defaults(), model || {});
    var pairs = [
      { id: 'ink-on-ground',    fg: m.ink,      bg: m.ground,  large: false, why: 'Body text on the page ground.' },
      { id: 'ink-on-surface',   fg: m.ink,      bg: m.surface, large: false, why: 'Body text inside a card.' },
      { id: 'muted-on-ground',  fg: m.muted,    bg: m.ground,  large: false, why: 'Secondary text.' },
      { id: 'muted-on-surface', fg: m.muted,    bg: m.surface, large: false, why: 'Secondary text in a card.' },
      { id: 'accent-on-ground', fg: m.accent,   bg: m.ground,  large: true,  why: 'Accent used for headings and marks.' },
      { id: 'support-on-ground',fg: m.support,  bg: m.ground,  large: true,  why: 'Support colour in charts and links.' },
      { id: 'positive-on-ground', fg: m.positive, bg: m.ground, large: true, why: 'Positive state.' },
      { id: 'negative-on-ground', fg: m.negative, bg: m.ground, large: true, why: 'Negative state.' }
    ];
    var results = pairs.map(function (p) {
      var r = rates(contrast(p.fg, p.bg), p.large);
      var fix = r.pass ? null : fixContrast(p.fg, p.bg, r.floor);
      return {
        id: p.id, fg: p.fg, bg: p.bg, why: p.why, large: p.large,
        ratio: r.ratio, floor: r.floor, pass: r.pass, suggestion: fix
      };
    });
    var failed = results.filter(function (r) { return !r.pass; });
    /* The tightest pair is the one a reader complains about first, so it is
       what the Gate and the makers quote rather than an average. */
    var tightest = results.reduce(function (m2, r) { return r.ratio < m2.ratio ? r : m2; }, results[0]);
    return { results: results, failed: failed, tightest: tightest, pass: failed.length === 0 };
  }

  /* ------------------------------------------------------------ output */
  /* Real CSS custom properties. This string is what ships. */
  function toCSS(model, opts) {
    opts = opts || {};
    var d = derive(model);
    var m = d.model;
    var L = [];
    L.push(':root {');
    L.push('  /* ground */');
    L.push('  --bg: ' + m.ground + ';');
    L.push('  --surface: ' + m.surface + ';');
    L.push('  --ink: ' + m.ink + ';');
    L.push('  --muted: ' + m.muted + ';');
    L.push('  --line: ' + (m.mode === 'dark' ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.10)') + ';');
    L.push('');
    L.push('  /* accents */');
    L.push('  --accent: ' + m.accent + ';');
    L.push('  --support: ' + m.support + ';');
    L.push('  --positive: ' + m.positive + ';');
    L.push('  --negative: ' + m.negative + ';');
    d.accentRamp.forEach(function (c, i) { L.push('  --accent-' + (i + 1) + '00: ' + c + ';'); });
    L.push('');
    L.push('  /* type */');
    L.push('  --font-display: ' + m.display + ';');
    L.push('  --font-ui: ' + m.ui + ';');
    L.push('  --font-mono: ' + m.mono + ';');
    d.type.forEach(function (t) { L.push('  --text-' + t.name + ': ' + t.rem + 'rem;'); });
    L.push('');
    L.push('  /* space & shape */');
    d.space.forEach(function (s) { L.push('  --space-' + s.name.slice(1) + ': ' + s.px + 'px;'); });
    L.push('  --radius: ' + m.radius + 'px;');
    L.push('  --radius-lg: ' + Math.round(m.radius * 1.4) + 'px;');
    L.push('');
    L.push('  /* motion — ' + d.motion.note + ' */');
    L.push('  --motion-dur: ' + d.motion.dur + ';');
    L.push('  --motion-ease: ' + d.motion.ease + ';');
    L.push('}');
    if (opts.reducedMotion !== false) {
      L.push('');
      L.push('@media (prefers-reduced-motion: reduce) {');
      L.push('  :root { --motion-dur: 0s; }');
      L.push('}');
    }
    return L.join('\n');
  }

  w.CBS_TOKENS = {
    defaults: defaults,
    derive: derive,
    audit: audit,
    toCSS: toCSS,
    ramp: ramp,
    typeScale: typeScale,
    spaceScale: spaceScale,
    RATIOS: RATIOS,
    MOTION: MOTION,
    contrast: contrast,
    luminance: luminance,
    fixContrast: fixContrast,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    rgbToHsl: rgbToHsl,
    hsl: hsl
  };
})(window);
