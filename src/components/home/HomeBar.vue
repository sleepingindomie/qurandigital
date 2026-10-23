<script setup lang="ts">
// The home top bar: wordmark, the desktop section links, the Menu button below
// 1100 and the theme button. Ditandai uses it too, so it renders the bar
// content only; the view teleports it into #bar-slot.
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import UiIcon from '@/components/ui/UiIcon.vue'
import { useSettingsStore } from '@/stores/settings'
import { PANEL, useUiStore } from '@/stores/ui'
import { onHomeArrival, queryString } from './homeRoute'

type NavKey = 'surah' | 'juz' | 'waktu' | 'tanda'

const settings = useSettingsStore()
const ui = useUiStore()
const route = useRoute()
const menu = ref<HTMLButtonElement | null>(null)

// The current item is read when the page is reached, not when home quietly
// writes ?tab=juz.
const currentKey = (to: RouteLocationNormalized): NavKey =>
  to.name === 'home' && queryString(to.query.tab) === 'juz' ? 'juz' : to.name === 'tanda' ? 'tanda' : 'surah'
const cur = ref<NavKey>(currentKey(route))
onHomeArrival((to) => (cur.value = currentKey(to)))

const links: { text: string; href: string; key: NavKey; sec?: string }[] = [
  { text: 'Daftar Surah', href: '/', key: 'surah', sec: 'indeks' },
  { text: 'Juz', href: '/?tab=juz', key: 'juz', sec: 'indeks' },
  { text: 'Waktu Salat', href: '/', key: 'waktu', sec: 'waktu' },
  { text: 'Ditandai', href: '/tanda', key: 'tanda' },
]

const openMenu = () => ui.openPanel(PANEL.homeMenu, { anchor: menu.value, opener: menu.value })
</script>

<template>
  <div class="bar-in wrap">
    <a href="/" class="wordmark" data-qa="home">Al-Quran Digital</a>
    <nav class="nav-desk" aria-label="Utama">
      <a
        v-for="l in links"
        :key="l.text"
        :href="l.href"
        class="nav-a"
        :data-sec="l.sec"
        :aria-current="l.key === cur ? 'page' : undefined"
        >{{ l.text }}</a
      >
    </nav>
    <div class="bar-end">
      <button ref="menu" type="button" class="txt-btn menu-btn" aria-haspopup="dialog" @click="openMenu">Menu</button>
      <button
        type="button"
        class="ib theme-btn"
        data-qa="theme"
        :aria-label="settings.isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'"
        @click="settings.changeTheme('toggle')"
      >
        <UiIcon :name="settings.isDark ? 'sun' : 'moon'" />
      </button>
    </div>
  </div>
</template>
