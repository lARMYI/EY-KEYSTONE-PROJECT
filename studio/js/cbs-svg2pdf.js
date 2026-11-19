/* Client Build Studio — SVG to PDF.

   cbs-visuals.js draws every figure into an <svg> DOM. Rather than write a
   second renderer per figure type for PDF, this walks that DOM once and emits
   PDF operators. Thirteen figure types — and every future one — become vector
   graphics in the document for free.

   It THROWS on anything it does not understand. A silent skip would leave a
   blank rectangle where a chart should be in a document a client reads, and
   nobody would find out until they did. The test suite runs every registered
   kind through here, so a renderer reaching for a new element fails the build
   instead. */
(function (w) {
  'use strict';

  var SUPPORTED_ELEMENTS = ['svg', 'g', 'rect', 'line', 'circle', 'path', 'text', 'title', 'desc'];

  function attr(node, name, dflt) {
    var v = node.getAttribute(name);
    return v === null || v === '' ? dflt : v;
  }
  function numAttr(node, name, dflt) {
    var v = parseFloat(node.getAttribute(name));
    return isFinite(v) ? v : dflt;
  }

  /* Opacity multiplies into the colour, because this writer has no alpha. An
     85%-opaque hairline over a known background is better rendered as the
     blend than dropped or drawn solid. */
  function blend(color, alpha, bg) {
    var P = w.CBS_PDF;
    var c = P.parseColor(color);
    if (!c) return null;
    if (alpha === undefined || alpha === null || alpha >= 1) return c;
    if (alpha <= 0) return null;
    var b = P.parseColor(bg) || [255, 255, 255];
    return [
      Math.round(c[0] * alpha + b[0] * (1 - alpha)),
      Math.round(c[1] * alpha + b[1] * (1 - alpha)),
      Math.round(c[2] * alpha + b[2] * (1 - alpha))
    ];
  }

  function styleOf(node, ctx) {
    var opacity = parseFloat(attr(node, 'opacity', '1'));
    if (!isFinite(opacity)) opacity = 1;
    var fillOpacity = parseFloat(attr(node, 'fill-opacity', '1'));
    if (!isFinite(fillOpacity)) fillOpacity = 1;
    var strokeOpacity = parseFloat(attr(node, 'stroke-opacity', '1'));
    if (!isFinite(strokeOpacity)) strokeOpacity = 1;

    var fill = attr(node, 'fill', null);
    var stroke = attr(node, 'stroke', null);
    return {
      fill: fill && fill !== 'none' ? blend(fill, opacity * fillOpacity, ctx.background) : null,
      stroke: stroke && stroke !== 'none' ? blend(stroke, opacity * strokeOpacity, ctx.background) : null,
      lineWidth: numAttr(node, 'stroke-width', 1) * ctx.scale,
      lineJoin: attr(node, 'stroke-linejoin', null),
      lineCap: attr(node, 'stroke-linecap', null)
    };
  }

  /* --------------------------------------------------------- path parsing */
  /* Normalises an SVG `d` to absolute moves, lines and cubic beziers. The
     renderers use M L A l v z plus implicit lineto; anything else throws. */
  function parsePath(d) {
    var tokens = String(d).match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    var i = 0, out = [];
    var x = 0, y = 0, startX = 0, startY = 0;
    var cmd = null;

    function next() {
      var t = tokens[i++];
      var n = parseFloat(t);
      if (!isFinite(n)) throw new Error('cbs-svg2pdf: malformed number in path near "' + t + '"');
      return n;
    }
    function isCommand(t) { return /^[a-zA-Z]$/.test(t); }

    while (i < tokens.length) {
      if (isCommand(tokens[i])) cmd = tokens[i++];
      else if (cmd === 'M') cmd = 'L';         /* implicit lineto after moveto */
      else if (cmd === 'm') cmd = 'l';
      if (!cmd) throw new Error('cbs-svg2pdf: path data starts without a command');

      switch (cmd) {
        case 'M': x = next(); y = next(); startX = x; startY = y; out.push({ t: 'M', x: x, y: y }); break;
        case 'm': x += next(); y += next(); startX = x; startY = y; out.push({ t: 'M', x: x, y: y }); break;
        case 'L': x = next(); y = next(); out.push({ t: 'L', x: x, y: y }); break;
        case 'l': x += next(); y += next(); out.push({ t: 'L', x: x, y: y }); break;
        case 'H': x = next(); out.push({ t: 'L', x: x, y: y }); break;
        case 'h': x += next(); out.push({ t: 'L', x: x, y: y }); break;
        case 'V': y = next(); out.push({ t: 'L', x: x, y: y }); break;
        case 'v': y += next(); out.push({ t: 'L', x: x, y: y }); break;
        case 'C': {
          var c1x = next(), c1y = next(), c2x = next(), c2y = next();
          x = next(); y = next();
          out.push({ t: 'C', x1: c1x, y1: c1y, x2: c2x, y2: c2y, x: x, y: y });
          break;
        }
        case 'A': case 'a': {
          var rx = next(), ry = next(), rot = next(), large = next(), sweep = next();
          var ex = cmd === 'A' ? next() : x + next();
          var ey = cmd === 'A' ? next() : y + next();
          arcToBeziers(x, y, rx, ry, rot, large, sweep, ex, ey).forEach(function (s) { out.push(s); });
          x = ex; y = ey;
          break;
        }
        case 'Z': case 'z': out.push({ t: 'Z' }); x = startX; y = startY; break;
        default:
          throw new Error('cbs-svg2pdf: unsupported path command "' + cmd + '"');
      }
    }
    return out;
  }

  /* SVG endpoint-parameterised arc to cubic beziers — the standard conversion
     from the SVG implementation notes (F.6.5). The donut and arch renderers
     are the only users, and both would otherwise be unrepresentable. */
  function arcToBeziers(x1, y1, rx, ry, angleDeg, largeArc, sweep, x2, y2) {
    if (rx === 0 || ry === 0) return [{ t: 'L', x: x2, y: y2 }];
    rx = Math.abs(rx); ry = Math.abs(ry);
    var phi = angleDeg * Math.PI / 180;
    var cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);

    var dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
    var x1p = cosPhi * dx2 + sinPhi * dy2;
    var y1p = -sinPhi * dx2 + cosPhi * dy2;

    /* Scale the radii up if they are too small to span the endpoints. */
    var lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) { var s = Math.sqrt(lambda); rx *= s; ry *= s; }

    var sign = (largeArc !== sweep) ? 1 : -1;
    var num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    var den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    var co = sign * Math.sqrt(Math.max(0, num / den));
    var cxp = co * rx * y1p / ry;
    var cyp = -co * ry * x1p / rx;

    var cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
    var cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

    function angle(ux, uy, vx, vy) {
      var dot = ux * vx + uy * vy;
      var len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
      var a = Math.acos(Math.max(-1, Math.min(1, dot / (len || 1))));
      return (ux * vy - uy * vx < 0) ? -a : a;
    }
    var theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    var delta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && delta > 0) delta -= 2 * Math.PI;
    else if (sweep && delta < 0) delta += 2 * Math.PI;

    /* One bezier per quarter turn keeps the error invisible at print size. */
    var segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
    var step = delta / segments;
    var k = 4 / 3 * Math.tan(step / 4);
    var out = [];
    var th = theta1;

    function point(t) {
      var ct = Math.cos(t), st = Math.sin(t);
      return [cosPhi * rx * ct - sinPhi * ry * st + cx, sinPhi * rx * ct + cosPhi * ry * st + cy];
    }
    function deriv(t) {
      var ct = Math.cos(t), st = Math.sin(t);
      return [-cosPhi * rx * st - sinPhi * ry * ct, -sinPhi * rx * st + cosPhi * ry * ct];
    }

    for (var n = 0; n < segments; n++) {
      var t0 = th, t1 = th + step;
      var p0 = point(t0), p1 = point(t1);
      var d0 = deriv(t0), d1 = deriv(t1);
      out.push({
        t: 'C',
        x1: p0[0] + k * d0[0], y1: p0[1] + k * d0[1],
        x2: p1[0] - k * d1[0], y2: p1[1] - k * d1[1],
        x: p1[0], y: p1[1]
      });
      th = t1;
    }
    return out;
  }

  /* ---------------------------------------------------------- transforms */
  /* Only translate/rotate/scale, which is all the renderers emit. */
  function parseTransform(str) {
    var m = [1, 0, 0, 1, 0, 0];
    var re = /(translate|rotate|scale|matrix)\s*\(([^)]*)\)/g;
    var hit;
    while ((hit = re.exec(str))) {
      var args = hit[2].split(/[\s,]+/).map(parseFloat).filter(function (n) { return isFinite(n); });
      var t;
      if (hit[1] === 'translate') t = [1, 0, 0, 1, args[0] || 0, args[1] || 0];
      else if (hit[1] === 'scale') t = [args[0] || 1, 0, 0, args.length > 1 ? args[1] : (args[0] || 1), 0, 0];
      else if (hit[1] === 'rotate') {
        var a = (args[0] || 0) * Math.PI / 180;
        t = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        if (args.length >= 3) {
          m = mul(m, [1, 0, 0, 1, args[1], args[2]]);
          m = mul(m, t);
          m = mul(m, [1, 0, 0, 1, -args[1], -args[2]]);
          continue;
        }
      } else t = [args[0] || 1, args[1] || 0, args[2] || 0, args[3] || 1, args[4] || 0, args[5] || 0];
      m = mul(m, t);
    }
    return m;
  }
  function mul(a, b) {
    return [
      a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]
    ];
  }
  function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }

  /* --------------------------------------------------------------- draw */
  /* Places an <svg> into `doc` at (x, y) scaled to fit `width`. Returns the
     height it consumed, so a caller can advance its cursor. */
  function draw(doc, svgNode, x, y, width, opts) {
    opts = opts || {};
    var vb = (svgNode.getAttribute('viewBox') || '').split(/[\s,]+/).map(parseFloat);
    var vw = vb.length === 4 && isFinite(vb[2]) ? vb[2] : numAttr(svgNode, 'width', 640);
    var vh = vb.length === 4 && isFinite(vb[3]) ? vb[3] : numAttr(svgNode, 'height', 360);
    var vx = vb.length === 4 && isFinite(vb[0]) ? vb[0] : 0;
    var vy = vb.length === 4 && isFinite(vb[1]) ? vb[1] : 0;

    var scale = width / vw;
    var height = vh * scale;
    var ctx = {
      scale: scale,
      background: opts.background || '#FFFFFF',
      base: [scale, 0, 0, scale, x - vx * scale, y - vy * scale]
    };

    walk(doc, svgNode, ctx, ctx.base);
    return height;
  }

  function walk(doc, node, ctx, matrix) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (child.nodeType !== 1) continue;
      var tag = child.tagName.toLowerCase();
      if (SUPPORTED_ELEMENTS.indexOf(tag) === -1) {
        throw new Error('cbs-svg2pdf: unsupported element <' + tag + '>. ' +
          'Add a translation for it rather than letting it vanish from the PDF.');
      }
      if (tag === 'title' || tag === 'desc') continue;

      var m = matrix;
      var tf = child.getAttribute('transform');
      if (tf) m = mul(matrix, parseTransform(tf));

      var st = styleOf(child, ctx);
      if (tag === 'g') { walk(doc, child, ctx, m); continue; }
      if (tag === 'svg') { walk(doc, child, ctx, m); continue; }

      if (tag === 'rect') {
        var rx = numAttr(child, 'x', 0), ry = numAttr(child, 'y', 0);
        var rw = numAttr(child, 'width', 0), rh = numAttr(child, 'height', 0);
        /* Rounded corners are decorative here; a rect with rx draws as a path
           so the radius survives rather than being silently squared off. */
        var r = Math.min(numAttr(child, 'rx', 0), rw / 2, rh / 2);
        if (r > 0) {
          doc.path(roundedRectPath(rx, ry, rw, rh, r).map(function (s) { return mapSeg(s, m); }), st);
        } else {
          var p0 = apply(m, rx, ry), p1 = apply(m, rx + rw, ry),
              p2 = apply(m, rx + rw, ry + rh), p3 = apply(m, rx, ry + rh);
          doc.path([
            { t: 'M', x: p0[0], y: p0[1] }, { t: 'L', x: p1[0], y: p1[1] },
            { t: 'L', x: p2[0], y: p2[1] }, { t: 'L', x: p3[0], y: p3[1] }, { t: 'Z' }
          ], st);
        }
        continue;
      }

      if (tag === 'line') {
        var a = apply(m, numAttr(child, 'x1', 0), numAttr(child, 'y1', 0));
        var b = apply(m, numAttr(child, 'x2', 0), numAttr(child, 'y2', 0));
        doc.path([{ t: 'M', x: a[0], y: a[1] }, { t: 'L', x: b[0], y: b[1] }],
          { stroke: st.stroke || '#000000', lineWidth: st.lineWidth, lineCap: st.lineCap });
        continue;
      }

      if (tag === 'circle') {
        var c = apply(m, numAttr(child, 'cx', 0), numAttr(child, 'cy', 0));
        /* Uniform scale only, which is all these figures use. */
        var rr = numAttr(child, 'r', 0) * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
        doc.circle(c[0], c[1], rr, st);
        continue;
      }

      if (tag === 'path') {
        var d = child.getAttribute('d');
        if (!d) continue;
        doc.path(parsePath(d).map(function (s) { return mapSeg(s, m); }), st);
        continue;
      }

      if (tag === 'text') {
        drawText(doc, child, ctx, m, st);
        continue;
      }
    }
  }

  function mapSeg(s, m) {
    if (s.t === 'Z') return s;
    var p = apply(m, s.x, s.y);
    if (s.t === 'C') {
      var c1 = apply(m, s.x1, s.y1), c2 = apply(m, s.x2, s.y2);
      return { t: 'C', x1: c1[0], y1: c1[1], x2: c2[0], y2: c2[1], x: p[0], y: p[1] };
    }
    return { t: s.t, x: p[0], y: p[1] };
  }

  function roundedRectPath(x, y, wd, ht, r) {
    var k = 0.5522847498 * r;
    return [
      { t: 'M', x: x + r, y: y },
      { t: 'L', x: x + wd - r, y: y },
      { t: 'C', x1: x + wd - r + k, y1: y, x2: x + wd, y2: y + r - k, x: x + wd, y: y + r },
      { t: 'L', x: x + wd, y: y + ht - r },
      { t: 'C', x1: x + wd, y1: y + ht - r + k, x2: x + wd - r + k, y2: y + ht, x: x + wd - r, y: y + ht },
      { t: 'L', x: x + r, y: y + ht },
      { t: 'C', x1: x + r - k, y1: y + ht, x2: x, y2: y + ht - r + k, x: x, y: y + ht - r },
      { t: 'L', x: x, y: y + r },
      { t: 'C', x1: x, y1: y + r - k, x2: x + r - k, y2: y, x: x + r, y: y },
      { t: 'Z' }
    ];
  }

  function drawText(doc, node, ctx, m, st) {
    var text = node.textContent;
    if (!text || !text.trim()) return;
    var size = numAttr(node, 'font-size', 11) * ctx.scale;
    var weight = node.getAttribute('font-weight');
    var family = node.getAttribute('font-family') || '';
    var font = /mono/i.test(family) ? 'mono'
      : (weight === 'bold' || parseInt(weight, 10) >= 600) ? 'bold' : 'body';

    var anchor = node.getAttribute('text-anchor');
    var align = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';

    var baseline = node.getAttribute('dominant-baseline');
    var x = numAttr(node, 'x', 0), y = numAttr(node, 'y', 0);
    /* SVG's "middle"/"central" put the box centre on y; PDF places the
       baseline, so shift by roughly a third of the em. */
    var dy = (baseline === 'middle' || baseline === 'central') ? 0.35 : 0;

    var p = apply(m, x, y);
    /* Recover the rotation the matrix carries, in SVG's y-down degrees, and
       hand it to the writer — which owns the flip into PDF text space. */
    var rotate = Math.atan2(m[1], m[0]) * 180 / Math.PI;
    if (Math.abs(rotate) < 1e-6) rotate = 0;

    doc.text(text, p[0], p[1] + size * dy, {
      font: font, size: size, color: st.fill || '#000000', align: align, rotate: rotate
    });
  }

  w.CBS_SVG2PDF = {
    draw: draw,
    parsePath: parsePath,
    parseTransform: parseTransform,
    arcToBeziers: arcToBeziers,
    SUPPORTED_ELEMENTS: SUPPORTED_ELEMENTS
  };
})(window);
