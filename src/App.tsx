import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppThirdwebProvider } from './lib/ThirdwebProvider';
import { FarcasterProvider, useFarcaster } from './lib/farcaster';
import Layout from './components/layout/Layout';

// Import enhanced pages
import EnhancedHomePage from './pages/EnhancedHomePage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import EnhancedAuctionPage from './pages/EnhancedAuctionPage';
import MyEvermarksPage from './pages/MyEvermarksPage';
import { EnhancedCreateEvermark } from './components/evermark/EnhancedCreateEvermark';
import { EvermarkDetail } from './components/evermark/EvermarkDetail';
import BookshelfPage from './pages/BookshelfPage';

// Debug component to show what's happening
function DebugInfo() {
  const { isInFarcaster, isReady } = useFarcaster();
  
  useEffect(() => {
    console.log('🔍 App Debug Info:');
    console.log('- Window location:', window.location.href);
    console.log('- User agent:', navigator.userAgent);
    console.log('- In iframe?', window.parent !== window);
    console.log('- In Farcaster?', isInFarcaster);
    console.log('- Farcaster ready?', isReady);
    console.log('- Screen size:', window.screen.width, 'x', window.screen.height);
    console.log('- Viewport size:', window.innerWidth, 'x', window.innerHeight);
    
    // Add error handler
    window.addEventListener('error', (error) => {
      console.error('🚨 Global error:', error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled promise rejection:', event);
    });
    
  }, [isInFarcaster, isReady]);
  
  return null;
}

function AppContent() {
  const { isReady } = useFarcaster();
  
  // Show loading until Farcaster is ready
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Evermark...</p>
        </div>
      </div>
    );
  }

  return (
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
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <FarcasterProvider>
      <AppThirdwebProvider>
        <DebugInfo />
        <AppContent />
      </AppThirdwebProvider>
    </FarcasterProvider>
  );
}

export default App;