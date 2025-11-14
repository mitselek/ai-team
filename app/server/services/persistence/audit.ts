import { appendFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createLogger } from '../../utils/logger'

const log = createLogger('persistence:audit')

export interface AuditEntry {
  timestamp: Date
  agentId: string
  operation: 'create' | 'update' | 'delete' | 'read'
  path: string
  size?: number
  success: boolean
  error?: string
}

export interface AuditFilters {
  agentId?: string
  path?: string
  operation?: string
  startDate?: Date
  endDate?: Date
}

export class AuditService {
  private logPath: string

  constructor(logDir: string) {
    this.logPath = join(logDir, 'audit.log')
  }

  async log(entry: Omit<AuditEntry, 'success'>): Promise<void> {
    try {
      // Ensure directory exists
      const logDir = this.logPath.substring(0, this.logPath.lastIndexOf('/'))
      await mkdir(logDir, { recursive: true })

      // Create JSON Lines entry (one JSON object per line)
      const fullEntry: AuditEntry = {
        ...entry,
        success: true
      }

      // Serialize to JSON with newline
      const line =
        JSON.stringify({
          ...fullEntry,
          timestamp: fullEntry.timestamp.toISOString()
        }) + '\n'

      // Append to log file
      await appendFile(this.logPath, line, 'utf-8')
    } catch (error: unknown) {
      log.error({ error, entry }, 'Failed to write audit log')
      throw error
    }
  }

  async query(filters: AuditFilters): Promise<AuditEntry[]> {
    try {
      // Read entire log file
      const content = await readFile(this.logPath, 'utf-8')

      // Parse JSON Lines format
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)
      const entries: AuditEntry[] = lines.map((line) => {
        const parsed = JSON.parse(line)
        return {
          ...parsed,
          timestamp: new Date(parsed.timestamp)
        }
      })

      // Apply filters
      let filtered = entries

      if (filters.agentId) {
        filtered = filtered.filter((entry) => entry.agentId === filters.agentId)
      }

      if (filters.operation) {
        filtered = filtered.filter((entry) => entry.operation === filters.operation)
      }

      if (filters.path) {
        filtered = filtered.filter((entry) => entry.path === filters.path)
      }

      if (filters.startDate) {
        filtered = filtered.filter((entry) => entry.timestamp >= filters.startDate!)
      }

      if (filters.endDate) {
        filtered = filtered.filter((entry) => entry.timestamp <= filters.endDate!)
      }

      return filtered
    } catch (error: unknown) {
      // Handle ENOENT (file doesn't exist) - return empty array
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return []
      }
      log.error({ error, filters }, 'Failed to query audit logs')
      throw error
    }
  }
}
