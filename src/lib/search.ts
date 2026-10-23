// Surah search (spec 6.5). Latin keys lose case, marks, punctuation, spaces and
// doubled letters ("Ali 'Imran", "ali imran" and "aliimran" meet); Arabic loses
// harakat and tatweel.
import type { SurahIndexItem } from '@/types'

export interface SearchItem {
  nomor: number
  nama: string
  namaLatin: string
  arti: string
}

const latinKey = (s: unknown) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.)\1+/g, '$1')

const arabicKey = (s: unknown) => String(s || '').replace(/[ً-ٰٟۖ-ۭـ\s]/g, '')

const bareName = (latin: string) => latinKey(String(latin).replace(/^(al|an|ar|as|asy|at|ad|adz|az|ath|ash)[-\s]/i, ''))

function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 9
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

/**
 * Ranked: exact number, exact name, name prefix, name part, meaning, then a
 * small spelling tolerance ("fatiha", "kahfi", "yaasiin"). An empty query
 * returns the list as it is.
 */
export function searchSurah<T extends SearchItem>(list: readonly T[], query: string): T[] {
  const q = String(query || '').trim()
  if (!q) return list.slice()
  if (/^\d{1,3}$/.test(q)) {
    const n = +q
    return list.filter((s) => String(s.nomor).startsWith(q)).sort((a, b) => (a.nomor === n ? -1 : b.nomor === n ? 1 : a.nomor - b.nomor))
  }
  if (/[؀-ۿ]/.test(q)) {
    const k = arabicKey(q)
    return k ? list.filter((s) => arabicKey(s.nama).includes(k)) : []
  }
  const k = latinKey(q)
  if (!k) return []
  const scored: [number, T][] = []
  for (const s of list) {
    const name = latinKey(s.namaLatin)
    const bare = bareName(s.namaLatin)
    const arti = latinKey(s.arti)
    let score = -1
    if (name === k || bare === k) score = 100
    else if (name.startsWith(k) || bare.startsWith(k)) score = 80
    else if (name.includes(k)) score = 60
    else if (arti.includes(k)) score = 40
    else if (k.length >= 4) {
      const d = Math.min(distance(k, name), distance(k, bare))
      if (d <= (k.length > 6 ? 2 : 1)) score = 30 - d
    }
    if (score >= 0) scored.push([score, s])
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].nomor - b[1].nomor).map((x) => x[1])
}

/**
 * Ayat reference in a query: "36:9", "36 9", "36.9", or a name and a number
 * ("yasin 9", "al-kahf:10"). Resolves to the best surah match; the ayat is not
 * range checked here.
 */
export function parseRef(q: string, index: readonly SurahIndexItem[]): { surah: SurahIndexItem; ayat: number } | null {
  let m = q.match(/^\s*(\d{1,3})\s*[:.\s]\s*(\d{1,3})\s*$/)
  if (m) {
    const n = +m[1]
    return n >= 1 && n <= 114 ? { surah: index[n - 1], ayat: +m[2] } : null
  }
  m = q.match(/^\s*(.*?[^\d\s:])\s*[:\s]\s*(\d{1,3})\s*$/)
  if (m) {
    const hit = searchSurah(index, m[1])[0]
    return hit ? { surah: hit, ayat: +m[2] } : null
  }
  return null
}
