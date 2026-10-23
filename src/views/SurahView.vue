<script setup lang="ts">
// The reader route (/surah/:n and /surah/:n/:ayat). Vue Router reuses this view
// from /surah/36 to /surah/37 (and to /surah/36/12 from the navigation sheet),
// so the reader itself is keyed by the navigation: every real navigation mounts
// a fresh ReaderPage with fresh state. The medallion link's quiet URL write
// keeps the same navigation and leaves the page in place.
import { onBeforeUnmount, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteParamsGeneric } from 'vue-router'
import { parseSurahParams } from '@/router'
import { arrival } from '@/composables/useNav'
import type { Arrival } from '@/composables/useNav'
import ReaderPage from '@/components/reader/ReaderPage.vue'

interface Page {
  key: string
  n: number
  ayat: number | null
  arrival: Arrival
}

function pageFor(params: RouteParamsGeneric): Page {
  const { n, ayat } = parseSurahParams(params)
  const a = arrival.value
  return { key: `${n}:${a.seq}`, n, ayat, arrival: a }
}

const route = useRoute()
const page = shallowRef<Page>(pageFor(route.params))

// afterEach runs once the route and the arrival both belong to the new
// navigation (useNav's own afterEach, registered first, sets the arrival).
const off = useRouter().afterEach((to, _from, failure) => {
  if (failure || to.name !== 'surah') return
  if (arrival.value.seq === page.value.arrival.seq) return
  page.value = pageFor(to.params)
})
onBeforeUnmount(off)
</script>

<template>
  <ReaderPage :key="page.key" :n="page.n" :ayat="page.ayat" :arrival="page.arrival" />
</template>
