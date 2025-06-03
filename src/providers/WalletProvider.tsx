import { createContext, useContext, ReactNode } from 'react';
import { useFarcasterUser } from '../lib/farcaster';
import { FarcasterWalletProvider } from './FarcasterWalletProvider';
import { ThirdwebWalletProvider } from './ThirdwebWalletProvider';

// Unified wallet interface that both providers must implement
export interface UnifiedWalletConnection {
  // Core state
  isConnected: boolean;
  address?: string;
  displayAddress?: string;
  
  // Environment context
  walletType: 'farcaster' | 'thirdweb' | 'none';
  isInFarcaster: boolean;
  
  // Connection methods
  connectWallet: () => Promise<{ success: boolean; error?: string }>;
  requireConnection: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<void>;
  
  // Transaction capabilities
  canInteract: boolean;
  sendTransaction: (tx: any) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  
  // ERC-20 utilities
  approveERC20: (tokenAddress: string, spenderAddress: string, amount: string) => Promise<{ success: boolean; transactionHash?: string; error?: string }>;
  checkAllowance: (tokenAddress: string, ownerAddress: string, spenderAddress: string) => Promise<bigint>;
  
  // Batch transactions
  batchTransactions: (transactions: any[]) => Promise<Array<{ success: boolean; transactionHash?: string; error?: string }>>;
  
  // Status
  isConnecting: boolean;
  isTransactionPending: boolean;
  error?: string;
  lastTransactionHash?: string;
}

// Context for the unified wallet
const WalletContext = createContext<UnifiedWalletConnection | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

// Enhanced environment detection
function detectWalletEnvironment(): {
  shouldUseFarcaster: boolean;
  confidence: 'high' | 'medium' | 'low';
  methods: string[];
} {
  if (typeof window === 'undefined') {
    return { shouldUseFarcaster: false, confidence: 'high', methods: ['no-window'] };
  }

  const methods: string[] = [];
  let shouldUseFarcaster = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  const userAgent = navigator.userAgent.toLowerCase();
  const url = window.location.href.toLowerCase();
  
  // Method 1: Direct Farcaster indicators
  if (userAgent.includes('farcaster') || userAgent.includes('warpcast')) {
    shouldUseFarcaster = true;
    confidence = 'high';
    methods.push('user-agent-direct');
  }

  // Method 2: URL patterns  
  if (url.includes('farcaster.com') || url.includes('warpcast.com') || url.includes('frame')) {
    shouldUseFarcaster = true;
    confidence = 'high';
    methods.push('url-pattern');
  }

  // Method 3: PostMessage detection
  if ((window as any).__farcaster_detected) {
    shouldUseFarcaster = true;
    confidence = 'high';
    methods.push('postmessage-detected');
  }

  // Method 4: Frame context detection
  try {
    const hasParent = window.parent !== window;
    const isIframe = window.self !== window.top;
    
    if (hasParent || isIframe) {
      methods.push('iframe-context');
      if (methods.length > 1) {
        confidence = 'medium';
      }
    }
  } catch (e) {
    methods.push('cross-origin-blocked');
  }

  // Method 5: Mobile WebView detection  
  const isMobile = userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone');
  const isWebView = userAgent.includes('wv') || userAgent.includes('webview');
  
  if (isMobile && isWebView && !userAgent.includes('safari') && !userAgent.includes('chrome/')) {
    methods.push('mobile-webview');
    if (!shouldUseFarcaster && methods.length > 1) {
      shouldUseFarcaster = true;
      confidence = 'medium';
    }
  }

  console.log('🔍 Wallet Environment Detection:', {
    shouldUseFarcaster,
    confidence,
    methods,
    userAgent: userAgent.substring(0, 100),
    url: url.substring(0, 100)
  });

  return { shouldUseFarcaster, confidence, methods };
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Get Farcaster context
  const { isInFarcaster, isReady: farcasterReady } = useFarcasterUser();
  
  // Detect environment
  const environmentDetection = detectWalletEnvironment();
  
  // Determine which wallet system to use
  const shouldUseFarcaster = environmentDetection.shouldUseFarcaster || isInFarcaster;
  
  console.log('🎯 Wallet Provider Routing:', {
    shouldUseFarcaster,
    isInFarcaster,
    farcasterReady,
    environmentConfidence: environmentDetection.confidence,
    detectionMethods: environmentDetection.methods
  });

  // Route to appropriate provider
  if (shouldUseFarcaster && farcasterReady) {
    console.log('📱 Using Farcaster Wallet Provider');
    return (
      <FarcasterWalletProvider>
        {children}
      </FarcasterWalletProvider>
    );
  } else {
    console.log('🖥️ Using Thirdweb Wallet Provider');
    return (
      <ThirdwebWalletProvider>
        {children}
      </ThirdwebWalletProvider>
    );
  }
}

// Main hook for accessing wallet functionality
export function useWalletConnection(): UnifiedWalletConnection {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletConnection must be used within a WalletProvider');
  }
  return context;
}

// Backward compatible hooks
export function useWalletAuth() {
  const { 
    isConnected, 
    address, 
    canInteract, 
    requireConnection, 
    connectWallet,
    error,
    isInFarcaster,
    walletType 
  } = useWalletConnection();
  
  return {
    isConnected,
    address,
    canInteract,
    requireConnection,
    connectWallet,
    error,
    isInFarcaster,
    usesFarcasterWallet: walletType === 'farcaster',
    needsConnection: !isConnected
  };
}

export function useTransactionWallet() {
  const { 
    walletType,
    sendTransaction,
    canInteract,
    isConnected,
    isTransactionPending,
    approveERC20,
    batchTransactions
  } = useWalletConnection();
  
  return {
    useThirdweb: walletType === 'thirdweb' && isConnected,
    useWagmi: walletType === 'farcaster' && isConnected,
    sendWagmiTransaction: walletType === 'farcaster' ? sendTransaction : null,
    canInteract,
    isTransactionPending,
    
    // Enhanced capabilities
    sendTransaction,
    approveERC20,
    batchTransactions
  };
}

// Export the context for sub-providers to use
export { WalletContext };
