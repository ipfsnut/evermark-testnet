# Wallet Provider Patterns

This document outlines the correct patterns for using our unified wallet provider system.

## 🎯 Core Architecture

We have a **unified wallet provider** that automatically detects the environment (Farcaster vs Desktop) and provides a consistent interface for all wallet operations.

### Provider Structure
- `WalletProvider` - Main provider that routes to sub-providers
- `FarcasterWalletProvider` - Handles Farcaster frame wallet operations (uses Wagmi)
- `ThirdwebWalletProvider` - Handles desktop wallet operations (uses Thirdweb)

## ✅ Correct Patterns

### 1. Hook Imports
```typescript
// ✅ CORRECT: Import from unified provider
import { useWalletAuth, useWalletConnection } from "../providers/WalletProvider";

// ❌ WRONG: Don't import wallet hooks directly
import { useActiveAccount } from "thirdweb/react";
import { useAccount } from "wagmi";
```

### 2. Authentication & Connection
```typescript
// ✅ CORRECT: From useWrapping.ts
const { address: walletAddress, requireConnection } = useWalletAuth();
const { sendTransaction, walletType } = useWalletConnection();
const effectiveUserAddress = userAddress || walletAddress;
```

### 3. Transaction Preparation (Environment-Aware)
```typescript
// ✅ CORRECT: From useWrapping.ts
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
```

### 4. Transaction Execution
```typescript
// ✅ CORRECT: From useWrapping.ts
const wrapTokens = useCallback(async (amount: bigint) => {
  // 1. Check connection
  const connectionResult = await requireConnection();
  if (!connectionResult.success) {
    setError("Please connect your wallet");
    return { success: false, error: "Wallet not connected" };
  }
  
  // 2. Set loading state
  setIsWrapping(true);
  setError(null);
  setSuccess(null);
  
  try {
    // 3. Prepare transaction using helper
    const transaction = prepareTransaction(
      CONTRACTS.EMARK_TOKEN,
      EMARK_TOKEN_ABI,
      "approve",
      [CONTRACTS.CARD_CATALOG, amount]
    );
    
    // 4. Send transaction via unified provider
    const result = await sendTransaction(transaction);
    
    // 5. Check result
    if (!result.success) {
      throw new Error(`Transaction failed: ${result.error}`);
    }
    
    // 6. Handle success
    console.log('✅ Transaction confirmed:', result.transactionHash);
    setSuccess(`Success! TX: ${result.transactionHash}`);
    
    return { success: true, transactionHash: result.transactionHash };
    
  } catch (err: any) {
    // 7. Handle errors
    const errorMessage = err.message || "Transaction failed";
    setError(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    // 8. Reset loading state
    setIsWrapping(false);
  }
}, [sendTransaction, requireConnection, walletType, prepareTransaction]);
```

### 5. Contract Reading (Still Use Thirdweb)
```typescript
// ✅ CORRECT: Reading is still done via Thirdweb (works everywhere)
const { data: balance, isLoading, refetch } = useReadContract({
  contract: emarkContract,
  method: "balanceOf",
  params: [effectiveUserAddress || "0x0000000000000000000000000000000000000000"],
  queryOptions: {
    enabled: !!effectiveUserAddress,
  },
});
```

## ❌ Anti-Patterns (Don't Do This)

### 1. Direct Wallet Hook Usage
```typescript
// ❌ WRONG: Don't use wallet hooks directly in components/hooks
const { mutate: sendTransaction } = useSendTransaction(); // Thirdweb
const { sendTransactionAsync } = useSendTransaction(); // Wagmi
const account = useActiveAccount(); // Thirdweb
const { address } = useAccount(); // Wagmi
```

### 2. Manual Environment Detection
```typescript
// ❌ WRONG: Don't manually detect environment
const isInFarcaster = window.parent !== window;
if (isInFarcaster) {
  // use wagmi
} else {
  // use thirdweb
}
```

### 3. Mixed Transaction Patterns
```typescript
// ❌ WRONG: Don't mix different transaction patterns
sendTransaction(transaction, {
  onSuccess: () => {}, // Old Thirdweb pattern
  onError: () => {}
});

const result = await sendTransaction(transaction); // New unified pattern
```

### 4. Dynamic Imports
```typescript
// ❌ WRONG: Don't use dynamic imports for wallet providers
try {
  const walletProvider = require('../providers/WalletProvider');
  useWalletConnection = walletProvider.useWalletConnection;
} catch (e) {
  // fallback
}
```

## 🔧 Required Imports for Transaction Hooks

```typescript
// Standard imports for any hook that does transactions
import { useState, useCallback, useMemo } from "react";
import { useReadContract } from "thirdweb/react"; // For reading only
import { getContract, prepareContractCall } from "thirdweb"; // For Thirdweb transactions
import { encodeFunctionData } from "viem"; // For Wagmi transactions
import { useWalletAuth, useWalletConnection } from "../providers/WalletProvider";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS } from "../lib/contracts";
```

## 🎯 Component Patterns

### For Components That Need Wallet Info
```typescript
// ✅ CORRECT: Use unified provider
export function MyComponent() {
  const { isConnected, address, displayAddress } = useWalletConnection();
  
  if (!isConnected) {
    return <div>Please connect wallet</div>;
  }
  
  return <div>Connected: {displayAddress}</div>;
}
```

### For Components That Show Connection Status
```typescript
// ✅ CORRECT: Use unified provider for logic, direct hooks only for UI fallbacks
export function ConnectButton() {
  const { isInFarcaster } = useFarcasterUser();
  const { isConnected, address, connectWallet } = useWalletConnection();
  
  // Use Thirdweb's ConnectButton for desktop
  if (!isInFarcaster) {
    return <ConnectButton client={client} />;
  }
  
  // Custom UI for Farcaster
  return (
    <button onClick={connectWallet}>
      {isConnected ? address : "Connect"}
    </button>
  );
}
```

## 🚀 Migration Checklist

When updating a hook to use the unified provider:

1. ✅ Replace direct wallet hook imports with unified provider imports
2. ✅ Add `prepareTransaction` helper function
3. ✅ Update transaction execution to use `await sendTransaction()`
4. ✅ Update connection checks to use `requireConnection()`
5. ✅ Keep read operations using Thirdweb's `useReadContract`
6. ✅ Test in both Farcaster and desktop environments