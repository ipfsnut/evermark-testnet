// src/components/voting/VotingPanel.tsx - USING REAL CONTRACT METHODS
import React, { useState, useEffect } from "react";
import { useReadContract, useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { toEther, toWei } from "thirdweb/utils";
import { client } from "../../lib/thirdweb";
import { CONTRACT_ADDRESSES, CHAIN } from "../../config/constants";
import { VOTING_ABI, CARD_CATALOG_ABI } from "../../lib/contracts";
import { VoteIcon, TrendingUpIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';

interface VotingPanelProps {
  evermarkId: string;
  isOwner?: boolean;
}

export function VotingPanel({ evermarkId, isOwner = false }: VotingPanelProps) {
  const account = useActiveAccount();
  const [voteAmount, setVoteAmount] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Get voting contract using REAL address
  const votingContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACT_ADDRESSES.BOOKMARK_VOTING, // REAL: Using BOOKMARK_VOTING not "VOTING"
    abi: VOTING_ABI, // REAL: Using actual ABI from contracts file
  });
  
  // Get card catalog contract for voting power
  const catalogContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACT_ADDRESSES.CARD_CATALOG, // REAL: Using actual contract address
    abi: CARD_CATALOG_ABI, // REAL: Using actual ABI
  });
  
  // REAL: Using actual method name "getBookmarkVotes" not "getVotes"
  const { data: currentVotes, isLoading: isLoadingVotes } = useReadContract({
    contract: votingContract,
    method: "getBookmarkVotes", // REAL: This method actually exists
    params: [BigInt(evermarkId)],
  });
  
  // For reading user votes
  const userVotesQuery = account ? useReadContract({
    contract: votingContract,
    method: "getUserVotesForBookmark",
    params: [account.address, BigInt(evermarkId)] as const,
  }) : { data: undefined, isLoading: false };

  const userVotes = userVotesQuery.data;
  const isLoadingUserVotes = 'isLoading' in userVotesQuery ? userVotesQuery.isLoading : false;

  // For reading voting power
  const votingPowerQuery = account ? useReadContract({
    contract: catalogContract,
    method: "getAvailableVotingPower", 
    params: [account.address] as const,
  }) : { data: undefined, isLoading: false };

  const availableVotingPower = votingPowerQuery.data;
  const isLoadingVotingPower = 'isLoading' in votingPowerQuery ? votingPowerQuery.isLoading : false;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);
  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  const handleVote = async () => {
    if (!account) {
      setError("Please connect your wallet");
      return;
    }
    
    if (!voteAmount || parseFloat(voteAmount) <= 0) {
      setError("Please enter a valid vote amount");
      return;
    }
    
    const voteAmountWei = toWei(voteAmount);
    
    // Check if user has enough voting power
    if (availableVotingPower && voteAmountWei > availableVotingPower) {
      setError(`Insufficient voting power. Available: ${toEther(availableVotingPower)} NSI`);
      return;
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // REAL: Using actual method "delegateVotes" not "vote"
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "delegateVotes", // REAL: This method actually exists
        params: [BigInt(evermarkId), voteAmountWei] as const, // REAL: Correct parameters
      });
      
      await sendTransaction(transaction as any);
      
      setSuccess(`Successfully delegated ${voteAmount} NSI to this Evermark!`);
      setVoteAmount("");
    } catch (err: any) {
      console.error("Error delegating votes:", err);
      setError(err.message || "Failed to delegate votes");
    } finally {
      setIsVoting(false);
    }
  };
  
  const handleUnvote = async () => {
    if (!account || !userVotes || userVotes === BigInt(0)) {
      setError("No votes to withdraw");
      return;
    }
    
    if (!voteAmount || parseFloat(voteAmount) <= 0) {
      setError("Please enter a valid amount to withdraw");
      return;
    }
    
    const withdrawAmountWei = toWei(voteAmount);
    
    if (withdrawAmountWei > userVotes) {
      setError(`Cannot withdraw more than delegated. Your delegation: ${toEther(userVotes)} NSI`);
      return;
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // REAL: Using actual method "undelegateVotes"
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "undelegateVotes", // REAL: This method actually exists
        params: [BigInt(evermarkId), withdrawAmountWei], // REAL: Correct parameters
      });
      
      await sendTransaction(transaction as any);
      
      setSuccess(`Successfully withdrew ${voteAmount} NSI from this Evermark!`);
      setVoteAmount("");
    } catch (err: any) {
      console.error("Error undelegating votes:", err);
      setError(err.message || "Failed to undelegate votes");
    } finally {
      setIsVoting(false);
    }
  };
  
  if (!account) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <VoteIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect to Vote</h3>
          <p className="text-gray-600">Connect your wallet to support this Evermark</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center mb-4">
        <VoteIcon className="h-6 w-6 text-purple-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Voting Power</h3>
      </div>
      
      {/* Voting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Total Votes</p>
              <p className="text-xl font-bold text-gray-900">
                {isLoadingVotes ? "..." : `${toEther(currentVotes || BigInt(0))}`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <VoteIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Your Votes</p>
              <p className="text-xl font-bold text-gray-900">
                {isLoadingUserVotes ? "..." : `${toEther(userVotes || BigInt(0))}`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-purple-100 rounded-full flex items-center justify-center mr-2">
              <span className="text-purple-600 text-xs font-bold">P</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-xl font-bold text-gray-900">
                {isLoadingVotingPower ? "..." : toEther(availableVotingPower || BigInt(0))}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}
      
      {/* Voting Interface */}
      {!isOwner && (
        <div className="space-y-4">
          <div>
            <label htmlFor="vote-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Vote Amount (NSI)
            </label>
            <input
              id="vote-amount"
              type="number"
              value={voteAmount}
              onChange={(e) => setVoteAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.0"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleVote}
              disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            
            {userVotes && userVotes > BigInt(0) ? (
  <button onClick={handleUnvote}
    disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
    className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Withdraw
  </button>
) : null}


          </div>
          
          <p className="text-xs text-gray-500">
            Voting helps valuable content rise to the top of the leaderboard
          </p>
        </div>
      )}
      
      {isOwner && (
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <p className="text-gray-600">You cannot vote on your own Evermark</p>
        </div>
      )}
    </div>
  );
}