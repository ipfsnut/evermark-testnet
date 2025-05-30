// Updated App.tsx for Mainnet - Core Features Only
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppThirdwebProvider } from './lib/thirdweb';
import { FarcasterProvider, useFarcasterUser } from './lib/farcaster';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Core pages only
import EnhancedHomePage from './pages/EnhancedHomePage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
// COMMENTED OUT: Marketplace and Bookshelf for initial mainnet launch
// import { MarketplacePage } from './pages/MarketplacePage';
// import BookshelfPage from './pages/BookshelfPage';
import MyEvermarksPage from './pages/MyEvermarksPage';
import { EnhancedCreateEvermark } from './components/evermark/EnhancedCreateEvermark';
import { EvermarkDetail } from './components/evermark/EvermarkDetail';
import { ShareRedirect } from './components/sharing/ShareButton';

function DebugInfo() {
  const { isInFarcaster, isReady } = useFarcasterUser();
  
  useEffect(() => {
    console.log('🔍 Mainnet App Debug Info:');
    console.log('- Window location:', window.location.href);
    console.log('- In Farcaster?', isInFarcaster);
    console.log('- Farcaster ready?', isReady);
    console.log('- Environment: MAINNET 🚀');
  }, [isInFarcaster, isReady]);
  
  return null;
}

function AppContent() {
  const { isReady, isInFarcaster } = useFarcasterUser();
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Evermark...</p>
          {isInFarcaster && (
            <p className="text-sm text-gray-500 mt-2">Connecting to Farcaster...</p>
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
          {/* Core Routes */}
          <Route path="/" element={<EnhancedHomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/my-evermarks" element={<MyEvermarksPage />} />
          <Route path="/create" element={<EnhancedCreateEvermark />} />
          <Route path="/evermark/:id" element={<EvermarkDetail />} />
          
          {/* Share functionality */}
          <Route path="/share/:id" element={<ShareRedirect />} />
          
          {/* COMMENTED OUT: Advanced features for later phases */}
          {/* <Route path="/Market" element={<MarketplacePage />} /> */}
          {/* <Route path="/bookshelf" element={<BookshelfPage />} /> */}
          
          {/* Temporary placeholder routes */}
          <Route path="/Market" element={<ComingSoonPage feature="Marketplace" />} />
          <Route path="/bookshelf" element={<ComingSoonPage feature="Bookshelf" />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

// Temporary component for features coming later
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            🚀 <strong>Mainnet is Live!</strong> Create and collect Evermarks with real $EMARK tokens.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
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