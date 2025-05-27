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
  const [isInFarcaster] = useState(() => {
    return typeof window !== 'undefined' && window.parent !== window;
  });

  useEffect(() => {
    const initializeFarcaster = async () => {
      if (isInFarcaster) {
        try {
          console.log('🔄 Getting Farcaster context...');
          const farcasterContext = await sdk.context;
          console.log('✅ Context received:', farcasterContext);
          
          setContext(farcasterContext);
          
          if (farcasterContext?.user) {
            setUser(farcasterContext.user);
            setIsAuthenticated(true);
          }
          
          // Send ready signal AFTER getting context
          console.log('📢 Sending ready signal...');
          sdk.actions.ready();
          console.log('✅ Ready signal sent');
          
        } catch (error) {
          console.error('❌ Farcaster init failed:', error);
          setError(error instanceof Error ? error.message : 'Unknown error');
          
          // Still send ready signal even if context fails
          try {
            sdk.actions.ready();
          } catch (e) {
            console.error('❌ Ready signal failed:', e);
          }
        }
      }
      
      setIsReady(true);
    };

    initializeFarcaster();
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

  return { openUrl };
}

export function useFarcasterUser() {
  const { user, isAuthenticated, isInFarcaster } = useFarcaster();
  
  const getDisplayName = () => {
    if (!user) return null;
    return user.displayName || user.username || `User ${user.fid}`;
  };
  
  const getAvatarUrl = () => {
    return user?.pfpUrl || null;
  };

  return {
    user,
    isAuthenticated,
    isInFarcaster,
    getDisplayName,
    getAvatarUrl,
  };
}