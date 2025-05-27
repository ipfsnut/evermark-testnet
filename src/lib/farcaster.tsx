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
  context: any; // Use any for the SDK context to avoid type conflicts
  user?: FarcasterUser;
  isAuthenticated: boolean;
  error?: string;
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
  const [error, setError] = useState<string | undefined>(undefined);
  const [isInFarcaster] = useState(() => {
    const inFrame = typeof window !== 'undefined' && window.parent !== window;
    console.log('🔍 Detecting Farcaster environment:', {
      inFrame,
      userAgent: navigator.userAgent,
      hasFrameSDK: typeof sdk !== 'undefined'
    });
    return inFrame;
  });

  useEffect(() => {
    const initializeFarcaster = async () => {
      console.log('🔄 Starting Farcaster initialization...');
      console.log('- Is in Farcaster?', isInFarcaster);
      console.log('- SDK available?', typeof sdk);
      console.log('- Window parent check:', window.parent !== window);
      
      try {
        if (isInFarcaster) {
          console.log('📱 In Farcaster environment - initializing SDK...');
          
          // Add timeout to prevent hanging
          const initPromise = Promise.race([
            (async () => {
              const farcasterContext = await sdk.context;
              console.log('✅ Farcaster context received:', farcasterContext);
              return farcasterContext;
            })(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('SDK initialization timeout')), 10000)
            )
          ]);
          
          const farcasterContext = await initPromise;
          setContext(farcasterContext);
          
          // Extract user info if available - handle different possible structures
          const contextUser = (farcasterContext as any)?.user;
          if (contextUser) {
            console.log('👤 User found in context:', contextUser);
            // Map the SDK user to our interface
            const mappedUser: FarcasterUser = {
              fid: contextUser.fid,
              username: contextUser.username,
              displayName: contextUser.displayName,
              pfpUrl: contextUser.pfpUrl,
              custodyAddress: contextUser.custodyAddress,
              verifications: contextUser.verifications,
              bio: contextUser.bio,
              followerCount: contextUser.followerCount,
              followingCount: contextUser.followingCount,
            };
            setUser(mappedUser);
            setIsAuthenticated(true);
          }
          
          // CRITICAL: Tell Farcaster the app is ready
          console.log('📢 Sending ready signal to Farcaster...');
          sdk.actions.ready();
          console.log('✅ Farcaster SDK ready signal sent successfully');
          
        } else {
          console.log('🌐 Not in Farcaster environment, proceeding normally');
        }
      } catch (error) {
        console.error('❌ Farcaster SDK initialization failed:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        
        // Still try to send ready signal even if context fails
        if (isInFarcaster) {
          try {
            console.log('🔄 Attempting to send ready signal despite error...');
            sdk.actions.ready();
            console.log('✅ Ready signal sent despite context error');
          } catch (readyError) {
            console.error('❌ Failed to send ready signal:', readyError);
          }
        }
      } finally {
        // Always set ready to true so app loads
        console.log('🏁 Setting app as ready');
        setIsReady(true);
      }
    };

    // Add a small delay to ensure DOM is ready
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