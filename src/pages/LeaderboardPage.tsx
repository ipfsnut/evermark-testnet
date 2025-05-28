import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrophyIcon, BookOpenIcon, UserIcon, CalendarIcon, ClockIcon, ImageIcon } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, VOTING_ABI } from "../lib/contracts";
import { toEther } from "thirdweb/utils";
import PageContainer from '../components/layout/PageContainer';
import { formatDistanceToNow } from 'date-fns';

// Enhanced Leaderboard Entry Component
const LeaderboardEntryCard: React.FC<{ entry: any; index: number }> = ({ entry, index }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const isTopThree = index < 3;
  const rankColors = {
    0: 'border-yellow-400 bg-yellow-50',
    1: 'border-gray-400 bg-gray-50', 
    2: 'border-amber-600 bg-amber-50',
  };

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <Link 
      to={`/evermark/${entry.evermark.id}`}
      className="block hover:bg-gray-50 transition-colors"
    >
      <div className={`p-6 flex items-center ${isTopThree ? 'border-l-4' : ''} ${
        isTopThree ? rankColors[index as keyof typeof rankColors] : ''
      }`}>
        {/* Rank Badge */}
        <div className={`flex items-center justify-center h-12 w-12 rounded-full mr-4 flex-shrink-0 font-bold text-lg ${
          index === 0 ? 'bg-yellow-100 text-yellow-700' :
          index === 1 ? 'bg-gray-100 text-gray-700' :
          index === 2 ? 'bg-amber-100 text-amber-700' :
          'bg-purple-100 text-purple-700'
        }`}>
          {entry.rank}
        </div>
        
        {/* Image */}
        <div className="w-16 h-16 bg-gray-100 rounded-lg mr-4 flex-shrink-0 overflow-hidden">
          {entry.evermark.image && !imageError ? (
            <div className="relative w-full h-full">
              {imageLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"></div>
              )}
              <img
                src={entry.evermark.image}
                alt={entry.evermark.title}
                className="w-full h-full object-cover rounded-lg"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-grow min-w-0 mr-4">
          <h3 className="font-medium text-gray-900 truncate mb-1">
            {entry.evermark.title}
          </h3>
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <UserIcon className="h-3 w-3 mr-1" />
            <span className="truncate">{entry.evermark.author}</span>
          </div>
          {entry.evermark.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-1">
              {entry.evermark.description}
            </p>
          )}
          <div className="flex items-center text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3 mr-1" />
            <span>{formatDistanceToNow(new Date(entry.evermark.creationTime), { addSuffix: true })}</span>
          </div>
        </div>
        
        {/* Vote Count */}
        <div className="flex-shrink-0 text-right">
          <p className="font-bold text-purple-600 text-xl">
            {toEther(entry.votes)}
          </p>
          <p className="text-xs text-gray-500">
            vote{Number(toEther(entry.votes)) !== 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Crown for #1 */}
        {entry.rank === 1 && (
          <div className="ml-3 text-2xl">
            👑
          </div>
        )}
      </div>
    </Link>
  );
};

const LeaderboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'previous'>('current');
  
  // Get current cycle from voting contract
  const votingContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  });
  
  const { data: currentCycle } = useReadContract({
    contract: votingContract,
    method: "getCurrentCycle",
    params: [],
  });
  
  const currentWeek = currentCycle ? Number(currentCycle) : 1;
  const previousWeek = Math.max(1, currentWeek - 1);
  
  // Use the leaderboard hook for both current and previous weeks
  const currentWeekData = useLeaderboard(currentWeek);
  const previousWeekData = useLeaderboard(previousWeek);
  
  // Select active data based on tab
  const activeData = activeTab === 'current' ? currentWeekData : previousWeekData;
  const activeWeek = activeTab === 'current' ? currentWeek : previousWeek;
  
  return (
    <PageContainer title="Leaderboard">
      <div className="space-y-6">
        <div className="text-center">
          <TrophyIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-serif font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-600">Top-voted content in the community</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 border border-gray-200">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'current'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <ClockIcon className="h-4 w-4" />
                <span>Current Week {currentWeek}</span>
                {!currentWeekData.isFinalized && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                    Live
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('previous')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'previous'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <TrophyIcon className="h-4 w-4" />
                <span>Previous Week {previousWeek}</span>
                {previousWeekData.isFinalized && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                    Final
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Leaderboard Content */}
        {activeData.isLoading ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 px-6 py-4 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-6 flex items-center">
                  <div className="h-12 w-12 bg-gray-200 rounded-full mr-4 animate-pulse"></div>
                  <div className="w-16 h-16 bg-gray-200 rounded-lg mr-4 animate-pulse"></div>
                  <div className="flex-grow space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : activeData.error ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-red-600 mb-4">
              <TrophyIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="font-medium">Error Loading Leaderboard</p>
              <p className="text-sm mt-1">{activeData.error}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : activeData.entries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <TrophyIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'current' ? 'No Votes Yet This Week' : 'No Data Available'}
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'current' 
                  ? 'Be the first to vote on Evermarks this week! Voting helps great content rise to the top.'
                  : 'No leaderboard data available for this week.'
                }
              </p>
              {activeTab === 'current' && (
                <Link 
                  to="/" 
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <BookOpenIcon className="h-5 w-5 mr-2" />
                  Explore Evermarks
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-gray-900">
                  {activeTab === 'current' ? 'Current Rankings' : 'Final Results'}
                </h2>
                <div className="text-sm text-gray-600">
                  Week {activeWeek}
                  {activeData.isFinalized ? (
                    <span className="ml-2 text-green-600 font-medium">(Finalized)</span>
                  ) : (
                    <span className="ml-2 text-blue-600 font-medium">(Live)</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {activeData.entries.map((entry, index) => (
                <LeaderboardEntryCard 
                  key={entry.evermark.id} 
                  entry={entry} 
                  index={index} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Weekly Stats */}
        {activeData.entries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <TrophyIcon className="h-5 w-5 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Total Entries</p>
                  <p className="text-lg font-bold text-gray-900">{activeData.entries.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 text-purple-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Top Votes</p>
                  <p className="text-lg font-bold text-gray-900">
                    {activeData.entries[0] ? toEther(activeData.entries[0].votes) : '0'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-green-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Week Status</p>
                  <p className="text-lg font-bold text-gray-900">
                    {activeData.isFinalized ? 'Complete' : 'Ongoing'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default LeaderboardPage;