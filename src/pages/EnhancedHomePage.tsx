// src/pages/EnhancedHomePage.tsx - Updated with improved image handling
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusIcon, 
  TrendingUpIcon, 
  ChevronRightIcon,
  GridIcon,
  ZapIcon,
  RocketIcon,
  StarIcon,
  UserIcon,
  ClockIcon,
  ImageIcon,
  EyeIcon
} from 'lucide-react';
import { useTrendingEvermarks, useRecentEvermarks } from '../hooks/useEvermarkFeed';
import { useWalletAuth } from '../providers/WalletProvider';
import { HeroEvermarkCard, ExploreEvermarkCard } from '../components/evermark/EvermarkCard';
import { EnhancedEvermarkModal } from '../components/evermark/EnhancedEvermarkModal';
import { ImageGallery } from '../components/gallery/ImageGallery';
import { useModal, useMultiModal } from '../hooks/useModal';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { EvermarkImage } from '../components/layout/UniversalImage';
import { cn, useIsMobile } from '../utils/responsive';

// Enhanced stats component with image analytics
const CyberStats: React.FC = () => {
  const { evermarks: recentEvermarks, isLoading } = useRecentEvermarks(100);
  const isMobile = useIsMobile();
  
  const stats = React.useMemo(() => {
    if (isLoading || !recentEvermarks.length) {
      return {
        totalEvermarks: 0,
        activeCreators: 0,
        thisWeek: 0,
        withImages: 0,
        networkStatus: 'Loading...'
      };
    }

    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const thisWeekCount = recentEvermarks.filter(e => e.creationTime > weekAgo).length;
    const uniqueCreators = new Set(recentEvermarks.map(e => e.creator).filter(Boolean)).size;
    const withImagesCount = recentEvermarks.filter(e => e.image).length;

    return {
      totalEvermarks: recentEvermarks.length,
      activeCreators: uniqueCreators,
      thisWeek: thisWeekCount,
      withImages: withImagesCount,
      networkStatus: 'Live on Base'
    };
  }, [recentEvermarks, isLoading]);

  const statCards = [
    {
      label: 'Total Evermarks',
      value: isLoading ? '...' : stats.totalEvermarks.toLocaleString(),
      icon: <StarIcon className="h-6 w-6" />,
      gradient: 'from-purple-400 to-purple-600',
      glow: 'shadow-purple-500/20'
    },
    {
      label: 'With Images',
      value: isLoading ? '...' : stats.withImages.toLocaleString(),
      icon: <ImageIcon className="h-6 w-6" />,
      gradient: 'from-green-400 to-green-600',
      glow: 'shadow-green-500/20'
    },
    {
      label: 'Active Creators',
      value: isLoading ? '...' : stats.activeCreators.toLocaleString(),
      icon: <UserIcon className="h-6 w-6" />,
      gradient: 'from-cyan-400 to-cyan-600',
      glow: 'shadow-cyan-500/20'
    },
    {
      label: 'This Week',
      value: isLoading ? '...' : stats.thisWeek.toLocaleString(),
      icon: <ClockIcon className="h-6 w-6" />,
      gradient: 'from-yellow-400 to-yellow-600',
      glow: 'shadow-yellow-500/20'
    }
  ];

  return (
    <div className={cn(
      "grid gap-6",
      isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4"
    )}>
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={cn(
            "bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center transition-all duration-300 hover:border-gray-600",
            stat.glow
          )}
        >
          <div className={cn(
            "w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center bg-gradient-to-r text-black",
            stat.gradient
          )}>
            {stat.icon}
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {stat.value}
          </div>
          <div className="text-gray-400 text-sm">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

// Featured Image Showcase Component
const FeaturedImageShowcase: React.FC<{ evermarks: any[] }> = ({ evermarks }) => {
  const { openImageModal, closeImageModal, state } = useMultiModal();
  const isMobile = useIsMobile();

  // Filter evermarks with images
  const evermarksWithImages = evermarks.filter(e => e.image).slice(0, 6);

  if (evermarksWithImages.length === 0) return null;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent mb-4">
          🖼️ FEATURED CONTENT
        </h2>
        <p className="text-gray-400">Evermarks with stunning visuals</p>
      </div>

      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
      )}>
        {evermarksWithImages.map((evermark, index) => {
          const { getOptimalImageUrl } = useImageProcessing(evermark);
          
          return (
            <div
              key={evermark.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-800 border border-gray-700 hover:border-cyan-400/50 transition-all duration-300"
              onClick={() => openImageModal(getOptimalImageUrl('large') || evermark.image, evermark.title)}
            >
              <EvermarkImage
                src={getOptimalImageUrl('medium')}
                alt={evermark.title}
                aspectRatio="square"
                rounded="lg"
                className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                evermarkTitle={evermark.title}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                  {evermark.title}
                </h4>
                <p className="text-xs text-gray-300 line-clamp-1">
                  by {evermark.author}
                </p>
              </div>

              {/* View indicator */}
              <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <EyeIcon className="h-3 w-3 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Modal */}
      <ImageGallery
        images={evermarksWithImages.map(e => ({
          src: e.image,
          alt: e.title,
          title: e.title,
          description: `by ${e.author}`,
          evermarkId: e.id
        }))}
        isOpen={state.imageModal.isOpen}
        onClose={closeImageModal}
        showControls={true}
        allowDownload={true}
      />
    </div>
  );
};

export default function EnhancedHomePage() {
  const { isConnected, address, requireConnection } = useWalletAuth();
  const { evermarks: trendingEvermarks, isLoading: isLoadingTrending } = useTrendingEvermarks(8);
  const { evermarks: recentEvermarks, isLoading: isLoadingRecent } = useRecentEvermarks(8);
  const isMobile = useIsMobile();

  // Use the unified modal hook
  const { modalState, openModal, closeModal } = useModal();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cyber Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-purple-500 rounded-3xl blur-xl opacity-40 scale-110 animate-pulse" />
              <img 
                src="/EvermarkLogo.png" 
                alt="Evermark Protocol" 
                className="relative h-32 md:h-40 lg:h-48 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
          
          {/* Title */}
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent leading-tight">
              EVERMARK PROTOCOL
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
              Discover amazing content online and earn rewards by sharing Evermarks through{' '}
              <span className="text-green-400 font-bold">community curation</span>
            </p>
            
            {/* Feature badges */}
            <div className="flex flex-wrap gap-3 justify-center">
              <span className="px-4 py-2 bg-green-400/20 text-green-400 rounded-full font-medium border border-green-400/30">
                🔗 Permanent Links
              </span>
              <span className="px-4 py-2 bg-purple-400/20 text-purple-400 rounded-full font-medium border border-purple-400/30">
                💰 $WEMARK Rewards
              </span>
              <span className="px-4 py-2 bg-cyan-400/20 text-cyan-400 rounded-full font-medium border border-cyan-400/30">
                🗳️ Community Voting
              </span>
              <span className="px-4 py-2 bg-yellow-400/20 text-yellow-400 rounded-full font-medium border border-yellow-400/30">
                🖼️ Rich Media
              </span>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="mt-12">
            {isConnected ? (
              <div className={cn(
                "flex gap-4 justify-center items-center",
                isMobile ? "flex-col" : "flex-row"
              )}>
                <Link
                  to="/create"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold rounded-lg hover:from-green-300 hover:to-green-500 transition-all shadow-lg shadow-green-500/30 group"
                >
                  <PlusIcon className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                  Create Evermark
                </Link>
                <Link
                  to="/explore"
                  className="inline-flex items-center px-8 py-4 bg-gray-800 text-white border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-500 transition-colors"
                >
                  <GridIcon className="w-5 h-5 mr-2" />
                  Explore All
                </Link>
                <Link
                  to="/my-evermarks"
                  className="inline-flex items-center px-8 py-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <StarIcon className="w-5 h-5 mr-2" />
                  My Collection
                </Link>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-lg p-8 backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">
                    🚀 Get Started
                  </h3>
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                    Connect your wallet to begin creating permanent references 
                    and earning rewards on Base blockchain.
                  </p>
                  <button
                    onClick={requireConnection}
                    className="w-full px-8 py-4 bg-gradient-to-r from-blue-400 to-blue-600 text-black font-bold rounded-lg hover:from-blue-300 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/30"
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
      <div className="container mx-auto px-4 py-16">
        <CyberStats />
      </div>

      {/* Featured Image Showcase */}
      <FeaturedImageShowcase evermarks={[...trendingEvermarks, ...recentEvermarks]} />

      {/* Featured Hero Evermark */}
      {trendingEvermarks.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4">
              🔥 FEATURED EVERMARK
            </h2>
            <p className="text-gray-400">The most supported content this week</p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <HeroEvermarkCard
              evermark={trendingEvermarks[0]}
              onOpenModal={openModal}
            />
          </div>
        </div>
      )}

      {/* Trending Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <TrendingUpIcon className="h-8 w-8 text-orange-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Trending Evermarks</h2>
              <p className="text-gray-400">Most voted and engaging content</p>
            </div>
          </div>
          
          {trendingEvermarks.length >= 6 && (
            <Link 
              to="/explore?sort=mostVoted"
              className="inline-flex items-center text-orange-400 hover:text-orange-300 font-medium group"
            >
              View All
              <ChevronRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
        
        {isLoadingTrending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        ) : trendingEvermarks.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-medium text-white mb-2">No Trending Content Yet</h3>
            <p className="text-gray-400 mb-6">Be the first to create and vote for Evermarks!</p>
            <Link
              to="/create"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-600 text-black font-bold rounded-lg hover:from-orange-300 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/30"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create First Evermark
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingEvermarks.slice(1, 7).map(evermark => (
              <ExploreEvermarkCard 
                key={evermark.id} 
                evermark={evermark}
                onOpenModal={openModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <ClockIcon className="h-8 w-8 text-cyan-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Latest Evermarks</h2>
              <p className="text-gray-400">Recently created content references</p>
            </div>
          </div>
          
          {recentEvermarks.length >= 6 && (
            <Link 
              to="/explore"
              className="inline-flex items-center text-cyan-400 hover:text-cyan-300 font-medium group"
            >
              View All
              <ChevronRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
        
        {isLoadingRecent ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        ) : recentEvermarks.length === 0 ? (
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h3 className="text-lg font-medium text-white mb-2">No Recent Content</h3>
            <p className="text-gray-400 mb-6">Be the first to create an Evermark!</p>
            <Link
              to="/create"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 text-black font-bold rounded-lg hover:from-cyan-300 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/30"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Evermark
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentEvermarks.slice(0, 6).map(evermark => (
              <ExploreEvermarkCard 
                key={evermark.id} 
                evermark={evermark}
                onOpenModal={openModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Image Quality Statistics */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent mb-4">
            📊 Content Analytics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {Math.round((recentEvermarks.filter(e => e.image).length / Math.max(recentEvermarks.length, 1)) * 100)}%
              </div>
              <div className="text-sm text-gray-400">With Images</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400">
                {recentEvermarks.filter(e => e.imageStatus === 'processed').length}
              </div>
              <div className="text-sm text-gray-400">Processed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {recentEvermarks.filter(e => e.contentType === 'Cast').length}
              </div>
              <div className="text-sm text-gray-400">Farcaster</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {recentEvermarks.filter(e => e.verified).length}
              </div>
              <div className="text-sm text-gray-400">Verified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 md:p-12 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-purple-500 bg-clip-text text-transparent mb-6">
              Ready to Share Something Amazing?
            </h2>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Transform any online content into a permanent, shareable Evermark. 
              Join our community of curators and earn <span className="text-green-400 font-bold">$WEMARK</span> rewards.
            </p>
            
            <div className={cn(
              "flex gap-4 justify-center",
              isMobile ? "flex-col" : "flex-row"
            )}>
              <Link
                to="/create"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold rounded-lg hover:from-green-300 hover:to-green-500 transition-all shadow-lg shadow-green-500/30"
              >
                <ZapIcon className="w-5 h-5 mr-2" />
                Create Your First Evermark
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center px-8 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <GridIcon className="w-5 h-5 mr-2" />
                Explore All Evermarks
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Evermark Modal */}
      {modalState.isOpen && (
        <EnhancedEvermarkModal
          evermarkId={modalState.evermarkId}
          isOpen={modalState.isOpen}
          onClose={closeModal}
          autoExpandDelegation={modalState.options.autoExpandDelegation}
          initialExpandedSection={modalState.options.initialExpandedSection}
        />
      )}
    </div>
  );
}