// Prayer times for home: the place (Jakarta or the reader's own location), the
// method from settings, and a wall-clock ticker. It recomputes on every
// half-minute boundary (as the prototype's home does), so midnight in the
// place's zone and a tab that slept are right on the next tick; and at once
// when the tab becomes visible, when the device comes online, and when the
// method, the Hijri adjustment or the place changes (spec 6.6).
// Only HomeView should use this store: it imports adhan, which stays out of
// the shell chunk that way.
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { Place, PrayerCell, PrayerKey, PrayerStatus } from '@/types'
import { computePrayer, countdown, dateLine, deviceDiffers, fmtTime, isFridayIn } from '@/lib/prayer'
import { METHOD_LINE, METHODS } from '@/lib/prayer-meta'
import { forgetPlace, isLocateError, locate, savedPlace } from '@/lib/place'
import { useSettingsStore } from './settings'
import { useUiStore } from './ui'

export const usePrayerStore = defineStore('prayer', () => {
  const settings = useSettingsStore()
  const ui = useUiStore()

  const place = ref<Place>(savedPlace())
  const now = ref(new Date())
  const status = shallowRef<PrayerStatus>(computePrayer(place.value, settings.settings.method, now.value))
  /** True while "Pakai lokasi saya" waits for the device. */
  const locating = ref(false)
  /** The location message (denied, unavailable, timeout, unsupported); empty when hidden. */
  const message = ref('')
  /** Bumped when the method changes, so home can fade the new numbers in. */
  const methodSeq = ref(0)

  let lastCurrent: PrayerKey | null = null

  /** Recompute. Without force, a change of prayer is announced ("Sudah masuk waktu Maghrib."). */
  function tick(force = false) {
    const t = new Date()
    const st = computePrayer(place.value, settings.settings.method, t)
    now.value = t
    status.value = st
    if (lastCurrent && lastCurrent !== st.current.key && !st.current.notPrayer && !force) ui.announce(`Sudah masuk waktu ${st.current.name}.`)
    lastCurrent = st.current.key
  }

  // ------------------------------------------------------------ ticker
  let users = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let offSettings: (() => void) | null = null
  const schedule = () => {
    clearTimeout(timer)
    const ms = 30000 - (Date.now() % 30000) + 50
    timer = setTimeout(() => {
      tick()
      schedule()
    }, ms)
  }
  const onVisible = () => {
    if (!document.hidden) {
      tick()
      schedule()
    }
  }

  /**
   * Starts the ticker for a view (home calls it in onMounted, or setup) and
   * returns the stop function for onUnmounted. Counted, so two users are fine.
   */
  function start(): () => void {
    users++
    if (users === 1) {
      tick(true)
      schedule()
      document.addEventListener('visibilitychange', onVisible)
      addEventListener('online', onVisible)
      offSettings = settings.onChange((s, patch) => {
        if (!('method' in patch || 'hijriAdjust' in patch)) return
        tick(true)
        if ('method' in patch) {
          // The numbers change in place, so say it and let home fade them in.
          methodSeq.value++
          const name = METHODS.find((m) => m[0] === s.method)?.[1] ?? ''
          ui.announce(`Jadwal memakai metode ${name}. ${nextName.value} ${nextTime.value}, ${countdownText.value}.`)
        }
      })
    }
    let stopped = false
    return () => {
      if (stopped) return
      stopped = true
      users--
      if (users > 0) return
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      removeEventListener('online', onVisible)
      offSettings?.()
      offSettings = null
    }
  }

  // ------------------------------------------------------------ place
  async function locateMe() {
    locating.value = true
    message.value = ''
    try {
      place.value = await locate()
      tick(true)
      ui.announce('Jadwal memakai lokasi kamu.')
    } catch (err) {
      const msg = isLocateError(err) ? err.message : 'Lokasi belum bisa ditemukan. Jadwal memakai Jakarta.'
      message.value = msg
      ui.announce(msg)
    }
    locating.value = false
  }

  function backToJakarta() {
    place.value = forgetPlace()
    message.value = ''
    tick(true)
    ui.announce('Jadwal kembali memakai Jakarta.')
  }

  // ------------------------------------------------------------ display
  const zone = computed(() => status.value.zone)
  const tz = computed(() => status.value.zone.tz)
  const fmt = (d: Date) => fmtTime(d, tz.value)

  /** "Jumat, 23 Oktober 2026 · 11 Jumadilawal 1448 H" */
  const dateText = computed(() => {
    const d = dateLine(now.value, tz.value, settings.settings.hijriAdjust)
    return d.h ? `${d.g} · ${d.h}` : d.g
  })

  /**
   * The now line. Between Terbit and Dzuhur: one sentence. Otherwise "Sekarang
   * <b>name</b>, sejak hh.mm" (render name in <b>).
   */
  const nowLine = computed(() => {
    const { current, today } = status.value
    if (current.key === 'sunrise') {
      const dz = today.find((p) => p.key === 'dhuhr')
      return { sunrise: true, text: `Matahari terbit pukul ${fmt(current.time)}. Dzuhur pukul ${dz ? fmt(dz.time) : ''}.`, name: '', since: '' }
    }
    return { sunrise: false, text: '', name: current.name, since: `, sejak ${fmt(current.time)}` }
  })

  /** After Isya the next time is tomorrow's Subuh, which the strip (today only) does not show. */
  const nextIsTomorrow = computed(() => !status.value.today.includes(status.value.next))
  const nextName = computed(() => (nextIsTomorrow.value ? `${status.value.next.name} besok` : status.value.next.name))
  const nextTime = computed(() => fmt(status.value.next.time))
  const countdownText = computed(() => countdown(status.value.untilNext))

  const placeName = computed(() => `${place.value.isDefault ? 'Jakarta' : 'Lokasi kamu'} · ${zone.value.label}`)
  const placeTag = computed(() => (place.value.isDefault ? 'lokasi default' : 'lokasi kamu'))
  const methodLine = computed(() => METHOD_LINE[settings.settings.method] || METHOD_LINE.kemenag)
  /** Shown when the device runs in another zone than the place. */
  const zoneNote = computed(() => (deviceDiffers(tz.value) ? `Jam ditampilkan dalam ${zone.value.label} sesuai lokasi.` : ''))
  const stripLabel = computed(() => `Jadwal salat ${place.value.isDefault ? 'Jakarta' : 'lokasi kamu'} hari ini, ${zone.value.label}`)
  const isFriday = computed(() => isFridayIn(tz.value, now.value))

  /** The six strip cells with the prototype's rules, including last night's Isya before Subuh. */
  const cells = computed<PrayerCell[]>(() => {
    const { today, current, next, fraction } = status.value
    const t = now.value
    const isTodayCurrent = today.some((p) => p === current)
    const out = today.map((p): PrayerCell => {
      const isNow = isTodayCurrent && p === current
      // Only today's own entry: after Isya, today's Subuh has passed and is not the next one.
      const isNext = p === next
      const isPast = p.time <= t && !isNow && !isNext
      return {
        key: p.key,
        name: p.name,
        time: fmt(p.time),
        isNow,
        isNext,
        isPast,
        word: isNow ? (p.key === 'sunrise' ? 'sudah terbit' : 'sekarang') : isNext ? 'berikutnya' : '',
        line: isNow ? fraction : 0,
      }
    })
    // Before Subuh the current interval is last night's Isya: show it on the Isya cell.
    if (!isTodayCurrent) {
      const c = out[5]
      c.isNow = true
      c.word = 'sekarang'
      c.line = fraction
    }
    return out
  })

  return {
    place,
    now,
    status,
    locating,
    message,
    methodSeq,
    tick,
    start,
    locateMe,
    backToJakarta,
    zone,
    tz,
    dateText,
    nowLine,
    nextName,
    nextTime,
    countdownText,
    placeName,
    placeTag,
    methodLine,
    zoneNote,
    stripLabel,
    isFriday,
    cells,
  }
})
