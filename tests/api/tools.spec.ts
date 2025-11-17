import { describe, it, expect } from 'vitest'

describe('Tools API', () => {
  it('should list all available tools', async () => {
    const response = await fetch('http://localhost:3000/api/tools')
    const data = await response.json()

    expect(data.tools).toBeDefined()
    expect(data.tools.email).toBeDefined()
  })

  it('should list tools for specific agent', async () => {
    // Assuming we have a Postmaster agent with ID
    const response = await fetch('http://localhost:3000/api/tools?agentId=postmaster-1')
    const data = await response.json()

    expect(data.agentId).toBe('postmaster-1')
    expect(data.tools).toBeDefined()
  })

  it('should execute email tool for authorized agent', async () => {
    const response = await fetch('http://localhost:3000/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'postmaster-1',
        serverName: 'email',
        toolName: 'read_inbox',
        arguments: { limit: 3 }
      })
    })

    const data = await response.json()
    expect(data.result).toBeDefined()
  })
})
