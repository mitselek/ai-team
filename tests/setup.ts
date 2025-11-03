import { beforeAll, afterEach, afterAll } from 'vitest'
import * as Vue from 'vue'

// Make Vue reactivity available globally for composable tests (typed)
declare global {
  // Augment the GlobalThis interface to add typed helpers for tests
  // This avoids redeclaration of block-scoped variables
  interface GlobalThis {
    ref: typeof Vue.ref
    computed: typeof Vue.computed
    watch: typeof Vue.watch
  }
}

const g = globalThis as unknown as {
  ref: typeof Vue.ref
  computed: typeof Vue.computed
  watch: typeof Vue.watch
}
g.ref = Vue.ref
g.computed = Vue.computed
g.watch = Vue.watch

beforeAll(() => {
  // Setup test environment
})

afterEach(() => {
  // Reset state between tests
})

afterAll(() => {
  // Cleanup after all tests
})
