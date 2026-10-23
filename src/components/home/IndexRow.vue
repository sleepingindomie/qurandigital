<script setup lang="ts">
// One index row (home.js indexRow()): number, Latin name, meaning and meta,
// Arabic name in its own column. Last read and "belum tersimpan" (offline,
// not stored) live in the meta line.
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
        ><template v-if="!sameName(s)"><span class="r-arti">{{ s.arti }}</span><span class="r-sep">{{ ' · ' }}</span></template
        ><span class="r-meta"
          >{{ meta }}<template v-if="lastAyat !== null">{{ ' · ' }}<span class="r-last">terakhir dibaca ayat {{ lastAyat }}</span></template
          ><span class="r-off">{{ ' · belum tersimpan' }}</span></span
        ></span
      >
      <span class="r-ar" lang="ar" dir="rtl">{{ s.nama }}</span>
    </a>
  </li>
</template>
