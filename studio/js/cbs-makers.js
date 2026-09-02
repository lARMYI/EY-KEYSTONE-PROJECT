/* Client Build Studio — the makers.

   A `makes` field on an artifact names a real output it carries beyond its
   prose: a design token set, a set of drawn figures, or an HTML+CSS section.
   This file holds the editor for each, and the rule that keeps them honest:

     a maker always writes BOTH the machine output and the prose part that
     describes it, so the Gate reads one artifact rather than two.

   Model-authored content never reaches this DOM. Figures arrive as specs that
   cbs-visuals validates and a local renderer draws; code is rendered only
   inside the opaque-origin preview frame, never injected here. */
(function (w) {
  'use strict';

  var d = w.document;
  var R = w.CBS_RENDER, S = w.CBS_STATE, T = w.CBS_TOKENS, V = w.CBS_VISUALS;
  var el = R.el, mount = R.mount, append = R.append;

  /* ------------------------------------------------------------- helpers */
  function draftOf(id) {
    var a = S.artifact(id);
    return a.draft || null;
  }

  /* Write a machine output onto the draft. A maker used on an artifact that
     was never composed runs the Tier 1 composer first, so the draft it writes
     into has the pattern's real shape rather than an empty shell. */
  function put(id, key, value) {
    var a = S.artifact(id);
    var patch = {};
    var draft = a.draft;
    if (!draft) {
      draft = (w.CBS_AGENT && w.CBS_AGENT.compose(id)) || { parts: [], composedAt: null };
      patch.tier = a.tier || 1;
    }
    draft[key] = value;
    patch.draft = draft;
    if (a.state === 'empty') patch.state = 'drafted';
    S.setArtifact(id, patch);
    return draft;
  }

  /* Sync a prose part so the draft describes what the maker produced. Only
     headings the pattern actually declares are written: a maker does not get
     to invent parts the artifact was never asked for. Returns whether it landed. */
  function writePart(id, heading, body) {
    var a = S.artifact(id);
    if (!a.draft || !a.draft.parts) return false;
    var parts = a.draft.parts;
    for (var i = 0; i < parts.length; i++) {
      if (String(parts[i].h).toLowerCase() === String(heading).toLowerCase()) {
        parts[i].body = body;
        S.setArtifact(id, { draft: a.draft });
        return true;
      }
    }
    return false;
  }

  function labelled(text, node, hint) {
    return el('div.mk-field', null, [
      el('label', { text: text }),
      hint ? el('div.hint', { text: hint }) : null,
      node
    ]);
  }

  function textInput(value, placeholder, onchange) {
    var n = el('input.mk-in', { type: 'text', value: value || '', placeholder: placeholder || '', spellcheck: 'false' });
    n.addEventListener('change', function () { onchange(n.value); });
    return n;
  }

  /* ============================================================== TOKENS */
  /* The engagement has one design system. The token maker edits it directly
     and snapshots it onto the artifact, so "the visual system" artifact and
     the tokens the studio actually renders with can never disagree. */
  var COLOR_FIELDS = [
    ['ground', 'Ground'], ['surface', 'Surface'], ['ink', 'Ink'], ['muted', 'Muted'],
    ['accent', 'Accent'], ['support', 'Support'], ['positive', 'Positive'], ['negative', 'Negative']
  ];

  function tokenModel() { return Object.assign(T.defaults(), S.get().tokens || {}); }

  /* Shared by the design page and the Workbench maker — one editor, two hosts. */
  function tokenEditor(onChange) {
    var host = el('div.tok-grid');

    function setToken(key, value) {
      var m = tokenModel(); m[key] = value;
      S.set('tokens', m);
      onChange(m);
    }

    function colorField(key, label) {
      var m = tokenModel();
      var swatch = el('input', { type: 'color', value: m[key], 'aria-label': label + ' colour' });
      var hex = el('input', { type: 'text', value: m[key], 'aria-label': label + ' hex', spellcheck: 'false' });
      swatch.addEventListener('input', function () { hex.value = swatch.value; setToken(key, swatch.value); });
      hex.addEventListener('change', function () {
        if (!T.hexToRgb(hex.value)) { R.toast('Not a valid hex colour'); hex.value = tokenModel()[key]; return; }
        setToken(key, hex.value);
      });
      return el('div.tok-field', null, [
        el('label', { text: label }),
        el('div.tok-row', null, [swatch, hex])
      ]);
    }

    function paint() {
      var m = tokenModel();
      var ratio = el('select', { 'aria-label': 'Type scale ratio' },
        Object.keys(T.RATIOS).map(function (k) {
          return el('option', { value: k, text: k + ' (' + T.RATIOS[k] + ')' });
        }));
      ratio.value = m.typeRatio;
      ratio.addEventListener('change', function () { setToken('typeRatio', ratio.value); });

      var motion = el('select', { 'aria-label': 'Motion policy' },
        Object.keys(T.MOTION).map(function (k) {
          return el('option', { value: k, text: k + ' — ' + T.MOTION[k].dur });
        }));
      motion.value = m.motion;
      motion.addEventListener('change', function () { setToken('motion', motion.value); });

      var radius = el('input', { type: 'text', value: String(m.radius), 'aria-label': 'Corner radius in px' });
      radius.addEventListener('change', function () { setToken('radius', parseInt(radius.value, 10) || 0); });

      mount(host, COLOR_FIELDS.map(function (f) { return colorField(f[0], f[1]); }).concat([
        el('div.tok-field', null, [el('label', { text: 'Type ratio' }), ratio]),
        el('div.tok-field', null, [el('label', { text: 'Motion' }), motion]),
        el('div.tok-field', null, [el('label', { text: 'Radius (px)' }), radius])
      ]));
    }

    paint();
    return { node: host, repaint: paint };
  }

  /* A one-line-per-decision summary of the live token set, for the prose part. */
  function tokenProse(m) {
    var t = T.derive(m);
    return [
      'Ground ' + m.ground + ' · surface ' + m.surface + ' · ink ' + m.ink + ' · muted ' + m.muted + '.',
      'Accent ' + m.accent + ' with a nine-step ramp; support ' + m.support + '; positive ' + m.positive + '; negative ' + m.negative + '.',
      'Corner radius ' + m.radius + 'px. Spacing on a ' + t.space.length + '-step scale.',
      'Emitted as ' + (T.toCSS(m).match(/--[a-z0-9-]+:/g) || []).length + ' CSS custom properties; every piece references them rather than restating values.'
    ].join('\n');
  }

  function typeProse(m) {
    var t = T.derive(m);
    return 'Modular scale at ' + m.typeRatio + ' (' + T.RATIOS[m.typeRatio] + '): ' +
      t.type.map(function (x) { return x.name + ' ' + x.rem + 'rem'; }).join(', ') + '.';
  }

  function motionProse(m) {
    var mo = T.MOTION[m.motion] || T.MOTION.calm;
    return 'Motion policy "' + m.motion + '" — ' + mo.dur + ' at ' + mo.ease + '. Motion is decorative; ' +
      'nothing is understandable only through animation, and prefers-reduced-motion collapses every transition to an instant state.';
  }

  function tokensMaker(artifactId) {
    var host = el('div.mk');
    var body = el('div');

    function adopt() {
      var m = tokenModel();
      var a = T.audit(m);
      put(artifactId, 'tokens', { model: m, css: T.toCSS(m), contrast: { pass: a.pass, failed: a.failed.length, tightest: a.tightest } });
      writePart(artifactId, 'Tokens', tokenProse(m));
      writePart(artifactId, 'Type scale', typeProse(m));
      writePart(artifactId, 'Motion policy', motionProse(m));
      writePart(artifactId, 'Contrast floor', a.pass
        ? 'Every text pair clears its WCAG AA floor; the tightest is ' + a.tightest.id + ' at ' + a.tightest.ratio.toFixed(2) + ':1. Measured, not asserted.'
        : a.failed.length + ' pair(s) sit below the floor — ' + a.failed[0].id + ' is ' + a.failed[0].ratio.toFixed(2) + ':1 against ' + a.failed[0].floor + ':1.');
      return a;
    }

    var editor = tokenEditor(function () { paint(); });

    function paint() {
      var m = tokenModel();
      var t = T.derive(m);
      var a = T.audit(m);
      var saved = (draftOf(artifactId) || {}).tokens;
      var live = saved && saved.css === T.toCSS(m);

      mount(body, [
        el('div.mk-bar', null, [
          el('button.btn', {
            type: 'button', text: live ? 'Re-write into the draft' : 'Write these tokens into the draft',
            onclick: function () {
              var res = adopt();
              R.toast(res.pass ? 'Tokens written · all pairs clear AA' : 'Tokens written · ' + res.failed.length + ' contrast failure(s) recorded');
              paint();
            }
          }),
          el('button.btn.ghost', {
            type: 'button', text: 'Copy tokens.css',
            onclick: function () { R.copyText(T.toCSS(m), 'tokens.css copied'); }
          }),
          R.downloadable('tokens.css', T.toCSS(m), 'text/css'),
          live ? R.chip('draft matches the live tokens', 'teal') : R.chip('draft is behind the editor', 'gold')
        ]),
        el('div.ramp', { 'aria-label': 'Accent ramp' }, t.accentRamp.map(function (c) {
          return el('span', { style: 'background:' + c, title: c });
        })),
        el('div.mk-contrast' + (a.pass ? '.ok' : '.bad'), null, [
          el('b', { text: a.pass ? 'Contrast passes' : a.failed.length + ' contrast failure(s)' }),
          el('span.small', {
            text: a.pass
              ? ' — tightest pair ' + a.tightest.id + ' at ' + a.tightest.ratio.toFixed(2) + ':1.'
              : ' — ' + a.failed[0].id + ' is ' + a.failed[0].ratio.toFixed(2) + ':1 against a floor of ' + a.failed[0].floor + ':1.'
          }),
          !a.pass && a.failed[0].suggestion
            ? el('button.cx-fix', {
                type: 'button', text: 'use ' + a.failed[0].suggestion,
                onclick: function () {
                  var m2 = tokenModel();
                  m2[a.failed[0].id.split('-')[0]] = a.failed[0].suggestion;
                  S.set('tokens', m2);
                  editor.repaint(); paint();
                }
              })
            : null
        ]),
        editor.node
      ]);
    }

    paint();
    append(host, [
      el('p.small.dimmed', { style: 'margin-bottom:12px', text: 'One design system per engagement. Editing here changes what every figure, preview and exported deliverable renders with — the full ramps and the pair-by-pair contrast report live on the Design page.' }),
      body
    ]);
    return { node: host, refresh: paint };
  }

  /* ============================================================== VISUAL */
  function specsOf(artifactId) {
    var draft = draftOf(artifactId);
    return (draft && Array.isArray(draft.visuals)) ? draft.visuals : [];
  }

  function saveSpecs(artifactId, specs) {
    put(artifactId, 'visuals', specs);
    writePart(artifactId, 'The comparison', specs.length
      ? specs.map(function (s, i) {
          return 'Figure ' + (i + 1) + ' (' + s.kind + ') — ' + (s.title || 'untitled') + '. ' +
                 (s.caption || '[NEEDS DECISION: what comparison this figure asks the reader to make]');
        }).join('\n')
      : '[NEEDS DECISION: the comparison each figure makes — add a figure in the maker]');
    writePart(artifactId, 'Encoding', specs.length
      ? specs.map(function (s, i) {
          var meta = V.META[s.kind] || {};
          return 'Figure ' + (i + 1) + ': ' + (meta.label || s.kind) +
                 (meta.needs === 'series' ? ', axis ' + (s.zeroBased ? 'starts at zero' : 'truncated — a break marker is required') : '') + '.';
        }).join('\n')
      : '[NEEDS DECISION: encoding and axis treatment]');
  }

  function seriesEditor(spec, onchange) {
    var ser = spec.series[0] || { name: 'Series A', points: [] };
    var rows = el('div.mk-rows');

    function paint() {
      mount(rows, ser.points.map(function (pt, i) {
        var lab = textInput(pt.label, 'Label', function (v) { pt.label = v; onchange(); });
        var val = el('input.mk-in.mk-num', { type: 'number', value: String(pt.value), step: 'any', 'aria-label': 'Value' });
        val.addEventListener('change', function () { pt.value = parseFloat(val.value) || 0; onchange(); });
        return el('div.mk-row', null, [
          lab, val,
          el('button.icon-btn', {
            type: 'button', text: '×', title: 'Remove point', 'aria-label': 'Remove point',
            onclick: function () { ser.points.splice(i, 1); paint(); onchange(); }
          })
        ]);
      }).concat([
        el('button.btn.ghost.mk-add', {
          type: 'button', text: '+ point',
          onclick: function () { ser.points.push({ label: 'New', value: 0 }); paint(); onchange(); }
        })
      ]));
    }
    paint();

    var zero = el('input', { type: 'checkbox', 'aria-label': 'Axis starts at zero' });
    zero.checked = spec.zeroBased !== false;
    zero.addEventListener('change', function () { spec.zeroBased = zero.checked; onchange(); });

    return el('div', null, [
      rows,
      el('label.mk-check', null, [zero, el('span', { text: 'Axis starts at zero — untick only with an explicit break marker' })])
    ]);
  }

  function nodesEditor(spec, onchange) {
    var rows = el('div.mk-rows');
    function paint() {
      mount(rows, spec.nodes.map(function (n, i) {
        return el('div.mk-row', null, [
          textInput(n.label, 'Label', function (v) { n.label = v; onchange(); }),
          textInput(n.note, 'Note (optional)', function (v) { n.note = v; onchange(); }),
          el('button.icon-btn', {
            type: 'button', text: '×', title: 'Remove node', 'aria-label': 'Remove node',
            onclick: function () { spec.nodes.splice(i, 1); paint(); onchange(); }
          })
        ]);
      }).concat([
        el('button.btn.ghost.mk-add', {
          type: 'button', text: '+ node',
          onclick: function () { spec.nodes.push({ id: 'n' + spec.nodes.length, label: 'New', note: '' }); paint(); onchange(); }
        })
      ]));
    }
    paint();
    return rows;
  }

  function visualMaker(artifactId) {
    var host = el('div.mk');
    var list = el('div');

    function commit(specs) { saveSpecs(artifactId, specs); paint(); }

    function paint() {
      var specs = specsOf(artifactId);
      if (!specs.length) {
        mount(list, el('div.empty-note', { text: 'No figures yet. Add one below — every figure is a validated spec drawn by a local renderer, so a hostile or malformed spec is clamped rather than honoured.' }));
      } else {
        mount(list, specs.map(function (spec, idx) {
          var meta = V.META[spec.kind] || {};
          var art = el('div.mk-art');
          function redraw() { mount(art, V.render(spec.kind, spec)); }
          redraw();

          function changed() {
            var next = specsOf(artifactId).slice();
            next[idx] = V.validate(spec.kind, spec);
            spec = next[idx];
            redraw();
            saveSpecs(artifactId, next);
          }

          var kindSel = el('select.mk-in', { 'aria-label': 'Figure type' },
            V.KINDS.map(function (k) { return el('option', { value: k, text: (V.META[k] || {}).label || k }); }));
          kindSel.value = spec.kind;
          kindSel.addEventListener('change', function () {
            var next = specsOf(artifactId).slice();
            next[idx] = V.composeSpec(kindSel.value, { title: spec.title, caption: spec.caption });
            commit(next);
          });

          return el('div.mk-fig', null, [
            el('div.mk-fig-head', null, [
              el('span.small.mono.dimmed', { text: 'Figure ' + (idx + 1) }),
              el('button.icon-btn', {
                type: 'button', text: '×', title: 'Remove figure', 'aria-label': 'Remove figure',
                onclick: function () {
                  var next = specsOf(artifactId).slice();
                  next.splice(idx, 1);
                  commit(next);
                }
              })
            ]),
            art,
            labelled('Type', kindSel),
            labelled('Title', textInput(spec.title, 'What the figure is', function (v) { spec.title = v; changed(); })),
            labelled('Caption', textInput(spec.caption, 'The comparison the reader should make', function (v) { spec.caption = v; changed(); }),
              'A figure should read without its caption. Write one anyway — the criterion checks that the comparison is stated in words.'),
            meta.needs === 'series' ? seriesEditor(spec, changed)
              : meta.needs === 'nodes' ? nodesEditor(spec, changed)
              : el('p.small.dimmed', { text: 'Drawn deterministically from the client name as a seed — the same engagement always produces the same mark.' }),
            el('div.mk-bar', null, [
              el('button.btn.ghost', {
                type: 'button', text: 'Copy SVG',
                onclick: function () { R.copyText(V.toSVGString(spec.kind, spec), 'SVG copied'); }
              }),
              R.downloadable('figure-' + (idx + 1) + '.svg', V.toSVGString(spec.kind, spec), 'image/svg+xml')
            ])
          ]);
        }));
      }
    }

    var addSel = el('select.mk-in', { 'aria-label': 'Figure type to add' },
      V.KINDS.map(function (k) { return el('option', { value: k, text: ((V.META[k] || {}).group || '') + ' · ' + ((V.META[k] || {}).label || k) }); }));

    append(host, [
      el('p.small.dimmed', { style: 'margin-bottom:12px', text: 'Figures are data, not drawings. The agent proposes a spec; cbs-visuals clamps it; a local renderer draws it. Nothing model-authored is ever inserted as markup.' }),
      el('div.mk-bar', null, [
        addSel,
        el('button.btn', {
          type: 'button', text: 'Add figure',
          onclick: function () {
            var next = specsOf(artifactId).slice();
            next.push(V.composeSpec(addSel.value, {}));
            commit(next);
          }
        }),
        el('button.btn.ghost', {
          type: 'button', text: 'Propose figures',
          title: 'Ask the agent for figure specs. Invalid specs are dropped, not repaired.',
          onclick: function (e) {
            var btn = e.currentTarget;
            btn.disabled = true;
            w.CBS_AGENT.proposeVisuals(artifactId).then(function (res) {
              btn.disabled = false;
              if (!res.ok) { R.toast(res.error); return; }
              commit(res.specs);
              R.toast('Tier ' + res.tier + ' · ' + res.specs.length + ' figure(s)' + (res.dropped ? ', ' + res.dropped + ' dropped as invalid' : ''));
            });
          }
        })
      ]),
      list
    ]);
    paint();
    return { node: host, refresh: paint };
  }

  /* ================================================================ CODE */
  /* Tier 1 for code: a real HTML+CSS section composed from the draft parts and
     the live tokens. No model needed, and never a blank editor. */
  function composeSection(artifactId) {
    var hit = w.CBS_GRAPH.findArtifact(artifactId);
    var draft = draftOf(artifactId);
    var parts = (draft && draft.parts) || [];
    var title = hit ? hit.artifact.title : 'Section';
    var i = S.get().intake || {};

    function esc(s) {
      return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    var html = [
      '<section class="sec">',
      '  <p class="eyebrow">' + esc(i.client || 'Client') + '</p>',
      '  <h1>' + esc(title) + '</h1>',
      '  <div class="cards">'
    ].concat(parts.map(function (p) {
      return '    <article class="card">\n' +
             '      <h2>' + esc(p.h) + '</h2>\n' +
             '      <p>' + esc(p.body || '').replace(/\n+/g, '<br>') + '</p>\n' +
             '    </article>';
    })).concat([
      '  </div>',
      '</section>'
    ]).join('\n');

    var css = [
      'body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-ui);line-height:1.6}',
      '.sec{max-width:960px;margin:0 auto;padding:var(--space-5) var(--space-3)}',
      '.eyebrow{font-family:var(--font-mono);font-size:var(--text-xs);letter-spacing:.18em;',
      '  text-transform:uppercase;color:var(--accent);margin:0 0 var(--space-2)}',
      'h1{font-family:var(--font-display);font-size:var(--text-3xl);line-height:1.08;margin:0 0 var(--space-4);font-weight:600}',
      '.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--space-3)}',
      '.card{border:1px solid var(--line);border-radius:var(--radius);padding:var(--space-3);background:var(--surface)}',
      '.card h2{margin:0 0 var(--space-1);font-size:var(--text-md);color:var(--accent);font-weight:700}',
      '.card p{margin:0;color:var(--muted);font-size:var(--text-sm)}',
      '@media (prefers-reduced-motion:no-preference){.card{transition:border-color var(--motion-dur) var(--motion-ease)}}',
      '.card:hover{border-color:var(--accent)}'
    ].join('\n');

    return { html: html, css: css, js: '' };
  }

  function codeOf(artifactId) {
    var draft = draftOf(artifactId);
    return (draft && draft.code) || null;
  }

  function saveCode(artifactId, code) {
    put(artifactId, 'code', code);
    var lines = (code.html || '').split('\n').length + (code.css || '').split('\n').length;
    writePart(artifactId, 'Static fallback', code.js
      ? 'The section renders fully from HTML and CSS alone; the ' + (code.js.split('\n').length) +
        ' lines of script add behaviour on top and nothing essential depends on them.'
      : 'The section is HTML and CSS only — there is no script to fail, so the static state is the only state.');
    writePart(artifactId, 'Keyboard path', 'Every control in the section is a real element — links and buttons — so tab order and activation come from the platform rather than from handlers.');
    return lines;
  }

  function codeMaker(artifactId, preview) {
    var host = el('div.mk');
    var code = codeOf(artifactId) || { html: '', css: '', js: '' };

    function push() {
      saveCode(artifactId, code);
      preview.show({ type: 'code', html: code.html, css: T.toCSS(tokenModel()) + '\n' + code.css, js: code.js });
    }

    function area(key, label, hint, rows) {
      var ta = el('textarea.mk-code', { rows: rows || 8, 'aria-label': label, spellcheck: 'false' });
      ta.value = code[key] || '';
      var t = null;
      ta.addEventListener('input', function () {
        code[key] = ta.value;
        if (t) w.clearTimeout(t);
        t = w.setTimeout(push, 450);       /* debounce so every keystroke is not a repaint */
      });
      return labelled(label, ta, hint);
    }

    append(host, [
      el('div.mk-bar', null, [
        el('button.btn', {
          type: 'button', text: 'Compose a section',
          title: 'Build a real HTML+CSS section from this artifact\'s parts and the live tokens. No model involved.',
          onclick: function () {
            code = composeSection(artifactId);
            push();
            R.toast('Composed from the draft parts and the token set');
            refresh();
          }
        }),
        el('button.btn.ghost', {
          type: 'button', text: 'Draft with the agent',
          title: 'Ask the agent for HTML and CSS. It renders only inside the sandboxed frame — never in this page.',
          onclick: function (e) {
            var btn = e.currentTarget;
            btn.disabled = true;
            w.CBS_AGENT.proposeCode(artifactId).then(function (res) {
              btn.disabled = false;
              if (!res.ok) { R.toast(res.error); return; }
              code = res.code; push(); refresh();
              R.toast('Tier ' + res.tier + ' section');
            });
          }
        }),
        el('button.btn.ghost', {
          type: 'button', text: 'Copy section.html',
          onclick: function () { R.copyText(standalone(artifactId, code), 'section.html copied'); }
        })
      ]),
      el('p.small.dimmed', { style: 'margin:0 0 14px', text: 'The token CSS is prepended automatically, so every var() below resolves. The preview runs on an opaque origin: it can execute this script but cannot read the studio, its storage, or anything else.' })
    ]);

    var fields = el('div');
    function refresh() {
      mount(fields, [
        area('html', 'HTML', 'The section markup. No <html> or <body> wrapper — the frame supplies those.', 10),
        area('css', 'CSS', 'Token custom properties are already in scope: var(--accent), var(--space-3), var(--text-lg).', 8),
        area('js', 'JavaScript', 'Optional. Runs in the preview; stripped from the exported deliverable, which is a document rather than an application.', 5)
      ]);
    }
    refresh();
    append(host, fields);

    /* Paint the first preview once the frame has had a chance to load. */
    w.setTimeout(push, 300);

    return { node: host, refresh: refresh, push: push };
  }

  /* A complete standalone file for the code artifact — useful outside the studio. */
  function standalone(artifactId, code) {
    var hit = w.CBS_GRAPH.findArtifact(artifactId);
    return [
      '<!DOCTYPE html>', '<html lang="en">', '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>' + ((hit && hit.artifact.title) || 'Section') + '</title>',
      '<style>', T.toCSS(tokenModel()), code.css || '', '</style>',
      '</head>', '<body>', code.html || '',
      code.js ? '<script>\n' + code.js + '\n<\/script>' : '',
      '</body>', '</html>'
    ].join('\n');
  }

  /* --------------------------------------------------------------- entry */
  function create(artifactId, kind, ctx) {
    if (kind === 'tokens') return tokensMaker(artifactId);
    if (kind === 'visual') return visualMaker(artifactId);
    if (kind === 'code') return codeMaker(artifactId, ctx && ctx.preview);
    return null;
  }

  w.CBS_MAKERS = {
    create: create,
    tokenEditor: tokenEditor,
    specsOf: specsOf,
    codeOf: codeOf,
    standalone: standalone,
    composeSection: composeSection
  };
})(window);
