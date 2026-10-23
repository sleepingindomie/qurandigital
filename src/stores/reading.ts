// Last read (qd:lastRead) and bookmarks (qd:bookmarks), and the reader's
// last-read tracker: the scroll position is the main source, written with a
// trailing 1 s throttle and flushed when the reader leaves, the page hides or
// unloads; recitation writes the recited ayat only while it is followed and the
// reader has not scrolled by hand in the last 5 s.
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Bookmark, LastRead } from '@/types'
import { readPref, writePref } from '@/lib/storage'
import { useSettingsStore } from './settings'

const validLast = (v: unknown): v is LastRead =>
  !!v && typeof v === 'object' && typeof (v as LastRead).surah === 'number' && (v as LastRead).surah >= 1 && (v as LastRead).surah <= 114

const validMarks = (v: unknown): Bookmark[] =>
  Array.isArray(v) ? v.filter((b): b is Bookmark => !!b && typeof b.surah === 'number' && typeof b.ayat === 'number') : []

export interface ReadingTrackerOptions {
  surah: number
  /** Ayat count of the surah. */
  total: number
  /** The top-most ayat in the reading band right now. */
  topAyat: () => number
  /** False until the surah has rendered; scrolls before that are not recorded. */
  ready: () => boolean
}

export interface ReadingTracker {
  /** Call once the ayat are shown: the open position counts after 3 s (2 s, then the 1 s throttle). */
  start(): void
  /** A user scroll (wheel, touch, keys, scrollbar) happened. */
  manual(): void
  /** A new ayat started in the recitation of this surah. */
  fromAudio(ayat: number, following: boolean): void
  /** Writes any pending position now. */
  flush(): void
  /** Removes the listeners and flushes; call on unmount or surah change. */
  dispose(): void
}

export const useReadingStore = defineStore('reading', () => {
  const settings = useSettingsStore()

  const initialLast = readPref<unknown>('lastRead', null)
  const lastRead = ref<LastRead | null>(validLast(initialLast) ? initialLast : null)
  const bookmarks = ref<Bookmark[]>(validMarks(readPref<unknown>('bookmarks', [])))

  /** Writes at once ("Tandai terakhir dibaca" and the tracker). */
  function setLastRead(v: { surah: number; ayat: number }) {
    const rec: LastRead = { surah: v.surah, ayat: v.ayat, t: Date.now() }
    lastRead.value = rec
    writePref('lastRead', rec)
  }

  const isBookmarked = (surah: number, ayat: number) => bookmarks.value.some((b) => b.surah === surah && b.ayat === ayat)

  /** Adds (newest first) or removes; returns true when the ayat is now marked. */
  function toggleBookmark(item: { surah: number; ayat: number }): boolean {
    const list = bookmarks.value.slice()
    const i = list.findIndex((b) => b.surah === item.surah && b.ayat === item.ayat)
    if (i >= 0) list.splice(i, 1)
    else list.unshift({ surah: item.surah, ayat: item.ayat, t: Date.now() })
    bookmarks.value = list
    writePref('bookmarks', list)
    return i < 0
  }

  function removeBookmark(surah: number, ayat: number) {
    if (isBookmarked(surah, ayat)) toggleBookmark({ surah, ayat })
  }

  function createTracker(opts: ReadingTrackerOptions): ReadingTracker {
    let timer: ReturnType<typeof setTimeout> | null = null
    let initTimer: ReturnType<typeof setTimeout> | null = null
    let src: 'scroll' | number | null = null
    let lastManual = 0
    let disposed = false

    const write = () => {
      if (timer) clearTimeout(timer)
      timer = null
      if (!opts.ready() || src === null) return
      const k = src === 'scroll' ? opts.topAyat() : src
      src = null
      if (k >= 1 && k <= opts.total) setLastRead({ surah: opts.surah, ayat: k })
    }
    const queue = (s: 'scroll' | number) => {
      if (disposed) return
      src = s
      if (!timer) timer = setTimeout(write, 1000)
    }
    const flush = () => {
      if (timer) write()
    }
    const onScroll = () => {
      if (opts.ready()) queue('scroll')
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)

    return {
      start() {
        if (initTimer) clearTimeout(initTimer)
        // A mistaken tap that leaves at once does not count.
        initTimer = setTimeout(() => queue('scroll'), 2000)
      },
      manual() {
        lastManual = Date.now()
      },
      fromAudio(ayat, following) {
        if (following && settings.settings.follow && Date.now() - lastManual > 5000) queue(ayat)
      },
      flush,
      dispose() {
        if (disposed) return
        removeEventListener('scroll', onScroll)
        removeEventListener('pagehide', flush)
        document.removeEventListener('visibilitychange', onHide)
        if (initTimer) clearTimeout(initTimer)
        flush()
        disposed = true
      },
    }
  }

  return { lastRead, bookmarks, setLastRead, isBookmarked, toggleBookmark, removeBookmark, createTracker }
})
