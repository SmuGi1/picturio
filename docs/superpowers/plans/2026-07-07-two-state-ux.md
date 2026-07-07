# Two-State Editor UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Picturio into two explicit UI states — a clean upload screen before an image exists, and the existing v1 editor layout once one is loaded — without changing any editing/export behavior.

**Architecture:** `App.vue` keeps the editor layout (Toolbar + canvas + panels) permanently mounted (so the Toast UI adapter, which is created when `EditorCanvas` mounts, always exists before the first `loadOriginal` call) and overlays a new `UploadScreen.vue` component on top of it whenever `store.hasImage` is false. A shared `loadImageFile` helper removes duplicated file-reading logic between `Toolbar.vue` and `UploadScreen.vue`.

**Tech Stack:** Vue 3 (`<script setup>`), Vuetify 3, Pinia, TypeScript, Vitest + @vue/test-utils. No new dependencies.

## Global Constraints

- Vue 3 + Vuetify 3 + Pinia + TypeScript only — no new dependencies.
- `npm test` (vitest) and `npm run build` (vue-tsc typecheck + vite build) must both stay green.
- No change to the operation model, Pinia store actions/getters, non-destructive editing pipeline, or export/JSON replay (`docs/superpowers/specs/2026-07-06-image-editor-design.md`).
- No change to the drag/drop-free "always overwrite immediately, no confirm dialog" behavior when replacing an image from inside the editor (per `docs/superpowers/specs/2026-07-07-two-state-ux-design.md` §4).
- 100% of visible UI stays Vuetify components (or plain HTML elements styled to match), consistent with the existing "headless engine, Vuetify UI" decision — no Toast UI native UI.

## Design note: why the editor layer is hidden, not unmounted

The design spec (§2) describes state switching in terms of `v-if`/`v-else` between `UploadScreen` and the editor layout. That's the correct **user-facing** description, but it can't be the literal implementation: `EditorCanvas.vue`'s `onMounted` hook is what creates the Toast UI adapter (`store.setAdapter(...)`), and `store.loadOriginal()` calls `this.requireAdapter()` — which throws if no adapter exists yet. If `EditorCanvas` were only mounted once `store.hasImage` is true, the adapter would never exist at the moment the very first image is loaded (a chicken-and-egg deadlock).

So the editor layout stays mounted at all times (adapter created once, on app start, exactly like today), and `UploadScreen` is rendered as a full-area overlay on top of it — via `v-if`, since `UploadScreen` holds no state that needs to survive being unmounted. The editor layer underneath gets `:inert="!store.hasImage"` so its (momentarily invisible) controls aren't keyboard/screen-reader reachable while the overlay is up. Visually and behaviorally this is indistinguishable from the two-state description in the spec.

---

### Task 1: Shared file-loading helper

**Files:**
- Create: `src/editor/loadFile.ts`
- Test: `tests/editor/loadFile.test.ts`

**Interfaces:**
- Consumes: `useEditorStore` return type (`ReturnType<typeof useEditorStore>`) from `src/stores/editor.ts`; that store's existing `loadOriginal(dataURL: string, name: string): Promise<void>` action.
- Produces: `loadImageFile(store: EditorStore, file: File): Promise<void>` — validates the file is an image, reads it, and calls `store.loadOriginal`. Used by Task 2 (`Toolbar.vue`) and Task 3 (`UploadScreen.vue`).

- [ ] **Step 1: Write the failing test**

Create `tests/editor/loadFile.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from './mockAdapter'
import { loadImageFile } from '../../src/editor/loadFile'

function makeStore() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  return store
}

describe('loadImageFile', () => {
  it('reads an image file and loads it as the original', async () => {
    const store = makeStore()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await loadImageFile(store, file)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('ignores a non-image file', async () => {
    const store = makeStore()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    await loadImageFile(store, file)
    expect(spy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/loadFile.test.ts`
Expected: FAIL — `Cannot find module '../../src/editor/loadFile'`

- [ ] **Step 3: Write minimal implementation**

Create `src/editor/loadFile.ts`:

```ts
import type { useEditorStore } from '../stores/editor'

type EditorStore = ReturnType<typeof useEditorStore>

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function loadImageFile(store: EditorStore, file: File): Promise<void> {
  if (!file.type.startsWith('image/')) return
  const dataURL = await readAsDataURL(file)
  await store.loadOriginal(dataURL, file.name)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/loadFile.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/editor/loadFile.ts tests/editor/loadFile.test.ts
git commit -m "feat: extract shared image file-loading helper"
```

---

### Task 2: Refactor Toolbar to use the shared helper

**Files:**
- Modify: `src/components/Toolbar.vue`
- Test: `tests/components/Toolbar.test.ts` (no changes expected — verifies the refactor is behavior-preserving)

**Interfaces:**
- Consumes: `loadImageFile(store, file)` from Task 1 (`src/editor/loadFile.ts`).
- Produces: no new exports; `Toolbar.vue`'s exposed `onFile` keeps its existing signature `(value: File | File[] | null) => Promise<void>`.

- [ ] **Step 1: Replace the inline reader with the shared helper**

Edit `src/components/Toolbar.vue` — remove the local `readAsDataURL` function and rewrite `onFile` to delegate:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { loadImageFile } from '../editor/loadFile'

const store = useEditorStore()
const confirmReset = ref(false)

async function onFile(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return
  await loadImageFile(store, file)
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
```

(The `<template>` block is unchanged — leave it exactly as-is.)

- [ ] **Step 2: Run the existing Toolbar tests to confirm the refactor is behavior-preserving**

Run: `npx vitest run tests/components/Toolbar.test.ts`
Expected: PASS (2 tests) — same assertions as before, now exercising the shared helper under the hood.

- [ ] **Step 3: Commit**

```bash
git add src/components/Toolbar.vue
git commit -m "refactor: Toolbar uses shared loadImageFile helper"
```

---

### Task 3: UploadScreen component

**Files:**
- Create: `src/components/UploadScreen.vue`
- Test: `tests/components/UploadScreen.test.ts`

**Interfaces:**
- Consumes: `loadImageFile(store, file)` from Task 1; `useEditorStore()` from `src/stores/editor.ts`.
- Produces: `UploadScreen.vue`, a self-contained component with no props — reads/writes the editor store directly. Root element carries class `upload-screen`; the dropzone card carries class `upload-dropzone` (and `upload-dropzone--active` while a file is dragged over it). Task 4 imports this component and renders it conditionally.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/UploadScreen.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import UploadScreen from '../../src/components/UploadScreen.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function mountUploadScreen() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  const wrapper = mount(UploadScreen, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('UploadScreen', () => {
  it('loads a dropped image file', async () => {
    const { store, wrapper } = mountUploadScreen()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await wrapper.find('.upload-screen').trigger('drop', { dataTransfer: { files: [file] } })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('ignores a dropped non-image file', async () => {
    const { store, wrapper } = mountUploadScreen()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    await wrapper.find('.upload-screen').trigger('drop', { dataTransfer: { files: [file] } })
    expect(spy).not.toHaveBeenCalled()
  })

  it('loads a file chosen via click-to-browse (hidden input)', async () => {
    const { store, wrapper } = mountUploadScreen()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('shows an active state while dragging over, clears it on drop or drag-leave', async () => {
    const { wrapper } = mountUploadScreen()
    await wrapper.find('.upload-screen').trigger('dragover')
    expect(wrapper.find('.upload-dropzone').classes()).toContain('upload-dropzone--active')
    await wrapper.find('.upload-screen').trigger('dragleave')
    expect(wrapper.find('.upload-dropzone').classes()).not.toContain('upload-dropzone--active')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/UploadScreen.test.ts`
Expected: FAIL — `Cannot find module '../../src/components/UploadScreen.vue'`

- [ ] **Step 3: Write the component**

Create `src/components/UploadScreen.vue`:

```vue
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/UploadScreen.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/UploadScreen.vue tests/components/UploadScreen.test.ts
git commit -m "feat: add UploadScreen component with click-to-browse and drag-and-drop"
```

---

### Task 4: Wire the two-state layout into App.vue

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/EditorCanvas.vue`
- Test: `tests/components/App.test.ts`

**Interfaces:**
- Consumes: `UploadScreen.vue` from Task 3 (no props); `store.hasImage` getter from `src/stores/editor.ts` (already exists, unchanged).
- Produces: the app's top-level DOM structure — `.upload-screen` present when `!store.hasImage`, absent when `store.hasImage`; `ExportMenu` present in the app bar only when `store.hasImage`. Nothing downstream of this task depends on new exports.

- [ ] **Step 1: Remove the now-redundant empty-state placeholder from EditorCanvas**

Edit `src/components/EditorCanvas.vue` — `UploadScreen` (Task 3) now owns the "no image yet" messaging, so this placeholder is dead code:

```vue
<template>
  <div class="editor-canvas">
    <div ref="host" class="tui-host" />
  </div>
</template>

<style scoped>
.editor-canvas { position: relative; min-height: 640px; width: 100%; }
.tui-host { width: 100%; height: 640px; }
</style>
```

(Only the `<template>` and `<style>` blocks change — remove the `v-if="!store.hasImage"` placeholder `<div>` and its `.placeholder` style rule. The `<script setup>` block is unchanged.)

- [ ] **Step 2: Run EditorCanvas tests to confirm nothing broke**

Run: `npx vitest run tests/components/EditorCanvas.test.ts`
Expected: PASS (2 tests) — these tests never asserted on the placeholder text, so they're unaffected.

- [ ] **Step 3: Write the failing/updated App tests**

Replace `tests/components/App.test.ts` entirely:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import App from '../../src/App.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function mountApp() {
  const wrapper = mount(App, { global: { plugins: [createVuetify()], stubs: { EditorCanvas: true } } })
  return wrapper
}

describe('App', () => {
  it('shows the upload screen when no image is loaded', () => {
    setActivePinia(createPinia())
    const wrapper = mountApp()
    expect(wrapper.find('.upload-screen').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Export')
  })

  it('shows the editor once an image is loaded, and hides the upload screen', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    const wrapper = mountApp()
    await store.loadOriginal('data:x', 'p.png')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.upload-screen').exists()).toBe(false)
    expect(wrapper.text()).toContain('Transform')
    expect(wrapper.text()).toContain('Adjust')
    expect(wrapper.text()).toContain('Filters')
    expect(wrapper.text()).toContain('Annotate')
    expect(wrapper.text()).toContain('Export')
  })
})
```

Note: `EditorCanvas` is stubbed here (as it was before this plan) because it mounts the real Toast UI adapter against a `<canvas>`-less jsdom; stubbing it means `store.adapter` stays whatever the test sets it to (`MockAdapter`, in the second test), which is what `store.loadOriginal` needs.

- [ ] **Step 4: Run the new tests to verify they fail**

Run: `npx vitest run tests/components/App.test.ts`
Expected: FAIL — `.upload-screen` not found (App.vue doesn't render `UploadScreen` yet)

- [ ] **Step 5: Update App.vue**

Replace `src/App.vue`:

```vue
<script setup lang="ts">
import Toolbar from './components/Toolbar.vue'
import EditorCanvas from './components/EditorCanvas.vue'
import TransformPanel from './components/panels/TransformPanel.vue'
import AdjustPanel from './components/panels/AdjustPanel.vue'
import FilterPanel from './components/panels/FilterPanel.vue'
import AnnotatePanel from './components/panels/AnnotatePanel.vue'
import ExportMenu from './components/ExportMenu.vue'
import UploadScreen from './components/UploadScreen.vue'
import { useEditorStore } from './stores/editor'

const store = useEditorStore()
</script>

<template>
  <v-app>
    <v-app-bar color="surface" flat>
      <v-app-bar-title>Picturio</v-app-bar-title>
      <ExportMenu v-if="store.hasImage" />
    </v-app-bar>
    <v-main>
      <div class="app-shell">
        <div class="editor-layer" :inert="!store.hasImage">
          <Toolbar />
          <v-container fluid>
            <v-row>
              <v-col cols="12" md="8">
                <EditorCanvas />
              </v-col>
              <v-col cols="12" md="4">
                <v-expansion-panels multiple :model-value="[0, 1, 2, 3]">
                  <v-expansion-panel>
                    <v-expansion-panel-title>Transform</v-expansion-panel-title>
                    <v-expansion-panel-text><TransformPanel /></v-expansion-panel-text>
                  </v-expansion-panel>
                  <v-expansion-panel>
                    <v-expansion-panel-title>Adjust</v-expansion-panel-title>
                    <v-expansion-panel-text><AdjustPanel /></v-expansion-panel-text>
                  </v-expansion-panel>
                  <v-expansion-panel>
                    <v-expansion-panel-title>Filters</v-expansion-panel-title>
                    <v-expansion-panel-text><FilterPanel /></v-expansion-panel-text>
                  </v-expansion-panel>
                  <v-expansion-panel>
                    <v-expansion-panel-title>Annotate</v-expansion-panel-title>
                    <v-expansion-panel-text><AnnotatePanel /></v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-col>
            </v-row>
          </v-container>
        </div>
        <UploadScreen v-if="!store.hasImage" class="upload-overlay" />
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-shell {
  position: relative;
}
.upload-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgb(var(--v-theme-background));
}
</style>
```

- [ ] **Step 6: Run the App tests to verify they pass**

Run: `npx vitest run tests/components/App.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add src/App.vue src/components/EditorCanvas.vue tests/components/App.test.ts
git commit -m "feat: switch between upload screen and editor based on store.hasImage"
```

---

### Task 5: Update README for the new UX

**Files:**
- Modify: `README.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Update the "What it does" load-image bullet and add a short UX note**

In `README.md`, change:

```
- Load an image via file upload (file picker; the canvas also accepts it).
```

to:

```
- Load an image via a dedicated upload screen (click-to-browse or drag-and-drop). Once
  an image is loaded, the full editor (crop, adjust, filters, annotate, export) replaces
  it — the two states keep the first-run experience uncluttered.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: describe the two-state upload/editor UX"
```

---

### Task 6: Full verification

**Files:** None modified — verification only.

**Interfaces:** None.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green, including the 6 tests added/changed in Tasks 1, 3, 4 (2 new in `loadFile.test.ts`, 4 new in `UploadScreen.test.ts`, `App.test.ts` and `Toolbar.test.ts` and `EditorCanvas.test.ts` passing as before).

- [ ] **Step 2: Run the production build (includes vue-tsc typecheck)**

Run: `npm run build`
Expected: PASS — no TypeScript errors, Vite build succeeds.

- [ ] **Step 3: Manual smoke test in a real browser**

Run: `npm run dev`, open the printed URL:
- Confirm the upload screen appears on load, with no toolbar/panels visible.
- Drag an image file onto the dropzone → editor appears with the image loaded.
- Reload, click the dropzone → native file picker opens → pick an image → editor appears.
- In the editor, use the toolbar's "Upload image" field to pick a different image → it replaces immediately (no confirm dialog), matching current behavior.
- Confirm crop/adjust/filters/annotate/export/undo/redo/reset/view-original all still work exactly as in v1.

- [ ] **Step 4: Commit (only if Step 3 uncovered fixes)**

If manual testing required code changes, commit them with a message describing the fix. If not, this task requires no commit.
