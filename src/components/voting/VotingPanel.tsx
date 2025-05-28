import { useState, useEffect } from "react";
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
  
  const votingContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  });
  
  // Get current votes for this Evermark
  const { data: currentVotes, isLoading: isLoadingVotes, refetch: refetchVotes } = useReadContract({
    contract: votingContract,
    method: "getEvermarkVotes", // FIXED: Use redeployed contract method name
    params: [BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!evermarkId && evermarkId !== "0",
    },
  });

  // Get user votes for this Evermark
  const userVotesQuery = account ? useReadContract({
    contract: votingContract,
    method: "getUserVotesForEvermark", // FIXED: Use redeployed contract method name
    params: [account.address, BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!evermarkId && evermarkId !== "0",
    },
  }) : { data: undefined, isLoading: false };

  const userVotes = userVotesQuery.data;
  const isLoadingUserVotes = 'isLoading' in userVotesQuery ? userVotesQuery.isLoading : false;

  // Get remaining voting power from EvermarkVoting contract
  const votingPowerQuery = useReadContract({
    contract: votingContract,
    method: "getRemainingVotingPower",
    params: [account?.address || ""] as const,
    queryOptions: {
      enabled: !!account?.address,
    },
  });

  const availableVotingPower = votingPowerQuery.data;
  const isLoadingVotingPower = 'isLoading' in votingPowerQuery ? votingPowerQuery.isLoading : false;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);
  
  const handleVote = async () => {
    if (!account) {
      setError("Please connect your wallet");
      return;
    }
    
    if (!voteAmount || parseFloat(voteAmount) <= 0) {
      setError("Please enter a valid vote amount");
      return;
    }
    
    if (!availableVotingPower) {
      setError("Loading voting power...");
      return;
    }
    
    const voteAmountWei = toWei(voteAmount);
    
    // Check if user has enough voting power
    if (voteAmountWei > availableVotingPower) {
      setError(`Insufficient voting power. Available: ${toEther(availableVotingPower)} WEMARK`);
      return;
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "delegateVotes",
        params: [BigInt(evermarkId), voteAmountWei] as const,
      });
      
      return new Promise<void>((resolve, reject) => {
        sendTransaction(transaction as any, {
          onSuccess: (result) => {
            setSuccess(`Successfully delegated ${voteAmount} WEMARK to this Evermark!`);
            setVoteAmount("");
            
            // Refetch data
            setTimeout(() => {
              refetchVotes();
              if ('refetch' in userVotesQuery) userVotesQuery.refetch?.();
              if ('refetch' in votingPowerQuery) votingPowerQuery.refetch?.();
            }, 2000);
            
            resolve();
          },
          onError: (error) => {
            setError(error.message || "Failed to delegate votes");
            reject(error);
          },
          onSettled: () => {
            setIsVoting(false);
          }
        });
      });
      
    } catch (err: any) {
      setError(err.message || "Failed to prepare transaction");
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
      setError(`Cannot withdraw more than delegated. Your delegation: ${toEther(userVotes)} WEMARK`);
      return;
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "undelegateVotes",
        params: [BigInt(evermarkId), withdrawAmountWei] as const,
      });
      
      return new Promise<void>((resolve, reject) => {
        sendTransaction(transaction as any, {
          onSuccess: () => {
            setSuccess(`Successfully withdrew ${voteAmount} WEMARK from this Evermark!`);
            setVoteAmount("");
            
            // Refetch data after successful transaction
            setTimeout(() => {
              refetchVotes();
              if ('refetch' in userVotesQuery) userVotesQuery.refetch?.();
              if ('refetch' in votingPowerQuery) votingPowerQuery.refetch?.();
            }, 2000);
            
            resolve();
          },
          onError: (error) => {
            setError(error.message || "Failed to undelegate votes");
            reject(error);
          },
          onSettled: () => {
            setIsVoting(false);
          }
        });
      });
    } catch (err: any) {
      setError(err.message || "Failed to undelegate votes");
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
            
            {userVotes && userVotes > BigInt(0) && (
              <button 
                onClick={handleUnvote}
                disabled={isVoting || !voteAmount || parseFloat(voteAmount) <= 0}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw
              </button>
            )}
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