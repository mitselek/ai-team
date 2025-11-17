import { describe, it, expect, beforeAll } from 'vitest'
import { loadOrganization } from '../../../app/server/services/persistence/filesystem'
import { ToolRegistry } from '../../../app/server/services/mcp/tool-registry'
import { registerAllTools } from '../../../app/server/services/mcp/register-tools'

describe('Organization Configuration with Tool Whitelist', () => {
  const orgId = '537ba67e-0e50-47f7-931d-360b547efe90'

  // Initialize registry once before all tests
  beforeAll(() => {
    const registry = ToolRegistry.getInstance()
    registry.clear()
    registerAllTools()
  })

  it('should load organization with toolWhitelist array', async () => {
    const org = await loadOrganization(orgId)

    expect(org).toBeDefined()
    expect(org!.toolWhitelist).toBeDefined()
    expect(Array.isArray(org!.toolWhitelist)).toBe(true)
  })

  it('should have 10 tools in whitelist (5 legacy + 5 F059)', async () => {
    const org = await loadOrganization(orgId)

    expect(org!.toolWhitelist).toHaveLength(10)

    // Legacy tools
    expect(org!.toolWhitelist).toContain('read_file')
    expect(org!.toolWhitelist).toContain('write_file')
    expect(org!.toolWhitelist).toContain('delete_file')
    expect(org!.toolWhitelist).toContain('list_files')
    expect(org!.toolWhitelist).toContain('get_file_info')

    // F059 tools
    expect(org!.toolWhitelist).toContain('list_folders')
    expect(org!.toolWhitelist).toContain('read_file_by_id')
    expect(org!.toolWhitelist).toContain('write_file_by_id')
    expect(org!.toolWhitelist).toContain('delete_file_by_id')
    expect(org!.toolWhitelist).toContain('get_file_info_by_id')
  })

  it('should have whitelisted tools available in Tool Registry', async () => {
    const org = await loadOrganization(orgId)
    const registry = ToolRegistry.getInstance()

    // Verify all whitelisted tools exist in registry
    org!.toolWhitelist!.forEach((toolName) => {
      const tool = registry.getTool(toolName)
      expect(tool).toBeDefined()
      expect(tool!.name).toBe(toolName)
      expect(tool!.description).toBeTruthy()
      expect(tool!.inputSchema).toBeDefined()
    })
  })

  it('should have valid tool definitions from registry', async () => {
    const org = await loadOrganization(orgId)
    const registry = ToolRegistry.getInstance()

    org!.toolWhitelist!.forEach((toolName) => {
      const tool = registry.getTool(toolName)
      expect(tool).toBeDefined()
      expect(tool!.inputSchema.type).toBe('object')
      expect(tool!.inputSchema.properties).toBeDefined()
    })
  })
})
