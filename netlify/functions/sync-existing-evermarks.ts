import type { Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
const EVERMARK_NFT_ADDRESS = "0x12cB9a1fAfcC389dafCd80cC0eD49739DdB4EdCc";

export default async (request: Request, context: Context) => {
  console.log('🔄 Starting sync of existing Evermarks from Thirdweb...');

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Step 1: Fetch NFTs from Thirdweb API
    console.log('📡 Fetching NFTs from Thirdweb API...');
    
    const thirdwebResponse = await fetch(
      `https://api.thirdweb.com/v1/chain/8453/contract/${EVERMARK_NFT_ADDRESS}/nfts`,
      {
        headers: {
          'Authorization': `Bearer ${THIRDWEB_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!thirdwebResponse.ok) {
      throw new Error(`Thirdweb API error: ${thirdwebResponse.status}`);
    }

    const nftData = await thirdwebResponse.json();
    console.log(`📊 Found ${nftData.data?.length || 0} NFTs from Thirdweb`);

    // Step 2: Transform to Evermark format
    const evermarks = nftData.data.map((nft: any) => {
      return {
        id: nft.tokenId || nft.id,
        title: nft.metadata?.name || `Evermark #${nft.tokenId}`,
        description: nft.metadata?.description || `Evermark created on blockchain`,
        author: nft.owner || 'Unknown',
        created_at: new Date().toISOString(), // We don't have exact creation time
        metadata: {
          tokenId: nft.tokenId,
          owner: nft.owner,
          tokenURI: nft.tokenURI,
          image: nft.metadata?.image,
          source: 'thirdweb_sync',
          syncedAt: new Date().toISOString(),
          originalMetadata: nft.metadata
        }
      };
    });

    // Step 3: Bulk insert to Supabase (with conflict handling)
    console.log('💾 Inserting to Supabase...');
    
    const { data, error } = await supabase
      .from('evermarks')
      .upsert(evermarks, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      throw error;
    }

    console.log(`✅ Successfully synced ${evermarks.length} Evermarks`);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully synced ${evermarks.length} existing Evermarks`,
      evermarks: evermarks.length,
      inserted: data?.length || 0,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};