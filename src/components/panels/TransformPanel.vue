<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { crop as makeCrop, flip as makeFlip, rotate as makeRotate } from '../../editor/operations'

const store = useEditorStore()
const cropping = ref(false)

function startCrop() {
  store.requireAdapter().startCrop()
  cropping.value = true
}

async function applyCrop() {
  const adapter = store.requireAdapter()
  const rect = adapter.getCropRect()
  try {
    if (rect.width >= 1 && rect.height >= 1) {
      await store.addOperation(makeCrop(rect))
    } else {
      adapter.cancelCrop()
    }
  } finally {
    cropping.value = false
  }
}

function cancelCrop() {
  store.requireAdapter().cancelCrop()
  cropping.value = false
}

async function flip(axis: 'x' | 'y') {
  await store.addOperation(makeFlip(axis))
}

async function rotate(degrees: number) {
  await store.addOperation(makeRotate(degrees))
}

defineExpose({ startCrop, applyCrop, cancelCrop, flip, rotate })
</script>

<template>
  <div class="transform-panel">
    <div v-if="cropping" class="transform-row">
      <button class="tool-btn tool-btn--active" type="button" @click="applyCrop">Apply</button>
      <button class="tool-btn" type="button" @click="cancelCrop">Cancel</button>
    </div>
    <div v-else class="transform-row">
      <button class="tool-btn" type="button" :disabled="!store.hasImage" @click="startCrop">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>
        Crop
      </button>
      <button class="tool-btn tool-btn--icon" type="button" title="Flip horizontal" :disabled="!store.hasImage" @click="flip('x')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18" /><path d="M16 7l4 5-4 5" /><path d="M8 7l-4 5 4 5" /></svg>
      </button>
      <button class="tool-btn tool-btn--icon" type="button" title="Flip vertical" :disabled="!store.hasImage" @click="flip('y')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18" /><path d="M7 16l5 4 5-4" /><path d="M7 8l5-4 5 4" /></svg>
      </button>
      <button class="tool-btn tool-btn--icon" type="button" title="Rotate left" :disabled="!store.hasImage" @click="rotate(-90)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 2.6 6.3" /><path d="M3 21v-6h6" /></svg>
      </button>
      <button class="tool-btn tool-btn--icon" type="button" title="Rotate right" :disabled="!store.hasImage" @click="rotate(90)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 0-2.6 6.3" /><path d="M21 21v-6h-6" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.transform-row { display: flex; gap: 6px; flex-wrap: wrap; }
.tool-btn {
  display: flex; align-items: center; gap: 5px; padding: 7px 9px;
  border-radius: 8px; border: 1.5px solid var(--pt-border); background: var(--pt-panel-alt);
  color: var(--pt-text); font-size: 12.5px; cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.tool-btn:hover:not(:disabled) { border-color: var(--pt-border-strong); }
.tool-btn:disabled { opacity: 0.5; cursor: default; }
.tool-btn--icon { padding: 7px; }
.tool-btn--active { border-color: var(--pt-accent); background: var(--pt-accent-soft); }
</style>
