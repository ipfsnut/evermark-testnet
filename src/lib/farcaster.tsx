// Replace your entire src/lib/farcaster.tsx with this mobile-ready version:

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

// Enhanced mobile-ready frame detection
function detectFarcasterEnvironment() {
  if (typeof window === 'undefined') {
    return { isInFarcaster: false, confidence: 'high', methods: ['no-window'] };
  }

  const methods: string[] = [];
  let isInFarcaster = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Method 1: User Agent Detection (HIGH CONFIDENCE)
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('farcaster')) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('user-agent');
  }

  // Method 2: Mobile WebView Detection
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

    // Method 5: Mobile-specific window properties
    const mobileChecks = {
      noOpener: !window.opener,
      limitedHistory: window.history.length <= 2,
      noFrameElement: !window.frameElement
    };

    if (Object.values(mobileChecks).filter(Boolean).length >= 2) {
      methods.push('mobile-window');
      if (!isInFarcaster && isWebView) {
        // High confidence this is a mobile webview
        isInFarcaster = true;
        confidence = 'medium';
      }
    }
  }

  // Method 6: Traditional iframe (for web)
  if (!isInFarcaster) {
    const isIframe = window.parent !== window || !!window.frameElement;
    if (isIframe) {
      methods.push('iframe');
      isInFarcaster = true;
      confidence = 'medium';
    }
  }

  // Method 7: SDK availability
  if ((window as any).frameSDK || (window as any).parent?.frameSDK) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('sdk-available');
  }

  // Fallback: If we detect mobile webview but no other signals, assume Farcaster
  if (isWebView && !isInFarcaster && methods.includes('webview')) {
    isInFarcaster = true;
    confidence = 'low';
    methods.push('webview-fallback');
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
    url: window.location.href
  });

  useEffect(() => {
    if (initializationRef.current) return;
    
    const initializeFarcaster = async () => {
      if (!isInFarcaster) {
        console.log('❌ Not in Farcaster frame - setting ready immediately');
        setIsReady(true);
        return;
      }

      console.log('📱 Initializing Farcaster SDK for mobile...');
      initializationRef.current = true;

      try {
        // Mobile-optimized SDK loading
        let attempts = 0;
        const maxAttempts = 30; // Longer timeout for mobile
        const delay = 200; // Slower polling for mobile

        // Set a maximum timeout
        const timeout = setTimeout(() => {
          console.log('⏰ SDK timeout - proceeding without SDK');
          setIsReady(true);
        }, 6000); // 6 second max timeout

        while (!sdk.actions && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          
          if (attempts % 10 === 0) {
            console.log(`⏳ Waiting for SDK... attempt ${attempts}/${maxAttempts}`);
          }
        }

        clearTimeout(timeout);

        if (!sdk.actions) {
          console.log('❌ SDK not available - proceeding without it');
          setIsReady(true);
          return;
        }

        console.log('✅ SDK available, getting context...');

        // Get context with timeout
        const contextPromise = sdk.context;
        const contextTimeout = setTimeout(() => {
          console.log('⏰ Context timeout - proceeding anyway');
          setIsReady(true);
        }, 3000);

        try {
          const frameContext = await contextPromise;
          clearTimeout(contextTimeout);
          
          console.log('✅ Got context:', frameContext);
          setContext(frameContext);
          
          if (frameContext?.user) {
            setUser(frameContext.user);
            setIsAuthenticated(true);
            console.log('✅ User authenticated:', frameContext.user);
          }

          // Send ready signal with retries for mobile
          try {
            await sdk.actions.ready();
            console.log('✅ Ready signal sent');
            
            // Extra ready signal for mobile apps (they sometimes need it)
            setTimeout(() => {
              if (sdk.actions) {
                sdk.actions.ready();
                console.log('✅ Extra ready signal sent');
              }
            }, 500);
          } catch (readyError) {
            console.log('⚠️ Ready signal failed, but continuing:', readyError);
          }
          
        } catch (contextError) {
          clearTimeout(contextTimeout);
          console.log('⚠️ Context failed, but continuing:', contextError);
        }
        
      } catch (error) {
        console.error('❌ Farcaster initialization error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        console.log('✅ Farcaster initialization complete - setting ready');
        setIsReady(true);
      }
    };

    // Immediate initialization for mobile
    const timer = setTimeout(initializeFarcaster, 100);
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
    getProfileUrl: () => context.user?.username ? `https://warpcast.com/${context.user.username}` : '',
  };
};

export const useFarcasterActions = () => {
  return {
    openWarpcastProfile: (username: string) => {
      const url = `https://warpcast.com/${username}`;
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    shareFrame: (frameUrl: string) => {
      const shareUrl = `https://warpcast.com/~/compose?text=Check%20out%20this%20frame%3A%20${encodeURIComponent(frameUrl)}`;
      if (typeof window !== 'undefined') {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
    },
  };
};