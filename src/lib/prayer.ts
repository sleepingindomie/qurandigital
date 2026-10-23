// Prayer times with adhan for the three methods of spec 6.6, the WIB, WITA and
// WIT zone from coordinates, and times computed and formatted in the place's
// own zone, so a phone set to another zone still shows the schedule of the place.
import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Rounding } from 'adhan'
import type { CalculationParameters } from 'adhan'
import type { Place, PrayerMethod, PrayerStatus, PrayerTime, PrayerZone } from '@/types'
import { PRAYERS } from './prayer-meta'

function paramsFor(method: PrayerMethod): CalculationParameters {
  if (method === 'mwl') return CalculationMethod.MuslimWorldLeague()
  const p = CalculationMethod.Other()
  p.madhab = Madhab.Shafi
  p.ishaAngle = 18
  if (method === 'muhammadiyah') {
    // Subuh at 18 degrees: Munas Tarjih XXXI (2020), applied by PP Muhammadiyah
    // decree 734/KEP/I.0/B/2021. Isya at 18 degrees and the ihtiyat from the
    // Pedoman Hisab Muhammadiyah, whose worked examples round each time up to
    // the whole minute and add one, and round terbit down then subtract one
    // (Subuh 03.47.35 becomes 03.49, terbit 05.11.38 becomes 05.10).
    p.fajrAngle = 18
    p.rounding = Rounding.Up
    p.adjustments = { fajr: 1, sunrise: -2, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 }
    return p
  }
  // Kemenag: Subuh 20, Isya 18, Shafi Asr, 2 minutes ihtiyat, nearest minute.
  p.fajrAngle = 20
  p.adjustments = { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 }
  return p
}

/** Zone from coordinates (spec 6.6). Outside Indonesia the device zone is used. */
function zoneFor(place: Pick<Place, 'lat' | 'lng'>): PrayerZone {
  const { lat, lng } = place
  const inID = lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141.5
  if (!inID) {
    const off = -new Date().getTimezoneOffset() / 60
    return { tz: Intl.DateTimeFormat().resolvedOptions().timeZone, label: 'GMT' + (off >= 0 ? '+' : '') + off }
  }
  if (lng >= 127.0) return { tz: 'Asia/Jayapura', label: 'WIT' }
  if (lng >= 118.7) return { tz: 'Asia/Makassar', label: 'WITA' }
  if (lng >= 115.8) return { tz: 'Asia/Makassar', label: 'WITA' }
  if (lng >= 114.4 && lat <= -7.9) return { tz: 'Asia/Makassar', label: 'WITA' }
  if (lng >= 114.4 && lat > -4.5 && lat <= -1.3) return { tz: 'Asia/Makassar', label: 'WITA' }
  return { tz: 'Asia/Jakarta', label: 'WIB' }
}

// Calendar date of `when` in zone tz, as a local Date at noon (adhan reads the
// local year, month and day of the Date it is given).
function dayIn(tz: string, when: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(when)
  const g = (t: Intl.DateTimeFormatPartTypes) => +(parts.find((p) => p.type === t)?.value ?? 0)
  return new Date(g('year'), g('month') - 1, g('day'), 12)
}

function timesOn(place: Place, method: PrayerMethod, day: Date): PrayerTime[] {
  const t = new PrayerTimes(new Coordinates(place.lat, place.lng), day, paramsFor(method))
  return PRAYERS.map((p) => ({ key: p.key, name: p.name, notPrayer: p.notPrayer, time: t[p.key] }))
}

/**
 * current: the latest time already passed (before Subuh it is still last
 * night's Isya; between Terbit and Dzuhur it is the Terbit entry, which is not
 * a prayer). next: the first time still ahead, tomorrow's Subuh after Isya.
 */
export function computePrayer(place: Place, method: PrayerMethod = 'kemenag', now = new Date()): PrayerStatus {
  const zone = zoneFor(place)
  const day = dayIn(zone.tz, now)
  const today = timesOn(place, method, day)
  let current: PrayerTime | null = null
  for (const p of today) if (p.time <= now) current = p
  if (!current) {
    const y = new Date(day)
    y.setDate(y.getDate() - 1)
    current = timesOn(place, method, y)[5]
  }
  let next = today.find((p) => p.time > now)
  if (!next) {
    const t = new Date(day)
    t.setDate(t.getDate() + 1)
    next = timesOn(place, method, t)[0]
  }
  const span = next.time.getTime() - current.time.getTime()
  const fraction = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - current.time.getTime()) / span)) : 0
  return { zone, today, current, next, fraction, untilNext: next.time.getTime() - now.getTime(), dayKey: day.toDateString() }
}

/** "17.47" in zone tz. */
export function fmtTime(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('id-ID', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const h = parts.find((p) => p.type === 'hour')?.value ?? ''
  const m = parts.find((p) => p.type === 'minute')?.value ?? ''
  return `${h}.${m}`
}

/** Gregorian date in Indonesian and the Umm al-Qura Hijri date shifted by hijriAdjust days. */
export function dateLine(now: Date, tz: string, hijriAdjust = 0): { g: string; h: string } {
  const g = new Intl.DateTimeFormat('id-ID', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
  let h = ''
  try {
    const shifted = new Date(now.getTime() + hijriAdjust * 864e5)
    h = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' })
      .format(shifted)
      .replace(/\s*(H|AH)$/i, '')
    h += ' H'
  } catch {
    h = ''
  }
  return { g, h }
}

export const isFridayIn = (tz: string, now = new Date()) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now) === 'Fri'

/** "2 jam 17 menit lagi", "45 menit lagi", "kurang dari 1 menit lagi". */
export function countdown(ms: number): string {
  if (ms < 60000) return 'kurang dari 1 menit lagi'
  const m = Math.ceil(ms / 60000)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return (h ? (mm ? `${h} jam ${mm} menit` : `${h} jam`) : `${mm} menit`) + ' lagi'
}

/** True when the device clock runs in another zone than the place. */
export const deviceDiffers = (tz: string) =>
  Intl.DateTimeFormat().resolvedOptions().timeZone !== tz &&
  new Date().toLocaleString('en-US', { timeZone: tz }) !== new Date().toLocaleString('en-US')
