interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

interface MCPToolCall {
  name: string
  arguments: Record<string, unknown>
}

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

class MCPClientError extends Error {
  constructor(
    message: string,
    public serverName: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'MCPClientError'
  }
}

export type { MCPServerConfig, MCPTool, MCPToolCall, MCPToolResult }

export { MCPClientError }
