// Motion vocabulary (spec 5.1) for script-driven animation. CSS motion lives in
// the style files, declared only under prefers-reduced-motion: no-preference
// and :root:not([data-motion="reduce"]).
import { reducedMotion } from './util'

export const EASE_STD = 'cubic-bezier(0.2, 0, 0, 1)'
export const EASE_UI = 'cubic-bezier(0.4, 0, 0.2, 1)'
export const EASE_DRAW = 'cubic-bezier(0.62, 0.05, 0.01, 0.99)'

/**
 * Motion is allowed only when the system and the in-app setting both allow it.
 * Read it at the moment an animation would start.
 */
export const motionOK = () => !reducedMotion() && document.documentElement.dataset.motion !== 'reduce'

export const hasViewTransitions = () => typeof document.startViewTransition === 'function'

/** Cubic bezier easing as a function of progress, for rAF tweens (the follow scroll). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  return (t: number) => {
    let x = t
    for (let i = 0; i < 6; i++) {
      const f = ((ax * x + bx) * x + cx) * x - t
      const d = (3 * ax * x + 2 * bx) * x + cx
      if (Math.abs(d) < 1e-6) break
      x -= f / d
    }
    x = Math.min(1, Math.max(0, x))
    return ((ay * x + by) * x + cy) * x
  }
}
