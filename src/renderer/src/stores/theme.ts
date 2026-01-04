import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'light' | 'dark' | 'auto'>('dark')

  function setTheme(newTheme: 'light' | 'dark' | 'auto') {
    theme.value = newTheme
  }

  return { theme, setTheme }
})
