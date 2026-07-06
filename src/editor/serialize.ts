import type { Operation } from './operations'

export const OPS_VERSION = 1

const ADJUST_NAMES = new Set(['brightness', 'contrast', 'saturation'])
const ANNOTATION_TYPES = new Set(['text', 'shape', 'draw', 'icon', 'mask'])

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

// Validate one deserialized operation has the shape replay() requires. Returning
// false lets deserialize reject the whole document atomically, so a malformed op
// can never reach the adapter mid-replay and desync the canvas from the op-list.
function isValidOperation(op: unknown): op is Operation {
  if (!op || typeof op !== 'object') return false
  const o = op as Record<string, unknown>
  if (typeof o.id !== 'string') return false
  switch (o.type) {
    case 'crop': {
      const r = o.rect as Record<string, unknown> | undefined
      return !!r && isNum(r.left) && isNum(r.top) && isNum(r.width) && isNum(r.height)
    }
    case 'flip':
      return o.axis === 'x' || o.axis === 'y'
    case 'rotate':
      return isNum(o.degrees)
    case 'adjust':
      return typeof o.name === 'string' && ADJUST_NAMES.has(o.name) && isNum(o.value)
    case 'filter':
      return typeof o.name === 'string' && (o.options === undefined || typeof o.options === 'object')
    case 'text':
    case 'shape':
    case 'draw':
    case 'icon':
    case 'mask':
      return ANNOTATION_TYPES.has(o.type as string) && !!o.props && typeof o.props === 'object'
    default:
      return false
  }
}

export interface OpsSource {
  name: string
  width: number
  height: number
}

export interface OpsDocument {
  version: number
  source: OpsSource
  operations: Operation[]
}

export function serialize(source: OpsSource, operations: Operation[]): string {
  const doc: OpsDocument = { version: OPS_VERSION, source, operations }
  return JSON.stringify(doc, null, 2)
}

export function deserialize(json: string): OpsDocument {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON: could not parse operations document')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid document: expected a JSON object')
  }
  const doc = parsed as Partial<OpsDocument>
  if (doc.version !== OPS_VERSION) {
    throw new Error(`Unsupported operations version: ${String(doc.version)} (expected ${OPS_VERSION})`)
  }
  if (!doc.source || typeof doc.source.name !== 'string') {
    throw new Error('Invalid document: missing source metadata')
  }
  if (!Array.isArray(doc.operations)) {
    throw new Error('Invalid document: operations must be an array')
  }
  doc.operations.forEach((op, i) => {
    if (!isValidOperation(op)) {
      throw new Error(`Invalid document: operation at index ${i} is malformed`)
    }
  })
  return { version: doc.version, source: doc.source, operations: doc.operations }
}
