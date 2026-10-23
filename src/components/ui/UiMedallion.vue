<script setup lang="ts">
// Ayat medallion: the shared star symbol, its trace copy and the number.
// Attributes fall through to the root, so
// <UiMedallion tag="a" :n="k" :href="..." data-local aria-label="..." /> is the
// reader's link. The trace is painted by writing trace.style.strokeDashoffset
// (100 empty, 0 full) from the player store's onProgress().
import { ref } from 'vue'

withDefaults(defineProps<{ n: number | string; tag?: 'span' | 'a' | 'button' }>(), { tag: 'span' })

const trace = ref<SVGUseElement | null>(null)

defineExpose({ trace })
</script>

<template>
  <component :is="tag" class="med">
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <use href="#star" class="outline" />
      <use ref="trace" href="#star" class="trace" />
    </svg>
    <span class="med-n">{{ n }}</span>
  </component>
</template>
