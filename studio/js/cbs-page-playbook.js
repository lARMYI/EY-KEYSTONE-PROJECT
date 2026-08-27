/* Client Build Studio — the playbook page controller.
   Chrome is in the HTML; every piece of method content on this page comes from
   the spine. Empty the spine and this page renders empty, not stale. */
(function (w) {
  'use strict';

  var R = w.CBS_RENDER, G = w.CBS_GRAPH, S = w.CBS_STATE;
  var el = R.el, mount = R.mount;

  function laneCard(lane) {
    return el('div.card', null, [
      el('span.card-icon', { text: lane.icon }),
      el('h4', { text: lane.title }),
      el('p', { text: lane.oneLiner }),
      el('p.small.dimmed', { text: lane.good }),
      el('div.inline', null, [
        R.chip(lane.artifacts.length + ' artifacts'),
        R.chip(lane.criteria.length + ' lane criteria', 'gold'),
        el('span.depth.' + lane.worked, {
          text: lane.worked === 'deep' ? 'worked example: deep' : 'worked example: thin'
        })
      ])
    ]);
  }

  function personaCard(p) {
    return el('div.card', null, [
      el('h4', { text: p.name }),
      el('p', { text: p.reads_for }),
      el('p.small', { style: 'color:var(--gold-soft);font-style:italic', text: '“' + p.opens_with + '”' })
    ]);
  }

  var KINDS = [
    {
      k: 'binary', title: 'Binary',
      body: 'A yes/no a human can check in seconds. Some carry an auto-test; the rest are toggles. A test that cannot decide returns unknown and falls back to a person — it never passes because it failed to find a problem.'
    },
    {
      k: 'evidence', title: 'Evidence',
      body: 'Every factual claim carries Verified, Proposed, or Unsourced. Any Unsourced claim blocks the Gate. This is the discipline the worked example runs on its sources block, generalized.'
    },
    {
      k: 'review', title: 'Review',
      body: 'A named persona reads it and must not find the named failure. Findings are resolved, conceded, or explicitly accepted with a reason — never closed by asserting the persona is wrong.'
    }
  ];

  function boot() {
    R.shell('index.html');

    var view = G.resolved();

    R.renderPlaybook(R.$('#sections'), view);

    R.renderLadder(R.$('#ladder'));
    var r = G.readiness();
    R.$('#ladder-note').textContent = S.intakeComplete()
      ? 'Current engagement: ' + r.total + ' artifacts in scope · ' + r.draftedPct + '% drafted · ' + r.certifiedPct + '% certified.'
      : 'No engagement started yet — the ladder sits at R0 until a commission is answered.';

    mount(R.$('#criteria-kinds'), KINDS.map(function (x) {
      return el('div.card', null, [
        el('span.crit-kind.' + x.k, { text: x.k }),
        el('h4', { style: 'margin-top:8px', text: x.title }),
        el('p', { text: x.body })
      ]);
    }));

    mount(R.$('#lanes'), (view.lanes || []).map(laneCard));
    mount(R.$('#personas'), (view.personas || []).map(personaCard));

    var res = R.renderIntegrity(R.$('#integrity'));

    R.$('#foot-note').textContent =
      'Spine v' + w.CBS_SPINE.spineVersion + ' · ' + res.stats.sections + ' sections · ' +
      res.stats.areas + ' areas · ' + res.stats.artifacts + ' artifacts · ' +
      res.stats.criteria + ' criteria · ' + res.stats.patterns + ' patterns. ' +
      'The worked example is an independent working concept, not an authorized publication.';

    R.reveals(w.document);
    w.CBS_CONSOLE.init();
  }

  if (w.document.readyState === 'loading') {
    w.document.addEventListener('DOMContentLoaded', boot);
  } else boot();
})(window);
