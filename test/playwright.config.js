/* Verification for the Keystone site and Client Build Studio.

   The site is static with no build step, so the "server" is the same one a
   contributor runs by hand. Playwright starts it, waits for it, and tears it
   down, which keeps CI and local runs identical. */
const fs = require('fs');
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.PORT || 8000);

/* CI runs `playwright install chromium` and Playwright finds its own browser.
   Some sandboxes ship a Chromium at a fixed path and block the download CDN;
   set PLAYWRIGHT_CHROMIUM_EXECUTABLE there. Unset is the normal case. */
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || null;
if (EXECUTABLE && !fs.existsSync(EXECUTABLE)) {
  throw new Error('PLAYWRIGHT_CHROMIUM_EXECUTABLE is set but does not exist: ' + EXECUTABLE);
}

module.exports = defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,                    /* a flaky check here would be a real defect */
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{
    name: 'chromium',
    use: Object.assign({}, devices['Desktop Chrome'],
      EXECUTABLE ? { launchOptions: { executablePath: EXECUTABLE } } : {})
  }],
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    cwd: '..',                   /* serve the repo root, as the real host does */
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});
