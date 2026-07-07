<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import AppSlider from '../AppSlider.vue'
import type { AdjustName } from '../../editor/operations'

const store = useEditorStore()
const channels: { name: AdjustName; label: string }[] = [
  { name: 'brightness', label: 'Brightness' },
  { name: 'contrast', label: 'Contrast' },
  { name: 'saturation', label: 'Saturation' },
]

function valueOf(name: AdjustName): number {
  const op = store.operations.find((o) => o.type === 'adjust' && o.name === name)
  return op && op.type === 'adjust' ? op.value : 0
}

function onStart() {
  store.beginAdjust()
}
function onChange(name: AdjustName, value: number) {
  void store.previewAdjust(name, value)
}

const disabled = computed(() => !store.hasImage)
defineExpose({ onStart, onChange })
</script>

<template>
  <div class="adjust-panel">
    <AppSlider
      v-for="c in channels"
      :key="c.name"
      :label="c.label"
      :model-value="valueOf(c.name)"
      :disabled="disabled"
      @start="onStart"
      @update:model-value="(v: number) => onChange(c.name, v)"
    />
  </div>
</template>

<style scoped>
.adjust-panel :deep(.app-slider:last-child) { margin-bottom: 0; }
</style>
