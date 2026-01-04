/**
 * Gmail API client with OAuth2 token refresh and structured error handling
 */

import type {
  EmailEnvelope,
  EmailMessage,
  SendRequest,
  Result,
  GmailClientConfig,
  GmailApiMessage,
  GmailApiHeader,
  SecretsProvider
} from './types'

interface GmailApiError extends Error {
  statusCode: number
  isRetryable: boolean
  type: 'validation' | 'auth' | 'rate_limit' | 'server' | 'network'
}

export class GmailClient {
  private secretsProvider: SecretsProvider
  private accessToken: string
  private maxRetries: number

  constructor(config: GmailClientConfig) {
    this.secretsProvider = config.secretsProvider
    this.accessToken = config.accessToken
    this.maxRetries = config.maxRetries ?? 3
  }

  /**
   * Read a single message by ID
   */
  async readMessage(id: string): Promise<Result<EmailMessage>> {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`
    const result = await this.makeRequest<GmailApiMessage>(url)

    if (!result.ok) {
      return result as Result<EmailMessage>
    }

    const msg = result.value
    const headers = msg.payload?.headers ?? []

    const header = (name: string): string =>
      headers.find((h: GmailApiHeader) => h.name === name)?.value ?? ''

    return {
      ok: true,
      value: {
        id: msg.id,
        threadId: msg.threadId,
        subject: header('Subject'),
        from: header('From'),
        to: header('To'),
        cc: header('Cc') || undefined,
        date: header('Date'),
        labels: msg.labelIds ?? [],
        snippet: msg.snippet,
        hasHtml: !!(msg.payload?.mimeType ?? '').includes('text/html'),
        sizeEstimate: msg.sizeEstimate,
        bodyText: msg.payload?.parts?.[0]?.body?.data
          ? Buffer.from(msg.payload.parts[0].body.data, 'base64').toString('utf-8')
          : undefined,
        bodyHtml: msg.payload?.parts?.[1]?.body?.data
          ? Buffer.from(msg.payload.parts[1].body.data, 'base64').toString('utf-8')
          : undefined
      }
    }
  }

  /**
   * List messages with optional filters
   */
  async listMessages(
    query?: string,
    labelIds?: string[],
    maxResults?: number
  ): Promise<Result<EmailEnvelope[]>> {
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (labelIds) {
      labelIds.forEach((label) => params.append('labelIds', label))
    }
    if (maxResults) params.append('maxResults', String(maxResults))

    const url = `https://www.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`
    const result = await this.makeRequest<{
      messages?: Array<{ id: string }>
      resultSizeEstimate: number
    }>(url)

    if (!result.ok) {
      return result as Result<EmailEnvelope[]>
    }

    const messages = result.value.messages ?? []

    // Get headers for each message in parallel
    const envelopes = await Promise.all(
      messages.map(async (msg: { id: string }) => {
        const msgResult = await this.readMessage(msg.id)
        if (msgResult.ok) {
          return msgResult.value
        }
        return null
      })
    )

    return {
      ok: true,
      value: envelopes.filter((e): e is EmailMessage => e !== null) as EmailEnvelope[]
    }
  }

  /**
   * Send an email
   */
  async sendEmail(request: SendRequest): Promise<Result<string>> {
    // Validate required fields
    if (!request.to || !request.subject) {
      const error = new Error('Missing required fields: to, subject') as GmailApiError
      error.statusCode = 400
      error.type = 'validation'
      error.isRetryable = false

      return { ok: false, error }
    }

    // Build email message
    const headers = [`To: ${request.to}`, `Subject: ${request.subject}`]

    if (request.cc) headers.push(`Cc: ${request.cc}`)
    if (request.bcc) headers.push(`Bcc: ${request.bcc}`)

    headers.push('MIME-Version: 1.0')
    headers.push('Content-Type: text/plain; charset="UTF-8"')

    const body = [
      headers.join('\r\n'),
      '\r\n',
      request.text || (request.html ? request.html : '')
    ].join('')

    const encodedMessage = Buffer.from(body).toString('base64')

    const url = 'https://www.googleapis.com/gmail/v1/users/me/messages/send'
    const result = await this.makeRequest<{ id: string }>(url, {
      method: 'POST',
      body: JSON.stringify({ raw: encodedMessage })
    })

    if (!result.ok) {
      return result as Result<string>
    }

    return { ok: true, value: result.value.id }
  }

  /**
   * Apply labels to a message
   */
  async applyLabels(id: string, labels: string[]): Promise<Result<void>> {
    if (!labels.length) {
      return { ok: true, value: undefined }
    }

    const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${id}/modify`
    const result = await this.makeRequest<{ id: string }>(url, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds: labels })
    })

    if (!result.ok) {
      return result as Result<void>
    }

    return { ok: true, value: undefined }
  }

  /**
   * Watch Gmail labels for changes (register for Pub/Sub)
   */
  async watchLabels(topic: string, _subscription: string): Promise<Result<void>> {
    const url = 'https://www.googleapis.com/gmail/v1/users/me/watch'
    const result = await this.makeRequest<{ historyId: string }>(url, {
      method: 'POST',
      body: JSON.stringify({
        topicName: topic,
        labelFilterBehavior: 'include',
        labelIds: ['INBOX']
      })
    })

    if (!result.ok) {
      return result as Result<void>
    }

    return { ok: true, value: undefined }
  }

  /**
   * Make HTTP request with automatic token refresh on 401
   */
  private async makeRequest<T>(url: string, init?: RequestInit): Promise<Result<T, GmailApiError>> {
    return this.makeRequestWithRetry(url, init, 0)
  }

  private async makeRequestWithRetry<T>(
    url: string,
    init: RequestInit | undefined,
    attemptNumber: number
  ): Promise<Result<T, GmailApiError>> {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...(init?.headers as Record<string, string>)
        }
      })

      // Handle 401 - try to refresh token
      if (response.status === 401) {
        const refreshResult = await this.tryRefreshToken()
        if (refreshResult.ok) {
          this.accessToken = refreshResult.value
          // Retry original request with new token
          return this.makeRequestWithRetry(url, init, attemptNumber)
        } else {
          const error = new Error(
            'Failed to refresh token: invalid_grant. Please re-run oauth-bootstrap.ts'
          ) as GmailApiError
          error.statusCode = 401
          error.type = 'auth'
          error.isRetryable = false

          return { ok: false, error }
        }
      }

      // Handle 429 (rate limit) and 5xx with exponential backoff
      if ((response.status === 429 || response.status >= 500) && attemptNumber < this.maxRetries) {
        const delay = Math.pow(2, attemptNumber) * 100
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.makeRequestWithRetry(url, init, attemptNumber + 1)
      }

      if (!response.ok) {
        const error = new Error(`Gmail API error: ${response.statusText}`) as GmailApiError
        error.statusCode = response.status
        error.type = response.status === 429 ? 'rate_limit' : 'server'
        error.isRetryable = response.status === 429 || response.status >= 500

        return { ok: false, error }
      }

      const data = (await response.json()) as T
      return { ok: true, value: data }
    } catch (err) {
      const error = new Error(
        `Network error: ${err instanceof Error ? err.message : String(err)}`
      ) as GmailApiError
      error.statusCode = 0
      error.type = 'network'
      error.isRetryable = true

      return { ok: false, error }
    }
  }

  /**
   * Attempt to refresh the access token
   */
  private async tryRefreshToken(): Promise<Result<string>> {
    try {
      const clientId = await this.secretsProvider.get('GMAIL_CLIENT_ID')
      const clientSecret = await this.secretsProvider.get('GMAIL_CLIENT_SECRET')
      const refreshToken = await this.secretsProvider.get('GMAIL_REFRESH_TOKEN')

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }).toString()
      })

      const data = (await response.json()) as Record<string, unknown>

      if (!response.ok) {
        return {
          ok: false,
          error: new Error(`Token refresh failed: ${(data.error as string) || 'unknown error'}`)
        }
      }

      return { ok: true, value: data.access_token as string }
    } catch (err) {
      return {
        ok: false,
        error: new Error(`Token refresh error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }
}
