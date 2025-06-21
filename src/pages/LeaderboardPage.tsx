// src/pages/LeaderboardPage.tsx - Enhanced with delegation integration
import React, { useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useProfile } from '../hooks/useProfile';
import { useDelegationHistory } from '../hooks/useDelegationHistory';
import { VotingPanel } from '../components/voting/VotingPanel';
import { toEther } from 'thirdweb/utils';

type LeaderboardTab = 'current' | 'previous' | 'delegate';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('current');
  const [selectedEvermarkId, setSelectedEvermarkId] = useState<string | null>(null);
  
  const { primaryAddress } = useProfile();
  const { delegationStats } = useDelegationHistory(primaryAddress);
  
  // Get current and previous week leaderboards
  const currentWeek = useLeaderboard();
  const previousWeekNumber = currentWeek.weekNumber > 1 ? currentWeek.weekNumber - 1 : 1;
  const previousWeek = useLeaderboard(previousWeekNumber);
  
  const activeLeaderboard = activeTab === 'current' ? currentWeek : previousWeek;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏆 Leaderboard</h1>
              <p className="text-gray-600 mt-1">
                Weekly rankings of the most supported Evermarks
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="text-right">
              <div className="text-sm text-gray-600">Week {currentWeek.weekNumber}</div>
              <div className="text-lg font-semibold">
                {currentWeek.isFinalized ? '✅ Finalized' : '🔄 Active'}
              </div>
            </div>
          </div>

          {/* User Delegation Summary */}
          {primaryAddress && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-purple-900">Your Delegation Power</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className="text-purple-800">
                      {delegationStats.delegationPercentage.toFixed(1)}% delegated
                    </span>
                    <span className="text-purple-800">
                      {delegationStats.rewardMultiplier.toFixed(2)}x multiplier
                    </span>
                    <span className="text-purple-800">
                      {delegationStats.weeklyDelegations} votes this week
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href="/wrapping" 
                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                  >
                    Get wEMARK
                  </a>
                  <button
                    onClick={() => setActiveTab('delegate')}
                    className="bg-white text-purple-600 border border-purple-600 px-3 py-1 rounded text-sm hover:bg-purple-50"
                  >
                    Delegate Votes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'current'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Current Week
            </button>
            <button
              onClick={() => setActiveTab('previous')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'previous'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📈 Previous Week
            </button>
            <button
              onClick={() => setActiveTab('delegate')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'delegate'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🗳️ Delegate Votes
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {(activeTab === 'current' || activeTab === 'previous') && (
          <>
            {/* Leaderboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg border p-6 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {activeLeaderboard.entries.length}
                </div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
              <div className="bg-white rounded-lg border p-6 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {activeLeaderboard.entries.length > 0 
                    ? parseFloat(toEther(activeLeaderboard.entries[0].votes)).toFixed(0)
                    : '0'
                  }
                </div>
                <div className="text-sm text-gray-600">Top Votes</div>
              </div>
              <div className="bg-white rounded-lg border p-6 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  Week {activeLeaderboard.weekNumber}
                </div>
                <div className="text-sm text-gray-600">Voting Cycle</div>
              </div>
              <div className="bg-white rounded-lg border p-6 text-center">
                <div className={`text-2xl font-bold ${
                  activeLeaderboard.isFinalized ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {activeLeaderboard.isFinalized ? 'Final' : 'Live'}
                </div>
                <div className="text-sm text-gray-600">Status</div>
              </div>
            </div>

            {/* Leaderboard Entries */}
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {activeTab === 'current' ? 'Current' : 'Previous'} Week Rankings
                </h2>
              </div>
              
              {activeLeaderboard.isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading leaderboard...</p>
                </div>
              ) : activeLeaderboard.error ? (
                <div className="p-8 text-center">
                  <p className="text-red-600 mb-4">Error loading leaderboard: {activeLeaderboard.error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    Retry
                  </button>
                </div>
              ) : activeLeaderboard.entries.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400 text-6xl mb-4">🏆</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Entries Yet</h3>
                  <p className="text-gray-600">Be the first to delegate votes this week!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activeLeaderboard.entries.map((entry, index) => (
                    <div key={entry.evermark.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className={`text-2xl font-bold ${
                            entry.rank === 1 ? 'text-yellow-500' :
                            entry.rank === 2 ? 'text-gray-400' :
                            entry.rank === 3 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            #{entry.rank}
                          </div>
                          
                          {/* Evermark Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {entry.evermark.image && (
                                <img 
                                  src={entry.evermark.image} 
                                  alt={entry.evermark.title}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  <a 
                                    href={`/evermark/${entry.evermark.id}`}
                                    className="hover:text-purple-600"
                                  >
                                    {entry.evermark.title}
                                  </a>
                                </h3>
                                <p className="text-sm text-gray-600">
                                  by {entry.evermark.author}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Votes and Action */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-purple-600">
                              {parseFloat(toEther(entry.votes)).toFixed(0)} votes
                            </div>
                            <div className="text-sm text-gray-500">
                              {parseFloat(toEther(entry.votes)).toFixed(4)} wEMARK
                            </div>
                          </div>
                          
                          {primaryAddress && !activeLeaderboard.isFinalized && (
                            <button
                              onClick={() => {
                                setSelectedEvermarkId(entry.evermark.id);
                                setActiveTab('delegate');
                              }}
                              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                            >
                              Vote
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {entry.evermark.description && (
                        <p className="text-sm text-gray-600 mt-3 ml-16">
                          {entry.evermark.description.length > 150 
                            ? `${entry.evermark.description.substring(0, 150)}...`
                            : entry.evermark.description
                          }
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Delegation Tab */}
        {activeTab === 'delegate' && (
          <div className="space-y-8">
            {!primaryAddress ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
                <p className="text-gray-600">
                  Connect your wallet to delegate voting power to your favorite Evermarks
                </p>
              </div>
            ) : (
              <>
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    🗳️ How Delegation Works
                  </h3>
                  <div className="text-blue-800 space-y-2 text-sm">
                    <p>• Wrap your EMARK tokens to get wEMARK (voting power)</p>
                    <p>• Delegate wEMARK to support your favorite Evermarks</p>
                    <p>• Earn reward multipliers: 50%+ = 1.25x, 75%+ = 1.5x, 100% = 2x</p>
                    <p>• Get consistency bonuses for regular participation</p>
                  </div>
                </div>

                {/* Voting Panel */}
                {selectedEvermarkId ? (
                  <div className="bg-white rounded-lg border">
                    <div className="p-6 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          Delegate to Evermark #{selectedEvermarkId}
                        </h3>
                        <button
                          onClick={() => setSelectedEvermarkId(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕ Close
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <VotingPanel evermarkId={selectedEvermarkId} />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">🎯</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      Select an Evermark to Delegate
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Click "Vote" next to any Evermark above, or browse all Evermarks to find ones you want to support.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => setActiveTab('current')}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                      >
                        View Current Leaderboard
                      </button>
                      <a 
                        href="/"
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                      >
                        Browse All Evermarks
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}