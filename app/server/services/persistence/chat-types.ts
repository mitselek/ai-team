export interface ChatSession {
  id: string // sessionId (UUID v4)
  agentId: string
  organizationId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  id: string // UUID v4
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  tokensUsed?: number // Optional: Track LLM token usage
}
