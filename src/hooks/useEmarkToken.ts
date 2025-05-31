// src/hooks/useEmarkToken.ts - Dramatically simplified with WalletProvider
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EMARK_TOKEN_ABI } from "../lib/contracts";
import { useState, useCallback } from "react";
import { toWei } from "thirdweb/utils";
import { useWalletAuth, useTransactionWallet } from "../providers/WalletProvider";

export function useEmarkToken() {
  const [isTransacting, setIsTransacting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 🎉 SIMPLIFIED: Use wallet provider instead of manual checks
  const { isConnected, address, requireConnection } = useWalletAuth();
  const { thirdwebAccount, canInteract } = useTransactionWallet();
  
  const contract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  });

  // 🎉 SIMPLIFIED: Contract queries (much cleaner with guaranteed address)
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useReadContract({
    contract,
    method: "balanceOf",
    params: address ? [address] : ["0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!address,
    },
  });

  // Get allowance for CardCatalog (for staking)
  const { data: stakingAllowance, refetch: refetchStakingAllowance } = useReadContract({
    contract,
    method: "allowance",
    params: address ? [address, CONTRACTS.CARD_CATALOG] : ["0x0000000000000000000000000000000000000000", CONTRACTS.CARD_CATALOG],
    queryOptions: {
      enabled: !!address,
    },
  });

  // Token info (these don't need wallet connection)
  const { data: name } = useReadContract({
    contract,
    method: "name",
    params: [],
  });

  const { data: symbol } = useReadContract({
    contract,
    method: "symbol", 
    params: [],
  });

  const { data: decimals } = useReadContract({
    contract,
    method: "decimals",
    params: [],
  });

  const { data: totalSupply } = useReadContract({
    contract,
    method: "totalSupply",
    params: [],
  });

  const { mutate: sendTransaction } = useSendTransaction();

  // 🎉 SIMPLIFIED: Approve CardCatalog for staking with auto-connection
  const approveStaking = useCallback(async (amount: string) => {
    // Auto-connect if needed (handles both thirdweb and Farcaster)
    if (!canInteract) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      // Give connection a moment to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsTransacting(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      const transaction = prepareContractCall({
        contract,
        method: "approve",
        params: [CONTRACTS.CARD_CATALOG, amountWei],
      });

      // 🎉 SIMPLIFIED: Use thirdweb transaction (provider handles wallet detection)
      await sendTransaction(transaction as any);

      // Refetch allowance after approval
      setTimeout(() => {
        refetchStakingAllowance();
      }, 2000);

      const successMsg = `Successfully approved ${amount} EMARK for staking`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error approving tokens:", err);
      let errorMsg = "Failed to approve tokens";
      
      // Better error handling
      if (err.message) {
        if (err.message.includes("insufficient funds")) {
          errorMsg = "Insufficient funds for gas fees";
        } else if (err.message.includes("user rejected")) {
          errorMsg = "Transaction was rejected by user";
        } else {
          errorMsg = err.message;
        }
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsTransacting(false);
    }
  }, [canInteract, requireConnection, contract, sendTransaction, refetchStakingAllowance]);

  // 🎉 SIMPLIFIED: Transfer tokens with auto-connection
  const transfer = useCallback(async (to: string, amount: string) => {
    // Auto-connect if needed
    if (!canInteract) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        const errorMsg = connectionResult.error || "Please connect your wallet";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsTransacting(true);
    setError(null);
    setSuccess(null);

    try {
      const amountWei = toWei(amount);
      
      const transaction = prepareContractCall({
        contract,
        method: "transfer",
        params: [to, amountWei],
      });

      // 🎉 SIMPLIFIED: Use thirdweb transaction
      await sendTransaction(transaction as any);

      // Refetch balance after transfer
      setTimeout(() => {
        refetchBalance();
      }, 2000);

      const successMsg = `Successfully transferred ${amount} EMARK`;
      setSuccess(successMsg);
      return { success: true, message: successMsg };
    } catch (err: any) {
      console.error("Error transferring tokens:", err);
      let errorMsg = "Failed to transfer tokens";
      
      // Better error handling
      if (err.message) {
        if (err.message.includes("insufficient funds")) {
          errorMsg = "Insufficient funds for transaction and gas fees";
        } else if (err.message.includes("user rejected")) {
          errorMsg = "Transaction was rejected by user";
        } else if (err.message.includes("ERC20: transfer amount exceeds balance")) {
          errorMsg = "Insufficient EMARK balance";
        } else {
          errorMsg = err.message;
        }
      }
      
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsTransacting(false);
    }
  }, [canInteract, requireConnection, contract, sendTransaction, refetchBalance]);

  return {
    // Token info
    name: name || "EMARK",
    symbol: symbol || "EMARK", 
    decimals: decimals || 18,
    totalSupply: totalSupply || 0n,
    
    // User data
    balance: balance || 0n,
    stakingAllowance: stakingAllowance || 0n,
    balanceLoading,
    isConnected, // 🎉 SIMPLIFIED: From provider
    
    // Actions
    approveStaking,
    transfer,
    
    // State
    isTransacting,
    error,
    success,
    clearMessages: () => {
      setError(null);
      setSuccess(null);
    },
    
    // Utilities
    refetchBalance,
    refetchStakingAllowance,
    
    // 🎉 NEW: Enhanced capabilities from provider
    canInteract,
    userAddress: address,
    requireConnection, // Expose for manual connection if needed
  };
}