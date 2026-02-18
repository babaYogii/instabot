const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Generate AI response using Groq API
 * @param {string} messageText - The user's message text
 * @returns {Promise<string>} - AI generated response
 * @throws {Error} - Throws error on API failure
 */
async function generateResponse(messageText) {
  try {
    logger.debug('Generating AI response', { inputLength: messageText.length });
    
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a casual 25-year-old Indian friend. Respond in 1-2 sentences maximum. Match the language of the input (English/Hindi/Hinglish). Be friendly and natural, don\'t reveal you\'re a bot. Avoid controversial, financial, and medical topics.'
          },
          {
            role: 'user',
            content: messageText
          }
        ],
        temperature: 0.85,
        max_tokens: 75
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 seconds
      }
    );

    const generatedText = response.data.choices[0].message.content.trim();
    logger.debug('AI response generated successfully', {
      responseLength: generatedText.length,
      tokensUsed: response.data.usage?.total_tokens
    });
    
    return generatedText;
  } catch (error) {
    logger.error('Failed to generate AI response', error, {
      statusCode: error.response?.status,
      errorData: error.response?.data
    });
    throw new Error('Failed to generate AI response');
  }
}

module.exports = {
  generateResponse
};
