// Murattal player state.
import type { ReciterKey } from './quran'

/**
 * idle: nothing loaded. loading, playing, paused, error: the ayat in `ayat`.
 * waiting: the pause between two ayat (or before a repeat). finished: the end
 * of the surah in continuous play, with the next surah offered.
 */
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'waiting' | 'finished'

/** The five values tests read from data-status, see the player store. */
export type PlayerDomStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export interface PlayerStateDetail {
  status: PlayerStatus
  ayat: number | null
  surah: number | null
  reciter: ReciterKey
  continuous: boolean
  error: string | null
  /** The ayat that just ended, on "finished" and on the idle after a single ayat. */
  finished?: number
  /** The ayat that plays after the gap, on "waiting". */
  nextAyat?: number
}

export interface PlayerPending {
  n: number
  again: boolean
}

export interface PlayOptions {
  continuous?: boolean
  again?: boolean
  retry?: boolean
}
