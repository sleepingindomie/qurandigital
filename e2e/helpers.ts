// Shared fixtures for the E2E suite.
//
// - equran.id API v2 (/api/v2/surat, /surat/:n, /tafsir/:n) is answered from
//   e2e/fixtures, with a 404 JSON for a surah or tafsir that has no fixture, so
//   tests open only fixture surahs (1, 2, 9, 18, 36, 55, 67, 112, 113, 114).
// - Every audio URL (everyayah.com and cdn.equran.id) gets silent.mp3, one
//   second of silence, as a plain 200 (fine for range requests too).
// - Any other request off 127.0.0.1 is aborted, so nothing reaches the network.
// - Console errors and page errors fail the test (plan case 13), except those
//   a test lists in allowConsole for its own failure path.
// Tests tagged @live skip all of the mocking.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, expect } from '@playwright/test'
import type { BrowserContext, Locator, Page, Route } from '@playwright/test'

export { expect }

// package.json has "type": "module", so the specs load as ES modules.
export const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

/** Surahs with a fixture; tests open only these. */
export const FIXTURE_SURAHS = [1, 2, 9, 18, 36, 55, 67, 112, 113, 114] as const

/** 23 Oct 2026, 15.30 WIB: the clock of plan case 6. */
export const WIB_1530 = new Date('2026-10-23T15:30:00+07:00')

const SILENT = fs.readFileSync(path.join(FIXTURES, 'silent.mp3'))
const CORS = { 'access-control-allow-origin': '*' }

export const readFixture = <T = unknown>(name: string): T => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8')) as T

const API_RE = /^https:\/\/equran\.id\/api\/v2\/(surat|tafsir)(?:\/(\d+))?\/?(?:[?#].*)?$/

const isAudio = (url: URL) =>
  url.hostname === 'everyayah.com' || url.hostname.endsWith('.everyayah.com') || url.hostname === 'cdn.equran.id'

const isLocal = (url: URL) => url.hostname === '127.0.0.1' || url.hostname === 'localhost'

async function answerApi(route: Route) {
  const m = route.request().url().match(API_RE)
  if (!m) {
    await route.fulfill({ status: 404, headers: CORS, json: { code: 404, message: 'No such endpoint in the E2E mock', data: null } })
    return
  }
  const [, kind, n] = m
  const name = n ? `${kind}-${n}.json` : kind === 'surat' ? 'surat.json' : ''
  const file = name && path.join(FIXTURES, name)
  if (!file || !fs.existsSync(file)) {
    await route.fulfill({ status: 404, headers: CORS, json: { code: 404, message: `No fixture for ${kind} ${n ?? ''}`.trim(), data: null } })
    return
  }
  await route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: fs.readFileSync(file) })
}

/** Installs the API, audio and catch-all routes on a context. */
export async function mockNetwork(context: BrowserContext): Promise<void> {
  // Registered first, so it has the lowest priority: anything not local and not mocked.
  await context.route(
    (url) => !isLocal(url) && !isAudio(url) && url.hostname !== 'equran.id',
    (route) => route.abort('blockedbyclient'),
  )
  await context.route(/^https:\/\/equran\.id\//, answerApi)
  await context.route(isAudio, (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'audio/mpeg', body: SILENT }),
  )
}

/**
 * Seeds qd:settings (version 1) before the app boots, only when nothing is
 * saved yet, so a reload keeps what the test changed in the app.
 */
export async function seedSettings(page: Page, patch: Record<string, unknown>): Promise<void> {
  await page.addInitScript((p) => {
    try {
      if (!localStorage.getItem('qd:settings')) localStorage.setItem('qd:settings', JSON.stringify({ v: 1, ...p }))
    } catch {
      // storage blocked: the app falls back to defaults
    }
  }, patch)
}

// ------------------------------------------------------------ locators

export const player = (page: Page): Locator => page.locator('[data-qa="player"]')

export const ayatRow = (page: Page, k: number): Locator => page.locator(`[data-qa="ayat"][data-ayat="${k}"]`)

/** The index row link of surah n in the Surah tab of home. */
export const indexRow = (page: Page, n: number): Locator =>
  page.locator(`#pn-surah [data-qa="surah-link"][data-surah="${n}"]`)

/** Opens a surah (optionally at an ayat) by URL and waits for its first rows. */
export async function openSurah(page: Page, n: number, ayat?: number): Promise<void> {
  await page.goto(ayat ? `/surah/${n}/${ayat}` : `/surah/${n}`)
  await expect(page.locator('[data-qa="ayat"]').first()).toBeVisible()
}

/** Opens home and waits for the index. */
export async function openHome(page: Page, query = ''): Promise<void> {
  await page.goto('/' + query)
  await expect(page.locator('[data-qa="search"]')).toBeVisible()
  await expect(page.locator('#pn-surah [data-qa="surah-link"]').first()).toBeAttached()
}

// ------------------------------------------------------------ fixtures

interface Options {
  /** Console or page errors this test expects (its failure path). */
  allowConsole: RegExp[]
}

interface Fixtures {
  /** Unexpected console and page errors collected so far in this test. */
  consoleErrors: string[]
  /** The network mock, installed for every test that is not tagged @live. */
  network: void
}

export const test = base.extend<Options & Fixtures>({
  allowConsole: [[], { option: true }],

  network: [
    async ({ context }, use, testInfo) => {
      if (!testInfo.tags.includes('@live')) await mockNetwork(context)
      await use()
    },
    { auto: true },
  ],

  consoleErrors: [
    async ({ page, allowConsole }, use) => {
      const errors: string[] = []
      const allowed = (text: string) => allowConsole.some((re) => re.test(text))
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return
        const loc = msg.location()
        const text = `console.error: ${msg.text()}${loc.url ? ` (${loc.url}:${loc.lineNumber})` : ''}`
        if (!allowed(text)) errors.push(text)
      })
      page.on('pageerror', (err) => {
        const text = `pageerror: ${err.name}: ${err.message}`
        if (!allowed(text)) errors.push(text)
      })
      await use(errors)
      expect(errors, 'unexpected console or page errors').toEqual([])
    },
    { auto: true },
  ],
})
