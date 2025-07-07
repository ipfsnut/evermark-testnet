import { useState, useCallback, useMemo } from "react";
import { useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { encodeFunctionData } from "viem";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EMARK_TOKEN_ABI } from "../lib/contracts";
import { useWalletAuth, useWalletConnection } from "../providers/WalletProvider";

// Import the CardCatalog ABI
import CardCatalogABI from "../lib/abis/CardCatalog.json";

export function useWrapping(userAddress?: string) {
  const [isWrapping, setIsWrapping] = useState(false);
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { address: walletAddress, requireConnection } = useWalletAuth();
  const { sendTransaction, walletType } = useWalletConnection();
  const effectiveUserAddress = userAddress || walletAddress;
  
  const emarkContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  }), []);
  
  const wrappingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CardCatalogABI as any,
  }), []);
  
  // Get user's liquid EMARK balance
  const { data: emarkBalance, isLoading: isLoadingBalance, refetch: refetchEmarkBalance } = useReadContract({
    contract: emarkContract,
    method: "balanceOf",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Get user's wEMARK (wrapped) balance
  const { data: wEmarkBalance, isLoading: isLoadingWrapped, refetch: refetchWEmarkBalance } = useReadContract({
    contract: wrappingContract,
    method: "balanceOf",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // ✅ FIXED: Use correct method name from CardCatalog ABI
  const { data: userSummary, isLoading: isLoadingUserSummary, refetch: refetchUserSummary } = useReadContract({
    contract: wrappingContract,
    method: "getUserSummary",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // ✅ FIXED: Use correct method name from CardCatalog ABI
  const { data: unbondingInfo, isLoading: isLoadingUnbonding, refetch: refetchUnbondingInfo } = useReadContract({
    contract: wrappingContract,
    method: "getUnbondingInfo",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // ✅ FIXED: Use correct method name from CardCatalog ABI
  const { data: availableVotingPower, isLoading: isLoadingVotingPower, refetch: refetchVotingPower } = useReadContract({
    contract: wrappingContract,
    method: "getAvailableVotingPower",
    params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveUserAddress,
    },
  });
  
  // Refetch all data after successful transactions
  const refetchAllData = useCallback(() => {
    setTimeout(() => {
      refetchEmarkBalance?.();
      refetchWEmarkBalance?.();
      refetchUserSummary?.();
      refetchUnbondingInfo?.();
      refetchVotingPower?.();
    }, 2000);
  }, [refetchEmarkBalance, refetchWEmarkBalance, refetchUserSummary, refetchUnbondingInfo, refetchVotingPower]);
  
  // Helper function to prepare transactions based on wallet type
  const prepareTransaction = useCallback((contractAddress: string, abi: any[], functionName: string, params: any[]) => {
    if (walletType === 'farcaster') {
      // Use Viem for Farcaster (Wagmi)
      const data = encodeFunctionData({
        abi,
        functionName,
        args: params,
      });
      
      return {
        to: contractAddress as `0x${string}`,
        data,
      };
    } else {
      // Use Thirdweb for desktop
      const contract = getContract({
        client,
        chain: CHAIN,
        address: contractAddress,
        abi,
      });
      
      return prepareContractCall({
        contract,
        method: functionName,
        params,
      });
    }
  }, [walletType]);
  
  // ✅ FIXED: Use correct method name for wrapping tokens
  const wrapTokens = useCallback(async (amount: bigint) => {
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsWrapping(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('🔄 Starting wrap process for amount:', amount.toString());
      console.log('🔧 Using wallet type:', walletType);
      
      // Step 1: Approve EMARK spending
      console.log('📝 Step 1: Preparing approval transaction...');
      const approveTransaction = prepareTransaction(
        CONTRACTS.EMARK_TOKEN,
        EMARK_TOKEN_ABI,
        "approve",
        [CONTRACTS.CARD_CATALOG, amount]
      );
      
      console.log('⏳ Sending approval transaction...');
      const approvalResult = await sendTransaction(approveTransaction);
      
      if (!approvalResult.success) {
        throw new Error(`Approval failed: ${approvalResult.error}`);
      }
      
      console.log('✅ Approval transaction confirmed:', approvalResult.transactionHash);
      
      // Step 2: Wait a moment for approval to be processed
      console.log('⏳ Waiting for approval to be processed...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // ✅ FIXED: Use correct method name from CardCatalog ABI
      console.log('📝 Step 2: Preparing wrap transaction...');
      const wrapTransaction = prepareTransaction(
        CONTRACTS.CARD_CATALOG,
        CardCatalogABI,
        "wrap", // ✅ Correct method name from ABI
        [amount]
      );
      
      console.log('⏳ Sending wrap transaction...');
      const wrapResult = await sendTransaction(wrapTransaction);
      
      if (!wrapResult.success) {
        throw new Error(`Wrap failed: ${wrapResult.error}`);
      }
      
      console.log('✅ Wrap transaction confirmed:', wrapResult.transactionHash);
      
      setSuccess(`Successfully wrapped ${amount.toString()} $EMARK → wEMARK! TX: ${wrapResult.transactionHash}`);
      console.log('🎉 Wrap process completed successfully');
      
      refetchAllData();
      return { success: true, transactionHash: wrapResult.transactionHash };
      
    } catch (err: any) {
      console.error('❌ Wrap process failed:', err);
      const errorMessage = err.message || "Failed to wrap tokens";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsWrapping(false);
    }
  }, [effectiveUserAddress, sendTransaction, requireConnection, refetchAllData, walletType, prepareTransaction]);

  // ✅ FIXED: Use correct method name for requesting unwrap
  const requestUnwrap = useCallback(async (amount: bigint) => {
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsUnwrapping(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('🔄 Starting unwrap request for amount:', amount.toString());
      console.log('🔧 Using wallet type:', walletType);
      
      // ✅ FIXED: Use correct method name from CardCatalog ABI
      const transaction = prepareTransaction(
        CONTRACTS.CARD_CATALOG,
        CardCatalogABI,
        "requestUnwrap", // ✅ Correct method name from ABI
        [amount]
      );
      
      const result = await sendTransaction(transaction);
      
      if (!result.success) {
        throw new Error(`Unwrap request failed: ${result.error}`);
      }
      
      console.log('✅ Unwrap request transaction confirmed:', result.transactionHash);
      
      setSuccess(`Successfully requested unwrap of ${amount.toString()} wEMARK. Unbonding period started. TX: ${result.transactionHash}`);
      console.log('🎉 Unwrap request completed successfully');
      
      refetchAllData();
      return { success: true, transactionHash: result.transactionHash };
      
    } catch (err: any) {
      console.error('❌ Unwrap request failed:', err);
      const errorMessage = err.message || "Failed to request unwrap";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnwrapping(false);
    }
  }, [effectiveUserAddress, sendTransaction, requireConnection, refetchAllData, walletType, prepareTransaction]);
  
  // ✅ FIXED: Use correct method name for completing unwrap
  const completeUnwrap = useCallback(async () => {
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsUnwrapping(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('🔄 Starting complete unwrap...');
      console.log('🔧 Using wallet type:', walletType);
      
      // ✅ FIXED: Use correct method name from CardCatalog ABI
      const transaction = prepareTransaction(
        CONTRACTS.CARD_CATALOG,
        CardCatalogABI,
        "completeUnwrap", // ✅ Correct method name from ABI
        []
      );
      
      const result = await sendTransaction(transaction);
      
      if (!result.success) {
        throw new Error(`Complete unwrap failed: ${result.error}`);
      }
      
      console.log('✅ Complete unwrap transaction confirmed:', result.transactionHash);
      
      setSuccess(`Successfully completed unwrap! wEMARK → $EMARK conversion complete. TX: ${result.transactionHash}`);
      console.log('🎉 Complete unwrap completed successfully');
      
      refetchAllData();
      return { success: true, transactionHash: result.transactionHash };
      
    } catch (err: any) {
      console.error('❌ Complete unwrap failed:', err);
      const errorMessage = err.message || "Failed to complete unwrap";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnwrapping(false);
    }
  }, [effectiveUserAddress, sendTransaction, requireConnection, refetchAllData, walletType, prepareTransaction]);
  
  // ✅ FIXED: Use correct method name for cancelling unbonding
  const cancelUnbonding = useCallback(async () => {
    const connectionResult = await requireConnection();
    if (!connectionResult.success) {
      setError("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }
    
    setIsUnwrapping(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('🔄 Starting cancel unbonding...');
      console.log('🔧 Using wallet type:', walletType);
      
      // ✅ FIXED: Use correct method name from CardCatalog ABI
      const transaction = prepareTransaction(
        CONTRACTS.CARD_CATALOG,
        CardCatalogABI,
        "cancelUnbonding", // ✅ Correct method name from ABI
        []
      );
      
      const result = await sendTransaction(transaction);
      
      if (!result.success) {
        throw new Error(`Cancel unbonding failed: ${result.error}`);
      }
      
      console.log('✅ Cancel unbonding transaction confirmed:', result.transactionHash);
      
      setSuccess(`Successfully cancelled unbonding! TX: ${result.transactionHash}`);
      console.log('🎉 Cancel unbonding completed successfully');
      
      refetchAllData();
      return { success: true, transactionHash: result.transactionHash };
      
    } catch (err: any) {
      console.error('❌ Cancel unbonding failed:', err);
      const errorMessage = err.message || "Failed to cancel unbonding";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnwrapping(false);
    }
  }, [effectiveUserAddress, sendTransaction, requireConnection, refetchAllData, walletType, prepareTransaction]);
  
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);
  
  // ✅ FIXED: Parse user summary data correctly
  const actualWrappedBalance = wEmarkBalance || userSummary?.[0] || BigInt(0); // stakedBalance is first element
  const actualVotingPower = availableVotingPower || userSummary?.[1] || actualWrappedBalance; // availableVotingPower is second element
  
  // ✅ FIXED: Parse unbonding info correctly from getUserSummary or getUnbondingInfo
  const unbondingAmount = unbondingInfo?.[0] || userSummary?.[3] || BigInt(0); // unbondingAmount_ is 4th element in getUserSummary
  const unbondingReleaseTime = unbondingInfo?.[1] || userSummary?.[4] || BigInt(0); // unbondingReleaseTime_ is 5th element
  const canClaimUnbonding = unbondingInfo?.[2] || userSummary?.[5] || false; // canClaimUnbonding is 6th element
  
  return {
    // Balances
    emarkBalance: emarkBalance || BigInt(0),
    wEmarkBalance: actualWrappedBalance,
    totalWrapped: actualWrappedBalance,
    availableVotingPower: actualVotingPower,
    
    // Unbonding info
    unbondingAmount,
    unbondingReleaseTime,
    canClaimUnbonding,
    
    // ✅ FIXED: User summary data with correct parsing
    delegatedPower: userSummary?.[2] || BigInt(0), // delegatedPower is 3rd element
    
    // Loading states
    isLoadingBalance,
    isLoadingWrapped: isLoadingWrapped || isLoadingUserSummary,
    isLoadingUserSummary,
    isLoadingUnbonding,
    isLoadingVotingPower,
    
    // Transaction states
    isWrapping,
    isUnwrapping,
    
    // Actions
    wrapTokens,
    requestUnwrap,
    completeUnwrap,
    cancelUnbonding,
    
    // Legacy action names for compatibility
    stakeTokens: wrapTokens,
    unstakeTokens: requestUnwrap,
    
    // Messages
    error,
    success,
    clearMessages,
    
    // Auth info
    effectiveUserAddress,
    hasWalletAccess: !!effectiveUserAddress,
    isConnected: !!effectiveUserAddress,
    
    // Token type helpers
    tokenTypes: {
      liquid: 'EMARK',
      wrapped: 'wEMARK',
      description: {
        EMARK: 'Liquid token for transactions and trading',
        wEMARK: 'Wrapped EMARK with voting power (may have unbonding period)'
      }
    }
  };
}