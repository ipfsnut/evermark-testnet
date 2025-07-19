// netlify/functions/evermarks.ts - FIXED with proper token_id schema and image handling
import type { Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Helper function to resolve IPFS URLs
function resolveIPFSUrl(url: string | null): string | null {
  if (!url) return null;
  
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  
  return url;
}

// Helper function to extract image URL from database row
function extractImageUrl(row: any): string | null {
  // Priority order:
  // 1. processed_image_url (optimized image)
  // 2. metadata.image (from original metadata)
  // 3. metadata.originalMetadata.image (from IPFS)
  // 4. ipfs_metadata.image (cached IPFS data)
  
  if (row.processed_image_url) {
    return resolveIPFSUrl(row.processed_image_url);
  }
  
  if (row.metadata?.image) {
    return resolveIPFSUrl(row.metadata.image);
  }
  
  if (row.metadata?.originalMetadata?.image) {
    return resolveIPFSUrl(row.metadata.originalMetadata.image);
  }
  
  if (row.ipfs_metadata?.image) {
    return resolveIPFSUrl(row.ipfs_metadata.image);
  }
  
  return null;
}

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
      
      // FIXED: Use token_id instead of id
      const tokenId = parseInt(id);
      if (isNaN(tokenId)) {
        return new Response(JSON.stringify({ 
          error: 'Invalid Evermark ID',
          message: `ID must be a number, got: ${id}`,
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
      
      let evermark: any = null;
      let lastError: string | null = null;

      // FIXED: Query by token_id
      try {
        const { data, error } = await supabase
          .from('evermarks')
          .select('*')
          .eq('token_id', tokenId)
          .single();

        if (error) {
          lastError = error.message;
          console.log('⚠️ Query failed:', error.message);
        } else if (data) {
          evermark = data;
          console.log('✅ Found evermark with token_id:', tokenId);
        }
      } catch (err) {
        console.log('⚠️ Query error:', err);
        lastError = err instanceof Error ? err.message : 'Unknown error';
      }

      if (!evermark) {
        console.log(`❌ Evermark ${tokenId} not found in database`);
        
        // Debug: Check what token_ids exist
        try {
          const { data: allIds, error: debugError } = await supabase
            .from('evermarks')
            .select('token_id, title')
            .limit(10);
          
          if (!debugError && allIds) {
            console.log('📊 Available Evermark token_ids:', allIds.map((e: any) => e.token_id));
          }
        } catch (debugErr) {
          console.log('⚠️ Debug query failed:', debugErr);
        }

        return new Response(JSON.stringify({ 
          error: 'Evermark not found',
          message: `No Evermark found with token_id: ${tokenId}`,
          debug: {
            searchedId: tokenId,
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

      // FIXED: Transform the data to match expected format with proper image handling
      const transformedEvermark = {
        id: evermark.token_id.toString(), // Convert token_id to string for compatibility
        name: evermark.title || 'Untitled',
        title: evermark.title || 'Untitled',
        description: evermark.description || '',
        content: evermark.description || '',
        image: extractImageUrl(evermark), // FIXED: Proper image extraction
        external_url: evermark.source_url || '',
        author: evermark.author || 'Unknown',
        creator: evermark.owner || evermark.author || 'Unknown',
        timestamp: evermark.created_at || new Date().toISOString(),
        created_at: evermark.created_at || new Date().toISOString(),
        updated_at: evermark.updated_at || evermark.created_at || new Date().toISOString(),
        creationTime: evermark.metadata?.creationTime || Math.floor(new Date(evermark.created_at || Date.now()).getTime() / 1000),
        tx_hash: evermark.tx_hash || '',
        block_number: evermark.block_number || 0,
        metadataURI: evermark.token_uri || '',
        evermark_type: evermark.content_type || 'standard',
        source_platform: evermark.metadata?.sourcePlatform || 'web',
        sourceUrl: evermark.source_url || '',
        voting_power: 0, // This would come from stakes table
        view_count: 0, // This would need tracking
        tags: evermark.metadata?.tags || [],
        category: evermark.metadata?.category || 'general',
        metadata: {
          ...evermark.metadata,
          // Include image processing status
          imageStatus: evermark.image_processing_status || 'none',
          processedImageUrl: evermark.processed_image_url,
          // Include all metadata sources for debugging
          originalMetadata: evermark.metadata,
          ipfsMetadata: evermark.ipfs_metadata,
          metadataJson: evermark.metadata_json
        }
      };

      console.log('✅ Returning transformed Evermark:', {
        id: transformedEvermark.id,
        title: transformedEvermark.title,
        hasImage: !!transformedEvermark.image,
        imageStatus: transformedEvermark.metadata.imageStatus
      });
      
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
      // FIXED: Query by owner field (which stores creator address)
      query = query.eq('owner', creator);
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

    // FIXED: Transform all evermarks with proper image handling
    const transformedEvermarks = (evermarks || []).map(row => ({
      id: row.token_id.toString(),
      name: row.title || 'Untitled',
      title: row.title || 'Untitled',
      description: row.description || '',
      content: row.description || '',
      image: extractImageUrl(row),
      external_url: row.source_url || '',
      author: row.author || 'Unknown',
      creator: row.owner || row.author || 'Unknown',
      timestamp: row.created_at || new Date().toISOString(),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || row.created_at || new Date().toISOString(),
      creationTime: row.metadata?.creationTime || Math.floor(new Date(row.created_at || Date.now()).getTime() / 1000),
      tx_hash: row.tx_hash || '',
      block_number: row.block_number || 0,
      metadataURI: row.token_uri || '',
      evermark_type: row.content_type || 'standard',
      source_platform: row.metadata?.sourcePlatform || 'web',
      sourceUrl: row.source_url || '',
      voting_power: 0,
      view_count: 0,
      tags: row.metadata?.tags || [],
      category: row.metadata?.category || 'general',
      metadata: {
        ...row.metadata,
        imageStatus: row.image_processing_status || 'none',
        processedImageUrl: row.processed_image_url
      }
    }));

    console.log(`✅ Found ${transformedEvermarks.length} evermarks`);

    return new Response(JSON.stringify({
      data: transformedEvermarks,
      count: transformedEvermarks.length
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