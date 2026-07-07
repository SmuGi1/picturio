<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { dataURLToBlob, triggerDownload, baseName, buildBundle } from '../editor/download'

const store = useEditorStore()
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

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

function openImport() {
  fileInput.value?.click()
}
async function onImportChange(e: Event) {
  const input = e.target as HTMLInputElement
  await onImport(input.files?.[0] ?? null)
  input.value = ''
}

defineExpose({ exportImage, exportJSON, exportBundle, onImport })
</script>

<template>
  <div class="export-menu">
    <v-menu location="bottom end">
      <template #activator="{ props }">
        <button v-bind="props" class="export-btn" type="button" :disabled="!store.hasImage">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></svg>
          Export
        </button>
      </template>
      <v-list>
        <v-list-item title="Download PNG" @click="exportImage('png')" />
        <v-list-item title="Download JPEG" @click="exportImage('jpeg')" />
        <v-list-item title="Download operations JSON" @click="exportJSON" />
        <v-list-item title="Download bundle (.zip)" @click="exportBundle" />
        <v-divider />
        <v-list-item title="Import operations JSON…" @click="openImport" />
      </v-list>
    </v-menu>
    <input ref="fileInput" type="file" accept="application/json,.json" class="export-import-input" @change="onImportChange" />
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

<style scoped>
.export-menu { display: inline-flex; }
.export-btn {
  display: flex; align-items: center; gap: 7px; margin-left: 6px;
  padding: 8px 16px; border-radius: 8px; border: none;
  background: var(--pt-accent); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: filter 0.12s;
}
.export-btn:hover:not(:disabled) { filter: brightness(1.08); }
.export-btn:disabled { opacity: 0.5; cursor: default; }
.export-import-input { display: none; }
</style>
