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

export const FarcasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<any>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const initializationRef = useRef(false);
  
  // Simplified Farcaster detection
  const isInFarcaster = typeof window !== 'undefined' && (
    window.parent !== window || 
    !!window.frameElement ||
    window.location !== window.parent.location
  );

  useEffect(() => {
    // Prevent double initialization
    if (initializationRef.current) return;
    
    const initializeFarcaster = async () => {
      if (!isInFarcaster) {
        console.log('Not in Farcaster frame');
        setIsReady(true);
        return;
      }

      console.log('Initializing Farcaster SDK...');
      initializationRef.current = true;

      try {
        // Wait for SDK to be available
        let attempts = 0;
        while (!sdk.actions && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!sdk.actions) {
          throw new Error('SDK not available after 1 second');
        }

        // Get context first
        const frameContext = await sdk.context;
        console.log('Got context:', frameContext);
        setContext(frameContext);
        
        if (frameContext?.user) {
          setUser(frameContext.user);
          setIsAuthenticated(true);
        }

        // Send ready signal after context is set
        await sdk.actions.ready();
        console.log('Ready signal sent');
        
      } catch (error) {
        console.error('Farcaster initialization error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsReady(true);
      }
    };

    // Delay initialization to ensure DOM is ready
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