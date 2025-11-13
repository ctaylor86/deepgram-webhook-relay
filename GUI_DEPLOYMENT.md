# Deploy Cloudflare Worker via GUI (No Command Line)

This guide shows you how to deploy the Deepgram webhook relay using only the Cloudflare Dashboard (no CLI required).

## Prerequisites

- Cloudflare account (sign up at https://dash.cloudflare.com/sign-up)
- The `worker.js` file from this repository

## Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Enter your email and create a password
3. Verify your email
4. Log in to the Cloudflare Dashboard

**✅ You're now logged in to Cloudflare!**

## Step 2: Create KV Namespace

KV (Key-Value) storage is where we'll store the transcripts.

### 2.1: Navigate to Workers & Pages

1. In the left sidebar, click **Workers & Pages**
2. Click the **KV** tab at the top

### 2.2: Create Namespace

1. Click **Create a namespace** button
2. **Namespace Name**: Enter `TRANSCRIPTS`
3. Click **Add**

**✅ KV Namespace created!**

**Important**: Copy the **Namespace ID** - you'll need it in Step 4.

It looks like: `abc123def456ghi789...`

## Step 3: Create Worker

### 3.1: Go to Workers

1. Click the **Overview** tab (next to KV)
2. Click **Create Worker** button

### 3.2: Name Your Worker

1. **Worker Name**: Enter `deepgram-webhook-relay` (or any name you prefer)
2. Click **Deploy**

**✅ Worker created!** (It has default code right now - we'll replace it)

## Step 4: Add Worker Code

### 4.1: Open Editor

After deploying, you'll see a success screen.

1. Click **Edit Code** button

This opens the Worker editor in your browser.

### 4.2: Replace Code

1. **Delete all the existing code** in the editor
2. **Copy the entire contents** of `worker.js` from this repository
3. **Paste it** into the editor

### 4.3: Save and Deploy

1. Click **Save and Deploy** button (top right)
2. Wait for "Successfully deployed" message

**✅ Worker code deployed!**

## Step 5: Bind KV Namespace to Worker

Now we need to connect the KV storage to the worker.

### 5.1: Go to Settings

1. Click **Settings** tab (top of page)
2. Scroll down to **Variables and Secrets** section
3. Click **KV Namespace Bindings**

### 5.2: Add Binding

1. Click **Add binding** button
2. **Variable name**: Enter `TRANSCRIPTS` (must be exactly this)
3. **KV namespace**: Select `TRANSCRIPTS` from dropdown
4. Click **Save**

**✅ KV Namespace bound to worker!**

## Step 6: Get Your Worker URL

### 6.1: Find URL

1. Go back to **Overview** tab
2. Look for **Preview** section
3. You'll see your worker URL:

```
https://deepgram-webhook-relay.YOUR-SUBDOMAIN.workers.dev
```

**✅ This is your webhook URL!**

### 6.2: Test It

Click the URL or open it in a new tab. You should see:

```
🎙️ Deepgram Webhook Relay

This service receives Deepgram transcription callbacks...
```

**✅ Worker is live and working!**

## Step 7: Test the Endpoints

### 7.1: Test Health Check

Open in browser:
```
https://your-worker.workers.dev/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "deepgram-webhook-relay",
  "timestamp": "2025-01-13T..."
}
```

### 7.2: Test Callback (Optional)

You can test with a tool like [Hoppscotch](https://hoppscotch.io/) or [Postman](https://www.postman.com/):

**Method**: POST  
**URL**: `https://your-worker.workers.dev/callback`  
**Headers**: `Content-Type: application/json`  
**Body**:
```json
{
  "metadata": {
    "request_id": "test123"
  },
  "results": {
    "channels": [{
      "alternatives": [{
        "transcript": "Hello world test"
      }]
    }]
  }
}
```

Should return:
```json
{
  "success": true,
  "request_id": "test123",
  "message": "Transcript stored successfully"
}
```

### 7.3: Test Retrieval

Open in browser:
```
https://your-worker.workers.dev/transcript/test123
```

Should return the stored transcript data.

**✅ All endpoints working!**

## Step 8: Configure MCP Server

Now use your worker URL in the MCP server configuration:

```json
{
  "deepgramApiKey": "your-deepgram-api-key",
  "webhookUrl": "https://your-worker.workers.dev/callback"
}
```

**Important**: Use the `/callback` endpoint!

## Your Worker URLs

Save these for reference:

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Callback | `https://your-worker.workers.dev/callback` | For Deepgram callbacks |
| Retrieve | `https://your-worker.workers.dev/transcript/{request_id}` | Get transcript |
| Health | `https://your-worker.workers.dev/health` | Check status |
| Docs | `https://your-worker.workers.dev/` | API documentation |

## Monitoring and Logs

### View Logs

1. Go to your worker in the dashboard
2. Click **Logs** tab
3. Click **Begin log stream**
4. You'll see real-time logs of all requests

### View Stored Data

1. Go to **Workers & Pages** → **KV**
2. Click on `TRANSCRIPTS` namespace
3. You'll see all stored transcripts
4. Click any key to view the data

## Troubleshooting

### "Worker not found" or 404 errors

**Solution**:
1. Check the worker URL is correct
2. Ensure worker is deployed (green checkmark)
3. Try redeploying: Edit Code → Save and Deploy

### "TRANSCRIPTS is not defined" error

**Solution**:
1. Go to Settings → KV Namespace Bindings
2. Verify binding exists with variable name `TRANSCRIPTS`
3. If not, add it (see Step 5)
4. Redeploy the worker

### Callback not storing data

**Solution**:
1. Check logs (see Monitoring section above)
2. Verify KV binding is correct
3. Test manually with Hoppscotch/Postman
4. Check request format matches expected structure

### "Exceeded free tier limits"

**Solution**:
Cloudflare free tier includes:
- 100,000 requests/day
- 1 GB KV storage
- 1,000 KV writes/day
- 100,000 KV reads/day

If you exceed these, consider:
1. Upgrading to Workers Paid plan ($5/month)
2. Reducing polling frequency
3. Cleaning up old transcripts

## Updating the Worker

If you need to update the code:

1. Go to your worker in the dashboard
2. Click **Edit Code**
3. Make your changes
4. Click **Save and Deploy**

Changes are live immediately!

## Custom Domain (Optional)

To use a custom domain like `deepgram-webhooks.yourdomain.com`:

### Prerequisites
- Your domain must be on Cloudflare (add it in the dashboard)

### Steps

1. Go to your worker
2. Click **Settings** tab
3. Scroll to **Domains & Routes**
4. Click **Add Custom Domain**
5. Enter your subdomain: `deepgram-webhooks.yourdomain.com`
6. Click **Add Custom Domain**

Cloudflare will automatically:
- Create DNS records
- Issue SSL certificate
- Route traffic to your worker

**✅ Custom domain active in ~1 minute!**

## Security (Production)

For production use, consider:

### 1. Add API Key Authentication

Edit your worker code to add:

```javascript
// At the top of the fetch handler
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== 'your-secret-key-here') {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. Use Environment Variables

1. Go to Settings → Variables and Secrets
2. Click **Add variable**
3. Type: **Secret** (encrypted)
4. Name: `WEBHOOK_API_KEY`
5. Value: Your secret key
6. Click **Save**

Then update code to use:
```javascript
if (apiKey !== env.WEBHOOK_API_KEY) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 3. Restrict CORS

Edit worker code to change:
```javascript
'Access-Control-Allow-Origin': 'https://yourdomain.com',
```

## Next Steps

1. ✅ Worker deployed and tested
2. ✅ Got your webhook URL
3. ✅ Configure MCP server with webhook URL
4. ✅ Test full workflow with a short video
5. ✅ Deploy to production!

## Support

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Cloudflare Community**: https://community.cloudflare.com/
- **This Project**: Check README.md and SETUP_GUIDE.md

## Quick Reference

**Your Worker URL**: `https://deepgram-webhook-relay.YOUR-SUBDOMAIN.workers.dev`

**For MCP Config**: `https://your-worker.workers.dev/callback`

**KV Namespace**: `TRANSCRIPTS`

**Variable Binding**: `TRANSCRIPTS` (must match exactly)

---

## Video Tutorial (If Needed)

If you'd prefer a video walkthrough, Cloudflare has official tutorials:
- https://developers.cloudflare.com/workers/get-started/guide/

The steps are the same, just use our `worker.js` code instead of their examples.

---

**You're all set!** 🚀

Your webhook relay is now live and ready to receive Deepgram callbacks.
