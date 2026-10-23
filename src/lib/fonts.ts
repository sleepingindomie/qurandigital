// Amiri Quran loads with font-display: block, so Arabic stays invisible while
// the face is on its way. If it is still missing after 1000 ms, the root gets
// .ar-fallback (tokens.css) and the Arabic shows in the fallback stack until
// the face arrives (the pattern quran.com uses). Arabic line boxes are fixed
// by line-height, so the swap does not move the layout.
const PROBE = '16px "Amiri Quran"'
const SAMPLE = 'بسم'
const WAIT_MS = 1000

export function watchArabicFont(): void {
  const fonts = document.fonts
  if (!fonts || fonts.check(PROBE, SAMPLE)) return
  const root = document.documentElement
  const timer = setTimeout(() => root.classList.add('ar-fallback'), WAIT_MS)
  fonts.load(PROBE, SAMPLE).then(
    () => {
      clearTimeout(timer)
      root.classList.remove('ar-fallback')
    },
    () => {
      clearTimeout(timer)
      root.classList.add('ar-fallback')
    },
  )
}
