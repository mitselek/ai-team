import { ref, computed } from 'vue'

interface TranscriptEntry {
  id: string
  speaker: 'interviewer' | 'candidate'
  message: string | { text: string }
  timestamp: string
}

interface CandidateProfile {
  role: string
  expertise: string[]
  preferences: {
    communicationStyle: string
    workingHours: string
    autonomyLevel: string
  }
  personality: {
    traits: string[]
    tone: string
  }
}

interface Interview {
  id: string
  candidateId: string
  teamId: string
  interviewerId: string
  status: 'active' | 'completed' | 'cancelled'
  currentState: string
  transcript: TranscriptEntry[]
  candidateProfile: CandidateProfile
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

  const respondToInterview = async (id: string, responseText: string) => {
    const res = await fetch(`/api/interview/${id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ response: responseText })
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
