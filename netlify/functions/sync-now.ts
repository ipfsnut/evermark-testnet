// netlify/functions/sync-now.ts
import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  console.log('🔄 Manual sync triggered');
  
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  }
  
  if (request.method === 'GET') {
    return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>Evermark Blockchain Sync</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    .button { background: #8B5CF6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
    .button:hover { background: #7C3AED; }
    .status { margin: 20px 0; padding: 10px; border-radius: 5px; }
    .loading { background: #FEF3C7; border: 1px solid #F59E0B; }
    .success { background: #D1FAE5; border: 1px solid #10B981; }
    .error { background: #FEE2E2; border: 1px solid #EF4444; }
    pre { background: #F3F4F6; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🔄 Evermark Blockchain Sync</h1>
  <p>This tool syncs blockchain data to Supabase for faster app performance.</p>
  
  <button class="button" onclick="startSync()">Start Manual Sync</button>
  <button class="button" onclick="checkStatus()">Check Status</button>
  
  <div id="status"></div>
  
  <script>
    async function startSync() {
      const statusDiv = document.getElementById('status');
      statusDiv.innerHTML = '<div class="status loading">🔄 Starting sync...</div>';
      
      try {
        const response = await fetch('/.netlify/functions/sync-blockchain', {
          method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
          statusDiv.innerHTML = \`
            <div class="status success">
              ✅ Sync completed successfully!
              <pre>\${JSON.stringify(result.stats, null, 2)}</pre>
            </div>
          \`;
        } else {
          statusDiv.innerHTML = \`
            <div class="status error">
              ❌ Sync failed: \${result.error}
              <pre>\${JSON.stringify(result, null, 2)}</pre>
            </div>
          \`;
        }
      } catch (error) {
        statusDiv.innerHTML = \`
          <div class="status error">
            ❌ Network error: \${error.message}
          </div>
        \`;
      }
    }
    
    async function checkStatus() {
      const statusDiv = document.getElementById('status');
      statusDiv.innerHTML = '<div class="status loading">🔍 Checking status...</div>';
      
      try {
        const response = await fetch('/.netlify/functions/sync-blockchain');
        const result = await response.json();
        
        statusDiv.innerHTML = \`
          <div class="status success">
            📊 Sync Status
            <pre>\${JSON.stringify(result, null, 2)}</pre>
          </div>
        \`;
      } catch (error) {
        statusDiv.innerHTML = \`
          <div class="status error">
            ❌ Error checking status: \${error.message}
          </div>
        \`;
      }
    }
    
    // Auto-check status on load
    checkStatus();
  </script>
</body>
</html>
    `, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
  
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  try {
    // Trigger the main sync function
    const syncResponse = await fetch(`${request.url.replace('/sync-now', '/sync-blockchain')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await syncResponse.json();
    
    return Response.json(result, {
      status: syncResponse.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
    
  } catch (error) {
    console.error('Manual sync trigger failed:', error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};