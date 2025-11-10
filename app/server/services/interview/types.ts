// server/services/interview/types.ts

/**
 * Interview session state machine states
 */
export type InterviewState =
  | 'greet'
  | 'ask_role'
  | 'ask_expertise'
  | 'ask_preferences'
  | 'follow_up'
  | 'consult_hr'
  | 'awaiting_review'
  | 'finalize'
  | 'complete'

/**
 * Interview session status
 */
export type InterviewStatus = 'active' | 'pending_review' | 'completed' | 'cancelled'

/**
 * Interview message speaker type
 */
export type InterviewSpeaker = 'interviewer' | 'candidate'

/**
 * Message metadata for tracking question context
 */
export interface InterviewMessageMetadata {
  questionType?: string
  followUpTo?: string
}

/**
 * Individual interview message
 */
export interface InterviewMessage {
  id: string
  speaker: InterviewSpeaker
  message: string
  timestamp: Date
  metadata?: InterviewMessageMetadata
}

/**
 * Candidate preferences collected during interview
 */
export interface CandidatePreferences {
  communicationStyle: string
  workingHours: string
  autonomyLevel: string
}

/**
 * Candidate personality traits
 */
export interface CandidatePersonality {
  traits: string[]
  tone: string
}

/**
 * Candidate profile built from interview responses
 */
export interface CandidateProfile {
  role: string
  expertise: string[]
  preferences: CandidatePreferences
  personality: CandidatePersonality
  systemPrompt?: string
  suggestedName?: string
}

/**
 * Interview session tracking
 */
export interface InterviewSession {
  id: string
  candidateId: string // Placeholder ID before agent created
  teamId: string
  interviewerId: string // HR Manager agent ID
  status: InterviewStatus
  currentState: InterviewState
  transcript: InterviewMessage[]
  candidateProfile: CandidateProfile
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

/**
 * Response analysis result from LLM
 */
export interface AnalysisResult {
  keyInfo: string[]
  clarityScore: number
  needsFollowUp: boolean
  followUpReason: string
}

/**
 * HR specialist recommendation from Director
 */
export interface HRRecommendation {
  systemPrompt: string
  suggestedNames: string[]
  feedback: string
}

/**
 * Interview configuration constants
 */
export interface InterviewConfig {
  maxQuestions: number
  minQuestions: number
  followUpThreshold: number // Clarity score below triggers follow-up
  consultTimeout: number // Milliseconds
  sessionTimeout: number // Milliseconds
  defaultTokenAllocation: {
    worker: number
    manager: number
    director: number
  }
}
