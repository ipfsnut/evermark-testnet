import { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, VOTING_ABI } from "../lib/contracts";
import { toEther, toWei } from "thirdweb/utils";

export function useVoting(evermarkId: string, userAddress?: string) {
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Only need the voting contract now - it has all the methods we need
  const votingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  }), []);
  
  // ✅ Get total votes for this Evermark
  const { data: totalVotes, isLoading: isLoadingTotalVotes, refetch: refetchTotalVotes } = useReadContract({
    contract: votingContract,
    method: "getEvermarkVotes", 
    params: [BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!evermarkId && evermarkId !== "0",
    },
  });
  
  // ✅ Get user's votes for this Evermark
  const userVotesQuery = useReadContract({
    contract: votingContract,
    method: "getUserVotesForEvermark",
    params: [userAddress || "0x0000000000000000000000000000000000000000", BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!userAddress && !!evermarkId && evermarkId !== "0",
    },
  });
  
  // ✅ FIXED: Get user's remaining voting power from EvermarkVoting (not CardCatalog)
  const votingPowerQuery = useReadContract({
    contract: votingContract,
    method: "getRemainingVotingPower", // ✅ FIXED: This is the correct method name
    params: [userAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!userAddress,
    },
  });
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // ✅ Delegate votes function
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
    if (votingPowerQuery.data && voteAmountWei > votingPowerQuery.data) {
      const errorMsg = `Insufficient voting power. Available: ${toEther(votingPowerQuery.data)} WEMARK`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "delegateVotes", // ✅ Correct
        params: [BigInt(evermarkId), voteAmountWei] as const,
      });
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: () => {
            const successMsg = `Successfully delegated ${amount} WEMARK to this Evermark!`;
            setSuccess(successMsg);
            
            // Refetch data after successful transaction
            setTimeout(() => {
              refetchTotalVotes();
              userVotesQuery.refetch?.();
              votingPowerQuery.refetch?.();
            }, 2000);
            
            resolve({ success: true, message: successMsg });
          },
          onError: (error: any) => {
            console.error("Error delegating votes:", error);
            const errorMsg = error.message || "Failed to delegate votes";
            setError(errorMsg);
            resolve({ success: false, error: errorMsg });
          }
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || "Failed to delegate votes";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [userAddress, evermarkId, votingPowerQuery.data, votingContract, sendTransaction, refetchTotalVotes, userVotesQuery, votingPowerQuery]);
  
  // ✅ Undelegate votes function
  const undelegateVotes = useCallback(async (amount: string) => {
    if (!userAddress) {
      const errorMsg = "Please connect your wallet";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    const userVotes = userVotesQuery.data;
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
      const errorMsg = `Cannot withdraw more than delegated. Your delegation: ${toEther(userVotes)} WEMARK`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: votingContract,
        method: "undelegateVotes", // ✅ Correct
        params: [BigInt(evermarkId), withdrawAmountWei] as const,
      });
      
      return new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: () => {
            const successMsg = `Successfully withdrew ${amount} WEMARK from this Evermark!`;
            setSuccess(successMsg);
            
            // Refetch data after successful transaction
            setTimeout(() => {
              refetchTotalVotes();
              userVotesQuery.refetch?.();
              votingPowerQuery.refetch?.();
            }, 2000);
            
            resolve({ success: true, message: successMsg });
          },
          onError: (error: any) => {
            console.error("Error undelegating votes:", error);
            const errorMsg = error.message || "Failed to undelegate votes";
            setError(errorMsg);
            resolve({ success: false, error: errorMsg });
          }
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || "Failed to undelegate votes";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [userAddress, userVotesQuery.data, evermarkId, votingContract, sendTransaction, refetchTotalVotes, userVotesQuery, votingPowerQuery]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  return {
    totalVotes: totalVotes || BigInt(0),
    userVotes: userVotesQuery.data || BigInt(0),
    availableVotingPower: votingPowerQuery.data || BigInt(0), // This is now "remaining" voting power
    isLoadingTotalVotes,
    isLoadingUserVotes: userVotesQuery.isLoading,
    isLoadingVotingPower: votingPowerQuery.isLoading,
    isVoting,
    error,
    success,
    delegateVotes,
    undelegateVotes,
    clearMessages,
  };
}