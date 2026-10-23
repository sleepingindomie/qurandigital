<script setup lang="ts">
// The search combobox: up to six suggestions under the field, an ayat
// reference ("36:9", "yasin 9") as the first option, "Lihat semua hasil (n)"
// when there are more, the count in a polite region after 500 ms, and the
// query in ?q= after 300 ms. Every input also filters the index below (emit
// filter).
import { nextTick, onUnmounted, ref, shallowRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type { SurahIndexItem } from '@/types'
import UiIcon from '@/components/ui/UiIcon.vue'
import { useEventListener } from '@/composables/useEventListener'
import { nav } from '@/composables/useNav'
import { MAKS, NO_MATCH, runSearch, sameName } from './search'
import type { SearchRun } from './search'
import { writeHomeQuery } from './homeRoute'

interface Opt {
  id: string
  kind: 'surah' | 'all'
  /** Surah options: the surah; "Lihat semua hasil": unused. */
  s: SurahIndexItem | null
  label: string
  href: string
  isRef: boolean
}

const props = defineProps<{ initialQ: string }>()
const emit = defineEmits<{ filter: [run: SearchRun]; showResults: [] }>()

const form = ref<HTMLFormElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const value = ref(props.initialQ)
const open = ref(false)
const active = ref(-1)
const notes = shallowRef<string[]>([])
const options = shallowRef<Opt[]>([])
const count = ref('')

let urlTimer: ReturnType<typeof setTimeout> | undefined
let countTimer: ReturnType<typeof setTimeout> | undefined
const clearTimers = () => {
  clearTimeout(urlTimer)
  clearTimeout(countTimer)
}
onUnmounted(clearTimers)
// A pending ?q= write must not replace the route while leaving home.
onBeforeRouteLeave(() => clearTimeout(urlTimer))

function close() {
  open.value = false
  active.value = -1
}

function setActive(i: number) {
  active.value = i
  if (i < 0) return
  const id = options.value[i].id
  nextTick(() => document.getElementById(id)?.scrollIntoView({ block: 'nearest' }))
}

function choose(o: Opt) {
  if (o.kind === 'surah') {
    clearTimeout(urlTimer)
    const el = document.getElementById(o.id)
    close()
    nav(o.href, el ? el.querySelector('.o-name') : null)
  } else showResults()
}

function showResults() {
  close()
  emit('showResults')
}

function update(raw: string, { announce = true }: { announce?: boolean } = {}) {
  const run = runSearch(raw)
  const { q, ref: hit, results } = run
  emit('filter', run)
  const nextNotes: string[] = []
  const next: Opt[] = []
  if (!q) {
    close()
  } else {
    if (hit) {
      const max = hit.surah.jumlahAyat
      if (hit.ayat >= 1 && hit.ayat <= max)
        next.push({
          id: '',
          kind: 'surah',
          s: hit.surah,
          label: `Buka ${hit.surah.namaLatin} ayat ${hit.ayat}`,
          href: `/surah/${hit.surah.nomor}/${hit.ayat}`,
          isRef: true,
        })
      else nextNotes.push(`${hit.surah.namaLatin} hanya punya ${max} ayat`)
    }
    results.slice(0, MAKS).forEach((s) => next.push({ id: '', kind: 'surah', s, label: s.namaLatin, href: `/surah/${s.nomor}`, isRef: false }))
    if (!results.length) nextNotes.push(NO_MATCH)
    if (results.length > MAKS)
      next.push({ id: 'q-opt-all', kind: 'all', s: null, label: `Lihat semua hasil (${results.length})`, href: '', isRef: false })
    next.forEach((o, i) => {
      if (!o.id) o.id = 'q-opt-' + i
    })
    open.value = true
    active.value = -1
  }
  notes.value = nextNotes
  options.value = next
  if (announce) {
    clearTimeout(countTimer)
    countTimer = setTimeout(() => {
      if (!q) return
      count.value = results.length ? `${results.length} surah cocok` : NO_MATCH
    }, 500)
  }
  clearTimeout(urlTimer)
  urlTimer = setTimeout(() => writeHomeQuery(q ? { q } : {}), 300)
}

function onInput(e: Event) {
  value.value = (e.target as HTMLInputElement).value
  update(value.value)
}

function onFocus() {
  if (value.value.trim() && !open.value) update(value.value, { announce: false })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!open.value && value.value.trim()) update(value.value, { announce: false })
    const list = options.value
    if (!list.length) return
    e.preventDefault()
    const d = e.key === 'ArrowDown' ? 1 : -1
    const a = active.value
    setActive((a + d + list.length + (a < 0 && d < 0 ? 1 : 0)) % list.length)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const o = active.value >= 0 ? options.value[active.value] : null
    if (o) choose(o)
    else if (value.value.trim()) showResults()
  } else if (e.key === 'Escape') {
    if (open.value) {
      e.preventDefault()
      close()
    } else if (value.value) {
      e.preventDefault()
      value.value = ''
      update('')
    }
  }
}

function onListClick(e: MouseEvent) {
  const t = e.target
  const li = t instanceof Element ? t.closest('[role="option"]') : null
  const o = li ? options.value.find((x) => x.id === li.id) : undefined
  if (o) choose(o)
}

useEventListener(document, 'pointerdown', (e) => {
  const f = form.value
  if (f && e.target instanceof Node && !f.contains(e.target)) close()
})

defineExpose({
  /** Put a query from the URL back (?q=), with the list closed. */
  restore(q: string) {
    value.value = q
    update(q, { announce: false })
    close()
  },
  /** Back to an empty field without touching the URL, as a fresh home. */
  reset() {
    clearTimers()
    value.value = ''
    notes.value = []
    options.value = []
    count.value = ''
    close()
    emit('filter', runSearch(''))
  },
  /** "Hapus pencarian" in the index. */
  clearAndFocus() {
    value.value = ''
    update('')
    input.value?.focus()
  },
  focus: () => input.value?.focus(),
})
</script>

<template>
  <div class="h-search">
    <form ref="form" role="search" class="search" @submit.prevent>
      <label for="q" class="search-label">Cari surah</label>
      <div class="field">
        <UiIcon name="search" />
        <input
          id="q"
          ref="input"
          type="search"
          role="combobox"
          :aria-expanded="open ? 'true' : 'false'"
          aria-controls="q-list"
          aria-autocomplete="list"
          :aria-activedescendant="active >= 0 && options[active] ? options[active].id : undefined"
          autocomplete="off"
          enterkeyhint="search"
          spellcheck="false"
          placeholder="Nama, arti, atau nomor surah"
          data-qa="search"
          :value="value"
          @input="onInput"
          @focus="onFocus"
          @keydown="onKeydown"
        />
      </div>
      <ul id="q-list" role="listbox" class="q-list" aria-label="Saran surah" :hidden="!open" @pointerdown.prevent @click="onListClick">
        <li v-for="(n, i) in notes" :key="'n' + i" class="q-note" role="presentation">{{ n }}</li>
        <template v-for="(o, i) in options" :key="o.id">
          <li
            v-if="o.kind === 'surah' && o.s"
            :id="o.id"
            role="option"
            class="q-opt"
            :class="{ 'is-ref': o.isRef }"
            :aria-selected="i === active ? 'true' : 'false'"
            :data-href="o.href"
            data-qa="surah-link"
            :data-surah="o.s.nomor"
          >
            <span class="o-num tnum">{{ o.s.nomor }}</span>
            <span class="o-txt"><span class="o-name">{{ o.label }}</span><span v-if="!sameName(o.s)" class="o-arti">{{ o.s.arti }}</span></span>
            <span class="o-ar" lang="ar" dir="rtl">{{ o.s.nama }}</span>
          </li>
          <li v-else :id="o.id" role="option" class="q-all" data-all="1" :aria-selected="i === active ? 'true' : 'false'">{{ o.label }}</li>
        </template>
      </ul>
      <p class="hint">Bisa langsung ke ayat, misalnya 36:9.</p>
      <p class="sr" aria-live="polite">{{ count }}</p>
    </form>
  </div>
</template>
