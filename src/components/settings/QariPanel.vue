<script setup lang="ts">
// The qari picker, opened by the bar's Qari button on tablet and desktop: a
// popover on desktop, a sheet below 1100 px.
import UiPanel from '@/components/ui/UiPanel.vue'
import ReciterGroup from './ReciterGroup.vue'
import { PANEL } from '@/stores/ui'
</script>

<template>
  <UiPanel :id="PANEL.qari" title="Qari">
    <ReciterGroup />
  </UiPanel>
</template>
