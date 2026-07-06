import { defineStore } from 'pinia'
import type { AdjustName, FilterName, Operation } from '../editor/operations'
import { adjust as makeAdjust } from '../editor/operations'
import type { ImageAdapter } from '../editor/adapter.types'
import { replay } from '../editor/replay'
import { serialize, deserialize, type OpsSource } from '../editor/serialize'

interface OriginalImage { dataURL: string; source: OpsSource }

interface State {
  adapter: ImageAdapter | null
  originalImage: OriginalImage | null
  operations: Operation[]
  viewingOriginal: boolean
  undoStack: Operation[][]
  redoStack: Operation[][]
}

export const useEditorStore = defineStore('editor', {
  state: (): State => ({
    adapter: null,
    originalImage: null,
    operations: [],
    viewingOriginal: false,
    undoStack: [],
    redoStack: [],
  }),
  getters: {
    canUndo: (s) => s.undoStack.length > 0,
    canRedo: (s) => s.redoStack.length > 0,
    hasImage: (s) => s.originalImage !== null,
  },
  actions: {
    setAdapter(adapter: ImageAdapter) {
      this.adapter = adapter
    },
    requireAdapter(): ImageAdapter {
      if (!this.adapter) throw new Error('Adapter not set')
      return this.adapter
    },
    async loadOriginal(dataURL: string, name: string) {
      const { width, height } = await this.requireAdapter().loadImage(dataURL, name)
      this.originalImage = { dataURL, source: { name, width, height } }
      this.operations = []
      this.undoStack = []
      this.redoStack = []
      this.viewingOriginal = false
    },
    commit() {
      this.undoStack.push(this.operations.map((o) => ({ ...o })))
      this.redoStack = []
    },
    async rebuildPreview() {
      const adapter = this.requireAdapter()
      const orig = this.originalImage
      if (!orig) return
      await adapter.loadImage(orig.dataURL, orig.source.name)
      await replay(this.operations, adapter)
    },
    setAdjust(name: AdjustName, value: number) {
      this.commit()
      const existing = this.operations.find((o) => o.type === 'adjust' && o.name === name)
      if (existing && existing.type === 'adjust') existing.value = value
      else this.operations.push(makeAdjust(name, value))
      void this.requireAdapter().applyFilter(name, { [name]: value })
    },
    async addOperation(op: Operation) {
      this.commit()
      this.operations.push(op)
      await replay([op], this.requireAdapter())
    },
    async toggleFilter(name: FilterName, options?: Record<string, unknown>) {
      const idx = this.operations.findIndex((o) => o.type === 'filter' && o.name === name)
      if (idx >= 0) {
        this.commit()
        this.operations.splice(idx, 1)
        await this.requireAdapter().removeFilter(name)
      } else {
        const { filter } = await import('../editor/operations')
        await this.addOperation(filter(name, options))
      }
    },
    async reset() {
      this.commit()
      this.operations = []
      this.viewingOriginal = false
      await this.rebuildPreview()
    },
    async viewOriginal(on: boolean) {
      this.viewingOriginal = on
      const adapter = this.requireAdapter()
      const orig = this.originalImage
      if (!orig) return
      if (on) await adapter.loadImage(orig.dataURL, orig.source.name)
      else await this.rebuildPreview()
    },
    async undo() {
      const prev = this.undoStack.pop()
      if (!prev) return
      this.redoStack.push(this.operations.map((o) => ({ ...o })))
      this.operations = prev
      await this.rebuildPreview()
    },
    async redo() {
      const next = this.redoStack.pop()
      if (!next) return
      this.undoStack.push(this.operations.map((o) => ({ ...o })))
      this.operations = next
      await this.rebuildPreview()
    },
    exportJSON(): string {
      if (!this.originalImage) throw new Error('No image loaded')
      return serialize(this.originalImage.source, this.operations)
    },
    async importJSON(json: string) {
      const doc = deserialize(json)
      this.operations = doc.operations
      this.undoStack = []
      this.redoStack = []
      this.viewingOriginal = false
      await this.rebuildPreview()
    },
  },
})
