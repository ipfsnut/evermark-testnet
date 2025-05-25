// src/components/voting/VotingPanel.tsx - COMPLETE VERSION WITH DEBUG LOGS
import React, { useState, useEffect } from "react";
import { useReadContract, useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { toEther, toWei } from "thirdweb/utils";
import { client } from "../../lib/thirdweb";
import { CONTRACTS, CHAIN, VOTING_ABI } from "../../lib/contracts";
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
  
  console.log("🔍 VotingPanel rendered with:", { evermarkId, isOwner, account: !!account });
  
  // Get voting contract using REAL address
  const votingContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  });
  
  console.log("🔍 Voting contract:", {
    address: CONTRACTS.VOTING,
    chain: CHAIN.name || CHAIN.id
  });
  
  // Add this debugging info
  console.log("🔍 Contract and Account Debug:", {
    contractAddress: CONTRACTS.VOTING,
    accountAddress: account?.address,
    chainId: CHAIN.id,
    chainName: CHAIN.name || 'Unknown',
    areTheSame: CONTRACTS.VOTING === account?.address
  });

  // Let's also check what's in your contracts config
  console.log("🔍 All contract addresses:", CONTRACTS);
  
  // Get current votes for this Evermark
  const { data: currentVotes, isLoading: isLoadingVotes, refetch: refetchVotes } = useReadContract({
    contract: votingContract,
    method: "getBookmarkVotes",
    params: [BigInt(evermarkId)],
  });
  
  console.log("🔍 Current votes query:", {
    data: currentVotes ? toEther(currentVotes) : "not loaded",
    isLoading: isLoadingVotes,
    evermarkId
  });

  // For reading user votes
  const userVotesQuery = account ? useReadContract({
    contract: votingContract,
    method: "getUserVotesForBookmark",
    params: [account.address, BigInt(evermarkId)] as const,
  }) : { data: undefined, isLoading: false };

  const userVotes = userVotesQuery.data;
  const isLoadingUserVotes = 'isLoading' in userVotesQuery ? userVotesQuery.isLoading : false;
  
  console.log("🔍 User votes query:", {
    data: userVotes ? toEther(userVotes) : "not loaded",
    isLoading: isLoadingUserVotes,
    userAddress: account?.address
  });

  // FIXED: Get remaining voting power from EvermarkVoting contract
  const votingPowerQuery = account ? useReadContract({
    contract: votingContract,
    method: "getRemainingVotingPower", 
    params: [account.address] as const,
  }) : { data: undefined, isLoading: false, error: null };

  const availableVotingPower = votingPowerQuery.data;
  const isLoadingVotingPower = 'isLoading' in votingPowerQuery ? votingPowerQuery.isLoading : false;
  const votingPowerError = 'error' in votingPowerQuery ? votingPowerQuery.error : null;
  
  console.log("🔍 Voting power query:", {
    data: availableVotingPower ? toEther(availableVotingPower) : "not loaded",
    isLoading: isLoadingVotingPower,
    userAddress: account?.address
  });
  
  const { mutate: sendTransaction, isPending, error: txError } = useSendTransaction();
  console.log("🔍 sendTransaction function:", typeof sendTransaction);
  
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
    console.log("🔍 Vote button clicked");
    console.log("🔍 Current state:", {
      account: !!account,
      accountAddress: account?.address,
      voteAmount,
      availableVotingPower: availableVotingPower ? toEther(availableVotingPower) : "not loaded",
      evermarkId,
      isVoting,
      contractAddress: CONTRACTS.VOTING
    });
    
    if (!account) {
      console.log("❌ No account connected");
      setError("Please connect your wallet");
      return;
    }
    console.log("✅ Account connected:", account.address);
    
    if (!voteAmount || parseFloat(voteAmount) <= 0) {
      console.log("❌ Invalid vote amount:", voteAmount);
      setError("Please enter a valid vote amount");
      return;
    }
    console.log("✅ Vote amount valid:", voteAmount);
    
    if (!availableVotingPower) {
      console.log("❌ No available voting power data loaded");
      console.log("❌ Voting power query state:", {
        data: availableVotingPower,
        isLoading: isLoadingVotingPower,
        error: votingPowerQuery.error
      });
      setError("Loading voting power...");
      return;
    }
    console.log("✅ Available voting power loaded:", toEther(availableVotingPower));
    
    const voteAmountWei = toWei(voteAmount);
    console.log("✅ Vote amount in wei:", voteAmountWei.toString());
    
    // Check if user has enough voting power
    if (voteAmountWei > availableVotingPower) {
      console.log("❌ Insufficient voting power");
      console.log("Trying to vote:", toEther(voteAmountWei));
      console.log("Available:", toEther(availableVotingPower));
      setError(`Insufficient voting power. Available: ${toEther(availableVotingPower)} WEMARK`);
      return;
    }
    console.log("✅ Voting power check passed");
    
    console.log("🔧 About to set loading state and prepare transaction");
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log("🔧 Preparing contract call with params:", {
        contract: votingContract.address,
        method: "delegateVotes",
        evermarkId: BigInt(evermarkId),
        voteAmountWei: voteAmountWei.toString(),
        params: [BigInt(evermarkId), voteAmountWei]
      });
      
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "delegateVotes",
        params: [BigInt(evermarkId), voteAmountWei] as const,
      });
      
      console.log("✅ Transaction prepared:", transaction);
      
      // Use the mutate function properly - it returns a Promise
      sendTransaction(transaction, {
        onSuccess: (result) => {
          console.log("✅ Transaction successful:", result);
          setSuccess(`Successfully delegated ${voteAmount} WEMARK to this Evermark!`);
          setVoteAmount("");
          
          // Refetch data
          setTimeout(() => {
            refetchVotes();
            if ('refetch' in userVotesQuery) userVotesQuery.refetch?.();
            if ('refetch' in votingPowerQuery) votingPowerQuery.refetch?.();
          }, 2000);
        },
        onError: (error) => {
          console.error("❌ Transaction failed:", error);
          setError(error.message || "Failed to delegate votes");
        },
        onSettled: () => {
          setIsVoting(false);
        }
      });
      
    } catch (err: any) {
      console.error("❌ Error preparing transaction:", err);
      setError(err.message || "Failed to prepare transaction");
      setIsVoting(false);
    }
  };
  
  const handleUnvote = async () => {
    console.log("🔍 Unvote button clicked");
    
    if (!account || !userVotes || userVotes === BigInt(0)) {
      console.log("❌ No votes to withdraw");
      setError("No votes to withdraw");
      return;
    }
    
    if (!voteAmount || parseFloat(voteAmount) <= 0) {
      console.log("❌ Invalid amount to withdraw");
      setError("Please enter a valid amount to withdraw");
      return;
    }
    
    const withdrawAmountWei = toWei(voteAmount);
    
    if (withdrawAmountWei > userVotes) {
      console.log("❌ Cannot withdraw more than delegated");
      setError(`Cannot withdraw more than delegated. Your delegation: ${toEther(userVotes)} WEMARK`);
      return;
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log("🔧 Preparing undelegate transaction:", {
        evermarkId: BigInt(evermarkId),
        withdrawAmountWei: withdrawAmountWei.toString()
      });
      
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "undelegateVotes",
        params: [BigInt(evermarkId), withdrawAmountWei],
      });
      
      console.log("✅ Undelegate transaction prepared, sending...");
      await sendTransaction(transaction as any);
      
      console.log("✅ Undelegate transaction successful!");
      
      // Refetch data after successful transaction
      setTimeout(() => {
        refetchVotes();
        if ('refetch' in userVotesQuery) userVotesQuery.refetch?.();
        if ('refetch' in votingPowerQuery) votingPowerQuery.refetch?.();
      }, 2000);
      
      setSuccess(`Successfully withdrew ${voteAmount} WEMARK from this Evermark!`);
      setVoteAmount("");
    } catch (err: any) {
      console.error("❌ Error undelegating votes:", err);
      setError(err.message || "Failed to undelegate votes");
    } finally {
      setIsVoting(false);
    }
  };
  
  // Test function for debugging
  const testVote = async () => {
    console.log("🧪 Testing vote with minimal setup...");
    
    try {
      // Test with hardcoded small amount
      const testAmount = toWei("0.01");
      
      console.log("🧪 Test params:", {
        evermarkId: BigInt(evermarkId),
        testAmount: testAmount.toString(),
        contract: votingContract.address
      });
      
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "delegateVotes",
        params: [BigInt(evermarkId), testAmount] as const,
      });
      
      console.log("✅ Test transaction prepared, sending...");
      
      // This should trigger wallet popup
      await sendTransaction(transaction as any);
      
      console.log("🎉 Test vote successful!");
    } catch (error) {
      console.error("🚨 Test vote failed:", error);
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
      
      {/* Debug Info */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
        <p><strong>Debug Info:</strong></p>
        <p>Contract: {CONTRACTS.VOTING}</p>
        <p>Evermark ID: {evermarkId}</p>
        <p>Available Power: {availableVotingPower ? toEther(availableVotingPower) : 'Loading...'}</p>
        <p>User Votes: {userVotes ? toEther(userVotes) : 'Loading...'}</p>
        <p>Current Votes: {currentVotes ? toEther(currentVotes) : 'Loading...'}</p>
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
              Vote Amount (WEMARK)
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={handleVote}
              disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
              className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            
            {userVotes && userVotes > BigInt(0) && (
              <button 
                onClick={handleUnvote}
                disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw
              </button>
            )}
            
            {/* Test Button for Debugging */}
            <button
              onClick={testVote}
              className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🧪 Test Vote
            </button>
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