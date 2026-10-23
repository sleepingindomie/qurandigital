<script setup lang="ts">
// Phone: the player sheet holds the time, qari, repeat, gap, continuous and
// follow, so nothing of the wide bar is lost.
import UiPanel from '@/components/ui/UiPanel.vue'
import ReciterGroup from './ReciterGroup.vue'
import SetOptions from './SetOptions.vue'
import SetSwitch from './SetSwitch.vue'
import { PANEL } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { usePlayerStore } from '@/stores/player'
import { GAP, REPEAT } from './options'

const settings = useSettingsStore()
const player = usePlayerStore()
const s = settings.settings
</script>

<template>
  <UiPanel :id="PANEL.playerSheet" title="Pemutar murattal" mode="sheet">
    <p class="set-note">Ayat {{ player.ayat || '-' }} · {{ player.timeText }}</p>
    <div class="set-row set-col">
      <span class="set-label">Qari</span>
      <ReciterGroup />
    </div>
    <SetOptions label="Ulangi ayat" :options="REPEAT" :model-value="s.repeat" @update:model-value="(v) => settings.set({ repeat: v })" />
    <SetOptions label="Jeda antar ayat" :options="GAP" :model-value="s.gapMs" @update:model-value="(v) => settings.set({ gapMs: v })" />
    <SetSwitch label="Putar beruntun" name="continuous" />
    <SetSwitch label="Ikuti bacaan" name="follow" />
  </UiPanel>
</template>
