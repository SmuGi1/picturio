import type { Operation } from './operations'

export const OPS_VERSION = 1

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
  return { version: doc.version, source: doc.source, operations: doc.operations }
}
