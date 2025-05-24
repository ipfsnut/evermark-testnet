import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, NFT_STAKING_ABI } from "../lib/contracts";
import { useState, useCallback } from "react";

export interface NftStakeInfo {
  tokenId: string;
  lockPeriod: number;
  stakeTime: number;
  multiplier: number;
  isStaked: boolean;
  canUnstake: boolean;
  timeRemaining: number;
}

export function useNftStaking() {
  const account = useActiveAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const contract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.NFT_STAKING,
    abi: NFT_STAKING_ABI,
  });

  const { mutate: sendTransaction } = useSendTransaction();

  // Get stake info for a specific NFT
  const getStakeInfo = useCallback(async (tokenId: string): Promise<NftStakeInfo | null> => {
    if (!tokenId) return null;

    try {
      const stakeData = await readContract({
        contract,
        method: "getStakeInfo",
        params: [BigInt(tokenId)],
      });
      
      const now = Math.floor(Date.now() / 1000);
      const stakeTime = Number(stakeData[1]);
      const lockPeriod = Number(stakeData[0]);
      const unlockTime = stakeTime + lockPeriod;
      
      return {
        tokenId,
        lockPeriod,
        stakeTime,
        multiplier: Number(stakeData[2]),
        isStaked: stakeTime > 0,
        canUnstake: now >= unlockTime,
        timeRemaining: Math.max(0, unlockTime - now),
      };
    } catch (err) {
      console.error(`Error getting stake info for token ${tokenId}:`, err);
      return null;
    }
  }, [contract]);

  // Stake an NFT with lock period
  const stakeNft = useCallback(async (tokenId: string, lockPeriodDays: number) => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    if (!tokenId || lockPeriodDays <= 0) {
      setError("Invalid token ID or lock period");
      return { success: false, error: "Invalid token ID or lock period" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const lockPeriodSeconds = lockPeriodDays * 24 * 60 * 60;
      
      const transaction = prepareContractCall({
        contract,
        method: "stakeNFT",
        params: [BigInt(tokenId), BigInt(lockPeriodSeconds)],
      });

      await sendTransaction(transaction as any);

      const successMsg = `Successfully staked NFT #${tokenId} for ${lockPeriodDays} days`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error staking NFT:", err);
      const errorMsg = err.message || "Failed to stake NFT";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction]);

  // Unstake an NFT
  const unstakeNft = useCallback(async (tokenId: string) => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    if (!tokenId) {
      setError("Invalid token ID");
      return { success: false, error: "Invalid token ID" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const transaction = prepareContractCall({
        contract,
        method: "unstakeNFT",
        params: [BigInt(tokenId)],
      });

      await sendTransaction(transaction as any);

      const successMsg = `Successfully unstaked NFT #${tokenId}`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error unstaking NFT:", err);
      const errorMsg = err.message || "Failed to unstake NFT";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction]);

  // Claim NFT staking rewards
  const claimNftRewards = useCallback(async () => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const transaction = prepareContractCall({
        contract,
        method: "claimRewards",
        params: [account.address],
      });

      const result = await sendTransaction(transaction as any);

      const successMsg = "Successfully claimed NFT staking rewards";
      setSuccess(successMsg);
      return { success: true, message: successMsg, result };
    } catch (err: any) {
      console.error("Error claiming NFT rewards:", err);
      const errorMsg = err.message || "Failed to claim NFT rewards";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsProcessing(false);
    }
  }, [account?.address, contract, sendTransaction]);

  // Get lock period multipliers (static data)
  const getLockPeriodOptions = () => [
    { days: 7, multiplier: 1.5, label: "1 Week (1.5x)" },
    { days: 14, multiplier: 2.0, label: "2 Weeks (2.0x)" },
    { days: 30, multiplier: 3.0, label: "1 Month (3.0x)" },
  ];

  // Format time remaining for display
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return "Unlocked";
    
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
  };

  return {
    // Actions
    stakeNft,
    unstakeNft,
    claimNftRewards,
    getStakeInfo,
    
    // Utilities
    getLockPeriodOptions,
    formatTimeRemaining,
    
    // State
    isProcessing,
    error,
    success,
    isConnected: !!account,
    
    // Clear messages
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    },
  };
}