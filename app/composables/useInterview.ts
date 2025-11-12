import { ref, computed } from 'vue'

interface TranscriptEntry {
  id: string
  speaker: 'interviewer' | 'requester'
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
  systemPrompt?: string
  suggestedName?: string
}

interface AgentDraft {
  profile: CandidateProfile
  generatedPrompt: string
  suggestedNames: string[]
  finalDetails?: {
    name: string
    gender: string
  }
}

interface Interview {
  id: string
  candidateId: string
  teamId: string
  interviewerId: string
  status: 'active' | 'pending_review' | 'completed' | 'cancelled'
  currentState:
    | 'greet'
    | 'ask_role'
    | 'ask_expertise'
    | 'ask_preferences'
    | 'follow_up'
    | 'consult_hr'
    | 'awaiting_review'
    | 'finalize'
    | 'review_prompt'
    | 'test_conversation'
    | 'assign_details'
    | 'complete'
  transcript: TranscriptEntry[]
  candidateProfile: CandidateProfile
  createdAt: string
  updatedAt: string
  agentDraft?: AgentDraft
  testConversationHistory?: TranscriptEntry[]
  agentId?: string
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
    const result = await response.json()
    await listInterviews(teamId)
    // The API returns sessionId, not id
    return { id: result.sessionId, ...result }
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

  // F013 Approval Workflow Functions

  const approvePrompt = async (id: string) => {
    const res = await fetch(`/api/interview/${id}/approve-prompt`, {
      method: 'POST'
    })
    currentInterview.value = await res.json()
  }

  const rejectPrompt = async (id: string) => {
    const res = await fetch(`/api/interview/${id}/reject-prompt`, {
      method: 'POST'
    })
    currentInterview.value = await res.json()
  }

  const editPrompt = async (id: string, newPrompt: string) => {
    const res = await fetch(`/api/interview/${id}/edit-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: newPrompt })
    })
    currentInterview.value = await res.json()
  }

  const sendTestMessage = async (id: string, message: string) => {
    const res = await fetch(`/api/interview/${id}/test-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    })
    currentInterview.value = await res.json()
  }

  const getTestHistory = async (id: string) => {
    const res = await fetch(`/api/interview/${id}/test-history`)
    return await res.json()
  }

  const clearTestHistory = async (id: string) => {
    const res = await fetch(`/api/interview/${id}/clear-test-history`, {
      method: 'POST'
    })
    currentInterview.value = await res.json()
  }

  const approveAgent = async (id: string) => {
    const res = await fetch(`/api/interview/${id}/approve-agent`, {
      method: 'POST'
    })
    currentInterview.value = await res.json()
  }

  const rejectAgent = async (id: string) => {
    const res = await fetch(`/api/interview/${id}/reject-agent`, {
      method: 'POST'
    })
    currentInterview.value = await res.json()
  }

  const getNameSuggestions = async (id: string) => {
    const res = await fetch(`/api/interview/${id}/name-suggestions`)
    return await res.json()
  }

  const setAgentDetails = async (id: string, name: string, gender: string) => {
    const res = await fetch(`/api/interview/${id}/set-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, gender })
    })
    currentInterview.value = await res.json()
  }

  return {
    interviews: computed(() => interviews.value),
    currentInterview: computed(() => currentInterview.value),
    listInterviews,
    getInterview,
    startInterview,
    respondToInterview,
    cancelInterview,
    // F013 Approval Workflow
    approvePrompt,
    rejectPrompt,
    editPrompt,
    sendTestMessage,
    getTestHistory,
    clearTestHistory,
    approveAgent,
    rejectAgent,
    getNameSuggestions,
    setAgentDetails
  }
}
