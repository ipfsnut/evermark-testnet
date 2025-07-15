// src/lib/farcaster.tsx - Fixed to prevent re-initialization loops
import React, { createContext, useContext, useEffect, useState, useCallback, PropsWithChildren, useRef } from 'react';
import sdk from "@farcaster/frame-sdk";

export { sdk };

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  verifiedAddresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

interface FarcasterContextType {
  isInFarcaster: boolean;
  isReady: boolean;
  context: any;
  user?: FarcasterUser;
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

// 🔧 FIXED: Single detection, no re-runs
function detectFarcasterEnvironment() {
  // Use cached result to prevent re-detection
  if ((window as any).__farcaster_detection_result) {
    return (window as any).__farcaster_detection_result;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const url = window.location.href.toLowerCase();
  
  const methods: string[] = [];
  let isInFarcaster = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Simple, definitive checks only
  if (userAgent.includes('farcaster') || userAgent.includes('warpcast')) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('user-agent-direct');
  }

  if ((window as any).__evermark_farcaster_detected) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('pre-detected');
  }

  const result = { isInFarcaster, confidence, methods };
  
  // Cache the result
  (window as any).__farcaster_detection_result = result;
  
  console.log('🔍 Farcaster Detection (cached):', result);
  return result;
}

export const FarcasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<FarcasterUser | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // 🔧 FIXED: Prevent multiple initializations
  const initializationRef = useRef<'pending' | 'complete' | 'failed'>('pending');
  const detectionRef = useRef<ReturnType<typeof detectFarcasterEnvironment> | null>(null);
  
  // Only detect once
  if (!detectionRef.current) {
    detectionRef.current = detectFarcasterEnvironment();
  }
  
  const detection = detectionRef.current;
  const isInFarcaster = detection.isInFarcaster;

  useEffect(() => {
    // 🚨 CRITICAL: Only run once
    if (initializationRef.current !== 'pending') {
      return;
    }
    
    initializationRef.current = 'complete';

    const initializeFarcaster = async () => {
      if (!isInFarcaster) {
        console.log('🖥️ Desktop environment - setting ready immediately');
        setIsReady(true);
        return;
      }

      console.log('📱 Farcaster environment - initializing SDK once...');

      try {
        // Simple timeout approach
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SDK timeout')), 5000)
        );

        await Promise.race([
          sdk.context,
          timeoutPromise
        ]);

        const frameContext = await sdk.context;
        console.log('✅ Frame context retrieved');
        setContext(frameContext);
        
        if (frameContext && frameContext.user) {
          const rawUser = frameContext.user;
          const userData: FarcasterUser = {
            fid: rawUser.fid,
            username: rawUser.username,
            displayName: rawUser.displayName,
            pfpUrl: rawUser.pfpUrl,
            bio: (rawUser as any).bio,
            followerCount: (rawUser as any).followerCount,
            followingCount: (rawUser as any).followingCount,
            verifiedAddresses: (rawUser as any).verifiedAddresses || {
              eth_addresses: [],
              sol_addresses: []
            }
          };
          
          setUser(userData);
          setIsAuthenticated(true);
          console.log('✅ User authenticated');
        }

        // Send ready signal once
        if (sdk?.actions?.ready) {
          await sdk.actions.ready({ disableNativeGestures: true });
          console.log('✅ Ready signal sent');
        }
        
      } catch (error) {
        console.error('❌ Farcaster initialization failed:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
        initializationRef.current = 'failed';
      } finally {
        setIsReady(true);
      }
    };

    // Small delay to prevent rapid fire
    const timer = setTimeout(initializeFarcaster, 100);
    return () => clearTimeout(timer);
  }, []); // 🔧 FIXED: Empty dependency array

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

// 🔧 FIXED: Memoized hooks to prevent re-renders
export const useFarcasterUser = () => {
  const context = useContext(FarcasterContext);
  
  const getVerifiedAddresses = useCallback(() => {
    return context.user?.verifiedAddresses.eth_addresses || [];
  }, [context.user?.verifiedAddresses.eth_addresses]);
  
  const getPrimaryAddress = useCallback(() => {
    const addresses = getVerifiedAddresses();
    return addresses.length > 0 ? addresses[0] : null;
  }, [getVerifiedAddresses]);
  
  const hasVerifiedAddress = useCallback(() => {
    return getVerifiedAddresses().length > 0;
  }, [getVerifiedAddresses]);
  
  const getDisplayName = useCallback(() => {
    return context.user?.displayName || context.user?.username || '';
  }, [context.user?.displayName, context.user?.username]);
  
  const getAvatarUrl = useCallback(() => {
    return context.user?.pfpUrl || '';
  }, [context.user?.pfpUrl]);
  
  const getUserHandle = useCallback(() => {
    return context.user?.username ? `@${context.user.username}` : '';
  }, [context.user?.username]);
  
  const getProfileUrl = useCallback(() => {
    return context.user?.username ? `https://warpcast.com/${context.user.username}` : '';
  }, [context.user?.username]);
  
  return {
    user: context.user,
    isAuthenticated: context.isAuthenticated,
    isInFarcaster: context.isInFarcaster,
    isReady: context.isReady,
    error: context.error,
    
    // Memoized helpers
    getVerifiedAddresses,
    getPrimaryAddress,
    hasVerifiedAddress,
    getDisplayName,
    getAvatarUrl,
    getUserHandle,
    getProfileUrl,
  };
};