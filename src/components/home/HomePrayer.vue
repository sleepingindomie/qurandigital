<script setup lang="ts">
// Prayer times (home.js prayerSection()): the now block, the location row with
// its method and zone lines, and the six-cell strip with the interval line.
// The prayer store computes and ticks; this renders it.
// "Ganti metode" is an inline disclosure, not a panel, so the strip and the
// countdown stay in view and change in place while the method is chosen.
import { nextTick, onUnmounted, ref, watch } from 'vue'
import UiRadioGroup from '@/components/ui/UiRadioGroup.vue'
import { usePrayerStore } from '@/stores/prayer'
import { useSettingsStore } from '@/stores/settings'
import { METHODS } from '@/lib/prayer-meta'
import { sessionGet, sessionSet } from '@/lib/storage'
import { EASE_DRAW, EASE_UI, motionOK } from '@/lib/motion'
import type { PrayerMethod } from '@/types'

const prayer = usePrayerStore()
const stop = prayer.start()
onUnmounted(stop)

const settings = useSettingsStore()
const root = ref<HTMLElement | null>(null)
const methodBtn = ref<HTMLButtonElement | null>(null)
const methodOpen = ref(false)

function closeMethod() {
  methodOpen.value = false
  methodBtn.value?.focus({ preventScroll: true })
}

function onMethodKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !methodOpen.value) return
  e.preventDefault()
  e.stopPropagation()
  closeMethod()
}

// The prayer store recomputes and announces the change, from here or from
// Pengaturan baca alike.
function setMethod(v: PrayerMethod) {
  if (v === settings.settings.method) return
  settings.set({ method: v })
}

// The new times fade in where they stand, so the change reads as one.
watch(
  () => prayer.methodSeq,
  () => {
    if (!motionOK()) return
    nextTick(() => {
      for (const el of root.value?.querySelectorAll<HTMLElement>('.pr-next-time, .c-time') ?? []) {
        el.animate?.([{ opacity: 0.25 }, { opacity: 1 }], { duration: 320, easing: EASE_UI })
      }
    })
  },
)

const lineTransform = (isNow: boolean, line: number) => (isNow ? `scaleX(${line.toFixed(4)})` : 'scaleX(0)')

defineExpose({
  /** Spec #7: the interval line grows to its fraction once per session. */
  firstDraw() {
    if (sessionGet('qd:lineDrawn') || !motionOK()) return
    sessionSet('qd:lineDrawn', '1')
    const line = root.value?.querySelector<HTMLElement>('.is-now .c-line')
    if (!line || !line.animate) return
    const to = line.style.transform
    line.animate([{ transform: 'scaleX(0)' }, { transform: to }], { duration: 480, easing: EASE_DRAW, fill: 'backwards' })
  },
})
</script>

<template>
  <section ref="root" id="waktu" class="prayer" data-qa="prayer" aria-labelledby="h-waktu">
    <h2 id="h-waktu" class="sr">Waktu salat</h2>
    <p class="pr-date">{{ prayer.dateText }}</p>
    <div class="pr-top">
      <div class="pr-nowblk">
        <p v-if="prayer.nowLine.sunrise" class="pr-now">{{ prayer.nowLine.text }}</p>
        <p v-else class="pr-now">Sekarang <b>{{ prayer.nowLine.name }}</b>{{ prayer.nowLine.since }}</p>
        <p class="pr-next"><span class="pr-next-name">{{ prayer.nextName }}</span>{{ ' ' }}<span class="pr-next-time tnum">{{ prayer.nextTime }}</span></p>
        <p class="pr-cd">{{ prayer.countdownText }}</p>
      </div>
      <div class="pr-loc">
        <p class="loc-line"><span class="loc-name">{{ prayer.placeName }}</span>{{ ' ' }}<span class="tag">{{ prayer.placeTag }}</span></p>
        <div class="loc-acts">
          <button
            type="button"
            class="txt-link loc-btn"
            data-qa="locate"
            :disabled="prayer.locating"
            :aria-busy="prayer.locating ? 'true' : undefined"
            @click="prayer.locateMe()"
            >{{ prayer.locating ? 'Mencari lokasi' : 'Pakai lokasi saya' }}</button
          >
          <button type="button" class="txt-link loc-btn" :hidden="prayer.place.isDefault" @click="prayer.backToJakarta()">Kembali ke Jakarta</button>
          <button
            ref="methodBtn"
            type="button"
            class="txt-link loc-btn"
            data-qa="method"
            :aria-expanded="methodOpen ? 'true' : 'false'"
            aria-controls="pr-method"
            @click="methodOpen = !methodOpen"
            @keydown="onMethodKey"
            >Ganti metode</button
          >
        </div>
        <p class="loc-msg" :hidden="!prayer.message">{{ prayer.message }}</p>
        <div id="pr-method" class="pr-method" :hidden="!methodOpen" @keydown="onMethodKey">
          <UiRadioGroup
            class="radios-col"
            label="Metode jadwal salat"
            :options="METHODS"
            :model-value="settings.settings.method"
            @update:model-value="setMethod"
          />
        </div>
        <p class="fine">{{ prayer.methodLine }}</p>
        <p class="fine">Tanggal Hijriah mengikuti Umm al-Qura dan bisa berbeda satu hari.</p>
        <p class="fine" :hidden="!prayer.zoneNote">{{ prayer.zoneNote }}</p>
      </div>
    </div>
    <ol class="strip" :aria-label="prayer.stripLabel">
      <li
        v-for="c in prayer.cells"
        :key="c.key"
        class="cell"
        :class="{ 'is-now': c.isNow, 'is-next': c.isNext, 'is-past': c.isPast }"
        :aria-current="c.isNow ? 'time' : undefined"
      >
        <i class="c-line" aria-hidden="true" :style="{ transform: lineTransform(c.isNow, c.line) }" />
        <span class="c-name">{{ c.name }}</span>
        <span class="c-time tnum">{{ c.time }}</span>
        <span class="c-word">{{ c.word }}</span>
      </li>
    </ol>
  </section>
</template>
