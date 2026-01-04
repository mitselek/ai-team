import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LocalDevProvider, VaultProvider, createSecretsProvider } from '../src/secrets/index'

describe('Secrets Management', () => {
  describe('LocalDevProvider', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('reads GMAIL_CLIENT_ID from env', async () => {
      process.env.GMAIL_CLIENT_ID = 'test-client-id'
      const provider = new LocalDevProvider()

      const result = await provider.get('GMAIL_CLIENT_ID')
      expect(result).toBe('test-client-id')
    })

    it('reads GMAIL_CLIENT_SECRET from env', async () => {
      process.env.GMAIL_CLIENT_SECRET = 'test-client-secret'
      const provider = new LocalDevProvider()

      const result = await provider.get('GMAIL_CLIENT_SECRET')
      expect(result).toBe('test-client-secret')
    })

    it('reads GMAIL_REFRESH_TOKEN from env', async () => {
      process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token'
      const provider = new LocalDevProvider()

      const result = await provider.get('GMAIL_REFRESH_TOKEN')
      expect(result).toBe('test-refresh-token')
    })

    it('throws on missing env var', async () => {
      delete process.env.MISSING_VAR
      const provider = new LocalDevProvider()

      await expect(provider.get('MISSING_VAR')).rejects.toThrow('MISSING_VAR env var not set')
    })

    it('throws with helpful error message', async () => {
      delete process.env.GMAIL_CLIENT_ID
      const provider = new LocalDevProvider()

      await expect(provider.get('GMAIL_CLIENT_ID')).rejects.toThrow(
        'GMAIL_CLIENT_ID env var not set'
      )
    })
  })

  describe('VaultProvider', () => {
    it('throws NotImplementedError on get', async () => {
      const provider = new VaultProvider()

      await expect(provider.get('any-key')).rejects.toThrow(
        'VaultProvider is not implemented in Phase 1'
      )
    })

    it('can be instantiated with config', () => {
      const provider = new VaultProvider({
        url: 'https://vault.example.com',
        path: 'secret/email'
      })
      expect(provider).toBeDefined()
    })

    it('can be instantiated without config', () => {
      const provider = new VaultProvider()
      expect(provider).toBeDefined()
    })
  })

  describe('createSecretsProvider factory', () => {
    it('returns LocalDevProvider for "local"', () => {
      const provider = createSecretsProvider('local')
      expect(provider).toBeInstanceOf(LocalDevProvider)
    })

    it('returns VaultProvider for "vault"', () => {
      const provider = createSecretsProvider('vault')
      expect(provider).toBeInstanceOf(VaultProvider)
    })

    it('throws for unknown type', () => {
      expect(() => {
        createSecretsProvider('unknown' as unknown as 'local' | 'vault')
      }).toThrow('Unknown secrets provider type: unknown')
    })

    it('throws with helpful error message for invalid type', () => {
      expect(() => {
        createSecretsProvider('redis' as unknown as 'local' | 'vault')
      }).toThrow('Unknown secrets provider type: redis')
    })
  })

  describe('SecretsProvider interface contract', () => {
    it('LocalDevProvider implements SecretsProvider', async () => {
      process.env.TEST_KEY = 'test-value'
      const provider = new LocalDevProvider()

      // Verify get method exists and returns Promise<string>
      const result = provider.get('TEST_KEY')
      expect(result).toBeInstanceOf(Promise)
      expect(await result).toBe('test-value')
    })

    it('VaultProvider implements SecretsProvider', async () => {
      const provider = new VaultProvider()

      // Verify get method exists and returns Promise
      const result = provider.get('any-key')
      expect(result).toBeInstanceOf(Promise)

      // Properly handle the promise rejection
      await expect(result).rejects.toThrow()
    })
  })
})
