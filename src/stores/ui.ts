// Interface state shared across areas: the breakpoint, the one open panel or
// sheet and its anchor, the toast, the polite live region and the online state.
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { Breakpoint } from '@/types'
import { bp as currentBp, onBp } from '@/lib/breakpoint'

/**
 * Panel ids, so the button that opens a panel and the area that renders it
 * agree. Rendered by the shell: settings, qari, playerSheet, homeMenu,
 * readerNav. Rendered by the reader: ayatMenu, tafsir.
 */
export const PANEL = {
  settings: 'settings',
  qari: 'qari',
  playerSheet: 'player-sheet',
  homeMenu: 'home-menu',
  readerNav: 'reader-nav',
  ayatMenu: 'ayat-menu',
  tafsir: 'tafsir',
} as const

export interface OpenPanel {
  /** The id given to <UiPanel id="...">. */
  id: string
  /** The button it belongs to: a desktop popover is placed under it. */
  anchor: HTMLElement | null
  /** Focus goes back here when the panel closes, unless closed silently. */
  opener: HTMLElement | null
  /** Breakpoint when it opened; "auto" panels pick popover or sheet from it. */
  bp: Breakpoint
  /** Changes on every open, so reopening the same id builds a fresh panel. */
  seq: number
}

export interface ClosePanelOptions {
  /** No focus return (closing because something else opens, or a route change). */
  silent?: boolean
  /** Leave focus where it is (a click outside a popover). */
  keepFocus?: boolean
}

export const useUiStore = defineStore('ui', () => {
  // ------------------------------------------------------------ breakpoint
  const bp = ref<Breakpoint>(currentBp())
  onBp((b) => (bp.value = b))

  // ------------------------------------------------------------ online
  const online = ref(navigator.onLine)
  const paintOnline = () => document.documentElement.classList.toggle('is-offline', !online.value)
  paintOnline()
  addEventListener('offline', () => {
    online.value = false
    paintOnline()
  })
  addEventListener('online', () => {
    online.value = true
    paintOnline()
    announce('Koneksi kembali.')
  })

  // ------------------------------------------------------------ live region
  // One polite region per page (#live): cleared, then filled 60 ms later so a
  // repeated message is read again.
  const liveText = ref('')
  let liveTimer: ReturnType<typeof setTimeout> | undefined
  function announce(msg: string) {
    clearTimeout(liveTimer)
    liveText.value = ''
    liveTimer = setTimeout(() => (liveText.value = msg), 60)
  }

  // ------------------------------------------------------------ toast
  const toastText = ref('')
  const toastOn = ref(false)
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  function toast(msg: string) {
    toastText.value = msg
    toastOn.value = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastOn.value = false), 2600)
  }

  // ------------------------------------------------------------ panels
  // One panel at a time. Opening one closes the open one silently.
  const panel = shallowRef<OpenPanel | null>(null)
  let seq = 0

  function openPanel(id: string, opts: { anchor?: HTMLElement | null; opener?: HTMLElement | null } = {}) {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panel.value = {
      id,
      anchor: opts.anchor ?? null,
      opener: opts.opener !== undefined ? opts.opener : active,
      bp: bp.value,
      seq: ++seq,
    }
  }

  function closePanel({ silent = false, keepFocus = false }: ClosePanelOptions = {}) {
    const p = panel.value
    if (!p) return
    panel.value = null
    if (!silent && !keepFocus && p.opener && p.opener.isConnected) p.opener.focus({ preventScroll: true })
  }

  const isOpen = (id: string) => panel.value?.id === id
  const panelOpen = computed(() => !!panel.value)

  return { bp, online, liveText, announce, toastText, toastOn, toast, panel, openPanel, closePanel, isOpen, panelOpen }
})
