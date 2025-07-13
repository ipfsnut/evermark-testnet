// src/components/leaderboard/LeaderboardPanel.tsx - Dark Cyber Theme
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
  UserIcon,
  ZapIcon,
  CrownIcon
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
  
  // Use core leaderboard hook that handles all the complexity
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
          border: 'border-yellow-400/50',
          background: 'bg-yellow-900/20 hover:bg-yellow-900/30',
          badge: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/50',
          icon: '👑',
          glow: 'shadow-yellow-500/20'
        };
      case 1:
        return {
          border: 'border-gray-400/50',
          background: 'bg-gray-700/20 hover:bg-gray-700/30',
          badge: 'bg-gradient-to-r from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-500/50',
          icon: '🥈',
          glow: 'shadow-gray-500/20'
        };
      case 2:
        return {
          border: 'border-orange-400/50',
          background: 'bg-orange-900/20 hover:bg-orange-900/30',
          badge: 'bg-gradient-to-r from-orange-400 to-orange-600 text-black shadow-lg shadow-orange-500/50',
          icon: '🥉',
          glow: 'shadow-orange-500/20'
        };
      default:
        return {
          border: 'border-gray-600/50',
          background: 'bg-gray-800/20 hover:bg-gray-800/30',
          badge: 'bg-gray-800/80 text-cyan-400 border border-cyan-400/30',
          icon: null,
          glow: 'shadow-cyan-500/10'
        };
    }
  };
  
  if (isLoading) {
    return (
      <div className={cn(
        "bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 backdrop-blur-sm", 
        spacing.responsive['md-lg-xl'], 
        className
      )}>
        <div className="flex items-center mb-4">
          <TrophyIcon className="h-6 w-6 text-yellow-400 mr-2" />
          <h3 className={cn("font-semibold text-white", textSizes.responsive['lg-xl-2xl'])}>
            {showFullView ? 'Leaderboard' : 'Top Evermarks'}
          </h3>
        </div>
        
        <div className="animate-pulse space-y-4">
          {[...Array(maxEntries)].map((_, i) => (
            <div key={i} className="flex items-center border-b border-gray-700/50 pb-4">
              <div className="h-8 w-8 bg-gray-700 rounded-full mr-4 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-6 w-16 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={cn(
        "bg-gray-800/50 border border-red-500/30 rounded-lg shadow-lg shadow-gray-900/50 backdrop-blur-sm", 
        spacing.responsive['md-lg-xl'], 
        className
      )}>
        <div className="text-center py-8">
          <TrophyIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Leaderboard</h3>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-600/30 hover:border-red-400/50 transition-colors"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 backdrop-blur-sm", 
      spacing.responsive['md-lg-xl'], 
      className
    )}>
      {/* Enhanced Header with cyber styling */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mr-3 shadow-lg shadow-yellow-500/30">
            <TrophyIcon className="h-6 w-6 text-black" />
          </div>
          <div>
            <h3 className={cn("font-semibold text-white", textSizes.responsive['lg-xl-2xl'])}>
              {showFullView ? 'Leaderboard' : 'Top Evermarks'}
            </h3>
            <p className="text-sm text-gray-400 flex items-center mt-1">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Week {currentWeek}: {getWeekDateRange(currentWeek)}
              {isFinalized && <span className="ml-2 text-green-400 font-medium">(Finalized)</span>}
            </p>
          </div>
        </div>
        
        {/* Refresh button with cyber styling */}
        <button
          onClick={handleRefresh}
          className={cn(
            "p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-gray-700/30 border border-gray-600/50 hover:border-cyan-400/30",
            touchFriendly.button
          )}
          title="Refresh leaderboard"
        >
          <RefreshCwIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Entries List with enhanced dark styling */}
      <div className="space-y-3">
        {displayEntries.length === 0 ? (
          <div className="text-center py-12 bg-gray-700/20 rounded-lg border border-gray-600/30">
            <BookmarkIcon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No Entries Yet</h4>
            <p className="text-gray-400 text-sm mb-4">
              Be the first to create and vote for Evermarks this week!
            </p>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-500 hover:to-purple-600 transition-colors shadow-lg shadow-purple-500/30"
            >
              <ZapIcon className="h-4 w-4 mr-2" />
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
                  "flex items-center p-3 border-l-4 rounded-lg transition-all duration-200 group backdrop-blur-sm",
                  rankStyle.border,
                  rankStyle.background,
                  rankStyle.glow && `hover:shadow-lg ${rankStyle.glow}`,
                  touchFriendly.card
                )}
              >
                {/* Enhanced Rank Badge */}
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-full mr-4 flex-shrink-0 font-bold text-sm",
                  rankStyle.badge
                )}>
                  {rankStyle.icon || entry.rank}
                </div>
                
                {/* Evermark Info with enhanced styling */}
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/evermark/${entry.evermark.id}`} 
                    className="block group-hover:text-cyan-400 transition-colors"
                  >
                    <h4 className={cn(
                      "font-medium text-white mb-1 truncate group-hover:text-cyan-300",
                      textSizes.responsive['sm-base-lg']
                    )} 
                    title={entry.evermark.title}>
                      {entry.evermark.title}
                    </h4>
                    <div className="flex items-center text-sm text-gray-400">
                      <UserIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{entry.evermark.author}</span>
                    </div>
                  </Link>
                </div>
                
                {/* Enhanced Vote Count */}
                <div className="flex items-center text-gray-400 mr-3">
                  <div className="bg-green-900/30 border border-green-500/30 rounded px-2 py-1 flex items-center">
                    <ZapIcon className="h-4 w-4 mr-1 text-green-400" />
                    <span className="font-medium text-sm text-green-300">
                      {parseFloat(toEther(entry.votes)).toLocaleString(undefined, {
                        maximumFractionDigits: 0
                      })}
                    </span>
                  </div>
                </div>
                
                {/* Enhanced Arrow */}
                <Link 
                  to={`/evermark/${entry.evermark.id}`} 
                  className="text-gray-500 hover:text-cyan-400 group-hover:text-cyan-400 transition-colors"
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
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing top {Math.min(maxEntries, entries.length)} of {entries.length} entries
            </div>
            <Link 
              to="/leaderboard" 
              className={cn(
                "inline-flex items-center font-medium text-cyan-400 hover:text-cyan-300 transition-colors",
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
      
      {/* Enhanced info section for finalized vs live */}
      <div className="mt-4 p-3 bg-gray-700/20 border border-gray-600/30 rounded-lg backdrop-blur-sm">
        <div className="flex items-start">
          <InfoIcon className="h-4 w-4 text-cyan-400 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-300">
            {isFinalized ? (
              <p>
                <strong className="text-green-400">Final Results:</strong> Voting for this week has ended and rewards have been distributed.
              </p>
            ) : (
              <p>
                <strong className="text-cyan-400">Live Rankings:</strong> Vote now to support your favorite Evermarks! Rankings update in real-time.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}