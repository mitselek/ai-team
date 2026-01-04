import type { SecretsProvider } from './provider'

/**
 * VaultProvider - Stub implementation for HashiCorp Vault
 * Deferred to Phase 2 - currently throws NotImplementedError
 */
export class VaultProvider implements SecretsProvider {
  constructor(vaultConfig?: { url?: string; path?: string }) {
    // Store config but not used yet
    void vaultConfig
  }

  async get(_key: string): Promise<string> {
    throw new Error(
      'VaultProvider is not implemented in Phase 1. Use LocalDevProvider for development.'
    )
  }
}
