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

// API Response types
export interface EquranApiResponse {
  code: number
  message: string
  data: any
}

export interface SurahListResponse extends EquranApiResponse {
  data: Surah[]
}

export interface SurahDetailResponse extends EquranApiResponse {
  data: Surah
}
