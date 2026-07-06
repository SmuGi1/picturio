<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { dataURLToBlob, triggerDownload, baseName, buildBundle } from '../editor/download'

const store = useEditorStore()
const error = ref('')

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function imageBlob(format: 'png' | 'jpeg'): Blob {
  const dataURL = store.requireAdapter().toDataURL({ format, quality: 0.92 })
  return dataURLToBlob(dataURL)
}

async function exportImage(format: 'png' | 'jpeg') {
  // Guard against exporting the bare original while "view original" is active.
  await store.ensureEdited()
  const base = baseName(store.originalImage?.source.name ?? 'image')
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  triggerDownload(imageBlob(format), `${base}-edited.${ext}`)
}

async function exportJSON() {
  const base = baseName(store.originalImage?.source.name ?? 'image')
  triggerDownload(new Blob([store.exportJSON()], { type: 'application/json' }), `${base}-edited.ops.json`)
}

async function exportBundle() {
  await store.ensureEdited()
  const base = baseName(store.originalImage?.source.name ?? 'image')
  // Bundle always uses PNG (lossless) so the archived image matches the op-log
  // exactly regardless of any JPEG the user may also export standalone.
  const zip = await buildBundle(imageBlob('png'), store.exportJSON(), base)
  triggerDownload(zip, `${base}-edited.zip`)
}

async function onImport(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return
  try {
    await store.importJSON(await readText(file))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to import operations file'
  }
}

defineExpose({ exportImage, exportJSON, exportBundle, onImport })
</script>

<template>
  <div class="d-flex align-center ga-2">
    <v-file-input
      accept="application/json,.json"
      density="compact"
      hide-details
      prepend-icon="mdi-upload"
      label="Import ops"
      style="max-width: 180px"
      :disabled="!store.hasImage"
      @update:model-value="onImport"
    />
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" color="primary" prepend-icon="mdi-download" :disabled="!store.hasImage">Export</v-btn>
      </template>
      <v-list>
        <v-list-item title="Download PNG" @click="exportImage('png')" />
        <v-list-item title="Download JPEG" @click="exportImage('jpeg')" />
        <v-list-item title="Download operations JSON" @click="exportJSON" />
        <v-list-item title="Download bundle (.zip)" @click="exportBundle" />
      </v-list>
    </v-menu>
    <v-snackbar
      :model-value="error !== ''"
      :timeout="5000"
      color="error"
      @update:model-value="(v: boolean) => { if (!v) error = '' }"
    >
      {{ error }}
    </v-snackbar>
  </div>
</template>
