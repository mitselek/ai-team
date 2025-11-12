// Re-export interview types from the interview service
// This ensures we use the same type definitions across persistence and interview modules
export type {
  InterviewSession,
  InterviewStatus,
  InterviewState,
  InterviewMessage,
  InterviewSpeaker,
  InterviewMessageMetadata,
  CandidateProfile,
  CandidatePreferences,
  CandidatePersonality
} from '../interview/types'
