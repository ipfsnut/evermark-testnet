import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import sdk from '@farcaster/frame-sdk';

interface FarcasterContextType {
  isSDKLoaded: boolean;
  user: any;
  isInFarcaster: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isSDKLoaded: false,
  user: null,
  isInFarcaster: false,
});

export function FarcasterProvider({ children }: PropsWithChildren) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [user, setUser] = useState(null);
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
          
          // Get user info if available
          if (result?.user) {
            setUser(result.user);
            console.log('👤 Farcaster user:', result.user);
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

    const handleThemeChange = (theme: any) => {
      console.log('🎨 Theme changed:', theme);
      // You could update your app theme based on Farcaster's theme
    };

    // Add more event listeners as needed
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isInFarcaster, isSDKLoaded]);

  const value = {
    isSDKLoaded,
    user,
    isInFarcaster,
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

  return { openUrl, close };
}