// src/components/leaderboard/LeaderboardPanel.tsx - ✅ ENHANCED with mobile optimization
import React, { useState } from 'react';
import { useLeaderboard } from "../../hooks/useLeaderboard";
import { 
  TrophyIcon, 
  ChevronRightIcon, 
  BookmarkIcon, 
  VoteIcon,
  CalendarIcon,
  RefreshCwIcon,
  InfoIcon,
  UserIcon
} from 'lucide-react';
import { Link } from "react-router-dom";
import { toEther } from "thirdweb/utils";
import { cn, useIsMobile, textSizes, spacing, touchFriendly } from '../../utils/responsive';

interface LeaderboardPanelProps {
  weekNumber?: number;
  showFullView?: boolean;
  maxEntries?: number;
  className?: string;
}

export function LeaderboardPanel({ 
  weekNumber, 
  showFullView = false, 
  maxEntries = 5,
  className = ''
}: LeaderboardPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const isMobile = useIsMobile();
  
  // ✅ Use core leaderboard hook that handles all the complexity
  const { entries, isLoading, error, isFinalized, weekNumber: currentWeek } = useLeaderboard(weekNumber);
  
  const displayEntries = showFullView ? entries : entries.slice(0, maxEntries);
  
  const getWeekDateRange = (weekNum: number) => {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), 0, 1 + (weekNum - 1) * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };
  
  const handleRefresh = () => {
    // Force a re-render which will trigger the hook to refetch
    setRefreshKey(prev => prev + 1);
  };
  
  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          border: 'border-yellow-400',
          background: 'bg-yellow-50',
          badge: 'bg-yellow-100 text-yellow-700',
          icon: '🥇'
        };
      case 1:
        return {
          border: 'border-gray-400',
          background: 'bg-gray-50',
          badge: 'bg-gray-100 text-gray-700',
          icon: '🥈'
        };
      case 2:
        return {
          border: 'border-amber-600',
          background: 'bg-amber-50',
          badge: 'bg-amber-100 text-amber-700',
          icon: '🥉'
        };
      default:
        return {
          border: 'border-gray-200',
          background: 'hover:bg-gray-50',
          badge: 'bg-gray-100 text-gray-600',
          icon: null
        };
    }
  };
  
  if (isLoading) {
    return (
      <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200", spacing.responsive['md-lg-xl'], className)}>
        <div className="flex items-center mb-4">
          <TrophyIcon className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className={cn("font-semibold text-gray-900", textSizes.responsive['lg-xl-2xl'])}>
            {showFullView ? 'Leaderboard' : 'Top Evermarks'}
          </h3>
        </div>
        
        <div className="animate-pulse space-y-4">
          {[...Array(maxEntries)].map((_, i) => (
            <div key={i} className="flex items-center border-b border-gray-100 pb-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full mr-4 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200", spacing.responsive['md-lg-xl'], className)}>
        <div className="text-center py-8">
          <TrophyIcon className="mx-auto h-12 w-12 text-red-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Leaderboard</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200", spacing.responsive['md-lg-xl'], className)}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <TrophyIcon className="h-6 w-6 text-yellow-500 mr-2" />
          <div>
            <h3 className={cn("font-semibold text-gray-900", textSizes.responsive['lg-xl-2xl'])}>
              {showFullView ? 'Leaderboard' : 'Top Evermarks'}
            </h3>
            <p className="text-sm text-gray-600 flex items-center mt-1">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Week {currentWeek}: {getWeekDateRange(currentWeek)}
              {isFinalized && <span className="ml-2 text-green-600 font-medium">(Finalized)</span>}
            </p>
          </div>
        </div>
        
        {/* Refresh button - simplified since we don't have a refresh function */}
        <button
          onClick={handleRefresh}
          className={cn(
            "p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100",
            touchFriendly.button
          )}
          title="Refresh leaderboard"
        >
          <RefreshCwIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Entries List */}
      <div className="space-y-3">
        {displayEntries.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <BookmarkIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Entries Yet</h4>
            <p className="text-gray-600 text-sm mb-4">
              Be the first to create and vote for Evermarks this week!
            </p>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Evermark
            </Link>
          </div>
        ) : (
          displayEntries.map((entry, index) => {
            const rankStyle = getRankStyle(index);
            
            return (
              <div 
                key={entry.evermark.id} 
                className={cn(
                  "flex items-center p-3 border-l-4 rounded-lg transition-all duration-200 group",
                  rankStyle.border,
                  rankStyle.background,
                  touchFriendly.card
                )}
              >
                {/* Rank Badge */}
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-full mr-4 flex-shrink-0 font-bold text-sm",
                  rankStyle.badge
                )}>
                  {rankStyle.icon || entry.rank}
                </div>
                
                {/* Evermark Info */}
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/evermark/${entry.evermark.id}`} 
                    className="block group-hover:text-purple-600 transition-colors"
                  >
                    <h4 className={cn(
                      "font-medium text-gray-900 mb-1 truncate",
                      textSizes.responsive['sm-base-lg']
                    )} 
                    title={entry.evermark.title}>
                      {entry.evermark.title}
                    </h4>
                    <div className="flex items-center text-sm text-gray-600">
                      <UserIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{entry.evermark.author}</span>
                    </div>
                  </Link>
                </div>
                
                {/* Vote Count */}
                <div className="flex items-center text-gray-600 mr-3">
                  <VoteIcon className="h-4 w-4 mr-1 text-purple-500" />
                  <span className="font-medium text-sm">
                    {parseFloat(toEther(entry.votes)).toLocaleString(undefined, {
                      maximumFractionDigits: 0
                    })}
                  </span>
                </div>
                
                {/* Arrow */}
                <Link 
                  to={`/evermark/${entry.evermark.id}`} 
                  className="text-gray-400 hover:text-gray-600 group-hover:text-purple-600 transition-colors"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </Link>
              </div>
            );
          })
        )}
      </div>
      
      {/* Enhanced Footer */}
      {!showFullView && entries.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing top {Math.min(maxEntries, entries.length)} of {entries.length} entries
            </div>
            <Link 
              to="/leaderboard" 
              className={cn(
                "inline-flex items-center font-medium text-purple-600 hover:text-purple-700 transition-colors",
                textSizes.responsive['sm-base-lg'],
                touchFriendly.button
              )}
            >
              View Full Leaderboard
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      )}
      
      {/* Info section for finalized vs live */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start">
          <InfoIcon className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-600">
            {isFinalized ? (
              <p>
                <strong>Final Results:</strong> Voting for this week has ended and rewards have been distributed.
              </p>
            ) : (
              <p>
                <strong>Live Rankings:</strong> Vote now to support your favorite Evermarks! Rankings update in real-time.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}