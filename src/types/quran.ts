// Quran data as the app uses it. Field names are the camelCase keys that
// equran.id v2 sends; the one mapping from the API lives in lib/api.ts.

/** "ab" is Abdul Basit from everyayah.com, 01 to 06 are the equran.id voices. */
export type ReciterKey = 'ab' | '01' | '02' | '03' | '04' | '05' | '06'
export type ApiReciterKey = Exclude<ReciterKey, 'ab'>
export type AudioMap = Partial<Record<ApiReciterKey, string>>

export interface Reciter {
  key: ReciterKey
  name: string
  short: string
}

/** One row of the bundled index (src/data/surah-index.ts). */
export interface SurahIndexItem {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
}

/** The neighbour a surah response names (suratSebelumnya, suratSelanjutnya). */
export interface SurahRef {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
}

export interface Ayat {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  audio: AudioMap
}

/** A surah from /surat: the index fields plus the description (tags stripped). */
export interface SurahSummary extends SurahIndexItem {
  deskripsi: string
  audioFull: AudioMap
}

/**
 * A surah from /surat/{n}. The API's suratSebelumnya and suratSelanjutnya
 * (false at either end of the mushaf) become sebelumnya and selanjutnya, or
 * null.
 */
export interface Surah extends SurahSummary {
  ayat: Ayat[]
  sebelumnya: SurahRef | null
  selanjutnya: SurahRef | null
}

/** Kemenag tafsir of one surah: ayat number to text. */
export type Tafsir = Map<number, string>

// ------------------------------------------------------------ API shapes

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface ApiSurahSummary {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  deskripsi: string
  audioFull?: AudioMap
}

export interface ApiAyat {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  audio?: AudioMap
}

export interface ApiSurah extends ApiSurahSummary {
  ayat: ApiAyat[]
  suratSebelumnya?: SurahRef | false
  suratSelanjutnya?: SurahRef | false
}

export interface ApiTafsirItem {
  ayat: number
  teks: string
}

export interface ApiTafsir extends ApiSurahSummary {
  tafsir: ApiTafsirItem[]
}
