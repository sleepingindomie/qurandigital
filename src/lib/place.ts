// The place the prayer times are for: Jakarta until the reader asks for their
// own location (never on load). A granted position is kept in qd:place.
import type { LocateError, LocateErrorCode, Place } from '@/types'
import { DEFAULT_PLACE } from './prayer-meta'

const PLACE_KEY = 'qd:place'

export function savedPlace(): Place {
  try {
    const p = JSON.parse(localStorage.getItem(PLACE_KEY) || 'null') as Partial<Place> | null
    if (p && typeof p.lat === 'number' && typeof p.lng === 'number') return { label: 'Lokasi kamu', ...p, lat: p.lat, lng: p.lng, isDefault: false }
  } catch {
    // unreadable: Jakarta
  }
  return DEFAULT_PLACE
}

export function forgetPlace(): Place {
  try {
    localStorage.removeItem(PLACE_KEY)
  } catch {
    // ignore
  }
  return DEFAULT_PLACE
}

const FAIL: Record<number, [LocateErrorCode, string]> = {
  1: ['denied', 'Izin lokasi ditolak. Jadwal tetap memakai Jakarta sampai izin diberikan di pengaturan peramban.'],
  2: ['unavailable', 'Lokasi belum bisa ditemukan. Jadwal memakai Jakarta.'],
  3: ['timeout', 'Mencari lokasi terlalu lama. Coba lagi sebentar.'],
}

/** Resolves with the device position (and stores it); rejects with a LocateError in Indonesian. */
export function locate(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      const err: LocateError = { code: 'unsupported', message: 'Peramban ini tidak mendukung lokasi. Jadwal memakai Jakarta.' }
      reject(err)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const place: Place = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Lokasi kamu', isDefault: false }
        try {
          localStorage.setItem(PLACE_KEY, JSON.stringify(place))
        } catch {
          // ignore
        }
        resolve(place)
      },
      (e) => {
        const [code, message] = FAIL[e.code] || ['unavailable', 'Lokasi belum bisa ditemukan. Jadwal memakai Jakarta.']
        const err: LocateError = { code, message }
        reject(err)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

export const isLocateError = (e: unknown): e is LocateError =>
  !!e && typeof e === 'object' && 'message' in e && 'code' in e && typeof (e as LocateError).message === 'string'
