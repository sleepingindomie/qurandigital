<script setup lang="ts">
// Juz break (spec 4.9): hairline, star, hairline and a real heading.
import UiStarRule from '@/components/ui/UiStarRule.vue'

defineProps<{ juz: number }>()
</script>

<template>
  <div class="brk brk-juz">
    <UiStarRule label />
    <h2 class="brk-h">Juz {{ juz }}</h2>
  </div>
</template>
