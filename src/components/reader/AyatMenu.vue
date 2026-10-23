<script setup lang="ts">
// The ayat menu's items: role="menu", 48 px items, arrow keys move between
// them. The panel focuses the first item on open.
import { ref } from 'vue'

defineProps<{ label: string; items: readonly string[] }>()
const emit = defineEmits<{ pick: [index: number] }>()

const btns = ref<HTMLButtonElement[]>([])

function onKey(e: KeyboardEvent) {
  const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
  if (!d) return
  e.preventDefault()
  const list = btns.value
  const i = list.indexOf(document.activeElement as HTMLButtonElement)
  list[(i + d + list.length) % list.length]?.focus()
}
</script>

<template>
  <div role="menu" class="menu" :aria-label="label" @keydown="onKey">
    <button
      v-for="(t, i) in items"
      :key="t"
      ref="btns"
      type="button"
      role="menuitem"
      class="menu-i"
      :tabindex="i === 0 ? 0 : -1"
      @click="emit('pick', i)"
    >{{ t }}</button>
  </div>
</template>
