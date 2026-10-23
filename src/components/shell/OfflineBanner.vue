<script setup lang="ts">
// The offline banner (app.js paintOffline(), spec 4.14): in the flow under the
// top bar, it names the surahs stored for offline reading and opens the full
// list inline. The ui store keeps is-offline on the root and announces
// "Koneksi kembali." when the connection returns.
import { computed, ref, watch } from 'vue'
import UiIcon from '@/components/ui/UiIcon.vue'
import { useUiStore } from '@/stores/ui'
import { useLibraryStore } from '@/stores/library'
import { surahInfo } from '@/data/surah-index'

const ui = useUiStore()
const library = useLibraryStore()

// The list as it was when the connection dropped, as the prototype painted it.
const avail = ref(library.offline.map(surahInfo))
const open = ref(false)

watch(
  () => ui.online,
  (on) => {
    if (on) return
    avail.value = library.offline.map(surahInfo)
    open.value = false
  },
)

const sentence = computed(() => {
  const av = avail.value
  if (!av.length) return 'Kamu sedang offline. Belum ada surah yang tersimpan untuk dibaca offline.'
  const names = av.slice(0, 3).map((s) => s.namaLatin)
  const rest = av.length - names.length
  return `Kamu sedang offline. Yang bisa dibaca: ${names.join(', ')}${rest > 0 ? `, dan ${rest} surah lain.` : '.'}`
})
</script>

<template>
  <div class="offline" :hidden="ui.online" role="region" aria-label="Status koneksi">
    <template v-if="!ui.online">
      <div class="off-in wrap">
        <UiIcon name="offline" />
        <p>{{ sentence }}</p>
        <button v-if="avail.length" type="button" class="txt-link" :aria-expanded="open ? 'true' : 'false'" @click="open = !open">
          {{ open ? 'Tutup daftar' : 'Lihat daftar' }}
        </button>
      </div>
      <div class="off-list" :hidden="!open">
        <template v-if="open">
          <a v-for="s in avail" :key="s.nomor" class="txt-link" :href="`/surah/${s.nomor}`">{{ s.nomor }} {{ s.namaLatin }}</a>
        </template>
      </div>
    </template>
  </div>
</template>
