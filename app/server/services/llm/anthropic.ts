import Anthropic from '@anthropic-ai/sdk'
import { createLogger } from '../../utils/logger'
import type { MCPTool } from '@@/types'
import type { LLMServiceOptions, LLMResponse, ToolCall } from './types'
import { LLMProvider, LLMServiceError } from './types'
import { getProviderConfig } from './config'
import { withRetry } from './utils'

const logger = createLogger('llm-anthropic')

/**
 * Translate MCP tool definitions to Anthropic's format.
 *
 * Anthropic format uses 'input_schema' (with underscore).
 *
 * @param mcpTools - Array of MCP tool definitions
 * @returns Anthropic-compatible tools array
 */
function translateMCPToAnthropic(mcpTools: MCPTool[]) {
  return mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema // Note: underscore for Anthropic
  }))
}

/**
 * Extract tool calls from Anthropic response content blocks.
 *
 * Anthropic returns tool calls as content blocks with type='tool_use'.
 * Each block has: { type: 'tool_use', id: string, name: string, input: object }
 *
 * @param responseContent - Content blocks from Anthropic API response
 * @returns Array of standardized ToolCall objects
 */
function extractToolCalls(responseContent: unknown[]): ToolCall[] {
  return responseContent
    .filter(
      (
        block: unknown
      ): block is { type: string; id: string; name: string; input: Record<string, unknown> } => {
        return (
          typeof block === 'object' &&
          block !== null &&
          'type' in block &&
          block.type === 'tool_use'
        )
      }
    )
    .map((block) => ({
      id: block.id,
      name: block.name,
      arguments: block.input
    }))
}

export async function generateCompletionAnthropic(
  prompt: string,
  options: LLMServiceOptions
): Promise<LLMResponse> {
  const config = getProviderConfig(LLMProvider.ANTHROPIC)
  const log = logger.child({ correlationId: options.correlationId })

  const client = new Anthropic({ apiKey: config.apiKey })

  const execute = async (): Promise<LLMResponse> => {
    try {
      // Translate MCP tools to Anthropic format if provided
      const anthropicTools = options.tools ? translateMCPToAnthropic(options.tools) : undefined

      log.info(
        {
          model: options.model || config.defaultModel,
          maxTokens: options.maxTokens || 4096,
          toolsCount: anthropicTools?.length || 0
        },
        'Calling Anthropic API'
      )

      const requestParams: Anthropic.MessageCreateParams = {
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
      if (anthropicTools && anthropicTools.length > 0) {
        requestParams.tools = anthropicTools as Anthropic.Tool[]
      }

      const response = await client.messages.create(requestParams)

      // Extract text content
      const content = (response.content as unknown[])
        .filter((block: unknown): block is { type: string; text: string } => {
          return (
            typeof block === 'object' && block !== null && 'type' in block && block.type === 'text'
          )
        })
        .map((block) => block.text)
        .join('\n')

      // Extract tool calls
      const toolCalls = extractToolCalls(response.content as unknown[])

      const tokensUsed = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens
      }

      log.info(
        {
          tokensUsed: tokensUsed.total,
          finishReason: response.stop_reason,
          toolCallsCount: toolCalls.length
        },
        'Anthropic API call successful'
      )

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        provider: LLMProvider.ANTHROPIC,
        model: response.model,
        tokensUsed,
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
        metadata: {
          id: response.id,
          stopReason: response.stop_reason
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error({ error: errorMessage }, 'Anthropic API call failed')

      let status = 'UNKNOWN'
      if (error && typeof error === 'object' && 'status' in error) {
        status = String((error as { status: unknown }).status)
      }

      // Classify error
      const isRetryable = status === '429' || Number(status) >= 500
      throw new LLMServiceError(errorMessage, LLMProvider.ANTHROPIC, status, isRetryable, error)
    }
  }

  return withRetry(execute, config.maxRetries, LLMProvider.ANTHROPIC)
}
