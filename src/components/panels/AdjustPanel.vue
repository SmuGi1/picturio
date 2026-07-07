<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import type { AdjustName } from '../../editor/operations'

const store = useEditorStore()
const channels: { name: AdjustName; label: string; icon: string }[] = [
  { name: 'brightness', label: 'Brightness', icon: 'mdi-brightness-6' },
  { name: 'contrast', label: 'Contrast', icon: 'mdi-contrast-circle' },
  { name: 'saturation', label: 'Saturation', icon: 'mdi-palette' },
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
  <v-card flat>
    <v-card-text>
      <div v-for="c in channels" :key="c.name" class="mb-2">
        <v-slider
          :model-value="valueOf(c.name)"
          :label="c.label"
          :prepend-icon="c.icon"
          :min="-1" :max="1" :step="0.01"
          :disabled="disabled"
          hide-details
          thumb-label
          @start="onStart"
          @update:model-value="(v: number) => onChange(c.name, v)"
        />
      </div>
    </v-card-text>
  </v-card>
</template>
