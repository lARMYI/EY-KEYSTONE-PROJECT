/* The sweep. Every page the site serves, at phone width, checked for the four
   things that should never be true of any of them. */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const REPO = path.join(__dirname, '..');

test('the page list matches what the repo actually serves', () => {
  const onDisk = fs.readdirSync(REPO).filter(f => f.endsWith('.html')).sort();
  const studioOnDisk = fs.readdirSync(path.join(REPO, 'studio'))
    .filter(f => f.endsWith('.html'))
    .filter(f => f !== 'preview.html')      /* framed, swept by preview.spec.js */
    .map(f => 'studio/' + f).sort();

  /* A page added to the repo but not to this list would never be swept — which
     is exactly how two non-existent pages once passed as "verified". */
  expect(H.SITE_PAGES.slice().sort()).toEqual(onDisk);
  expect(H.STUDIO_PAGES.slice().sort()).toEqual(studioOnDisk);
});

for (const pagePath of H.ALL_PAGES) {
  test(`${pagePath} loads clean at 390px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await H.watchCSP(page);
    await H.seed(page);
    const seen = H.watch(page);

    const response = await page.goto('/' + pagePath, { waitUntil: 'networkidle' });
    expect(response.status(), 'page must exist').toBe(200);
    await page.waitForTimeout(1500);

    expect(seen.errors, 'console and page errors').toEqual([]);
    expect(seen.external, 'external requests').toEqual([]);
    expect(await H.readCSP(page), 'CSP violations').toEqual([]);

    expect(seen.failedRequests, 'failed same-origin requests').toEqual([]);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, 'horizontal overflow at 390px').toBeLessThanOrEqual(391);
  });
}

test('every section reveals after a full scroll', async ({ page }) => {
  /* Reveal starvation shipped once: sections scrolled past faster than
     IntersectionObserver could notify stayed permanently invisible. */
  for (const pagePath of H.STUDIO_PAGES) {
    await H.seed(page);
    await page.goto('/' + pagePath, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => requestAnimationFrame(r));
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(600);
    const hidden = await page.evaluate(() =>
      document.querySelectorAll('.reveal:not(.in)').length);
    expect(hidden, `${pagePath} has unrevealed sections`).toBe(0);
  }
});
