// netlify/functions/evermarks.ts - Diagnostic version
import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    const url = new URL(request.url);
    let evermarkId = url.searchParams.get('id');
    
    if (!evermarkId) {
      const pathParts = url.pathname.split('/');
      evermarkId = pathParts[pathParts.length - 1];
    }

    // DIAGNOSTIC: Check environment first
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔍 DIAGNOSTIC:', {
      evermarkId,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrlPreview: supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING',
      supabaseKeyPreview: supabaseKey ? `${supabaseKey.slice(0, 10)}...` : 'MISSING',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });

    if (!evermarkId || evermarkId === 'evermarks') {
      return new Response(JSON.stringify({ 
        error: 'Evermark ID required',
        diagnostic: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
        }
      }), { status: 400, headers });
    }

    // If no Supabase config, return mock data immediately
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ No Supabase config, returning mock data');
      
      const mockEvermark = {
        id: evermarkId,
        name: `Mock Evermark #${evermarkId}`,
        title: `Mock Evermark #${evermarkId}`,
        description: `This is mock data because Supabase environment variables are not configured in Netlify.`,
        content: `Mock content for Evermark ${evermarkId}.\n\nIssue: Missing Supabase configuration in production environment.\n\nCheck Netlify dashboard → Site Settings → Environment Variables`,
        author: 'System (Mock)',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        view_count: 42,
        evermark_type: 'diagnostic',
        source_platform: 'mock',
        voting_power: 0,
        tags: ['mock', 'diagnostic', 'env-missing'],
        tx_hash: '0x' + 'mock'.repeat(16),
        block_number: 999999,
        metadata: {
          diagnostic: true,
          issue: 'Supabase environment variables missing',
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey
        },
        external_url: null,
        image: null
      };
      
      return new Response(JSON.stringify(mockEvermark), { headers });
    }

    // Validate Supabase URL format
    if (!supabaseUrl.startsWith('https://')) {
      throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
    }

    // Build endpoint URL
    const endpoint = `${supabaseUrl}/rest/v1/evermarks?id=eq.${evermarkId}`;
    console.log('📡 Trying Supabase endpoint:', endpoint);

    // Try Supabase with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(endpoint, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📡 Supabase response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Supabase error response:', errorText);
        throw new Error(`Supabase returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Supabase data received:', Array.isArray(data) ? `Array with ${data.length} items` : 'Object');

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return new Response(JSON.stringify({ 
          error: 'Evermark not found',
          id: evermarkId,
          message: `No evermark found with ID ${evermarkId} in Supabase`
        }), { status: 404, headers });
      }

      const evermark = Array.isArray(data) ? data[0] : data;
      
      // Return the evermark data
      const formattedEvermark = {
        id: evermark.id,
        name: evermark.title || evermark.name || `Evermark #${evermark.id}`,
        title: evermark.title || evermark.name || `Evermark #${evermark.id}`,
        description: evermark.description || 'No description available',
        content: evermark.content || evermark.description || 'No content available',
        image: evermark.metadata?.image || evermark.image,
        external_url: evermark.metadata?.sourceUrl || evermark.external_url,
        author: evermark.author || 'Unknown Author',
        timestamp: evermark.created_at || new Date().toISOString(),
        tx_hash: evermark.tx_hash,
        block_number: evermark.block_number,
        metadata: evermark.metadata || {},
        evermark_type: evermark.evermark_type || 'content',
        source_platform: evermark.source_platform || 'unknown',
        voting_power: evermark.voting_power || 0,
        view_count: evermark.view_count || 0,
        tags: evermark.tags || [],
        created_at: evermark.created_at,
        updated_at: evermark.updated_at
      };

      return new Response(JSON.stringify(formattedEvermark), {
        headers: { ...headers, 'Cache-Control': 'public, max-age=300' }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('💥 Fetch failed:', fetchError);
      throw fetchError;
    }

  } catch (error) {
    console.error('💥 Function error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      diagnostic: {
        hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
        hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers
    });
  }
};