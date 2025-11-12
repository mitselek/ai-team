import { mkdir, writeFile, readFile, readdir } from 'fs/promises'
import path from 'path'
import { createLogger } from '../../utils/logger'
import type { Organization, Team, Agent } from '@@/types'
import type { InterviewSession, InterviewMessage } from './types'

const log = createLogger('persistence:filesystem')

// Allow tests to override the data directory
function getDataDir(): string {
  return process.env.TEST_DATA_DIR || path.resolve(process.cwd(), 'data/organizations')
}
const DATA_DIR = getDataDir()

// Helper to ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true })
  } catch (error: unknown) {
    log.error({ error, path: dirPath }, 'Failed to create directory')
    throw error
  }
}

// --- Organization ---

export async function saveOrganization(org: Organization): Promise<void> {
  const orgPath = path.join(DATA_DIR, org.id)
  await ensureDir(orgPath)
  const filePath = path.join(orgPath, 'manifest.json')
  const data = {
    ...org,
    createdAt: org.createdAt.toISOString()
  }
  try {
    await writeFile(filePath, JSON.stringify(data, null, 2))
  } catch (error: unknown) {
    log.error({ error, orgId: org.id }, 'Failed to save organization')
    throw error
  }
}

export async function loadOrganization(orgId: string): Promise<Organization | null> {
  const filePath = path.join(DATA_DIR, orgId, 'manifest.json')
  try {
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content)
    return {
      ...data,
      createdAt: new Date(data.createdAt)
    }
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    log.error({ error, orgId }, 'Failed to load organization')
    throw error
  }
}

export async function listOrganizations(): Promise<string[]> {
  try {
    const entries = await readdir(DATA_DIR, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

// --- Team ---

export async function saveTeam(team: Team): Promise<void> {
  const teamDir = path.join(DATA_DIR, team.organizationId, 'teams')
  await ensureDir(teamDir)
  const filePath = path.join(teamDir, `${team.id}.json`)
  try {
    await writeFile(filePath, JSON.stringify(team, null, 2))
  } catch (error: unknown) {
    log.error({ error, teamId: team.id, orgId: team.organizationId }, 'Failed to save team')
    throw error
  }
}

export async function loadTeams(orgId: string): Promise<Team[]> {
  const teamDir = path.join(DATA_DIR, orgId, 'teams')
  try {
    const files = await readdir(teamDir)
    const teams: Team[] = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(path.join(teamDir, file), 'utf-8')
        teams.push(JSON.parse(content))
      }
    }
    return teams
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }
    log.error({ error, orgId }, 'Failed to load teams')
    throw error
  }
}

// --- Agent ---

export async function saveAgent(agent: Agent): Promise<void> {
  const agentDir = path.join(DATA_DIR, agent.organizationId, 'agents')
  await ensureDir(agentDir)
  const filePath = path.join(agentDir, `${agent.id}.json`)
  const data = {
    ...agent,
    createdAt: agent.createdAt.toISOString(),
    lastActiveAt: agent.lastActiveAt.toISOString()
  }
  try {
    await writeFile(filePath, JSON.stringify(data, null, 2))
  } catch (error: unknown) {
    log.error({ error, agentId: agent.id, orgId: agent.organizationId }, 'Failed to save agent')
    throw error
  }
}

export async function loadAgents(orgId: string): Promise<Agent[]> {
  const agentDir = path.join(DATA_DIR, orgId, 'agents')
  try {
    const files = await readdir(agentDir)
    const agents: Agent[] = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(path.join(agentDir, file), 'utf-8')
        const data = JSON.parse(content)
        agents.push({
          ...data,
          createdAt: new Date(data.createdAt),
          lastActiveAt: new Date(data.lastActiveAt)
        })
      }
    }
    return agents
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }
    log.error({ error, orgId }, 'Failed to load agents')
    throw error
  }
}

// --- Interview ---

async function getOrgIdForInterview(session: InterviewSession): Promise<string | null> {
  const orgIds = await listOrganizations()
  for (const orgId of orgIds) {
    const agentDir = path.join(DATA_DIR, orgId, 'agents')
    try {
      const files = await readdir(agentDir)
      for (const file of files) {
        if (file === `${session.interviewerId}.json`) {
          const content = await readFile(path.join(agentDir, file), 'utf-8')
          const agent = JSON.parse(content)
          return agent.organizationId
        }
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        log.warn(
          { error, orgId },
          'Could not read agent directory while searching for interview org'
        )
      }
    }
  }
  return null
}

export async function saveInterview(session: InterviewSession): Promise<void> {
  const orgId = await getOrgIdForInterview(session)
  if (!orgId) {
    const err = new Error(`Could not find organization for interviewer ${session.interviewerId}`)
    log.error(
      { error: err, sessionId: session.id, interviewerId: session.interviewerId },
      'Failed to save interview'
    )
    throw err
  }

  const interviewDir = path.join(DATA_DIR, orgId, 'interviews')
  await ensureDir(interviewDir)
  const filePath = path.join(interviewDir, `${session.id}.json`)

  const data = {
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    transcript: session.transcript.map((t) => ({
      ...t,
      timestamp: t.timestamp.toISOString()
    }))
  }

  try {
    await writeFile(filePath, JSON.stringify(data, null, 2))
  } catch (error: unknown) {
    log.error({ error, sessionId: session.id, orgId }, 'Failed to save interview session')
    throw error
  }
}

export async function loadInterview(sessionId: string): Promise<InterviewSession | null> {
  const orgIds = await listOrganizations()
  for (const orgId of orgIds) {
    const filePath = path.join(DATA_DIR, orgId, 'interviews', `${sessionId}.json`)
    try {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        transcript: data.transcript.map(
          (t: InterviewMessage): InterviewMessage => ({
            ...t,
            timestamp: new Date(t.timestamp)
          })
        )
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        log.error({ error, sessionId, orgId }, 'Failed to load interview')
        throw error
      }
    }
  }
  return null
}

export async function loadInterviews(orgId: string): Promise<InterviewSession[]> {
  const interviewDir = path.join(DATA_DIR, orgId, 'interviews')
  try {
    const files = await readdir(interviewDir)
    const sessions: InterviewSession[] = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(path.join(interviewDir, file), 'utf-8')
        const data = JSON.parse(content)
        sessions.push({
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          transcript: data.transcript.map(
            (t: InterviewMessage): InterviewMessage => ({
              ...t,
              timestamp: new Date(t.timestamp)
            })
          )
        })
      }
    }
    return sessions
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }
    log.error({ error, orgId }, 'Failed to load interviews')
    throw error
  }
}
