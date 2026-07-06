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
