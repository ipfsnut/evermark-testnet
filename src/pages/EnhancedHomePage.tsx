// src/pages/EnhancedHomePage.tsx - Updated with real feed integration
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  BookOpenIcon, 
  TrendingUpIcon, 
  ExternalLinkIcon, 
  ImageIcon, 
  UserIcon,
  Sparkles,
  ChevronRightIcon,
  PlayIcon,
  StarIcon,
  GoalIcon,
  TrophyIcon,
  GridIcon,
  EyeIcon,
  FilterIcon,
  ClockIcon,
  SortDesc
} from 'lucide-react';
import { useTrendingEvermarks, useRecentEvermarks } from '../hooks/useEvermarkFeed';
import { useWalletAuth } from '../providers/WalletProvider';
import { formatDistanceToNow } from 'date-fns';
import PageContainer from '../components/layout/PageContainer';
import { EvermarkCard } from '../components/evermark/EvermarkCard';

// Quick stats component
const QuickStats: React.FC = () => {
  const { recentEvermarks, isLoading } = useRecentEvermarks(100); // Get more for stats
  
  const stats = useMemo(() => {
    if (isLoading || !recentEvermarks.length) {
      return {
        totalEvermarks: 0,
        activeCreators: 0,
        thisWeek: 0,
        networkStatus: 'Loading...'
      };
    }

    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const thisWeekCount = recentEvermarks.filter(e => e.creationTime > weekAgo).length;
    const uniqueCreators = new Set(recentEvermarks.map(e => e.creator).filter(Boolean)).size;

    return {
      totalEvermarks: recentEvermarks.length,
      activeCreators: uniqueCreators,
      thisWeek: thisWeekCount,
      networkStatus: 'Live on Base'
    };
  }, [recentEvermarks, isLoading]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-purple-100 rounded-xl">
            <BookOpenIcon className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Evermarks</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{isLoading ? "..." : stats.totalEvermarks.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Permanent references</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-green-100 rounded-xl">
            <GoalIcon className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Network</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">Base</p>
          <p className="text-sm text-gray-600">Fast & low-cost</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <StarIcon className="h-6 w-6 text-amber-600" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Active Creators</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{isLoading ? "..." : stats.activeCreators.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Contributing</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <SortDesc className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">This Week</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{isLoading ? "..." : stats.thisWeek.toLocaleString()}</p>
          <p className="text-sm text-gray-600">New Evermarks</p>
        </div>
      </div>
    </div>
  );
};

// Feed section with trending and recent
const FeedSection: React.FC<{ 
  title: string; 
  evermarks: any[]; 
  isLoading: boolean; 
  viewAllLink: string;
  icon: React.ReactNode;
  description: string;
}> = ({ title, evermarks, isLoading, viewAllLink, icon, description }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {icon}
            <div className="ml-3">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-48 mt-2"></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="w-full h-48 bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (evermarks.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        {icon}
        <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">No Evermarks Yet</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <Link
          to="/create"
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create First Evermark
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon}
          <div className="ml-3">
            <h2 className="text-2xl font-serif font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600">{description}</p>
          </div>
        </div>
        
        {evermarks.length >= 6 && (
          <Link 
            to={viewAllLink}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium group"
          >
            View All
            <ChevronRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {evermarks.slice(0, 6).map(evermark => (
          <EvermarkCard 
            key={evermark.id} 
            evermark={evermark}
            showDescription={true}
            showActions={true}
          />
        ))}
      </div>
    </div>
  );
};

const EnhancedHomePage: React.FC = () => {
  const { isConnected, address, requireConnection } = useWalletAuth();
  const { trendingEvermarks, isLoading: isLoadingTrending } = useTrendingEvermarks(6);
  const { recentEvermarks, isLoading: isLoadingRecent } = useRecentEvermarks(6);

  console.log("🔍 HomePage feed integration:", {
    isConnected,
    address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
    trendingCount: trendingEvermarks.length,
    recentCount: recentEvermarks.length,
    isLoadingTrending,
    isLoadingRecent
  });

  return (
    <PageContainer fullWidth>
      <div className="space-y-12">
        {/* Enhanced Hero Section */}
        <div className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50" />
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 
                          bg-gradient-to-br from-purple-200/30 to-indigo-200/30 
                          rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 
                          bg-gradient-to-tr from-pink-200/30 to-purple-200/30 
                          rounded-full blur-3xl" />
          
          <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24 text-center">
            {/* Logo with enhanced styling */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 
                                rounded-3xl blur-lg opacity-20 scale-110" />
                <img 
                  src="/EvermarkLogo.png" 
                  alt="Evermark Protocol" 
                  className="relative h-32 md:h-40 lg:h-48 w-auto 
                             drop-shadow-xl hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
            
            {/* Enhanced typography */}
            <div className="max-w-4xl mx-auto space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold 
                             bg-gradient-to-r from-purple-600 via-purple-800 to-indigo-600 
                             bg-clip-text text-transparent leading-tight">
                Evermark Protocol
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                Discover amazing content online and earn rewards by sharing Evermarks through 
                <span className="text-purple-600 font-semibold"> community curation</span>
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center text-sm">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  🔗 Permanent Links
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                  💰 Dual-Token Rewards
                </span>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                  🗳️ Community Voting
                </span>
              </div>
            </div>
            
            {/* Enhanced CTA section */}
            <div className="mt-12">
              {isConnected ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link
                    to="/create"
                    className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium group"
                  >
                    <PlusIcon className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                    Create Evermark
                  </Link>
                  <Link
                    to="/explore"
                    className="inline-flex items-center px-6 py-3 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
                  >
                    <GridIcon className="w-5 h-5 mr-2" />
                    Explore All
                  </Link>
                  <Link
                    to="/my-evermarks"
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <BookOpenIcon className="w-5 h-5 mr-2" />
                    My Collection
                  </Link>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                      🚀 Get Started
                    </h3>
                    <p className="text-blue-700 text-sm mb-4 leading-relaxed">
                      Connect your wallet to begin creating permanent references 
                      and earning rewards on Base blockchain.
                    </p>
                    <button
                      onClick={requireConnection}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Connect Wallet
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <QuickStats />

        {/* Trending Evermarks Section */}
        <FeedSection
          title="Trending Evermarks"
          evermarks={trendingEvermarks}
          isLoading={isLoadingTrending}
          viewAllLink="/explore?sort=mostVoted"
          icon={<TrendingUpIcon className="h-8 w-8 text-orange-600" />}
          description="Most voted and engaging content this week"
        />

        {/* Recent Evermarks Section */}
        <FeedSection
          title="Latest Evermarks"
          evermarks={recentEvermarks}
          isLoading={isLoadingRecent}
          viewAllLink="/explore"
          icon={<ClockIcon className="h-8 w-8 text-blue-600" />}
          description="Recently created permanent content references"
        />

        {/* Call to Action Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              Ready to Share Something Amazing?
            </h2>
            <p className="text-purple-100 text-lg mb-8 leading-relaxed">
              Transform any online content into a permanent, shareable Evermark. 
              Join our community of curators and earn rewards for quality contributions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/create"
                className="inline-flex items-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Your First Evermark
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center px-6 py-3 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition-colors font-medium"
              >
                <GridIcon className="w-5 h-5 mr-2" />
                Explore All Evermarks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default EnhancedHomePage;