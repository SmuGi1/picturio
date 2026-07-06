import type { Operation } from './operations'
import type { ImageAdapter } from './adapter.types'

export async function replay(operations: Operation[], adapter: ImageAdapter): Promise<void> {
  for (const op of operations) {
    switch (op.type) {
      case 'crop':
        await adapter.crop(op.rect)
        break
      case 'flip':
        await adapter.flip(op.axis)
        break
      case 'rotate':
        await adapter.rotate(op.degrees)
        break
      case 'adjust':
        await adapter.applyFilter(op.name, { [op.name]: op.value })
        break
      case 'filter':
        await adapter.applyFilter(op.name, op.options)
        break
      case 'text':
      case 'shape':
      case 'draw':
      case 'icon':
        await adapter.addObject(op.type, op.props)
        break
      case 'mask':
        await adapter.applyMask(op.props)
        break
    }
  }
}
