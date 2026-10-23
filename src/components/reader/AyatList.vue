<script setup lang="ts">
// The rendered window of ayat rows (lo to hi) with the juz and hizb breaks
// above them. Its own component, so the running head changing on every
// scrolled ayat does not re-render the rows.
import { ref } from 'vue'
import type { Surah } from '@/types'
import type { RowState } from './row-state'
import UiStarRule from '@/components/ui/UiStarRule.vue'
import AyatRow from './AyatRow.vue'
import JuzBreak from './JuzBreak.vue'
import { useReadingStore } from '@/stores/reading'
import { useUiStore } from '@/stores/ui'
import { hasHizbMark, juzStartsIn } from '@/lib/juz'

const props = defineProps<{
  n: number
  /** Latin name for the list label. */
  name: string
  surah: Surah | null
  lo: number
  hi: number
  states: Map<number, RowState>
  sizes: readonly number[]
  tafsirAyat: number | null
  flash: { k: number; kind: 'flash' | 'flash-static' } | null
}>()

const emit = defineEmits<{
  play: [k: number]
  tafsir: [k: number, opener: HTMLElement]
  menu: [k: number, opener: HTMLElement]
  med: [k: number]
}>()

const reading = useReadingStore()
const ui = useUiStore()
const juzAt = juzStartsIn(props.n)
const el = ref<HTMLOListElement | null>(null)

function range(): number[] {
  const out: number[] = []
  if (!props.surah || props.lo < 1) return out
  for (let k = props.lo; k <= props.hi; k++) out.push(k)
  return out
}

defineExpose({ el })
</script>

<template>
  <ol ref="el" class="ayat-list" :data-surah="n" :aria-label="`Ayat surah ${name}`">
    <template v-if="surah">
      <template v-for="k in range()" :key="k">
        <li v-if="juzAt.has(k) && k !== 1" class="brk-li"><JuzBreak :juz="juzAt.get(k)!" /></li>
        <li v-else-if="k !== 1 && hasHizbMark(surah.ayat[k - 1].teksArab)" class="brk-li" aria-hidden="true">
          <div class="brk"><UiStarRule /></div>
        </li>
        <AyatRow
          :surah="n"
          :k="k"
          :a="surah.ayat[k - 1]"
          :marked="reading.isBookmarked(n, k)"
          :state="states.get(k) ?? null"
          :tafsir-open="tafsirAyat === k && ui.bp === 'desk'"
          :size="sizes[k - 1] ?? 0"
          :flash="flash && flash.k === k ? flash.kind : ''"
          @play="(k) => emit('play', k)"
          @tafsir="(k, o) => emit('tafsir', k, o)"
          @menu="(k, o) => emit('menu', k, o)"
          @med="(k) => emit('med', k)"
        />
      </template>
    </template>
  </ol>
</template>
