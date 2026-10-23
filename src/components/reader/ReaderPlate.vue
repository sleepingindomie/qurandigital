<script setup lang="ts">
// The plate (reader.js, spec 3.2): sticky beside the text on desktop, a header
// row that scrolls away below 1100. Frame, names, facts, reading position,
// "Putar surah", the view toggles, "Tentang surah ini" and previous and next.
// On desktop the tafsir crossfades into the plate in place of the info.
import { computed, nextTick, onMounted, onScopeDispose, ref } from 'vue'
import type { SurahIndexItem } from '@/types'
import UiFrame from '@/components/ui/UiFrame.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import TafsirBody from './TafsirBody.vue'
import { useSettingsStore } from '@/stores/settings'
import { EASE_UI, motionOK } from '@/lib/motion'
import { bp, onBp } from '@/lib/breakpoint'
import { juzRange } from '@/lib/juz'
import { tempat } from '@/lib/util'

const props = defineProps<{
  n: number
  info: SurahIndexItem
  prev: SurahIndexItem | null
  next: SurahIndexItem | null
  loaded: boolean
  posText: string
  progress: string
  playBusy: boolean
  playLabel: string
  aboutText: string
}>()
const emit = defineEmits<{ play: []; about: [open: boolean]; tafsirBack: [] }>()

const settings = useSettingsStore()

const M = computed(() => props.info.jumlahAyat)
const juz = computed(() => juzRange(props.n, M.value))
const place = computed(() => tempat(props.info.tempatTurun))
// Some meanings repeat the name (Yasin, Taha, Qaf); then the meaning line is left out.
const artiSame = computed(() => props.info.arti.trim().toLowerCase() === props.info.namaLatin.trim().toLowerCase())
const metaC = computed(() =>
  [artiSame.value ? null : props.info.arti, `${M.value} ayat`, place.value, juz.value].filter(Boolean).join(' · '),
)

const root = ref<HTMLElement | null>(null)
const frame = ref<InstanceType<typeof UiFrame> | null>(null)
const infoEl = ref<HTMLElement | null>(null)
const metaEl = ref<HTMLElement | null>(null)
const tfEl = ref<HTMLElement | null>(null)
const backBtn = ref<HTMLButtonElement | null>(null)

// ------------------------------------------------------------ phone header
// The Arabic name drops to its own row if the title column gets narrower than 140 px.
const arBelow = ref(false)
function checkHeader() {
  const el = infoEl.value
  const m = metaEl.value
  if (!el || !m) return
  el.classList.remove('ar-below')
  const below = bp() === 'phone' && m.getBoundingClientRect().width < 140
  el.classList.toggle('ar-below', below)
  arBelow.value = below
}
onScopeDispose(onBp(checkHeader))
onMounted(() => {
  checkHeader()
  document.fonts?.ready.then(() => root.value && checkHeader())
})

// ------------------------------------------------------------ tafsir (desktop)
const tafsirK = ref<number | null>(null)
const infoHidden = ref(false)
const tfHidden = ref(true)

function crossfade(toTafsir: boolean, done?: () => void) {
  const out = toTafsir ? infoEl.value : tfEl.value
  const inn = () => (toTafsir ? tfEl.value : infoEl.value)
  const swap = () => {
    infoHidden.value = toTafsir
    tfHidden.value = !toTafsir
  }
  if (!motionOK() || !out || !out.animate) {
    swap()
    nextTick(() => done?.())
    return
  }
  const after = () => {
    swap()
    nextTick(() => {
      inn()?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_UI })
      done?.()
    })
  }
  out.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE_UI }).finished.then(after, after)
}

const focusBack = () => backBtn.value?.focus({ preventScroll: true })

/** Shows the tafsir of ayat k in the plate, crossfading from the info the first time. */
function openTafsir(k: number) {
  tafsirK.value = k
  if (tfHidden.value) crossfade(true, focusBack)
  else nextTick(focusBack)
  if (root.value) root.value.scrollTop = 0
}

/** Back to the surah info. */
function closeTafsir() {
  if (!tfHidden.value) crossfade(false)
}

function onAboutToggle(e: Event) {
  emit('about', (e.target as HTMLDetailsElement).open)
}

defineExpose({
  root,
  drawFrame: () => frame.value?.draw(120),
  openTafsir,
  closeTafsir,
})
</script>

<template>
  <aside ref="root" class="plate" aria-label="Tentang surah ini">
    <div ref="infoEl" :class="['pl-info', { 'ar-below': arBelow }]" :hidden="infoHidden">
      <UiFrame ref="frame" :n="n" class="pl-frame" />
      <h1 class="pl-title">{{ info.namaLatin }}</h1>
      <p class="pl-ar" lang="ar" dir="rtl">{{ info.nama }}</p>
      <p class="pl-arti" :hidden="artiSame">{{ info.arti }}</p>
      <p ref="metaEl" class="pl-metac">{{ metaC }}</p>
      <div class="pl-facts">
        <p>{{ place }} · {{ M }} ayat</p>
        <p>{{ juz }}</p>
        <p v-if="n === 9" class="pl-note">Surah ini dibuka tanpa Basmalah.</p>
      </div>
      <div class="pl-pos">
        <p class="pl-pos-t tnum">{{ posText }}</p>
        <span class="line" aria-hidden="true"><i :style="{ transform: `scaleX(${progress})` }" /></span>
      </div>
      <div class="pl-acts">
        <button v-qa-at="'play-all@tab,desk'" type="button" class="play-all" :disabled="!loaded" @click="emit('play')">
          <span class="disc-s" aria-hidden="true"><UiIcon :name="playBusy ? 'pause' : 'play'" /></span>
          <span class="pa-t">{{ playLabel }}</span>
        </button>
        <div class="views" role="group" aria-label="Tampilkan">
          <span class="views-l">Tampilkan</span>
          <button
            type="button"
            class="vt-btn"
            :aria-pressed="settings.settings.latin ? 'true' : 'false'"
            @click="settings.set({ latin: !settings.settings.latin })"
          >Latin</button>
          <button
            type="button"
            class="vt-btn"
            :aria-pressed="settings.settings.translation ? 'true' : 'false'"
            @click="settings.set({ translation: !settings.settings.translation })"
          >Terjemahan</button>
        </div>
      </div>
      <details class="pl-about" @toggle="onAboutToggle">
        <summary>Tentang surah ini</summary>
        <p class="about-p">{{ aboutText }}</p>
      </details>
      <nav class="pl-pn" aria-label="Surah sebelum dan sesudah">
        <a v-if="prev" class="txt-link" :href="`/surah/${prev.nomor}`" data-pn="prev">Sebelumnya · {{ prev.nomor }} {{ prev.namaLatin }}</a>
        <a v-if="next" class="txt-link" :href="`/surah/${next.nomor}`" data-pn="next">Berikutnya · {{ next.nomor }} {{ next.namaLatin }}</a>
      </nav>
    </div>
    <div ref="tfEl" class="pl-tafsir" :hidden="tfHidden">
      <template v-if="tafsirK !== null">
        <div class="tf-head">
          <h2 class="tf-h">Tafsir Kemenag, ayat {{ tafsirK }}</h2>
          <button ref="backBtn" type="button" class="txt-link" @click="emit('tafsirBack')">Kembali ke info surah</button>
        </div>
        <TafsirBody :key="tafsirK" :surah="n" :ayat="tafsirK" />
      </template>
    </div>
  </aside>
</template>
