import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Bookmark } from '@/types'

export const useBookmarkStore = defineStore('bookmark', () => {
  const STORAGE_KEY = 'quran_bookmarks'

  // State
  const bookmarks = ref<Bookmark[]>([])

  // Getters
  const hasBookmarks = computed(() => bookmarks.value.length > 0)
  const bookmarkCount = computed(() => bookmarks.value.length)

  // Actions
  function loadBookmarks() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        bookmarks.value = JSON.parse(saved)
        console.log(`📚 Loaded ${bookmarks.value.length} bookmarks`)
      } catch (err) {
        console.error('Failed to load bookmarks:', err)
        bookmarks.value = []
      }
    }
  }

  function saveBookmarks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks.value))
  }

  function addBookmark(bookmark: Omit<Bookmark, 'id' | 'timestamp'>) {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: `${bookmark.surahNumber}-${bookmark.ayahNumber}`,
      timestamp: Date.now()
    }

    bookmarks.value.unshift(newBookmark)
    saveBookmarks()
    console.log('✅ Bookmark added')
  }

  function removeBookmark(surahNumber: number, ayahNumber: number) {
    const id = `${surahNumber}-${ayahNumber}`
    bookmarks.value = bookmarks.value.filter(b => b.id !== id)
    saveBookmarks()
    console.log('🗑️ Bookmark removed')
  }

  function toggleBookmark(bookmark: Omit<Bookmark, 'id' | 'timestamp'>): boolean {
    const exists = isBookmarked(bookmark.surahNumber, bookmark.ayahNumber)

    if (exists) {
      removeBookmark(bookmark.surahNumber, bookmark.ayahNumber)
      return false
    } else {
      addBookmark(bookmark)
      return true
    }
  }

  function isBookmarked(surahNumber: number, ayahNumber: number): boolean {
    const id = `${surahNumber}-${ayahNumber}`
    return bookmarks.value.some(b => b.id === id)
  }

  function clearAllBookmarks() {
    bookmarks.value = []
    saveBookmarks()
    console.log('🗑️ All bookmarks cleared')
  }

  return {
    bookmarks,
    hasBookmarks,
    bookmarkCount,
    loadBookmarks,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    clearAllBookmarks
  }
})
