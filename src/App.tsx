// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppThirdwebProvider } from './lib/thirdweb';
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

function App() {
  return (
    <AppThirdwebProvider>
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
  );
}

export default App;