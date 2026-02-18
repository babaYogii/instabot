const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Send a reply message via Instagram API
 * @param {string} recipientId - Instagram user ID to send message to
 * @param {string} messageText - Text content to send
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendMessage(recipientId, messageText) {
  const maxRetries = 1;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      logger.debug('Sending message via Instagram API', {
        recipientId,
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1
      });
      
      const response = await axios.post(
        'https://graph.instagram.com/v18.0/me/messages',
        {
          recipient: { id: recipientId },
          message: { text: messageText }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      const messageId = response.data.message_id || response.data.id;
      logger.info('Message sent successfully via Instagram API', {
        recipientId,
        messageId
      });
      
      return { 
        success: true, 
        messageId
      };

    } catch (error) {
      const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      const is4xxError = error.response && error.response.status >= 400 && error.response.status < 500;

      logger.error('Instagram API error', error, {
        recipientId,
        attempt: attempt + 1,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        errorCode: error.code,
        errorData: error.response?.data
      });

      // Retry only on network errors, not on 4xx client errors
      if (isNetworkError && attempt < maxRetries) {
        attempt++;
        logger.debug('Retrying Instagram API call due to network error', {
          recipientId,
          attempt: attempt + 1
        });
        continue;
      }

      // No more retries or non-retryable error
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  // Should not reach here, but just in case
  return { 
    success: false, 
    error: 'Max retries exceeded' 
  };
}

module.exports = {
  sendMessage
};
