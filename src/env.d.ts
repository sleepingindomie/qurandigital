/// <reference types="vite/client" />

import type { vQaAt } from './composables/qaAt'

// v-qa-at is registered globally in main.ts.
declare module 'vue' {
  interface GlobalDirectives {
    vQaAt: typeof vQaAt
  }
}

export {}
