<script setup lang="ts">
// The resume block: one head line (frame, Latin name and meta, Arabic name at
// the inline end), then the progress line and the link. Without a last read it
// offers Al-Fatihah, and Al-Kahf on Fridays in the place's zone. The whole
// block is one link through .rs-link::after; the frame is the shared element
// when it is the source.
import { computed, ref } from 'vue'
import UiFrame from '@/components/ui/UiFrame.vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { surahInfo } from '@/data/surah-index'
import { usePrayerStore } from '@/stores/prayer'
import { useReadingStore } from '@/stores/reading'

const reading = useReadingStore()
const prayer = usePrayerStore()
const frame = ref<InstanceType<typeof UiFrame> | null>(null)

const fatihah = surahInfo(1)

const last = computed(() => {
  const lr = reading.lastRead
  if (!lr || lr.surah < 1 || lr.surah > 114) return null
  const s = surahInfo(lr.surah)
  const ay = Math.min(Math.max(1, lr.ayat || 1), s.jumlahAyat)
  const finished = ay >= s.jumlahAyat && s.jumlahAyat > 1
  const nxt = finished && s.nomor < 114 ? surahInfo(s.nomor + 1) : null
  return {
    s,
    ay,
    finished,
    href: nxt ? `/surah/${nxt.nomor}/1` : `/surah/${s.nomor}/${ay}`,
    target: nxt ? nxt.nomor : s.nomor,
    linkText: nxt ? `Lanjut ke ${nxt.namaLatin}` : finished ? `Baca lagi dari ayat ${ay}` : `Lanjut ke ayat ${ay}`,
    heading: finished ? 'Selesai dibaca' : 'Lanjutkan membaca',
    line: finished ? `${s.namaLatin} selesai dibaca` : `${s.namaLatin}, ayat ${ay} dari ${s.jumlahAyat}`,
    prog: `scaleX(${(ay / s.jumlahAyat).toFixed(4)})`,
  }
})

defineExpose({
  /** The frame draw, once per session; see HomeView. */
  drawFrame: (delay = 0) => frame.value?.draw(delay),
})
</script>

<template>
  <section v-if="last" class="resume" aria-labelledby="h-resume" data-qa="last-read">
    <UiFrame ref="frame" :n="last.s.nomor" class="rs-frame" />
    <h2 id="h-resume" class="rs-h">{{ last.heading }}</h2>
    <p class="rs-line">{{ last.line }}</p>
    <div class="rs-prog" aria-hidden="true"><i :style="{ transform: last.prog }" /></div>
    <div class="rs-links">
      <a class="rs-link" :href="last.href" data-qa="surah-link" :data-surah="last.target" data-frame="1"
        ><span>{{ last.linkText }}</span><UiIcon name="right" class="arrow"
      /></a>
    </div>
    <!-- Last in the DOM so nothing follows the Arabic line; the grid puts it in the head row. -->
    <p class="rs-ar" lang="ar" dir="rtl">{{ last.s.nama }}</p>
  </section>
  <section v-else class="resume" aria-labelledby="h-resume">
    <UiFrame ref="frame" :n="1" class="rs-frame" />
    <h2 id="h-resume" class="rs-h">Mulai membaca</h2>
    <p class="rs-line">Al-Fatihah, 7 ayat</p>
    <div class="rs-links">
      <a class="rs-link" href="/surah/1" data-qa="surah-link" data-surah="1" data-frame="1"
        ><span>Buka Al-Fatihah</span><UiIcon name="right" class="arrow"
      /></a>
      <a v-if="prayer.isFriday" class="rs-alt txt-link" href="/surah/18">Atau baca Al-Kahf</a>
    </div>
    <p class="rs-ar" lang="ar" dir="rtl">{{ fatihah.nama }}</p>
  </section>
</template>
