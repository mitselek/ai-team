/**
 * Pub/Sub message parser for Gmail notifications
 * Decodes base64 messages and extracts email metadata
 */

/**
 * Pub/Sub message format received from Gmail
 */
export interface PubSubMessage {
  messageId: string
  data: string // base64-encoded Gmail notification
  publishTime: string
}

/**
 * Gmail Pub/Sub notification format
 */
interface GmailNotification {
  emailAddress: string
  historyId: string
}

/**
 * Decode base64 Pub/Sub data and parse Gmail notification
 */
export function decodePubSubMessage(pubsubMessage: PubSubMessage): GmailNotification {
  // Base64 decode the data field
  const decodedBuffer = Buffer.from(pubsubMessage.data, 'base64')
  const decodedString = decodedBuffer.toString('utf-8')

  // Parse JSON
  const notification = JSON.parse(decodedString) as GmailNotification

  return notification
}

/**
 * Processed message with routing information
 */
export interface ProcessedMessage {
  messageId: string
  historyId: string
  routeKey: string
  emailAddress: string
  timestamp: Date
}

/**
 * Convert Pub/Sub message to processed message with route key
 */
export function processPubSubMessage(
  pubsubMessage: PubSubMessage,
  extractRoute: (email: string) => string
): ProcessedMessage {
  const notification = decodePubSubMessage(pubsubMessage)
  const routeKey = extractRoute(notification.emailAddress)

  return {
    messageId: pubsubMessage.messageId,
    historyId: notification.historyId,
    routeKey,
    emailAddress: notification.emailAddress,
    timestamp: new Date(pubsubMessage.publishTime)
  }
}
