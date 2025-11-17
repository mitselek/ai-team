import { defineEventHandler, getQuery } from 'h3'
import { createLogger } from '../utils/logger'
import { mcpRegistry } from '../services/mcp-client'
import { agents } from '../data/agents'
import { getToolPermissions } from '../utils/mcp-config'
import type { Agent } from '../../types'

const logger = createLogger('api.tools.get')

interface MCPTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { agentId } = query

  logger.info({ agentId }, 'Fetching available tools')

  // Get all tools from MCP servers
  const allTools = mcpRegistry.getAllTools()

  // If agentId provided, filter by permissions
  if (agentId) {
    const agent = agents.find((a: Agent) => a.id === agentId)
    if (!agent) {
      logger.error({ agentId }, 'Agent not found')
      return {
        error: 'Agent not found',
        agentId
      }
    }

    // Filter tools based on agent's role
    const filteredTools: Record<string, MCPTool[]> = {}

    for (const [serverName, tools] of Object.entries(allTools)) {
      const permissions = getToolPermissions(serverName, agent.role)
      const allowedTools = (tools as MCPTool[]).filter(
        (tool: MCPTool) => permissions.tools.includes('*') || permissions.tools.includes(tool.name)
      )

      if (allowedTools.length > 0) {
        filteredTools[serverName] = allowedTools
      }
    }

    return {
      agentId,
      tools: filteredTools
    }
  }

  // Return all tools
  return {
    tools: allTools
  }
})
