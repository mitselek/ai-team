import type { Organization, Team, Agent, MCPTool } from '@@/types'

/**
 * MCP Tool definitions for organization
 * All filesystem tools including F059 folder-based operations
 */
export const MCP_TOOLS: MCPTool[] = [
  {
    name: 'read_file',
    description: 'Read file content from agent/team workspace',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        path: {
          type: 'string',
          description: 'Path to the file (e.g., /agents/{agentId}/private/file.md)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write file content to agent/team workspace',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        path: {
          type: 'string',
          description: 'Path to the file (e.g., /agents/{agentId}/private/file.md)'
        },
        content: { type: 'string', description: 'Content to write to the file' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete file from agent/team workspace',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        path: {
          type: 'string',
          description: 'Path to the file (e.g., /agents/{agentId}/private/file.md)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'list_files',
    description: 'List files in a directory within agent/team workspace',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        path: {
          type: 'string',
          description: 'Path to the directory (e.g., /agents/{agentId}/private)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'get_file_info',
    description: 'Get metadata for a file in agent/team workspace',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        path: {
          type: 'string',
          description: 'Path to the file (e.g., /agents/{agentId}/private/file.md)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'list_folders',
    description: 'Discover available workspace folders by scope',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting folder discovery'
        },
        organizationId: { type: 'string', description: '(Auto-injected) The organization ID' },
        teamId: {
          type: 'string',
          description: 'The team ID (optional, auto-derived for team scopes)'
        },
        scope: {
          type: 'string',
          enum: ['my_private', 'my_shared', 'team_private', 'team_shared', 'org_shared'],
          description: 'The discovery scope'
        }
      },
      required: ['scope']
    }
  },
  {
    name: 'read_file_by_id',
    description: 'Read file content using discovered folderId',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        folderId: { type: 'string', description: 'Folder ID from list_folders' },
        filename: { type: 'string', description: 'Filename within folder' }
      },
      required: ['folderId', 'filename']
    }
  },
  {
    name: 'write_file_by_id',
    description: 'Write file content using discovered folderId',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        folderId: { type: 'string', description: 'Folder ID from list_folders' },
        filename: { type: 'string', description: 'Filename within folder' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['folderId', 'filename', 'content']
    }
  },
  {
    name: 'delete_file_by_id',
    description: 'Delete file using discovered folderId',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        folderId: { type: 'string', description: 'Folder ID from list_folders' },
        filename: { type: 'string', description: 'Filename within folder' }
      },
      required: ['folderId', 'filename']
    }
  },
  {
    name: 'get_file_info_by_id',
    description: 'Get file metadata using discovered folderId',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        folderId: { type: 'string', description: 'Folder ID from list_folders' },
        filename: { type: 'string', description: 'Filename within folder' }
      },
      required: ['folderId', 'filename']
    }
  }
]

/**
 * Initial organization definition (without runtime fields)
 */
export const INITIAL_ORG: Omit<Organization, 'id' | 'createdAt'> = {
  name: 'Demo AI Org',
  githubRepoUrl: 'https://github.com/demo/ai-org',
  tokenPool: 10000000, // 10M tokens
  rootAgentId: null,
  tools: MCP_TOOLS
}

/**
 * Core team definitions (without runtime fields)
 * Total allocations: 6M tokens (60% of org pool)
 */
export const CORE_TEAMS: Omit<Team, 'id' | 'organizationId'>[] = [
  {
    name: 'HR Team',
    type: 'hr',
    tokenAllocation: 1000000, // 1M - Recruitment, interviews, agent lifecycle
    leaderId: null
  },
  {
    name: 'Toolsmith Team',
    type: 'toolsmith',
    tokenAllocation: 1500000, // 1.5M - Tool creation and refinement
    leaderId: null
  },
  {
    name: 'Library Team',
    type: 'library',
    tokenAllocation: 1000000, // 1M - Knowledge management and documentation
    leaderId: null
  },
  {
    name: 'Vault Team',
    type: 'vault',
    tokenAllocation: 1000000, // 1M - Secrets and credentials management
    leaderId: null
  },
  {
    name: 'Tools Library Team',
    type: 'tools-library',
    tokenAllocation: 1000000, // 1M - Tool catalog and discovery
    leaderId: null
  },
  {
    name: 'Nurse Team',
    type: 'nurse',
    tokenAllocation: 500000, // 500K - Agent health monitoring and recovery
    leaderId: null
  }
]

/**
 * Marcus - the initial HR Specialist agent template
 * Will be instantiated as the first agent in the organization
 */
export const MARCUS_TEMPLATE: Omit<
  Agent,
  'id' | 'teamId' | 'organizationId' | 'createdAt' | 'lastActiveAt'
> = {
  name: 'Marcus',
  role: 'HR Specialist',
  seniorId: null,
  systemPrompt: `You are Marcus, an HR Specialist for an AI agent organization.

Your responsibilities:
- Interview candidates to understand their needs
- Assess required skills, experience, and personality traits
- Recommend agent recruitment based on organization needs
- Guide new agents through onboarding
- Monitor agent satisfaction and performance

Interview Style:
- Ask thoughtful, open-ended questions
- Listen actively and dig deeper based on responses
- Build rapport while staying professional
- Synthesize information to create comprehensive candidate profiles
- Detect when someone wants to hire and guide them appropriately

Recruitment Intent Detection:
- When people first contact you, assess if they're looking to hire
- If they express hiring intent, acknowledge it and proceed with the interview
- If they're asking about something else, provide helpful guidance or redirect
- Always be welcoming and professional regardless of their intent

You communicate clearly and professionally, helping candidates articulate their needs while gathering the information necessary to make optimal hiring decisions.`,
  tokenAllocation: 200000, // 200K tokens for Marcus
  tokenUsed: 0,
  status: 'active'
}
