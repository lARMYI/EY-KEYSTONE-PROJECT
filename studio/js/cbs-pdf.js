/* Client Build Studio — a minimal PDF writer.

   Why write one rather than vendor one: vendor/README.md sets a high bar for
   third-party code (version, licence, SPDX, SHA-512, a re-verify command) and
   the only entry is three.js, which cannot reasonably be hand-written. A PDF
   generator is ~350KB of minified code that would still rasterize our figures.
   The figures here are already spec-driven SVG, so translating them to PDF
   path operators keeps them vector — better output and no new dependency.

   Scope, stated plainly: PDF 1.4, base-14 fonts, RGB colour, text with exact
   wrapping, rectangles, lines, circles and arbitrary paths. No embedded fonts,
   no images, no transparency groups, no encryption. That is what this document
   needs and nothing more.

   Coordinates: PDF puts the origin at the bottom-left with y increasing
   upward. Everything in this file's public API is TOP-LEFT with y increasing
   downward, like the screen and like SVG, and the flip happens once, on the
   way into the content stream. Authoring against two coordinate systems is how
   page layout bugs get written. */
(function (w) {
  'use strict';

  /* ------------------------------------------------------- font metrics */
  /* Adobe's AFM widths, in 1/1000 em, for codes 32..126. Embedded rather than
     measured in the browser: a substituted font would wrap differently from
     the font the PDF actually names, and the line breaks would be wrong in the
     file people receive. */
  var W_HELV = [
    278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
    1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,
    667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
    333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,
    556,556,333,500,278,556,500,722,500,500,500,334,260,334,584
  ];
  var W_HELV_B = [
    278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,
    975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,
    667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,
    333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,
    611,611,389,556,333,611,556,778,556,556,500,389,280,389,584
  ];

  /* The handful of typographic characters the studio's prose actually uses,
     mapped to their WinAnsiEncoding byte with a real width. Anything else
     outside Latin-1 becomes '?' rather than silently shifting the line. */
  var WINANSI = {
    0x2014: { b: 151, hw: 1000, bw: 1000 },   /* em dash */
    0x2013: { b: 150, hw: 556, bw: 556 },     /* en dash */
    0x2018: { b: 145, hw: 222, bw: 278 },     /* left single quote */
    0x2019: { b: 146, hw: 222, bw: 278 },     /* right single quote */
    0x201C: { b: 147, hw: 333, bw: 500 },     /* left double quote */
    0x201D: { b: 148, hw: 333, bw: 500 },     /* right double quote */
    0x2026: { b: 133, hw: 1000, bw: 1000 },   /* ellipsis */
    0x2022: { b: 149, hw: 350, bw: 350 },     /* bullet */
    0x00B7: { b: 183, hw: 278, bw: 278 },     /* middle dot */
    0x00A0: { b: 32, hw: 278, bw: 278 },      /* nbsp */
    0x00D7: { b: 215, hw: 584, bw: 584 },     /* multiplication sign */
    0x2192: { b: 45, hw: 333, bw: 333 }       /* arrow, degraded to a hyphen */
  };

  var FONTS = {
    body:   { name: 'Helvetica',       res: 'F1', widths: W_HELV,   mono: false },
    bold:   { name: 'Helvetica-Bold',  res: 'F2', widths: W_HELV_B, mono: false },
    italic: { name: 'Helvetica-Oblique', res: 'F3', widths: W_HELV, mono: false },
    mono:   { name: 'Courier',         res: 'F4', widths: null,     mono: true }
  };

  /* Returns {bytes:[...], width:n} — the WinAnsi bytes for a string and its
     width in 1/1000 em, computed together so they can never disagree. */
  function encode(str, font) {
    var bytes = [], width = 0;
    var s = String(str === null || str === undefined ? '' : str);
    for (var i = 0; i < s.length; i++) {
      var cp = s.codePointAt(i);
      if (cp > 0xFFFF) i++;                        /* skip the low surrogate */
      var b, adv;
      if (cp >= 32 && cp <= 126) {
        b = cp;
        adv = font.mono ? 600 : font.widths[cp - 32];
      } else if (WINANSI[cp]) {
        b = WINANSI[cp].b;
        adv = font.mono ? 600 : (font.widths === W_HELV_B ? WINANSI[cp].bw : WINANSI[cp].hw);
      } else if (cp >= 160 && cp <= 255) {
        b = cp;
        /* Latin-1 accented letters are close enough to their base letter's
           width for wrapping; the glyph itself is correct. */
        adv = font.mono ? 600 : 556;
      } else {
        b = 63;                                     /* '?' */
        adv = font.mono ? 600 : font.widths[63 - 32];
      }
      bytes.push(b);
      width += adv;
    }
    return { bytes: bytes, width: width };
  }

  function textWidth(str, fontKey, size) {
    return encode(str, FONTS[fontKey] || FONTS.body).width / 1000 * size;
  }

  /* --------------------------------------------------------- the document */
  function doc(opts) {
    opts = opts || {};
    var PW = opts.width || 595.28;            /* A4 portrait, in points */
    var PH = opts.height || 841.89;
    var margin = opts.margin === undefined ? 56 : opts.margin;

    var pages = [];       /* each: { ops: [], } */
    var cur = null;
    var cursorY = margin; /* top-left space, used by the flowing helpers */

    function num(n) {
      /* Keep the content stream small and deterministic. */
      var r = Math.round(n * 100) / 100;
      return (r === Math.floor(r) ? String(r) : r.toFixed(2));
    }
    function fy(y) { return num(PH - y); }     /* the one place y flips */

    function op(s) { cur.ops.push(s); }

    function colorOps(c, stroking) {
      var rgb = parseColor(c);
      if (!rgb) return false;
      op([num(rgb[0] / 255), num(rgb[1] / 255), num(rgb[2] / 255),
          stroking ? 'RG' : 'rg'].join(' '));
      return true;
    }

    var api = {
      width: PW, height: PH, margin: margin,

      addPage: function () {
        cur = { ops: [] };
        pages.push(cur);
        cursorY = margin;
        return api;
      },

      get y() { return cursorY; },
      set y(v) { cursorY = v; },
      get pageCount() { return pages.length; },
      get contentWidth() { return PW - margin * 2; },

      /* Room check: start a new page when the next block will not fit. */
      need: function (height) {
        if (cursorY + height > PH - margin) { api.addPage(); return true; }
        return false;
      },

      save: function () { op('q'); return api; },
      restore: function () { op('Q'); return api; },

      rect: function (x, y, wd, ht, style) {
        style = style || {};
        var filled = style.fill && colorOps(style.fill, false);
        var stroked = style.stroke && colorOps(style.stroke, true);
        if (style.lineWidth) op(num(style.lineWidth) + ' w');
        op([num(x), fy(y + ht), num(wd), num(ht)].join(' ') + ' re');
        op(filled && stroked ? 'B' : stroked ? 'S' : filled ? 'f' : 'n');
        return api;
      },

      line: function (x1, y1, x2, y2, style) {
        style = style || {};
        colorOps(style.stroke || '#000000', true);
        op(num(style.lineWidth || 1) + ' w');
        op(num(x1) + ' ' + fy(y1) + ' m ' + num(x2) + ' ' + fy(y2) + ' l S');
        return api;
      },

      /* A circle from four beziers — PDF has no circle operator. */
      circle: function (cx, cy, r, style) {
        style = style || {};
        var k = 0.5522847498 * r;
        var filled = style.fill && colorOps(style.fill, false);
        var stroked = style.stroke && colorOps(style.stroke, true);
        if (style.lineWidth) op(num(style.lineWidth) + ' w');
        op(num(cx - r) + ' ' + fy(cy) + ' m');
        op([num(cx - r), fy(cy - k), num(cx - k), fy(cy - r), num(cx), fy(cy - r)].join(' ') + ' c');
        op([num(cx + k), fy(cy - r), num(cx + r), fy(cy - k), num(cx + r), fy(cy)].join(' ') + ' c');
        op([num(cx + r), fy(cy + k), num(cx + k), fy(cy + r), num(cx), fy(cy + r)].join(' ') + ' c');
        op([num(cx - k), fy(cy + r), num(cx - r), fy(cy + k), num(cx - r), fy(cy)].join(' ') + ' c');
        op(filled && stroked ? 'B' : stroked ? 'S' : filled ? 'f' : 'n');
        return api;
      },

      /* `segments` is the normalised form cbs-svg2pdf produces: absolute
         moves, lines and cubic beziers only. */
      path: function (segments, style) {
        style = style || {};
        var filled = style.fill && style.fill !== 'none' && colorOps(style.fill, false);
        var stroked = style.stroke && style.stroke !== 'none' && colorOps(style.stroke, true);
        if (style.lineWidth) op(num(style.lineWidth) + ' w');
        if (style.lineJoin === 'round') op('1 j');
        if (style.lineCap === 'round') op('1 J');
        var closed = false;
        segments.forEach(function (s) {
          if (s.t === 'M') op(num(s.x) + ' ' + fy(s.y) + ' m');
          else if (s.t === 'L') op(num(s.x) + ' ' + fy(s.y) + ' l');
          else if (s.t === 'C') op([num(s.x1), fy(s.y1), num(s.x2), fy(s.y2), num(s.x), fy(s.y)].join(' ') + ' c');
          else if (s.t === 'Z') { op('h'); closed = true; }
        });
        op(filled && stroked ? (closed ? 'b' : 'B') : stroked ? 'S' : filled ? 'f' : 'n');
        return api;
      },

      /* Draw one line of text at an exact position. Returns its width.

         `style.rotate` is in degrees in SVG's convention (y down, positive
         clockwise). PDF's text space has y up, so the sign flips here — once,
         in the one place that knows about both. */
      text: function (str, x, y, style) {
        style = style || {};
        var key = style.font || 'body';
        var font = FONTS[key] || FONTS.body;
        var size = style.size || 10;
        var enc = encode(str, font);
        var wd = enc.width / 1000 * size;
        var rot = style.rotate || 0;

        /* Alignment shifts along the text's own baseline direction. */
        var shift = style.align === 'center' ? -wd / 2 : style.align === 'right' ? -wd : 0;

        op('BT');
        colorOps(style.color || '#000000', false);
        op('/' + font.res + ' ' + num(size) + ' Tf');
        if (style.charSpace) op(num(style.charSpace) + ' Tc');

        if (rot) {
          var th = -rot * Math.PI / 180;
          var ca = Math.cos(th), sa = Math.sin(th);
          var ox = x + shift * ca, oy = y - shift * sa;
          op([num(ca), num(sa), num(-sa), num(ca), num(ox), fy(oy)].join(' ') + ' Tm');
        } else {
          op(num(x + shift) + ' ' + fy(y) + ' Td');
        }
        op('(' + escapeBytes(enc.bytes) + ') Tj');
        if (style.charSpace) op('0 Tc');
        op('ET');
        return wd;
      },

      /* Break a string to a width, honouring existing newlines. */
      wrap: function (str, maxWidth, style) {
        style = style || {};
        var font = FONTS[style.font || 'body'] || FONTS.body;
        var size = style.size || 10;
        var limit = maxWidth / size * 1000;
        var out = [];
        String(str === null || str === undefined ? '' : str).split(/\n/).forEach(function (para) {
          var words = para.split(/\s+/).filter(function (x) { return x.length; });
          if (!words.length) { out.push(''); return; }
          var line = '', lineW = 0;
          var spaceW = encode(' ', font).width;
          words.forEach(function (word) {
            var ww = encode(word, font).width;
            if (!line) { line = word; lineW = ww; return; }
            if (lineW + spaceW + ww <= limit) { line += ' ' + word; lineW += spaceW + ww; }
            else { out.push(line); line = word; lineW = ww; }
          });
          out.push(line);
        });
        return out;
      },

      /* Flowing paragraph: wraps, breaks pages, advances the cursor. */
      paragraph: function (str, style) {
        style = style || {};
        var size = style.size || 10;
        var leading = style.leading || size * 1.45;
        var x = style.x === undefined ? margin : style.x;
        var width = style.width || (PW - margin - x);
        var lines = api.wrap(str, width, style);
        lines.forEach(function (ln) {
          if (cursorY + leading > PH - margin) api.addPage();
          cursorY += size;                     /* baseline sits below the top */
          if (ln) api.text(ln, x, cursorY, style);
          cursorY += leading - size;
        });
        if (style.after) cursorY += style.after;
        return api;
      },

      /* ----------------------------------------------------- serialise */
      bytes: function () { return serialise(); }
    };

    function serialise() {
      var objects = [];            /* 1-indexed in the file; 0-indexed here */
      function add(body) { objects.push(body); return objects.length; }

      var fontIds = {};
      Object.keys(FONTS).forEach(function (k) {
        var f = FONTS[k];
        fontIds[f.res] = add('<< /Type /Font /Subtype /Type1 /BaseFont /' + f.name +
          ' /Encoding /WinAnsiEncoding >>');
      });

      var pagesId = add(null);     /* reserved: filled in once kids are known */
      var kidIds = [];

      pages.forEach(function (p) {
        var content = p.ops.join('\n');
        var contentBytes = latin1Bytes(content);
        var streamId = objects.length + 1;
        add({ stream: contentBytes });
        var resources = '<< /Font << ' + Object.keys(fontIds).map(function (res) {
          return '/' + res + ' ' + fontIds[res] + ' 0 R';
        }).join(' ') + ' >> >>';
        kidIds.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R ' +
          '/MediaBox [0 0 ' + round2(PW) + ' ' + round2(PH) + '] ' +
          '/Resources ' + resources + ' ' +
          '/Contents ' + streamId + ' 0 R >>'));
      });

      objects[pagesId - 1] = '<< /Type /Pages /Count ' + kidIds.length +
        ' /Kids [' + kidIds.map(function (i) { return i + ' 0 R'; }).join(' ') + '] >>';

      var infoId = add('<< /Producer (Client Build Studio) /Creator (Client Build Studio) >>');
      var catalogId = add('<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');

      /* Assemble, tracking the byte offset of every object for the xref. */
      var out = [];
      var length = 0;
      function push(bytes) { out.push(bytes); length += bytes.length; }
      function pushText(s) { push(latin1Bytes(s)); }

      pushText('%PDF-1.4\n');
      /* A binary comment marks the file as binary for tools that sniff it. */
      push([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]);

      var offsets = [];
      objects.forEach(function (body, i) {
        offsets[i] = length;
        pushText((i + 1) + ' 0 obj\n');
        if (body && body.stream) {
          pushText('<< /Length ' + body.stream.length + ' >>\nstream\n');
          push(body.stream);
          pushText('\nendstream\n');
        } else {
          pushText(body + '\n');
        }
        pushText('endobj\n');
      });

      var xrefAt = length;
      pushText('xref\n0 ' + (objects.length + 1) + '\n');
      pushText('0000000000 65535 f \n');
      offsets.forEach(function (o) {
        pushText(('0000000000' + o).slice(-10) + ' 00000 n \n');
      });
      pushText('trailer\n<< /Size ' + (objects.length + 1) +
        ' /Root ' + catalogId + ' 0 R /Info ' + infoId + ' 0 R >>\n');
      pushText('startxref\n' + xrefAt + '\n%%EOF\n');

      var bytes = new Uint8Array(length);
      var at = 0;
      out.forEach(function (chunk) {
        for (var i = 0; i < chunk.length; i++) bytes[at++] = chunk[i];
      });
      return bytes;
    }

    api.addPage();
    return api;
  }

  /* ------------------------------------------------------------ helpers */
  function round2(n) { return Math.round(n * 100) / 100; }

  function latin1Bytes(s) {
    var out = new Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xFF;
    return out;
  }

  /* PDF literal strings need ( ) and \ escaped; everything else is raw. */
  function escapeBytes(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      if (b === 40 || b === 41 || b === 92) out += '\\' + String.fromCharCode(b);
      else if (b < 32) out += ' ';
      else out += String.fromCharCode(b);
    }
    return out;
  }

  var NAMED = {
    none: null, transparent: null,
    black: [0, 0, 0], white: [255, 255, 255], currentcolor: [0, 0, 0]
  };

  function parseColor(c) {
    if (!c) return null;
    if (Array.isArray(c)) return c;
    var s = String(c).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(NAMED, s)) return NAMED[s];
    var m = s.match(/^#([0-9a-f]{3})$/);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = s.match(/^#([0-9a-f]{6})$/);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      var parts = m[1].split(',').map(function (x) { return parseFloat(x); });
      if (parts.length >= 3) return [clamp255(parts[0]), clamp255(parts[1]), clamp255(parts[2])];
    }
    m = s.match(/^hsla?\(([^)]+)\)$/);
    if (m) {
      var p = m[1].split(',').map(function (x) { return parseFloat(x); });
      if (p.length >= 3) return hslToRgb(p[0], p[1], p[2]);
    }
    return null;
  }
  function clamp255(n) { return Math.max(0, Math.min(255, Math.round(n || 0))); }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [clamp255((r + m) * 255), clamp255((g + m) * 255), clamp255((b + m) * 255)];
  }

  function toBlob(bytes) {
    return new w.Blob([bytes], { type: 'application/pdf' });
  }

  w.CBS_PDF = {
    doc: doc,
    FONTS: FONTS,
    textWidth: textWidth,
    parseColor: parseColor,
    toBlob: toBlob,
    A4: { width: 595.28, height: 841.89 }
  };
})(window);
