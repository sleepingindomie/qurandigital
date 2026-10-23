<script setup lang="ts">
// One settings row (panels.js row()): the label, then the control at the end
// of the line. The default slot gets the label's id for aria-labelledby; the
// extra slot sits under the line.
import { useId } from 'vue'

defineProps<{ label: string }>()

const id = useId()
</script>

<template>
  <div class="set-row">
    <div class="set-line">
      <span :id="id" class="set-label">{{ label }}</span>
      <slot :id="id" />
    </div>
    <slot name="extra" />
  </div>
</template>
