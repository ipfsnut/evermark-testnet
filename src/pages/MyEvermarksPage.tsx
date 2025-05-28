import React, { useState, useEffect, useMemo } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { BookmarkIcon, PlusIcon, ImageIcon, UserIcon, VoteIcon, ClockIcon, HeartIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import { useUserEvermarks, useEvermarks } from '../hooks/useEvermarks';
import { useDelegationHistory } from '../hooks/useDelegationHistory';
import { ProfileStatsWidget } from '../components/profile/ProfileStatsWidget';
import { formatDistanceToNow } from 'date-fns';
import { toEther } from 'thirdweb/utils';

// Individual Evermark Card Component
const EvermarkCard: React.FC<{ evermark: any; showCreator?: boolean; delegationAmount?: string; delegationDate?: Date }> = ({ 
  evermark, 
  showCreator = false, 
  delegationAmount, 
  delegationDate 
}) => {
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
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
    >
      {/* Image section */}
      <div className="w-full h-32 bg-gray-100 overflow-hidden">
        {evermark.image && !imageError ? (
          <div className="relative w-full h-full">
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
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
          <div className="flex items-center">
            <UserIcon className="h-3 w-3 mr-1" />
            <span>by {evermark.author}</span>
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
  );
};

// Section Header Component
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

const MyEvermarksPage: React.FC = () => {
  const account = useActiveAccount();
  const address = account?.address;
  
  // Existing hooks
  const { evermarks: userOwnedEvermarks, isLoading: isLoadingOwned, error: ownedError } = useUserEvermarks(address);
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
        
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Your personal library of Evermarks</p>
          <div className="flex gap-3">
            <Link
              to="/bookshelf"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <HeartIcon className="w-4 h-4 mr-2" />
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
                        <EvermarkCard key={evermark.id} evermark={evermark} />
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
                        <EvermarkCard 
                          key={evermark.id} 
                          evermark={evermark} 
                          showCreator={true}
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
                          <EvermarkCard 
                            key={evermark.id} 
                            evermark={evermark} 
                            showCreator={true}
                            delegationAmount={delegationInfo?.amount}
                            delegationDate={delegationInfo?.date}
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

export default MyEvermarksPage;