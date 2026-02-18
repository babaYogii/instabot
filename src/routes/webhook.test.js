const { handleVerification, handleWebhook, secureCompare, shouldReplyToMessage } = require('./webhook');

describe('Webhook Routes', () => {
  describe('secureCompare', () => {
    test('returns true for matching strings', () => {
      expect(secureCompare('test123', 'test123')).toBe(true);
    });

    test('returns false for different strings', () => {
      expect(secureCompare('test123', 'test456')).toBe(false);
    });

    test('returns false for different length strings', () => {
      expect(secureCompare('test', 'testing')).toBe(false);
    });

    test('returns false for non-string inputs', () => {
      expect(secureCompare(123, '123')).toBe(false);
      expect(secureCompare('123', null)).toBe(false);
    });
  });

  describe('GET /webhook - handleVerification', () => {
    let req, res;

    beforeEach(() => {
      process.env.VERIFY_TOKEN = 'test_verify_token_123';
      req = {
        query: {}
      };
      res = {
        sendStatus: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      };
      console.log = jest.fn();
    });

    test('returns challenge for valid subscription request', () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test_verify_token_123',
        'hub.challenge': 'challenge_string_xyz'
      };

      handleVerification(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('challenge_string_xyz');
      
      // Verify structured logging
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const successLog = logCalls.find(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Webhook verification successful' && parsed.level === 'INFO';
        } catch {
          return false;
        }
      });
      expect(successLog).toBeDefined();
    });

    test('returns 403 for invalid mode', () => {
      req.query = {
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test_verify_token_123',
        'hub.challenge': 'challenge_string_xyz'
      };

      handleVerification(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    test('returns 403 for invalid verify token', () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'challenge_string_xyz'
      };

      handleVerification(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    test('returns 403 for missing verify token', () => {
      req.query = {
        'hub.mode': 'subscribe',
        'hub.challenge': 'challenge_string_xyz'
      };

      handleVerification(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('POST /webhook - handleWebhook', () => {
    let req, res;

    beforeEach(() => {
      req = {
        body: {
          object: 'instagram',
          entry: [{
            id: 'page_id',
            time: 1234567890,
            messaging: [{
              sender: { id: 'sender_123' },
              recipient: { id: 'bot_456' },
              timestamp: 1234567890,
              message: {
                mid: 'msg_id',
                text: 'Hello!'
              }
            }]
          }]
        }
      };
      res = {
        sendStatus: jest.fn().mockReturnThis()
      };
      console.log = jest.fn();
      console.error = jest.fn();
    });

    test('returns 200 OK immediately', () => {
      handleWebhook(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(200);
    });

    test('processes message asynchronously', (done) => {
      handleWebhook(req, res);

      // Verify response was sent immediately
      expect(res.sendStatus).toHaveBeenCalledWith(200);

      // Wait for async processing
      setTimeout(() => {
        // Check that console.log was called with the received message
        const calls = console.log.mock.calls;
        const hasProcessingCall = calls.some(call => {
          try {
            const parsed = JSON.parse(call[0]);
            return parsed.message === 'Received webhook event' && parsed.level === 'DEBUG';
          } catch {
            return false;
          }
        });
        expect(hasProcessingCall).toBe(true);
        done();
      }, 10);
    });
  });

  describe('shouldReplyToMessage', () => {
    const botInstagramId = 'bot_123';
    
    beforeEach(() => {
      console.debug = jest.fn();
    });

    test('returns false when parsedMessage is null', () => {
      const result = shouldReplyToMessage(null, botInstagramId);
      
      expect(result).toBe(false);
      
      // Verify structured logging
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const filterLog = logCalls.find(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Filtering message: parsedMessage is null' && parsed.level === 'DEBUG';
        } catch {
          return false;
        }
      });
      expect(filterLog).toBeDefined();
    });

    test('returns false when messageText is null', () => {
      const parsedMessage = {
        senderId: 'sender_456',
        messageText: null,
        hasAttachments: false,
        timestamp: 1234567890,
        messageId: 'msg_id'
      };
      
      const result = shouldReplyToMessage(parsedMessage, botInstagramId);
      
      expect(result).toBe(false);
      
      // Verify structured logging with context
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const filterLog = logCalls.find(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Filtering message: messageText is null' && 
                 parsed.level === 'DEBUG' &&
                 parsed.messageId === 'msg_id' &&
                 parsed.senderId === 'sender_456';
        } catch {
          return false;
        }
      });
      expect(filterLog).toBeDefined();
    });

    test('returns false when hasAttachments is true', () => {
      const parsedMessage = {
        senderId: 'sender_456',
        messageText: 'Hello!',
        hasAttachments: true,
        timestamp: 1234567890,
        messageId: 'msg_id'
      };
      
      const result = shouldReplyToMessage(parsedMessage, botInstagramId);
      
      expect(result).toBe(false);
      
      // Verify structured logging with context
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const filterLog = logCalls.find(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Filtering message: message has attachments' && 
                 parsed.level === 'DEBUG' &&
                 parsed.messageId === 'msg_id' &&
                 parsed.senderId === 'sender_456';
        } catch {
          return false;
        }
      });
      expect(filterLog).toBeDefined();
    });

    test('returns false when senderId equals botInstagramId (echo prevention)', () => {
      const parsedMessage = {
        senderId: botInstagramId,
        messageText: 'Hello!',
        hasAttachments: false,
        timestamp: 1234567890,
        messageId: 'msg_id'
      };
      
      const result = shouldReplyToMessage(parsedMessage, botInstagramId);
      
      expect(result).toBe(false);
      
      // Verify structured logging with context
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const filterLog = logCalls.find(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Filtering message: sender is bot (echo prevention)' && 
                 parsed.level === 'DEBUG' &&
                 parsed.messageId === 'msg_id' &&
                 parsed.senderId === botInstagramId;
        } catch {
          return false;
        }
      });
      expect(filterLog).toBeDefined();
    });

    test('returns true when all conditions pass', () => {
      const parsedMessage = {
        senderId: 'sender_456',
        messageText: 'Hello!',
        hasAttachments: false,
        timestamp: 1234567890,
        messageId: 'msg_id'
      };
      
      const result = shouldReplyToMessage(parsedMessage, botInstagramId);
      
      expect(result).toBe(true);
      
      // Verify structured logging with context
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const filterLog = logCalls.find(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Message passed all filters, will reply' && 
                 parsed.level === 'DEBUG' &&
                 parsed.messageId === 'msg_id' &&
                 parsed.senderId === 'sender_456';
        } catch {
          return false;
        }
      });
      expect(filterLog).toBeDefined();
    });

    test('filters messages in correct order (short-circuit evaluation)', () => {
      // Test that null check happens first
      const result1 = shouldReplyToMessage(null, botInstagramId);
      expect(result1).toBe(false);
      
      // Test that messageText check happens before attachments
      const parsedMessage2 = {
        senderId: 'sender_456',
        messageText: null,
        hasAttachments: true,
        timestamp: 1234567890,
        messageId: 'msg_id'
      };
      const result2 = shouldReplyToMessage(parsedMessage2, botInstagramId);
      expect(result2).toBe(false);
      
      // Verify structured logging
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const filterLog = logCalls.find(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Filtering message: messageText is null' && parsed.level === 'DEBUG';
        } catch {
          return false;
        }
      });
      expect(filterLog).toBeDefined();
    });
  });
});
