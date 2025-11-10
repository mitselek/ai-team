import { useState } from '#app'
import { v4 as uuidv4 } from 'uuid'
import type { Agent, AgentStatus } from '@@/types'
import { logger } from '@/utils/logger'
import { agents as agentsData } from '../../app/server/data/agents'

export const useAgent = () => {
  const agents = useState<Agent[]>('agents', () => agentsData)

  /**
   * Creates a new agent and adds it to the list.
   * @param name - The name of the agent.
   * @param role - The role of the agent.
   * @param organizationId - The ID of the organization the agent belongs to.
   * @param teamId - The ID of the team the agent belongs to.
   * @param systemPrompt - The system prompt for the agent.
   * @param seniorId - The ID of the agent's senior, or null if none.
   * @param tokenAllocation - The token allocation for the agent.
   * @returns The newly created agent.
   */
  const createAgent = (
    name: string,
    role: string,
    organizationId: string,
    teamId: string,
    systemPrompt: string,
    seniorId: string | null = null,
    tokenAllocation = 1000000
  ): Agent => {
    try {
      const newAgent: Agent = {
        id: uuidv4(),
        name,
        role,
        organizationId,
        teamId,
        systemPrompt,
        seniorId,
        tokenAllocation,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }
      agents.value.push(newAgent)
      logger.info({ agentId: newAgent.id }, 'Agent created successfully')
      return newAgent
    } catch (error) {
      logger.error({ error }, 'Failed to create agent')
      throw new Error('Failed to create agent')
    }
  }

  /**
   * Retrieves an agent by its ID.
   * @param id - The ID of the agent to retrieve.
   * @returns The agent with the specified ID, or undefined if not found.
   */
  const getAgent = (id: string): Agent | undefined => {
    try {
      return agents.value.find((agent: Agent) => agent.id === id)
    } catch (error) {
      logger.error({ agentId: id, error }, `Failed to get agent with id ${id}`)
      return undefined
    }
  }

  /**
   * Lists agents, with optional filters.
   * @param filters - Optional filters for organizationId, teamId, and status.
   * @returns A filtered list of agents.
   */
  const listAgents = (filters?: {
    organizationId?: string
    teamId?: string
    status?: AgentStatus
  }): Agent[] => {
    try {
      return agents.value.filter((agent: Agent) => {
        if (filters?.organizationId && agent.organizationId !== filters.organizationId) {
          return false
        }
        if (filters?.teamId && agent.teamId !== filters.teamId) {
          return false
        }
        if (filters?.status && agent.status !== filters.status) {
          return false
        }
        return true
      })
    } catch (error) {
      logger.error({ filters, error }, 'Failed to list agents')
      return []
    }
  }

  /**
   * Updates an existing agent.
   * @param id - The ID of the agent to update.
   * @param updates - An object containing the properties to update.
   * @returns The updated agent, or undefined if not found.
   */
  const updateAgent = (id: string, updates: Partial<Agent>): Agent | undefined => {
    try {
      const agentIndex = agents.value.findIndex((agent: Agent) => agent.id === id)
      if (agentIndex === -1) {
        logger.warn({ agentId: id }, 'Attempted to update non-existent agent')
        return undefined
      }

      const updatedAgent = { ...agents.value[agentIndex], ...updates }
      agents.value[agentIndex] = updatedAgent
      logger.info({ agentId: id }, 'Agent updated successfully')
      return updatedAgent
    } catch (error) {
      logger.error({ agentId: id, error }, 'Failed to update agent')
      throw new Error('Failed to update agent')
    }
  }

  /**
   * Deletes an agent by its ID.
   * @param id - The ID of the agent to delete.
   */
  const deleteAgent = (id: string): void => {
    try {
      const agentIndex = agents.value.findIndex((agent: Agent) => agent.id === id)
      if (agentIndex !== -1) {
        agents.value.splice(agentIndex, 1)
        logger.info({ agentId: id }, 'Agent deleted successfully')
      } else {
        logger.warn({ agentId: id }, 'Attempted to delete non-existent agent')
      }
    } catch (error) {
      logger.error({ agentId: id, error }, 'Failed to delete agent')
      throw new Error('Failed to delete agent')
    }
  }

  /**
   * Starts an agent's execution loop.
   * @param id - The ID of the agent to start.
   * @returns Promise that resolves when the agent is started.
   */
  const startAgent = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`/api/agent-start/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Update local state to reflect active status
        const agent = getAgent(id)
        if (agent) {
          updateAgent(id, { status: 'active', lastActiveAt: new Date() })
        }
        logger.info({ agentId: id }, 'Agent started successfully')
        return { success: true, message: data.message }
      } else {
        logger.error({ agentId: id, response: data }, 'Failed to start agent')
        return { success: false, message: data.message || 'Failed to start agent' }
      }
    } catch (error) {
      logger.error({ agentId: id, error }, 'Error starting agent')
      return { success: false, message: 'Network error while starting agent' }
    }
  }

  /**
   * Stops an agent's execution loop.
   * @param id - The ID of the agent to stop.
   * @returns Promise that resolves when the agent is stopped.
   */
  const stopAgent = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`/api/agent-stop/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Update local state to reflect paused status
        const agent = getAgent(id)
        if (agent) {
          updateAgent(id, { status: 'paused' })
        }
        logger.info({ agentId: id }, 'Agent stopped successfully')
        return { success: true, message: data.message }
      } else {
        logger.error({ agentId: id, response: data }, 'Failed to stop agent')
        return { success: false, message: data.message || 'Failed to stop agent' }
      }
    } catch (error) {
      logger.error({ agentId: id, error }, 'Error stopping agent')
      return { success: false, message: 'Network error while stopping agent' }
    }
  }

  return {
    agents,
    createAgent,
    getAgent,
    listAgents,
    updateAgent,
    deleteAgent,
    startAgent,
    stopAgent
  }
}
