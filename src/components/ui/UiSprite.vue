<script setup lang="ts">
// The one inline sprite: the star symbol (#star) that medallions and star rules
// use. Rendered once, first in App.vue.
import { STAR_SYMBOL_D } from '@/lib/frame'
</script>

<template>
  <svg class="sprite" aria-hidden="true" focusable="false">
    <symbol id="star" viewBox="0 0 100 100">
      <path :d="STAR_SYMBOL_D" pathLength="100" vector-effect="non-scaling-stroke" />
    </symbol>
  </svg>
</template>
