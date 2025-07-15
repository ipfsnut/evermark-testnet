// netlify/functions/webhook-evermark.ts
import type { Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async (request: Request, context: Context) => {
  console.log('🎯 Evermark webhook received:', {
    method: request.method,
    timestamp: new Date().toISOString(),
    url: request.url
  });

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-thirdweb-signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      }
    });
  }

  // Handle GET requests for health checks
  if (request.method === 'GET') {
    console.log('📊 Health check requested');
    return new Response(JSON.stringify({
      status: 'healthy',
      service: 'evermark-webhook',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Only allow POST for webhook events
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      allowed: ['GET', 'POST', 'OPTIONS']
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // Parse the webhook payload
    const payload = await request.json();
    
    console.log('📦 Webhook payload received:', {
      eventType: payload.eventType,
      transactionHash: payload.transaction?.transactionHash,
      blockNumber: payload.transaction?.blockNumber,
      logsCount: payload.logs?.length || 0,
      hasTransaction: !!payload.transaction,
      hasLogs: !!payload.logs
    });

    // Log ALL webhook events to Supabase for debugging
    await logWebhookEvent(payload, 'received');

    // Process specific event types
    let processed = false;
    let processingResult: any = null;

    switch (payload.eventType) {
      case 'EvermarkMinted':
        processingResult = await handleEvermarkMinted(payload);
        processed = true;
        break;
        
      case 'Wrapped':
        processingResult = await handleWrapped(payload);
        processed = true;
        break;
        
      case 'VoteDelegated':
        processingResult = await handleVoteDelegated(payload);
        processed = true;
        break;
        
      case 'UnwrapRequested':
        processingResult = await handleUnwrapRequested(payload);
        processed = true;
        break;
        
      case 'UnwrapCompleted':
        processingResult = await handleUnwrapCompleted(payload);
        processed = true;
        break;
        
      default:
        console.log('ℹ️ Unhandled event type:', payload.eventType);
        await logWebhookEvent(payload, 'unhandled');
        processed = false;
    }

    const response = {
      status: 'success',
      eventType: payload.eventType,
      processed: processed,
      processingResult: processingResult,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Webhook processed successfully:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Log error to Supabase
    try {
      await supabase.from('sync_logs').insert({
        event_type: 'webhook_error',
        status: 'failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        },
        processed_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log error to Supabase:', logError);
    }

    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
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

// Helper function to log webhook events
async function logWebhookEvent(payload: any, status: string) {
  try {
    await supabase.from('sync_logs').insert({
      event_type: 'webhook_received',
      status: status,
      details: {
        eventType: payload.eventType,
        transactionHash: payload.transaction?.transactionHash,
        blockNumber: payload.transaction?.blockNumber,
        logsCount: payload.logs?.length || 0,
        timestamp: new Date().toISOString(),
        rawPayload: payload
      },
      processed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}

// Handle EvermarkMinted events
async function handleEvermarkMinted(payload: any) {
  console.log('🎨 Processing EvermarkMinted event...');
  
  try {
    if (!payload.logs || payload.logs.length === 0) {
      throw new Error('No logs found in EvermarkMinted event');
    }

    const log = payload.logs[0];
    const transaction = payload.transaction;
    
    if (!log.topics || log.topics.length < 4) {
      throw new Error('Invalid log topics for EvermarkMinted event');
    }

    // Extract data from the event log
    // EvermarkMinted(uint256 indexed tokenId, address indexed minter, address indexed referrer, string title)
    const tokenId = parseInt(log.topics[1], 16).toString();
    const minter = `0x${log.topics[2].slice(26)}`; // Remove padding from indexed address
    const referrer = log.topics[3] !== '0x0000000000000000000000000000000000000000' 
      ? `0x${log.topics[3].slice(26)}` 
      : null;

    // For now, we'll use a basic title since decoding the non-indexed string parameter requires ABI
    const title = `Evermark #${tokenId}`;

    const evermark = {
      id: tokenId,
      title: title,
      description: `Evermark created by ${minter}`,
      author: minter,
      tx_hash: transaction.transactionHash,
      block_number: transaction.blockNumber,
      created_at: new Date().toISOString(),
      metadata: {
        minter,
        referrer,
        tokenId,
        source: 'webhook',
        webhookProcessedAt: new Date().toISOString(),
        rawLog: log
      }
    };

    // Upsert to handle potential duplicates
    const { data, error } = await supabase
      .from('evermarks')
      .upsert(evermark, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ EvermarkMinted processed:', tokenId, title);
    return { success: true, tokenId, title, minter };
    
  } catch (error) {
    console.error('❌ Error processing EvermarkMinted:', error);
    throw error;
  }
}

// Handle staking events (Wrapped)
async function handleWrapped(payload: any) {
  console.log('📦 Processing Wrapped event...');
  
  try {
    if (!payload.logs || payload.logs.length === 0) {
      throw new Error('No logs found in Wrapped event');
    }

    const log = payload.logs[0];
    
    if (!log.topics || log.topics.length < 2) {
      throw new Error('Invalid log topics for Wrapped event');
    }

    // Wrapped(address indexed user, uint256 amount)
    const user = `0x${log.topics[1].slice(26)}`; // Remove padding
    const amount = BigInt(log.data || '0x0').toString();

    const stakeRecord = {
      user_id: user,
      staked_amount: amount,
      status: 'active',
      last_updated: new Date().toISOString(),
      metadata: {
        source: 'webhook',
        transactionHash: payload.transaction?.transactionHash,
        blockNumber: payload.transaction?.blockNumber,
        webhookProcessedAt: new Date().toISOString()
      }
    };

    // Upsert stake record
    const { data, error } = await supabase
      .from('stakes')
      .upsert(stakeRecord, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ Wrapped processed:', user, amount);
    return { success: true, user, amount };
    
  } catch (error) {
    console.error('❌ Error processing Wrapped:', error);
    throw error;
  }
}

// Handle voting events
async function handleVoteDelegated(payload: any) {
  console.log('🗳️ Processing VoteDelegated event...');
  
  try {
    if (!payload.logs || payload.logs.length === 0) {
      throw new Error('No logs found in VoteDelegated event');
    }

    const log = payload.logs[0];
    
    if (!log.topics || log.topics.length < 4) {
      throw new Error('Invalid log topics for VoteDelegated event');
    }

    // VoteDelegated(address indexed user, uint256 indexed evermarkId, uint256 amount, uint256 indexed cycle)
    const user = `0x${log.topics[1].slice(26)}`;
    const evermarkId = parseInt(log.topics[2], 16).toString();
    const cycle = parseInt(log.topics[3], 16);
    const amount = BigInt(log.data || '0x0').toString();

    const voteRecord = {
      user_id: user,
      evermark_id: evermarkId,
      cycle: cycle,
      amount: amount,
      action: 'delegate',
      created_at: new Date().toISOString(),
      metadata: {
        source: 'webhook',
        transactionHash: payload.transaction?.transactionHash,
        blockNumber: payload.transaction?.blockNumber,
        webhookProcessedAt: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('votes')
      .insert(voteRecord)
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ VoteDelegated processed:', user, evermarkId, amount);
    return { success: true, user, evermarkId, cycle, amount };
    
  } catch (error) {
    console.error('❌ Error processing VoteDelegated:', error);
    throw error;
  }
}

// Handle unwrap requested events
async function handleUnwrapRequested(payload: any) {
  console.log('⏳ Processing UnwrapRequested event...');
  
  try {
    if (!payload.logs || payload.logs.length === 0) {
      throw new Error('No logs found in UnwrapRequested event');
    }

    const log = payload.logs[0];
    const user = `0x${log.topics[1].slice(26)}`;
    
    // For UnwrapRequested, we might need to decode the data field for amount and releaseTime
    // For now, we'll create a basic record
    const unbondingRecord = {
      user_id: user,
      amount: '0', // TODO: Decode from log.data
      release_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      status: 'pending',
      created_at: new Date().toISOString(),
      metadata: {
        source: 'webhook',
        transactionHash: payload.transaction?.transactionHash,
        blockNumber: payload.transaction?.blockNumber,
        webhookProcessedAt: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('unbonding_requests')
      .insert(unbondingRecord)
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ UnwrapRequested processed:', user);
    return { success: true, user };
    
  } catch (error) {
    console.error('❌ Error processing UnwrapRequested:', error);
    throw error;
  }
}

// Handle unwrap completed events
async function handleUnwrapCompleted(payload: any) {
  console.log('✅ Processing UnwrapCompleted event...');
  
  try {
    if (!payload.logs || payload.logs.length === 0) {
      throw new Error('No logs found in UnwrapCompleted event');
    }

    const log = payload.logs[0];
    const user = `0x${log.topics[1].slice(26)}`;
    const amount = BigInt(log.data || '0x0').toString();

    // Update the unbonding request to completed
    const { data, error } = await supabase
      .from('unbonding_requests')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      })
      .eq('user_id', user)
      .eq('status', 'pending')
      .select();

    if (error) {
      throw error;
    }

    // Also update the stake amount
    const { data: currentStake } = await supabase
      .from('stakes')
      .select('staked_amount')
      .eq('user_id', user)
      .single();

    if (currentStake && currentStake.staked_amount) {
      const newAmount = (BigInt(currentStake.staked_amount) - BigInt(amount)).toString();
      await supabase
        .from('stakes')
        .update({ 
          staked_amount: newAmount, 
          last_updated: new Date().toISOString() 
        })
        .eq('user_id', user);
    }

    console.log('✅ UnwrapCompleted processed:', user, amount);
    return { success: true, user, amount };
    
  } catch (error) {
    console.error('❌ Error processing UnwrapCompleted:', error);
    throw error;
  }
}