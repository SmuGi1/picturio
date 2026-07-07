import { ref } from 'vue'

export type ThemeName = 'dark' | 'light'
const STORAGE_KEY = 'picturio-theme'

function read(): ThemeName {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  return saved === 'light' ? 'light' : 'dark'
}

const theme = ref<ThemeName>(read())

export function useTheme() {
  function set(name: ThemeName) {
    theme.value = name
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, name)
  }
  function toggle() {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }
  return { theme, set, toggle }
}
