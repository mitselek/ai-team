import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { createLogger } from '../../utils/logger'
import type { MCPTool } from '@@/types'
import type { LLMServiceOptions, LLMResponse, ToolCall } from './types'
import { LLMProvider, LLMServiceError } from './types'
import { getProviderConfig } from './config'
import { withRetry, estimateTokens } from './utils'

const logger = createLogger('llm-google')

/**
 * Translate MCP tool definitions to Google Gemini's format.
 *
 * Gemini uses nested structure: tools.functionDeclarations[].
 * Also requires converting JSON Schema properties to Gemini's parameter format.
 *
 * @param mcpTools - Array of MCP tool definitions
 * @returns Gemini-compatible tools array
 */
function translateMCPToGemini(mcpTools: MCPTool[]) {
  return [
    {
      functionDeclarations: mcpTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required || []
        }
      }))
    }
  ]
}

/**
 * Extract tool calls from Google Gemini response.
 *
 * Gemini returns function calls in candidate.content.parts[].
 * Each part with functionCall has: { functionCall: { name: string, args: object } }
 *
 * @param candidate - Candidate object from Gemini API response
 * @returns Array of standardized ToolCall objects
 */
function extractToolCalls(candidate: unknown): ToolCall[] {
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    !('content' in candidate) ||
    !candidate.content ||
    typeof candidate.content !== 'object' ||
    !('parts' in candidate.content) ||
    !Array.isArray(candidate.content.parts)
  ) {
    return []
  }

  const toolCalls: ToolCall[] = []

  candidate.content.parts.forEach((part: unknown, index: number) => {
    if (
      typeof part === 'object' &&
      part !== null &&
      'functionCall' in part &&
      typeof part.functionCall === 'object' &&
      part.functionCall !== null &&
      'name' in part.functionCall
    ) {
      toolCalls.push({
        id: `call_${Date.now()}_${index}`, // Gemini doesn't provide IDs, generate one
        name: String(part.functionCall.name),
        arguments: ('args' in part.functionCall ? part.functionCall.args : {}) as Record<
          string,
          unknown
        >
      })
    }
  })

  return toolCalls
}

export async function generateCompletionGoogle(
  prompt: string,
  options: LLMServiceOptions
): Promise<LLMResponse> {
  const config = getProviderConfig(LLMProvider.GOOGLE)
  const log = logger.child({ correlationId: options.correlationId })

  const genAI = new GoogleGenerativeAI(config.apiKey)

  const execute = async (): Promise<LLMResponse> => {
    try {
      const modelName = options.model || config.defaultModel

      // Translate MCP tools to Gemini format if provided
      const geminiTools = options.tools ? translateMCPToGemini(options.tools) : undefined

      log.info(
        {
          model: modelName,
          maxTokens: options.maxTokens || 4096,
          toolsCount: geminiTools ? geminiTools[0].functionDeclarations.length : 0
        },
        'Calling Google Generative AI API'
      )

      const model = genAI.getGenerativeModel({
        model: modelName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(geminiTools && { tools: geminiTools as any })
      })

      log.info('Generating content with Google API...')
      const result = await model.generateContent(prompt)

      log.info('Awaiting response from Google API...')
      const response = await result.response

      log.info('Extracting text and tool calls from response...')

      const candidate = response.candidates?.[0]

      // Extract text content
      const content = response.text()

      // Extract tool calls
      const toolCalls = extractToolCalls(candidate)

      log.info({ contentLength: content.length }, 'Content extracted successfully')

      // Google's API doesn't provide token usage directly in the response object.
      // We'll use our estimation utility.
      const tokensUsed = {
        input: estimateTokens(prompt),
        output: estimateTokens(content),
        total: estimateTokens(prompt) + estimateTokens(content)
      }

      const finishReason = candidate?.finishReason || 'STOP'

      log.info(
        {
          tokensUsed: tokensUsed.total,
          finishReason,
          toolCallsCount: toolCalls.length
        },
        'Google API call successful'
      )

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        provider: LLMProvider.GOOGLE,
        model: modelName,
        tokensUsed,
        finishReason: finishReason === 'STOP' ? 'stop' : 'length',
        metadata: {
          finishReason,
          safetyRatings: candidate?.safetyRatings
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error({ error: errorMessage }, 'Google API call failed')

      // This is a simplification. Google's errors are more complex.
      const isRetryable = errorMessage.includes('503') || errorMessage.includes('429')
      throw new LLMServiceError(errorMessage, LLMProvider.GOOGLE, 'UNKNOWN', isRetryable, error)
    }
  }

  return withRetry(execute, config.maxRetries, LLMProvider.GOOGLE)
}
