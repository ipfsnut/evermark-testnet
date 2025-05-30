import React, { useState, useMemo } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { 
  BookmarkIcon, 
  PlusIcon, 
  ImageIcon, 
  UserIcon, 
  VoteIcon, 
  ClockIcon, 
  HeartIcon,
  BookOpenIcon,
  StarIcon,
  XIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import { useUserEvermarks, useEvermarks } from '../hooks/useEvermarks';
import { useDelegationHistory } from '../hooks/useDelegationHistory';
import { useBookshelf } from '../hooks/useBookshelf';
import { ProfileStatsWidget } from '../components/profile/ProfileStatsWidget';
import { formatDistanceToNow } from 'date-fns';
import { toEther } from 'thirdweb/utils';

// Enhanced Evermark Card with Bookshelf Controls
const EnhancedEvermarkCard: React.FC<{ 
  evermark: any; 
  showCreator?: boolean; 
  delegationAmount?: string; 
  delegationDate?: Date;
  userAddress: string;
}> = ({ 
  evermark, 
  showCreator = false, 
  delegationAmount, 
  delegationDate,
  userAddress 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showBookshelfMenu, setShowBookshelfMenu] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  
  const { getBookshelfStatus, addToFavorites, addToCurrentReading, removeFromBookshelf, getStats } = useBookshelf(userAddress);
  const bookshelfStatus = getBookshelfStatus(evermark.id);
  const stats = getStats();

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleAddToFavorites = () => {
    const result = addToFavorites(evermark.id);
    if (result.success) {
      setActionFeedback('Added to Favorites! ❤️');
      setTimeout(() => setActionFeedback(null), 2000);
    } else {
      setActionFeedback(result.error || 'Failed to add');
      setTimeout(() => setActionFeedback(null), 3000);
    }
    setShowBookshelfMenu(false);
  };

  const handleAddToCurrentReading = () => {
    const result = addToCurrentReading(evermark.id);
    if (result.success) {
      setActionFeedback('Added to Current Reading! 📖');
      setTimeout(() => setActionFeedback(null), 2000);
    } else {
      setActionFeedback(result.error || 'Failed to add');
      setTimeout(() => setActionFeedback(null), 3000);
    }
    setShowBookshelfMenu(false);
  };

  const handleRemoveFromBookshelf = () => {
    removeFromBookshelf(evermark.id);
    setActionFeedback('Removed from Bookshelf');
    setTimeout(() => setActionFeedback(null), 2000);
    setShowBookshelfMenu(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group relative">
      {/* Bookshelf Status Indicators */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        {bookshelfStatus.isFavorite && (
          <div className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs flex items-center gap-1">
            <HeartIcon className="h-3 w-3" />
            <span>Favorite</span>
          </div>
        )}
        {bookshelfStatus.isCurrentReading && (
          <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs flex items-center gap-1">
            <BookOpenIcon className="h-3 w-3" />
            <span>Reading</span>
          </div>
        )}
      </div>

      {/* Bookshelf Quick Actions */}
      <div className="absolute top-2 left-2 z-20">
        <div className="relative">
          <button
            onClick={() => setShowBookshelfMenu(!showBookshelfMenu)}
            className={`p-2 rounded-full shadow-sm transition-all ${
              bookshelfStatus.isFavorite || bookshelfStatus.isCurrentReading
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'
            } opacity-0 group-hover:opacity-100`}
          >
            <StarIcon className="h-4 w-4" />
          </button>

          {/* Bookshelf Menu */}
          {showBookshelfMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowBookshelfMenu(false)} 
              />
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
                <div className="p-2">
                  {bookshelfStatus.isFavorite || bookshelfStatus.isCurrentReading ? (
                    <button
                      onClick={handleRemoveFromBookshelf}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                    >
                      <XIcon className="h-4 w-4" />
                      Remove from Bookshelf
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleAddToFavorites}
                        disabled={!stats.canAddFavorite}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <HeartIcon className="h-4 w-4 text-red-500" />
                        <span>Add to Favorites</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          ({stats.totalFavorites}/{stats.maxFavorites})
                        </span>
                      </button>
                      
                      <button
                        onClick={handleAddToCurrentReading}
                        disabled={!stats.canAddCurrentReading}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <BookOpenIcon className="h-4 w-4 text-blue-500" />
                        <span>Add to Current Reading</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          ({stats.totalCurrentReading}/{stats.maxCurrentReading})
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Feedback */}
      {actionFeedback && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-black text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
          {actionFeedback}
        </div>
      )}

      <Link to={`/evermark/${evermark.id}`} className="block">
        {/* Image section */}
        <div className="w-full h-32 bg-gray-100 overflow-hidden">
          {evermark.image && !imageError ? (
            <div className="relative w-full h-full">
              {imageLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"></div>
              )}
              <img
                src={evermark.image}
                alt={evermark.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Content section */}
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
            {evermark.title}
          </h3>
          
          <div className="text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-2 mt-1">
              <UserIcon className="h-3 w-3" />
              <span>by {evermark.author}</span>
              <span className="text-gray-400">•</span>
              <span>{formatDistanceToNow(new Date(evermark.creationTime), { addSuffix: true })}</span>
            </div>
            {showCreator && evermark.creator && (
              <div className="flex items-center mt-1 text-xs">
                <span className="text-gray-500">Creator: {evermark.creator.slice(0, 6)}...{evermark.creator.slice(-4)}</span>
              </div>
            )}
          </div>
          
          {evermark.description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {evermark.description}
            </p>
          )}
          
          {/* Delegation info for supported evermarks */}
          {delegationAmount && delegationDate && (
            <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
              <div className="flex items-center text-xs text-blue-700">
                <VoteIcon className="h-3 w-3 mr-1" />
                <span>Delegated {delegationAmount} WEMARK</span>
              </div>
              <div className="flex items-center text-xs text-blue-600 mt-1">
                <ClockIcon className="h-3 w-3 mr-1" />
                <span>{formatDistanceToNow(delegationDate, { addSuffix: true })}</span>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {new Date(evermark.creationTime).toLocaleDateString()}
            </span>
            <BookmarkIcon className="h-4 w-4 text-purple-600" />
          </div>
        </div>
      </Link>
    </div>
  );
};

// Bookshelf Quick Stats Widget
const BookshelfQuickStats: React.FC<{ userAddress: string }> = ({ userAddress }) => {
  const { getStats } = useBookshelf(userAddress);
  const stats = getStats();

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <StarIcon className="h-5 w-5 text-purple-600" />
          My Bookshelf
        </h3>
        <Link 
          to="/bookshelf"
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          View All →
        </Link>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <HeartIcon className="h-4 w-4 text-red-500" />
            <span className="text-lg font-bold text-gray-900">
              {stats.totalFavorites}/{stats.maxFavorites}
            </span>
          </div>
          <p className="text-xs text-gray-600">Favorites</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BookOpenIcon className="h-4 w-4 text-blue-500" />
            <span className="text-lg font-bold text-gray-900">
              {stats.totalCurrentReading}/{stats.maxCurrentReading}
            </span>
          </div>
          <p className="text-xs text-gray-600">Reading</p>
        </div>
      </div>
      
      {!stats.canAddFavorite && !stats.canAddCurrentReading && (
        <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-700 text-center">
          Bookshelf is full! Remove items to add new ones.
        </div>
      )}
    </div>
  );
};

// Section Header Component (unchanged)
const SectionHeader: React.FC<{ 
  title: string; 
  count: number; 
  icon: React.ReactNode; 
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ title, count, icon, description, isExpanded, onToggle }) => (
  <div 
    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
    onClick={onToggle}
  >
    <div className="flex items-center">
      <div className="p-2 bg-white rounded-lg mr-3 shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-lg font-bold text-purple-600">{count}</span>
      <span className="text-gray-400">
        {isExpanded ? '−' : '+'}
      </span>
    </div>
  </div>
);

const EnhancedMyEvermarksPage: React.FC = () => {
  const account = useActiveAccount();
  const address = account?.address;
  
  // Existing hooks
  const { evermarks: userOwnedEvermarks, isLoading: isLoadingOwned } = useUserEvermarks(address);
  const { evermarks: allEvermarks } = useEvermarks();
  const { 
    delegationHistory, 
    getSupportedEvermarks, 
    isLoading: isLoadingDelegations 
  } = useDelegationHistory(address);

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    created: true,
    owned: false,
    supported: false
  });

  // Categorize owned evermarks into created vs received
  const categorizedEvermarks = useMemo(() => {
    if (!address || !userOwnedEvermarks.length) {
      return { created: [], received: [] };
    }

    const created = userOwnedEvermarks.filter(
      evermark => evermark.creator?.toLowerCase() === address.toLowerCase()
    );

    const received = userOwnedEvermarks.filter(
      evermark => evermark.creator?.toLowerCase() !== address.toLowerCase()
    );

    console.log('📊 Categorized evermarks:', { 
      total: userOwnedEvermarks.length,
      created: created.length, 
      received: received.length 
    });

    return { created, received };
  }, [userOwnedEvermarks, address]);

  // Get supported evermarks from delegation history
  const supportedEvermarkIds = getSupportedEvermarks();
  const supportedEvermarks = useMemo(() => {
    return allEvermarks.filter(evermark => 
      supportedEvermarkIds.includes(evermark.id) &&
      evermark.creator?.toLowerCase() !== address?.toLowerCase() // Exclude own creations
    );
  }, [allEvermarks, supportedEvermarkIds, address]);

  // Get delegation info for supported evermarks
  const getDelegationInfo = (evermarkId: string) => {
    const delegations = delegationHistory.filter(d => d.evermarkId === evermarkId);
    if (delegations.length === 0) return null;
    
    // Get most recent delegation
    const latest = delegations[0]; // delegationHistory is already sorted by timestamp desc
    const totalAmount = delegations.reduce((sum, d) => sum + d.amount, BigInt(0));
    
    return {
      amount: toEther(totalAmount),
      date: latest.timestamp
    };
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle disconnected wallet state
  if (!address) {
    return (
      <PageContainer title="My Collection">
        <div className="text-center py-12">
          <BookmarkIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Wallet Not Connected
          </h3>
          <p className="text-gray-600 mb-6">
            Connect your wallet to view your Evermarks collection.
          </p>
        </div>
      </PageContainer>
    );
  }

  const isLoading = isLoadingOwned || isLoadingDelegations;

  return (
    <PageContainer title="My Collection">
      <div className="space-y-6">
        {/* Profile Stats Widget */}
        <ProfileStatsWidget userAddress={address} />
        
        {/* Bookshelf Quick Stats */}
        <BookshelfQuickStats userAddress={address} />
        
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Your personal library of Evermarks</p>
            <p className="text-sm text-purple-600 mt-1">
              💡 Hover over cards and click the ⭐ to add to your bookshelf
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/bookshelf"
              className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <StarIcon className="w-4 h-4 mr-2" />
              My Bookshelf
            </Link>
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add New
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Evermarks Created by User */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <SectionHeader
                title="Created by You"
                count={categorizedEvermarks.created.length}
                icon={<PlusIcon className="h-5 w-5 text-green-600" />}
                description="Evermarks you minted and created"
                isExpanded={expandedSections.created}
                onToggle={() => toggleSection('created')}
              />
              
              {expandedSections.created && (
                <div className="p-6">
                  {categorizedEvermarks.created.length === 0 ? (
                    <div className="text-center py-8">
                      <PlusIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-gray-500">No created Evermarks yet</p>
                      <Link
                        to="/create"
                        className="inline-flex items-center mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Create Your First Evermark
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categorizedEvermarks.created.map(evermark => (
                        <EnhancedEvermarkCard 
                          key={evermark.id} 
                          evermark={evermark} 
                          userAddress={address}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Evermarks Owned but Created by Others */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <SectionHeader
                title="Owned by You"
                count={categorizedEvermarks.received.length}
                icon={<BookmarkIcon className="h-5 w-5 text-blue-600" />}
                description="Evermarks you own but others created"
                isExpanded={expandedSections.owned}
                onToggle={() => toggleSection('owned')}
              />
              
              {expandedSections.owned && (
                <div className="p-6">
                  {categorizedEvermarks.received.length === 0 ? (
                    <div className="text-center py-8">
                      <BookmarkIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-gray-500">No received Evermarks yet</p>
                      <p className="text-sm text-gray-400 mt-2">
                        You'll see Evermarks here when others transfer them to you
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categorizedEvermarks.received.map(evermark => (
                        <EnhancedEvermarkCard 
                          key={evermark.id} 
                          evermark={evermark} 
                          showCreator={true}
                          userAddress={address}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Evermarks User Has Delegated To */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <SectionHeader
                title="Supported by You"
                count={supportedEvermarks.length}
                icon={<VoteIcon className="h-5 w-5 text-purple-600" />}
                description="Evermarks you've delegated WEMARK tokens to"
                isExpanded={expandedSections.supported}
                onToggle={() => toggleSection('supported')}
              />
              
              {expandedSections.supported && (
                <div className="p-6">
                  {supportedEvermarks.length === 0 ? (
                    <div className="text-center py-8">
                      <VoteIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-gray-500">No supported Evermarks yet</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Support quality content by delegating WEMARK tokens to Evermarks you like
                      </p>
                      <Link
                        to="/"
                        className="inline-flex items-center mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Explore Evermarks
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {supportedEvermarks.map(evermark => {
                        const delegationInfo = getDelegationInfo(evermark.id);
                        return (
                          <EnhancedEvermarkCard 
                            key={evermark.id} 
                            evermark={evermark} 
                            showCreator={true}
                            delegationAmount={delegationInfo?.amount}
                            delegationDate={delegationInfo?.date}
                            userAddress={address}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default EnhancedMyEvermarksPage;