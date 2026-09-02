/* Client Build Studio — assembly and the three exports.

   1. The deliverable   a self-contained HTML document in the lane's shape
   2. engagement.json   the portable memory, re-importable to the same state
   3. BUILD-ORDER.md    instructions an agent or a team can build the full thing from

   Only certified artifacts reach the deliverable. That rule is enforced here,
   not merely stated: assemble() filters on the passport, and reports what it
   left out rather than quietly dropping it. */
(function (w) {
  'use strict';

  var S = w.CBS_STATE, G = w.CBS_GRAPH, GATE = w.CBS_GATE;

  /* Everything user- or agent-authored passes through this before reaching an
     HTML string. The studio's own UI never uses innerHTML; the exported file
     is a string, so it needs its own escape. */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function paras(text) {
    return String(text || '').split(/\n{2,}/).map(function (p) {
      return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
  }

  /* ------------------------------------------------------------ selection */
  function certified() {
    return G.scopedArtifacts().filter(function (e) {
      var a = S.artifact(e.artifact.id);
      return (a.state === 'gated' || a.state === 'published') && a.passport && a.draft;
    });
  }

  function omitted() {
    return G.scopedArtifacts().filter(function (e) {
      var a = S.artifact(e.artifact.id);
      return !((a.state === 'gated' || a.state === 'published') && a.passport && a.draft);
    });
  }

  function partsOf(entry) {
    var draft = S.artifact(entry.artifact.id).draft;
    return (draft && draft.parts) || [];
  }

  /* ------------------------------------------------------- lane adapters */
  /* Each returns the BODY of the deliverable. The shell, styles, front matter
     and source apparatus are shared — only the shape of the middle differs. */
  var ADAPTERS = {
    'adapt-deck': function (items) {
      return items.map(function (e, i) {
        return '<section class="slide">\n' +
          '<div class="slide-n">' + (i + 1) + ' / ' + items.length + '</div>\n' +
          '<h2>' + esc(e.artifact.title) + '</h2>\n' +
          partsOf(e).map(function (p) {
            return '<div class="pt"><h3>' + esc(p.h) + '</h3>\n' + paras(p.body) + '</div>';
          }).join('\n') + madeFor(e) +
          '\n</section>';
      }).join('\n');
    },

    'adapt-paper': function (items) {
      return items.map(function (e, i) {
        return '<section class="chapter">\n<h2><span class="num">' + (i + 1) + '.</span> ' + esc(e.artifact.title) + '</h2>\n' +
          partsOf(e).map(function (p, j) {
            return '<h3>' + (i + 1) + '.' + (j + 1) + ' ' + esc(p.h) + '</h3>\n' + paras(p.body);
          }).join('\n') + madeFor(e) + '\n</section>';
      }).join('\n');
    },

    'adapt-experience': function (items) {
      return items.map(function (e) {
        return '<section class="scroll-sec">\n<h2>' + esc(e.artifact.title) + '</h2>\n' +
          partsOf(e).map(function (p) {
            return '<div class="band"><h3>' + esc(p.h) + '</h3>\n' + paras(p.body) + '</div>';
          }).join('\n') + madeFor(e) + '\n</section>';
      }).join('\n');
    },

    'adapt-application': function (items) {
      return items.map(function (e) {
        return '<section class="spec">\n<h2>' + esc(e.artifact.title) + '</h2>\n' +
          '<dl>' + partsOf(e).map(function (p) {
            return '<dt>' + esc(p.h) + '</dt><dd>' + paras(p.body) + '</dd>';
          }).join('\n') + '</dl>' + madeFor(e) + '\n</section>';
      }).join('\n');
    },

    'adapt-program': function (items) {
      return items.map(function (e) {
        return '<section class="phase">\n<h2>' + esc(e.artifact.title) + '</h2>\n' +
          '<table><tbody>' + partsOf(e).map(function (p) {
            return '<tr><th>' + esc(p.h) + '</th><td>' + paras(p.body) + '</td></tr>';
          }).join('\n') + '</tbody></table>' + madeFor(e) + '\n</section>';
      }).join('\n');
    },

    'adapt-session': function (items) {
      return items.map(function (e) {
        return '<section class="module">\n<h2>' + esc(e.artifact.title) + '</h2>\n' +
          '<ol class="agenda">' + partsOf(e).map(function (p) {
            return '<li><b>' + esc(p.h) + '</b>' + paras(p.body) + '</li>';
          }).join('\n') + '</ol>' + madeFor(e) + '\n</section>';
      }).join('\n');
    }
  };

  /* ----------------------------------------------------------- the shell */
  /* The palette is no longer frozen here. cbs-tokens emits the real custom
     properties for this engagement and these aliases map the document's older
     names onto them, so the deliverable ships in the client's design system
     rather than in the studio's. */
  var ALIASES = [
    ':root{--panel:var(--surface);--mut:var(--muted);--dim:var(--muted);',
    '--gold:var(--accent);--gold-soft:var(--accent-200);--teal:var(--positive);}'
  ].join('');

  var STYLE = [
    '*{margin:0;padding:0;box-sizing:border-box}',
    'body{background:var(--bg);color:var(--ink);line-height:1.6;font-family:var(--font-ui);}',
    '.wrap{max-width:820px;margin:0 auto;padding:64px 28px 100px}',
    'h1{font-family:var(--font-display);font-size:clamp(2rem,5vw,3.2rem);line-height:1.08;',
    'letter-spacing:-.02em;margin-bottom:16px;font-weight:600}',
    'h2{font-family:var(--font-display);font-size:clamp(1.4rem,3vw,2rem);margin:0 0 14px;font-weight:600;letter-spacing:-.01em}',
    'h3{font-size:1.02rem;margin:20px 0 6px;color:var(--gold-soft);font-weight:700}',
    'p{margin-bottom:12px;color:var(--mut)}',
    '.eyebrow{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.2em;',
    'text-transform:uppercase;color:var(--gold);display:block;margin-bottom:12px}',
    '.ask{border:1px solid var(--accent);border-radius:var(--radius-lg);padding:22px;margin:26px 0;}',
    '.ask p{color:var(--ink);font-size:1.08rem;margin:0}',
    'section{border-top:1px solid var(--line);padding:34px 0;}',
    '.slide{min-height:60vh;display:flex;flex-direction:column;justify-content:center}',
    '.slide-n{font-family:ui-monospace,monospace;font-size:.66rem;letter-spacing:.14em;color:var(--dim);margin-bottom:10px}',
    '.num{color:var(--gold);font-family:ui-monospace,monospace;font-size:.8em}',
    '.band{margin:16px 0}',
    'dl dt{font-family:ui-monospace,monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;',
    'color:var(--gold);margin-top:16px}',
    'table{width:100%;border-collapse:collapse;margin-top:12px}',
    'th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}',
    'th{width:32%;font-size:.8rem;color:var(--gold-soft);font-weight:700}',
    '.agenda{padding-left:20px}.agenda li{margin-bottom:14px;color:var(--mut)}.agenda b{color:var(--ink)}',
    '.claims{font-size:.88rem}.claims li{margin-bottom:10px;color:var(--mut);list-style:none;',
    'padding-left:70px;position:relative}',
    '.st{position:absolute;left:0;top:2px;font-family:ui-monospace,monospace;font-size:.56rem;letter-spacing:.08em;',
    'text-transform:uppercase;padding:2px 6px;border-radius:4px}',
    '.st.verified{background:rgba(55,214,178,.16);color:var(--teal)}',
    '.st.proposed{background:rgba(233,184,74,.16);color:var(--gold-soft)}',
    '.src{display:block;color:var(--dim);font-size:.8rem;margin-top:2px;word-break:break-word}',
    '.cert{font-family:ui-monospace,monospace;font-size:.72rem;color:var(--dim);border:1px solid var(--line);',
    'border-radius:12px;padding:16px;margin-top:30px}',
    '.cert b{color:var(--gold-soft)}',
    'footer{border-top:1px solid var(--line);padding-top:24px;margin-top:40px;color:var(--dim);font-size:.8rem}',
    /* figures and built sections */
    'figure{margin:22px 0}',
    'figure svg{display:block;width:100%;height:auto;border-radius:var(--radius)}',
    'figcaption{font-size:.82rem;color:var(--dim);margin-top:8px;font-family:var(--font-mono)}',
    '.built{border:1px solid var(--line);border-radius:var(--radius-lg);padding:0;overflow:hidden;margin:22px 0}',
    '.built-note{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;',
    'color:var(--dim);padding:8px 14px;border-bottom:1px solid var(--line)}',
    '.built > .built-body{padding:0}',
    /* Print is the PDF path: no generator, no dependency, and the page breaks
       are chosen rather than left to the browser. */
    '@media print{',
    ':root{--bg:#fff;--surface:#fff;--ink:#111;--muted:#333;--line:rgba(0,0,0,.18)}',
    'body{background:#fff;color:#111}',
    'p,.claims li{color:#333}',
    '.wrap{max-width:none;padding:0}',
    'section{page-break-inside:avoid;border-top:1px solid #ddd}',
    '.slide{page-break-after:always;min-height:0}',
    'h1,h2,h3{page-break-after:avoid}',
    'figure,.built,table,.ask{page-break-inside:avoid}',
    '.cert{page-break-before:avoid}',
    '@page{margin:18mm 16mm}',
    '}'
  ].join('');

  /* ------------------------------------------------------- made outputs */
  /* Figures are locally rendered from a validated spec, so the serialized SVG
     is safe by construction rather than by escaping. */
  function figuresFor(entry) {
    var V = w.CBS_VISUALS;
    var draft = S.artifact(entry.artifact.id).draft;
    var specs = (draft && draft.visuals) || [];
    if (!V || !specs.length) return '';
    return specs.map(function (spec, i) {
      var svg;
      try { svg = V.toSVGString(spec.kind, spec); }
      catch (e) { return ''; }
      return '<figure>' + svg +
        '<figcaption>Figure ' + (i + 1) + (spec.title ? ' · ' + esc(spec.title) : '') +
        (spec.caption ? ' — ' + esc(spec.caption) : '') + '</figcaption></figure>';
    }).join('\n');
  }

  /* Authored HTML reaches the export as markup — that is the point of a code
     artifact. Script does not: a deliverable is a document that gets forwarded,
     not an application, and the studio's sandboxed preview is where behaviour
     belongs. What was removed is stated in the certification record rather than
     dropped quietly. */
  var stripped = 0;

  function sanitiseCode(html) {
    var before = html;
    var out = String(html || '')
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<script\b[^>]*>/gi, '')
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
      .replace(/javascript:/gi, '');
    if (out !== before) stripped++;
    return out;
  }

  function builtFor(entry) {
    var draft = S.artifact(entry.artifact.id).draft;
    var code = draft && draft.code;
    if (!code || !String(code.html || '').trim()) return '';
    var scoped = 's-' + entry.artifact.id.replace(/[^a-z0-9]/gi, '');
    var css = String(code.css || '').replace(/(^|\})\s*([^{}@]+)\{/g, function (m0, brace, sel) {
      /* Scope the section's own rules so a built section cannot restyle the
         document around it. @-rules are left alone and their bodies scope on
         the next pass through this same expression. */
      var parts = sel.split(',').map(function (x) {
        var t = x.trim();
        if (!t || t.charAt(0) === '@' || t.charAt(0) === '%' || /^\d/.test(t)) return t;
        if (/^(body|html|:root)$/i.test(t)) return '#' + scoped;
        return '#' + scoped + ' ' + t;
      });
      return brace + parts.join(',') + '{';
    });
    if (code.js) stripped++;
    return '<div class="built"><div class="built-note">Built section · ' + esc(entry.artifact.title) + '</div>' +
      '<style>' + css + '</style>' +
      '<div class="built-body" id="' + scoped + '">' + sanitiseCode(code.html) + '</div></div>';
  }

  /* Whatever this artifact made, in document order under its prose. */
  function madeFor(entry) {
    return figuresFor(entry) + builtFor(entry);
  }

  /* Counts what the certified artifacts actually made, for the record block. */
  function madeCounts() {
    var figures = 0, sections = 0;
    certified().forEach(function (e) {
      var draft = S.artifact(e.artifact.id).draft || {};
      figures += (draft.visuals || []).length;
      if (draft.code && String(draft.code.html || '').trim()) sections++;
    });
    return { figures: figures, sections: sections };
  }

  function deliverable() {
    stripped = 0;                       /* per-export, not per-session */
    var i = S.get().intake || {};
    var laneId = S.lane();
    var lane = w.CBS_LANE_BY_ID[laneId];
    var adapter = ADAPTERS[(lane && lane.adapter) || 'adapt-paper'] || ADAPTERS['adapt-paper'];
    var items = certified();
    var left = omitted();

    var claims = S.claimsFor().filter(function (c) { return c.status !== 'unsourced'; });
    var unsourced = S.claimsFor().filter(function (c) { return c.status === 'unsourced'; });

    var body = items.length ? adapter(items)
      : '<section><h2>Nothing certified yet</h2><p>The deliverable assembles only artifacts that carry a passport. Certify at least one artifact at the Gate and export again.</p></section>';

    var sources = claims.length
      ? '<section><h2>Claims &amp; sources</h2><ul class="claims">' + claims.map(function (c) {
          return '<li><span class="st ' + esc(c.status) + '">' + esc(c.status) + '</span>' +
            esc(c.text) + (c.source ? '<span class="src">' + esc(c.source) + (c.asOf ? ' · as of ' + esc(c.asOf) : '') + '</span>' : '') + '</li>';
        }).join('\n') + '</ul></section>'
      : '';

    var made = madeCounts();
    var cert = '<div class="cert"><b>Certification record</b><br>' +
      items.length + ' artifact(s) certified · ' +
      (made.figures ? made.figures + ' figure(s) drawn · ' : '') +
      (made.sections ? made.sections + ' built section(s) · ' : '') +
      claims.length + ' claim(s) sourced or labelled · ' +
      (unsourced.length ? unsourced.length + ' unsourced claim(s) excluded · ' : '') +
      'engagement fingerprint <b>' + esc(engagementFingerprint()) + '</b><br>' +
      'Fingerprints are FNV-1a content hashes for drift detection, not cryptographic digests.' +
      (stripped ? '<br>Script was removed from ' + stripped + ' built section(s): this is a document, ' +
        'so its HTML and CSS ship and its behaviour does not. The studio preview is where the ' +
        'interactive version runs.' : '') +
      (left.length ? '<br>' + left.length + ' in-scope artifact(s) were not certified and are absent from this document: ' +
        esc(left.map(function (e) { return e.artifact.title; }).join(', ')) + '.' : '') +
      '</div>';

    return [
      '<!DOCTYPE html>', '<html lang="en">', '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>' + esc(i.client || 'Client deliverable') + '</title>',
      /* The engagement's own tokens first, then the document's aliases onto
         them, then the document's own rules. */
      '<style>' + tokenCSS() + '\n' + ALIASES + STYLE + '</style>',
      '</head>', '<body>', '<main class="wrap">',
      '<header>',
      '<span class="eyebrow">' + esc((lane && lane.title) || 'Deliverable') + '</span>',
      '<h1>' + esc(i.client || 'Untitled') + '</h1>',
      '<div class="ask"><p>' + esc(i.decision || '') + '</p></div>',
      i.decider ? '<p><b>Decision needed from:</b> ' + esc(i.decider) + '</p>' : '',
      i.stakes ? '<p><b>The cost of no:</b> ' + esc(i.stakes) + '</p>' : '',
      '</header>',
      body,
      sources,
      '<footer>', cert,
      '<p style="margin-top:14px">Assembled by Client Build Studio. Only certified artifacts appear above.</p>',
      '</footer>',
      '</main>', '</body>', '</html>'
    ].join('\n');
  }

  function tokenCSS() {
    var T = w.CBS_TOKENS;
    return T ? T.toCSS(S.get().tokens) : ':root{--bg:#070A10;--surface:#0F151E;--ink:#F7F3EA;' +
      '--muted:#94A2B4;--accent:#E9B84A;--accent-200:#FBD98C;--positive:#37D6B2;' +
      '--line:rgba(255,255,255,.09);--radius:14px;--radius-lg:20px;' +
      '--font-display:Fraunces,Georgia,serif;--font-ui:"Hanken Grotesk",system-ui,sans-serif;' +
      '--font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;}';
  }

  function engagementFingerprint() {
    var items = certified().map(function (e) {
      return e.artifact.id + ':' + S.artifact(e.artifact.id).passport.evidenceHash;
    }).sort().join('|');
    return GATE.fingerprint(items || 'empty');
  }

  /* ------------------------------------------------------ engagement.json */
  function memory() { return S.exportJSON(); }

  /* ------------------------------------------------------ BUILD-ORDER.md */
  function buildOrder() {
    var i = S.get().intake || {};
    var lane = w.CBS_LANE_BY_ID[S.lane()];
    var items = certified();
    var all = G.scopedArtifacts();
    var crits = G.allCriteria();

    var L = [];
    L.push('# BUILD ORDER — ' + (i.client || 'Untitled engagement'));
    L.push('');
    L.push('Generated by Client Build Studio. Point an agentic coding tool at this file to');
    L.push('scaffold the full deliverable at production scale.');
    L.push('');
    L.push('## The commission');
    L.push('');
    L.push('| Field | Value |');
    L.push('| --- | --- |');
    (w.CBS_INTAKE || []).forEach(function (f) {
      L.push('| ' + f.label + ' | ' + String(i[f.id] || '—').replace(/\|/g, '\\|') + ' |');
    });
    L.push('');
    L.push('**Lane:** ' + (lane ? lane.title : '—') + ' — ' + (lane ? lane.oneLiner : ''));
    L.push('');
    if (lane) { L.push('**What good means here:** ' + lane.good); L.push(''); }

    L.push('## Design tokens');
    L.push('');
    L.push('Use these verbatim. Define once in `:root`; never inline an ad-hoc value.');
    L.push('');
    L.push('```css');
    L.push(':root{');
    L.push('  --bg:#070A10; --bg2:#0B1018; --panel:#0F151E; --panel2:#151D29;');
    L.push('  --line:rgba(255,255,255,.07); --line-2:rgba(255,255,255,.12);');
    L.push('  --ink:#F7F3EA; --mut:#94A2B4; --dim:#6E7C94;');
    L.push('  --gold:#E9B84A; --gold-2:#C7902A; --gold-soft:#FBD98C;');
    L.push('  --blue:#5B97FF; --teal:#37D6B2; --red:#FF6B6B; --violet:#B498FF;');
    L.push('  --disp:Fraunces,serif; --ui:"Hanken Grotesk",sans-serif; --mono:"JetBrains Mono",monospace;');
    L.push('  --r:16px; --r-lg:22px;');
    L.push('}');
    L.push('```');
    L.push('');

    L.push('## Build order');
    L.push('');
    L.push('Dependency order, as resolved by the studio\'s artifact graph. Build top to bottom.');
    L.push('');
    var order = topo(all);
    order.forEach(function (e, n) {
      var a = S.artifact(e.artifact.id);
      var cert = a.passport ? 'certified' : a.state;
      L.push((n + 1) + '. **' + e.artifact.title + '** — `' + e.artifact.id + '` · ' + e.section.title + ' · _' + cert + '_');
      L.push('   - ' + e.artifact.outputs);
      var deps = (e.artifact.inputs || []).concat(e.artifact.inputsAny || []);
      if (deps.length) L.push('   - consumes: ' + deps.join(', '));
    });
    L.push('');

    L.push('## Acceptance tests');
    L.push('');
    L.push('These are the criteria the studio held this work to. They travel with the build as');
    L.push('acceptance tests — the work is not done until each one can be answered yes.');
    L.push('');
    var byKind = { binary: [], evidence: [], review: [] };
    crits.forEach(function (e) { (byKind[e.criterion.kind] || []).push(e); });
    ['binary', 'evidence', 'review'].forEach(function (k) {
      if (!byKind[k].length) return;
      L.push('### ' + k.charAt(0).toUpperCase() + k.slice(1));
      L.push('');
      byKind[k].forEach(function (e) {
        var r = S.get().criteria[e.criterion.id];
        var mark = r && r.result === 'pass' ? 'x' : ' ';
        var sev = e.criterion.severity === 'high' ? ' **(high severity — cannot be waived)**' : '';
        var who = e.criterion.persona ? ' _(' + w.CBS_RENDER.personaName(e.criterion.persona) + ')_' : '';
        L.push('- [' + mark + '] ' + e.criterion.text + sev + who);
      });
      L.push('');
    });

    L.push('## Claim registry');
    L.push('');
    var claims = S.claimsFor();
    if (!claims.length) L.push('_No claims registered._');
    else {
      L.push('| Status | Claim | Source |');
      L.push('| --- | --- | --- |');
      claims.forEach(function (c) {
        L.push('| ' + c.status + ' | ' + String(c.text).replace(/\|/g, '\\|') + ' | ' +
          String(c.source || '—').replace(/\|/g, '\\|') + ' |');
      });
      L.push('');
      L.push('**Rule:** no Unsourced claim ships. Either source it, label it as a proposed');
      L.push('construct, or cut it.');
    }
    L.push('');

    L.push('## Per-artifact prompts');
    L.push('');
    L.push('One prompt per certified artifact, carrying its pattern and criteria.');
    L.push('');
    items.forEach(function (e) {
      var pattern = w.CBS_PATTERN_BY_ID[e.artifact.pattern];
      L.push('<details><summary><b>' + e.artifact.title + '</b> (`' + e.artifact.id + '`)</summary>');
      L.push('');
      L.push('```');
      L.push('Build: ' + e.artifact.title);
      L.push('Purpose: ' + e.artifact.outputs);
      if (pattern) {
        L.push('Pattern: ' + pattern.title + ' — ' + pattern.purpose);
        L.push('Parts (use these headings exactly):');
        pattern.sections.forEach(function (p) { L.push('  - ' + p.h + ' — ' + (p.hint || '')); });
      }
      L.push('Must satisfy:');
      G.criteriaFor(e.artifact.id).forEach(function (c) {
        L.push('  - [' + c.criterion.kind + '] ' + c.criterion.text);
      });
      L.push('Certified content:');
      partsOf(e).forEach(function (p) {
        L.push('  ## ' + p.h);
        String(p.body || '').split('\n').forEach(function (ln) { L.push('  ' + ln); });
      });
      L.push('```');
      L.push('');
      L.push('</details>');
      L.push('');
    });

    L.push('## Constraints to preserve');
    L.push('');
    L.push('- No build step and no runtime dependencies unless the lane genuinely needs one.');
    L.push('- `Content-Security-Policy: default-src \'self\'` — no inline `<script>`, no `eval`,');
    L.push('  no third-party origins. Self-host fonts and vendor any library.');
    L.push('- Progressive enhancement: every enhancement degrades to a working state.');
    L.push('- `prefers-reduced-motion` honoured; nothing understandable only through animation.');
    L.push('- Keyboard-operable throughout, in reading order.');
    L.push('- No horizontal overflow at 390px.');
    L.push('');
    L.push('---');
    L.push('');
    L.push('Engagement fingerprint `' + engagementFingerprint() + '` · spine v' + w.CBS_SPINE.spineVersion +
      ' · ' + items.length + ' of ' + all.length + ' in-scope artifacts certified.');

    return L.join('\n');
  }

  /* Kahn's algorithm over the in-scope graph, so the build order is genuinely a
     dependency order rather than the spine's authoring order. */
  function topo(entries) {
    var ids = {}, indeg = {}, adj = {};
    entries.forEach(function (e) { ids[e.artifact.id] = e; indeg[e.artifact.id] = 0; adj[e.artifact.id] = []; });
    entries.forEach(function (e) {
      var deps = (e.artifact.inputs || []).concat(e.artifact.inputsAny || []);
      deps.forEach(function (dep) {
        if (!ids[dep]) return;
        adj[dep].push(e.artifact.id);
        indeg[e.artifact.id]++;
      });
    });
    var queue = Object.keys(indeg).filter(function (id) { return indeg[id] === 0; })
      .sort(function (a, b) { return (ids[b].artifact.weight || 5) - (ids[a].artifact.weight || 5); });
    var out = [];
    while (queue.length) {
      var id = queue.shift();
      out.push(ids[id]);
      adj[id].forEach(function (nxt) {
        if (--indeg[nxt] === 0) queue.push(nxt);
      });
    }
    /* A cycle would strand nodes; append them rather than losing them. */
    entries.forEach(function (e) { if (out.indexOf(e) === -1) out.push(e); });
    return out;
  }

  function markPublished() {
    var n = 0;
    certified().forEach(function (e) {
      S.setArtifact(e.artifact.id, { state: 'published' });
      n++;
    });
    if (n) S.log('gate', 'Published ' + n + ' certified artifact(s) · engagement fingerprint ' + engagementFingerprint(), 'studio');
    return n;
  }

  w.CBS_PUBLISH = {
    esc: esc,
    certified: certified,
    omitted: omitted,
    deliverable: deliverable,
    memory: memory,
    buildOrder: buildOrder,
    engagementFingerprint: engagementFingerprint,
    markPublished: markPublished,
    topo: topo,
    ADAPTERS: ADAPTERS
  };
})(window);
