// netlify/functions/evermarks.ts - Robust API endpoint
import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  // Better CORS handling
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    const url = new URL(request.url);
    
    // Get ID from query param OR path
    let evermarkId = url.searchParams.get('id');
    
    if (!evermarkId) {
      const pathParts = url.pathname.split('/');
      evermarkId = pathParts[pathParts.length - 1];
    }

    console.log('🔍 Evermarks function called:', {
      method: request.method,
      url: request.url,
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams.entries()),
      extractedId: evermarkId
    });

    if (!evermarkId || evermarkId === 'evermarks') {
      return new Response(JSON.stringify({ 
        error: 'Evermark ID required',
        debug: {
          url: request.url,
          pathname: url.pathname,
          searchParams: Object.fromEntries(url.searchParams.entries())
        }
      }), { 
        status: 400,
        headers
      });
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔍 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrlLength: supabaseUrl?.length || 0
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration');
      
      // Return mock data for now to test routing
      const mockEvermark = {
        id: evermarkId,
        name: `Test Evermark #${evermarkId}`,
        title: `Test Evermark #${evermarkId}`,
        description: `This is a test Evermark ${evermarkId} to verify routing works. Supabase config missing in production.`,
        content: `Mock content for Evermark ${evermarkId}. This means routing is working but Supabase credentials need to be configured.`,
        author: 'System Test',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        view_count: Math.floor(Math.random() * 100),
        evermark_type: 'test',
        source_platform: 'mock',
        voting_power: 0,
        tags: ['test', 'routing-works'],
        tx_hash: '0x' + '0'.repeat(64),
        block_number: 12345,
        metadata: {
          mock: true,
          note: 'Supabase credentials missing'
        },
        external_url: `https://example.com/evermark/${evermarkId}`,
        image: null
      };
      
      return new Response(JSON.stringify(mockEvermark), {
        headers: {
          ...headers,
          'Cache-Control': 'no-cache'
        }
      });
    }

    console.log(`📡 Fetching evermark ${evermarkId} from Supabase...`);

    // Try Supabase
    const supabaseEndpoint = `${supabaseUrl}/rest/v1/evermarks?id=eq.${evermarkId}`;
    console.log('📡 Supabase endpoint:', supabaseEndpoint);

    const response = await fetch(supabaseEndpoint, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    console.log('📡 Supabase response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase error:', response.status, errorText);
      
      return new Response(JSON.stringify({
        error: `Supabase error: ${response.status}`,
        details: errorText,
        evermarkId
      }), {
        status: 500,
        headers
      });
    }

    const data = await response.json();
    console.log('✅ Supabase response data:', {
      isArray: Array.isArray(data),
      length: data?.length,
      firstItem: data?.[0] ? Object.keys(data[0]) : 'no items'
    });
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log('❌ No data found in Supabase');
      return new Response(JSON.stringify({ 
        error: 'Evermark not found',
        id: evermarkId,
        supabaseResponse: data
      }), {
        status: 404,
        headers
      });
    }

    // Get first item if array
    const evermark = Array.isArray(data) ? data[0] : data;
    
    // Format the response
    const formattedEvermark = {
      id: evermark.id,
      name: evermark.title || evermark.name,
      title: evermark.title || evermark.name,
      description: evermark.description,
      content: evermark.description || evermark.content,
      image: evermark.metadata?.image || evermark.image,
      external_url: evermark.metadata?.sourceUrl || evermark.external_url,
      author: evermark.author,
      timestamp: evermark.created_at,
      tx_hash: evermark.tx_hash,
      block_number: evermark.block_number,
      metadata: evermark.metadata || {},
      evermark_type: evermark.evermark_type || 'farcaster',
      source_platform: evermark.source_platform || 'farcaster',
      voting_power: evermark.voting_power || 0,
      view_count: evermark.view_count || 0,
      tags: evermark.tags || [],
      created_at: evermark.created_at,
      updated_at: evermark.updated_at
    };

    console.log('✅ Returning formatted evermark:', {
      id: formattedEvermark.id,
      name: formattedEvermark.name,
      author: formattedEvermark.author
    });

    return new Response(JSON.stringify(formattedEvermark), {
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300'
      }
    });

  } catch (error) {
    console.error('💥 Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers
    });
  }
};