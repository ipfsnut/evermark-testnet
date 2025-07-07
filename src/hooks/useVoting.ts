// Fixed useVoting.ts - Use unified wallet provider with correct ABI method names

import { useState, useCallback, useMemo } from "react";
import { useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { encodeFunctionData } from "viem";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, VOTING_ABI, CARD_CATALOG_ABI } from "../lib/contracts";
import { useWalletAuth, useWalletConnection } from "../providers/WalletProvider";
import { toEther, toWei } from "thirdweb/utils";

export function useVoting(evermarkId: string, userAddress?: string) {
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ✅ Use unified wallet providers
  const { address: walletAddress, isConnected, requireConnection } = useWalletAuth();
  const { sendTransaction, walletType } = useWalletConnection();
  
  // ✅ Use wallet provider address if userAddress not provided
  const effectiveUserAddress = userAddress || walletAddress;
  
  // Both contracts needed for full voting functionality
  const votingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.VOTING,
    abi: VOTING_ABI,
  }), []);

  const cardCatalogContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  }), []);

  // Get current cycle
  const { data: currentCycle, isLoading: isLoadingCycle, refetch: refetchCycle } = useReadContract({
    contract: votingContract,
    method: "getCurrentCycle",
    params: [],
  });

  // Get voting power from CardCatalog
  const { data: availableVotingPower, isLoading: isLoadingVotingPower, refetch: refetchVotingPower } = useReadContract({
    contract: cardCatalogContract,
    method: "getAvailableVotingPower",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });

  // Get total voting power from CardCatalog
  const { data: totalVotingPower } = useReadContract({
    contract: cardCatalogContract,
    method: "getTotalVotingPower",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });

  // Get total wEMARK balance for debugging
  const { data: totalWemark } = useReadContract({
    contract: cardCatalogContract,
    method: "balanceOf",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });

  // ✅ FIXED: Use correct method name for getting votes in cycle
  const { data: totalVotes, isLoading: isLoadingTotalVotes, refetch: refetchTotalVotes } = useReadContract({
    contract: votingContract,
    method: "getEvermarkVotesInCycle",
    params: [currentCycle || BigInt(1), BigInt(evermarkId || "0")] as const,
    queryOptions: {
      enabled: !!evermarkId && evermarkId !== "0" && !!currentCycle,
    },
  });

  // ✅ FIXED: Use correct method name for getting user votes in cycle
  const userVotesQuery = useReadContract({
    contract: votingContract,
    method: "getUserVotesInCycle",
    params: [
      currentCycle || BigInt(1), 
      effectiveUserAddress || "0x0000000000000000000000000000000000000000", 
      BigInt(evermarkId || "0")
    ] as const,
    queryOptions: {
      enabled: !!effectiveUserAddress && !!evermarkId && evermarkId !== "0" && !!currentCycle,
    },
  });

  // Get cycle info
  const { data: cycleInfo } = useReadContract({
    contract: votingContract,
    method: "getCycleInfo",
    params: [currentCycle || BigInt(1)] as const,
    queryOptions: {
      enabled: !!currentCycle,
    },
  });

  // Get time remaining
  const { data: timeRemaining } = useReadContract({
    contract: votingContract,
    method: "getTimeRemainingInCurrentCycle",
    params: [] as const,
  });

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log("🔍 Voting Power:", {
      userAddress: effectiveUserAddress ? `${effectiveUserAddress.slice(0, 6)}...${effectiveUserAddress.slice(-4)}` : null,
      totalWemark: totalWemark ? toEther(totalWemark) : "0",
      availableVotingPower: availableVotingPower ? toEther(availableVotingPower) : "0",
      totalVotingPower: totalVotingPower ? toEther(totalVotingPower) : "0",
      currentCycle: currentCycle?.toString(),
      walletType,
      isConnected
    });
  }
  
  // ✅ Delegate votes using unified wallet provider
  const delegateVotes = useCallback(async (amount: string) => {
    console.log('🗳️ Starting delegate votes process...');
    
    // ✅ Use unified connection check
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
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

    setIsVoting(true);
    setError(null);
    setSuccess(null);

    // Refresh data immediately before transaction
    await Promise.all([
      refetchCycle(),
      refetchVotingPower(), 
      refetchTotalVotes(),
      userVotesQuery.refetch?.(),
    ]);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const voteAmountWei = toWei(amount);
    
    // Re-check with fresh data  
    const freshVotingPowerResult = await refetchVotingPower();
    const actualAvailable = freshVotingPowerResult.data || availableVotingPower || BigInt(0);
    
    console.log("🔍 Voting attempt:", {
      amount: `${amount} wEMARK`,
      available: `${toEther(actualAvailable)} wEMARK`,
      hasEnough: voteAmountWei <= actualAvailable,
      walletType
    });

    // Check with fresh data
    if (voteAmountWei > actualAvailable) {
      const errorMsg = `Insufficient voting power. Available: ${toEther(actualAvailable)} wEMARK`;
      setError(errorMsg);
      setIsVoting(false);
      return { success: false, error: errorMsg };
    }
    
    try {
      // ✅ Prepare transaction based on wallet type
      let transaction;
      
      if (walletType === 'farcaster') {
        // Use viem encoding for Farcaster frames
        const data = encodeFunctionData({
          abi: VOTING_ABI,
          functionName: 'delegateVotes',
          args: [BigInt(evermarkId), voteAmountWei]
        });
        
        transaction = {
          to: CONTRACTS.VOTING as `0x${string}`,
          data,
        };
      } else {
        // Use thirdweb for desktop
        transaction = prepareContractCall({
          contract: votingContract,
          method: "delegateVotes",
          params: [BigInt(evermarkId), voteAmountWei] as const,
        });
      }
      
      console.log('📡 Sending vote transaction via unified provider...');
      
      // ✅ Use unified wallet provider's sendTransaction
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        console.log("✅ Vote delegation successful:", result.transactionHash);
        
        const successMsg = `Successfully delegated ${amount} wEMARK to this Evermark!`;
        setSuccess(successMsg);
        
        // Refetch all relevant data
        setTimeout(() => {
          refetchCycle();
          refetchTotalVotes();
          refetchVotingPower();
          userVotesQuery.refetch?.();
        }, 2000);
        
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Vote delegation failed:", err);
      
      let errorMsg = "Failed to delegate votes";
      if (err.message?.includes("Cannot vote on own Evermark")) {
        errorMsg = "You cannot vote on your own Evermark";
      } else if (err.message?.includes("Insufficient voting power")) {
        errorMsg = "Insufficient voting power available";
      } else if (err.message?.includes("Evermark does not exist")) {
        errorMsg = "This Evermark does not exist";
      } else if (err.message?.includes("Current cycle is finalized")) {
        errorMsg = "Current voting cycle has ended";
      } else if (err.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [
    isConnected, 
    requireConnection, 
    evermarkId, 
    availableVotingPower, 
    walletType,
    votingContract, 
    sendTransaction, 
    refetchCycle, 
    refetchTotalVotes, 
    refetchVotingPower, 
    userVotesQuery
  ]);
  
  // ✅ Undelegate votes using unified wallet provider
  const undelegateVotes = useCallback(async (amount: string) => {
    console.log('🗳️ Starting undelegate votes process...');
    
    // ✅ Use unified connection check
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }
    
    const userVotes = userVotesQuery.data;
    if (!userVotes || userVotes === BigInt(0)) {
      const errorMsg = "No votes to withdraw from this Evermark";
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
      const errorMsg = `Cannot withdraw more than delegated. Your delegation: ${toEther(userVotes)} wEMARK`;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // ✅ Prepare transaction based on wallet type
      let transaction;
      
      if (walletType === 'farcaster') {
        // Use viem encoding for Farcaster frames
        const data = encodeFunctionData({
          abi: VOTING_ABI,
          functionName: 'undelegateVotes',
          args: [BigInt(evermarkId), withdrawAmountWei]
        });
        
        transaction = {
          to: CONTRACTS.VOTING as `0x${string}`,
          data,
        };
      } else {
        // Use thirdweb for desktop
        transaction = prepareContractCall({
          contract: votingContract,
          method: "undelegateVotes",
          params: [BigInt(evermarkId), withdrawAmountWei] as const,
        });
      }
      
      console.log('📡 Sending unvote transaction via unified provider...');
      
      // ✅ Use unified wallet provider's sendTransaction
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        console.log("✅ Vote undelegation successful:", result.transactionHash);
        
        const successMsg = `Successfully withdrew ${amount} wEMARK from this Evermark!`;
        setSuccess(successMsg);
        
        // Refetch all relevant data
        setTimeout(() => {
          refetchCycle();
          refetchTotalVotes();
          refetchVotingPower();
          userVotesQuery.refetch?.();
        }, 2000);
        
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Vote undelegation failed:", err);
      
      let errorMsg = "Failed to undelegate votes";
      if (err.message?.includes("Insufficient delegated votes")) {
        errorMsg = "You don't have enough votes delegated to this Evermark";
      } else if (err.message?.includes("Current cycle is finalized")) {
        errorMsg = "Current voting cycle has ended";
      } else if (err.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [
    isConnected,
    requireConnection,
    userVotesQuery.data, 
    evermarkId, 
    walletType,
    votingContract, 
    sendTransaction, 
    refetchCycle, 
    refetchTotalVotes, 
    refetchVotingPower, 
    userVotesQuery
  ]);

  // ✅ NEW: Batch delegate votes function
  const delegateVotesBatch = useCallback(async (evermarkIds: string[], amounts: string[]) => {
    console.log('🗳️ Starting batch delegate votes process...');
    
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }
    
    if (evermarkIds.length !== amounts.length) {
      const errorMsg = "Evermark IDs and amounts arrays must be the same length";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (evermarkIds.length === 0) {
      const errorMsg = "No evermarks to vote for";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsVoting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const evermarkIdsBigInt = evermarkIds.map(id => BigInt(id));
      const amountsBigInt = amounts.map(amount => toWei(amount));
      
      // ✅ Prepare transaction based on wallet type
      let transaction;
      
      if (walletType === 'farcaster') {
        // Use viem encoding for Farcaster frames
        const data = encodeFunctionData({
          abi: VOTING_ABI,
          functionName: 'delegateVotesBatch',
          args: [evermarkIdsBigInt, amountsBigInt]
        });
        
        transaction = {
          to: CONTRACTS.VOTING as `0x${string}`,
          data,
        };
      } else {
        // Use thirdweb for desktop
        transaction = prepareContractCall({
          contract: votingContract,
          method: "delegateVotesBatch",
          params: [evermarkIdsBigInt, amountsBigInt] as const,
        });
      }
      
      console.log('📡 Sending batch vote transaction via unified provider...');
      
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        console.log("✅ Batch vote delegation successful:", result.transactionHash);
        
        const successMsg = `Successfully delegated votes to ${evermarkIds.length} Evermarks!`;
        setSuccess(successMsg);
        
        // Refetch all relevant data
        setTimeout(() => {
          refetchCycle();
          refetchTotalVotes();
          refetchVotingPower();
          userVotesQuery.refetch?.();
        }, 2000);
        
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Batch vote delegation failed:", err);
      
      let errorMsg = "Failed to delegate votes in batch";
      if (err.message?.includes("Insufficient voting power")) {
        errorMsg = "Insufficient voting power for batch delegation";
      } else if (err.message?.includes("user rejected")) {
        errorMsg = "Transaction was rejected";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [
    isConnected,
    requireConnection,
    walletType,
    votingContract,
    sendTransaction,
    refetchCycle,
    refetchTotalVotes,
    refetchVotingPower,
    userVotesQuery
  ]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Calculate derived values
  const isLoadingVotingData = isLoadingCycle || isLoadingTotalVotes || 
    (!!effectiveUserAddress && userVotesQuery.isLoading) || 
    (!!effectiveUserAddress && isLoadingVotingPower);
    
  const cycleEndTime = useMemo(() => {
    if (!cycleInfo) return null;
    return new Date(Number(cycleInfo.endTime) * 1000);
  }, [cycleInfo]);
  
  const isCycleFinalized = cycleInfo?.finalized || false;
  const canVote = !!effectiveUserAddress && !isLoadingVotingData && !isCycleFinalized && 
                  (availableVotingPower || BigInt(0)) > BigInt(0);
  
  return {
    // Core voting data
    totalVotes: totalVotes || BigInt(0),
    userVotes: userVotesQuery.data || BigInt(0),
    availableVotingPower: availableVotingPower || BigInt(0),
    
    // Debug info
    totalWemarkBalance: totalWemark || BigInt(0),
    totalVotingPower: totalVotingPower || BigInt(0),
    
    // Cycle information
    currentCycle: currentCycle ? Number(currentCycle) : 0,
    cycleInfo,
    timeRemaining: timeRemaining ? Number(timeRemaining) : 0,
    cycleEndTime,
    isCycleFinalized,
    
    // Loading states
    isLoadingTotalVotes: isLoadingVotingData,
    isLoadingUserVotes: userVotesQuery.isLoading,
    isLoadingVotingPower,
    isLoadingCycle,
    
    // Action states
    isVoting,
    canVote,
    
    // Messages
    error,
    success,
    
    // Actions
    delegateVotes,
    undelegateVotes,
    delegateVotesBatch, // ✅ NEW: Batch voting function
    clearMessages,
    
    // Manual refresh
    refresh: useCallback(() => {
      refetchCycle();
      refetchTotalVotes();
      refetchVotingPower();
      userVotesQuery.refetch?.();
    }, [refetchCycle, refetchTotalVotes, refetchVotingPower, userVotesQuery]),
    
    // Helper functions
    formatTimeRemaining: useCallback((seconds: number) => {
      if (seconds <= 0) return "Cycle ended";
      
      const days = Math.floor(seconds / (24 * 60 * 60));
      const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((seconds % (60 * 60)) / 60);
      
      if (days > 0) {
        return `${days}d ${hours}h remaining`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m remaining`;
      } else {
        return `${minutes}m remaining`;
      }
    }, []),
    
    // ✅ Auth info for debugging
    authInfo: {
      effectiveUserAddress,
      isConnected,
      walletType
    }
  };
}