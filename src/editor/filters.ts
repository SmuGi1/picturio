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
