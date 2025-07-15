// netlify/functions/sync-blockchain.ts - FIXED with correct environment variables
import type { Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { createThirdwebClient, getContract, readContract } from 'thirdweb';
import { base } from 'thirdweb/chains';

// ✅ FIXED: Use correct SERVER-SIDE environment variable names for Netlify functions
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const thirdwebClientId = process.env.THIRDWEB_CLIENT_ID;
const evermarkNftAddress = process.env.EVERMARK_NFT_ADDRESS;

console.log('🔍 Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseKey,
  hasThirdwebClientId: !!thirdwebClientId,
  hasEvermarkNftAddress: !!evermarkNftAddress,
  supabaseUrl: supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING',
  evermarkNftAddress: evermarkNftAddress || 'MISSING'
});

if (!supabaseUrl || !supabaseKey || !thirdwebClientId || !evermarkNftAddress) {
  const missing = [
    !supabaseUrl && 'SUPABASE_URL',
    !supabaseKey && 'SUPABASE_ANON_KEY', 
    !thirdwebClientId && 'THIRDWEB_CLIENT_ID',
    !evermarkNftAddress && 'EVERMARK_NFT_ADDRESS'
  ].filter(Boolean);
  
  console.error('❌ Missing environment variables:', missing);
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const supabase = createClient(supabaseUrl, supabaseKey);
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
        environment: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          hasThirdwebClientId: !!thirdwebClientId,
          hasEvermarkNftAddress: !!evermarkNftAddress,
        },
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
      console.error('❌ Health check failed:', error);
      return Response.json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey, 
          hasThirdwebClientId: !!thirdwebClientId,
          hasEvermarkNftAddress: !!evermarkNftAddress,
        }
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
    
    const existingIds = new Set(existingEvermarks?.map(e => parseInt(e.id)) || []);
    console.log(`📊 Database has ${existingIds.size} Evermarks`);
    
    // Sync missing Evermarks (start from 1, since NFTs usually start at 1)
    for (let tokenId = 1; tokenId <= Number(totalSupply); tokenId++) {
      if (existingIds.has(tokenId)) {
        continue; // Skip existing
      }
      
      try {
        await syncSingleEvermark(contract, tokenId);
        synced++;
        console.log(`✅ Synced Evermark ${tokenId}`);
        
        // Rate limiting - don't overwhelm
        if (synced % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
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
        errors: errors.slice(0, 10) // Limit error list
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
    
    // ✅ FIXED: Use the correct method name that matches your hooks
    const contractData = await readContract({
      contract,
      method: "function evermarkData(uint256) view returns (string,string,string,uint256,address,address)",
      params: [BigInt(tokenId)]
    });
    
    if (!contractData || !Array.isArray(contractData)) {
      throw new Error('Invalid evermarkData response');
    }
    
    // Extract fields from tuple: [title, creator, metadataURI, creationTime, minter, referrer]
    const [title, creator, metadataURI, creationTime, minter, referrer] = contractData;
    
    // Validate required fields
    if (!title || !metadataURI) {
      throw new Error('Missing required evermark data fields');
    }
    
    // Fetch IPFS metadata if available
    let metadata: any = {};
    if (metadataURI && metadataURI.startsWith('ipfs://')) {
      try {
        metadata = await fetchIPFSMetadata(metadataURI);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch IPFS metadata for token ${tokenId}:`, error);
      }
    }
    
    // Prepare data for Supabase
    const evermarkData = {
      id: tokenId.toString(),
      title: title || metadata.name || `Evermark #${tokenId}`,
      description: metadata.description || '',
      author: metadata.attributes?.find((a: any) => a.trait_type === 'Original Author')?.value || creator || 'Unknown',
      creator: minter || creator,
      metadata: {
        ...metadata,
        metadataURI,
        creationTime: Number(creationTime),
        creator: minter || creator,
        referrer: referrer === '0x0000000000000000000000000000000000000000' ? null : referrer
      },
      created_at: new Date(Number(creationTime) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      verified: true
    };
    
    // Insert into Supabase
    const { error } = await supabase
      .from('evermarks')
      .upsert(evermarkData, { onConflict: 'id' });
    
    if (error) {
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
  const { data: cached } = await supabase
    .from('ipfs_cache')
    .select('content')
    .eq('hash', ipfsHash)
    .single();
  
  if (cached) {
    return cached.content;
  }
  
  // Fetch from IPFS gateway with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
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
    await supabase
      .from('ipfs_cache')
      .upsert({
        hash: ipfsHash,
        content: metadata,
        content_type: 'metadata'
      }, { onConflict: 'hash' });
    
    return metadata;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}