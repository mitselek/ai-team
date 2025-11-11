import { ref, computed } from 'vue'

interface Candidate {
  id: string
  name: string
  email: string
}

interface Question {
  id: string
  text: string
}

interface Response {
  id?: string
  text: string
  questionId?: string
}

interface Interview {
  id: string
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  requester: string
  candidate: Candidate
  questions: Question[]
  responses: Response[]
  createdAt: string
  updatedAt: string
}

const interviews = ref<Interview[]>([])
const currentInterview = ref<Interview | null>(null)

export const useInterview = () => {
  const listInterviews = async () => {
    const response = await fetch('/api/interviews')
    interviews.value = await response.json()
  }

  const getInterview = async (id: string) => {
    const response = await fetch(`/api/interview/${id}`)
    currentInterview.value = await response.json()
  }

  const startInterview = async (requester: string) => {
    const response = await fetch('/api/interview/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requester })
    })
    const newInterview = await response.json()
    interviews.value.push(newInterview)
    return newInterview
  }

  const respondToInterview = async (id: string, response: Response) => {
    const res = await fetch(`/api/interview/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, response })
    })
    currentInterview.value = await res.json()
  }

  const cancelInterview = async (id: string) => {
    await fetch(`/api/interview/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    })
    const index = interviews.value.findIndex((i) => i.id === id)
    if (index !== -1) {
      interviews.value.splice(index, 1)
    }
  }

  return {
    interviews: computed(() => interviews.value),
    currentInterview: computed(() => currentInterview.value),
    listInterviews,
    getInterview,
    startInterview,
    respondToInterview,
    cancelInterview
  }
}
