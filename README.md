# Deepgram Webhook Relay - Cloudflare Worker

A lightweight Cloudflare Worker that receives Deepgram transcription callbacks and stores them in KV storage for later retrieval.

## Why This Exists

Deepgram's async API with callbacks doesn't store transcripts in their Management API - they only send them to your callback URL. This worker acts as a relay to:

1. Receive Deepgram callbacks
2. Store transcripts in Cloudflare KV (7-day retention)
3. Provide an API to retrieve transcripts by `request_id`

## Features

- ✅ Receives Deepgram webhook callbacks
- ✅ Stores transcripts in Cloudflare KV storage
- ✅ 7-day automatic expiration
- ✅ Simple REST API for retrieval
- ✅ CORS enabled for browser access
- ✅ Health check endpoint
- ✅ Built-in API documentation

## Deployment

### Prerequisites

- Cloudflare account (free tier works)
- Wrangler CLI installed: `npm install -g wrangler`

### Step 1: Login to Cloudflare

```bash
wrangler login
```

### Step 2: Create KV Namespace

```bash
# For development
wrangler kv:namespace create TRANSCRIPTS

# For production
wrangler kv:namespace create TRANSCRIPTS --env production
```

This will output a KV namespace ID. Copy it and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "TRANSCRIPTS"
id = "YOUR_KV_NAMESPACE_ID_HERE"  # Replace with your ID
```

### Step 3: Deploy

```bash
wrangler deploy
```

You'll get a URL like: `https://deepgram-webhook-relay.YOUR_SUBDOMAIN.workers.dev`

### Step 4: Test

```bash
# Health check
curl https://your-worker.workers.dev/health

# Test callback (simulate Deepgram)
curl -X POST https://your-worker.workers.dev/callback \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"request_id": "test123"}, "results": {"channels": [{"alternatives": [{"transcript": "Hello world"}]}]}}'

# Retrieve transcript
curl https://your-worker.workers.dev/transcript/test123
```

## API Endpoints

### POST /callback

Receives Deepgram webhook callback.

**Query Parameters:**
- `request_id` (optional): If not in metadata, can be passed as query param

**Request Body:**
```json
{
  "metadata": {
    "request_id": "abc123"
  },
  "results": {
    "channels": [
      {
        "alternatives": [
          {
            "transcript": "Your transcription here..."
          }
        ]
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "request_id": "abc123",
  "message": "Transcript stored successfully"
}
```

### GET /transcript/:request_id

Retrieves stored transcript by request_id.

**Example:**
```bash
curl https://your-worker.workers.dev/transcript/abc123
```

**Response:**
```json
{
  "request_id": "abc123",
  "transcript": { ... },
  "stored_at": "2025-01-13T10:30:00.000Z"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "deepgram-webhook-relay",
  "timestamp": "2025-01-13T10:30:00.000Z"
}
```

### GET /

Returns HTML documentation page.

## Usage with Deepgram MCP Server

1. Deploy this worker and note your worker URL
2. Configure your MCP server with:
   ```json
   {
     "deepgramApiKey": "your-key",
     "webhookUrl": "https://your-worker.workers.dev/callback"
   }
   ```
3. The MCP server will:
   - Submit jobs with callback URL including request_id
   - Poll `/transcript/{request_id}` to retrieve results

## Configuration

### Data Retention

Transcripts are automatically deleted after 7 days. To change this, edit `worker.js`:

```javascript
expirationTtl: 604800, // 7 days in seconds
```

### CORS

CORS is enabled for all origins by default. To restrict, edit `worker.js`:

```javascript
'Access-Control-Allow-Origin': 'https://yourdomain.com',
```

## Custom Domain (Optional)

To use a custom domain like `deepgram-webhooks.yourdomain.com`:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to Settings → Triggers → Custom Domains
4. Add your subdomain

## Monitoring

View logs in real-time:

```bash
wrangler tail
```

Or in the Cloudflare Dashboard:
- Workers & Pages → Your Worker → Logs

## Costs

**Free Tier:**
- 100,000 requests/day
- 1 GB KV storage
- 1,000 KV writes/day
- 100,000 KV reads/day

This is more than enough for most use cases. Each transcription = 1 write + N reads (polling).

## Security

### Current Setup
- No authentication (open endpoint)
- CORS enabled for all origins
- Data stored in plain text

### Production Recommendations

1. **Add API Key Authentication:**
```javascript
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== env.API_KEY) {
  return new Response('Unauthorized', { status: 401 });
}
```

2. **Restrict CORS:**
```javascript
'Access-Control-Allow-Origin': 'https://yourdomain.com',
```

3. **Add Rate Limiting:**
Use Cloudflare's built-in rate limiting or implement custom logic.

4. **Encrypt Sensitive Data:**
Use Cloudflare's encryption features or encrypt before storing.

## Troubleshooting

### Worker not receiving callbacks

1. Check Deepgram is sending to correct URL
2. View worker logs: `wrangler tail`
3. Test manually with curl

### Transcript not found

1. Check request_id is correct
2. Verify it hasn't expired (7 days)
3. Check KV namespace is properly bound

### KV errors

1. Verify KV namespace ID in wrangler.toml
2. Check KV namespace exists: `wrangler kv:namespace list`
3. Ensure you're within free tier limits

## Support

For issues:
1. Check worker logs: `wrangler tail`
2. View Cloudflare Dashboard logs
3. Test endpoints manually with curl
4. Check Deepgram callback logs in their console

## License

MIT
