// On the reduced-motion project (prefers-reduced-motion: reduce): no readable
// text is left invisible after load on home and the reader, no animation keeps
// running, and no transform sits on Arabic text.
import { expect, ayatRow, openHome, openSurah, test } from './helpers'
import type { Page } from '@playwright/test'

/** Text that takes up space but is invisible through opacity or visibility. */
function invisibleText(page: Page) {
  return page.evaluate(() => {
    const out: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const text = (node.textContent || '').trim()
      const el = node.parentElement
      if (!text || !el) continue
      // The toast and the pill keep their last text while faded out by design.
      if (el.closest('#toast, .pill, script, style, noscript')) continue
      if (!el.checkVisibility()) continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        out.push(`${el.tagName.toLowerCase()}.${el.className}: ${text.slice(0, 40)}`)
    }
    return out
  })
}

/** Arabic elements (or an ancestor inside main) with a transform. */
function transformedArabic(page: Page) {
  return page.evaluate(() => {
    const out: string[] = []
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[lang="ar"]'))) {
      if (!el.checkVisibility()) continue
      const main = document.getElementById('main')
      for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
        const t = getComputedStyle(n).transform
        if (t && t !== 'none') out.push(`${n.tagName.toLowerCase()}.${n.className}: ${t}`)
        if (n === main) break
      }
    }
    return out
  })
}

const runningAnimations = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .map((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target
        return t ? `${t.tagName.toLowerCase()}.${(t as HTMLElement).className}` : 'unknown'
      }),
  )

test('home: every text is visible, nothing animates, Arabic is not transformed', async ({ page }) => {
  await openHome(page)
  await expect(page.locator('#pn-surah [data-qa="surah-link"]')).toHaveCount(114)
  await page.evaluate(() => document.fonts.ready)
  expect(await invisibleText(page)).toEqual([])
  expect(await runningAnimations(page)).toEqual([])
  expect(await transformedArabic(page)).toEqual([])

  // A search swaps the list at once.
  await page.locator('[data-qa="search"]').fill('yasin')
  await expect(page.locator('#q-list [role="option"]').first()).toBeVisible()
  expect(await invisibleText(page)).toEqual([])
  expect(await transformedArabic(page)).toEqual([])
})

test('reader: every text is visible, nothing animates, Arabic is not transformed', async ({ page }) => {
  await openSurah(page, 36)
  await expect(page.locator('[data-qa="ayat"]')).toHaveCount(83, { timeout: 15_000 })
  await page.evaluate(() => document.fonts.ready)
  expect(await invisibleText(page)).toEqual([])
  expect(await runningAnimations(page)).toEqual([])
  expect(await transformedArabic(page)).toEqual([])

  // A deep link flashes statically and scrolls at once.
  await openSurah(page, 36, 40)
  await expect(ayatRow(page, 40)).toBeInViewport()
  await expect(ayatRow(page, 40)).toHaveClass(/\bflash-static\b/)
  expect(await invisibleText(page)).toEqual([])
  expect(await transformedArabic(page)).toEqual([])
})
