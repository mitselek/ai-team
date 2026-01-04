/**
 * MCP tool definitions for email sending
 */

import type { SendRequest } from '../gmail'
import { EmailSender, type SendResult } from '../outbound'

/**
 * JSON Schema for send_email tool input
 */
export const SEND_EMAIL_TOOL = {
  name: 'send_email',
  description: 'Send an email from the managed Gmail address. Requires to and subject fields.',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient email address (required)'
      },
      cc: {
        type: 'string',
        description: 'CC recipient email address (optional, comma-separated for multiple)'
      },
      bcc: {
        type: 'string',
        description: 'BCC recipient email address (optional, comma-separated for multiple)'
      },
      subject: {
        type: 'string',
        description: 'Email subject line (required)'
      },
      text: {
        type: 'string',
        description: 'Email body as plain text (optional if html provided)'
      },
      html: {
        type: 'string',
        description: 'Email body as HTML (optional, overrides text for display)'
      }
    },
    required: ['to', 'subject'],
    additionalProperties: false
  }
} as const

/**
 * Validate and execute send_email tool
 */
export async function executeSendEmailTool(
  input: unknown,
  sender: EmailSender
): Promise<SendResult> {
  // Validate input is an object
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      error: {
        type: 'validation',
        message: 'Input must be an object',
        retryable: false
      }
    }
  }

  const data = input as Record<string, unknown>

  // Validate required fields
  if (typeof data.to !== 'string' || !data.to) {
    return {
      ok: false,
      error: {
        type: 'validation',
        message: 'Required field missing: to (must be non-empty string)',
        retryable: false
      }
    }
  }

  if (typeof data.subject !== 'string' || !data.subject) {
    return {
      ok: false,
      error: {
        type: 'validation',
        message: 'Required field missing: subject (must be non-empty string)',
        retryable: false
      }
    }
  }

  // Validate optional fields are strings if provided
  const optionalStringFields = ['cc', 'bcc', 'text', 'html']
  for (const field of optionalStringFields) {
    if (data[field] !== undefined && typeof data[field] !== 'string') {
      return {
        ok: false,
        error: {
          type: 'validation',
          message: `Field ${field} must be a string if provided`,
          retryable: false
        }
      }
    }
  }

  // Build SendRequest
  const request: SendRequest = {
    to: data.to,
    subject: data.subject,
    cc: data.cc as string | undefined,
    bcc: data.bcc as string | undefined,
    text: data.text as string | undefined,
    html: data.html as string | undefined
  }

  // Send email
  return await sender.send(request)
}

/**
 * All available MCP tools
 */
export const MCP_TOOLS = [SEND_EMAIL_TOOL] as const
