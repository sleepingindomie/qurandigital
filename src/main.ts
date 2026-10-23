import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { installNav } from './composables/useNav'
import { vQaAt } from './composables/qaAt'
import { useSettingsStore } from './stores/settings'
import { watchArabicFont } from './lib/fonts'
import { reloadForStaleChunk } from './lib/stale-chunk'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/shell.css'
import './styles/home.css'
import './styles/reader.css'
import './styles/player.css'
import './styles/panels.css'

watchArabicFont()

// A chunk or its CSS from the previous deploy failed to preload: load the page again.
addEventListener('vite:preloadError', (e) => {
  if (reloadForStaleChunk()) e.preventDefault()
})

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
// Saved settings and theme on the root element (the boot scripts did it first).
useSettingsStore(pinia)
// Transitions and link handling, installed before the first navigation.
installNav(router)
app.use(router)
app.directive('qa-at', vQaAt)
app.mount('#app')
