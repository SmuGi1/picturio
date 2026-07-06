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
      await editor.addShape('rect', { ...props, fill: 'rgba(0,0,0,0.5)' })
    },
    async clearObjectsAndFilters() { await editor.clearObjects() },
    toDataURL(opts?: ExportOptions): string {
      return editor.toDataURL({ format: opts?.format ?? 'png', quality: opts?.quality ?? 1 })
    },
  }
}
