<script setup lang="ts">
// Ditandai (tanda.js, spec 3.7): bookmarks grouped by surah, each with the
// first 120 characters of its translation. Arabic is never excerpted. The top
// bar is the home bar.
import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import HomeBar from '@/components/home/HomeBar.vue'
import { useReadingStore } from '@/stores/reading'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import { surahInfo } from '@/data/surah-index'
import { excerpt } from '@/lib/util'
import type { Bookmark } from '@/types'

const reading = useReadingStore()
const library = useLibraryStore()
const ui = useUiStore()

const groups = computed(() => {
  const map = new Map<number, Bookmark[]>()
  for (const b of reading.bookmarks) {
    const list = map.get(b.surah)
    if (list) list.push(b)
    else map.set(b.surah, [b])
  }
  return [...map]
    .sort((a, b) => a[0] - b[0])
    .map(([sn, items]) => ({ info: surahInfo(sn), items: items.slice().sort((a, b) => a.ayat - b.ayat) }))
})

// Excerpts by "surah:ayat", filled as each surah loads (from cache when it can).
const excerpts = reactive<Record<string, string>>({})
const asked = new Set<number>()
let alive = true

function loadExcerpts() {
  for (const g of groups.value) {
    const sn = g.info.nomor
    if (asked.has(sn)) continue
    asked.add(sn)
    library
      .loadSurah(sn)
      .then((full) => {
        if (!alive) return
        for (const b of g.items) {
          const a = full.ayat[b.ayat - 1]
          if (a) excerpts[`${sn}:${b.ayat}`] = excerpt(a.teksIndonesia)
        }
      })
      .catch(() => asked.delete(sn))
  }
}
watch(groups, loadExcerpts, { immediate: true })
onBeforeUnmount(() => (alive = false))

function remove(sn: number, ayat: number, name: string) {
  reading.removeBookmark(sn, ayat)
  ui.announce(`Tanda ${name} ayat ${ayat} dihapus.`)
}
</script>

<template>
  <Teleport defer to="#bar-slot">
    <HomeBar />
  </Teleport>
  <div class="tanda wrap">
    <h1 class="tanda-h">Ditandai</h1>
    <p class="tanda-c">{{ reading.bookmarks.length ? `${reading.bookmarks.length} ayat` : '' }}</p>
    <div class="tanda-b">
      <p v-if="!groups.length" class="tanda-empty">Belum ada ayat yang ditandai. Tandai ayat lewat tombol penanda di samping nomornya.</p>
      <section v-for="g in groups" :key="g.info.nomor" class="tanda-g" :aria-label="g.info.namaLatin">
        <div class="tanda-gh">
          <h2>{{ g.info.nomor }} {{ g.info.namaLatin }}</h2>
          <p class="tanda-ar" lang="ar" dir="rtl">{{ g.info.nama }}</p>
        </div>
        <ol class="tanda-rows">
          <li v-for="b in g.items" :key="b.ayat" class="tanda-row">
            <p class="tanda-ay">Ayat {{ b.ayat }}</p>
            <p class="tanda-ex">{{ excerpts[`${g.info.nomor}:${b.ayat}`] || '' }}</p>
            <div class="tanda-acts">
              <a class="txt-link" :href="`/surah/${g.info.nomor}/${b.ayat}`" data-qa="surah-link" :data-surah="g.info.nomor">Buka</a>
              <button type="button" class="txt-link" @click="remove(g.info.nomor, b.ayat, g.info.namaLatin)">Hapus tanda</button>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>
