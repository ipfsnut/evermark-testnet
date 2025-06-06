import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ShareAnalytics {
  totalShares: number;
  uniqueEvermarks: number;
  platforms: string[];
  sharesThisWeek: number;
  avgSharesPerDay: number;
  platformBreakdown: Array<{
    platform: string;
    total_shares: number;
    unique_evermarks: number;
    shares_today: number;
    shares_this_week: number;
  }>;
}

interface EvermarkShareStats {
  evermarkId: string;
  totalShares: number;
  platformsUsed: number;
  platforms: string[];
  sharesToday: number;
  sharesThisWeek: number;
  sharesThisMonth: number;
  firstShared: string;
  lastShared: string;
}

export function useSupabaseShareAnalytics() {
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/.netlify/functions/shares', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'healthy' && data.stats) {
        setAnalytics(data.stats);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics
  };
}

export function useEvermarkShareAnalytics(evermarkId: string) {
  const [stats, setStats] = useState<EvermarkShareStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evermarkId) return;

    const fetchEvermarkStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('share_analytics')
          .select('*')
          .eq('evermark_id', evermarkId)
          .single();

        if (supabaseError) {
          if (supabaseError.code === 'PGRST116') {
            setStats({
              evermarkId,
              totalShares: 0,
              platformsUsed: 0,
              platforms: [],
              sharesToday: 0,
              sharesThisWeek: 0,
              sharesThisMonth: 0,
              firstShared: '',
              lastShared: ''
            });
          } else {
            throw supabaseError;
          }
        } else {
          setStats({
            evermarkId: data.evermark_id,
            totalShares: data.total_shares,
            platformsUsed: data.platforms_used,
            platforms: data.platforms || [],
            sharesToday: data.shares_today,
            sharesThisWeek: data.shares_this_week,
            sharesThisMonth: data.shares_this_month,
            firstShared: data.first_shared,
            lastShared: data.last_shared
          });
        }
      } catch (err: any) {
        console.error('Error fetching evermark stats:', err);
        setError(err.message || 'Failed to load evermark analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvermarkStats();
  }, [evermarkId]);

  return { stats, isLoading, error };
}

export function useTopSharedEvermarks(limit = 10, days = 30) {
  const [topEvermarks, setTopEvermarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopEvermarks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .rpc('get_top_shared_evermarks', { 
            limit_count: limit, 
            time_period: `${days} days`
          });

        if (supabaseError) throw supabaseError;

        setTopEvermarks(data || []);
      } catch (err: any) {
        console.error('Error fetching top evermarks:', err);
        setError(err.message || 'Failed to load top evermarks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopEvermarks();
  }, [limit, days]);

  return { topEvermarks, isLoading, error };
}

export function useSharingTrends(evermarkId?: string, days = 30) {
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .rpc('get_sharing_trends', { 
            evermark_id_param: evermarkId || null, 
            days_back: days 
          });

        if (supabaseError) throw supabaseError;

        setTrends(data || []);
      } catch (err: any) {
        console.error('Error fetching trends:', err);
        setError(err.message || 'Failed to load sharing trends');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrends();
  }, [evermarkId, days]);

  return { trends, isLoading, error };
}

export const EnhancedShareAnalyticsDashboard: React.FC = () => {
  const { analytics, isLoading: loadingGeneral, error: generalError, refetch } = useSupabaseShareAnalytics();
  const { topEvermarks, isLoading: loadingTop } = useTopSharedEvermarks(5, 7);
  const { trends, isLoading: loadingTrends } = useSharingTrends(undefined, 14);

  if (loadingGeneral) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (generalError) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load analytics: {generalError}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Share Analytics</h2>
          <button 
            onClick={refetch}
            className="text-sm text-purple-600 hover:text-purple-700"
          >
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{analytics?.totalShares?.toLocaleString() || 0}</div>
            <div className="text-sm text-blue-700">Total Shares</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{analytics?.uniqueEvermarks?.toLocaleString() || 0}</div>
            <div className="text-sm text-green-700">Shared Evermarks</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{analytics?.platforms?.length || 0}</div>
            <div className="text-sm text-purple-700">Platforms</div>
          </div>
          
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-3xl font-bold text-amber-600">{analytics?.avgSharesPerDay?.toLocaleString() || 0}</div>
            <div className="text-sm text-amber-700">Avg/Day</div>
          </div>
        </div>

        {analytics?.platformBreakdown && analytics.platformBreakdown.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Breakdown</h3>
            <div className="space-y-3">
              {analytics.platformBreakdown.map(platform => (
                <div key={platform.platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 capitalize">{platform.platform}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({platform.unique_evermarks} evermarks)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{platform.total_shares.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">
                      {platform.shares_this_week} this week
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!loadingTop && topEvermarks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Shared (Last 7 Days)</h3>
          <div className="space-y-3">
            {topEvermarks.map((evermark, index) => (
              <div key={evermark.evermark_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Evermark #{evermark.evermark_id}</div>
                    <div className="text-sm text-gray-500">
                      {evermark.platform_count} platforms
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{evermark.share_count}</div>
                  <div className="text-xs text-gray-500">shares</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sharing Trends (Last 14 Days)</h3>
        
        {loadingTrends ? (
          <div className="animate-pulse">
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        ) : trends && trends.length > 0 ? (
          <div className="space-y-3">
            {trends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    {new Date(trend.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {trend.platforms_active} platforms active
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{trend.total_shares}</div>
                  <div className="text-xs text-gray-500">shares</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No trending data available</div>
          </div>
        )}
      </div>
    </div>
  );
};