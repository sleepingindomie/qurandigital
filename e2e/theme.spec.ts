// Plan case 7: the theme toggle flips data-theme and survives a reload; the
// system preference applies while nothing is saved.
import { expect, openHome, test } from './helpers'

test('the toggle flips data-theme and the choice survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openHome(page)
  const html = page.locator('html')
  const meta = page.locator('meta[name="theme-color"]')
  await expect(html).toHaveAttribute('data-theme', 'light')
  await expect(meta).toHaveAttribute('content', '#F2EFE8')

  const toggle = page.locator('[data-qa="theme"]')
  await expect(toggle).toHaveAttribute('aria-label', 'Ganti ke tema gelap')
  await toggle.click()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(meta).toHaveAttribute('content', '#0E1014')
  await expect(toggle).toHaveAttribute('aria-label', 'Ganti ke tema terang')
  expect(await page.evaluate(() => localStorage.getItem('qd:theme'))).toBe('"dark"')

  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await expect(meta).toHaveAttribute('content', '#0E1014')

  await page.locator('[data-qa="theme"]').click()
  await expect(html).toHaveAttribute('data-theme', 'light')
})

test('with nothing saved the system preference applies and is followed', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await openHome(page)
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => localStorage.getItem('qd:theme'))).toBeNull()

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html).toHaveAttribute('data-theme', 'light')
})

test('the reader bar carries the theme toggle on desktop', async ({ page }) => {
  await page.goto('/surah/36')
  const toggle = page.locator('[data-qa="theme"]')
  await expect(toggle).toHaveCount(1)
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
