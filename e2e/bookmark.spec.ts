// Bookmarks per ayat survive a reload and show on Ditandai; the last read is
// written while reading and offered on home.
import { expect, ayatRow, openSurah, test } from './helpers'

test('a bookmark toggles per ayat and survives a reload', async ({ page }) => {
  await openSurah(page, 36)
  const mark5 = ayatRow(page, 5).locator('[data-qa="bookmark"]')
  const mark6 = ayatRow(page, 6).locator('[data-qa="bookmark"]')
  await expect(mark5).toHaveAttribute('aria-pressed', 'false')
  await mark5.click()
  await expect(mark5).toHaveAttribute('aria-pressed', 'true')
  await expect(mark5).toHaveAttribute('aria-label', 'Hapus tanda ayat 5')
  await expect(mark6).toHaveAttribute('aria-pressed', 'false')

  await page.reload()
  await expect(ayatRow(page, 5).locator('[data-qa="bookmark"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(ayatRow(page, 6).locator('[data-qa="bookmark"]')).toHaveAttribute('aria-pressed', 'false')

  await page.goto('/tanda')
  const group = page.getByRole('region', { name: 'Yasin' })
  await expect(group.locator('.tanda-ay')).toHaveText(['Ayat 5'])
  await expect(group.locator('.tanda-ex')).not.toBeEmpty()

  await openSurah(page, 36)
  const again = ayatRow(page, 5).locator('[data-qa="bookmark"]')
  await again.click()
  await expect(again).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(ayatRow(page, 5).locator('[data-qa="bookmark"]')).toHaveAttribute('aria-pressed', 'false')
})

test('last read is written while reading and offered on home', async ({ page }) => {
  await openSurah(page, 36)
  await expect(ayatRow(page, 30)).toBeAttached({ timeout: 15_000 })
  await page.evaluate(() => document.getElementById('ayat-30')?.scrollIntoView({ block: 'center' }))

  // The tracker writes on a 1 s trailing throttle once the reader has stayed 2 s.
  const lastRead = () => page.evaluate(() => JSON.parse(localStorage.getItem('qd:lastRead') || 'null') as { surah: number; ayat: number } | null)
  await expect.poll(async () => (await lastRead())?.ayat ?? 0, { timeout: 10_000 }).toBeGreaterThanOrEqual(25)
  const saved = await lastRead()
  expect(saved?.surah).toBe(36)

  await page.locator('[data-qa="home"]').click()
  await expect(page).toHaveURL(/\/$/)
  const resume = page.locator('[data-qa="last-read"]')
  await expect(resume).toBeVisible()
  // The tracker flushes when the reader unmounts, so the value is final once home shows.
  const final = await lastRead()
  expect(final?.surah).toBe(36)
  await expect(resume.locator('.rs-h')).toHaveText('Lanjutkan membaca')
  await expect(resume.locator('.rs-line')).toHaveText(`Yasin, ayat ${final?.ayat} dari 83`)
  const link = resume.locator('[data-qa="surah-link"]')
  await expect(link).toHaveAttribute('data-surah', '36')
  await expect(link).toHaveText(`Lanjut ke ayat ${final?.ayat}`)
  await expect(page.locator(`#pn-surah [data-surah="36"] .r-last`)).toHaveText(`terakhir ayat ${final?.ayat}`)

  await link.click()
  await expect(page).toHaveURL(new RegExp(`/surah/36/${final?.ayat}$`))
  await expect(ayatRow(page, final?.ayat ?? 1)).toBeInViewport()
})
