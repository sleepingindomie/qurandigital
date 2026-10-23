import { defineConfig } from '@playwright/test'

// E2E for the built app (_work/research/e2e-plan.md). Runs on the installed
// Brave, never a downloaded browser. The web server builds into its own folder
// (dist-e2e) so it never touches dist/, which another preview may be serving.
// Tests tagged @live hit the real equran.id and audio CDN: they run only with
// LIVE=1, and then nothing else runs.

const BRAVE = process.env.BRAVE_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
const PORT = 4318
const baseURL = `http://127.0.0.1:${PORT}`
const live = process.env.LIVE === '1'

const DESKTOP = { width: 1440, height: 900 }

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  ...(live ? { grep: /@live/ } : { grepInvert: /@live/ }),
  use: {
    baseURL,
    headless: process.env.HEADED !== '1',
    launchOptions: { executablePath: BRAVE },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    // The PWA service worker would sit between the page and the mocked routes.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command:
      'npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --host 127.0.0.1 --port 4318 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /(reduced-motion|phone-layout)\.spec\.ts/,
      use: { viewport: DESKTOP },
    },
    {
      name: 'phone',
      testMatch: /(home|search|reader|deep-links|prayer|phone-layout|console)\.spec\.ts/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      name: 'reduced-motion',
      testMatch: /reduced-motion\.spec\.ts/,
      // reducedMotion is a context option, not a top-level test option.
      use: { viewport: DESKTOP, contextOptions: { reducedMotion: 'reduce' } },
    },
  ],
})
