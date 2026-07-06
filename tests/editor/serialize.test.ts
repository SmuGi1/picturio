import { describe, it, expect } from 'vitest'
import { serialize, deserialize, OPS_VERSION } from '../../src/editor/serialize'
import { adjust, crop } from '../../src/editor/operations'

const source = { name: 'p.png', width: 800, height: 600 }

describe('serialize/deserialize', () => {
  it('round-trips a document', () => {
    const ops = [crop({ left: 0, top: 0, width: 10, height: 10 }), adjust('contrast', 0.5)]
    const doc = deserialize(serialize(source, ops))
    expect(doc.version).toBe(OPS_VERSION)
    expect(doc.source).toEqual(source)
    expect(doc.operations).toEqual(ops)
  })

  it('produces valid JSON text', () => {
    const text = serialize(source, [])
    expect(() => JSON.parse(text)).not.toThrow()
    expect(JSON.parse(text)).toMatchObject({ version: OPS_VERSION, source, operations: [] })
  })

  it('rejects malformed JSON', () => {
    expect(() => deserialize('{not json')).toThrow()
  })

  it('rejects an unsupported version', () => {
    const bad = JSON.stringify({ version: 999, source, operations: [] })
    expect(() => deserialize(bad)).toThrow(/version/i)
  })

  it('rejects a document missing operations array', () => {
    const bad = JSON.stringify({ version: OPS_VERSION, source })
    expect(() => deserialize(bad)).toThrow(/operations/i)
  })

  it('rejects a document missing source', () => {
    const bad = JSON.stringify({ version: OPS_VERSION, operations: [] })
    expect(() => deserialize(bad)).toThrow(/source/i)
  })

  it('rejects a non-object JSON value (null)', () => {
    expect(() => deserialize('null')).toThrow(/object/i)
  })
})
