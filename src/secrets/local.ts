import type { SecretsProvider } from './provider'

/**
 * LocalDevProvider - Load secrets from environment variables
 * Used for local development with .env file
 */
export class LocalDevProvider implements SecretsProvider {
  async get(key: string): Promise<string> {
    const value = process.env[key]

    if (!value) {
      throw new Error(`${key} env var not set`)
    }

    return value
  }
}
