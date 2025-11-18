/**
 * F074 Roster Tool Executor - Wraps roster tool for orchestrator
 * Provides organizational awareness through colleague queries
 */

import { createLogger } from '../../utils/logger'
import type { ToolExecutor, ExecutionContext } from '../orchestrator'
import { getRosterTool } from './roster'

const logger = createLogger('tools:roster')

/**
 * get_organization_roster - Query organizational roster for delegation decisions
 */
export const getRosterExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    // Extract from params or fall back to context (orchestrator pattern)
    const agentId = (params.agentId as string | undefined) || context.agentId
    const organizationId = (params.organizationId as string | undefined) || context.organizationId
    const filter = params.filter as 'all' | 'my_team' | 'available' | 'by_expertise' | undefined
    const expertise = params.expertise as string | undefined

    logger.info(
      {
        agentId,
        organizationId,
        filter,
        expertise,
        correlationId: context.correlationId
      },
      'Executing roster query'
    )

    if (!agentId || !organizationId) {
      const error = 'Missing required parameters: agentId, organizationId'
      logger.error({ correlationId: context.correlationId }, error)
      return { error }
    }

    try {
      const result = await getRosterTool(agentId, organizationId, { filter, expertise })

      logger.info(
        {
          agentId,
          organizationId,
          filter,
          colleaguesReturned: result.colleagues.length,
          correlationId: context.correlationId
        },
        'Roster query successful'
      )

      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(
        {
          agentId,
          organizationId,
          filter,
          error: errorMessage,
          correlationId: context.correlationId
        },
        'Roster query failed'
      )
      return { error: errorMessage }
    }
  }
}
