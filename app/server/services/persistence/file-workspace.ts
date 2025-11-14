import { readFile, writeFile, unlink, mkdir, stat, readdir } from 'fs/promises'
import { join, dirname, normalize, relative } from 'path'
import { AuditService } from './audit'

export interface FileContent {
  content: string
  metadata: FileMetadata
}

export interface FileMetadata {
  size: number
  modified: Date
  created: Date
}

export interface FileInfo {
  path: string
  name: string
  size: number
  modified: Date
  isDirectory: boolean
}

export interface OperationResult {
  success: boolean
  message?: string
}

const ALLOWED_EXTENSIONS = [
  '.md',
  '.txt',
  '.pdf',
  '.json',
  '.yaml',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg'
]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

export class FilesystemService {
  constructor(
    private readonly basePath: string,
    private readonly auditService: AuditService
  ) {}

  async readFile(agentId: string, path: string): Promise<FileContent> {
    try {
      this.validateExtension(path)
      const fullPath = this.resolvePath(path)

      const content = await readFile(fullPath, 'utf-8')
      const stats = await stat(fullPath)

      const metadata: FileMetadata = {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime
      }

      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'read',
        path,
        size: stats.size
      })

      return { content, metadata }
    } catch (error: unknown) {
      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'read',
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async writeFile(agentId: string, path: string, content: string): Promise<OperationResult> {
    try {
      this.validateExtension(path)
      this.validateFileSize(content)
      const fullPath = this.resolvePath(path)

      // Determine if this is create or update
      let isUpdate = false
      try {
        await stat(fullPath)
        isUpdate = true
      } catch (error: unknown) {
        // File doesn't exist - it's a create operation
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
          throw error
        }
      }

      // Create directories if needed
      await mkdir(dirname(fullPath), { recursive: true })

      // Write file
      await writeFile(fullPath, content, 'utf-8')

      const stats = await stat(fullPath)

      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: isUpdate ? 'update' : 'create',
        path,
        size: stats.size
      })

      return { success: true }
    } catch (error: unknown) {
      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'create',
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async deleteFile(agentId: string, path: string): Promise<OperationResult> {
    try {
      this.validateExtension(path)
      const fullPath = this.resolvePath(path)

      await unlink(fullPath)

      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'delete',
        path
      })

      return { success: true }
    } catch (error: unknown) {
      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'delete',
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async listFiles(agentId: string, path: string): Promise<FileInfo[]> {
    try {
      const fullPath = this.resolvePath(path)
      const entries = await readdir(fullPath, { withFileTypes: true })

      const fileInfos: FileInfo[] = []

      for (const entry of entries) {
        const entryPath = join(fullPath, entry.name)
        const stats = await stat(entryPath)
        const relativePath = join(path, entry.name)

        fileInfos.push({
          path: relativePath,
          name: entry.name,
          size: stats.size,
          modified: stats.mtime,
          isDirectory: entry.isDirectory()
        })
      }

      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'read',
        path,
        size: fileInfos.length
      })

      return fileInfos
    } catch (error: unknown) {
      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'read',
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async getFileInfo(agentId: string, path: string): Promise<FileMetadata> {
    try {
      this.validateExtension(path)
      const fullPath = this.resolvePath(path)

      const stats = await stat(fullPath)

      const metadata: FileMetadata = {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime
      }

      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'read',
        path,
        size: stats.size
      })

      return metadata
    } catch (error: unknown) {
      await this.auditService.log({
        timestamp: new Date(),
        agentId,
        operation: 'read',
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  private validateExtension(path: string): void {
    const lastDot = path.lastIndexOf('.')
    if (lastDot === -1) {
      throw new Error('File must have an extension')
    }

    const ext = path.substring(lastDot).toLowerCase()

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File extension ${ext} not allowed`)
    }
  }

  private validateFileSize(content: string): void {
    const sizeInBytes = Buffer.byteLength(content, 'utf-8')

    if (sizeInBytes > MAX_FILE_SIZE) {
      throw new Error('File exceeds 5MB limit')
    }
  }

  private resolvePath(path: string): string {
    // Normalize path to prevent traversal attacks
    const normalized = normalize(path)

    // Join with base path
    const fullPath = join(this.basePath, normalized)

    // Verify the resolved path is still within basePath
    const relPath = relative(this.basePath, fullPath)

    if (relPath.startsWith('..') || relPath.startsWith('/')) {
      throw new Error('Path traversal attempt detected')
    }

    return fullPath
  }
}
