<script setup lang="ts">
// One index row on a single line: number, Latin name, the meaning or the last
// read ayat, and the Arabic name. The ayat count and place stay in the link
// text for screen readers; "belum tersimpan" shows only offline, for surahs
// that are not stored.
import { computed } from 'vue'
import type { SurahIndexItem } from '@/types'
import { tempat } from '@/lib/util'
import { sameName } from './search'

const props = defineProps<{ s: SurahIndexItem; lastAyat: number | null; avail: boolean }>()

const meta = computed(() => `${props.s.jumlahAyat} ayat · ${tempat(props.s.tempatTurun)}`)
</script>

<template>
  <li>
    <a
      class="row"
      :class="{ 'is-last': lastAyat !== null }"
      :href="`/surah/${s.nomor}`"
      data-qa="surah-link"
      :data-surah="s.nomor"
      :data-avail="avail ? '1' : undefined"
    >
      <span class="r-num tnum">{{ s.nomor }}</span>
      <span class="r-name"><span class="r-nm">{{ s.namaLatin }}</span></span>
      <span class="r-sub"
        ><span v-if="lastAyat !== null" class="r-last">terakhir ayat {{ lastAyat }}</span
        ><span v-else-if="!sameName(s)" class="r-arti">{{ s.arti }}</span
        ><span class="r-off">belum tersimpan</span
        ><span class="r-meta sr">{{ ' ' + meta }}</span></span
      >
      <span class="r-ar" lang="ar" dir="rtl">{{ s.nama }}</span>
    </a>
  </li>
</template>
