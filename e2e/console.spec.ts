// No console errors or page errors. Every test in the suite already fails on
// one (the consoleErrors fixture in helpers.ts); this walk goes through the
// main flows in one page and checks the list explicitly.
import { expect, ayatRow, openHome, player, test } from './helpers'

test('a walk through home, search, reader, audio, tafsir, settings and Ditandai logs no errors', async ({ page, consoleErrors }) => {
  await openHome(page)
  const q = page.locator('[data-qa="search"]')
  await q.fill('yasin')
  await expect(page.locator('#q-list [role="option"]').first()).toHaveAttribute('data-surah', '36')
  await q.press('ArrowDown')
  await q.press('Enter')
  await expect(page).toHaveURL(/\/surah\/36$/)
  await expect(ayatRow(page, 1)).toBeVisible()

  await ayatRow(page, 1).locator('[data-qa="ayat-play"]').click()
  await expect(player(page)).toHaveAttribute('data-status', 'playing')
  await page.locator('[data-qa="player-toggle"]').click()
  await expect(player(page)).toHaveAttribute('data-status', 'paused')

  await ayatRow(page, 1).locator('[data-qa="bookmark"]').click()
  await expect(ayatRow(page, 1).locator('[data-qa="bookmark"]')).toHaveAttribute('aria-pressed', 'true')

  await ayatRow(page, 1).locator('[data-qa="tafsir"]').click()
  await expect(page.getByRole('heading', { name: 'Tafsir Kemenag, ayat 1' })).toBeVisible()
  await expect(page.locator('.tf-p').first()).not.toBeEmpty()
  // Below 1100 the tafsir is a sheet (Escape closes it); on desktop it sits in the plate.
  await page.keyboard.press('Escape')
  const back = page.getByRole('button', { name: 'Kembali ke info surah' })
  if (await back.isVisible()) await back.click()

  // Open "Tentang surah ini" where it is shown and wait for the description.
  const about = page.locator('summary', { hasText: 'Tentang surah ini' })
  if (await about.isVisible()) {
    await about.click()
    await expect(page.locator('.about-p')).not.toHaveText(/Memuat keterangan surah/)
  }

  await page.locator('[data-qa="settings"]').click()
  const settings = page.getByRole('dialog', { name: 'Pengaturan baca' })
  await expect(settings).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(settings).toBeHidden()

  await page.locator('[data-qa="home"]').click()
  await expect(page.locator('[data-qa="search"]')).toBeVisible()
  await page.goto('/tanda')
  await expect(page.getByRole('heading', { name: 'Ditandai', level: 1 })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Yasin' })).toBeVisible()

  expect(consoleErrors).toEqual([])
})
