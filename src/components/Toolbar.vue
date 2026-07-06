<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const confirmReset = ref(false)

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFile(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return
  if (!file.type.startsWith('image/')) return
  const dataURL = await readAsDataURL(file)
  await store.loadOriginal(dataURL, file.name)
}

async function onViewOriginal(on: boolean) {
  await store.viewOriginal(on)
}

async function doReset() {
  confirmReset.value = false
  await store.reset()
}

defineExpose({ onFile, onViewOriginal })
</script>

<template>
  <v-toolbar density="comfortable" color="surface">
    <v-file-input
      class="mx-3"
      style="max-width: 320px"
      accept="image/*"
      label="Upload image"
      density="compact"
      hide-details
      prepend-icon="mdi-image-plus"
      @update:model-value="onFile"
    />
    <v-spacer />
    <v-btn icon="mdi-undo" :disabled="!store.canUndo" @click="store.undo()" />
    <v-btn icon="mdi-redo" :disabled="!store.canRedo" @click="store.redo()" />
    <v-btn
      icon="mdi-compare"
      :color="store.viewingOriginal ? 'primary' : undefined"
      :disabled="!store.hasImage"
      @click="onViewOriginal(!store.viewingOriginal)"
    />
    <v-btn icon="mdi-restore" :disabled="!store.hasImage" @click="confirmReset = true" />

    <v-dialog v-model="confirmReset" max-width="380">
      <v-card>
        <v-card-title>Reset to original?</v-card-title>
        <v-card-text>This discards all edits and returns to the uploaded image.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="confirmReset = false">Cancel</v-btn>
          <v-btn color="primary" @click="doReset">Reset</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-toolbar>
</template>
