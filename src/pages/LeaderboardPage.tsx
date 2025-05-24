// src/pages/LeaderboardPage.tsx - Shows both current and previous cycle data
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrophyIcon, BookOpenIcon, UserIcon, CalendarIcon, ClockIcon } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, VOTING_ABI } from "../lib/contracts";
import { toEther } from "thirdweb/utils";
import PageContainer from '../components/layout/PageContainer';

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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
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
              <p className="text-gray-600 mb-4">
                {activeTab === 'current' 
                  ? 'Be the first to vote on Evermarks this week!'
                  : 'No leaderboard data for this week.'
                }
              </p>
              {activeTab === 'current' && (
                <Link 
                  to="/" 
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <BookOpenIcon className="h-4 w-4 mr-2" />
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
              {activeData.entries.map((entry, index) => {
                const isTopThree = index < 3;
                const rankColors = {
                  0: 'border-yellow-400 bg-yellow-50 text-yellow-700',
                  1: 'border-gray-400 bg-gray-50 text-gray-700', 
                  2: 'border-amber-600 bg-amber-50 text-amber-700',
                };
                
                return (
                  <Link 
                    key={entry.evermark.id} 
                    to={`/evermark/${entry.evermark.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-6 flex items-center ${isTopThree ? 'border-l-4' : ''} ${
                      isTopThree ? rankColors[index as keyof typeof rankColors] : ''
                    }`}>
                      {/* Rank Badge */}
                      <div className={`flex items-center justify-center h-10 w-10 rounded-full mr-4 flex-shrink-0 ${
                        isTopThree ? 'font-bold text-lg' : 'bg-gray-100 text-gray-600 font-medium'
                      }`}>
                        {isTopThree ? (
                          <span>{entry.rank}</span>
                        ) : (
                          <span>{entry.rank}</span>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-grow min-w-0">
                        <h3 className="font-medium text-gray-900 truncate mb-1">
                          {entry.evermark.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <UserIcon className="h-3 w-3 mr-1" />
                          <span className="truncate">{entry.evermark.author}</span>
                        </div>
                      </div>
                      
                      {/* Vote Count */}
                      <div className="flex-shrink-0 ml-4 text-right">
                        <p className="font-bold text-purple-600 text-lg">
                          {toEther(entry.votes)}
                        </p>
                        <p className="text-xs text-gray-500">
                          vote{Number(toEther(entry.votes)) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      {/* Crown for #1 */}
                      {entry.rank === 1 && (
                        <div className="ml-2 text-yellow-500">
                          👑
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
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