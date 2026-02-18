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
    // Validate basic payload structure
    if (!payload || !payload.entry || !Array.isArray(payload.entry) || payload.entry.length === 0) {
      return null;
    }

    const entry = payload.entry[0];
    
    // Instagram can send two different formats:
    // Format 1: entry[0].messaging[0] (older format)
    // Format 2: entry[0].changes[0].value (newer format)
    
    let messagingEvent = null;
    let senderId = null;
    let timestamp = null;
    let message = null;
    
    // Try Format 1: messaging array
    if (entry.messaging && Array.isArray(entry.messaging) && entry.messaging.length > 0) {
      messagingEvent = entry.messaging[0];
      
      // Check for regular message
      if (messagingEvent.message) {
        message = messagingEvent.message;
        senderId = messagingEvent.sender?.id;
        timestamp = messagingEvent.timestamp;
      }
      // Check for edited message
      else if (messagingEvent.message_edit) {
        message = {
          mid: messagingEvent.message_edit.mid,
          text: messagingEvent.message_edit.text,
          attachments: messagingEvent.message_edit.attachments
        };
        senderId = messagingEvent.sender?.id;
        timestamp = messagingEvent.timestamp;
        logger.debug('Processing edited message', { 
          hasSender: !!messagingEvent.sender,
          senderId: senderId,
          entryId: entry.id,
          messagingEvent: JSON.stringify(messagingEvent)
        });
      }
      // Check for other event types (read, delivery, etc.)
      else {
        const eventType = messagingEvent.read ? 'read' :
                         messagingEvent.delivery ? 'delivery' :
                         messagingEvent.postback ? 'postback' : 'unknown';
        logger.debug(`Ignoring non-message event: ${eventType}`);
        return null;
      }
    }
    // Try Format 2: changes array
    else if (entry.changes && Array.isArray(entry.changes) && entry.changes.length > 0) {
      const change = entry.changes[0];
      
      // Check if this is a messages field change
      if (change.field !== 'messages' || !change.value) {
        logger.debug(`Ignoring non-message change: ${change.field}`);
        return null;
      }
      
      const value = change.value;
      message = value.message;
      senderId = value.sender?.id;
      timestamp = value.timestamp ? parseInt(value.timestamp) : null;
    }
    else {
      // Neither format matched
      return null;
    }
    
    // Validate extracted data
    if (!senderId || !message || !message.mid) {
      return null;
    }
    
    // Extract message text (null if absent)
    const messageText = message.text || null;
    
    // Check for attachments array
    const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;
    
    return {
      senderId,
      messageText,
      hasAttachments,
      timestamp,
      messageId: message.mid
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
