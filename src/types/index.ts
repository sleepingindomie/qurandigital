// Type definitions untuk Al-Quran Digital

export interface Surah {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  deskripsi: string
  audioFull?: string
  ayat?: Ayah[]
}

export interface Ayah {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
}

export interface PrayerTime {
  name: string
  time: Date
  arabicName: string
}

export interface PrayerTimes {
  fajr: Date
  sunrise: Date
  dhuhr: Date
  asr: Date
  maghrib: Date
  isha: Date
}

export interface Location {
  latitude: number
  longitude: number
  city: string
  country: string
}

export interface Bookmark {
  id: string
  surahNumber: number
  surahName: string
  surahNameArabic: string
  ayahNumber: number
  textArabic: string
  translation: string
  timestamp: number
}

export interface AudioPlayerState {
  isPlaying: boolean
  currentSurah: Surah | null
  currentAyahIndex: number
  isRepeat: boolean
  playbackSpeed: number
  volume: number
}

// API Response types (snake_case dari equran.id API)
export interface EquranApiResponse {
  code: number
  message: string
  data: any
}

export interface SurahApiData {
  nomor: number
  nama: string
  nama_latin: string
  namaLatin?: string
  jumlah_ayat: number
  jumlahAyat?: number
  tempat_turun: string
  tempatTurun?: string
  arti: string
  deskripsi?: string
  audio?: string
  audioFull?: string
  ayat?: AyahApiData[]
}

export interface AyahApiData {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
}

export interface SurahListResponse extends EquranApiResponse {
  data: SurahApiData[]
}

export interface SurahDetailResponse extends EquranApiResponse {
  data: SurahApiData
}
