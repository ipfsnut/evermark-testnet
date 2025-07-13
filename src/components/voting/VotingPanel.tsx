// src/components/voting/VotingPanel.tsx - Dark Cyber Theme
import { useState, useEffect } from "react";
import { VoteIcon, TrendingUpIcon, AlertCircleIcon, CheckCircleIcon, ZapIcon } from 'lucide-react';
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
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 p-4 sm:p-6 backdrop-blur-sm">
        <div className="text-center py-6 sm:py-8">
          <VoteIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-500 mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-white mb-2">Connect to Vote</h3>
          <p className="text-sm sm:text-base text-gray-400">Connect your wallet to support this Evermark</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 p-4 sm:p-6 backdrop-blur-sm">
      <div className="flex items-center mb-4 sm:mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-lg shadow-purple-500/30">
          <VoteIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-white">Voting Power</h3>
      </div>
      
      {/* Mobile-first voting stats grid with cyber styling */}
      <div className={cn(
        "grid gap-3 sm:gap-4 mb-4 sm:mb-6",
        isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
      )}>
        <div className="bg-gray-700/30 border border-gray-600/50 p-3 sm:p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-center">
            <TrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-400 truncate">Total Votes</p>
              <p className="text-lg sm:text-xl font-bold text-green-300 truncate">
                {isLoadingTotalVotes ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `${toEther(totalVotes)}`
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-700/30 border border-gray-600/50 p-3 sm:p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-center">
            <VoteIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 mr-2 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-400 truncate">Your Votes</p>
              <p className="text-lg sm:text-xl font-bold text-cyan-300 truncate">
                {isLoadingUserVotes ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `${toEther(userVotes)}`
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-700/30 border border-gray-600/50 p-3 sm:p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-center">
            <div className="h-4 w-4 sm:h-5 sm:w-5 bg-purple-600/30 border border-purple-400/50 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-purple-400 text-xs font-bold">P</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-400 truncate">Available</p>
              <p className="text-lg sm:text-xl font-bold text-purple-300 truncate">
                {isLoadingVotingPower ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  `${toEther(availableVotingPower)}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Messages - Enhanced for dark theme */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start backdrop-blur-sm">
          <AlertCircleIcon className="h-4 w-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-red-300 text-sm leading-relaxed">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg flex items-start backdrop-blur-sm">
          <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-green-300 text-sm leading-relaxed">{success}</span>
        </div>
      )}
      
      {/* Voting Interface - Enhanced for mobile with cyber styling */}
      {!isOwner && (
        <div className="space-y-4">
          <div>
            <label htmlFor="vote-amount" className="block text-sm font-medium text-gray-300 mb-2">
              Vote Amount (wEMARK)
            </label>
            <div className="relative">
              <input
                id="vote-amount"
                type="number"
                value={voteAmount}
                onChange={(e) => setVoteAmount(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 sm:py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 text-base",
                  "focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 transition-colors backdrop-blur-sm"
                )}
                placeholder="0.0"
                min="0"
                step="0.01"
              />
              {/* Cyber-style input glow effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400/10 to-purple-400/10 opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
          
          <div className={cn(
            "flex gap-3",
            isMobile ? "flex-col" : "flex-row"
          )}>
            <button
              onClick={handleVote}
              disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
              className={cn(
                "flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200",
                "bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-cyan-300",
                "hover:from-purple-500/30 hover:to-blue-500/30 hover:border-cyan-400/50 hover:text-cyan-200",
                "disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/20",
                "backdrop-blur-sm",
                isMobile ? "w-full" : "flex-1"
              )}
            >
              {isVoting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-300 mr-2"></div>
                  Voting...
                </>
              ) : (
                <>
                  <ZapIcon className="h-4 w-4 mr-2" />
                  Support
                </>
              )}
            </button>
            
            {userVotes > BigInt(0) && (
              <button 
                onClick={handleUnvote}
                disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
                className={cn(
                  "flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200",
                  "bg-gray-700/30 border border-gray-600/50 text-gray-300",
                  "hover:bg-gray-600/30 hover:border-gray-500/50 hover:text-gray-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm",
                  isMobile ? "w-full" : "flex-1"
                )}
              >
                Withdraw
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-400 leading-relaxed">
            Voting helps valuable content rise to the top of the leaderboard
          </p>
        </div>
      )}
      
      {isOwner && (
        <div className="text-center py-4 bg-gray-700/20 border border-gray-600/30 rounded-lg backdrop-blur-sm">
          <p className="text-gray-400 text-sm">You cannot vote on your own Evermark</p>
        </div>
      )}
    </div>
  );
}