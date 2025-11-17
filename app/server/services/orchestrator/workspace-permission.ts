import type { Agent, Team } from '@@/types'
import { agents } from '../../../server/data/agents'
import { teams } from '../../../server/data/teams'
import { promises as fs } from 'fs'
import { join } from 'path'
import { createLogger, newCorrelationId } from '../../../server/utils/logger'

const logger = createLogger('WorkspacePermissionService')

export interface PermissionResult {
  allowed: boolean
  reason?: string
}

export class WorkspacePermissionService {
  /**
   * Validates if agent can access a folder+scope combination
   */
  async validateAccess(
    agentId: string,
    folderId: string,
    scope: 'private' | 'shared',
    operation: 'read' | 'write',
    organizationId: string
  ): Promise<PermissionResult> {
    try {
      const correlationId = newCorrelationId()

      // Get agent making the request
      const agent = await this.getAgent(agentId, organizationId)
      if (!agent) {
        const reason = `Agent ${agentId} not found in organization ${organizationId}`
        logger.warn(
          { agentId, organizationId, correlationId },
          'Permission denied - agent not found'
        )
        return { allowed: false, reason }
      }

      // Check if folderId is agent's own folder
      if (folderId === agentId) {
        return this.validateOwnFolder(agent, scope, operation, correlationId)
      }

      // Check if folderId is agent's team folder
      if (folderId === agent.teamId) {
        return this.validateTeamFolder(
          agent,
          folderId,
          scope,
          operation,
          organizationId,
          correlationId
        )
      }

      // Check if folderId is another agent's folder
      const targetAgent = await this.getAgent(folderId, organizationId)
      if (targetAgent) {
        return this.validateOtherAgentFolder(
          agent,
          targetAgent,
          scope,
          operation,
          organizationId,
          correlationId
        )
      }

      // Check if folderId is another team's folder
      const targetTeam = await this.getTeam(folderId, organizationId)
      if (targetTeam) {
        return this.validateOtherTeamFolder(
          agent,
          targetTeam,
          scope,
          operation,
          organizationId,
          correlationId
        )
      }

      // Invalid folderId
      const reason = `Folder ${folderId} not found`
      logger.warn(
        { agentId, folderId, organizationId, correlationId },
        'Permission denied - folder not found'
      )
      return { allowed: false, reason }
    } catch (error: unknown) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          agentId,
          folderId,
          scope,
          operation
        },
        'Permission validation error'
      )
      return { allowed: false, reason: 'Internal error during permission check' }
    }
  }

  /**
   * Checks if folder exists on filesystem
   */
  async folderExists(organizationId: string, folderId: string): Promise<boolean> {
    try {
      const folderPath = join(
        process.cwd(),
        'data',
        'organizations',
        organizationId,
        'workspaces',
        folderId
      )
      await fs.access(folderPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Checks if folder can be created (own or team folder)
   */
  async canCreateFolder(
    agentId: string,
    folderId: string,
    organizationId: string
  ): Promise<PermissionResult> {
    try {
      const agent = await this.getAgent(agentId, organizationId)
      if (!agent) {
        return { allowed: false, reason: `Agent ${agentId} not found` }
      }

      // Can create own folder
      if (folderId === agentId) {
        return { allowed: true }
      }

      // Can create team folder
      if (folderId === agent.teamId) {
        return { allowed: true }
      }

      // Cannot create other folders
      return { allowed: false, reason: 'Can only create own or team folders' }
    } catch (error: unknown) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          agentId,
          folderId
        },
        'Folder creation check error'
      )
      return { allowed: false, reason: 'Internal error during folder creation check' }
    }
  }

  // Private helper methods

  private async getAgent(agentId: string, organizationId: string): Promise<Agent | undefined> {
    return agents.find((a) => a.id === agentId && a.organizationId === organizationId)
  }

  private async getTeam(teamId: string, organizationId: string): Promise<Team | undefined> {
    return teams.find((t) => t.id === teamId && t.organizationId === organizationId)
  }

  private isLeadershipTeam(team: Team): boolean {
    return team.name.toLowerCase().includes('leadership')
  }

  private async isAgentInLeadership(agent: Agent, organizationId: string): Promise<boolean> {
    const agentTeam = await this.getTeam(agent.teamId, organizationId)
    return agentTeam ? this.isLeadershipTeam(agentTeam) : false
  }

  private isAgentInTeam(agent: Agent, teamId: string): boolean {
    return agent.teamId === teamId
  }

  private async validateOwnFolder(
    agent: Agent,
    scope: 'private' | 'shared',
    operation: 'read' | 'write',
    correlationId: string
  ): Promise<PermissionResult> {
    // Owner has full access to own folder (both private and shared)
    if (scope === 'private') {
      logger.info(
        {
          agentId: agent.id,
          scope,
          operation,
          correlationId
        },
        'Permission granted - own private folder'
      )
      return { allowed: true }
    }

    // Shared scope - owner has full access
    if (operation === 'read' || operation === 'write') {
      logger.info(
        {
          agentId: agent.id,
          scope,
          operation,
          correlationId
        },
        'Permission granted - own shared folder'
      )
      return { allowed: true }
    }

    return { allowed: false, reason: 'Invalid operation' }
  }

  private async validateTeamFolder(
    agent: Agent,
    folderId: string,
    scope: 'private' | 'shared',
    operation: 'read' | 'write',
    organizationId: string,
    correlationId: string
  ): Promise<PermissionResult> {
    const team = await this.getTeam(folderId, organizationId)
    if (!team) {
      return { allowed: false, reason: 'Team not found' }
    }

    // Private scope - only team members
    if (scope === 'private') {
      if (this.isAgentInTeam(agent, team.id)) {
        logger.info(
          {
            agentId: agent.id,
            teamId: team.id,
            scope,
            operation,
            correlationId
          },
          'Permission granted - team private folder'
        )
        return { allowed: true }
      }
      return { allowed: false, reason: 'Only team members can access team private folder' }
    }

    // Shared scope
    if (scope === 'shared') {
      // Team members have read/write
      if (this.isAgentInTeam(agent, team.id)) {
        logger.info(
          {
            agentId: agent.id,
            teamId: team.id,
            scope,
            operation,
            correlationId
          },
          'Permission granted - team shared folder (team member)'
        )
        return { allowed: true }
      }

      // All org members can read
      if (operation === 'read') {
        logger.info(
          {
            agentId: agent.id,
            teamId: team.id,
            scope,
            operation,
            correlationId
          },
          'Permission granted - team shared folder (org member read)'
        )
        return { allowed: true }
      }

      // Non-team members cannot write
      return { allowed: false, reason: 'Only team members can write to team shared folder' }
    }

    return { allowed: false, reason: 'Invalid scope' }
  }

  private async validateOtherAgentFolder(
    agent: Agent,
    targetAgent: Agent,
    scope: 'private' | 'shared',
    operation: 'read' | 'write',
    organizationId: string,
    correlationId: string
  ): Promise<PermissionResult> {
    // Private folders of other agents are never accessible
    if (scope === 'private') {
      return { allowed: false, reason: "Cannot access other agent's private folder" }
    }

    // Shared scope
    if (scope === 'shared') {
      // Same team members can read
      if (this.isAgentInTeam(agent, targetAgent.teamId)) {
        if (operation === 'read') {
          logger.info(
            {
              agentId: agent.id,
              targetAgentId: targetAgent.id,
              scope,
              operation,
              correlationId
            },
            'Permission granted - peer shared folder (team member)'
          )
          return { allowed: true }
        }
        // Cannot write to peer's folder
        return { allowed: false, reason: "Cannot write to other agent's folder" }
      }

      // Leadership can read any shared folder
      if (await this.isAgentInLeadership(agent, organizationId)) {
        if (operation === 'read') {
          logger.info(
            {
              agentId: agent.id,
              targetAgentId: targetAgent.id,
              scope,
              operation,
              correlationId
            },
            'Permission granted - peer shared folder (leadership)'
          )
          return { allowed: true }
        }
        // Leadership cannot write to other agent's folder
        return { allowed: false, reason: "Cannot write to other agent's folder" }
      }

      // Others cannot access
      return { allowed: false, reason: 'Not in same team as target agent' }
    }

    return { allowed: false, reason: 'Invalid scope' }
  }

  private async validateOtherTeamFolder(
    agent: Agent,
    targetTeam: Team,
    scope: 'private' | 'shared',
    operation: 'read' | 'write',
    _organizationId: string,
    correlationId: string
  ): Promise<PermissionResult> {
    // Private folders of other teams are never accessible
    if (scope === 'private') {
      return { allowed: false, reason: "Cannot access other team's private folder" }
    }

    // Shared scope
    if (scope === 'shared') {
      // All org members can read
      if (operation === 'read') {
        logger.info(
          {
            agentId: agent.id,
            targetTeamId: targetTeam.id,
            scope,
            operation,
            correlationId
          },
          'Permission granted - other team shared folder (org member)'
        )
        return { allowed: true }
      }

      // Only team members can write
      if (this.isAgentInTeam(agent, targetTeam.id)) {
        logger.info(
          {
            agentId: agent.id,
            targetTeamId: targetTeam.id,
            scope,
            operation,
            correlationId
          },
          'Permission granted - other team shared folder (team member write)'
        )
        return { allowed: true }
      }

      return { allowed: false, reason: 'Only team members can write to team folder' }
    }

    return { allowed: false, reason: 'Invalid scope' }
  }
}

// Export singleton instance
export const workspacePermissionService = new WorkspacePermissionService()
