# Instagram DM Auto-Reply Bot

A Node.js backend service that automatically responds to Instagram Direct Messages using AI. The bot receives Instagram message events via webhook, generates casual conversational responses, and replies through the official Instagram Graph API.

## Features

- 🤖 AI-powered responses using OpenAI or Anthropic
- 🌐 Multi-language support (English, Hindi, Hinglish)
- 📱 Official Instagram Graph API integration
- 🔒 Secure webhook verification
- 🚀 Free-tier deployment ready (Render, Railway)
- ⚡ Async processing for fast webhook responses

## Prerequisites

- Node.js 18.0.0 or higher
- Instagram Business or Creator account
- Meta Developer account
- OpenAI or Anthropic API key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Instagram API Configuration
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token

# Webhook Verification Token (create a random secret string)
VERIFY_TOKEN=your_secure_webhook_token

# AI Service API Key (OpenAI or Anthropic)
AI_API_KEY=your_ai_api_key

# Bot Instagram User ID (your Instagram account's user ID)
BOT_INSTAGRAM_ID=your_instagram_user_id

# Server Configuration (optional, defaults to 3000)
PORT=3000
```

## Getting Instagram Access Token

### Step 1: Create a Meta App

1. Go to [Meta Developer Portal](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as app type
4. Fill in app details and create the app

### Step 2: Configure Instagram Basic Display

1. In your app dashboard, add "Instagram" product
2. Go to Instagram → Basic Display
3. Create a new Instagram App
4. Add your Instagram account as a test user

### Step 3: Generate Access Token

1. In Instagram Basic Display settings, click "Generate Token"
2. Authorize the app to access your Instagram account
3. Copy the generated access token
4. **Important**: Exchange the short-lived token for a long-lived token (60 days):

```bash
curl -X GET "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
```

5. Use the long-lived token in your `.env` file

### Step 4: Get Your Instagram User ID

```bash
curl -X GET "https://graph.instagram.com/me?fields=id,username&access_token=YOUR_ACCESS_TOKEN"
```

Copy the `id` value to `BOT_INSTAGRAM_ID` in your `.env` file.

## Instagram Webhook Setup

### Step 1: Deploy Your Bot

Deploy your bot first (see deployment sections below) to get a public URL.

### Step 2: Configure Webhook in Meta App

1. Go to your Meta App dashboard
2. Navigate to Instagram → Configuration
3. In the "Webhooks" section, click "Add Callback URL"
4. Enter your webhook URL: `https://your-domain.com/webhook`
5. Enter your `VERIFY_TOKEN` (same as in `.env`)
6. Click "Verify and Save"

### Step 3: Subscribe to Message Events

1. In the Webhooks section, find "messages" field
2. Click "Subscribe" to enable message notifications
3. Your bot will now receive Instagram DM events

### Testing Webhook Locally

For local development, use a tunneling service like ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start your bot locally
npm start

# In another terminal, create a tunnel
ngrok http 3000

# Use the ngrok URL (e.g., https://abc123.ngrok.io/webhook) in Meta App settings
```

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd instagram-dm-auto-reply

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Start the server
npm start
```

## Deployment

### Deploy on Render

1. **Create a Render Account**
   - Go to [render.com](https://render.com) and sign up

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: instagram-dm-bot
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free

3. **Add Environment Variables**
   - In the service settings, go to "Environment"
   - Add all variables from your `.env` file:
     - `INSTAGRAM_ACCESS_TOKEN`
     - `VERIFY_TOKEN`
     - `AI_API_KEY`
     - `BOT_INSTAGRAM_ID`
     - `PORT` (Render provides this automatically)

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Copy your service URL (e.g., `https://your-app.onrender.com`)

5. **Configure Instagram Webhook**
   - Use your Render URL + `/webhook` in Meta App settings
   - Example: `https://your-app.onrender.com/webhook`

**Note**: Render free tier may spin down after inactivity. The first request after spin-down may take 30-60 seconds.

### Deploy on Railway

1. **Create a Railway Account**
   - Go to [railway.app](https://railway.app) and sign up

2. **Create a New Project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Environment Variables**
   - In the project dashboard, go to "Variables"
   - Add all variables from your `.env` file:
     - `INSTAGRAM_ACCESS_TOKEN`
     - `VERIFY_TOKEN`
     - `AI_API_KEY`
     - `BOT_INSTAGRAM_ID`
   - Railway automatically provides `PORT`

4. **Deploy**
   - Railway automatically deploys on push
   - Go to "Settings" → "Networking" → "Generate Domain"
   - Copy your service URL (e.g., `https://your-app.up.railway.app`)

5. **Configure Instagram Webhook**
   - Use your Railway URL + `/webhook` in Meta App settings
   - Example: `https://your-app.up.railway.app/webhook`

**Note**: Railway free tier includes 500 hours/month and $5 credit. Monitor usage to stay within limits.

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Webhook Locally

1. Start the server:
```bash
npm start
```

2. Test webhook verification (GET request):
```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test_challenge"
```

Expected response: `test_challenge`

3. Test message event (POST request):
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d @test-webhook.json
```

Create `test-webhook.json` with sample Instagram webhook payload:
```json
{
  "object": "instagram",
  "entry": [{
    "id": "PAGE_ID",
    "time": 1234567890,
    "messaging": [{
      "sender": { "id": "SENDER_ID" },
      "recipient": { "id": "YOUR_BOT_ID" },
      "timestamp": 1234567890,
      "message": {
        "mid": "MESSAGE_ID",
        "text": "Hello!"
      }
    }]
  }]
}
```

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response: `{"status":"ok"}`

## Project Structure

```
instagram-dm-auto-reply/
├── src/
│   ├── routes/
│   │   └── webhook.js          # Webhook endpoint handlers
│   ├── services/
│   │   ├── aiService.js        # AI response generation
│   │   └── instagramService.js # Instagram API integration
│   └── utils/
│       └── messageParser.js    # Message parsing logic
├── server.js                   # Main server entry point
├── .env                        # Environment variables (not in git)
├── .env.example                # Environment variables template
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## How It Works

1. **Webhook Receives Message**: Instagram sends a POST request to `/webhook` with message event
2. **Immediate Response**: Bot returns 200 OK within 1 second (Instagram requirement)
3. **Async Processing**: Message is processed asynchronously:
   - Parse message data from webhook payload
   - Filter out attachments, bot's own messages, and invalid messages
   - Generate AI response matching the input language
   - Send reply via Instagram Graph API
4. **Error Handling**: All errors are logged; bot continues processing subsequent messages

## Troubleshooting

### Bot Not Responding

- Check that webhook is properly configured in Meta App
- Verify `INSTAGRAM_ACCESS_TOKEN` is valid and not expired
- Check server logs for errors
- Ensure bot is subscribed to "messages" webhook field

### Webhook Verification Failed

- Verify `VERIFY_TOKEN` matches in both `.env` and Meta App settings
- Check that webhook URL is publicly accessible
- Ensure URL uses HTTPS (required by Instagram)

### AI Service Errors

- Verify `AI_API_KEY` is valid
- Check API rate limits and quotas
- Review AI service logs for specific errors

### Deployment Issues

- Ensure all environment variables are set correctly
- Check that Node.js version is 18.0.0 or higher
- Review deployment logs for startup errors
- Verify `PORT` environment variable is set (or defaults to 3000)

## Security Best Practices

- Never commit `.env` file to version control
- Use strong, random values for `VERIFY_TOKEN`
- Rotate access tokens regularly (every 60 days for long-lived tokens)
- Monitor API usage and set up alerts for unusual activity
- Keep dependencies updated: `npm audit` and `npm update`

## Limitations

- Bot only responds to text messages (ignores media, reels, posts)
- Responses are limited to 1-2 sentences for casual conversation
- Bot operates within Instagram's 24-hour messaging window
- Free-tier hosting may have cold start delays
- AI responses may occasionally be off-topic or inappropriate

## License

MIT

## Support

For issues and questions:
- Check the troubleshooting section above
- Review Instagram Graph API documentation: https://developers.facebook.com/docs/instagram-api
- Check Meta Developer Community: https://developers.facebook.com/community/
