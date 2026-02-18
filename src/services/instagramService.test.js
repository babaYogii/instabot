const axios = require('axios');
const { sendMessage } = require('./instagramService');

jest.mock('axios');

describe('instagramService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';
  });

  describe('sendMessage', () => {
    it('should send message successfully and return success with messageId', async () => {
      const mockResponse = {
        data: {
          message_id: 'msg_123',
          recipient_id: 'user_456'
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await sendMessage('user_456', 'Hello!');

      expect(result).toEqual({
        success: true,
        messageId: 'msg_123'
      });
      expect(axios.post).toHaveBeenCalledWith(
        'https://graph.instagram.com/v18.0/me/messages',
        {
          recipient: { id: 'user_456' },
          message: { text: 'Hello!' }
        },
        {
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
    });

    it('should return error on 4xx error without retry', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            error: {
              message: 'Invalid recipient ID'
            }
          }
        }
      };
      axios.post.mockRejectedValue(mockError);

      const result = await sendMessage('invalid_id', 'Hello!');

      expect(result).toEqual({
        success: false,
        error: 'Invalid recipient ID'
      });
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    it('should retry once on network error', async () => {
      const networkError = {
        code: 'ETIMEDOUT',
        message: 'Network timeout'
      };
      const mockResponse = {
        data: {
          message_id: 'msg_789'
        }
      };
      
      axios.post
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse);

      const result = await sendMessage('user_123', 'Retry test');

      expect(result).toEqual({
        success: true,
        messageId: 'msg_789'
      });
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should return error after max retries on network error', async () => {
      const networkError = {
        code: 'ECONNABORTED',
        message: 'Connection aborted'
      };
      axios.post.mockRejectedValue(networkError);

      const result = await sendMessage('user_123', 'Test');

      expect(result).toEqual({
        success: false,
        error: 'Connection aborted'
      });
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should use 5 second timeout', async () => {
      const mockResponse = {
        data: { message_id: 'msg_123' }
      };
      axios.post.mockResolvedValue(mockResponse);

      await sendMessage('user_123', 'Test');

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 5000
        })
      );
    });
  });
});
