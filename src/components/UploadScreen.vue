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
    class="upload-screen d-flex align-center justify-center"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <v-card
      class="upload-dropzone pa-8 text-center"
      :class="{ 'upload-dropzone--active': isDragging }"
      variant="outlined"
      @click="openPicker"
    >
      <v-icon icon="mdi-image-plus" size="64" color="primary" class="mb-4" />
      <div class="text-h6 mb-2">Drag an image here, or click to browse</div>
      <div class="text-medium-emphasis mb-4">PNG, JPEG, and other common image formats</div>
      <v-btn color="primary" prepend-icon="mdi-folder-open" @click.stop="openPicker">
        Browse files
      </v-btn>
    </v-card>
    <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="onInputChange" />
  </div>
</template>

<style scoped>
.upload-screen {
  width: 100%;
  height: 100%;
  min-height: 640px;
  padding: 24px;
}
.upload-dropzone {
  width: 100%;
  max-width: 480px;
  border-style: dashed !important;
  border-width: 2px !important;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.upload-dropzone--active {
  border-color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.06);
}
.hidden-input {
  display: none;
}
</style>
