import type { Agent } from '../../types'

/**
 * In-memory storage for agents (MVP).
 * TODO: Replace with GitHub-backed persistence.
 */
export const agents: Agent[] = []
