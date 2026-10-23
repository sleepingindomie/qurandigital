<script setup lang="ts">
// The surah reader: plate, Basmalah, ayat rows rendered in chunks with per-ayat
// intrinsic sizes and the deep link window, juz and hizb breaks, the running
// head, last read, audio follow with the "Kembali ke ayat" pill, the
// recitation trace, tafsir, the ayat menu and the end of surah block.
// SurahView mounts one instance per navigation (keyed), so every piece of
// state here starts fresh for each surah.
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import type { PlayerStateDetail, Surah } from '@/types'
import type { Arrival, PnDir } from '@/composables/useNav'
import { registerPnExit, replaceQuiet } from '@/composables/useNav'
import { useEventListener } from '@/composables/useEventListener'
import UiPanel from '@/components/ui/UiPanel.vue'
import ReaderBar from './ReaderBar.vue'
import ReaderPlate from './ReaderPlate.vue'
import AyatList from './AyatList.vue'
import JuzBreak from './JuzBreak.vue'
import ReaderSkeleton from './ReaderSkeleton.vue'
import EndBlock from './EndBlock.vue'
import AyatMenu from './AyatMenu.vue'
import TafsirBody from './TafsirBody.vue'
import { estimateRow } from './row-size'
import { playAllState, rowStates } from './row-state'
import type { PlayerView, RowState } from './row-state'
import { PANEL, useUiStore } from '@/stores/ui'
import type { ClosePanelOptions } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useReadingStore } from '@/stores/reading'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { surahInfo } from '@/data/surah-index'
import { hasHizbMark, juzOf, juzStartsIn, stripHizbMark } from '@/lib/juz'
import { BASMALAH, BASMALAH_ID, needsBasmalah } from '@/lib/quran'
import { EASE_STD, EASE_UI, cubicBezier, motionOK } from '@/lib/motion'
import { barHeight, bp } from '@/lib/breakpoint'
import { idle } from '@/lib/util'
import { LoadError } from '@/lib/surah-loader'

const props = defineProps<{ n: number; ayat: number | null; arrival: Arrival }>()

const ui = useUiStore()
const settings = useSettingsStore()
const reading = useReadingStore()
const library = useLibraryStore()
const player = usePlayerStore()

// The instance belongs to one surah: SurahView remounts it on every navigation.
const n = props.n
const info = surahInfo(n)
const M = info.jumlahAyat
const prevI = n > 1 ? surahInfo(n - 1) : null
const nextI = n < 114 ? surahInfo(n + 1) : null
const juzAt = juzStartsIn(n)
const anchorSupported = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('overflow-anchor', 'auto')
const easeStd = cubicBezier(0.2, 0, 0, 1)
let alive = true

// Opening another surah stops playback and closes the bar, unless it was opened
// to play on ("Putar <surah>").
if (player.surah && player.surah.nomor !== n && props.arrival.autoplay !== n) player.stop()

// ------------------------------------------------------------ elements
const plate = ref<InstanceType<typeof ReaderPlate> | null>(null)
const rootEl = ref<HTMLElement | null>(null)
const readEl = ref<HTMLElement | null>(null)
const list = ref<InstanceType<typeof AyatList> | null>(null)
const listEl = computed(() => list.value?.el ?? null)
const statusEl = ref<HTMLElement | null>(null)
const errH = ref<HTMLElement | null>(null)

const rowEl = (k: number) => listEl.value?.querySelector<HTMLElement>(`#ayat-${k}`) ?? null

// ------------------------------------------------------------ data and rows
const surah = shallowRef<Surah | null>(null)
const view = ref<'none' | 'skeleton' | 'error'>('none')
const errOffline = ref(false)
const lo = ref(0)
const hi = ref(0)
const ended = ref(false)

// contain-intrinsic-size per ayat, estimated again when the size, Latin,
// translation or breakpoint changes.
const sizes = computed(() => {
  const s = surah.value
  if (!s) return []
  const st = settings.settings
  const opts = { arabicStep: st.arabicStep, latin: st.latin, translation: st.translation }
  const b = ui.bp
  return s.ayat.map((a) => estimateRow(a, b, opts))
})

// ------------------------------------------------------------ player state
const here = computed(() => !!surah.value && player.isSurah(n))
const pv = computed<PlayerView | null>(() =>
  here.value
    ? { status: player.status, ayat: player.ayat, pending: player.pending, switching: player.switching, continuous: player.continuous }
    : null,
)
const states = computed<Map<number, RowState>>(() => (pv.value ? rowStates(pv.value) : new Map()))
const playAll = computed(() => {
  const p = pv.value
  return playAllState(p && (p.ayat || p.status === 'waiting') ? p : null)
})
const playingHere = () => player.isSurah(n) && !!player.ayat

// ------------------------------------------------------------ running head
const startAyat0 = props.ayat && props.ayat >= 1 && props.ayat <= M ? props.ayat : 1
const topAyat = ref(startAyat0)
const following = ref(true)

// While recitation of this surah is followed, the head names the ayat being
// recited; otherwise the top-most ayat in the reading band.
const headAyat = computed(() =>
  player.isSurah(n) && player.ayat && following.value && settings.settings.follow ? player.ayat : topAyat.value,
)
const rhPos = computed(() => {
  const k = headAyat.value
  const j = juzOf(n, k)
  return ui.bp === 'phone' ? `Ayat ${k} · Juz ${j}` : `Ayat ${k} dari ${M} · Juz ${j}`
})
const posText = computed(() =>
  view.value === 'error' ? 'Ayat belum dimuat' : surah.value ? `Ayat ${headAyat.value} dari ${M}` : 'Memuat ayat',
)
const progress = computed(() => (headAyat.value / M).toFixed(4))

// A sliver of the previous ayat left under the bar does not count: the band
// starts 32 px below the bar.
const visible = new Set<number>()
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const k = Number((e.target as HTMLElement).dataset.n)
      if (e.isIntersecting) visible.add(k)
      else visible.delete(k)
    }
    if (visible.size) topAyat.value = Math.min(...visible)
  },
  { rootMargin: `-${barHeight() + 32}px 0px -60% 0px` },
)
const observed = new WeakSet<Element>()
function observeRows() {
  listEl.value?.querySelectorAll('.ayah').forEach((el) => {
    if (observed.has(el)) return
    observed.add(el)
    io.observe(el)
  })
}

// ------------------------------------------------------------ last read
const tracker = reading.createTracker({ surah: n, total: M, topAyat: () => topAyat.value, ready: () => !!surah.value })

// ------------------------------------------------------------ about
const descTried = ref(false)
let aboutOpen = false
const aboutText = computed(
  () => surah.value?.deskripsi || library.deskripsi(n) || (descTried.value ? 'Keterangan surah belum tersedia.' : 'Memuat keterangan surah.'),
)
// The /surat list is fetched only when "Tentang surah ini" is open and the
// surah itself did not bring a description.
function needDesc() {
  if (!aboutOpen || surah.value?.deskripsi || library.deskripsi(n)) return
  if (!surah.value && view.value !== 'error') return
  library.loadDescriptions().then(() => {
    if (alive) descTried.value = true
  })
}
function onAbout(open: boolean) {
  aboutOpen = open
  needDesc()
}

// ------------------------------------------------------------ scrolling
let programmatic = false
let pendingTarget: number | null = null
let userMoved = false
let tween = 0
let touching = false
let moved = false
let followEligible = false

function scrollToRow(k: number, instant = false) {
  const row = rowEl(k)
  if (!row) return
  const target = Math.max(0, scrollY + row.getBoundingClientRect().top - barHeight() - 16)
  const start = scrollY
  let d = target - start
  cancelAnimationFrame(tween)
  programmatic = true
  if (instant || !motionOK()) {
    scrollTo(0, target)
    requestAnimationFrame(() => (programmatic = false))
    return
  }
  let from = start
  if (Math.abs(d) > 1.5 * innerHeight) {
    from = target - Math.sign(d) * innerHeight * 0.5
    scrollTo(0, from)
    d = target - from
  }
  const dur = Math.min(640, Math.max(360, 360 + 0.2 * Math.abs(d)))
  const t0 = performance.now()
  const stepT = (now: number) => {
    const p = Math.min(1, (now - t0) / dur)
    scrollTo(0, from + d * easeStd(p))
    if (p < 1) tween = requestAnimationFrame(stepT)
    else requestAnimationFrame(() => (programmatic = false))
  }
  tween = requestAnimationFrame(stepT)
}

function inBand(k: number) {
  const row = rowEl(k)
  if (!row) return false
  const top = row.getBoundingClientRect().top
  return top >= barHeight() + 16 - 2 && top <= innerHeight * 0.6
}

/** Renders up to ayat k when it is outside the rendered window. */
function ensureRendered(k: number): Promise<void> {
  if (!surah.value || (k >= lo.value && k <= hi.value)) return Promise.resolve()
  if (k > hi.value) hi.value = k
  else lo.value = k
  return nextTick().then(observeRows)
}

// ------------------------------------------------------------ the pill
const pill = reactive({ text: '', hidden: true, on: false })
let pillWant = false
let pillTimer: ReturnType<typeof setTimeout> | undefined
function showPill(k: number) {
  pill.text = `Kembali ke ayat ${k}`
  if (!pill.hidden && pill.on) return
  pillWant = true
  clearTimeout(pillTimer)
  pill.hidden = false
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (pillWant) pill.on = true
    }),
  )
}
function hidePill() {
  if (pill.hidden) return
  pillWant = false
  pill.on = false
  const done = () => {
    if (!pillWant) pill.hidden = true
  }
  clearTimeout(pillTimer)
  if (motionOK()) pillTimer = setTimeout(done, 170)
  else done()
}

// ------------------------------------------------------------ user scroll and follow
function userScrolled(e?: Event) {
  const t = e?.target
  if (t instanceof Element && t.closest('.panel, .q-list')) return
  userMoved = true
  tracker.manual()
  pendingTarget = null
  if (programmatic) {
    cancelAnimationFrame(tween)
    programmatic = false
  }
  if (!playingHere() || !settings.settings.follow) return
  if (following.value) {
    following.value = false
    if (player.ayat) showPill(player.ayat)
  }
}

const SCROLL_KEYS = ['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' ']
function onKey(e: KeyboardEvent) {
  if (e.key === ' ' && player.ayat) return
  if (!SCROLL_KEYS.includes(e.key)) return
  const t = e.target instanceof Element ? e.target : null
  if (t && (t.closest('input,textarea,select,[role="radiogroup"],[role="tablist"],[role="menu"],.panel') || (e.key === ' ' && t.closest('button,a')))) return
  userScrolled(e)
}

useEventListener(window, 'wheel', userScrolled, { passive: true })
useEventListener(window, 'keydown', onKey)
useEventListener(
  window,
  'touchstart',
  () => {
    touching = true
    moved = false
  },
  { passive: true },
)
useEventListener(
  window,
  'touchmove',
  (e) => {
    if (moved) return
    moved = true
    userScrolled(e)
  },
  { passive: true },
)
useEventListener(window, 'touchend', () => (touching = false), { passive: true })
useEventListener(window, 'touchcancel', () => (touching = false), { passive: true })
// A press on the page scrollbar.
useEventListener(document, 'pointerdown', (e) => {
  const de = document.documentElement
  if (e.target === de && e.clientX > de.clientWidth) userScrolled()
})

function follow(k: number) {
  if (!settings.settings.follow) return
  if (!following.value) {
    // Following comes back when the user's own scroll keeps the playing row
    // in the band for one ayat change.
    if (followEligible) {
      following.value = true
      hidePill()
    } else {
      followEligible = inBand(k)
      showPill(k)
      return
    }
  }
  followEligible = false
  if (ui.panelOpen || document.hidden || touching) return
  const sel = getSelection()
  if (sel && !sel.isCollapsed && readEl.value && readEl.value.contains(sel.anchorNode)) return
  const ae = document.activeElement
  if (ae && ae.matches('input,textarea,select')) return
  if (inBand(k)) return
  ensureRendered(k).then(() => scrollToRow(k))
}

function backToAyat() {
  const k = player.ayat
  if (!k) return
  following.value = true
  hidePill()
  ensureRendered(k).then(() => scrollToRow(k))
}
const offBack = player.onBackToAyat(backToAyat)

useEventListener(document, 'visibilitychange', () => {
  if (document.hidden || !following.value || !playingHere() || !settings.settings.follow) return
  const k = player.ayat!
  ensureRendered(k).then(() => scrollToRow(k, true))
})

// Player events of this surah: follow the new ayat and write last read.
let lastPlayAyat: number | null = null
useEventListener(player.engine, 'state', (e) => {
  const d = (e as CustomEvent<PlayerStateDetail>).detail
  if (!surah.value || !player.isSurah(n)) return
  if (d.status === 'loading' && d.ayat !== lastPlayAyat) {
    lastPlayAyat = d.ayat
    if (d.ayat) {
      follow(d.ayat)
      tracker.fromAudio(d.ayat, following.value)
    }
  }
  if (d.status === 'idle' || d.status === 'finished') {
    lastPlayAyat = null
    hidePill()
    following.value = true
  }
})

// ------------------------------------------------------------ the recitation trace
let traceK = 0
let traceEl: SVGElement | null = null
function traceFor(k: number) {
  if (traceK !== k || !traceEl || !traceEl.isConnected) {
    traceK = k
    traceEl = rowEl(k)?.querySelector<SVGElement>('.trace') ?? null
  }
  return traceEl
}
const offProgress = player.onProgress((f) => {
  const k = player.ayat
  if (!k || !player.isSurah(n)) return
  const t = traceFor(k)
  if (t) t.style.strokeDashoffset = String(100 - 100 * f)
})
// A paused player runs no frames, so paint the trace again from the audio
// position whenever the rows change.
function repaintTrace() {
  const st = player.status
  if (playingHere() && (st === 'paused' || st === 'playing' || st === 'loading')) player.repaint()
}
let painted: number[] = []
watch(
  states,
  (m) => {
    for (const k of painted) {
      const t = rowEl(k)?.querySelector<SVGElement>('.trace')
      if (t) t.style.strokeDashoffset = ''
    }
    painted = [...m.keys()]
    repaintTrace()
  },
  { flush: 'post' },
)
watch([lo, hi], repaintTrace, { flush: 'post' })

// ------------------------------------------------------------ flash
const flashState = ref<{ k: number; kind: 'flash' | 'flash-static' } | null>(null)
let flashT1: ReturnType<typeof setTimeout> | undefined
let flashT2: ReturnType<typeof setTimeout> | undefined
function flash(k: number) {
  clearTimeout(flashT1)
  clearTimeout(flashT2)
  flashState.value = null
  nextTick(() => {
    const row = rowEl(k)
    if (!alive || !row) return
    void row.offsetWidth
    const kind = motionOK() ? 'flash' : 'flash-static'
    flashState.value = { k, kind }
    const clear = () => {
      if (flashState.value && flashState.value.k === k) flashState.value = null
    }
    if (kind === 'flash-static') flashT1 = setTimeout(clear, 1500)
    flashT2 = setTimeout(clear, 1900)
  })
}

// ------------------------------------------------------------ actions
function startAyat(k: number, opts: { continuous?: boolean; force?: boolean } = {}) {
  const s = surah.value
  if (!s) return
  following.value = true
  hidePill()
  if (playingHere() && player.ayat === k && !opts.force) {
    player.toggle()
    return
  }
  player.playAyat(s, k, opts.continuous === undefined ? {} : { continuous: opts.continuous })
}

function togglePlayAll() {
  const s = surah.value
  if (!s) return
  if (player.isSurah(n) && (player.ayat || player.status === 'waiting')) {
    const busy = player.status === 'playing' || player.status === 'loading' || player.status === 'waiting'
    if (busy || player.continuous) {
      player.toggle()
      return
    }
  }
  following.value = true
  player.playAyat(s, 1, { continuous: true })
}

function onRowPlay(k: number) {
  if (states.value.get(k)?.cls.includes('is-failed')) player.retry()
  else startAyat(k)
}

// The medallion is a link to the ayat: the URL changes in place and the row flashes.
function onMed(k: number) {
  replaceQuiet(`/surah/${n}/${k}`)
  flash(k)
}

// ------------------------------------------------------------ tafsir
const tafsirAyat = ref<number | null>(null)
const sheetK = ref(1)
let tafsirOpener: HTMLElement | null = null

function openTafsir(k: number, opener: HTMLElement | null) {
  if (bp() === 'desk') {
    tafsirAyat.value = k
    tafsirOpener = opener
    plate.value?.openTafsir(k)
  } else {
    sheetK.value = k
    ui.openPanel(PANEL.tafsir, { opener })
  }
}

function closeTafsirPlate() {
  tafsirAyat.value = null
  plate.value?.closeTafsir()
  if (tafsirOpener && tafsirOpener.isConnected) tafsirOpener.focus({ preventScroll: true })
}

// ------------------------------------------------------------ ayat menu
const MENU = ['Putar dari ayat ini', 'Ulangi ayat ini', 'Tafsir', 'Salin ayat', 'Bagikan tautan', 'Tandai terakhir dibaca'] as const
const menuK = ref(1)
let menuOpener: HTMLElement | null = null

function openMenu(k: number, opener: HTMLElement) {
  menuK.value = k
  menuOpener = opener
  ui.openPanel(PANEL.ayatMenu, { anchor: opener, opener })
}

function pickMenu(i: number, close: (opts?: ClosePanelOptions) => void) {
  const k = menuK.value
  const t = MENU[i]
  close({ silent: t === 'Tafsir' })
  if (t === 'Putar dari ayat ini') startAyat(k, { continuous: true, force: true })
  else if (t === 'Ulangi ayat ini') {
    settings.set({ repeat: 3 })
    startAyat(k, { force: true })
  } else if (t === 'Tafsir') openTafsir(k, menuOpener)
  else if (t === 'Salin ayat') copyAyat(k)
  else if (t === 'Bagikan tautan') share(k)
  else {
    reading.setLastRead({ surah: n, ayat: k })
    ui.toast('Ditandai sebagai terakhir dibaca.')
  }
}

function copyAyat(k: number) {
  const a = surah.value?.ayat[k - 1]
  if (!a) return
  const parts = [stripHizbMark(a.teksArab)]
  if (settings.settings.latin) parts.push(a.teksLatin)
  parts.push(a.teksIndonesia, `QS ${info.namaLatin} ${n}:${k}`)
  const fail = () => ui.toast('Ayat belum bisa disalin.')
  if (navigator.clipboard) navigator.clipboard.writeText(parts.join('\n\n')).then(() => ui.toast('Ayat disalin.'), fail)
  else fail()
}

function share(k: number) {
  const url = `${location.origin}${import.meta.env.BASE_URL}surah/${n}/${k}`
  if (navigator.share) navigator.share({ title: `QS ${info.namaLatin} ${n}:${k}`, url }).catch(() => {})
  else if (navigator.clipboard)
    navigator.clipboard.writeText(url).then(
      () => ui.toast('Tautan disalin'),
      () => ui.toast(url),
    )
}

// ------------------------------------------------------------ settings: keep the top ayat in place
let anchor: { k: number; top: number } | null = null
const layoutPatch = (p: object) => 'arabicStep' in p || 'latin' in p || 'translation' in p
const offBefore = settings.beforeChange((patch) => {
  if (!layoutPatch(patch)) return
  const r = rowEl(topAyat.value)
  anchor = r ? { k: topAyat.value, top: r.getBoundingClientRect().top } : null
})
const offChange = settings.onChange((s, patch) => {
  if (layoutPatch(patch))
    // After the new size estimates are in the DOM.
    nextTick(() => {
      const a = anchor
      anchor = null
      const r = a && rowEl(a.k)
      if (!a || !r) return
      const dy = r.getBoundingClientRect().top - a.top
      programmatic = true
      scrollTo(0, scrollY + dy)
      requestAnimationFrame(() => (programmatic = false))
    })
  if ('follow' in patch && !s.follow) hidePill()
})

// ------------------------------------------------------------ loading
// The skeleton shows only if the surah is not there after 300 ms, so a fast
// (cached) load never flashes grey bars. If it did show, it fades out in
// 160 ms and the ayat list fades in as one block in 200 ms.
let skT: ReturnType<typeof setTimeout> | undefined
function load() {
  view.value = 'none'
  let skShown = false
  clearTimeout(skT)
  skT = setTimeout(() => {
    if (!alive || surah.value) return
    view.value = 'skeleton'
    skShown = true
  }, 300)
  library.loadSurah(n).then(
    (s) => {
      clearTimeout(skT)
      if (!alive) return
      const st = statusEl.value
      if (!skShown || !motionOK() || !st || !st.animate) return show(s, false)
      const out = st.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE_UI, fill: 'forwards' })
      const go = () => {
        if (alive) show(s, true)
        nextTick(() => out.cancel())
      }
      out.finished.then(go, go)
    },
    (err: unknown) => {
      clearTimeout(skT)
      if (!alive) return
      errOffline.value = err instanceof LoadError ? err.offline : !navigator.onLine
      view.value = 'error'
      needDesc()
      nextTick(() => errH.value?.focus({ preventScroll: true }))
    },
  )
}

async function show(s: Surah, fadeIn: boolean) {
  surah.value = s
  view.value = 'none'
  const t = props.ayat
  let target: number | null = null
  if (t) {
    if (t >= 1 && t <= M) target = t
    else ui.toast(`Ayat ${t} tidak ada di ${info.namaLatin}.`)
  }
  if (target) {
    lo.value = Math.max(1, target - 6)
    hi.value = Math.min(M, target + 6)
  } else {
    lo.value = 1
    hi.value = Math.min(M, 12)
  }
  topAyat.value = target || 1
  // Development check: every juz that starts inside a surah starts on an ayat
  // that carries the hizb mark U+06DE.
  if (import.meta.env.DEV)
    for (const [a, j] of juzAt) if (a !== 1 && !hasHizbMark(s.ayat[a - 1]?.teksArab ?? '')) console.error(`Juz ${j} di ${info.namaLatin} ayat ${a} tanpa tanda hizb`)
  player.attachSurah(s)
  // Opening a surah and staying on ayat 1 counts after 3 s; a mistaken tap that leaves at once does not.
  tracker.start()
  needDesc()
  await nextTick()
  if (!alive) return
  observeRows()
  if (target) {
    const k = target
    pendingTarget = k
    requestAnimationFrame(() => {
      if (!alive) return
      scrollToRow(k, true)
      flash(k)
      rowEl(k)?.querySelector<HTMLElement>('a.med')?.focus({ preventScroll: true })
    })
  }
  if (fadeIn && listEl.value?.animate) listEl.value.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_UI })
  fillRest()
  if (props.arrival.autoplay === n) player.playAyat(s, 1, { continuous: true })
}

// The rest of the surah in idle time, 24 ayat at a time: down to the end
// first, then up to ayat 1 above a deep link window (scroll anchoring keeps
// the view still; without it the scroll position is corrected by hand).
function fillRest() {
  const step = async (dl: IdleDeadline | null) => {
    if (!alive) return
    const t0 = performance.now()
    const budget = () => performance.now() - t0 < 50 && (!dl || dl.timeRemaining() > 2 || performance.now() - t0 < 8)
    while (alive && hi.value < M && budget()) {
      hi.value = Math.min(M, hi.value + 24)
      await nextTick()
      observeRows()
      if (pendingTarget && !userMoved) scrollToRow(pendingTarget, true)
    }
    if (hi.value >= M) pendingTarget = null
    while (alive && hi.value >= M && lo.value > 1 && performance.now() - t0 < 50) {
      const before = document.documentElement.scrollHeight
      const y = scrollY
      lo.value = Math.max(1, lo.value - 24)
      await nextTick()
      if (!anchorSupported) scrollTo(0, y + document.documentElement.scrollHeight - before)
      observeRows()
    }
    if (!alive) return
    if (hi.value < M || lo.value > 1) idle(step)
    else ended.value = true
  }
  idle(step)
}

load()

// ------------------------------------------------------------ arrival and exit
// Exit for previous and next surah, run before the route changes.
function exitPN(dir: PnDir): Promise<unknown> {
  const r = rootEl.value
  if (!motionOK() || !r) return Promise.resolve()
  const dx = dir === 'prev' ? -16 : 16
  const anims: Animation[] = []
  r.querySelectorAll('.pl-title, .pl-arti, .pl-metac').forEach((t) =>
    anims.push(
      t.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: `translateX(${dx}px)` },
        ],
        { duration: 160, easing: EASE_STD, fill: 'forwards' },
      ),
    ),
  )
  r.querySelectorAll('.pl-ar, .frame-num, .read').forEach((t) =>
    anims.push(t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE_UI, fill: 'forwards' })),
  )
  return Promise.all(anims.map((a) => a.finished.catch(() => {})))
}
const offPn = registerPnExit(exitPN)

onMounted(() => {
  const a = props.arrival
  const r = rootEl.value
  if (a.via === 'pn' && motionOK() && r) {
    const dx = a.dir === 'prev' ? 16 : -16
    r.querySelectorAll('.pl-title, .pl-arti, .pl-metac').forEach((t) =>
      t.animate(
        [
          { opacity: 0, transform: `translateX(${dx}px)` },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 200, easing: EASE_STD },
      ),
    )
    r.querySelectorAll('.pl-ar, .frame-num, .read').forEach((t) =>
      t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_UI }),
    )
  } else if (a.via === 'row' || a.via === 'search' || a.via === 'link') plate.value?.drawFrame()
})

onBeforeUnmount(() => {
  alive = false
  ui.closePanel({ silent: true })
  io.disconnect()
  tracker.dispose()
  offProgress()
  offBack()
  offPn()
  offBefore()
  offChange()
  cancelAnimationFrame(tween)
  clearTimeout(skT)
  clearTimeout(flashT1)
  clearTimeout(flashT2)
  clearTimeout(pillTimer)
})
</script>

<template>
  <ReaderBar
    :info="info"
    :prev="prevI"
    :next="nextI"
    :pos="rhPos"
    :progress="progress"
    :play-busy="playAll.busy"
    :play-label="playAll.label"
    @play="togglePlayAll"
  />
  <div ref="rootEl" class="reader wrap" :data-surah="n">
    <ReaderPlate
      ref="plate"
      :n="n"
      :info="info"
      :prev="prevI"
      :next="nextI"
      :loaded="!!surah"
      :pos-text="posText"
      :progress="progress"
      :play-busy="playAll.busy"
      :play-label="playAll.label"
      :about-text="aboutText"
      @play="togglePlayAll"
      @about="onAbout"
      @tafsir-back="closeTafsirPlate"
    />
    <section id="bacaan" ref="readEl" class="read" :aria-label="`Teks surah ${info.namaLatin}`" tabindex="-1">
      <div class="pre">
        <JuzBreak v-if="juzAt.has(1) && n !== 1" :juz="juzAt.get(1)!" />
        <p v-if="n === 9" class="note-m">Surah ini dibuka tanpa Basmalah.</p>
      </div>
      <div v-if="needsBasmalah(n)" class="bas">
        <p class="bas-ar" lang="ar" dir="rtl">{{ BASMALAH }}</p>
        <p class="bas-id">{{ BASMALAH_ID }}</p>
      </div>
      <AyatList
        ref="list"
        :n="n"
        :name="info.namaLatin"
        :surah="surah"
        :lo="lo"
        :hi="hi"
        :states="states"
        :sizes="sizes"
        :tafsir-ayat="tafsirAyat"
        :flash="flashState"
        @play="onRowPlay"
        @tafsir="openTafsir"
        @menu="openMenu"
        @med="onMed"
      />
      <div ref="statusEl" class="rd-status">
        <ReaderSkeleton v-if="view === 'skeleton'" />
        <div v-else-if="view === 'error'" class="err" role="alert">
          <h2 ref="errH" class="err-h" tabindex="-1">
            {{ errOffline ? 'Surah ini belum tersimpan untuk dibaca offline.' : 'Surah ini belum bisa dimuat. Periksa koneksi lalu coba lagi.' }}
          </h2>
          <div class="err-acts">
            <button type="button" class="txt-btn primary" @click="load">Coba lagi</button>
            <a class="txt-link" href="/">Kembali ke daftar isi</a>
          </div>
        </div>
      </div>
      <div class="endblk" :hidden="!ended">
        <EndBlock
          v-if="ended && surah"
          :name="info.namaLatin"
          :next="surah.selanjutnya ? nextI : null"
          :prev="surah.sebelumnya ? prevI : null"
        />
      </div>
    </section>
  </div>

  <UiPanel :id="PANEL.ayatMenu" :title="`Ayat ${menuK}`" cls="panel-menu" v-slot="{ close }">
    <AyatMenu :label="`Menu ayat ${menuK}`" :items="MENU" @pick="(i) => pickMenu(i, close)" />
  </UiPanel>
  <UiPanel :id="PANEL.tafsir" :title="`Tafsir Kemenag, ayat ${sheetK}`" mode="sheet" cls="panel-tafsir">
    <TafsirBody :key="sheetK" :surah="n" :ayat="sheetK" />
  </UiPanel>

  <Teleport to="body">
    <button type="button" :class="['pill', { on: pill.on }]" :hidden="pill.hidden" @click="backToAyat">{{ pill.text }}</button>
  </Teleport>
</template>
