<script setup lang="ts">
// The surah frame: circle, two squares, octagon, inner circle and star around
// the surah number. Size comes from --fs and --fn on the root, set by the
// area's class (rs-frame, pl-frame). Fully drawn at rest; draw() runs the
// draw-in (lib/frame.ts) when motion is allowed.
import { ref } from 'vue'
import { FRAME_PARTS, drawFrame } from '@/lib/frame'

defineProps<{ n: number | string }>()

const svg = ref<SVGSVGElement | null>(null)
const num = ref<HTMLElement | null>(null)

defineExpose({
  /** The frame-svg element (view-transition-name surah-frame lives on it). */
  svg,
  /** The frame-num element (crossfaded on previous and next). */
  num,
  /** Circle, squares +80 ms, octagon +160, star +240, each 320 ms, after `delay` ms. */
  draw: (delay = 120) => drawFrame(svg.value, delay),
})
</script>

<template>
  <div class="frame">
    <svg ref="svg" class="frame-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <template v-for="(p, i) in FRAME_PARTS" :key="i">
        <circle
          v-if="p.tag === 'circle'"
          :class="p.cls"
          :cx="p.cx"
          :cy="p.cy"
          :r="p.r"
          pathLength="100"
          vector-effect="non-scaling-stroke"
        />
        <path v-else :class="p.cls" :d="p.d" pathLength="100" vector-effect="non-scaling-stroke" />
      </template>
    </svg>
    <span ref="num" class="frame-num">{{ n }}</span>
  </div>
</template>
