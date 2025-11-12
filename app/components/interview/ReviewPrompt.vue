<template>
  <div class="space-y-4 rounded-lg bg-white p-6 shadow-sm">
    <h2 class="text-2xl font-semibold text-gray-900">Review Interview Prompt</h2>
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p class="whitespace-pre-wrap text-gray-700">{{ prompt || 'No prompt available' }}</p>
    </div>
    <div v-if="!isEditing" class="flex gap-3">
      <button
        @click="emit('approve')"
        class="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
      >
        Approve
      </button>
      <button
        @click="emit('reject')"
        class="rounded-lg bg-red-600 px-6 py-2 text-white transition-colors hover:bg-red-700"
      >
        Reject
      </button>
      <button
        @click="startEditing"
        class="rounded-lg bg-yellow-600 px-6 py-2 text-white transition-colors hover:bg-yellow-700"
      >
        Edit
      </button>
    </div>
    <div v-if="isEditing" class="space-y-3">
      <textarea
        v-model="editedPromptText"
        class="h-40 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Edit the prompt..."
      ></textarea>
      <div class="flex gap-3">
        <button
          @click="handleSave"
          class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Save
        </button>
        <button
          @click="cancelEditing"
          class="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  prompt: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  approve: []
  reject: []
  save: [newPrompt: string]
}>()

const isEditing = ref(false)
const editedPromptText = ref('')

const startEditing = () => {
  editedPromptText.value = props.prompt
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  editedPromptText.value = ''
}

const handleSave = () => {
  if (editedPromptText.value.trim()) {
    emit('save', editedPromptText.value)
    isEditing.value = false
  }
}

watch(
  () => props.prompt,
  () => {
    if (isEditing.value) {
      editedPromptText.value = props.prompt
    }
  }
)
</script>
