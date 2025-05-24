import { useReadContract, useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EMARK_TOKEN_ABI } from "../lib/contracts";
import { useState, useCallback } from "react";
import { toEther, toWei } from "thirdweb/utils";

export function useEmarkToken() {
  const account = useActiveAccount();
  const [isTransacting, setIsTransacting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const contract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  });

  // Get user's EMARK balance
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useReadContract({
    contract,
    method: "balanceOf",
    params: account?.address ? [account.address] : ["0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!account?.address,
    },
  });

  // Get allowance for CardCatalog (for staking)
  const { data: stakingAllowance, refetch: refetchStakingAllowance } = useReadContract({
    contract,
    method: "allowance",
    params: account?.address ? [account.address, CONTRACTS.CARD_CATALOG] : ["0x0000000000000000000000000000000000000000", CONTRACTS.CARD_CATALOG],
    queryOptions: {
      enabled: !!account?.address,
    },
  });

  // Get token info
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

  // Approve CardCatalog for staking
  const approveStaking = useCallback(async (amount: string) => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
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
      const errorMsg = err.message || "Failed to approve tokens";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsTransacting(false);
    }
  }, [account?.address, contract, sendTransaction, refetchStakingAllowance]);

  // Transfer tokens
  const transfer = useCallback(async (to: string, amount: string) => {
    if (!account?.address) {
      setError("Please connect your wallet");
      return { success: false, error: "Please connect your wallet" };
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
      const errorMsg = err.message || "Failed to transfer tokens";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsTransacting(false);
    }
  }, [account?.address, contract, sendTransaction, refetchBalance]);

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
    isConnected: !!account,
    
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
  };
}