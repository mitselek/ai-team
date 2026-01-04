/**
 * OAuth2 token refresh logic for Gmail API
 */

import type { Result, TokenRefreshResponse } from './types'

export interface TokenRefreshError extends Error {
  type: 'invalid_grant' | 'network' | 'server'
}

/**
 * Refresh an OAuth2 access token
 * @param refreshToken - The refresh token
 * @param clientId - OAuth2 client ID
 * @param clientSecret - OAuth2 client secret
 * @returns Result with new access token or error
 */
export async function refreshToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<Result<TokenRefreshResponse, TokenRefreshError>> {
  const url = 'https://oauth2.googleapis.com/token'

  try {
    const response = await fetch(url, {
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
      const error = new Error(
        `Token refresh failed: ${(data.error as string) || 'unknown error'}`
      ) as TokenRefreshError

      if (data.error === 'invalid_grant') {
        error.type = 'invalid_grant'
      } else {
        error.type = 'server'
      }

      return { ok: false, error }
    }

    return {
      ok: true,
      value: {
        access_token: data.access_token as string,
        expires_in: data.expires_in as number,
        token_type: 'Bearer' as const
      }
    }
  } catch (err) {
    const error = new Error(
      `Token refresh network error: ${err instanceof Error ? err.message : String(err)}`
    ) as TokenRefreshError
    error.type = 'network'

    return { ok: false, error }
  }
}
