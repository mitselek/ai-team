import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import type { Logger } from 'pino'
import { agents } from '../../../data/agents'
import { generateCompletion } from '../../../services/llm'
import {
  saveChatSession,
  loadChatSession,
  loadOrganization,
  loadTeams
} from '../../../services/persistence/filesystem'
import type { ChatSession, ChatMessage } from '../../../services/persistence/chat-types'
import type { Organization, Agent, Team } from '@@/types'
import {
  getAvailableTools,
  validateToolAccess,
  createToolRegistry
} from '../../../services/orchestrator'
import type { ToolCall } from '../../../services/llm/types'

const logger = createLogger('api.agents.chat')

/**
 * Build prompt to generate a concise topic for the conversation
 */
function buildTopicPrompt(messages: ChatMessage[]): string {
  const conversationSummary = messages
    .slice(0, 6) // Use first 6 messages for topic generation
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Agent'
      const content = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content
      return `${role}: ${content}`
    })
    .join('\n\n')

  return `Based on the following conversation, generate a very brief topic/title (3-6 words maximum) that captures the main subject. Respond with ONLY the topic, no explanations or punctuation:

${conversationSummary}

Topic:`
}

/**
 * Execute tool calls for chat via orchestrator.
 * Returns array of tool results.
 */
async function executeToolCalls(
  toolCalls: ToolCall[],
  agent: Agent,
  organization: Organization,
  team: Team | undefined,
  log: Logger
): Promise<unknown[]> {
  const results: unknown[] = []
  const correlationId = (log.bindings().correlationId as string) || 'unknown'

  // Get tool registry for executing real filesystem operations
  const registry = createToolRegistry()

  for (const toolCall of toolCalls) {
    try {
      // Validate access (pre-check before orchestrator execution)
      const hasAccess = validateToolAccess(toolCall.name, organization, agent, team)
      if (!hasAccess) {
        results.push({ error: `Access denied to tool: ${toolCall.name}` })
        continue
      }

      // Execute tool via orchestrator (real filesystem operations)
      const result = await registry.executeTool(
        toolCall.name,
        toolCall.arguments,
        {
          agentId: agent.id,
          organizationId: organization.id,
          correlationId
        },
        organization,
        agent,
        team
      )

      results.push(result)

      log.info({
        agentId: agent.id,
        toolName: toolCall.name,
        success: true
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.push({ error: errorMessage })

      log.error({
        agentId: agent.id,
        toolName: toolCall.name,
        error: errorMessage
      })
    }
  }

  return results
}

interface ChatRequest {
  message: string
  sessionId?: string
}

interface ChatResponse {
  response: string
  sessionId: string
  timestamp: string
  topic?: string
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

  // Load existing session or create new
  let chatSession: ChatSession
  const finalSessionId = sessionId || uuidv4()

  if (sessionId) {
    const existing = await loadChatSession(agentId, sessionId, agent.organizationId)
    if (existing) {
      chatSession = existing
      log.info(
        { sessionId, messageCount: existing.messages.length },
        'Loaded existing chat session'
      )
    } else {
      log.warn({ sessionId }, 'Session not found, creating new session')
      chatSession = {
        id: finalSessionId,
        agentId,
        organizationId: agent.organizationId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  } else {
    log.info({ sessionId: finalSessionId }, 'Creating new chat session')
    chatSession = {
      id: finalSessionId,
      agentId,
      organizationId: agent.organizationId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  log.info({ agentId, sessionId: finalSessionId }, 'Processing chat request')

  try {
    // Load organization and team for tool access
    const organization = await loadOrganization(agent.organizationId)
    if (!organization) {
      log.error({ organizationId: agent.organizationId }, 'Organization not found')
      setResponseStatus(event, 500)
      return { error: 'Organization configuration error' }
    }

    const teams = await loadTeams(agent.organizationId)
    const agentTeam = agent.teamId ? teams.find((t) => t.id === agent.teamId) : undefined

    // Get available tools for this agent
    const availableTools = getAvailableTools(organization, agent, agentTeam)

    log.info({
      agentId,
      toolCount: availableTools.length,
      toolNames: availableTools.map((t) => t.name)
    })

    // Build conversation history from session messages
    // Convert stored messages to the format needed for the LLM
    let conversationHistory = ''

    // Include previous messages from session for context
    if (chatSession.messages.length > 0) {
      conversationHistory = chatSession.messages
        .map((msg) => {
          const role = msg.role === 'user' ? 'User' : agent.name
          return `${role}: ${msg.content}`
        })
        .join('\n\n')
      conversationHistory += '\n\n'
    }

    // Construct prompt with agent's system prompt, conversation history, and current message
    const prompt = `${agent.systemPrompt}

${conversationHistory}User: ${message}

Please respond to the user's message, taking into account the conversation history above.`

    // Simple tool loop (max 15 iterations for chat to keep it responsive)
    const MAX_CHAT_ITERATIONS = 15
    let iteration = 0
    let finalResponse = ''
    let currentPrompt = prompt

    while (iteration < MAX_CHAT_ITERATIONS) {
      iteration++

      log.info({
        agentId,
        sessionId: finalSessionId,
        iteration,
        maxIterations: MAX_CHAT_ITERATIONS,
        historyLength: chatSession.messages.length
      })

      // Generate completion using LLM service with tools
      const llmResponse = await generateCompletion(currentPrompt, {
        agentId: agent.id,
        agentRole: agent.role,
        correlationId,
        tools: availableTools.length > 0 ? availableTools : undefined
      })

      // Check if LLM wants to use tools
      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        log.info({
          agentId,
          toolCallCount: llmResponse.toolCalls.length,
          tools: llmResponse.toolCalls.map((tc) => tc.name)
        })

        // Execute tool calls
        const toolResults = await executeToolCalls(
          llmResponse.toolCalls,
          agent,
          organization,
          agentTeam,
          log
        )

        // Add tool results to prompt for next iteration
        const toolResultsText = toolResults
          .map((result, idx) => {
            const toolCall = llmResponse.toolCalls![idx]
            return `Tool ${toolCall.name} result: ${JSON.stringify(result)}`
          })
          .join('\n')

        // Update prompt with tool results for next iteration
        currentPrompt = `${currentPrompt}

Assistant used tools: ${llmResponse.content}

Tool execution results:
${toolResultsText}

Please continue your response to the user.`

        // Continue loop - next iteration will call LLM with updated prompt
        continue
      }

      // No tool calls, this is the final response
      finalResponse = llmResponse.content
      break
    }

    if (iteration >= MAX_CHAT_ITERATIONS) {
      log.warn({
        agentId,
        sessionId: finalSessionId,
        iterations: iteration
      })
      finalResponse =
        finalResponse ||
        'I apologize, but I reached the tool execution limit. Please try rephrasing your request.'
    }

    const timestamp = new Date().toISOString()

    // Persist messages: user message then agent message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    chatSession.messages.push(userMessage)

    const agentMessage: ChatMessage = {
      id: uuidv4(),
      role: 'agent',
      content: finalResponse,
      timestamp: new Date(),
      tokensUsed: 0 // TODO: Track total tokens across all iterations
    }
    chatSession.messages.push(agentMessage)

    chatSession.updatedAt = new Date()

    // Generate topic based on conversation (async, after first few messages)
    if (chatSession.messages.length >= 2) {
      try {
        const topicPrompt = buildTopicPrompt(chatSession.messages)
        const topicResponse = await generateCompletion(topicPrompt, {
          agentId: agent.id,
          agentRole: agent.role,
          correlationId
        })
        // Extract clean topic (remove quotes, trim)
        chatSession.topic = topicResponse.content.replace(/^["']|["']$/g, '').trim()
        log.info(
          { agentId, sessionId: finalSessionId, topic: chatSession.topic },
          'Topic generated'
        )
      } catch (err) {
        log.warn({ agentId, sessionId: finalSessionId, error: err }, 'Failed to generate topic')
        // Continue without topic - not critical
      }
    }

    await saveChatSession(chatSession)

    log.info(
      {
        agentId,
        sessionId: finalSessionId,
        tokensUsed: 0,
        messageCount: chatSession.messages.length,
        iterations: iteration,
        topic: chatSession.topic
      },
      'Chat response generated and persisted successfully'
    )

    return {
      response: finalResponse,
      sessionId: finalSessionId,
      timestamp,
      topic: chatSession.topic
    }
  } catch (error: unknown) {
    log.error({ error, agentId, sessionId: finalSessionId }, 'Failed to generate chat response')
    setResponseStatus(event, 500)
    return { error: 'Failed to generate chat response' }
  }
})
