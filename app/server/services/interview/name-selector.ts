// server/services/interview/name-selector.ts

import { createLogger } from '../../utils/logger'
import type { NameOption } from './types'

const logger = createLogger('interview:name-selector')

/**
 * Format name options for user display
 */
export function formatNameOptions(options: NameOption[]): string {
  logger.info({ optionsCount: options.length }, 'Formatting name options for display')

  return `I have three name suggestions for this new agent:

1. **${options[0].name}** - ${options[0].rationale}
2. **${options[1].name}** - ${options[1].rationale}
3. **${options[2].name}** - ${options[2].rationale}

Which name resonates with you? Please choose 1, 2, or 3.`
}

/**
 * Parse user selection (1, 2, 3, or name directly)
 * Returns the selected name or null if invalid
 */
export function parseNameSelection(input: string, options: NameOption[]): string | null {
  const trimmed = input.trim().toLowerCase()

  logger.info({ input: trimmed, optionsCount: options.length }, 'Parsing name selection')

  // Check for numeric selection
  const num = parseInt(trimmed)
  if (num >= 1 && num <= 3) {
    const selectedName = options[num - 1].name
    logger.info({ selection: num, selectedName }, 'Numeric selection parsed')
    return selectedName
  }

  // Check for name match (case-insensitive)
  const match = options.find((o) => o.name.toLowerCase() === trimmed)
  if (match) {
    logger.info({ selectedName: match.name }, 'Name match found')
    return match.name
  }

  logger.warn({ input: trimmed }, 'Invalid name selection')
  return null
}
