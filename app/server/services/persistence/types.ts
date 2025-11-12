export type InterviewStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type InterviewState =
  | 'greeting'
  | 'ask_role'
  | 'ask_expertise'
  | 'ask_preferences'
  | 'ask_personality'
  | 'ask_confirm'
  | 'completed'
  | 'cancelled'

export interface TranscriptEntry {
  id: string
  speaker: 'interviewer' | 'candidate'
  message: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface CandidateProfile {
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

export interface InterviewSession {
  id: string
  candidateId: string
  teamId: string
  interviewerId: string
  status: InterviewStatus
  currentState: InterviewState
  transcript: TranscriptEntry[]
  candidateProfile: CandidateProfile
  createdAt: Date
  updatedAt: Date
}
