// With the context offline the notice appears and a surah opened before stays
// readable. The service worker is blocked in this suite, so the app shell has
// to be loaded (home and reader chunks) before going offline.
import { expect, ayatRow, indexRow, openHome, player, test } from './helpers'

// With the service worker blocked, the browser's own refetch of the favicon
// fails while offline; in production the worker serves it from the precache.
test.use({ allowConsole: [/Failed to load resource: net::ERR_INTERNET_DISCONNECTED/] })

test('the offline notice appears and an opened surah stays readable', async ({ page, context }) => {
  await openHome(page)
  await indexRow(page, 36).click()
  await expect(ayatRow(page, 1)).toBeVisible()
  // The surah is kept for offline reading in idle time after it renders.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('qd:surah:36:v1') !== null), { timeout: 10_000 })
    .toBe(true)

  await context.setOffline(true)
  const banner = page.getByRole('region', { name: 'Status koneksi' })
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Kamu sedang offline. Yang bisa dibaca: Yasin.')
  await expect(page.locator('html')).toHaveClass(/\bis-offline\b/)

  // Audio needs the network: a toast instead of a broken player.
  await ayatRow(page, 3).locator('[data-qa="ayat-play"]').click()
  await expect(page.locator('#toast')).toHaveText('Audio butuh koneksi internet.')
  await expect(player(page)).toHaveAttribute('data-status', 'idle')

  await page.locator('[data-qa="home"]').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(indexRow(page, 36)).toHaveAttribute('data-avail', '1')
  await expect(indexRow(page, 67)).not.toHaveAttribute('data-avail', '1')
  await expect(indexRow(page, 67).locator('.r-off')).toBeVisible()
  await expect(indexRow(page, 36).locator('.r-off')).toBeHidden()

  await indexRow(page, 36).click()
  await expect(page).toHaveURL(/\/surah\/36$/)
  await expect(ayatRow(page, 1)).toBeVisible()
  await expect(ayatRow(page, 1).locator('.tr')).not.toBeEmpty()
  await expect(page.locator('.err')).toHaveCount(0)

  await context.setOffline(false)
  await expect(banner).toBeHidden()
  await expect(page.locator('#live')).toHaveText('Koneksi kembali.')
})
