// Plan case 6 and the method panel: prayer times for Jakarta on 23 Oct 2026 at
// 15.30 WIB with no saved place, the three methods (Kemenag by default), the
// location row granted and denied, and the recalculation after midnight.
// page.clock.setSystemTime sets the date and lets it run. setFixedTime would
// freeze Date.now, which Vue compares to skip events dispatched before a
// listener was attached, so a bubbled keydown would never reach an outer
// listener (Escape on #pr-method).
import { expect, openHome, test, WIB_1530 } from './helpers'
import type { Page } from '@playwright/test'

const prayer = (page: Page) => page.locator('[data-qa="prayer"]')
const times = (page: Page) => prayer(page).locator('.strip .cell .c-time')

const KEMENAG = ['04.12', '05.27', '11.39', '14.50', '17.47', '18.58']
const MUHAMMADIYAH = ['04.19', '05.27', '11.38', '14.50', '17.47', '18.58']
const MWL = ['04.18', '05.29', '11.38', '14.48', '17.45', '18.52']

// "Ganti metode" opens an inline disclosure (#pr-method) in the prayer block,
// so the strip stays in view while the method changes.
async function openMethod(page: Page) {
  const btn = prayer(page).locator('[data-qa="method"]')
  await btn.click()
  await expect(btn).toHaveAttribute('aria-expanded', 'true')
  const group = prayer(page).locator('#pr-method').getByRole('radiogroup', { name: 'Metode jadwal salat' })
  await expect(group.getByRole('radio')).toHaveText(['Kemenag', 'Muhammadiyah', 'Liga Muslim Dunia'])
  return { btn, group }
}

test.beforeEach(async ({ page }) => {
  await page.clock.setSystemTime(WIB_1530)
})

test('Kemenag at 15.30 WIB in Jakarta: Ashar now, Maghrib next in 2 jam 17 menit', async ({ page }) => {
  await openHome(page)
  const p = prayer(page)
  await expect(p.locator('.pr-date')).toContainText('Jumat, 23 Oktober 2026')
  await expect(p.locator('.strip .cell .c-name')).toHaveText(['Subuh', 'Terbit', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'])
  await expect(times(page)).toHaveText(KEMENAG)
  await expect(p.locator('.pr-now')).toHaveText('Sekarang Ashar, sejak 14.50')
  await expect(p.locator('.cell[aria-current="time"] .c-name')).toHaveText('Ashar')
  await expect(p.locator('.pr-next')).toHaveText('Maghrib 17.47')
  await expect(p.locator('.cell.is-next .c-name')).toHaveText('Maghrib')
  await expect(p.locator('.pr-cd')).toHaveText('2 jam 17 menit lagi')
  await expect(p.locator('.loc-name')).toHaveText('Jakarta · WIB')
  await expect(p.locator('.loc-line .tag')).toHaveText('lokasi default')
  await expect(p.getByText('Metode Kemenag: Subuh 20°, Isya 18°, ihtiyat 2 menit.')).toBeVisible()
})

test('Muhammadiyah from "Ganti metode", and the choice survives a reload', async ({ page }) => {
  await openHome(page)
  await expect(times(page)).toHaveText(KEMENAG)

  const { btn, group } = await openMethod(page)
  await expect(group.getByRole('radio', { name: 'Kemenag' })).toHaveAttribute('aria-checked', 'true')
  await group.getByRole('radio', { name: 'Muhammadiyah' }).click()
  await expect(group.getByRole('radio', { name: 'Muhammadiyah' })).toHaveAttribute('aria-checked', 'true')
  await expect(times(page)).toHaveText(MUHAMMADIYAH)
  await expect(times(page).first()).toHaveText('04.19')
  await expect(prayer(page).getByText('Metode Muhammadiyah: Subuh 18°, Isya 18°, ihtiyat 1 menit setelah pembulatan.')).toBeVisible()
  await expect(page.locator('#live')).toContainText('Jadwal memakai metode Muhammadiyah.')
  await page.keyboard.press('Escape')
  await expect(prayer(page).locator('#pr-method')).toBeHidden()
  await expect(btn).toHaveAttribute('aria-expanded', 'false')
  await expect(btn).toBeFocused()

  await page.reload()
  await expect(times(page)).toHaveText(MUHAMMADIYAH)
  const again = await openMethod(page)
  await expect(again.group.getByRole('radio', { name: 'Muhammadiyah' })).toHaveAttribute('aria-checked', 'true')
})

test('Liga Muslim Dunia from "Ganti metode"', async ({ page }) => {
  await openHome(page)
  const { group } = await openMethod(page)
  await group.getByRole('radio', { name: 'Liga Muslim Dunia' }).click()
  await expect(times(page)).toHaveText(MWL)
  await expect(prayer(page).locator('.pr-next')).toHaveText('Maghrib 17.45')
})

test('granted location switches the label, and "Kembali ke Jakarta" undoes it', async ({ page, context, baseURL }) => {
  await context.grantPermissions(['geolocation'], { origin: baseURL })
  // Makassar, in WITA.
  await context.setGeolocation({ latitude: -5.1477, longitude: 119.4327 })
  await openHome(page)
  const p = prayer(page)
  await p.locator('[data-qa="locate"]').click()
  await expect(p.locator('.loc-name')).toHaveText('Lokasi kamu · WITA')
  await expect(p.locator('.loc-line .tag')).toHaveText('lokasi kamu')
  await expect(p.getByText('Jam ditampilkan dalam WITA sesuai lokasi.')).toBeVisible()
  await expect(times(page).first()).not.toHaveText(KEMENAG[0])

  await p.getByRole('button', { name: 'Kembali ke Jakarta' }).click()
  await expect(p.locator('.loc-name')).toHaveText('Jakarta · WIB')
  await expect(times(page)).toHaveText(KEMENAG)
})

test('denied location shows the message and keeps Jakarta', async ({ page, context }) => {
  await context.clearPermissions()
  await openHome(page)
  const p = prayer(page)
  await p.locator('[data-qa="locate"]').click()
  await expect(p.locator('.loc-msg')).toHaveText(
    'Izin lokasi ditolak. Jadwal tetap memakai Jakarta sampai izin diberikan di pengaturan peramban.',
  )
  await expect(p.locator('.loc-name')).toHaveText('Jakarta · WIB')
  await expect(times(page)).toHaveText(KEMENAG)
})

test('crossing midnight and returning to the tab recalculates', async ({ page }) => {
  await openHome(page)
  await expect(prayer(page).locator('.pr-date')).toContainText('23 Oktober 2026')

  await page.clock.setSystemTime(new Date('2026-10-24T00:05:00+07:00'))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

  const p = prayer(page)
  await expect(p.locator('.pr-date')).toContainText('Sabtu, 24 Oktober 2026')
  await expect(p.locator('.pr-now')).toContainText('Sekarang Isya')
  await expect(p.locator('.pr-next .pr-next-name')).toHaveText('Subuh')
  await expect(p.locator('.cell[aria-current="time"] .c-name')).toHaveText('Isya')
})
