// Home lists 114 surahs and every Latin name, ayat count and place is filled
// in (an earlier version mapped snake_case fields and showed empty titles).
import { expect, openHome, readFixture, test } from './helpers'

interface ApiList {
  data: { nomor: number; namaLatin: string; jumlahAyat: number; tempatTurun: string }[]
}

test.describe('home index', () => {
  test('lists 114 surahs with Latin name, ayat count and place', async ({ page }) => {
    await openHome(page)
    const rows = page.locator('#pn-surah [data-qa="surah-link"]')
    await expect(rows).toHaveCount(114)

    const seen = await rows.evaluateAll((els) =>
      els.map((a) => ({
        n: Number(a.getAttribute('data-surah')),
        name: a.querySelector('.r-nm')?.textContent?.trim() ?? '',
        meta: a.querySelector('.r-meta')?.textContent?.trim() ?? '',
        ar: a.querySelector('.r-ar')?.textContent?.trim() ?? '',
      })),
    )
    const api = readFixture<ApiList>('surat.json').data
    expect(seen.map((r) => r.n)).toEqual(api.map((s) => s.nomor))
    for (const [i, r] of seen.entries()) {
      const s = api[i]
      expect(r.name, `Latin name of surah ${r.n}`).toBe(s.namaLatin)
      expect(r.ar, `Arabic name of surah ${r.n}`).not.toBe('')
      expect(r.meta, `meta line of surah ${r.n}`).toMatch(new RegExp(`^${s.jumlahAyat} ayat · (Makkiyah|Madaniyah)`))
    }
  })

  test('the index heading, tabs and resume block are there', async ({ page }) => {
    await openHome(page)
    await expect(page).toHaveTitle('Al-Quran Digital')
    await expect(page.locator('html')).toHaveAttribute('data-route', 'home')
    await expect(page.getByRole('tab', { name: 'Surah' })).toHaveAttribute('aria-selected', 'true')
    // Nothing read yet: the resume block offers Al-Fatihah.
    await expect(page.locator('.resume .rs-h')).toHaveText('Mulai membaca')
    await expect(page.locator('.resume [data-qa="surah-link"]').first()).toHaveAttribute('data-surah', '1')
  })
})
