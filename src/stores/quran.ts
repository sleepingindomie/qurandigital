import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Surah, SurahListResponse, SurahDetailResponse, AyahApiData } from '@/types'

const API_BASE = 'https://equran.id/api/v2'

export const useQuranStore = defineStore('quran', () => {
  // State
  const surahList = ref<Surah[]>([])
  const currentSurah = ref<Surah | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Cache
  const surahCache = new Map<number, Surah>()
  const CACHE_KEY = 'quran_surah_list'
  const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

  // Getters
  const totalSurahs = computed(() => surahList.value.length)
  const hasSurahs = computed(() => surahList.value.length > 0)

  // Actions
  async function fetchSurahList() {
    isLoading.value = true
    error.value = null

    try {
      // Check localStorage cache first
      const cached = localStorage.getItem(CACHE_KEY)
      const cacheTime = localStorage.getItem(`${CACHE_KEY}_time`)

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime)
        if (age < CACHE_DURATION) {
          console.log('📦 Loading surah list from cache')
          surahList.value = JSON.parse(cached)
          isLoading.value = false
          return
        }
      }

      // Fetch from API
      console.log('🌐 Fetching surah list from API')
      const response = await fetch(`${API_BASE}/surat`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: SurahListResponse = await response.json()

      if (data.code === 200 && data.data) {
        surahList.value = data.data.map(surah => ({
          nomor: surah.nomor,
          nama: surah.nama,
          namaLatin: surah.nama_latin,
          jumlahAyat: surah.jumlah_ayat,
          tempatTurun: surah.tempat_turun,
          arti: surah.arti,
          deskripsi: surah.deskripsi || '',
          audioFull: surah.audio || ''
        }))

        // Cache to localStorage
        localStorage.setItem(CACHE_KEY, JSON.stringify(surahList.value))
        localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString())

        console.log(`✅ Loaded ${surahList.value.length} surahs`)
      } else {
        throw new Error('Invalid API response')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load surah list'
      error.value = message
      console.error('❌ Error fetching surah list:', err)

      // Load fallback data jika API gagal
      loadFallbackData()
    } finally {
      isLoading.value = false
    }
  }

  async function fetchSurah(surahNumber: number) {
    isLoading.value = true
    error.value = null

    try {
      // Check cache first
      if (surahCache.has(surahNumber)) {
        console.log(`📦 Loading surah ${surahNumber} from cache`)
        currentSurah.value = surahCache.get(surahNumber)!
        isLoading.value = false
        return
      }

      // Fetch from API
      console.log(`🌐 Fetching surah ${surahNumber} from API`)
      const response = await fetch(`${API_BASE}/surat/${surahNumber}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: SurahDetailResponse = await response.json()

      if (data.code === 200 && data.data) {
        const surah: Surah = {
          nomor: data.data.nomor,
          nama: data.data.nama,
          namaLatin: data.data.nama_latin,
          jumlahAyat: data.data.jumlah_ayat,
          tempatTurun: data.data.tempat_turun,
          arti: data.data.arti,
          deskripsi: data.data.deskripsi || '',
          ayat: data.data.ayat?.map((ayah: AyahApiData) => ({
            nomorAyat: ayah.nomorAyat,
            teksArab: ayah.teksArab,
            teksLatin: ayah.teksLatin,
            teksIndonesia: ayah.teksIndonesia
          })) || []
        }

        currentSurah.value = surah
        surahCache.set(surahNumber, surah)

        console.log(`✅ Loaded surah ${surah.namaLatin} with ${surah.ayat?.length} ayahs`)
      } else {
        throw new Error('Invalid API response')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load surah'
      error.value = message
      console.error(`❌ Error fetching surah ${surahNumber}:`, err)
    } finally {
      isLoading.value = false
    }
  }

  function searchSurah(query: string) {
    if (!query.trim()) return surahList.value

    const lowercaseQuery = query.toLowerCase()
    return surahList.value.filter(surah =>
      surah.namaLatin.toLowerCase().includes(lowercaseQuery) ||
      surah.nama.includes(query) ||
      surah.arti.toLowerCase().includes(lowercaseQuery) ||
      surah.nomor.toString().includes(query)
    )
  }

  function loadFallbackData() {
    console.log('📁 Loading fallback data')
    // Minimal fallback data untuk testing
    surahList.value = [
      {
        nomor: 1,
        nama: 'الفاتحة',
        namaLatin: 'Al-Fatihah',
        jumlahAyat: 7,
        tempatTurun: 'Makkah',
        arti: 'Pembukaan',
        deskripsi: 'Surat Al-Fatihah (Pembukaan)'
      }
    ]
  }

  function clearCache() {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(`${CACHE_KEY}_time`)
    surahCache.clear()
    console.log('🗑️ Cache cleared')
  }

  return {
    // State
    surahList,
    currentSurah,
    isLoading,
    error,

    // Getters
    totalSurahs,
    hasSurahs,

    // Actions
    fetchSurahList,
    fetchSurah,
    searchSurah,
    clearCache
  }
})
