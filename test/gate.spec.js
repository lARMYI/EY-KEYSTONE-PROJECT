/* The Gate is the product's central claim: nothing ships uncertified. These
   tests are mostly about REFUSAL — that it declines for the right reason, in
   the right order, and takes certification back when content moves. */
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test.beforeEach(async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
});

test('it refuses in order: placeholders, claims, criteria, personas', async ({ page }) => {
  const steps = await page.evaluate(() => {
    const id = 'af-context';
    const out = [];
    const why = () => {
      const r = CBS_GATE.evaluate(id);
      const bad = r.stages.filter(s => !s.ok)[0];
      return bad ? bad.label : 'ALL CLEAR';
    };

    CBS_STATE.setArtifact(id, { draft: CBS_AGENT.compose(id), state: 'drafted', tier: 1 });
    out.push(why());                                       /* Completeness */

    const d = CBS_STATE.artifact(id).draft;
    d.parts = d.parts.map(p => ({ h: p.h, body: 'Settled. No marker remains here.' }));
    CBS_STATE.setArtifact(id, { draft: d });
    CBS_STATE.addClaim({ text: 'An unsourced assertion.', status: 'unsourced', artifactId: id });
    out.push(why());                                       /* Evidence */

    const c = CBS_STATE.claimsFor(id)[0];
    CBS_STATE.setClaim(c.id, { status: 'verified', source: 'Their 2025 annual report, p.42' });
    out.push(why());                                       /* Red team */

    CBS_GRAPH.criteriaFor(id).forEach(e => {
      if (e.criterion.kind === 'review') {
        CBS_STATE.setReview(e.criterion.id, { resolution: 'answered', note: 'answered' });
      }
    });
    out.push(why());                                       /* Criteria */

    CBS_GRAPH.criteriaFor(id).forEach(e =>
      CBS_STATE.setCriterion(e.criterion.id, 'pass', 'judged'));
    out.push(why());                                       /* ALL CLEAR */
    return out;
  });
  expect(steps).toEqual(['Completeness', 'Evidence', 'Red team', 'Criteria', 'ALL CLEAR']);
});

test('a high-severity criterion cannot be waived through', async ({ page }) => {
  const r = await page.evaluate(() => {
    const id = 'af-ask';
    const d = CBS_AGENT.compose(id);
    d.parts = d.parts.map(p => ({ h: p.h, body: 'Settled, with no marker.' }));
    CBS_STATE.setArtifact(id, { draft: d, state: 'drafted', tier: 1 });
    CBS_GRAPH.criteriaFor(id).forEach(e => {
      CBS_STATE.setCriterion(e.criterion.id,
        e.criterion.severity === 'high' ? 'waived' : 'pass', 'test');
      if (e.criterion.kind === 'review') {
        CBS_STATE.setReview(e.criterion.id, { resolution: 'answered', note: 'x' });
      }
    });
    const out = CBS_GATE.certify(id);
    return { ok: out.ok, reason: out.ok ? null : out.reason.note };
  });
  expect(r.ok).toBe(false);
  expect(r.reason.toLowerCase()).toContain('waiv');
});

test('certification mints a passport and drift takes it back', async ({ page }) => {
  const r = await page.evaluate(() => {
    const id = 'af-context';
    CBS_STATE.setArtifact(id, { draft: CBS_AGENT.compose(id), state: 'drafted', tier: 1 });
    const d = CBS_STATE.artifact(id).draft;
    d.parts = d.parts.map(p => ({ h: p.h, body: 'Settled, with no marker.' }));
    CBS_STATE.setArtifact(id, { draft: d });
    CBS_GRAPH.criteriaFor(id).forEach(e => {
      CBS_STATE.setCriterion(e.criterion.id, 'pass', 'judged');
      if (e.criterion.kind === 'review') CBS_STATE.setReview(e.criterion.id, { resolution: 'answered', note: 'x' });
    });
    const cert = CBS_GATE.certify(id);
    /* artifact() returns the live object, so snapshot the scalar now — reading
       it after the next write would report the post-drift state. */
    const stateBefore = CBS_STATE.artifact(id).state;

    const d2 = CBS_STATE.artifact(id).draft;
    d2.parts[0].body = 'Edited after the Gate.';
    CBS_STATE.setArtifact(id, { draft: d2 });
    const drift = CBS_GATE.driftCheck(id);
    const after = CBS_STATE.artifact(id);

    return {
      certified: cert.ok,
      hash: cert.ok ? cert.passport.evidenceHash : null,
      note: cert.ok ? cert.passport.note : null,
      stateBefore: stateBefore,
      drifted: drift.drifted,
      stateAfter: after.state,
      passportAfter: !!after.passport
    };
  });
  expect(r.certified).toBe(true);
  expect(r.hash).toMatch(/^[0-9a-f]{8}$/);
  expect(r.note, 'the hash describes itself honestly').toContain('Not a cryptographic digest');
  expect(r.stateBefore).toBe('gated');
  expect(r.drifted).toBe(true);
  expect(r.stateAfter).toBe('drafted');
  expect(r.passportAfter).toBe(false);
});

test('drift covers what a maker produced, not only the prose', async ({ page }) => {
  const r = await page.evaluate(() => {
    const id = 'af-charts';
    const d = CBS_AGENT.compose(id);
    d.parts = d.parts.map(p => ({ h: p.h, body: 'Settled, with no marker.' }));
    d.visuals = [CBS_VISUALS.composeSpec('chart.bar', { title: 'Cleared', caption: 'Per quarter.' })];
    CBS_STATE.setArtifact(id, { draft: d, state: 'drafted', tier: 1 });
    CBS_GRAPH.criteriaFor(id).forEach(e => {
      CBS_STATE.setCriterion(e.criterion.id, 'pass', 'judged');
      if (e.criterion.kind === 'review') CBS_STATE.setReview(e.criterion.id, { resolution: 'answered', note: 'x' });
    });
    const cert = CBS_GATE.certify(id);
    const d2 = CBS_STATE.artifact(id).draft;
    d2.visuals[0].caption = 'Edited after the Gate.';
    CBS_STATE.setArtifact(id, { draft: d2 });
    return { certified: cert.ok, drifted: CBS_GATE.driftCheck(id).drifted };
  });
  expect(r.certified).toBe(true);
  expect(r.drifted, 'a changed figure caption is drift').toBe(true);
});

test('the evidence hash is identical on a page without the makers loaded', async ({ page }) => {
  /* madeText lives in cbs-gate.js precisely so that library.html, which does
     not load cbs-makers.js, computes the same hash and does not withdraw a
     certification for drift it invented by not looking. */
  await page.evaluate(() => {
    const id = 'af-charts';
    const d = CBS_AGENT.compose(id);
    d.parts = d.parts.map(p => ({ h: p.h, body: 'Settled, with no marker.' }));
    d.visuals = [CBS_VISUALS.composeSpec('chart.bar', { title: 'Cleared', caption: 'Per quarter.' })];
    CBS_STATE.setArtifact(id, { draft: d, state: 'drafted', tier: 1 });
    CBS_GRAPH.criteriaFor(id).forEach(e => {
      CBS_STATE.setCriterion(e.criterion.id, 'pass', 'judged');
      if (e.criterion.kind === 'review') CBS_STATE.setReview(e.criterion.id, { resolution: 'answered', note: 'x' });
    });
    CBS_GATE.certify(id);
  });
  const onBuild = await page.evaluate(() => CBS_STATE.artifact('af-charts').passport.evidenceHash);

  await page.goto('/studio/library.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const onLibrary = await page.evaluate(() => ({
    makersLoaded: typeof window.CBS_MAKERS !== 'undefined',
    drifted: CBS_GATE.driftCheck('af-charts').drifted,
    state: CBS_STATE.artifact('af-charts').state
  }));
  expect(onLibrary.makersLoaded, 'library.html does not load the makers').toBe(false);
  expect(onLibrary.drifted, 'no phantom drift').toBe(false);
  expect(onLibrary.state).toBe('gated');
  expect(onBuild).toMatch(/^[0-9a-f]{8}$/);
});

test('an engagement round-trips through export and import', async ({ page }) => {
  const r = await page.evaluate(() => {
    CBS_STATE.setArtifact('af-context', { draft: CBS_AGENT.compose('af-context'), state: 'drafted', tier: 1 });
    const before = CBS_GRAPH.readiness();
    const json = CBS_STATE.exportJSON();
    CBS_STATE.reset();
    const empty = CBS_GRAPH.readiness();
    const imported = CBS_STATE.importJSON(json);
    const after = CBS_GRAPH.readiness();
    return {
      ok: imported.ok,
      beforeLevel: before.level, emptyLevel: empty.level, afterLevel: after.level,
      client: CBS_STATE.get().intake.client
    };
  });
  expect(r.ok).toBe(true);
  expect(r.emptyLevel).not.toBe(r.beforeLevel);
  expect(r.afterLevel).toBe(r.beforeLevel);
  expect(r.client).toContain('tier-one retail bank');
});

test('a keyed collection stored as an array survives the round-trip', async ({ page }) => {
  /* Writing claims onto an array sets named properties, and JSON.stringify
     drops those — so an engagement whose claims arrived as an array used to
     lose every one of them on the next save, silently. normalise() coerces. */
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('cbs.engagement.v1'));
    raw.claims = [{ id: 'cl-legacy', text: 'Written as an array.', status: 'verified', source: 'A prior export' }];
    localStorage.setItem('cbs.engagement.v1', JSON.stringify(raw));
  });
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const first = await page.evaluate(() => {
    CBS_STATE.addClaim({ text: 'Added afterwards.', status: 'proposed', artifactId: 'af-context' });
    return CBS_STATE.claimsFor().map(c => c.text);
  });
  expect(first).toContain('Written as an array.');
  expect(first).toContain('Added afterwards.');

  await page.goto('/studio/library.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => CBS_STATE.claimsFor().map(c => c.text));
  expect(after, 'both claims survive a navigation').toEqual(expect.arrayContaining([
    'Written as an array.', 'Added afterwards.'
  ]));
});
