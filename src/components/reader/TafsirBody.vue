<script setup lang="ts">
// Kemenag tafsir of one ayat: static loading bars, the paragraphs, or the error
// with "Coba lagi". Used in the desktop plate and in the sheet below 1100 px.
import { onBeforeUnmount, ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { tafsirParagraphs } from '@/lib/api'

const props = defineProps<{ surah: number; ayat: number }>()

const library = useLibraryStore()
const state = ref<'loading' | 'done' | 'error'>('loading')
const paras = ref<string[]>([])
const offline = ref(false)
let alive = true

function load() {
  state.value = 'loading'
  library.loadTafsir(props.surah).then(
    (map) => {
      if (!alive) return
      paras.value = tafsirParagraphs(map.get(props.ayat))
      state.value = 'done'
    },
    () => {
      if (!alive) return
      offline.value = !navigator.onLine
      state.value = 'error'
    },
  )
}

load()
onBeforeUnmount(() => (alive = false))
</script>

<template>
  <div class="tf-body">
    <div v-if="state === 'loading'" class="tf-load">
      <p class="tf-label">Memuat tafsir</p>
      <i /><i /><i />
    </div>
    <template v-else-if="state === 'error'">
      <p class="tf-err">{{ offline ? 'Tafsir butuh koneksi internet.' : 'Tafsir belum bisa dimuat. Periksa koneksi lalu coba lagi.' }}</p>
      <button type="button" class="txt-btn primary" @click="load">Coba lagi</button>
    </template>
    <template v-else>
      <p v-if="!paras.length" class="tf-p">Tafsir untuk ayat ini belum tersedia.</p>
      <p v-for="(p, i) in paras" :key="i" class="tf-p">{{ p }}</p>
    </template>
  </div>
</template>
