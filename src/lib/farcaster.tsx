// src/lib/farcaster.tsx - Updated with enhanced verified addresses support
import React, { createContext, useContext, useEffect, useState, PropsWithChildren, useRef } from 'react';
import sdk from "@farcaster/frame-sdk";

// Export the SDK for use in other parts of the app
export { sdk };

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  verifiedAddresses?: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

interface FarcasterContextType {
  isInFarcaster: boolean;
  isReady: boolean;
  context: any;
  user?: FarcasterUser;
  isAuthenticated: boolean;
  error?: string;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInFarcaster: false,
  isReady: false,
  context: null,
  isAuthenticated: false,
  error: undefined,
});

// Enhanced mobile-ready frame detection with PostMessage detection
function detectFarcasterEnvironment() {
  if (typeof window === 'undefined') {
    return { isInFarcaster: false, confidence: 'high', methods: ['no-window'] };
  }

  const methods: string[] = [];
  let isInFarcaster = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  const userAgent = navigator.userAgent.toLowerCase();
  
  // Method 1: Direct Farcaster indicators (HIGH CONFIDENCE)
  if (userAgent.includes('farcaster') || userAgent.includes('warpcast')) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('user-agent-farcaster');
  }

  // Method 2: CrKey detection (HIGH CONFIDENCE) - This is your environment!
  if (userAgent.includes('crkey')) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('crkey-detected');
  }

  // Method 3: Enhanced WebView Detection
  const isWebView = (
    userAgent.includes('wv') ||
    userAgent.includes('webview') ||
    userAgent.includes('crkey') ||
    (userAgent.includes('mobile') && !userAgent.includes('safari')) ||
    (userAgent.includes('android') && userAgent.includes('chrome'))
  );

  if (isWebView) {
    methods.push('webview');
    if (!isInFarcaster) {
      isInFarcaster = true;
      confidence = 'medium';
    }
  }

  // Method 4: URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('frame') || urlParams.has('farcaster') || urlParams.get('ref') === 'farcaster') {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('url-params');
  }

  // Method 5: Referrer Detection
  if (document.referrer.toLowerCase().includes('farcaster') || document.referrer.toLowerCase().includes('warpcast')) {
    isInFarcaster = true;
    confidence = confidence === 'high' ? 'high' : 'medium';
    methods.push('referrer');
  }

  // Method 6: Cross-origin frame detection
  try {
    const hasParent = window.parent !== window;
    if (hasParent && (isWebView || userAgent.includes('android'))) {
      methods.push('cross-origin-frame');
      if (!isInFarcaster) {
        isInFarcaster = true;
        confidence = 'medium';
      }
    }
  } catch (e) {
    // Cross-origin access blocked - good sign for frames
    methods.push('cross-origin-blocked');
    if (isWebView || userAgent.includes('crkey')) {
      isInFarcaster = true;
      confidence = 'medium';
    }
  }

  // Method 7: SDK availability check
  try {
    if ((window as any).FrameSDK || (window as any).frameSDK) {
      isInFarcaster = true;
      confidence = 'high';
      methods.push('sdk-available');
    }
  } catch (e) {
    // Ignore errors
  }

  return { isInFarcaster, confidence, methods };
}

export const FarcasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<FarcasterUser | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [detectedFromPostMessage, setDetectedFromPostMessage] = useState(false);
  const initializationRef = useRef(false);
  
  // Enhanced frame detection
  const detection = detectFarcasterEnvironment();
  
  // ENHANCED: Listen for PostMessages from farcaster.xyz as additional detection
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      if (event.origin === 'https://farcaster.xyz' || 
          event.data?.type === 'frameEvent' ||
          event.data?.type === 'RAW') {
        console.log('📨 Farcaster PostMessage detected:', event.origin, event.data);
        setDetectedFromPostMessage(true);
      }
    };

    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, []);
  
  // Use detection OR PostMessage detection
  const isInFarcaster = detection.isInFarcaster || detectedFromPostMessage;

  console.log('🔍 Farcaster Detection:', {
    isInFarcaster,
    confidence: detection.confidence,
    methods: detection.methods,
    detectedFromPostMessage,
    userAgent: navigator.userAgent,
    url: window.location.href,
    referrer: document.referrer
  });

  useEffect(() => {
    if (initializationRef.current) return;
    
    const initializeFarcaster = async () => {
      if (!isInFarcaster) {
        console.log('❌ Not in Farcaster frame - setting ready immediately');
        setIsReady(true);
        return;
      }

      console.log('📱 Initializing Farcaster SDK...');
      initializationRef.current = true;

      try {
        // FIXED: Better SDK waiting strategy
        let attempts = 0;
        const maxAttempts = 60; // 6 seconds total
        const delay = 100;

        // Global timeout to prevent hanging
        const globalTimeout = setTimeout(() => {
          console.log('⏰ Global timeout - proceeding without full SDK');
          setIsReady(true);
        }, 8000);

        // Wait for SDK with better error handling
        while (attempts < maxAttempts) {
          try {
            if (sdk && sdk.actions) {
              console.log('✅ SDK found after', attempts * delay, 'ms');
              break;
            }
          } catch (e) {
            // SDK access error - continue waiting
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          
          if (attempts % 20 === 0) {
            console.log(`⏳ Still waiting for SDK... ${attempts * delay}ms`);
          }
        }

        clearTimeout(globalTimeout);

        // Try to get context with extensive error handling
        try {
          if (sdk && sdk.context) {
            console.log('📋 Getting context...');
            
            // Use Promise.race for timeout
            const contextPromise = Promise.resolve(sdk.context);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Context timeout')), 3000)
            );
            
            const frameContext = await Promise.race([contextPromise, timeoutPromise]) as any;
            console.log('✅ Got context:', frameContext);
            
            setContext(frameContext);
            
            // ENHANCED: Better user data extraction with verified addresses
            if (frameContext && typeof frameContext === 'object' && 'user' in frameContext) {
              const userData: FarcasterUser = {
                fid: frameContext.user.fid,
                username: frameContext.user.username,
                displayName: frameContext.user.displayName,
                pfpUrl: frameContext.user.pfpUrl,
                bio: frameContext.user.bio,
                followerCount: frameContext.user.followerCount,
                followingCount: frameContext.user.followingCount,
                // CRITICAL: Extract verified addresses for contract interactions
                verifiedAddresses: frameContext.user.verifiedAddresses || {
                  eth_addresses: [],
                  sol_addresses: []
                }
              };
              
              console.log('✅ User authenticated with verified addresses:', userData.verifiedAddresses);
              setUser(userData);
              setIsAuthenticated(true);
            }
          } else {
            console.log('⚠️ No SDK context available');
          }
        } catch (contextError) {
          console.log('⚠️ Context failed:', contextError);
          // Continue without context
        }

        // Send ready signal with extensive error handling
        try {
          if (sdk?.actions?.ready) {
            await sdk.actions.ready({ 
              disableNativeGestures: true 
            });
            console.log('✅ Ready signal sent');
            
            // Additional ready signal for stubborn mobile apps
            setTimeout(() => {
              try {
                sdk?.actions?.ready?.({ disableNativeGestures: true });
                console.log('✅ Backup ready signal sent');
              } catch (e) {
                // Ignore errors in backup signal
              }
            }, 1000);
          } else {
            console.log('⚠️ Ready signal not available');
          }
        } catch (readyError) {
          console.log('⚠️ Ready signal failed:', readyError);
        }
        
      } catch (error) {
        console.error('❌ Farcaster initialization error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        console.log('✅ Farcaster initialization complete');
        setIsReady(true);
      }
    };

    // Start initialization after brief delay
    const timer = setTimeout(initializeFarcaster, 200);
    return () => clearTimeout(timer);
  }, [isInFarcaster]);

  return (
    <FarcasterContext.Provider value={{ 
      isInFarcaster, 
      isReady, 
      context, 
      user, 
      isAuthenticated,
      error
    }}>
      {children}
    </FarcasterContext.Provider>
  );
};

export const useFarcasterUser = () => {
  const context = useContext(FarcasterContext);
  
  // Add debug logging
  console.log('🔍 useFarcasterUser Debug:', {
    isAuthenticated: context.isAuthenticated,
    isInFarcaster: context.isInFarcaster,
    user: context.user,
    verifiedAddresses: context.user?.verifiedAddresses,
    ethAddresses: context.user?.verifiedAddresses?.eth_addresses,
    primaryAddress: context.user?.verifiedAddresses?.eth_addresses?.[0]
  });
  
  return {
    user: context.user,
    isAuthenticated: context.isAuthenticated,
    isInFarcaster: context.isInFarcaster,
    isReady: context.isReady,
    error: context.error,
    getDisplayName: () => context.user?.displayName || context.user?.username || '',
    getAvatarUrl: () => context.user?.pfpUrl || '',
    getUserHandle: () => context.user?.username ? `@${context.user.username}` : '',
    getProfileUrl: () => context.user?.username ? `https://farcaster.com/${context.user.username}` : '',
    getVerifiedAddresses: () => context.user?.verifiedAddresses?.eth_addresses || [],
    hasVerifiedAddress: () => (context.user?.verifiedAddresses?.eth_addresses?.length || 0) > 0,
    getPrimaryAddress: () => context.user?.verifiedAddresses?.eth_addresses?.[0] || null,
  };
};

export const useFarcasterActions = () => {
  return {
    openWarpcastProfile: (username: string) => {
      const url = `https://farcaster.com/${username}`;
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    shareFrame: (frameUrl: string) => {
      const shareUrl = `https://farcaster.com/~/compose?text=Check%20out%20this%20frame%3A%20${encodeURIComponent(frameUrl)}`;
      if (typeof window !== 'undefined') {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
    },
  };
};