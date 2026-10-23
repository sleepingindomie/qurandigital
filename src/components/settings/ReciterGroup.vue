<script setup lang="ts">
// The qari list, in the settings panel, the qari picker and the phone player
// sheet. The player store follows the setting.
import UiRadioGroup from '@/components/ui/UiRadioGroup.vue'
import { useSettingsStore } from '@/stores/settings'
import { RECITERS } from './options'

const settings = useSettingsStore()
</script>

<template>
  <UiRadioGroup
    class="radios-col"
    qa="reciter-options"
    label="Qari"
    :options="RECITERS"
    :model-value="settings.settings.reciter"
    @update:model-value="(v) => settings.set({ reciter: v })"
  />
</template>
