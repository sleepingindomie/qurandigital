// The one construction (circle, two squares, octagon, inner circle, eight-pointed
// star) as SVG geometry, and its draw-in. Every path has pathLength 100, so a
// draw is stroke-dashoffset 100 to 0; at rest, and with no script animation at
// all, the frame is fully drawn.
import { EASE_DRAW, motionOK } from './motion'

/** The star's concave point, 0.7654 R. */
const INNER = Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8)

const pt = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [+(cx + r * Math.sin(a)).toFixed(2), +(cy - r * Math.cos(a)).toFixed(2)]
}

function starD(cx: number, cy: number, R: number): string {
  let d = ''
  for (let k = 0; k < 16; k++) d += (k ? 'L' : 'M') + pt(cx, cy, k % 2 ? R * INNER : R, k * 22.5).join(' ')
  return d + 'Z'
}

function polyD(cx: number, cy: number, r: number, n: number, off: number): string {
  let d = ''
  for (let k = 0; k < n; k++) d += (k ? 'L' : 'M') + pt(cx, cy, r, off + (k * 360) / n).join(' ')
  return d + 'Z'
}

export type FramePartClass = 'k-circle' | 'k-sq' | 'k-oct' | 'k-inner' | 'k-star'

export type FramePart =
  | { tag: 'circle'; cls: FramePartClass; cx: number; cy: number; r: number }
  | { tag: 'path'; cls: FramePartClass; d: string }

const R = 96

/** The surah frame in a 200 by 200 viewBox, in drawing order. */
export const FRAME_PARTS: readonly FramePart[] = [
  { tag: 'circle', cls: 'k-circle', cx: 100, cy: 100, r: R },
  { tag: 'path', cls: 'k-sq', d: polyD(100, 100, R, 4, 0) },
  { tag: 'path', cls: 'k-sq', d: polyD(100, 100, R, 4, 45) },
  { tag: 'path', cls: 'k-oct', d: polyD(100, 100, R * INNER, 8, 22.5) },
  { tag: 'circle', cls: 'k-inner', cx: 100, cy: 100, r: 58 },
  { tag: 'path', cls: 'k-star', d: starD(100, 100, R) },
]

/** The star symbol (#star) used by medallions and star rules, 100 by 100. */
export const STAR_SYMBOL_D = starD(50, 50, 46)

/** Octagon thumb of the settings switch, 16 by 16. */
export const SWITCH_THUMB_D = polyD(8, 8, 7.4, 8, 22.5)

const AT: Record<FramePartClass, number> = { 'k-circle': 0, 'k-sq': 80, 'k-oct': 160, 'k-inner': 160, 'k-star': 240 }

/**
 * Spec #5: circle first, squares from +80 ms, octagon +160, star +240, each
 * 320 ms, starting `delay` ms from now. Does nothing when motion is not allowed.
 */
export function drawFrame(svg: SVGSVGElement | null | undefined, delay = 120): void {
  if (!svg || !motionOK() || !svg.animate) return
  for (const p of Array.from(svg.children)) {
    const off = AT[p.getAttribute('class') as FramePartClass] || 0
    p.animate(
      [
        { strokeDasharray: '100 100', strokeDashoffset: 100 },
        { strokeDasharray: '100 100', strokeDashoffset: 0 },
      ],
      { duration: 320, delay: delay + off, easing: EASE_DRAW, fill: 'backwards' },
    )
  }
}
