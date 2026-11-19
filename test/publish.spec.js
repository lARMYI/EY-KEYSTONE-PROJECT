/* Assembly. Only certified artifacts may reach the deliverable, the figures
   and built sections have to survive the trip, and the exported document has
   to open on its own. */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const OUT = path.join(__dirname, 'test-results', 'deliverable.html');

async function buildEngagement(page) {
  await H.seed(page);
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const mk = (id, extra) => {
      const d = CBS_AGENT.compose(id);
      d.parts = (d.parts || []).map(p => ({ h: p.h, body: 'Settled during the run. No marker remains.' }));
      Object.assign(d, extra || {});
      CBS_STATE.setArtifact(id, { draft: d, state: 'drafted', tier: 1 });
    };
    mk('af-context');
    mk('af-charts', { visuals: [
      CBS_VISUALS.composeSpec('chart.bar', { title: 'Pilots cleared', caption: 'Cleared per quarter, 2024 against 2025.' }),
      CBS_VISUALS.composeSpec('diagram.flow', { title: 'The governed path', caption: 'How a pilot reaches production.' })
    ] });
    mk('af-moments', { code: {
      /* The markup deliberately carries everything the exporter must remove:
         a script block, an inline handler, and a javascript: URL. */
      html: '<section class="hero"><h1>The ask</h1><p>Fund the proof.</p>'
          + '<script>alert("this must not ship")<\/script>'
          + '<button onclick="alert(\'nor this\')">Go</button>'
          + '<a href="javascript:alert(1)">nor this link</a></section>',
      css: 'body{margin:0}.hero{padding:var(--space-4);background:var(--surface)}',
      js: 'alert("behaviour stays in the preview")'
    } });
  });
  return H.certify(page, ['af-context', 'af-charts', 'af-moments']);
}

test('only certified artifacts reach the deliverable, and omissions are named', async ({ page }) => {
  await buildEngagement(page);
  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const r = await page.evaluate(() => {
    /* Leave one artifact drafted but uncertified. */
    const d = CBS_AGENT.compose('af-thesis');
    d.parts = d.parts.map(p => ({ h: p.h, body: 'Drafted but never taken to the Gate.' }));
    CBS_STATE.setArtifact('af-thesis', { draft: d, state: 'drafted', tier: 1 });
    const html = CBS_PUBLISH.deliverable();
    return {
      certified: CBS_PUBLISH.certified().map(e => e.artifact.id),
      omitted: CBS_PUBLISH.omitted().map(e => e.artifact.id),
      namesOmission: html.indexOf('were not certified and are absent') !== -1,
      containsThesis: html.indexOf('Drafted but never taken to the Gate') !== -1
    };
  });
  expect(r.certified).toContain('af-charts');
  expect(r.omitted).toContain('af-thesis');
  expect(r.containsThesis, 'an uncertified draft must not appear').toBe(false);
  expect(r.namesOmission, 'the record names what it left out').toBe(true);
});

test('the deliverable carries tokens, vector figures and a scoped built section', async ({ page }) => {
  await buildEngagement(page);
  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const html = await page.evaluate(() => CBS_PUBLISH.deliverable());
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);

  expect((html.match(/--[a-z0-9-]+:/g) || []).length, 'real token CSS').toBeGreaterThanOrEqual(40);
  expect((html.match(/<svg/g) || []).length, 'figures inlined').toBe(2);
  expect((html.match(/<figcaption/g) || []).length).toBe(2);
  expect((html.match(/class="built"/g) || []).length, 'built section embedded').toBe(1);

  /* Script never ships, and the record says so rather than dropping it quietly. */
  expect(html.match(/<script/i), 'no script in the exported document').toBeNull();
  expect(html).not.toContain('this must not ship');
  expect(html.match(/\son[a-z]+\s*=/i), 'no inline handler survives').toBeNull();
  expect(html.match(/javascript:/i), 'no javascript: URL survives').toBeNull();
  /* The visible text of a stripped element is harmless content and stays —
     what mattered was the handler and the scheme, and both are gone. */
  expect(html).toContain('Fund the proof.');
  expect(html).toContain('Script was removed from');

  /* The section's own CSS is scoped so it cannot restyle the document. */
  expect(html).toMatch(/#s-afmoments \.hero\{/);
  expect(html).toMatch(/#s-afmoments\{margin:0\}/);

  expect(html).toContain('@media print{');
  expect(html).toContain('@page{');
});

test('the exported deliverable opens standalone', async ({ page }) => {
  await buildEngagement(page);
  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const html = await page.evaluate(() => CBS_PUBLISH.deliverable());
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);

  const doc = await page.context().newPage();
  const seen = H.watch(doc);
  await doc.setViewportSize({ width: 1200, height: 900 });
  await doc.goto('/test/test-results/deliverable.html', { waitUntil: 'networkidle' });
  await doc.waitForTimeout(600);

  const r = await doc.evaluate(() => ({
    svgs: [...document.querySelectorAll('svg')].filter(s => s.getBoundingClientRect().width > 10).length,
    built: [...document.querySelectorAll('.built-body')].map(n => n.getBoundingClientRect().height),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    bg: getComputedStyle(document.body).backgroundColor
  }));
  expect(seen.errors).toEqual([]);
  expect(seen.external, 'the deliverable is self-contained').toEqual([]);
  expect(r.svgs, 'figures render').toBe(2);
  expect(r.built[0], 'the built section has height').toBeGreaterThan(20);
  expect(r.accent).toMatch(/^#[0-9a-fA-F]{6}$/);

  await doc.setViewportSize({ width: 390, height: 900 });
  await doc.waitForTimeout(400);
  const sw = await doc.evaluate(() => document.documentElement.scrollWidth);
  expect(sw, 'no overflow at 390px').toBeLessThanOrEqual(391);
  await doc.close();
});

test('the memory round-trips and the build order is dependency-ordered', async ({ page }) => {
  await buildEngagement(page);
  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const memory = CBS_PUBLISH.memory();
    const order = CBS_PUBLISH.buildOrder();
    const parsed = JSON.parse(memory);
    const ids = CBS_PUBLISH.topo(CBS_GRAPH.scopedArtifacts());
    /* every artifact must appear after each of its inputs */
    const pos = {};
    ids.forEach((e, i) => { pos[e.artifact.id] = i; });
    const violations = [];
    ids.forEach(e => {
      (e.artifact.inputs || []).forEach(dep => {
        if (pos[dep] !== undefined && pos[dep] > pos[e.artifact.id]) {
          violations.push(dep + ' after ' + e.artifact.id);
        }
      });
    });
    return {
      hasIntake: !!parsed.intake.client,
      orderLength: order.length,
      hasAcceptance: order.indexOf('acceptance') !== -1 || order.indexOf('criteria') !== -1,
      violations
    };
  });
  expect(r.hasIntake).toBe(true);
  expect(r.orderLength).toBeGreaterThan(500);
  expect(r.violations, 'topological order holds').toEqual([]);
});

test('promotion strips client content from a pattern', async ({ page }) => {
  await buildEngagement(page);
  const r = await page.evaluate(() => {
    const a = CBS_STATE.artifact('af-context');
    const promoted = CBS_STATE.promotePattern({
      id: 'pat-promoted-test',
      title: 'Promoted from a certified artifact',
      sourceArtifact: 'af-context'
    });
    const text = JSON.stringify(CBS_STATE.get().promoted);
    return {
      promoted: !!promoted,
      leaksClient: text.indexOf('tier-one retail bank') !== -1,
      leaksBody: text.indexOf('Settled during the run') !== -1
    };
  });
  expect(r.leaksClient, 'the client name must not travel with a pattern').toBe(false);
  expect(r.leaksBody, 'body copy must not travel with a pattern').toBe(false);
});
