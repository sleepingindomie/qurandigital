// Plan case 4: deep links, reload, back and forward, the history fallback the
// Vercel rewrite gives in production, and out-of-range addresses.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, ayatRow, indexRow, openHome, openSurah, test } from './helpers'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('a direct load of /surah/2/255 lands on ayat 255, and a reload keeps it', async ({ page }) => {
  await openSurah(page, 2, 255)
  const row = ayatRow(page, 255)
  await expect(row).toBeInViewport()
  await expect(row.locator('a.med')).toBeFocused()
  await expect(page.locator('.rh-pos')).toContainText('Ayat 255')

  await page.reload()
  await expect(page).toHaveURL(/\/surah\/2\/255$/)
  await expect(ayatRow(page, 255)).toBeInViewport()
  // Earlier ayat fill in above without moving the view off 255.
  await expect(ayatRow(page, 1)).toBeAttached({ timeout: 15_000 })
  await expect(ayatRow(page, 255)).toBeInViewport()
})

test('a direct load of /surah/36 works (the old Vercel 404)', async ({ page }) => {
  const res = await page.goto('/surah/36')
  expect(res?.status()).toBe(200)
  await expect(ayatRow(page, 1)).toBeVisible()
  await expect(page.locator('.pl-title')).toHaveText('Yasin')
})

test('back and forward between home and a surah', async ({ page }) => {
  await openHome(page)
  await indexRow(page, 36).click()
  await expect(page).toHaveURL(/\/surah\/36$/)
  await expect(ayatRow(page, 1)).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-qa="search"]')).toBeVisible()
  await expect(indexRow(page, 36)).toBeVisible()

  await page.goForward()
  await expect(page).toHaveURL(/\/surah\/36$/)
  await expect(page.locator('.pl-title')).toHaveText('Yasin')
  await expect(ayatRow(page, 1)).toBeVisible()
})

test('an ayat outside the surah opens at the top with a toast', async ({ page }) => {
  await openSurah(page, 2, 300)
  await expect(page.locator('#toast')).toHaveText('Ayat 300 tidak ada di Al-Baqarah.')
  await expect(ayatRow(page, 1)).toBeInViewport()
})

test('a surah outside 1 to 114 and an unknown path land on home', async ({ page }) => {
  await page.goto('/surah/999')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-qa="search"]')).toBeVisible()
  await page.goto('/tidak/ada')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-qa="search"]')).toBeVisible()
})

test('vercel.json carries the SPA rewrite, with built files left out of it', async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')) as { rewrites?: { source: string; destination: string }[] }
  const spa = cfg.rewrites?.find((r) => r.destination === '/index.html')
  expect(spa, 'a rewrite to /index.html').toBeTruthy()
  // A missing old chunk after a deploy must 404 instead of getting index.html.
  const re = new RegExp(`^${spa!.source}$`)
  for (const p of ['/', '/surah/36', '/surah/2/255', '/tanda']) expect(re.test(p), p).toBe(true)
  for (const p of ['/assets/index-abc123.js', '/fonts/literata-latin.woff2', '/icons/icon-192.png', '/sw.js', '/manifest.webmanifest']) expect(re.test(p), p).toBe(false)
})
