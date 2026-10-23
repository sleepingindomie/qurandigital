<script setup lang="ts">
// The app shell (app.js): the skip link, the top bar each view fills by
// teleporting its bar into #bar-slot (<Teleport defer to="#bar-slot">), the
// offline banner under it, main, the murattal bar after main, the polite live
// region, the toast, the panels the shell renders and the global keys.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UiSprite from '@/components/ui/UiSprite.vue'
import OfflineBanner from '@/components/shell/OfflineBanner.vue'
import HomeMenuSheet from '@/components/shell/HomeMenuSheet.vue'
import ReaderNavSheet from '@/components/shell/ReaderNavSheet.vue'
import PlayerBar from '@/components/player/PlayerBar.vue'
import SettingsPanel from '@/components/settings/SettingsPanel.vue'
import QariPanel from '@/components/settings/QariPanel.vue'
import PlayerSheet from '@/components/settings/PlayerSheet.vue'
import { useGlobalKeys } from '@/components/shell/useGlobalKeys'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const route = useRoute()

useGlobalKeys()

const skipText = computed(() => (route.name === 'surah' ? 'Langsung ke bacaan' : 'Langsung ke daftar isi'))

// The reading column on the reader, the index on home, else main.
function skip() {
  const t = document.getElementById('bacaan') || document.getElementById('indeks') || document.getElementById('main')
  if (!t) return
  t.setAttribute('tabindex', '-1')
  t.focus({ preventScroll: true })
  t.scrollIntoView({ block: 'start' })
}
</script>

<template>
  <UiSprite />
  <a class="skip" href="#" data-local @click.prevent="skip">{{ skipText }}</a>
  <header id="bar" class="bar">
    <div id="bar-slot" class="bar-slot" />
    <OfflineBanner />
  </header>
  <main id="main" tabindex="-1">
    <RouterView />
  </main>
  <PlayerBar />
  <div id="live" class="sr" aria-live="polite">{{ ui.liveText }}</div>
  <div id="toast" class="toast" :class="{ on: ui.toastOn }" role="status">{{ ui.toastText }}</div>
  <SettingsPanel />
  <QariPanel />
  <PlayerSheet />
  <HomeMenuSheet />
  <ReaderNavSheet />
</template>
