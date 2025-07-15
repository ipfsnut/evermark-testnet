// netlify/functions/sync-blockchain.ts - FIXED with Service Role Key
import type { Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { createThirdwebClient, getContract, readContract } from 'thirdweb';
import { base } from 'thirdweb/chains';

// ✅ FIXED: Use SECRET key for server-side operations (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const thirdwebClientId = process.env.THIRDWEB_CLIENT_ID || process.env.VITE_THIRDWEB_CLIENT_ID;
const evermarkNftAddress = process.env.EVERMARK_NFT_ADDRESS || process.env.VITE_EVERMARK_NFT_ADDRESS;

console.log('🔧 Using Supabase keys:', {
  hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
  hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
  usingKey: process.env.SUPABASE_SECRET_KEY ? 'SECRET' : 'ANON'
});

if (!supabaseUrl || !supabaseSecretKey || !thirdwebClientId || !evermarkNftAddress) {
  const missing = [
    !supabaseUrl && 'SUPABASE_URL',
    !supabaseSecretKey && 'SUPABASE_SECRET_KEY (or SUPABASE_ANON_KEY)', 
    !thirdwebClientId && 'THIRDWEB_CLIENT_ID',
    !evermarkNftAddress && 'EVERMARK_NFT_ADDRESS'
  ].filter(Boolean);
  
  console.error('❌ Missing environment variables:', missing);
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// ✅ FIXED: Use secret key which bypasses RLS
const supabase = createClient(supabaseUrl, supabaseSecretKey);
const client = createThirdwebClient({ clientId: thirdwebClientId });

export default async (request: Request, context: Context) => {
  console.log('🔄 Blockchain sync started');
  
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
  
  // Health check
  if (request.method === 'GET') {
    try {
      const contract = getContract({
        client,
        chain: base,
        address: evermarkNftAddress as `0x${string}`,
      });
      
      const totalSupply = await readContract({
        contract,
        method: "function totalSupply() view returns (uint256)"
      });
      
      const { data: dbCount } = await supabase
        .from('evermarks')
        .select('id', { count: 'exact', head: true });
      
      return Response.json({
        status: 'healthy',
        service: 'blockchain-sync',
        usingSecretKey: !!process.env.SUPABASE_SECRET_KEY,
        blockchain: {
          totalSupply: totalSupply.toString(),
          contract: evermarkNftAddress,
          chainId: base.id
        },
        database: {
          evermarksCount: dbCount || 0
        }
      });
    } catch (error) {
      return Response.json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }
  
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  const startTime = Date.now();
  let synced = 0;
  const errors: string[] = [];
  
  try {
    console.log('📚 Starting blockchain sync...');
    
    const contract = getContract({
      client,
      chain: base,
      address: evermarkNftAddress as `0x${string}`,
    });
    
    // Get total supply from contract
    const totalSupply = await readContract({
      contract,
      method: "function totalSupply() view returns (uint256)"
    });
    
    console.log(`📊 Contract has ${totalSupply} total Evermarks`);
    
    // Get existing Evermarks from database
    const { data: existingEvermarks } = await supabase
      .from('evermarks')
      .select('id');
    
    const existingIds = new Set(existingEvermarks?.map((e: any) => parseInt(e.id)) || []);
    console.log(`📊 Database has ${existingIds.size} Evermarks`);
    
    // Sync missing Evermarks (start from 1, since NFTs usually start at 1)
    const totalTokens = Number(totalSupply);
    const maxToSync = Math.min(10, totalTokens); // Limit to 10 per run
    
    for (let tokenId = 1; tokenId <= totalTokens && synced < maxToSync; tokenId++) {
      if (existingIds.has(tokenId)) {
        continue; // Skip existing
      }
      
      try {
        await syncSingleEvermark(contract, tokenId);
        synced++;
        console.log(`✅ Synced Evermark ${tokenId} (${synced}/${maxToSync})`);
        
        // Rate limiting
        if (synced % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.error(`❌ Failed to sync Evermark ${tokenId}:`, error);
        errors.push(`Token ${tokenId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Sync completed: ${synced} new Evermarks in ${duration}ms`);
    
    return Response.json({
      success: true,
      message: 'Sync completed',
      stats: {
        totalSupply: totalSupply.toString(),
        synced,
        duration,
        maxPerRun: maxToSync,
        errors: errors.slice(0, 5)
      }
    });
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats: {
        synced,
        duration: Date.now() - startTime,
        errors
      }
    }, { status: 500 });
  }
};

async function syncSingleEvermark(contract: any, tokenId: number) {
  try {
    console.log(`🔍 Syncing Evermark ${tokenId}...`);
    
    // Get contract data (this part was already working)
    const contractData = await readContract({
      contract,
      method: "function evermarkData(uint256) view returns (string,string,string,uint256,address,address)",
      params: [BigInt(tokenId)]
    });
    
    const [title, contractCreator, metadataURI, creationTime, minter, referrer] = contractData;
    
    // Fetch IPFS metadata if available
    let metadata: any = {};
    if (metadataURI && metadataURI.startsWith('ipfs://')) {
      try {
        metadata = await fetchIPFSMetadata(metadataURI);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch IPFS metadata for token ${tokenId}:`, error);
      }
    }
    
    // ✅ Same data structure as before - this was working
    const evermarkData = {
      id: tokenId.toString(),
      title: title || metadata.name || `Evermark #${tokenId}`,
      description: metadata.description || '',
      author: metadata.attributes?.find((a: any) => a.trait_type === 'Original Author')?.value || 
               metadata.attributes?.find((a: any) => a.trait_type === 'Author')?.value ||
               contractCreator || 'Unknown',
      verified: true,
      metadata: {
        ...metadata,
        metadataURI,
        creationTime: Number(creationTime),
        contractCreator: minter || contractCreator,
        referrer: referrer === '0x0000000000000000000000000000000000000000' ? null : referrer,
        syncedAt: new Date().toISOString()
      },
      created_at: new Date(Number(creationTime) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };
    
    console.log(`📝 Inserting Evermark ${tokenId}: ${evermarkData.title}`);
    
    // ✅ This should now work with service role key (bypasses RLS)
    const { error } = await supabase
      .from('evermarks')
      .upsert(evermarkData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`❌ Supabase upsert error for token ${tokenId}:`, error);
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
    
    console.log(`✅ Successfully synced Evermark ${tokenId}`);
    
  } catch (error) {
    throw new Error(`Failed to sync token ${tokenId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function fetchIPFSMetadata(metadataURI: string): Promise<any> {
  const ipfsHash = metadataURI.replace('ipfs://', '');
  
  // Check cache first
  try {
    const { data: cached } = await supabase
      .from('ipfs_cache')
      .select('content')
      .eq('hash', ipfsHash)
      .single();
    
    if (cached) {
      console.log(`📦 Using cached IPFS data for ${ipfsHash}`);
      return cached.content;
    }
  } catch (error) {
    // Cache miss is normal
    console.log(`📦 No cache found for ${ipfsHash}, fetching...`);
  }
  
  // Fetch from IPFS gateway
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status}`);
    }
    
    const metadata = await response.json();
    
    // Cache the result
    try {
      await supabase
        .from('ipfs_cache')
        .upsert({
          hash: ipfsHash,
          content: metadata,
          content_type: 'metadata'
        }, { onConflict: 'hash' });
    } catch (cacheError) {
      console.warn('Failed to cache IPFS data:', cacheError);
    }
    
    return metadata;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}