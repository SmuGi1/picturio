# Two-State Editor UX — Design

**Date:** 2026-07-07
**Status:** Approved
**Source requirements:** `TechTask.txt`, follow-up UX request, current implementation (v1)

## 1. Purpose

Today the app always renders the full editor chrome (toolbar, four expansion panels,
canvas) even before an image is loaded — every control sits there disabled/greyed out,
and the only way in is a small file input buried at the top-left of the toolbar. This is
not a good first impression and doesn't read as "upload an image to start."

This design splits the app into two explicit states:

1. **Upload state** — a clean, single-purpose screen whose only job is getting an image
   into the app.
2. **Editor state** — the existing v1 layout (toolbar, canvas, Transform/Adjust/Filters/
   Annotate panels, export), unchanged in behavior.

No changes to the operation model, Pinia store, non-destructive editing pipeline, or
export/JSON replay — this is a presentational restructure plus one new component.

## 2. State switch

`App.vue` picks the view based on `store.hasImage` (already exists as a getter):

```
v-app
  v-app-bar: "Picturio" title, ExportMenu (only when store.hasImage)
  v-main
    UploadScreen      (v-if !store.hasImage)
    editor layout     (v-else) — Toolbar + EditorCanvas + expansion panels, as today
```

The app bar persists across both states for branding continuity. `ExportMenu` only
renders in the editor state — there's nothing to export before an image exists, so it
disappears entirely rather than showing disabled.

## 3. UploadScreen (new component)

`src/components/UploadScreen.vue` — centered, full-height content:

- A large dashed-border `v-card` dropzone (icon + "Drag an image here, or click to
  browse" text + a `v-btn` "Browse files").
- Click anywhere on the card or the button opens the native file picker (hidden
  `v-file-input` or `<input type=file>` triggered programmatically — whichever is
  cleaner with Vuetify 3's file input ref API).
- Drag-and-drop: `dragenter`/`dragover`/`dragleave`/`drop` handlers on the dropzone.
  While a file is dragged over it, the card gets a highlighted border/background
  (Vuetify `border-color: primary` + subtle bg tint) to confirm the drop target is live.
  `dragover` must call `preventDefault()` or the browser navigates to the file instead of
  firing `drop`.
- Same validation as today: reject non-`image/*` files silently ignored (matches current
  `Toolbar.onFile` behavior — no error toast for a bad file type, per existing pattern).
- On a valid drop/selection: read as data URL, call `store.loadOriginal(dataURL, name)`,
  same as today. The reactive `store.hasImage` flip is what actually swaps the view —
  `UploadScreen` doesn't need to know about navigation.

### Shared file-loading logic

`Toolbar.vue` and `UploadScreen.vue` both need "take a `File`, validate it's an image,
read as data URL, call `store.loadOriginal`." Extract this into
`src/editor/loadFile.ts`:

```ts
export async function loadImageFile(store: EditorStore, file: File): Promise<void>
```

Both components call this instead of duplicating the `FileReader` dance. `Toolbar.vue`'s
existing `onFile` becomes a thin wrapper.

## 4. Editor state changes

Minimal — this is the part that must keep looking/behaving like v1:

- `EditorCanvas.vue`: remove the `v-if="!store.hasImage"` placeholder branch — it's dead
  code now that `UploadScreen` owns the empty case. The canvas host itself is unchanged.
- `Toolbar.vue`: unchanged. The compact "Upload image" file input stays as the way to
  replace the current image — picking a new file overwrites immediately (no confirm
  dialog), matching current behavior and today's answer to keep it simple. It now calls
  the shared `loadImageFile` helper instead of inlining the reader logic.
- `App.vue`: expansion panels, `TransformPanel`/`AdjustPanel`/`FilterPanel`/
  `AnnotatePanel` layout unchanged.

## 5. Non-goals

- No change to crop/adjust/filter/annotate/export/undo-redo/reset functionality.
- No confirmation dialog when replacing an image mid-edit (explicitly decided against).
- No animated transition between states required — an instant swap driven by
  `store.hasImage` is sufficient; a `v-fade-transition` wrap is a nice-to-have if trivial,
  not a requirement.

## 6. Testing

- New `tests/components/UploadScreen.test.ts`: click-to-browse path, drag-and-drop path
  (simulate `drop` event with a `DataTransfer`-like object holding a fake image `File`),
  non-image file is ignored.
- New `tests/editor/loadFile.test.ts` (or fold into existing store tests): shared helper
  loads valid images, ignores non-image files.
- Update `tests/components/App.test.ts` for the state switch (renders `UploadScreen` when
  `!hasImage`, renders editor layout when `hasImage`).
- Existing `EditorCanvas.test.ts`, `Toolbar.test.ts`, panel tests: update only where they
  assumed the placeholder text existed.

## 7. Tech constraints preserved

Vue 3, Vuetify 3, Pinia, TypeScript — no new dependencies. `UploadScreen` is built purely
from Vuetify components (`v-card`, `v-icon`, `v-btn`, `v-file-input`) plus native drag
events, consistent with the "headless engine, Vuetify UI" decision in the original
design doc.
