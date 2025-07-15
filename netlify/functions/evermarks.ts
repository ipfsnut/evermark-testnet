// netlify/functions/evermarks.ts - FIXED with proper error handling and Supabase integration
import type { Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async (request: Request, context: Context) => {
  console.log('🔍 Evermarks function called:', request.method, request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      }
    });
  }

  // Only handle GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const creator = url.searchParams.get('creator');
    const author = url.searchParams.get('author');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    console.log('📊 Query parameters:', { id, creator, author, limit });

    // Check if Supabase is available
    if (!supabase) {
      console.error('❌ Supabase not initialized');
      return new Response(JSON.stringify({ 
        error: 'Database connection not available',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          id
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Single Evermark by ID
    if (id) {
      console.log(`🔍 Fetching Evermark with ID: ${id}`);
      
      // Define types for our data
      type EvermarkRow = {
        id: string;
        title: string;
        description?: string;
        author: string;
        created_at: string;
        updated_at?: string;
        tx_hash?: string;
        metadata?: any;
      };
      
      let evermark: EvermarkRow | null = null;
      let lastError: string | null = null;

      // First try: exact string match
      try {
        const { data, error } = await supabase
          .from('evermarks')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          lastError = error.message;
          console.log('⚠️ String match failed:', error.message);
        } else if (data) {
          evermark = data as EvermarkRow;
          console.log('✅ Found evermark with string match');
        }
      } catch (err) {
        console.log('⚠️ String query error:', err);
        lastError = err instanceof Error ? err.message : 'Unknown error';
      }

      // Second try: cast to text (in case stored as integer)
      if (!evermark) {
        try {
          const { data, error } = await supabase
            .from('evermarks')
            .select('*')
            .filter('id', 'eq', id)
            .single();

          if (error) {
            lastError = error.message;
            console.log('⚠️ Filter match failed:', error.message);
          } else if (data) {
            evermark = data as EvermarkRow;
            console.log('✅ Found evermark with filter match');
          }
        } catch (err) {
          console.log('⚠️ Filter query error:', err);
          lastError = err instanceof Error ? err.message : 'Unknown error';
        }
      }

      // Third try: look for any records that might match
      if (!evermark) {
        try {
          const { data, error } = await supabase
            .from('evermarks')
            .select('*')
            .limit(1);

          if (error) {
            lastError = error.message;
            console.log('⚠️ General query failed:', error.message);
          } else if (data && data.length > 0) {
            // Check if any of the returned records match our ID
            const foundRecord = data.find((record: any) => 
              String(record.id) === String(id) || 
              record.id === id
            );
            
            if (foundRecord) {
              evermark = foundRecord as EvermarkRow;
              console.log('✅ Found evermark with general search');
            } else {
              console.log('📊 Sample records found:', data.map((r: any) => ({ id: r.id, title: r.title })));
            }
          }
        } catch (err) {
          console.log('⚠️ General search error:', err);
          lastError = err instanceof Error ? err.message : 'Unknown error';
        }
      }

      if (!evermark) {
        console.log(`❌ Evermark ${id} not found in database`);
        
        // Debug: Check what IDs exist
        try {
          const { data: allIds, error: debugError } = await supabase
            .from('evermarks')
            .select('id, title')
            .limit(10);
          
          if (!debugError && allIds) {
            console.log('📊 Available Evermark IDs:', allIds.map((e: any) => e.id));
          }
        } catch (debugErr) {
          console.log('⚠️ Debug query failed:', debugErr);
        }

        return new Response(JSON.stringify({ 
          error: 'Evermark not found',
          message: `No Evermark found with ID: ${id}`,
          debug: {
            searchedId: id,
            lastError,
          }
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      // Transform the data to match expected format
      const transformedEvermark = {
        id: evermark.id,
        name: evermark.title || 'Untitled',
        title: evermark.title || 'Untitled',
        description: evermark.description || '',
        content: evermark.description || '',
        image: evermark.metadata?.image || '',
        external_url: evermark.metadata?.sourceUrl || '',
        author: evermark.author || 'Unknown',
        creator: evermark.metadata?.creator || evermark.author || 'Unknown',
        timestamp: evermark.created_at || new Date().toISOString(),
        created_at: evermark.created_at || new Date().toISOString(),
        updated_at: evermark.updated_at || evermark.created_at || new Date().toISOString(),
        creationTime: evermark.metadata?.creationTime || Math.floor(new Date(evermark.created_at || Date.now()).getTime() / 1000),
        tx_hash: evermark.tx_hash || '',
        block_number: evermark.metadata?.blockNumber || 0,
        metadataURI: evermark.metadata?.metadataURI || '',
        evermark_type: evermark.metadata?.type || 'standard',
        source_platform: evermark.metadata?.sourcePlatform || 'web',
        sourceUrl: evermark.metadata?.sourceUrl || '',
        voting_power: 0, // This would come from stakes table
        view_count: 0, // This would need tracking
        tags: evermark.metadata?.tags || [],
        category: evermark.metadata?.category || 'general',
        metadata: evermark.metadata || {}
      };

      console.log('✅ Returning transformed Evermark:', transformedEvermark.id);
      
      return new Response(JSON.stringify(transformedEvermark), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        }
      });
    }

    // List Evermarks with filters
    let query = supabase.from('evermarks').select('*');

    if (creator) {
      query = query.eq('metadata->>creator', creator);
    }

    if (author) {
      query = query.eq('author', author);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100)); // Max 100 items

    const { data: evermarks, error } = await query;

    if (error) {
      console.error('❌ Database query error:', error);
      return new Response(JSON.stringify({ 
        error: 'Database query failed',
        message: error.message,
        debug: { creator, author, limit }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    console.log(`✅ Found ${evermarks?.length || 0} evermarks`);

    return new Response(JSON.stringify({
      data: evermarks || [],
      count: evermarks?.length || 0
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      }
    });

  } catch (error) {
    console.error('❌ Evermarks function error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        timestamp: new Date().toISOString(),
        hasSupabase: !!supabase
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};