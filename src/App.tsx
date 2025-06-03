// Updated App.tsx for Mainnet - Enhanced Farcaster Wallet Integration
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppThirdwebProvider } from './lib/thirdweb';
import { FarcasterProvider, useFarcasterUser } from './lib/farcaster';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { WalletProvider } from './providers/WalletProvider';

// Core pages only
import EnhancedHomePage from './pages/EnhancedHomePage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import MyEvermarksPage from './pages/MyEvermarksPage';
import { EnhancedCreateEvermark } from './components/evermark/EnhancedCreateEvermark';
import { EvermarkDetail } from './components/evermark/EvermarkDetail';
import { ShareRedirect } from './components/sharing/ShareButton';
import AboutPage from './pages/AboutPage';
import UserCreatedEvermarksPage from './pages/UserCreatedEvermarksPage';
import PublicProfilePage from './pages/PublicProfilePage';

function DebugInfo() {
  const { isInFarcaster, isReady, isAuthenticated, hasVerifiedAddress, getPrimaryAddress } = useFarcasterUser();
  
  useEffect(() => {
    console.log('🔍 MAINNET APP DEBUG INFO:');
    console.log('- Window location:', window.location.href);
    console.log('- User Agent:', navigator.userAgent.substring(0, 100));
    console.log('- In Farcaster?', isInFarcaster);
    console.log('- Farcaster ready?', isReady);
    console.log('- Farcaster authenticated?', isAuthenticated);
    console.log('- Has verified address?', hasVerifiedAddress());
    console.log('- Primary address:', getPrimaryAddress());
    console.log('- Environment: MAINNET 🚀');
    
    // Enhanced Farcaster detection
    console.log('🔍 ENHANCED FARCASTER DETECTION:');
    console.log('- Window parent check:', window.parent !== window);
    console.log('- Iframe check:', window.self !== window.top);
    console.log('- Farcaster detected flag:', (window as any).__farcaster_detected);
    console.log('- URL contains frame:', window.location.href.includes('frame'));
    
    // Wallet routing decision preview
    const shouldUseFarcaster = isInFarcaster && isReady;
    console.log('🎯 WALLET ROUTING PREVIEW:');
    console.log('- Should use Farcaster provider?', shouldUseFarcaster);
    console.log('- Reasoning: isInFarcaster =', isInFarcaster, '&& isReady =', isReady);
    
  }, [isInFarcaster, isReady, isAuthenticated, hasVerifiedAddress, getPrimaryAddress]);
  
  return null;
}

function AppContent() {
  const { isReady, isInFarcaster, isAuthenticated, hasVerifiedAddress } = useFarcasterUser();
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Evermark...</p>
          {isInFarcaster && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-blue-600">📱 Detected Farcaster environment</p>
              <p className="text-xs text-gray-500">Initializing frame SDK...</p>
              {isAuthenticated && (
                <p className="text-xs text-green-600">✅ User authenticated</p>
              )}
              {hasVerifiedAddress() && (
                <p className="text-xs text-green-600">✅ Verified address found</p>
              )}
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
          {/* Core Routes */}
          <Route path="/" element={<EnhancedHomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/my-evermarks" element={<MyEvermarksPage />} />
          <Route path="/create" element={<EnhancedCreateEvermark />} />
          <Route path="/evermark/:id" element={<EvermarkDetail />} />
          <Route path="/about" element={<AboutPage />} />
          
          {/* Public Profile Routes */}
          <Route path="/:address" element={<PublicProfilePage />} />
          <Route path="/:address/created" element={<UserCreatedEvermarksPage />} />
          
          {/* Share functionality */}
          <Route path="/share/:id" element={<ShareRedirect />} />
          
          {/* Temporary placeholder routes */}
          <Route path="/Market" element={<ComingSoonPage feature="Marketplace" />} />
          <Route path="/bookshelf" element={<ComingSoonPage feature="Bookshelf" />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}

// Enhanced coming soon page with environment info
function ComingSoonPage({ feature }: { feature: string }) {
  const { isInFarcaster, isAuthenticated, hasVerifiedAddress } = useFarcasterUser();
  
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

        {/* Environment status for debugging */}
        {isInFarcaster && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-medium text-blue-900 mb-2">📱 Farcaster Environment</h3>
            <div className="text-sm text-blue-800 space-y-1">
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
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-blue-600">Ready for Evermarks</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <FarcasterProvider>
        <AppThirdwebProvider>
          <WalletProvider>
            <DebugInfo />
            <AppContent />
          </WalletProvider>
        </AppThirdwebProvider>
      </FarcasterProvider>
    </ErrorBoundary>
  );
}

export default App;
