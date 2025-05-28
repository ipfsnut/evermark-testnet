// netlify/functions/shares.ts
import type { Context } from "@netlify/functions";

interface ShareTrackingData {
  evermarkId: string;
  platform: string;
  timestamp: string;
  userAgent?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface ShareStats {
  evermarkId: string;
  platform: string;
  count: number;
  lastShared: string;
}

// In-memory storage for demo (in production, use a real database)
const shareStats = new Map<string, ShareStats>();

export default async (request: Request, context: Context) => {
  console.log('Share tracking request:', request.method, request.url);
  
  // Handle CORS preflight
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
  
  // Health check endpoint
  if (request.method === 'GET') {
    const totalShares = Array.from(shareStats.values()).reduce((sum, stat) => sum + stat.count, 0);
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'evermark-share-tracking',
      version: '1.0.0',
      stats: {
        totalShares,
        uniqueEvermarks: shareStats.size,
        platforms: [...new Set(Array.from(shareStats.values()).map(s => s.platform))]
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
  
  // Only handle POST requests for tracking
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { 
        status: 405,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
  
  try {
    const body = await request.text();
    let shareData: ShareTrackingData;
    
    try {
      shareData = JSON.parse(body);
    } catch (parseError) {
      return Response.json(
        { error: 'Invalid JSON body' },
        { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }
    
    // Validate required fields
    if (!shareData.evermarkId || !shareData.platform || !shareData.timestamp) {
      return Response.json(
        { error: 'Missing required fields: evermarkId, platform, timestamp' },
        { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }
    
    // Create unique key for this evermark-platform combination
    const statKey = `${shareData.evermarkId}-${shareData.platform}`;
    
    // Update stats
    const currentStat = shareStats.get(statKey);
    if (currentStat) {
      currentStat.count += 1;
      currentStat.lastShared = shareData.timestamp;
    } else {
      shareStats.set(statKey, {
        evermarkId: shareData.evermarkId,
        platform: shareData.platform,
        count: 1,
        lastShared: shareData.timestamp
      });
    }
    
    // Log the share event (in production, store in database)
    console.log('📤 Share tracked:', {
      evermarkId: shareData.evermarkId,
      platform: shareData.platform,
      timestamp: shareData.timestamp,
      userAgent: shareData.userAgent,
      utm_source: shareData.utm_source,
      totalShares: shareStats.get(statKey)?.count
    });
    
    // In production, you would store this in a database like:
    // await db.collection('shares').add({
    //   evermarkId: shareData.evermarkId,
    //   platform: shareData.platform,
    //   timestamp: new Date(shareData.timestamp),
    //   userAgent: shareData.userAgent,
    //   referrer: shareData.referrer,
    //   utm_source: shareData.utm_source,
    //   utm_medium: shareData.utm_medium,
    //   utm_campaign: shareData.utm_campaign,
    //   ip: request.headers.get('x-forwarded-for') || 'unknown'
    // });
    
    return Response.json({
      success: true,
      message: 'Share tracked successfully',
      stats: {
        evermarkId: shareData.evermarkId,
        platform: shareData.platform,
        totalSharesForThisPlatform: shareStats.get(statKey)?.count || 0
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
    
  } catch (error) {
    console.error('Share tracking error:', error);
    
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};