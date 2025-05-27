import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import sdk from '@farcaster/frame-sdk';

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
  isSDKLoaded: boolean;
  user: FarcasterUser | null;
  isInFarcaster: boolean;
  isAuthenticated: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isSDKLoaded: false,
  user: null,
  isInFarcaster: false,
  isAuthenticated: false,
});

export function FarcasterProvider({ children }: PropsWithChildren) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isInFarcaster, setIsInFarcaster] = useState(false);

  useEffect(() => {
    const initSDK = async () => {
      console.log('🚀 Initializing Farcaster Frame SDK...');
      
      try {
        // Check if we're in a Farcaster context
        const isInFrame = window.parent !== window || window.location !== window.parent.location;
        console.log('📱 Is in frame?', isInFrame);
        
        if (isInFrame) {
          setIsInFarcaster(true);
          
          // ADD TIMEOUT to prevent hanging
          const initPromise = sdk.actions.ready();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SDK init timeout')), 5000)
          );
          
          try {
            const result = await Promise.race([initPromise, timeoutPromise]);
            console.log('✅ Farcaster SDK ready:', result);
            
            // SIMPLIFIED user extraction - don't let this block everything
            if (result && typeof result === 'object' && 'user' in result) {
              const userData = (result as any).user;
              if (userData) {
                const farcasterUser: FarcasterUser = {
                  fid: userData.fid ?? 0,
                  username: userData.username,
                  displayName: userData.displayName ?? userData.display_name,
                  pfpUrl: userData.pfpUrl ?? userData.pfp_url,
                  custodyAddress: userData.custodyAddress ?? userData.custody_address,
                  verifications: userData.verifications,
                  bio: userData.bio,
                  followerCount: userData.followerCount ?? userData.follower_count,
                  followingCount: userData.followingCount ?? userData.following_count,
                };
                setUser(farcasterUser);
                console.log('👤 Farcaster user:', farcasterUser);
              }
            }
          } catch (sdkError) {
            console.error('❌ Farcaster SDK failed:', sdkError);
            // Don't block - continue loading
          }
          
          setIsSDKLoaded(true);
        } else {
          console.log('🖥️ Running outside Farcaster - normal web mode');
          setIsSDKLoaded(true);
        }
      } catch (error) {
        console.error('❌ Farcaster SDK initialization failed:', error);
        setIsSDKLoaded(true); // Don't block the app
      }
    };

    // ADD FALLBACK TIMEOUT - if init takes too long, just continue
    const fallbackTimeout = setTimeout(() => {
      console.warn('⚠️ Farcaster init taking too long, continuing anyway...');
      setIsSDKLoaded(true);
    }, 8000); // 8 second max wait

    initSDK().finally(() => {
      clearTimeout(fallbackTimeout);
    });

    return () => {
      clearTimeout(fallbackTimeout);
    };
  }, []);

  const value: FarcasterContextType = {
    isSDKLoaded,
    user,
    isInFarcaster,
    isAuthenticated: user !== null,
  };

  // TEMPORARY: Show loading for max 10 seconds, then continue anyway
  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Evermark...</p>
          <p className="text-sm mt-2 opacity-75">
            In frame: {window.parent !== window ? 'Yes' : 'No'}
          </p>
          <p className="text-xs mt-1 opacity-50">
            If this takes too long, try refreshing
          </p>
        </div>
      </div>
    );
  }

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  );
}

// Keep the rest of your hooks the same...
export function useFarcaster() {
  const context = useContext(FarcasterContext);
  if (!context) {
    throw new Error('useFarcaster must be used within FarcasterProvider');
  }
  return context;
}

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