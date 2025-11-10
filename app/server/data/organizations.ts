import type { Organization } from '@@/types'

/**
 * In-memory storage for organizations.
 * In a real application, this would be a database.
 */
export const organizations: Organization[] = []
