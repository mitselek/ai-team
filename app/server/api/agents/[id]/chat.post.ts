import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { agents } from '../../../data/agents'
import { generateCompletion } from '../../../services/llm'

const logger = createLogger('api.agents.chat')

interface ChatRequest {
  message: string
  sessionId?: string
}

interface ChatResponse {
  response: string
  sessionId: string
  timestamp: string
}

interface ErrorResponse {
  error: string
}

export default defineEventHandler(async (event): Promise<ChatResponse | ErrorResponse> => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const agentId = event.context.params?.id
  if (!agentId) {
    log.warn('Missing agentId')
    setResponseStatus(event, 400)
    return { error: 'agentId is required' }
  }

  log.info({ agentId }, 'Received request to chat with agent')

  let body: ChatRequest
  try {
    body = await readBody<ChatRequest>(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  const { message, sessionId } = body
  if (!message || message.trim() === '') {
    log.warn({ message }, 'Missing required field: message')
    setResponseStatus(event, 400)
    return { error: 'message is required' }
  }

  // Find agent
  const agent = agents.find((a) => a.id === agentId)
  if (!agent) {
    log.warn({ agentId }, 'Agent not found')
    setResponseStatus(event, 404)
    return { error: 'Agent not found' }
  }

  // Validate agent is active
  if (agent.status !== 'active') {
    log.warn({ agentId, status: agent.status }, 'Agent is not active')
    setResponseStatus(event, 400)
    return { error: 'Agent is not active' }
  }

  // Generate or use provided sessionId
  const finalSessionId = sessionId || uuidv4()

  log.info({ agentId, sessionId: finalSessionId }, 'Processing chat request')

  try {
    // Construct prompt with agent's system prompt as context
    const prompt = `${agent.systemPrompt}

User message: ${message}

Please respond to the user's message.`

    // Generate completion using LLM service
    const llmResponse = await generateCompletion(prompt, {
      agentId: agent.id,
      agentRole: agent.role,
      correlationId
    })

    const timestamp = new Date().toISOString()

    log.info(
      {
        agentId,
        sessionId: finalSessionId,
        tokensUsed: llmResponse.tokensUsed.total
      },
      'Chat response generated successfully'
    )

    return {
      response: llmResponse.content,
      sessionId: finalSessionId,
      timestamp
    }
  } catch (error: unknown) {
    log.error({ error, agentId, sessionId: finalSessionId }, 'Failed to generate chat response')
    setResponseStatus(event, 500)
    return { error: 'Failed to generate chat response' }
  }
})
