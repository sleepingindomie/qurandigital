<script setup lang="ts">
// A settings row with a switch.
import SetRow from './SetRow.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import { useSettingsStore } from '@/stores/settings'
import type { SettingsPatch } from '@/types'
import type { SwitchKey } from './options'

const props = defineProps<{ label: string; name: SwitchKey }>()

const settings = useSettingsStore()

function change(v: boolean) {
  const patch: SettingsPatch = {}
  patch[props.name] = v
  settings.set(patch)
}
</script>

<template>
  <SetRow :label="label">
    <UiSwitch :label="label" :model-value="settings.settings[name]" @update:model-value="change" />
  </SetRow>
</template>
