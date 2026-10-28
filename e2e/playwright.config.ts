import { defineConfig } from '@playwright/test';

// Run `npm run e2e:build` first. The Firestore emulator needs Java 21+ on PATH.
export default defineConfig({
  testDir: './tests',
  outputDir: './.results',
  // Font rendering differs per OS, so screenshot baselines are kept per platform.
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: './.report' }]]
    : [['list']],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    // 0.1% of the page: rendering noise stays far below it, while a single wrong-colored control does not
    // (a 1% allowance once hid a gray selected toggle and a broken card layout).
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: 'http://localhost:4300',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'ar',
    timezoneId: 'Asia/Jerusalem',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'mobile-chromium', dependencies: ['setup'], testIgnore: /global\.setup\.ts/ },
    {
      // The behavior tests again, with Chromium made to act like iOS 14.5 and Chromium 79 (see support/legacy-browser.ts).
      name: 'oldest-supported-browser',
      dependencies: ['setup'],
      testIgnore: [/global\.setup\.ts/, /visual\.spec\.ts/, /real-old-browser\.spec\.ts/],
      metadata: { oldestSupportedBrowser: true },
    },
  ],
  webServer: [
    {
      command: 'npx firebase emulators:start --only firestore --project demo-khitma',
      cwd: '..',
      url: 'http://127.0.0.1:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'ignore',
      // Let the Firebase CLI stop its Java emulator process instead of orphaning it.
      gracefulShutdown: { signal: 'SIGINT', timeout: 15_000 },
    },
    {
      command: 'node serve.mjs',
      cwd: '.',
      url: 'http://127.0.0.1:4300',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
