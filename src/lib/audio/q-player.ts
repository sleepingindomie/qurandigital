// The app's murattal engine: AyatPlayer with Abdul Basit from everyayah.com as
// the default voice, the pause between ayat, repeat, the end of surah offer,
// the locked screen state, retry with a cache bust, system pauses reaching the
// UI, steady lock screen controls and a silent unlock for iOS. One instance
// lives in the player store and survives route changes (spec 6.9).
import type { PlayOptions, PlayerPending, PlayerStateDetail, PlayerStatus, ReciterKey } from '@/types'
import { reciterName } from '../quran'
import { pad3 } from '../util'
import { AyatPlayer, hasMediaSession } from './ayat-player'

// Abdul Basit at 64 kbps when the reader asks to save data or the link is slow
// (one long Al-Baqarah ayat at 192 kbps runs to several MB), 192 kbps otherwise.
// Read per ayat, so a change of network applies from the next one.
function everyayahFolder(): string {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  const slow = !!c && (c.saveData === true || (!!c.effectiveType && c.effectiveType !== '4g'))
  return slow ? 'Abdul_Basit_Murattal_64kbps' : 'Abdul_Basit_Murattal_192kbps'
}

const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

export interface QPlayerOptions {
  reciter: ReciterKey
  gapMs: number
  repeat: number
}

export class QPlayer extends AyatPlayer {
  gapMs: number
  /** 0 off, n plays per ayat, -1 without end. */
  repeat: number
  /** Plays of the current ayat so far, for repeat. */
  plays = 1
  gapTimer: ReturnType<typeof setTimeout> | null = null
  /** The ayat that plays when the gap ends. */
  pending: PlayerPending | null = null
  bust = 0
  /** True while a reciter change reloads the playing ayat. */
  switching = false
  /** True when play() was refused behind a locked screen. */
  locked = false

  constructor(opts: QPlayerOptions) {
    super({ reciter: opts.reciter })
    this.gapMs = opts.gapMs
    this.repeat = opts.repeat
    // A pause the app did not ask for (a phone call, Bluetooth dropping, the
    // system media controls) must reach the UI and Media Session (QA fix 10).
    // Our own pause() already sets the state; the silent unlock clip, the gap
    // between ayat and the pause that comes right before "ended" are ignored.
    for (const a of [this.audio, this.spare]) {
      a.addEventListener('pause', () => {
        if (a !== this.audio || !a.paused || a.ended || this.isSilent() || this.gapTimer || !this.ayat) return
        if (this.status === 'playing' || this.status === 'loading') this.set('paused')
      })
    }
  }

  isSilent() {
    return (this.audio.getAttribute('src') || '').startsWith('data:')
  }

  url(n: number): string | null {
    if (!this.surah) return null
    let u: string | null
    if (this.reciter === 'ab')
      u = this.surah.ayat[n - 1] ? `https://everyayah.com/data/${everyayahFolder()}/${pad3(this.surah.nomor)}${pad3(n)}.mp3` : null
    else u = super.url(n)
    if (u && this.bust && n === this.ayat) u += (u.includes('?') ? '&' : '?') + 'r=' + this.bust
    return u
  }

  play(n: number, opts: PlayOptions = {}) {
    if (this.gapTimer) clearTimeout(this.gapTimer)
    this.gapTimer = null
    this.pending = null
    if (!opts.again) this.plays = 1
    if (!opts.retry) this.bust = 0
    this.locked = false
    super.play(n, opts)
  }

  /** Replays the same ayat once with a cache-busting query. */
  retry() {
    if (!this.ayat) return
    this.bust = Date.now()
    this.play(this.ayat, { retry: true })
  }

  ended() {
    if (this.isSilent() || !this.ayat || !this.surah) return
    this.dispatchEvent(new CustomEvent('traceend'))
    const n = this.ayat
    if (this.repeat && (this.repeat === -1 || this.plays < this.repeat)) {
      this.plays++
      return this.wait(n, true)
    }
    if (this.continuous && n < this.surah.ayat.length) return this.wait(n + 1, false)
    if (this.continuous) {
      // End of surah in continuous play: stop and offer the next one, no autoplay.
      this.ayat = null
      this.continuous = false
      return this.set('finished', { finished: n })
    }
    super.ended()
  }

  wait(n: number, again: boolean) {
    // Behind a hidden tab or a locked screen the timer is throttled, and iOS
    // refuses a play() that does not come straight from "ended", so the next
    // ayat starts at once there (QA note, fullstack 2).
    if (document.hidden) return this.play(n, { again })
    this.pending = { n, again }
    this.set('waiting', { nextAyat: n })
    this.gapTimer = setTimeout(() => {
      this.gapTimer = null
      // Behind a locked screen iOS may refuse this play(); set() turns that
      // rejection into the locked state.
      this.play(n, { again })
    }, this.gapMs)
  }

  pause() {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer)
      this.gapTimer = null
      this.set('paused')
      return
    }
    super.pause()
  }

  resume() {
    if (this.pending && this.status === 'paused' && this.audio.ended) {
      const { n, again } = this.pending
      return this.play(n, { again })
    }
    if (this.locked && this.ayat) return this.play(this.ayat)
    super.resume()
  }

  toggle() {
    if (this.status === 'waiting') return this.pause()
    if (this.status === 'error' && this.ayat) return this.retry()
    super.toggle()
  }

  stop() {
    if (this.gapTimer) clearTimeout(this.gapTimer)
    this.gapTimer = null
    this.pending = null
    this.locked = false
    super.stop()
  }

  setReciter(key: ReciterKey) {
    if (key === this.reciter) return
    this.switching = this.status === 'playing' || this.status === 'loading'
    super.setReciter(key)
  }

  set(status: PlayerStatus, extra: Partial<PlayerStateDetail> = {}) {
    // Ignore the silent unlock clip.
    if ((status === 'playing' || status === 'loading' || status === 'error') && this.isSilent()) return
    if (status === 'error' && document.hidden && this.ayat) this.locked = true
    if (status === 'playing') this.switching = false
    super.set(status, extra)
    // Keep the lock screen controls steady through the gap and the load of the
    // next ayat instead of dropping to "none" at every ayat change (QA fix 20).
    if (hasMediaSession() && this.ayat !== null && (status === 'waiting' || status === 'loading')) {
      try {
        navigator.mediaSession.playbackState = 'playing'
      } catch {
        // ignore
      }
    }
  }

  metadata() {
    if (!hasMediaSession() || !this.surah || typeof MediaMetadata === 'undefined') return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${this.surah.namaLatin}, ayat ${this.ayat}`,
      artist: reciterName(this.reciter),
      album: 'Al-Quran Digital',
    })
  }
}

/** Seeking within the ayat from the lock screen or system controls. */
export function installSeekHandler(player: QPlayer) {
  if (!hasMediaSession()) return
  try {
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d && typeof d.seekTime === 'number') player.audio.currentTime = d.seekTime
    })
  } catch {
    // not supported
  }
}

/** Silent unlock on the first gesture, so iOS lets either element play later. */
export function installSilentUnlock(player: QPlayer) {
  const unlock = () => {
    removeEventListener('pointerdown', unlock, true)
    removeEventListener('keydown', unlock, true)
    for (const a of [player.audio, player.spare]) {
      if (a.getAttribute('src')) continue
      a.setAttribute('src', SILENT)
      const p = a.play()
      const clean = () => {
        if ((a.getAttribute('src') || '').startsWith('data:')) {
          a.pause()
          a.removeAttribute('src')
        }
      }
      if (p) p.then(clean, clean)
      else clean()
    }
  }
  addEventListener('pointerdown', unlock, true)
  addEventListener('keydown', unlock, true)
}
