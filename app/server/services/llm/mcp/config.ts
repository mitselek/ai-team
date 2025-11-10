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
