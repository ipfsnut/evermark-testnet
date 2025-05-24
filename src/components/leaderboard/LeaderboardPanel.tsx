import React from "react";
import { useLeaderboard } from "../../hooks/useLeaderboard";
import { TrophyIcon, ChevronRightIcon, BookmarkIcon, VoteIcon } from 'lucide-react';
import { Link } from "react-router-dom";
import { toEther } from "thirdweb/utils";

export function LeaderboardPanel() {
  const { entries, isLoading, error, isFinalized, weekNumber } = useLeaderboard();
  
  // Get week date range
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
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center mb-4">
          <TrophyIcon className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Leaderboard</h3>
        </div>
        
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center border-b border-gray-100 pb-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full mr-4"></div>
              <div className="flex-1">
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
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-4">
          <TrophyIcon className="mx-auto h-8 w-8 text-red-300 mb-2" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Leaderboard</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <TrophyIcon className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Top Evermarks</h3>
        </div>
        <div className="text-sm text-gray-600">
          Week {weekNumber}: {getWeekDateRange(weekNumber)}
          {isFinalized && <span className="ml-2 text-green-600">(Finalized)</span>}
        </div>
      </div>
      
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <BookmarkIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-gray-600">No entries yet for this week</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div 
              key={entry.evermark.id} 
              className={`flex items-center p-3 border-l-4 ${
                index === 0 ? 'border-yellow-400 bg-yellow-50' :
                index === 1 ? 'border-gray-400 bg-gray-50' :
                index === 2 ? 'border-amber-600 bg-amber-50' :
                'border-gray-200'
              } rounded-lg hover:bg-gray-50 transition-colors`}
            >
              <div className={`flex items-center justify-center h-8 w-8 rounded-full mr-4 ${
                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                index === 1 ? 'bg-gray-100 text-gray-700' :
                index === 2 ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                <span className="font-bold text-sm">{entry.rank}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <Link to={`/evermark/${entry.evermark.id}`} className="block">
                  <h4 className="font-medium text-gray-900 mb-1 truncate" title={entry.evermark.title}>
                    {entry.evermark.title}
                  </h4>
                  <p className="text-sm text-gray-600 truncate">
                    by {entry.evermark.author}
                  </p>
                </Link>
              </div>
              
              <div className="flex items-center text-gray-600 mr-2">
                <VoteIcon className="h-4 w-4 mr-1 text-purple-500" />
                <span className="font-medium">{`${toEther(entry.votes)}`}</span>
              </div>
              
              <Link to={`/evermark/${entry.evermark.id}`} className="text-gray-400 hover:text-gray-600">
                <ChevronRightIcon className="h-5 w-5" />
              </Link>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <Link 
          to="/leaderboard" 
          className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          View Full Leaderboard
          <ChevronRightIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}