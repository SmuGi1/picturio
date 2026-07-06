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
    toDataURL(options?: { format?: string; quality?: number }): string
    clearObjects(): Promise<unknown>
    destroy(): void
  }
}
