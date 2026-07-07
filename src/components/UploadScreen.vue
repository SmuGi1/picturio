<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { loadImageFile } from '../editor/loadFile'

const store = useEditorStore()
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function openPicker() {
  fileInput.value?.click()
}

async function onInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await loadImageFile(store, file)
  input.value = ''
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) await loadImageFile(store, file)
}
</script>

<template>
  <div
    class="upload-screen"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div
      class="upload-dropzone"
      :class="{ 'upload-dropzone--active': isDragging }"
      @click="openPicker"
    >
      <div class="upload-dropzone__icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--pt-accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
      </div>
      <div class="upload-dropzone__title">Drag an image here, or click to browse</div>
      <div class="upload-dropzone__hint">PNG, JPEG, and other common image formats</div>
      <button class="upload-dropzone__btn" type="button" @click.stop="openPicker">Browse files</button>
    </div>
    <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="onInputChange" />
  </div>
</template>

<style scoped>
.upload-screen {
  width: 100%;
  height: 100%;
  min-height: 640px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--pt-bg);
}
.upload-dropzone {
  width: 100%;
  max-width: 480px;
  padding: 48px 32px;
  text-align: center;
  border: 2px dashed var(--pt-border-strong);
  border-radius: 14px;
  background: var(--pt-panel);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.upload-dropzone--active { border-color: var(--pt-accent); background: var(--pt-accent-soft); }
.upload-dropzone__icon { margin-bottom: 16px; }
.upload-dropzone__title { font-size: 16px; font-weight: 600; color: var(--pt-text); margin-bottom: 6px; }
.upload-dropzone__hint { font-size: 13px; color: var(--pt-text-dim); margin-bottom: 20px; }
.upload-dropzone__btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border: none; border-radius: 8px;
  background: var(--pt-accent); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
}
.upload-dropzone__btn:hover { filter: brightness(1.08); }
.hidden-input { display: none; }
</style>
