<script setup lang="ts">
// Hairline, star, hairline. With `label` the rule belongs to a heading (juz
// break) and is not hidden from assistive technology.
defineProps<{ label?: boolean }>()
</script>

<template>
  <div class="star-rule" :aria-hidden="label ? undefined : 'true'">
    <span class="hl" />
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#star" /></svg>
    <span class="hl" />
  </div>
</template>
