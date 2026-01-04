/**
 * OAuth2 Bootstrap CLI for Gmail Email MCP Server
 * Interactive tool to obtain and store Gmail OAuth2 refresh token
 */

import { createInterface } from 'readline'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

/**
 * OAuth2 configuration for Google
 */
interface OAuthBootstrapConfig {
  clientId: string
  clientSecret: string
  redirectUrl: string
}

/**
 * OAuth bootstrap helper
 */
export class OAuthBootstrap {
  private config: OAuthBootstrapConfig

  constructor(config: OAuthBootstrapConfig) {
    this.config = config
  }

  /**
   * Generate authorization URL for user to visit
   */
  getAuthorizationUrl(scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUrl,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForToken(authCode: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }> {
    const body = new URLSearchParams({
      code: authCode,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUrl,
      grant_type: 'authorization_code'
    })

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to exchange code: ${response.status} ${error}`)
    }

    const data = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    if (!data.refresh_token) {
      throw new Error('No refresh token in response. Make sure to use access_type=offline')
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    }
  }

  /**
   * Save refresh token to .env file
   */
  async saveTokens(refreshToken: string): Promise<void> {
    const envPath = resolve(process.cwd(), '.env')

    // Read existing .env if it exists
    let envContent = ''
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf-8')
    }

    // Update or append GMAIL_REFRESH_TOKEN
    const lines = envContent.split('\n')
    const tokenLineIndex = lines.findIndex((line) => line.startsWith('GMAIL_REFRESH_TOKEN='))

    if (tokenLineIndex >= 0) {
      lines[tokenLineIndex] = `GMAIL_REFRESH_TOKEN=${refreshToken}`
    } else {
      // Append at end
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n'
      }
      lines.push(`GMAIL_REFRESH_TOKEN=${refreshToken}`)
    }

    // Write back
    writeFileSync(envPath, lines.join('\n'), 'utf-8')
  }
}

/**
 * Interactive CLI main function
 */
async function askQuestion(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout
    })

    readline.question(prompt, (answer) => {
      readline.close()
      resolve(answer.trim())
    })
  })
}

export async function bootstrapOAuth(): Promise<void> {
  console.warn()
  console.warn('╔════════════════════════════════════════╗')
  console.warn('║   Gmail Email MCP Server - OAuth Setup ║')
  console.warn('╚════════════════════════════════════════╝')
  console.warn()

  // Get client ID
  console.warn('You need OAuth2 credentials from Google Cloud Console:')
  console.warn('1. Visit: https://console.cloud.google.com/')
  console.warn('2. Create a project and enable Gmail API')
  console.warn('3. Create OAuth2 credentials (Desktop application)')
  console.warn()

  const clientId = await askQuestion('Enter your Client ID: ')
  if (!clientId) throw new Error('Client ID is required')

  const clientSecret = await askQuestion('Enter your Client Secret: ')
  if (!clientSecret) throw new Error('Client Secret is required')

  const redirectUrl = await askQuestion(
    'Enter your Redirect URI (usually http://localhost:3000/callback): '
  )
  if (!redirectUrl) throw new Error('Redirect URI is required')

  console.warn()
  console.warn('[1/4] Generating authorization URL...')

  const bootstrap = new OAuthBootstrap({
    clientId,
    clientSecret,
    redirectUrl
  })

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.modify'
  ]

  const authUrl = bootstrap.getAuthorizationUrl(scopes)

  console.warn('[2/4] Visit this URL to authorize:')
  console.warn()
  console.warn(authUrl)
  console.warn()
  console.warn('Grant all requested permissions, then copy the authorization code.')
  console.warn()

  const authCode = await askQuestion('[3/4] Paste the authorization code: ')
  if (!authCode) throw new Error('Authorization code is required')

  console.warn()
  console.warn('[4/4] Exchanging code for refresh token...')

  try {
    const tokens = await bootstrap.exchangeCodeForToken(authCode)
    console.warn('[✓] Successfully obtained tokens')

    console.warn()
    console.warn('Saving GMAIL_REFRESH_TOKEN to .env...')
    await bootstrap.saveTokens(tokens.refresh_token)
    console.warn('[✓] Saved to .env')

    console.warn()
    console.warn('╔══════════════════════════════════════╗')
    console.warn('║   OAuth Setup Complete!              ║')
    console.warn('╚══════════════════════════════════════╝')
    console.warn()
    console.warn('Next steps:')
    console.warn('1. Set GMAIL_ADDRESS, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET in .env')
    console.warn('2. Run: npm run daemon')
    console.warn()
  } catch (error) {
    console.error('[ERROR]', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run if invoked directly
if (import.meta.main) {
  bootstrapOAuth()
}
