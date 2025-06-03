// src/hooks/useWallet.ts - Simple passthrough with re-exports
export { 
  useWalletConnection as useWallet,
  useWalletAuth, 
  useTransactionWallet 
} from "../providers/WalletProvider";

// Re-export the types for convenience
export type { UnifiedWalletConnection } from "../providers/WalletProvider";
