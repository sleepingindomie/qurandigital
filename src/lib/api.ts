// equran.id v2 client with an in-memory cache per session and the surah list
// kept in localStorage for 30 days. Every request is cut off after 8 seconds
// with an AbortController, so an abandoned request does not race a retry.
import type { ApiSurah, ApiSurahSummary, ApiTafsir, ApiResponse, Ayat, Surah, SurahSummary, Tafsir } from '@/types'

const API = 'https://equran.id/api/v2'
const TIMEOUT_MS = 8000
const LIST_KEY = 'qd:surat:v2'
const LIST_TTL = 30 * 24 * 60 * 60 * 1000

type ApiErrorCode = 'timeout' | 'http' | 'invalid' | 'network'

class ApiError extends Error {
  code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

async function getJSON<T>(path: string): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(API + path, { signal: ctrl.signal })
    if (!res.ok) throw new ApiError('http', 'HTTP ' + res.status)
    const body = (await res.json()) as ApiResponse<T>
    if (body.code !== 200 || !body.data) throw new ApiError('invalid', 'Respons tidak valid')
    return body.data
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (ctrl.signal.aborted) throw new ApiError('timeout', 'timeout')
    throw new ApiError('network', err instanceof Error ? err.message : 'network')
  } finally {
    clearTimeout(timer)
  }
}

const stripHtml = (s: unknown) =>
  String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

function mapSummary(s: ApiSurahSummary): SurahSummary {
  return {
    nomor: s.nomor,
    nama: s.nama,
    namaLatin: s.namaLatin,
    jumlahAyat: s.jumlahAyat,
    tempatTurun: s.tempatTurun,
    arti: s.arti,
    deskripsi: stripHtml(s.deskripsi),
    audioFull: s.audioFull || {},
  }
}

function mapSurah(data: ApiSurah): Surah {
  return {
    ...mapSummary(data),
    ayat: data.ayat.map(
      (a): Ayat => ({
        nomorAyat: a.nomorAyat,
        teksArab: a.teksArab,
        teksLatin: a.teksLatin,
        teksIndonesia: a.teksIndonesia,
        audio: a.audio || {},
      }),
    ),
    sebelumnya: data.suratSebelumnya || null,
    selanjutnya: data.suratSelanjutnya || null,
  }
}

const lists = new Map<'list', SurahSummary[]>()
const surahs = new Map<number, Surah>()
const tafsirs = new Map<number, Tafsir>()

interface StoredList {
  t: number
  list: SurahSummary[]
}

export async function getSurahList(): Promise<SurahSummary[]> {
  const mem = lists.get('list')
  if (mem) return mem
  try {
    const cached = JSON.parse(localStorage.getItem(LIST_KEY) || 'null') as StoredList | null
    if (cached && Date.now() - cached.t < LIST_TTL && cached.list && cached.list.length === 114) {
      lists.set('list', cached.list)
      return cached.list
    }
  } catch {
    // unreadable cache: fetch again
  }
  const list = (await getJSON<ApiSurahSummary[]>('/surat')).map(mapSummary)
  lists.set('list', list)
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify({ t: Date.now(), list }))
  } catch {
    // ignore
  }
  return list
}

/** A surah already fetched in this session, without touching the network. */
export const peekSurah = (n: number): Surah | null => surahs.get(n) || null

export async function getSurah(n: number): Promise<Surah> {
  const mem = surahs.get(n)
  if (mem) return mem
  const surah = mapSurah(await getJSON<ApiSurah>(`/surat/${n}`))
  surahs.set(n, surah)
  return surah
}

/** Kemenag tafsir per ayat, as a Map from ayat number to text. */
export async function getTafsir(n: number): Promise<Tafsir> {
  const mem = tafsirs.get(n)
  if (mem) return mem
  const data = await getJSON<ApiTafsir>(`/tafsir/${n}`)
  const map: Tafsir = new Map(data.tafsir.map((t) => [t.ayat, t.teks]))
  tafsirs.set(n, map)
  return map
}

/** Tafsir text split into paragraphs on blank lines, as the reader shows it. */
export const tafsirParagraphs = (text: string | undefined) =>
  String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
