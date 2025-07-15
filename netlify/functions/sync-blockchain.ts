// netlify/functions/sync-blockchain.ts - MINIMAL DEBUG VERSION
import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  try {
    console.log('🔍 Function started successfully');
    
    // Step 1: Check if we can return a basic response
    const basicInfo = {
      timestamp: new Date().toISOString(),
      method: request.method,
      nodeVersion: process.version,
      platform: process.platform,
    };
    
    console.log('Basic info:', basicInfo);
    
    // Step 2: Check environment variables
    const envCheck = {
      // Check all possible environment variable names
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
      THIRDWEB_CLIENT_ID: !!process.env.THIRDWEB_CLIENT_ID,
      VITE_THIRDWEB_CLIENT_ID: !!process.env.VITE_THIRDWEB_CLIENT_ID,
      EVERMARK_NFT_ADDRESS: !!process.env.EVERMARK_NFT_ADDRESS,
      VITE_EVERMARK_NFT_ADDRESS: !!process.env.VITE_EVERMARK_NFT_ADDRESS,
      
      // Show first few characters for debugging (safe to log)
      supabaseUrlStart: process.env.SUPABASE_URL?.slice(0, 20) || 
                       process.env.VITE_SUPABASE_URL?.slice(0, 20) || 'MISSING',
      contractStart: process.env.EVERMARK_NFT_ADDRESS?.slice(0, 10) || 
                    process.env.VITE_EVERMARK_NFT_ADDRESS?.slice(0, 10) || 'MISSING',
      
      // Count total env vars available
      totalEnvVars: Object.keys(process.env).length,
      
      // List some env var names (for debugging)
      sampleEnvVars: Object.keys(process.env).slice(0, 10)
    };
    
    console.log('Environment check:', envCheck);
    
    // Step 3: Try importing Supabase
    let supabaseImportStatus = 'not-attempted';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabaseImportStatus = 'success';
      console.log('✅ Supabase import successful');
    } catch (error) {
      supabaseImportStatus = `failed: ${error}`;
      console.error('❌ Supabase import failed:', error);
    }
    
    // Step 4: Try importing ThirdWeb
    let thirdwebImportStatus = 'not-attempted';
    try {
      const thirdweb = await import('thirdweb');
      thirdwebImportStatus = 'success';
      console.log('✅ ThirdWeb import successful');
    } catch (error) {
      thirdwebImportStatus = `failed: ${error}`;
      console.error('❌ ThirdWeb import failed:', error);
    }
    
    // Step 5: Return comprehensive diagnostic
    return Response.json({
      status: 'debug-success',
      message: 'Function is working, showing diagnostic info',
      basicInfo,
      envCheck,
      imports: {
        supabase: supabaseImportStatus,
        thirdweb: thirdwebImportStatus
      },
      recommendations: {
        missingEnvVars: [
          !envCheck.SUPABASE_URL && !envCheck.VITE_SUPABASE_URL && 'SUPABASE_URL',
          !envCheck.SUPABASE_ANON_KEY && !envCheck.VITE_SUPABASE_ANON_KEY && 'SUPABASE_ANON_KEY',
          !envCheck.THIRDWEB_CLIENT_ID && !envCheck.VITE_THIRDWEB_CLIENT_ID && 'THIRDWEB_CLIENT_ID',
          !envCheck.EVERMARK_NFT_ADDRESS && !envCheck.VITE_EVERMARK_NFT_ADDRESS && 'EVERMARK_NFT_ADDRESS'
        ].filter(Boolean),
        nextSteps: [
          'Check Netlify environment variables',
          'Verify function deployment',
          'Check import dependencies'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Function failed at basic level:', error);
    
    return Response.json({
      status: 'debug-error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};