// src/lib/farcaster.tsx - Fixed type error with verified addresses
import React, { createContext, useContext, useEffect, useState, PropsWithChildren, useRef } from 'react';
import sdk from "@farcaster/frame-sdk";

export { sdk };

// 🎯 FIXED: Make verifiedAddresses non-optional since we always provide a default
interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  verifiedAddresses: {  // Removed ? since we always provide a default
    eth_addresses: string[];
    sol_addresses: string[];
  };
}

// Create a flexible type for the frame context based on what the SDK actually provides
type SDKContext = typeof sdk.context extends Promise<infer T> ? T : any;

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

// Enhanced environment detection (same as before)
function detectFarcasterEnvironment() {
  if (typeof window === 'undefined') {
    return { isInFarcaster: false, confidence: 'high', methods: ['no-window'] };
  }

  const methods: string[] = [];
  let isInFarcaster = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  const userAgent = navigator.userAgent.toLowerCase();
  const url = window.location.href.toLowerCase();
  
  // Method 1: Direct Farcaster indicators
  if (userAgent.includes('farcaster') || userAgent.includes('warpcast')) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('user-agent-direct');
  }

  // Method 2: URL patterns
  if (url.includes('farcaster.com') || url.includes('warpcast.com') || url.includes('frame')) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('url-pattern');
  }

  // Method 3: PostMessage detection
  if ((window as any).__farcaster_detected) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('postmessage-detected');
  }

  // Method 4: Frame context
  try {
    const hasParent = window.parent !== window;
    const isIframe = window.self !== window.top;
    
    if (hasParent || isIframe) {
      methods.push('iframe-context');
      if (methods.length > 1) {
        confidence = 'medium';
      }
    }
  } catch (e) {
    methods.push('cross-origin-blocked');
  }

  // Method 5: Mobile WebView
  const isMobile = userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone');
  const isWebView = userAgent.includes('wv') || userAgent.includes('webview');
  
  if (isMobile && isWebView && !userAgent.includes('safari') && !userAgent.includes('chrome/')) {
    methods.push('mobile-webview');
    if (!isInFarcaster && methods.length > 1) {
      isInFarcaster = true;
      confidence = 'medium';
    }
  }

  // Method 6: SDK availability
  if ((window as any).FrameSDK || (window as any).frameSDK) {
    isInFarcaster = true;
    confidence = 'high';
    methods.push('sdk-available');
  }

  console.log('🔍 Farcaster Detection:', {
    isInFarcaster,
    confidence,
    methods,
    userAgent: userAgent.substring(0, 100),
    url: url.substring(0, 100)
  });

  return { isInFarcaster, confidence, methods };
}

export const FarcasterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<FarcasterUser | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [detectedFromPostMessage, setDetectedFromPostMessage] = useState(false);
  const initializationRef = useRef(false);
  
  // PostMessage detection
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      const isFarcasterMessage = 
        event.origin?.includes('farcaster') ||
        event.origin?.includes('warpcast') ||
        event.data?.type === 'frameEvent' ||
        event.data?.type === 'RAW' ||
        event.data?.source === 'farcaster' ||
        (event.data && typeof event.data === 'object' && 'farcaster' in event.data);

      if (isFarcasterMessage) {
        console.log('📨 Farcaster PostMessage detected:', {
          origin: event.origin,
          dataType: typeof event.data,
          data: event.data
        });
        
        setDetectedFromPostMessage(true);
        (window as any).__farcaster_detected = true;
      }
    };

    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, []);
  
  const detection = detectFarcasterEnvironment();
  const isInFarcaster = detection.isInFarcaster || detectedFromPostMessage;

  useEffect(() => {
    if (initializationRef.current) return;
    
    const initializeFarcaster = async () => {
      if (!isInFarcaster) {
        console.log('🖥️ Desktop environment - setting ready');
        setIsReady(true);
        return;
      }

      console.log('📱 Farcaster environment - initializing SDK...');
      initializationRef.current = true;

      try {
        // Wait for SDK
        let sdkReady = false;
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!sdkReady && attempts < maxAttempts) {
          try {
            if (sdk && typeof sdk.context !== 'undefined') {
              sdkReady = true;
              console.log('✅ SDK ready after', attempts * 100, 'ms');
              break;
            }
          } catch (e) {
            // Continue waiting
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        // 🎯 FIXED: Properly typed context handling
        try {
          const frameContext = await Promise.race([
            Promise.resolve(sdk.context),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Context timeout')), 3000)
            )
          ]) as any;
          
          console.log('✅ Frame context retrieved:', frameContext);
          setContext(frameContext);
          
          // 🎯 FIXED: Type-safe user data extraction with guaranteed verifiedAddresses
          if (frameContext && frameContext.user) {
            const rawUser = frameContext.user;
            
            // Build our enhanced user object with guaranteed verifiedAddresses
            const userData: FarcasterUser = {
              fid: rawUser.fid,
              username: rawUser.username,
              displayName: rawUser.displayName,
              pfpUrl: rawUser.pfpUrl,
              bio: (rawUser as any).bio,
              followerCount: (rawUser as any).followerCount,
              followingCount: (rawUser as any).followingCount,
              // 🎯 FIXED: Always provide a default value for verifiedAddresses
              verifiedAddresses: (rawUser as any).verifiedAddresses || {
                eth_addresses: [],
                sol_addresses: []
              }
            };
            
            console.log('✅ User authenticated with proper types:', {
              fid: userData.fid,
              username: userData.username,
              displayName: userData.displayName,
              hasVerifiedAddresses: userData.verifiedAddresses.eth_addresses.length > 0
            });
            
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            console.log('⚠️ No user data in frame context');
          }
        } catch (contextError) {
          console.log('⚠️ Could not get frame context:', contextError);
        }

        // Send ready signal
        try {
          if (sdk?.actions?.ready) {
            await Promise.race([
              sdk.actions.ready({ disableNativeGestures: true }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Ready timeout')), 2000))
            ]);
            console.log('✅ Ready signal sent');
          }
        } catch (readyError) {
          console.log('⚠️ Ready signal failed (non-critical):', readyError);
        }
        
      } catch (error) {
        console.error('❌ Farcaster initialization error:', error);
        setError(error instanceof Error ? error.message : 'Farcaster initialization failed');
      } finally {
        console.log('✅ Farcaster initialization complete');
        setIsReady(true);
      }
    };

    const timer = setTimeout(initializeFarcaster, 150);
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

// 🎯 FIXED: Better user hook with proper typing and null safety
export const useFarcasterUser = () => {
  const context = useContext(FarcasterContext);
  
  const getVerifiedAddresses = () => {
    return context.user?.verifiedAddresses.eth_addresses || [];
  };
  
  const getPrimaryAddress = () => {
    const addresses = getVerifiedAddresses();
    return addresses.length > 0 ? addresses[0] : null;
  };
  
  const hasVerifiedAddress = () => {
    return getVerifiedAddresses().length > 0;
  };
  
  // ✅ FIXED: Only log once when context changes, not on every render
  useEffect(() => {
    console.log('🔍 useFarcasterUser state:', {
      isInFarcaster: context.isInFarcaster,
      isReady: context.isReady,
      isAuthenticated: context.isAuthenticated,
      hasUser: !!context.user,
      fid: context.user?.fid,
      username: context.user?.username,
      verifiedAddresses: getVerifiedAddresses(),
      primaryAddress: getPrimaryAddress(),
      hasVerifiedAddress: hasVerifiedAddress()
    });
  }, [context.isInFarcaster, context.isReady, context.isAuthenticated, context.user?.fid]); // Only log when these change
  
  return {
    user: context.user,
    isAuthenticated: context.isAuthenticated,
    isInFarcaster: context.isInFarcaster,
    isReady: context.isReady,
    error: context.error,
    
    // Address helpers
    getVerifiedAddresses,
    getPrimaryAddress,
    hasVerifiedAddress,
    
    // Display helpers
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
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    shareFrame: (frameUrl: string) => {
      const shareUrl = `https://warpcast.com/~/compose?text=Check%20out%20this%20frame%3A%20${encodeURIComponent(frameUrl)}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    },
  };
};