/**
 * Gmail API type definitions for email messages, requests, and OAuth responses
 */

export interface EmailEnvelope {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  cc?: string
  date: string
  labels: string[]
  snippet: string
}

export interface EmailMessage extends EmailEnvelope {
  hasHtml: boolean
  sizeEstimate: number
  bodyText?: string
  bodyHtml?: string
}

export interface SendRequest {
  to: string
  cc?: string
  bcc?: string
  subject: string
  text?: string
  html?: string
}

export interface TokenRefreshRequest {
  refresh_token: string
  client_id: string
  client_secret: string
  grant_type: 'refresh_token'
}

export interface TokenRefreshResponse {
  access_token: string
  expires_in: number
  token_type: 'Bearer'
}

/**
 * Result<T, E> - Standard error handling pattern
 */
export type Result<T, E extends Error = Error> = { ok: true; value: T } | { ok: false; error: E }

/**
 * GmailClient configuration
 */
export interface GmailClientConfig {
  secretsProvider: SecretsProvider
  accessToken: string
  maxRetries?: number
}

/**
 * Gmail API response types (internal)
 */
export interface GmailApiHeader {
  name: string
  value: string
}

export interface GmailApiPayload {
  headers?: GmailApiHeader[]
  mimeType?: string
  parts?: Array<{
    body?: {
      data?: string
    }
  }>
}

export interface GmailApiMessage {
  id: string
  threadId: string
  snippet: string
  sizeEstimate: number
  labelIds?: string[]
  payload?: GmailApiPayload
}

export interface SecretsProvider {
  get(key: string): Promise<string>
}
