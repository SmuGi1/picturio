<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { loadImageFile } from '../editor/loadFile'
import { useTheme } from '../composables/useTheme'
import ExportMenu from './ExportMenu.vue'

const store = useEditorStore()
const { theme, toggle: toggleTheme } = useTheme()
const confirmReset = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const fileName = computed(() => store.originalImage?.source.name ?? 'Upload image')

async function onFile(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return
  await loadImageFile(store, file)
}
function pickFile() {
  fileInput.value?.click()
}
async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  await onFile(input.files?.[0] ?? null)
  input.value = ''
}

async function onViewOriginal(on: boolean) {
  if (!store.hasImage) return
  await store.viewOriginal(on)
}

async function doReset() {
  confirmReset.value = false
  await store.reset()
}

defineExpose({ onFile, onViewOriginal })
</script>

<template>
  <header class="app-header">
    <div class="app-header__left">
      <div class="app-header__brand">
        <div class="app-header__logo" />
        <div class="app-header__name">Picturio</div>
      </div>
      <div class="app-header__divider" />
      <button class="file-chip" type="button" aria-label="Change image" @click="pickFile">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pt-text-dim)" stroke-width="2" stroke-linecap="round"><path d="M12 16V4M12 4L7 9M12 4l5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
        <span class="file-chip__name">{{ fileName }}</span>
      </button>
      <input ref="fileInput" type="file" accept="image/*" class="app-header__file-input" @change="onFileChange" />
    </div>

    <div class="app-header__right">
      <template v-if="store.hasImage">
        <button class="icon-btn" type="button" title="Undo" aria-label="Undo" :disabled="!store.canUndo" @click="store.undo()">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
        </button>
        <button class="icon-btn" type="button" title="Redo" aria-label="Redo" :disabled="!store.canRedo" @click="store.redo()">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
        </button>
        <div class="app-header__divider" />
        <button
          class="icon-btn"
          type="button"
          title="Hold to compare with original"
          aria-label="Hold to compare with original"
          @mousedown="onViewOriginal(true)"
          @mouseup="onViewOriginal(false)"
          @mouseleave="onViewOriginal(false)"
          @touchstart.prevent="onViewOriginal(true)"
          @touchend="onViewOriginal(false)"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18" /><rect x="3" y="5" width="9" height="14" rx="1.5" /><rect x="12" y="5" width="9" height="14" rx="1.5" /></svg>
        </button>
        <button class="icon-btn" type="button" title="Reset all edits" aria-label="Reset all edits" @click="confirmReset = true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
        </button>
        <div class="app-header__divider" />
      </template>
      <button class="icon-btn" type="button" title="Toggle light / dark" aria-label="Toggle light / dark" @click="toggleTheme">
        <svg v-if="theme === 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" /></svg>
        <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" /></svg>
      </button>
      <ExportMenu v-if="store.hasImage" />
    </div>

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
  </header>
</template>

<style scoped>
.app-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-bottom: 1px solid var(--pt-border);
  background: var(--pt-panel); flex: none;
}
.app-header__left { display: flex; align-items: center; gap: 18px; min-width: 0; }
.app-header__brand { display: flex; align-items: center; gap: 9px; flex: none; }
.app-header__logo {
  width: 22px; height: 22px; border-radius: 6px;
  background: linear-gradient(135deg, var(--pt-accent), var(--pt-logo-to));
}
.app-header__name { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: var(--pt-text); }
.app-header__divider { width: 1px; height: 20px; background: var(--pt-border); flex: none; }
.app-header__right { display: flex; align-items: center; gap: 6px; flex: none; }
.app-header__file-input { display: none; }
.file-chip {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px;
  border-radius: 8px; border: 1px solid var(--pt-border); background: var(--pt-panel-alt);
  cursor: pointer; min-width: 0;
}
.file-chip__name {
  font-size: 13px; color: var(--pt-text-dim);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;
}
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent;
  color: var(--pt-text); cursor: pointer; transition: background 0.12s;
}
.icon-btn:hover:not(:disabled) { background: var(--pt-panel-alt); }
.icon-btn:disabled { color: var(--pt-text-faint); cursor: default; }
</style>
