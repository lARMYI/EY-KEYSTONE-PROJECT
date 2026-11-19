/* The figure engine. The security claim is that a model never authors markup:
   it returns a spec, the spec is clamped, and a local renderer draws it. */
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

test.beforeEach(async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/design.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
});

test('every registered kind draws something real', async ({ page }) => {
  const results = await page.evaluate(() => CBS_VISUALS.KINDS.map(kind => {
    const spec = CBS_VISUALS.composeSpec(kind, {});
    const node = CBS_VISUALS.render(kind, spec);
    return {
      kind,
      tag: node.tagName.toLowerCase(),
      children: node.childElementCount,
      scripts: node.querySelectorAll('script, foreignObject').length,
      serialized: CBS_VISUALS.toSVGString(kind, spec).length
    };
  }));
  expect(results.length).toBeGreaterThanOrEqual(13);
  for (const r of results) {
    expect(r.tag, `${r.kind} renders an <svg>`).toBe('svg');
    expect(r.children, `${r.kind} draws nodes`).toBeGreaterThan(1);
    expect(r.scripts, `${r.kind} must not emit script or foreignObject`).toBe(0);
    expect(r.serialized, `${r.kind} serializes`).toBeGreaterThan(100);
  }
});

test('a hostile spec is clamped rather than honoured', async ({ page }) => {
  const r = await page.evaluate(() => {
    const spec = CBS_VISUALS.validate('chart.bar', {
      title: 'x'.repeat(5000),
      width: 1e9, height: -1e9,
      series: new Array(500).fill({ name: 'n', points: new Array(500).fill({ label: '<img src=x onerror=alert(1)>', value: 1e12 }) }),
      nodes: new Array(500).fill({ label: 'n' }),
      somethingUnknown: 'should be dropped'
    });
    const node = CBS_VISUALS.render('chart.bar', spec);
    return {
      width: spec.width, height: spec.height,
      titleLength: spec.title.length,
      seriesCount: spec.series.length,
      pointCount: spec.series[0].points.length,
      nodeCount: spec.nodes.length,
      unknownKept: Object.prototype.hasOwnProperty.call(spec, 'somethingUnknown'),
      domScripts: node.querySelectorAll('script, image, foreignObject').length,
      /* the payload survives as TEXT, which is the correct outcome */
      payloadIsText: CBS_VISUALS.toSVGString('chart.bar', spec).indexOf('&lt;img') !== -1
        || node.textContent.indexOf('<img') !== -1
    };
  });
  expect(r.width).toBeLessThanOrEqual(1600);
  expect(r.height).toBeGreaterThanOrEqual(80);
  expect(r.titleLength).toBeLessThanOrEqual(120);
  expect(r.seriesCount).toBeLessThanOrEqual(8);
  expect(r.pointCount).toBeLessThanOrEqual(40);
  expect(r.nodeCount).toBeLessThanOrEqual(24);
  expect(r.unknownKept, 'unknown spec fields are dropped').toBe(false);
  expect(r.domScripts, 'no executable or external node reaches the DOM').toBe(0);
  expect(r.payloadIsText).toBe(true);
});

test('an unknown kind draws an honest placeholder instead of throwing', async ({ page }) => {
  const r = await page.evaluate(() => {
    const node = CBS_VISUALS.render('chart.doesNotExist', { title: 'x' });
    return { tag: node.tagName.toLowerCase(), text: node.textContent };
  });
  expect(r.tag).toBe('svg');
  expect(r.text).toContain('Unknown visual kind');
});

test('the agent proposal keeps only valid specs', async ({ page }) => {
  await H.stubAgent(page, 'figures');
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });  /* where cbs-agent lives */
  await page.waitForTimeout(600);
  const r = await page.evaluate(async () => {
    const out = await CBS_AGENT.proposeVisuals('af-charts');
    return {
      ok: out.ok, tier: out.tier, dropped: out.dropped,
      kinds: out.specs.map(s => s.kind),
      widths: out.specs.map(s => s.width),
      allKnown: out.specs.every(s => CBS_VISUALS.KINDS.indexOf(s.kind) !== -1),
      labels: out.specs.map(s => (s.series[0] || { points: [] }).points.map(p => p.label))
    };
  });
  expect(r.ok).toBe(true);
  expect(r.tier).toBe(2);
  /* four proposed: one good, one unknown kind, one empty diagram, one oversized */
  expect(r.kinds.length, 'two of four survive').toBe(2);
  expect(r.dropped).toBe(2);
  expect(r.allKnown, 'every surviving kind is registered').toBe(true);
  expect(Math.max(...r.widths), 'the oversized canvas is clamped').toBeLessThanOrEqual(1600);
  expect(JSON.stringify(r.labels), 'a script payload survives only as text')
    .toContain('<script>alert(1)</script>');
});

test('the agent proposal falls back to a composed figure when the call fails', async ({ page }) => {
  await H.stubAgent(page, 'throws');
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const r = await page.evaluate(async () => {
    const out = await CBS_AGENT.proposeVisuals('af-charts');
    return { ok: out.ok, tier: out.tier, count: out.specs.length };
  });
  expect(r.ok).toBe(true);
  expect(r.tier).toBe(1);
  expect(r.count).toBeGreaterThan(0);
});

test('a slope chart plots its endpoints and scales to what it draws', async ({ page }) => {
  /* It once plotted the first two points while scaling to all of them, which
     drew a four-point series as a flat line against the floor. */
  const r = await page.evaluate(() => {
    const spec = CBS_VISUALS.validate('chart.slope', {
      series: [{ name: 'Cleared', points: [
        { label: 'Q1', value: 1 }, { label: 'Q2', value: 1 },
        { label: 'Q3', value: 4 }, { label: 'Q4', value: 7 }] }]
    });
    const node = CBS_VISUALS.render('chart.slope', spec);
    const texts = [...node.querySelectorAll('text')].map(t => t.textContent);
    const line = node.querySelector('line');
    return { texts, y1: parseFloat(line.getAttribute('y1')), y2: parseFloat(line.getAttribute('y2')) };
  });
  expect(r.texts).toContain('Q1');
  expect(r.texts).toContain('Q4');
  expect(r.texts.join(' '), 'omitted points are declared').toContain('intermediate point');
  expect(r.y2, 'a rising series rises (smaller y is higher)').toBeLessThan(r.y1);
});

test('the token engine emits a real system and measures its own contrast', async ({ page }) => {
  const r = await page.evaluate(() => {
    const css = CBS_TOKENS.toCSS(null);
    const good = CBS_TOKENS.audit(null);
    const bad = CBS_TOKENS.audit(Object.assign(CBS_TOKENS.defaults(), { muted: '#1a1f28' }));
    return {
      props: (css.match(/--[a-z0-9-]+:/g) || []).length,
      reducedMotion: css.indexOf('prefers-reduced-motion') !== -1,
      goodPass: good.pass,
      goodTightest: good.tightest.ratio,
      badPass: bad.pass,
      badRatio: bad.failed.length ? bad.failed[0].ratio : null,
      badSuggestion: bad.failed.length ? bad.failed[0].suggestion : null
    };
  });
  expect(r.props).toBeGreaterThanOrEqual(40);
  expect(r.reducedMotion).toBe(true);
  expect(r.goodPass, 'the shipped defaults clear AA').toBe(true);
  expect(r.goodTightest).toBeGreaterThanOrEqual(4.5);
  expect(r.badPass, 'a low-contrast pair must fail').toBe(false);
  expect(r.badRatio).toBeLessThan(4.5);
  expect(r.badSuggestion, 'a failure carries a correction').toMatch(/^#[0-9a-fA-F]{6}$/);
});
