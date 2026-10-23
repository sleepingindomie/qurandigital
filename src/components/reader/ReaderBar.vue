<script setup lang="ts">
// The reader's top bar (reader.js readerBar()), teleported into #bar-slot:
// back to the index, the running head (opens the navigation sheet), previous
// and next on desktop, the phone play button, Aa, theme and the progress line.
import { ref } from 'vue'
import type { SurahIndexItem } from '@/types'
import UiIcon from '@/components/ui/UiIcon.vue'
import { PANEL, useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'

defineProps<{
  info: SurahIndexItem
  prev: SurahIndexItem | null
  next: SurahIndexItem | null
  /** Running head second line: "Ayat 3 dari 83 · Juz 22", or "Ayat 3 · Juz 22" on phone. */
  pos: string
  /** scaleX of the progress line. */
  progress: string
  playBusy: boolean
  playLabel: string
}>()
const emit = defineEmits<{ play: [] }>()

const ui = useUiStore()
const settings = useSettingsStore()
const rh = ref<HTMLButtonElement | null>(null)
const aa = ref<HTMLButtonElement | null>(null)
</script>

<template>
  <Teleport defer to="#bar-slot">
    <div class="bar-in wrap rd-bar">
      <a href="/" class="back" data-qa="home" aria-label="Kembali ke daftar isi"><UiIcon name="back" /><span class="back-t">Daftar isi</span></a>
      <button
        ref="rh"
        type="button"
        class="rh"
        aria-haspopup="dialog"
        :aria-label="`${info.namaLatin}, buka navigasi surah`"
        @click="ui.openPanel(PANEL.readerNav, { anchor: rh })"
      >
        <span class="rh-name">{{ info.namaLatin }}</span>
        <span class="rh-pos tnum">{{ pos }}</span>
      </button>
      <nav class="rd-pn" aria-label="Surah sebelum dan sesudah">
        <a v-if="prev" v-qa-at="'prev-surah@desk'" class="txt-link" :href="`/surah/${prev.nomor}`" data-pn="prev">Sebelumnya: {{ prev.namaLatin }}</a>
        <a v-if="next" v-qa-at="'next-surah@desk'" class="txt-link" :href="`/surah/${next.nomor}`" data-pn="next">Berikutnya: {{ next.namaLatin }}</a>
      </nav>
      <div class="bar-end">
        <button v-qa-at="'play-all@phone'" type="button" class="ib play-top" :aria-label="playLabel" @click="emit('play')">
          <UiIcon :name="playBusy ? 'pause' : 'play'" />
        </button>
        <button
          ref="aa"
          type="button"
          class="ib aa"
          data-qa="settings"
          aria-haspopup="dialog"
          :aria-expanded="ui.isOpen(PANEL.settings) ? 'true' : 'false'"
          aria-label="Pengaturan baca"
          @click="ui.openPanel(PANEL.settings, { anchor: aa })"
        >
          <UiIcon name="type" />
        </button>
        <button
          v-qa-at="'theme@tab,desk'"
          type="button"
          class="ib theme-btn"
          :aria-label="settings.isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'"
          @click="settings.changeTheme('toggle')"
        >
          <UiIcon :name="settings.isDark ? 'sun' : 'moon'" />
        </button>
      </div>
      <i class="rd-prog" aria-hidden="true" :style="{ transform: `scaleX(${progress})` }" />
    </div>
  </Teleport>
</template>
