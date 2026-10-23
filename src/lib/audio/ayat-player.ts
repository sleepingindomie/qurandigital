// Per-ayat recitation: one audio element plays while a second one preloads the
// next ayat, so continuous play moves on without a gap. Emits "state" on every
// change and "time" while playing; also drives the Media Session controls.
import type { ApiReciterKey, PlayOptions, PlayerStateDetail, PlayerStatus, ReciterKey, Surah } from '@/types'

export const hasMediaSession = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator

export class AyatPlayer extends EventTarget {
  audio: HTMLAudioElement
  spare: HTMLAudioElement
  surah: Surah | null = null
  ayat: number | null = null
  reciter: ReciterKey
  continuous = false
  status: PlayerStatus = 'idle'
  error: string | null = null

  constructor({ reciter = '05' }: { reciter?: ReciterKey } = {}) {
    super()
    this.audio = new Audio()
    this.spare = new Audio()
    this.audio.preload = 'auto'
    this.spare.preload = 'auto'
    this.reciter = reciter
    this.bind(this.audio)
    this.bind(this.spare)
    this.session()
  }

  private bind(el: HTMLAudioElement) {
    el.addEventListener('playing', () => el === this.audio && this.set('playing'))
    el.addEventListener('waiting', () => el === this.audio && !el.paused && this.set('loading'))
    el.addEventListener('ended', () => el === this.audio && this.ended())
    el.addEventListener('timeupdate', () => {
      if (el !== this.audio) return
      this.dispatchEvent(new CustomEvent('time', { detail: { ayat: this.ayat, current: el.currentTime, duration: el.duration || 0 } }))
    })
    el.addEventListener('error', () => {
      if (el !== this.audio || !el.getAttribute('src')) return
      this.error = 'Audio gagal dimuat. Periksa koneksi lalu coba lagi.'
      this.set('error')
    })
  }

  url(n: number): string | null {
    const a = this.surah && this.surah.ayat[n - 1]
    return a ? a.audio[this.reciter as ApiReciterKey] || null : null
  }

  /** Keeps playing across pages: loading another surah only stops the old one. */
  load(surah: Surah) {
    if (this.surah && this.surah.nomor !== surah.nomor) this.stop()
    this.surah = surah
  }

  play(n: number, opts: PlayOptions = {}) {
    if (!this.surah) return
    if (opts.continuous !== undefined) this.continuous = opts.continuous
    const src = this.url(n)
    if (!src) return
    this.ayat = n
    this.error = null
    if (this.spare.getAttribute('src') === src) {
      const old = this.audio
      this.audio = this.spare
      this.spare = old
      old.pause()
    } else {
      this.audio.pause()
      this.audio.setAttribute('src', src)
    }
    try {
      this.audio.currentTime = 0
    } catch {
      // not seekable yet
    }
    this.set('loading')
    const p = this.audio.play()
    if (p)
      p.catch((err: unknown) => {
        const name = err instanceof Error || err instanceof DOMException ? err.name : ''
        if (name === 'AbortError') return
        this.error = name === 'NotAllowedError' ? 'Ketuk tombol putar untuk mulai mendengarkan.' : 'Audio gagal diputar.'
        this.set('error')
      })
    this.preloadNext()
    this.metadata()
  }

  preloadNext() {
    const next = this.continuous && this.ayat ? this.url(this.ayat + 1) : null
    if (next && this.spare.getAttribute('src') !== next) {
      this.spare.setAttribute('src', next)
      this.spare.load()
    }
  }

  pause() {
    this.audio.pause()
    if (this.ayat) this.set('paused')
  }

  resume() {
    if (!this.ayat) return
    this.audio.play().catch(() => {})
  }

  toggle() {
    if (this.status === 'playing' || this.status === 'loading') this.pause()
    else if (this.ayat) this.resume()
  }

  stop() {
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.spare.removeAttribute('src')
    this.ayat = null
    this.continuous = false
    this.set('idle')
  }

  next() {
    if (this.surah && this.ayat && this.ayat < this.surah.ayat.length) this.play(this.ayat + 1)
  }

  prev() {
    if (this.ayat && this.ayat > 1) this.play(this.ayat - 1)
  }

  setReciter(key: ReciterKey) {
    if (key === this.reciter) return
    this.reciter = key
    this.spare.removeAttribute('src')
    if (this.ayat && (this.status === 'playing' || this.status === 'loading')) this.play(this.ayat)
    else this.set(this.status)
  }

  setContinuous(on: boolean) {
    this.continuous = on
    if (on) this.preloadNext()
    this.set(this.status)
  }

  ended() {
    if (this.surah && this.ayat && this.continuous && this.ayat < this.surah.ayat.length) return this.play(this.ayat + 1)
    const finished = this.ayat ?? undefined
    this.ayat = null
    this.continuous = false
    this.set('idle', { finished })
  }

  set(status: PlayerStatus, extra: Partial<PlayerStateDetail> = {}) {
    this.status = status
    const detail: PlayerStateDetail = {
      status,
      ayat: this.ayat,
      surah: this.surah && this.surah.nomor,
      reciter: this.reciter,
      continuous: this.continuous,
      error: this.error,
      ...extra,
    }
    this.dispatchEvent(new CustomEvent<PlayerStateDetail>('state', { detail }))
    if (hasMediaSession()) navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'none'
  }

  metadata() {
    if (!hasMediaSession() || !this.surah || typeof MediaMetadata === 'undefined') return
    navigator.mediaSession.metadata = new MediaMetadata({ title: `${this.surah.namaLatin}, ayat ${this.ayat}`, artist: '', album: 'Al-Quran Digital' })
  }

  private session() {
    if (!hasMediaSession()) return
    const on = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
      try {
        navigator.mediaSession.setActionHandler(action, fn)
      } catch {
        // action not supported here
      }
    }
    on('play', () => this.resume())
    on('pause', () => this.pause())
    on('stop', () => this.stop())
    on('nexttrack', () => this.next())
    on('previoustrack', () => this.prev())
  }
}
