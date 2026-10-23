// Plan case 10: equran.id answers 500, the error state and "Coba lagi" appear,
// and retry recovers.
import { expect, ayatRow, test } from './helpers'

test.use({ allowConsole: [/status of 500/] })

test('a 500 on the surah shows the error, and retry recovers', async ({ page }) => {
  let failures = 0
  await page.route(/^https:\/\/equran\.id\/api\/v2\/surat\/36\/?$/, async (route) => {
    if (failures < 1) {
      failures++
      await route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, json: { code: 500, message: 'Server error', data: null } })
    } else await route.fallback()
  })

  await page.goto('/surah/36')
  const err = page.getByRole('alert')
  await expect(err).toBeVisible()
  await expect(err.getByRole('heading')).toHaveText('Surah ini belum bisa dimuat. Periksa koneksi lalu coba lagi.')
  await expect(err.getByRole('heading')).toBeFocused()
  await expect(err.getByRole('link', { name: 'Kembali ke daftar isi' })).toBeVisible()
  await expect(page.locator('[data-qa="ayat"]')).toHaveCount(0)
  await expect(page.locator('.pl-pos-t')).toHaveText('Ayat belum dimuat')

  await err.getByRole('button', { name: 'Coba lagi' }).click()
  await expect(ayatRow(page, 1)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(failures).toBe(1)
})

test('a 500 on the tafsir shows its error, and retry recovers', async ({ page }) => {
  let failures = 0
  await page.route(/^https:\/\/equran\.id\/api\/v2\/tafsir\/36\/?$/, async (route) => {
    if (failures < 1) {
      failures++
      await route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' }, json: { code: 500, message: 'Server error', data: null } })
    } else await route.fallback()
  })

  await page.goto('/surah/36')
  await ayatRow(page, 2).locator('[data-qa="tafsir"]').click()
  const errText = page.getByText('Tafsir belum bisa dimuat. Periksa koneksi lalu coba lagi.')
  await expect(errText).toBeVisible()
  await errText.locator('xpath=..').getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.getByRole('heading', { name: 'Tafsir Kemenag, ayat 2' })).toBeVisible()
  await expect(page.locator('.tf-p').first()).not.toBeEmpty()
  expect(failures).toBe(1)
})
