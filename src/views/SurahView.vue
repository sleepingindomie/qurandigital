<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuranStore } from '@/stores/quran'
// import { useBookmarkStore } from '@/stores/bookmark'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()
const quranStore = useQuranStore()
// const bookmarkStore = useBookmarkStore()
const themeStore = useThemeStore()

const surahNumber = ref(parseInt(route.params.number as string))
const playingAyah = ref<number | null>(null)
const audioElement = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const isContinuousPlay = ref(false)

onMounted(async () => {
  await quranStore.fetchSurah(surahNumber.value)

  // Lazy scroll observer - langsung set visible semua ayat untuk menghindari bug
  setTimeout(() => {
    document.querySelectorAll('.lazy-scroll').forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('visible')
      }, index * 50) // Stagger animation 50ms per item
    })
  }, 100)
})

// Stop audio ketika component unmount (navigate away)
onBeforeUnmount(() => {
  stopAudio()
})

function getAudioUrl(ayahNumber: number): string {
  const surah = String(surahNumber.value).padStart(3, '0')
  const ayah = String(ayahNumber).padStart(3, '0')
  return `https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/${surah}${ayah}.mp3`
}

function playAudio(ayahNumber: number, continuous: boolean = false) {
  const url = getAudioUrl(ayahNumber)

  if (audioElement.value) {
    audioElement.value.pause()
  }

  audioElement.value = new Audio(url)
  audioElement.value.play()
  playingAyah.value = ayahNumber
  isPlaying.value = true
  if (continuous) {
    isContinuousPlay.value = true
  }

  audioElement.value.onended = () => {
    playingAyah.value = null
    isPlaying.value = false

    // Auto-play next ayah if continuous mode is enabled
    if (isContinuousPlay.value && quranStore.currentSurah) {
      const currentIndex = quranStore.currentSurah.ayat?.findIndex(a => a.nomorAyat === ayahNumber)
      if (currentIndex !== undefined && currentIndex !== -1 && quranStore.currentSurah.ayat) {
        const nextAyah = quranStore.currentSurah.ayat[currentIndex + 1]
        if (nextAyah) {
          // Scroll to next ayah smoothly
          setTimeout(() => {
            playAudio(nextAyah.nomorAyat, true)
            const nextElement = document.getElementById(`ayah-${nextAyah.nomorAyat}`)
            if (nextElement) {
              nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 500)
        } else {
          isContinuousPlay.value = false
        }
      }
    }
  }
}

function togglePlayPause() {
  if (isPlaying.value && audioElement.value) {
    audioElement.value.pause()
    isPlaying.value = false
    isContinuousPlay.value = false
  } else if (playingAyah.value && audioElement.value) {
    audioElement.value.play()
    isPlaying.value = true
  }
}

function playEntireSurah() {
  if (!quranStore.currentSurah?.ayat?.[0]) return
  playAudio(quranStore.currentSurah.ayat[0].nomorAyat, true)
}

function stopAudio() {
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.currentTime = 0
  }
  playingAyah.value = null
  isPlaying.value = false
  isContinuousPlay.value = false
}

// Bookmark functionality - reserved for future use
// function toggleBookmark(ayahNumber: number) {
//   if (!quranStore.currentSurah) return
//   const ayah = quranStore.currentSurah.ayat?.find(a => a.nomorAyat === ayahNumber)
//   if (!ayah) return
//   const isAdded = bookmarkStore.toggleBookmark({
//     surahNumber: surahNumber.value,
//     surahName: quranStore.currentSurah.namaLatin,
//     surahNameArabic: quranStore.currentSurah.nama,
//     ayahNumber: ayah.nomorAyat,
//     textArabic: ayah.teksArab,
//     translation: ayah.teksIndonesia
//   })
//   console.log(isAdded ? '✅ Bookmark ditambahkan' : '❌ Bookmark dihapus')
// }

function goToPrevious() {
  if (surahNumber.value > 1) {
    stopAudio()
    router.push({ name: 'surah', params: { number: surahNumber.value - 1 } })
    surahNumber.value--
    quranStore.fetchSurah(surahNumber.value)
  }
}

function goToNext() {
  if (surahNumber.value < 114) {
    stopAudio()
    router.push({ name: 'surah', params: { number: surahNumber.value + 1 } })
    surahNumber.value++
    quranStore.fetchSurah(surahNumber.value)
  }
}
</script>

<template>
  <div class="min-h-screen pb-20">
    <!-- Watermark -->
    <div class="watermark">DP</div>

    <!-- Header -->
    <header class="bg-white dark:bg-dark-card shadow-md sticky top-0 z-50 transition-all duration-300">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button @click="router.push('/')" class="p-2 hover:bg-cream-200 dark:hover:bg-dark-accent rounded-lg transition-all duration-300 transform hover:scale-110">
              ←
            </button>
            <span class="text-3xl animate-float">🕌</span>
            <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Al-Quran Digital</h1>
          </div>

          <button
            @click="themeStore.toggleTheme"
            class="p-3 rounded-full hover:bg-cream-200 dark:hover:bg-dark-accent transition-all duration-300 transform hover:scale-110"
          >
            <span class="text-2xl">{{ themeStore.isDark ? '☀️' : '🌙' }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Surah Header -->
    <section v-if="quranStore.currentSurah" class="bg-gradient-to-br from-sage-500 to-sage-700 dark:from-dark-card dark:to-dark-bg py-16">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-5xl md:text-7xl font-arabic mb-4 animate-fade-in-up leading-relaxed text-gray-900 dark:text-white">{{ quranStore.currentSurah.nama }}</h2>
        <h3 class="text-2xl md:text-3xl font-semibold mb-3 animate-fade-in-up text-gray-800 dark:text-gray-100">{{ quranStore.currentSurah.namaLatin }}</h3>
        <p class="text-lg animate-fade-in-up text-gray-800 dark:text-gray-200">
          {{ quranStore.currentSurah.tempatTurun }} • {{ quranStore.currentSurah.jumlahAyat }} Ayat • {{ quranStore.currentSurah.arti }}
        </p>
      </div>
    </section>

    <!-- Audio Controls -->
    <section class="container mx-auto px-4 -mt-8">
      <div class="card p-6 lazy-scroll">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <button
              @click="playEntireSurah"
              :disabled="isPlaying && isContinuousPlay"
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 hover:shadow-2xl"
              :class="{ 'animate-pulse': isPlaying && isContinuousPlay }"
            >
              ▶️ Putar Seluruh Surah
            </button>

            <button
              v-if="isPlaying"
              @click="togglePlayPause"
              class="btn-secondary transform hover:scale-105 active:scale-95 transition-all duration-300"
            >
              {{ isPlaying ? '⏸️ Pause' : '▶️ Resume' }}
            </button>

            <button
              v-if="playingAyah"
              @click="stopAudio"
              class="btn-secondary transform hover:scale-105 active:scale-95 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all duration-300"
            >
              ⏹️ Stop
            </button>
          </div>

          <div v-if="playingAyah" class="text-sm text-gray-700 dark:text-gray-300">
            <span class="font-semibold text-gray-800 dark:text-sage-300">
              {{ isContinuousPlay ? '🔁 Mode Continuous' : '🎵 Sedang Memutar' }} - Ayat {{ playingAyah }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Navigation -->
    <section class="container mx-auto px-4 py-6">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <button
          @click="goToPrevious"
          :disabled="surahNumber <= 1"
          class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
        >
          ← Surah Sebelumnya
        </button>

        <button @click="router.push('/')" class="btn-secondary w-full md:w-auto">
          📖 Daftar Surah
        </button>

        <button
          @click="goToNext"
          :disabled="surahNumber >= 114"
          class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
        >
          Surah Berikutnya →
        </button>
      </div>
    </section>

    <!-- Ayah List -->
    <section class="container mx-auto px-4 pb-8">
      <!-- Loading -->
      <div v-if="quranStore.isLoading" class="space-y-6">
        <div v-for="i in 5" :key="i" class="card p-6 animate-pulse">
          <div class="h-8 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
          <div class="h-6 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="quranStore.error" class="text-center py-12">
        <p class="text-red-500 text-xl">⚠️ {{ quranStore.error }}</p>
        <button @click="quranStore.fetchSurah(surahNumber)" class="btn-primary mt-4">
          🔄 Coba Lagi
        </button>
      </div>

      <!-- Ayah Items -->
      <div v-else-if="quranStore.currentSurah" class="space-y-6">
        <div
          v-for="ayah in quranStore.currentSurah.ayat"
          :key="ayah.nomorAyat"
          :id="`ayah-${ayah.nomorAyat}`"
          class="card p-6 animate-fade-in"
          :class="{ 'ring-2 ring-sage-500 bg-sage-50 dark:bg-sage-900/20 shadow-lg': playingAyah === ayah.nomorAyat }"
        >
          <!-- Ayah Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 dark:from-sage-500 dark:to-sage-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {{ ayah.nomorAyat }}
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="playAudio(ayah.nomorAyat)"
                class="p-2 hover:bg-sage-100 dark:hover:bg-dark-accent rounded-lg transition-all duration-300 transform hover:scale-125 hover:rotate-12 active:scale-95"
                :class="{ 'animate-pulse bg-sage-50 dark:bg-sage-900/20': playingAyah === ayah.nomorAyat }"
                title="Putar Audio"
              >
                <span class="text-2xl transition-transform duration-300">{{ playingAyah === ayah.nomorAyat ? '⏸️' : '▶️' }}</span>
              </button>
            </div>
          </div>

          <!-- Arabic Text -->
          <div class="text-4xl font-arabic leading-loose text-right mb-6 text-gray-800 dark:text-white">
            {{ ayah.teksArab }}
          </div>

          <!-- Translation -->
          <div class="text-lg text-gray-800 dark:text-gray-200 border-l-4 border-sage-500 pl-4 bg-cream-100 dark:bg-dark-bg p-4 rounded">
            {{ ayah.teksIndonesia }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
