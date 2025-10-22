<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from './stores/theme'
import { useBookmarkStore } from './stores/bookmark'

const themeStore = useThemeStore()
const bookmarkStore = useBookmarkStore()

onMounted(() => {
  themeStore.initializeTheme()
  themeStore.watchSystemTheme()
  bookmarkStore.loadBookmarks()
})
</script>

<template>
  <div id="app" class="min-h-screen">
    <RouterView />
  </div>
</template>

<style scoped>
#app {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
