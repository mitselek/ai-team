import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mcpRegistry } from '../../server/services/mcp-client'
import { mcpServers } from '../../server/utils/mcp-config'

describe('MCP Email Integration', () => {
  beforeAll(async () => {
    // Initialize email MCP server
    await mcpRegistry.registerServer('email', mcpServers.email)
  })

  afterAll(async () => {
    // Cleanup
    await mcpRegistry.disconnectAll()
  })

  it('should list available email tools', () => {
    const server = mcpRegistry.getServer('email')
    expect(server).toBeDefined()

    const tools = server!.getTools()
    expect(tools.length).toBeGreaterThan(0)

    const toolNames = tools.map((t: { name: string }) => t.name)
    expect(toolNames).toContain('send_email')
    expect(toolNames).toContain('read_inbox')
    expect(toolNames).toContain('search_emails')
    expect(toolNames).toContain('mark_as_read')
  })

  it('should read inbox via MCP', async () => {
    const server = mcpRegistry.getServer('email')!

    const result = await server.callTool('read_inbox', {
      limit: 3,
      unread_only: false
    })

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should search emails via MCP', async () => {
    const server = mcpRegistry.getServer('email')!

    const result = await server.callTool('search_emails', {
      query: 'security',
      limit: 5
    })

    expect(result).toBeDefined()
  })
})
