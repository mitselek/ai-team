import { ToolRegistry } from './tool-registry'

/**
 * Register all available MCP tools in the system.
 * Called during application bootstrap to populate the tool registry.
 */
export function registerAllTools(): void {
  const registry = ToolRegistry.getInstance()

  // Legacy filesystem tools (path-based)
  registry.registerTool('read_file', {
    name: 'read_file',
    description: 'Read file content from your workspace. Path is relative to your workspace root.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file (e.g., /documents/notes.txt or /private/analysis.md)'
        }
      },
      required: ['path']
    }
  })

  registry.registerTool('write_file', {
    name: 'write_file',
    description:
      'Write file content to your workspace. Path is relative to your workspace root. Parent directories will be created automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file (e.g., /documents/report.txt or /private/notes.md)'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  })

  registry.registerTool('delete_file', {
    name: 'delete_file',
    description: 'Delete file from your workspace. Path is relative to your workspace root.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file (e.g., /documents/old-file.txt)'
        }
      },
      required: ['path']
    }
  })

  registry.registerTool('list_files', {
    name: 'list_files',
    description:
      'List files in a directory within your workspace. Path is relative to your workspace root.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'Path to the directory (e.g., /documents or /private). Defaults to workspace root if not specified.'
        }
      },
      required: []
    }
  })

  registry.registerTool('get_file_info', {
    name: 'get_file_info',
    description:
      'Get metadata (size, modified date, etc.) for a file in your workspace. Path is relative to your workspace root.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file (e.g., /documents/report.txt)'
        }
      },
      required: ['path']
    }
  })

  // F059 workspace-aware tools (scope-based)
  registry.registerTool('list_folders', {
    name: 'list_folders',
    description: 'Discover available workspace folders by scope',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting folder discovery'
        },
        organizationId: {
          type: 'string',
          description: '(Auto-injected) The organization ID (required for org_shared scope)'
        },
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
  })

  registry.registerTool('read_file_by_id', {
    name: 'read_file_by_id',
    description: 'Read file content using discovered folderId',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        folderId: {
          type: 'string',
          description: 'Folder ID from list_folders'
        },
        filename: {
          type: 'string',
          description: 'Filename within folder'
        }
      },
      required: ['folderId', 'filename']
    }
  })

  registry.registerTool('write_file_by_id', {
    name: 'write_file_by_id',
    description: 'Write file content using discovered folderId',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        folderId: {
          type: 'string',
          description: 'Folder ID from list_folders'
        },
        filename: {
          type: 'string',
          description: 'Filename within folder'
        },
        content: {
          type: 'string',
          description: 'File content'
        }
      },
      required: ['folderId', 'filename', 'content']
    }
  })

  registry.registerTool('delete_file_by_id', {
    name: 'delete_file_by_id',
    description: 'Delete file using discovered folderId',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        folderId: {
          type: 'string',
          description: 'Folder ID from list_folders'
        },
        filename: {
          type: 'string',
          description: 'Filename within folder'
        }
      },
      required: ['folderId', 'filename']
    }
  })

  registry.registerTool('get_file_info_by_id', {
    name: 'get_file_info_by_id',
    description: 'Get file metadata using discovered folderId',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: '(Auto-injected) The ID of the agent requesting access'
        },
        folderId: {
          type: 'string',
          description: 'Folder ID from list_folders'
        },
        filename: {
          type: 'string',
          description: 'Filename within folder'
        }
      },
      required: ['folderId', 'filename']
    }
  })
}
