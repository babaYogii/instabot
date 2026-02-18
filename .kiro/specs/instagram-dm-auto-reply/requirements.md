# Requirements Document

## Introduction

This document specifies the requirements for an Instagram DM Auto-Reply Bot - a backend system that automatically responds to Instagram Direct Messages using AI. The system is designed as a personal test project for casual conversations with friends, using the official Meta/Instagram Graph API and hosted on free-tier infrastructure.

## Glossary

- **Bot**: The Instagram DM Auto-Reply system
- **Instagram_API**: The official Meta/Instagram Graph API
- **Webhook**: HTTP endpoint that receives Instagram message events
- **AI_Service**: The service that generates conversational responses
- **Message_Event**: An incoming Instagram direct message notification
- **Sender**: The Instagram user who sends a message to the bot
- **Text_Message**: A direct message containing text content
- **24_Hour_Window**: Instagram's 24-hour period after a user message during which the bot can reply
- **Verify_Token**: Secret token used to validate webhook registration
- **Message_Parser**: Component that extracts and validates message data
- **Instagram_Service**: Component that sends replies via Instagram API
- **Hinglish**: Mixed Hindi-English conversational language

## Requirements

### Requirement 1: Webhook Endpoint

**User Story:** As a system, I want to receive Instagram message events via webhook, so that I can process incoming messages in real-time.

#### Acceptance Criteria

1. WHEN Instagram sends a GET request for webhook verification, THE Webhook SHALL validate the hub.verify_token and return the hub.challenge
2. WHEN Instagram sends a POST request with message events, THE Webhook SHALL return 200 OK within 1 second
3. WHEN a POST request is received, THE Webhook SHALL process the message asynchronously after sending the response
4. THE Webhook SHALL expose a GET endpoint at /webhook for verification
5. THE Webhook SHALL expose a POST endpoint at /webhook for message events

### Requirement 2: Message Filtering

**User Story:** As a bot, I want to filter incoming messages, so that I only respond to appropriate text messages.

#### Acceptance Criteria

1. WHEN a Message_Event contains a text field, THE Message_Parser SHALL extract the text content
2. WHEN a Message_Event contains attachments (reels, posts, media), THE Bot SHALL ignore the message
3. WHEN a Message_Event sender is the bot itself, THE Bot SHALL ignore the message to prevent echo loops
4. WHEN a Message_Event is outside the 24_Hour_Window, THE Bot SHALL ignore the message
5. WHEN a Message_Event has no text field, THE Bot SHALL ignore the message
6. WHEN a Message_Event meets all reply conditions, THE Bot SHALL extract the sender ID and message text

### Requirement 3: AI Response Generation

**User Story:** As a bot, I want to generate casual conversational responses, so that I sound like a 25-year-old Indian friend.

#### Acceptance Criteria

1. WHEN generating a response, THE AI_Service SHALL produce text that is 1-2 sentences maximum
2. WHEN generating a response, THE AI_Service SHALL use casual, friendly tone without formal language
3. WHEN generating a response, THE AI_Service SHALL avoid revealing that it is a bot
4. WHEN a message is in Hindi, English, or Hinglish, THE AI_Service SHALL detect the language and respond appropriately
5. WHEN a message involves controversial, financial, or medical topics, THE AI_Service SHALL deflect or change the subject
6. THE AI_Service SHALL generate responses that sound like natural conversation between friends

### Requirement 4: Message Reply

**User Story:** As a bot, I want to send replies via Instagram API, so that users receive my responses.

#### Acceptance Criteria

1. WHEN a response is generated, THE Instagram_Service SHALL send it to the sender via Instagram_API
2. WHEN sending a reply, THE Instagram_Service SHALL complete the operation within 20 seconds of receiving the original message
3. WHEN the Instagram_API returns an error, THE Instagram_Service SHALL log the error and continue operation
4. THE Instagram_Service SHALL use only the official Meta/Instagram Graph API for sending messages
5. THE Instagram_Service SHALL not initiate outbound messages outside of replies to incoming messages

### Requirement 5: Language Support

**User Story:** As a user, I want the bot to understand multiple languages, so that I can chat in my preferred language.

#### Acceptance Criteria

1. WHEN a message is in English, THE AI_Service SHALL respond in English
2. WHEN a message is in Hindi, THE AI_Service SHALL respond in Hindi
3. WHEN a message is in Hinglish, THE AI_Service SHALL respond in Hinglish
4. THE AI_Service SHALL automatically detect the language without explicit configuration
5. THE AI_Service SHALL maintain consistent language within a conversation

### Requirement 6: System Configuration

**User Story:** As a developer, I want to configure the system via environment variables, so that I can manage secrets and API keys securely.

#### Acceptance Criteria

1. THE Bot SHALL read the Instagram API access token from environment variables
2. THE Bot SHALL read the webhook verify token from environment variables
3. THE Bot SHALL read the AI service API key from environment variables
4. WHEN an environment variable is missing, THE Bot SHALL fail to start and log a clear error message
5. THE Bot SHALL not hardcode any secrets or API keys in the source code

### Requirement 7: Deployment and Hosting

**User Story:** As a developer, I want to deploy the bot on free-tier infrastructure, so that I can run it without cost.

#### Acceptance Criteria

1. THE Bot SHALL run on Node.js runtime
2. THE Bot SHALL use Express framework for HTTP server
3. THE Bot SHALL be deployable on Render free tier
4. THE Bot SHALL be deployable on Railway free tier
5. WHEN deployed, THE Bot SHALL start successfully and listen on the configured port

### Requirement 8: Safety and Compliance

**User Story:** As a system owner, I want the bot to follow Instagram platform policies, so that my account remains in good standing.

#### Acceptance Criteria

1. THE Bot SHALL only respond to incoming messages within the 24_Hour_Window
2. THE Bot SHALL not perform any web scraping or unauthorized data collection
3. THE Bot SHALL not analyze or process media attachments
4. THE Bot SHALL not initiate conversations with users who haven't messaged first
5. THE Bot SHALL use only official Instagram_API endpoints

### Requirement 9: Project Structure

**User Story:** As a developer, I want a clear project structure, so that the code is maintainable and organized.

#### Acceptance Criteria

1. THE Bot SHALL organize webhook handling code in /src/routes/webhook.js
2. THE Bot SHALL organize AI response logic in /src/services/aiService.js
3. THE Bot SHALL organize Instagram API integration in /src/services/instagramService.js
4. THE Bot SHALL organize message parsing logic in /src/utils/messageParser.js
5. THE Bot SHALL define the main server entry point in server.js
6. THE Bot SHALL store environment variables in .env file

### Requirement 10: Error Handling

**User Story:** As a system, I want to handle errors gracefully, so that temporary failures don't crash the bot.

#### Acceptance Criteria

1. WHEN the Instagram_API is unavailable, THE Bot SHALL log the error and continue running
2. WHEN the AI_Service fails to generate a response, THE Bot SHALL log the error and skip that message
3. WHEN message parsing fails, THE Bot SHALL log the error and return 200 OK to Instagram
4. WHEN an unexpected error occurs, THE Bot SHALL log the error with sufficient detail for debugging
5. THE Bot SHALL not crash or stop processing messages due to individual message failures
