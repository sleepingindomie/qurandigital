// The reader renders every ayat, the Basmalah rule (a header without a
// number, none for At-Taubah, ayat 1 of Al-Fatihah) and "Tentang surah ini".
import { expect, ayatRow, openSurah, readFixture, test } from './helpers'

// The header text as src/lib/quran.ts writes it. The API spells the same words
// with the shadda and fatha in the other order, so ayat text is compared with
// the fixture instead.
const BASMALAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ'

/** Ayat k of surah n as the reader shows it (the U+06DE mark removed). */
const arabic = (n: number, k: number) =>
  readFixture<{ data: { ayat: { teksArab: string }[] } }>(`surat-${n}.json`).data.ayat[k - 1].teksArab.replace(/۞\s?/g, '').trim()

test('Yasin renders 83 ayat under the Basmalah header', async ({ page }) => {
  await openSurah(page, 36)
  await expect(page).toHaveTitle('Yasin · Al-Quran Digital')
  await expect(page.locator('.pl-title')).toHaveText('Yasin')
  const bas = page.locator('#bacaan .bas')
  await expect(bas).toBeVisible()
  await expect(bas.locator('.bas-ar')).toHaveText(BASMALAH)
  // The rest of the surah fills in idle batches after the first window.
  await expect(page.locator('[data-qa="ayat"]')).toHaveCount(83, { timeout: 15_000 })
  await expect(ayatRow(page, 1).locator('.ar')).toHaveText(arabic(36, 1))
  for (const k of [1, 42, 83]) {
    const row = ayatRow(page, k)
    await expect(row.locator('.ar')).not.toBeEmpty()
    await expect(row.locator('.tr')).not.toBeEmpty()
  }
})

test('At-Taubah has no Basmalah header', async ({ page }) => {
  await openSurah(page, 9)
  await expect(page.locator('.pl-title')).toHaveText('At-Taubah')
  await expect(page.locator('#bacaan .bas')).toHaveCount(0)
  await expect(page.locator('#bacaan .note-m')).toHaveText('Surah ini dibuka tanpa Basmalah.')
  await expect(ayatRow(page, 1).locator('.ar')).toHaveText(arabic(9, 1))
  await expect(page.locator('[data-qa="ayat"]')).toHaveCount(129, { timeout: 15_000 })
})

test('Al-Fatihah carries the Basmalah as ayat 1 only', async ({ page }) => {
  await openSurah(page, 1)
  await expect(page.locator('#bacaan .bas')).toHaveCount(0)
  await expect(page.locator('[data-qa="ayat"]')).toHaveCount(7)
  // Ayat 1 is the Basmalah (the API's spelling of it), numbered 1.
  expect(arabic(1, 1)).toMatch(/^بِسْمِ/)
  await expect(ayatRow(page, 1).locator('.ar')).toHaveText(arabic(1, 1))
  await expect(ayatRow(page, 1).locator('.med-n')).toHaveText('1')
  await expect(ayatRow(page, 2).locator('.ar')).toHaveText(arabic(1, 2))
})

test('"Tentang surah ini" opens the description on every layout', async ({ page }) => {
  await openSurah(page, 36)
  const about = page.locator('.pl-about')
  await expect(about.locator('summary')).toBeVisible()
  await about.locator('summary').click()
  await expect(about).toHaveAttribute('open', '')
  await expect(about.locator('.about-p')).toContainText('Yaasiin')
  // Closing it again gives the reading column back.
  await about.locator('summary').click()
  await expect(about.locator('.about-p')).toBeHidden()
})
