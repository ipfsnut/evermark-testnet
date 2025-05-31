import { useState, useCallback, useMemo } from "react";
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EMARK_TOKEN_ABI, NFT_STAKING_ABI } from "../lib/contracts";
import { useFarcasterUser } from "../lib/farcaster";

export function useStaking(userAddress?: string) {
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { isInFarcaster, isAuthenticated: isFarcasterAuth, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();
  const effectiveUserAddress = userAddress || (isInFarcaster && isFarcasterAuth && hasVerifiedAddress() ? getPrimaryAddress() : null);
  
  const emarkContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  }), []);
  
  const stakingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.NFT_STAKING,
    abi: NFT_STAKING_ABI,
  }), []);
  
  // Get user's liquid EMARK balance
  const { data: emarkBalance, isLoading: isLoadingBalance } = useReadContract({
    contract: emarkContract,
    method: "balanceOf",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get user's wEMARK (staked) balance
  const { data: wEmarkBalance, isLoading: isLoadingStaked } = useReadContract({
    contract: stakingContract,
    method: "getUserStakedBalance",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get user staking info (includes NFT staking data)
  const { data: userStakingInfo, isLoading: isLoadingStakingInfo } = useReadContract({
    contract: stakingContract,
    method: "getUserStakingInfo",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get staking rewards
  const { data: pendingRewards, isLoading: isLoadingRewards } = useReadContract({
    contract: stakingContract,
    method: "calculatePendingRewards",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get user's available voting power (might be same as wEMARK balance)
  const { data: votingPower, isLoading: isLoadingVotingPower } = useReadContract({
    contract: stakingContract,
    method: "getUserVotingPower",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  const { mutate: sendTransaction } = useSendTransaction();
  
  // Stake EMARK tokens (convert to wEMARK)
  const stakeTokens = useCallback(async (amount: bigint) => {
    if (!effectiveUserAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsStaking(true);
    setError(null);
    setSuccess(null);
    
    try {
      // First approve the staking contract to spend EMARK tokens
      const approveTransaction = prepareContractCall({
        contract: emarkContract,
        method: "approve",
        params: [CONTRACTS.NFT_STAKING, amount],
      });
      
      // Then stake the tokens (converts EMARK to wEMARK)
      const stakeTransaction = prepareContractCall({
        contract: stakingContract,
        method: "stakeTokens",
        params: [amount],
      });
      
      // Execute approve first, then stake
      return new Promise((resolve) => {
        sendTransaction(approveTransaction as any, {
          onSuccess: () => {
            sendTransaction(stakeTransaction as any, {
              onSuccess: (result: any) => {
                setSuccess(`Successfully staked ${amount.toString()} $EMARK → wEMARK!`);
                setIsStaking(false);
                resolve({ success: true, txHash: result.transactionHash });
              },
              onError: (error: any) => {
                setError(`Staking failed: ${error.message}`);
                setIsStaking(false);
                resolve({ success: false, error: error.message });
              }
            });
          },
          onError: (error: any) => {
            setError(`Approval failed: ${error.message}`);
            setIsStaking(false);
            resolve({ success: false, error: error.message });
          }
        });
      });
    } catch (err: any) {
      setError(err.message || "Failed to stake tokens");
      setIsStaking(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, emarkContract, stakingContract, sendTransaction]);
  
  // Unstake wEMARK tokens (convert back to EMARK)
  const unstakeTokens = useCallback(async (amount: bigint) => {
    if (!effectiveUserAddress) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsUnstaking(true);
    setError(null);
    setSuccess(null);
    
    try {
      const transaction = prepareContractCall({
        contract: stakingContract,
        method: "unstakeTokens",
        params: [amount],
      });
      
      return new Promise((resolve) => {
        sendTransaction(transaction as any, {
          onSuccess: (result: any) => {
            setSuccess(`Successfully unstaked ${amount.toString()} wEMARK → $EMARK!`);
            setIsUnstaking(false);
            resolve({ success: true, txHash: result.transactionHash });
          },
          onError: (error: any) => {
            setError(`Unstaking failed: ${error.message}`);
            setIsUnstaking(false);
            resolve({ success: false, error: error.message });
          }
        });
      });
    } catch (err: any) {
      setError(err.message || "Failed to unstake tokens");
      setIsUnstaking(false);
      return { success: false, error: err.message };
    }
  }, [effectiveUserAddress, stakingContract, sendTransaction]);
  
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  // Use the correct staked balance - prioritize direct query, fallback to staking info
  const actualStakedBalance = wEmarkBalance || userStakingInfo?.totalStaked || BigInt(0);
  
  // Available voting power - use dedicated query or fallback to staked balance
  const actualVotingPower = votingPower || actualStakedBalance;
  
  return {
    // Balances
    emarkBalance: emarkBalance || BigInt(0), // Liquid EMARK
    wEmarkBalance: actualStakedBalance, // Staked wEMARK
    totalStaked: actualStakedBalance, // For StakingDashboard compatibility
    availableVotingPower: actualVotingPower, // For StakingDashboard compatibility
    pendingRewards: pendingRewards || BigInt(0),
    
    // NFT Staking Info
    stakedNFTs: userStakingInfo?.stakedNFTs || [],
    stakedCount: userStakingInfo?.stakedCount || 0,
    
    // Loading states
    isLoadingBalance,
    isLoadingStaked: isLoadingStaked || isLoadingStakingInfo,
    isLoadingStakingInfo,
    isLoadingRewards,
    isLoadingVotingPower,
    
    // Transaction states
    isStaking,
    isUnstaking,
    
    // Actions
    stakeTokens,
    unstakeTokens,
    
    // Messages
    error,
    success,
    clearMessages,
    
    // Auth info
    effectiveUserAddress,
    hasWalletAccess: !!effectiveUserAddress,
    
    // Token type helpers
    tokenTypes: {
      liquid: 'EMARK',
      staked: 'wEMARK',
      description: {
        EMARK: 'Liquid token for transactions and trading',
        wEMARK: 'Staked EMARK earning rewards (locked)'
      }
    }
  };
}
