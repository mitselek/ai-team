import type { SecretsProvider } from './provider'
import { LocalDevProvider } from './local'
import { VaultProvider } from './vault'

/**
 * Factory function to create appropriate SecretsProvider instance
 * @param type - Provider type: 'local' or 'vault'
 * @returns SecretsProvider instance
 * @throws Error if type is unknown
 */
export function createSecretsProvider(type: 'local' | 'vault'): SecretsProvider {
  switch (type) {
    case 'local':
      return new LocalDevProvider()
    case 'vault':
      return new VaultProvider()
    default:
      throw new Error(`Unknown secrets provider type: ${type}`)
  }
}
