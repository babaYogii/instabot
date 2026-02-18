/**
 * Message Parser Utility
 * Extracts and validates message data from Instagram webhook payloads
 */

const logger = require('./logger');

/**
 * Parses an Instagram webhook event payload and extracts message data
 * @param {Object} payload - The webhook event payload from Instagram
 * @returns {Object|null} Parsed message data or null if invalid/malformed
 * @returns {string} returns.senderId - Instagram user ID of the sender
 * @returns {string|null} returns.messageText - Extracted text content or null
 * @returns {boolean} returns.hasAttachments - True if message contains attachments
 * @returns {number} returns.timestamp - Unix timestamp of the message
 * @returns {string} returns.messageId - Instagram message ID
 */
function parseWebhookEvent(payload) {
  try {
    // Navigate Instagram's nested JSON structure: entry[0].messaging[0]
    if (!payload || !payload.entry || !Array.isArray(payload.entry) || payload.entry.length === 0) {
      return null;
    }

    const entry = payload.entry[0];
    if (!entry.messaging || !Array.isArray(entry.messaging) || entry.messaging.length === 0) {
      return null;
    }

    const messagingEvent = entry.messaging[0];
    
    // Log the event type for debugging
    const eventType = messagingEvent.message ? 'message' : 
                     messagingEvent.read ? 'read' :
                     messagingEvent.delivery ? 'delivery' :
                     messagingEvent.postback ? 'postback' : 'unknown';
    
    // Check if this is a message event (not read receipt, delivery, etc.)
    if (!messagingEvent.message) {
      // This is not a message event (could be read, delivery, postback, etc.)
      logger.debug(`Ignoring non-message event: ${eventType}`);
      return null;
    }

    const message = messagingEvent.message;
    
    // Extract sender ID
    if (!messagingEvent.sender || !messagingEvent.sender.id) {
      return null;
    }
    const senderId = messagingEvent.sender.id;

    // Extract timestamp
    if (!messagingEvent.timestamp) {
      return null;
    }
    const timestamp = messagingEvent.timestamp;

    // Extract message ID
    if (!message.mid) {
      return null;
    }
    const messageId = message.mid;

    // Extract message text (null if absent)
    const messageText = message.text || null;

    // Check for attachments array
    const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;

    return {
      senderId,
      messageText,
      hasAttachments,
      timestamp,
      messageId
    };
  } catch (error) {
    // Handle any unexpected errors gracefully
    logger.error('Error parsing webhook event', error);
    return null;
  }
}

module.exports = {
  parseWebhookEvent
};
