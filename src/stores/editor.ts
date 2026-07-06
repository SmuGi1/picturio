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

let opQueue: Promise<unknown> = Promise.resolve()
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = opQueue.then(task, task)
  opQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
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
    setAdapter(adapter: ImageAdapter | null) {
      this.adapter = adapter
    },
    requireAdapter(): ImageAdapter {
      if (!this.adapter) throw new Error('Adapter not set')
      return this.adapter
    },
    async loadOriginal(dataURL: string, name: string) {
      const { width, height } = await enqueue(() => this.requireAdapter().loadImage(dataURL, name))
      this.originalImage = { dataURL, source: { name, width, height } }
      this.operations = []
      this.undoStack = []
      this.redoStack = []
      this.viewingOriginal = false
    },
    snapshot(): Operation[] {
      // Ops are JSON-serializable by contract, so this is a safe deep clone
      // that keeps undo/redo snapshots independent from live nested state.
      return JSON.parse(JSON.stringify(this.operations)) as Operation[]
    },
    commit() {
      this.undoStack.push(this.snapshot())
      this.redoStack = []
    },
    async rebuildPreview() {
      const orig = this.originalImage
      if (!orig) return
      await enqueue(async () => {
        const adapter = this.requireAdapter()
        await adapter.loadImage(orig.dataURL, orig.source.name)
        await replay(this.operations, adapter)
      })
    },
    beginAdjust() {
      this.commit()
    },
    async previewAdjust(name: AdjustName, value: number) {
      const existing = this.operations.find((o) => o.type === 'adjust' && o.name === name)
      if (existing && existing.type === 'adjust') existing.value = value
      else this.operations.push(makeAdjust(name, value))
      await enqueue(() => this.requireAdapter().applyFilter(name, { [name]: value }))
    },
    async setAdjust(name: AdjustName, value: number) {
      this.beginAdjust()
      await this.previewAdjust(name, value)
    },
    async addOperation(op: Operation) {
      this.commit()
      this.operations.push(op)
      await enqueue(() => replay([op], this.requireAdapter()))
    },
    async toggleFilter(name: FilterName, options?: Record<string, unknown>) {
      const idx = this.operations.findIndex((o) => o.type === 'filter' && o.name === name)
      if (idx >= 0) {
        this.commit()
        this.operations.splice(idx, 1)
        await enqueue(() => this.requireAdapter().removeFilter(name))
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
      const orig = this.originalImage
      if (!orig) return
      if (on) await enqueue(() => this.requireAdapter().loadImage(orig.dataURL, orig.source.name))
      else await this.rebuildPreview()
    },
    async undo() {
      const prev = this.undoStack.pop()
      if (!prev) return
      this.redoStack.push(this.snapshot())
      this.operations = prev
      await this.rebuildPreview()
    },
    async redo() {
      const next = this.redoStack.pop()
      if (!next) return
      this.undoStack.push(this.snapshot())
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
