export interface CropRect {
  left: number
  top: number
  width: number
  height: number
}

export type AdjustName = 'brightness' | 'contrast' | 'saturation'

export type FilterName =
  | 'grayscale' | 'sepia' | 'sepia2' | 'invert' | 'blur' | 'sharpen'
  | 'emboss' | 'noise' | 'pixelate' | 'removeColor' | 'tint'
  | 'multiply' | 'blend' | 'colorFilter'

export type AnnotationType = 'text' | 'shape' | 'draw' | 'icon' | 'mask'

interface BaseOp { id: string }
export interface CropOp extends BaseOp { type: 'crop'; rect: CropRect }
export interface FlipOp extends BaseOp { type: 'flip'; axis: 'x' | 'y' }
export interface RotateOp extends BaseOp { type: 'rotate'; degrees: number }
export interface AdjustOp extends BaseOp { type: 'adjust'; name: AdjustName; value: number }
export interface FilterOp extends BaseOp { type: 'filter'; name: FilterName; options?: Record<string, unknown> }
export interface AnnotationOp extends BaseOp { type: AnnotationType; props: Record<string, unknown> }

export type Operation = CropOp | FlipOp | RotateOp | AdjustOp | FilterOp | AnnotationOp

function newId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}-${Date.now()}`)
}

export const crop = (rect: CropRect): CropOp => ({ id: newId(), type: 'crop', rect })
export const flip = (axis: 'x' | 'y'): FlipOp => ({ id: newId(), type: 'flip', axis })
export const rotate = (degrees: number): RotateOp => ({ id: newId(), type: 'rotate', degrees })
export const adjust = (name: AdjustName, value: number): AdjustOp => ({ id: newId(), type: 'adjust', name, value })
export const filter = (name: FilterName, options?: Record<string, unknown>): FilterOp =>
  ({ id: newId(), type: 'filter', name, ...(options ? { options } : {}) })
export const annotation = (type: AnnotationType, props: Record<string, unknown>): AnnotationOp =>
  ({ id: newId(), type, props })
