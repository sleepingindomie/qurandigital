// What an ayat row shows for the player state: classes, the state word,
// aria-current, and the play button's icon and label.
import type { IconName } from '@/lib/icons'
import type { PlayerPending, PlayerStatus } from '@/types'

export interface RowState {
  cls: string[]
  word: string
  current: boolean
  icon: IconName
  label: string
}

export interface PlayAllState {
  busy: boolean
  label: string
}

export interface PlayerView {
  status: PlayerStatus
  ayat: number | null
  pending: PlayerPending | null
  switching: boolean
  continuous: boolean
}

function playingRow(st: PlayerStatus, k: number, switching: boolean): RowState {
  switch (st) {
    case 'loading':
      return { cls: ['is-loading'], word: switching ? 'Mengganti qari' : 'Memuat', current: true, icon: 'pause', label: `Batalkan ayat ${k}` }
    case 'playing':
      return { cls: ['is-playing'], word: 'Diputar', current: true, icon: 'pause', label: `Jeda ayat ${k}` }
    case 'waiting':
      return { cls: ['is-playing', 'is-done'], word: 'Diputar', current: true, icon: 'pause', label: `Jeda ayat ${k}` }
    case 'paused':
      return { cls: ['is-paused'], word: 'Dijeda', current: true, icon: 'play', label: `Lanjutkan ayat ${k}` }
    case 'error':
      return { cls: ['is-failed'], word: 'Gagal dimuat', current: false, icon: 'retry', label: `Coba putar ayat ${k} lagi` }
    default:
      return { cls: [], word: '', current: true, icon: 'play', label: `Putar ayat ${k}` }
  }
}

/** Row states of this surah's rows; empty when the player is elsewhere. */
export function rowStates(p: PlayerView): Map<number, RowState> {
  const m = new Map<number, RowState>()
  const k = p.ayat
  if (k) m.set(k, playingRow(p.status, k, p.switching))
  // The gap before the next ayat: its medallion outline turns accent, no word.
  if (p.status === 'waiting' && p.pending && p.pending.n !== k)
    m.set(p.pending.n, { cls: ['is-waiting'], word: '', current: false, icon: 'play', label: `Putar ayat ${p.pending.n}` })
  return m
}

/**
 * The plate's "Putar surah" and the phone play button: icon and words agree.
 * Pause while busy; "Lanjutkan surah" only when a continuous recitation is
 * paused, otherwise the button starts the surah.
 */
export function playAllState(p: PlayerView | null): PlayAllState {
  if (!p) return { busy: false, label: 'Putar surah' }
  const busy = p.status === 'playing' || p.status === 'loading' || p.status === 'waiting'
  return { busy, label: busy ? (p.continuous ? 'Jeda surah' : 'Jeda ayat') : p.continuous ? 'Lanjutkan surah' : 'Putar surah' }
}
