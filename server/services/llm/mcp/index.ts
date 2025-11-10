import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../../../utils/logger'
import { loadMCPServers, getMCPServerConfig } from './config'
import { connectToMCPServer, listTools, callTool } from './client'
import type { MCPTool, MCPToolCall, MCPToolResult } from './types'
import { MCPClientError } from './types'

const logger = createLogger('mcp-service')

interface ToolWithServer extends MCPTool {
  serverName: string
}

export async function discoverAllTools(correlationId?: string): Promise<ToolWithServer[]> {
  const cid = correlationId || uuidv4()
  const log = logger.child({ correlationId: cid })

  log.info('Discovering all tools from MCP servers')

  const config = loadMCPServers()
  const allTools: ToolWithServer[] = []

  for (const serverConfig of config.servers) {
    try {
      const client = await connectToMCPServer(serverConfig, cid)
      const tools = await listTools(client, serverConfig.name, cid)

      const toolsWithServer = tools.map((tool) => ({
        ...tool,
        serverName: serverConfig.name
      }))

      allTools.push(...toolsWithServer)

      log.info(
        {
          serverName: serverConfig.name,
          toolCount: tools.length
        },
        'Discovered tools from server'
      )
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.warn(
        {
          serverName: serverConfig.name,
          error: errorMessage
        },
        'Failed to discover tools from server'
      )
      // Continue with other servers
    }
  }

  log.info(
    {
      totalTools: allTools.length,
      serverCount: config.servers.length
    },
    'Tool discovery complete'
  )

  return allTools
}

export async function executeTool(
  toolCall: MCPToolCall,
  correlationId?: string
): Promise<MCPToolResult> {
  const cid = correlationId || uuidv4()
  const log = logger.child({ correlationId: cid, toolName: toolCall.name })

  log.info(
    {
      toolName: toolCall.name,
      arguments: toolCall.arguments
    },
    'Executing MCP tool'
  )

  try {
    // Find which server has this tool
    const allTools = await discoverAllTools(cid)
    const toolInfo = allTools.find((t) => t.name === toolCall.name)

    if (!toolInfo) {
      throw new MCPClientError(`Tool not found: ${toolCall.name}`, 'unknown', 'TOOL_NOT_FOUND')
    }

    // Get server config and connect
    const serverConfig = getMCPServerConfig(toolInfo.serverName)
    if (!serverConfig) {
      throw new MCPClientError(
        `Server config not found: ${toolInfo.serverName}`,
        toolInfo.serverName,
        'SERVER_NOT_FOUND'
      )
    }

    const client = await connectToMCPServer(serverConfig, cid)

    // Execute tool
    const result = await callTool(client, toolInfo.serverName, toolCall, cid)

    log.info(
      {
        serverName: toolInfo.serverName,
        success: !result.isError
      },
      'Tool execution complete'
    )

    return result
  } catch (error: unknown) {
    log.error({ error }, 'Tool execution failed')
    throw error
  }
}

export async function getAvailableTools(correlationId?: string): Promise<ToolWithServer[]> {
  return discoverAllTools(correlationId)
}

// Re-export types for convenience
export * from './types'
