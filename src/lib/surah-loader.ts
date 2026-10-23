// Surah loading for the reader: stale while revalidate over a small
// localStorage LRU (the 6 most recently opened surahs) for offline reading,
// and the list of surahs that can be read offline.
import type { Surah } from '@/types'
import { getSurah, peekSurah } from './api'
import { readPref, writePref } from './storage'

const LRU_KEY = 'surahLru'
const MAX_CACHED = 6
const MAX_BYTES = 1.2e6
const keyFor = (n: number) => `qd:surah:${n}:v1`

const lru = (): number[] => {
  const v = readPref<unknown>(LRU_KEY, [])
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : []
}

const listeners = new Set<(list: number[]) => void>()

/** Surah numbers stored for offline reading, ascending. */
export function availableOffline(): number[] {
  return Array.from(new Set(lru())).sort((a, b) => a - b)
}

/** Called after the stored list changes; returns an unsubscribe function. */
export function onOfflineChange(fn: (list: number[]) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function remember(surah: Surah) {
  let json: string
  try {
    json = JSON.stringify(surah)
  } catch {
    return
  }
  if (json.length > MAX_BYTES) return
  const list = lru().filter((n) => n !== surah.nomor)
  list.unshift(surah.nomor)
  while (list.length > MAX_CACHED) {
    const old = list.pop()
    try {
      if (old) localStorage.removeItem(keyFor(old))
    } catch {
      // ignore
    }
  }
  const put = () => localStorage.setItem(keyFor(surah.nomor), json)
  try {
    put()
  } catch {
    // Quota: evict the oldest once and retry, else skip silently.
    const old = list.length > 1 ? list.pop() : null
    try {
      if (old) localStorage.removeItem(keyFor(old))
      put()
    } catch {
      list.shift()
    }
  }
  writePref(LRU_KEY, list)
  const now = availableOffline()
  listeners.forEach((fn) => fn(now))
}

function fromStorage(n: number): Surah | null {
  try {
    const s = JSON.parse(localStorage.getItem(keyFor(n)) || 'null') as Surah | null
    return s && Array.isArray(s.ayat) ? s : null
  } catch {
    return null
  }
}

// Serialising a long surah (Al-Baqarah is about 600 thousand characters) and
// writing it to localStorage blocks the main thread, so it runs after the
// reader has rendered, in idle time (QA fix 13).
const later = (fn: () => void) => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 2000 })
  else setTimeout(fn, 200)
}

export class LoadError extends Error {
  offline: boolean
  constructor(offline: boolean) {
    super('load')
    this.name = 'LoadError'
    this.offline = offline
  }
}

/**
 * Stale while revalidate: a copy from this session or from storage renders at
 * once and the network copy is kept for next time without re-rendering the
 * open reader. Rejects with LoadError (offline says whether the device is
 * offline) after the 8 second timeout or any failure.
 */
export async function loadSurah(n: number): Promise<Surah> {
  const mem = peekSurah(n)
  if (mem) {
    // Already fetched this session: still moves to the front of the LRU.
    later(() => remember(mem))
    return mem
  }
  const stored = fromStorage(n)
  const fresh = getSurah(n)
  if (stored) {
    fresh.then((s) => later(() => remember(s))).catch(() => {})
    return stored
  }
  try {
    const s = await fresh
    later(() => remember(s))
    return s
  } catch {
    throw new LoadError(!navigator.onLine)
  }
}
