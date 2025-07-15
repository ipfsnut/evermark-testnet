// netlify/functions/thirdweb-webhook.ts
import type { Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const webhookSecret = process.env.THIRDWEB_WEBHOOK_SECRET;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ThirdwebWebhookEvent {
  type: 'transaction' | 'event';
  data: {
    transactionHash: string;
    blockNumber: number;
    blockTimestamp: number;
    contractAddress: string;
    eventName?: string;
    args?: Record<string, any>;
    logs?: Array<{
      address: string;
      topics: string[];
      data: string;
      logIndex: number;
      transactionHash: string;
      blockNumber: number;
    }>;
  };
}

export default async (request: Request, context: Context) => {
  console.log('🔔 Thirdweb webhook received:', request.method);
  
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }
  
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  try {
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    
    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (signature !== `sha256=${expectedSignature}`) {
        console.error('❌ Invalid webhook signature');
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    const webhook: ThirdwebWebhookEvent = JSON.parse(body);
    
    console.log('📦 Processing webhook:', {
      type: webhook.type,
      contract: webhook.data.contractAddress,
      event: webhook.data.eventName,
      block: webhook.data.blockNumber
    });
    
    // Route to appropriate handler based on contract and event
    const result = await routeWebhookEvent(webhook);
    
    // Log successful processing
    await supabase
      .from('sync_logs')
      .insert({
        event_type: 'webhook',
        contract_address: webhook.data.contractAddress,
        event_name: webhook.data.eventName || 'unknown',
        transaction_hash: webhook.data.transactionHash,
        block_number: webhook.data.blockNumber,
        status: 'success',
        processed_at: new Date().toISOString(),
        details: { result }
      });
    
    console.log('✅ Webhook processed successfully');
    
    return Response.json({
      success: true,
      message: 'Webhook processed successfully',
      result
    });
    
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    
    // Log error
    try {
      await supabase
        .from('sync_logs')
        .insert({
          event_type: 'webhook_error',
          status: 'failed',
          processed_at: new Date().toISOString(),
          details: { 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }
        });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }
    
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

async function routeWebhookEvent(webhook: ThirdwebWebhookEvent) {
  const { contractAddress, eventName, args, blockTimestamp, transactionHash } = webhook.data;
  
  // Get contract addresses from environment
  const evermarkNft = process.env.EVERMARK_NFT_ADDRESS?.toLowerCase();
  const cardCatalog = process.env.CARD_CATALOG_ADDRESS?.toLowerCase();
  const voting = process.env.EVERMARK_VOTING_ADDRESS?.toLowerCase();
  const leaderboard = process.env.EVERMARK_LEADERBOARD_ADDRESS?.toLowerCase();
  
  const contract = contractAddress.toLowerCase();
  
  switch (contract) {
    case evermarkNft:
      return await handleEvermarkNftEvent(eventName, args, blockTimestamp, transactionHash);
      
    case cardCatalog:
      return await handleCardCatalogEvent(eventName, args, blockTimestamp, transactionHash);
      
    case voting:
      return await handleVotingEvent(eventName, args, blockTimestamp, transactionHash);
      
    case leaderboard:
      return await handleLeaderboardEvent(eventName, args, blockTimestamp, transactionHash);
      
    default:
      console.log(`⚠️ Unknown contract: ${contractAddress}`);
      return { message: 'Unknown contract, ignored' };
  }
}

async function handleEvermarkNftEvent(eventName: string | undefined, args: any, blockTimestamp: number, transactionHash: string) {
  console.log(`📚 EvermarkNFT event: ${eventName}`);
  
  switch (eventName) {
    case 'EvermarkMinted':
      const { tokenId, minter, referrer, title } = args;
      
      // Try to fetch additional metadata from IPFS
      let metadata: any = {};
      try {
        // We'd need to get the metadataURI from the contract first
        // For now, use basic data
      } catch (error) {
        console.warn(`⚠️ Failed to fetch metadata for token ${tokenId}:`, error);
      }
      
      // Upsert to Supabase
      const evermarkData = {
        id: tokenId.toString(),
        title: title || `Evermark #${tokenId}`,
        description: '',
        author: 'Unknown', // Would need to be extracted from metadata
        creator: minter,
        metadata: {
          ...metadata,
          creationTime: blockTimestamp,
          creator: minter,
          referrer: referrer === '0x0000000000000000000000000000000000000000' ? null : referrer
        },
        tx_hash: transactionHash,
        created_at: new Date(blockTimestamp * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        verified: true
      };
      
      const { error } = await supabase
        .from('evermarks')
        .upsert(evermarkData, { onConflict: 'id' });
      
      if (error) {
        throw new Error(`Failed to upsert Evermark ${tokenId}: ${error.message}`);
      }
      
      console.log(`✅ Real-time synced Evermark ${tokenId}`);
      return { evermarkId: tokenId, action: 'minted' };
      
    case 'Transfer':
      // Handle transfers if needed (ownership changes)
      const { from, to, tokenId: transferTokenId } = args;
      
      // Skip mints (from address 0x0)
      if (from === '0x0000000000000000000000000000000000000000') {
        return { message: 'Mint transfer event ignored (handled by EvermarkMinted)' };
      }
      
      // Update ownership in database if needed
      console.log(`🔄 Transfer: ${transferTokenId} from ${from} to ${to}`);
      return { tokenId: transferTokenId, from, to, action: 'transferred' };
      
    default:
      return { message: `EvermarkNFT event ${eventName} ignored` };
  }
}

async function handleCardCatalogEvent(eventName: string | undefined, args: any, blockTimestamp: number, transactionHash: string) {
  console.log(`📋 CardCatalog event: ${eventName}`);
  
  switch (eventName) {
    case 'VotingPowerReserved':
    case 'VotingPowerReleased':
    case 'VotingPowerDelegated':
      // These relate to the CardCatalog's role as voting power manager
      const { user, amount } = args;
      
      // Update user's voting power status if needed
      console.log(`🗳️ ${eventName}: ${user} (${amount})`);
      return { user, amount, action: eventName };
      
    case 'Wrapped':
    case 'UnwrapRequested':
    case 'UnwrapCompleted':
      // Token wrapping/unwrapping events
      const { user: wrapUser, amount: wrapAmount } = args;
      
      console.log(`💰 ${eventName}: ${wrapUser} (${wrapAmount})`);
      return { user: wrapUser, amount: wrapAmount, action: eventName };
      
    default:
      return { message: `CardCatalog event ${eventName} ignored` };
  }
}

async function handleVotingEvent(eventName: string | undefined, args: any, blockTimestamp: number, transactionHash: string) {
  console.log(`🗳️ Voting event: ${eventName}`);
  
  switch (eventName) {
    case 'VoteDelegated':
      const { user, evermarkId, amount, cycle } = args;
      
      const stakeData = {
        user_id: user,
        evermark_id: evermarkId.toString(),
        amount: amount.toString(),
        tx_hash: transactionHash,
        status: 'confirmed' as const,
        created_at: new Date(blockTimestamp * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('stakes')
        .upsert(stakeData, { onConflict: 'user_id,evermark_id' });
      
      if (error) {
        throw new Error(`Failed to upsert stake: ${error.message}`);
      }
      
      // Update leaderboard in real-time
      await updateLeaderboard(evermarkId.toString());
      
      return { evermarkId, user, amount, cycle, action: 'vote_delegated' };
      
    case 'VoteUndelegated':
      const { user: unvoteUser, evermarkId: unvoteEvermarkId, amount: unvoteAmount, cycle: unvoteCycle } = args;
      
      const { error: deleteError } = await supabase
        .from('stakes')
        .delete()
        .eq('user_id', unvoteUser)
        .eq('evermark_id', unvoteEvermarkId.toString());
      
      if (deleteError) {
        console.warn(`⚠️ Failed to remove stake: ${deleteError.message}`);
      }
      
      await updateLeaderboard(unvoteEvermarkId.toString());
      
      return { evermarkId: unvoteEvermarkId, user: unvoteUser, amount: unvoteAmount, cycle: unvoteCycle, action: 'vote_undelegated' };
      
    case 'NewVotingCycle':
      const { cycleNumber, timestamp } = args;
      
      console.log(`🔄 New voting cycle ${cycleNumber} started at ${timestamp}`);
      return { cycleNumber, timestamp, action: 'new_cycle' };
      
    case 'CycleFinalized':
      const { cycleNumber: finalizedCycle, totalVotes, totalEvermarks } = args;
      
      console.log(`✅ Cycle ${finalizedCycle} finalized: ${totalVotes} votes, ${totalEvermarks} Evermarks`);
      return { cycleNumber: finalizedCycle, totalVotes, totalEvermarks, action: 'cycle_finalized' };
      
    default:
      return { message: `Voting event ${eventName} ignored` };
  }
}

async function handleLeaderboardEvent(eventName: string | undefined, args: any, blockTimestamp: number, transactionHash: string) {
  console.log(`🏆 Leaderboard event: ${eventName}`);
  
  switch (eventName) {
    case 'LeaderboardUpdated':
      const { cycle, evermarkId, newVotes, position } = args;
      
      // Update our leaderboard cache
      await supabase
        .from('leaderboard')
        .upsert({
          evermark_id: evermarkId.toString(),
          total_votes: newVotes.toString(),
          rank: position,
          cycle_id: cycle,
          updated_at: new Date().toISOString()
        }, { onConflict: 'evermark_id' });
      
      return { cycle, evermarkId, newVotes, position, action: 'leaderboard_updated' };
      
    case 'CycleInitialized':
      const { cycle: initCycle } = args;
      
      console.log(`🆕 Leaderboard cycle ${initCycle} initialized`);
      return { cycle: initCycle, action: 'cycle_initialized' };
      
    default:
      return { message: `Leaderboard event ${eventName} ignored` };
  }
}

async function updateLeaderboard(evermarkId: string) {
  // Recalculate total votes for this Evermark
  const { data: stakes } = await supabase
    .from('stakes')
    .select('amount')
    .eq('evermark_id', evermarkId)
    .eq('status', 'confirmed');
  
  if (stakes) {
    const totalVotes = stakes.reduce((sum, stake) => sum + BigInt(stake.amount), BigInt(0));
    
    await supabase
      .from('leaderboard')
      .upsert({
        evermark_id: evermarkId,
        total_votes: totalVotes.toString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'evermark_id' });
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
  
  // Fetch from IPFS
  const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
  
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
}