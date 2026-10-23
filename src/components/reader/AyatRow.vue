<script setup lang="ts">
// One ayat row (reader.js buildRow(), spec 4.8): medallion link, state word,
// play, bookmark, tafsir and menu, then Arabic, transliteration, translation.
// The U+06DE mark is removed from the Arabic; the break above the row shows it.
// A touch long press on the medallion opens the ayat menu.
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Ayat } from '@/types'
import type { RowState } from './row-state'
import UiIcon from '@/components/ui/UiIcon.vue'
import UiMedallion from '@/components/ui/UiMedallion.vue'
import { useReadingStore } from '@/stores/reading'
import { useUiStore } from '@/stores/ui'
import { EASE_DRAW, EASE_UI, motionOK } from '@/lib/motion'
import { stripHizbMark } from '@/lib/juz'

const props = defineProps<{
  surah: number
  k: number
  a: Ayat
  marked: boolean
  state: RowState | null
  /** The tafsir of this ayat is open in the desktop plate. */
  tafsirOpen: boolean
  /** contain-intrinsic-size estimate in px. */
  size: number
  flash: '' | 'flash' | 'flash-static'
}>()

const emit = defineEmits<{
  play: [k: number]
  tafsir: [k: number, opener: HTMLElement]
  menu: [k: number, opener: HTMLElement]
  med: [k: number]
}>()

const reading = useReadingStore()
const ui = useUiStore()

const markBtn = ref<HTMLButtonElement | null>(null)
const menuBtn = ref<HTMLButtonElement | null>(null)

const ar = computed(() => stripHizbMark(props.a.teksArab))
const word = computed(() => props.state?.word || (props.tafsirOpen ? 'Tafsir dibuka' : ''))

function toggleMark() {
  const k = props.k
  const on = reading.toggleBookmark({ surah: props.surah, ayat: k })
  ui.announce(on ? `Ayat ${k} ditandai.` : `Tanda ayat ${k} dihapus.`)
  const btn = markBtn.value
  if (!btn || !motionOK()) return
  const line = btn.querySelector('.mk-line')
  const fill = btn.querySelector('.mk-fill')
  // On: the outline draws, then the fill comes in. Off: the fill fades.
  if (on) {
    line?.animate(
      [
        { strokeDasharray: '100 100', strokeDashoffset: 100 },
        { strokeDasharray: '100 100', strokeDashoffset: 0 },
      ],
      { duration: 320, easing: EASE_DRAW },
    )
    fill?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.66 }, { opacity: 1 }], { duration: 480, easing: EASE_UI })
  } else fill?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE_UI })
}

// ------------------------------------------------------------ long press
let lpTimer: ReturnType<typeof setTimeout> | undefined
function lpStart(e: PointerEvent) {
  if (e.pointerType !== 'touch') return
  clearTimeout(lpTimer)
  lpTimer = setTimeout(() => {
    lpTimer = undefined
    if (menuBtn.value) emit('menu', props.k, menuBtn.value)
  }, 500)
}
const lpCancel = () => clearTimeout(lpTimer)
onBeforeUnmount(lpCancel)

const opener = (e: Event) => e.currentTarget as HTMLElement
</script>

<template>
  <li
    :id="`ayat-${k}`"
    :class="['ayah', state?.cls, flash]"
    :data-n="k"
    data-qa="ayat"
    :data-ayat="k"
    :aria-current="state?.current ? 'true' : undefined"
    :style="{ containIntrinsicSize: `auto ${size}px` }"
  >
    <div class="gut">
      <UiMedallion
        tag="a"
        :n="k"
        :href="`/surah/${surah}/${k}`"
        :aria-label="`Ayat ${k}, tautan ke ayat ini`"
        data-local="1"
        @click.prevent="emit('med', k)"
        @pointerdown="lpStart"
        @pointerup="lpCancel"
        @pointercancel="lpCancel"
        @pointermove="lpCancel"
        @contextmenu.prevent
      />
      <span class="state" aria-hidden="true">{{ word }}</span>
      <div class="btns">
        <button type="button" class="ib play" data-qa="ayat-play" :aria-label="state ? state.label : `Putar ayat ${k}`" @click="emit('play', k)">
          <UiIcon :name="state ? state.icon : 'play'" />
        </button>
        <button
          ref="markBtn"
          type="button"
          class="ib mark"
          data-qa="bookmark"
          :aria-pressed="marked ? 'true' : 'false'"
          :aria-label="marked ? `Hapus tanda ayat ${k}` : `Tandai ayat ${k}`"
          @click="toggleMark"
        >
          <UiIcon name="mark" />
        </button>
        <button type="button" class="ib tafsir" data-qa="tafsir" :aria-label="`Tafsir ayat ${k}`" @click="emit('tafsir', k, opener($event))">
          <UiIcon name="book" />
        </button>
        <button
          ref="menuBtn"
          type="button"
          class="ib menu"
          aria-haspopup="menu"
          :aria-label="`Menu ayat ${k}`"
          @click="emit('menu', k, opener($event))"
        >
          <UiIcon name="more" />
        </button>
      </div>
    </div>
    <p class="ar" lang="ar" dir="rtl">{{ ar }}</p>
    <p class="lat" lang="ar-Latn">{{ a.teksLatin }}</p>
    <p class="tr">{{ a.teksIndonesia }}</p>
  </li>
</template>
