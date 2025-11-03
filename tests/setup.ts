import { beforeAll, afterEach, afterAll } from 'vitest'
import { ref, computed, watch } from 'vue'

// Make Vue reactivity available globally for composable tests
;(global as any).ref = ref
;(global as any).computed = computed
;(global as any).watch = watch

beforeAll(() => {
  // Setup test environment
})

afterEach(() => {
  // Reset state between tests
})

afterAll(() => {
  // Cleanup after all tests
})
