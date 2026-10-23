// Reading settings (qd:settings, version 1) and the theme (qd:theme), applied to
// the root element exactly as the boot scripts in index.html do before first
// paint.
import { defineStore } from 'pinia'
import { computed, nextTick, reactive, ref } from 'vue'
import type { ArabicStep, ResolvedTheme, Settings, SettingsPatch, ThemeChoice } from '@/types'
import { readPref, writePref } from '@/lib/storage'
import { isReciterKey } from '@/lib/quran'
import { isPrayerMethod } from '@/lib/prayer-meta'
import { hasViewTransitions, motionOK } from '@/lib/motion'

const DEFAULTS: Settings = {
  v: 1,
  reciter: 'ab',
  arabicStep: null,
  latin: true,
  translation: true,
  continuous: true,
  gapMs: 500,
  repeat: 0,
  follow: true,
  method: 'kemenag',
  hijriAdjust: 0,
  motion: 'system',
}

const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#F2EFE8', dark: '#0E1014' }

function readSettings(): Settings {
  const raw = readPref<Partial<Settings> | null>('settings', null) || {}
  const s: Settings = { ...DEFAULTS, ...(raw.v === 1 ? raw : {}), v: 1 }
  if (!isReciterKey(s.reciter)) s.reciter = 'ab'
  if (!isPrayerMethod(s.method)) s.method = 'kemenag'
  return s
}

function readTheme(): ThemeChoice {
  const t = readPref<unknown>('theme', 'system')
  return t === 'light' || t === 'dark' ? t : 'system'
}

type BeforeFn = (patch: SettingsPatch) => void
type ChangeFn = (settings: Settings, patch: SettingsPatch) => void

export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive<Settings>(readSettings())
  const theme = ref<ThemeChoice>(readTheme())
  const mqDark = matchMedia('(prefers-color-scheme: dark)')
  const systemDark = ref(mqDark.matches)
  const resolvedTheme = computed<ResolvedTheme>(() => (theme.value === 'system' ? (systemDark.value ? 'dark' : 'light') : theme.value))
  const isDark = computed(() => resolvedTheme.value === 'dark')

  const before = new Set<BeforeFn>()
  const listeners = new Set<ChangeFn>()

  /** Root element state, as applySettings() and the boot script set it. */
  function apply() {
    const root = document.documentElement
    if (settings.arabicStep) root.dataset.arstep = String(settings.arabicStep)
    else delete root.dataset.arstep
    if (settings.motion === 'reduce') root.dataset.motion = 'reduce'
    else delete root.dataset.motion
    root.classList.toggle('hide-lat', !settings.latin)
    root.classList.toggle('hide-tr', !settings.translation)
  }

  function applyTheme() {
    document.documentElement.dataset.theme = resolvedTheme.value
    const m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', THEME_COLOR[resolvedTheme.value])
  }

  /**
   * Patch, store, apply to the root element, then notify. Hooks registered with
   * beforeChange run first with the patch (the reader records its anchor ayat).
   */
  function set(patch: SettingsPatch) {
    before.forEach((fn) => fn(patch))
    Object.assign(settings, patch, { v: 1 })
    writePref('settings', { ...settings })
    apply()
    listeners.forEach((fn) => fn(settings, patch))
  }

  function beforeChange(fn: BeforeFn) {
    before.add(fn)
    return () => {
      before.delete(fn)
    }
  }

  /** Called after every set() with the full settings and the patch; returns an unsubscribe function. */
  function onChange(fn: ChangeFn) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }

  function setArabicStep(step: ArabicStep | null) {
    set({ arabicStep: step })
  }

  function setTheme(t: ThemeChoice) {
    theme.value = t
    writePref('theme', t)
    applyTheme()
  }

  /** Theme change with the 200 ms View Transition root crossfade. */
  function changeTheme(t: ThemeChoice | 'toggle') {
    const run = () => setTheme(t === 'toggle' ? (resolvedTheme.value === 'dark' ? 'light' : 'dark') : t)
    if (hasViewTransitions() && motionOK()) {
      const root = document.documentElement
      root.classList.add('vt-theme')
      const vt = document.startViewTransition(async () => {
        run()
        await nextTick()
      })
      vt.ready.catch(() => {})
      vt.finished.catch(() => {}).finally(() => root.classList.remove('vt-theme'))
    } else run()
  }

  mqDark.addEventListener('change', (e) => {
    systemDark.value = e.matches
    if (theme.value === 'system') applyTheme()
  })

  apply()
  applyTheme()

  return { settings, theme, resolvedTheme, isDark, set, beforeChange, onChange, setArabicStep, setTheme, changeTheme, apply, applyTheme }
})
