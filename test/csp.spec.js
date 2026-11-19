/* The CSP is the site's main security claim, so it gets a test rather than a
   comment. Every shipped page must carry the same policy as the headers file,
   byte for byte — a drift between them is a policy that silently stops
   applying when the host serves headers. */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const REPO = path.join(__dirname, '..');
const META = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/;

function htmlFiles(dir, prefix) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.html'))
    .map(f => ({ rel: prefix + f, abs: path.join(dir, f) }));
}

test('_headers and every page <meta> carry an identical policy', () => {
  const headers = fs.readFileSync(path.join(REPO, '_headers'), 'utf8');
  const headerLine = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m);
  expect(headerLine, '_headers declares a CSP').not.toBeNull();

  /* frame-ancestors is header-only — it is ignored in a <meta> tag, so the two
     are expected to differ by exactly that directive and nothing else. */
  const headerPolicy = headerLine[1].trim()
    .split(';').map(s => s.trim()).filter(Boolean)
    .filter(d => !d.startsWith('frame-ancestors'))
    .join('; ');

  const pages = htmlFiles(REPO, '').concat(htmlFiles(path.join(REPO, 'studio'), 'studio/'))
    .filter(p => p.rel !== 'studio/preview.html');   /* deliberately its own policy */

  expect(pages.length, 'pages found').toBeGreaterThan(5);
  for (const p of pages) {
    const m = fs.readFileSync(p.abs, 'utf8').match(META);
    expect(m, `${p.rel} has a CSP meta tag`).not.toBeNull();
    const pagePolicy = m[1].split(';').map(s => s.trim()).filter(Boolean).join('; ');
    expect(pagePolicy, `${p.rel} policy matches _headers`).toBe(headerPolicy);
  }
});

test('the preview host is locked down harder than the site', () => {
  const html = fs.readFileSync(path.join(REPO, 'studio/preview.html'), 'utf8');
  const m = html.match(META);
  expect(m, 'preview.html has its own policy').not.toBeNull();
  const policy = m[1];
  expect(policy).toContain("default-src 'none'");
  expect(policy).toContain("connect-src 'none'");
});

test('no studio page carries an inline script or an eval', () => {
  const studio = path.join(REPO, 'studio');
  for (const f of htmlFiles(studio, '')) {
    if (f.rel === 'preview.html') continue;   /* inline by necessity: opaque origin */
    const html = fs.readFileSync(f.abs, 'utf8');
    const inline = html.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || [];
    expect(inline, `${f.rel} has an inline <script>`).toEqual([]);
  }
  for (const f of fs.readdirSync(path.join(studio, 'js'))) {
    const src = fs.readFileSync(path.join(studio, 'js', f), 'utf8');
    expect(src.match(/\beval\s*\(/), `${f} calls eval`).toBeNull();
    expect(src.match(/\bnew\s+Function\s*\(/), `${f} calls new Function`).toBeNull();
  }
});
