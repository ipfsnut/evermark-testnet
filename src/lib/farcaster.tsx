import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
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

export const FarcasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<any>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // IMPROVED: More robust mobile detection
  const [isInFarcaster] = useState(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      // Multiple detection methods for mobile webviews
      const parentCheck = window.parent !== window;
      const frameCheck = window.frameElement !== null;
      const userAgentCheck = navigator.userAgent.includes('Farcaster') || 
                            navigator.userAgent.includes('Warpcast');
      const referrerCheck = document.referrer.includes('warpcast.com') || 
                           document.referrer.includes('farcaster');
      
      // Special check for mobile webviews
      const locationCheck = (() => {
        try {
          return window.location !== window.parent.location;
        } catch (e) {
          return true; // Cross-origin frame
        }
      })();
      
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Fix TypeScript error for standalone property
      const isWebView = (navigator as any).standalone || 
                       window.matchMedia('(display-mode: standalone)').matches;
      
      const detected = parentCheck || frameCheck || userAgentCheck || 
                      referrerCheck || locationCheck || (isMobile && isWebView);
      
      console.log('🔍 Farcaster detection:', {
        parentCheck,
        frameCheck,
        userAgentCheck,
        referrerCheck,
        locationCheck,
        isMobile,
        isWebView,
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
      console.log('🔄 Initializing Farcaster...', { isInFarcaster });
      
      if (isInFarcaster) {
        try {
          // FIXED: Send ready signal immediately for mobile compatibility
          console.log('📢 Sending immediate ready signal...');
          sdk.actions.ready();
          console.log('✅ Immediate ready signal sent');
          
          // Then try to get context (with timeout for mobile)
          console.log('🔄 Getting Farcaster context...');
          
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Context timeout')), 5000);
          });
          
          try {
            const farcasterContext = await Promise.race([contextPromise, timeoutPromise]);
            console.log('✅ Context received:', farcasterContext);
            
            setContext(farcasterContext);
            
            // Fix TypeScript error for user property
            if (farcasterContext && (farcasterContext as any).user) {
              setUser((farcasterContext as any).user);
              setIsAuthenticated(true);
              console.log('✅ User authenticated:', (farcasterContext as any).user);
            }
          } catch (contextError) {
            console.warn('⚠️ Context failed (continuing anyway):', contextError);
            // Continue without context - mobile webviews sometimes don't provide context immediately
          }
          
        } catch (error) {
          console.error('❌ Farcaster init failed:', error);
          setError(error instanceof Error ? error.message : 'Unknown error');
          
          // Still try to send ready signal
          try {
            sdk.actions.ready();
            console.log('✅ Fallback ready signal sent');
          } catch (e) {
            console.error('❌ Fallback ready signal failed:', e);
          }
        }
      }
      
      // Always mark as ready to prevent infinite loading
      setIsReady(true);
    };

    // Add a small delay for mobile webviews to fully load
    const timer = setTimeout(initializeFarcaster, 100);
    return () => clearTimeout(timer);
  }, [isInFarcaster]);

  // ADDED: Periodic ready signal for stubborn mobile webviews
  useEffect(() => {
    if (isInFarcaster && !context) {
      const interval = setInterval(() => {
        try {
          console.log('🔄 Periodic ready signal...');
          sdk.actions.ready();
        } catch (e) {
          console.warn('⚠️ Periodic ready failed:', e);
        }
      }, 2000);
      
      // Stop after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
        console.log('🛑 Stopped periodic ready signals');
      }, 10000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isInFarcaster, context]);

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

export const useFarcaster = () => useContext(FarcasterContext);

export function useFarcasterActions() {
  const { isInFarcaster } = useFarcaster();
  
  const openUrl = async (url: string) => {
    if (isInFarcaster) {
      try {
        await sdk.actions.openUrl(url);
      } catch (error) {
        console.error('Failed to open URL:', error);
        window.open(url, '_blank');
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