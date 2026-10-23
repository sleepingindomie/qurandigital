// Global keys (app.js, spec 7): Space plays or pauses the loaded ayat, J and K
// move to the next and previous ayat, and "/" focuses the search on home. None
// of them act while typing in a field or with a modifier held, and Space
// leaves buttons, links, radios, tabs, switches and summaries alone.
import { useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useEventListener } from '@/composables/useEventListener'

const OWN_SPACE = 'button, a, [role="radio"], [role="tab"], [role="switch"], summary'

export function useGlobalKeys() {
  const player = usePlayerStore()
  const route = useRoute()

  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    const t = e.target instanceof Element ? e.target : null
    const inField = !!t && !!t.closest('input, textarea, select, [contenteditable="true"]')
    if (inField || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === ' ' && !(t && t.closest(OWN_SPACE)) && player.ayat) {
      e.preventDefault()
      player.toggle()
    } else if ((e.key === 'j' || e.key === 'J') && player.ayat) player.next()
    else if ((e.key === 'k' || e.key === 'K') && player.ayat) player.prev()
    else if (e.key === '/' && route.name === 'home') {
      const q = document.getElementById('q')
      if (q) {
        e.preventDefault()
        q.focus()
      }
    }
  })
}
