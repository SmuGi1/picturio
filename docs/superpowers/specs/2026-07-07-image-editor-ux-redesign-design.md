# Image Editor UX Redesign — Design

**Date:** 2026-07-07
**Status:** Approved (design), pending implementation plan

## Goal

Restyle the existing Picturio image editor (current state: `v1.png`) to match the
`better-ux` mockup (`better-ux.png`, fully specified in
`better-ux-folder/Image Editor.dc.html`). The mockup is a bespoke, warm-toned
dark/light design with a custom header, a centered-canvas + status-bar layout, and
a 300px collapsible side panel.

This is a **presentation-layer redesign with full functional parity**: every control
in the mockup actually works, including a light/dark theme toggle and view zoom. The
underlying edit model — the Pinia store, the non-destructive operation pipeline,
undo/redo, replay, and export — is reused unchanged.

## Non-goals (YAGNI)

- Zoom is a view-only concern: it is **not** persisted in the op-model and does **not**
  affect export (export stays at native resolution). "Fit" simply resets zoom to 100%.
- No new annotation tools beyond the existing Rect / Triangle / Draw / Mask.
- No changes to serialization, replay, filters, or the toast-image-editor adapter logic.

## Technical approach

**Custom components layered on Vuetify's theme system.**

Keep `<v-app>` as the theme provider and keep Vuetify for the pieces it does well
(reset-confirm dialog, error snackbar, export menu). Replace the app's *internal
layout* with bespoke flex components that match the mockup pixel-for-pixel.

The mockup's exact `DARK` and `LIGHT` palettes are expressed as CSS custom properties,
toggled by a `data-pt-theme` attribute on the app root. A small theme composable owns
the reactive theme state and also flips Vuetify's own theme so dialogs/snackbars/menus
stay visually consistent.

Rejected alternatives:
- **Heavily theming stock Vuetify components** — cannot reproduce the mockup's exact
  chip / slider / section structure and spacing; ends up fighting the framework.
- **Dropping Vuetify entirely** — violates the tech-task requirement (Vuetify 3) and
  discards working dialog / snackbar / menu behavior.

## Design tokens

Sourced verbatim from the mockup (`Image Editor.dc.html`), exposed as CSS variables
under `[data-pt-theme="dark"]` / `[data-pt-theme="light"]` in `src/styles/tokens.css`:

| Token       | Dark                     | Light                    |
|-------------|--------------------------|--------------------------|
| bg          | `#141312`                | `#f6f5f2`                |
| bgCanvas    | `#0d0c0b`                | `#e9e7e2`                |
| panel       | `#1c1b1a`                | `#ffffff`                |
| panelAlt    | `#242321`                | `#f1f0ec`                |
| border      | `rgba(255,255,255,0.09)` | `rgba(0,0,0,0.09)`       |
| borderStrong| `rgba(255,255,255,0.18)` | `rgba(0,0,0,0.18)`       |
| text        | `#f2f1ef`                | `#1c1b1a`                |
| textDim     | `#a6a49f`                | `#66645e`                |
| textFaint   | `#68665f`                | `#a19e97`                |
| accent      | `#5b8def`                | `#3465c9`                |
| accentSoft  | `rgba(91,141,239,0.16)`  | `rgba(52,101,201,0.10)`  |

Vuetify's `dark`/`light` themes in `src/plugins/vuetify.ts` are configured with the
matching `background` / `surface` / `primary` values so Vuetify overlays inherit the
palette.

## Layout & component structure

```
<v-app>  (theme provider, data-pt-theme on root)
 ├─ AppHeader        logo · divider · file-chip │ undo redo │ hold-compare · reset │ theme-toggle · Export▾
 ├─ EditorStage      dark canvas bg → centered image card (EditorCanvas host) → crop guide / ORIGINAL tag
 │   └─ status bar   "W × H px" · "● Edited" pill        [− 100% + Fit]
 └─ SidePanel 300px  PanelSection ×4 (title + chevron, collapsible)
      ├─ Transform   Crop · flipH · flipV · rotL · rotR   (icon buttons)
      ├─ Adjust      AppSlider ×3  (label · reset · % badge · custom track)
      ├─ Filters     2-col grid of chips (dot · label · active check)
      └─ Annotate    color swatch + "Annotation color" · Rect Triangle Draw Mask
 └─ UploadScreen     restyled overlay shown when no image (keeps .upload-screen)
```

### New files
- `src/styles/tokens.css` — both palettes as CSS custom properties + custom range-slider CSS.
- `src/composables/useTheme.ts` — reactive theme state; toggles `data-pt-theme` + Vuetify
  theme; persists to `localStorage` (default `dark`).
- `src/components/AppHeader.vue` — replaces `Toolbar.vue`.
- `src/components/EditorStage.vue` — canvas frame + status bar + zoom controls.
- `src/components/SidePanel.vue` — the 300px right column.
- `src/components/PanelSection.vue` — reusable collapsible section (title + chevron).
- `src/components/AppSlider.vue` — custom range slider matching the mockup.

### Changed files
- `src/App.vue` — full-height flex layout wiring the new components; keeps the
  editor-layer / upload-overlay two-state switch on `store.hasImage`.
- `src/plugins/vuetify.ts` — custom `dark`/`light` themes with mockup colors.
- `src/components/EditorCanvas.vue` — container styling so the toast canvas centers and
  can be scaled by the stage's zoom transform; logic unchanged.
- `src/components/panels/TransformPanel.vue` — icon-button row styling; crop active state.
- `src/components/panels/AdjustPanel.vue` — uses `AppSlider`; %↔value mapping; per-slider reset.
- `src/components/panels/FilterPanel.vue` — 2-col grid of custom chips with dot + active check.
- `src/components/panels/AnnotatePanel.vue` — swatch + label + styled tool buttons.
- `src/components/ExportMenu.vue` — triggered by the header Export button; "Import ops"
  folds into the menu.
- `src/components/UploadScreen.vue` — restyled to the token palette; keeps `.upload-screen`.

### Removed
- `src/components/Toolbar.vue` — its logic migrates into `AppHeader.vue`.

## Key behaviors

### Theme toggle
`useTheme()` exposes `theme` (`'dark' | 'light'`) and `toggle()`. On change it sets
`data-pt-theme` on the app root and calls Vuetify's `useTheme().global.name`. State
persists to `localStorage` under a `picturio-theme` key; default `dark`. Sun icon shows
in dark mode, moon in light (per mockup).

### Zoom (view-only)
Local state in `EditorStage`: `zoom` percent, default 100. `zoomIn`/`zoomOut` step ±25
(clamped 25–400); `zoomFit` resets to 100. Applied as `transform: scale(zoom/100)` on
the centered canvas card. Never touches the op-model or export. Dimensions label reads
`originalImage.source.width × height`.

### "Edited" pill
Shown in the status bar when a new store getter `hasEdits` is true
(`operations.length > 0`).

### Adjust sliders (%↔value mapping)
Display range 0–200% with 100% neutral; underlying store value stays −1..1 via
`value = pct/100 − 1` (so 0% → −1, 100% → 0, 200% → +1). The `AppSlider` UI does the
mapping; `AdjustPanel.onChange(name, storeValue)` continues to receive the raw −1..1
value, preserving the existing test contract. Per-slider reset returns to 100% (value 0).
The `% badge` and track-fill highlight in accent color when the channel is changed
(pct ≠ 100).

### Hold-to-compare
`AppHeader` compare button: `mousedown`/`touchstart` → `store.viewOriginal(true)`;
`mouseup`/`mouseleave`/`touchend` → `store.viewOriginal(false)`. Reuses the existing
store action. An `ORIGINAL` tag overlays the canvas while comparing.

### File chip
Header chip shows the current filename (`originalImage.source.name`) with an upload icon;
clicking it opens the file picker and calls `loadImageFile(store, file)` — same helper
the upload screen uses.

### Export
The blue header `Export` button opens the existing export menu (Download PNG / JPEG /
operations JSON / bundle .zip). "Import ops" becomes a menu item that opens a hidden
JSON file input and calls `store.importJSON`.

## Store changes

Additive only — no changes to existing actions or the op pipeline:
- `hasEdits` getter: `operations.length > 0`.
- (Filename and dimensions are already available via `originalImage.source`; expose
  thin getters `fileName` / `dimensions` if convenient for templates.)

Zoom and theme are UI state (component-local / composable), not in the store.

## Testing

Preserve the `defineExpose`d method names on every panel so existing tests keep passing:
- `AdjustPanel`: `onStart`, `onChange(name, storeValue)` — unchanged signatures.
- `FilterPanel`: `toggle(def)`.
- `TransformPanel`: `startCrop` / `applyCrop` / `cancelCrop` / `flip` / `rotate`.
- `AnnotatePanel`: `addShape` / `toggleDraw` / `addMask`.
- `ExportMenu`: `exportImage` / `exportJSON` / `exportBundle` / `onImport`.

`App.test` stays green: section titles (Transform/Adjust/Filters/Annotate), the text
"Export", and `.upload-screen` all remain present.

Test changes:
- `tests/components/Toolbar.test.ts` → retargeted to `AppHeader.test.ts`, asserting the
  same `onFile` / `onViewOriginal` contract now exposed by `AppHeader`.

New focused unit tests:
- %↔value mapping in `AppSlider` (0/100/200 ↔ −1/0/+1; changed flag).
- `useTheme` toggle + persistence.
- `EditorStage` zoom in/out/fit clamping.
- `hasEdits` store getter.

**Gate:** `npm run test` and `npm run build` (vue-tsc) both clean before completion.

## Open risks

- Centering and scaling the toast-image-editor canvas: the adapter is created with
  `cssMaxWidth: 900 / cssMaxHeight: 640`. The stage wraps the host and applies the zoom
  transform on the wrapper, not the toast internals, so no adapter changes are required.
- Native `<input type="color">` for the annotation swatch replaces the current
  `v-color-picker` menu to match the mockup; the selected color must still feed
  `addShape` / `toggleDraw` exactly as before.
