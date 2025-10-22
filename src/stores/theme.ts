import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const STORAGE_KEY = 'quran_theme'

  // State
  const isDark = ref(false)

  // Actions
  function initializeTheme() {
    // Check localStorage first
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      isDark.value = saved === 'dark'
    } else {
      // Check system preference
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    applyTheme()
    console.log(`🎨 Theme initialized: ${isDark.value ? 'dark' : 'light'}`)
  }

  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme()
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
    console.log(`🎨 Theme changed to: ${isDark.value ? 'dark' : 'light'}`)
  }

  function applyTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark.value ? '#0f172a' : '#16a34a')
    }
  }

  // Watch system preference changes
  function watchSystemTheme() {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')

    darkModeQuery.addEventListener('change', (e) => {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) {
        isDark.value = e.matches
        applyTheme()
      }
    })
  }

  return {
    isDark,
    initializeTheme,
    toggleTheme,
    watchSystemTheme
  }
})
