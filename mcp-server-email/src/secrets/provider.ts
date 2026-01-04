/**
 * SecretsProvider - Pluggable interface for secret management
 * Supports multiple backends (LocalDev, Vault, etc.)
 */

export type SecretsProvider = {
  /**
   * Get a secret by key
   * @param key - The secret key to retrieve
   * @returns Promise<string> - The secret value
   * @throws Error if key not found
   */
  get(key: string): Promise<string>
}
