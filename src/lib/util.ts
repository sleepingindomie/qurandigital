// Formatting and environment helpers.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Place of revelation as Indonesian readers expect it: Makkiyah or Madaniyah. */
export const tempat = (t: string) => (/mek/i.test(t) ? 'Makkiyah' : /madin/i.test(t) ? 'Madaniyah' : t)

export const pad3 = (n: number) => String(n).padStart(3, '0')

/** Player time, "1:05". */
export const fmtClock = (t: number) =>
  isFinite(t) && t >= 0 ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '0:00'

/** The first 120 characters of a translation, cut at a word (Ditandai). Arabic is never excerpted. */
export function excerpt(t: string | undefined): string {
  const s = String(t || '')
  if (s.length <= 120) return s
  const cut = s.slice(0, 120)
  const i = cut.lastIndexOf(' ')
  return (i > 60 ? cut.slice(0, i) : cut) + '…'
}

/** requestIdleCallback with a timeout, or a short timer where it is missing. */
export function idle(fn: (deadline: IdleDeadline | null) => void, timeout = 200): void {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback((d) => fn(d), { timeout })
  else setTimeout(() => fn(null), 16)
}
