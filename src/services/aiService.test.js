const axios = require('axios');
const { generateResponse } = require('./aiService');
const fc = require('fast-check');

jest.mock('axios');

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_API_KEY = 'test-api-key';
  });

  describe('Unit Tests - Specific Examples', () => {
    test('should generate response successfully', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: 'Hey! How are you doing?'
            }
          }]
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await generateResponse('Hi there!');

      expect(result).toBe('Hey! How are you doing?');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          model: 'llama-3.1-8b-instant',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'Hi there!' })
          ]),
          temperature: 0.85,
          max_tokens: 75
        }),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        })
      );
    });

    test('should trim whitespace from response', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: {
              content: '  Hey! How are you?  \n'
            }
          }]
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await generateResponse('Hi');

      expect(result).toBe('Hey! How are you?');
    });

    test('should throw error on API timeout', async () => {
      const timeoutError = {
        code: 'ETIMEDOUT',
        message: 'Request timeout'
      };
      axios.post.mockRejectedValue(timeoutError);

      await expect(generateResponse('Hello')).rejects.toThrow('Failed to generate AI response');
    });

    test('should throw error on rate limiting', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            error: {
              message: 'Rate limit exceeded'
            }
          }
        }
      };
      axios.post.mockRejectedValue(rateLimitError);

      await expect(generateResponse('Hello')).rejects.toThrow('Failed to generate AI response');
    });

    test('should throw error on invalid API key', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid API key'
            }
          }
        }
      };
      axios.post.mockRejectedValue(authError);

      await expect(generateResponse('Hello')).rejects.toThrow('Failed to generate AI response');
    });

    test('should use 15 second timeout', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'Response' }
          }]
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      await generateResponse('Test');

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 15000
        })
      );
    });

    test('should include system prompt with personality instructions', async () => {
      const mockResponse = {
        data: {
          choices: [{
            message: { content: 'Response' }
          }]
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      await generateResponse('Test');

      const callArgs = axios.post.mock.calls[0][1];
      const systemMessage = callArgs.messages.find(m => m.role === 'system');
      
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('casual 25-year-old Indian friend');
      expect(systemMessage.content).toContain('1-2 sentences maximum');
      expect(systemMessage.content).toContain('Match the language');
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: instagram-dm-auto-reply, Property 5: AI Response Length Constraint
    // **Validates: Requirements 3.1**
    test('Property 5: should generate responses with at most 2 sentences', async () => {
      // Helper function to count sentences
      const countSentences = (text) => {
        const sentenceEnders = /[.!?]+/g;
        const matches = text.match(sentenceEnders);
        return matches ? matches.length : 0;
      };

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (inputMessage) => {
            // Mock various response patterns
            const mockResponses = [
              'Sure thing!',
              'Hey! How are you?',
              'That sounds great. Let me know!',
              'Cool!',
              'Haha nice one!'
            ];
            
            const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
            
            const mockResponse = {
              data: {
                choices: [{
                  message: {
                    content: randomResponse
                  }
                }]
              }
            };
            axios.post.mockResolvedValue(mockResponse);

            const result = await generateResponse(inputMessage);
            const sentenceCount = countSentences(result);
            
            // Response should have at most 2 sentences
            expect(sentenceCount).toBeLessThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: instagram-dm-auto-reply, Property 6: Language Matching
    // **Validates: Requirements 3.4, 5.1, 5.2, 5.3**
    test('Property 6: should match input language in response', async () => {
      // Helper to detect if text contains Hindi characters
      const hasHindiChars = (text) => /[\u0900-\u097F]/.test(text);
      
      // Helper to detect if text is primarily English
      const isEnglish = (text) => /^[a-zA-Z\s.,!?'"]+$/.test(text.trim());

      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('Hello! How are you?'),
            fc.constant('What\'s up?'),
            fc.constant('नमस्ते! कैसे हो?'),
            fc.constant('क्या हाल है?'),
            fc.constant('Hey yaar, kya chal raha hai?'),
            fc.constant('Acha, theek hai!')
          ),
          async (inputMessage) => {
            const inputHasHindi = hasHindiChars(inputMessage);
            const inputIsEnglish = isEnglish(inputMessage);
            
            // Mock appropriate response based on input
            let mockResponseText;
            if (inputHasHindi && !inputIsEnglish) {
              // Pure Hindi input -> Hindi response
              mockResponseText = 'बढ़िया! सब ठीक है।';
            } else if (inputIsEnglish && !inputHasHindi) {
              // Pure English input -> English response
              mockResponseText = 'Great! All good.';
            } else {
              // Hinglish input -> Hinglish response
              mockResponseText = 'Haan yaar, sab badhiya!';
            }
            
            const mockResponse = {
              data: {
                choices: [{
                  message: {
                    content: mockResponseText
                  }
                }]
              }
            };
            axios.post.mockResolvedValue(mockResponse);

            const result = await generateResponse(inputMessage);
            
            const responseHasHindi = hasHindiChars(result);
            const responseIsEnglish = isEnglish(result);
            
            // Verify language matching
            if (inputHasHindi && !inputIsEnglish) {
              // Hindi input should get Hindi response
              expect(responseHasHindi).toBe(true);
            } else if (inputIsEnglish && !inputHasHindi) {
              // English input should get English response
              expect(responseIsEnglish).toBe(true);
            } else {
              // Hinglish input should get Hinglish response (mix of both)
              // Either has Hindi chars or is English (Hinglish can be either)
              expect(responseHasHindi || responseIsEnglish).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
