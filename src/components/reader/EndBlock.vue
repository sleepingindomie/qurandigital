<script setup lang="ts">
// End of surah (spec 4.11): "Selesai Yasin", then the next and previous surah
// as index rows (home.css .row rules). Rendered only for neighbours the API
// names; the test hooks are on these rows on phone and tablet.
import type { SurahIndexItem } from '@/types'
import { tempat } from '@/lib/util'

defineProps<{ name: string; next: SurahIndexItem | null; prev: SurahIndexItem | null }>()

type Dir = 'next' | 'prev'
const LABEL: Record<Dir, string> = { next: 'Berikutnya', prev: 'Sebelumnya' }
</script>

<template>
  <p class="end-h">Selesai {{ name }}</p>
  <template v-for="[dir, s] in ([['next', next], ['prev', prev]] as const)" :key="dir">
    <a v-if="s" v-qa-at="`${dir}-surah@phone,tab`" class="row end-row" :href="`/surah/${s.nomor}`" :data-pn="dir">
      <span class="r-num tnum">{{ s.nomor }}</span>
      <span class="r-name"><span class="r-nm">{{ LABEL[dir] }} · {{ s.namaLatin }}</span></span>
      <span class="r-sub"><template v-if="s.arti.trim().toLowerCase() !== s.namaLatin.trim().toLowerCase()"><span class="r-arti">{{ s.arti }}</span><span class="r-sep"> · </span></template><span class="r-meta">{{ s.jumlahAyat }} ayat · {{ tempat(s.tempatTurun) }}</span></span>
      <span class="r-ar" lang="ar" dir="rtl">{{ s.nama }}</span>
    </a>
  </template>
</template>
