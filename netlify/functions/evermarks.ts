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

    // Fetch from Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/evermarks?id=eq.${evermarkId}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return new Response(JSON.stringify({ error: 'Evermark not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const evermark = data[0];
    
    // Format the response
    const formattedEvermark = {
      id: evermark.id,
      title: evermark.title,
      author: evermark.author,
      description: evermark.description,
      image: evermark.metadata?.image,
      sourceUrl: evermark.metadata?.sourceUrl,
      metadataURI: evermark.metadata?.metadataURI,
      creator: evermark.metadata?.creator || evermark.author,
      creationTime: evermark.metadata?.creationTime || new Date(evermark.created_at).getTime(),
      verified: evermark.verified
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
