<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuranStore } from '@/stores/quran'
import { usePrayerStore } from '@/stores/prayer'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const quranStore = useQuranStore()
const prayerStore = usePrayerStore()
const themeStore = useThemeStore()

const searchQuery = ref('')
const showSuggestions = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await quranStore.fetchSurahList()
  await prayerStore.initializePrayerTimes()

  // Lazy scroll observer - langsung set visible dengan stagger animation
  setTimeout(() => {
    document.querySelectorAll('.lazy-scroll').forEach((el, index) => {
      setTimeout(() => {
        el.classList.add('visible')
      }, index * 30) // Stagger animation 30ms per item
    })
  }, 100)
})

const filteredSurahs = computed(() => {
  if (!searchQuery.value) return quranStore.surahList
  return quranStore.searchSurah(searchQuery.value)
})

const searchSuggestions = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return []
  return filteredSurahs.value.slice(0, 5) // Show top 5 suggestions
})

function goToSurah(surahNumber: number) {
  router.push({ name: 'surah', params: { number: surahNumber } })
  searchQuery.value = ''
  showSuggestions.value = false
}

function selectSuggestion(surah: any) {
  goToSurah(surah.nomor)
}

function handleSearchFocus() {
  showSuggestions.value = true
}

function handleSearchBlur() {
  // Delay to allow click on suggestion
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

// Animasi bervariasi untuk setiap card
function getCardAnimationClass(index: number) {
  const animations = ['card-animation-1', 'card-animation-2', 'card-animation-3']
  return animations[index % 3]
}

function getCardHoverClass(index: number) {
  return index % 2 === 0 ? 'hover-lift' : 'hover-bounce'
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
            <span class="text-4xl animate-float">🕌</span>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Al-Quran Digital</h1>
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

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-sage-500 to-sage-700 dark:from-dark-card dark:to-dark-bg py-20">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-5xl md:text-7xl font-arabic mb-6 animate-fade-in-up leading-relaxed text-gray-900 dark:text-white">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </h2>
        <p class="text-lg md:text-xl mb-12 animate-fade-in-up max-w-2xl mx-auto text-gray-800 dark:text-gray-100">
          Dengan nama Allah Yang Maha Pengasih, Maha Penyayang
        </p>

        <!-- Search Bar with Autocomplete -->
        <div class="max-w-2xl mx-auto animate-scale-in">
          <div class="relative">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              @focus="handleSearchFocus"
              @blur="handleSearchBlur"
              type="text"
              placeholder="Cari surah... (contoh: al fatihah, an nas)"
              class="w-full px-6 py-4 pl-14 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-dark-card border-2 border-transparent focus:border-sage-500 focus:outline-none shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
            />
            <span class="absolute left-5 top-1/2 -translate-y-1/2 text-2xl transition-transform duration-300 hover:scale-125">🔍</span>

            <!-- Search Suggestions Dropdown -->
            <div
              v-if="showSuggestions && searchSuggestions.length > 0"
              class="absolute top-full mt-2 w-full bg-white dark:bg-dark-card rounded-xl shadow-2xl border border-cream-300 dark:border-dark-border overflow-hidden z-50 animate-fade-in-down"
            >
              <div
                v-for="surah in searchSuggestions"
                :key="surah.nomor"
                @click="selectSuggestion(surah)"
                class="px-6 py-3 hover:bg-sage-50 dark:hover:bg-dark-accent cursor-pointer transition-colors duration-200 border-b border-cream-200 dark:border-dark-border last:border-b-0"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 bg-gray-800 dark:bg-sage-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {{ surah.nomor }}
                    </span>
                    <div class="text-left">
                      <div class="font-semibold text-gray-800 dark:text-white">{{ surah.namaLatin }}</div>
                      <div class="text-xs text-gray-700 dark:text-gray-300">{{ surah.arti }}</div>
                    </div>
                  </div>
                  <span class="text-xl font-arabic text-gray-800 dark:text-gray-200">{{ surah.nama }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Prayer Times Widget -->
    <section class="container mx-auto px-4 -mt-8">
      <div class="card p-6 lazy-scroll animate-slide-in-left">
        <div class="text-center mb-4">
          <div class="flex items-center justify-center gap-2 mb-2">
            <h3 class="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
              <span>🕌</span>
              <span>Waktu Sholat</span>
            </h3>
            <!-- Always show refresh button -->
            <button
              @click="prayerStore.updateLocation()"
              :disabled="prayerStore.isLoading"
              class="px-3 py-1 text-sm rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              :class="prayerStore.isUsingDefaultLocation ? 'bg-sage-500 hover:bg-sage-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'"
              :title="prayerStore.isUsingDefaultLocation ? 'Gunakan lokasi Anda untuk waktu sholat yang akurat' : 'Perbarui lokasi Anda'"
            >
              <span v-if="!prayerStore.isLoading">🔄</span>
              <span v-else class="animate-spin">⏳</span>
              <span v-if="!prayerStore.isLoading">{{ prayerStore.isUsingDefaultLocation ? 'Gunakan Lokasi Saya' : 'Refresh Lokasi' }}</span>
              <span v-else>Memuat...</span>
            </button>
          </div>
          <p class="text-gray-700 dark:text-gray-200">
            {{ prayerStore.location.city }}<span v-if="prayerStore.location.country">, {{ prayerStore.location.country }}</span>
            <span v-if="prayerStore.isUsingDefaultLocation" class="text-xs text-orange-600 dark:text-orange-400 ml-1 font-semibold">(lokasi default)</span>
            <span v-else class="text-xs text-green-600 dark:text-green-400 ml-1">✓ lokasi aktual</span>
          </p>
          <div v-if="prayerStore.error" class="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
            <p class="text-sm text-orange-700 dark:text-orange-300 font-medium mb-1">
              ⚠️ {{ prayerStore.error }}
            </p>
            <p v-if="prayerStore.locationPermission === 'denied'" class="text-xs text-orange-600 dark:text-orange-400 mt-2">
              <strong>Cara reset izin lokasi:</strong><br>
              <span class="inline-block mt-1">
                🔸 <strong>Chrome/Edge:</strong> Klik icon 🔒 di address bar → Site settings → Location → Pilih "Allow"<br>
                🔸 <strong>Firefox:</strong> Klik icon 🔒 → Permissions → Location → Centang "Allow"<br>
                🔸 <strong>Safari:</strong> Safari → Settings → Websites → Location → Pilih "Allow"
              </span>
            </p>
          </div>
        </div>

        <div v-if="prayerStore.currentPrayer" class="bg-gradient-to-r from-sage-500 to-sage-600 dark:from-dark-accent dark:to-dark-card rounded-lg p-4 mb-4 text-center shadow-md">
          <div class="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Sekarang: Waktu {{ prayerStore.currentPrayer.name }}
          </div>
          <div class="text-xl animate-pulse-slow text-gray-800 dark:text-gray-100">
            ⏳ {{ prayerStore.timeUntilNext }}
          </div>
        </div>

        <div v-if="prayerStore.prayerTimes" class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div v-for="prayer in prayerStore.prayerNames" :key="prayer.key"
            class="text-center p-3 rounded-lg bg-cream-100 dark:bg-dark-bg hover:bg-sage-50 dark:hover:bg-dark-accent transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 cursor-pointer"
            :class="{ 'ring-2 ring-sage-500 bg-sage-50 dark:bg-sage-900/20 shadow-lg animate-pulse-slow': prayerStore.currentPrayer?.name === prayer.name }"
          >
            <div class="font-semibold text-gray-800 dark:text-gray-100 transition-all duration-300">{{ prayer.name }}</div>
            <div class="text-lg font-bold text-gray-900 dark:text-white transition-all duration-300">
              {{ prayerStore.formatTime(prayerStore.prayerTimes[prayer.key as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'] as Date) }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Surah List -->
    <section class="container mx-auto px-4 py-8">
      <h2 class="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white lazy-scroll">Daftar Surah</h2>

      <!-- Loading -->
      <div v-if="quranStore.isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="i in 6" :key="i" class="card p-6 animate-pulse">
          <div class="h-6 bg-cream-300 dark:bg-gray-700 rounded mb-3"></div>
          <div class="h-4 bg-cream-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="quranStore.error" class="text-center py-12 lazy-scroll">
        <p class="text-red-500 text-xl">⚠️ {{ quranStore.error }}</p>
        <button @click="quranStore.fetchSurahList()" class="btn-primary mt-4">
          🔄 Coba Lagi
        </button>
      </div>

      <!-- Surah Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(surah, index) in filteredSurahs"
          :key="surah.nomor"
          @click="goToSurah(surah.nomor)"
          class="card p-6 cursor-pointer group lazy-scroll"
          :class="[getCardAnimationClass(index), getCardHoverClass(index)]"
          :style="{ animationDelay: `${index * 0.05}s` }"
        >
          <div class="flex items-center gap-4">
            <div class="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 dark:from-sage-500 dark:to-sage-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-md group-hover:shadow-2xl">
              {{ surah.nomor }}
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <h3 class="font-semibold text-lg text-gray-800 dark:text-white group-hover:text-sage-700 dark:group-hover:text-sage-300 transition-all duration-300 group-hover:translate-x-1">{{ surah.namaLatin }}</h3>
                <span class="text-2xl font-arabic text-gray-800 dark:text-gray-200 transition-transform duration-300 group-hover:scale-110">{{ surah.nama }}</span>
              </div>
              <p class="text-sm text-gray-700 dark:text-gray-300 transition-opacity duration-300 group-hover:opacity-80">
                {{ surah.tempatTurun }} • {{ surah.jumlahAyat }} Ayat • {{ surah.arti }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!quranStore.isLoading && filteredSurahs.length === 0" class="text-center py-12 lazy-scroll">
        <p class="text-gray-500 text-xl">🔍 Tidak ada surah yang ditemukan</p>
        <p class="text-gray-400 mt-2">Coba kata kunci lain</p>
      </div>
    </section>
  </div>
</template>
