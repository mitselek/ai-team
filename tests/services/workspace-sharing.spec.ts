import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Agent, Team } from '@@/types'

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

// Import services to test
// NOTE: WorkspaceAccessService will be created as part of F066 implementation
import { agents } from '../../app/server/data/agents'
import { teams } from '../../app/server/data/teams'
import path from 'node:path'
import * as fs from 'node:fs/promises'

// Mock WorkspaceAccessService for now (will be implemented)
class WorkspaceAccessService {
  canRead(_agentId: string, _filePath: string, _organizationId: string): boolean {
    throw new Error('Not implemented - F066 in progress')
  }

  canWrite(_agentId: string, _filePath: string, _organizationId: string): boolean {
    throw new Error('Not implemented - F066 in progress')
  }

  canDelete(_agentId: string, _filePath: string, _organizationId: string): boolean {
    throw new Error('Not implemented - F066 in progress')
  }
}

// Test data setup
const testOrgId = 'test-org-123'
const testTeamId = 'test-team-456'
const testAgentId = 'test-agent-789'
const testAgent2Id = 'test-agent-999'
const testDataDir = path.join(process.cwd(), 'test-data-workspace-sharing')

let workspaceAccessService: WorkspaceAccessService

const testAgent: Agent = {
  id: testAgentId,
  name: 'Alex',
  role: 'worker' as const,
  seniorId: null,
  teamId: testTeamId,
  organizationId: testOrgId,
  systemPrompt: 'Test agent',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active' as const,
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const testAgent2: Agent = {
  id: testAgent2Id,
  name: 'Marcus',
  role: 'worker' as const,
  seniorId: null,
  teamId: 'different-team',
  organizationId: testOrgId,
  systemPrompt: 'Test agent 2',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active' as const,
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const testTeam: Team = {
  id: testTeamId,
  name: 'Development',
  organizationId: testOrgId,
  leaderId: null,
  tokenAllocation: 50000,
  type: 'custom' as const
}

beforeEach(async () => {
  // Clear data arrays
  agents.length = 0
  teams.length = 0

  // Add test data
  agents.push(testAgent, testAgent2)
  teams.push(testTeam)

  // Clean up test directory
  try {
    await fs.rm(testDataDir, { recursive: true, force: true })
  } catch (error) {
    // Ignore if directory doesn't exist
  }
  await fs.mkdir(testDataDir, { recursive: true })

  // Initialize services
  workspaceAccessService = new WorkspaceAccessService()
})

describe('Suite 1: Team Workspace Creation', () => {
  it('should create team workspace directories on initialization', async () => {
    const teamPrivatePath = path.join(testDataDir, testOrgId, 'workspaces', testTeamId, 'private')
    const teamSharedPath = path.join(testDataDir, testOrgId, 'workspaces', testTeamId, 'shared')

    // Create directories
    await fs.mkdir(teamPrivatePath, { recursive: true })
    await fs.mkdir(teamSharedPath, { recursive: true })

    // Verify directories exist
    const privateStats = await fs.stat(teamPrivatePath)
    const sharedStats = await fs.stat(teamSharedPath)

    expect(privateStats.isDirectory()).toBe(true)
    expect(sharedStats.isDirectory()).toBe(true)
  })

  it('should create agent workspace directories on initialization', async () => {
    const agentPrivatePath = path.join(testDataDir, testOrgId, 'workspaces', testAgentId, 'private')
    const agentSharedPath = path.join(testDataDir, testOrgId, 'workspaces', testAgentId, 'shared')

    await fs.mkdir(agentPrivatePath, { recursive: true })
    await fs.mkdir(agentSharedPath, { recursive: true })

    const privateStats = await fs.stat(agentPrivatePath)
    const sharedStats = await fs.stat(agentSharedPath)

    expect(privateStats.isDirectory()).toBe(true)
    expect(sharedStats.isDirectory()).toBe(true)
  })

  it('should not fail if workspace directories already exist', async () => {
    const teamPrivatePath = path.join(testDataDir, testOrgId, 'workspaces', testTeamId, 'private')

    await fs.mkdir(teamPrivatePath, { recursive: true })

    // Should not throw when creating again
    await expect(fs.mkdir(teamPrivatePath, { recursive: true })).resolves.not.toThrow()
  })
})

describe('Suite 2: Folder Discovery - All 5 Scopes', () => {
  it('should discover my_private scope (agent private workspace)', () => {
    const canRead = workspaceAccessService.canRead(
      testAgentId,
      `${testOrgId}/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should discover my_shared scope (agent shared workspace)', () => {
    const canRead = workspaceAccessService.canRead(
      testAgentId,
      `${testOrgId}/workspaces/${testAgentId}/shared/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should discover team_private scope (team members only)', () => {
    const canRead = workspaceAccessService.canRead(
      testAgentId,
      `${testOrgId}/workspaces/${testTeamId}/private/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should discover team_shared scope (team + org visibility)', () => {
    const canRead = workspaceAccessService.canRead(
      testAgentId,
      `${testOrgId}/workspaces/${testTeamId}/shared/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should discover org_shared scope (all team shared + agent shared)', () => {
    // Agent from different team should see team_shared
    const canRead = workspaceAccessService.canRead(
      testAgent2Id,
      `${testOrgId}/workspaces/${testTeamId}/shared/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should list my_private and my_shared folders for agent', async () => {
    const agentPrivatePath = path.join(testDataDir, testOrgId, 'workspaces', testAgentId, 'private')
    const agentSharedPath = path.join(testDataDir, testOrgId, 'workspaces', testAgentId, 'shared')

    await fs.mkdir(agentPrivatePath, { recursive: true })
    await fs.mkdir(agentSharedPath, { recursive: true })

    // Create test files
    await fs.writeFile(path.join(agentPrivatePath, 'private.md'), 'private content')
    await fs.writeFile(path.join(agentSharedPath, 'shared.md'), 'shared content')

    // List folders (this would use MCPFileServer.executeListFolders in real implementation)
    // For now, verify paths exist
    expect((await fs.stat(agentPrivatePath)).isDirectory()).toBe(true)
    expect((await fs.stat(agentSharedPath)).isDirectory()).toBe(true)
  })

  it('should list team_private and team_shared folders for team members', async () => {
    const teamPrivatePath = path.join(testDataDir, testOrgId, 'workspaces', testTeamId, 'private')
    const teamSharedPath = path.join(testDataDir, testOrgId, 'workspaces', testTeamId, 'shared')

    await fs.mkdir(teamPrivatePath, { recursive: true })
    await fs.mkdir(teamSharedPath, { recursive: true })

    expect((await fs.stat(teamPrivatePath)).isDirectory()).toBe(true)
    expect((await fs.stat(teamSharedPath)).isDirectory()).toBe(true)
  })
})

describe('Suite 3: Permission Checks - Read Access', () => {
  it('should allow agent to read their own my_private files', () => {
    const canRead = workspaceAccessService.canRead(
      testAgentId,
      `${testOrgId}/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should deny other agents reading my_private files', () => {
    const canRead = workspaceAccessService.canRead(
      testAgent2Id,
      `${testOrgId}/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canRead).toBe(false)
  })

  it('should allow team members to read my_shared files', () => {
    // Same team member should be able to read
    const canRead = workspaceAccessService.canRead(
      testAgentId,
      `${testOrgId}/workspaces/${testAgentId}/shared/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should allow team members to read team_private files', () => {
    const canRead = workspaceAccessService.canRead(
      testAgentId,
      `${testOrgId}/workspaces/${testTeamId}/private/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should deny non-team members reading team_private files', () => {
    const canRead = workspaceAccessService.canRead(
      testAgent2Id,
      `${testOrgId}/workspaces/${testTeamId}/private/test.md`,
      testOrgId
    )
    expect(canRead).toBe(false)
  })

  it('should allow all org members to read team_shared files', () => {
    const canRead = workspaceAccessService.canRead(
      testAgent2Id,
      `${testOrgId}/workspaces/${testTeamId}/shared/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should allow all org members to read other agents my_shared files', () => {
    const canRead = workspaceAccessService.canRead(
      testAgent2Id,
      `${testOrgId}/workspaces/${testAgentId}/shared/test.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should deny read access with invalid organizationId', () => {
    const canRead = workspaceAccessService.canRead(
      testAgentId,
      `wrong-org/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canRead).toBe(false)
  })
})

describe('Suite 4: Permission Checks - Write Access', () => {
  it('should allow agent to write to their own my_private', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgentId,
      `${testOrgId}/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(true)
  })

  it('should deny other agents writing to my_private', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgent2Id,
      `${testOrgId}/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(false)
  })

  it('should allow agent to write to their own my_shared', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgentId,
      `${testOrgId}/workspaces/${testAgentId}/shared/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(true)
  })

  it('should deny other agents writing to someone else my_shared', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgent2Id,
      `${testOrgId}/workspaces/${testAgentId}/shared/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(false)
  })

  it('should allow team members to write to team_private', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgentId,
      `${testOrgId}/workspaces/${testTeamId}/private/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(true)
  })

  it('should deny non-team members writing to team_private', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgent2Id,
      `${testOrgId}/workspaces/${testTeamId}/private/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(false)
  })

  it('should allow team members to write to team_shared', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgentId,
      `${testOrgId}/workspaces/${testTeamId}/shared/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(true)
  })

  it('should deny non-team members writing to team_shared', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgent2Id,
      `${testOrgId}/workspaces/${testTeamId}/shared/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(false)
  })

  it('should deny write access with invalid organizationId', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgentId,
      `wrong-org/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canWrite).toBe(false)
  })
})

describe('Suite 5: Permission Checks - Delete Access', () => {
  it('should allow agent to delete their own my_private files', () => {
    const canDelete = workspaceAccessService.canDelete(
      testAgentId,
      `${testOrgId}/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canDelete).toBe(true)
  })

  it('should deny other agents deleting my_private files', () => {
    const canDelete = workspaceAccessService.canDelete(
      testAgent2Id,
      `${testOrgId}/workspaces/${testAgentId}/private/test.md`,
      testOrgId
    )
    expect(canDelete).toBe(false)
  })

  it('should allow agent to delete their own my_shared files', () => {
    const canDelete = workspaceAccessService.canDelete(
      testAgentId,
      `${testOrgId}/workspaces/${testAgentId}/shared/test.md`,
      testOrgId
    )
    expect(canDelete).toBe(true)
  })

  it('should allow team members to delete team_private files', () => {
    const canDelete = workspaceAccessService.canDelete(
      testAgentId,
      `${testOrgId}/workspaces/${testTeamId}/private/test.md`,
      testOrgId
    )
    expect(canDelete).toBe(true)
  })

  it('should allow team members to delete team_shared files', () => {
    const canDelete = workspaceAccessService.canDelete(
      testAgentId,
      `${testOrgId}/workspaces/${testTeamId}/shared/test.md`,
      testOrgId
    )
    expect(canDelete).toBe(true)
  })
})

describe('Suite 6: Integration Scenarios', () => {
  it('should allow Alex to write and Marcus to read from team_shared', async () => {
    const teamSharedPath = path.join(testDataDir, testOrgId, 'workspaces', testTeamId, 'shared')
    await fs.mkdir(teamSharedPath, { recursive: true })

    // Alex writes
    const filePath = path.join(teamSharedPath, 'collaboration.md')
    await fs.writeFile(filePath, 'Alex content')

    // Marcus reads (different team but org member)
    const canRead = workspaceAccessService.canRead(
      testAgent2Id,
      `${testOrgId}/workspaces/${testTeamId}/shared/collaboration.md`,
      testOrgId
    )
    expect(canRead).toBe(true)

    const content = await fs.readFile(filePath, 'utf-8')
    expect(content).toBe('Alex content')
  })

  it('should deny Marcus reading Alex my_private', () => {
    const canRead = workspaceAccessService.canRead(
      testAgent2Id,
      `${testOrgId}/workspaces/${testAgentId}/private/secret.md`,
      testOrgId
    )
    expect(canRead).toBe(false)
  })

  it('should allow Elena (org member) to discover all team_shared folders', () => {
    const elenaId = 'elena-123'
    const elenaAgent: Agent = {
      id: elenaId,
      name: 'Elena',
      role: 'worker' as const,
      seniorId: null,
      teamId: 'leadership-team',
      organizationId: testOrgId,
      systemPrompt: 'Leadership agent',
      tokenAllocation: 10000,
      tokenUsed: 0,
      status: 'active' as const,
      createdAt: new Date(),
      lastActiveAt: new Date()
    }
    agents.push(elenaAgent)

    const canRead = workspaceAccessService.canRead(
      elenaId,
      `${testOrgId}/workspaces/${testTeamId}/shared/public.md`,
      testOrgId
    )
    expect(canRead).toBe(true)
  })

  it('should prevent Marcus from writing to Alex team_private (different teams)', () => {
    const canWrite = workspaceAccessService.canWrite(
      testAgent2Id,
      `${testOrgId}/workspaces/${testTeamId}/private/internal.md`,
      testOrgId
    )
    expect(canWrite).toBe(false)
  })
})

describe('Suite 7: Error Messages', () => {
  it('should return false for permission denied on read', () => {
    const testPath = `${testOrgId}/workspaces/${testAgentId}/private/test.md`

    const canRead = workspaceAccessService.canRead(testAgent2Id, testPath, testOrgId)
    expect(canRead).toBe(false)
  })

  it('should return false for permission denied on write', () => {
    const testPath = `${testOrgId}/workspaces/${testAgentId}/private/test.md`

    const canWrite = workspaceAccessService.canWrite(testAgent2Id, testPath, testOrgId)
    expect(canWrite).toBe(false)
  })

  it('should return false for permission denied on delete', () => {
    const testPath = `${testOrgId}/workspaces/${testAgentId}/private/test.md`

    const canDelete = workspaceAccessService.canDelete(testAgent2Id, testPath, testOrgId)
    expect(canDelete).toBe(false)
  })

  it('should return false for invalid workspace path', () => {
    const invalidPath = 'invalid/path/format'

    const canRead = workspaceAccessService.canRead(testAgentId, invalidPath, testOrgId)
    expect(canRead).toBe(false)
  })
})
