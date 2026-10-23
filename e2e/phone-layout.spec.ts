// On the phone project (390 x 844): no horizontal overflow on home, search
// results and the reader. innerWidth must stay 390, since a wide child on a
// mobile viewport widens the layout viewport instead of scrolling.
import { expect, ayatRow, openHome, openSurah, test } from './helpers'
import type { Page } from '@playwright/test'

async function expectNoOverflow(page: Page, where: string) {
  const m = await page.evaluate(() => ({
    inner: window.innerWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(m.inner, `innerWidth on ${where}`).toBe(390)
  expect(m.doc, `document scrollWidth on ${where}`).toBeLessThanOrEqual(390)
  expect(m.body, `body scrollWidth on ${where}`).toBeLessThanOrEqual(390)
}

test('home has no horizontal overflow', async ({ page }) => {
  await openHome(page)
  await expect(page.locator('#pn-surah [data-qa="surah-link"]')).toHaveCount(114)
  await expectNoOverflow(page, 'home')
  await page.getByRole('tab', { name: 'Juz' }).click()
  await expect(page.locator('#pn-juz')).toBeVisible()
  await expectNoOverflow(page, 'home, Juz tab')
})

test('search results have no horizontal overflow', async ({ page }) => {
  await openHome(page)
  await page.locator('[data-qa="search"]').fill('al')
  await expect(page.locator('#q-list [role="option"]').first()).toBeVisible()
  await expectNoOverflow(page, 'search list')
  await page.locator('[data-qa="search"]').fill('36:9')
  await expect(page.locator('#q-list .q-opt.is-ref')).toBeVisible()
  await expectNoOverflow(page, 'ayat reference')
})

test('the reader has no horizontal overflow', async ({ page }) => {
  await openSurah(page, 36)
  await expect(page.locator('[data-qa="ayat"]')).toHaveCount(83, { timeout: 15_000 })
  await expectNoOverflow(page, 'Yasin')
  await openSurah(page, 2, 255)
  await expect(ayatRow(page, 255)).toBeInViewport()
  await expectNoOverflow(page, 'Al-Baqarah 255')
})

test('the reader with the player bar has no horizontal overflow', async ({ page }) => {
  await openSurah(page, 18)
  await ayatRow(page, 1).locator('[data-qa="ayat-play"]').click()
  await expect(page.locator('[data-qa="player"]')).toBeVisible()
  await expect(page.locator('[data-qa="player"]')).toHaveAttribute('data-ayat', /\d+/)
  await expectNoOverflow(page, 'Al-Kahf with the player')
})
