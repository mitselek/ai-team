import { useState } from '#app'
import { v4 as uuidv4 } from 'uuid'
import type { Organization } from '@@/types'
import { logger } from '@/utils/logger'

export const useOrganization = () => {
  const organizations = useState<Organization[]>('organizations', () => [])
  const currentOrganization = useState<Organization | null>('currentOrganization', () => null)

  /**
   * Creates a new organization and adds it to the list.
   * @param name - The name of the organization.
   * @param githubRepoUrl - The URL of the organization's GitHub repository.
   * @param tokenPool - The initial token pool for the organization.
   * @returns The newly created organization.
   */
  const createOrganization = (
    name: string,
    githubRepoUrl: string,
    tokenPool: number
  ): Organization => {
    try {
      const newOrganization: Organization = {
        id: uuidv4(),
        name,
        githubRepoUrl,
        tokenPool,
        createdAt: new Date(),
        rootAgentId: null
      }
      organizations.value.push(newOrganization)
      logger.info({ organizationId: newOrganization.id }, 'Organization created successfully')
      return newOrganization
    } catch (error) {
      logger.error({ error }, 'Failed to create organization')
      throw new Error('Failed to create organization')
    }
  }

  /**
   * Retrieves an organization by its ID.
   * @param id - The ID of the organization to retrieve.
   * @returns The organization with the specified ID, or undefined if not found.
   */
  const getOrganization = (id: string): Organization | undefined => {
    return organizations.value.find((org: Organization) => org.id === id)
  }

  /**
   * Lists all organizations.
   * @returns A reactive reference to the list of organizations.
   */
  const listOrganizations = () => {
    return organizations
  }

  /**
   * Updates an existing organization.
   * @param id - The ID of the organization to update.
   * @param updates - An object containing the properties to update.
   * @returns The updated organization, or undefined if not found.
   */
  const updateOrganization = (
    id: string,
    updates: Partial<Omit<Organization, 'id' | 'createdAt'>>
  ): Organization | undefined => {
    const orgIndex = organizations.value.findIndex((org: Organization) => org.id === id)
    if (orgIndex === -1) {
      logger.warn({ organizationId: id }, 'Attempted to update non-existent organization')
      return undefined
    }

    try {
      const updatedOrg = { ...organizations.value[orgIndex], ...updates }
      organizations.value.splice(orgIndex, 1, updatedOrg)
      logger.info({ organizationId: id }, 'Organization updated successfully')
      return updatedOrg
    } catch (error) {
      logger.error({ organizationId: id, error }, 'Failed to update organization')
      throw new Error('Failed to update organization')
    }
  }

  return {
    organizations,
    currentOrganization,
    createOrganization,
    getOrganization,
    listOrganizations,
    updateOrganization
  }
}
