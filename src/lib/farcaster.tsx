import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import sdk from "@farcaster/frame-sdk";

interface FarcasterContextType {
  isInFarcaster: boolean;
  isReady: boolean;
  context: any;
  user?: any;
  isAuthenticated: boolean;
  error?: string;
  isMobileWebView: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInFarcaster: false,
  isReady: false,
  context: null,
  isAuthenticated: false,
  error: undefined,
  isMobileWebView: false,
});

export const FarcasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<any>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // Enhanced mobile WebView detection
  const [isMobileWebView] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes('android');
    const isIOS = ua.includes('iphone') || ua.includes('ipad');
    const isWarpcast = ua.includes('warpcast') || ua.includes('farcaster');
    const isWebView = ua.includes('wv') || ua.includes('webview');
    
    let isFramed = false;
    try {
      isFramed = window.self !== window.top;
    } catch (e) {
      isFramed = true;
    }
    
    return (isAndroid || isIOS) && (isWebView || isWarpcast || isFramed);
  });
  
  // Standard Farcaster detection
  const [isInFarcaster] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      const parentCheck = window.parent !== window;
      const frameCheck = window.frameElement !== null;
      const userAgentCheck = navigator.userAgent.includes('Farcaster') || 
                            navigator.userAgent.includes('Warpcast');
      const referrerCheck = document.referrer.includes('warpcast.com') || 
                           document.referrer.includes('farcaster');
      
      const locationCheck = (() => {
        try {
          return window.location !== window.parent.location;
        } catch (e) {
          return true;
        }
      })();
      
      const detected = parentCheck || frameCheck || userAgentCheck || 
                      referrerCheck || locationCheck || isMobileWebView;
      
      console.log('🔍 Farcaster detection:', {
        parentCheck,
        frameCheck,
        userAgentCheck,
        referrerCheck,
        locationCheck,
        isMobileWebView,
        detected
      });
      
      return detected;
    } catch (e) {
      console.log('🔍 Detection error (assuming Farcaster):', e);
      return true;
    }
  });

  useEffect(() => {
    const initializeFarcaster = async () => {
      console.log('🔄 Initializing Farcaster...', { 
        isInFarcaster, 
        isMobileWebView,
        userAgent: navigator.userAgent
      });
      
      if (isInFarcaster) {
        try {
          // MOBILE WEBVIEW: Send ready signal immediately, context later
          console.log('📢 Sending immediate ready signal for mobile compatibility...');
          
          if (isMobileWebView) {
            // Mobile WebView: Disable native gestures and send ready immediately
            await sdk.actions.ready({ disableNativeGestures: true });
            console.log('✅ Mobile ready signal sent with disabled gestures');
          } else {
            // Desktop: Standard ready signal
            await sdk.actions.ready();
            console.log('✅ Desktop ready signal sent');
          }
          
          // Now try to get context with mobile-specific timeout
          console.log('🔄 Getting Farcaster context...');
          
          const contextTimeout = isMobileWebView ? 3000 : 5000; // Shorter timeout for mobile
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Context timeout')), contextTimeout);
          });
          
          try {
            const farcasterContext = await Promise.race([contextPromise, timeoutPromise]);
            console.log('✅ Context received:', farcasterContext);
            
            setContext(farcasterContext);
            
            if (farcasterContext && (farcasterContext as any).user) {
              setUser((farcasterContext as any).user);
              setIsAuthenticated(true);
              console.log('✅ User authenticated:', (farcasterContext as any).user);
            }
          } catch (contextError) {
            console.warn('⚠️ Context failed (continuing anyway):', contextError);
            
            // Mobile WebView: Context might not be immediately available
            if (isMobileWebView) {
              console.log('📱 Mobile WebView detected - context may load later');
              // Set up listener for delayed context
              const contextRetry = setInterval(async () => {
                try {
                  const retryContext = await sdk.context;
                  if (retryContext) {
                    console.log('✅ Delayed context received:', retryContext);
                    setContext(retryContext);
                    if ((retryContext as any).user) {
                      setUser((retryContext as any).user);
                      setIsAuthenticated(true);
                    }
                    clearInterval(contextRetry);
                  }
                } catch (e) {
                  // Continue trying
                }
              }, 1000);
              
              // Stop trying after 10 seconds
              setTimeout(() => clearInterval(contextRetry), 10000);
            }
          }
          
        } catch (error) {
          console.error('❌ Farcaster init failed:', error);
          setError(error instanceof Error ? error.message : 'Unknown error');
          
          // Still try to send ready signal for mobile compatibility
          try {
            if (isMobileWebView) {
              await sdk.actions.ready({ disableNativeGestures: true });
            } else {
              await sdk.actions.ready();
            }
            console.log('✅ Fallback ready signal sent');
          } catch (e) {
            console.error('❌ Fallback ready signal failed:', e);
          }
        }
      }
      
      setIsReady(true);
    };

    // Mobile WebView: Immediate initialization
    // Desktop: Small delay to let everything load
    const delay = isMobileWebView ? 0 : 100;
    const timer = setTimeout(initializeFarcaster, delay);
    return () => clearTimeout(timer);
  }, [isInFarcaster, isMobileWebView]);

  // MOBILE WEBVIEW: Periodic ready signals for stubborn WebViews
  useEffect(() => {
    if (isInFarcaster && isMobileWebView && !context) {
      console.log('📱 Starting periodic ready signals for mobile WebView...');
      
      const interval = setInterval(async () => {
        try {
          await sdk.actions.ready({ disableNativeGestures: true });
          console.log('🔄 Periodic mobile ready signal sent');
        } catch (e) {
          console.warn('⚠️ Periodic ready failed:', e);
        }
      }, 1500); // Every 1.5 seconds
      
      const timeout = setTimeout(() => {
        clearInterval(interval);
        console.log('🛑 Stopped periodic ready signals');
      }, 12000); // Stop after 12 seconds
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isInFarcaster, isMobileWebView, context]);

  // MOBILE WEBVIEW: Listen for postMessage events
  useEffect(() => {
    if (isMobileWebView) {
      const handleMessage = (event: MessageEvent) => {
        console.log('📨 Mobile WebView message:', event.origin, event.data);
        
        // Handle Farcaster-specific messages
        if (event.data && typeof event.data === 'object') {
          if (event.data.type === 'farcaster_ready') {
            console.log('📱 Farcaster ready message received');
          }
        }
      };
      
      window.addEventListener('message', handleMessage, false);
      return () => window.removeEventListener('message', handleMessage, false);
    }
  }, [isMobileWebView]);

  return (
    <FarcasterContext.Provider value={{ 
      isInFarcaster, 
      isReady, 
      context, 
      user, 
      isAuthenticated,
      error,
      isMobileWebView
    }}>
      {children}
    </FarcasterContext.Provider>
  );
};

export const useFarcaster = () => useContext(FarcasterContext);

export function useFarcasterActions() {
  const { isInFarcaster, isMobileWebView } = useFarcaster();
  
  const openUrl = async (url: string) => {
    if (isInFarcaster) {
      try {
        await sdk.actions.openUrl(url);
      } catch (error) {
        console.error('Failed to open URL:', error);
        // Mobile WebView fallback
        if (isMobileWebView) {
          console.log('📱 Mobile WebView URL fallback');
          // Some mobile WebViews handle this differently
          window.location.href = url;
        } else {
          window.open(url, '_blank');
        }
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const openWarpcastProfile = (username: string) => {
    const url = `https://warpcast.com/${username}`;
    openUrl(url);
  };

  return { openUrl, openWarpcastProfile };
}

export function useFarcasterUser() {
  const { user, isAuthenticated, isInFarcaster } = useFarcaster();
  
  const getDisplayName = () => {
    if (!user) return null;
    return user.displayName || user.username || `User ${user.fid}`;
  };
  
  const getProfileUrl = () => {
    if (!user?.username) return null;
    return `https://warpcast.com/${user.username}`;
  };
  
  const getAvatarUrl = () => {
    return user?.pfpUrl || null;
  };
  
  const getUserHandle = () => {
    if (!user?.username) return null;
    return `@${user.username}`;
  };

  return {
    user,
    isAuthenticated,
    isInFarcaster,
    getDisplayName,
    getProfileUrl,
    getAvatarUrl,
    getUserHandle,
  };
}