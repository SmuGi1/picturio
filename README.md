# Picturio — Non-destructive Image Editor

A browser-based image editor (Vue 3 + Vuetify 3 + Pinia + TypeScript) built for a
printing-industry context. The emphasis is on **how edits are modeled**: an ordered,
serializable operation log that can be replayed on the original image to reproduce the
result exactly.

## Run

```bash
npm i && npm run dev
```

Then open the printed local URL. Build a production bundle with `npm run build`; run the
test suite with `npm test`.

## What it does

**Requirements (all implemented):**

- Load an image via a dedicated upload screen (click-to-browse or drag-and-drop). Once
  an image is loaded, the full editor (crop, adjust, filters, annotate, export) replaces
  it — the two states keep the first-run experience uncluttered.
- Crop (drag a region, Apply/Cancel).
- Live sliders with real-time preview: **brightness, contrast, saturation**.
- Reset / View original — a way back to the unedited image. Edits are non-destructive.
- Export the result by downloading it (PNG or JPEG).

**Bonus (all implemented):**

- Filters — the full Toast UI set: greyscale, sepia, sepia2, invert, blur, sharpen,
  emboss, noise, pixelate, remove-color, tint, multiply, blend, color-filter.
- Export the operations as JSON alongside the image (individual `.json`, or a `.zip`
  bundle with the image). Importing the JSON replays it on the original and reproduces
  the result. (See "Operation model" below.)
- Extra transforms and annotations: flip, rotate, undo/redo, and a text/shape/icon/
  freehand-draw/mask annotation layer.

## Architecture

```
Vuetify UI (sliders, chips, buttons, dialogs)
        │  user intent
        ▼
Pinia editor store  ──(ordered Operation[])──►  JSON export / import
        │  keeps a live preview in sync
        ▼
ImageAdapter (typed seam)  ── the only implementation ──►  toastAdapter.ts
        │                                                   (wraps tui-image-editor + fabric)
        ▼
   <canvas>  live preview  (a render target, NOT the source of truth)
```

- **Op-log is the source of truth.** The store holds `{ originalImage, operations[] }`.
  The original image is stored once and never mutated.
- **Toast UI is a headless engine behind an adapter.** `toastAdapter.ts` is the *only*
  module that imports `tui-image-editor`/`fabric`. Everything else talks to the small
  `ImageAdapter` interface. This isolates the library, keeps the op-model unit-testable
  against a mock adapter, and would let the engine be swapped without touching the store
  or UI. 100% of the visible UI is Vuetify; Toast UI's own themed UI is never shown.

## Operation model (the part that matters)

Operations are ordered, typed, plain-data (JSON-safe):

```ts
type Operation =
  | { id; type: 'crop';   rect: { left, top, width, height } }
  | { id; type: 'flip';   axis: 'x' | 'y' }
  | { id; type: 'rotate'; degrees }
  | { id; type: 'adjust'; name: 'brightness' | 'contrast' | 'saturation'; value }
  | { id; type: 'filter'; name: FilterName; options? }
  | { id; type: 'text' | 'shape' | 'draw' | 'icon' | 'mask'; props }
```

Exported document shape (`version` makes it forward-compatible):

```json
{ "version": 1, "source": { "name", "width", "height" }, "operations": [ ... ] }
```

- **Live edits** update the op-list and push the change to the adapter for real-time
  preview — sliders update in place (last-write-wins per channel) rather than appending
  an op per drag tick, so one drag gesture is one undo entry.
- **Replay** (`replay(ops, adapter)`) loads the original into a fresh editor and applies
  the ops in recorded order. This single function backs three things: rebuilding the
  preview after undo/redo/reset, and reproducing an imported JSON.

### Non-destructive == reproducible (same mechanism)

Reset, undo/redo, and "import JSON" never "un-apply" pixels — they reload the immutable
original and replay the op-list. So the non-destructive guarantee and the reproducibility
guarantee are literally the same code path. "View original" is a pure visual A/B that
shows the pristine original without touching the op-list.

All adapter mutations are funneled through a small FIFO queue in the store, so a
fire-and-forget live filter can never race a subsequent undo/reset and leave the canvas
out of sync with the op-list.

## Key decisions & trade-offs

- **Op-list authoritative, editor as render target.** Toast UI's `crop()` mutates its
  internal bitmap, so trusting the editor as state would break non-destructiveness. The
  store owns truth; the canvas is derived. Trade-off: the store and editor must be kept
  in sync, handled by the replay path + serialized queue.
- **Headless Toast UI + Vuetify controls** (rather than Toast UI's built-in UI) to satisfy
  "Vuetify styling, Toast UI logic" and to get full control over the op-model and JSON
  shape.
- **Adjust sliders → `beginAdjust` (on drag start) + `previewAdjust` (during drag).** Keeps
  undo history to one entry per gesture while still previewing every frame.
- **Export bundles image + `ops.json` as a `.zip`** to satisfy "operations alongside the
  image," with individual downloads also available. The bundle always archives a lossless
  PNG so the image matches the op-log regardless of a separately exported JPEG.

## Testing & verification

- **Unit/component tests (Vitest, 52 tests):** op factories, JSON serialize/deserialize
  round-trip, replay ordering, the store (immutability, undo/redo, reset, view-original,
  serialized queue), and each panel's behavior against a mock adapter. Pure op-model logic
  is TDD; the canvas engine is mocked (jsdom has no `<canvas>`).
- **Real-browser E2E (headless Chrome, during development):** because Vuetify components
  don't fully resolve under jsdom and canvas pixels can't be inspected there, the full
  stack was verified in a real browser — upload → filter/adjust/crop actually change canvas
  pixels, reset/view-original are non-destructive, PNG + ops-JSON download, and importing
  the JSON reproduces the edited canvas **byte-for-byte**, all with zero console errors.
  (This caught two real bugs a mocked-adapter test structurally cannot: a `v-chip`
  `model-value` quirk that hid all filter chips, and an empty-cropzone crash.)

## Known limitations

- **Freehand draw** records brush settings (color/width) but not the individual mouse
  strokes, so a freehand scribble is not reproducible from the JSON. Shapes, text, icons,
  and masks carry explicit props and *do* reproduce. Capturing raw stroke paths would be
  the next step if freehand reproducibility were required.
- **Single-editor assumption:** the adapter-serialization queue is module-scoped, which is
  correct for one editor instance (the app's design) but would need scoping if multiple
  independent editors were ever mounted.
- The production bundle is a single large chunk (Toast UI + fabric + Vuetify). Fine for
  this exercise; code-splitting/manual chunks would help a latency-sensitive deployment.
