<script setup lang="ts">
// The murattal bar (player.js mountBar() and render(), spec 4.10), after main
// in the DOM. It shows while the player store says so, slides in two frames
// after it unhides and hides 220 ms after it slides out. The progress line and
// the medallion trace follow the audio through onProgress(), not reactive
// state. Tests read data-status and data-ayat from this element.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiMedallion from '@/components/ui/UiMedallion.vue'
import { PANEL, useUiStore } from '@/stores/ui'
import { usePlayerStore } from '@/stores/player'
import { parseSurahParams } from '@/router'
import { nav } from '@/composables/useNav'
import { motionOK } from '@/lib/motion'

const ui = useUiStore()
const player = usePlayerStore()
const route = useRoute()

const med = ref<InstanceType<typeof UiMedallion> | null>(null)
const fill = ref<HTMLElement | null>(null)
const nowBtn = ref<HTMLButtonElement | null>(null)
const qariBtn = ref<HTMLButtonElement | null>(null)

const phone = computed(() => ui.bp === 'phone')
const bar = computed(() => player.bar)
/** The reader of the playing surah is on screen. */
const onReader = computed(() => !!player.surah && route.name === 'surah' && parseSurahParams(route.params).n === player.surah.nomor)
const nowLabel = computed(() => (player.surah ? player.nowLabel(onReader.value, phone.value) : undefined))

// ------------------------------------------------------------ show and hide
const hidden = ref(!player.visible)
const on = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => player.visible,
  (v) => {
    clearTimeout(hideTimer)
    if (v) {
      hidden.value = false
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (player.visible) on.value = true
        }),
      )
      return
    }
    on.value = false
    const done = () => {
      if (!player.visible) hidden.value = true
    }
    if (motionOK()) hideTimer = setTimeout(done, 220)
    else done()
  },
  { immediate: true },
)

// ------------------------------------------------------------ trace
const offProgress = player.onProgress((f) => {
  const t = med.value?.trace
  if (t) t.style.strokeDashoffset = String(100 - 100 * f)
  if (fill.value) fill.value.style.transform = `scaleX(${f})`
})

onBeforeUnmount(() => {
  offProgress()
  clearTimeout(hideTimer)
})

// ------------------------------------------------------------ actions
// The title: back to the playing ayat from elsewhere; on its own reader, the
// player sheet on phone or the scroll back to the ayat on wider screens.
function onNow() {
  const s = player.surah
  if (!s) return
  if (!onReader.value) {
    nav(`/surah/${s.nomor}/${player.ayat || 1}`)
    return
  }
  if (phone.value) ui.openPanel(PANEL.playerSheet, { anchor: nowBtn.value })
  else if (player.ayat) player.backToAyat()
}

const openQari = () => ui.openPanel(PANEL.qari, { anchor: qariBtn.value })
</script>

<template>
  <section
    id="player"
    class="player"
    :class="{ on, 'has-action': bar.hasAction }"
    data-qa="player"
    :data-status="player.domStatus"
    :data-ayat="player.ayat ?? ''"
    role="region"
    aria-label="Pemutar murattal"
    :hidden="hidden"
  >
    <div class="p-prog" aria-hidden="true"><i ref="fill" /></div>
    <div class="p-in wrap">
      <button ref="nowBtn" type="button" class="p-now" :aria-label="nowLabel" @click="onNow">
        <UiMedallion ref="med" :n="bar.medNumber" />
        <span class="p-txt">
          <span class="p-title">{{ phone ? bar.title.phone : bar.title.wide }}</span>
          <span class="p-sub">{{ phone ? bar.subPhone : bar.sub }}</span>
        </span>
      </button>
      <div class="p-ctl">
        <button type="button" class="ib" aria-label="Ayat sebelumnya" :disabled="bar.prevDisabled" @click="player.prev()">
          <UiIcon name="prev" />
        </button>
        <button
          type="button"
          class="disc"
          :class="{ 'is-play': !bar.playingLike }"
          data-qa="player-toggle"
          :aria-label="bar.toggleLabel"
          :disabled="bar.toggleDisabled"
          @click="player.barToggle()"
        >
          <UiIcon name="pause" class="i-pause" />
          <UiIcon name="play" class="i-play" />
        </button>
        <button type="button" class="ib" aria-label="Ayat berikutnya" :disabled="bar.nextDisabled" @click="player.next()">
          <UiIcon name="next" />
        </button>
      </div>
      <div class="p-end">
        <div class="p-extra">
          <span class="p-time">{{ player.timeText }}</span>
          <button type="button" class="ib p-rep" :aria-pressed="bar.repeatPressed ? 'true' : 'false'" aria-label="Ulangi ayat" @click="player.toggleRepeat()">
            <UiIcon name="repeat" />
            <span class="rep-n">{{ bar.repeatBadge }}</span>
          </button>
          <button ref="qariBtn" type="button" class="txt-link p-qari" aria-haspopup="dialog" data-qa="reciter" :aria-label="bar.qariLabel" @click="openQari">
            Qari
          </button>
        </div>
        <button type="button" class="txt-btn p-action" :hidden="!bar.hasAction" @click="player.barAction()">{{ bar.action }}</button>
        <button type="button" class="ib p-close" aria-label="Tutup pemutar" @click="player.stop()">
          <UiIcon name="close" />
        </button>
      </div>
    </div>
  </section>
</template>
