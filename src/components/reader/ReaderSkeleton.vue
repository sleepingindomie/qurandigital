<script setup lang="ts">
// Three static skeleton rows at the real line-box heights, no shimmer. Shown
// only when the surah is not there after 300 ms.
import UiMedallion from '@/components/ui/UiMedallion.vue'
</script>

<template>
  <p class="sr" role="status">Memuat ayat</p>
  <div class="skel" aria-hidden="true">
    <div v-for="i in 3" :key="i" class="sk-row">
      <span class="sk-med"><UiMedallion n="" /></span>
      <div class="sk-body">
        <div class="sk-ar"><i /></div>
        <div class="sk-tr"><i /></div>
        <div class="sk-tr short"><i /></div>
      </div>
    </div>
  </div>
</template>
