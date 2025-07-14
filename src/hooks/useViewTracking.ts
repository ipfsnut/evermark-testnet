// src/hooks/useViewTracking.ts - FIXED: Remove infinite loops
import { useState, useEffect, useCallback, useRef } from 'react';

interface ViewStats {
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  lastUpdated: Date;
}

interface ViewTrackingResult {
  viewStats: ViewStats | null;
  isLoading: boolean;
  error: string | null;
  trackView: () => Promise<void>;
}

// FIXED: Simple localStorage-based tracking without infinite loops
export function useViewTracking(evermarkId: string): ViewTrackingResult {
  const [viewStats, setViewStats] = useState<ViewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // FIXED: Use ref to track if view has been tracked this session
  const hasTrackedView = useRef(false);

  // Generate a simple user fingerprint for basic deduplication
  const getUserFingerprint = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 2, 2);
    const fingerprint = canvas.toDataURL();
    return btoa(fingerprint + navigator.userAgent).slice(0, 32);
  }, []);

  // FIXED: Stable trackView function that doesn't change on every render
  const trackView = useCallback(async () => {
    // FIXED: Prevent multiple tracking in the same session
    if (hasTrackedView.current) {
      console.log('View already tracked this session');
      return;
    }

    try {
      const fingerprint = getUserFingerprint();
      const viewKey = `view_${evermarkId}_${fingerprint}`;
      const now = new Date();
      
      // Check if this user already viewed today (basic deduplication)
      const lastView = localStorage.getItem(viewKey);
      const lastViewDate = lastView ? new Date(lastView) : null;
      
      const isNewView = !lastViewDate || 
        now.toDateString() !== lastViewDate.toDateString();
      
      if (!isNewView) {
        console.log('View already tracked today for this user');
        hasTrackedView.current = true; // Still mark as tracked to prevent retries
        return;
      }
      
      // Update view tracking
      localStorage.setItem(viewKey, now.toISOString());
      
      // FIXED: Update stats without triggering infinite loop
      setViewStats(prevStats => {
        if (!prevStats) return null;
        
        const newStats: ViewStats = {
          totalViews: prevStats.totalViews + 1,
          viewsToday: prevStats.viewsToday + 1,
          viewsThisWeek: prevStats.viewsThisWeek + 1,
          lastUpdated: now
        };
        
        // Persist to localStorage
        localStorage.setItem(`evermark_views_${evermarkId}`, JSON.stringify(newStats));
        
        console.log(`📊 Tracked view for Evermark ${evermarkId}:`, newStats);
        return newStats;
      });
      
      // Mark as tracked
      hasTrackedView.current = true;
      
    } catch (err) {
      console.error('Error tracking view:', err);
      setError('Failed to track view');
    }
  }, [evermarkId, getUserFingerprint]); // FIXED: Stable dependencies

  // FIXED: Load stats only once on mount
  useEffect(() => {
    if (!evermarkId) {
      setIsLoading(false);
      setError('No Evermark ID provided');
      return;
    }

    const loadViewStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load from localStorage
        const stored = localStorage.getItem(`evermark_views_${evermarkId}`);
        if (stored) {
          const data = JSON.parse(stored);
          setViewStats({
            ...data,
            lastUpdated: new Date(data.lastUpdated)
          });
        } else {
          // Initialize with zero stats
          const initialStats: ViewStats = {
            totalViews: 0,
            viewsToday: 0,
            viewsThisWeek: 0,
            lastUpdated: new Date()
          };
          setViewStats(initialStats);
        }
      } catch (err) {
        console.error('Error loading view stats:', err);
        setError('Failed to load view statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadViewStats();
  }, [evermarkId]); // FIXED: Only depend on evermarkId

  // FIXED: Auto-track view once when component is ready (no dependencies on changing values)
  useEffect(() => {
    if (evermarkId && viewStats && !hasTrackedView.current) {
      const timer = setTimeout(() => {
        trackView();
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timer);
    }
  }, [evermarkId, !!viewStats, trackView]); // FIXED: Use !!viewStats to avoid dependency on object

  return {
    viewStats,
    isLoading,
    error,
    trackView
  };
}

// Utility function to format view counts
export const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// Hook for getting aggregated view stats across multiple Evermarks
export function useAggregatedViews(evermarkIds: string[]) {
  const [totalViews, setTotalViews] = useState(0);
  
  useEffect(() => {
    let total = 0;
    evermarkIds.forEach(id => {
      const stored = localStorage.getItem(`evermark_views_${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        total += data.totalViews || 0;
      }
    });
    setTotalViews(total);
  }, [evermarkIds]);
  
  return { totalViews };
}