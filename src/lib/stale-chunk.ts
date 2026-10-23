// After a deploy, a tab that stayed open can ask for a route chunk the new
// build no longer has. Vercel answers it with a 404 (vercel.json keeps
// /assets out of the SPA rewrite), the dynamic import fails, and the fix is a
// full load of the same URL, which brings the new index.html and its chunks.
import { sessionGet, sessionSet } from './storage'

const KEY = 'qd:chunkReload'
const STALE = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload|MIME type/i

export const isStaleChunkError = (err: unknown) => STALE.test(err instanceof Error ? err.message : String(err))

/**
 * Loads `url` (the current page by default) once. A second failure within 10 s
 * is left alone, so a chunk that is really missing cannot reload forever, and
 * so is a failure while offline, where a reload would only lose the page.
 */
export function reloadForStaleChunk(url?: string): boolean {
  if (!navigator.onLine) return false
  const last = Number(sessionGet(KEY) || 0)
  if (Date.now() - last < 10000) return false
  sessionSet(KEY, String(Date.now()))
  if (url) location.assign(url)
  else location.reload()
  return true
}
