// History routes: "/" with ?q= and ?tab=juz, "/surah/:n" and "/surah/:n/:ayat"
// (older /surah/:number links keep working), and "/tanda".
// Unknown paths and surah numbers outside 1 to 114 go to "/"; an ayat outside
// the surah is the reader's to handle (it opens at ayat 1 with a toast).
// Scrolling and page transitions are composables/useNav.ts, so there is no
// scrollBehavior here: it would fight the reader's own ayat scrolling.
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, RouteParamsGeneric } from 'vue-router'
import { isSurahNumber } from '@/data/surah-index'
import { isStaleChunkError, reloadForStaleChunk } from '@/lib/stale-chunk'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    {
      path: '/surah/:n(\\d+)/:ayat(\\d+)?',
      name: 'surah',
      component: () => import('@/views/SurahView.vue'),
    },
    { path: '/tanda', name: 'tanda', component: () => import('@/views/TandaView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// Up to three digits each and surah 1 to 114, else home. A global guard, since
// beforeEnter skips param changes (/surah/36 to /surah/999).
router.beforeEach((to: RouteLocationNormalized) => {
  if (to.name !== 'surah') return true
  const { n } = parseSurahParams(to.params)
  const digits = (v: unknown) => /^\d{1,3}$/.test(String(v))
  if (!isSurahNumber(n) || !digits(to.params.n) || (to.params.ayat && !digits(to.params.ayat))) return { path: '/', replace: true }
  return true
})

// A route chunk from the previous deploy is gone: load the target URL in full
// instead of leaving the tap without effect.
router.onError((err, to) => {
  if (isStaleChunkError(err)) reloadForStaleChunk(to.fullPath)
})

/** The surah number and the ayat (null when the route has none) from route params. */
export function parseSurahParams(params: RouteParamsGeneric): { n: number; ayat: number | null } {
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v)
  const n = Number(one(params.n))
  const a = one(params.ayat)
  return { n, ayat: a === undefined || a === '' ? null : Number(a) }
}

export default router
