import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { createLogger } from '../../../utils/logger'
import type { MCPServerConfig, MCPTool, MCPToolCall, MCPToolResult } from './types'
import { MCPClientError } from './types'

const logger = createLogger('mcp-client')

// Connection pool (reuse connections)
const connections = new Map<string, Client>()

export async function connectToMCPServer(
  config: MCPServerConfig,
  correlationId?: string
): Promise<Client> {
  const log = logger.child({ correlationId, serverName: config.name })

  // Check if already connected
  if (connections.has(config.name)) {
    log.info({ serverName: config.name }, 'Reusing existing MCP connection')
    return connections.get(config.name)!
  }

  try {
    log.info(
      {
        command: config.command,
        args: config.args
      },
      'Connecting to MCP server'
    )

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env
    })

    const client = new Client(
      {
        name: 'ai-team-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    )

    await client.connect(transport)

    connections.set(config.name, client)

    log.info({ serverName: config.name }, 'Connected to MCP server successfully')

    return client
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error({ error: errorMessage }, 'Failed to connect to MCP server')
    throw new MCPClientError(
      `Failed to connect to MCP server: ${errorMessage}`,
      config.name,
      'CONNECTION_FAILED',
      error
    )
  }
}

export async function listTools(
  client: Client,
  serverName: string,
  correlationId?: string
): Promise<MCPTool[]> {
  const log = logger.child({ correlationId, serverName })

  try {
    log.info('Listing tools from MCP server')

    const response = await client.listTools()

    const tools: MCPTool[] = response.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema as MCPTool['inputSchema']
    }))

    log.info({ toolCount: tools.length }, 'Retrieved tools from MCP server')

    return tools
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error({ error: errorMessage }, 'Failed to list tools')
    throw new MCPClientError(
      `Failed to list tools: ${errorMessage}`,
      serverName,
      'LIST_TOOLS_FAILED',
      error
    )
  }
}

export async function callTool(
  client: Client,
  serverName: string,
  toolCall: MCPToolCall,
  correlationId?: string
): Promise<MCPToolResult> {
  const log = logger.child({ correlationId, serverName, toolName: toolCall.name })

  try {
    log.info(
      {
        toolName: toolCall.name,
        arguments: toolCall.arguments
      },
      'Calling MCP tool'
    )

    const response = (await client.callTool({
      name: toolCall.name,
      arguments: toolCall.arguments
    })) as MCPToolResult

    log.info(
      {
        contentLength: response.content.length,
        isError: response.isError
      },
      'MCP tool call completed'
    )

    return {
      content: response.content,
      isError: response.isError
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error({ error: errorMessage }, 'MCP tool call failed')
    throw new MCPClientError(
      `Tool call failed: ${errorMessage}`,
      serverName,
      'TOOL_CALL_FAILED',
      error
    )
  }
}

export async function disconnectMCPServer(serverName: string): Promise<void> {
  const client = connections.get(serverName)
  if (client) {
    await client.close()
    connections.delete(serverName)
    logger.info({ serverName }, 'Disconnected from MCP server')
  }
}
