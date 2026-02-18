# Implementation Plan: Instagram DM Auto-Reply Bot

## Overview

This implementation plan breaks down the Instagram DM Auto-Reply Bot into discrete coding tasks. The approach follows an incremental development pattern: set up core infrastructure first, implement message processing pipeline, add AI integration, wire everything together, and finally add comprehensive testing. Each task builds on previous work to ensure continuous integration and early validation.

## Tasks

- [x] 1. Initialize project structure and dependencies
  - Create package.json with Node.js project configuration
  - Install dependencies: express, dotenv, axios (for HTTP requests)
  - Install dev dependencies: jest, fast-check (for property-based testing)
  - Create folder structure: /src/routes, /src/services, /src/utils
  - Create .env.example file with required environment variable templates
  - Create .gitignore to exclude node_modules and .env
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 2. Implement server initialization and configuration validation
  - [x] 2.1 Create server.js with Express app initialization
    - Load environment variables using dotenv
    - Validate required environment variables (INSTAGRAM_ACCESS_TOKEN, VERIFY_TOKEN, AI_API_KEY, BOT_INSTAGRAM_ID)
    - Fail fast with clear error messages if any variable is missing
    - Set up Express middleware (JSON body parser)
    - Create health check endpoint GET /health
    - Start server on configured PORT (default 3000)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.5_
  
  - [ ]* 2.2 Write property test for configuration validation
    - **Property 9: Configuration Validation**
    - **Validates: Requirements 6.4**
    - Test that for any missing required environment variable, startup fails with clear error
    - _Requirements: 6.4_
  
  - [ ]* 2.3 Write unit tests for server initialization
    - Test successful startup with all environment variables present
    - Test health check endpoint returns 200 OK
    - Test specific error messages for each missing variable
    - _Requirements: 6.4, 7.5_

- [ ] 3. Implement webhook route and verification
  - [x] 3.1 Create /src/routes/webhook.js with GET and POST endpoints
    - Implement GET /webhook for Instagram verification
    - Validate hub.mode === 'subscribe'
    - Compare hub.verify_token with VERIFY_TOKEN (constant-time comparison)
    - Return hub.challenge on success, 403 on failure
    - Implement POST /webhook that immediately returns 200 OK
    - Use setImmediate() to defer message processing after response
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 3.2 Write property test for webhook token validation
    - **Property 1: Webhook Token Validation**
    - **Validates: Requirements 1.1**
    - Test that for any verify token, webhook returns challenge if and only if token matches
    - _Requirements: 1.1_
  
  - [ ]* 3.3 Write unit tests for webhook endpoints
    - Test GET endpoint with valid token returns challenge
    - Test GET endpoint with invalid token returns 403
    - Test POST endpoint returns 200 OK immediately
    - Test POST endpoint processes message asynchronously
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Checkpoint - Ensure webhook infrastructure works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement message parser
  - [x] 5.1 Create /src/utils/messageParser.js
    - Implement parseWebhookEvent(payload) function
    - Navigate Instagram's nested JSON: entry[0].messaging[0]
    - Extract senderId from sender.id
    - Extract messageText from message.text (null if absent)
    - Check for message.attachments array (set hasAttachments boolean)
    - Extract timestamp and messageId
    - Return null for invalid/malformed payloads
    - Handle missing fields gracefully with try-catch
    - _Requirements: 2.1, 2.5, 2.6_
  
  - [ ]* 5.2 Write property test for message text extraction
    - **Property 2: Message Text Extraction**
    - **Validates: Requirements 2.1**
    - Test that for any valid payload with text, parser extracts exact text content
    - _Requirements: 2.1_
  
  - [ ]* 5.3 Write property test for message filtering rules
    - **Property 3: Message Filtering Rules**
    - **Validates: Requirements 2.2, 2.5**
    - Test that parser correctly identifies messages with attachments or without text
    - _Requirements: 2.2, 2.5_
  
  - [ ]* 5.4 Write unit tests for message parser
    - Test parsing valid message with text
    - Test parsing message with attachments returns hasAttachments=true
    - Test parsing message without text returns messageText=null
    - Test parsing malformed JSON returns null
    - Test parsing payload with missing nested fields returns null
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

- [ ] 6. Implement message filtering logic
  - [x] 6.1 Create shouldReplyToMessage(parsedMessage, botInstagramId) function in webhook.js
    - Return false if parsedMessage is null
    - Return false if messageText is null
    - Return false if hasAttachments is true
    - Return false if senderId equals botInstagramId (echo prevention)
    - Return true if all conditions pass
    - Log filtering decisions at DEBUG level
    - _Requirements: 2.2, 2.3, 2.5, 2.6_
  
  - [ ]* 6.2 Write property test for echo prevention
    - **Property 4: Echo Prevention**
    - **Validates: Requirements 2.3**
    - Test that for any message where sender equals bot ID, message is filtered
    - _Requirements: 2.3_
  
  - [ ]* 6.3 Write unit tests for message filtering
    - Test valid text message passes filter
    - Test message with attachments is filtered
    - Test message without text is filtered
    - Test message from bot itself is filtered
    - _Requirements: 2.2, 2.3, 2.5, 2.6_

- [x] 7. Checkpoint - Ensure message parsing and filtering works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement AI service
  - [x] 8.1 Create /src/services/aiService.js
    - Implement generateResponse(messageText) async function
    - Use OpenAI API (or Anthropic Claude as alternative)
    - Configure system prompt: "You are a casual 25-year-old Indian friend. Respond in 1-2 sentences maximum. Match the language of the input (English/Hindi/Hinglish). Be friendly and natural, don't reveal you're a bot. Avoid controversial, financial, and medical topics."
    - Set temperature to 0.8-0.9 for natural variation
    - Set max_tokens to 50-100 to enforce brevity
    - Set timeout to 15 seconds
    - Return generated response text
    - Throw error on API failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 8.2 Write property test for AI response length constraint
    - **Property 5: AI Response Length Constraint**
    - **Validates: Requirements 3.1**
    - Test that for any generated response, text contains at most 2 sentences
    - Count sentences by periods, question marks, exclamation marks
    - _Requirements: 3.1_
  
  - [ ]* 8.3 Write property test for language matching
    - **Property 6: Language Matching**
    - **Validates: Requirements 3.4, 5.1, 5.2, 5.3**
    - Test that for any input in English/Hindi/Hinglish, response is in same language
    - Use language detection library to verify
    - _Requirements: 3.4, 5.1, 5.2, 5.3_
  
  - [ ]* 8.4 Write unit tests for AI service
    - Test successful response generation
    - Test API timeout error handling
    - Test API rate limiting error handling
    - Test specific examples in English, Hindi, and Hinglish
    - _Requirements: 3.1, 3.4, 5.1, 5.2, 5.3_

- [ ] 9. Implement Instagram service
  - [x] 9.1 Create /src/services/instagramService.js
    - Implement sendMessage(recipientId, messageText) async function
    - Use Instagram Graph API endpoint: POST https://graph.instagram.com/v18.0/me/messages
    - Set Authorization header with Bearer token from INSTAGRAM_ACCESS_TOKEN
    - Send request body: { recipient: { id: recipientId }, message: { text: messageText } }
    - Set timeout to 5 seconds
    - Implement single retry on network errors (not 4xx errors)
    - Return { success: true, messageId } on success
    - Return { success: false, error } on failure
    - Log all API calls and responses
    - _Requirements: 4.1, 4.3, 4.4_
  
  - [ ]* 9.2 Write property test for API integration correctness
    - **Property 7: API Integration Correctness**
    - **Validates: Requirements 4.1**
    - Test that for any recipient ID and message text, service calls API with correct structure
    - Mock Instagram API to verify request format
    - _Requirements: 4.1_
  
  - [ ]* 9.3 Write unit tests for Instagram service
    - Test successful message send
    - Test network error triggers retry
    - Test 4xx error does not trigger retry
    - Test 401 authentication error handling
    - Test 429 rate limiting error handling
    - Test 500 server error handling
    - _Requirements: 4.1, 4.3_

- [x] 10. Checkpoint - Ensure AI and Instagram services work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Wire components together in webhook POST handler
  - [x] 11.1 Implement complete message processing pipeline in webhook.js
    - In POST /webhook handler, after sending 200 OK, use setImmediate() to process
    - Parse webhook payload using parseWebhookEvent()
    - Check if should reply using shouldReplyToMessage()
    - If should reply, call generateResponse() from AI service
    - If response generated, call sendMessage() from Instagram service
    - Wrap entire pipeline in try-catch for error handling
    - Log each step (received, parsed, filtered, generated, sent)
    - Log errors with full context (messageId, senderId, error details)
    - Continue processing even if errors occur
    - _Requirements: 1.3, 2.6, 4.1, 4.2, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 11.2 Write property test for error handling and resilience
    - **Property 8: Error Handling and Resilience**
    - **Validates: Requirements 4.3, 10.1, 10.2, 10.3, 10.5**
    - Test that for any error (Instagram API, AI service, parsing), bot logs and continues
    - Simulate various error conditions and verify bot doesn't crash
    - _Requirements: 4.3, 10.1, 10.2, 10.3, 10.5_
  
  - [ ]* 11.3 Write integration tests for complete pipeline
    - Test end-to-end flow with valid message
    - Test pipeline with parsing error
    - Test pipeline with AI service error
    - Test pipeline with Instagram API error
    - Test pipeline continues after individual message failure
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [ ] 12. Implement comprehensive error handling and logging
  - [x] 12.1 Add structured logging throughout application
    - Use JSON format for logs
    - Include timestamp, level, message, context (messageId, senderId)
    - Add log levels: ERROR, INFO, DEBUG
    - Log successful message processing at INFO level
    - Log filtering decisions at DEBUG level
    - Log all errors at ERROR level with stack traces
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 12.2 Add process-level error handlers
    - Handle uncaughtException events
    - Handle unhandledRejection events
    - Log errors and continue running (don't crash)
    - Implement graceful shutdown on SIGTERM/SIGINT
    - _Requirements: 10.5_
  
  - [ ]* 12.3 Write unit tests for error logging
    - Test error logs include required context fields
    - Test error logs include stack traces
    - Test successful processing logs at INFO level
    - _Requirements: 10.4_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Run complete test suite
  - Verify all property tests pass with 100+ iterations
  - Verify all unit tests pass
  - Ensure test coverage is comprehensive
  - Ask the user if questions arise before considering implementation complete

- [ ] 14. Create deployment documentation
  - [x] 14.1 Create README.md with setup instructions
    - Document required environment variables
    - Document Instagram webhook setup process
    - Document how to get Instagram access token
    - Document how to deploy on Render
    - Document how to deploy on Railway
    - Include testing instructions
    - _Requirements: 7.3, 7.4_
  
  - [x] 14.2 Create .env.example file
    - List all required environment variables with placeholder values
    - Add comments explaining each variable
    - _Requirements: 6.1, 6.2, 6.3, 9.6_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation follows a bottom-up approach: infrastructure → parsing → services → integration
- All async operations use proper error handling to prevent crashes
- Logging is comprehensive to aid debugging in production
