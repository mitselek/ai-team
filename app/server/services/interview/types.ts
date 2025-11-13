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
  | 'review_prompt' // Requester reviews generated system prompt
  | 'test_conversation' // Requester tests agent with sample conversation
  | 'assign_details' // Requester assigns name and gender
  | 'complete'

/**
 * Interview session status
 */
export type InterviewStatus = 'active' | 'pending_review' | 'completed' | 'cancelled'

/**
 * Interview message speaker type
 * - interviewer: HR agent (e.g., Marcus)
 * - requester: User requesting to create a new position/agent
 */
export type InterviewSpeaker = 'interviewer' | 'requester'

/**
 * Name option presented to requester during finalization
 */
export interface NameOption {
  name: string
  rationale: string
}

/**
 * Name selection tracking for interview finalization
 */
export interface NameSelection {
  options: NameOption[]
  selectedName: string | null
  selectedAt: Date | null
}

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
  speakerLLM?: string // Format: "provider:model" (e.g., "anthropic:haiku-4.5")
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
 * Agent draft for approval workflow
 * Extended profile with additional fields for agent creation
 */
export interface AgentDraft {
  profile: CandidateProfile
  draftPrompt: string // Generated system prompt for review
  suggestedNames: string[] // Name options for requester
  finalName?: string // Chosen name
  gender?: 'male' | 'female' | 'non-binary' | 'other' // Chosen gender
}

/**
 * Approval actions available to requester
 */
export type ApprovalAction =
  | 'approve_prompt'
  | 'reject_prompt'
  | 'edit_prompt'
  | 'approve_agent'
  | 'reject_agent'
  | 'set_details'

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
  // State machine tracking
  stateHistory?: InterviewState[] // Track state progression
  exchangesInCurrentState?: number // Count Q&A exchanges in current state
  topicsCovered?: string[] // Track which topics have been addressed
  // Approval workflow tracking
  agentDraft?: AgentDraft // Draft agent for review/testing
  testConversationHistory?: InterviewMessage[] // Messages during test phase
  nameSelection?: NameSelection // Name options and selection tracking
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
  speakerLLM?: string // Format: "provider:model" (e.g., "anthropic:sonnet-4.5")
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
