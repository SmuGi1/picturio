<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { annotation } from '../../editor/operations'

const store = useEditorStore()
const text = ref('Sample')
const color = ref('#FF5252')
const drawing = ref(false)

async function addText() {
  await store.addOperation(annotation('text', { text: text.value, styles: { fill: color.value, fontSize: 48 } }))
}
async function addShape(shape: 'rect' | 'circle' | 'triangle') {
  await store.addOperation(annotation('shape', { shape, fill: color.value, width: 120, height: 120, left: 100, top: 100 }))
}
async function addIcon(icon: string) {
  await store.addOperation(annotation('icon', { icon, fill: color.value, left: 100, top: 100 }))
}
async function toggleDraw() {
  drawing.value = !drawing.value
  if (drawing.value) await store.addOperation(annotation('draw', { color: color.value, width: 6 }))
  // cancelCrop is used here to stop drawing mode — ImageAdapter has no dedicated stopDrawing();
  // cancelCrop() calls the editor's stopDrawingMode() which exits all drawing modes.
  else store.requireAdapter().cancelCrop()
}
async function addMask() {
  await store.addOperation(annotation('mask', { left: 120, top: 120, width: 160, height: 160 }))
}
defineExpose({ addText, addShape, addIcon, toggleDraw, addMask })
</script>

<template>
  <v-card flat>
    <v-card-title class="text-subtitle-1">Annotate</v-card-title>
    <v-card-text class="d-flex flex-column ga-2">
      <div class="d-flex align-center ga-2">
        <v-text-field v-model="text" density="compact" hide-details label="Text" style="max-width: 160px" />
        <input type="color" v-model="color" aria-label="color" />
      </div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn size="small" :disabled="!store.hasImage" @click="addText">Text</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addShape('rect')">Rect</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addShape('circle')">Circle</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addShape('triangle')">Triangle</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addIcon('icon-star')">Star</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addIcon('icon-arrow')">Arrow</v-btn>
        <v-btn size="small" :color="drawing ? 'primary' : undefined" :disabled="!store.hasImage" @click="toggleDraw">Draw</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addMask">Mask</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
