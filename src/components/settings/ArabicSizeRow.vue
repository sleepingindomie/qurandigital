<script setup lang="ts">
// Ukuran Arab (panels.js sizeRow()): Otomatis plus six steps drawn as a
// growing "ب", and a live sample of the first two words of the Basmalah at
// the chosen size.
import { computed } from 'vue'
import UiRadioGroup from '@/components/ui/UiRadioGroup.vue'
import { useSettingsStore } from '@/stores/settings'
import { AR_STEPS, BASMALAH } from '@/lib/quran'
import type { ArabicStep, RadioOption } from '@/types'

const settings = useSettingsStore()

const steps: RadioOption<ArabicStep | 'auto'>[] = [
  { value: 'auto', text: 'Otomatis' },
  ...AR_STEPS.map((_, i) => ({
    value: (i + 1) as ArabicStep,
    text: 'ب',
    lang: 'ar',
    ariaLabel: `Ukuran ${i + 1}`,
    style: { fontSize: Math.round(14 + (i + 1) * 3) + 'px' },
  })),
]

const sample = BASMALAH.split(' ').slice(0, 2).join(' ')
const step = computed(() => settings.settings.arabicStep)
const sampleSize = computed(() => (step.value ? AR_STEPS[step.value - 1] + 'px' : ''))
</script>

<template>
  <div class="set-row set-col">
    <span class="set-label">Ukuran Arab</span>
    <UiRadioGroup
      class="ar-steps"
      label="Ukuran Arab"
      :options="steps"
      :model-value="step ?? 'auto'"
      @update:model-value="(v) => settings.setArabicStep(v === 'auto' ? null : v)"
    />
    <p class="set-sample" lang="ar" dir="rtl" :style="{ fontSize: sampleSize }">{{ sample }}</p>
  </div>
</template>
