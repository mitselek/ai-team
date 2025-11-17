import type { MCPTool } from '@@/types'

/**
 * Tool Registry - System-level singleton for managing MCP tool definitions.
 *
 * Provides centralized storage and access for all available tools in the system.
 * Tools are registered in code (not config) to maintain version control and type safety.
 *
 * Usage:
 * ```typescript
 * const registry = ToolRegistry.getInstance()
 * registry.registerTool('read_file', { ... })
 * const tool = registry.getTool('read_file')
 * ```
 */
export class ToolRegistry {
  private static instance: ToolRegistry
  private tools: Map<string, MCPTool> = new Map()

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of ToolRegistry
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  /**
   * Register a tool in the registry
   *
   * @param name - Unique tool name
   * @param tool - Tool definition following MCPTool interface
   * @throws Error if tool with same name already registered
   */
  registerTool(name: string, tool: MCPTool): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`)
    }

    // Validate tool name matches
    if (tool.name !== name) {
      throw new Error(`Tool name mismatch: key='${name}' but tool.name='${tool.name}'`)
    }

    this.tools.set(name, tool)
  }

  /**
   * Get tool definition by name
   *
   * @param name - Tool name to retrieve
   * @returns Tool definition or undefined if not found
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all registered tool names
   *
   * @returns Array of all tool names currently in registry
   */
  getAllToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Get all registered tools
   *
   * @returns Array of all tool definitions
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Check if a tool is registered
   *
   * @param name - Tool name to check
   * @returns true if tool exists in registry
   */
  hasTool(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Clear all tools from registry (for testing only)
   * @internal
   */
  clear(): void {
    this.tools.clear()
  }
}
