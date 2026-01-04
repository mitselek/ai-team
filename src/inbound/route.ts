/**
 * Route extraction from plus-addressed email addresses
 * Converts mitselek+route-key@gmail.com to route-key
 */

/**
 * Extract route key from plus-addressed email
 * mitselek+hr-hiring@gmail.com → "hr-hiring"
 * mitselek@gmail.com → "PostOffice" (default)
 * user+@gmail.com → "PostOffice" (empty token)
 */
export function extractRouteKey(emailAddress: string): string {
  // Handle missing @ sign or malformed addresses
  if (!emailAddress.includes('@')) {
    return 'PostOffice'
  }

  // Get local part (before @)
  const [localPart] = emailAddress.split('@')

  // Check if + exists in local part
  if (!localPart.includes('+')) {
    return 'PostOffice'
  }

  // Get token after + (everything after first +)
  const plusIndex = localPart.indexOf('+')
  const token = localPart.substring(plusIndex + 1)

  // If empty token (ends with +), return default
  if (!token || token.length === 0) {
    return 'PostOffice'
  }

  return token
}
