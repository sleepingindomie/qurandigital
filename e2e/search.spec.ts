// Search by name, misspelling, number and Arabic; the empty state; Escape;
// arrow keys through the options; the "36:9" ayat reference.
import { expect, ayatRow, openHome, test } from './helpers'
import type { Page } from '@playwright/test'

const NO_MATCH = 'Tidak ada surah yang cocok. Coba nama lain atau nomor 1 sampai 114.'

const search = (page: Page) => page.locator('[data-qa="search"]')
const options = (page: Page) => page.locator('#q-list [role="option"]')

for (const [query, n] of [
  ['yasin', 36],
  ['kahfi', 18],
  ['yaasiin', 36],
  ['36', 36],
  ['الكهف', 18],
] as const) {
  test(`"${query}" puts surah ${n} first`, async ({ page }) => {
    await openHome(page)
    await search(page).fill(query)
    await expect(page.locator('#q-list')).toBeVisible()
    await expect(options(page).first()).toHaveAttribute('data-surah', String(n))
    // The index below filters to the same first match.
    await expect(page.locator('#pn-surah [data-qa="surah-link"]').first()).toHaveAttribute('data-surah', String(n))
    await expect(page.locator('#h-idx')).toHaveText(`Hasil untuk “${query}”`)
  })
}

test('"xyzq" shows the empty sentence, and Escape closes then clears', async ({ page }) => {
  await openHome(page)
  await search(page).fill('xyzq')
  await expect(page.locator('#q-list .q-note')).toHaveText(NO_MATCH)
  await expect(options(page)).toHaveCount(0)
  await expect(page.locator('#pn-surah .idx-empty')).toBeVisible()
  await expect(page.locator('#pn-surah .idx-empty')).toHaveText(NO_MATCH)

  await search(page).press('Escape')
  await expect(page.locator('#q-list')).toBeHidden()
  await expect(search(page)).toHaveValue('xyzq')
  await search(page).press('Escape')
  await expect(search(page)).toHaveValue('')
  await expect(page.locator('#pn-surah [data-qa="surah-link"]')).toHaveCount(114)
  await expect(page.locator('#h-idx')).toHaveText('Daftar isi')
})

test('arrow keys move through the options', async ({ page }) => {
  await openHome(page)
  const q = search(page)
  await q.fill('al')
  await expect(options(page).nth(2)).toBeVisible()
  await expect(q).not.toHaveAttribute('aria-activedescendant')

  await q.press('ArrowDown')
  await expect(q).toHaveAttribute('aria-activedescendant', 'q-opt-0')
  await expect(page.locator('#q-opt-0')).toHaveAttribute('aria-selected', 'true')
  await q.press('ArrowDown')
  await expect(q).toHaveAttribute('aria-activedescendant', 'q-opt-1')
  await expect(page.locator('#q-opt-0')).toHaveAttribute('aria-selected', 'false')
  await expect(page.locator('#q-opt-1')).toHaveAttribute('aria-selected', 'true')
  await q.press('ArrowUp')
  await expect(q).toHaveAttribute('aria-activedescendant', 'q-opt-0')
})

test('the query is written to ?q= without a new history entry', async ({ page }) => {
  await openHome(page)
  const before = await page.evaluate(() => history.length)
  await search(page).fill('yasin')
  await expect(page).toHaveURL(/\/\?q=yasin$/)
  expect(await page.evaluate(() => history.length)).toBe(before)
})

test('"36:9" offers Yasin ayat 9 first and Enter opens it', async ({ page }) => {
  await openHome(page)
  await search(page).fill('36:9')
  const first = options(page).first()
  await expect(first).toHaveAttribute('data-surah', '36')
  await expect(first.locator('.o-name')).toHaveText('Buka Yasin ayat 9')
  await search(page).press('ArrowDown')
  await search(page).press('Enter')
  await expect(page).toHaveURL(/\/surah\/36\/9$/)
  await expect(ayatRow(page, 9)).toBeInViewport()
})
