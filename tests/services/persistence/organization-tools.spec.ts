import { describe, it, expect } from 'vitest'
import { loadOrganization } from '../../../app/server/services/persistence/filesystem'

describe('Organization Configuration with Tools', () => {
  const orgId = '537ba67e-0e50-47f7-931d-360b547efe90'

  it('should load organization with tools array', async () => {
    const org = await loadOrganization(orgId)

    expect(org).toBeDefined()
    expect(org!.tools).toBeDefined()
    expect(Array.isArray(org!.tools)).toBe(true)
  })

  it('should have 5 filesystem tools defined', async () => {
    const org = await loadOrganization(orgId)

    expect(org!.tools).toHaveLength(5)

    const toolNames = org!.tools!.map((t: { name: string }) => t.name)
    expect(toolNames).toContain('read_file')
    expect(toolNames).toContain('write_file')
    expect(toolNames).toContain('delete_file')
    expect(toolNames).toContain('list_files')
    expect(toolNames).toContain('get_file_info')
  })

  it('should have valid tool definitions with required fields', async () => {
    const org = await loadOrganization(orgId)

    org!.tools!.forEach(
      (tool: {
        name: string
        description: string
        inputSchema: { type: string; properties: unknown }
      }) => {
        expect(tool.name).toBeTruthy()
        expect(tool.description).toBeTruthy()
        expect(tool.inputSchema).toBeDefined()
        expect(tool.inputSchema.type).toBe('object')
        expect(tool.inputSchema.properties).toBeDefined()
      }
    )
  })

  it('should have agentId and path in all tool input schemas', async () => {
    const org = await loadOrganization(orgId)

    org!.tools!.forEach(
      (tool: { inputSchema: { properties: Record<string, unknown>; required?: string[] } }) => {
        expect(tool.inputSchema.properties.agentId).toBeDefined()
        expect(tool.inputSchema.properties.path).toBeDefined()
        expect(tool.inputSchema.required).toContain('agentId')
        expect(tool.inputSchema.required).toContain('path')
      }
    )
  })

  it('write_file should have content parameter', async () => {
    const org = await loadOrganization(orgId)
    const writeTool = org!.tools!.find((t: { name: string }) => t.name === 'write_file')

    expect(writeTool).toBeDefined()
    expect(writeTool!.inputSchema.properties.content).toBeDefined()
    expect(writeTool!.inputSchema.required).toContain('content')
  })
})
