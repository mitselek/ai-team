import type { Agent, Team } from '../../../../types'

export interface PathInfo {
  workspace: 'agent-private' | 'agent-shared' | 'team-private' | 'team-shared'
  ownerId: string // Agent ID or Team ID
  orgId: string
  teamId?: string
  filename: string
}

export interface DataLoader {
  loadAgent: (agentId: string) => Promise<Agent | null>
  loadTeam: (teamId: string) => Promise<Team | null>
}

export class PermissionService {
  constructor(private readonly dataLoader: DataLoader) {}

  async checkFileAccess(
    agentId: string,
    path: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    try {
      // Load requesting agent
      const agent = await this.dataLoader.loadAgent(agentId)
      if (!agent) {
        throw new Error('Agent not found')
      }

      // Parse path to determine workspace type and ownership
      const pathInfo = this.parsePath(path)

      // Load owner information based on workspace type
      let targetAgent: Agent | null = null
      let team: Team | null = null

      if (pathInfo.workspace === 'agent-private' || pathInfo.workspace === 'agent-shared') {
        targetAgent = await this.dataLoader.loadAgent(pathInfo.ownerId)
        if (!targetAgent) {
          throw new Error('Target agent not found')
        }
        pathInfo.orgId = targetAgent.organizationId
      } else {
        team = await this.dataLoader.loadTeam(pathInfo.ownerId)
        if (!team) {
          throw new Error('Team not found')
        }
        pathInfo.orgId = team.organizationId
        pathInfo.teamId = team.id
      }

      // Apply access rules based on workspace type
      switch (pathInfo.workspace) {
        case 'agent-private':
          return this.checkAgentPrivateAccess(agent, targetAgent!, operation)

        case 'agent-shared':
          return this.checkAgentSharedAccess(agent, targetAgent!, operation)

        case 'team-private':
          return this.checkTeamPrivateAccess(agent, team!, operation)

        case 'team-shared':
          return this.checkTeamSharedAccess(agent, team!, operation)
      }
    } catch (error) {
      // Invalid paths or permission errors return false
      return false
    }
  }

  private parsePath(path: string): PathInfo {
    if (!path || path.trim() === '') {
      throw new Error('Invalid path format')
    }

    // Expected formats:
    // /agents/{agentId}/private/{filename}
    // /agents/{agentId}/shared/{filename}
    // /teams/{teamId}/private/{filename}
    // /teams/{teamId}/shared/{filename}

    const parts = path.split('/').filter((p) => p.length > 0)

    if (parts.length < 3) {
      throw new Error('Invalid path format')
    }

    const [entityType, entityId, workspaceType, ...filenameParts] = parts

    if (entityType !== 'agents' && entityType !== 'teams') {
      throw new Error('Invalid path format')
    }

    if (workspaceType !== 'private' && workspaceType !== 'shared') {
      throw new Error('Invalid workspace type')
    }

    if (filenameParts.length === 0) {
      throw new Error('Invalid path format')
    }

    const workspace =
      entityType === 'agents'
        ? workspaceType === 'private'
          ? 'agent-private'
          : 'agent-shared'
        : workspaceType === 'private'
          ? 'team-private'
          : 'team-shared'

    return {
      workspace,
      ownerId: entityId,
      orgId: '', // Will be populated after loading entity
      teamId: entityType === 'teams' ? entityId : undefined,
      filename: filenameParts.join('/')
    }
  }

  private checkAgentPrivateAccess(
    requestingAgent: Agent,
    targetAgent: Agent,
    _operation: 'read' | 'write' | 'delete'
  ): boolean {
    // Agent private: Owner only (RWD)
    return requestingAgent.id === targetAgent.id
  }

  private checkAgentSharedAccess(
    requestingAgent: Agent,
    targetAgent: Agent,
    operation: 'read' | 'write' | 'delete'
  ): boolean {
    // Agent shared: Owner writes (RWD), org reads (R)

    // Owner has full access
    if (requestingAgent.id === targetAgent.id) {
      return true
    }

    // Same org can read
    if (requestingAgent.organizationId === targetAgent.organizationId && operation === 'read') {
      return true
    }

    return false
  }

  private checkTeamPrivateAccess(
    requestingAgent: Agent,
    team: Team,
    operation: 'read' | 'write' | 'delete'
  ): boolean {
    // Team private: Leader writes (RWD), members read (R), others blocked

    // Must be in same org
    if (requestingAgent.organizationId !== team.organizationId) {
      return false
    }

    // Must be team member
    if (requestingAgent.teamId !== team.id) {
      return false
    }

    // Leader has full access
    if (team.leaderId === requestingAgent.id) {
      return true
    }

    // Members can only read
    return operation === 'read'
  }

  private checkTeamSharedAccess(
    requestingAgent: Agent,
    team: Team,
    operation: 'read' | 'write' | 'delete'
  ): boolean {
    // Team shared: Members write (RWD), org reads (R)

    // Must be in same org
    if (requestingAgent.organizationId !== team.organizationId) {
      return false
    }

    // Team members have full access
    if (requestingAgent.teamId === team.id) {
      return true
    }

    // Library team special case: org-wide read access
    if (team.type === 'library' && operation === 'read') {
      return true
    }

    // Same org can read non-library shared files
    if (operation === 'read') {
      return true
    }

    return false
  }
}
