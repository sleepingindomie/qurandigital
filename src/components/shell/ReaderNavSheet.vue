<script setup lang="ts">
// The reader's navigation sheet, opened by the title button in the reader bar:
// find another surah, the previous and next surah, jump to an ayat, the juz
// that start inside this surah, and the way home. It reads the surah from the
// route.
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiPanel from '@/components/ui/UiPanel.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { PANEL, useUiStore } from '@/stores/ui'
import { parseSurahParams } from '@/router'
import { SURAH_INDEX, isSurahNumber, surahInfo } from '@/data/surah-index'
import { searchSurah } from '@/lib/search'
import { juzStartsIn } from '@/lib/juz'
import { nav } from '@/composables/useNav'

const ui = useUiStore()
const route = useRoute()

const n = computed(() => {
  if (route.name !== 'surah') return null
  const v = parseSurahParams(route.params).n
  return isSurahNumber(v) ? v : null
})
const info = computed(() => (n.value ? surahInfo(n.value) : null))
const prev = computed(() => (n.value && n.value > 1 ? surahInfo(n.value - 1) : null))
const next = computed(() => (n.value && n.value < 114 ? surahInfo(n.value + 1) : null))
const juz = computed(() => (n.value ? [...juzStartsIn(n.value)] : []))

const q = ref('')
const hits = computed(() => {
  const v = q.value.trim()
  return v ? searchSurah(SURAH_INDEX, v).slice(0, 6) : []
})

// Every opening starts with an empty search.
watch(
  () => ui.panel?.seq,
  () => {
    if (ui.isOpen(PANEL.readerNav)) q.value = ''
  },
)

function goAyat(e: KeyboardEvent, close: (o?: { silent?: boolean }) => void) {
  const i = info.value
  if (e.key !== 'Enter' || !i || !n.value) return
  e.preventDefault()
  const k = Math.round(Number((e.target as HTMLInputElement).value))
  if (k >= 1 && k <= i.jumlahAyat) {
    close({ silent: true })
    nav(`/surah/${n.value}/${k}`)
  } else ui.announce(`${i.namaLatin} hanya punya ${i.jumlahAyat} ayat.`)
}
</script>

<template>
  <UiPanel :id="PANEL.readerNav" :title="info ? info.namaLatin : ''" mode="sheet" cls="panel-nav">
    <template v-if="info && n" #default="{ close }">
      <label class="set-label" for="nav-q">Cari surah</label>
      <div class="field field-s">
        <UiIcon name="search" />
        <input id="nav-q" v-model="q" type="search" class="nav-q" placeholder="Nama, arti, atau nomor" autocomplete="off" enterkeyhint="search" />
      </div>
      <ul class="nav-res">
        <li v-if="q.trim() && !hits.length" class="q-note">Tidak ada surah yang cocok. Coba nama lain atau nomor 1 sampai 114.</li>
        <li v-for="s in hits" :key="s.nomor">
          <a class="nav-hit" :href="`/surah/${s.nomor}`">
            <span class="o-num tnum">{{ s.nomor }}</span>
            <span class="o-name">{{ s.namaLatin }}</span>
            <span class="o-ar" lang="ar" dir="rtl">{{ s.nama }}</span>
          </a>
        </li>
      </ul>
      <div class="sheet-nav">
        <a v-if="prev" class="sheet-link" :href="`/surah/${prev.nomor}`" data-pn="prev">Sebelumnya: {{ prev.nomor }} {{ prev.namaLatin }}</a>
        <a v-if="next" class="sheet-link" :href="`/surah/${next.nomor}`" data-pn="next">Berikutnya: {{ next.nomor }} {{ next.namaLatin }}</a>
      </div>
      <label class="set-label" for="nav-ay">Ke ayat</label>
      <div class="field field-s">
        <input
          id="nav-ay"
          type="number"
          class="nav-ay"
          min="1"
          :max="info.jumlahAyat"
          inputmode="numeric"
          enterkeyhint="go"
          :placeholder="`1 sampai ${info.jumlahAyat}`"
          @keydown="goAyat($event, close)"
        />
      </div>
      <div v-if="juz.length" class="set-row set-col">
        <span class="set-label">Juz di surah ini</span>
        <ul class="sheet-juz">
          <li v-for="[ay, j] in juz" :key="ay">
            <a class="txt-link" :href="`/surah/${n}/${ay}`">Juz {{ j }} mulai ayat {{ ay }}</a>
          </li>
        </ul>
      </div>
      <div class="sheet-nav">
        <a class="sheet-link" href="/">Daftar isi</a>
        <a class="sheet-link" href="/" data-sec="waktu">Waktu salat</a>
      </div>
    </template>
  </UiPanel>
</template>
