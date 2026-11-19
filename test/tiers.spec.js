/* The three-tier ladder. The claim being tested is that generation is never
   dead: a missing, garbled, empty or throwing agent still leaves a real draft
   on the artifact rather than a blank one. */
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

async function generate(page, artifactId) {
  await page.goto('/studio/build.html#wb/' + artifactId, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('.wb-panel .inline .btn');
  await page.waitForTimeout(1200);
  return page.evaluate(id => {
    const a = CBS_STATE.artifact(id);
    return {
      tier: a.tier,
      state: a.state,
      parts: (a.draft && a.draft.parts || []).length,
      bodies: (a.draft && a.draft.parts || []).map(p => String(p.body || '').slice(0, 40))
    };
  }, artifactId);
}

test('tier 1 composes with no agent at all', async ({ page }) => {
  await H.seed(page);
  const r = await generate(page, 'af-context');
  expect(r.tier).toBe(1);
  expect(r.state).toBe('drafted');
  expect(r.parts).toBeGreaterThan(0);
});

test('tier 2 merges a usable agent reply onto the composed draft', async ({ page }) => {
  await H.seed(page);
  await H.stubAgent(page, 'parts');
  const r = await generate(page, 'af-context');
  expect(r.tier).toBe(2);
  expect(r.bodies.join(' ')).toContain('clears four of forty');
  /* The parts the agent did not answer must survive from tier 1. */
  expect(r.parts).toBeGreaterThan(2);
});

for (const mode of ['garbage', 'empty', 'throws']) {
  test(`a ${mode} agent degrades to a real tier 1 draft`, async ({ page }) => {
    await H.seed(page);
    await H.stubAgent(page, mode);
    const r = await generate(page, 'af-context');
    expect(r.tier, `${mode} must not claim tier 2`).toBe(1);
    expect(r.parts, 'a real draft remains').toBeGreaterThan(0);
    expect(r.bodies.join('').trim().length).toBeGreaterThan(0);
  });
}

test('the prompt pack and the importer round-trip', async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/build.html#wb/af-context', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const res = await page.evaluate(async () => {
    const pack = CBS_AGENT.promptPack('af-context');
    await CBS_AGENT.generate('af-context');
    return { packLength: pack.length, hasRules: pack.indexOf('NEEDS EVIDENCE') !== -1 };
  });
  expect(res.packLength).toBeGreaterThan(400);
  expect(res.hasRules).toBe(true);

  const imported = await page.evaluate(() => {
    const r = CBS_AGENT.importResponse('af-context', JSON.stringify({
      parts: [{ h: 'The situation', body: 'Pasted back through the importer.' }]
    }));
    return { ok: r.ok, merged: r.merged, tier: CBS_STATE.artifact('af-context').tier };
  });
  expect(imported.ok).toBe(true);
  expect(imported.merged).toBe(1);
  expect(imported.tier).toBe(3);
});

test('the importer refuses headings the pattern never declared', async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/build.html#wb/af-context', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    await CBS_AGENT.generate('af-context');
    const out = CBS_AGENT.importResponse('af-context', JSON.stringify({
      parts: [{ h: 'A heading the pattern does not have', body: 'should be ignored' }]
    }));
    const bodies = CBS_STATE.artifact('af-context').draft.parts.map(p => p.body).join(' ');
    return { ok: out.ok, error: out.error, leaked: bodies.indexOf('should be ignored') !== -1 };
  });
  /* A response whose headings match nothing is refused outright rather than
     merged as zero parts — the human is told, not left guessing. */
  expect(r.ok).toBe(false);
  expect(r.error).toContain('None of the part headings matched');
  expect(r.leaked, 'an unmatched heading must not reach the draft').toBe(false);
});
