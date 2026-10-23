// The single murattal player (QPlayer, lib/audio) and the reactive state the
// UI reads: status, surah, ayat, time, reciter, continuous, follow, repeat,
// gap and the end of surah offer. It survives route changes.
//
// The recitation trace moves every frame, so it is not reactive state: views
// that draw it subscribe with onProgress() and write the style themselves.
import { defineStore } from 'pinia'
import { computed, markRaw, ref, shallowRef, watch } from 'vue'
import type { PlayerDomStatus, PlayerPending, PlayerStateDetail, PlayerStatus, ReciterKey, Surah } from '@/types'
import { QPlayer, installSeekHandler, installSilentUnlock } from '@/lib/audio/q-player'
import { reciterName } from '@/lib/quran'
import { fmtClock } from '@/lib/util'
import { motionOK } from '@/lib/motion'
import { surahInfo } from '@/data/surah-index'
import { nav } from '@/composables/useNav'
import { useSettingsStore } from './settings'
import { useUiStore } from './ui'

export const usePlayerStore = defineStore('player', () => {
  const settings = useSettingsStore()
  const ui = useUiStore()
  const s0 = settings.settings
  const engine = markRaw(new QPlayer({ reciter: s0.reciter, gapMs: s0.gapMs, repeat: s0.repeat }))
  installSeekHandler(engine)
  installSilentUnlock(engine)

  // ------------------------------------------------------------ mirror
  const status = ref<PlayerStatus>('idle')
  const surah = shallowRef<Surah | null>(null)
  const ayat = ref<number | null>(null)
  /** The ayat that ended, while the end of surah offer (or the idle after one ayat) shows. */
  const finishedAyat = ref<number | null>(null)
  const pending = shallowRef<PlayerPending | null>(null)
  const plays = ref(1)
  const reciter = ref<ReciterKey>(engine.reciter)
  const continuous = ref(false)
  const repeat = ref(engine.repeat)
  const gapMs = ref(engine.gapMs)
  const switching = ref(false)
  const locked = ref(false)
  const error = ref<string | null>(null)
  /** The bar is shown (the root element carries has-player meanwhile). */
  const visible = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const follow = computed(() => settings.settings.follow)

  function sync() {
    status.value = engine.status
    surah.value = engine.surah
    ayat.value = engine.ayat
    pending.value = engine.pending
    plays.value = engine.plays
    reciter.value = engine.reciter
    continuous.value = engine.continuous
    repeat.value = engine.repeat
    gapMs.value = engine.gapMs
    switching.value = engine.switching
    locked.value = engine.locked
    error.value = engine.error
  }

  // ------------------------------------------------------------ progress
  const progressFns = new Set<(f: number) => void>()
  let lastFraction = 0
  /** Fraction of the current ayat played, from the audio element. */
  const fraction = () => {
    const a = engine.audio
    return a.duration && isFinite(a.duration) ? a.currentTime / a.duration : 0
  }
  function paint(f: number) {
    lastFraction = Math.max(0, Math.min(1, f))
    progressFns.forEach((fn) => fn(lastFraction))
  }
  /**
   * Called with 0 to 1 on every frame while playing (once a second with reduced
   * motion), 0 when an ayat starts loading and 1 when it ends. The callback
   * gets the current value at once. Returns an unsubscribe function.
   */
  function onProgress(fn: (f: number) => void) {
    progressFns.add(fn)
    fn(lastFraction)
    return () => {
      progressFns.delete(fn)
    }
  }
  /** Paints the trace from the audio position again (after a row's state was reset). */
  const repaint = () => paint(fraction())

  function paintTime() {
    const a = engine.audio
    currentTime.value = a.currentTime || 0
    duration.value = a.duration || 0
  }

  let raf = 0
  let lastSec = -1
  function startLoop() {
    if (raf) return
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const a = engine.audio
      const d = a.duration
      if (!d || !isFinite(d)) return
      const sec = Math.floor(a.currentTime)
      if (motionOK()) paint(a.currentTime / d)
      else if (sec !== lastSec) paint(a.currentTime / d)
      if (sec !== lastSec) {
        lastSec = sec
        paintTime()
      }
    }
    raf = requestAnimationFrame(tick)
  }
  function stopLoop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  // ------------------------------------------------------------ state
  let lastAyat: number | null = null
  let lastPlays = 0

  function show() {
    if (visible.value) return
    visible.value = true
  }
  function hide() {
    if (!visible.value) return
    visible.value = false
    // A replay of the same ayat after the bar closed is announced again.
    lastAyat = null
  }
  watch(visible, (v) => document.documentElement.classList.toggle('has-player', v))

  engine.addEventListener('state', (e) => {
    const d = (e as CustomEvent<PlayerStateDetail>).detail
    finishedAyat.value = d.finished ?? null
    sync()
    if (d.status === 'idle' && !engine.ayat) {
      hide()
      stopLoop()
      return
    }
    if (d.status === 'loading' && (d.ayat !== lastAyat || engine.plays !== lastPlays)) {
      lastAyat = d.ayat
      lastPlays = engine.plays
      paint(0)
      ui.announce(`Memutar ayat ${d.ayat}`)
    }
    if (d.status === 'error') {
      const msg = engine.locked ? 'Pemutaran berhenti saat layar terkunci.' : d.error && /Ketuk/.test(d.error) ? d.error : `Audio ayat ${d.ayat} gagal dimuat.`
      ui.announce(msg)
    }
    if (d.status === 'finished' && engine.surah) ui.announce(`${surahInfo(engine.surah.nomor).namaLatin} selesai dibaca.`)
    show()
    paintTime()
    if (d.status === 'playing') startLoop()
    else stopLoop()
  })
  engine.addEventListener('traceend', () => paint(1))

  settings.onChange((st, patch) => {
    if ('reciter' in patch) engine.setReciter(st.reciter)
    if ('gapMs' in patch) engine.gapMs = st.gapMs
    if ('repeat' in patch) engine.repeat = st.repeat
    if ('continuous' in patch && engine.ayat) engine.setContinuous(st.continuous)
    sync()
  })

  // ------------------------------------------------------------ actions
  /** Loads the surah (stopping another one) and plays ayat n. False when offline. */
  function playAyat(s: Surah, n: number, opts: { continuous?: boolean } = {}): boolean {
    if (!navigator.onLine) {
      const msg = 'Audio butuh koneksi internet.'
      ui.toast(msg)
      ui.announce(msg)
      return false
    }
    engine.load(s)
    engine.play(n, { continuous: opts.continuous ?? settings.settings.continuous })
    return true
  }

  const toggle = () => engine.toggle()
  const pause = () => engine.pause()
  const resume = () => engine.resume()
  const retry = () => engine.retry()
  const next = () => engine.next()
  const prev = () => engine.prev()

  /** The bar's play button: nothing while the end of surah offer shows or nothing is loaded. */
  function barToggle() {
    if (engine.status === 'finished' || (engine.status === 'idle' && !engine.ayat)) return
    engine.toggle()
  }

  /** Stops and closes the bar. */
  function stop() {
    engine.stop()
    hide()
  }

  /** The bar's text action: the next surah after the offer, resume after a lock, else retry. */
  function barAction() {
    if (engine.status === 'finished') playNextSurah()
    else if (engine.locked) engine.resume()
    else engine.retry()
  }

  /** "Putar <surah>": the only route change that continues playback. */
  function playNextSurah() {
    const nx = engine.surah?.selanjutnya
    if (nx) nav(`/surah/${nx.nomor}`, null, { autoplay: nx.nomor, via: 'pn', dir: 'next' })
  }

  function toggleRepeat() {
    const on = engine.repeat !== 0
    settings.set({ repeat: on ? 0 : 3 })
    ui.toast(on ? 'Ulangi ayat mati.' : 'Ayat diulang 3 kali.')
  }

  /** The reader passes the fresh surah after a reload so the player uses it (same surah only). */
  function attachSurah(s: Surah) {
    if (engine.surah && engine.surah.nomor === s.nomor) {
      engine.surah = s
      surah.value = s
    }
  }

  /** True when ayat of surah n are loaded in the player (playing, paused, waiting, failed). */
  const isSurah = (n: number) => !!surah.value && surah.value.nomor === n

  // The reader registers how to scroll back to the playing ayat; the bar's
  // title calls it on tablet and desktop.
  let backFn: (() => void) | null = null
  function onBackToAyat(fn: () => void) {
    backFn = fn
    return () => {
      if (backFn === fn) backFn = null
    }
  }
  function backToAyat() {
    backFn?.()
  }

  // ------------------------------------------------------------ bar text
  // Everything the bar shows, as data. The bar picks title.phone below 600.
  const info = computed(() => (surah.value ? surahInfo(surah.value.nomor) : null))
  const total = computed(() => surah.value?.ayat.length ?? 0)
  /** The ayat the bar talks about. */
  const shownAyat = computed(() => ayat.value || finishedAyat.value || 1)
  const playingLike = computed(() => status.value === 'playing' || status.value === 'loading' || status.value === 'waiting')
  const reciterShort = computed(() => reciterName(reciter.value))
  const timeText = computed(() => `${fmtClock(currentTime.value)} / ${fmtClock(duration.value)}`)

  const bar = computed(() => {
    const st = status.value
    const i = info.value
    const n = shownAyat.value
    const tot = total.value
    const name = i ? i.namaLatin : ''
    let sub = reciterShort.value
    if (repeat.value) sub += repeat.value === -1 ? ' · ulang terus' : ` · ulang ${Math.min(plays.value, repeat.value)} dari ${repeat.value}`
    // The phone bar has no room for "putar beruntun" (the player sheet shows it).
    let subPhone = sub
    if (!repeat.value && continuous.value) sub += ' · putar beruntun'
    let msg: string | null = null
    let action: string | null = null
    if (st === 'loading') sub = subPhone = switching.value ? 'Mengganti qari' : `Memuat ayat ${n}`
    if (st === 'waiting' && pending.value) sub = subPhone = pending.value.again ? `Mengulang ayat ${pending.value.n}` : `Berikutnya ayat ${pending.value.n}`
    if (st === 'error') {
      if (locked.value) {
        msg = 'Pemutaran berhenti saat layar terkunci.'
        action = `Lanjut dari ayat ${n}`
      } else if (error.value && /Ketuk/.test(error.value)) {
        msg = error.value
        action = 'Putar'
      } else {
        msg = `Audio ayat ${n} gagal dimuat.`
        action = 'Coba lagi'
      }
    }
    let title = { phone: `${name} · Ayat ${n}/${tot}`, wide: `${name} · Ayat ${n} dari ${tot}` }
    if (st === 'finished') {
      const nx = surah.value?.selanjutnya
      msg = nx ? `${name} selesai. Lanjut ke ${nx.namaLatin}?` : `${name} selesai. Ini surah terakhir dalam mushaf.`
      action = nx ? `Putar ${nx.namaLatin}` : null
      title = { phone: `${name} selesai`, wide: `${name} selesai` }
    }
    return {
      title,
      /** The line under the title: the message when there is one. */
      sub: msg || sub,
      /** The same line below 600 px, without " · putar beruntun". */
      subPhone: msg || subPhone,
      hasAction: !!action,
      action,
      /** Number in the bar medallion: the next ayat during the gap, none after the surah. */
      medNumber: st === 'finished' ? '' : st === 'waiting' && pending.value ? String(pending.value.n) : String(n),
      playingLike: playingLike.value,
      toggleLabel: playingLike.value ? `Jeda ayat ${n}` : `Lanjutkan ayat ${n}`,
      toggleDisabled: st === 'finished',
      prevDisabled: !ayat.value || n <= 1,
      nextDisabled: !ayat.value || n >= tot,
      repeatPressed: !!repeat.value,
      repeatBadge: repeat.value > 0 ? repeat.value + 'x' : repeat.value === -1 ? 'terus' : '',
      qariLabel: `Ganti qari, sekarang ${reciterShort.value}`,
    }
  })

  /** aria-label of the bar's title button: on the playing surah's reader, or elsewhere. */
  function nowLabel(onReader: boolean, phone: boolean) {
    const n = shownAyat.value
    const name = info.value ? info.value.namaLatin : ''
    return onReader ? (phone ? 'Buka pengaturan pemutar' : `Ke ayat ${n}`) : `Kembali ke ${name} ayat ${n}`
  }

  /**
   * data-status for tests: idle, loading, playing, paused or error. The gap
   * between ayat reads as playing (the bar shows pause), the end of surah offer
   * as idle (nothing is loaded).
   */
  const domStatus = computed<PlayerDomStatus>(() =>
    status.value === 'waiting' ? 'playing' : status.value === 'finished' ? 'idle' : status.value,
  )

  return {
    engine,
    status,
    domStatus,
    surah,
    ayat,
    finishedAyat,
    pending,
    plays,
    reciter,
    reciterShort,
    continuous,
    repeat,
    gapMs,
    follow,
    switching,
    locked,
    error,
    visible,
    currentTime,
    duration,
    timeText,
    shownAyat,
    total,
    playingLike,
    bar,
    nowLabel,
    onProgress,
    repaint,
    fraction,
    playAyat,
    toggle,
    pause,
    resume,
    retry,
    next,
    prev,
    barToggle,
    stop,
    barAction,
    playNextSurah,
    toggleRepeat,
    attachSurah,
    isSurah,
    onBackToAyat,
    backToAyat,
  }
})
