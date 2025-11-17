import { defineEventHandler, readBody } from 'h3'
import { createLogger } from '../utils/logger'
import { mcpRegistry } from '../services/mcp-client'
import { agents } from '../data/agents'
import { getToolPermissions } from '../utils/mcp-config'
import type { Agent } from '../../types'

const logger = createLogger('api.tools.execute')

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { agentId, serverName, toolName, arguments: toolArgs } = body

  logger.info({ agentId, serverName, toolName }, 'Executing tool')

  // Validate agent exists
  const agent = agents.find((a: Agent) => a.id === agentId)
  if (!agent) {
    return {
      status: 404,
      body: { error: 'Agent not found' }
    }
  }

  // Check permissions
  const permissions = getToolPermissions(serverName, agent.role)
  if (!permissions.tools.includes('*') && !permissions.tools.includes(toolName)) {
    logger.warn({ agentId, role: agent.role, toolName }, 'Permission denied')
    return {
      status: 403,
      body: { error: 'Agent does not have permission to use this tool' }
    }
  }

  // Get MCP server
  const server = mcpRegistry.getServer(serverName)
  if (!server) {
    return {
      status: 404,
      body: { error: `MCP server '${serverName}' not found` }
    }
  }

  try {
    // Execute tool
    const result = await server.callTool(toolName, toolArgs)

    logger.info({ agentId, toolName, success: true }, 'Tool executed successfully')

    return {
      status: 200,
      body: {
        result,
        agentId,
        toolName,
        executedAt: new Date()
      }
    }
  } catch (error) {
    logger.error({ agentId, toolName, error }, 'Tool execution failed')
    return {
      status: 500,
      body: { error: 'Tool execution failed', details: String(error) }
    }
  }
})
