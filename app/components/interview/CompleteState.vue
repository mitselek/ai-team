<template>
  <div class="space-y-4 rounded-lg bg-white p-6 shadow-sm">
    <div class="text-center">
      <div class="mb-4 text-6xl">✓</div>
      <h2 class="mb-2 text-2xl font-semibold text-green-600">Agent Created Successfully!</h2>
      <p class="mb-4 text-gray-700">Your new agent is ready to join the team.</p>
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
        <p><strong>Agent ID:</strong> {{ agentId || 'N/A' }}</p>
        <p><strong>Name:</strong> {{ name || 'N/A' }}</p>
        <p><strong>Gender:</strong> {{ gender || 'N/A' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  agentId?: string
  name?: string
  gender?: string
}

defineProps<Props>()
</script>
