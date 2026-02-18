const { parseWebhookEvent } = require('./messageParser');
const fc = require('fast-check');

describe('Message Parser', () => {
  describe('Unit Tests - Specific Examples', () => {
    test('should parse valid webhook payload with text message', () => {
      const payload = {
        object: 'instagram',
        entry: [{
          id: 'PAGE_ID',
          time: 1234567890,
          messaging: [{
            sender: { id: 'SENDER_123' },
            recipient: { id: 'BOT_456' },
            timestamp: 1234567890,
            message: {
              mid: 'MSG_789',
              text: 'Hello!'
            }
          }]
        }]
      };

      const result = parseWebhookEvent(payload);
      
      expect(result).toEqual({
        senderId: 'SENDER_123',
        messageText: 'Hello!',
        hasAttachments: false,
        timestamp: 1234567890,
        messageId: 'MSG_789'
      });
    });

    test('should parse message with attachments', () => {
      const payload = {
        entry: [{
          messaging: [{
            sender: { id: 'SENDER_123' },
            timestamp: 1234567890,
            message: {
              mid: 'MSG_789',
              text: 'Check this out',
              attachments: [{ type: 'image', payload: { url: 'https://example.com/image.jpg' } }]
            }
          }]
        }]
      };

      const result = parseWebhookEvent(payload);
      
      expect(result).toEqual({
        senderId: 'SENDER_123',
        messageText: 'Check this out',
        hasAttachments: true,
        timestamp: 1234567890,
        messageId: 'MSG_789'
      });
    });

    test('should handle message without text field', () => {
      const payload = {
        entry: [{
          messaging: [{
            sender: { id: 'SENDER_123' },
            timestamp: 1234567890,
            message: {
              mid: 'MSG_789',
              attachments: [{ type: 'image' }]
            }
          }]
        }]
      };

      const result = parseWebhookEvent(payload);
      
      expect(result).toEqual({
        senderId: 'SENDER_123',
        messageText: null,
        hasAttachments: true,
        timestamp: 1234567890,
        messageId: 'MSG_789'
      });
    });

    test('should return null for missing entry array', () => {
      const payload = { object: 'instagram' };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for empty entry array', () => {
      const payload = { entry: [] };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for missing messaging array', () => {
      const payload = { entry: [{ id: 'PAGE_ID' }] };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for empty messaging array', () => {
      const payload = { entry: [{ messaging: [] }] };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for missing sender', () => {
      const payload = {
        entry: [{
          messaging: [{
            timestamp: 1234567890,
            message: { mid: 'MSG_789', text: 'Hello' }
          }]
        }]
      };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for missing sender.id', () => {
      const payload = {
        entry: [{
          messaging: [{
            sender: {},
            timestamp: 1234567890,
            message: { mid: 'MSG_789', text: 'Hello' }
          }]
        }]
      };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for missing timestamp', () => {
      const payload = {
        entry: [{
          messaging: [{
            sender: { id: 'SENDER_123' },
            message: { mid: 'MSG_789', text: 'Hello' }
          }]
        }]
      };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for missing message object', () => {
      const payload = {
        entry: [{
          messaging: [{
            sender: { id: 'SENDER_123' },
            timestamp: 1234567890
          }]
        }]
      };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for missing message.mid', () => {
      const payload = {
        entry: [{
          messaging: [{
            sender: { id: 'SENDER_123' },
            timestamp: 1234567890,
            message: { text: 'Hello' }
          }]
        }]
      };
      expect(parseWebhookEvent(payload)).toBeNull();
    });

    test('should return null for null payload', () => {
      expect(parseWebhookEvent(null)).toBeNull();
    });

    test('should return null for undefined payload', () => {
      expect(parseWebhookEvent(undefined)).toBeNull();
    });

    test('should handle empty attachments array as no attachments', () => {
      const payload = {
        entry: [{
          messaging: [{
            sender: { id: 'SENDER_123' },
            timestamp: 1234567890,
            message: {
              mid: 'MSG_789',
              text: 'Hello',
              attachments: []
            }
          }]
        }]
      };

      const result = parseWebhookEvent(payload);
      expect(result.hasAttachments).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: instagram-dm-auto-reply, Property 2: Message Text Extraction
    // **Validates: Requirements 2.1**
    test('Property 2: should extract exact text content from any valid payload with text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.integer({ min: 1 }),
          fc.string({ minLength: 1 }),
          (senderId, messageText, timestamp, messageId) => {
            const payload = {
              entry: [{
                messaging: [{
                  sender: { id: senderId },
                  timestamp,
                  message: {
                    mid: messageId,
                    text: messageText
                  }
                }]
              }]
            };

            const result = parseWebhookEvent(payload);
            
            expect(result).not.toBeNull();
            expect(result.messageText).toBe(messageText);
            expect(result.senderId).toBe(senderId);
            expect(result.timestamp).toBe(timestamp);
            expect(result.messageId).toBe(messageId);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: instagram-dm-auto-reply, Property 3: Message Filtering Rules
    // **Validates: Requirements 2.2, 2.5**
    test('Property 3: should set hasAttachments=true for any payload with attachments', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 1 }),
          fc.string({ minLength: 1 }),
          fc.array(fc.record({ type: fc.string() }), { minLength: 1 }),
          (senderId, timestamp, messageId, attachments) => {
            const payload = {
              entry: [{
                messaging: [{
                  sender: { id: senderId },
                  timestamp,
                  message: {
                    mid: messageId,
                    attachments
                  }
                }]
              }]
            };

            const result = parseWebhookEvent(payload);
            
            expect(result).not.toBeNull();
            expect(result.hasAttachments).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 3: should set messageText=null for any payload without text field', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 1 }),
          fc.string({ minLength: 1 }),
          (senderId, timestamp, messageId) => {
            const payload = {
              entry: [{
                messaging: [{
                  sender: { id: senderId },
                  timestamp,
                  message: {
                    mid: messageId
                    // No text field
                  }
                }]
              }]
            };

            const result = parseWebhookEvent(payload);
            
            expect(result).not.toBeNull();
            expect(result.messageText).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should return null for any malformed payload missing required fields', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant({}),
            fc.record({ entry: fc.constant([]) }),
            fc.record({ entry: fc.constant([{}]) }),
            fc.record({ entry: fc.constant([{ messaging: [] }]) })
          ),
          (malformedPayload) => {
            const result = parseWebhookEvent(malformedPayload);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
