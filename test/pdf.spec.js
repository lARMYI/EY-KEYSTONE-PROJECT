/* The generated PDF. Asserting that bytes came out is worthless — these parse
   the file with pdfjs and read what is actually in it. */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const H = require('./helpers');

const OUT_DIR = path.join(__dirname, 'test-results');

async function pdfjs() {
  /* pdfjs-dist ships ESM; require() would fail. */
  return import('pdfjs-dist/legacy/build/pdf.mjs');
}

async function parse(bytes) {
  const { getDocument } = await pdfjs();
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    standardFontDataUrl: path.join(__dirname, 'node_modules/pdfjs-dist/standard_fonts/')
  });
  return task.promise;
}

/* Letter-spaced runs come back as one item per character, so comparisons that
   care about a phrase rather than its spacing use the squashed form. */
const squash = s => s.replace(/\s+/g, '').toUpperCase();

async function extract(doc) {
  let text = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    text += content.items.map(i => i.str).join(' ') + '\n';
  }
  return text;
}

async function buildPDF(page) {
  await H.seed(page);
  await page.goto('/studio/build.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const mk = (id, extra) => {
      const d = CBS_AGENT.compose(id);
      d.parts = (d.parts || []).map(p => ({ h: p.h, body: 'Settled during the run — no placeholder remains in this part.' }));
      Object.assign(d, extra || {});
      CBS_STATE.setArtifact(id, { draft: d, state: 'drafted', tier: 1 });
    };
    mk('af-context');
    mk('af-charts', { visuals: [
      CBS_VISUALS.composeSpec('chart.bar', { title: 'Pilots cleared', caption: 'Cleared per quarter, 2024 against 2025.' }),
      CBS_VISUALS.composeSpec('chart.donut', { title: 'Where the time goes', caption: 'Share of elapsed review time.' }),
      CBS_VISUALS.composeSpec('diagram.arch', { title: 'The governed path', caption: 'From request to production.' })
    ] });
    mk('af-moments', { code: {
      html: '<section class="hero"><h1>The ask</h1></section>',
      css: '.hero{padding:2rem}', js: ''
    } });
    CBS_STATE.addClaim({ text: 'Four of forty model-risk reviews clear each quarter.', status: 'verified', artifactId: 'af-context' });
    const c = CBS_STATE.claimsFor('af-context')[0];
    CBS_STATE.setClaim(c.id, { source: 'Their 2025 annual report, p.42', asOf: '2025-03-01' });
  });
  await H.certify(page, ['af-context', 'af-charts', 'af-moments']);

  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const b64 = await page.evaluate(() => {
    const bytes = CBS_PUBLISH.pdfBytes();
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  });
  return Buffer.from(b64, 'base64');
}

test('the file parses, and says what it should say', async ({ page }) => {
  const bytes = await buildPDF(page);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'deliverable.pdf'), bytes);

  expect(bytes.slice(0, 8).toString('latin1')).toBe('%PDF-1.4');
  expect(bytes.slice(-6).toString('latin1')).toContain('%%EOF');

  const doc = await parse(bytes);
  expect(doc.numPages, 'a page per certified artifact, plus cover and evidence').toBeGreaterThanOrEqual(4);

  const text = await extract(doc);

  expect(text).toContain('tier-one retail bank');
  expect(text).toContain('Group COO');
  expect(text, 'the fingerprint travels with the document').toMatch(/[0-9a-f]{8}/);
  expect(text).toContain('not a cryptographic digest');
  expect(text, 'the typography limit is stated, not hidden').toContain('Helvetica');
  expect(squash(text), 'built sections are named rather than dropped silently').toContain('BUILTSECTION');
  expect(text).toContain('Claims and sources');
  expect(text).toContain('Their 2025 annual report');
});

test('figures are vector paths, not an embedded image', async ({ page }) => {
  const bytes = await buildPDF(page);
  const doc = await parse(bytes);

  /* The whole reason for not vendoring a PDF library: a rasterized chart in a
     client document is worse than a drawn one. */
  let ops = { paths: 0, images: 0 };
  const { OPS } = await pdfjs();
  for (let p = 1; p <= doc.numPages; p++) {
    const list = await (await doc.getPage(p)).getOperatorList();
    for (const fn of list.fnArray) {
      if (fn === OPS.constructPath) ops.paths++;
      if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject || fn === OPS.paintInlineImageXObject) ops.images++;
    }
  }
  /* pdfjs coalesces consecutive path operators, so this counts path *runs*
     rather than segments. The assertion that matters is the next one. */
  expect(ops.paths, 'figures draw as paths').toBeGreaterThan(15);
  expect(ops.images, 'nothing is rasterized').toBe(0);
});

test('every registered figure kind survives translation', async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const out = [];
    CBS_VISUALS.KINDS.forEach(kind => {
      const spec = CBS_VISUALS.composeSpec(kind, {});
      const node = CBS_VISUALS.render(kind, spec);
      const doc = CBS_PDF.doc({});
      try {
        const h = CBS_SVG2PDF.draw(doc, node, 40, 40, 500, { background: '#FFFFFF' });
        out.push({ kind, ok: true, height: Math.round(h), bytes: doc.bytes().length });
      } catch (e) {
        out.push({ kind, ok: false, error: e.message });
      }
    });
    return out;
  });

  const failed = result.filter(r => !r.ok);
  expect(failed, 'a renderer using an element the translator cannot draw').toEqual([]);
  expect(result.length).toBeGreaterThanOrEqual(13);
  for (const r of result) {
    expect(r.height, `${r.kind} has height`).toBeGreaterThan(10);
    expect(r.bytes, `${r.kind} produced a document`).toBeGreaterThan(400);
  }
});

test('the translator refuses what it cannot draw rather than dropping it', async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.appendChild(document.createElementNS(NS, 'ellipse'));   /* not translated */
    const doc = CBS_PDF.doc({});
    try { CBS_SVG2PDF.draw(doc, svg, 0, 0, 100, {}); return { threw: false }; }
    catch (e) { return { threw: true, message: e.message }; }
  });
  expect(r.threw, 'a silent skip would leave a blank area in a client document').toBe(true);
  expect(r.message).toContain('unsupported element <ellipse>');
});

test('a hostile spec still produces a valid PDF with the payload as text', async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const b64 = await page.evaluate(() => {
    const spec = CBS_VISUALS.validate('chart.bar', {
      title: '(unbalanced \\ parens',
      width: 1e9, height: 1e9,
      series: [{ name: 's', points: [
        { label: '<script>alert(1)</script>', value: 5 },
        { label: 'em—dash and “quotes”', value: 3 }] }]
    });
    const node = CBS_VISUALS.render('chart.bar', spec);
    const doc = CBS_PDF.doc({});
    CBS_SVG2PDF.draw(doc, node, 40, 40, 500, { background: '#FFFFFF' });
    const bytes = doc.bytes();
    let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  });
  const bytes = Buffer.from(b64, 'base64');
  const doc = await parse(bytes);
  expect(doc.numPages).toBe(1);
  const content = await (await doc.getPage(1)).getTextContent();
  const text = content.items.map(i => i.str).join(' ');
  /* The payload is a label, so it is drawn as the characters it is. */
  expect(text).toContain('<script>alert(1)</script>');
  expect(text, 'unbalanced parens do not corrupt the stream').toContain('unbalanced');
  expect(text, 'typographic characters survive as themselves').toContain('—');
});

test('text wrapping is measured from the font the PDF actually names', async ({ page }) => {
  await H.seed(page);
  await page.goto('/studio/publish.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const doc = CBS_PDF.doc({});
    const words = 'The model risk committee rejected the third agentic pilot in March, which is the ' +
                  'event that makes this decision live rather than theoretical.';
    const lines = doc.wrap(words, 200, { size: 10, font: 'body' });
    return {
      lines: lines.length,
      widest: Math.max.apply(null, lines.map(l => CBS_PDF.textWidth(l, 'body', 10))),
      helvetica: CBS_PDF.textWidth('Helvetica', 'body', 10),
      bolder: CBS_PDF.textWidth('Helvetica', 'bold', 10)
    };
  });
  expect(r.lines, 'a long passage breaks into several lines').toBeGreaterThanOrEqual(4);
  expect(r.widest, 'no line exceeds the measure').toBeLessThanOrEqual(200);
  expect(r.widest, 'lines fill the measure rather than breaking early').toBeGreaterThan(140);
  expect(r.bolder, 'bold is wider than regular').toBeGreaterThan(r.helvetica);
});
