// Prayer names, methods and the default place, without the adhan library, so
// the settings panel can list the methods without pulling adhan into the shell.
import type { Place, PrayerKey, PrayerMethod } from '@/types'

export const DEFAULT_PLACE: Place = { lat: -6.2088, lng: 106.8456, label: 'Jakarta', isDefault: true }

export const PRAYERS: readonly { key: PrayerKey; name: string; notPrayer: boolean }[] = [
  { key: 'fajr', name: 'Subuh', notPrayer: false },
  { key: 'sunrise', name: 'Terbit', notPrayer: true },
  { key: 'dhuhr', name: 'Dzuhur', notPrayer: false },
  { key: 'asr', name: 'Ashar', notPrayer: false },
  { key: 'maghrib', name: 'Maghrib', notPrayer: false },
  { key: 'isha', name: 'Isya', notPrayer: false },
]

/** The settings choice, Kemenag first and default. */
export const METHODS: readonly [PrayerMethod, string][] = [
  ['kemenag', 'Kemenag'],
  ['muhammadiyah', 'Muhammadiyah'],
  ['mwl', 'Liga Muslim Dunia'],
]

/** The method sentence under the location row. */
export const METHOD_LINE: Record<PrayerMethod, string> = {
  kemenag: 'Metode Kemenag: Subuh 20°, Isya 18°, ihtiyat 2 menit.',
  muhammadiyah: 'Metode Muhammadiyah: Subuh 18°, Isya 18°, ihtiyat 1 menit setelah pembulatan.',
  mwl: 'Metode Liga Muslim Dunia: Subuh 18°, Isya 17°.',
}

export const isPrayerMethod = (v: unknown): v is PrayerMethod => v === 'kemenag' || v === 'muhammadiyah' || v === 'mwl'
