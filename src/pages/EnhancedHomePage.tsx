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
  TrophyIcon
} from 'lucide-react';
import { useEvermarks } from '../hooks/useEvermarks';
import { useWalletAuth } from '../providers/WalletProvider';
import { formatDistanceToNow } from 'date-fns';
import PageContainer from '../components/layout/PageContainer';

// Enhanced Evermark card for homepage
const HomeEvermarkCard: React.FC<{ evermark: any }> = ({ evermark }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <Link 
      to={`/evermark/${evermark.id}`}
      className="group block bg-white rounded-2xl border border-gray-200 
                 hover:border-purple-300 hover:shadow-large
                 transition-all duration-300 overflow-hidden
                 transform hover:-translate-y-1"
    >
      {/* Image section with enhanced styling */}
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {evermark.image && !imageError ? (
          <div className="relative w-full h-full">
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
            )}
            <img
              src={evermark.image}
              alt={evermark.title}
              className="w-full h-full object-cover group-hover:scale-105 
                         transition-transform duration-300"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 
                          flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-purple-400" />
          </div>
        )}
        
        {/* Play button overlay for interactive feel */}
        <div className="absolute inset-0 flex items-center justify-center 
                        opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full 
                          flex items-center justify-center shadow-soft">
            <PlayIcon className="h-5 w-5 text-purple-600 ml-0.5" />
          </div>
        </div>
        
        {/* Type indicator */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full 
                           text-xs font-medium text-purple-600 border border-purple-200">
            <Sparkles className="h-3 w-3 inline mr-1" />
            Evermark
          </span>
        </div>
      </div>
      
      {/* Enhanced content section */}
      <div className="p-6">
        <h3 className="font-semibold text-gray-900 text-lg mb-3 line-clamp-2 
                       group-hover:text-purple-600 transition-colors">
          {evermark.title}
        </h3>
        
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-2">
            <UserIcon className="h-4 w-4" />
            <span className="font-medium">{evermark.author}</span>
          </div>
          <span className="mx-2 text-gray-400">•</span>
          <span>{formatDistanceToNow(new Date(evermark.creationTime), { addSuffix: true })}</span>
        </div>
        
        {evermark.creator && (
          <div className="flex items-center text-xs text-gray-500 mb-4">
            <span>Created by </span>
            <Link 
              to={`/${evermark.creator}`}
              className="ml-1 font-mono text-purple-600 hover:text-purple-800 
                         transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {evermark.creator.slice(0, 6)}...{evermark.creator.slice(-4)}
            </Link>
          </div>
        )}
        
        {evermark.description && (
          <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">
            {evermark.description}
          </p>
        )}
        
        {/* Enhanced footer with actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            {evermark.metadataURI && evermark.metadataURI.startsWith('ipfs://') && (
              <a 
                href={evermark.metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 
                           rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="View metadata"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
            )}
          </div>
          
          <div className="flex items-center text-purple-600 font-medium text-sm">
            <span>View Details</span>
            <ChevronRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};

// Enhanced stats card component
const StatsCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  description: string;
  color: string;
}> = ({ icon, title, value, description, color }) => (
  <div className={`card-interactive p-6 ${color} border-l-4`}>
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-white rounded-xl shadow-soft">
        {icon}
      </div>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

const EnhancedHomePage: React.FC = () => {
  const { isConnected, address, requireConnection } = useWalletAuth();
  const { evermarks, isLoading } = useEvermarks();

  console.log("🔍 HomePage wallet detection (SIMPLIFIED):", {
    isConnected,
    address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
    evermarksCount: evermarks.length
  });

  // Enhanced stats calculation
  const stats = useMemo(() => ({
    totalEvermarks: evermarks.length,
    currentCycle: 1,
    activeCreators: new Set(evermarks.map(e => e.creator).filter(Boolean)).size,
    networkStatus: 'Live on Base'
  }), [evermarks]);

  // Featured and recent evermarks
  const featuredEvermarks = useMemo(() => {
    return evermarks.slice(0, 3);
  }, [evermarks]);

  const recentEvermarks = useMemo(() => {
    return evermarks.slice(0, 6);
  }, [evermarks]);

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
          
          <div className="relative card-content py-16 md:py-24 text-center">
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
                <span className="badge badge-primary">🔗 Permanent Links</span>
                <span className="badge badge-success">💰 Dual-Token Rewards</span>
                <span className="badge badge-warning">🗳️ Community Voting</span>
              </div>
            </div>
            
            {/* Enhanced CTA section */}
            <div className="mt-12">
              {isConnected ? (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link
                    to="/create"
                    className="btn btn-primary group"
                  >
                    <PlusIcon className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                    Create Evermark
                  </Link>
                  <Link
                    to="/my-evermarks"
                    className="btn btn-secondary"
                  >
                    <BookOpenIcon className="w-5 h-5 mr-2" />
                    View Collection
                  </Link>
                </div>
              ) : (
                <div className="max-w-md mx-auto">
                  <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 
                                  border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                      🚀 Get Started
                    </h3>
                    <p className="text-blue-700 text-sm mb-4 leading-relaxed">
                      Connect your wallet to begin creating permanent references 
                      and earning rewards on Base blockchain.
                    </p>
                    <button
                      onClick={requireConnection}
                      className="btn btn-primary w-full"
                    >
                      Connect Wallet
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            icon={<BookOpenIcon className="h-6 w-6 text-purple-600" />}
            title="Total Evermarks"
            value={isLoading ? "..." : stats.totalEvermarks.toLocaleString()}
            description="Permanent content references"
            color="border-l-purple-500"
          />
          
          <StatsCard
            icon={<GoalIcon className="h-6 w-6 text-green-600" />}
            title="Network"
            value="Base Mainnet"
            description="Fast & low-cost transactions"
            color="border-l-green-500"
          />
          
          <StatsCard
            icon={<StarIcon className="h-6 w-6 text-amber-600" />}
            title="Active Creators"
            value={isLoading ? "..." : stats.activeCreators.toLocaleString()}
            description="Contributing to the protocol"
            color="border-l-amber-500"
          />
        </div>

        {/* Featured Evermarks Section */}
        {featuredEvermarks.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                  Featured Evermarks
                </h2>
                <p className="text-gray-600">
                  Discover the most engaging content on the platform
                </p>
              </div>
              
              {evermarks.length > 3 && (
                <Link 
                  to="/leaderboard"
                  className="btn btn-ghost group"
                >
                  <TrophyIcon className="w-4 h-4 mr-2" />
                  View Leaderboard
                  <ChevronRightIcon className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
            
            <div className="grid-responsive">
              {featuredEvermarks.map(evermark => (
                <HomeEvermarkCard key={evermark.id} evermark={evermark} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Evermarks Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                Latest Evermarks
              </h2>
              <p className="text-gray-600">
                Recently created permanent content references
              </p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid-responsive">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card">
                  <div className="loading-skeleton h-48 mb-4" />
                  <div className="card-content space-y-3">
                    <div className="loading-skeleton h-6 w-3/4" />
                    <div className="loading-skeleton h-4 w-1/2" />
                    <div className="loading-skeleton h-4 w-full" />
                    <div className="loading-skeleton h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : evermarks.length === 0 ? (
            <div className="card text-center py-16">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 
                                rounded-2xl flex items-center justify-center mx-auto">
                  <BookOpenIcon className="h-10 w-10 text-purple-600" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Evermarks Yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Be the first to create a permanent digital reference on the network.
                  </p>
                </div>
                
                {isConnected ? (
                  <Link 
                    to="/create"
                    className="btn btn-primary"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create First Evermark
                  </Link>
                ) : (
                  <button
                    onClick={requireConnection}
                    className="btn btn-primary"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Connect & Create First Evermark
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid-responsive">
                {recentEvermarks.map(evermark => (
                  <HomeEvermarkCard key={evermark.id} evermark={evermark} />
                ))}
              </div>
              
              {evermarks.length > 6 && (
                <div className="text-center pt-8">
                  <Link 
                    to="/my-evermarks" 
                    className="btn btn-secondary group"
                  >
                    View All Evermarks
                    <ChevronRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default EnhancedHomePage;