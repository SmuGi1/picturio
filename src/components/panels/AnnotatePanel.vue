<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { annotation } from '../../editor/operations'

const store = useEditorStore()
const color = ref('#FF5252')
const drawing = ref(false)

async function addShape(shape: 'rect' | 'triangle') {
  await store.addOperation(annotation('shape', { shape, fill: color.value, width: 120, height: 120, left: 100, top: 100 }))
}
async function toggleDraw() {
  if (!drawing.value) {
    // Flip only after the op is applied, so a failed apply doesn't leave the
    // toggle stuck "on" with no draw mode actually active.
    await store.addOperation(annotation('draw', { color: color.value, width: 6 }))
    drawing.value = true
  } else {
    // cancelCrop is used here to stop drawing mode — ImageAdapter has no dedicated
    // stopDrawing(); cancelCrop() calls the editor's stopDrawingMode() which exits
    // all drawing modes.
    store.requireAdapter().cancelCrop()
    drawing.value = false
  }
}
async function addMask() {
  await store.addOperation(annotation('mask', { left: 120, top: 120, width: 160, height: 160 }))
}
defineExpose({ addShape, toggleDraw, addMask })
</script>

<template>
  <v-card flat>
    <v-card-text class="d-flex flex-column ga-2">
      <div class="d-flex align-center ga-2">
        <v-menu :close-on-content-click="false" location="bottom">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              size="small"
              variant="outlined"
              aria-label="Annotation color"
              :style="{ color: color }"
              prepend-icon="mdi-palette"
            >
              Color
            </v-btn>
          </template>
          <v-color-picker v-model="color" mode="hexa" />
        </v-menu>
      </div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn size="small" :disabled="!store.hasImage" @click="addShape('rect')">Rect</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addShape('triangle')">Triangle</v-btn>
        <v-btn size="small" :color="drawing ? 'primary' : undefined" :disabled="!store.hasImage" @click="toggleDraw">Draw</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addMask">Mask</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
