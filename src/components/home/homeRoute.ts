// Home's own URL writes (?q= and ?tab=juz) and the moments the prototype would
// have rendered home again. The prototype rebuilt home on every real
// navigation and wrote ?q= and ?tab= with history.replaceState, which never
// re-rendered. Here the view stays mounted, so a navigation counts unless it
// is one of home's own quiet writes.
import { getCurrentScope, onScopeDispose } from 'vue'
import type { LocationQueryRaw, RouteLocationNormalized } from 'vue-router'
import router from '@/router'
import { replaceQuiet } from '@/composables/useNav'

/** The path of home's quiet write in flight, so the after hooks can skip it. */
let ownWrite: string | null = null

/** Replace the home URL quietly when it differs from the current one. */
export function writeHomeQuery(query: LocationQueryRaw): void {
  const cur = router.currentRoute.value
  if (cur.name !== 'home') return
  const target = router.resolve({ path: '/', query }).fullPath
  if (target === cur.fullPath) return
  ownWrite = target
  replaceQuiet({ path: '/', query }).finally(() => {
    if (ownWrite === target) ownWrite = null
  })
}

/** First value of a query entry as a string ('' when missing). */
export function queryString(v: unknown): string {
  const one = Array.isArray(v) ? v[0] : v
  return typeof one === 'string' ? one : ''
}

/**
 * Calls fn once a navigation has landed, unless it was one of home's quiet
 * writes: a new URL, or the same URL opened again (the wordmark on /). It
 * runs before the new page is painted (inside the View Transition's update).
 * Removed with the calling component.
 */
export function onHomeArrival(fn: (to: RouteLocationNormalized) => void): void {
  const off = router.afterEach((to, _from, failure) => {
    if (failure || to.fullPath === ownWrite) return
    fn(to)
  })
  if (getCurrentScope()) onScopeDispose(off)
}
