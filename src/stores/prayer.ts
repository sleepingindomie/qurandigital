import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PrayerTimes, Location, PrayerTime } from '@/types'
import * as adhan from 'adhan'

export const usePrayerStore = defineStore('prayer', () => {
  // State
  const prayerTimes = ref<PrayerTimes | null>(null)
  const currentPrayer = ref<PrayerTime | null>(null)
  const nextPrayer = ref<PrayerTime | null>(null)
  const location = ref<Location>({
    latitude: -6.2088,
    longitude: 106.8456,
    city: 'Jakarta',
    country: 'Indonesia'
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Update interval
  let updateInterval: number | null = null

  // Computed
  const timeUntilNext = ref('')

  // Prayer names
  const prayerNames = [
    { name: 'Subuh', arabicName: 'الفجر', key: 'fajr' },
    { name: 'Dzuhur', arabicName: 'الظهر', key: 'dhuhr' },
    { name: 'Ashar', arabicName: 'العصر', key: 'asr' },
    { name: 'Maghrib', arabicName: 'المغرب', key: 'maghrib' },
    { name: 'Isya', arabicName: 'العشاء', key: 'isha' }
  ]

  // Actions
  async function initializePrayerTimes() {
    isLoading.value = true
    error.value = null

    try {
      // Load saved location
      const savedLocation = localStorage.getItem('prayer_location')
      if (savedLocation) {
        location.value = JSON.parse(savedLocation)
        console.log('📍 Using saved location:', location.value.city)
      } else {
        // Try geolocation
        await requestGeolocation()
      }

      // Calculate prayer times
      calculatePrayerTimes()

      // Start update interval (every minute)
      startUpdateInterval()

      console.log('✅ Prayer times initialized')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize prayer times'
      error.value = message
      console.error('❌ Error initializing prayer times:', err)

      // Use default location (Jakarta) jika error
      calculatePrayerTimes()
    } finally {
      isLoading.value = false
    }
  }

  async function requestGeolocation() {
    return new Promise<void>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          location.value = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: 'Lokasi Anda',
            country: ''
          }
          localStorage.setItem('prayer_location', JSON.stringify(location.value))
          console.log('📍 Geolocation detected:', position.coords)
          resolve()
        },
        (err) => {
          console.warn('⚠️ Geolocation failed, using Jakarta:', err.message)
          resolve() // Tidak reject, gunakan default Jakarta
        },
        { timeout: 5000, enableHighAccuracy: false }
      )
    })
  }

  function calculatePrayerTimes() {
    try {
      const coordinates = new adhan.Coordinates(
        location.value.latitude,
        location.value.longitude
      )

      const params = adhan.CalculationMethod.MuslimWorldLeague()
      params.madhab = adhan.Madhab.Shafi

      const date = new Date()
      const times = new adhan.PrayerTimes(coordinates, date, params)

      prayerTimes.value = {
        fajr: times.fajr,
        sunrise: times.sunrise,
        dhuhr: times.dhuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha
      }

      updateCurrentPrayer()
      console.log('🕌 Prayer times calculated successfully')
    } catch (err) {
      error.value = 'Failed to calculate prayer times'
      console.error('❌ Error calculating prayer times:', err)
    }
  }

  function updateCurrentPrayer() {
    if (!prayerTimes.value) return

    const now = new Date()
    const prayers: PrayerTime[] = prayerNames.map(p => ({
      name: p.name,
      arabicName: p.arabicName,
      time: prayerTimes.value![p.key as keyof PrayerTimes] as Date
    }))

    // Find current prayer
    let current: PrayerTime | null = null
    let next: PrayerTime | null = null

    for (let i = prayers.length - 1; i >= 0; i--) {
      if (now >= prayers[i].time) {
        current = prayers[i]
        next = i < prayers.length - 1 ? prayers[i + 1] : prayers[0]

        // If next is tomorrow's Fajr
        if (i === prayers.length - 1) {
          const tomorrow = new Date(next.time)
          tomorrow.setDate(tomorrow.getDate() + 1)
          next = { ...next, time: tomorrow }
        }
        break
      }
    }

    // If before Fajr
    if (!current) {
      current = { name: 'Malam', arabicName: 'الليل', time: prayers[prayers.length - 1].time }
      next = prayers[0]
    }

    currentPrayer.value = current
    nextPrayer.value = next

    updateCountdown()
  }

  function updateCountdown() {
    if (!nextPrayer.value) return

    const now = new Date()
    const diff = nextPrayer.value.time.getTime() - now.getTime()

    if (diff < 0) {
      calculatePrayerTimes()
      return
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    if (hours > 0) {
      timeUntilNext.value = `${nextPrayer.value.name} dalam ${hours} jam ${minutes} menit`
    } else if (minutes > 0) {
      timeUntilNext.value = `${nextPrayer.value.name} dalam ${minutes} menit`
    } else {
      timeUntilNext.value = `${nextPrayer.value.name} dalam ${seconds} detik`
    }
  }

  function startUpdateInterval() {
    if (updateInterval) clearInterval(updateInterval)

    updateInterval = window.setInterval(() => {
      updateCountdown()

      // Recalculate at midnight
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        calculatePrayerTimes()
      }
    }, 1000) // Update every second
  }

  function stopUpdateInterval() {
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  function formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  return {
    // State
    prayerTimes,
    currentPrayer,
    nextPrayer,
    location,
    isLoading,
    error,
    timeUntilNext,
    prayerNames,

    // Actions
    initializePrayerTimes,
    calculatePrayerTimes,
    updateCountdown,
    formatTime,
    stopUpdateInterval
  }
})
