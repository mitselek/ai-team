# Development Task Prompt for Gemini CLI

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create an MCP (Model Context Protocol) client integration layer that enables agents to discover available tools from MCP servers and invoke them during LLM conversations. This extends the existing LLM service (F006 Phase 1) with tool execution capabilities.

**Phase 2 Scope**: MCP client with tool discovery and invocation (no streaming, basic error handling)

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **server/services/llm/\*** - Existing LLM service files. Extend, don't replace.
- **Constitution principles** - Read .specify/memory/constitution.md and follow all 12 principles
- **Existing test patterns** - Match the style in tests/api/organizations.spec.ts

### MUST USE

- **Relative imports only** - No `~` aliases. Use `../../types`, `../../server/utils/logger`, etc.
- **Type-only imports** - For types/interfaces use `import type { ... }` not `import { ... }`
- **Existing patterns** - Reference LLM service files for logging, error handling
- **All required fields** - Every object must include ALL fields from its interface
- **Structured logging** - Import and use `createLogger` from server/utils/logger
- **Error handling** - Wrap operations in try-catch, log errors with context
- **Logger pattern** - `log.info({ data }, 'message')` - data object FIRST, message SECOND
- **Correlation IDs** - Use `uuidv4()` from uuid package (already in LLM service)

## MCP Background

Model Context Protocol (MCP) allows AI applications to discover and invoke tools from external servers via stdio transport. Key concepts:

- **MCP Server**: Standalone process exposing tools/resources/prompts
- **Tool**: Executable function with JSON schema for parameters
- **Transport**: Communication layer (stdio for this phase)
- **Discovery**: List available tools with schemas
- **Invocation**: Call tool with arguments, get result

## Type Definitions to Use

```typescript
// New types to create in server/services/llm/mcp/types.ts

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
```

## Reference Files

Look at these existing files for patterns to follow:

- `server/services/llm/config.ts` - Configuration loading pattern
- `server/services/llm/utils.ts` - Retry logic, error handling
- `server/services/llm/anthropic.ts` - API client pattern, logging
- `server/utils/logger.ts` - Structured logging pattern with correlation IDs
- `mcp-server-kali-pentest/` - Example MCP server (reference for testing)

## Expected Output

Create the following files:

### Core MCP Files

1. **server/services/llm/mcp/types.ts** (~80 lines)
   - Export all MCP-related types and interfaces
   - MCPServerConfig, MCPTool, MCPToolCall, MCPToolResult
   - MCPClientError class

2. **server/services/llm/mcp/config.ts** (~100 lines)
   - Load MCP server configurations from file or environment
   - Default config includes existing mcp-server-kali-pentest
   - Validate server configurations
   - Export: loadMCPServers(), getMCPServerConfig()

3. **server/services/llm/mcp/client.ts** (~250 lines)
   - MCP client using @modelcontextprotocol/sdk
   - Connect to MCP server via stdio transport
   - List available tools from server
   - Call tool with arguments
   - Handle errors and timeouts
   - Export: connectToMCPServer(), listTools(), callTool(), disconnectMCPServer()

4. **server/services/llm/mcp/index.ts** (~150 lines)
   - Main MCP service interface
   - Discover all tools from all configured servers
   - Find tool by name across servers
   - Execute tool with error handling
   - Export: discoverAllTools(), executeTool(), getAvailableTools()

### File Structure

```
server/services/llm/mcp/
├── types.ts          # MCP type definitions
├── config.ts         # MCP server configuration
├── client.ts         # Low-level MCP protocol client
└── index.ts          # High-level MCP service interface
```

## Implementation Requirements

### Configuration Loading (config.ts)

```typescript
import { createLogger } from '../../../utils/logger'
import type { MCPServerConfig } from './types'

const logger = createLogger('mcp-config')

interface MCPConfiguration {
  servers: MCPServerConfig[]
}

export function loadMCPServers(): MCPConfiguration {
  // Default configuration with kali-pentest server
  const config: MCPConfiguration = {
    servers: [
      {
        name: 'kali-pentest',
        command: 'python',
        args: ['-m', 'src.server'],
        env: {
          // Add any required environment variables
        }
      }
    ]
  }

  // TODO: Load from config file if exists
  // const configPath = path.join(process.cwd(), 'config/mcp-servers.json')
  // if (fs.existsSync(configPath)) { ... }

  logger.info(
    {
      serverCount: config.servers.length,
      serverNames: config.servers.map((s) => s.name)
    },
    'MCP servers configuration loaded'
  )

  return config
}

export function getMCPServerConfig(serverName: string): MCPServerConfig | null {
  const config = loadMCPServers()
  return config.servers.find((s) => s.name === serverName) || null
}
```

### MCP Client (client.ts)

```typescript
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

    const response = await client.callTool({
      name: toolCall.name,
      arguments: toolCall.arguments
    })

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
```

### MCP Service Interface (index.ts)

```typescript
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
```

## Validation Checklist

Before finishing, verify:

- [ ] All imports use relative paths (../../../)
- [ ] Type imports use `import type { }` syntax
- [ ] Logger calls use correct order: `log.method({ data }, 'message')`
- [ ] Structured logging used (createLogger, correlationId)
- [ ] Error handling with try-catch
- [ ] No modifications to types/index.ts or existing LLM files
- [ ] TypeScript strict mode compatible
- [ ] Connection pooling implemented (reuse connections)
- [ ] Graceful error handling (one server failure doesn't stop others)
- [ ] Correlation IDs flow through all operations

## Success Criteria

- [ ] Files created at specified paths
- [ ] No type errors when running: `npm run typecheck`
- [ ] No lint errors when running: `npm run lint`
- [ ] Can discover tools from kali-pentest server
- [ ] Can execute tool with arguments
- [ ] Errors are properly classified and logged
- [ ] Configuration loads from default setup

## Notes

- This is Phase 2 (MCP client) - extends Phase 1 (LLM service)
- MCP SDK already installed: `@modelcontextprotocol/sdk`
- kali-pentest server exists in repo for testing
- Use UUID v4 directly for correlation IDs: `import { v4 as uuidv4 } from 'uuid'`
- Connection pooling prevents repeated process spawns

## Package Dependencies

MCP SDK should already be installed. If not:

```bash
npm install @modelcontextprotocol/sdk
```

## Output Formatting (MANDATORY)

All output (status, reasoning, steps) MUST be cleanly formatted:

- Use blank lines to separate conceptual blocks
- One sentence or bullet per line for lists / steps
- No run-on paragraphs longer than 3 sentences
- Begin major phases with a clear heading like: `== Planning ==`, `== Implementation ==`
- Use fenced code blocks for any commands or code

  ```bash
  npm run typecheck
  npm run lint
  ```

- Wrap lines at ~100 characters; insert newlines rather than overflowing
- Explicit progress structure:
  - Action: <what is being done>
  - Result: <observed outcome>
  - Next: <next planned step>
- Do not compress multiple unrelated actions into a single line
- Avoid trailing spaces, avoid inline JSON unless necessary

Failure to follow these formatting rules reduces readability; prioritize structured, line-separated output.
