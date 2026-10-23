// Plan case 5: murattal per ayat against one second of mocked silence. State is
// read from the DOM: [data-qa="player"] carries data-status and data-ayat, and
// the playing row carries aria-current="true".
import { expect, ayatRow, indexRow, openSurah, player, seedSettings, test } from './helpers'
import type { Page } from '@playwright/test'

const playAyat = (page: Page, k: number) => ayatRow(page, k).locator('[data-qa="ayat-play"]').click()

async function expectPlaying(page: Page, k: number) {
  await expect(player(page)).toHaveAttribute('data-status', 'playing')
  await expect(player(page)).toHaveAttribute('data-ayat', String(k))
  await expect(ayatRow(page, k)).toHaveAttribute('aria-current', 'true')
}

test.describe('continuous play', () => {
  // A 2 second gap keeps each ayat on screen long enough to read its state.
  test.beforeEach(async ({ page }) => seedSettings(page, { continuous: true, gapMs: 2000, repeat: 0 }))

  test('play ayat 3, then the ended event moves to ayat 4 and the view follows', async ({ page }) => {
    await openSurah(page, 36)
    await playAyat(page, 3)
    await expect(player(page)).toBeVisible()
    await expectPlaying(page, 3)
    await expect(page.locator('[data-qa="ayat"][aria-current="true"]')).toHaveCount(1)

    await expect(player(page)).toHaveAttribute('data-ayat', '4', { timeout: 10_000 })
    await expect(ayatRow(page, 4)).toHaveAttribute('aria-current', 'true')
    await expect(ayatRow(page, 3)).not.toHaveAttribute('aria-current', 'true')
    await expect(ayatRow(page, 4)).toBeInViewport()
  })

  test('after the reader scrolls away the view stays put and the pill brings it back', async ({ page }) => {
    await openSurah(page, 36)
    await expect(ayatRow(page, 83)).toBeAttached({ timeout: 15_000 })
    await playAyat(page, 3)
    await expectPlaying(page, 3)

    await page.mouse.move(720, 450)
    await page.mouse.wheel(0, 6000)
    const pill = page.getByRole('button', { name: /^Kembali ke ayat \d+$/ })
    await expect(pill).toBeVisible()

    await expect(player(page)).toHaveAttribute('data-ayat', '4', { timeout: 10_000 })
    await expect(pill).toHaveText('Kembali ke ayat 4')
    await expect(ayatRow(page, 4)).not.toBeInViewport()

    await pill.click()
    await expect(page.locator('[data-qa="ayat"][aria-current="true"]')).toBeInViewport()
    await expect(pill).toBeHidden()
  })
})

test.describe('one ayat on repeat', () => {
  // Ayat 3 repeats without end, so the same ayat stays loaded for the whole test.
  test.beforeEach(async ({ page }) => seedSettings(page, { continuous: false, gapMs: 500, repeat: -1 }))

  test('pause and resume', async ({ page }) => {
    await openSurah(page, 36)
    await playAyat(page, 3)
    await expectPlaying(page, 3)

    const toggle = page.locator('[data-qa="player-toggle"]')
    await toggle.click()
    await expect(player(page)).toHaveAttribute('data-status', 'paused')
    await expect(player(page)).toHaveAttribute('data-ayat', '3')
    await expect(ayatRow(page, 3)).toHaveAttribute('aria-current', 'true')
    await expect(ayatRow(page, 3).locator('[data-qa="ayat-play"]')).toHaveAttribute('aria-label', 'Lanjutkan ayat 3')

    await toggle.click()
    await expectPlaying(page, 3)

    // The row button on the playing ayat pauses too.
    await playAyat(page, 3)
    await expect(player(page)).toHaveAttribute('data-status', 'paused')
  })

  test('switching qari restarts the same ayat with the new source', async ({ page }) => {
    await openSurah(page, 36)
    await playAyat(page, 3)
    await expectPlaying(page, 3)

    const newSource = page.waitForRequest((r) => r.url().includes('/Misyari-Rasyid-Al-Afasi/036003.mp3'))
    await page.locator('[data-qa="reciter"]').click()
    const options = page.locator('[data-qa="reciter-options"]')
    await expect(options).toBeVisible()
    await options.locator('[role="radio"][data-value="05"]').click()
    await expect(options.locator('[role="radio"][data-value="05"]')).toHaveAttribute('aria-checked', 'true')
    await newSource
    await expectPlaying(page, 3)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-qa="reciter"]')).toHaveAttribute('aria-label', 'Ganti qari, sekarang Misyari Rasyid Al-Afasi')
  })

  test('home keeps playing in the bar; another surah stops it', async ({ page }) => {
    await openSurah(page, 36)
    await playAyat(page, 3)
    await expectPlaying(page, 3)

    await page.locator('[data-qa="home"]').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('[data-qa="search"]')).toBeVisible()
    await expect(player(page)).toBeVisible()
    await expect(player(page)).toHaveAttribute('data-status', 'playing')
    await expect(player(page)).toHaveAttribute('data-ayat', '3')
    await expect(page.locator('.p-now')).toHaveAttribute('aria-label', 'Kembali ke Yasin ayat 3')

    await indexRow(page, 67).click()
    await expect(page).toHaveURL(/\/surah\/67$/)
    await expect(player(page)).toHaveAttribute('data-status', 'idle')
    await expect(player(page)).toBeHidden()
  })
})

test.describe('audio failure', () => {
  test.use({ allowConsole: [/status of 404/] })
  test.beforeEach(async ({ page }) => seedSettings(page, { continuous: false, gapMs: 500, repeat: -1 }))

  test('an audio 404 shows the error with retry, and retry recovers', async ({ page }) => {
    let fail = true
    await page.route(
      (url) => url.hostname === 'everyayah.com',
      (route) => (fail ? route.fulfill({ status: 404, body: 'not found' }) : route.fallback()),
    )
    await openSurah(page, 36)
    await playAyat(page, 3)

    await expect(player(page)).toHaveAttribute('data-status', 'error')
    await expect(player(page)).toHaveAttribute('data-ayat', '3')
    await expect(page.locator('.p-sub')).toHaveText('Audio ayat 3 gagal dimuat.')
    const retry = player(page).getByRole('button', { name: 'Coba lagi' })
    await expect(retry).toBeVisible()
    await expect(ayatRow(page, 3).locator('.state')).toHaveText('Gagal dimuat')

    fail = false
    await retry.click()
    await expectPlaying(page, 3)
    await expect(retry).toBeHidden()
  })
})
