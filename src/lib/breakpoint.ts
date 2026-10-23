// Breakpoints: phone below 600, tablet 600 to 1099, desktop 1100 and up. The
// ui store mirrors this as a ref; plain code can read bp() directly.
import type { Breakpoint } from '@/types'

const mqDesk = matchMedia('(min-width: 1100px)')
const mqTab = matchMedia('(min-width: 600px)')

export const bp = (): Breakpoint => (mqDesk.matches ? 'desk' : mqTab.matches ? 'tab' : 'phone')

const listeners = new Set<(b: Breakpoint) => void>()
const fire = () => {
  const b = bp()
  listeners.forEach((fn) => fn(b))
}
mqDesk.addEventListener('change', fire)
mqTab.addEventListener('change', fire)

/** Called when the breakpoint changes; returns an unsubscribe function. */
export function onBp(fn: (b: Breakpoint) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Top bar height at the current breakpoint (56 px phone, 64 px from 600). */
export const barHeight = () => (bp() === 'phone' ? 56 : 64)
