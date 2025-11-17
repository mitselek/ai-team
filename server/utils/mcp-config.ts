/**
 * MCP Server Configuration
 *
 * Configure external MCP servers for AI Team agents
 */

const emailServerPath =
  process.env.MCP_EMAIL_SERVER_PATH ||
  '/home/michelek/Documents/github/ai-team/mcp-server-email/src/server.py'

const emailVenvPath =
  process.env.MCP_EMAIL_VENV_PATH || '/home/michelek/Documents/github/ai-team/mcp-server-email/venv'

export const mcpServers = {
  email: {
    command: `${emailVenvPath}/bin/python`,
    args: [emailServerPath],
    env: {
      VIRTUAL_ENV: emailVenvPath,
      PATH: `${emailVenvPath}/bin:${process.env.PATH}`
    }
  }
}

/**
 * Role-based tool permissions
 * Defines which roles have access to which tools from each MCP server
 */
export const roleToolPermissions: Record<string, Record<string, string[]>> = {
  email: {
    // Postmaster has full email access
    Postmaster: ['send_email', 'read_inbox', 'search_emails', 'mark_as_read'],
    // Notifier can only send emails
    Notifier: ['send_email'],
    // Archivist can read and search
    Archivist: ['read_inbox', 'search_emails', 'mark_as_read']
  }
  // Future: add more MCP servers and role permissions here
}

/**
 * Get tool permissions for a role from a specific MCP server
 */
export function getToolPermissions(serverName: string, role: string): { tools: string[] } {
  const serverPermissions = roleToolPermissions[serverName]
  if (!serverPermissions) {
    return { tools: [] }
  }

  const allowedTools = serverPermissions[role] || []
  return { tools: allowedTools }
}
