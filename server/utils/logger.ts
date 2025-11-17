/**
 * Simple console-based logger for Nitro compatibility
 * (Avoids pino stream issues in Nitro context)
 */

interface Logger {
  info: (data: unknown, message?: string) => void
  warn: (data: unknown, message?: string) => void
  error: (data: unknown, message?: string) => void
  debug: (data: unknown, message?: string) => void
}

export function createLogger(name: string): Logger {
  const prefix = `[${name}]`

  return {
    info: (data: unknown, message?: string) => {
      console.error(`${prefix} INFO:`, message || '', JSON.stringify(data))
    },
    warn: (data: unknown, message?: string) => {
      console.error(`${prefix} WARN:`, message || '', JSON.stringify(data))
    },
    error: (data: unknown, message?: string) => {
      console.error(`${prefix} ERROR:`, message || '', JSON.stringify(data))
    },
    debug: (data: unknown, message?: string) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`${prefix} DEBUG:`, message || '', JSON.stringify(data))
      }
    }
  }
}
