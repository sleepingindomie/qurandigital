<script setup lang="ts">
// One line icon (ui.js icon()). Extra classes fall through to the svg:
// <UiIcon name="right" class="arrow" /> renders class="i arrow".
import type { IconName } from '@/lib/icons'
import { ICONS } from '@/lib/icons'

defineProps<{ name: IconName }>()
</script>

<template>
  <!-- constant markup from lib/icons.ts, never API text -->
  <svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false" v-html="ICONS[name]" />
</template>
