<script setup lang="ts" generic="V extends string | number | null">
// Text radiogroup: options in a row, the selected one ink with a 2 px
// underline; roving tabindex, arrow keys move and select.
//   <UiRadioGroup v-model="value" label="Tema" :options="[['system', 'Ikuti sistem'], ['light', 'Terang']]" />
// An option can be an object to set lang, aria-label or style on its button
// (the Arabic size steps; RadioOption from @/types). Add class="radios-col" for a column (the qari list).
import { computed, ref } from 'vue'
import type { RadioOption } from '@/types'

const props = defineProps<{
  label: string
  options: readonly (readonly [V, string] | RadioOption<V>)[]
  modelValue: V
  /** id of a visible label (settings rows); aria-label stays as well. */
  labelledby?: string
  qa?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: V] }>()

const opts = computed<RadioOption<V>[]>(() =>
  props.options.map((o) => (Array.isArray(o) ? { value: o[0] as V, text: o[1] as string } : (o as RadioOption<V>))),
)
const key = (v: V) => String(v)
const checkedIndex = computed(() => opts.value.findIndex((o) => key(o.value) === key(props.modelValue)))
const btns = ref<HTMLButtonElement[]>([])

function select(i: number, focus = false) {
  const o = opts.value[i]
  if (!o) return
  if (focus) btns.value[i]?.focus()
  emit('update:modelValue', o.value)
}

function onKey(e: KeyboardEvent, i: number) {
  const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!d) return
  e.preventDefault()
  const n = opts.value.length
  select((i + d + n) % n, true)
}
</script>

<template>
  <div class="radios" role="radiogroup" :aria-label="label" :aria-labelledby="labelledby" :data-qa="qa">
    <button
      v-for="(o, i) in opts"
      :key="key(o.value)"
      ref="btns"
      type="button"
      role="radio"
      class="radio"
      :data-value="key(o.value)"
      :aria-checked="i === checkedIndex ? 'true' : 'false'"
      :tabindex="i === checkedIndex || (checkedIndex < 0 && i === 0) ? 0 : -1"
      :lang="o.lang"
      :aria-label="o.ariaLabel"
      :style="o.style"
      @click="select(i)"
      @keydown="onKey($event, i)"
    >{{ o.text }}</button>
  </div>
</template>
