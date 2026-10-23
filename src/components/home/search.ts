// The home search run (home.js update()): an ayat reference first, then the
// ranked surahs. Shared by the combobox and the index filter.
import type { SurahIndexItem } from '@/types'
import { SURAH_INDEX } from '@/data/surah-index'
import { parseRef, searchSurah } from '@/lib/search'

/** Options shown in the listbox before "Lihat semua hasil". */
export const MAKS = 6

/** True when the meaning only repeats the Latin name (Yasin, Maryam, Luqman), so it is not shown twice. */
export const sameName = (s: Pick<SurahIndexItem, 'arti' | 'namaLatin'>) => s.arti.trim().toLowerCase() === s.namaLatin.trim().toLowerCase()

export const NO_MATCH = 'Tidak ada surah yang cocok. Coba nama lain atau nomor 1 sampai 114.'

export interface SearchRun {
  /** The trimmed query. */
  q: string
  ref: { surah: SurahIndexItem; ayat: number } | null
  results: readonly SurahIndexItem[]
}

/** What the index shows: the query and its matches (every surah when empty). */
export interface HomeFilter {
  q: string
  results: readonly SurahIndexItem[]
}

export type IndexTab = 'surah' | 'juz'

export function runSearch(raw: string): SearchRun {
  const q = raw.trim()
  const ref = q ? parseRef(q, SURAH_INDEX) : null
  // A run of one repeated letter ("zzzz") collapses to a single letter in the
  // shared search key and would match everything with that letter.
  let results: readonly SurahIndexItem[] = !q ? SURAH_INDEX : /^([a-z])\1+$/i.test(q) ? [] : searchSurah(SURAH_INDEX, q)
  if (ref && !results.some((s) => s.nomor === ref.surah.nomor)) results = [ref.surah, ...results]
  return { q, ref, results }
}
