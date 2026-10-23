// Smoke test against the live services: no mocks (helpers.ts skips them for
// @live). Runs only with LIVE=1 (npm run test:e2e:live). Home renders from the
// bundled index, so the live API is first hit by the surah itself.
import { expect, ayatRow, indexRow, openHome, player, test } from './helpers'

test('home, a surah from equran.id, and one ayat from the audio CDN', { tag: '@live' }, async ({ page }) => {
  test.setTimeout(90_000)
  await openHome(page)
  await expect(page.locator('#pn-surah [data-qa="surah-link"]')).toHaveCount(114)

  const surah = page.waitForResponse((r) => r.url().startsWith('https://equran.id/api/v2/surat/36'))
  await indexRow(page, 36).click()
  const res = await surah
  expect(res.status()).toBe(200)
  await expect(page.locator('[data-qa="ayat"]')).toHaveCount(83, { timeout: 30_000 })
  await expect(ayatRow(page, 1).locator('.tr')).not.toBeEmpty()

  // The description for "Tentang surah ini" arrives with the live surah.
  await expect(page.locator('.about-p')).not.toHaveText(/^(Memuat keterangan surah\.|Keterangan surah belum tersedia\.)$/)

  await ayatRow(page, 1).locator('[data-qa="ayat-play"]').click()
  await expect(player(page)).toHaveAttribute('data-status', 'playing', { timeout: 30_000 })
  await expect(player(page)).toHaveAttribute('data-ayat', /^[1-9]\d*$/)
})
