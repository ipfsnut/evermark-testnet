import { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, VOTING_ABI, CARD_CATALOG_ABI } from "../lib/contracts";
import { toEther, toWei } from "thirdweb/utils";

export function useVoting(evermarkId: string, userAddress?: string) {
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Memoize contracts to prevent recreation
  const votingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  }), []);
  
  const catalogContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  }), []);
  
  // Get total votes for this Evermark
  const { data: totalVotes, isLoading: isLoadingTotalVotes, refetch: refetchTotalVotes } = useReadContract({
    contract: votingContract,
    method: "getBookmarkVotes",
    params: [BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!evermarkId && evermarkId !== "0",
    },
  });
  
  // Get user's votes for this Evermark - Always call hook, use enabled to control execution
  const userVotesQuery = useReadContract({
    contract: votingContract,
    method: "getUserVotesForBookmark",
    params: [userAddress || "0x0000000000000000000000000000000000000000", BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!userAddress && !!evermarkId && evermarkId !== "0",
    },
  });
  
  const userVotes = userVotesQuery.data;
  const isLoadingUserVotes = userVotesQuery.isLoading;
  
  // Get user's available voting power - Always call hook, use enabled to control execution
  const votingPowerQuery = useReadContract({
    contract: catalogContract,
    method: "getAvailableVotingPower",
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  const availableVotingPower = votingPowerQuery.data;
  const isLoadingVotingPower = votingPowerQuery.isLoading;
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Function to delegate votes
  const delegateVotes = useCallback(async (amount: string) => {
    if (!userAddress) {
      const errorMsg = "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      const errorMsg = "Please enter a valid vote amount";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!evermarkId || evermarkId === "0") {
      const errorMsg = "Invalid Evermark ID";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    const voteAmountWei = toWei(amount);
    
    // Check if user has enough voting power
    if (availableVotingPower && voteAmountWei > availableVotingPower) {
      const errorMsg = `Insufficient voting power. Available: ${toEther(availableVotingPower)} NSI`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
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
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        refetchTotalVotes();
        userVotesQuery.refetch();
        votingPowerQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully delegated ${amount} NSI to this Evermark!`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error delegating votes:", err);
      const errorMsg = err.message || "Failed to delegate votes";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [userAddress, evermarkId, availableVotingPower, votingContract, sendTransaction, refetchTotalVotes, userVotesQuery, votingPowerQuery]);
  
  // Function to undelegate votes
  const undelegateVotes = useCallback(async (amount: string) => {
    if (!userAddress) {
      const errorMsg = "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!userVotes || userVotes === BigInt(0)) {
      const errorMsg = "No votes to withdraw";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      const errorMsg = "Please enter a valid amount to withdraw";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    const withdrawAmountWei = toWei(amount);
    
    if (withdrawAmountWei > userVotes) {
      const errorMsg = `Cannot withdraw more than delegated. Your delegation: ${toEther(userVotes)} NSI`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
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
      
      await sendTransaction(transaction as any);
      
      // Refetch data after successful transaction
      setTimeout(() => {
        refetchTotalVotes();
        userVotesQuery.refetch();
        votingPowerQuery.refetch();
      }, 2000);
      
      const successMsg = `Successfully withdrew ${amount} NSI from this Evermark!`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error undelegating votes:", err);
      const errorMsg = err.message || "Failed to undelegate votes";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [userAddress, userVotes, evermarkId, votingContract, sendTransaction, refetchTotalVotes, userVotesQuery, votingPowerQuery]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  return {
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
  };
}