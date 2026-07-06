# Image Editor (Picturio) — Design

**Date:** 2026-07-06
**Status:** Approved
**Source requirements:** `TechTask.txt`

## 1. Purpose

A browser-based, non-destructive image editor built for a printing-industry context.
The emphasis is on **how edits are modeled** — an ordered, serializable operation log
that can be replayed on the original image to reproduce the result — not merely on the
rendered pixels.

## 2. Guiding decisions (approved)

1. **Headless Toast UI + Vuetify controls.** Toast UI Image Editor is instantiated with
   `includeUI: false` and used purely as the fabric.js engine (crop, filters, transforms,
   annotations, rasterization). 100% of the visible UI is Vuetify with low-to-no
   customization. Toast UI's own themed UI is never shown.
2. **Ordered op-list in Pinia is the source of truth.** The original image is stored once
   and never mutated. The preview is derived by applying the op-list. JSON export
   serializes this list.
3. **Full Toast UI feature set.** Everything the library supports is exposed: transform
   (crop, flip, rotate), adjust (brightness, contrast, saturation), filters (greyscale,
   sepia, invert, blur, sharpen, emboss, noise, pixelate, vintage, etc.), and the
   annotation layer (free draw, shapes, text, icons, mask/blur region).

## 3. Architecture

```
Vuetify UI (sliders, buttons, panels, dialogs)
        │ user intent
        ▼
Pinia editor store  ──(ordered Operation[])──►  JSON export / import
        │ syncs preview
        ▼
ToastAdapter  (the ONLY module that imports tui-image-editor / fabric.js)
        │ loadImage / applyFilter / crop / flip / rotate / addText / toDataURL …
        ▼
   <canvas>  live preview (a render target, NOT the source of truth)
```

### The adapter seam

`ToastAdapter` wraps `tui-image-editor` behind a typed interface. Every other module talks
to this interface, never to Toast UI directly. This:

- makes the op-model unit-testable against a mock adapter (jsdom has no `<canvas>`),
- keeps Toast UI swappable,
- keeps the "engine" concern out of the store and components.

## 4. Operation model (core of the task)

Operations are ordered, typed, and serializable. Held in Pinia.

```ts
type Operation =
  | { id: string; type: 'crop';   rect: { left: number; top: number; width: number; height: number } }
  | { id: string; type: 'flip';   axis: 'x' | 'y' }
  | { id: string; type: 'rotate'; degrees: number }
  | { id: string; type: 'adjust'; name: 'brightness' | 'contrast' | 'saturation'; value: number }
  | { id: string; type: 'filter'; name: FilterName; options?: Record<string, unknown> }
  | { id: string; type: 'text' | 'shape' | 'draw' | 'icon' | 'mask'; props: Record<string, unknown> }
```

### Behavior

- **Live sliders.** Dragging an adjust slider updates the matching `adjust` op *in place*
  (last-write-wins per `name`) and calls `adapter.applyFilter` for real-time preview — no
  full pipeline replay per tick. The op is committed to undo history on change-end.
- **Reproducibility.** `replay(ops, adapter)` loads the original into a fresh editor and
  applies ops in recorded order. This is a distinct, tested code path that proves the JSON
  reproduces the result.
- **Ordering.** The list is ordered; replay honors order so results are deterministic.

### Non-destructiveness (see also §7)

The store's `{ originalImage, operations[] }` is authoritative. The editor's internal
bitmap (which Toast UI's `crop()` mutates in place) is treated only as a render target.
Reset and Import-JSON both rebuild the preview from `original + ops` rather than "undoing"
pixels — the same mechanism that guarantees reproducibility.

## 5. Required flows

### 5.1 Upload (Load an image via file upload)

- Vuetify `v-file-input` (`accept="image/*"`) plus a drag-and-drop overlay on the canvas.
- Validate it is an image → read via `FileReader` → dataURL.
- Store the dataURL **once** as immutable `originalImage` (with `name`, `width`, `height`),
  then `adapter.loadImage(dataURL)`.
- Loading a new image clears op-list, undo/redo, and panel state. If edits exist, a Vuetify
  confirm dialog gates the replace.

### 5.2 Crop

- `adapter.startCrop()` shows Toast UI's cropzone on the canvas; user drags a region.
- Apply → read cropzone rect → push a `crop` op and `adapter.crop(rect)`.
- Cancel → discard cropzone, no op.

### 5.3 Adjust — live sliders (brightness, contrast, saturation)

- Three Vuetify `v-slider`s with real-time preview per §4.
- Ranges mapped to Toast UI's expected filter ranges; displayed as user-friendly values.

### 5.4 Reset / View original (see §7)

### 5.5 Export (Export the result by downloading it)

Driven from a Vuetify "Export" menu:

- **Image** — `adapter.toDataURL({ format })` → download. Format: PNG (default) / JPEG (with
  quality slider). Filename derived from the original, e.g. `photo-edited.png`.
- **Operations JSON** — serialize the op-list to
  `{ version, source: { name, width, height }, operations: [...] }` →
  download `photo-edited.ops.json`.
- **Bundle (.zip)** — packages image + ops.json together to satisfy "export operations
  *alongside* the image." Individual downloads also available.
- **Import operations JSON** — re-loads a `.json` onto the current original and replays it,
  demonstrating the op-log reproduces the result (same tested `replay()` path).

## 6. Bonus features

- **Filters** (bonus: "at least one filter") — full Toast UI filter set as `filter` ops:
  greyscale, sepia, sepia2, invert, blur, sharpen, emboss, grayscale, noise, pixelate,
  vintage, removeColor, colorFilter, tint, multiply, blend, etc. Toggles or parameterized
  Vuetify controls per filter.
- **JSON op-log** (bonus: "export the operations as JSON") — see §5.5. Shape is documented
  and versioned; replay reproduces the result on the original.

## 7. Reset / View original / Non-destructive (required, emphasized)

The uploaded image is stored once as an immutable `originalImage` dataURL and is never
written to. Everything shown is derived by applying the op-list.

- **View original (non-destructive peek).** A hold-to-compare / toggle button. While active,
  the adapter shows the pristine `originalImage`; releasing returns to the edited preview.
  The op-list is untouched — a pure visual A/B.
- **Reset.** Clears op-list, undo/redo history, and panel values, then reloads
  `originalImage`. One-click return to the unedited image, gated by a confirm dialog.
- **Undo / Redo.** Steps through committed ops for finer-grained "way back."

The non-destructive guarantee and the reproducibility guarantee share one mechanism
(`original + ops → replay`), and are tested together.

## 8. Stack & structure

**Stack:** Vite + Vue 3 + TypeScript + Vuetify 3 + Pinia + `tui-image-editor` + `fabric`.
Runs with `npm i && npm run dev`.

```
src/
  main.ts
  App.vue
  plugins/vuetify.ts
  stores/
    editor.ts            # originalImage, operations[], undo/redo, actions
  editor/
    operations.ts        # Operation types + factory functions
    serialize.ts         # to/from JSON (versioned)
    replay.ts            # apply ops in order to an adapter
    toastAdapter.ts      # wraps tui-image-editor; the only Toast UI import
    adapter.types.ts     # ToastAdapter interface + capability types
  components/
    EditorCanvas.vue     # hosts the headless Toast UI canvas
    Toolbar.vue          # upload, undo/redo, view-original, reset, export
    panels/
      TransformPanel.vue # crop, flip, rotate
      AdjustPanel.vue    # brightness/contrast/saturation sliders
      FilterPanel.vue    # filter toggles/params
      AnnotatePanel.vue  # draw, shape, text, icon, mask
  types/
    tui-image-editor.d.ts  # type shim if upstream types are insufficient
```

## 9. Testing strategy (TDD)

TDD is focused where it has the most value and is deterministic — the op-model — with the
canvas engine mocked (jsdom has no `<canvas>`).

**Unit (Vitest), test-first:**

- `operations.ts` — factory functions produce correct typed ops.
- `serialize.ts` — round-trip: `deserialize(serialize(ops)) === ops`; version handling;
  rejects malformed JSON.
- `replay.ts` — replaying an op-list issues the correct ordered adapter calls (mock adapter);
  reproduces the recorded result.
- `stores/editor.ts` — upload sets immutable original; adjust updates in place; crop/filter
  push ops; reset clears; undo/redo; view-original does not mutate ops; guard on replace.

**Component (Vitest + @vue/test-utils), adapter mocked:**

- Panels emit the right store actions; sliders drive live-preview calls; export triggers the
  right downloads; confirm dialogs gate destructive actions.

## 10. Out of scope / assumptions

- No backend or auth; fully client-side.
- Export bundles image + ops.json as a `.zip` (with individual downloads available).
- Vercel deploy config is available but optional; not part of core delivery.
- `npm i && npm run dev` is the only required run path.
