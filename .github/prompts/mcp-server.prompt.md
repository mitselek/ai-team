---
description: Build a Model Context Protocol (MCP) server with tools, resources, and prompts
---

# MCP Server Builder

## User Input

$ARGUMENTS

## Overview

You are building a **Model Context Protocol (MCP) server**. MCP servers expose tools (actions), resources (data), and prompts (templates) that AI assistants can use through a standardized protocol.

**Current Date**: November 5, 2025

**Key Principles**:

- Follow the [MCP specification](https://modelcontextprotocol.io/) strictly
- Implement proper error handling and input validation
- Provide clear tool descriptions and JSON schemas
- Support multiple transport layers (stdio, SSE, HTTP)
- Write comprehensive tests for all functionality

## Workflow

Given the user's input describing the desired MCP server, follow this workflow:

### Phase 1: Requirements Analysis

1. **Parse user requirements**:
   - What is the server's purpose? (GitHub integration, database access, file operations, etc.)
   - What tools should it expose? (actions the AI can perform)
   - What resources should it provide? (data the AI can access)
   - What prompts should it offer? (reusable prompt templates)
   - Which transport(s) are needed? (stdio, SSE, HTTP streaming)

2. **Determine target language/SDK**:
   - **Default**: TypeScript with `@modelcontextprotocol/sdk` (if not specified)
   - **Python**: Use `mcp` Python SDK if explicitly requested
   - **Other**: User must specify SDK/framework if using Go, Rust, etc.

3. **Identify dependencies**:
   - MCP SDK package
   - External APIs or services (GitHub API, databases, etc.)
   - Authentication requirements (API keys, OAuth, tokens)
   - Configuration needs (environment variables, config files)

4. **Security assessment**:
   - What access controls are needed?
   - What data is sensitive? (API keys, user data, file paths)
   - What operations are risky? (file deletion, data modification)
   - Should operations be read-only by default?

### Phase 2: Server Architecture Design

1. **Define tool catalog**:
   
   For each tool:
   - **Name**: Clear, descriptive tool name (e.g., `search_files`, `create_issue`)
   - **Description**: What the tool does, when to use it
   - **Input Schema**: JSON Schema defining required/optional parameters
   - **Handler**: Implementation function with error handling
   - **Permissions**: Read-only, write, admin-level access
   
   Example tool specification:
   
   ```typescript
   {
     name: "search_repositories",
     description: "Search GitHub repositories by query string",
     inputSchema: {
       type: "object",
       properties: {
         query: { type: "string", description: "Search query" },
         language: { type: "string", description: "Filter by language" },
         limit: { type: "number", default: 10, maximum: 100 }
       },
       required: ["query"]
     }
   }
   ```

2. **Define resource catalog**:
   
   For each resource:
   - **URI Pattern**: Resource identifier (e.g., `file:///path/to/file`, `db://table/id`)
   - **MIME Type**: Content type (text/plain, application/json, etc.)
   - **Description**: What data the resource provides
   - **Access Control**: Who can read this resource
   
   Example resource:
   
   ```typescript
   {
     uri: "config://server/settings",
     mimeType: "application/json",
     description: "Current server configuration and settings"
   }
   ```

3. **Define prompt catalog** (optional):
   
   For each prompt template:
   - **Name**: Prompt identifier
   - **Description**: When to use this prompt
   - **Arguments**: Dynamic values to fill in
   - **Template**: The actual prompt text
   
   Example prompt:
   
   ```typescript
   {
     name: "code_review",
     description: "Request code review for changes",
     arguments: [
       { name: "file_path", required: true },
       { name: "change_description", required: true }
     ]
   }
   ```

4. **Design error handling strategy**:
   - Use MCP error codes (InvalidRequest, InvalidParams, InternalError, etc.)
   - Provide descriptive error messages
   - Log errors with context for debugging
   - Return partial results when possible
   - Handle rate limits and retries gracefully

### Phase 3: Implementation

1. **Project structure**:
   
   Create organized file structure:
   
   ```
   mcp-server-[name]/
   ├── src/
   │   ├── index.ts              # Server entry point
   │   ├── server.ts             # MCP server setup
   │   ├── tools/                # Tool implementations
   │   │   ├── index.ts
   │   │   ├── [tool1].ts
   │   │   └── [tool2].ts
   │   ├── resources/            # Resource providers
   │   │   └── index.ts
   │   ├── prompts/              # Prompt templates
   │   │   └── index.ts
   │   └── types.ts              # TypeScript types
   ├── tests/
   │   ├── tools/
   │   └── integration/
   ├── package.json
   ├── tsconfig.json
   ├── README.md
   └── .env.example
   ```

2. **Server initialization** (TypeScript example):
   
   ```typescript
   import { Server } from "@modelcontextprotocol/sdk/server/index.js";
   import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
   import { 
     CallToolRequestSchema,
     ListToolsRequestSchema,
     ListResourcesRequestSchema 
   } from "@modelcontextprotocol/sdk/types.js";
   
   // Create server instance
   const server = new Server(
     {
       name: "mcp-server-[name]",
       version: "1.0.0",
     },
     {
       capabilities: {
         tools: {},
         resources: {},
         prompts: {}
       },
     }
   );
   
   // Register handlers
   server.setRequestHandler(ListToolsRequestSchema, async () => ({
     tools: [/* tool definitions */]
   }));
   
   server.setRequestHandler(CallToolRequestSchema, async (request) => {
     const { name, arguments: args } = request.params;
     // Route to appropriate tool handler
   });
   
   // Start server
   const transport = new StdioServerTransport();
   await server.connect(transport);
   ```

3. **Tool implementation pattern**:
   
   Each tool handler should:
   - Validate inputs against schema
   - Perform the operation with error handling
   - Return structured results
   - Log operations for debugging
   
   ```typescript
   async function searchRepositories(args: { 
     query: string; 
     language?: string; 
     limit?: number 
   }) {
     try {
       // Validate required parameters
       if (!args.query || args.query.trim() === '') {
         throw new Error("Query parameter is required");
       }
       
       // Perform operation
       const results = await githubAPI.searchRepos({
         q: args.query,
         language: args.language,
         per_page: Math.min(args.limit || 10, 100)
       });
       
       // Return structured response
       return {
         content: [{
           type: "text",
           text: JSON.stringify(results, null, 2)
         }]
       };
     } catch (error) {
       // Handle errors gracefully
       return {
         content: [{
           type: "text",
           text: `Error: ${error.message}`
         }],
         isError: true
       };
     }
   }
   ```

4. **Configuration management**:
   
   Use environment variables for sensitive data:
   
   ```typescript
   // config.ts
   export const config = {
     apiKey: process.env.API_KEY,
     apiUrl: process.env.API_URL || "https://api.default.com",
     logLevel: process.env.LOG_LEVEL || "info",
     maxRetries: parseInt(process.env.MAX_RETRIES || "3")
   };
   
   // Validate required config on startup
   if (!config.apiKey) {
     throw new Error("API_KEY environment variable is required");
   }
   ```
   
   Create `.env.example`:
   
   ```bash
   # API Configuration
   API_KEY=your_api_key_here
   API_URL=https://api.example.com
   
   # Server Configuration
   LOG_LEVEL=info
   MAX_RETRIES=3
   ```

### Phase 4: Testing

1. **Unit tests for tools**:
   
   ```typescript
   import { describe, it, expect, beforeEach, vi } from 'vitest';
   import { searchRepositories } from '../src/tools/search';
   
   describe('searchRepositories tool', () => {
     beforeEach(() => {
       vi.clearAllMocks();
     });
     
     it('should search repositories with query', async () => {
       const result = await searchRepositories({ query: 'typescript' });
       expect(result.content[0].text).toContain('typescript');
     });
     
     it('should handle missing query parameter', async () => {
       const result = await searchRepositories({ query: '' });
       expect(result.isError).toBe(true);
       expect(result.content[0].text).toContain('required');
     });
     
     it('should respect limit parameter', async () => {
       const result = await searchRepositories({ 
         query: 'react', 
         limit: 5 
       });
       // Verify result count <= 5
     });
     
     it('should handle API errors gracefully', async () => {
       // Mock API failure
       vi.mocked(githubAPI.searchRepos).mockRejectedValue(
         new Error('API rate limit exceeded')
       );
       
       const result = await searchRepositories({ query: 'test' });
       expect(result.isError).toBe(true);
       expect(result.content[0].text).toContain('rate limit');
     });
   });
   ```

2. **Integration tests**:
   
   Test full MCP protocol flow:
   
   ```typescript
   import { Client } from "@modelcontextprotocol/sdk/client/index.js";
   import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
   
   describe('MCP Server Integration', () => {
     let client: Client;
     
     beforeAll(async () => {
       const transport = new StdioClientTransport({
         command: "node",
         args: ["dist/index.js"]
       });
       
       client = new Client({
         name: "test-client",
         version: "1.0.0"
       }, {
         capabilities: {}
       });
       
       await client.connect(transport);
     });
     
     it('should list available tools', async () => {
       const response = await client.listTools();
       expect(response.tools.length).toBeGreaterThan(0);
       expect(response.tools[0]).toHaveProperty('name');
       expect(response.tools[0]).toHaveProperty('inputSchema');
     });
     
     it('should execute tool successfully', async () => {
       const result = await client.callTool({
         name: "search_repositories",
         arguments: { query: "typescript" }
       });
       
       expect(result.content).toBeDefined();
       expect(result.isError).toBeFalsy();
     });
   });
   ```

3. **Schema validation tests**:
   
   Verify all tool schemas are valid JSON Schema:
   
   ```typescript
   import Ajv from 'ajv';
   import { tools } from '../src/tools';
   
   describe('Tool Schema Validation', () => {
     const ajv = new Ajv();
     
     it('should have valid JSON schemas for all tools', () => {
       tools.forEach(tool => {
         const valid = ajv.validateSchema(tool.inputSchema);
         expect(valid).toBe(true);
       });
     });
   });
   ```

### Phase 5: Documentation

1. **README.md structure**:
   
   ```markdown
   # MCP Server: [Name]
   
   [Brief description of what this server does]
   
   ## Installation
   
   \`\`\`bash
   npm install -g mcp-server-[name]
   # or
   npx mcp-server-[name]
   \`\`\`
   
   ## Configuration
   
   Create a `.env` file or set environment variables:
   
   \`\`\`bash
   API_KEY=your_key_here
   API_URL=https://api.example.com
   \`\`\`
   
   ## Usage
   
   ### With Claude Desktop
   
   Add to your `claude_desktop_config.json`:
   
   \`\`\`json
   {
     "mcpServers": {
       "[name]": {
         "command": "npx",
         "args": ["-y", "mcp-server-[name]"],
         "env": {
           "API_KEY": "your_key_here"
         }
       }
     }
   }
   \`\`\`
   
   ### With Claude Code
   
   \`\`\`bash
   claude mcp add --transport stdio [name] npx mcp-server-[name]
   \`\`\`
   
   ## Available Tools
   
   ### tool_name
   
   Description of what this tool does.
   
   **Parameters**:
   - `param1` (required): Description
   - `param2` (optional): Description
   
   **Example**:
   
   \`\`\`
   Use the tool_name tool to search for repositories matching "typescript"
   \`\`\`
   
   ## Available Resources
   
   ### resource://uri/pattern
   
   Description of what this resource provides.
   
   ## Development
   
   \`\`\`bash
   # Install dependencies
   npm install
   
   # Run tests
   npm test
   
   # Build
   npm run build
   
   # Run locally
   npm start
   \`\`\`
   
   ## Security
   
   - All API keys are passed via environment variables
   - Input validation on all tool parameters
   - Rate limiting on API calls
   - Audit logging of all operations
   
   ## Troubleshooting
   
   [Common issues and solutions]
   
   ## License
   
   MIT
   ```

2. **Inline documentation**:
   
   Add JSDoc comments to all public functions:
   
   ```typescript
   /**
    * Search GitHub repositories by query string
    * 
    * @param args - Search parameters
    * @param args.query - Search query string (required)
    * @param args.language - Filter by programming language (optional)
    * @param args.limit - Maximum number of results (default: 10, max: 100)
    * @returns Search results with repository metadata
    * @throws {Error} If query is empty or API request fails
    * 
    * @example
    * ```typescript
    * const results = await searchRepositories({ 
    *   query: "typescript", 
    *   language: "TypeScript",
    *   limit: 5 
    * });
    * ```
    */
   async function searchRepositories(args: SearchArgs) {
     // Implementation
   }
   ```

### Phase 6: Validation & Output

Before presenting the final code, verify:

**Checklist**:

- [ ] Server initialization is correct (name, version, capabilities)
- [ ] All tools have valid JSON schemas
- [ ] Tool handlers include error handling
- [ ] Input validation on all parameters
- [ ] Environment variables used for sensitive data
- [ ] Tests cover main functionality and error cases
- [ ] README includes installation, configuration, and usage
- [ ] Package.json has correct dependencies and scripts
- [ ] TypeScript types are properly defined
- [ ] No hardcoded secrets or API keys
- [ ] Logging for debugging (but not sensitive data)
- [ ] Graceful error messages for users

**Output Structure**:

Present the complete MCP server with:

1. **Summary**: Brief description of what was built
2. **File Structure**: Tree view of all files
3. **Source Code**: All implementation files
4. **Tests**: Test files
5. **Configuration**: package.json, tsconfig.json, .env.example
6. **Documentation**: README.md with full usage guide
7. **Usage Examples**: How to install and use with Claude Desktop/Claude Code
8. **Next Steps**: Suggestions for enhancement or deployment

## Security Best Practices

**CRITICAL - Always implement**:

1. **Input Validation**: Validate all tool inputs against schemas before execution
2. **Environment Variables**: Never hardcode API keys, tokens, or sensitive data
3. **Error Messages**: Don't expose internal paths, tokens, or sensitive info in errors
4. **Rate Limiting**: Implement rate limiting for API calls to prevent abuse
5. **Audit Logging**: Log all tool executions (but not sensitive parameters)
6. **Least Privilege**: Request minimum necessary permissions
7. **Sanitize Inputs**: Clean user inputs to prevent injection attacks
8. **Timeout Controls**: Set timeouts on long-running operations

## Markdown Formatting Requirements

**To ensure clean, lint-compliant documentation**:

- Add blank line before and after each heading
- Add blank line before and after each list (bullet or numbered)
- Add blank line before and after each code block
- Remove trailing spaces from all lines
- Avoid inline HTML unless necessary
- **Conservative emoji usage**: Avoid emojis in commit messages, code comments, console logs, and formal documentation. Use clear text prefixes instead (e.g., [ERROR], [INFO], [WARNING])

**RECURSIVE REQUIREMENT**: If this MCP server generates markdown output (like documentation, reports, or other prompts), ensure those outputs also follow these markdown formatting requirements.

## Example: Simple File Operations MCP Server

**User Input**: "Create an MCP server for basic file operations - read, write, list, search"

**Generated Structure**:

```
mcp-server-files/
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── tools/
│   │   ├── index.ts
│   │   ├── readFile.ts
│   │   ├── writeFile.ts
│   │   ├── listDirectory.ts
│   │   └── searchFiles.ts
│   └── types.ts
├── tests/
│   ├── tools/
│   │   ├── readFile.test.ts
│   │   ├── writeFile.test.ts
│   │   ├── listDirectory.test.ts
│   │   └── searchFiles.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
└── .env.example
```

**Key Tools**:

- `read_file`: Read file contents with encoding support
- `write_file`: Write content to file with backup
- `list_directory`: List files in directory with filters
- `search_files`: Search files by name or content

## Important Notes

- **Follow MCP Spec**: Always adhere to official Model Context Protocol specification
- **SDK Documentation**: Reference official SDK docs for your chosen language
- **Testing**: Write comprehensive tests before deployment
- **Security**: Validate inputs, sanitize outputs, protect sensitive data
- **Error Handling**: Provide helpful error messages, never expose internals
- **Documentation**: Clear README with examples and troubleshooting
- **Versioning**: Use semantic versioning (1.0.0, 1.1.0, etc.)
- **Changelog**: Maintain CHANGELOG.md for version updates

## Resources

- MCP Specification: https://modelcontextprotocol.io/
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Python SDK: https://github.com/modelcontextprotocol/python-sdk
- Example Servers: https://github.com/modelcontextprotocol/servers
- Claude Desktop Config: https://docs.anthropic.com/claude/docs/claude-desktop

---

**Ready to build!** Provide your MCP server requirements and I'll generate the complete implementation with tests and documentation.
