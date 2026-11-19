/* The sandboxed render host. Two claims are load-bearing and both get tested
   rather than asserted: the frame is isolated, and the responsive check is a
   measurement rather than an opinion. */
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

async function openDesignPreview(page) {
  await H.watchCSP(page);
  await H.seed(page);
  await page.goto('/studio/design.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
}

test('the frame runs scripts but cannot reach the studio', async ({ page }) => {
  await openDesignPreview(page);

  const attrs = await page.$eval('.pv-frame', n => ({
    sandbox: n.getAttribute('sandbox'),
    src: n.getAttribute('src')
  }));
  expect(attrs.sandbox, 'scripts allowed, same-origin withheld').toBe('allow-scripts');
  expect(attrs.sandbox).not.toContain('allow-same-origin');
  expect(attrs.src).toBe('preview.html');

  /* The parent cannot read in... */
  const fromParent = await page.evaluate(() => {
    try { void document.querySelector('.pv-frame').contentWindow.document; return 'READABLE'; }
    catch (e) { return 'BLOCKED:' + e.name; }
  });
  expect(fromParent).toBe('BLOCKED:SecurityError');

  /* ...and the frame cannot read out, while still executing. */
  const frame = page.frames().find(f => f.url().includes('preview.html'));
  expect(frame, 'the preview frame is present').toBeTruthy();
  const fromFrame = await frame.evaluate(() => {
    const out = { scriptRan: true };
    try { localStorage.getItem('cbs.engagement.v1'); out.storage = 'READABLE'; }
    catch (e) { out.storage = 'BLOCKED:' + e.name; }
    try { void parent.document.title; out.parent = 'READABLE'; }
    catch (e) { out.parent = 'BLOCKED:' + e.name; }
    try { localStorage.setItem('x', '1'); out.write = 'WRITABLE'; }
    catch (e) { out.write = 'BLOCKED:' + e.name; }
    try { out.cookie = document.cookie === '' ? 'EMPTY' : 'READABLE'; }
    catch (e) { out.cookie = 'BLOCKED:' + e.name; }
    return out;
  });
  /* The throws are the boundary, not location.origin: Chromium still reports
     the document URL's origin inside a sandboxed frame even though storage
     and the parent are both denied. */
  expect(fromFrame.scriptRan, 'scripts must still run').toBe(true);
  expect(fromFrame.storage, 'storage is denied').toBe('BLOCKED:SecurityError');
  expect(fromFrame.write, 'storage is denied for writes too').toBe('BLOCKED:SecurityError');
  expect(fromFrame.parent, 'the parent document is denied').toBe('BLOCKED:SecurityError');

  expect(await H.readCSP(page), 'framing a same-origin page needs no policy change').toEqual([]);
});

test('overflow at 390px is measured, both ways', async ({ page }) => {
  await openDesignPreview(page);

  /* A deliberately 1200px-wide block. */
  await page.click('#preview .btn:nth-child(2)');
  await page.waitForTimeout(500);
  await page.click('#preview .pv-tabs .etab:nth-child(1)');   /* Mobile 390 */
  await page.waitForTimeout(1400);
  const overflowing = await page.$eval('#preview .pv-status', n => n.textContent);
  expect(overflowing).toContain('1200px');
  expect(overflowing).toContain('overflows by');

  const failed = await page.evaluate(() => CBS_SCHEMA.TESTS['t-responsive']({ artifactId: null }));
  expect(failed.result).toBe('fail');

  /* A clean page at the same width. */
  await page.click('#preview .btn:nth-child(1)');
  await page.waitForTimeout(1400);
  const clean = await page.$eval('#preview .pv-status', n => n.textContent);
  expect(clean).toContain('no horizontal overflow');

  const passed = await page.evaluate(() => CBS_SCHEMA.TESTS['t-responsive']({ artifactId: null }));
  expect(passed.result).toBe('pass');
});

test('the responsive test is honest before it has ever run', async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  const r = await page.evaluate(() =>
    CBS_SCHEMA.TESTS['t-responsive']({ artifactId: 'af-moments' }));
  expect(r.result, 'never measured means unknown, not pass').toBe('unknown');
});

test('the 3D scene renders through the vendored library', async ({ page }) => {
  await openDesignPreview(page);
  await page.click('#preview .btn:nth-child(5)');   /* 3D scene */
  await page.waitForTimeout(2000);
  const frame = page.frames().find(f => f.url().includes('preview.html'));
  const r = await frame.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return {
      hasCanvas: !!canvas,
      width: canvas ? canvas.width : 0,
      fallbackText: document.body.textContent.indexOf('WebGL') !== -1
    };
  });
  /* Either it drew, or it said plainly that it could not. Never a blank box. */
  expect(r.hasCanvas || r.fallbackText, 'scene draws or explains itself').toBe(true);
  if (r.hasCanvas) expect(r.width).toBeGreaterThan(0);
});

test('the preview frame makes no outbound request', async ({ page }) => {
  const seen = H.watch(page);
  await openDesignPreview(page);
  await page.click('#preview .btn:nth-child(5)');
  await page.waitForTimeout(1500);
  expect(seen.external).toEqual([]);
});
