// Fixed App.tsx - More conservative Farcaster detection
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

// Farcaster context types
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
    const initializeFarcasterContext = async () => {
      try {
        // FIXED: More conservative Farcaster detection
        const isInFarcaster = !!(window as any).__farcaster_detected ||
                             !!(window as any).farcaster ||
                             window.location.search.includes('inFeed=true') ||
                             window.location.search.includes('action_type=share');

        // Initialize SDK if in Farcaster
        if (isInFarcaster && sdk) {
          const sdkContext = await sdk.context;
          
          if (sdkContext.location) {
            const location = sdkContext.location;
            const isMiniApp = true;
            
            const isShareContext = location.type === 'cast_embed' || 
                                 location.type === 'notification' ||
                                 !!(location as any).cast;
            
            setContext({
              isInFarcaster: true,
              isMiniApp,
              isShareContext,
              sharedCast: isShareContext ? (location as any).cast : undefined,
              location: {
                type: location.type as any,
                cast: (location as any).cast
              }
            });

            console.log('🎯 FARCASTER CONTEXT INITIALIZED:', {
              isInFarcaster: true,
              isMiniApp,
              isShareContext,
              locationType: location.type,
              locationData: location,
              hasSharedCast: !!(location as any).cast
            });
          } else {
            setContext({
              isInFarcaster: true,
              isMiniApp: true,
              isShareContext: false,
              location: { type: 'default' }
            });

            console.log('🎯 FARCASTER CONTEXT (NO LOCATION):', sdkContext);
          }
        } else {
          setContext({
            isInFarcaster: false,
            isMiniApp: false,
            isShareContext: false,
            location: { type: 'default' }
          });

          console.log('🌐 EXTERNAL BROWSER CONTEXT');
        }
      } catch (error) {
        console.error('❌ Failed to initialize Farcaster context:', error);
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
    console.log('🔍 MAINNET APP DEBUG INFO:');
    console.log('- Window location:', window.location.href);
    console.log('- User Agent:', navigator.userAgent.substring(0, 100));
    console.log('- Environment: MAINNET 🚀');
    
    console.log('🎯 FARCASTER INTEGRATION STATUS:');
    console.log('- In Farcaster?', isInFarcaster);
    console.log('- Farcaster ready?', isReady);
    console.log('- Farcaster authenticated?', isAuthenticated);
    console.log('- Has verified address?', hasVerifiedAddress());
    console.log('- Primary address:', getPrimaryAddress());
    
    console.log('📱 MINI APP CONTEXT:');
    console.log('- Is Mini App?', farcasterContext.isMiniApp);
    console.log('- Is Share Context?', farcasterContext.isShareContext);
    console.log('- Location Type:', farcasterContext.location.type);
    console.log('- Has Shared Cast?', !!farcasterContext.sharedCast);
    
    if (farcasterContext.sharedCast) {
      console.log('📤 SHARED CAST DATA:');
      console.log('- Cast Hash:', farcasterContext.sharedCast.hash);
      console.log('- Author:', farcasterContext.sharedCast.author);
      console.log('- Channel:', farcasterContext.sharedCast.channelKey);
    }
    
  }, [isInFarcaster, isReady, isAuthenticated, hasVerifiedAddress, getPrimaryAddress, farcasterContext]);
  
  return null;
}

function AppContent() {
  const { isReady, isInFarcaster, isAuthenticated, hasVerifiedAddress } = useFarcasterUser();
  const farcasterContext = useFarcasterContext();
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Evermark...</p>
          
          {isInFarcaster && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-blue-600">📱 Detected Farcaster Mini App</p>
              <p className="text-xs text-gray-500">Initializing SDK...</p>
              {isAuthenticated && (
                <p className="text-xs text-green-600">✅ User authenticated</p>
              )}
              {hasVerifiedAddress() && (
                <p className="text-xs text-green-600">✅ Verified address found</p>
              )}
            </div>
          )}
          
          {farcasterContext.isShareContext && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">📤 Processing shared cast...</p>
            </div>
          )}
          
          <p className="text-xs text-green-600 mt-2">🚀 Mainnet Version</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          {/* SPECIFIC ROUTES FIRST - These must come before any dynamic routes */}
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
          
          {/* Specific nested routes that start with fixed paths */}
          <Route path="/bookshelf/:address" element={<PublicBookshelfView />} />
          
          {/* DYNAMIC ROUTES LAST - These catch remaining patterns */}
          {/* These MUST come after all specific routes */}
          <Route path="/:address" element={<PublicProfilePage />} />
          <Route path="/:address/created" element={<UserCreatedEvermarksPage />} />
          <Route path="/:address/bookshelf" element={<PublicBookshelfView />} />
          
          {/* Catch-all for unmatched routes - MUST be last */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

function ComingSoonPage({ feature }: { feature: string }) {
  const { isAuthenticated, hasVerifiedAddress } = useFarcasterUser();
  const farcasterContext = useFarcasterContext();
  
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

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-purple-900 mb-2">📚 Available Now: Personal Bookshelf</h3>
          <p className="text-purple-800 text-sm mb-3">
            Organize your favorite Evermarks and manage your voting power delegation in one place!
          </p>
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

        {/* Farcaster Mini App status */}
        {farcasterContext.isMiniApp && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left mb-4">
            <h3 className="font-medium text-purple-900 mb-2">📱 Farcaster Mini App</h3>
            <div className="text-sm text-purple-800 space-y-1">
              <div className="flex justify-between">
                <span>Context:</span>
                <span className="capitalize">{farcasterContext.location.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Authenticated:</span>
                <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
                  {isAuthenticated ? "✅ Yes" : "❌ No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Has Wallet:</span>
                <span className={hasVerifiedAddress() ? "text-green-600" : "text-orange-600"}>
                  {hasVerifiedAddress() ? "✅ Linked" : "⚠️ Not linked"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Share context info */}
        {farcasterContext.isShareContext && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-medium text-blue-900 mb-2">📤 Shared Cast Context</h3>
            <div className="text-sm text-blue-800">
              <p>A cast was shared to create an Evermark!</p>
              <button 
                onClick={() => window.location.href = '/share/create'}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Create Evermark from Cast
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal Farcaster app - NO BrowserRouter (already in main.tsx)
function FarcasterMinimalApp() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/evermark/:id" element={<EvermarkDetailPage />} />
        <Route path="/" element={<MinimalHomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Minimal homepage for Farcaster - no wallet dependencies
function MinimalHomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Evermark</h1>
        <p className="text-gray-600 mb-8">
          Permanently preserve important content on the blockchain
        </p>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-500">
            Visit <a href="https://evermarks.net" className="text-purple-600 hover:underline">evermarks.net</a> to create and explore Evermarks
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  // FIXED: Much more conservative Farcaster detection
  // Only detect as Farcaster if we have strong indicators
  const isInFarcaster = (() => {
    // Check for explicit Farcaster globals (most reliable)
    const farcasterGlobals = !!(window as any).__farcaster_detected ||
                            !!(window as any).farcaster;
    
    // Check for explicit Farcaster URL parameters
    const farcasterParams = window.location.search.includes('inFeed=true') ||
                           window.location.search.includes('action_type=share') ||
                           window.location.search.includes('farcaster=true');
    
    // Check for Farcaster-specific user agents (be more specific)
    const farcasterUserAgent = navigator.userAgent.includes('farcaster-') ||
                              navigator.userAgent.includes('warpcast-app');
    
    // Only return true if we have strong evidence
    return farcasterGlobals || farcasterParams || farcasterUserAgent;
  })();
  
  console.log('🔍 App Detection (Conservative):', {
    isInFarcaster,
    farcasterGlobals: !!(window as any).__farcaster_detected || !!(window as any).farcaster,
    farcasterParams: window.location.search.includes('inFeed=true') || 
                    window.location.search.includes('action_type=share') ||
                    window.location.search.includes('farcaster=true'),
    farcasterUserAgent: navigator.userAgent.includes('farcaster-') || 
                       navigator.userAgent.includes('warpcast-app'),
    userAgent: navigator.userAgent.substring(0, 100),
    url: window.location.href,
    search: window.location.search,
  });
  
  // TEMPORARILY DISABLE FARCASTER MINIMAL MODE FOR DEBUGGING
  // Force full app for all contexts to debug the infinite redirect
  console.log('🚨 DEBUGGING MODE: Loading full app for all contexts');
  
  // Full mode for regular web
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