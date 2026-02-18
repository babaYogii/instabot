# Design Document: Instagram DM Auto-Reply Bot

## Overview

The Instagram DM Auto-Reply Bot is a Node.js/Express backend service that receives Instagram Direct Message events via webhook, filters appropriate messages, generates AI-powered casual responses, and sends replies through the official Instagram Graph API. The system is designed for personal use, emphasizing simplicity, free-tier hosting compatibility, and natural conversational tone.

The architecture follows a service-oriented pattern with clear separation between webhook handling, message processing, AI response generation, and Instagram API integration. All operations are asynchronous to ensure webhook responses meet Instagram's strict timing requirements.

## Architecture

### High-Level Architecture

```
Instagram Platform
       ↓
   Webhook (Express)
       ↓
Message Parser → Filter Logic
       ↓
   AI Service (OpenAI/Anthropic)
       ↓
Instagram Service → Graph API
```

### Component Interaction Flow

1. Instagram sends POST request to `/webhook` with message event
2. Webhook immediately returns 200 OK (< 1 second)
3. Message Parser extracts and validates message data
4. Filter logic determines if message should receive a reply
5. AI Service generates contextually appropriate response
6. Instagram Service sends reply via Graph API
7. Errors are logged but don't block the pipeline

### Deployment Architecture

- **Platform**: Render or Railway free tier
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Process Model**: Single process with async/await patterns
- **Environment**: Environment variables for all secrets

## Components and Interfaces

### 1. Webhook Route (`/src/routes/webhook.js`)

**Responsibilities**:
- Handle GET requests for webhook verification
- Handle POST requests for message events
- Return responses within Instagram's timing requirements
- Trigger asynchronous message processing

**Interface**:
```javascript
// GET /webhook
// Query params: hub.mode, hub.verify_token, hub.challenge
// Returns: hub.challenge (200) or 403

// POST /webhook
// Body: Instagram webhook event payload
// Returns: 200 OK immediately
```

**Implementation Details**:
- Verify token comparison must be constant-time to prevent timing attacks
- POST handler uses `setImmediate()` or `process.nextTick()` to defer processing
- No await/blocking operations before sending 200 OK

### 2. Message Parser (`/src/utils/messageParser.js`)

**Responsibilities**:
- Extract message data from webhook payload
- Validate message structure
- Identify message type (text, media, etc.)

**Interface**:
```javascript
function parseWebhookEvent(payload) {
  // Returns: {
  //   senderId: string,
  //   messageText: string | null,
  //   hasAttachments: boolean,
  //   timestamp: number,
  //   messageId: string
  // } | null
}
```

**Implementation Details**:
- Navigate Instagram's nested JSON structure: `entry[0].messaging[0]`
- Check for `message.text` field presence
- Check for `message.attachments` array
- Return null for invalid/unparseable messages
- Handle missing fields gracefully

### 3. Message Filter Logic

**Responsibilities**:
- Determine if a message should receive a reply
- Prevent echo loops
- Enforce 24-hour window (handled by Instagram API)

**Filter Conditions** (all must be true):
- Message has text content (`messageText !== null`)
- Message has no attachments (`hasAttachments === false`)
- Sender is not the bot itself (compare senderId with bot's Instagram ID)

**Implementation Details**:
- Bot's Instagram ID stored in environment variable
- Short-circuit evaluation for performance
- Log filtered messages for debugging

### 4. AI Service (`/src/services/aiService.js`)

**Responsibilities**:
- Generate conversational responses
- Detect and match input language
- Maintain casual, friendly tone
- Avoid sensitive topics

**Interface**:
```javascript
async function generateResponse(messageText) {
  // Returns: string (AI-generated response)
  // Throws: Error on API failure
}
```

**Implementation Details**:
- Use OpenAI GPT-4 or Anthropic Claude API
- System prompt defines personality:
  - "You are a casual 25-year-old Indian friend"
  - "Respond in 1-2 sentences maximum"
  - "Match the language of the input (English/Hindi/Hinglish)"
  - "Be friendly and natural, don't reveal you're a bot"
  - "Avoid controversial, financial, and medical topics"
- Temperature: 0.8-0.9 for natural variation
- Max tokens: 50-100 to enforce brevity
- Timeout: 15 seconds to stay within 20-second total budget

### 5. Instagram Service (`/src/services/instagramService.js`)

**Responsibilities**:
- Send messages via Instagram Graph API
- Handle API errors
- Manage access tokens

**Interface**:
```javascript
async function sendMessage(recipientId, messageText) {
  // Returns: { success: boolean, messageId?: string, error?: string }
}
```

**Implementation Details**:
- Endpoint: `POST https://graph.instagram.com/v18.0/me/messages`
- Request body:
  ```json
  {
    "recipient": { "id": "<RECIPIENT_ID>" },
    "message": { "text": "<MESSAGE_TEXT>" }
  }
  ```
- Headers: `Authorization: Bearer <ACCESS_TOKEN>`
- Retry logic: Single retry on network errors (not 4xx errors)
- Timeout: 5 seconds per request

### 6. Server Entry Point (`server.js`)

**Responsibilities**:
- Initialize Express app
- Load environment variables
- Register routes
- Start HTTP server
- Validate required configuration

**Implementation Details**:
- Use `dotenv` for environment variable loading
- Validate presence of: `INSTAGRAM_ACCESS_TOKEN`, `VERIFY_TOKEN`, `AI_API_KEY`, `BOT_INSTAGRAM_ID`
- Port: `process.env.PORT || 3000`
- Graceful shutdown handling
- Health check endpoint: `GET /health`

## Data Models

### Webhook Event Payload (Instagram)

```javascript
{
  object: "instagram",
  entry: [{
    id: "<PAGE_ID>",
    time: 1234567890,
    messaging: [{
      sender: { id: "<SENDER_INSTAGRAM_ID>" },
      recipient: { id: "<BOT_INSTAGRAM_ID>" },
      timestamp: 1234567890,
      message: {
        mid: "<MESSAGE_ID>",
        text: "Hello!",  // Optional
        attachments: []  // Optional
      }
    }]
  }]
}
```

### Parsed Message

```javascript
{
  senderId: string,           // Instagram user ID
  messageText: string | null, // Extracted text or null
  hasAttachments: boolean,    // True if media present
  timestamp: number,          // Unix timestamp
  messageId: string          // Instagram message ID
}
```

### Environment Variables

```
INSTAGRAM_ACCESS_TOKEN=<long-lived-token>
VERIFY_TOKEN=<random-secret-string>
AI_API_KEY=<openai-or-anthropic-key>
BOT_INSTAGRAM_ID=<bot-instagram-user-id>
PORT=3000
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Webhook Token Validation

*For any* webhook verification request with a verify token, the webhook should return the challenge value if and only if the provided token matches the configured VERIFY_TOKEN.

**Validates: Requirements 1.1**

### Property 2: Message Text Extraction

*For any* valid Instagram webhook payload containing a text message, the message parser should extract the exact text content from the nested message structure.

**Validates: Requirements 2.1**

### Property 3: Message Filtering Rules

*For any* Instagram message event, the bot should ignore the message if it contains attachments OR lacks a text field, and should only process messages that have text content without attachments.

**Validates: Requirements 2.2, 2.5**

### Property 4: Echo Prevention

*For any* Instagram message event where the sender ID equals the bot's Instagram ID, the bot should ignore the message to prevent infinite reply loops.

**Validates: Requirements 2.3**

### Property 5: AI Response Length Constraint

*For any* AI-generated response, the text should contain at most 2 sentences (counting periods, question marks, and exclamation marks as sentence terminators).

**Validates: Requirements 3.1**

### Property 6: Language Matching

*For any* input message in a detectable language (English, Hindi, or Hinglish), the AI-generated response should be in the same language as the input message.

**Validates: Requirements 3.4, 5.1, 5.2, 5.3**

### Property 7: API Integration Correctness

*For any* generated response and recipient ID, the Instagram service should call the Instagram Graph API with the correct endpoint, authorization header, and request body structure.

**Validates: Requirements 4.1**

### Property 8: Error Handling and Resilience

*For any* error occurring during message processing (Instagram API failure, AI service failure, or parsing failure), the bot should log the error and continue processing subsequent messages without crashing.

**Validates: Requirements 4.3, 10.1, 10.2, 10.3, 10.5**

### Property 9: Configuration Validation

*For any* required environment variable (INSTAGRAM_ACCESS_TOKEN, VERIFY_TOKEN, AI_API_KEY, BOT_INSTAGRAM_ID), if the variable is missing at startup, the bot should fail to start and log a clear error message indicating which variable is missing.

**Validates: Requirements 6.4**

## Error Handling

### Error Categories

1. **Instagram API Errors**
   - Network failures (timeout, connection refused)
   - Rate limiting (429 status)
   - Authentication errors (401, 403)
   - Invalid requests (400, 404)

2. **AI Service Errors**
   - API timeout
   - Rate limiting
   - Invalid API key
   - Service unavailable

3. **Parsing Errors**
   - Malformed JSON payload
   - Missing required fields
   - Unexpected payload structure

4. **Configuration Errors**
   - Missing environment variables
   - Invalid token format
   - Missing required files

### Error Handling Strategy

**Webhook Level**:
- Always return 200 OK to Instagram (prevents retry storms)
- Log all errors with full context (message ID, sender ID, error details)
- Use try-catch blocks around all async operations

**Service Level**:
- Instagram Service: Log error, return `{ success: false, error: message }`
- AI Service: Log error, throw exception to be caught by caller
- Message Parser: Return null for unparseable messages

**Application Level**:
- Uncaught exceptions: Log and continue (don't crash)
- Process-level error handlers for unhandled rejections
- Graceful degradation: Skip failed messages, process next ones

**Logging Requirements**:
- Include timestamp, message ID, sender ID
- Include full error stack traces
- Use structured logging (JSON format)
- Log levels: ERROR for failures, INFO for successful processing, DEBUG for filtering decisions

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property-based tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

**Library**: Use `fast-check` for JavaScript/Node.js property-based testing

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each test must reference its design document property
- Tag format: `// Feature: instagram-dm-auto-reply, Property {number}: {property_text}`

**Property Test Implementation**:
- Each correctness property must be implemented by a SINGLE property-based test
- Tests should generate random valid inputs within the domain
- Tests should verify the property holds for all generated inputs

### Unit Testing Focus

Unit tests should focus on:
- Specific examples that demonstrate correct behavior
- Edge cases (empty strings, null values, boundary conditions)
- Error conditions (API failures, malformed data)
- Integration points between components

Avoid writing too many unit tests for scenarios that property tests already cover comprehensively.

### Test Coverage by Component

**Webhook Route**:
- Unit: Verify GET endpoint returns challenge for valid token
- Unit: Verify GET endpoint returns 403 for invalid token
- Unit: Verify POST endpoint returns 200 OK immediately
- Property: Token validation works for all token combinations

**Message Parser**:
- Property: Text extraction works for all valid payloads with text
- Property: Parser returns null for all payloads with attachments
- Property: Parser returns null for all payloads without text
- Unit: Parser handles malformed JSON gracefully
- Unit: Parser handles missing nested fields

**Message Filter**:
- Property: All messages from bot ID are filtered
- Property: All messages with attachments are filtered
- Unit: Valid text messages pass through filter

**AI Service**:
- Property: All responses are 1-2 sentences maximum
- Property: Response language matches input language
- Unit: Service handles API timeout errors
- Unit: Service handles rate limiting
- Unit: Specific examples in English, Hindi, Hinglish

**Instagram Service**:
- Property: API calls use correct structure for all inputs
- Property: All API errors are logged and handled gracefully
- Unit: Service retries on network errors
- Unit: Service doesn't retry on 4xx errors
- Unit: Specific error scenarios (401, 429, 500)

**Server Initialization**:
- Property: Startup fails for any missing required environment variable
- Unit: Server starts successfully with all variables present
- Unit: Health check endpoint responds correctly

**Error Handling**:
- Property: Bot continues processing after any individual message failure
- Unit: Specific error scenarios for each component
- Unit: Logging includes required context fields

### Integration Testing

While not part of the automated test suite, manual integration testing should verify:
- End-to-end flow with real Instagram webhook events
- AI service integration with actual API
- Deployment on target platforms (Render/Railway)

### Test Execution

- Run tests before every commit
- Run tests in CI/CD pipeline
- Property tests should complete in reasonable time (< 30 seconds per property)
- All tests must pass before deployment
