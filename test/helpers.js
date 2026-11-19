/* Shared fixtures for the verification suite.

   Two things here cost real debugging time when they were wrong, so they are
   written down rather than rediscovered:

   1. Seed localStorage ONCE. addInitScript runs on every navigation, so an
      unguarded seed wipes state between page.goto calls and makes a working
      feature look broken.
   2. Install the agent stub with exposeFunction, never eval. The site's CSP is
      script-src 'self', so an eval-based stub silently never installs and every
      tier assertion reports Tier 1. */

/* Every page the site actually serves. Checked against the filesystem by
   pages.spec.js so this list cannot drift from the repo. */
const SITE_PAGES = ['index.html', 'maturity.html', 'quarters.html', 'roadmap.html'];
const STUDIO_PAGES = [
  'studio/index.html', 'studio/build.html', 'studio/design.html',
  'studio/library.html', 'studio/publish.html'
];
/* preview.html is framed, carries its own CSP and has no nav; it is exercised
   by preview.spec.js rather than swept with the rest. */
const ALL_PAGES = SITE_PAGES.concat(STUDIO_PAGES);

const COMMISSION = {
  client: 'A tier-one retail bank, mid-Atlantic, 14m customers',
  trigger: 'Their model risk committee rejected the third agentic pilot in March',
  decision: 'Fund a 90-day governed-agent proof at 400k, scale-or-stop at the end',
  decider: 'Group COO, at the April board',
  stakes: 'Another year of pilots that never clear model risk, while two competitors ship',
  lane: 'experience'
};

function blankEngagement(overrides) {
  return Object.assign({
    version: 1,
    intake: Object.assign({}, COMMISSION),
    /* Keyed objects, matching cbs-state's own blank(). An array here used to
       make claims vanish on the first navigation. */
    artifacts: {}, criteria: {}, claims: {}, reviews: {},
    overlay: { areas: [], artifacts: [] },
    promoted: [], log: [], tokens: null, responsive: {}
  }, overrides || {});
}

/* Seed before the first navigation, and only then. */
async function seed(page, engagement) {
  await page.addInitScript(state => {
    try {
      if (!localStorage.getItem('cbs.engagement.v1')) {
        localStorage.setItem('cbs.engagement.v1', JSON.stringify(state));
      }
    } catch (e) { /* private mode — the studio handles this itself */ }
  }, engagement || blankEngagement());
}

/* The browser asks for /favicon.ico unprompted on a fresh context. The repo
   ships no favicon, so that 404 is the browser's doing, not the page's — and
   whether it fires at all depends on context reuse, which would make any
   assertion over it flaky. Ignored everywhere, deliberately and in one place. */
const isFaviconNoise = s => /favicon/i.test(s);

/* Collects everything that should never happen on a page. */
function watch(page) {
  const errors = [], external = [], failedRequests = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (isFaviconNoise(text)) return;
    /* A bare "failed to load resource" with no URL is the same 404 reported
       without its location; the requestfailed listener catches real ones. */
    if (/Failed to load resource/i.test(text) && !/http/i.test(text)) return;
    errors.push('console: ' + text.slice(0, 200));
  });
  page.on('requestfailed', r => {
    if (isFaviconNoise(r.url())) return;
    failedRequests.push(r.url() + ' — ' + (r.failure() || {}).errorText);
  });
  page.on('response', r => {
    const u = r.url();
    if (isFaviconNoise(u)) return;
    if (u.startsWith('http://127.0.0.1') && r.status() >= 400) {
      failedRequests.push(u + ' — HTTP ' + r.status());
    }
  });
  page.on('request', r => {
    const u = r.url();
    if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:')) {
      external.push(u);
    }
  });
  return { errors, external, failedRequests };
}

/* CSP violations are reported to the document, not the console, so they need
   their own listener installed before any script runs. */
async function watchCSP(page) {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', e => {
      window.__cspViolations.push(e.violatedDirective + ' :: ' + e.blockedURI);
    });
  });
}
const readCSP = page => page.evaluate(() => window.__cspViolations || []);

/* A stubbed window.claude. `mode` picks the shape of the reply so the tier
   ladder can be exercised without a live host. */
async function stubAgent(page, mode) {
  const REPLIES = {
    parts: JSON.stringify({ parts: [
      { h: 'The situation', body: 'The bank clears four of forty model-risk reviews a quarter.' },
      { h: 'What changed', body: 'The March committee rejected the third agentic pilot in a row.' }
    ] }),
    figures: JSON.stringify({ figures: [
      { kind: 'chart.bar', title: 'Pilots cleared', caption: 'Pilots cleared per quarter, 2024 against 2025.',
        series: [{ name: 'Cleared', points: [{ label: 'Q1', value: 1 }, { label: 'Q2', value: 4 }] }] },
      { kind: 'chart.nonsense', title: 'unknown kind' },
      { kind: 'diagram.flow', title: 'no nodes', caption: 'empty', nodes: [] },
      { kind: 'chart.bar', title: 'oversized', caption: 'clamped',
        width: 1e9, height: 1e9,
        series: [{ name: 's', points: [{ label: '<script>alert(1)</script>', value: 5 }] }] }
    ] }),
    code: JSON.stringify({
      html: '<section class="hero"><h1>The ask</h1><p>Body copy.</p></section>',
      css: '.hero{padding:var(--space-4);background:var(--surface)}',
      js: 'console.log("from the agent")'
    }),
    garbage: 'Sorry, I cannot help with that.',
    empty: ''
  };

  await page.exposeFunction('__agentReply', () => {
    if (mode === 'throws') return { __throw: 'the host rejected the call' };
    return REPLIES[mode] !== undefined ? REPLIES[mode] : '';
  });
  await page.addInitScript(() => {
    window.claude = {
      complete: function () {
        return window.__agentReply().then(r => {
          if (r && r.__throw) throw new Error(r.__throw);
          return r;
        });
      }
    };
  });
}

/* Drive an artifact to a certifiable state. Mirrors what a human does at the
   Gate: settle the placeholders, judge every criterion, answer every persona. */
const CERTIFY = `(function (ids) {
  ids.forEach(function (id) {
    var a = CBS_STATE.artifact(id);
    if (!a.draft) return;
    a.draft.parts = (a.draft.parts || []).map(function (p) {
      return { h: p.h, hint: p.hint, body: /\\[(NEEDS|REGISTRY|GENERATED)/.test(p.body || '') || !String(p.body || '').trim()
        ? 'Settled during the run. No placeholder remains in this part.'
        : p.body };
    });
    CBS_STATE.setArtifact(id, { draft: a.draft });
  });
  CBS_GRAPH.allCriteria().forEach(function (e) {
    CBS_STATE.setCriterion(e.criterion.id, 'pass', 'judged during the verification run');
    if (e.criterion.kind === 'review') {
      CBS_STATE.setReview(e.criterion.id, { resolution: 'answered', note: 'answered during the verification run' });
    }
  });
  return ids.map(function (id) {
    var r = CBS_GATE.certify(id);
    return id + ':' + (r.ok ? 'certified' : 'held@' + r.reason.label + ' — ' + r.reason.note);
  });
})`;

const certify = (page, ids) => page.evaluate(`${CERTIFY}(${JSON.stringify(ids)})`);

module.exports = {
  SITE_PAGES, STUDIO_PAGES, ALL_PAGES, COMMISSION,
  blankEngagement, seed, watch, watchCSP, readCSP, stubAgent, certify
};
