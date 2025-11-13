import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import path from 'path'
import {
  saveChatSession,
  loadChatSession,
  loadChatSessions
} from '~/server/services/persistence/filesystem'
import type { ChatSession } from '~/server/services/persistence/chat-types'

// Mock the logger
vi.mock('~/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

// Mock fs/promises with named exports (vitest expects the mocked module to provide the named functions)
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn()
}))

const mockOrganizationId = '537ba67e-0e50-47f7-931d-360b547efe90'
const mockAgentId = 'agent-abc-123'
const mockSessionId = 'session-def-456'

const testSession: ChatSession = {
  id: mockSessionId,
  agentId: mockAgentId,
  organizationId: mockOrganizationId,
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date('2025-11-14T10:00:00.000Z')
    },
    {
      id: 'msg-2',
      role: 'agent',
      content: 'Hi there!',
      timestamp: new Date('2025-11-14T10:00:05.000Z'),
      tokensUsed: 15
    }
  ],
  createdAt: new Date('2025-11-14T10:00:00.000Z'),
  updatedAt: new Date('2025-11-14T10:00:05.000Z')
}

describe('Chat Persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('saveChatSession', () => {
    it('should create directory structure and save the session file', async () => {
      await saveChatSession(testSession)

      const expectedDirPath = path.join(
        process.cwd(),
        'data',
        'organizations',
        mockOrganizationId,
        'chats',
        mockAgentId
      )
      const expectedFilePath = path.join(expectedDirPath, `${mockSessionId}.json`)

      expect(fs.mkdir).toHaveBeenCalledWith(expectedDirPath, { recursive: true })
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedFilePath,
        JSON.stringify(
          {
            ...testSession,
            messages: testSession.messages.map((m) => ({
              ...m,
              timestamp: m.timestamp.toISOString()
            })),
            createdAt: testSession.createdAt.toISOString(),
            updatedAt: testSession.updatedAt.toISOString()
          },
          null,
          2
        )
      )
    })

    it('should handle sessions with an empty messages array', async () => {
      const sessionWithNoMessages: ChatSession = {
        ...testSession,
        messages: []
      }
      await saveChatSession(sessionWithNoMessages)
      const expectedDirPath = path.join(
        process.cwd(),
        'data',
        'organizations',
        mockOrganizationId,
        'chats',
        mockAgentId
      )
      const expectedFilePath = path.join(expectedDirPath, `${mockSessionId}.json`)

      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedFilePath,
        expect.stringContaining('"messages": []')
      )
    })

    it('should handle messages without tokensUsed field', async () => {
      const sessionWithoutTokens: ChatSession = {
        ...testSession,
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2025-11-14T10:00:00.000Z')
          }
        ]
      }
      await saveChatSession(sessionWithoutTokens)
      const call = (fs.writeFile as vi.Mock).mock.calls[0][1]
      const parsed = JSON.parse(call)
      expect(parsed.messages[0]).not.toHaveProperty('tokensUsed')
    })

    it('should throw an error if writeFile fails', async () => {
      const writeError = new Error('Permission denied')
      vi.mocked(fs.writeFile).mockRejectedValue(writeError)

      await expect(saveChatSession(testSession)).rejects.toThrow('Permission denied')
    })
  })

  describe('loadChatSession', () => {
    it('should load an existing session and parse dates correctly', async () => {
      const isoSession = {
        ...testSession,
        createdAt: testSession.createdAt.toISOString(),
        updatedAt: testSession.updatedAt.toISOString(),
        messages: testSession.messages.map((m) => ({
          ...m,
          timestamp: m.timestamp.toISOString()
        }))
      }
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(isoSession))

      const result = await loadChatSession(mockAgentId, mockSessionId, mockOrganizationId)

      expect(result).toEqual(testSession)
      expect(result?.createdAt).toBeInstanceOf(Date)
      expect(result?.updatedAt).toBeInstanceOf(Date)
      expect(result?.messages[0].timestamp).toBeInstanceOf(Date)
    })

    it('should return null for a non-existent session', async () => {
      const enoentError = new Error('ENOENT: no such file or directory')
      // @ts-ignore
      enoentError.code = 'ENOENT'
      vi.mocked(fs.readFile).mockRejectedValue(enoentError)

      const result = await loadChatSession(mockAgentId, 'non-existent-session', mockOrganizationId)
      expect(result).toBeNull()
    })

    it('should throw an error for invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{"invalid json"')
      await expect(
        loadChatSession(mockAgentId, mockSessionId, mockOrganizationId)
      ).rejects.toThrow()
    })

    it('should throw an error for other file read errors', async () => {
      const readError = new Error('Read error')
      vi.mocked(fs.readFile).mockRejectedValue(readError)
      await expect(loadChatSession(mockAgentId, mockSessionId, mockOrganizationId)).rejects.toThrow(
        'Read error'
      )
    })
  })

  describe('loadChatSessions', () => {
    const session2: ChatSession = {
      ...testSession,
      id: 'session-2',
      updatedAt: new Date('2025-11-15T12:00:00.000Z') // more recent
    }
    const session1: ChatSession = {
      ...testSession,
      id: 'session-1',
      updatedAt: new Date('2025-11-14T11:00:00.000Z')
    }

    const isoSession1 = {
      ...session1,
      createdAt: session1.createdAt.toISOString(),
      updatedAt: session1.updatedAt.toISOString(),
      messages: session1.messages.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() }))
    }
    const isoSession2 = {
      ...session2,
      createdAt: session2.createdAt.toISOString(),
      updatedAt: session2.updatedAt.toISOString(),
      messages: session2.messages.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() }))
    }

    it('should load all sessions for an agent, sorted by updatedAt descending', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        'session-1.json',
        'session-2.json',
        'not-a-session.txt'
      ])
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(isoSession1))
        .mockResolvedValueOnce(JSON.stringify(isoSession2))

      const result = await loadChatSessions(mockAgentId, mockOrganizationId)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('session-2') // most recent first
      expect(result[1].id).toBe('session-1')
      expect(result[0].updatedAt).toBeInstanceOf(Date)
    })

    it('should return an empty array if the directory does not exist', async () => {
      const enoentError = new Error('ENOENT: no such file or directory')
      // @ts-ignore
      enoentError.code = 'ENOENT'
      vi.mocked(fs.readdir).mockRejectedValue(enoentError)

      const result = await loadChatSessions(mockAgentId, mockOrganizationId)
      expect(result).toEqual([])
    })

    it('should return an empty array for an agent with no sessions', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([])
      const result = await loadChatSessions(mockAgentId, mockOrganizationId)
      expect(result).toEqual([])
    })

    it('should skip corrupted session files and load valid ones', async () => {
      vi.mocked(fs.readdir).mockResolvedValue(['session-1.json', 'corrupted.json'])
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(isoSession1))
        .mockResolvedValueOnce('{"invalid": json')

      const result = await loadChatSessions(mockAgentId, mockOrganizationId)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('session-1')
    })

    it('should throw for non-ENOENT readdir errors', async () => {
      const readError = new Error('Directory read error')
      vi.mocked(fs.readdir).mockRejectedValue(readError)
      await expect(loadChatSessions(mockAgentId, mockOrganizationId)).rejects.toThrow(
        'Directory read error'
      )
    })
  })
})
