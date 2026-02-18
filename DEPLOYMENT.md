# Deployment Guide - Render

## Prerequisites
- GitHub account
- Render account (sign up at https://render.com)
- Instagram Professional/Business account
- Meta Developer account with app created
- Groq API key

## Step 1: Push Code to GitHub

1. Initialize git repository (if not already done):
```bash
git init
git add .
git commit -m "Initial commit - Instagram DM Auto-Reply Bot"
```

2. Create a new repository on GitHub

3. Push your code:
```bash
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Render

1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `instagram-dm-bot` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

## Step 3: Add Environment Variables

In Render dashboard, go to "Environment" tab and add:

```
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
VERIFY_TOKEN=your_secure_random_token
AI_API_KEY=your_groq_api_key
BOT_INSTAGRAM_ID=your_instagram_user_id
```

**Important**: 
- Don't use the placeholder values from .env.example
- Use your actual credentials
- PORT is automatically set by Render

## Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment (usually 2-3 minutes)
3. Copy your service URL (e.g., `https://instagram-dm-bot.onrender.com`)

## Step 5: Configure Instagram Webhook

1. Go to Meta Developer Portal: https://developers.facebook.com/apps
2. Select your app
3. Navigate to **Instagram → Configuration → Webhooks**
4. Click "Add Callback URL"
5. Enter:
   - **Callback URL**: `https://YOUR_RENDER_URL/webhook`
   - **Verify Token**: `my_secure_webhook_token_123` (same as in Render env vars)
6. Click "Verify and Save"
7. Subscribe to **messages** field

## Step 6: Test

1. Send a DM to your Instagram account from another account
2. The bot should reply automatically!
3. Check Render logs for debugging:
   - Go to your service dashboard
   - Click "Logs" tab
   - Watch real-time logs

## Troubleshooting

### Webhook Verification Failed
- Ensure VERIFY_TOKEN in Render matches the one in Meta App
- Check that webhook URL is correct: `https://YOUR_URL/webhook`
- Verify service is running (check Render dashboard)

### Bot Not Responding
- Check Render logs for errors
- Verify all environment variables are set correctly
- Ensure Instagram access token is valid (not expired)
- Check that you're subscribed to "messages" webhook field

### Service Sleeping (Free Tier)
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Consider upgrading to paid tier for always-on service

## Getting Instagram Access Token

1. Go to Meta Developer Portal
2. Select your app → Instagram → Basic Display
3. Generate a User Token
4. Exchange for long-lived token (60 days):
```bash
curl -X GET "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
```

## Getting Bot Instagram User ID

```bash
curl -X GET "https://graph.instagram.com/me?fields=id,username&access_token=YOUR_ACCESS_TOKEN"
```

## Monitoring

- **Render Dashboard**: Monitor service health, logs, and metrics
- **Meta Developer Portal**: Check webhook delivery status
- **Logs**: All events are logged in JSON format for easy parsing

## Notes

- Free tier includes 750 hours/month
- Service URL changes if you delete and recreate
- Update Instagram webhook URL if service URL changes
- Access tokens expire after 60 days - set a reminder to refresh
