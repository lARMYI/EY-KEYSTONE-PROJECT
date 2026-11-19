/* The spine is the whole method as data. If it stops validating, every page
   that renders from it is wrong, so this runs before anything else matters. */
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test.beforeEach(async ({ page }) => { await H.seed(page); });

test('the shipped spine validates', async ({ page }) => {
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  const res = await page.evaluate(() => {
    const r = CBS_SCHEMA.validateSpine(CBS_SPINE);
    return { ok: r.ok, errors: r.errors.slice(0, 5), stats: r.stats };
  });
  expect(res.errors).toEqual([]);
  expect(res.ok).toBe(true);
  expect(res.stats.sections).toBe(8);
  expect(res.stats.areas).toBeGreaterThanOrEqual(30);
  expect(res.stats.artifacts).toBeGreaterThanOrEqual(64);
  expect(res.stats.lanes).toBe(6);
  expect(res.stats.personas).toBeGreaterThanOrEqual(6);
});

test('every criterion test name is registered', async ({ page }) => {
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  const missing = await page.evaluate(() => {
    const out = [];
    CBS_GRAPH.allCriteria().forEach(e => {
      const t = e.criterion.test;
      if (t && !CBS_SCHEMA.TESTS[t]) out.push(e.criterion.id + ' -> ' + t);
    });
    return out;
  });
  expect(missing, 'criteria naming an unregistered test').toEqual([]);
});

test('every auto-test returns a valid verdict and never throws', async ({ page }) => {
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  const bad = await page.evaluate(() => {
    const out = [];
    Object.keys(CBS_SCHEMA.TESTS).forEach(name => {
      /* Run each with a context it has no data for: the honest answer is
         'unknown', never a throw and never an unearned 'pass'. */
      let r;
      try { r = CBS_SCHEMA.TESTS[name]({ artifactId: 'af-context', text: '', claims: [] }); }
      catch (e) { out.push(name + ' threw: ' + e.message); return; }
      if (!r || ['pass', 'fail', 'unknown'].indexOf(r.result) === -1) {
        out.push(name + ' returned ' + JSON.stringify(r));
      }
    });
    return out;
  });
  expect(bad).toEqual([]);
});

test('a fresh engagement reports only informational findings', async ({ page }) => {
  await page.goto('/studio/build.html#board', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const findings = await page.evaluate(() =>
    CBS_GRAPH.diagnose().map(f => ({ severity: f.severity, kind: f.kind, where: f.where })));

  /* "Waiting on an upstream artifact" is the board doing its job, not a defect.
     Anything above low severity means the graph itself is malformed. */
  const serious = findings.filter(f => f.severity !== 'low');
  expect(serious, 'high or medium findings on a scoped engagement').toEqual([]);
  expect(findings.every(f => f.kind === 'blocked'), 'low findings are all blocked-on-upstream').toBe(true);
});

test('the board drains: every artifact becomes actionable and nothing deadlocks', async ({ page }) => {
  await page.goto('/studio/build.html#board', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const res = await page.evaluate(() => {
    /* nextBestAction points at the next thing to DO, and a drafted artifact is
       still undone — it needs certifying. So the queue drains by certifying,
       not by drafting. If the dependency resolver deadlocks this never ends. */
    const order = [];
    let guard = 0;
    while (guard++ < 500) {
      const next = CBS_GRAPH.nextBestAction();
      if (!next || !next.artifact) break;
      const id = next.artifact.id;

      /* It must never point at something whose dependencies are unmet. */
      if (CBS_GRAPH.blockers(id).length) return { deadlock: 'pointed at a blocked artifact: ' + id };

      const d = CBS_AGENT.compose(id);
      d.parts = (d.parts || []).map(p => ({ h: p.h, body: 'Settled during the walk. No marker remains.' }));
      CBS_STATE.setArtifact(id, { draft: d, state: 'drafted', tier: 1 });
      CBS_GRAPH.criteriaFor(id).forEach(e => {
        CBS_STATE.setCriterion(e.criterion.id, 'pass', 'judged during the walk');
        if (e.criterion.kind === 'review') {
          CBS_STATE.setReview(e.criterion.id, { resolution: 'answered', note: 'answered during the walk' });
        }
      });
      const cert = CBS_GATE.certify(id);
      if (!cert.ok) return { deadlock: id + ' could not be certified: ' + cert.reason.note };
      order.push(id);
    }
    return {
      deadlock: null,
      guard: guard,
      certified: order.length,
      scoped: CBS_GRAPH.scopedArtifacts().length,
      findings: CBS_GRAPH.diagnose().map(f => ({ severity: f.severity, kind: f.kind, where: f.where })),
      readiness: CBS_GRAPH.readiness().level.id
    };
  });
  expect(res.deadlock, 'the walk must not deadlock').toBeNull();
  expect(res.guard, 'the queue drained').toBeLessThan(500);
  expect(res.certified, 'every scoped artifact was reachable').toBe(res.scoped);
  /* The walk passes every criterion, so the self-audit correctly objects that
     nothing failed — criteria that never fail are not testing anything. That
     finding is the audit working; anything else is a defect. */
  expect(res.findings.filter(f => f.kind !== 'soft-criteria'),
    'a fully certified engagement reports nothing but the soft-criteria audit').toEqual([]);
  expect(res.findings.some(f => f.kind === 'soft-criteria'),
    'the self-audit notices an all-pass run').toBe(true);
  expect(res.readiness, 'readiness reaches at least Certified').toMatch(/^R[45]$/);
});

test('scope pruning is by identity, not by count', async ({ page }) => {
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  const sets = await page.evaluate(() => {
    const out = {};
    ['deck', 'experience', 'application'].forEach(lane => {
      CBS_STATE.setIntake('lane', lane);
      out[lane] = CBS_GRAPH.scopedArtifacts()
        .map(e => e.artifact.id).filter(id => id.indexOf('af-lp-') === 0).sort();
    });
    return out;
  });
  /* deck and experience both carry 7 lane artifacts, so a count comparison
     would pass while the wrong set was in scope. */
  expect(sets.deck.length).toBe(7);
  expect(sets.experience.length).toBe(7);
  expect(sets.deck).not.toEqual(sets.experience);
  for (const id of sets.deck) expect(id).toContain('deck');
  for (const id of sets.experience) expect(id).toContain('exp');
  for (const id of sets.application) expect(id).toContain('app');
});
