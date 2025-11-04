import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initializeDefaultTeams } from '../../server/utils/initializeOrganization'
import { teams } from '../../server/data/teams'

// Mock the logger to avoid stream.write errors
vi.mock('../../server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

describe('initializeDefaultTeams', () => {
  const orgId = 'org-test-uuid'
  const orgId2 = 'org-test-uuid-2'

  beforeEach(() => {
    // Clear teams array before each test
    teams.length = 0
  })

  // 1. Basic Functionality Tests
  it('should create exactly 6 core teams', () => {
    const createdTeams = initializeDefaultTeams(orgId)
    expect(createdTeams).toHaveLength(6)
    expect(teams).toHaveLength(6)
  })

  it('should link all teams to the provided organization', () => {
    const createdTeams = initializeDefaultTeams(orgId)
    for (const team of createdTeams) {
      expect(team.organizationId).toBe(orgId)
    }
  })

  it('should set leaderId to null for all teams', () => {
    const createdTeams = initializeDefaultTeams(orgId)
    for (const team of createdTeams) {
      expect(team.leaderId).toBeNull()
    }
  })

  // 2. Team Type Coverage Tests
  it("should create HR team with type 'hr'", () => {
    const createdTeams = initializeDefaultTeams(orgId)
    const hrTeam = createdTeams.find(t => t.type === 'hr')
    expect(hrTeam).toBeDefined()
    expect(hrTeam?.name).toBe('Human Resources')
  })

  it("should create Toolsmith team with type 'toolsmith'", () => {
    const createdTeams = initializeDefaultTeams(orgId)
    const toolsmithTeam = createdTeams.find(t => t.type === 'toolsmith')
    expect(toolsmithTeam).toBeDefined()
    expect(toolsmithTeam?.name).toBe('Toolsmiths')
  })

  it("should create Library team with type 'library'", () => {
    const createdTeams = initializeDefaultTeams(orgId)
    const libraryTeam = createdTeams.find(t => t.type === 'library')
    expect(libraryTeam).toBeDefined()
    expect(libraryTeam?.name).toBe('Knowledge Library')
  })

  it("should create Vault team with type 'vault'", () => {
    const createdTeams = initializeDefaultTeams(orgId)
    const vaultTeam = createdTeams.find(t => t.type === 'vault')
    expect(vaultTeam).toBeDefined()
    expect(vaultTeam?.name).toBe('Vault')
  })

  it("should create Tools Library team with type 'tools-library'", () => {
    const createdTeams = initializeDefaultTeams(orgId)
    const toolsLibraryTeam = createdTeams.find(t => t.type === 'tools-library')
    expect(toolsLibraryTeam).toBeDefined()
    expect(toolsLibraryTeam?.name).toBe('Tools Library')
  })

  it("should create Nurse team with type 'nurse'", () => {
    const createdTeams = initializeDefaultTeams(orgId)
    const nurseTeam = createdTeams.find(t => t.type === 'nurse')
    expect(nurseTeam).toBeDefined()
    expect(nurseTeam?.name).toBe('The Nurse')
  })

  // 3. Token Allocation Tests
  it('should set appropriate token allocations for each team', () => {
    const createdTeams = initializeDefaultTeams(orgId)
    expect(createdTeams.find(t => t.type === 'hr')?.tokenAllocation).toBe(50000)
    expect(createdTeams.find(t => t.type === 'toolsmith')?.tokenAllocation).toBe(100000)
    expect(createdTeams.find(t => t.type === 'library')?.tokenAllocation).toBe(75000)
    expect(createdTeams.find(t => t.type === 'vault')?.tokenAllocation).toBe(25000)
    expect(createdTeams.find(t => t.type === 'tools-library')?.tokenAllocation).toBe(50000)
    expect(createdTeams.find(t => t.type === 'nurse')?.tokenAllocation).toBe(50000)
  })

  // 4. Field Completeness Tests
  it('should populate all required Team fields', () => {
    const createdTeams = initializeDefaultTeams(orgId)
    for (const team of createdTeams) {
      expect(team.id).toEqual(expect.any(String))
      expect(team.id).not.toBe('')
      expect(team.name).toEqual(expect.any(String))
      expect(team.name).not.toBe('')
      expect(team.organizationId).toBe(orgId)
      expect(team.leaderId).toBeNull()
      expect(team.tokenAllocation).toEqual(expect.any(Number))
      expect(team.tokenAllocation).toBeGreaterThan(0)
      expect(team.type).toEqual(expect.any(String))
      expect(['hr', 'toolsmith', 'library', 'vault', 'tools-library', 'nurse', 'custom']).toContain(team.type)
    }
  })

  // 5. Idempotency Tests
  it('should be idempotent when called multiple times', () => {
    initializeDefaultTeams(orgId)
    const secondCallTeams = initializeDefaultTeams(orgId)

    const orgTeams = teams.filter(t => t.organizationId === orgId)
    expect(orgTeams).toHaveLength(6)
    expect(secondCallTeams).toHaveLength(6)
  })

  it('should handle multiple organizations independently', () => {
    const org1Teams = initializeDefaultTeams(orgId)
    const org2Teams = initializeDefaultTeams(orgId2)

    expect(org1Teams).toHaveLength(6)
    org1Teams.forEach(team => expect(team.organizationId).toBe(orgId))

    expect(org2Teams).toHaveLength(6)
    org2Teams.forEach(team => expect(team.organizationId).toBe(orgId2))

    expect(teams).toHaveLength(12)
  })
})
