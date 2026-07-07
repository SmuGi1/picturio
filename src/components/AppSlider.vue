<script setup lang="ts">
import { computed } from 'vue'
import { valueToPercent, percentToValue, ADJUST_NEUTRAL_PCT } from '../editor/adjustScale'

const props = defineProps<{ label: string; modelValue: number; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [number]; start: [] }>()

const percent = computed(() => valueToPercent(props.modelValue))
const changed = computed(() => percent.value !== ADJUST_NEUTRAL_PCT)
const fillPct = computed(() => (percent.value / 200) * 100)

function onInput(e: Event) {
  emit('update:modelValue', percentToValue(Number((e.target as HTMLInputElement).value)))
}
function onStart() {
  if (!props.disabled) emit('start')
}
function reset() {
  if (props.disabled) return
  emit('start')
  emit('update:modelValue', percentToValue(ADJUST_NEUTRAL_PCT))
}
</script>

<template>
  <div class="app-slider">
    <div class="app-slider__head">
      <div class="app-slider__label-wrap">
        <span class="app-slider__label">{{ label }}</span>
        <button
          v-if="changed"
          class="app-slider__reset"
          type="button"
          title="Reset to default"
          :disabled="disabled"
          @click="reset"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
        </button>
      </div>
      <span class="app-slider__badge" :class="{ 'app-slider__badge--changed': changed }">{{ percent }}%</span>
    </div>
    <div class="app-slider__track">
      <div class="app-slider__track-bg" />
      <div class="app-slider__track-fill" :class="{ 'app-slider__track-fill--changed': changed }" :style="{ width: fillPct + '%' }" />
      <input
        class="pt-slider"
        type="range"
        min="0"
        max="200"
        step="1"
        :value="percent"
        :disabled="disabled"
        @input="onInput"
        @mousedown="onStart"
        @touchstart="onStart"
      />
    </div>
  </div>
</template>

<style scoped>
.app-slider { margin-bottom: 18px; }
.app-slider__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.app-slider__label-wrap { display: flex; align-items: center; gap: 7px; }
.app-slider__label { font-size: 13px; color: var(--pt-text); }
.app-slider__reset {
  display: flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; padding: 0; border: none; background: transparent;
  color: var(--pt-text-dim); cursor: pointer;
}
.app-slider__badge {
  font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--pt-text-dim); background: var(--pt-panel-alt);
  padding: 2px 7px; border-radius: 5px; min-width: 38px; text-align: center;
}
.app-slider__badge--changed { color: var(--pt-accent); background: var(--pt-accent-soft); }
.app-slider__track { position: relative; height: 16px; display: flex; align-items: center; }
.app-slider__track-bg { position: absolute; left: 0; right: 0; height: 4px; border-radius: 2px; background: var(--pt-border); }
.app-slider__track-fill { position: absolute; left: 0; height: 4px; border-radius: 2px; background: var(--pt-text-faint); }
.app-slider__track-fill--changed { background: var(--pt-accent); }
</style>
