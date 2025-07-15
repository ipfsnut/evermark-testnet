// netlify/functions/sync-blockchain.ts - ULTRA MINIMAL DEBUG
export default async (request: Request) => {
  try {
    return new Response(JSON.stringify({
      status: 'working',
      timestamp: new Date().toISOString(),
      message: 'Function is responding!',
      method: request.method,
      url: request.url
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};