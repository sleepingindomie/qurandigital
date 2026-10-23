// Navigation with the prototype's page transitions, wrapped around Vue Router
// (app.js nav(), go() and handleRoute()). Home to reader is one View
// Transition: the old page fades out in 160 ms, the new one fades in over
// 200 ms, and the only shared elements are the tapped Latin name
// (surah-title) or the resume frame (surah-frame). Exits run before the route
// changes. Previous and next surah use the reader's own exit instead of a
// View Transition. Back and forward crossfade with no shared element except
// the row title on the way home. Without View Transitions, main fades out and
// in; with reduced motion every change is an instant swap.
//
// Every same-origin <a href> click goes through nav() (one listener on the
// document, as in the prototype), so plain anchors are all a view needs:
//   data-pn="prev|next"  previous or next surah with the reader exit
//   data-sec="indeks|waktu"  a home section; on home it only scrolls there
//   data-local  the link is handled by its own click handler, nav() skips it
import { computed, nextTick, shallowRef } from 'vue'
import type { NavigationFailure, RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { surahInfo, isSurahNumber } from '@/data/surah-index'
import { EASE_UI, hasViewTransitions, motionOK } from '@/lib/motion'

export type Via = 'cold' | 'back' | 'link' | 'row' | 'search' | 'frame' | 'pn'
export type PnDir = 'prev' | 'next'

/** How the current page was reached; read it when a view mounts or its params change. */
export interface Arrival {
  /** cold: first load; back: browser back or forward; link, row, search, frame, pn: through nav(). */
  via: Via
  dir: PnDir | null
  /** Surah number to start playing on arrival ("Putar <surah>" at the end of a surah). */
  autoplay: number | null
  /** The resume frame travelled here, so the reader frame must not draw itself. */
  viaFrame: boolean
  /** Changes on every navigation. */
  seq: number
}

export interface NavOptions {
  via?: Via
  dir?: PnDir
  autoplay?: number
}

interface Pending {
  via: Via
  source: Element | null
  dir: PnDir | null
  autoplay: number | null
}

interface InFlight {
  ctx: Arrival
  useVT: boolean
  isFirst: boolean
  /** The browser already animated this back or forward (a swipe gesture), so the swap stays instant. */
  uaVT: boolean
}

let router: Router | null = null
let pending: Pending | null = null
// Per navigation (the same location object reaches beforeResolve and
// afterEach), so a navigation cancelled by a quick second tap cannot take the
// arrival of the one that replaced it.
const inflight = new WeakMap<RouteLocationNormalized, InFlight>()
let busy = false
let first = true
let quiet = false
let seq = 0
// Set by the popstate that starts a back or forward, read once by its beforeResolve.
let uaVT = false
const homeScroll = { y: 0 }
let pnExit: ((dir: PnDir) => Promise<unknown>) | null = null
// A View Transition's update waits here until its own navigation has rendered.
const waiting = new WeakMap<RouteLocationNormalized, () => void>()

const arrivalRef = shallowRef<Arrival>({ via: 'cold', dir: null, autoplay: null, viaFrame: false, seq: 0 })
export const arrival = computed(() => arrivalRef.value)

const mainEl = () => document.getElementById('main')
const rendered = (to: RouteLocationNormalized) => new Promise<void>((r) => waiting.set(to, r))
const release = (to: RouteLocationNormalized) => {
  waiting.get(to)?.()
  waiting.delete(to)
}

/**
 * Navigate with the transition. `source` is the element tapped (an index row,
 * a search option, the resume link); it decides the shared element. Ignored
 * while an exit is still running.
 */
export function nav(to: string, source?: Element | null, opts: NavOptions = {}): Promise<void> {
  if (!router || busy) return Promise.resolve()
  useUiStore().closePanel({ silent: true })
  let via = opts.via
  if (!via && source) {
    if (source.closest('.resume')) via = 'frame'
    else if (source.closest('.q-list')) via = 'search'
    else if (source.closest('.index, .juz-g')) via = 'row'
  }
  pending = { via: via || 'link', source: source ?? null, dir: opts.dir ?? null, autoplay: opts.autoplay ?? null }
  return go(to)
}

async function go(to: string) {
  const r = router
  if (!r || busy) return
  const target = r.resolve(to)
  // The prototype re-renders when the hash is already the target; same here,
  // without a second history entry.
  const same = target.fullPath === r.currentRoute.value.fullPath
  try {
    await r.push(same ? { path: target.path, query: target.query, hash: target.hash, force: true, replace: true } : target.fullPath)
  } finally {
    pending = null
  }
}

/**
 * Replace the URL without a transition, a scroll or a panel close: the search
 * query in ?q= and the tab in ?tab=juz. The view stays mounted and sees the new
 * route, so watchers on route.query must accept their own writes.
 */
export async function replaceQuiet(to: RouteLocationRaw): Promise<void> {
  if (!router) return
  quiet = true
  try {
    await router.replace(to)
  } finally {
    quiet = false
  }
}

/** The reader registers its previous and next exit (spec #12, #13); returns an unregister function. */
export function registerPnExit(fn: (dir: PnDir) => Promise<unknown>): () => void {
  pnExit = fn
  return () => {
    if (pnExit === fn) pnExit = null
  }
}

/** Runs fn `delay` ms after the next navigation lands (a home section reached from another page). */
function afterNav(fn: () => void, delay = 260): void {
  if (!router) return
  const off = router.afterEach(() => {
    off()
    setTimeout(fn, delay)
  })
}

/** Home sections reached from the bar and the menu: switches the index tab, then scrolls. */
function scrollToSection(sec: string, href: string): void {
  if (href.includes('tab=juz')) {
    const t = document.getElementById('tab-juz')
    if (t && t.getAttribute('aria-selected') !== 'true') t.click()
  } else if (sec === 'indeks') {
    const t = document.getElementById('tab-surah')
    if (t && t.getAttribute('aria-selected') !== 'true') t.click()
  }
  document.getElementById(sec)?.scrollIntoView({ block: 'start' })
}

// ------------------------------------------------------------ router hooks

type Styled = HTMLElement | SVGElement
const styled = (n: Element | null): Styled | null => (n instanceof HTMLElement || n instanceof SVGElement ? n : null)

async function beforeResolve(to: RouteLocationNormalized, from: RouteLocationNormalized): Promise<boolean> {
  if (quiet) return true
  const ui = useUiStore()
  const p = pending
  pending = null
  ui.closePanel({ silent: true })
  const isFirst = first
  const via: Via = p ? p.via : isFirst ? 'cold' : 'back'

  // Exits run before the route changes, only for navigations started by nav().
  if (p && !isFirst) {
    busy = true
    try {
      if (p.via === 'pn' && from.name === 'surah') {
        if (pnExit) await pnExit(p.dir ?? 'next')
      } else if (!hasViewTransitions() && motionOK()) {
        const m = mainEl()
        if (m && m.animate)
          await m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE_UI, fill: 'forwards' }).finished.catch(() => {})
      }
    } finally {
      busy = false
    }
  }

  if (from.name === 'home') homeScroll.y = scrollY
  const ctx: Arrival = { via, dir: p?.dir ?? null, autoplay: p?.autoplay ?? null, viaFrame: via === 'frame', seq: ++seq }
  const ua = via === 'back' && uaVT
  uaVT = false
  const useVT = hasViewTransitions() && motionOK() && !isFirst && via !== 'pn' && !ua
  inflight.set(to, { ctx, useVT, isFirst, uaVT: ua })
  if (!useVT) return true

  // The one shared element on the old page: the tapped Latin name or the resume frame.
  if (p && p.source && to.name === 'surah') {
    let named: Styled | null = null
    if (p.via === 'frame') named = styled(document.querySelector('.resume .frame-svg'))
    else if (p.via === 'row' || p.via === 'search') named = styled(p.source.matches('.r-nm, .o-name') ? p.source : p.source.querySelector('.r-nm, .o-name'))
    if (named) named.style.viewTransitionName = p.via === 'frame' ? 'surah-frame' : 'surah-title'
  }
  const root = document.documentElement
  root.classList.add('vt-nav')
  return new Promise<boolean>((resolve) => {
    let vt: ViewTransition
    try {
      vt = document.startViewTransition(async () => {
        // The old page is captured by now; the new one renders from here.
        resolve(true)
        await rendered(to)
      })
    } catch {
      root.classList.remove('vt-nav')
      resolve(true)
      return
    }
    vt.ready.catch(() => {})
    vt.finished
      .catch(() => {})
      .finally(() => {
        root.classList.remove('vt-nav')
        document.querySelectorAll('.r-nm, .o-name, .resume .frame-svg').forEach((n) => {
          const s = styled(n)
          if (s) s.style.viewTransitionName = ''
        })
      })
  })
}

async function afterEach(to: RouteLocationNormalized, from: RouteLocationNormalized, failure?: NavigationFailure | void) {
  // Quiet writes never reach the inflight map (beforeResolve skips them).
  const f = inflight.get(to)
  inflight.delete(to)
  if (failure || !f) {
    if (f) {
      first = false
      undoExit()
    }
    release(to)
    return
  }
  // Only a navigation that landed changes the arrival. This runs before the
  // new view renders, so it reads the arrival of its own navigation.
  arrivalRef.value = f.ctx
  await nextTick()
  swapped(to, from, f)
  first = false
  release(to)
}

// A navigation cancelled after its exit ran (another one started meanwhile)
// would leave the page faded out: drop the exits, which are the only script
// animations here that fill forwards.
function undoExit() {
  const main = mainEl()
  if (!main) return
  for (const a of main.getAnimations({ subtree: true })) if (a.effect?.getTiming().fill === 'forwards') a.cancel()
}

// What the prototype's swap() did once the new page is in place.
function swapped(to: RouteLocationNormalized, from: RouteLocationNormalized, f: InFlight) {
  const root = document.documentElement
  const main = mainEl()
  if (main) main.getAnimations().forEach((a) => a.cancel())
  root.dataset.route = String(to.name || 'home')
  document.title = titleFor(to)
  // Scroll: back to home restores the index position, every other arrival starts at the top.
  if (to.name === 'home' && !to.query.q && from.name && from.name !== 'home') scrollTo(0, homeScroll.y)
  else if (to.name === 'home' && to.query.q) requestAnimationFrame(() => document.getElementById('indeks')?.scrollIntoView())
  else scrollTo(0, 0)
  // The row title is the shared element only inside this navigation's View
  // Transition, which clears it when done; named outside one it would linger.
  if (f.useVT && to.name === 'home' && from.name === 'surah') {
    const nm = styled(document.querySelector(`.rows .row[data-surah="${String(from.params.n)}"] .r-nm`))
    if (nm) {
      const r = nm.getBoundingClientRect()
      if (r.bottom > 0 && r.top < innerHeight) nm.style.viewTransitionName = 'surah-title'
    }
  }
  if (!f.useVT && !f.isFirst && !f.uaVT && !hasViewTransitions() && motionOK() && f.ctx.via !== 'pn' && main && main.animate)
    main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_UI })
  if (import.meta.env.DEV) devAssert()
}

function titleFor(to: RouteLocationNormalized) {
  if (to.name === 'surah') {
    const n = Number(to.params.n)
    if (isSurahNumber(n)) return `${surahInfo(n).namaLatin} · Al-Quran Digital`
  }
  if (to.name === 'tanda') return 'Ditandai · Al-Quran Digital'
  return 'Al-Quran Digital'
}

// Development check: no Arabic element, and no ancestor of one, may carry a
// view-transition-name (spec 5.3).
function devAssert() {
  requestAnimationFrame(() => {
    for (const named of Array.from(document.querySelectorAll('.pl-title, .frame-svg, .r-nm, .o-name'))) {
      const vt = getComputedStyle(named).viewTransitionName
      if (vt && vt !== 'none' && named.querySelector('[lang="ar"]')) console.error('view-transition-name di atas teks Arab', named)
    }
  })
}

// ------------------------------------------------------------ links

function onLinkClick(e: MouseEvent) {
  if (!router || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const t = e.target
  if (!(t instanceof Element)) return
  const a = t.closest('a[href]')
  if (!(a instanceof HTMLAnchorElement) || 'local' in a.dataset || (a.getAttribute('href') || '').startsWith('#')) return
  if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return
  const url = new URL(a.href, location.href)
  if (url.origin !== location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return
  e.preventDefault()
  const href = url.pathname + url.search + url.hash
  const sec = a.dataset.sec
  if (sec && router.currentRoute.value.name === 'home') {
    useUiStore().closePanel({ silent: true })
    scrollToSection(sec, href)
    return
  }
  if (sec) {
    if (busy) return
    pending = { via: 'link', source: null, dir: null, autoplay: null }
    afterNav(() => scrollToSection(sec, href))
    go(href)
    return
  }
  const pn = a.dataset.pn
  if (pn === 'prev' || pn === 'next') {
    nav(href, a, { via: 'pn', dir: pn })
    return
  }
  const src = a.querySelector('.r-nm') || a
  nav(href, a.classList.contains('rs-link') ? a : src)
}

/** Called once from main.ts before app.use(router), so the first navigation is covered. */
export function installNav(r: Router): void {
  router = r
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  // Capture phase, so this runs before Vue Router's own popstate listener
  // starts the navigation. Safari 18 and Chrome on Android set the flag after a
  // swipe back or forward that the browser has already animated.
  addEventListener(
    'popstate',
    (e) => {
      uaVT = (e as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition === true
    },
    { capture: true },
  )
  r.beforeResolve(beforeResolve)
  r.afterEach(afterEach)
  document.addEventListener('click', onLinkClick)
}
