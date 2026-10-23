<script setup lang="ts">
// The panel system. One panel at a time, owned by the ui store. mode "auto" is
// a popover anchored to its button on desktop and a bottom sheet below
// 1100 px; "sheet" is always a sheet. Escape closes, Tab is trapped, a sheet
// has a scrim and closes on a downward drag of more than 96 px, a click outside
// a popover closes it, and focus returns to the opener.
//
//   <button ref="btn" @click="ui.openPanel('settings', { anchor: btn })">Aa</button>
//   <UiPanel id="settings" title="Pengaturan baca" cls="panel-settings" v-slot="{ close }">
//     ...content, call close() or close({ silent: true })
//   </UiPanel>
//
// The panel is teleported to body; render <UiPanel> anywhere, it shows only
// while ui.panel.id equals its id.
import { computed, onBeforeUnmount, useId } from 'vue'
import { useUiStore } from '@/stores/ui'
import type { ClosePanelOptions } from '@/stores/ui'
import { motionOK } from '@/lib/motion'

const props = withDefaults(
  defineProps<{
    id: string
    title: string
    mode?: 'auto' | 'sheet' | 'pop'
    role?: string
    /** Extra class on the panel, such as panel-settings, panel-menu, panel-nav, panel-tafsir. */
    cls?: string
    qa?: string
  }>(),
  { mode: 'auto', role: 'dialog', cls: '', qa: undefined },
)

const ui = useUiStore()
const titleId = useId()
const state = computed(() => (ui.panel && ui.panel.id === props.id ? ui.panel : null))
const kind = computed<'pop' | 'sheet'>(() => {
  const s = state.value
  if (!s) return 'sheet'
  return props.mode === 'auto' ? (s.bp === 'desk' && s.anchor ? 'pop' : 'sheet') : props.mode
})

function close(opts?: ClosePanelOptions) {
  if (state.value) ui.closePanel(opts)
}

// ------------------------------------------------------------ the open panel
interface Active {
  el: HTMLElement
  kind: 'pop' | 'sheet'
  anchor: HTMLElement | null
}
let active: Active | null = null
let outsideTimer: ReturnType<typeof setTimeout> | undefined

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

function onKey(e: KeyboardEvent) {
  if (!active) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
  } else if (e.key === 'Tab') {
    const f = Array.from(active.el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function onOutside(e: PointerEvent) {
  if (!active || active.kind !== 'pop') return
  const t = e.target as Node
  if (active.el.contains(t) || (active.anchor && active.anchor.contains(t))) return
  close({ keepFocus: true })
}

// A popover is position: fixed and placed once. When its anchor scrolls with
// the page (the ayat menu button), it follows the anchor on scroll, one place()
// per frame, and closes once the anchor has gone under the bar or below the
// viewport. Anchors inside the sticky #bar (Aa, Qari) never move.
let scrollRaf = 0
let scrolling = false

function onScroll(e: Event) {
  if (!active || scrollRaf) return
  if (e.target instanceof Node && active.el.contains(e.target)) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    const a = active
    if (!a || a.kind !== 'pop' || !a.anchor) return
    const r = a.anchor.getBoundingClientRect()
    const top = document.getElementById('bar')?.getBoundingClientRect().bottom ?? 0
    if (!a.anchor.isConnected || r.bottom < top || r.top > innerHeight) {
      // focus inside the popover goes back to its button; otherwise it stays put
      close(a.el.contains(document.activeElement) ? undefined : { keepFocus: true })
    } else place(a.el, a.anchor)
  })
}

function listen() {
  document.addEventListener('keydown', onKey, true)
  outsideTimer = setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0)
  if (active && active.kind === 'pop' && active.anchor && !active.anchor.closest('#bar')) {
    addEventListener('scroll', onScroll, { passive: true, capture: true })
    scrolling = true
  }
}

function unlisten() {
  clearTimeout(outsideTimer)
  document.removeEventListener('keydown', onKey, true)
  document.removeEventListener('pointerdown', onOutside, true)
  if (scrolling) removeEventListener('scroll', onScroll, { capture: true })
  scrolling = false
  cancelAnimationFrame(scrollRaf)
  scrollRaf = 0
}

// Below the anchor; flipped above when it would run off the bottom (the player
// bar and lower ayat rows), otherwise clamped into the viewport.
function place(el: HTMLElement, anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect()
  const h = el.offsetHeight
  if (r.bottom + 8 + h > innerHeight - 8 && r.top - 8 - h >= 8) {
    el.style.top = ''
    el.style.bottom = Math.round(innerHeight - r.top + 8) + 'px'
  } else {
    el.style.bottom = ''
    el.style.top = Math.max(8, Math.min(Math.round(r.bottom + 8), innerHeight - 8 - h)) + 'px'
  }
  el.style.right = Math.max(16, Math.round(innerWidth - r.right)) + 'px'
}

function onEnter(node: Element, done: () => void) {
  const el = node as HTMLElement
  const anchor = state.value?.anchor ?? null
  active = { el, kind: kind.value, anchor }
  if (active.kind === 'pop' && anchor) place(el, anchor)
  else document.documentElement.classList.add('sheet-open')
  requestAnimationFrame(() => {
    el.classList.add('in')
    done()
  })
  listen()
  const body = el.querySelector('.panel-body')
  const target =
    body?.querySelector<HTMLElement>('[aria-checked="true"],[role="menuitem"],input,button,a[href]') ||
    el.querySelector<HTMLElement>('.panel-close')
  target?.focus({ preventScroll: true })
}

function onLeave(node: Element, done: () => void) {
  const el = node as HTMLElement
  el.classList.remove('in')
  if (active && active.el === el) {
    unlisten()
    active = null
  }
  document.documentElement.classList.remove('sheet-open')
  if (motionOK()) setTimeout(done, 220)
  else done()
}

function scrimEnter(node: Element, done: () => void) {
  requestAnimationFrame(() => {
    node.classList.add('in')
    done()
  })
}

function scrimLeave(node: Element, done: () => void) {
  node.classList.remove('in')
  if (motionOK()) setTimeout(done, 220)
  else done()
}

// ------------------------------------------------------------ drag to close
// A downward drag of more than 96 px on the sheet's head or grab closes it.
let y0: number | null = null
let dy = 0

function dragStart(e: PointerEvent) {
  if (!active || (active.kind === 'pop' && active.anchor)) return
  if ((e.target as Element).closest('button')) return
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  y0 = e.clientY
  dy = 0
  active.el.style.transition = 'none'
}

function dragMove(e: PointerEvent) {
  if (y0 == null || !active) return
  dy = Math.max(0, e.clientY - y0)
  active.el.style.transform = `translateY(${dy}px)`
}

function dragEnd() {
  if (y0 == null || !active) return
  y0 = null
  active.el.style.transition = ''
  active.el.style.transform = ''
  if (dy > 96) close()
}

onBeforeUnmount(() => {
  unlisten()
  if (active) document.documentElement.classList.remove('sheet-open')
  active = null
  if (state.value) ui.closePanel({ silent: true })
})
</script>

<template>
  <Teleport to="body">
    <Transition :css="false" @enter="scrimEnter" @leave="scrimLeave">
      <div v-if="state && kind === 'sheet'" :key="state.seq" class="scrim" @click="close()" />
    </Transition>
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div
        v-if="state"
        :key="state.seq"
        :class="['panel', `panel-${kind}`, cls]"
        :role="role"
        :aria-modal="kind === 'sheet' ? 'true' : 'false'"
        :aria-labelledby="titleId"
        :data-qa="qa"
      >
        <div
          v-if="kind === 'sheet'"
          class="grab"
          aria-hidden="true"
          @pointerdown="dragStart"
          @pointermove="dragMove"
          @pointerup="dragEnd"
          @pointercancel="dragEnd"
        />
        <div class="panel-head" @pointerdown="dragStart" @pointermove="dragMove" @pointerup="dragEnd" @pointercancel="dragEnd">
          <h2 :id="titleId" class="panel-title">{{ title }}</h2>
          <button class="txt-btn panel-close" type="button" @click="close()">Tutup</button>
        </div>
        <div class="panel-body">
          <slot :close="close" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
