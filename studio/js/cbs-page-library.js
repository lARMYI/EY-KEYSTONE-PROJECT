/* Client Build Studio — the library.
   Lanes, patterns, the criteria catalog and the personas, all browsable and
   filterable. Every row comes from the spine. */
(function (w) {
  'use strict';

  var d = w.document;
  var R = w.CBS_RENDER, G = w.CBS_GRAPH, S = w.CBS_STATE;
  var el = R.el, mount = R.mount;

  var filter = { lane: 'all', q: '' };

  function matches(text) {
    if (!filter.q) return true;
    return String(text || '').toLowerCase().indexOf(filter.q.toLowerCase()) !== -1;
  }

  function renderFilters() {
    var lanes = [{ id: 'all', title: 'All lanes' }].concat(w.CBS_LANES || []);
    var search = el('input.q-input', {
      style: 'min-height:0;font-size:.9rem;max-width:320px',
      placeholder: 'Filter by name or purpose…', type: 'search', 'aria-label': 'Filter the library'
    });
    search.value = filter.q;
    search.addEventListener('input', function () { filter.q = search.value; renderAll(); });

    mount(R.$('#filters'), el('div.inline', null, [
      el('div.inline', { role: 'group', 'aria-label': 'Filter by lane' }, lanes.map(function (l) {
        return el('button.etab', {
          type: 'button',
          'aria-selected': filter.lane === l.id ? 'true' : 'false',
          text: l.title,
          onclick: function () { filter.lane = l.id; renderAll(); }
        });
      })),
      search
    ]));
  }

  function renderPatterns() {
    var pats = (G.resolved().patterns || []).filter(function (p) {
      if (filter.lane !== 'all' && p.lane !== filter.lane && p.lane !== 'any') return false;
      return matches(p.title) || matches(p.purpose) || matches(p.id);
    });

    if (!pats.length) {
      mount(R.$('#patterns'), el('div.empty-note', { text: 'No pattern matches that filter.' }));
      return;
    }

    mount(R.$('#patterns'), [
      el('p.small.dimmed', { style: 'margin-bottom:12px', text: pats.length + ' pattern(s)' }),
      el('div.grid-3', null, pats.map(function (p) {
        return el('div.card', null, [
          el('div.inline', null, [
            R.chip(p.lane === 'any' ? 'method' : p.lane, p.lane === 'any' ? 'gold' : 'blue'),
            p.generated ? R.chip('generated', 'violet') : null,
            p.registry ? R.chip('registry', 'teal') : null
          ]),
          el('h4', { text: p.title }),
          el('p', { text: p.purpose }),
          el('details', null, [
            el('summary.small.dimmed', { text: p.sections.length + ' parts' }),
            el('div.stack', { style: 'margin-top:10px;gap:8px' }, p.sections.map(function (sec) {
              return el('div', null, [
                el('div.small', { style: 'color:var(--gold-soft);font-weight:700', text: sec.h }),
                sec.hint ? el('div.small.dimmed', { text: sec.hint }) : null
              ]);
            }))
          ]),
          el('div.small.dimmed.mono', { text: p.id })
        ]);
      }))
    ]);
  }

  function renderLanes() {
    var lanes = (w.CBS_LANES || []).filter(function (l) {
      return (filter.lane === 'all' || filter.lane === l.id) && (matches(l.title) || matches(l.good) || matches(l.oneLiner));
    });
    mount(R.$('#lanes'), lanes.map(function (lane) {
      return el('section.sec', null, [
        el('div.sec-head', null, [
          el('span.sec-n', { text: lane.icon }),
          el('h3.sec-title', { text: lane.title }),
          el('span.depth.' + lane.worked, { text: lane.worked === 'deep' ? 'worked example: deep' : 'worked example: thin' })
        ]),
        el('p.sec-settles', { text: lane.oneLiner }),
        el('p.sec-blurb', { text: lane.good }),
        el('div', { style: 'margin-top:16px' }, [
          el('h4.s-h3', { style: 'font-size:1rem', text: 'Artifacts' }),
          el('div.inline', { style: 'margin:8px 0 16px' }, lane.artifacts.map(function (pid) {
            var p = w.CBS_PATTERN_BY_ID[pid];
            return R.chip(p ? p.title : pid, 'blue');
          })),
          el('h4.s-h3', { style: 'font-size:1rem', text: 'Criteria this medium imposes' }),
          el('div.crits', { style: 'margin-top:8px' }, lane.criteria.map(function (c) {
            return R.criterionRow(c, { scope: 'lane' });
          })),
          el('p.small.dimmed', { style: 'margin-top:10px', text: 'Publish adapter: ' + lane.adapter })
        ])
      ]);
    }));
  }

  function renderCriteria() {
    var view = G.resolved();
    var rows = [];
    view.sections.forEach(function (s) {
      s.areas.forEach(function (a) {
        (a.criteria || []).forEach(function (c) { rows.push({ c: c, where: s.title + ' · ' + a.title, scope: 'area' }); });
        (a.artifacts || []).forEach(function (af) {
          if (filter.lane !== 'all' && af.lane !== filter.lane && af.lane !== 'any') return;
          (af.criteria || []).forEach(function (c) { rows.push({ c: c, where: s.title + ' · ' + af.title, scope: 'artifact' }); });
        });
      });
    });
    (w.CBS_LANES || []).forEach(function (l) {
      if (filter.lane !== 'all' && filter.lane !== l.id) return;
      (l.criteria || []).forEach(function (c) { rows.push({ c: c, where: l.title + ' lane', scope: 'lane' }); });
    });

    rows = rows.filter(function (r) { return matches(r.c.text) || matches(r.where); });

    var counts = { binary: 0, evidence: 0, review: 0, high: 0, auto: 0 };
    rows.forEach(function (r) {
      counts[r.c.kind]++;
      if (r.c.severity === 'high') counts.high++;
      if (r.c.test) counts.auto++;
    });

    mount(R.$('#criteria'), [
      el('div.integrity', null, [
        el('h4', { text: 'Criteria catalog' }),
        el('div.stat-row', null, [
          ['total', rows.length], ['binary', counts.binary], ['evidence', counts.evidence],
          ['review', counts.review], ['high severity', counts.high], ['auto-tested', counts.auto]
        ].map(function (p) {
          return el('div.stat', null, [el('b', { text: String(p[1]) }), el('span', { text: p[0] })]);
        }))
      ]),
      el('div.crits', { style: 'margin-top:14px' }, rows.slice(0, 200).map(function (r) {
        var row = R.criterionRow(r.c, { scope: r.scope });
        row.querySelector('.crit-meta').appendChild(el('span', { text: r.where }));
        return row;
      })),
      rows.length > 200 ? el('p.small.dimmed', { text: (rows.length - 200) + ' further criteria not listed — narrow the filter.' }) : null
    ]);
  }

  function renderPersonas() {
    var ps = (w.CBS_SPINE.personas || []).filter(function (p) {
      return matches(p.name) || matches(p.reads_for);
    });
    mount(R.$('#personas'), el('div.grid-3', null, ps.map(function (p) {
      var used = G.allCriteria().filter(function (e) { return e.criterion.persona === p.id; }).length;
      return el('div.card', null, [
        el('h4', { text: p.name }),
        el('p', { text: p.reads_for }),
        el('p.small', { style: 'color:var(--gold-soft);font-style:italic', text: '“' + p.opens_with + '”' }),
        el('div.inline', null, [R.chip(used + ' review criteria in scope', used ? 'violet' : null), el('span.small.dimmed.mono', { text: p.id })])
      ]);
    })));
  }

  function renderPromoted() {
    var promoted = S.get().promoted || [];
    mount(R.$('#promoted'), promoted.length
      ? el('div.grid-3', null, promoted.map(function (p) {
          return el('div.card.warm', null, [
            R.chip('promoted', 'teal'),
            el('h4', { text: p.title }),
            el('p', { text: p.purpose })
          ]);
        }))
      : el('div.empty-note', { text: 'Nothing promoted yet. When an artifact works, promote it from the workbench and it becomes a pattern the next engagement starts from — criteria attached, client material stripped. This is the loop that makes the playbook compound.' }));
  }

  function renderAll() {
    renderFilters();
    renderLanes();
    renderPatterns();
    renderCriteria();
    renderPersonas();
    renderPromoted();
    R.reveals(d);
  }

  function boot() {
    R.shell('library.html');
    renderAll();
    w.CBS_CONSOLE.init();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
