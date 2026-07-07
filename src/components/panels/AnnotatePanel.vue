<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { annotation } from '../../editor/operations'

const store = useEditorStore()
const color = ref('#e2695f')
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

function onColorInput(e: Event) {
  color.value = (e.target as HTMLInputElement).value
}

defineExpose({ addShape, toggleDraw, addMask })
</script>

<template>
  <div class="annotate-panel">
    <div class="annotate-color">
      <label class="annotate-swatch">
        <input type="color" :value="color" class="annotate-swatch__input" aria-label="Annotation color" @input="onColorInput" />
        <span class="annotate-swatch__fill" :style="{ background: color }" />
      </label>
      <span class="annotate-color__label">Annotation color</span>
    </div>
    <div class="annotate-tools">
      <button class="tool-btn" type="button" :disabled="!store.hasImage" @click="addShape('rect')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5" /></svg>
        Rect
      </button>
      <button class="tool-btn" type="button" :disabled="!store.hasImage" @click="addShape('triangle')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z" /></svg>
        Triangle
      </button>
      <button class="tool-btn" :class="{ 'tool-btn--active': drawing }" type="button" :disabled="!store.hasImage" @click="toggleDraw">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
        Draw
      </button>
      <button class="tool-btn" type="button" :disabled="!store.hasImage" @click="addMask">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18" /></svg>
        Mask
      </button>
    </div>
  </div>
</template>

<style scoped>
.annotate-color { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.annotate-color__label { font-size: 13px; color: var(--pt-text-dim); }
.annotate-swatch {
  position: relative; width: 30px; height: 30px; border-radius: 8px; overflow: hidden;
  border: 1.5px solid var(--pt-border); cursor: pointer; flex: none;
}
.annotate-swatch__input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0; }
.annotate-swatch__fill { position: absolute; inset: 0; pointer-events: none; }
.annotate-tools { display: flex; gap: 8px; flex-wrap: wrap; }
.tool-btn {
  display: flex; align-items: center; gap: 5px; padding: 7px 9px;
  border-radius: 8px; border: 1.5px solid var(--pt-border); background: var(--pt-panel-alt);
  color: var(--pt-text); font-size: 12.5px; cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.tool-btn:hover:not(:disabled) { border-color: var(--pt-border-strong); }
.tool-btn:disabled { opacity: 0.5; cursor: default; }
.tool-btn--active { border-color: var(--pt-accent); background: var(--pt-accent-soft); }
</style>
