import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppThirdwebProvider } from './lib/thirdweb';
import { FarcasterProvider, useFarcasterUser } from './lib/farcaster';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import sdk from '@farcaster/frame-sdk';

// Core pages
import EnhancedHomePage from './pages/EnhancedHomePage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import MyEvermarksPage from './pages/MyEvermarksPage';
import WrappingPage from './pages/WrappingPage';
import BookshelfPage from './pages/BookshelfPage';
import { EnhancedCreateEvermark } from './components/evermark/EnhancedCreateEvermark';
import EvermarkDetailPage from './pages/EvermarkDetailPage';

import { ShareRedirect } from './components/sharing/ShareButton';
import AboutPage from './pages/AboutPage';
import UserCreatedEvermarksPage from './pages/UserCreatedEvermarksPage';
import PublicProfilePage from './pages/PublicProfilePage';

// Sharing components
import { ShareHandler } from './components/sharing/ShareHandler';
import { CreateFromCast } from './components/sharing/CreateFromCast';

import { PublicBookshelfView } from './components/bookshelf/PublicBookshelfView';
import ExplorePage from './pages/ExplorePage';

interface FarcasterContext {
  isInFarcaster: boolean;
  isMiniApp: boolean;
  isShareContext: boolean;
  sharedCast?: any;
  location: {
    type: 'default' | 'cast_share' | 'mini_app';
    cast?: any;
  };
}

function useFarcasterContext(): FarcasterContext {
  const [context, setContext] = useState<FarcasterContext>({
    isInFarcaster: false,
    isMiniApp: false,
    isShareContext: false,
    location: { type: 'default' }
  });

  useEffect(() => {
    const isInFarcaster = !!(window as any).__evermark_farcaster_detected;
    
    const initializeFarcasterContext = async () => {
      if (!isInFarcaster) {
        setContext({
          isInFarcaster: false,
          isMiniApp: false,
          isShareContext: false,
          location: { type: 'default' }
        });
        return;
      }

      try {
        if (sdk) {
          const sdkContext = await sdk.context;
          
          if (sdkContext.location) {
            const location = sdkContext.location;
            const isShareContext = location.type === 'cast_embed' || 
                                 location.type === 'notification' ||
                                 !!(location as any).cast;
            
            setContext({
              isInFarcaster: true,
              isMiniApp: true,
              isShareContext,
              sharedCast: isShareContext ? (location as any).cast : undefined,
              location: {
                type: location.type as any,
                cast: (location as any).cast
              }
            });
          } else {
            setContext({
              isInFarcaster: true,
              isMiniApp: true,
              isShareContext: false,
              location: { type: 'default' }
            });
          }
        }
      } catch (error) {
        console.error('❌ Farcaster context error:', error);
        setContext({
          isInFarcaster: false,
          isMiniApp: false,
          isShareContext: false,
          location: { type: 'default' }
        });
      }
    };

    initializeFarcasterContext();
  }, []); 

  return context;
}

function DebugInfo() {
  const { isInFarcaster, isReady, isAuthenticated, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();
  const farcasterContext = useFarcasterContext();
  
  useEffect(() => {
    console.log('🔍 App Debug Info:', {
      url: window.location.href,
      isInFarcaster,
      farcasterReady: isReady,
      authenticated: isAuthenticated,
      hasAddress: hasVerifiedAddress(),
      primaryAddress: getPrimaryAddress(),
      isMiniApp: farcasterContext.isMiniApp,
      isShareContext: farcasterContext.isShareContext
    });
  }, []); 
  
  return null;
}

function AppContent() {
  const { isReady, isInFarcaster } = useFarcasterUser();
  const farcasterContext = useFarcasterContext();
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Evermark...</p>
          {isInFarcaster && (
            <p className="text-sm text-blue-600 mt-2">📱 Farcaster Mini App</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          {/* SPECIFIC ROUTES FIRST */}
          <Route path="/" element={<EnhancedHomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/my-evermarks" element={<MyEvermarksPage />} />
          <Route path="/create" element={<EnhancedCreateEvermark />} />
          <Route path="/evermark/:id" element={<EvermarkDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          
          {/* Bookshelf routes */}
          <Route path="/bookshelf" element={<BookshelfPage />} />
          
          {/* Wrapping route */}
          <Route path="/wrapping" element={<WrappingPage />} />
          
          {/* Share functionality */}
          <Route path="/share" element={<ShareHandler />} />
          <Route path="/share/create" element={<CreateFromCast />} />
          <Route path="/share/:id" element={<ShareRedirect />} />
          <Route path="/share/evermark/:id" element={<ShareRedirect />} />
          
          {/* Redirects */}
          <Route path="/delegation" element={<Navigate to="/bookshelf" replace />} />
          
          {/* Placeholder routes */}
          <Route path="/Market" element={<ComingSoonPage feature="Marketplace" />} />
          <Route path="/marketplace" element={<ComingSoonPage feature="Marketplace" />} />
          
          {/* Specific nested routes */}
          <Route path="/bookshelf/:address" element={<PublicBookshelfView />} />
          
          {/* DYNAMIC ROUTES LAST */}
          <Route path="/:address" element={<PublicProfilePage />} />
          <Route path="/:address/created" element={<UserCreatedEvermarksPage />} />
          <Route path="/:address/bookshelf" element={<PublicBookshelfView />} />
          
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

function ComingSoonPage({ feature }: { feature: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {feature} Coming Soon
        </h1>
        <p className="text-gray-600 mb-6">
          We're focusing on core Evermark functionality for the mainnet launch. 
          {feature} will be available in a future update!
        </p>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">
            🚀 <strong>Mainnet is Live!</strong> Create and collect Evermarks with real $EMARK tokens.
          </p>
        </div>

        <div className="flex gap-2 justify-center">
          <a 
            href="/bookshelf" 
            className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
          >
            View Bookshelf
          </a>
          <a 
            href="/leaderboard" 
            className="bg-white text-purple-600 border border-purple-600 px-3 py-1 rounded text-sm hover:bg-purple-50"
          >
            See Leaderboard
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  const isInFarcaster = !!(window as any).__evermark_farcaster_detected;
  
  console.log('🚀 App Starting:', {
    isInFarcaster,
    url: window.location.href,
    timestamp: new Date().toISOString()
  });
  
  return (
    <ErrorBoundary>
      <FarcasterProvider>
        <AppThirdwebProvider>
          <DebugInfo />
          <AppContent />
        </AppThirdwebProvider>
      </FarcasterProvider>
    </ErrorBoundary>
  );
}

export default App;