// The CSS max box tui fits the canvas into (kept in sync with the ImageEditor
// options in toastAdapter.ts).
export const CSS_MAX_WIDTH = 900
export const CSS_MAX_HEIGHT = 640

// Mirror of tui's Graphics._calcMaxDimension: the display size it fits an image
// of `width`×`height` into (bounded by CSS_MAX_*, preserving aspect ratio, never
// upscaling). The adapter uses this to shrink the canvas host to the fitted size
// so tui's dark container hugs the image instead of leaving bars around it.
export function fitDimension(width: number, height: number): { width: number; height: number } {
  const wScale = CSS_MAX_WIDTH / width
  const hScale = CSS_MAX_HEIGHT / height
  let w = Math.min(width, CSS_MAX_WIDTH)
  let h = Math.min(height, CSS_MAX_HEIGHT)
  if (wScale < 1 && wScale < hScale) {
    w = width * wScale
    h = height * wScale
  } else if (hScale < 1 && hScale < wScale) {
    w = width * hScale
    h = height * hScale
  }
  return { width: Math.floor(w), height: Math.floor(h) }
}
