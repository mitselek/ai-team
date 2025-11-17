import type { Agent, Team } from '@@/types'

/**
 * Service for managing workspace access permissions across the 5 folder scopes.
 *
 * **Folder Scopes:**
 * 1. `my_private`: Agent's private workspace (only the agent)
 * 2. `my_shared`: Agent's shared workspace (agent + team + leadership)
 * 3. `team_private`: Team's private workspace (team members only)
 * 4. `team_shared`: Team's shared workspace (all team members + org-wide visibility)
 * 5. `org_shared`: Virtual scope aggregating all this.teams' shared + other this.agents' shared
 *
 * **Permission Rules:**
 * - `my_private`: Only owner can read/write/delete
 * - `my_shared`: Owner can write/delete, team + leadership can read
 * - `team_private`: Team members can read/write/delete
 * - `team_shared`: Team members can write/delete, all org members can read
 * - `org_shared`: Read-only virtual aggregation
 */
export class WorkspaceAccessService {
  private agents: Agent[] = []
  private teams: Team[] = []

  /**
   * Set the agents and teams for permission checks.
   * This allows for dependency injection in tests.
   */
  setAgentsAndTeams(agents: Agent[], teams: Team[]) {
    this.agents = agents
    this.teams = teams
  }

  /**
   * Check if an agent can read a file at the given path.
   *
   * @param agentId - The ID of the agent requesting access
   * @param filePath - The file path in format: {orgId}/workspaces/{entityId}/{scope}/...
   * @param organizationId - The organization ID for validation
   * @returns true if agent can read, false otherwise
   */
  canRead(agentId: string, filePath: string, organizationId: string): boolean {
    const workspaceInfo = this.extractWorkspaceInfo(filePath, organizationId)
    if (!workspaceInfo) return false

    const { entityId, scope } = workspaceInfo
    const agent = this.agents.find((a) => a.id === agentId)
    if (!agent || agent.organizationId !== organizationId) return false

    switch (scope) {
      case 'private':
        // my_private or team_private
        if (this.isAgentWorkspace(entityId)) {
          // my_private: Only owner can read
          return entityId === agentId
        } else {
          // team_private: Only team members can read
          return this.isTeamMember(agentId, entityId)
        }

      case 'shared':
        // my_shared or team_shared
        if (this.isAgentWorkspace(entityId)) {
          // my_shared: Agent + team + leadership can read
          return (
            entityId === agentId ||
            this.isTeamMember(agentId, agent.teamId) ||
            this.isLeadershipMember(agentId)
          )
        } else {
          // team_shared: All org members can read
          return true
        }

      default:
        return false
    }
  }

  /**
   * Check if an agent can write a file at the given path.
   *
   * @param agentId - The ID of the agent requesting access
   * @param filePath - The file path in format: {orgId}/workspaces/{entityId}/{scope}/...
   * @param organizationId - The organization ID for validation
   * @returns true if agent can write, false otherwise
   */
  canWrite(agentId: string, filePath: string, organizationId: string): boolean {
    const workspaceInfo = this.extractWorkspaceInfo(filePath, organizationId)

    console.error('[DEBUG canWrite]', {
      agentId,
      filePath,
      organizationId,
      workspaceInfo,
      agentsCount: this.agents.length,
      teamsCount: this.teams.length
    })

    if (!workspaceInfo) return false

    const { entityId, scope } = workspaceInfo
    const agent = this.agents.find((a) => a.id === agentId)

    console.error('[DEBUG canWrite - agent check]', {
      agentFound: !!agent,
      agentOrgId: agent?.organizationId,
      expectedOrgId: organizationId,
      agentTeamId: agent?.teamId
    })

    if (!agent || agent.organizationId !== organizationId) return false

    switch (scope) {
      case 'private':
        // my_private or team_private
        if (this.isAgentWorkspace(entityId)) {
          // my_private: Only owner can write
          return entityId === agentId
        } else {
          // team_private: Only team members can write
          const isTeamMemberResult = this.isTeamMember(agentId, entityId)
          console.error('[DEBUG canWrite - team_private]', {
            entityId,
            agentId,
            isTeamMemberResult
          })
          return isTeamMemberResult
        }

      case 'shared':
        // my_shared or team_shared
        if (this.isAgentWorkspace(entityId)) {
          // my_shared: Only owner can write
          return entityId === agentId
        } else {
          // team_shared: Only team members can write
          const isTeamMemberResult = this.isTeamMember(agentId, entityId)
          console.error('[DEBUG canWrite - team_shared]', {
            entityId,
            agentId,
            agentTeamId: agent?.teamId,
            isTeamMemberResult
          })
          return isTeamMemberResult
        }

      default:
        return false
    }
  }

  /**
   * Check if an agent can delete a file at the given path.
   *
   * @param agentId - The ID of the agent requesting access
   * @param filePath - The file path in format: {orgId}/workspaces/{entityId}/{scope}/...
   * @param organizationId - The organization ID for validation
   * @returns true if agent can delete, false otherwise
   */
  canDelete(agentId: string, filePath: string, organizationId: string): boolean {
    // Delete permissions mirror write permissions
    return this.canWrite(agentId, filePath, organizationId)
  }

  /**
   * Extract workspace information from a file path.
   *
   * @param filePath - File path in format: {orgId}/workspaces/{entityId}/{scope}/...
   * @param expectedOrgId - The expected organization ID
   * @returns Workspace info or null if invalid format
   */
  private extractWorkspaceInfo(
    filePath: string,
    expectedOrgId: string
  ): { entityId: string; scope: string } | null {
    const pathParts = filePath.split('/')
    if (pathParts.length < 4) return null

    const orgId = pathParts[0]
    const workspacesKey = pathParts[1]
    const entityId = pathParts[2]
    const scope = pathParts[3]

    if (orgId !== expectedOrgId || workspacesKey !== 'workspaces') {
      return null
    }

    if (scope !== 'private' && scope !== 'shared') {
      return null
    }

    return { entityId, scope }
  }

  /**
   * Check if an entity ID represents an agent workspace.
   *
   * @param entityId - The entity ID to check
   * @returns true if it's an agent workspace
   */
  private isAgentWorkspace(entityId: string): boolean {
    return this.agents.some((a) => a.id === entityId)
  }

  /**
   * Check if an agent is a member of a team.
   *
   * @param agentId - The agent ID to check
   * @param teamId - The team ID to check membership in
   * @returns true if agent is a team member
   */
  private isTeamMember(agentId: string, teamId: string): boolean {
    const agent = this.agents.find((a) => a.id === agentId)
    return agent?.teamId === teamId
  }

  /**
   * Check if an agent is a member of the leadership team.
   *
   * @param agentId - The agent ID to check
   * @returns true if agent is in leadership
   */
  private isLeadershipMember(agentId: string): boolean {
    const agent = this.agents.find((a) => a.id === agentId)
    if (!agent) return false

    const team = this.teams.find((t) => t.id === agent.teamId)
    return team?.name.toLowerCase() === 'leadership'
  }
}
