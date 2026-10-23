// Reading settings (qd:settings, version 1), theme, reading position and layout.
import type { ReciterKey } from './quran'
import type { PrayerMethod } from './prayer'

export type ArabicStep = 1 | 2 | 3 | 4 | 5 | 6
export type ThemeChoice = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type MotionChoice = 'system' | 'reduce'

export interface Settings {
  v: 1
  reciter: ReciterKey
  /** null follows the breakpoint (step 2 phone, 3 tablet, 4 desktop). */
  arabicStep: ArabicStep | null
  latin: boolean
  translation: boolean
  continuous: boolean
  /** Pause between ayat: 0, 500, 1000 or 2000. */
  gapMs: number
  /** 0 off, 3 or 5 times, -1 without end. */
  repeat: number
  follow: boolean
  method: PrayerMethod
  /** Hijri date shift in days: -1, 0 or 1. */
  hijriAdjust: number
  motion: MotionChoice
}

export type SettingsPatch = Partial<Omit<Settings, 'v'>>

export interface LastRead {
  surah: number
  ayat: number
  t: number
}

export interface Bookmark {
  surah: number
  ayat: number
  t: number
}

/** Phone below 600 px, tablet 600 to 1099, desktop 1100 and up. */
export type Breakpoint = 'phone' | 'tab' | 'desk'
