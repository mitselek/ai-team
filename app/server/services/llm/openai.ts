import OpenAI from 'openai'
import { createLogger } from '../../utils/logger'
import type { MCPTool } from '@@/types'
import type { LLMServiceOptions, LLMResponse, ToolCall } from './types'
import { LLMProvider, LLMServiceError } from './types'
import { getProviderConfig } from './config'
import { withRetry } from './utils'

const logger = createLogger('llm-openai')

/**
 * Translate MCP tool definitions to OpenAI's format.
 *
 * OpenAI wraps tools in a 'function' object with 'parameters' instead of 'inputSchema'.
 *
 * @param mcpTools - Array of MCP tool definitions
 * @returns OpenAI-compatible tools array
 */
function translateMCPToOpenAI(mcpTools: MCPTool[]) {
  return mcpTools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema // OpenAI calls it 'parameters'
    }
  }))
}

/**
 * Extract tool calls from OpenAI response.
 *
 * OpenAI returns tool calls in message.tool_calls array.
 * Each item has: { id: string, type: 'function', function: { name: string, arguments: string } }
 * Note: arguments is a JSON string, needs parsing.
 *
 * @param message - Message object from OpenAI API response
 * @returns Array of standardized ToolCall objects
 */
function extractToolCalls(message: unknown): ToolCall[] {
  if (
    !message ||
    typeof message !== 'object' ||
    !('tool_calls' in message) ||
    !Array.isArray(message.tool_calls) ||
    message.tool_calls.length === 0
  ) {
    return []
  }

  return message.tool_calls.map((call: unknown) => {
    if (
      typeof call === 'object' &&
      call !== null &&
      'id' in call &&
      'function' in call &&
      typeof call.function === 'object' &&
      call.function !== null &&
      'name' in call.function &&
      'arguments' in call.function
    ) {
      return {
        id: String(call.id),
        name: String(call.function.name),
        arguments: JSON.parse(String(call.function.arguments)) as Record<string, unknown>
      }
    }
    throw new Error('Invalid tool call format from OpenAI')
  })
}

export async function generateCompletionOpenAI(
  prompt: string,
  options: LLMServiceOptions
): Promise<LLMResponse> {
  const config = getProviderConfig(LLMProvider.OPENAI)
  const log = logger.child({ correlationId: options.correlationId })

  const client = new OpenAI({ apiKey: config.apiKey })

  const execute = async (): Promise<LLMResponse> => {
    try {
      // Translate MCP tools to OpenAI format if provided
      const openaiTools = options.tools ? translateMCPToOpenAI(options.tools) : undefined

      log.info(
        {
          model: options.model || config.defaultModel,
          maxTokens: options.maxTokens || 4096,
          toolsCount: openaiTools?.length || 0
        },
        'Calling OpenAI API'
      )

      const requestParams: OpenAI.ChatCompletionCreateParams = {
        model: options.model || config.defaultModel,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }

      // Add tools only if they exist
      if (openaiTools && openaiTools.length > 0) {
        requestParams.tools = openaiTools
      }

      const response = await client.chat.completions.create(requestParams)

      const message = response.choices[0]?.message
      const content = message?.content || ''
      const toolCalls = extractToolCalls(message)

      const usage = response.usage

      const tokensUsed = {
        input: usage?.prompt_tokens || 0,
        output: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0
      }

      log.info(
        {
          tokensUsed: tokensUsed.total,
          finishReason: response.choices[0]?.finish_reason,
          toolCallsCount: toolCalls.length
        },
        'OpenAI API call successful'
      )

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        provider: LLMProvider.OPENAI,
        model: response.model,
        tokensUsed,
        finishReason: response.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
        metadata: {
          id: response.id,
          finishReason: response.choices[0]?.finish_reason
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error({ error: errorMessage }, 'OpenAI API call failed')

      let status = 'UNKNOWN'
      if (error && typeof error === 'object' && 'status' in error) {
        status = String((error as { status: unknown }).status)
      }

      const isRetryable = status === '429' || Number(status) >= 500
      throw new LLMServiceError(errorMessage, LLMProvider.OPENAI, status, isRetryable, error)
    }
  }

  return withRetry(execute, config.maxRetries, LLMProvider.OPENAI)
}
