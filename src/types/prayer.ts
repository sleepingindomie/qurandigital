// Prayer times, places and zones.

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export type PrayerMethod = 'kemenag' | 'muhammadiyah' | 'mwl'

export interface Place {
  lat: number
  lng: number
  label: string
  isDefault: boolean
}

export interface PrayerTime {
  key: PrayerKey
  name: string
  /** Terbit is listed but is not a prayer. */
  notPrayer: boolean
  time: Date
}

/** IANA zone used to compute and format, and the label shown (WIB, WITA, WIT or GMT+n). */
export interface PrayerZone {
  tz: string
  label: string
}

export interface PrayerStatus {
  zone: PrayerZone
  today: PrayerTime[]
  /** The latest time already passed; before Subuh it is last night's Isya. */
  current: PrayerTime
  /** The first time still ahead; after Isya it is tomorrow's Subuh. */
  next: PrayerTime
  /** Elapsed share of the current interval, 0 to 1. */
  fraction: number
  untilNext: number
  dayKey: string
}

/** One cell of the six-cell strip, with its now, next and past state. */
export interface PrayerCell {
  key: PrayerKey
  name: string
  time: string
  isNow: boolean
  isNext: boolean
  isPast: boolean
  /** "sekarang", "sudah terbit", "berikutnya" or empty. */
  word: string
  /** scaleX of the interval line, 0 unless this is the current cell. */
  line: number
}

export type LocateErrorCode = 'unsupported' | 'denied' | 'unavailable' | 'timeout'

export interface LocateError {
  code: LocateErrorCode
  message: string
}
