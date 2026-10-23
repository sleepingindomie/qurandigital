// Option lists of the settings rows, shared by the settings panel, the phone
// player sheet and the home menu.
import type { MotionChoice, ReciterKey, ThemeChoice } from '@/types'
import { RECITER_LIST } from '@/lib/quran'

type Options<V> = readonly (readonly [V, string])[]

export const GAP: Options<number> = [
  [0, '0'],
  [500, '0,5'],
  [1000, '1'],
  [2000, '2 detik'],
]

export const REPEAT: Options<number> = [
  [0, 'Mati'],
  [3, '3 kali'],
  [5, '5 kali'],
  [-1, 'Terus'],
]

export const HIJRI: Options<number> = [
  [-1, '-1'],
  [0, '0'],
  [1, '+1 hari'],
]

export const THEMES: Options<ThemeChoice> = [
  ['system', 'Ikuti sistem'],
  ['light', 'Terang'],
  ['dark', 'Gelap'],
]

export const MOTION: Options<MotionChoice> = [
  ['system', 'Ikuti sistem'],
  ['reduce', 'Aktif'],
]

export const RECITERS: Options<ReciterKey> = RECITER_LIST.map((r) => [r.key, r.name] as const)

/** The boolean settings a switch row can carry. */
export type SwitchKey = 'latin' | 'translation' | 'continuous' | 'follow'
