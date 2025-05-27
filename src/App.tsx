import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppThirdwebProvider } from './lib/ThirdwebProvider';
import { FarcasterProvider } from './lib/farcaster';
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
  useEffect(() => {
    console.log('🔍 App Debug Info:');
    console.log('- Window location:', window.location.href);
    console.log('- User agent:', navigator.userAgent);
    console.log('- In iframe?', window.parent !== window);
    console.log('- Screen size:', window.screen.width, 'x', window.screen.height);
    console.log('- Viewport size:', window.innerWidth, 'x', window.innerHeight);
    
    // Check if Farcaster SDK is available
    console.log('- Farcaster SDK available?', typeof window !== 'undefined' && '@farcaster/frame-sdk' in window);
    
    // Add error handler
    window.addEventListener('error', (error) => {
      console.error('🚨 Global error:', error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled promise rejection:', event);
    });
    
  }, []);
  
  return null;
}

function App() {
  return (
    <FarcasterProvider>
      <AppThirdwebProvider>
        <DebugInfo />
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
      </AppThirdwebProvider>
    </FarcasterProvider>
  );
}

export default App;