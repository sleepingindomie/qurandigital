// Small persistent state in localStorage under the "qd:" prefix. Every access is
// guarded, since storage can be missing, blocked or full.
const PREFIX = 'qd:'

export function readPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // full or blocked: the app keeps working from memory
  }
}

/** Once-per-session flags such as qd:drawn and qd:lineDrawn (full key, no prefix added). */
export function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function sessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // ignore
  }
}
