// netlify/functions/evermarks.ts - API endpoint for fetching Evermark data
import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const evermarkId = pathParts[pathParts.length - 1];

  if (!evermarkId) {
    return new Response(JSON.stringify({ error: 'Evermark ID required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Import your Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    console.log(`Fetching evermark ${evermarkId} from Supabase...`);

    // Fetch from Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/evermarks?id=eq.${evermarkId}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Supabase response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Supabase data:`, data);
    
    if (!data || data.length === 0) {
      console.log('No data found in Supabase, returning 404');
      return new Response(JSON.stringify({ error: 'Evermark not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const evermark = data[0];
    
    // Format the response to match EvermarkDetailPage expectations
    const formattedEvermark = {
      id: evermark.id,
      name: evermark.title || evermark.name,
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

    return new Response(JSON.stringify(formattedEvermark), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5 minutes
      }
    });

  } catch (error) {
    console.error('Error fetching evermark:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
