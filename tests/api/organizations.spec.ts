import { describe, it, expect, beforeEach } from 'vitest'
import { organizations } from '../../server/data/organizations'

// Mock the API routes
describe('Organizations API', () => {
  beforeEach(() => {
    // Clear organizations before each test
    organizations.length = 0
  })

  it('should start with empty organizations array', () => {
    expect(organizations).toHaveLength(0)
  })

  it('should be able to add an organization', () => {
    const org = {
      id: 'test-org-1',
      name: 'Test Organization',
      githubRepoUrl: 'https://github.com/test/org',
      tokenPool: 1000000,
      rootAgentId: null,
      createdAt: new Date()
    }

    organizations.push(org)

    expect(organizations).toHaveLength(1)
    expect(organizations[0]).toEqual(org)
    expect(organizations[0].name).toBe('Test Organization')
  })

  it('should support multiple organizations', () => {
    const org1 = {
      id: 'org-1',
      name: 'First Org',
      githubRepoUrl: 'https://github.com/test/org1',
      tokenPool: 1000000,
      rootAgentId: null,
      createdAt: new Date()
    }

    const org2 = {
      id: 'org-2',
      name: 'Second Org',
      githubRepoUrl: 'https://github.com/test/org2',
      tokenPool: 500000,
      rootAgentId: null,
      createdAt: new Date()
    }

    organizations.push(org1, org2)

    expect(organizations).toHaveLength(2)
    expect(organizations.find(o => o.id === 'org-1')?.name).toBe('First Org')
    expect(organizations.find(o => o.id === 'org-2')?.tokenPool).toBe(500000)
  })
})
