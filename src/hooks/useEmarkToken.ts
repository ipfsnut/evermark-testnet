// Fixed useEmarkToken.ts - Use unified wallet provider instead of thirdweb directly
// Replace your entire src/hooks/useEmarkToken.ts with this:

import { useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { encodeFunctionData } from "viem";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EMARK_TOKEN_ABI } from "../lib/contracts";
import { useState, useCallback } from "react";
import { toWei } from "thirdweb/utils";
import { useWalletAuth, useWalletConnection } from "../providers/WalletProvider"; // ✅ USE UNIFIED PROVIDER

export function useEmarkToken() {
  const [isTransacting, setIsTransacting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ✅ CRITICAL FIX: Use unified wallet providers
  const { isConnected, address, requireConnection } = useWalletAuth();
  const { sendTransaction, walletType } = useWalletConnection();
  
  const contract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  });

  // Contract queries (these work the same way)
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

  // ✅ CRITICAL FIX: Approve CardCatalog using unified wallet provider
  const approveStaking = useCallback(async (amount: string) => {
    console.log('💰 Starting approve staking process...');
    
    // ✅ Use unified connection check
    if (!isConnected) {
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
      console.log('💰 Approving', amount, 'EMARK for staking using', walletType);
      
      const amountWei = toWei(amount);
      
      // ✅ CRITICAL FIX: Prepare transaction based on wallet type
      let transaction;
      
      if (walletType === 'farcaster') {
        // Use viem encoding for Farcaster frames
        const data = encodeFunctionData({
          abi: EMARK_TOKEN_ABI,
          functionName: 'approve',
          args: [CONTRACTS.CARD_CATALOG, amountWei]
        });
        
        transaction = {
          to: CONTRACTS.EMARK_TOKEN as `0x${string}`,
          data,
        };
      } else {
        // Use thirdweb for desktop
        transaction = prepareContractCall({
          contract,
          method: "approve",
          params: [CONTRACTS.CARD_CATALOG, amountWei],
        });
      }

      console.log('📡 Sending approval transaction via unified provider...');
      
      // ✅ Use unified wallet provider's sendTransaction
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        console.log("✅ Approval successful:", result.transactionHash);
        
        // Refetch allowance after approval
        setTimeout(() => {
          refetchStakingAllowance();
        }, 2000);

        const successMsg = `Successfully approved ${amount} EMARK for staking`;
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Approval failed:", err);
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
  }, [isConnected, requireConnection, walletType, contract, sendTransaction, refetchStakingAllowance]);

  // ✅ CRITICAL FIX: Transfer tokens using unified wallet provider
  const transfer = useCallback(async (to: string, amount: string) => {
    console.log('💰 Starting transfer process...');
    
    // ✅ Use unified connection check
    if (!isConnected) {
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
      console.log('💰 Transferring', amount, 'EMARK to', to, 'using', walletType);
      
      const amountWei = toWei(amount);
      
      // ✅ CRITICAL FIX: Prepare transaction based on wallet type
      let transaction;
      
      if (walletType === 'farcaster') {
        // Use viem encoding for Farcaster frames
        const data = encodeFunctionData({
          abi: EMARK_TOKEN_ABI,
          functionName: 'transfer',
          args: [to, amountWei]
        });
        
        transaction = {
          to: CONTRACTS.EMARK_TOKEN as `0x${string}`,
          data,
        };
      } else {
        // Use thirdweb for desktop
        transaction = prepareContractCall({
          contract,
          method: "transfer",
          params: [to, amountWei],
        });
      }

      console.log('📡 Sending transfer transaction via unified provider...');
      
      // ✅ Use unified wallet provider's sendTransaction
      const result = await sendTransaction(transaction);
      
      if (result.success) {
        console.log("✅ Transfer successful:", result.transactionHash);
        
        // Refetch balance after transfer
        setTimeout(() => {
          refetchBalance();
        }, 2000);

        const successMsg = `Successfully transferred ${amount} EMARK`;
        setSuccess(successMsg);
        return { success: true, message: successMsg, transactionHash: result.transactionHash };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
      
    } catch (err: any) {
      console.error("❌ Transfer failed:", err);
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
  }, [isConnected, requireConnection, walletType, contract, sendTransaction, refetchBalance]);

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
    isConnected, // ✅ From unified provider
    
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
    
    // ✅ Enhanced capabilities from unified provider
    userAddress: address,
    requireConnection, // Expose for manual connection if needed
    
    // ✅ Auth info for debugging
    authInfo: {
      isConnected,
      address,
      walletType
    }
  };
}