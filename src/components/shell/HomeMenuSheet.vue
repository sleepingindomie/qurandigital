<script setup lang="ts">
// The home menu sheet (app.js openHomeMenu(), spec 3.6), opened by "Menu" in
// the home bar below 1100 px: the main links and the theme options. The links
// are plain anchors; the nav link handler scrolls on home or navigates.
import UiPanel from '@/components/ui/UiPanel.vue'
import UiRadioGroup from '@/components/ui/UiRadioGroup.vue'
import { PANEL } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { THEMES } from '@/components/settings/options'

const settings = useSettingsStore()
</script>

<template>
  <UiPanel :id="PANEL.homeMenu" title="Menu" mode="sheet">
    <nav class="sheet-nav" aria-label="Utama">
      <a class="sheet-link" href="/" data-sec="indeks">Daftar Surah</a>
      <a class="sheet-link" href="/?tab=juz" data-sec="indeks">Juz</a>
      <a class="sheet-link" href="/" data-sec="waktu">Waktu Salat</a>
      <a class="sheet-link" href="/tanda">Ditandai</a>
    </nav>
    <div class="set-row set-col">
      <span class="set-label">Tema</span>
      <UiRadioGroup label="Tema" :options="THEMES" :model-value="settings.theme" @update:model-value="(v) => settings.changeTheme(v)" />
    </div>
  </UiPanel>
</template>
