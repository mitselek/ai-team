
import { useState } from '#app'
import { v4 as uuidv4 } from 'uuid'
import type { Team, TeamType } from '~~/types'
import { logger } from '../utils/logger'
import { teams as teamsData } from '../../server/data/teams'

export const useTeam = () => {
  const teams = useState<Team[]>('teams', () => teamsData)

  /**
   * Creates a new team and adds it to the list.
   * @param teamData - The data for the team to create.
   * @returns The newly created team.
   */
  const createTeam = async (teamData: Omit<Team, 'id'>): Promise<Team> => {
    const correlationId = uuidv4()
    logger.info({ ...teamData, correlationId }, 'Attempting to create team')
    try {
      const newTeam: Team = {
        id: uuidv4(),
        ...teamData,
      }
      teams.value.push(newTeam)
      logger.info({ teamId: newTeam.id, correlationId }, 'Team created successfully')
      return newTeam
    } catch (error) {
      logger.error({ error, correlationId }, 'Failed to create team')
      throw new Error('Failed to create team')
    }
  }

  /**
   * Retrieves a team by its ID.
   * @param id - The ID of the team to retrieve.
   * @returns The team with the specified ID, or null if not found.
   */
  const getTeam = async (id: string): Promise<Team | null> => {
    const correlationId = uuidv4()
    logger.info({ teamId: id, correlationId }, `Attempting to get team`)
    try {
      const team = teams.value.find(t => t.id === id)
      if (!team) {
        logger.warn({ teamId: id, correlationId }, 'Team not found')
        return null
      }
      return team
    } catch (error) {
      logger.error({ teamId: id, error, correlationId }, `Failed to get team`)
      return null
    }
  }

  /**
   * Lists teams, with optional filters.
   * @param filter - Optional filters for organizationId and type.
   * @returns A filtered list of teams.
   */
  const listTeams = async (filter?: { organizationId?: string; type?: TeamType }): Promise<Team[]> => {
    const correlationId = uuidv4()
    logger.info({ filter, correlationId }, 'Attempting to list teams')
    try {
      return teams.value.filter(team => {
        if (filter?.organizationId && team.organizationId !== filter.organizationId) {
          return false
        }
        if (filter?.type && team.type !== filter.type) {
          return false
        }
        return true
      })
    } catch (error) {
      logger.error({ filter, error, correlationId }, 'Failed to list teams')
      return []
    }
  }

  /**
   * Updates an existing team.
   * @param id - The ID of the team to update.
   * @param updates - An object containing the properties to update.
   * @returns The updated team, or null if not found.
   */
  const updateTeam = async (id: string, updates: Partial<Team>): Promise<Team | null> => {
    const correlationId = uuidv4()
    logger.info({ teamId: id, updates, correlationId }, 'Attempting to update team')
    try {
      const teamIndex = teams.value.findIndex(t => t.id === id)
      if (teamIndex === -1) {
        logger.warn({ teamId: id, correlationId }, 'Attempted to update non-existent team')
        return null
      }

      const updatedTeam = { ...teams.value[teamIndex], ...updates }
      teams.value[teamIndex] = updatedTeam
      logger.info({ teamId: id, correlationId }, 'Team updated successfully')
      return updatedTeam
    } catch (error) {
      logger.error({ teamId: id, error, correlationId }, 'Failed to update team')
      throw new Error('Failed to update team')
    }
  }

  /**
   * Deletes a team by its ID.
   * @param id - The ID of the team to delete.
   * @returns True if the team was deleted, false otherwise.
   */
  const deleteTeam = async (id: string): Promise<boolean> => {
    const correlationId = uuidv4()
    logger.info({ teamId: id, correlationId }, 'Attempting to delete team')
    try {
      const teamIndex = teams.value.findIndex(t => t.id === id)
      if (teamIndex !== -1) {
        teams.value.splice(teamIndex, 1)
        logger.info({ teamId: id, correlationId }, 'Team deleted successfully')
        return true
      } else {
        logger.warn({ teamId: id, correlationId }, 'Attempted to delete non-existent team')
        return false
      }
    } catch (error) {
      logger.error({ teamId: id, error, correlationId }, 'Failed to delete team')
      throw new Error('Failed to delete team')
    }
  }

  return {
    createTeam,
    getTeam,
    listTeams,
    updateTeam,
    deleteTeam,
  }
}
