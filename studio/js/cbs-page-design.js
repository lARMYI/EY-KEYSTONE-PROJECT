/* Client Build Studio — the design page.
   Three things the studio previously only described: a real token set, real
   generated graphics, and a real live preview at real device widths. */
(function (w) {
  'use strict';

  var d = w.document;
  var R = w.CBS_RENDER, S = w.CBS_STATE, T = w.CBS_TOKENS, V = w.CBS_VISUALS, P = w.CBS_PREVIEW;
  var el = R.el, mount = R.mount, append = R.append;

  var preview = null;

  function model() { return Object.assign(T.defaults(), S.get().tokens || {}); }
  function setToken(key, value) {
    var m = model(); m[key] = value;
    S.set('tokens', m);
    if (editor) editor.repaint();
    paintAll();
  }

  /* ------------------------------------------------------------ editor */
  /* The editor itself lives in cbs-makers.js, because the Workbench needs the
     same one. Duplicating it here would let the two drift apart. */
  var editor = null;

  function renderEditor() {
    if (!editor) {
      editor = w.CBS_MAKERS.tokenEditor(function () { paintAll(); });
      mount(R.$('#editor'), editor.node);
    } else {
      editor.repaint();
    }
  }

  function renderRamps() {
    var t = T.derive(model());
    mount(R.$('#ramps'), [
      el('p.small.dimmed', { style: 'margin-bottom:8px', text: 'Accent ramp — generated from the accent hue, desaturated toward the ends so the extremes do not read as neon.' }),
      el('div.ramp', { 'aria-label': 'Accent ramp' }, t.accentRamp.map(function (c) {
        return el('span', { style: 'background:' + c, title: c });
      })),
      el('p.small.dimmed', { style: 'margin:16px 0 8px', text: 'Chart series — the order a chart draws in.' }),
      el('div.swatch-row', null, t.series.map(function (c, i) {
        return el('div.swatch', null, [
          el('i', { style: 'background:' + c }),
          el('b', { text: (i + 1) + ' · ' + c })
        ]);
      })),
      el('p.small.dimmed', { style: 'margin:16px 0 8px', text: 'Type scale — ' + model().typeRatio + '.' }),
      el('div.swatch-row', null, t.type.map(function (x) {
        return el('div.small.mono', {
          style: 'color:var(--mut);border:1px solid var(--line);border-radius:8px;padding:6px 10px',
          text: x.name + ' ' + x.rem + 'rem'
        });
      }))
    ]);
  }

  /* --------------------------------------------------------- contrast */
  function renderContrast() {
    var a = T.audit(model());
    var host = R.$('#contrast');
    mount(host, [
      el('div.integrity' + (a.pass ? '.ok' : '.bad'), null, [
        el('h4', { text: a.pass ? 'Contrast — every pair clears WCAG AA' : 'Contrast — ' + a.failed.length + ' pair(s) below the floor' }),
        el('p.small.muted', {
          text: 'Measured with WCAG 2.1 relative luminance. This is what makes the ' +
                'contrast criterion decidable: the Gate reads these numbers instead of ' +
                'returning "unknown" and asking a human to squint.'
        })
      ])
    ]);
    a.results.forEach(function (r) {
      var row = el('div.cx-row', null, [
        el('div.cx-chip', { style: 'background:' + r.bg + ';color:' + r.fg, text: 'Aa' }),
        el('div', null, [
          el('div', { text: r.why }),
          el('div.small.dimmed.mono', { text: r.fg + ' on ' + r.bg + ' · floor ' + r.floor + (r.large ? ' (large text)' : '') })
        ]),
        el('div.inline', null, [
          el('span.cx-ratio' + (r.pass ? '.cx-pass' : '.cx-fail'), { text: r.ratio.toFixed(2) + ':1' }),
          !r.pass && r.suggestion
            ? el('button.cx-fix', {
                type: 'button',
                text: 'use ' + r.suggestion,
                title: 'Nudge lightness until it clears the floor',
                onclick: function () {
                  var key = r.id.split('-')[0];
                  setToken(key, r.suggestion);
                  R.toast('Adjusted ' + key + ' to clear ' + r.floor + ':1');
                }
              })
            : null
        ])
      ]);
      append(host, row);
    });
  }

  /* ---------------------------------------------------------- visuals */
  function renderGallery() {
    var groups = {};
    V.KINDS.forEach(function (k) {
      var g = (V.META[k] && V.META[k].group) || 'Other';
      (groups[g] = groups[g] || []).push(k);
    });
    mount(R.$('#gallery'), Object.keys(groups).map(function (g) {
      return el('section', { style: 'margin-bottom:26px' }, [
        el('h3.s-h3', { text: g }),
        el('div.vz-grid', { style: 'margin-top:12px' }, groups[g].map(function (kind) {
          var spec = V.composeSpec(kind, {});
          var node = V.render(kind, spec);
          return el('div.vz-card', null, [
            node,
            el('div.vz-head', null, [
              el('b', { text: V.META[kind].label }),
              el('span.small.dimmed.mono', { text: kind })
            ])
          ]);
        }))
      ]);
    }));
  }

  /* ---------------------------------------------------------- preview */
  var DEMOS = {
    code: function () {
      var t = T.derive(model());
      var css = T.toCSS(model()) + '\n' + [
        'body{margin:0;font-family:var(--font-ui);background:var(--bg);color:var(--ink)}',
        '.wrap{max-width:900px;margin:0 auto;padding:var(--space-5) var(--space-3)}',
        'h1{font-family:var(--font-display);font-size:var(--text-3xl);line-height:1.08;margin:0 0 var(--space-2)}',
        '.ask{border:1px solid var(--accent);border-radius:var(--radius);padding:var(--space-3);margin:var(--space-3) 0;background:color-mix(in srgb,var(--accent) 8%,transparent)}',
        'p{color:var(--muted);max-width:62ch}',
        '.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-3);margin-top:var(--space-4)}',
        '.card{border:1px solid var(--line);border-radius:var(--radius);padding:var(--space-3);background:var(--surface)}',
        '.card h3{margin:0 0 var(--space-1);font-size:var(--text-md);color:var(--accent)}'
      ].join('\n');
      var i = S.get().intake || {};
      var html = [
        '<div class="wrap">',
        '<h1>' + (i.client || 'Your client') + '</h1>',
        '<div class="ask"><strong>' + (i.decision || 'The decision you are asking for.') + '</strong></div>',
        '<p>' + (i.stakes || 'What saying no costs them.') + '</p>',
        '<div class="row">',
        '<div class="card"><h3>Framed</h3><p>One decision, one decider, one date.</p></div>',
        '<div class="card"><h3>Grounded</h3><p>Every claim carries a truth status.</p></div>',
        '<div class="card"><h3>Certified</h3><p>Nothing ships without a passport.</p></div>',
        '</div></div>'
      ].join('\n');
      return { type: 'code', html: html, css: css, js: '' };
    },
    overflow: function () {
      return {
        type: 'code',
        css: 'body{margin:0;font-family:system-ui;background:#0B0F16;color:#F7F3EA}' +
             '.bad{width:1200px;background:linear-gradient(90deg,#FF6B6B,#E9B84A);padding:40px;font-size:20px}',
        html: '<div class="bad">This block is a fixed 1200px wide. On a 390px phone it overflows — ' +
              'and the measurement below says so in pixels rather than leaving it to opinion.</div>',
        js: ''
      };
    },
    deck: function () {
      var i = S.get().intake || {};
      return {
        type: 'deck',
        slides: [
          { title: i.client || 'The client', parts: [{ h: 'The ask', body: i.decision || 'The decision.' }] },
          { title: 'What changed', parts: [{ h: 'Trigger', body: i.trigger || 'The event that makes this live.' }] },
          { title: 'If no', parts: [{ h: 'Cost of inaction', body: i.stakes || 'What a year of nothing costs.' }] }
        ]
      };
    },
    stream: function () {
      return {
        type: 'stream', speed: 26,
        text: 'Streaming text lands the way an agent actually writes — a passage arriving rather ' +
              'than appearing. Under prefers-reduced-motion it resolves instantly to the full text, ' +
              'because motion is never the only way to receive the content.'
      };
    },
    scene: function () {
      var t = T.derive(model());
      return { type: 'scene', shape: 'keystone', satellites: 10, accent: t.model.accent };
    }
  };

  function renderPreview() {
    if (!preview) {
      preview = P.create({ device: 'desktop' });
      mount(R.$('#preview'), [
        el('div.inline', { style: 'margin-bottom:12px' }, Object.keys(DEMOS).map(function (k, i) {
          return el('button.btn' + (i ? '.ghost' : ''), {
            type: 'button',
            text: { code: 'Rendered page', overflow: 'Deliberate overflow', deck: 'Slides', stream: 'Streaming text', scene: '3D scene' }[k],
            onclick: function () { preview.show(DEMOS[k]()); }
          });
        })),
        preview.node
      ]);
      w.setTimeout(function () { preview.show(DEMOS.code()); }, 400);
    } else {
      preview.show(DEMOS.code());
    }
  }

  /* ------------------------------------------------------------- CSS out */
  function renderCSSOut() {
    var css = T.toCSS(model());
    var box = el('textarea.export-box', { readonly: true, 'aria-label': 'Generated design tokens', spellcheck: 'false' });
    box.value = css;
    mount(R.$('#cssout'), [
      el('div.inline', { style: 'margin-bottom:10px' }, [
        el('button.btn', { type: 'button', text: 'Copy tokens.css', onclick: function () { R.copyText(css, 'tokens.css copied'); } }),
        R.downloadable('tokens.css', css, 'text/css'),
        el('span.small.dimmed', { text: (css.length / 1024).toFixed(1) + ' KB · ' + (css.match(/--[a-z0-9-]+:/g) || []).length + ' custom properties' })
      ]),
      box
    ]);
  }

  function paintAll() {
    renderEditor();
    renderRamps();
    renderContrast();
    renderGallery();
    renderCSSOut();
    if (preview) preview.show(DEMOS.code());
  }

  function boot() {
    R.shell('design.html');
    paintAll();
    renderPreview();
    R.reveals(d);
    w.CBS_CONSOLE.init();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
