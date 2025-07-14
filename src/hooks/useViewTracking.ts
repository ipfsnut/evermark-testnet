// src/hooks/useViewTracking.ts
import { useState, useEffect, useCallback } from 'react';

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

// Simple localStorage-based tracking for now
// In production, this would be API calls to your backend
export function useViewTracking(evermarkId: string): ViewTrackingResult {
  const [viewStats, setViewStats] = useState<ViewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate a simple user fingerprint for basic deduplication
  const getUserFingerprint = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 2, 2);
    const fingerprint = canvas.toDataURL();
    return btoa(fingerprint + navigator.userAgent).slice(0, 32);
  }, []);

  // Load existing view stats
  const loadViewStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For now, use localStorage. In production, this would be an API call
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
  }, [evermarkId]);

  // Track a new view
  const trackView = useCallback(async () => {
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
        return;
      }
      
      // Update view tracking
      localStorage.setItem(viewKey, now.toISOString());
      
      // Update stats
      setViewStats(prevStats => {
        if (!prevStats) return null;
        
        const newStats: ViewStats = {
          totalViews: prevStats.totalViews + 1,
          viewsToday: prevStats.viewsToday + 1,
          viewsThisWeek: prevStats.viewsThisWeek + 1,
          lastUpdated: now
        };
        
        // Persist to localStorage (in production, send to API)
        localStorage.setItem(`evermark_views_${evermarkId}`, JSON.stringify(newStats));
        
        console.log(`📊 Tracked view for Evermark ${evermarkId}:`, newStats);
        return newStats;
      });
      
      // In production, you'd also send this to your backend:
      // await fetch('/api/views/track', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     evermarkId,
      //     fingerprint,
      //     userAgent: navigator.userAgent,
      //     referrer: document.referrer,
      //     timestamp: now.toISOString()
      //   })
      // });
      
    } catch (err) {
      console.error('Error tracking view:', err);
      setError('Failed to track view');
    }
  }, [evermarkId, getUserFingerprint]);

  // Load stats on mount
  useEffect(() => {
    if (evermarkId) {
      loadViewStats();
    }
  }, [evermarkId, loadViewStats]);

  // Track view on mount (with slight delay to avoid bot-like behavior)
  useEffect(() => {
    if (evermarkId && viewStats) {
      const timer = setTimeout(() => {
        trackView();
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timer);
    }
  }, [evermarkId, viewStats]); // Remove trackView from dependencies to prevent infinite loop

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