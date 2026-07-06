# Image Editor (Picturio) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A non-destructive, client-side image editor where an ordered operation-log (Pinia) is the source of truth, Toast UI Image Editor is the headless rendering engine behind an adapter seam, and 100% of the UI is Vuetify.

**Architecture:** Vuetify controls dispatch actions to a Pinia store holding `{ originalImage, operations[] }`. The store syncs a live preview through a typed `ImageAdapter`; the only implementation of that interface (`toastAdapter.ts`) wraps `tui-image-editor`/`fabric`. The original is never mutated — Reset, View-original, and Import-JSON all rebuild the preview from `original + ops` via a shared `replay()` function, which is also what proves exported JSON reproduces the result.

**Tech Stack:** Vite, Vue 3 (`<script setup>` + TS), Vuetify 3, Pinia, `tui-image-editor`, `fabric`, `jszip`, Vitest + @vue/test-utils + jsdom.

## Global Constraints

- Must run with `npm i && npm run dev`. (verbatim from spec §8)
- Vue 3 + Vuetify 3 + Pinia + TypeScript. (spec §2 stack)
- Vuetify with low-to-no customization; Toast UI's own UI is never shown (`includeUI` omitted / headless). (spec §2.1)
- The uploaded image is stored once as an immutable `originalImage` dataURL and is never written to. (spec §7)
- `toastAdapter.ts` is the ONLY module that imports `tui-image-editor` or `fabric`. (spec §3)
- Op-log JSON is versioned: `{ version, source:{name,width,height}, operations:[] }`. (spec §5.5)
- Tests mock the adapter — jsdom has no `<canvas>`. Pure op-model logic is TDD; adapter glue is verified in-browser. (spec §9)

---

## File Structure

```
src/
  main.ts                       # app bootstrap (Vue + Vuetify + Pinia)
  App.vue                       # top-level layout, assembles toolbar + canvas + panels
  plugins/vuetify.ts            # Vuetify instance
  editor/
    operations.ts               # Operation types + factory functions (pure)
    serialize.ts                # versioned JSON serialize/deserialize (pure)
    adapter.types.ts            # ImageAdapter interface + shared value types
    replay.ts                   # apply Operation[] to an ImageAdapter in order (pure)
    toastAdapter.ts             # ImageAdapter impl over tui-image-editor (only TUI import)
    filters.ts                  # filter catalog metadata (name -> control schema)
  stores/editor.ts              # originalImage, operations[], undo/redo, actions
  components/
    EditorCanvas.vue            # hosts headless TUI canvas; owns adapter lifecycle
    Toolbar.vue                 # upload, view-original, reset, undo/redo, export/import
    panels/
      TransformPanel.vue        # crop, flip, rotate
      AdjustPanel.vue           # brightness/contrast/saturation live sliders
      FilterPanel.vue           # full filter catalog
      AnnotatePanel.vue         # draw, shape, text, icon, mask
  types/tui-image-editor.d.ts   # type shim
tests/
  editor/operations.test.ts
  editor/serialize.test.ts
  editor/replay.test.ts
  editor/mockAdapter.ts         # test double implementing ImageAdapter
  stores/editor.test.ts
  components/*.test.ts
vitest.config.ts
```

---

## Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.ts`, `src/App.vue`, `src/plugins/vuetify.ts`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a running dev app and a working `npm test`. Vuetify + Pinia registered in `main.ts`.

- [ ] **Step 1: Scaffold and install dependencies**

Run:
```bash
npm create vite@latest . -- --template vue-ts
npm install
npm install vuetify@^3 @mdi/font pinia tui-image-editor fabric@^5 jszip
npm install -D vitest @vue/test-utils jsdom @vitejs/plugin-vue vite-plugin-vuetify
```
Expected: `node_modules/` populated; `package.json` has the deps above.

- [ ] **Step 2: Add test script and jsdom config**

Edit `package.json` `"scripts"` to include:
```json
"dev": "vite",
"build": "vue-tsc -b && vite build",
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    server: { deps: { inline: ['vuetify'] } },
  },
})
```

- [ ] **Step 3: Configure Vuetify plugin**

Create `src/plugins/vuetify.ts`:
```ts
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: { defaultTheme: 'dark' },
})
```

Create `src/main.ts`:
```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import App from './App.vue'

createApp(App).use(createPinia()).use(vuetify).mount('#app')
```

Wire Vuetify into Vite — edit `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
})
```

- [ ] **Step 4: Minimal App shell**

Create `src/App.vue`:
```vue
<script setup lang="ts"></script>

<template>
  <v-app>
    <v-main>
      <v-container>
        <h1 class="text-h5">Picturio</h1>
      </v-container>
    </v-main>
  </v-app>
</template>
```

- [ ] **Step 5: Write the smoke test**

Create `tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run the test and dev server**

Run: `npm test`
Expected: PASS, 1 test.
Run: `npm run dev` then open the URL.
Expected: page shows "Picturio" heading inside a Vuetify dark app.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vue 3 + Vuetify + Pinia + Vitest"
```

---

## Task 2: Operation types + factories

**Files:**
- Create: `src/editor/operations.ts`
- Test: `tests/editor/operations.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Types: `CropRect`, `AdjustName`, `FilterName`, `AnnotationType`, `Operation` (union of `CropOp | FlipOp | RotateOp | AdjustOp | FilterOp | AnnotationOp`).
  - Factories (each returns an op with a fresh string `id`):
    `crop(rect: CropRect): CropOp`,
    `flip(axis: 'x'|'y'): FlipOp`,
    `rotate(degrees: number): RotateOp`,
    `adjust(name: AdjustName, value: number): AdjustOp`,
    `filter(name: FilterName, options?: Record<string, unknown>): FilterOp`,
    `annotation(type: AnnotationType, props: Record<string, unknown>): AnnotationOp`.

- [ ] **Step 1: Write the failing test**

Create `tests/editor/operations.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { crop, flip, rotate, adjust, filter, annotation } from '../../src/editor/operations'

describe('operation factories', () => {
  it('crop carries the rect and a crop type', () => {
    const op = crop({ left: 1, top: 2, width: 3, height: 4 })
    expect(op.type).toBe('crop')
    expect(op.rect).toEqual({ left: 1, top: 2, width: 3, height: 4 })
    expect(typeof op.id).toBe('string')
    expect(op.id.length).toBeGreaterThan(0)
  })

  it('adjust carries name and value', () => {
    const op = adjust('brightness', 0.3)
    expect(op).toMatchObject({ type: 'adjust', name: 'brightness', value: 0.3 })
  })

  it('filter carries name and options', () => {
    expect(filter('blur', { blur: 0.2 })).toMatchObject({ type: 'filter', name: 'blur', options: { blur: 0.2 } })
    expect(filter('grayscale').options).toBeUndefined()
  })

  it('flip/rotate/annotation build their shapes', () => {
    expect(flip('x')).toMatchObject({ type: 'flip', axis: 'x' })
    expect(rotate(90)).toMatchObject({ type: 'rotate', degrees: 90 })
    expect(annotation('text', { text: 'hi' })).toMatchObject({ type: 'text', props: { text: 'hi' } })
  })

  it('ids are unique across factory calls', () => {
    expect(crop({ left: 0, top: 0, width: 1, height: 1 }).id)
      .not.toBe(crop({ left: 0, top: 0, width: 1, height: 1 }).id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/operations.test.ts`
Expected: FAIL — cannot resolve `../../src/editor/operations`.

- [ ] **Step 3: Write minimal implementation**

Create `src/editor/operations.ts`:
```ts
export interface CropRect {
  left: number
  top: number
  width: number
  height: number
}

export type AdjustName = 'brightness' | 'contrast' | 'saturation'

export type FilterName =
  | 'grayscale' | 'sepia' | 'sepia2' | 'invert' | 'blur' | 'sharpen'
  | 'emboss' | 'noise' | 'pixelate' | 'removeColor' | 'tint'
  | 'multiply' | 'blend' | 'colorFilter'

export type AnnotationType = 'text' | 'shape' | 'draw' | 'icon' | 'mask'

interface BaseOp { id: string }
export interface CropOp extends BaseOp { type: 'crop'; rect: CropRect }
export interface FlipOp extends BaseOp { type: 'flip'; axis: 'x' | 'y' }
export interface RotateOp extends BaseOp { type: 'rotate'; degrees: number }
export interface AdjustOp extends BaseOp { type: 'adjust'; name: AdjustName; value: number }
export interface FilterOp extends BaseOp { type: 'filter'; name: FilterName; options?: Record<string, unknown> }
export interface AnnotationOp extends BaseOp { type: AnnotationType; props: Record<string, unknown> }

export type Operation = CropOp | FlipOp | RotateOp | AdjustOp | FilterOp | AnnotationOp

function newId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}-${Date.now()}`)
}

export const crop = (rect: CropRect): CropOp => ({ id: newId(), type: 'crop', rect })
export const flip = (axis: 'x' | 'y'): FlipOp => ({ id: newId(), type: 'flip', axis })
export const rotate = (degrees: number): RotateOp => ({ id: newId(), type: 'rotate', degrees })
export const adjust = (name: AdjustName, value: number): AdjustOp => ({ id: newId(), type: 'adjust', name, value })
export const filter = (name: FilterName, options?: Record<string, unknown>): FilterOp =>
  ({ id: newId(), type: 'filter', name, ...(options ? { options } : {}) })
export const annotation = (type: AnnotationType, props: Record<string, unknown>): AnnotationOp =>
  ({ id: newId(), type, props })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/operations.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editor/operations.ts tests/editor/operations.test.ts
git commit -m "feat: operation types and factories"
```

---

## Task 3: Versioned JSON serialize/deserialize

**Files:**
- Create: `src/editor/serialize.ts`
- Test: `tests/editor/serialize.test.ts`

**Interfaces:**
- Consumes: `Operation` from `operations.ts`.
- Produces:
  - `const OPS_VERSION = 1`
  - `interface OpsSource { name: string; width: number; height: number }`
  - `interface OpsDocument { version: number; source: OpsSource; operations: Operation[] }`
  - `serialize(source: OpsSource, operations: Operation[]): string`
  - `deserialize(json: string): OpsDocument` — throws `Error` on invalid JSON, missing fields, or unsupported version.

- [ ] **Step 1: Write the failing test**

Create `tests/editor/serialize.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { serialize, deserialize, OPS_VERSION } from '../../src/editor/serialize'
import { adjust, crop } from '../../src/editor/operations'

const source = { name: 'p.png', width: 800, height: 600 }

describe('serialize/deserialize', () => {
  it('round-trips a document', () => {
    const ops = [crop({ left: 0, top: 0, width: 10, height: 10 }), adjust('contrast', 0.5)]
    const doc = deserialize(serialize(source, ops))
    expect(doc.version).toBe(OPS_VERSION)
    expect(doc.source).toEqual(source)
    expect(doc.operations).toEqual(ops)
  })

  it('produces valid JSON text', () => {
    const text = serialize(source, [])
    expect(() => JSON.parse(text)).not.toThrow()
    expect(JSON.parse(text)).toMatchObject({ version: OPS_VERSION, source, operations: [] })
  })

  it('rejects malformed JSON', () => {
    expect(() => deserialize('{not json')).toThrow()
  })

  it('rejects an unsupported version', () => {
    const bad = JSON.stringify({ version: 999, source, operations: [] })
    expect(() => deserialize(bad)).toThrow(/version/i)
  })

  it('rejects a document missing operations array', () => {
    const bad = JSON.stringify({ version: OPS_VERSION, source })
    expect(() => deserialize(bad)).toThrow(/operations/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/serialize.test.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

Create `src/editor/serialize.ts`:
```ts
import type { Operation } from './operations'

export const OPS_VERSION = 1

export interface OpsSource {
  name: string
  width: number
  height: number
}

export interface OpsDocument {
  version: number
  source: OpsSource
  operations: Operation[]
}

export function serialize(source: OpsSource, operations: Operation[]): string {
  const doc: OpsDocument = { version: OPS_VERSION, source, operations }
  return JSON.stringify(doc, null, 2)
}

export function deserialize(json: string): OpsDocument {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON: could not parse operations document')
  }
  const doc = parsed as Partial<OpsDocument>
  if (doc.version !== OPS_VERSION) {
    throw new Error(`Unsupported operations version: ${String(doc.version)} (expected ${OPS_VERSION})`)
  }
  if (!doc.source || typeof doc.source.name !== 'string') {
    throw new Error('Invalid document: missing source metadata')
  }
  if (!Array.isArray(doc.operations)) {
    throw new Error('Invalid document: operations must be an array')
  }
  return { version: doc.version, source: doc.source, operations: doc.operations }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/serialize.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editor/serialize.ts tests/editor/serialize.test.ts
git commit -m "feat: versioned op-log serialize/deserialize"
```

---

## Task 4: Adapter interface + mock adapter test double

**Files:**
- Create: `src/editor/adapter.types.ts`
- Create: `tests/editor/mockAdapter.ts`
- Test: `tests/editor/mockAdapter.test.ts`

**Interfaces:**
- Consumes: `CropRect` from `operations.ts`.
- Produces:
  - `interface ExportOptions { format?: 'png' | 'jpeg'; quality?: number }`
  - `interface LoadResult { width: number; height: number }`
  - `interface ImageAdapter` with methods:
    `loadImage(dataURL: string, name: string): Promise<LoadResult>`,
    `applyFilter(name: string, options?: Record<string, unknown>): Promise<void>`,
    `removeFilter(name: string): Promise<void>`,
    `crop(rect: CropRect): Promise<void>`,
    `startCrop(): void`, `cancelCrop(): void`, `getCropRect(): CropRect`,
    `flip(axis: 'x' | 'y'): Promise<void>`,
    `rotate(degrees: number): Promise<void>`,
    `addObject(type: 'text' | 'shape' | 'draw' | 'icon', props: Record<string, unknown>): Promise<string>`,
    `applyMask(props: Record<string, unknown>): Promise<void>`,
    `clearObjectsAndFilters(): Promise<void>`,
    `toDataURL(opts?: ExportOptions): string`.
  - `MockAdapter` (in tests) recording an ordered `calls: Array<{ method: string; args: unknown[] }>`.

- [ ] **Step 1: Write the failing test**

Create `tests/editor/mockAdapter.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { MockAdapter } from './mockAdapter'

describe('MockAdapter', () => {
  it('records ordered calls', async () => {
    const a = new MockAdapter()
    await a.applyFilter('grayscale')
    await a.rotate(90)
    expect(a.calls.map((c) => c.method)).toEqual(['applyFilter', 'rotate'])
    expect(a.calls[1].args).toEqual([90])
  })

  it('returns a data url and load result', async () => {
    const a = new MockAdapter()
    expect(await a.loadImage('data:x', 'n.png')).toEqual({ width: 100, height: 80 })
    expect(a.toDataURL()).toContain('data:image')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/mockAdapter.test.ts`
Expected: FAIL — cannot resolve `./mockAdapter`.

- [ ] **Step 3: Write the interface and the mock**

Create `src/editor/adapter.types.ts`:
```ts
import type { CropRect } from './operations'

export interface ExportOptions {
  format?: 'png' | 'jpeg'
  quality?: number
}

export interface LoadResult {
  width: number
  height: number
}

export interface ImageAdapter {
  loadImage(dataURL: string, name: string): Promise<LoadResult>
  applyFilter(name: string, options?: Record<string, unknown>): Promise<void>
  removeFilter(name: string): Promise<void>
  crop(rect: CropRect): Promise<void>
  startCrop(): void
  cancelCrop(): void
  getCropRect(): CropRect
  flip(axis: 'x' | 'y'): Promise<void>
  rotate(degrees: number): Promise<void>
  addObject(type: 'text' | 'shape' | 'draw' | 'icon', props: Record<string, unknown>): Promise<string>
  applyMask(props: Record<string, unknown>): Promise<void>
  clearObjectsAndFilters(): Promise<void>
  toDataURL(opts?: ExportOptions): string
}
```

Create `tests/editor/mockAdapter.ts`:
```ts
import type { ImageAdapter, ExportOptions, LoadResult } from '../../src/editor/adapter.types'
import type { CropRect } from '../../src/editor/operations'

export class MockAdapter implements ImageAdapter {
  calls: Array<{ method: string; args: unknown[] }> = []
  private record(method: string, ...args: unknown[]) {
    this.calls.push({ method, args })
  }
  async loadImage(dataURL: string, name: string): Promise<LoadResult> {
    this.record('loadImage', dataURL, name)
    return { width: 100, height: 80 }
  }
  async applyFilter(name: string, options?: Record<string, unknown>) { this.record('applyFilter', name, options) }
  async removeFilter(name: string) { this.record('removeFilter', name) }
  async crop(rect: CropRect) { this.record('crop', rect) }
  startCrop() { this.record('startCrop') }
  cancelCrop() { this.record('cancelCrop') }
  getCropRect(): CropRect { this.record('getCropRect'); return { left: 0, top: 0, width: 10, height: 10 } }
  async flip(axis: 'x' | 'y') { this.record('flip', axis) }
  async rotate(degrees: number) { this.record('rotate', degrees) }
  async addObject(type: 'text' | 'shape' | 'draw' | 'icon', props: Record<string, unknown>) {
    this.record('addObject', type, props); return `obj-${this.calls.length}`
  }
  async applyMask(props: Record<string, unknown>) { this.record('applyMask', props) }
  async clearObjectsAndFilters() { this.record('clearObjectsAndFilters') }
  toDataURL(opts?: ExportOptions): string { this.record('toDataURL', opts); return 'data:image/png;base64,MOCK' }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/mockAdapter.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editor/adapter.types.ts tests/editor/mockAdapter.ts tests/editor/mockAdapter.test.ts
git commit -m "feat: ImageAdapter interface and mock test double"
```

---

## Task 5: Replay engine

**Files:**
- Create: `src/editor/replay.ts`
- Test: `tests/editor/replay.test.ts`

**Interfaces:**
- Consumes: `Operation` from `operations.ts`, `ImageAdapter` from `adapter.types.ts`.
- Produces: `replay(operations: Operation[], adapter: ImageAdapter): Promise<void>` — applies each op to the adapter in order:
  - `crop` → `adapter.crop(rect)`
  - `flip` → `adapter.flip(axis)`
  - `rotate` → `adapter.rotate(degrees)`
  - `adjust` → `adapter.applyFilter(name, { [name]: value })`
  - `filter` → `adapter.applyFilter(name, options)`
  - `text|shape|draw|icon` → `adapter.addObject(type, props)`
  - `mask` → `adapter.applyMask(props)`

- [ ] **Step 1: Write the failing test**

Create `tests/editor/replay.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { replay } from '../../src/editor/replay'
import { MockAdapter } from './mockAdapter'
import { adjust, annotation, crop, filter, flip, rotate } from '../../src/editor/operations'

describe('replay', () => {
  it('applies operations in recorded order', async () => {
    const a = new MockAdapter()
    await replay([rotate(90), adjust('brightness', 0.2), filter('sepia')], a)
    expect(a.calls.map((c) => c.method)).toEqual(['rotate', 'applyFilter', 'applyFilter'])
  })

  it('maps adjust to a named filter option object', async () => {
    const a = new MockAdapter()
    await replay([adjust('contrast', 0.4)], a)
    expect(a.calls[0]).toEqual({ method: 'applyFilter', args: ['contrast', { contrast: 0.4 }] })
  })

  it('maps crop, flip, annotation, and mask', async () => {
    const a = new MockAdapter()
    await replay(
      [
        crop({ left: 1, top: 2, width: 3, height: 4 }),
        flip('y'),
        annotation('text', { text: 'hi' }),
        annotation('mask', { maskObjId: 5 }),
      ],
      a,
    )
    expect(a.calls.map((c) => c.method)).toEqual(['crop', 'flip', 'addObject', 'applyMask'])
    expect(a.calls[0].args[0]).toEqual({ left: 1, top: 2, width: 3, height: 4 })
    expect(a.calls[2].args).toEqual(['text', { text: 'hi' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/replay.test.ts`
Expected: FAIL — cannot resolve `../../src/editor/replay`.

- [ ] **Step 3: Write minimal implementation**

Create `src/editor/replay.ts`:
```ts
import type { Operation } from './operations'
import type { ImageAdapter } from './adapter.types'

export async function replay(operations: Operation[], adapter: ImageAdapter): Promise<void> {
  for (const op of operations) {
    switch (op.type) {
      case 'crop':
        await adapter.crop(op.rect)
        break
      case 'flip':
        await adapter.flip(op.axis)
        break
      case 'rotate':
        await adapter.rotate(op.degrees)
        break
      case 'adjust':
        await adapter.applyFilter(op.name, { [op.name]: op.value })
        break
      case 'filter':
        await adapter.applyFilter(op.name, op.options)
        break
      case 'text':
      case 'shape':
      case 'draw':
      case 'icon':
        await adapter.addObject(op.type, op.props)
        break
      case 'mask':
        await adapter.applyMask(op.props)
        break
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/replay.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editor/replay.ts tests/editor/replay.test.ts
git commit -m "feat: replay engine maps ops to adapter calls"
```

---

## Task 6: Editor store (Pinia)

**Files:**
- Create: `src/stores/editor.ts`
- Test: `tests/stores/editor.test.ts`

**Interfaces:**
- Consumes: `Operation`, factories (`adjust`, etc.) from `operations.ts`; `serialize`/`deserialize`/`OpsSource` from `serialize.ts`; `ImageAdapter` from `adapter.types.ts`; `replay` from `replay.ts`.
- Produces `useEditorStore` with:
  - state: `originalImage: { dataURL: string; source: OpsSource } | null`, `operations: Operation[]`, `viewingOriginal: boolean`, `canUndo`/`canRedo` (getters).
  - `setAdapter(adapter: ImageAdapter): void` — DI seam so tests inject the mock.
  - `loadOriginal(dataURL: string, name: string): Promise<void>` — sets immutable original, clears ops+history, loads into adapter.
  - `setAdjust(name: AdjustName, value: number): void` — last-write-wins per name; live `applyFilter`; commits to history.
  - `addOperation(op: Operation): Promise<void>` — pushes op, replays that op onto adapter, commits history.
  - `toggleFilter(name: FilterName, options?): Promise<void>` — add if absent (applyFilter), remove if present (removeFilter + drop op).
  - `reset(): Promise<void>` — clears ops+history, reloads original into adapter.
  - `viewOriginal(on: boolean): Promise<void>` — shows original (on) or re-applies ops (off); does not mutate `operations`.
  - `undo(): Promise<void>` / `redo(): Promise<void>` — snapshot-based; rebuild preview from original+ops.
  - `exportJSON(): string` — `serialize(source, operations)`; throws if no image.
  - `importJSON(json: string): Promise<void>` — `deserialize`, replace ops, reset+replay.

- [ ] **Step 1: Write the failing test**

Create `tests/stores/editor.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function setup() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  const adapter = new MockAdapter()
  store.setAdapter(adapter)
  return { store, adapter }
}

describe('editor store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loadOriginal stores an immutable original and loads adapter', async () => {
    const { store, adapter } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    expect(store.originalImage?.dataURL).toBe('data:img')
    expect(store.originalImage?.source).toEqual({ name: 'cat.png', width: 100, height: 80 })
    expect(adapter.calls.some((c) => c.method === 'loadImage')).toBe(true)
  })

  it('setAdjust is last-write-wins per name', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('brightness', 0.2)
    store.setAdjust('brightness', 0.5)
    const adjusts = store.operations.filter((o) => o.type === 'adjust')
    expect(adjusts).toHaveLength(1)
    expect(adjusts[0]).toMatchObject({ name: 'brightness', value: 0.5 })
  })

  it('reset clears operations and reloads original', async () => {
    const { store, adapter } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('contrast', 0.5)
    adapter.calls.length = 0
    await store.reset()
    expect(store.operations).toHaveLength(0)
    expect(adapter.calls.some((c) => c.method === 'loadImage')).toBe(true)
  })

  it('viewOriginal shows original without mutating operations', async () => {
    const { store, adapter } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('contrast', 0.5)
    await store.viewOriginal(true)
    expect(store.viewingOriginal).toBe(true)
    expect(store.operations).toHaveLength(1)
    expect(adapter.calls.some((c) => c.method === 'loadImage')).toBe(true)
  })

  it('undo/redo step through committed operations', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    await store.addOperation((await import('../../src/editor/operations')).filter('sepia'))
    expect(store.operations).toHaveLength(1)
    await store.undo()
    expect(store.operations).toHaveLength(0)
    await store.redo()
    expect(store.operations).toHaveLength(1)
  })

  it('exportJSON serializes and importJSON replays', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('brightness', 0.3)
    const json = store.exportJSON()
    await store.reset()
    await store.importJSON(json)
    expect(store.operations.filter((o) => o.type === 'adjust')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/stores/editor.test.ts`
Expected: FAIL — cannot resolve `../../src/stores/editor`.

- [ ] **Step 3: Write minimal implementation**

Create `src/stores/editor.ts`:
```ts
import { defineStore } from 'pinia'
import type { AdjustName, FilterName, Operation } from '../editor/operations'
import { adjust as makeAdjust } from '../editor/operations'
import type { ImageAdapter } from '../editor/adapter.types'
import { replay } from '../editor/replay'
import { serialize, deserialize, type OpsSource } from '../editor/serialize'

interface OriginalImage { dataURL: string; source: OpsSource }

interface State {
  adapter: ImageAdapter | null
  originalImage: OriginalImage | null
  operations: Operation[]
  viewingOriginal: boolean
  undoStack: Operation[][]
  redoStack: Operation[][]
}

export const useEditorStore = defineStore('editor', {
  state: (): State => ({
    adapter: null,
    originalImage: null,
    operations: [],
    viewingOriginal: false,
    undoStack: [],
    redoStack: [],
  }),
  getters: {
    canUndo: (s) => s.undoStack.length > 0,
    canRedo: (s) => s.redoStack.length > 0,
    hasImage: (s) => s.originalImage !== null,
  },
  actions: {
    setAdapter(adapter: ImageAdapter) {
      this.adapter = adapter
    },
    requireAdapter(): ImageAdapter {
      if (!this.adapter) throw new Error('Adapter not set')
      return this.adapter
    },
    async loadOriginal(dataURL: string, name: string) {
      const { width, height } = await this.requireAdapter().loadImage(dataURL, name)
      this.originalImage = { dataURL, source: { name, width, height } }
      this.operations = []
      this.undoStack = []
      this.redoStack = []
      this.viewingOriginal = false
    },
    commit() {
      this.undoStack.push(this.operations.map((o) => ({ ...o })))
      this.redoStack = []
    },
    async rebuildPreview() {
      const adapter = this.requireAdapter()
      const orig = this.originalImage
      if (!orig) return
      await adapter.loadImage(orig.dataURL, orig.source.name)
      await replay(this.operations, adapter)
    },
    setAdjust(name: AdjustName, value: number) {
      this.commit()
      const existing = this.operations.find((o) => o.type === 'adjust' && o.name === name)
      if (existing && existing.type === 'adjust') existing.value = value
      else this.operations.push(makeAdjust(name, value))
      void this.requireAdapter().applyFilter(name, { [name]: value })
    },
    async addOperation(op: Operation) {
      this.commit()
      this.operations.push(op)
      await replay([op], this.requireAdapter())
    },
    async toggleFilter(name: FilterName, options?: Record<string, unknown>) {
      const idx = this.operations.findIndex((o) => o.type === 'filter' && o.name === name)
      if (idx >= 0) {
        this.commit()
        this.operations.splice(idx, 1)
        await this.requireAdapter().removeFilter(name)
      } else {
        const { filter } = await import('../editor/operations')
        await this.addOperation(filter(name, options))
      }
    },
    async reset() {
      this.commit()
      this.operations = []
      this.viewingOriginal = false
      await this.rebuildPreview()
    },
    async viewOriginal(on: boolean) {
      this.viewingOriginal = on
      const adapter = this.requireAdapter()
      const orig = this.originalImage
      if (!orig) return
      if (on) await adapter.loadImage(orig.dataURL, orig.source.name)
      else await this.rebuildPreview()
    },
    async undo() {
      const prev = this.undoStack.pop()
      if (!prev) return
      this.redoStack.push(this.operations.map((o) => ({ ...o })))
      this.operations = prev
      await this.rebuildPreview()
    },
    async redo() {
      const next = this.redoStack.pop()
      if (!next) return
      this.undoStack.push(this.operations.map((o) => ({ ...o })))
      this.operations = next
      await this.rebuildPreview()
    },
    exportJSON(): string {
      if (!this.originalImage) throw new Error('No image loaded')
      return serialize(this.originalImage.source, this.operations)
    },
    async importJSON(json: string) {
      const doc = deserialize(json)
      this.operations = doc.operations
      this.undoStack = []
      this.redoStack = []
      this.viewingOriginal = false
      await this.rebuildPreview()
    },
  },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/stores/editor.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/stores/editor.ts tests/stores/editor.test.ts
git commit -m "feat: editor store with ops, undo/redo, reset, view-original, JSON"
```

---

## Task 7: Toast UI adapter (real engine)

**Files:**
- Create: `src/editor/toastAdapter.ts`
- Create: `src/types/tui-image-editor.d.ts`
- Test: none automated (jsdom lacks canvas). Verified in-browser via Task 8 wiring.

**Interfaces:**
- Consumes: `ImageAdapter`, `ExportOptions`, `LoadResult` from `adapter.types.ts`; `CropRect` from `operations.ts`.
- Produces: `createToastAdapter(el: HTMLElement): ImageAdapter`.

**Note on filter names:** `tui-image-editor`'s `applyFilter(type, options)` capitalizes `type` and delegates to `fabric.Image.filters[Type]`. Our op names map to TUI/fabric types like so — the adapter owns this mapping:
`brightness→Brightness{brightness}`, `contrast→Contrast{contrast}`, `saturation→Saturation{saturation}`, `grayscale→Grayscale`, `sepia→Sepia`, `sepia2→Sepia2`, `invert→Invert`, `blur→Blur{blur}`, `sharpen→Sharpen`, `emboss→Emboss`, `noise→Noise{noise}`, `pixelate→Pixelate{blocksize}`, `removeColor→removeColor{color,distance}`, `tint→Tint{color,opacity}`, `multiply→Multiply{color}`, `blend→Blend{color}`, `colorFilter→ColorFilter{X,Y}`.

- [ ] **Step 1: Add the type shim**

Create `src/types/tui-image-editor.d.ts`:
```ts
declare module 'tui-image-editor' {
  interface Options {
    cssMaxWidth?: number
    cssMaxHeight?: number
    usageStatistics?: boolean
    selectionStyle?: Record<string, unknown>
  }
  export default class ImageEditor {
    constructor(el: HTMLElement, options?: Options)
    loadImageFromURL(url: string, name: string): Promise<{ newWidth: number; newHeight: number }>
    applyFilter(type: string, options?: Record<string, unknown>): Promise<unknown>
    removeFilter(type: string): Promise<unknown>
    startDrawingMode(mode: string, options?: Record<string, unknown>): void
    stopDrawingMode(): void
    getCropzoneRect(): { left: number; top: number; width: number; height: number }
    crop(rect: { left: number; top: number; width: number; height: number }): Promise<unknown>
    flipX(): Promise<unknown>
    flipY(): Promise<unknown>
    rotate(angle: number): Promise<unknown>
    addText(text: string, options?: Record<string, unknown>): Promise<{ id: number }>
    addShape(type: string, options?: Record<string, unknown>): Promise<{ id: number }>
    addIcon(type: string, options?: Record<string, unknown>): Promise<{ id: number }>
    setBrush(options: Record<string, unknown>): void
    applyFilter(type: string, options?: Record<string, unknown>): Promise<unknown>
    toDataURL(options?: { format?: string; quality?: number }): string
    clearObjects(): Promise<unknown>
    destroy(): void
    loadImageFromFile(file: File): Promise<{ newWidth: number; newHeight: number }>
  }
}
```

- [ ] **Step 2: Implement the adapter**

Create `src/editor/toastAdapter.ts`:
```ts
import 'tui-image-editor/dist/tui-image-editor.css'
import ImageEditor from 'tui-image-editor'
import type { ImageAdapter, ExportOptions, LoadResult } from './adapter.types'
import type { CropRect } from './operations'

const FILTER_TYPE: Record<string, string> = {
  brightness: 'Brightness', contrast: 'Contrast', saturation: 'Saturation',
  grayscale: 'Grayscale', sepia: 'Sepia', sepia2: 'Sepia2', invert: 'Invert',
  blur: 'Blur', sharpen: 'Sharpen', emboss: 'Emboss', noise: 'Noise',
  pixelate: 'Pixelate', removeColor: 'removeColor', tint: 'Tint',
  multiply: 'Multiply', blend: 'Blend', colorFilter: 'colorFilter',
}

export function createToastAdapter(el: HTMLElement): ImageAdapter {
  const editor = new ImageEditor(el, {
    cssMaxWidth: 900,
    cssMaxHeight: 640,
    usageStatistics: false,
    selectionStyle: { cornerSize: 20, rotatingPointOffset: 70 },
  })
  const tuiType = (name: string) => FILTER_TYPE[name] ?? name

  return {
    async loadImage(dataURL: string, name: string): Promise<LoadResult> {
      const { newWidth, newHeight } = await editor.loadImageFromURL(dataURL, name)
      return { width: newWidth, height: newHeight }
    },
    async applyFilter(name, options) { await editor.applyFilter(tuiType(name), options ?? {}) },
    async removeFilter(name) { await editor.removeFilter(tuiType(name)) },
    async crop(rect: CropRect) {
      await editor.crop(rect)
      editor.stopDrawingMode()
    },
    startCrop() { editor.startDrawingMode('CROPPER') },
    cancelCrop() { editor.stopDrawingMode() },
    getCropRect(): CropRect { return editor.getCropzoneRect() },
    async flip(axis) { axis === 'x' ? await editor.flipX() : await editor.flipY() },
    async rotate(degrees) { await editor.rotate(degrees) },
    async addObject(type, props) {
      if (type === 'text') { const { id } = await editor.addText(String(props.text ?? 'Text'), props); return String(id) }
      if (type === 'icon') { const { id } = await editor.addIcon(String(props.icon ?? 'icon-star'), props); return String(id) }
      if (type === 'shape') { const { id } = await editor.addShape(String(props.shape ?? 'rect'), props); return String(id) }
      editor.startDrawingMode('FREE_DRAWING', props); return 'free-drawing'
    },
    async applyMask(props) {
      const { id } = await editor.addShape('rect', { ...props, fill: 'rgba(0,0,0,0.5)' })
      void id
    },
    async clearObjectsAndFilters() { await editor.clearObjects() },
    toDataURL(opts?: ExportOptions): string {
      return editor.toDataURL({ format: opts?.format ?? 'png', quality: opts?.quality ?? 1 })
    },
  }
}
```

- [ ] **Step 3: Verify it builds**

Run: `npx vue-tsc --noEmit`
Expected: no type errors in `toastAdapter.ts` / `adapter.types.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/editor/toastAdapter.ts src/types/tui-image-editor.d.ts
git commit -m "feat: Toast UI adapter implementing ImageAdapter"
```

*(In-browser verification of real filter/crop behavior happens in Task 8.)*

---

## Task 8: EditorCanvas component + adapter wiring

**Files:**
- Create: `src/components/EditorCanvas.vue`
- Modify: `src/App.vue`
- Test: `tests/components/EditorCanvas.test.ts`

**Interfaces:**
- Consumes: `useEditorStore`, `createToastAdapter`.
- Produces: an `EditorCanvas` that on mount creates the real adapter from its root `<div>` and calls `store.setAdapter(...)`. In tests, the component accepts an injected adapter via prop `adapterFactory` to avoid constructing Toast UI in jsdom.

- [ ] **Step 1: Write the failing test**

Create `tests/components/EditorCanvas.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import EditorCanvas from '../../src/components/EditorCanvas.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

describe('EditorCanvas', () => {
  it('registers an adapter with the store on mount', () => {
    setActivePinia(createPinia())
    const adapter = new MockAdapter()
    mount(EditorCanvas, {
      global: { plugins: [createVuetify()] },
      props: { adapterFactory: () => adapter },
    })
    expect(useEditorStore().adapter).toBe(adapter)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/EditorCanvas.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/components/EditorCanvas.vue`:
```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { createToastAdapter } from '../editor/toastAdapter'
import type { ImageAdapter } from '../editor/adapter.types'

const props = defineProps<{ adapterFactory?: (el: HTMLElement) => ImageAdapter }>()
const host = ref<HTMLDivElement | null>(null)
const store = useEditorStore()

onMounted(() => {
  const factory = props.adapterFactory ?? createToastAdapter
  if (host.value) store.setAdapter(factory(host.value))
})

onBeforeUnmount(() => {
  store.setAdapter(null as unknown as ImageAdapter)
})
</script>

<template>
  <div class="editor-canvas">
    <div ref="host" class="tui-host" />
    <div v-if="!store.hasImage" class="placeholder text-medium-emphasis">
      Upload an image to begin
    </div>
  </div>
</template>

<style scoped>
.editor-canvas { position: relative; min-height: 640px; width: 100%; }
.tui-host { width: 100%; height: 640px; }
.placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/EditorCanvas.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 5: Mount it in App and verify in-browser**

Modify `src/App.vue` template to render `<EditorCanvas />` (import it), then:

Run: `npm run dev`, open the app, and via a temporary file input (added in Task 9) confirm an image loads onto the Toast UI canvas. *(Full flow verified in Task 9.)*

- [ ] **Step 6: Commit**

```bash
git add src/components/EditorCanvas.vue src/App.vue tests/components/EditorCanvas.test.ts
git commit -m "feat: EditorCanvas wires Toast UI adapter into the store"
```

---

## Task 9: Toolbar — upload, view-original, reset, undo/redo

**Files:**
- Create: `src/components/Toolbar.vue`
- Modify: `src/App.vue`
- Test: `tests/components/Toolbar.test.ts`

**Interfaces:**
- Consumes: `useEditorStore` (`loadOriginal`, `reset`, `viewOriginal`, `undo`, `redo`, `canUndo`, `canRedo`, `hasImage`).
- Produces: a Vuetify `v-toolbar` with `v-file-input` (upload), and buttons for undo/redo, view-original (toggle), reset (with confirm dialog). Reads a `File` → dataURL via `FileReader` → `store.loadOriginal`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/Toolbar.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import Toolbar from '../../src/components/Toolbar.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function mountToolbar() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  const wrapper = mount(Toolbar, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('Toolbar', () => {
  it('reads a file and loads it as the original', async () => {
    const { store, wrapper } = mountToolbar()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await (wrapper.vm as unknown as { onFile: (f: File | File[] | null) => Promise<void> }).onFile(file)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('view-original toggle calls store.viewOriginal', async () => {
    const { store, wrapper } = mountToolbar()
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'viewOriginal')
    await (wrapper.vm as unknown as { onViewOriginal: (v: boolean) => Promise<void> }).onViewOriginal(true)
    expect(spy).toHaveBeenCalledWith(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/Toolbar.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/components/Toolbar.vue`:
```vue
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/Toolbar.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Wire into App and verify upload in-browser**

Modify `src/App.vue` to render `<Toolbar />` above `<EditorCanvas />`.
Run: `npm run dev`, upload a JPG/PNG. Expected: image appears on the Toast UI canvas; the "Upload an image" placeholder disappears.

- [ ] **Step 6: Commit**

```bash
git add src/components/Toolbar.vue src/App.vue tests/components/Toolbar.test.ts
git commit -m "feat: toolbar with upload, view-original, reset, undo/redo"
```

---

## Task 10: AdjustPanel — live brightness/contrast/saturation

**Files:**
- Create: `src/components/panels/AdjustPanel.vue`
- Test: `tests/components/AdjustPanel.test.ts`

**Interfaces:**
- Consumes: `useEditorStore` (`setAdjust`, `operations`, `hasImage`).
- Produces: three `v-slider`s (range −1…1, step 0.01) whose `@update:model-value` calls `store.setAdjust(name, value)` for live preview.

- [ ] **Step 1: Write the failing test**

Create `tests/components/AdjustPanel.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import AdjustPanel from '../../src/components/panels/AdjustPanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

describe('AdjustPanel', () => {
  it('slider changes call setAdjust with the channel name', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'setAdjust')
    const wrapper = mount(AdjustPanel, { global: { plugins: [createVuetify()] } })
    ;(wrapper.vm as unknown as { onChange: (n: 'brightness', v: number) => void }).onChange('brightness', 0.4)
    expect(spy).toHaveBeenCalledWith('brightness', 0.4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/AdjustPanel.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/components/panels/AdjustPanel.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import type { AdjustName } from '../../editor/operations'

const store = useEditorStore()
const channels: { name: AdjustName; label: string; icon: string }[] = [
  { name: 'brightness', label: 'Brightness', icon: 'mdi-brightness-6' },
  { name: 'contrast', label: 'Contrast', icon: 'mdi-contrast-circle' },
  { name: 'saturation', label: 'Saturation', icon: 'mdi-palette' },
]

function valueOf(name: AdjustName): number {
  const op = store.operations.find((o) => o.type === 'adjust' && o.name === name)
  return op && op.type === 'adjust' ? op.value : 0
}

function onChange(name: AdjustName, value: number) {
  store.setAdjust(name, value)
}

const disabled = computed(() => !store.hasImage)
defineExpose({ onChange })
</script>

<template>
  <v-card flat>
    <v-card-title class="text-subtitle-1">Adjust</v-card-title>
    <v-card-text>
      <div v-for="c in channels" :key="c.name" class="mb-2">
        <v-slider
          :model-value="valueOf(c.name)"
          :label="c.label"
          :prepend-icon="c.icon"
          :min="-1" :max="1" :step="0.01"
          :disabled="disabled"
          hide-details
          thumb-label
          @update:model-value="(v: number) => onChange(c.name, v)"
        />
      </div>
    </v-card-text>
  </v-card>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/AdjustPanel.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 5: Verify live preview in-browser**

Add `<AdjustPanel />` to the App layout (Task 14 finalizes layout). Run `npm run dev`, upload an image, drag brightness — the canvas updates in real time.

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/AdjustPanel.vue tests/components/AdjustPanel.test.ts
git commit -m "feat: live adjust sliders (brightness/contrast/saturation)"
```

---

## Task 11: TransformPanel — crop, flip, rotate

**Files:**
- Create: `src/components/panels/TransformPanel.vue`
- Test: `tests/components/TransformPanel.test.ts`

**Interfaces:**
- Consumes: `useEditorStore`; adapter methods `startCrop`/`getCropRect`/`cancelCrop`; op factories `crop`, `flip`, `rotate`; `store.addOperation`.
- Produces: buttons — "Start crop" (calls `adapter.startCrop()`), "Apply crop" (reads `adapter.getCropRect()` → `store.addOperation(crop(rect))`), "Cancel", flip-X, flip-Y, rotate −90 / +90.

- [ ] **Step 1: Write the failing test**

Create `tests/components/TransformPanel.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import TransformPanel from '../../src/components/panels/TransformPanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

async function setup() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  await store.loadOriginal('data:x', 'p.png')
  const wrapper = mount(TransformPanel, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('TransformPanel', () => {
  it('apply crop pushes a crop op from the adapter rect', async () => {
    const { store, wrapper } = await setup()
    ;(wrapper.vm as unknown as { applyCrop: () => Promise<void> }).applyCrop && await (wrapper.vm as any).applyCrop()
    expect(store.operations.some((o) => o.type === 'crop')).toBe(true)
  })

  it('rotate pushes a rotate op', async () => {
    const { store, wrapper } = await setup()
    const spy = vi.spyOn(store, 'addOperation')
    await (wrapper.vm as any).rotate(90)
    expect(spy).toHaveBeenCalled()
    expect(store.operations.some((o) => o.type === 'rotate')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/TransformPanel.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/components/panels/TransformPanel.vue`:
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
  const rect = store.requireAdapter().getCropRect()
  await store.addOperation(makeCrop(rect))
  cropping.value = false
}
function cancelCrop() {
  store.requireAdapter().cancelCrop()
  cropping.value = false
}
async function flip(axis: 'x' | 'y') {
  await store.addOperation(makeFlip(axis))
  await store.requireAdapter().flip(axis)
}
async function rotate(degrees: number) {
  await store.addOperation(makeRotate(degrees))
}

defineExpose({ startCrop, applyCrop, cancelCrop, flip, rotate })
</script>

<template>
  <v-card flat>
    <v-card-title class="text-subtitle-1">Transform</v-card-title>
    <v-card-text class="d-flex flex-wrap ga-2">
      <template v-if="!cropping">
        <v-btn size="small" prepend-icon="mdi-crop" :disabled="!store.hasImage" @click="startCrop">Crop</v-btn>
      </template>
      <template v-else>
        <v-btn size="small" color="primary" @click="applyCrop">Apply</v-btn>
        <v-btn size="small" variant="text" @click="cancelCrop">Cancel</v-btn>
      </template>
      <v-btn size="small" icon="mdi-flip-horizontal" :disabled="!store.hasImage" @click="flip('x')" />
      <v-btn size="small" icon="mdi-flip-vertical" :disabled="!store.hasImage" @click="flip('y')" />
      <v-btn size="small" icon="mdi-rotate-left" :disabled="!store.hasImage" @click="rotate(-90)" />
      <v-btn size="small" icon="mdi-rotate-right" :disabled="!store.hasImage" @click="rotate(90)" />
    </v-card-text>
  </v-card>
</template>
```

Note: `flip` records the op AND calls the adapter because `addOperation` also replays it; to avoid double flip, `addOperation` already replays via `replay([op])`. Remove the extra `store.requireAdapter().flip(axis)` call — the `defineExpose` version above keeps only `store.addOperation`. Corrected handler:
```ts
async function flip(axis: 'x' | 'y') {
  await store.addOperation(makeFlip(axis))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/TransformPanel.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Verify crop in-browser**

Run `npm run dev`, upload, click Crop → drag cropzone → Apply. Expected: image cropped; a `crop` op recorded (visible via export in Task 15).

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/TransformPanel.vue tests/components/TransformPanel.test.ts
git commit -m "feat: transform panel (crop/flip/rotate)"
```

---

## Task 12: FilterPanel — full filter catalog

**Files:**
- Create: `src/editor/filters.ts`
- Create: `src/components/panels/FilterPanel.vue`
- Test: `tests/editor/filters.test.ts`, `tests/components/FilterPanel.test.ts`

**Interfaces:**
- Consumes: `FilterName` from `operations.ts`; `useEditorStore` (`toggleFilter`, `operations`, `hasImage`).
- Produces:
  - `filters.ts`: `interface FilterDef { name: FilterName; label: string; toggle: boolean; defaults?: Record<string, unknown> }` and `const FILTERS: FilterDef[]` covering the full set (grayscale, sepia, sepia2, invert, blur, sharpen, emboss, noise, pixelate, removeColor, tint, multiply, blend, colorFilter).
  - `FilterPanel.vue`: a chip/switch per filter; toggling calls `store.toggleFilter(name, defaults)`.

- [ ] **Step 1: Write the failing test for the catalog**

Create `tests/editor/filters.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { FILTERS } from '../../src/editor/filters'

describe('filter catalog', () => {
  it('includes the core bonus filters', () => {
    const names = FILTERS.map((f) => f.name)
    expect(names).toEqual(expect.arrayContaining(['grayscale', 'sepia', 'invert', 'blur']))
  })
  it('every entry has a label and name', () => {
    for (const f of FILTERS) {
      expect(typeof f.name).toBe('string')
      expect(f.label.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/filters.test.ts`
Expected: FAIL — cannot resolve `filters`.

- [ ] **Step 3: Implement the catalog**

Create `src/editor/filters.ts`:
```ts
import type { FilterName } from './operations'

export interface FilterDef {
  name: FilterName
  label: string
  toggle: boolean
  defaults?: Record<string, unknown>
}

export const FILTERS: FilterDef[] = [
  { name: 'grayscale', label: 'Greyscale', toggle: true },
  { name: 'sepia', label: 'Sepia', toggle: true },
  { name: 'sepia2', label: 'Sepia 2', toggle: true },
  { name: 'invert', label: 'Invert', toggle: true },
  { name: 'blur', label: 'Blur', toggle: true, defaults: { blur: 0.2 } },
  { name: 'sharpen', label: 'Sharpen', toggle: true },
  { name: 'emboss', label: 'Emboss', toggle: true },
  { name: 'noise', label: 'Noise', toggle: true, defaults: { noise: 100 } },
  { name: 'pixelate', label: 'Pixelate', toggle: true, defaults: { blocksize: 8 } },
  { name: 'removeColor', label: 'Remove White', toggle: true, defaults: { color: '#FFFFFF', distance: 0.2 } },
  { name: 'tint', label: 'Tint', toggle: true, defaults: { color: '#03A9F4', opacity: 0.5 } },
  { name: 'multiply', label: 'Multiply', toggle: true, defaults: { color: '#FFB300' } },
  { name: 'blend', label: 'Blend', toggle: true, defaults: { color: '#00FF00' } },
  { name: 'colorFilter', label: 'Color Filter', toggle: true, defaults: { threshold: 45 } },
]
```

- [ ] **Step 4: Run catalog test**

Run: `npx vitest run tests/editor/filters.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write the failing component test**

Create `tests/components/FilterPanel.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import FilterPanel from '../../src/components/panels/FilterPanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

describe('FilterPanel', () => {
  it('toggling a filter calls store.toggleFilter with defaults', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'toggleFilter')
    const wrapper = mount(FilterPanel, { global: { plugins: [createVuetify()] } })
    await (wrapper.vm as any).toggle({ name: 'blur', label: 'Blur', toggle: true, defaults: { blur: 0.2 } })
    expect(spy).toHaveBeenCalledWith('blur', { blur: 0.2 })
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/components/FilterPanel.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 7: Implement the panel**

Create `src/components/panels/FilterPanel.vue`:
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
  <v-card flat>
    <v-card-title class="text-subtitle-1">Filters</v-card-title>
    <v-card-text class="d-flex flex-wrap ga-2">
      <v-chip
        v-for="f in FILTERS"
        :key="f.name"
        :color="isActive(f.name) ? 'primary' : undefined"
        :variant="isActive(f.name) ? 'flat' : 'outlined'"
        :disabled="!store.hasImage"
        filter
        :model-value="isActive(f.name)"
        @click="toggle(f)"
      >
        {{ f.label }}
      </v-chip>
    </v-card-text>
  </v-card>
</template>
```

- [ ] **Step 8: Run component test**

Run: `npx vitest run tests/components/FilterPanel.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 9: Verify filters in-browser**

Run `npm run dev`, upload, toggle Greyscale/Sepia/Blur. Expected: filter visibly applies and clears on re-toggle.

- [ ] **Step 10: Commit**

```bash
git add src/editor/filters.ts src/components/panels/FilterPanel.vue tests/editor/filters.test.ts tests/components/FilterPanel.test.ts
git commit -m "feat: filter catalog and filter panel (full set)"
```

---

## Task 13: AnnotatePanel — draw, shape, text, icon, mask

**Files:**
- Create: `src/components/panels/AnnotatePanel.vue`
- Test: `tests/components/AnnotatePanel.test.ts`

**Interfaces:**
- Consumes: `useEditorStore`; `annotation` factory; `store.addOperation`.
- Produces: buttons that push annotation ops — Add Text, Add Rect/Circle/Triangle, Add Icon (star/arrow/heart), Free Draw (toggle), Mask region. Each calls `store.addOperation(annotation(type, props))`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/AnnotatePanel.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import AnnotatePanel from '../../src/components/panels/AnnotatePanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

async function setup() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  await store.loadOriginal('data:x', 'p.png')
  const wrapper = mount(AnnotatePanel, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('AnnotatePanel', () => {
  it('add text pushes a text annotation op', async () => {
    const { store, wrapper } = await setup()
    await (wrapper.vm as any).addText()
    expect(store.operations.some((o) => o.type === 'text')).toBe(true)
  })
  it('add shape pushes a shape annotation op', async () => {
    const { store, wrapper } = await setup()
    await (wrapper.vm as any).addShape('rect')
    expect(store.operations.some((o) => o.type === 'shape')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/AnnotatePanel.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/components/panels/AnnotatePanel.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { annotation } from '../../editor/operations'

const store = useEditorStore()
const text = ref('Sample')
const color = ref('#FF5252')
const drawing = ref(false)

async function addText() {
  await store.addOperation(annotation('text', { text: text.value, styles: { fill: color.value, fontSize: 48 } }))
}
async function addShape(shape: 'rect' | 'circle' | 'triangle') {
  await store.addOperation(annotation('shape', { shape, fill: color.value, width: 120, height: 120, left: 100, top: 100 }))
}
async function addIcon(icon: string) {
  await store.addOperation(annotation('icon', { icon, fill: color.value, left: 100, top: 100 }))
}
async function toggleDraw() {
  drawing.value = !drawing.value
  if (drawing.value) await store.addOperation(annotation('draw', { color: color.value, width: 6 }))
  else store.requireAdapter().cancelCrop() // stopDrawingMode is exposed via cancelCrop path
}
async function addMask() {
  await store.addOperation(annotation('mask', { left: 120, top: 120, width: 160, height: 160 }))
}
defineExpose({ addText, addShape, addIcon, toggleDraw, addMask })
</script>

<template>
  <v-card flat>
    <v-card-title class="text-subtitle-1">Annotate</v-card-title>
    <v-card-text class="d-flex flex-column ga-2">
      <div class="d-flex align-center ga-2">
        <v-text-field v-model="text" density="compact" hide-details label="Text" style="max-width: 160px" />
        <input type="color" v-model="color" aria-label="color" />
      </div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn size="small" :disabled="!store.hasImage" @click="addText">Text</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addShape('rect')">Rect</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addShape('circle')">Circle</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addShape('triangle')">Triangle</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addIcon('icon-star')">Star</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addIcon('icon-arrow')">Arrow</v-btn>
        <v-btn size="small" :color="drawing ? 'primary' : undefined" :disabled="!store.hasImage" @click="toggleDraw">Draw</v-btn>
        <v-btn size="small" :disabled="!store.hasImage" @click="addMask">Mask</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/AnnotatePanel.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Verify annotations in-browser**

Run `npm run dev`, upload, add text/shape/icon/draw. Expected: objects appear on canvas.

- [ ] **Step 6: Commit**

```bash
git add src/components/panels/AnnotatePanel.vue tests/components/AnnotatePanel.test.ts
git commit -m "feat: annotate panel (text/shape/icon/draw/mask)"
```

---

## Task 14: App layout assembly

**Files:**
- Modify: `src/App.vue`
- Test: `tests/components/App.test.ts`

**Interfaces:**
- Consumes: `Toolbar`, `EditorCanvas`, and the four panels.
- Produces: a Vuetify layout — toolbar on top, canvas center, panels in a right-hand `v-navigation-drawer` (via `v-expansion-panels`).

- [ ] **Step 1: Write the failing test**

Create `tests/components/App.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import App from '../../src/App.vue'

describe('App', () => {
  it('renders the toolbar and panels', () => {
    setActivePinia(createPinia())
    const wrapper = mount(App, { global: { plugins: [createVuetify()], stubs: { EditorCanvas: true } } })
    expect(wrapper.text()).toContain('Adjust')
    expect(wrapper.text()).toContain('Filters')
    expect(wrapper.text()).toContain('Transform')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/App.test.ts`
Expected: FAIL — App does not yet contain panels.

- [ ] **Step 3: Implement the layout**

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
</script>

<template>
  <v-app>
    <v-app-bar color="surface" flat>
      <v-app-bar-title>Picturio</v-app-bar-title>
      <ExportMenu />
    </v-app-bar>
    <v-main>
      <Toolbar />
      <v-container fluid>
        <v-row>
          <v-col cols="12" md="8">
            <EditorCanvas />
          </v-col>
          <v-col cols="12" md="4">
            <v-expansion-panels multiple :model-value="[0, 1, 2, 3]">
              <v-expansion-panel title="Transform"><template #text><TransformPanel /></template></v-expansion-panel>
              <v-expansion-panel title="Adjust"><template #text><AdjustPanel /></template></v-expansion-panel>
              <v-expansion-panel title="Filters"><template #text><FilterPanel /></template></v-expansion-panel>
              <v-expansion-panel title="Annotate"><template #text><AnnotatePanel /></template></v-expansion-panel>
            </v-expansion-panels>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>
```

*(ExportMenu is created in Task 15; if executing strictly in order, temporarily comment its import/usage until Task 15, then restore.)*

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/App.test.ts`
Expected: PASS (panel titles render even if expansion body is virtualized — assertion targets titles).

- [ ] **Step 5: Commit**

```bash
git add src/App.vue tests/components/App.test.ts
git commit -m "feat: assemble app layout with panels"
```

---

## Task 15: Export & import (image + ops JSON + zip)

**Files:**
- Create: `src/editor/download.ts`
- Create: `src/components/ExportMenu.vue`
- Test: `tests/editor/download.test.ts`, `tests/components/ExportMenu.test.ts`

**Interfaces:**
- Consumes: `useEditorStore` (`exportJSON`, `importJSON`, `requireAdapter().toDataURL`, `originalImage`, `hasImage`); `jszip`.
- Produces:
  - `download.ts`:
    `dataURLToBlob(dataURL: string): Blob`,
    `triggerDownload(blob: Blob, filename: string): void`,
    `baseName(name: string): string` (strips extension),
    `buildBundle(imageBlob: Blob, jsonText: string, base: string): Promise<Blob>` (zip via jszip).
  - `ExportMenu.vue`: a menu with "Download PNG", "Download JPEG", "Download operations JSON", "Download bundle (.zip)", and "Import operations JSON" (file input → `store.importJSON`).

- [ ] **Step 1: Write the failing test**

Create `tests/editor/download.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { dataURLToBlob, baseName, buildBundle } from '../../src/editor/download'

describe('download helpers', () => {
  it('baseName strips the extension', () => {
    expect(baseName('cat.photo.png')).toBe('cat.photo')
    expect(baseName('noext')).toBe('noext')
  })

  it('dataURLToBlob decodes a png data url', () => {
    const blob = dataURLToBlob('data:image/png;base64,iVBORw0KGgo=')
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('buildBundle produces a non-empty zip blob', async () => {
    const img = dataURLToBlob('data:image/png;base64,iVBORw0KGgo=')
    const zip = await buildBundle(img, '{"version":1}', 'cat')
    expect(zip.size).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/editor/download.test.ts`
Expected: FAIL — cannot resolve `download`.

- [ ] **Step 3: Implement download helpers**

Create `src/editor/download.ts`:
```ts
import JSZip from 'jszip'

export function dataURLToBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(',')
  const mimeMatch = header.match(/data:([^;]+)/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function baseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export async function buildBundle(imageBlob: Blob, jsonText: string, base: string): Promise<Blob> {
  const ext = imageBlob.type === 'image/jpeg' ? 'jpg' : 'png'
  const zip = new JSZip()
  zip.file(`${base}-edited.${ext}`, imageBlob)
  zip.file(`${base}-edited.ops.json`, jsonText)
  return zip.generateAsync({ type: 'blob' })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/editor/download.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing ExportMenu test**

Create `tests/components/ExportMenu.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import ExportMenu from '../../src/components/ExportMenu.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

describe('ExportMenu', () => {
  it('import reads a file and calls store.importJSON', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'importJSON').mockResolvedValue()
    const wrapper = mount(ExportMenu, { global: { plugins: [createVuetify()] } })
    const file = new File(['{"version":1,"source":{"name":"p.png","width":1,"height":1},"operations":[]}'], 'p.ops.json', { type: 'application/json' })
    await (wrapper.vm as any).onImport(file)
    expect(spy).toHaveBeenCalled()
  })

  it('exportImage triggers a download from the adapter data url', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    const wrapper = mount(ExportMenu, { global: { plugins: [createVuetify()] } })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await (wrapper.vm as any).exportImage('png')
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/components/ExportMenu.test.ts`
Expected: FAIL — cannot resolve component.

- [ ] **Step 7: Implement ExportMenu**

Create `src/components/ExportMenu.vue`:
```vue
<script setup lang="ts">
import { useEditorStore } from '../stores/editor'
import { dataURLToBlob, triggerDownload, baseName, buildBundle } from '../editor/download'

const store = useEditorStore()

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
  const base = baseName(store.originalImage?.source.name ?? 'image')
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  triggerDownload(imageBlob(format), `${base}-edited.${ext}`)
}

async function exportJSON() {
  const base = baseName(store.originalImage?.source.name ?? 'image')
  triggerDownload(new Blob([store.exportJSON()], { type: 'application/json' }), `${base}-edited.ops.json`)
}

async function exportBundle() {
  const base = baseName(store.originalImage?.source.name ?? 'image')
  const zip = await buildBundle(imageBlob('png'), store.exportJSON(), base)
  triggerDownload(zip, `${base}-edited.zip`)
}

async function onImport(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return
  await store.importJSON(await readText(file))
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
  </div>
</template>
```

- [ ] **Step 8: Restore ExportMenu in App**

Ensure `src/App.vue` imports and renders `<ExportMenu />` (uncomment from Task 14 if it was commented).

- [ ] **Step 9: Run component tests**

Run: `npx vitest run tests/components/ExportMenu.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 10: Verify export/import round-trip in-browser**

Run `npm run dev`: upload → adjust + a filter → Download bundle. Unzip: confirm the PNG shows edits and `*.ops.json` lists the ops. Then Reset, Import the JSON — the edited result is reproduced. This demonstrates the op-log reproduces the result (spec §4/§7).

- [ ] **Step 11: Commit**

```bash
git add src/editor/download.ts src/components/ExportMenu.vue tests/editor/download.test.ts tests/components/ExportMenu.test.ts src/App.vue
git commit -m "feat: export image/JSON/zip and import-replay round-trip"
```

---

## Task 16: Full verification + README

**Files:**
- Create: `README.md`
- Test: full suite + manual checklist.

**Interfaces:**
- Consumes: everything.
- Produces: run instructions and the "key decisions / trade-offs / bonus" notes the task asks for.

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: no type errors; `dist/` produced.

- [ ] **Step 3: Manual acceptance checklist (in-browser)**

Run `npm run dev` and confirm each TechTask requirement:
- Upload an image (file input + drag/drop).
- Crop, then flip/rotate.
- Brightness/contrast/saturation live sliders update in real time.
- View original (peek) and Reset both return to the unedited image; edits are non-destructive.
- Export downloads the image.
- Bonus: at least one filter (greyscale/sepia/etc.) works.
- Bonus: operations JSON exports and re-import reproduces the result.

- [ ] **Step 4: Write the README**

Create `README.md` covering: run (`npm i && npm run dev`), the op-model design (ordered ops replayed on the immutable original; JSON shape `{version,source,operations}`), the adapter seam (Toast UI isolated; Vuetify-only UI), non-destructive guarantee = reproducibility mechanism, testing approach, and the bonuses attempted with how operations are modeled.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: README with run steps, op-model, and trade-offs"
```

---

## Self-Review Notes

**Spec coverage:** upload (T9), crop (T11), live B/C/S sliders (T10), reset/view-original/non-destructive (T6+T9), export image (T15), bonus filter (T12), bonus JSON op-log + reproduce (T3+T6+T15), full Toast UI set incl. annotation (T11–T13), headless Toast UI behind adapter (T4/T5/T7), Vuetify-only UI (T8–T15), Pinia store (T6), TS throughout, runs with `npm i && npm run dev` (T1/T16). No gaps.

**Type consistency:** `ImageAdapter` method names are identical across `adapter.types.ts` (T4), `mockAdapter.ts` (T4), `replay.ts` (T5), store (T6), and `toastAdapter.ts` (T7): `loadImage`, `applyFilter`, `removeFilter`, `crop`, `startCrop`, `cancelCrop`, `getCropRect`, `flip`, `rotate`, `addObject`, `applyMask`, `clearObjectsAndFilters`, `toDataURL`. Op union members and factory names (`crop/flip/rotate/adjust/filter/annotation`) are used consistently in T2/T5/T6/T11/T13.

**Placeholder scan:** T11 Step 3 flags-and-corrects a double-apply (documented inline as a correction, not a TODO). T14 notes ExportMenu is introduced in T15 with explicit comment/restore steps. No open TBDs.
