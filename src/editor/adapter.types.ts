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
