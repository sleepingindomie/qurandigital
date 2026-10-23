<script setup lang="ts" generic="V extends string | number">
// A settings row with a text radiogroup. Anything in the default slot goes
// under the row's line.
import SetRow from './SetRow.vue'
import UiRadioGroup from '@/components/ui/UiRadioGroup.vue'

defineProps<{ label: string; options: readonly (readonly [V, string])[]; modelValue: V }>()

const emit = defineEmits<{ 'update:modelValue': [value: V] }>()
</script>

<template>
  <SetRow :label="label">
    <template #default="{ id }">
      <UiRadioGroup :label="label" :labelledby="id" :options="options" :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)" />
    </template>
    <template #extra><slot /></template>
  </SetRow>
</template>
