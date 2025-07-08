// src/pages/LeaderboardPage.tsx - ✅ MOBILE-OPTIMIZED
import React, { useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useProfile } from '../hooks/useProfile';
import { useDelegationHistory } from '../hooks/useDelegationHistory';
import { VotingPanel } from '../components/voting/VotingPanel';
import { EvermarkImage } from '../components/layout/UniversalImage';
import { toEther } from 'thirdweb/utils';
import { 
  TrophyIcon, 
  VoteIcon, 
  UserIcon, 
  CalendarIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  InfoIcon
} from 'lucide-react';
import { cn, useIsMobile, textSizes, spacing, touchFriendly } from '../utils/responsive';

type LeaderboardTab = 'current' | 'previous' | 'delegate';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('current');
  const [selectedEvermarkId, setSelectedEvermarkId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const { primaryAddress } = useProfile();
  const { delegationStats } = useDelegationHistory(primaryAddress);
  
  // Get current and previous week leaderboards
  const currentWeek = useLeaderboard();
  const previousWeekNumber = currentWeek.weekNumber > 1 ? currentWeek.weekNumber - 1 : 1;
  const previousWeek = useLeaderboard(previousWeekNumber);
  
  const activeLeaderboard = activeTab === 'current' ? currentWeek : previousWeek;

  // Mobile-optimized rank styling
  const getRankDisplay = (rank: number) => {
    const baseClasses = "flex items-center justify-center font-bold rounded-full";
    
    if (isMobile) {
      switch (rank) {
        case 1:
          return { 
            container: `${baseClasses} w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg`,
            icon: '🥇',
            text: '1st'
          };
        case 2:
          return { 
            container: `${baseClasses} w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md`,
            icon: '🥈',
            text: '2nd'
          };
        case 3:
          return { 
            container: `${baseClasses} w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md`,
            icon: '🥉',
            text: '3rd'
          };
        default:
          return { 
            container: `${baseClasses} w-8 h-8 bg-gray-100 text-gray-600 border border-gray-300`,
            icon: null,
            text: `#${rank}`
          };
      }
    } else {
      // Desktop styling remains the same
      return {
        container: `${baseClasses} text-2xl ${
          rank === 1 ? 'text-yellow-500' :
          rank === 2 ? 'text-gray-400' :
          rank === 3 ? 'text-orange-600' :
          'text-gray-600'
        }`,
        icon: rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : null,
        text: `#${rank}`
      };
    }
  };

  // Mobile-optimized leaderboard entry component
  const LeaderboardEntry = ({ entry, index }: { entry: any; index: number }) => {
    const rankDisplay = getRankDisplay(entry.rank);
    const votes = parseFloat(toEther(entry.votes));

    if (isMobile) {
      return (
        <div 
          key={entry.evermark.id} 
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Mobile: Image with padding and max height */}
          <div className="p-4 pb-3">
            <div className="relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden" style={{ maxHeight: '160px', minHeight: '120px' }}>
              <EvermarkImage
                src={entry.evermark.image}
                alt={entry.evermark.title}
                aspectRatio="auto"
                rounded="lg"
                className="w-full h-full max-h-40 object-contain"
                containerClassName="flex items-center justify-center min-h-[120px] max-h-40"
              />
              
              {/* Rank badge overlay */}
              <div className={cn(
                "absolute top-2 left-2 flex items-center justify-center font-bold rounded-full w-8 h-8 text-xs shadow-md",
                entry.rank === 1 ? "bg-yellow-500 text-white" :
                entry.rank === 2 ? "bg-gray-400 text-white" :
                entry.rank === 3 ? "bg-orange-500 text-white" :
                "bg-white text-gray-700 border border-gray-300"
              )}>
                {entry.rank <= 3 ? (
                  <span className="text-xs">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                  </span>
                ) : (
                  <span className="font-bold">#{entry.rank}</span>
                )}
              </div>
              
              {/* Vote count overlay */}
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
                <VoteIcon className="h-3 w-3 mr-1 inline" />
                {votes >= 1000000 ? `${(votes / 1000000).toFixed(1)}M` :
                 votes >= 1000 ? `${(votes / 1000).toFixed(1)}K` : 
                 votes.toFixed(0)}
              </div>
            </div>
          </div>
          
          {/* Content section - More discrete */}
          <div className="px-4 pb-4">
            {/* Title - smaller and more discrete */}
            <h3 className="font-medium text-gray-900 text-base leading-snug mb-2 line-clamp-2">
              <a 
                href={`/evermark/${entry.evermark.id}`}
                className="hover:text-purple-600 transition-colors"
              >
                {entry.evermark.title}
              </a>
            </h3>
            
            {/* Author info - more discrete */}
            <div className="flex items-center text-xs text-gray-500 mb-3">
              <UserIcon className="h-3 w-3 mr-1" />
              <span className="truncate">by {entry.evermark.author}</span>
            </div>
            
            {/* Action buttons - side by side */}
            <div className="flex gap-2">
              {/* View Details button */}
              <a
                href={`/evermark/${entry.evermark.id}`}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-200 flex items-center justify-center"
              >
                <ExternalLinkIcon className="h-3 w-3 mr-1" />
                View
              </a>
              
              {/* Vote button */}
              {primaryAddress && !activeLeaderboard.isFinalized && (
                <button
                  onClick={() => {
                    setSelectedEvermarkId(entry.evermark.id);
                    setActiveTab('delegate');
                  }}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-xs font-medium transition-colors hover:bg-purple-700 active:bg-purple-800"
                >
                  <VoteIcon className="h-3 w-3 mr-1 inline" />
                  Vote
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Desktop layout (original)
    return (
      <div key={entry.evermark.id} className="p-6 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Rank */}
            <div className={rankDisplay.container}>
              {rankDisplay.text}
            </div>
            
            {/* Evermark Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {entry.evermark.image && (
                  <div className="w-12 h-12">
                    <EvermarkImage
                      src={entry.evermark.image}
                      alt={entry.evermark.title}
                      aspectRatio="square"
                      rounded="md"
                    />
                  </div>
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
                {votes.toFixed(0)} votes
              </div>
              <div className="text-sm text-gray-500">
                {votes.toFixed(4)} wEMARK
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
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ MOBILE-OPTIMIZED Header */}
      <div className="bg-white border-b">
        <div className={cn("container mx-auto", spacing.responsive['sm-md-lg'])}>
          {/* Mobile: Stacked layout */}
          {isMobile ? (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  🏆 Leaderboard
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Weekly rankings of top Evermarks
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="bg-gray-100 px-3 py-1 rounded-full">
                  Week {currentWeek.weekNumber}
                </div>
                <div className={`px-3 py-1 rounded-full font-medium ${
                  currentWeek.isFinalized 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {currentWeek.isFinalized ? '✅ Final' : '🔄 Live'}
                </div>
              </div>
            </div>
          ) : (
            // Desktop: Original layout
            <div className="flex items-center justify-between mb-6 py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🏆 Leaderboard</h1>
                <p className="text-gray-600 mt-1">
                  Weekly rankings of the most supported Evermarks
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-600">Week {currentWeek.weekNumber}</div>
                <div className="text-lg font-semibold">
                  {currentWeek.isFinalized ? '✅ Finalized' : '🔄 Active'}
                </div>
              </div>
            </div>
          )}

          {/* ✅ MOBILE-OPTIMIZED User Delegation Summary */}
          {primaryAddress && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              {isMobile ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-purple-900 text-center">Your Delegation Power</h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="font-bold text-purple-800">
                        {delegationStats.delegationPercentage.toFixed(1)}%
                      </div>
                      <div className="text-purple-600">Delegated</div>
                    </div>
                    <div>
                      <div className="font-bold text-purple-800">
                        {delegationStats.rewardMultiplier.toFixed(2)}x
                      </div>
                      <div className="text-purple-600">Multiplier</div>
                    </div>
                    <div>
                      <div className="font-bold text-purple-800">
                        {delegationStats.weeklyDelegations}
                      </div>
                      <div className="text-purple-600">This Week</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href="/wrapping" 
                      className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm text-center hover:bg-purple-700"
                    >
                      Get wEMARK
                    </a>
                    <button
                      onClick={() => setActiveTab('delegate')}
                      className="flex-1 bg-white text-purple-600 border border-purple-600 px-3 py-2 rounded text-sm hover:bg-purple-50"
                    >
                      Delegate
                    </button>
                  </div>
                </div>
              ) : (
                // Desktop: Original layout
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* ✅ MOBILE-OPTIMIZED Tab Navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className={cn(
            "flex",
            isMobile ? "justify-center" : "gap-8"
          )}>
            {[
              { key: 'current', label: isMobile ? 'Current' : '📊 Current Week', icon: '📊' },
              { key: 'previous', label: isMobile ? 'Previous' : '📈 Previous Week', icon: '📈' },
              { key: 'delegate', label: isMobile ? 'Vote' : '🗳️ Delegate Votes', icon: '🗳️' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as LeaderboardTab)}
                className={cn(
                  "py-4 px-3 border-b-2 font-medium text-sm transition-colors",
                  touchFriendly.button,
                  activeTab === tab.key
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                  isMobile && "flex-1 text-center"
                )}
              >
                {isMobile && <span className="mr-1">{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn("container mx-auto", spacing.responsive['sm-md-lg'])}>
        {(activeTab === 'current' || activeTab === 'previous') && (
          <>
            {/* ✅ MOBILE-OPTIMIZED Stats Grid */}
            <div className={cn(
              "grid gap-4 mb-6",
              isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4"
            )}>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className={cn("font-bold text-blue-600", isMobile ? "text-lg" : "text-2xl")}>
                  {activeLeaderboard.entries.length}
                </div>
                <div className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  {isMobile ? "Entries" : "Total Entries"}
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className={cn("font-bold text-green-600", isMobile ? "text-lg" : "text-2xl")}>
                  {activeLeaderboard.entries.length > 0 
                    ? parseFloat(toEther(activeLeaderboard.entries[0].votes)).toFixed(0)
                    : '0'
                  }
                </div>
                <div className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  {isMobile ? "Top Votes" : "Top Votes"}
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className={cn("font-bold text-purple-600", isMobile ? "text-lg" : "text-2xl")}>
                  {activeLeaderboard.weekNumber}
                </div>
                <div className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  {isMobile ? "Week" : "Voting Cycle"}
                </div>
              </div>
              <div className="bg-white rounded-lg border p-4 text-center">
                <div className={cn(`font-bold ${
                  activeLeaderboard.isFinalized ? 'text-green-600' : 'text-orange-600'
                }`, isMobile ? "text-lg" : "text-2xl")}>
                  {activeLeaderboard.isFinalized ? 'Final' : 'Live'}
                </div>
                <div className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
                  Status
                </div>
              </div>
            </div>

            {/* ✅ MOBILE-OPTIMIZED Leaderboard Entries */}
            <div className={cn(
              isMobile ? "space-y-4" : "bg-white rounded-lg border overflow-hidden"
            )}>
              {!isMobile && (
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeTab === 'current' ? 'Current' : 'Previous'} Week Rankings
                  </h2>
                </div>
              )}
              
              {/* Mobile: Add a smaller section header */}
              {isMobile && (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 text-center">
                    {activeTab === 'current' ? 'Current Week' : 'Previous Week'} Rankings
                  </h2>
                </div>
              )}
              
              {activeLeaderboard.isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading leaderboard...</p>
                </div>
              ) : activeLeaderboard.error ? (
                <div className="p-8 text-center">
                  <p className="text-red-600 mb-4">Error: {activeLeaderboard.error}</p>
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
                <div className={cn(
                  isMobile ? "space-y-3" : "divide-y"
                )}>
                  {activeLeaderboard.entries.map((entry, index) => (
                    <LeaderboardEntry key={entry.evermark.id} entry={entry} index={index} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Delegation Tab - unchanged as it's already responsive */}
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
                    <div className={cn(
                      "flex gap-3 justify-center",
                      isMobile && "flex-col"
                    )}>
                      <button
                        onClick={() => setActiveTab('current')}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                      >
                        View Current Leaderboard
                      </button>
                      <a 
                        href="/"
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-center"
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