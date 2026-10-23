<script setup lang="ts">
// The index: Surah and Juz tabs with the sliding underline, the search results
// state, and the rows. On desktop the surah list runs row by row. Only the open
// panel holds links, so every surah has exactly one visible link.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { SurahIndexItem } from '@/types'
import { SURAH_INDEX, surahInfo } from '@/data/surah-index'
import { JUZ, juzOf } from '@/lib/juz'
import { EASE_UI, motionOK } from '@/lib/motion'
import { useEventListener } from '@/composables/useEventListener'
import { useLibraryStore } from '@/stores/library'
import { useReadingStore } from '@/stores/reading'
import IndexRow from './IndexRow.vue'
import { writeHomeQuery } from './homeRoute'
import type { HomeFilter, IndexTab } from './search'
import { NO_MATCH } from './search'

const props = defineProps<{ filter: HomeFilter; initialTab: IndexTab }>()
const emit = defineEmits<{ clear: [] }>()

const library = useLibraryStore()
const reading = useReadingStore()

// Juz groups: the surahs whose ayat 1 falls in each juz (static).
const JUZ_GROUPS = JUZ.map(([sn, ay], i) => {
  const j = i + 1
  return { j, sn, ay, start: surahInfo(sn), surahs: SURAH_INDEX.filter((x) => juzOf(x.nomor, 1) === j) }
})

const root = ref<HTMLElement | null>(null)
const tabS = ref<HTMLButtonElement | null>(null)
const tabJ = ref<HTMLButtonElement | null>(null)
const pnS = ref<HTMLElement | null>(null)
const pnJ = ref<HTMLElement | null>(null)
const lineStyle = ref<Record<string, string>>({})
const tab = ref<IndexTab>(props.initialTab)

const q = computed(() => props.filter.q)
const shown = computed<readonly SurahIndexItem[]>(() => props.filter.results)
const avail = computed(() => new Set(library.offline))
const lastAyat = (n: number) => (reading.lastRead && reading.lastRead.surah === n ? reading.lastRead.ayat : null)

const heading = computed(() => (q.value ? `Hasil untuk “${q.value}”` : 'Daftar isi'))
const countLine = computed(() => (shown.value.length ? `${shown.value.length} surah cocok` : 'Tidak ada yang cocok'))

function placeLine() {
  const t = tab.value === 'juz' ? tabJ.value : tabS.value
  if (!t || !t.offsetWidth) return
  lineStyle.value = { transform: `translateX(${t.offsetLeft}px) scaleX(${t.offsetWidth})` }
}

function setTab(t: IndexTab, { focus = false, fade = true }: { focus?: boolean; fade?: boolean } = {}) {
  tab.value = t
  if (focus) (t === 'juz' ? tabJ.value : tabS.value)?.focus()
  placeLine()
  if (fade && motionOK())
    nextTick(() => {
      const pn = t === 'juz' ? pnJ.value : pnS.value
      pn?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_UI })
    })
  // The tab lives in the URL only while there is no search query.
  if (!props.filter.q) writeHomeQuery(t === 'juz' ? { tab: 'juz' } : {})
}

function onTabKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    setTab(tab.value === 'surah' ? 'juz' : 'surah', { focus: true })
  }
}

// A search always shows the surah list.
watch(
  () => props.filter,
  (f) => {
    if (tab.value !== 'surah' && f.q) setTab('surah', { fade: false })
  },
)

onMounted(() => {
  if (!props.filter.q) writeHomeQuery(tab.value === 'juz' ? { tab: 'juz' } : {})
  requestAnimationFrame(placeLine)
  if (document.fonts) document.fonts.ready.then(placeLine)
})
useEventListener(window, 'resize', () => requestAnimationFrame(placeLine))

defineExpose({
  setTab,
  tab,
  scrollIntoView() {
    root.value?.scrollIntoView({ block: 'start' })
  },
})
</script>

<template>
  <section id="indeks" ref="root" class="index wrap" aria-labelledby="h-idx">
    <div class="idx-head">
      <div class="idx-title">
        <h2 id="h-idx" class="idx-h">{{ heading }}</h2>
        <p class="idx-count" :hidden="!q">{{ countLine }}</p>
        <button type="button" class="txt-link idx-clear" :hidden="!q" @click="emit('clear')">Hapus pencarian</button>
      </div>
      <div role="tablist" class="tabs" aria-label="Susunan daftar isi" @keydown="onTabKey">
        <button
          id="tab-surah"
          ref="tabS"
          type="button"
          role="tab"
          aria-controls="pn-surah"
          class="tab"
          :aria-selected="tab === 'surah' ? 'true' : 'false'"
          :tabindex="tab === 'surah' ? 0 : -1"
          @click="setTab('surah')"
          >Surah</button
        >
        <button
          id="tab-juz"
          ref="tabJ"
          type="button"
          role="tab"
          aria-controls="pn-juz"
          class="tab"
          :aria-selected="tab === 'juz' ? 'true' : 'false'"
          :tabindex="tab === 'juz' ? 0 : -1"
          @click="setTab('juz')"
          >Juz</button
        >
        <span class="tab-line" aria-hidden="true" :style="lineStyle" />
      </div>
    </div>
    <div id="pn-surah" ref="pnS" role="tabpanel" aria-labelledby="tab-surah" class="pn" :hidden="tab !== 'surah'">
      <ol class="rows" :class="{ 'one-col': shown.length <= 6 }" aria-labelledby="h-idx" :style="{ '--rows': Math.ceil(shown.length / 2) }">
        <template v-if="tab === 'surah'">
          <IndexRow v-for="s in shown" :key="s.nomor" :s="s" :last-ayat="lastAyat(s.nomor)" :avail="avail.has(s.nomor)" />
        </template>
      </ol>
      <p class="idx-empty" :hidden="shown.length > 0">{{ NO_MATCH }}</p>
    </div>
    <div id="pn-juz" ref="pnJ" role="tabpanel" aria-labelledby="tab-juz" class="pn" :hidden="tab !== 'juz'">
      <div v-if="tab === 'juz'" class="juz-cols">
        <section v-for="g in JUZ_GROUPS" :key="g.j" class="juz-g" :aria-labelledby="'jz-' + g.j">
          <div class="juz-head">
            <h3 :id="'jz-' + g.j">Juz {{ g.j }}</h3>
            <a class="txt-link" :href="`/surah/${g.sn}/${g.ay}`" data-qa="surah-link" :data-surah="g.sn">mulai {{ g.start.namaLatin }} ayat {{ g.ay }}</a>
          </div>
          <ol v-if="g.surahs.length" class="rows rows-plain">
            <IndexRow v-for="s in g.surahs" :key="s.nomor" :s="s" :last-ayat="lastAyat(s.nomor)" :avail="avail.has(s.nomor)" />
          </ol>
        </section>
      </div>
    </div>
  </section>
</template>
