// Quran constants shared by the reader, the player and the panels.
import type { Reciter, ReciterKey } from '@/types'

export const BASMALAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ'
export const BASMALAH_ID = 'Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.'

/**
 * Al-Fatihah carries the Basmalah as its first ayat and At-Taubah has none;
 * every other surah opens with it as an unnumbered header.
 */
export const needsBasmalah = (n: number) => n !== 1 && n !== 9

/** Abdul Basit from everyayah.com is the default voice, then the equran.id voices. */
export const RECITER_LIST: readonly Reciter[] = [
  { key: 'ab', name: 'Abdul Basit (murattal)', short: 'Abdul Basit' },
  { key: '01', name: 'Abdullah Al-Juhany', short: 'Abdullah Al-Juhany' },
  { key: '02', name: 'Abdul Muhsin Al-Qasim', short: 'Abdul Muhsin Al-Qasim' },
  { key: '03', name: 'Abdurrahman as-Sudais', short: 'Abdurrahman as-Sudais' },
  { key: '04', name: 'Ibrahim Al-Dossari', short: 'Ibrahim Al-Dossari' },
  { key: '05', name: 'Misyari Rasyid Al-Afasi', short: 'Misyari Rasyid Al-Afasi' },
  { key: '06', name: 'Yasser Al-Dosari', short: 'Yasser Al-Dosari' },
]

export const isReciterKey = (k: unknown): k is ReciterKey => RECITER_LIST.some((r) => r.key === k)

export const reciterName = (k: ReciterKey) => (RECITER_LIST.find((r) => r.key === k) || RECITER_LIST[0]).short

/** Arabic size steps in px for the settings sample. */
export const AR_STEPS: readonly number[] = [26.9, 32, 38, 45.3, 53.8, 64]
