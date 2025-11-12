<template>
  <div class="space-y-4 rounded-lg bg-white p-6 shadow-sm">
    <h2 class="text-2xl font-semibold text-gray-900">Assign Agent Details</h2>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700">Suggested Names</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="name in nameSuggestions"
          :key="name"
          @click="selectName(name)"
          class="rounded-full border px-4 py-2 transition-colors"
          :class="
            selectedNameValue === name
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500'
          "
        >
          {{ name }}
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700">Agent Name</label>
      <input
        v-model="selectedNameValue"
        type="text"
        placeholder="Enter agent name"
        class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p v-if="nameError" class="text-sm text-red-600">{{ nameError }}</p>
    </div>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-gray-700">Gender</label>
      <div class="flex gap-4">
        <label class="flex items-center">
          <input v-model="selectedGenderValue" type="radio" value="male" class="mr-2" />
          <span>Male</span>
        </label>
        <label class="flex items-center">
          <input v-model="selectedGenderValue" type="radio" value="female" class="mr-2" />
          <span>Female</span>
        </label>
        <label class="flex items-center">
          <input v-model="selectedGenderValue" type="radio" value="neutral" class="mr-2" />
          <span>Neutral</span>
        </label>
      </div>
      <p v-if="genderError" class="text-sm text-red-600">{{ genderError }}</p>
    </div>

    <button
      @click="handleCreate"
      class="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
    >
      Create Agent
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  nameSuggestions: string[]
  selectedName: string
  selectedGender: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  create: [name: string, gender: string]
  'update:selectedName': [name: string]
  'update:selectedGender': [gender: string]
}>()

const selectedNameValue = ref(props.selectedName)
const selectedGenderValue = ref(props.selectedGender)
const nameError = ref('')
const genderError = ref('')

watch(
  () => props.selectedName,
  (newValue) => {
    selectedNameValue.value = newValue
  }
)

watch(
  () => props.selectedGender,
  (newValue) => {
    selectedGenderValue.value = newValue
  }
)

watch(selectedNameValue, (newValue) => {
  emit('update:selectedName', newValue)
})

watch(selectedGenderValue, (newValue) => {
  emit('update:selectedGender', newValue)
})

const selectName = (name: string) => {
  selectedNameValue.value = name
}

const handleCreate = () => {
  nameError.value = ''
  genderError.value = ''

  if (!selectedNameValue.value || selectedNameValue.value.trim().length < 2) {
    nameError.value = 'Name must be at least 2 characters'
    return
  }

  if (!selectedGenderValue.value) {
    genderError.value = 'Please select a gender'
    return
  }

  emit('create', selectedNameValue.value, selectedGenderValue.value)
}
</script>
