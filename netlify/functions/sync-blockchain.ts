import type { Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseKey,
  urlPreview: supabaseUrl ? supabaseUrl.slice(0, 20) + '...' : 'missing',
  keyPreview: supabaseKey ? 'sk-...' + supabaseKey.slice(-6) : 'missing'
});

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async (request: Request, context: Context) => {
  console.log('🔄 Sync-blockchain function called:', {
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
    hasSupabase: !!supabase,
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey
  });

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

  try {
    // Health check for GET requests
    if (request.method === 'GET') {
      console.log('📊 Health check requested');
      
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'sync-blockchain',
        version: '1.0.1',
        environment: {
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          canConnectToSupabase: !!supabase,
          nodeEnv: process.env.NODE_ENV || 'unknown'
        }
      };

      // Test Supabase connection if available
      if (supabase) {
        try {
          console.log('🧪 Testing Supabase connection...');
          
          // Simple test query
          const { data, error } = await supabase
            .from('sync_logs')
            .select('id')
            .limit(1);
          
          if (error) {
            console.warn('⚠️ Supabase test query failed:', error.message);
            (healthData as any).supabaseTest = { success: false, error: error.message };
          } else {
            console.log('✅ Supabase connection successful');
            (healthData as any).supabaseTest = { success: true };
          }
        } catch (testError) {
          console.warn('⚠️ Supabase connection test error:', testError);
          (healthData as any).supabaseTest = { 
            success: false, 
            error: testError instanceof Error ? testError.message : 'Unknown error' 
          };
        }
      } else {
        (healthData as any).supabaseTest = { 
          success: false, 
          error: 'Supabase client not initialized - missing environment variables' 
        };
      }

      return new Response(JSON.stringify(healthData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Handle POST requests for actual sync
    if (request.method === 'POST') {
      console.log('🔄 Sync operation requested');
      
      // Check if we have required environment variables
      if (!supabase) {
        const errorMsg = 'Missing Supabase configuration - check SUPABASE_URL and SUPABASE_ANON_KEY environment variables';
        console.error('❌', errorMsg);
        
        return new Response(JSON.stringify({
          success: false,
          error: errorMsg,
          debug: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            timestamp: new Date().toISOString(),
            help: 'Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify environment variables'
          }
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Log sync attempt
      console.log('📝 Logging sync attempt...');
      
      const syncStartTime = Date.now();
      let syncLogId: string | null = null;
      
      try {
        const { data: logData, error: logError } = await supabase
          .from('sync_logs')
          .insert({
            event_type: 'manual_sync',
            status: 'started',
            processed_at: new Date().toISOString(),
            details: { 
              triggered_by: 'manual',
              function_version: '1.0.1',
              timestamp: new Date().toISOString()
            }
          })
          .select('id')
          .single();

        if (logError) {
          console.warn('⚠️ Failed to log sync attempt:', logError.message);
        } else {
          syncLogId = logData?.id;
          console.log('✅ Sync attempt logged with ID:', syncLogId);
        }
      } catch (logErr) {
        console.warn('⚠️ Error logging sync attempt:', logErr);
      }

      // Perform actual sync operations
      console.log('⚡ Performing sync operations...');
      
      const syncResults = {
        evermarksChecked: 0,
        evermarksUpdated: 0,
        stakesChecked: 0,
        stakesUpdated: 0,
        errors: [] as string[],
        warnings: [] as string[],
        startTime: new Date().toISOString(),
        endTime: '',
        duration: 0,
        success: true
      };

      try {
        // 1. Check Evermarks table
        console.log('🔍 Checking Evermarks...');
        const { data: evermarks, error: evermarksError } = await supabase
          .from('evermarks')
          .select('id, title, created_at')
          .order('created_at', { ascending: false })
          .limit(100);

        if (evermarksError) {
          syncResults.errors.push(`Evermarks query failed: ${evermarksError.message}`);
          syncResults.success = false;
        } else {
          syncResults.evermarksChecked = evermarks?.length || 0;
          console.log(`✅ Found ${syncResults.evermarksChecked} Evermarks`);
        }

        // 2. Check Stakes table
        console.log('🔍 Checking Stakes...');
        const { data: stakes, error: stakesError } = await supabase
          .from('stakes')
          .select('user_id, evermark_id, amount, status')
          .order('created_at', { ascending: false })
          .limit(100);

        if (stakesError) {
          syncResults.errors.push(`Stakes query failed: ${stakesError.message}`);
          syncResults.success = false;
        } else {
          syncResults.stakesChecked = stakes?.length || 0;
          console.log(`✅ Found ${syncResults.stakesChecked} Stakes`);
        }

        // 3. Check sync_logs table health
        console.log('🔍 Checking sync logs...');
        const { data: recentLogs, error: logsError } = await supabase
          .from('sync_logs')
          .select('event_type, status, processed_at')
          .order('processed_at', { ascending: false })
          .limit(10);

        if (logsError) {
          syncResults.warnings.push(`Sync logs query failed: ${logsError.message}`);
        } else {
          console.log(`✅ Found ${recentLogs?.length || 0} recent sync logs`);
        }

        // Calculate duration
        const endTime = Date.now();
        syncResults.duration = endTime - syncStartTime;
        syncResults.endTime = new Date().toISOString();

        console.log('✅ Sync operation completed:', {
          duration: syncResults.duration,
          success: syncResults.success,
          errors: syncResults.errors.length,
          warnings: syncResults.warnings.length
        });

        // Update sync log with results
        if (syncLogId) {
          try {
            await supabase
              .from('sync_logs')
              .update({
                status: syncResults.success ? 'completed' : 'failed',
                details: {
                  ...syncResults,
                  completed_at: new Date().toISOString()
                }
              })
              .eq('id', syncLogId);
          } catch (updateErr) {
            console.warn('⚠️ Failed to update sync log:', updateErr);
          }
        }

        return new Response(JSON.stringify({
          success: syncResults.success,
          message: syncResults.success ? 'Sync completed successfully' : 'Sync completed with errors',
          stats: {
            evermarksChecked: syncResults.evermarksChecked,
            stakesChecked: syncResults.stakesChecked,
            duration: `${syncResults.duration}ms`,
            errors: syncResults.errors.length,
            warnings: syncResults.warnings.length
          },
          details: syncResults.errors.length > 0 || syncResults.warnings.length > 0 ? {
            errors: syncResults.errors,
            warnings: syncResults.warnings
          } : undefined,
          timestamp: new Date().toISOString()
        }), {
          status: syncResults.success ? 200 : 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });

      } catch (syncError) {
        console.error('❌ Sync operation failed:', syncError);
        
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
        
        // Update sync log with error
        if (syncLogId) {
          try {
            await supabase
              .from('sync_logs')
              .update({
                status: 'failed',
                details: {
                  error: errorMessage,
                  failed_at: new Date().toISOString(),
                  duration: Date.now() - syncStartTime
                }
              })
              .eq('id', syncLogId);
          } catch (updateErr) {
            console.warn('⚠️ Failed to update sync log with error:', updateErr);
          }
        }

        return new Response(JSON.stringify({
          success: false,
          error: 'Sync operation failed',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Method not allowed
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      allowed: ['GET', 'POST'],
      received: request.method
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Function execution error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
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