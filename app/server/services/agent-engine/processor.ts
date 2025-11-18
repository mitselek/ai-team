// server/services/agent-engine/processor.ts

import type { Agent, Task, Organization, Team } from '@@/types'
import { createLogger } from '../../utils/logger'
import type { Logger } from 'pino'
import { generateCompletion } from '../llm'
import { assessDelegation, selectSubordinate, delegateTask } from './delegation'
import { reportCompletion, escalateFailure } from './status'
import { getAvailableTools, validateToolAccess, createToolRegistry } from '../orchestrator'
import { loadOrganization, loadTeams } from '../persistence/filesystem'
import type { ToolCall, LLMServiceOptions } from '../llm/types'
import { incrementWorkload, decrementWorkload } from '../workload-tracking'

const logger = createLogger('agent-engine:processor')

/**
 * Represents a single message in the conversation history.
 * Supports user messages, assistant responses, and tool results.
 */
interface ConversationMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string // For tool result messages
  toolName?: string // For tool result messages
}

function buildTaskPrompt(task: Task): string {
  return `You are an AI agent. Your task is to complete the following objective:
Title: ${task.title}
Description: ${task.description}
Priority: ${task.priority}

Provide your response as a structured result.
`
}

/**
 * Build a prompt from conversation history.
 *
 * For now, simple concatenation. Can be enhanced later with
 * provider-specific formatting.
 *
 * @param history - Conversation history
 * @returns Formatted prompt string
 */
function buildConversationPrompt(history: ConversationMessage[]): string {
  return history
    .map((msg) => {
      if (msg.role === 'user') {
        return `User: ${msg.content}`
      } else if (msg.role === 'assistant') {
        let text = `Assistant: ${msg.content}`
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          text += `\n[Tool calls requested: ${msg.toolCalls.map((tc) => tc.name).join(', ')}]`
        }
        return text
      } else if (msg.role === 'tool') {
        return `Tool (${msg.toolName}): ${msg.content}`
      }
      return ''
    })
    .join('\n\n')
}

/**
 * Execute tool calls requested by LLM and add results to conversation.
 *
 * @param toolCalls - Array of tool calls from LLM
 * @param agent - Agent executing tools
 * @param organization - Organization for tool validation
 * @param team - Optional team for validation
 * @param conversationHistory - Conversation history to append results to
 * @param log - Logger instance
 */
async function executeToolCalls(
  toolCalls: ToolCall[],
  agent: Agent,
  organization: Organization,
  team: Team | undefined,
  conversationHistory: ConversationMessage[],
  log: Logger
): Promise<void> {
  log.info({
    message: '[PROCESSOR] Executing tool calls',
    agentId: agent.id,
    toolCallCount: toolCalls.length,
    tools: toolCalls.map((tc) => tc.name)
  })

  for (const toolCall of toolCalls) {
    try {
      // Validate access
      const hasAccess = validateToolAccess(toolCall.name, organization, agent, team)
      if (!hasAccess) {
        throw new Error(`Agent ${agent.id} does not have access to tool: ${toolCall.name}`)
      }

      // Execute tool via orchestrator (real filesystem operations)
      const result = await executeToolCall(toolCall, agent, organization, team, log)

      // Add tool result to conversation
      conversationHistory.push({
        role: 'tool',
        content: formatToolResult(result),
        toolCallId: toolCall.id,
        toolName: toolCall.name
      })

      log.info({
        message: '[PROCESSOR] Tool call successful',
        agentId: agent.id,
        toolName: toolCall.name,
        toolCallId: toolCall.id
      })
    } catch (error: unknown) {
      // Add error to conversation so LLM knows what went wrong
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      conversationHistory.push({
        role: 'tool',
        content: `[ERROR] Tool execution failed: ${errorMessage}`,
        toolCallId: toolCall.id,
        toolName: toolCall.name
      })

      log.error({
        message: '[PROCESSOR] Tool call failed',
        agentId: agent.id,
        toolName: toolCall.name,
        error: errorMessage
      })
    }
  }
}

/**
 * Execute a single tool call via orchestrator (real filesystem operations).
 *
 * @param toolCall - Tool call to execute
 * @param agent - Agent executing the tool
 * @param organization - Organization context
 * @param team - Team context (if available)
 * @param log - Logger instance
 * @returns Tool execution result
 */
async function executeToolCall(
  toolCall: ToolCall,
  agent: Agent,
  organization: Organization,
  team: Team | undefined,
  log: Logger
): Promise<unknown> {
  const correlationId = (log.bindings().correlationId as string) || 'unknown'

  log.info({
    message: '[PROCESSOR] Executing tool via orchestrator',
    agentId: agent.id,
    toolName: toolCall.name,
    arguments: toolCall.arguments
  })

  // Get tool registry for executing real filesystem operations
  const registry = createToolRegistry()

  try {
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

    log.info({
      message: '[PROCESSOR] Tool executed successfully',
      agentId: agent.id,
      toolName: toolCall.name,
      success: true
    })

    return result
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    log.error({
      message: '[PROCESSOR] Tool execution failed',
      agentId: agent.id,
      toolName: toolCall.name,
      error: errorMessage
    })

    throw error
  }
}

/**
 * Format tool result for conversation history.
 *
 * Simple extraction for MVP: just get the content/message.
 * Can be enhanced later with summarization.
 *
 * @param result - Raw tool execution result
 * @returns Formatted string for conversation
 */
function formatToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result
  }

  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>

    // Extract common fields
    if (obj.content) {
      return String(obj.content)
    }

    if (obj.message) {
      return String(obj.message)
    }
  }

  // Fall back to JSON
  return JSON.stringify(result, null, 2)
}

export async function processTask(agent: Agent, task: Task): Promise<void> {
  const log = logger.child({ agentId: agent.id, taskId: task.id })

  task.status = 'in-progress'
  task.assignedToId = agent.id

  // F074: Increment workload when task assigned
  incrementWorkload(agent, task.id)

  log.info(
    {
      taskTitle: task.title,
      priority: task.priority
    },
    'Processing task'
  )

  try {
    const shouldDelegate = await assessDelegation(agent, task)

    if (shouldDelegate) {
      const subordinate = await selectSubordinate(agent)
      if (subordinate) {
        await delegateTask(task, agent, subordinate)
        return
      }
    }

    // Load organization and team for tool access
    const organization = await loadOrganization(agent.organizationId)
    if (!organization) {
      throw new Error(`Organization not found: ${agent.organizationId}`)
    }

    const teams = await loadTeams(agent.organizationId)
    const team = agent.teamId ? teams.find((t) => t.id === agent.teamId) : undefined

    // Load tools available to this agent
    const availableTools = getAvailableTools(organization, agent, team)

    log.info({
      message: '[PROCESSOR] Tools loaded for agent',
      agentId: agent.id,
      toolCount: availableTools.length,
      toolNames: availableTools.map((t) => t.name)
    })

    // Initialize conversation history
    const conversationHistory: ConversationMessage[] = []

    // Add initial user message (the task description)
    conversationHistory.push({
      role: 'user',
      content: buildTaskPrompt(task)
    })

    log.info({
      message: '[PROCESSOR] Conversation initialized',
      taskId: task.id,
      initialMessage: task.description.substring(0, 100) + '...'
    })

    // Main processing loop
    const MAX_ITERATIONS = 20
    let iteration = 0
    let finalResponse = ''
    let totalTokens = 0

    while (iteration < MAX_ITERATIONS) {
      iteration++

      log.info({
        message: '[PROCESSOR] Loop iteration',
        taskId: task.id,
        agentId: agent.id,
        iteration,
        maxIterations: MAX_ITERATIONS
      })

      // Call LLM with conversation history and available tools
      const llmOptions: LLMServiceOptions = {
        agentId: agent.id,
        tools: availableTools.length > 0 ? availableTools : undefined
      }

      const response = await generateCompletion(
        buildConversationPrompt(conversationHistory),
        llmOptions
      )

      totalTokens += response.tokensUsed?.total || 0

      // Add assistant response to history
      conversationHistory.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls
      })

      // Check if LLM wants to use tools
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Execute tool calls
        await executeToolCalls(
          response.toolCalls,
          agent,
          organization,
          team,
          conversationHistory,
          log
        )

        // Continue loop to get next response
        continue
      }

      // No tool calls = final response
      finalResponse = response.content
      break
    }

    // Check if we hit max iterations
    if (iteration >= MAX_ITERATIONS) {
      log.warn({
        message: '[PROCESSOR] Max iterations reached',
        taskId: task.id,
        agentId: agent.id,
        iterations: iteration
      })

      finalResponse =
        finalResponse ||
        '[INFO] Task processing reached maximum tool call limit (20 iterations). Task may be incomplete.'
    }

    log.info({
      message: '[PROCESSOR] Task processing complete',
      taskId: task.id,
      agentId: agent.id,
      totalIterations: iteration,
      responseLength: finalResponse.length
    })

    task.status = 'completed'
    task.result = finalResponse
    task.completedAt = new Date()
    task.metadata = {
      ...task.metadata,
      iterations: iteration
    }

    // F074: Decrement workload when task completed
    decrementWorkload(agent, task.id)

    agent.tokenUsed += totalTokens
    agent.lastActiveAt = new Date()

    if (agent.seniorId) {
      await reportCompletion(agent, task)
    }

    log.info({ tokensUsed: totalTokens, iterations: iteration }, 'Task completed')
  } catch (error: unknown) {
    log.error({ error }, 'Task processing failed')
    task.status = 'blocked'
    task.result = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`

    if (agent.seniorId) {
      const errorToEscalate =
        error instanceof Error
          ? error
          : new Error('An unknown error occurred during task processing.')
      await escalateFailure(agent, task, errorToEscalate)
    }
  }
}
