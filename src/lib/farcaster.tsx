import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import sdk from '@farcaster/frame-sdk';

// Proper Farcaster user type based on the Frame SDK
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
          
          // Initialize the SDK
          const result = await sdk.actions.ready();
          console.log('✅ Farcaster SDK ready:', result);
          
          // Get user info if available - be very defensive about the typing
          if (result !== null && result !== undefined && typeof result === 'object') {
            // Now safely check if user property exists and has value
            const hasUser = 'user' in result;
            if (hasUser) {
              const userValue = (result as any).user;
              if (userValue !== null && userValue !== undefined && typeof userValue === 'object') {
                // Extract user data safely
                const userData = userValue;
                
                // Helper function to safely get property values
                const safeGet = (obj: any, key: string) => {
                  const value = obj?.[key];
                  return (value !== undefined && value !== null && typeof value !== 'function') ? value : undefined;
                };
                
                const farcasterUser: FarcasterUser = {
                  fid: safeGet(userData, 'fid') ?? 0,
                  username: safeGet(userData, 'username'),
                  displayName: safeGet(userData, 'displayName') ?? safeGet(userData, 'display_name'),
                  pfpUrl: safeGet(userData, 'pfpUrl') ?? safeGet(userData, 'pfp_url'),
                  custodyAddress: safeGet(userData, 'custodyAddress') ?? safeGet(userData, 'custody_address'),
                  verifications: safeGet(userData, 'verifications'),
                  bio: safeGet(userData, 'bio'),
                  followerCount: safeGet(userData, 'followerCount') ?? safeGet(userData, 'follower_count'),
                  followingCount: safeGet(userData, 'followingCount') ?? safeGet(userData, 'following_count'),
                };
                
                setUser(farcasterUser);
                console.log('👤 Farcaster user:', farcasterUser);
              }
            }
          }
          
          setIsSDKLoaded(true);
        } else {
          console.log('🖥️ Running outside Farcaster - normal web mode');
          setIsSDKLoaded(true); // Still mark as loaded for normal web usage
        }
      } catch (error) {
        console.error('❌ Farcaster SDK initialization failed:', error);
        // Don't block the app if SDK fails
        setIsSDKLoaded(true);
      }
    };

    initSDK();
  }, []);

  // Add event listeners for Farcaster events
  useEffect(() => {
    if (!isInFarcaster || !isSDKLoaded) return;

    const handleResize = () => {
      // Handle frame resize events
      console.log('📐 Frame resized');
    };

    // Add more event listeners as needed
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isInFarcaster, isSDKLoaded]);

  const value: FarcasterContextType = {
    isSDKLoaded,
    user,
    isInFarcaster,
    isAuthenticated: user !== null,
  };

  // Show loading screen while SDK initializes
  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading Evermark...</p>
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

export function useFarcaster() {
  const context = useContext(FarcasterContext);
  if (!context) {
    throw new Error('useFarcaster must be used within FarcasterProvider');
  }
  return context;
}

// Helper hook for Farcaster actions
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

// Helper hook for Farcaster user utilities
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