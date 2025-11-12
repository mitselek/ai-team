import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import type { Organization, Team, Agent } from '@@/types'
import type { InterviewSession } from '../../../app/server/services/persistence/types'

// Mock logger to prevent console spam
vi.mock('../../../app/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }))
  })
}))

let tempDir: string

// --- Test Data Fixtures ---

const createTestOrg = (): Organization => ({
  id: 'test-org-1',
  name: 'Test Organization',
  githubRepoUrl: 'https://github.com/test/org',
  tokenPool: 10000000,
  rootAgentId: null,
  createdAt: new Date('2025-01-01T10:00:00.000Z')
})

const createTestTeam = (orgId: string): Team => ({
  id: 'team-1',
  name: 'HR Team',
  organizationId: orgId,
  leaderId: null,
  tokenAllocation: 1000000,
  type: 'hr'
})

const createTestAgent = (orgId: string, teamId: string): Agent => ({
  id: 'agent-1',
  name: 'Marcus',
  role: 'HR Specialist',
  seniorId: null,
  teamId,
  organizationId: orgId,
  systemPrompt: 'You are Marcus.',
  tokenAllocation: 500000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date('2025-01-01T10:00:00.000Z'),
  lastActiveAt: new Date('2025-01-01T12:00:00.000Z')
})

const createTestInterview = (teamId: string, interviewerId: string): InterviewSession => ({
  id: 'session-1',
  candidateId: 'candidate-1',
  teamId,
  interviewerId,
  status: 'active',
  currentState: 'ask_role',
  transcript: [
    {
      id: 'msg-1',
      speaker: 'interviewer',
      message: 'Hello!',
      timestamp: new Date('2025-01-01T12:00:00.000Z')
    },
    {
      id: 'msg-2',
      speaker: 'candidate',
      message: 'Hi there!',
      timestamp: new Date('2025-01-01T12:01:00.000Z')
    }
  ],
  candidateProfile: {
    role: '',
    expertise: [],
    preferences: { communicationStyle: '', workingHours: '', autonomyLevel: '' },
    personality: { traits: [], tone: '' }
  },
  createdAt: new Date('2025-01-01T12:00:00.000Z'),
  updatedAt: new Date('2025-01-01T12:01:00.000Z')
})

// --- Test Suite ---

describe('Filesystem Persistence', () => {
  let service: typeof import('../../../app/server/services/persistence/filesystem')

  beforeEach(async () => {
    // Create unique temp directory for this test
    tempDir = path.join(
      os.tmpdir(),
      `test-persistence-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await fs.mkdir(tempDir, { recursive: true })

    // Set environment variable BEFORE importing
    process.env.TEST_DATA_DIR = tempDir

    // Reset and reimport module to pick up new TEST_DATA_DIR
    vi.resetModules()
    service = await import('../../../app/server/services/persistence/filesystem')
  })

  afterEach(async () => {
    // Clean up
    delete process.env.TEST_DATA_DIR
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  })

  describe('saveOrganization', () => {
    it('should create directory and save manifest.json', async () => {
      const org = createTestOrg()
      await service.saveOrganization(org)
      const manifestPath = path.join(tempDir, org.id, 'manifest.json')
      const content = await fs.readFile(manifestPath, 'utf-8')
      const data = JSON.parse(content)
      expect(data.id).toBe(org.id)
      expect(data.createdAt).toBe('2025-01-01T10:00:00.000Z')
    })
  })

  describe('loadOrganization', () => {
    it('should load and reconstruct Date objects', async () => {
      const org = createTestOrg()
      await service.saveOrganization(org)
      const loaded = await service.loadOrganization(org.id)
      expect(loaded).not.toBeNull()
      expect(loaded?.id).toBe(org.id)
      expect(loaded?.createdAt).toBeInstanceOf(Date)
    })

    it('should return null for non-existent organization', async () => {
      const loaded = await service.loadOrganization('non-existent')
      expect(loaded).toBeNull()
    })

    it('should throw for corrupt JSON', async () => {
      const org = createTestOrg()
      const orgPath = path.join(tempDir, org.id)
      await fs.mkdir(orgPath, { recursive: true })
      await fs.writeFile(path.join(orgPath, 'manifest.json'), '{"corrupt": json')
      await expect(service.loadOrganization(org.id)).rejects.toThrow()
    })
  })

  describe('listOrganizations', () => {
    it('should return an empty array for an empty directory', async () => {
      const orgs = await service.listOrganizations()
      expect(orgs).toEqual([])
    })

    it('should return all organization IDs', async () => {
      await service.saveOrganization(createTestOrg())
      const org2 = { ...createTestOrg(), id: 'test-org-2' }
      await service.saveOrganization(org2)
      const orgs = await service.listOrganizations()
      expect(orgs).toHaveLength(2)
      expect(orgs).toContain('test-org-1')
    })
  })

  describe('Teams', () => {
    const org = createTestOrg()
    beforeEach(async () => {
      await service.saveOrganization(org)
    })

    it('saveTeam should save a team', async () => {
      const team = createTestTeam(org.id)
      await service.saveTeam(team)
      const teamPath = path.join(tempDir, org.id, 'teams', `${team.id}.json`)
      await expect(fs.access(teamPath)).resolves.toBeUndefined()
    })

    it('loadTeams should return an empty array if directory is missing', async () => {
      const teams = await service.loadTeams(org.id)
      expect(teams).toEqual([])
    })

    it('loadTeams should load all teams', async () => {
      await service.saveTeam(createTestTeam(org.id))
      const teams = await service.loadTeams(org.id)
      expect(teams).toHaveLength(1)
      expect(teams[0].id).toBe('team-1')
    })
  })

  describe('Agents', () => {
    const org = createTestOrg()
    const team = createTestTeam(org.id)
    beforeEach(async () => {
      await service.saveOrganization(org)
      await service.saveTeam(team)
    })

    it('saveAgent should save an agent and convert dates', async () => {
      const agent = createTestAgent(org.id, team.id)
      await service.saveAgent(agent)
      const agentPath = path.join(tempDir, org.id, 'agents', `${agent.id}.json`)
      const data = JSON.parse(await fs.readFile(agentPath, 'utf-8'))
      expect(data.createdAt).toBe('2025-01-01T10:00:00.000Z')
      expect(data.lastActiveAt).toBe('2025-01-01T12:00:00.000Z')
    })

    it('loadAgents should load all agents and reconstruct dates', async () => {
      await service.saveAgent(createTestAgent(org.id, team.id))
      const agents = await service.loadAgents(org.id)
      expect(agents).toHaveLength(1)
      expect(agents[0].createdAt).toBeInstanceOf(Date)
      expect(agents[0].lastActiveAt).toBeInstanceOf(Date)
    })
  })

  describe('Interviews', () => {
    const org = createTestOrg()
    const team = createTestTeam(org.id)
    const agent = createTestAgent(org.id, team.id)

    beforeEach(async () => {
      await service.saveOrganization(org)
      await service.saveTeam(team)
      await service.saveAgent(agent)
    })

    it('saveInterview should throw if interviewer agent not found', async () => {
      const interview = createTestInterview(team.id, 'non-existent-agent')
      await expect(service.saveInterview(interview)).rejects.toThrow()
    })

    it('saveInterview should save an interview and convert dates', async () => {
      const interview = createTestInterview(team.id, agent.id)
      await service.saveInterview(interview)
      const interviewPath = path.join(tempDir, org.id, 'interviews', `${interview.id}.json`)
      const data = JSON.parse(await fs.readFile(interviewPath, 'utf-8'))
      expect(data.createdAt).toBe('2025-01-01T12:00:00.000Z')
      expect(data.transcript[0].timestamp).toBe('2025-01-01T12:00:00.000Z')
    })

    it('loadInterview should return null if not found', async () => {
      const interview = await service.loadInterview('non-existent')
      expect(interview).toBeNull()
    })

    it('loadInterview should find and reconstruct an interview', async () => {
      await service.saveInterview(createTestInterview(team.id, agent.id))
      const loaded = await service.loadInterview('session-1')
      expect(loaded).not.toBeNull()
      expect(loaded?.createdAt).toBeInstanceOf(Date)
      expect(loaded?.transcript[0].timestamp).toBeInstanceOf(Date)
    })

    it('loadInterviews should return an empty array if directory missing', async () => {
      const org2 = { ...createTestOrg(), id: 'org-2' } // An org with no interviews
      await service.saveOrganization(org2)
      const interviews = await service.loadInterviews(org2.id)
      expect(interviews).toEqual([])
    })

    it('loadInterviews should load all interviews for an org', async () => {
      await service.saveInterview(createTestInterview(team.id, agent.id))
      const interviews = await service.loadInterviews(org.id)
      expect(interviews).toHaveLength(1)
      expect(interviews[0].id).toBe('session-1')
    })
  })
})
