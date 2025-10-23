import { defineStore } from 'pinia'
import { ref } from 'vue'
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
  const locationPermission = ref<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt')
  const isUsingDefaultLocation = ref(true)

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
      // Load saved location or use default
      const savedLocation = localStorage.getItem('prayer_location')
      if (savedLocation) {
        location.value = JSON.parse(savedLocation)
        isUsingDefaultLocation.value = false
        console.log('📍 Using saved location:', location.value.city)
      } else {
        // Use default location (Jakarta) until user manually requests their location
        isUsingDefaultLocation.value = true
        console.log('📍 Using default location: Jakarta')
      }

      // Calculate prayer times with current location
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
        locationPermission.value = 'unsupported'
        reject(new Error('Geolokasi tidak didukung oleh browser Anda'))
        return
      }

      isLoading.value = true
      error.value = null

      navigator.geolocation.getCurrentPosition(
        (position) => {
          location.value = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: 'Lokasi Anda',
            country: ''
          }
          localStorage.setItem('prayer_location', JSON.stringify(location.value))
          locationPermission.value = 'granted'
          isUsingDefaultLocation.value = false

          console.log('📍 Geolocation detected:', position.coords)

          // Recalculate prayer times with new location
          calculatePrayerTimes()

          isLoading.value = false
          resolve()
        },
        (err) => {
          isLoading.value = false

          if (err.code === err.PERMISSION_DENIED) {
            locationPermission.value = 'denied'
            error.value = 'Izin lokasi ditolak. Menggunakan lokasi default Jakarta.'
            console.warn('⚠️ Geolocation permission denied')
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            error.value = 'Lokasi tidak tersedia. Menggunakan lokasi default Jakarta.'
            console.warn('⚠️ Position unavailable')
          } else if (err.code === err.TIMEOUT) {
            error.value = 'Waktu habis saat mendapatkan lokasi. Menggunakan lokasi default Jakarta.'
            console.warn('⚠️ Geolocation timeout')
          }

          // Don't reject, just use default location
          resolve()
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 0 // Don't use cached position
        }
      )
    })
  }

  // Check permission status before requesting location
  async function checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (!navigator.permissions) {
      return 'unsupported'
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
      return permission.state as 'granted' | 'denied' | 'prompt'
    } catch (err) {
      console.warn('Permission API not supported:', err)
      return 'unsupported'
    }
  }

  // Manual location update - can be triggered by user
  async function updateLocation() {
    try {
      // Check permission status first
      const permissionStatus = await checkLocationPermission()

      console.log('📍 Permission status:', permissionStatus)

      if (permissionStatus === 'denied') {
        // User previously blocked - show instructions
        locationPermission.value = 'denied'
        error.value = 'Izin lokasi diblokir. Silakan klik icon 🔒 di address bar, lalu reset izin lokasi untuk mengizinkan akses.'
        console.warn('⚠️ Location permission denied by user')
        return
      }

      // Permission is either 'granted', 'prompt', or 'unsupported'
      // In all cases, try to request location
      await requestGeolocation()
    } catch (err) {
      console.error('Failed to update location:', err)
    }
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

    // Get sunrise
    const sunrise = prayerTimes.value.sunrise

    // Calculate Dhuha start: 15-20 minutes after sunrise (sun rises about a spear's length)
    const dhuhaStart = new Date(sunrise.getTime() + 15 * 60 * 1000) // 15 minutes after sunrise

    // Calculate Dhuha end: 10-15 minutes before Dhuhr (before sun reaches zenith)
    const dhuhaEnd = new Date(prayers[1].time.getTime() - 10 * 60 * 1000) // 10 minutes before Dhuhr

    // Calculate Tahajjud time (last third of the night)
    // Night duration: from Maghrib to Fajr
    const maghribTime = prayers[3].time
    const tomorrowFajr = new Date(prayers[0].time)
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1)

    const nightDuration = tomorrowFajr.getTime() - maghribTime.getTime()
    const tahajjudStartTime = new Date(maghribTime.getTime() + (nightDuration * 2 / 3))

    // Find current prayer with proper time windows
    let current: PrayerTime | null = null
    let next: PrayerTime | null = null

    // Tahajjud time (last third of night until Fajr) - SUNNAH
    if (now >= tahajjudStartTime && now < prayers[0].time) {
      current = { name: 'Tahajjud', arabicName: 'التهجد', time: tahajjudStartTime }
      next = prayers[0] // Next is Fajr
    }
    // Before Tahajjud - Night time (Isha extended) - SUNNAH: Witir, Night prayers
    else if (now >= prayers[4].time && now < tahajjudStartTime) {
      current = { name: 'Isya', arabicName: 'العشاء', time: prayers[4].time }
      next = { name: 'Tahajjud', arabicName: 'التهجد', time: tahajjudStartTime }
    }
    // After midnight but before Isha (edge case for very early morning)
    else if (now < prayers[0].time) {
      // Check if we're past midnight but Isha hasn't happened yet (shouldn't normally happen)
      current = { name: 'Malam', arabicName: 'الليل', time: prayers[prayers.length - 1].time }
      next = prayers[0] // Next is Fajr
    }
    // Fajr time (until sunrise) - FARDH
    else if (now >= prayers[0].time && now < sunrise) {
      current = prayers[0] // Subuh
      next = { name: 'Isyraq/Dhuha', arabicName: 'الإشراق', time: sunrise }
    }
    // Between sunrise and Dhuha start - Forbidden time (Isyraq can be prayed)
    else if (now >= sunrise && now < dhuhaStart) {
      current = { name: 'Isyraq/Dhuha', arabicName: 'الإشراق', time: sunrise }
      next = { name: 'Dhuha', arabicName: 'الضحى', time: dhuhaStart }
    }
    // Dhuha time - SUNNAH
    else if (now >= dhuhaStart && now < dhuhaEnd) {
      current = { name: 'Dhuha', arabicName: 'الضحى', time: dhuhaStart }
      next = prayers[1] // Dzuhur
    }
    // Between Dhuha end and Dhuhr - Forbidden time (sun at zenith)
    else if (now >= dhuhaEnd && now < prayers[1].time) {
      current = { name: 'Terlarang', arabicName: 'وقت النهي', time: dhuhaEnd }
      next = prayers[1] // Dzuhur
    }
    // Dhuhr time (until Asr) - FARDH
    else if (now >= prayers[1].time && now < prayers[2].time) {
      current = prayers[1] // Dzuhur
      next = prayers[2] // Ashar
    }
    // Asr time (until Maghrib) - FARDH
    else if (now >= prayers[2].time && now < prayers[3].time) {
      current = prayers[2] // Ashar
      next = prayers[3] // Maghrib
    }
    // Maghrib time (until Isha) - FARDH
    else if (now >= prayers[3].time && now < prayers[4].time) {
      current = prayers[3] // Maghrib
      next = prayers[4] // Isya
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
    locationPermission,
    isUsingDefaultLocation,

    // Actions
    initializePrayerTimes,
    calculatePrayerTimes,
    updateCountdown,
    formatTime,
    stopUpdateInterval,
    updateLocation
  }
})
