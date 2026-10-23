// Quran data for the views: the bundled index, surahs (stale while revalidate
// with the offline LRU), Kemenag tafsir, and surah descriptions on demand.
import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import type { Surah, SurahIndexItem, Tafsir } from '@/types'
import { SURAH_INDEX, surahInfo } from '@/data/surah-index'
import { getSurahList, getTafsir, peekSurah } from '@/lib/api'
import { availableOffline, loadSurah as loadSurahLib, onOfflineChange } from '@/lib/surah-loader'

export const useLibraryStore = defineStore('library', () => {
  const index: readonly SurahIndexItem[] = SURAH_INDEX

  /** Surahs stored for offline reading, ascending. */
  const offline = ref<number[]>(availableOffline())
  onOfflineChange((list) => (offline.value = list))

  /** Descriptions by surah number, filled from loaded surahs or the /surat list. */
  const descriptions = ref<Record<number, string>>({})

  /**
   * The surah with its ayat. Rejects with LoadError from lib/surah-loader
   * (err.offline tells the two error sentences apart). The object is marked raw:
   * keep it in a shallowRef, never in deep reactive state.
   */
  async function loadSurah(n: number): Promise<Surah> {
    const s = markRaw(await loadSurahLib(n))
    if (s.deskripsi && !descriptions.value[n]) descriptions.value = { ...descriptions.value, [n]: s.deskripsi }
    return s
  }

  /** A surah already loaded in this session, or null. */
  const cachedSurah = (n: number): Surah | null => peekSurah(n)

  /** Kemenag tafsir of surah n (ayat number to text), cached per session. */
  const loadTafsir = (n: number): Promise<Tafsir> => getTafsir(n)

  /** Description for "Tentang surah ini", or an empty string until known. */
  const deskripsi = (n: number) => descriptions.value[n] || ''

  let listLoad: Promise<void> | null = null
  /**
   * Fetches /surat (about 123 KB) for the descriptions, once. Call it only when
   * a description is needed and the surah itself has not supplied one. Failure
   * is silent.
   */
  function loadDescriptions(): Promise<void> {
    if (!listLoad)
      listLoad = getSurahList()
        .then((list) => {
          const next = { ...descriptions.value }
          for (const s of list) if (s.deskripsi && !next[s.nomor]) next[s.nomor] = s.deskripsi
          descriptions.value = next
        })
        .catch(() => {
          listLoad = null
        })
    return listLoad
  }

  return { index, info: surahInfo, offline, descriptions, loadSurah, cachedSurah, loadTafsir, deskripsi, loadDescriptions }
})
