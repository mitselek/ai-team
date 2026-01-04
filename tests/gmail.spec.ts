import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GmailClient } from '../src/gmail/client'
import type { SendRequest, SecretsProvider } from '../src/gmail/types'

describe('Gmail Client', () => {
  const mockSecretsProvider = {
    get: vi.fn()
  } as unknown as SecretsProvider

  let client: GmailClient
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    client = new GmailClient({
      secretsProvider: mockSecretsProvider,
      accessToken: 'mock-access-token',
      maxRetries: 3
    })

    // Mock fetch globally
    fetchSpy = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.fetch = fetchSpy as any
  })

  describe('readMessage', () => {
    it('returns EmailMessage with all fields', async () => {
      const mockResponse = {
        id: 'msg123',
        threadId: 'thread123',
        snippet: 'This is a test message',
        sizeEstimate: 1234,
        labelIds: ['INBOX', 'IMPORTANT'],
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
            { name: 'Cc', value: 'cc@example.com' },
            { name: 'Date', value: '2026-01-04T12:00:00Z' }
          ],
          mimeType: 'text/html',
          parts: [
            {
              body: { data: Buffer.from('Plain text body').toString('base64') }
            },
            {
              body: { data: Buffer.from('<p>HTML body</p>').toString('base64') }
            }
          ]
        }
      }

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      })

      const result = await client.readMessage('msg123')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe('msg123')
        expect(result.value.threadId).toBe('thread123')
        expect(result.value.subject).toBe('Test Subject')
        expect(result.value.from).toBe('sender@example.com')
        expect(result.value.to).toBe('recipient@example.com')
        expect(result.value.cc).toBe('cc@example.com')
        expect(result.value.hasHtml).toBe(true)
        expect(result.value.sizeEstimate).toBe(1234)
        expect(result.value.bodyText).toContain('Plain text body')
        expect(result.value.bodyHtml).toContain('HTML body')
      }
    })

    it('handles 404 not found', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const result = await client.readMessage('nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Gmail API error')
      }
    })

    it('handles 401 with token refresh', async () => {
      const mockResponse = {
        id: 'msg123',
        threadId: 'thread123',
        snippet: 'Test',
        sizeEstimate: 100,
        labelIds: [],
        payload: {
          headers: [
            { name: 'Subject', value: 'Test' },
            { name: 'From', value: 'from@test.com' },
            { name: 'To', value: 'to@test.com' },
            { name: 'Date', value: '2026-01-04' }
          ]
        }
      }

      mockSecretsProvider.get = vi.fn((key: string) => {
        const secrets: Record<string, string> = {
          GMAIL_CLIENT_ID: 'client-id',
          GMAIL_CLIENT_SECRET: 'client-secret',
          GMAIL_REFRESH_TOKEN: 'refresh-token'
        }
        return Promise.resolve(secrets[key] || '')
      })

      // First call: 401, second call (token refresh): success, third call (retry): success
      fetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new-access-token',
            expires_in: 3600,
            token_type: 'Bearer'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse
        })

      const result = await client.readMessage('msg123')

      expect(result.ok).toBe(true)
      expect(fetchSpy).toHaveBeenCalledTimes(3) // Original + refresh + retry
    })
  })

  describe('listMessages', () => {
    it('respects maxResults limit', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          messages: [{ id: 'msg1' }, { id: 'msg2' }],
          resultSizeEstimate: 2
        })
      })

      await client.listMessages(undefined, undefined, 2)

      // Verify the URL includes maxResults (first call is the list call)
      const firstCall = fetchSpy.mock.calls[0]
      expect(firstCall[0]).toContain('maxResults=2')
    })

    it('filters by query and labelIds', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          messages: [{ id: 'msg1' }],
          resultSizeEstimate: 1
        })
      })

      await client.listMessages('from:sender@example.com', ['INBOX'], 10)

      // Verify the URL includes query params (first call is the list call)
      const firstCall = fetchSpy.mock.calls[0]
      expect(firstCall[0]).toContain('q=from%3Asender%40example.com')
      expect(firstCall[0]).toContain('labelIds=INBOX')
    })
  })

  describe('sendEmail', () => {
    it('sends email with all fields', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'sent-msg-id'
        })
      })

      const request: SendRequest = {
        to: 'recipient@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Test Email',
        text: 'Plain text content',
        html: '<p>HTML content</p>'
      }

      const result = await client.sendEmail(request)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('sent-msg-id')
      }
    })

    it('returns error on invalid email', async () => {
      const request: SendRequest = {
        to: 'not-an-email',
        subject: ''
      }

      const result = await client.sendEmail(request)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Missing required fields')
      }
    })

    it('sends with text content', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'msg-id'
        })
      })

      const request: SendRequest = {
        to: 'user@example.com',
        subject: 'Test',
        text: 'Plain text only'
      }

      const result = await client.sendEmail(request)

      expect(result.ok).toBe(true)
    })
  })

  describe('applyLabels', () => {
    it('applies multiple labels to message', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'msg123' })
      })

      const result = await client.applyLabels('msg123', ['Label1', 'Label2'])

      expect(result.ok).toBe(true)
      expect(fetchSpy).toHaveBeenCalled()
    })

    it('handles empty label list gracefully', async () => {
      const result = await client.applyLabels('msg123', [])

      expect(result.ok).toBe(true)
      // Should not make API call for empty labels
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('watchLabels', () => {
    it('registers watch on topic/subscription', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          historyId: 'history-123'
        })
      })

      const result = await client.watchLabels(
        'projects/test/topics/gmail',
        'projects/test/subscriptions/gmail'
      )

      expect(result.ok).toBe(true)
      expect(fetchSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles 429 rate limit with exponential backoff', async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 'msg123',
            threadId: 'thread123',
            snippet: 'Test',
            sizeEstimate: 100,
            labelIds: [],
            payload: {
              headers: [
                { name: 'Subject', value: 'Test' },
                { name: 'From', value: 'from@test.com' },
                { name: 'To', value: 'to@test.com' },
                { name: 'Date', value: '2026-01-04' }
              ]
            }
          })
        })

      const result = await client.readMessage('msg123')

      expect(result.ok).toBe(true)
      // Should have retried
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('handles 5xx errors with exponential backoff', async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: 'msg123',
            threadId: 'thread123',
            snippet: 'Test',
            sizeEstimate: 100,
            labelIds: [],
            payload: {
              headers: [
                { name: 'Subject', value: 'Test' },
                { name: 'From', value: 'from@test.com' },
                { name: 'To', value: 'to@test.com' },
                { name: 'Date', value: '2026-01-04' }
              ]
            }
          })
        })

      const result = await client.readMessage('msg123')

      expect(result.ok).toBe(true)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('stops retrying after maxRetries exceeded', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })

      const result = await client.readMessage('msg123')

      expect(result.ok).toBe(false)
      // Should try: initial + 3 retries = 4 times
      expect(fetchSpy).toHaveBeenCalledTimes(4)
    })

    it('includes Authorization header in requests', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'msg123',
          threadId: 'thread123',
          snippet: 'Test',
          sizeEstimate: 100,
          labelIds: [],
          payload: {
            headers: [
              { name: 'Subject', value: 'Test' },
              { name: 'From', value: 'from@test.com' },
              { name: 'To', value: 'to@test.com' },
              { name: 'Date', value: '2026-01-04' }
            ]
          }
        })
      })

      await client.readMessage('msg123')

      const call = fetchSpy.mock.calls[0]
      expect(call[1].headers.Authorization).toBe('Bearer mock-access-token')
    })
  })
})
