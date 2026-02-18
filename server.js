require('dotenv').config();
const express = require('express');
const logger = require('./src/utils/logger');

// Validate required environment variables
const requiredEnvVars = [
  'INSTAGRAM_ACCESS_TOKEN',
  'VERIFY_TOKEN',
  'AI_API_KEY',
  'BOT_INSTAGRAM_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('Missing required environment variables', null, {
    missingVariables: missingVars
  });
  missingVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('\nPlease set these variables in your .env file or environment.');
  process.exit(1);
}

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook routes
const webhook = require('./src/routes/webhook');
app.get('/webhook', webhook.handleVerification);
app.post('/webhook', webhook.handleWebhook);

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info('Instagram DM Auto-Reply Bot started', {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Process-level error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception occurred', error, {
    errorType: 'uncaughtException',
    errorName: error.name,
    errorMessage: error.message
  });
  // Continue running - don't crash
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    errorType: 'unhandledRejection',
    promise: promise
  });
  // Continue running - don't crash
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, starting graceful shutdown`, {
    signal: signal
  });
  
  server.close(() => {
    logger.info('HTTP server closed', {
      signal: signal
    });
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout', null, {
      signal: signal,
      timeout: 10000
    });
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
