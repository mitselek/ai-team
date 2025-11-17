import { spawn, type ChildProcess } from 'child_process'
import { createLogger } from '../utils/logger'

const logger = createLogger('mcp-client')

interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

interface MCPServer {
  command: string
  args: string[]
  env?: Record<string, string>
}

interface MCPMessage {
  method: string
  params?: Record<string, unknown>
}

interface MCPResponse {
  content?: unknown
  tools?: MCPTool[]
  [key: string]: unknown
}

/**
 * MCP Client for connecting to Model Context Protocol servers
 */
export class MCPClient {
  private serverName: string
  private config: MCPServer
  private process: ChildProcess | null = null
  private tools: MCPTool[] = []

  constructor(serverName: string, config: MCPServer) {
    this.serverName = serverName
    this.config = config
  }

  /**
   * Start the MCP server process and initialize connection
   */
  async connect(): Promise<void> {
    logger.info(
      { server: this.serverName, command: this.config.command, args: this.config.args },
      'Connecting to MCP server'
    )

    this.process = spawn(this.config.command, this.config.args, {
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    this.process.on('error', (error: Error) => {
      logger.error({ server: this.serverName, error: String(error) }, 'MCP server process error')
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      logger.error({ server: this.serverName, stderr: data.toString() }, 'MCP server stderr')
    })

    logger.info({ server: this.serverName }, 'Process spawned, sending initialize')

    // Initialize handshake
    const initResponse = (await this.sendMessage({
      method: 'initialize',
      params: {}
    })) as MCPResponse
    logger.info({ server: this.serverName, initResponse }, 'Initialize response received')

    // List available tools
    logger.info({ server: this.serverName }, 'Requesting tools list')
    const response = (await this.sendMessage({ method: 'tools/list', params: {} })) as MCPResponse
    logger.info({ server: this.serverName, response }, 'Tools list response received')
    this.tools = response.tools || []

    logger.info(
      { server: this.serverName, toolCount: this.tools.length, tools: this.tools },
      'MCP server connected'
    )
  }

  /**
   * List available tools from the MCP server
   */
  getTools(): MCPTool[] {
    return this.tools
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    logger.info({ server: this.serverName, tool: name, args }, 'Calling MCP tool')

    const response = (await this.sendMessage({
      method: 'tools/call',
      params: { name, arguments: args }
    })) as MCPResponse

    return response.content
  }

  /**
   * Send a message to the MCP server and wait for response
   */
  private async sendMessage(message: MCPMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Add required JSON-RPC 2.0 fields
      const id = Date.now()
      const jsonrpcMessage = {
        jsonrpc: '2.0',
        id,
        ...message
      }
      const messageStr = JSON.stringify(jsonrpcMessage) + '\n'

      logger.info(
        { server: this.serverName, message: jsonrpcMessage },
        'Sending message to MCP server'
      )

      const onData = (data: Buffer) => {
        const responseStr = data.toString()
        logger.info(
          { server: this.serverName, response: responseStr },
          'Received data from MCP server'
        )

        try {
          const response = JSON.parse(responseStr)

          // Check if this is the response to our request (matching id)
          if (response.id === id) {
            this.process?.stdout?.off('data', onData)
            logger.info(
              { server: this.serverName, parsedResponse: response },
              'Successfully parsed response'
            )
            resolve(response.result || response)
          } else {
            // This might be a notification or different response, keep listening
            logger.info(
              { server: this.serverName, response },
              'Received non-matching response, continuing to listen'
            )
          }
        } catch (error) {
          logger.error({ error: String(error), data: responseStr }, 'Failed to parse MCP response')
        }
      }

      if (!this.process) {
        reject(new Error('MCP process not started'))
        return
      }

      this.process.stdout?.on('data', onData)
      this.process.stdin?.write(messageStr)
      logger.info({ server: this.serverName, sent: messageStr.trim() }, 'Message written to stdin')

      setTimeout(() => {
        this.process?.stdout?.off('data', onData)
        logger.error({ server: this.serverName, message: jsonrpcMessage }, 'MCP call timeout')
        reject(new Error('MCP call timeout'))
      }, 30000)
    })
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill()
      this.process = null
      logger.info({ server: this.serverName }, 'MCP server disconnected')
    }
  }
}

/**
 * MCP Server Registry - manages multiple MCP servers
 */
export class MCPRegistry {
  private servers: Map<string, MCPClient> = new Map()

  /**
   * Register and connect to an MCP server
   */
  async registerServer(name: string, config: MCPServer): Promise<void> {
    const client = new MCPClient(name, config)
    await client.connect()
    this.servers.set(name, client)
    logger.info({ server: name }, 'MCP server registered')
  }

  /**
   * Get a registered MCP client
   */
  getServer(name: string): MCPClient | undefined {
    return this.servers.get(name)
  }

  /**
   * Get all available tools from all servers
   */
  getAllTools(): Record<string, MCPTool[]> {
    const tools: Record<string, MCPTool[]> = {}
    for (const [name, client] of this.servers.entries()) {
      tools[name] = client.getTools()
    }
    return tools
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.servers.values()) {
      await client.disconnect()
    }
    this.servers.clear()
    logger.info('All MCP servers disconnected')
  }
}

// Global registry instance
export const mcpRegistry = new MCPRegistry()
