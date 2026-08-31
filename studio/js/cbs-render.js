/* Client Build Studio — the renderer and the shell.

   Every node is built with createElement and textContent. There is no
   innerHTML path for anything that could carry engagement text, agent output,
   or an imported file — the same discipline the pitch site's chat log holds. */
(function (w) {
  'use strict';

  var d = w.document;

  /* ---------------------------------------------------------------- el() */
  /* el('div.card', {aria-label: 'x'}, [child, 'text']) */
  function el(spec, attrs, kids) {
    var parts = String(spec).split('.');
    var tag = parts.shift() || 'div';
    var node = d.createElement(tag);
    if (parts.length) node.className = parts.join(' ');
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'text') { node.textContent = String(v); return; }
        if (k === 'html') { return; }              /* deliberately unsupported */
        if (k === 'class') { node.className = v; return; }
        if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          node.addEventListener(k.slice(2), v); return;
        }
        if (k === 'dataset') {
          Object.keys(v).forEach(function (dk) { node.dataset[dk] = v[dk]; });
          return;
        }
        node.setAttribute(k, v === true ? '' : String(v));
      });
    }
    append(node, kids);
    return node;
  }

  function append(node, kids) {
    if (kids === null || kids === undefined || kids === false) return node;
    if (Array.isArray(kids)) { kids.forEach(function (k) { append(node, k); }); return node; }
    if (kids instanceof w.Node) { node.appendChild(kids); return node; }
    node.appendChild(d.createTextNode(String(kids)));
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  function mount(node, kids) { clear(node); append(node, kids); return node; }
  function $(sel, root) { return (root || d).querySelector(sel); }

  /* --------------------------------------------------------------- shell */
  var NAV = [
    { href: 'index.html', label: 'The playbook' },
    { href: 'build.html', label: 'Build' },
    { href: 'library.html', label: 'Library' },
    { href: 'publish.html', label: 'Publish' },
    { href: '../index.html', label: 'Worked example' }
  ];

  function shell(current) {
    var body = d.body;
    body.classList.add('studio-body');

    var atmos = el('div.atmos', { 'aria-hidden': 'true' }, [
      el('div.atmos-base'),
      el('div.aurora', null, [el('span.a.a1'), el('span.a.a2'), el('span.a.a3')]),
      el('div.drafting'), el('div.grain'), el('div.vignette')
    ]);
    var progress = el('div.progress', { id: 'progress' });

    var nav = el('nav', { id: 'nav' }, [
      el('div.logo', null, [el('span.kb'), el('b', { text: 'CLIENT BUILD STUDIO' })]),
      el('div.links', null, NAV.map(function (n) {
        var isCur = n.href === current;
        return el('a', {
          href: n.href,
          'aria-current': isCur ? 'page' : null,
          text: n.label,
          style: isCur ? 'color:var(--gold-soft)' : null
        });
      }))
    ]);

    body.insertBefore(atmos, body.firstChild);
    body.insertBefore(progress, body.firstChild.nextSibling);
    body.insertBefore(nav, progress.nextSibling);

    wireScroll(nav, progress);
    return nav;
  }

  function wireScroll(nav, progress) {
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      w.requestAnimationFrame(function () {
        var y = w.scrollY || d.documentElement.scrollTop;
        nav.classList.toggle('scrolled', y > 24);
        var h = d.documentElement.scrollHeight - w.innerHeight;
        progress.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
        ticking = false;
      });
    }
    w.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------------------- reveals */
  /* Same doctrine as the pitch site: content is never left invisible. The
     IntersectionObserver is the nice path; the sweep is the guarantee. A fast
     scroll, a throttled tab, or a missing observer can all leave an element
     un-notified, so a rAF-throttled scroll sweep reveals anything that has
     reached or passed the viewport regardless of what the observer saw. */
  function reveals(root) {
    var scope = root || d;
    var reduced = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pending() { return scope.querySelectorAll('.reveal:not(.in)'); }

    function revealAll() {
      Array.prototype.forEach.call(pending(), function (n) { n.classList.add('in'); });
    }

    if (reduced || !w.IntersectionObserver) { revealAll(); return; }

    var io = new w.IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
    Array.prototype.forEach.call(pending(), function (n) { io.observe(n); });

    /* Anything at or above the fold — including everything already scrolled
       past — is revealed outright. */
    function sweep() {
      var left = pending();
      Array.prototype.forEach.call(left, function (n) {
        if (n.getBoundingClientRect().top < w.innerHeight) {
          n.classList.add('in');
          io.unobserve(n);
        }
      });
      if (!pending().length) detach();
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      w.requestAnimationFrame(function () { sweep(); ticking = false; });
    }
    function detach() {
      w.removeEventListener('scroll', onScroll);
      w.removeEventListener('resize', onScroll);
    }

    w.addEventListener('scroll', onScroll, { passive: true });
    w.addEventListener('resize', onScroll, { passive: true });
    w.setTimeout(sweep, 1200);

    /* If the document timeline is frozen (background tab), transitions never
       run and the observer may never fire. Give up gracefully and show it all
       rather than leaving the reader with blank sections. */
    w.setTimeout(function () { if (pending().length) revealAll(); detach(); }, 8000);
  }

  /* ---------------------------------------------------------------- toast */
  var toastNode = null, toastTimer = null;
  function toast(msg) {
    if (!toastNode) {
      toastNode = el('div.toast', { role: 'status', 'aria-live': 'polite' });
      d.body.appendChild(toastNode);
    }
    toastNode.textContent = msg;
    toastNode.classList.add('show');
    w.clearTimeout(toastTimer);
    toastTimer = w.setTimeout(function () { toastNode.classList.remove('show'); }, 2600);
  }

  /* ------------------------------------------------------- shared pieces */
  function chip(text, tone) { return el('span.chip-s' + (tone ? '.' + tone : ''), { text: text }); }

  function criterionRow(c, opts) {
    opts = opts || {};
    var kids = [
      el('span.crit-kind.' + c.kind, { text: c.kind }),
      el('div', null, [
        el('div.crit-text', { text: c.text }),
        el('div.crit-meta', null, [
          c.severity === 'high' ? el('span', { text: 'high severity' }) : null,
          c.test ? el('span.mono', { text: 'auto: ' + c.test }) : null,
          c.persona ? el('span', { text: personaName(c.persona) }) : null,
          opts.scope ? el('span', { text: opts.scope + ' criterion' }) : null
        ])
      ])
    ];
    if (opts.actions) kids.push(opts.actions);
    var row = el('div.crit' + (c.severity === 'high' ? '.sev-high' : ''), { dataset: { crit: c.id } }, kids);
    if (opts.result) row.classList.add(opts.result);
    return row;
  }

  function personaName(id) {
    var p = (w.CBS_SPINE.personas || []).filter(function (x) { return x.id === id; })[0];
    return p ? p.name : id;
  }

  function exemplarLink(exemplar) {
    if (!exemplar) return null;
    return el('a.exlink', {
      href: exemplar.href,
      text: 'Worked example: ' + exemplar.label,
      title: 'Opens the built example that ships with this studio'
    });
  }

  /* --------------------------------------------------- the playbook page */
  /* Renders sections → areas → artifacts entirely from the spine. If the spine
     were emptied, this page would render empty — that is the test. */
  function renderPlaybook(root, view) {
    view = view || w.CBS_GRAPH.resolved();
    var G = w.CBS_GRAPH;

    mount(root, view.sections.map(function (s) {
      var scopedNote = null;
      return el('article.sec.reveal', { id: s.id }, [
        el('div.sec-head', null, [
          el('span.sec-n', { text: String(s.n) }),
          el('h3.sec-title', { text: s.title })
        ]),
        el('p.sec-settles', { text: s.settles }),
        s.blurb ? el('p.sec-blurb', { text: s.blurb }) : null,
        scopedNote,
        el('div.areas', null, s.areas.map(function (a) {
          var arts = (a.artifacts || []);
          var laneTags = {};
          arts.forEach(function (af) { if (af.lane && af.lane !== 'any') laneTags[af.lane] = true; });
          var laneList = Object.keys(laneTags);

          return el('section.area' + (a.fromOverlay ? '.is-overlay' : ''), { id: a.id }, [
            el('h4.area-title', null, [
              a.title,
              a.fromOverlay ? chip('added', 'teal') : null
            ]),
            el('p.area-purpose', { text: a.purpose }),
            el('ul.area-qs', null, (a.questions || []).map(function (q) {
              return el('li', { text: q });
            })),
            el('div.area-foot', null, [
              chip((a.criteria || []).length + ' criteria', 'gold'),
              arts.length ? chip(arts.length + ' artifact' + (arts.length > 1 ? 's' : '')) : chip('lane-supplied'),
              laneList.length ? chip(laneList.length + ' lanes', 'blue') : null,
              exemplarLink(a.exemplar)
            ]),
            (a.criteria || []).length ? el('details', null, [
              el('summary.small.dimmed', { text: 'Criteria' }),
              el('div.crits', { style: 'margin-top:10px' },
                (a.criteria || []).map(function (c) { return criterionRow(c); }))
            ]) : null,
            arts.length ? el('details', null, [
              el('summary.small.dimmed', { text: 'Artifacts' }),
              el('div.stack', { style: 'margin-top:10px' }, arts.map(function (af) {
                return el('div.small', null, [
                  el('b', { text: af.title }),
                  af.lane !== 'any' ? chip(af.lane, 'blue') : null,
                  el('div.dimmed', { text: af.outputs })
                ]);
              }))
            ]) : null,
            a.expand ? el('details', null, [
              el('summary.small.dimmed', { text: 'How to expand this area' }),
              el('p.small.muted', { style: 'margin-top:8px', text: a.expand })
            ]) : null
          ]);
        }))
      ]);
    }));
    reveals(root);
  }

  /* ------------------------------------------------------ integrity panel */
  function renderIntegrity(root, opts) {
    opts = opts || {};
    var res = w.CBS_SCHEMA.validateSpine(w.CBS_SPINE, opts.validateOpts);
    var box = el('div.integrity.' + (res.ok ? 'ok' : 'bad'));
    append(box, el('h4', { text: res.ok ? 'Spine integrity — valid' : 'Spine integrity — ' + res.errors.length + ' error(s)' }));

    var st = res.stats;
    append(box, el('div.stat-row', null,
      [['sections', st.sections], ['areas', st.areas], ['artifacts', st.artifacts],
       ['criteria', st.criteria], ['lanes', st.lanes], ['patterns', st.patterns], ['personas', st.personas]]
      .map(function (pair) {
        return el('div.stat', null, [el('b', { text: String(pair[1]) }), el('span', { text: pair[0] })]);
      })));

    if (!res.ok) {
      res.errors.slice(0, 25).forEach(function (e) {
        append(box, el('div.finding', null, [
          el('span.sev.high', { text: 'error' }),
          el('div', null, [el('div', { text: e.msg }), el('div.where', { text: e.path })])
        ]));
      });
      if (res.errors.length > 25) {
        append(box, el('p.small.dimmed', { text: (res.errors.length - 25) + ' further errors not listed.' }));
      }
    }

    if (opts.diagnose) {
      var findings = w.CBS_GRAPH.diagnose();
      append(box, el('h4', { style: 'margin-top:18px', text: findings.length ? 'Engagement diagnosis — ' + findings.length + ' finding(s)' : 'Engagement diagnosis — nothing structural to report' }));
      findings.slice(0, 30).forEach(function (f) {
        append(box, el('div.finding', null, [
          el('span.sev.' + f.severity, { text: f.severity }),
          el('div', null, [el('div', { text: f.msg }), f.where ? el('div.where', { text: f.where }) : null])
        ]));
      });
    }
    mount(root, box);
    return res;
  }

  /* ------------------------------------------------------------- ladder */
  function renderLadder(root, r) {
    r = r || w.CBS_GRAPH.readiness();
    mount(root, el('div.ladder', { role: 'list', 'aria-label': 'Engagement readiness' },
      r.ladder.map(function (rung, i) {
        var cls = i === r.index ? '.cur' : (i < r.index ? '.on' : '');
        return el('div.rung' + cls, { role: 'listitem' }, [
          el('div.rung-id', { text: rung.id }),
          el('div.rung-l', { text: rung.label }),
          el('div.rung-n', { text: rung.note })
        ]);
      })));
  }

  /* --------------------------------------------------------------- copy */
  /* Clipboard is the guaranteed export path under this CSP; the download link
     is a feature-detected enhancement, never the only route to a file. */
  function copyText(text, label) {
    function fallback() {
      var ta = d.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      d.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = d.execCommand('copy'); } catch (e) { ok = false; }
      d.body.removeChild(ta);
      toast(ok ? (label || 'Copied') : 'Copy failed — select the text and copy manually.');
    }
    if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
      w.navigator.clipboard.writeText(text).then(function () {
        toast(label || 'Copied');
      })['catch'](fallback);
    } else fallback();
  }

  function downloadable(filename, text, mime) {
    if (!w.URL || !w.URL.createObjectURL || !('download' in d.createElement('a'))) return null;
    var blob = new w.Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var a = el('a.btn.ghost', { href: w.URL.createObjectURL(blob), download: filename, text: 'Download ' + filename });
    a.addEventListener('click', function () {
      w.setTimeout(function () { w.URL.revokeObjectURL(a.href); }, 4000);
    });
    return a;
  }

  w.CBS_RENDER = {
    el: el, append: append, clear: clear, mount: mount, $: $,
    shell: shell, reveals: reveals, toast: toast,
    chip: chip, criterionRow: criterionRow, personaName: personaName, exemplarLink: exemplarLink,
    renderPlaybook: renderPlaybook, renderIntegrity: renderIntegrity, renderLadder: renderLadder,
    copyText: copyText, downloadable: downloadable
  };
})(window);
