// Juz starts in the standard Hafs (Madani) mushaf, bundled as a static table.
// Juz 7 starts at 5:82 (some tables give 5:83): checked against the per-ayat
// juz numbers on quranwbw.com, which agree with the other 29 entries.
export const JUZ: readonly (readonly [number, number])[] = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
]

/** The last juz whose start is not after (surah, ayat). */
export function juzOf(surah: number, ayat: number): number {
  let j = 1
  for (let i = 0; i < JUZ.length; i++) {
    const [s, a] = JUZ[i]
    if (s < surah || (s === surah && a <= ayat)) j = i + 1
    else break
  }
  return j
}

/** "Juz 22 dan 23", "Juz 1 sampai 3" or "Juz 30". */
export function juzRange(surah: number, count: number): string {
  const a = juzOf(surah, 1)
  const b = juzOf(surah, count)
  if (a === b) return `Juz ${a}`
  if (b === a + 1) return `Juz ${a} dan ${b}`
  return `Juz ${a} sampai ${b}`
}

/** Map from ayat number to juz number for every juz that starts inside this surah. */
export function juzStartsIn(surah: number): Map<number, number> {
  const m = new Map<number, number>()
  JUZ.forEach(([s, a], i) => {
    if (s === surah) m.set(a, i + 1)
  })
  return m
}

// ------------------------------------------------------------ hizb
// U+06DE in teksArab marks a hizb quarter. The reader shows it as a star break
// above the ayat and removes it from the Arabic line.
const HIZB_MARK = '۞'

export const hasHizbMark = (teksArab: string) => teksArab.includes(HIZB_MARK)

export const stripHizbMark = (teksArab: string) => teksArab.replace(/۞\s?/g, '').trim()
