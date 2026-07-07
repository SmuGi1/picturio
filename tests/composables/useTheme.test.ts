import { describe, it, expect, beforeEach } from 'vitest'
import { useTheme } from '../../src/composables/useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    useTheme().set('dark') // reset shared singleton
  })

  it('defaults to dark and toggles to light, persisting the choice', () => {
    const { theme, toggle } = useTheme()
    expect(theme.value).toBe('dark')
    toggle()
    expect(theme.value).toBe('light')
    expect(localStorage.getItem('picturio-theme')).toBe('light')
    toggle()
    expect(theme.value).toBe('dark')
  })

  it('shares state across calls', () => {
    const a = useTheme()
    const b = useTheme()
    a.set('light')
    expect(b.theme.value).toBe('light')
  })
})
