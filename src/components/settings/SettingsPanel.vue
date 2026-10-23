<script setup lang="ts">
// Pengaturan baca: a popover under the reader's Aa button on desktop, a bottom
// sheet below 1100 px. The Aa button only calls
// ui.openPanel(PANEL.settings, { anchor }).
import UiPanel from '@/components/ui/UiPanel.vue'
import ArabicSizeRow from './ArabicSizeRow.vue'
import ReciterGroup from './ReciterGroup.vue'
import SetOptions from './SetOptions.vue'
import SetSwitch from './SetSwitch.vue'
import { PANEL } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { METHODS, METHOD_LINE } from '@/lib/prayer-meta'
import { GAP, HIJRI, MOTION, REPEAT, THEMES } from './options'

const settings = useSettingsStore()
const s = settings.settings
</script>

<template>
  <UiPanel :id="PANEL.settings" title="Pengaturan baca" cls="panel-settings">
    <ArabicSizeRow />
    <SetSwitch label="Tampilkan Latin" name="latin" />
    <SetSwitch label="Tampilkan terjemahan" name="translation" />
    <div class="set-row set-col">
      <span class="set-label">Qari</span>
      <ReciterGroup />
    </div>
    <SetSwitch label="Putar beruntun" name="continuous" />
    <SetOptions label="Jeda antar ayat" :options="GAP" :model-value="s.gapMs" @update:model-value="(v) => settings.set({ gapMs: v })" />
    <SetOptions label="Ulangi ayat" :options="REPEAT" :model-value="s.repeat" @update:model-value="(v) => settings.set({ repeat: v })" />
    <SetSwitch label="Ikuti bacaan" name="follow" />
    <SetOptions label="Metode jadwal salat" :options="METHODS" :model-value="s.method" @update:model-value="(v) => settings.set({ method: v })">
      <p class="set-meth">{{ METHOD_LINE[s.method] }}</p>
    </SetOptions>
    <SetOptions label="Penyesuaian tanggal Hijriah" :options="HIJRI" :model-value="s.hijriAdjust" @update:model-value="(v) => settings.set({ hijriAdjust: v })" />
    <SetOptions label="Tema" :options="THEMES" :model-value="settings.theme" @update:model-value="(v) => settings.changeTheme(v)" />
    <SetOptions label="Kurangi gerak" :options="MOTION" :model-value="s.motion" @update:model-value="(v) => settings.set({ motion: v })" />
  </UiPanel>
</template>
