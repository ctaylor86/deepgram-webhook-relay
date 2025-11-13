/**
 * Deepgram Webhook Relay - Cloudflare Worker
 * 
 * Receives Deepgram transcription callbacks and stores them in KV storage
 * Provides API to retrieve transcripts by request_id
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // POST /callback - Receive Deepgram webhook
    if (request.method === 'POST' && url.pathname === '/callback') {
      try {
        const data = await request.json();
        
        // Extract request_id from metadata or query param
        const requestId = data.metadata?.request_id || 
                         url.searchParams.get('request_id');
        
        if (!requestId) {
          return new Response(JSON.stringify({
            error: 'Missing request_id in metadata or query parameter'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Store transcript in KV with 7-day expiration
        await env.TRANSCRIPTS.put(requestId, JSON.stringify({
          request_id: requestId,
          transcript: data,
          stored_at: new Date().toISOString(),
        }), {
          expirationTtl: 604800, // 7 days
        });

        console.log(`Stored transcript for request_id: ${requestId}`);

        return new Response(JSON.stringify({
          success: true,
          request_id: requestId,
          message: 'Transcript stored successfully',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error storing transcript:', error);
        return new Response(JSON.stringify({
          error: 'Failed to store transcript',
          details: error.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // GET /transcript/:request_id - Retrieve transcript
    if (request.method === 'GET' && url.pathname.startsWith('/transcript/')) {
      try {
        const requestId = url.pathname.split('/')[2];
        
        if (!requestId) {
          return new Response(JSON.stringify({
            error: 'Missing request_id in URL path',
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await env.TRANSCRIPTS.get(requestId);
        
        if (!data) {
          return new Response(JSON.stringify({
            error: 'Transcript not found',
            request_id: requestId,
            message: 'This transcript may have expired (7 day retention) or the request_id is incorrect',
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(data, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error retrieving transcript:', error);
        return new Response(JSON.stringify({
          error: 'Failed to retrieve transcript',
          details: error.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // POST /log - Store log entry
    if (request.method === 'POST' && url.pathname === '/log') {
      try {
        const logEntry = await request.json();
        const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const requestId = logEntry.request_id || logId;
        
        // Store log with 24-hour expiration
        const logKey = `log:${requestId}:${logEntry.event}:${Date.now()}`;
        await env.TRANSCRIPTS.put(logKey, JSON.stringify({
          ...logEntry,
          log_id: logId,
          logged_at: new Date().toISOString(),
        }), {
          expirationTtl: 86400, // 24 hours
        });

        // Fire-and-forget response (don't wait)
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        // Don't fail the request if logging fails
        console.error('Error storing log:', error);
        return new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // GET /logs/:request_id - Retrieve logs for a request
    if (request.method === 'GET' && url.pathname.startsWith('/logs/')) {
      try {
        const requestId = url.pathname.split('/')[2];
        
        if (!requestId) {
          return new Response(JSON.stringify({
            error: 'Missing request_id in URL path',
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // List all keys matching this request_id
        const list = await env.TRANSCRIPTS.list({ prefix: `log:${requestId}:` });
        const logs = [];
        
        for (const key of list.keys) {
          const data = await env.TRANSCRIPTS.get(key.name);
          if (data) {
            logs.push(JSON.parse(data));
          }
        }
        
        // Sort by timestamp
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return new Response(JSON.stringify({
          request_id: requestId,
          log_count: logs.length,
          logs: logs,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error retrieving logs:', error);
        return new Response(JSON.stringify({
          error: 'Failed to retrieve logs',
          details: error.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // GET /health - Health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'deepgram-webhook-relay',
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET / - API documentation
    if (request.method === 'GET' && url.pathname === '/') {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Deepgram Webhook Relay</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    .endpoint { margin: 20px 0; }
  </style>
</head>
<body>
  <h1>🎙️ Deepgram Webhook Relay</h1>
  <p>This service receives Deepgram transcription callbacks and stores them for retrieval.</p>
  
  <h2>Endpoints</h2>
  
  <div class="endpoint">
    <h3>POST /callback</h3>
    <p>Receive Deepgram webhook callback</p>
    <pre>curl -X POST https://your-worker.workers.dev/callback \\
  -H "Content-Type: application/json" \\
  -d '{"metadata": {"request_id": "abc123"}, ...}'</pre>
  </div>
  
  <div class="endpoint">
    <h3>GET /transcript/:request_id</h3>
    <p>Retrieve stored transcript by request_id</p>
    <pre>curl https://your-worker.workers.dev/transcript/abc123</pre>
  </div>
  
  <div class="endpoint">
    <h3>GET /health</h3>
    <p>Health check endpoint</p>
    <pre>curl https://your-worker.workers.dev/health</pre>
  </div>
  
  <h2>Configuration</h2>
  <p>Use this worker URL as the callback in your Deepgram API requests:</p>
  <pre>https://your-worker.workers.dev/callback?request_id={request_id}</pre>
  
  <h2>Data Retention</h2>
  <p>Transcripts are stored for <strong>7 days</strong> and then automatically deleted.</p>
</body>
</html>
      `;
      
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // 404 for all other routes
    return new Response(JSON.stringify({
      error: 'Not found',
      message: 'Visit / for API documentation',
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
