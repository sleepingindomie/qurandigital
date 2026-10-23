// Height estimate for one ayat row, written to contain-intrinsic-size so rows
// that content-visibility skips still take about their real height and the
// scrollbar does not jump as rows render.
import type { ArabicStep, Ayat, Breakpoint, Settings } from '@/types'
import { AR_STEPS } from '@/lib/quran'

const TR_PX: Record<Breakpoint, readonly number[]> = {
  phone: [16, 17, 17, 19, 19, 22.6],
  tab: [16, 17, 18, 19, 22.6, 22.6],
  desk: [16, 17, 18, 19, 22.6, 22.6],
}

const AUTO_STEP: Record<Breakpoint, ArabicStep> = { phone: 2, tab: 3, desk: 4 }

type SizeSettings = Pick<Settings, 'arabicStep' | 'latin' | 'translation'>

export function estimateRow(a: Ayat, b: Breakpoint, s: SizeSettings, viewport = innerWidth): number {
  const step = s.arabicStep || AUTO_STEP[b]
  const ar = AR_STEPS[step - 1]
  const tr = TR_PX[b][step - 1]
  const lat = Math.max(15, tr - 2)
  const w = b === 'desk' ? 720 : b === 'tab' ? 632 : Math.min(viewport, 600) - 32
  const tw = b === 'desk' ? 600 : Math.min(w, 600)
  const arLines = Math.max(1, Math.ceil((a.teksArab.length * 0.3 * ar) / w))
  const trLines = s.translation ? Math.max(1, Math.ceil((a.teksIndonesia.length * 0.5 * tr) / tw)) : 0
  const latLines = s.latin ? Math.max(1, Math.ceil((a.teksLatin.length * 0.5 * lat) / tw)) : 0
  const pad = b === 'phone' ? 36 + 48 : 64
  const text = arLines * ar * 2 + 16 + latLines * lat * 1.55 + (latLines ? 8 : 0) + trLines * tr * 1.6
  return Math.round(Math.max(b === 'desk' ? 192 : b === 'tab' ? 260 : 0, text + pad))
}
