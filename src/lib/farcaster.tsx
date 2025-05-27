// Fixed src/lib/farcaster.tsx with better cross-origin handling

import React, { createContext, useContext, useEffect, useState, PropsWithChildren, useRef } from 'react';
import sdk from "@farcaster/frame-sdk";

interface FarcasterContextType {
  isInFarcaster: boolean;
  isReady: boolean;
  context: any;
  user?: any;
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

// Enhanced mobile-ready frame detection with better cross-origin handling
function detectFarcasterEnvironment() {
  if (typeof window === 'undefined') {
    return { isInFarcaster: false, confidence: 'high', methods: ['no-window'] };
  }

  const methods: string[] = [];
  let isInFarcaster = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Method 1: User Agent Detection (HIGH CONFIDENCE)
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('farcaster') || userAgent.includes('warpcast')) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('user-agent');
  }

  // Method 2: Enhanced WebView Detection
  const isWebView = (
    (userAgent.includes('mobile') && !userAgent.includes('safari')) ||
    userAgent.includes('wkwebview') ||
    userAgent.includes('wv') ||
    (userAgent.includes('version/') && userAgent.includes('chrome') && userAgent.includes('mobile'))
  );

  if (isWebView) {
    methods.push('webview');
    
    // Method 3: URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('frame') || urlParams.has('farcaster') || urlParams.get('ref') === 'farcaster') {
      isInFarcaster = true;
      confidence = 'high';
      methods.push('url-params');
    }

    // Method 4: Referrer Detection
    if (document.referrer.toLowerCase().includes('farcaster') || document.referrer.toLowerCase().includes('warpcast')) {
      isInFarcaster = true;
      confidence = confidence === 'high' ? 'high' : 'medium';
      methods.push('referrer');
    }

    // Method 5: Window properties (with cross-origin safety)
    try {
      const windowChecks = {
        noOpener: !window.opener,
        limitedHistory: window.history.length <= 3,
        hasParent: window.parent !== window
      };

      if (Object.values(windowChecks).filter(Boolean).length >= 2) {
        methods.push('window-properties');
        if (!isInFarcaster && isWebView) {
          isInFarcaster = true;
          confidence = 'medium';
        }
      }
    } catch (e) {
      // Cross-origin access blocked - this is actually a good sign for frames
      methods.push('cross-origin-blocked');
      if (isWebView) {
        isInFarcaster = true;
        confidence = 'medium';
      }
    }
  }

  // Method 6: SDK availability check (with safety)
  try {
    if ((window as any).FrameSDK || (window as any).frameSDK) {
      isInFarcaster = true;
      confidence = 'high';
      methods.push('sdk-available');
    }
  } catch (e) {
    // Ignore cross-origin errors
  }

  // Method 7: Additional WebView indicators
  if (isWebView || userAgent.includes('farcaster')) {
    methods.push('additional-indicators');
    if (!isInFarcaster) {
      isInFarcaster = true;
      confidence = 'low';
    }
  }

  return { isInFarcaster, confidence, methods };
}

export const FarcasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<any>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const initializationRef = useRef(false);
  
  // Enhanced frame detection
  const detection = detectFarcasterEnvironment();
  const isInFarcaster = detection.isInFarcaster;

  console.log('🔍 Farcaster Detection:', {
    isInFarcaster,
    confidence: detection.confidence,
    methods: detection.methods,
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
            
            if (frameContext && typeof frameContext === 'object' && 'user' in frameContext) {
              setUser(frameContext.user);
              setIsAuthenticated(true);
              console.log('✅ User authenticated:', frameContext.user);
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