<script setup lang="ts">
// Home (home.js renderHome()): prayer times, search and the resume block in
// the hero, then the index. The search filters the index; ?q= and ?tab=juz
// come back from the URL, and a real navigation to home while it is shown
// (the wordmark from /?q=kahf) puts it back the way a fresh render would.
import { onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import HomeBar from '@/components/home/HomeBar.vue'
import HomePrayer from '@/components/home/HomePrayer.vue'
import HomeSearch from '@/components/home/HomeSearch.vue'
import HomeResume from '@/components/home/HomeResume.vue'
import HomeIndex from '@/components/home/HomeIndex.vue'
import { onHomeArrival, queryString } from '@/components/home/homeRoute'
import { runSearch } from '@/components/home/search'
import type { HomeFilter, IndexTab, SearchRun } from '@/components/home/search'
import { arrival } from '@/composables/useNav'
import { sessionGet, sessionSet } from '@/lib/storage'

const route = useRoute()

const prayerRef = ref<InstanceType<typeof HomePrayer> | null>(null)
const searchRef = ref<InstanceType<typeof HomeSearch> | null>(null)
const resumeRef = ref<InstanceType<typeof HomeResume> | null>(null)
const indexRef = ref<InstanceType<typeof HomeIndex> | null>(null)

const tabFrom = (): IndexTab => (queryString(route.query.tab) === 'juz' ? 'juz' : 'surah')

// The first render already carries the query from the URL, so all rows (or
// the matches) are there at once and the scroll position can be restored.
const initialQ = queryString(route.query.q)
const first = runSearch(initialQ)
const initialTab: IndexTab = first.q ? 'surah' : tabFrom()
const filter = shallowRef<HomeFilter>({ q: first.q, results: first.results })

const onFilter = (run: SearchRun) => (filter.value = { q: run.q, results: run.results })

onHomeArrival((to) => {
  if (to.name !== 'home') return
  const q = queryString(to.query.q)
  if (q) searchRef.value?.restore(q)
  else {
    searchRef.value?.reset()
    indexRef.value?.setTab(queryString(to.query.tab) === 'juz' ? 'juz' : 'surah', { fade: false })
  }
})

onMounted(() => {
  prayerRef.value?.firstDraw()
  if (!sessionGet('qd:drawn')) {
    sessionSet('qd:drawn', '1')
    if (!arrival.value.viaFrame) resumeRef.value?.drawFrame(0)
  }
})
</script>

<template>
  <Teleport defer to="#bar-slot">
    <HomeBar />
  </Teleport>
  <div class="home">
    <h1 class="sr">Al-Quran Digital</h1>
    <div class="hero wrap">
      <HomePrayer ref="prayerRef" />
      <HomeSearch ref="searchRef" :initial-q="initialQ" @filter="onFilter" @show-results="indexRef?.scrollIntoView()" />
      <HomeResume ref="resumeRef" />
    </div>
    <HomeIndex ref="indexRef" :filter="filter" :initial-tab="initialTab" @clear="searchRef?.clearAndFocus()" />
  </div>
</template>
