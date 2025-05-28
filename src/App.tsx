// Updated App.tsx with share route
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppThirdwebProvider } from './lib/thirdweb';
import { FarcasterProvider, useFarcasterUser } from './lib/farcaster';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Import enhanced pages
import EnhancedHomePage from './pages/EnhancedHomePage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import EnhancedAuctionPage from './pages/EnhancedAuctionPage';
import MyEvermarksPage from './pages/MyEvermarksPage';
import { EnhancedCreateEvermark } from './components/evermark/EnhancedCreateEvermark';
import { EvermarkDetail } from './components/evermark/EvermarkDetail';
import BookshelfPage from './pages/BookshelfPage';
import { ShareRedirect } from './components/sharing/ShareButton';

function DebugInfo() {
  const { isInFarcaster, isReady } = useFarcasterUser();
  
  useEffect(() => {
    console.log('🔍 App Debug Info:');
    console.log('- Window location:', window.location.href);
    console.log('- In Farcaster?', isInFarcaster);
    console.log('- Farcaster ready?', isReady);
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
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<EnhancedHomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/auctions" element={<EnhancedAuctionPage />} />
          <Route path="/my-evermarks" element={<MyEvermarksPage />} />
          <Route path="/create" element={<EnhancedCreateEvermark />} />
          <Route path="/evermark/:id" element={<EvermarkDetail />} />
          <Route path="/bookshelf" element={<BookshelfPage />} />
          
          {/* NEW: Share redirect route */}
          <Route path="/share/:id" element={<ShareRedirect />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
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