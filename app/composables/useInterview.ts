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
  const listInterviews = async (teamId: string) => {
    const response = await fetch(`/api/interviews?teamId=${teamId}`)
    interviews.value = await response.json()
  }

  const getInterview = async (id: string) => {
    const response = await fetch(`/api/interview/${id}`)
    currentInterview.value = await response.json()
  }

  const startInterview = async (teamId: string, interviewerId: string) => {
    const response = await fetch('/api/interview/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ teamId, interviewerId })
    })
    const newInterview = await response.json()
    await listInterviews(teamId)
    return newInterview
  }

  const respondToInterview = async (id: string, response: Response) => {
    const res = await fetch(`/api/interview/${id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ response })
    })
    currentInterview.value = await res.json()
  }

  const cancelInterview = async (id: string) => {
    await fetch(`/api/interview/${id}/cancel`, {
      method: 'POST'
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
