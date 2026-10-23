<script setup lang="ts">
// Switch (ui.js switchCtl()): 44 px hit area, a track with an octagon thumb,
// then the word Aktif or Mati.
//   <UiSwitch v-model="latin" label="Tampilkan Latin" />
import { SWITCH_THUMB_D } from '@/lib/frame'

const props = defineProps<{ label: string; modelValue: boolean; id?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const flip = () => emit('update:modelValue', !props.modelValue)
</script>

<template>
  <span class="sw-wrap">
    <button :id="id" type="button" class="sw" role="switch" :aria-checked="modelValue ? 'true' : 'false'" :aria-label="label" @click="flip">
      <span class="sw-track">
        <svg class="sw-thumb" viewBox="0 0 16 16" aria-hidden="true"><path :d="SWITCH_THUMB_D" /></svg>
      </span>
    </button>
    <span class="sw-word" aria-hidden="true">{{ modelValue ? 'Aktif' : 'Mati' }}</span>
  </span>
</template>
