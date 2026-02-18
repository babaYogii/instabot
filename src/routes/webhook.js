const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if strings match
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  // If lengths differ, still compare to prevent timing leaks
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  
  // Use crypto.timingSafeEqual for constant-time comparison
  // Pad shorter buffer to match lengths
  const maxLength = Math.max(bufferA.length, bufferB.length);
  const paddedA = Buffer.alloc(maxLength);
  const paddedB = Buffer.alloc(maxLength);
  
  bufferA.copy(paddedA);
  bufferB.copy(paddedB);
  
  try {
    return crypto.timingSafeEqual(paddedA, paddedB) && bufferA.length === bufferB.length;
  } catch (error) {
    return false;
  }
}

/**
 * GET /webhook - Instagram webhook verification endpoint
 * Validates the webhook subscription request from Instagram
 */
function handleVerification(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // Validate that this is a subscription request
  if (mode !== 'subscribe') {
    logger.debug('Webhook verification failed: Invalid mode', { mode });
    return res.sendStatus(403);
  }
  
  // Validate the verify token using constant-time comparison
  const expectedToken = process.env.VERIFY_TOKEN;
  if (!secureCompare(token, expectedToken)) {
    logger.debug('Webhook verification failed: Invalid verify token');
    return res.sendStatus(403);
  }
  
  // Verification successful - return the challenge
  logger.info('Webhook verification successful');
  res.status(200).send(challenge);
}

/**
 * POST /webhook - Instagram message event endpoint
 * Receives message events from Instagram and processes them asynchronously
 */
function handleWebhook(req, res) {
  // Immediately return 200 OK to Instagram (must respond within 1 second)
  res.sendStatus(200);
  
  // Defer message processing until after the response is sent
  setImmediate(() => {
    processWebhookEvent(req.body);
  });
}

/**
 * Determine if a message should receive a reply
 * @param {object|null} parsedMessage - Parsed message object from messageParser
 * @param {string} botInstagramId - Bot's Instagram user ID
 * @returns {boolean} - True if message should receive a reply
 */
function shouldReplyToMessage(parsedMessage, botInstagramId) {
  // Return false if parsedMessage is null
  if (parsedMessage === null) {
    logger.debug('Filtering message: parsedMessage is null');
    return false;
  }
  
  // Return false if messageText is null
  if (parsedMessage.messageText === null) {
    logger.debug('Filtering message: messageText is null', {
      messageId: parsedMessage.messageId,
      senderId: parsedMessage.senderId
    });
    return false;
  }
  
  // Return false if hasAttachments is true
  if (parsedMessage.hasAttachments === true) {
    logger.debug('Filtering message: message has attachments', {
      messageId: parsedMessage.messageId,
      senderId: parsedMessage.senderId
    });
    return false;
  }
  
  // Return false if senderId equals botInstagramId (echo prevention)
  if (parsedMessage.senderId === botInstagramId) {
    logger.debug('Filtering message: sender is bot (echo prevention)', {
      messageId: parsedMessage.messageId,
      senderId: parsedMessage.senderId
    });
    return false;
  }
  
  // All conditions pass
  logger.debug('Message passed all filters, will reply', {
    messageId: parsedMessage.messageId,
    senderId: parsedMessage.senderId
  });
  return true;
}

/**
 * Process webhook event asynchronously
 * @param {object} payload - Instagram webhook event payload
 */
async function processWebhookEvent(payload) {
  let messageId = 'unknown';
  let senderId = 'unknown';
  
  try {
    // Log received event with full payload for debugging
    logger.debug('Received webhook event', { payload: JSON.stringify(payload) });
    
    // 1. Parse webhook event
    const { parseWebhookEvent } = require('../utils/messageParser');
    const parsedMessage = parseWebhookEvent(payload);
    
    if (parsedMessage) {
      messageId = parsedMessage.messageId;
      senderId = parsedMessage.senderId;
      logger.debug('Parsed message successfully', {
        messageId,
        senderId,
        messageText: parsedMessage.messageText
      });
    } else {
      logger.debug('Failed to parse message - invalid payload structure');
      return;
    }
    
    // 2. Filter messages
    const botInstagramId = process.env.BOT_INSTAGRAM_ID;
    if (!shouldReplyToMessage(parsedMessage, botInstagramId)) {
      logger.debug('Message filtered - no reply needed', { messageId, senderId });
      return;
    }
    
    logger.debug('Message passed filters', { messageId, senderId });
    
    // 3. Generate AI response
    const { generateResponse } = require('../services/aiService');
    const aiResponse = await generateResponse(parsedMessage.messageText);
    logger.info('Generated AI response', {
      messageId,
      senderId,
      responseLength: aiResponse.length
    });
    
    // 4. Send reply via Instagram API
    const { sendMessage } = require('../services/instagramService');
    const result = await sendMessage(parsedMessage.senderId, aiResponse);
    
    if (result.success) {
      logger.info('Message processed successfully', {
        messageId,
        senderId,
        instagramMessageId: result.messageId
      });
    } else {
      logger.error('Failed to send reply', null, {
        messageId,
        senderId,
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error('Error processing message', error, {
      messageId,
      senderId
    });
    // Don't throw - we want to continue processing other messages
  }
}

module.exports = {
  handleVerification,
  handleWebhook,
  secureCompare, // Export for testing
  shouldReplyToMessage // Export for testing
};
