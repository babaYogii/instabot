/**
 * Integration tests for complete webhook message processing pipeline
 * Tests the end-to-end flow from webhook receipt to message sending
 */

// Mock the services before requiring webhook
jest.mock('../services/aiService');
jest.mock('../services/instagramService');
jest.mock('../utils/messageParser');

const { handleWebhook } = require('./webhook');
const { generateResponse } = require('../services/aiService');
const { sendMessage } = require('../services/instagramService');
const { parseWebhookEvent } = require('../utils/messageParser');

describe('Webhook Integration Tests - Complete Pipeline', () => {
  let req, res;

  beforeEach(() => {
    // Set up environment
    process.env.BOT_INSTAGRAM_ID = 'bot_123';
    
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up request and response objects
    req = {
      body: {
        object: 'instagram',
        entry: [{
          id: 'page_id',
          time: 1234567890,
          messaging: [{
            sender: { id: 'sender_456' },
            recipient: { id: 'bot_123' },
            timestamp: 1234567890,
            message: {
              mid: 'msg_789',
              text: 'Hello bot!'
            }
          }]
        }]
      }
    };
    
    res = {
      sendStatus: jest.fn().mockReturnThis()
    };
  });

  test('processes valid message through complete pipeline', (done) => {
    // Mock successful parsing
    parseWebhookEvent.mockReturnValue({
      senderId: 'sender_456',
      messageText: 'Hello bot!',
      hasAttachments: false,
      timestamp: 1234567890,
      messageId: 'msg_789'
    });
    
    // Mock successful AI response
    generateResponse.mockResolvedValue('Hey! How are you?');
    
    // Mock successful message sending
    sendMessage.mockResolvedValue({
      success: true,
      messageId: 'sent_msg_123'
    });
    
    handleWebhook(req, res);
    
    // Verify immediate 200 OK response
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    
    // Wait for async processing
    setTimeout(() => {
      // Verify parsing was called
      expect(parseWebhookEvent).toHaveBeenCalledWith(req.body);
      
      // Verify AI service was called
      expect(generateResponse).toHaveBeenCalledWith('Hello bot!');
      
      // Verify Instagram service was called
      expect(sendMessage).toHaveBeenCalledWith('sender_456', 'Hey! How are you?');
      
      // Verify success logging
      const logCalls = console.log.mock.calls.map(call => call[0]);
      
      // Check for structured JSON logs
      const hasReceivedEvent = logCalls.some(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Received webhook event' && parsed.level === 'DEBUG';
        } catch {
          return false;
        }
      });
      
      const hasParsedMessage = logCalls.some(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Parsed message successfully' && parsed.level === 'DEBUG';
        } catch {
          return false;
        }
      });
      
      const hasGeneratedResponse = logCalls.some(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Generated AI response' && parsed.level === 'INFO';
        } catch {
          return false;
        }
      });
      
      const hasProcessedSuccessfully = logCalls.some(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Message processed successfully' && parsed.level === 'INFO';
        } catch {
          return false;
        }
      });
      
      expect(hasReceivedEvent).toBe(true);
      expect(hasParsedMessage).toBe(true);
      expect(hasGeneratedResponse).toBe(true);
      expect(hasProcessedSuccessfully).toBe(true);
      
      done();
    }, 50);
  });

  test('handles parsing error gracefully', (done) => {
    // Mock parsing failure
    parseWebhookEvent.mockReturnValue(null);
    
    handleWebhook(req, res);
    
    // Verify immediate 200 OK response
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    
    setTimeout(() => {
      // Verify parsing was attempted
      expect(parseWebhookEvent).toHaveBeenCalled();
      
      // Verify AI and Instagram services were NOT called
      expect(generateResponse).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
      
      // Verify filtering log
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const hasFilteredMessage = logCalls.some(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Failed to parse message - invalid payload structure' && parsed.level === 'DEBUG';
        } catch {
          return false;
        }
      });
      expect(hasFilteredMessage).toBe(true);
      
      done();
    }, 50);
  });

  test('handles AI service error gracefully', (done) => {
    // Mock successful parsing
    parseWebhookEvent.mockReturnValue({
      senderId: 'sender_456',
      messageText: 'Hello bot!',
      hasAttachments: false,
      timestamp: 1234567890,
      messageId: 'msg_789'
    });
    
    // Mock AI service failure
    generateResponse.mockRejectedValue(new Error('AI API timeout'));
    
    handleWebhook(req, res);
    
    // Verify immediate 200 OK response
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    
    setTimeout(() => {
      // Verify parsing and AI service were called
      expect(parseWebhookEvent).toHaveBeenCalled();
      expect(generateResponse).toHaveBeenCalled();
      
      // Verify Instagram service was NOT called
      expect(sendMessage).not.toHaveBeenCalled();
      
      // Verify error logging with context
      const errorCalls = console.error.mock.calls;
      expect(errorCalls.length).toBeGreaterThan(0);
      
      // Check for structured JSON error log
      const errorLog = errorCalls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.level === 'ERROR' && 
                 parsed.messageId === 'msg_789' && 
                 parsed.senderId === 'sender_456';
        } catch {
          return false;
        }
      });
      expect(errorLog).toBeDefined();
      
      done();
    }, 50);
  });

  test('handles Instagram API error gracefully', (done) => {
    // Mock successful parsing
    parseWebhookEvent.mockReturnValue({
      senderId: 'sender_456',
      messageText: 'Hello bot!',
      hasAttachments: false,
      timestamp: 1234567890,
      messageId: 'msg_789'
    });
    
    // Mock successful AI response
    generateResponse.mockResolvedValue('Hey! How are you?');
    
    // Mock Instagram API failure
    sendMessage.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded'
    });
    
    handleWebhook(req, res);
    
    // Verify immediate 200 OK response
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    
    setTimeout(() => {
      // Verify all services were called
      expect(parseWebhookEvent).toHaveBeenCalled();
      expect(generateResponse).toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalled();
      
      // Verify error logging
      const errorCalls = console.error.mock.calls;
      expect(errorCalls.length).toBeGreaterThan(0);
      
      // Check for structured JSON error log
      const errorLog = errorCalls.find(call => {
        try {
          const parsed = JSON.parse(call[0]);
          return parsed.level === 'ERROR' && 
                 parsed.message === 'Failed to send reply' &&
                 parsed.messageId === 'msg_789' && 
                 parsed.senderId === 'sender_456';
        } catch {
          return false;
        }
      });
      expect(errorLog).toBeDefined();
      
      done();
    }, 50);
  });

  test('filters message with attachments', (done) => {
    // Mock parsing with attachments
    parseWebhookEvent.mockReturnValue({
      senderId: 'sender_456',
      messageText: 'Check this out!',
      hasAttachments: true,
      timestamp: 1234567890,
      messageId: 'msg_789'
    });
    
    handleWebhook(req, res);
    
    // Verify immediate 200 OK response
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    
    setTimeout(() => {
      // Verify parsing was called
      expect(parseWebhookEvent).toHaveBeenCalled();
      
      // Verify AI and Instagram services were NOT called
      expect(generateResponse).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
      
      // Verify filtering log
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const hasFilteredMessage = logCalls.some(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Message filtered - no reply needed' && parsed.level === 'DEBUG';
        } catch {
          return false;
        }
      });
      expect(hasFilteredMessage).toBe(true);
      
      done();
    }, 50);
  });

  test('filters message from bot itself (echo prevention)', (done) => {
    // Mock parsing with bot as sender
    parseWebhookEvent.mockReturnValue({
      senderId: 'bot_123', // Same as BOT_INSTAGRAM_ID
      messageText: 'Hello!',
      hasAttachments: false,
      timestamp: 1234567890,
      messageId: 'msg_789'
    });
    
    handleWebhook(req, res);
    
    // Verify immediate 200 OK response
    expect(res.sendStatus).toHaveBeenCalledWith(200);
    
    setTimeout(() => {
      // Verify parsing was called
      expect(parseWebhookEvent).toHaveBeenCalled();
      
      // Verify AI and Instagram services were NOT called
      expect(generateResponse).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
      
      // Verify filtering log
      const logCalls = console.log.mock.calls.map(call => call[0]);
      const hasFilteredMessage = logCalls.some(log => {
        try {
          const parsed = JSON.parse(log);
          return parsed.message === 'Message filtered - no reply needed' && parsed.level === 'DEBUG';
        } catch {
          return false;
        }
      });
      expect(hasFilteredMessage).toBe(true);
      
      done();
    }, 50);
  });
});
