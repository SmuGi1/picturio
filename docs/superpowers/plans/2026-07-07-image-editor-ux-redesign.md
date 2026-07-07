# Image Editor UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Picturio image editor to match the `better-ux` mockup (warm dark/light theme, custom header, centered-canvas + status bar, 300px collapsible side panel) with full functional parity, reusing the existing store and op-pipeline unchanged.

**Architecture:** Presentation-layer redesign layered on Vuetify's theme system. `<v-app>` stays as the theme provider; the app's internal layout is rebuilt from bespoke flex components. The mockup's exact palettes become CSS custom properties toggled by a `data-pt-theme` attribute. Theme and zoom are UI-only state (composable / component-local); the Pinia store, operation model, undo/redo, replay, and export are reused untouched (one additive getter).

**Tech Stack:** Vue 3 (`<script setup>` + TS), Vuetify 3, Pinia, Vitest + @vue/test-utils, tui-image-editor (via existing adapter).

## Global Constraints

- Stack fixed: Vue 3, Vuetify 3, Pinia, TypeScript. Vuetify must remain a real dependency (tech-task requirement) — keep `<v-app>` and use it for dialog/snackbar/menu.
- Editing stays non-destructive: never modify the op-pipeline, replay, serialize, or adapter *logic*. This plan only touches presentation + additive UI state.
- Preserve every panel's `defineExpose`d method names and signatures so existing component tests pass unchanged. Exact contracts:
  - `AdjustPanel`: `onStart()`, `onChange(name: AdjustName, storeValue: number)`.
  - `FilterPanel`: `toggle(def: FilterDef)`.
  - `TransformPanel`: `startCrop()`, `applyCrop()`, `cancelCrop()`, `flip('x'|'y')`, `rotate(degrees)`.
  - `AnnotatePanel`: `addShape('rect'|'triangle')`, `toggleDraw()`, `addMask()`.
  - `ExportMenu`: `exportImage('png'|'jpeg')`, `exportJSON()`, `exportBundle()`, `onImport(file)`.
- Adjust store values stay in `-1..1` (neutral `0`); the 0–200% display is UI-only (`value = pct/100 − 1`).
- `App.text()` must NOT contain "Export" when no image is loaded, and MUST contain "Export" + the four section titles when an image is loaded. `UploadScreen` keeps its `.upload-screen` root class.
- Exact color tokens (copy verbatim), dark / light:
  - bg `#141312` / `#f6f5f2`; bgCanvas `#0d0c0b` / `#e9e7e2`; panel `#1c1b1a` / `#ffffff`; panelAlt `#242321` / `#f1f0ec`; border `rgba(255,255,255,0.09)` / `rgba(0,0,0,0.09)`; borderStrong `rgba(255,255,255,0.18)` / `rgba(0,0,0,0.18)`; text `#f2f1ef` / `#1c1b1a`; textDim `#a6a49f` / `#66645e`; textFaint `#68665f` / `#a19e97`; accent `#5b8def` / `#3465c9`; accentSoft `rgba(91,141,239,0.16)` / `rgba(52,101,201,0.10)`.
- Gate before "done": `npm run test` and `npm run build` both clean.

---

## File map

**Create**
- `src/styles/tokens.css` — both palettes as CSS vars + custom range-slider CSS.
- `src/composables/useTheme.ts` — reactive theme state + persistence.
- `src/editor/adjustScale.ts` — pure %↔value conversion helpers.
- `src/components/AppSlider.vue` — custom range slider.
- `src/components/PanelSection.vue` — collapsible section (title + chevron).
- `src/components/AppHeader.vue` — replaces `Toolbar.vue`.
- `src/components/EditorStage.vue` — canvas frame + status bar + zoom.
- `src/components/SidePanel.vue` — the 300px right column.
- `tests/components/AppHeader.test.ts` — retargeted from `Toolbar.test.ts`.
- `tests/composables/useTheme.test.ts`, `tests/editor/adjustScale.test.ts`, `tests/components/EditorStage.test.ts`.

**Modify**
- `src/stores/editor.ts` — add `hasEdits` getter.
- `src/plugins/vuetify.ts` — custom dark/light themes.
- `src/main.ts` — import `tokens.css`.
- `src/App.vue` — new layout + theme sync.
- `src/components/EditorCanvas.vue` — container centering.
- `src/components/panels/{Transform,Adjust,Filter,Annotate}Panel.vue` — restyle.
- `src/components/ExportMenu.vue` — blue button trigger + fold in import.
- `src/components/UploadScreen.vue` — token palette restyle.

**Delete**
- `src/components/Toolbar.vue`, `tests/components/Toolbar.test.ts`.

---

## Task 1: Store `hasEdits` getter

**Files:**
- Modify: `src/stores/editor.ts:38-42` (getters block)
- Test: `tests/stores/editor.test.ts`

**Interfaces:**
- Produces: getter `hasEdits: boolean` on the editor store (`true` when `operations.length > 0`).

- [ ] **Step 1: Write the failing test** — append to `tests/stores/editor.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

describe('hasEdits getter', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('is false with no ops and true once an op exists', async () => {
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    expect(store.hasEdits).toBe(false)
    await store.setAdjust('brightness', 0.3)
    expect(store.hasEdits).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/stores/editor.test.ts -t hasEdits`
Expected: FAIL — `hasEdits` is undefined.

- [ ] **Step 3: Add the getter** — in `src/stores/editor.ts`, inside `getters:`:

```ts
  getters: {
    canUndo: (s) => s.undoStack.length > 0,
    canRedo: (s) => s.redoStack.length > 0,
    hasImage: (s) => s.originalImage !== null,
    hasEdits: (s) => s.operations.length > 0,
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/stores/editor.test.ts -t hasEdits`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/editor.ts tests/stores/editor.test.ts
git commit -m "feat: add hasEdits getter to editor store"
```

---

## Task 2: Design tokens + Vuetify themes

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/plugins/vuetify.ts`, `src/main.ts:?` (add one import line)

**Interfaces:**
- Produces: CSS vars `--pt-bg`, `--pt-bg-canvas`, `--pt-panel`, `--pt-panel-alt`, `--pt-border`, `--pt-border-strong`, `--pt-text`, `--pt-text-dim`, `--pt-text-faint`, `--pt-accent`, `--pt-accent-soft`, `--pt-logo-to`, resolved under `[data-pt-theme="dark"|"light"]` (dark also the `:root` default). Global class `.pt-slider` for custom range inputs. Vuetify themes named `dark` and `light` with matching background/surface/primary.

- [ ] **Step 1: Create `src/styles/tokens.css`**

```css
:root,
[data-pt-theme='dark'] {
  --pt-bg: #141312;
  --pt-bg-canvas: #0d0c0b;
  --pt-panel: #1c1b1a;
  --pt-panel-alt: #242321;
  --pt-border: rgba(255, 255, 255, 0.09);
  --pt-border-strong: rgba(255, 255, 255, 0.18);
  --pt-text: #f2f1ef;
  --pt-text-dim: #a6a49f;
  --pt-text-faint: #68665f;
  --pt-accent: #5b8def;
  --pt-accent-soft: rgba(91, 141, 239, 0.16);
  --pt-logo-to: #8bb4ff;
}

[data-pt-theme='light'] {
  --pt-bg: #f6f5f2;
  --pt-bg-canvas: #e9e7e2;
  --pt-panel: #ffffff;
  --pt-panel-alt: #f1f0ec;
  --pt-border: rgba(0, 0, 0, 0.09);
  --pt-border-strong: rgba(0, 0, 0, 0.18);
  --pt-text: #1c1b1a;
  --pt-text-dim: #66645e;
  --pt-text-faint: #a19e97;
  --pt-accent: #3465c9;
  --pt-accent-soft: rgba(52, 101, 201, 0.1);
  --pt-logo-to: #7ea3ea;
}

/* Custom range slider (matches the better-ux mockup) */
.pt-slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 16px;
  margin: 0;
  cursor: pointer;
}
.pt-slider::-webkit-slider-runnable-track { height: 4px; background: transparent; }
.pt-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; border: 2px solid var(--pt-accent); margin-top: -6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}
.pt-slider::-moz-range-track { height: 4px; background: transparent; }
.pt-slider::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; border: 2px solid var(--pt-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}
.pt-slider:disabled { cursor: default; opacity: 0.5; }
```

- [ ] **Step 2: Replace `src/plugins/vuetify.ts`**

```ts
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: { background: '#141312', surface: '#1c1b1a', primary: '#5b8def' },
      },
      light: {
        dark: false,
        colors: { background: '#f6f5f2', surface: '#ffffff', primary: '#3465c9' },
      },
    },
  },
})
```

- [ ] **Step 3: Import tokens in `src/main.ts`** — add near the other imports:

```ts
import './styles/tokens.css'
```

- [ ] **Step 4: Verify it builds**

Run: `npm run build`
Expected: PASS (type-check + build clean).

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/plugins/vuetify.ts src/main.ts
git commit -m "feat: add design tokens and custom vuetify dark/light themes"
```

---

## Task 3: Theme composable

**Files:**
- Create: `src/composables/useTheme.ts`
- Test: `tests/composables/useTheme.test.ts`

**Interfaces:**
- Produces: `useTheme()` returning `{ theme: Ref<'dark'|'light'>, set(name), toggle() }`. `theme` is a module-level singleton ref (shared across callers). `set`/`toggle` persist to `localStorage['picturio-theme']`. Default `dark`. This composable owns state only — DOM/Vuetify sync happens in `App.vue` (Task 12).

- [ ] **Step 1: Write the failing test** — `tests/composables/useTheme.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useTheme } from '../../src/composables/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    useTheme().set('dark') // reset shared singleton
  })

  it('defaults to dark and toggles to light, persisting the choice', () => {
    const { theme, toggle } = useTheme()
    expect(theme.value).toBe('dark')
    toggle()
    expect(theme.value).toBe('light')
    expect(localStorage.getItem('picturio-theme')).toBe('light')
    toggle()
    expect(theme.value).toBe('dark')
  })

  it('shares state across calls', () => {
    const a = useTheme()
    const b = useTheme()
    a.set('light')
    expect(b.theme.value).toBe('light')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/composables/useTheme.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/composables/useTheme.ts`**

```ts
import { ref } from 'vue'

export type ThemeName = 'dark' | 'light'
const STORAGE_KEY = 'picturio-theme'

function read(): ThemeName {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return saved === 'light' ? 'light' : 'dark'
}

const theme = ref<ThemeName>(read())

export function useTheme() {
  function set(name: ThemeName) {
    theme.value = name
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, name)
  }
  function toggle() {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }
  return { theme, set, toggle }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/composables/useTheme.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useTheme.ts tests/composables/useTheme.test.ts
git commit -m "feat: add useTheme composable with persistence"
```

---

## Task 4: Adjust scale helpers

**Files:**
- Create: `src/editor/adjustScale.ts`
- Test: `tests/editor/adjustScale.test.ts`

**Interfaces:**
- Produces: `ADJUST_NEUTRAL_PCT = 100`; `valueToPercent(value: number): number` (`-1→0`, `0→100`, `1→200`, rounded); `percentToValue(percent: number): number` (`pct/100 − 1`).

- [ ] **Step 1: Write the failing test** — `tests/editor/adjustScale.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { valueToPercent, percentToValue, ADJUST_NEUTRAL_PCT } from '../../src/editor/adjustScale'

describe('adjustScale', () => {
  it('maps store values to display percent', () => {
    expect(valueToPercent(-1)).toBe(0)
    expect(valueToPercent(0)).toBe(ADJUST_NEUTRAL_PCT)
    expect(valueToPercent(1)).toBe(200)
    expect(valueToPercent(0.3)).toBe(130)
  })
  it('maps display percent back to store values', () => {
    expect(percentToValue(0)).toBe(-1)
    expect(percentToValue(100)).toBe(0)
    expect(percentToValue(200)).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/adjustScale.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/editor/adjustScale.ts`**

```ts
// Adjust channels are stored as -1..1 (neutral 0) but shown as 0-200% (neutral 100%).
export const ADJUST_NEUTRAL_PCT = 100

export function valueToPercent(value: number): number {
  return Math.round((value + 1) * 100)
}

export function percentToValue(percent: number): number {
  return percent / 100 - 1
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/adjustScale.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor/adjustScale.ts tests/editor/adjustScale.test.ts
git commit -m "feat: add adjust percent<->value scale helpers"
```

---

## Task 5: AppSlider component

**Files:**
- Create: `src/components/AppSlider.vue`

**Interfaces:**
- Consumes: `valueToPercent`, `percentToValue`, `ADJUST_NEUTRAL_PCT` (Task 4); `.pt-slider` (Task 2).
- Produces: `<AppSlider label modelValue :disabled>` emitting `update:modelValue` (store value, `-1..1`) and `start` (once per drag gesture, on pointer/touch down). Shows label, per-slider reset (when changed), mono % badge, custom track fill.

- [ ] **Step 1: Create `src/components/AppSlider.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { valueToPercent, percentToValue, ADJUST_NEUTRAL_PCT } from '../editor/adjustScale'

const props = defineProps<{ label: string; modelValue: number; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [number]; start: [] }>()

const percent = computed(() => valueToPercent(props.modelValue))
const changed = computed(() => percent.value !== ADJUST_NEUTRAL_PCT)
const fillPct = computed(() => (percent.value / 200) * 100)

function onInput(e: Event) {
  emit('update:modelValue', percentToValue(Number((e.target as HTMLInputElement).value)))
}
function onStart() {
  if (!props.disabled) emit('start')
}
function reset() {
  if (props.disabled) return
  emit('start')
  emit('update:modelValue', percentToValue(ADJUST_NEUTRAL_PCT))
}
</script>

<template>
  <div class="app-slider">
    <div class="app-slider__head">
      <div class="app-slider__label-wrap">
        <span class="app-slider__label">{{ label }}</span>
        <button
          v-if="changed"
          class="app-slider__reset"
          type="button"
          title="Reset to default"
          :disabled="disabled"
          @click="reset"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
        </button>
      </div>
      <span class="app-slider__badge" :class="{ 'app-slider__badge--changed': changed }">{{ percent }}%</span>
    </div>
    <div class="app-slider__track">
      <div class="app-slider__track-bg" />
      <div class="app-slider__track-fill" :class="{ 'app-slider__track-fill--changed': changed }" :style="{ width: fillPct + '%' }" />
      <input
        class="pt-slider"
        type="range"
        min="0"
        max="200"
        step="1"
        :value="percent"
        :disabled="disabled"
        @input="onInput"
        @mousedown="onStart"
        @touchstart="onStart"
      />
    </div>
  </div>
</template>

<style scoped>
.app-slider { margin-bottom: 18px; }
.app-slider__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.app-slider__label-wrap { display: flex; align-items: center; gap: 7px; }
.app-slider__label { font-size: 13px; color: var(--pt-text); }
.app-slider__reset {
  display: flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; padding: 0; border: none; background: transparent;
  color: var(--pt-text-dim); cursor: pointer;
}
.app-slider__badge {
  font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--pt-text-dim); background: var(--pt-panel-alt);
  padding: 2px 7px; border-radius: 5px; min-width: 38px; text-align: center;
}
.app-slider__badge--changed { color: var(--pt-accent); background: var(--pt-accent-soft); }
.app-slider__track { position: relative; height: 16px; display: flex; align-items: center; }
.app-slider__track-bg { position: absolute; left: 0; right: 0; height: 4px; border-radius: 2px; background: var(--pt-border); }
.app-slider__track-fill { position: absolute; left: 0; height: 4px; border-radius: 2px; background: var(--pt-text-faint); }
.app-slider__track-fill--changed { background: var(--pt-accent); }
</style>
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/AppSlider.vue
git commit -m "feat: add custom AppSlider matching better-ux mockup"
```

---

## Task 6: PanelSection component

**Files:**
- Create: `src/components/PanelSection.vue`

**Interfaces:**
- Produces: `<PanelSection title :last>` with a default slot for the body. Header button toggles local `open` (default `true`); chevron rotates; body collapses. `title` text is rendered verbatim (App.test relies on section titles being present in the DOM).

- [ ] **Step 1: Create `src/components/PanelSection.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ title: string; last?: boolean }>()
const open = ref(true)
</script>

<template>
  <section class="panel-section" :class="{ 'panel-section--last': last }">
    <button class="panel-section__header" type="button" @click="open = !open">
      <span class="panel-section__title">{{ title }}</span>
      <svg
        class="panel-section__chevron"
        :class="{ 'panel-section__chevron--closed': !open }"
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--pt-text-dim)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
      ><path d="M6 9l6 6 6-6" /></svg>
    </button>
    <div v-show="open" class="panel-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel-section { padding: 20px 20px; border-bottom: 1px solid var(--pt-border); }
.panel-section--last { border-bottom: none; }
.panel-section__header {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 0; border: none; background: transparent; cursor: pointer;
}
.panel-section__title { font-size: 13px; font-weight: 600; color: var(--pt-text); }
.panel-section__chevron { transition: transform 0.15s; }
.panel-section__chevron--closed { transform: rotate(-90deg); }
.panel-section__body { padding-top: 16px; }
</style>
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/PanelSection.vue
git commit -m "feat: add collapsible PanelSection component"
```

---

## Task 7: Restyle AdjustPanel

**Files:**
- Modify: `src/components/panels/AdjustPanel.vue` (full replace)
- Test: `tests/components/AdjustPanel.test.ts` (unchanged — must still pass)

**Interfaces:**
- Consumes: `AppSlider` (Task 5).
- Produces: unchanged `defineExpose({ onStart, onChange })`; `onChange(name, storeValue)` still receives raw `-1..1`.

- [ ] **Step 1: Replace `src/components/panels/AdjustPanel.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import AppSlider from '../AppSlider.vue'
import type { AdjustName } from '../../editor/operations'

const store = useEditorStore()
const channels: { name: AdjustName; label: string }[] = [
  { name: 'brightness', label: 'Brightness' },
  { name: 'contrast', label: 'Contrast' },
  { name: 'saturation', label: 'Saturation' },
]

function valueOf(name: AdjustName): number {
  const op = store.operations.find((o) => o.type === 'adjust' && o.name === name)
  return op && op.type === 'adjust' ? op.value : 0
}

function onStart() {
  store.beginAdjust()
}
function onChange(name: AdjustName, value: number) {
  void store.previewAdjust(name, value)
}

const disabled = computed(() => !store.hasImage)
defineExpose({ onStart, onChange })
</script>

<template>
  <div class="adjust-panel">
    <AppSlider
      v-for="c in channels"
      :key="c.name"
      :label="c.label"
      :model-value="valueOf(c.name)"
      :disabled="disabled"
      @start="onStart"
      @update:model-value="(v: number) => onChange(c.name, v)"
    />
  </div>
</template>

<style scoped>
.adjust-panel :deep(.app-slider:last-child) { margin-bottom: 0; }
</style>
```

- [ ] **Step 2: Run the existing test**

Run: `npx vitest run tests/components/AdjustPanel.test.ts`
Expected: PASS — `onChange('brightness', 0.4)` still calls `previewAdjust('brightness', 0.4)`; `onStart` + two `onChange` = one `beginAdjust` and one adjust op.

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/AdjustPanel.vue
git commit -m "refactor: restyle AdjustPanel with custom AppSlider"
```

---

## Task 8: Restyle FilterPanel

**Files:**
- Modify: `src/components/panels/FilterPanel.vue` (full replace)
- Test: `tests/components/FilterPanel.test.ts` (unchanged — must still pass)

**Interfaces:**
- Consumes: `FILTERS`, `FilterDef` from `../../editor/filters`.
- Produces: unchanged `defineExpose({ toggle })`; every `f.label` still rendered in the DOM (test asserts each label present).

- [ ] **Step 1: Replace `src/components/panels/FilterPanel.vue`**

```vue
<script setup lang="ts">
import { useEditorStore } from '../../stores/editor'
import { FILTERS, type FilterDef } from '../../editor/filters'

const store = useEditorStore()

function isActive(name: string): boolean {
  return store.operations.some((o) => o.type === 'filter' && o.name === name)
}

async function toggle(def: FilterDef) {
  await store.toggleFilter(def.name, def.defaults)
}

defineExpose({ toggle })
</script>

<template>
  <div class="filter-grid">
    <button
      v-for="f in FILTERS"
      :key="f.name"
      class="filter-chip"
      :class="{ 'filter-chip--active': isActive(f.name) }"
      type="button"
      :disabled="!store.hasImage"
      @click="toggle(f)"
    >
      <span class="filter-dot" :class="{ 'filter-dot--active': isActive(f.name) }" />
      <span class="filter-label">{{ f.label }}</span>
      <svg
        v-if="isActive(f.name)"
        class="filter-check"
        width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="var(--pt-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
      ><path d="M20 6L9 17l-5-5" /></svg>
    </button>
  </div>
</template>

<style scoped>
.filter-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.filter-chip {
  display: flex; align-items: center; gap: 7px; padding: 9px 11px;
  border-radius: 9px; border: 1.5px solid var(--pt-border); background: var(--pt-panel-alt);
  color: var(--pt-text-dim); font-size: 12.5px; cursor: pointer; text-align: left;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.filter-chip:hover:not(:disabled):not(.filter-chip--active) {
  border-color: var(--pt-border-strong); color: var(--pt-text);
}
.filter-chip--active {
  border-color: var(--pt-accent); background: var(--pt-accent-soft); color: var(--pt-text);
}
.filter-chip:disabled { opacity: 0.5; cursor: default; }
.filter-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--pt-text-faint); }
.filter-dot--active { background: var(--pt-accent); }
.filter-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.filter-check { margin-left: auto; flex: none; }
</style>
```

- [ ] **Step 2: Run the existing test**

Run: `npx vitest run tests/components/FilterPanel.test.ts`
Expected: PASS — `toggle` still calls `store.toggleFilter('blur', { blur: 0.2 })`; all labels rendered.

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/FilterPanel.vue
git commit -m "refactor: restyle FilterPanel as 2-column chip grid"
```

---

## Task 9: Restyle TransformPanel

**Files:**
- Modify: `src/components/panels/TransformPanel.vue` (full replace)
- Test: `tests/components/TransformPanel.test.ts` (unchanged — must still pass)

**Interfaces:**
- Produces: unchanged `defineExpose({ startCrop, applyCrop, cancelCrop, flip, rotate })`.

- [ ] **Step 1: Replace `src/components/panels/TransformPanel.vue`**

```vue
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
```

- [ ] **Step 2: Run the existing test**

Run: `npx vitest run tests/components/TransformPanel.test.ts`
Expected: PASS — `applyCrop`/`rotate` behavior unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/TransformPanel.vue
git commit -m "refactor: restyle TransformPanel with icon tool buttons"
```

---

## Task 10: Restyle AnnotatePanel

**Files:**
- Modify: `src/components/panels/AnnotatePanel.vue` (full replace)
- Test: `tests/components/AnnotatePanel.test.ts` (unchanged — must still pass)

**Interfaces:**
- Produces: unchanged `defineExpose({ addShape, toggleDraw, addMask })`; a native `<input type="color">` swatch drives the `color` ref used by `addShape`/`toggleDraw`.

- [ ] **Step 1: Replace `src/components/panels/AnnotatePanel.vue`**

```vue
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
    await store.addOperation(annotation('draw', { color: color.value, width: 6 }))
    drawing.value = true
  } else {
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
        <input type="color" :value="color" class="annotate-swatch__input" @input="onColorInput" />
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
```

- [ ] **Step 2: Run the existing test**

Run: `npx vitest run tests/components/AnnotatePanel.test.ts`
Expected: PASS — `addShape`/`addMask`/`toggleDraw` behavior unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/panels/AnnotatePanel.vue
git commit -m "refactor: restyle AnnotatePanel with swatch and tool buttons"
```

---

## Task 11: Restyle ExportMenu as header button

**Files:**
- Modify: `src/components/ExportMenu.vue` (template + one import-ops menu item)
- Test: `tests/components/ExportMenu.test.ts` (unchanged — must still pass)

**Interfaces:**
- Consumes: nothing new.
- Produces: unchanged `defineExpose({ exportImage, exportJSON, exportBundle, onImport })`. The activator is a blue "Export" button matching the mockup; "Import operations JSON…" becomes a menu item that opens a hidden file input wired to `onImport`.

- [ ] **Step 1: Replace the `<template>` of `src/components/ExportMenu.vue`** (keep the entire `<script setup>` from the current file; add a `fileInput` ref + opener). New full file:

```vue
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
```

- [ ] **Step 2: Run the existing test**

Run: `npx vitest run tests/components/ExportMenu.test.ts`
Expected: PASS — exposed methods unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/ExportMenu.vue
git commit -m "refactor: restyle ExportMenu as header button, fold in import"
```

---

## Task 12: AppHeader (replaces Toolbar)

**Files:**
- Create: `src/components/AppHeader.vue`
- Create: `tests/components/AppHeader.test.ts`
- Delete: `src/components/Toolbar.vue`, `tests/components/Toolbar.test.ts`

**Interfaces:**
- Consumes: `ExportMenu` (Task 11); `useTheme` (Task 3); `loadImageFile` from `../editor/loadFile`.
- Produces: `defineExpose({ onFile, onViewOriginal })`. `onFile(File|File[]|null)` loads via `loadImageFile`; `onViewOriginal(boolean)` calls `store.viewOriginal`. Renders the file chip, undo/redo, hold-compare, reset (with confirm dialog), theme toggle, and `<ExportMenu>`. Action controls (compare/reset/undo/redo/export/theme) render only when `store.hasImage` so `App.text()` has no "Export" pre-load.

- [ ] **Step 1: Create `tests/components/AppHeader.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import AppHeader from '../../src/components/AppHeader.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function mountHeader() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  const wrapper = mount(AppHeader, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('AppHeader', () => {
  it('reads a file and loads it as the original', async () => {
    const { store, wrapper } = mountHeader()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await (wrapper.vm as unknown as { onFile: (f: File | File[] | null) => Promise<void> }).onFile(file)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('compare calls store.viewOriginal', async () => {
    const { store, wrapper } = mountHeader()
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'viewOriginal')
    await (wrapper.vm as unknown as { onViewOriginal: (v: boolean) => Promise<void> }).onViewOriginal(true)
    expect(spy).toHaveBeenCalledWith(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/AppHeader.test.ts`
Expected: FAIL — `AppHeader.vue` does not exist.

- [ ] **Step 3: Create `src/components/AppHeader.vue`**

```vue
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
      <button class="file-chip" type="button" @click="pickFile">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pt-text-dim)" stroke-width="2" stroke-linecap="round"><path d="M12 16V4M12 4L7 9M12 4l5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
        <span class="file-chip__name">{{ fileName }}</span>
      </button>
      <input ref="fileInput" type="file" accept="image/*" class="app-header__file-input" @change="onFileChange" />
    </div>

    <div class="app-header__right">
      <template v-if="store.hasImage">
        <button class="icon-btn" type="button" title="Undo" :disabled="!store.canUndo" @click="store.undo()">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
        </button>
        <button class="icon-btn" type="button" title="Redo" :disabled="!store.canRedo" @click="store.redo()">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
        </button>
        <div class="app-header__divider" />
        <button
          class="icon-btn"
          type="button"
          title="Hold to compare with original"
          @mousedown="onViewOriginal(true)"
          @mouseup="onViewOriginal(false)"
          @mouseleave="onViewOriginal(false)"
          @touchstart.prevent="onViewOriginal(true)"
          @touchend="onViewOriginal(false)"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18" /><rect x="3" y="5" width="9" height="14" rx="1.5" /><rect x="12" y="5" width="9" height="14" rx="1.5" /></svg>
        </button>
        <button class="icon-btn" type="button" title="Reset all edits" @click="confirmReset = true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
        </button>
        <div class="app-header__divider" />
      </template>
      <button class="icon-btn" type="button" title="Toggle light / dark" @click="toggleTheme">
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
```

- [ ] **Step 4: Delete the old Toolbar + its test**

```bash
git rm src/components/Toolbar.vue tests/components/Toolbar.test.ts
```

- [ ] **Step 5: Run the new test**

Run: `npx vitest run tests/components/AppHeader.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/AppHeader.vue tests/components/AppHeader.test.ts
git commit -m "feat: add AppHeader with file chip, compare, theme toggle; remove Toolbar"
```

---

## Task 13: EditorStage (canvas frame + status bar + zoom)

**Files:**
- Create: `src/components/EditorStage.vue`
- Modify: `src/components/EditorCanvas.vue` (container centering only)
- Test: `tests/components/EditorStage.test.ts`

**Interfaces:**
- Consumes: `EditorCanvas` (existing). Reads `store.originalImage`, `store.hasEdits`, `store.viewingOriginal`.
- Produces: `defineExpose({ zoomIn, zoomOut, zoomFit, zoom })` where `zoom` is a `Ref<number>` percent (default 100, clamp 25–400, step 25; `zoomFit()` → 100). Renders the dark canvas area, a centered card wrapping `<EditorCanvas>` scaled by `transform: scale(zoom/100)`, an `ORIGINAL` overlay while `viewingOriginal`, and a status bar (dimensions + "Edited" pill + zoom controls).

- [ ] **Step 1: Write the failing test** — `tests/components/EditorStage.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import EditorStage from '../../src/components/EditorStage.vue'

function mountStage() {
  setActivePinia(createPinia())
  return mount(EditorStage, {
    global: { plugins: [createVuetify()], stubs: { EditorCanvas: true } },
  })
}

describe('EditorStage zoom', () => {
  it('steps by 25, clamps, and fits back to 100', () => {
    const wrapper = mountStage()
    // defineExpose unwraps the top-level `zoom` ref, so vm.zoom is a number
    // that reflects the current value on each access.
    const vm = wrapper.vm as unknown as {
      zoom: number
      zoomIn: () => void
      zoomOut: () => void
      zoomFit: () => void
    }
    expect(vm.zoom).toBe(100)
    vm.zoomIn()
    expect(vm.zoom).toBe(125)
    vm.zoomFit()
    expect(vm.zoom).toBe(100)
    for (let i = 0; i < 10; i++) vm.zoomOut()
    expect(vm.zoom).toBe(25)
    for (let i = 0; i < 20; i++) vm.zoomIn()
    expect(vm.zoom).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/EditorStage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/EditorStage.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import EditorCanvas from './EditorCanvas.vue'

const store = useEditorStore()
const zoom = ref(100)

function zoomIn() { zoom.value = Math.min(400, zoom.value + 25) }
function zoomOut() { zoom.value = Math.max(25, zoom.value - 25) }
function zoomFit() { zoom.value = 100 }

const dimensions = computed(() => {
  const s = store.originalImage?.source
  return s ? `${s.width} × ${s.height} px` : ''
})

defineExpose({ zoomIn, zoomOut, zoomFit, zoom })
</script>

<template>
  <div class="editor-stage">
    <div class="editor-stage__canvas">
      <div class="editor-stage__frame">
        <div class="editor-stage__card" :style="{ transform: `scale(${zoom / 100})` }">
          <EditorCanvas />
        </div>
        <div v-if="store.viewingOriginal" class="editor-stage__compare-tag">ORIGINAL</div>
      </div>
    </div>

    <div class="editor-stage__status">
      <div class="editor-stage__status-left">
        <span class="editor-stage__dims">{{ dimensions }}</span>
        <span v-if="store.hasEdits" class="editor-stage__edited">
          <span class="editor-stage__edited-dot" />
          Edited
        </span>
      </div>
      <div class="editor-stage__zoom">
        <button class="zoom-btn" type="button" title="Zoom out" @click="zoomOut">–</button>
        <span class="zoom-label">{{ zoom }}%</span>
        <button class="zoom-btn" type="button" title="Zoom in" @click="zoomIn">+</button>
        <button class="zoom-fit" type="button" @click="zoomFit">Fit</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-stage { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--pt-bg-canvas); }
.editor-stage__canvas { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; position: relative; min-height: 0; }
.editor-stage__frame { position: relative; display: flex; align-items: center; justify-content: center; max-width: 100%; max-height: 100%; }
.editor-stage__card { transition: transform 0.2s; box-shadow: 0 12px 34px rgba(0, 0, 0, 0.35); border-radius: 4px; overflow: hidden; }
.editor-stage__compare-tag {
  position: absolute; top: 10px; left: 10px; background: rgba(0, 0, 0, 0.6); color: #fff;
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em; padding: 4px 8px; border-radius: 5px;
}
.editor-stage__status {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 20px; border-top: 1px solid var(--pt-border); flex: none;
}
.editor-stage__status-left { display: flex; align-items: center; gap: 10px; }
.editor-stage__dims { font-size: 12px; color: var(--pt-text-faint); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.editor-stage__edited {
  display: flex; align-items: center; gap: 5px; font-size: 11.5px;
  color: var(--pt-accent); background: var(--pt-accent-soft); padding: 2px 8px; border-radius: 20px;
}
.editor-stage__edited-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--pt-accent); }
.editor-stage__zoom { display: flex; align-items: center; gap: 4px; }
.zoom-btn {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: var(--pt-text); border-radius: 6px; cursor: pointer; font-size: 15px;
}
.zoom-btn:hover { background: var(--pt-panel-alt); }
.zoom-label { font-size: 12px; color: var(--pt-text-dim); width: 38px; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.zoom-fit {
  padding: 4px 9px; border: 1px solid var(--pt-border); background: transparent; color: var(--pt-text-dim);
  border-radius: 6px; cursor: pointer; font-size: 11.5px; margin-left: 4px;
}
.zoom-fit:hover { background: var(--pt-panel-alt); }
</style>
```

- [ ] **Step 4: Center the toast canvas in `src/components/EditorCanvas.vue`** — replace only the `<style scoped>` block:

```vue
<style scoped>
.editor-canvas { position: relative; display: flex; align-items: center; justify-content: center; }
.tui-host { width: 900px; max-width: 70vw; height: 560px; }
</style>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/components/EditorStage.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/EditorStage.vue src/components/EditorCanvas.vue tests/components/EditorStage.test.ts
git commit -m "feat: add EditorStage with centered canvas, status bar, zoom"
```

---

## Task 14: SidePanel

**Files:**
- Create: `src/components/SidePanel.vue`

**Interfaces:**
- Consumes: `PanelSection` (Task 6) and the four restyled panels (Tasks 7–10).
- Produces: `<SidePanel>` — a 300px column of four `PanelSection`s (Transform / Adjust / Filters / Annotate). Section titles are rendered verbatim.

- [ ] **Step 1: Create `src/components/SidePanel.vue`**

```vue
<script setup lang="ts">
import PanelSection from './PanelSection.vue'
import TransformPanel from './panels/TransformPanel.vue'
import AdjustPanel from './panels/AdjustPanel.vue'
import FilterPanel from './panels/FilterPanel.vue'
import AnnotatePanel from './panels/AnnotatePanel.vue'
</script>

<template>
  <aside class="side-panel">
    <PanelSection title="Transform"><TransformPanel /></PanelSection>
    <PanelSection title="Adjust"><AdjustPanel /></PanelSection>
    <PanelSection title="Filters"><FilterPanel /></PanelSection>
    <PanelSection title="Annotate" last><AnnotatePanel /></PanelSection>
  </aside>
</template>

<style scoped>
.side-panel {
  width: 300px; flex: none; height: 100%; overflow-y: auto;
  background: var(--pt-panel); border-left: 1px solid var(--pt-border);
}
</style>
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/SidePanel.vue
git commit -m "feat: add SidePanel with four collapsible sections"
```

---

## Task 15: App layout + theme sync + UploadScreen restyle

**Files:**
- Modify: `src/App.vue` (full replace)
- Modify: `src/components/UploadScreen.vue` (restyle only; keep script + `.upload-screen` class)
- Test: `tests/components/App.test.ts`, `tests/components/UploadScreen.test.ts` (unchanged — must still pass)

**Interfaces:**
- Consumes: `AppHeader`, `EditorStage`, `SidePanel`, `UploadScreen`, `useTheme`, Vuetify `useTheme` (aliased). Wires the mockup's full-height flex layout and syncs `data-pt-theme` + Vuetify theme to the composable's `theme`.

- [ ] **Step 1: Replace `src/App.vue`**

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useTheme as useVuetifyTheme } from 'vuetify'
import AppHeader from './components/AppHeader.vue'
import EditorStage from './components/EditorStage.vue'
import SidePanel from './components/SidePanel.vue'
import UploadScreen from './components/UploadScreen.vue'
import { useEditorStore } from './stores/editor'
import { useTheme } from './composables/useTheme'

const store = useEditorStore()
const { theme } = useTheme()
const vuetifyTheme = useVuetifyTheme()

watch(
  theme,
  (name) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-pt-theme', name)
    }
    vuetifyTheme.global.name.value = name
  },
  { immediate: true },
)
</script>

<template>
  <v-app>
    <div class="app-shell">
      <AppHeader />
      <div class="app-body" :inert="!store.hasImage">
        <EditorStage />
        <SidePanel />
      </div>
      <UploadScreen v-if="!store.hasImage" class="upload-overlay" />
    </div>
  </v-app>
</template>

<style scoped>
.app-shell {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--pt-bg);
}
.app-body { flex: 1; display: flex; min-height: 0; }
.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--pt-bg);
}
</style>
```

- [ ] **Step 2: Restyle `src/components/UploadScreen.vue`** — keep the entire `<script setup>` unchanged; replace `<template>` and `<style>`:

```vue
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
```

- [ ] **Step 3: Run the affected component tests**

Run: `npx vitest run tests/components/App.test.ts tests/components/UploadScreen.test.ts`
Expected: PASS — no "Export" before load; Transform/Adjust/Filters/Annotate + "Export" after load; `.upload-screen` present when no image.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue src/components/UploadScreen.vue
git commit -m "feat: wire better-ux layout in App and restyle UploadScreen"
```

---

## Task 16: Full verification gate

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all suites PASS (stores, editor, all components incl. new AppHeader/EditorStage/useTheme/adjustScale).

- [ ] **Step 2: Type-check + build**

Run: `npm run build`
Expected: `vue-tsc` clean, Vite build succeeds. If `tui-image-editor` or a component reference errors, fix the specific type/import and re-run.

- [ ] **Step 3: Manual smoke via dev server** (use the `run` skill or):

Run: `npm run dev` and confirm in the browser:
- Upload screen matches the token palette; drag/click loads an image.
- Header shows logo, file chip (filename), undo/redo, hold-compare (image reverts while held), reset (confirm dialog), theme toggle (light/dark flips whole UI incl. Vuetify dialog), blue Export menu (PNG/JPEG/JSON/bundle/import).
- Side panel: sections collapse; Adjust sliders show %/reset and live-preview; Filters 2-col grid toggles with active check; Transform + Annotate buttons work.
- Status bar shows dimensions, "Edited" pill after an edit, and zoom −/100%/+/Fit scales the canvas.

- [ ] **Step 4: Final commit (if any smoke fixes were needed)**

```bash
git add -A
git commit -m "fix: smoke-test adjustments for better-ux redesign"
```

---

## Self-review notes (author)

- **Spec coverage:** tokens+themes (T2), theme toggle (T3/T12/T15), %↔value adjust mapping + badges + reset (T4/T5/T7), collapsible sections (T6/T14), filter grid (T8), transform icon row (T9), annotate swatch (T10), header file-chip/undo/redo/hold-compare/reset/export (T11/T12), centered canvas + status bar + zoom + Edited pill + dimensions (T1/T13), upload restyle (T15), verification (T16). All spec sections mapped.
- **Preserved test contracts:** AdjustPanel/FilterPanel/TransformPanel/AnnotatePanel/ExportMenu exposed methods unchanged; App.test text assertions satisfied; Toolbar.test retargeted to AppHeader.test.
- **Type consistency:** `onChange(name, storeValue)`, `toggle(def)`, `onFile`, `onViewOriginal`, `zoomIn/zoomOut/zoomFit/zoom`, `valueToPercent/percentToValue/ADJUST_NEUTRAL_PCT`, `hasEdits` — names consistent across tasks.
