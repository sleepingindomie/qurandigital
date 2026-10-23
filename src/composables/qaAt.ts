// Test hooks that must exist once per page although the control is drawn in two
// places: v-qa-at="'play-all@tab,desk'" keeps data-qa-at on the element and sets
// data-qa="play-all" only at those breakpoints (ui.js syncQa).
import type { Directive } from 'vue'
import type { Breakpoint } from '@/types'
import { bp, onBp } from '@/lib/breakpoint'

const nodes = new Set<HTMLElement>()

function parse(spec: string): [string, string[]] {
  const [name, list = ''] = String(spec || '').split('@')
  return [name, list.split(',').map((s) => s.trim())]
}

function apply(el: HTMLElement, now: Breakpoint = bp()) {
  const spec = el.dataset.qaAt
  if (!spec) return
  const [name, list] = parse(spec)
  if (list.includes(now)) el.setAttribute('data-qa', name)
  else if (el.getAttribute('data-qa') === name) el.removeAttribute('data-qa')
}

onBp((b) => nodes.forEach((el) => apply(el, b)))

function setSpec(el: HTMLElement, value: string) {
  const old = el.dataset.qaAt
  if (old && old !== value) {
    const [oldName] = parse(old)
    if (el.getAttribute('data-qa') === oldName) el.removeAttribute('data-qa')
  }
  el.dataset.qaAt = value
  apply(el)
}

export const vQaAt: Directive<HTMLElement, string> = {
  mounted(el, { value }) {
    nodes.add(el)
    setSpec(el, value)
  },
  updated(el, { value }) {
    setSpec(el, value)
  },
  unmounted(el) {
    nodes.delete(el)
  },
}
