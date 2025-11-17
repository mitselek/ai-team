<template>
  <div class="rounded-lg bg-white p-6 shadow">
    <h2 class="mb-4 text-2xl font-bold">Email MCP Tools</h2>

    <div v-if="!toolsLoaded" class="mb-4">
      <button
        @click="loadTools"
        :disabled="loading"
        class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {{ loading ? 'Loading...' : 'Load Email Tools' }}
      </button>
    </div>

    <div v-if="error" class="mb-4 text-red-600">{{ error }}</div>

    <div v-if="toolsLoaded" class="space-y-4">
      <div v-for="tool in emailTools" :key="tool.name" class="rounded border p-4">
        <h3 class="font-bold">{{ tool.name }}</h3>
        <p class="text-sm text-gray-600">{{ tool.description }}</p>

        <button
          @click="testTool(tool.name)"
          class="mt-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Test Tool
        </button>
      </div>

      <div v-if="testResult" class="mt-4 rounded bg-gray-100 p-4">
        <h4 class="mb-2 font-bold">Test Result:</h4>
        <pre class="overflow-auto text-sm">{{ JSON.stringify(testResult, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(false)
const toolsLoaded = ref(false)
const error = ref<string | null>(null)
const emailTools = ref<any[]>([])
const testResult = ref<any>(null)

async function loadTools() {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/tools')
    const data = await response.json()
    emailTools.value = data.tools?.email || []
    toolsLoaded.value = true
  } catch (e) {
    error.value = 'Failed to load tools: ' + String(e)
  } finally {
    loading.value = false
  }
}

async function testTool(toolName: string) {
  try {
    const args = getTestArgs(toolName)

    const response = await fetch('/api/tools-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'test-agent',
        serverName: 'email',
        toolName,
        arguments: args
      })
    })

    const data = await response.json()
    testResult.value = data
  } catch (e) {
    testResult.value = { error: String(e) }
  }
}

function getTestArgs(toolName: string) {
  switch (toolName) {
    case 'read_inbox':
      return { limit: 3 }
    case 'search_emails':
      return { query: 'test', limit: 5 }
    case 'mark_as_read':
      return { subject: 'test' }
    case 'send_email':
      return { to: 'test@example.com', subject: 'Test', body: 'Test email' }
    default:
      return {}
  }
}
</script>
