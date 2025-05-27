import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import sdk from "@farcaster/frame-sdk";

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  custodyAddress?: string;
  verifications?: string[];
  bio?: string;
  followerCount?: number;
  followingCount?: number;
}

interface FarcasterContextType {
  isInFarcaster: boolean;
  isReady: boolean;
  context: any;
  user?: FarcasterUser;
  isAuthenticated: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInFarcaster: false,
  isReady: false,
  context: null,
  user: undefined,
  isAuthenticated: false,
});

export const FarcasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<FarcasterUser | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInFarcaster] = useState(() => {
    return typeof window !== 'undefined' && window.parent !== window;
  });

  useEffect(() => {
    const initializeFarcaster = async () => {
      console.log('🔄 Initializing Farcaster SDK...');
      console.log('- Is in Farcaster?', isInFarcaster);
      
      if (isInFarcaster) {
        try {
          // Get the context
          const farcasterContext = await sdk.context;
          console.log('✅ Farcaster context loaded:', farcasterContext);
          setContext(farcasterContext);
          
          // Extract user info if available
          if (farcasterContext?.user) {
            setUser(farcasterContext.user);
            setIsAuthenticated(true);
          }
          
          // CRITICAL: Tell Farcaster the app is ready
          sdk.actions.ready();
          console.log('✅ Farcaster SDK ready signal sent');
          
        } catch (error) {
          console.error('❌ Farcaster SDK initialization failed:', error);
        }
      } else {
        console.log('ℹ️ Not in Farcaster environment, skipping SDK init');
      }
      
      // Always set ready to true so app loads
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
      isAuthenticated 
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
        console.error('Failed to open URL via Farcaster:', error);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const close = async () => {
    if (isInFarcaster) {
      try {
        await sdk.actions.close();
      } catch (error) {
        console.error('Failed to close via Farcaster:', error);
      }
    }
  };

  const openWarpcastProfile = (username?: string) => {
    if (username) {
      openUrl(`https://warpcast.com/${username}`);
    }
  };

  return { openUrl, close, openWarpcastProfile };
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