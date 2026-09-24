/* Client Build Studio — the publish page.
   Three exports plus the expansion loop. Clipboard is the guaranteed path;
   the download link is a feature-detected enhancement. */
(function (w) {
  'use strict';

  var d = w.document;
  var R = w.CBS_RENDER, S = w.CBS_STATE, G = w.CBS_GRAPH, P = w.CBS_PUBLISH, A = w.CBS_AGENT;
  var el = R.el, mount = R.mount, append = R.append;

  var TABS = [
    { id: 'deliverable', label: 'The deliverable', file: 'deliverable.html', mime: 'text/html',
      note: 'A self-contained document in the lane\'s shape. Only certified artifacts appear in it — anything left out is named in the certification record at the foot.' },
    { id: 'memory', label: 'engagement.json', file: 'engagement.json', mime: 'application/json',
      note: 'The portable memory: commission, artifacts, claims, criteria results, passports, overlay and run log. Re-import it to resume or fork this engagement.' },
    { id: 'buildorder', label: 'BUILD-ORDER.md', file: 'BUILD-ORDER.md', mime: 'text/markdown',
      note: 'The agent prompt pack: dependency-ordered build list, design tokens, the criteria as acceptance tests, the claim registry, and a prompt per artifact.' }
  ];

  var current = 'deliverable';

  function content(id) {
    if (id === 'memory') return P.memory();
    if (id === 'buildorder') return P.buildOrder();
    return P.deliverable();
  }

  function renderExports() {
    var host = R.$('#exports');
    var tab = TABS.filter(function (t) { return t.id === current; })[0];
    var text = content(current);

    var box = el('textarea.export-box', { readonly: true, 'aria-label': tab.label, spellcheck: 'false' });
    box.value = text;

    var dl = R.downloadable(tab.file, text, tab.mime);

    mount(host, [
      el('div.export-tabs', { role: 'tablist' }, TABS.map(function (t) {
        return el('button.etab', {
          type: 'button', role: 'tab',
          'aria-selected': t.id === current ? 'true' : 'false',
          text: t.label,
          onclick: function () { current = t.id; renderExports(); }
        });
      })),
      el('p.small.muted', { style: 'margin-bottom:12px', text: tab.note }),
      el('div.inline', { style: 'margin-bottom:12px' }, [
        el('button.btn', { type: 'button', text: 'Copy ' + tab.file, onclick: function () { R.copyText(text, tab.file + ' copied'); } }),
        dl,
        el('span.small.dimmed', { text: (text.length / 1024).toFixed(1) + ' KB' })
      ]),
      box
    ]);
  }

  function renderStatus() {
    var certified = P.certified(), omitted = P.omitted();
    var r = G.readiness();
    mount(R.$('#pub-status'), el('div.integrity' + (omitted.length ? '' : '.ok'), null, [
      el('h4', { text: 'Assembly' }),
      el('div.stat-row', null, [
        ['certified', certified.length], ['not certified', omitted.length],
        ['claims', r.claims], ['unsourced', r.unsourced]
      ].map(function (p) {
        return el('div.stat', null, [el('b', { text: String(p[1]) }), el('span', { text: p[0] })]);
      })),
      el('p.small.muted', { style: 'margin-top:8px', text: 'Fingerprint ' + P.engagementFingerprint() + ' — an FNV-1a content hash over the certified set, for detecting drift. Not a cryptographic digest.' }),
      omitted.length ? el('div', { style: 'margin-top:12px' }, [
        el('p.small.dimmed', { text: 'Left out of the deliverable because they carry no passport:' }),
        el('div.inline', { style: 'margin-top:6px' }, omitted.slice(0, 12).map(function (e) {
          return R.chip(e.artifact.title, 'red');
        })),
        omitted.length > 12 ? el('p.small.dimmed', { text: 'and ' + (omitted.length - 12) + ' more.' }) : null
      ]) : el('p.small', { style: 'color:var(--teal);margin-top:8px', text: 'Every in-scope artifact is certified.' })
    ]));
  }

  function renderExpand() {
    var host = R.$('#expand');
    var proposals = A.proposeNodes();
    var overlay = S.get().overlay;
    var overlayCount = overlay.areas.length + overlay.artifacts.length;

    mount(host, [
      el('div.row-between', { style: 'margin-bottom:14px' }, [
        el('h3.s-h3', { style: 'margin:0', text: 'Node proposals' }),
        R.chip(overlayCount + ' accepted into the overlay', overlayCount ? 'teal' : null)
      ]),
      el('p.small.muted', { style: 'margin-bottom:14px', text: 'The agent reads the diagnosis and proposes schema-conforming nodes. Nothing is auto-accepted, and a proposal that would break spine validation is refused rather than accepted and apologised for.' }),
      el('div.stack', null, proposals.map(function (p) {
        if (!p.node) {
          return el('div.empty-note', { text: p.reason });
        }
        return el('div.card.warm', null, [
          el('h4', { text: p.node.title }),
          el('p.small.dimmed', { text: p.reason }),
          el('p.small', { text: p.node.outputs }),
          el('div.inline', null, [
            R.chip(p.kind, 'violet'),
            R.chip(p.node.lane || 'any'),
            R.chip((p.node.criteria || []).length + ' criteria', 'gold')
          ]),
          el('div.inline', { style: 'margin-top:10px' }, [
            el('button.btn', {
              type: 'button', text: 'Accept',
              onclick: function () {
                var out = A.acceptProposal(p);
                R.toast(out.ok ? 'Accepted into the overlay' : out.error);
                if (out.ok) { renderExpand(); renderStatus(); renderExports(); }
              }
            }),
            el('button.btn.ghost', {
              type: 'button', text: 'Copy as JSON',
              onclick: function () { R.copyText(JSON.stringify(p.node, null, 2), 'Node copied — edit it and import through engagement.json'); }
            })
          ])
        ]);
      })),

      overlayCount ? el('div', { style: 'margin-top:22px' }, [
        el('h3.s-h3', { text: 'The overlay' }),
        el('p.small.muted', { style: 'margin-bottom:12px', text: 'Accepted nodes live here, merged over the shipped spine at read time. The spine file on disk is never written by the browser — export the overlay to promote anything permanently.' }),
        el('div.stack', { style: 'gap:8px' }, overlay.areas.concat(overlay.artifacts).map(function (n) {
          return el('div.inline', { style: 'justify-content:space-between' }, [
            el('span.small', { text: n.title || n.id }),
            el('button.icon-btn', {
              type: 'button', text: '×', title: 'Remove from overlay', 'aria-label': 'Remove ' + (n.title || n.id),
              onclick: function () {
                S.removeOverlayNode(n.areaId ? 'artifact' : 'area', n.id);
                renderExpand(); renderStatus(); renderExports();
              }
            })
          ]);
        })),
        el('button.btn.ghost', {
          type: 'button', style: 'margin-top:12px', text: 'Copy spine-overlay.json',
          onclick: function () { R.copyText(JSON.stringify(overlay, null, 2), 'Overlay copied'); }
        })
      ]) : null
    ]);
  }

  function renderImport() {
    var ta = el('textarea.export-box', { rows: 6, style: 'min-height:120px', placeholder: 'Paste an engagement.json export here', 'aria-label': 'Import engagement JSON' });
    mount(R.$('#import'), [
      el('p.small.muted', { style: 'margin-bottom:10px', text: 'Importing replaces the current engagement in this browser. Export first if you want to keep it.' }),
      ta,
      el('div.inline', { style: 'margin-top:10px' }, [
        el('button.btn', {
          type: 'button', text: 'Import',
          onclick: function () {
            var out = S.importJSON(ta.value);
            if (!out.ok) { R.toast(out.error); return; }
            R.toast('Engagement imported');
            ta.value = '';
            paintAll();
          }
        }),
        el('button.btn.ghost', {
          type: 'button', text: 'Start a fresh engagement',
          onclick: function () {
            if (!w.confirm('Discard the current engagement and start fresh? Export it first if you want to keep it.')) return;
            S.reset();
            R.toast('Reset — the board is blank');
            paintAll();
          }
        })
      ])
    ]);
  }

  function renderPublishAction() {
    var certified = P.certified();
    mount(R.$('#pub-action'), el('div.nba', null, [
      el('span.eyebrow', { text: 'Mark as published' }),
      el('h3', { text: certified.length ? certified.length + ' artifact(s) ready' : 'Nothing certified yet' }),
      el('p', { text: certified.length
        ? 'Marking them published moves the engagement to R5 and records the engagement fingerprint in the run log. Do it once the deliverable has actually left the building.'
        : 'Certify at least one artifact at the Gate before publishing.' }),
      el('button.btn', {
        type: 'button', disabled: !certified.length, text: 'Mark published',
        onclick: function () {
          var n = P.markPublished();
          R.toast(n + ' artifact(s) marked published');
          paintAll();
        }
      })
    ]));
  }

  function paintAll() {
    R.renderLadder(R.$('#pub-ladder'));
    renderStatus();
    renderExports();
    renderExpand();
    renderImport();
    renderPublishAction();
    R.renderIntegrity(R.$('#pub-integrity'), { diagnose: true });
  }

  function boot() {
    R.shell('publish.html');
    if (!S.intakeComplete()) {
      mount(R.$('#gate-note'), el('div.empty-note', null, [
        'No engagement started yet. ',
        el('a.exlink', { href: 'build.html', text: 'Answer the Commission first' }),
        ' — publish assembles what the board has certified.'
      ]));
    }
    paintAll();
    R.reveals(d);
    w.CBS_CONSOLE.init();
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
