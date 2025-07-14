// netlify/functions/evermarks.ts - FIXED to match your working hooks pattern
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

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ 
        error: 'Supabase not configured',
        message: 'Database connection not available'
      }), { status: 503, headers });
    }

    // 🔧 CRITICAL FIX: Use the SAME pattern as your working hooks
    const cleanUrl = supabaseUrl.replace(/\/$/, '');

    if (!evermarkId || evermarkId === 'evermarks') {
      // 🔧 Return list of evermarks (like your hooks do)
      console.log('📋 Getting evermarks list (no specific ID)');
      
      const response = await fetch(`${cleanUrl}/rest/v1/evermarks?select=*&order=created_at.desc&limit=20`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ List evermarks failed:', response.status, errorText);
        
        return new Response(JSON.stringify({
          error: `Database query failed: ${response.status}`,
          message: errorText,
          suggestion: 'Check your Supabase table structure and RLS policies'
        }), { status: response.status, headers });
      }

      const evermarks = await response.json();
      console.log('✅ Evermarks list fetched:', {
        count: Array.isArray(evermarks) ? evermarks.length : 0,
        isArray: Array.isArray(evermarks)
      });

      return new Response(JSON.stringify({
        data: evermarks,
        count: Array.isArray(evermarks) ? evermarks.length : 0,
        message: 'Evermarks list retrieved successfully'
      }), { headers });
    }

    // 🔧 FIXED: Get single evermark using the exact same pattern as your hooks
    console.log(`🔍 Getting specific evermark: ${evermarkId}`);
    
    // First, try the exact same query pattern your hooks use
    const response = await fetch(`${cleanUrl}/rest/v1/evermarks?id=eq.${encodeURIComponent(evermarkId)}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });

    console.log(`📡 Single evermark response:`, {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Single evermark query failed:', {
        status: response.status,
        error: errorText,
        evermarkId
      });

      // 🔧 If specific query fails, try to get ANY evermark to test connection
      console.log('🔄 Testing general database access...');
      try {
        const testResponse = await fetch(`${cleanUrl}/rest/v1/evermarks?select=id,title&limit=5`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (testResponse.ok) {
          const testData = await testResponse.json();
          const availableIds = Array.isArray(testData) ? testData.map(e => e.id) : [];
          
          return new Response(JSON.stringify({
            error: 'Evermark not found',
            id: evermarkId,
            message: `Evermark "${evermarkId}" does not exist`,
            available_ids: availableIds,
            suggestion: availableIds.length > 0 
              ? `Try one of these IDs: ${availableIds.slice(0, 3).join(', ')}`
              : 'No evermarks exist in the database yet'
          }), { status: 404, headers });
        }
      } catch (testError) {
        console.error('❌ Database connection test failed:', testError);
      }

      return new Response(JSON.stringify({
        error: 'Database query failed',
        message: errorText,
        status: response.status,
        evermarkId
      }), { status: response.status, headers });
    }

    const data = await response.json();
    console.log('✅ Single evermark data received:', {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'not array',
      hasData: !!data
    });

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return new Response(JSON.stringify({
        error: 'Evermark not found',
        id: evermarkId,
        message: `No evermark found with ID "${evermarkId}"`
      }), { status: 404, headers });
    }

    const evermark = Array.isArray(data) ? data[0] : data;
    
    // 🔧 Transform to match your hook's Evermark interface exactly
    const transformedEvermark = {
      // Match your useSupabaseEvermarks convertToEvermark function
      id: evermark.id,
      title: evermark.title,
      author: evermark.author,
      description: evermark.description,
      sourceUrl: evermark.metadata?.sourceUrl,
      image: evermark.metadata?.image,
      metadataURI: evermark.metadata?.metadataURI || '',
      creator: evermark.metadata?.creator || evermark.author,
      creationTime: evermark.metadata?.creationTime || new Date(evermark.created_at).getTime() / 1000,
      verified: evermark.verified,
      
      // Additional fields for compatibility with existing frontend
      name: evermark.title,
      content: evermark.content || evermark.description,
      timestamp: evermark.created_at,
      created_at: evermark.created_at,
      updated_at: evermark.updated_at,
      evermark_type: evermark.evermark_type || 'content',
      source_platform: evermark.source_platform || 'evermark',
      voting_power: evermark.voting_power || 0,
      view_count: evermark.view_count || 0,
      tags: evermark.tags || [],
      metadata: evermark.metadata || {},
      external_url: evermark.metadata?.sourceUrl || null,
      tx_hash: evermark.tx_hash || null,
      block_number: evermark.block_number || null
    };

    console.log('✅ Evermark transformed successfully:', {
      id: transformedEvermark.id,
      title: transformedEvermark.title,
      author: transformedEvermark.author
    });

    return new Response(JSON.stringify(transformedEvermark), {
      headers: { 
        ...headers, 
        'Cache-Control': 'public, max-age=300',
        'X-Data-Source': 'supabase-direct'
      }
    });

  } catch (error) {
    console.error('💥 Function error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: 'function_error',
      timestamp: new Date().toISOString()
    }), { status: 500, headers });
  }
};