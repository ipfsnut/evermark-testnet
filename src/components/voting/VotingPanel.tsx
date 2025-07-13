import { useState, useEffect } from "react";
import { VoteIcon, TrendingUpIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { toEther } from "thirdweb/utils";
import { useVoting } from "../../hooks/useVoting";
import { useWalletAuth } from "../../providers/WalletProvider";
import { cn, useIsMobile } from "../../utils/responsive";

interface VotingPanelProps {
  evermarkId: string;
  isOwner?: boolean;
}

export function VotingPanel({ evermarkId, isOwner = false }: VotingPanelProps) {
  const { address, isConnected } = useWalletAuth();
  const [voteAmount, setVoteAmount] = useState("");
  const isMobile = useIsMobile();
  
  // Use core voting hook that provides everything we need
  const {
    totalVotes,
    userVotes,
    availableVotingPower,
    isLoadingTotalVotes,
    isLoadingUserVotes,
    isLoadingVotingPower,
    isVoting,
    error,
    success,
    delegateVotes,
    undelegateVotes,
    clearMessages,
  } = useVoting(evermarkId, address);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => clearMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error, clearMessages]);
  
  // Simplified handlers using core voting hook
  const handleVote = async () => {
    const result = await delegateVotes(voteAmount);
    if (result.success) {
      setVoteAmount(""); // Clear input on success
    }
  };
  
  const handleUnvote = async () => {
    const result = await undelegateVotes(voteAmount);
    if (result.success) {
      setVoteAmount(""); // Clear input on success
    }
  };
  
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="text-center py-6 sm:py-8">
          <VoteIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Connect to Vote</h3>
          <p className="text-sm sm:text-base text-gray-600">Connect your wallet to support this Evermark</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
      <div className="flex items-center mb-4 sm:mb-6">
        <VoteIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 mr-2" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Voting Power</h3>
      </div>
      
      {/* Mobile-first voting stats grid */}
      <div className={cn(
        "grid gap-3 sm:gap-4 mb-4 sm:mb-6",
        isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
      )}>
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total Votes</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {isLoadingTotalVotes ? "..." : `${toEther(totalVotes)}`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
          <div className="flex items-center">
            <VoteIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Your Votes</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {isLoadingUserVotes ? "..." : `${toEther(userVotes)}`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
          <div className="flex items-center">
            <div className="h-4 w-4 sm:h-5 sm:w-5 bg-purple-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-purple-600 text-xs font-bold">P</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Available</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {isLoadingVotingPower ? "..." : `${toEther(availableVotingPower)}`}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Messages - Mobile optimized */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-red-700 text-sm leading-relaxed">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-green-700 text-sm leading-relaxed">{success}</span>
        </div>
      )}
      
      {/* Voting Interface - Enhanced for mobile */}
      {!isOwner && (
        <div className="space-y-4">
          <div>
            <label htmlFor="vote-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Vote Amount (wEMARK)
            </label>
            <input
              id="vote-amount"
              type="number"
              value={voteAmount}
              onChange={(e) => setVoteAmount(e.target.value)}
              className={cn(
                "w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base",
                "placeholder-gray-400"
              )}
              placeholder="0.0"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className={cn(
            "flex gap-3",
            isMobile ? "flex-col" : "flex-row"
          )}>
            <button
              onClick={handleVote}
              disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
              className={cn(
                "flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium",
                isMobile ? "w-full" : "flex-1"
              )}
            >
              {isVoting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Voting...
                </>
              ) : (
                <>
                  <VoteIcon className="h-4 w-4 mr-2" />
                  Support
                </>
              )}
            </button>
            
            {userVotes > BigInt(0) && (
              <button 
                onClick={handleUnvote}
                disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
                className={cn(
                  "flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium",
                  isMobile ? "w-full" : "flex-1"
                )}
              >
                Withdraw
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-500 leading-relaxed">
            Voting helps valuable content rise to the top of the leaderboard
          </p>
        </div>
      )}
      
      {isOwner && (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-sm">You cannot vote on your own Evermark</p>
        </div>
      )}
    </div>
  );
}