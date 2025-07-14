// src/components/evermark/EnhancedEvermarkModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  X as XIcon, 
  ExternalLinkIcon, 
  UserIcon, 
  CalendarIcon, 
  EyeIcon, 
  ShareIcon, 
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  VoteIcon,
  GiftIcon,
  HistoryIcon,
  ZapIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  LinkIcon
} from 'lucide-react';
import { useEvermarkDetail } from '../../hooks/useEvermarks';
import { useViewTracking, formatViewCount } from '../../hooks/useViewTracking';
import { useVoting } from '../../hooks/useVoting';
import { useRewardsDisplay } from '../../hooks/useRewardsDisplay';
import { useDelegationHistory } from '../../hooks/useDelegationHistory';
import { useProfile } from '../../hooks/useProfile';
import { useWalletConnection } from '../../providers/WalletProvider';
import { EvermarkImage } from '../layout/UniversalImage';
import { ShareButton } from '../sharing/ShareButton';
import { QuickBookshelfButton } from '../bookshelf/FloatingBookshelfWidget';
import { formatDistanceToNow } from 'date-fns';
import { toEther } from 'thirdweb/utils';
import { cn, useIsMobile } from '../../utils/responsive';

interface EnhancedEvermarkModalProps {
  evermarkId: string;
  isOpen: boolean;
  onClose: () => void;
  autoExpandDelegation?: boolean;
  initialExpandedSection?: 'delegation' | 'rewards' | 'history' | null;
}

type ExpandableSectionId = 'delegation' | 'rewards' | 'history';

interface ExpandableSection {
  id: ExpandableSectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}

export const EnhancedEvermarkModal: React.FC<EnhancedEvermarkModalProps> = ({
  evermarkId,
  isOpen,
  onClose,
  autoExpandDelegation = false,
  initialExpandedSection = null
}) => {
  const { primaryAddress, isAuthenticated } = useProfile();
  const { canInteract } = useWalletConnection();
  const isMobile = useIsMobile();

  // Data hooks
  const { evermark, isLoading, error } = useEvermarkDetail(evermarkId);
  const { viewStats } = useViewTracking(evermarkId);
  const { 
    totalVotes, 
    userVotes, 
    availableVotingPower, 
    delegateVotes, 
    undelegateVotes,
    isVoting,
    error: votingError,
    success: votingSuccess,
    clearMessages: clearVotingMessages
  } = useVoting(evermarkId, primaryAddress);
  const { current: rewards, format: formatRewards } = useRewardsDisplay(primaryAddress);
  const { delegationHistory, currentCycleDelegations } = useDelegationHistory(primaryAddress);

  // Modal state
  const [expandedSections, setExpandedSections] = useState<Set<ExpandableSectionId>>(new Set());
  const [delegationAmount, setDelegationAmount] = useState('');
  const [actionInProgress, setActionInProgress] = useState<'delegate' | 'undelegate' | null>(null);

  // Auto-expand delegation section if specified
  useEffect(() => {
    const sectionsToExpand = new Set<ExpandableSectionId>();
    
    if (autoExpandDelegation) {
      sectionsToExpand.add('delegation');
    }
    
    if (initialExpandedSection) {
      sectionsToExpand.add(initialExpandedSection);
    }
    
    if (sectionsToExpand.size > 0) {
      setExpandedSections(sectionsToExpand);
    }
  }, [autoExpandDelegation, initialExpandedSection]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Clear messages when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearVotingMessages();
      setDelegationAmount('');
      setActionInProgress(null);
    }
  }, [isOpen, clearVotingMessages]);

  // Section definitions
  const sections: ExpandableSection[] = [
    {
      id: 'delegation',
      title: 'Support this Evermark',
      icon: VoteIcon,
      badge: totalVotes ? `${Number(toEther(totalVotes)).toLocaleString()}` : '0',
      description: 'Delegate your $WEMARK voting power to support quality content'
    },
    {
      id: 'rewards',
      title: 'Your Rewards',
      icon: GiftIcon,
      badge: rewards.hasClaimableRewards ? formatRewards.totalRewardsDisplay() : '0',
      description: 'Claim accumulated rewards from your delegations'
    },
    {
      id: 'history',
      title: 'Delegation History',
      icon: HistoryIcon,
      badge: currentCycleDelegations.length.toString(),
      description: 'View your delegation activity and performance'
    }
  ];

  const toggleSection = (sectionId: ExpandableSectionId) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleDelegate = async () => {
    if (!delegationAmount || parseFloat(delegationAmount) <= 0) return;
    
    setActionInProgress('delegate');
    try {
      const result = await delegateVotes(delegationAmount);
      if (result.success) {
        setDelegationAmount('');
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUndelegate = async () => {
    if (!delegationAmount || parseFloat(delegationAmount) <= 0) return;
    
    setActionInProgress('undelegate');
    try {
      const result = await undelegateVotes(delegationAmount);
      if (result.success) {
        setDelegationAmount('');
      }
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'relative bg-white rounded-lg shadow-2xl overflow-hidden',
        'animate-in zoom-in-95 duration-200',
        isMobile 
          ? 'w-full h-full max-h-screen' 
          : 'w-full max-w-4xl max-h-[90vh] mx-4'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <BookmarkIcon className="h-4 w-4 text-white" />
            </div>
            <h2 className="font-bold text-gray-900 truncate">
              {isLoading ? 'Loading...' : evermark?.title || 'Evermark Detail'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {evermark && (
              <ShareButton 
                evermarkId={evermark.id}
                title={evermark.title}
                description={evermark.description}
                author={evermark.author}
              />
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading Evermark...</span>
            </div>
          ) : error || !evermark ? (
            <div className="text-center py-16 px-6">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Evermark</h3>
              <p className="text-gray-600">{error || "Evermark not found"}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main Content Grid */}
              <div className={cn(
                'grid gap-6 p-4 sm:p-6',
                isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'
              )}>
                {/* Image */}
                <div className={cn(
                  'relative',
                  isMobile ? 'h-48' : 'lg:col-span-1 h-64'
                )}>
                  <EvermarkImage
                    src={evermark.image}
                    alt={evermark.title}
                    aspectRatio="video"
                    rounded="lg"
                    className="w-full h-full"
                  />
                </div>

                {/* Stats & Info */}
                <div className={cn(
                  'space-y-4',
                  isMobile ? '' : 'lg:col-span-2'
                )}>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                      {evermark.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-1" />
                        <span>by {evermark.author}</span>
                      </div>
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>{formatDistanceToNow(evermark.creationTime, { addSuffix: true })}</span>
                      </div>
                      {viewStats && (
                        <div className="flex items-center text-blue-600">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          <span>{formatViewCount(viewStats.totalViews)} views</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vote Count Display */}
                  <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center">
                      <ZapIcon className="h-5 w-5 text-purple-600 mr-2" />
                      <div>
                        <p className="font-bold text-purple-900">
                          {Number(toEther(totalVotes)).toLocaleString()} $WEMARK
                        </p>
                        <p className="text-xs text-purple-700">Total votes</p>
                      </div>
                    </div>
                    
                    {userVotes > BigInt(0) && (
                      <div className="flex items-center border-l border-purple-300 pl-4">
                        <div>
                          <p className="font-medium text-purple-900">
                            {Number(toEther(userVotes)).toLocaleString()}
                          </p>
                          <p className="text-xs text-purple-700">Your delegation</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Source Link */}
                  {evermark.sourceUrl && (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <LinkIcon className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
                      <a
                        href={evermark.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm truncate"
                      >
                        {evermark.sourceUrl}
                      </a>
                      <ExternalLinkIcon className="h-3 w-3 text-gray-400 ml-1 flex-shrink-0" />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {evermark.description && (
                <div className="px-4 sm:px-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {evermark.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="px-4 sm:px-6">
                <div className="flex flex-wrap gap-3">
                  {isAuthenticated && (
                    <QuickBookshelfButton 
                      evermarkId={evermark.id}
                      userAddress={primaryAddress}
                      variant="button"
                    />
                  )}

                </div>
              </div>

              {/* Expandable Sections */}
              <div className="px-4 sm:px-6 space-y-4 pb-6">
                {sections.map((section) => {
                  const isExpanded = expandedSections.has(section.id);
                  const SectionIcon = section.icon;
                  
                  return (
                    <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors touch-manipulation"
                      >
                        <div className="flex items-center gap-3">
                          <SectionIcon className="h-5 w-5 text-gray-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">{section.title}</h4>
                            <p className="text-sm text-gray-600">{section.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {section.badge && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                              {section.badge}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          {section.id === 'delegation' && (
                            <DelegationSection
                              evermarkId={evermarkId}
                              totalVotes={totalVotes}
                              userVotes={userVotes}
                              availableVotingPower={availableVotingPower}
                              delegationAmount={delegationAmount}
                              setDelegationAmount={setDelegationAmount}
                              onDelegate={handleDelegate}
                              onUndelegate={handleUndelegate}
                              isProcessing={actionInProgress !== null}
                              actionInProgress={actionInProgress}
                              error={votingError}
                              success={votingSuccess}
                              canInteract={canInteract}
                              isAuthenticated={isAuthenticated}
                            />
                          )}
                          
                          {section.id === 'rewards' && (
                            <RewardsSection
                              rewards={rewards}
                              formatRewards={formatRewards}
                              isAuthenticated={isAuthenticated}
                            />
                          )}
                          
                          {section.id === 'history' && (
                            <HistorySection
                              delegationHistory={delegationHistory}
                              currentCycleDelegations={currentCycleDelegations}
                              evermarkId={evermarkId}
                              isAuthenticated={isAuthenticated}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Delegation Section Component
const DelegationSection: React.FC<{
  evermarkId: string;
  totalVotes: bigint;
  userVotes: bigint;
  availableVotingPower: bigint;
  delegationAmount: string;
  setDelegationAmount: (amount: string) => void;
  onDelegate: () => void;
  onUndelegate: () => void;
  isProcessing: boolean;
  actionInProgress: 'delegate' | 'undelegate' | null;
  error: string | null;
  success: string | null;
  canInteract: boolean;
  isAuthenticated: boolean;
}> = ({
  evermarkId,
  totalVotes,
  userVotes,
  availableVotingPower,
  delegationAmount,
  setDelegationAmount,
  onDelegate,
  onUndelegate,
  isProcessing,
  actionInProgress,
  error,
  success,
  canInteract,
  isAuthenticated
}) => {
  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <VoteIcon className="mx-auto h-8 w-8 text-gray-400 mb-3" />
        <h4 className="font-medium text-gray-900 mb-2">Connect to Delegate</h4>
        <p className="text-sm text-gray-600">
          Connect your wallet to support this Evermark with your voting power
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Current Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-2xl font-bold text-purple-600">
            {Number(toEther(userVotes)).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Your Delegation</p>
        </div>
        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-2xl font-bold text-green-600">
            {Number(toEther(availableVotingPower)).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Available Power</p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      {/* Delegation Form */}
      {canInteract ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="delegation-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Delegate ($WEMARK)
            </label>
            <div className="relative">
              <input
                id="delegation-amount"
                type="number"
                value={delegationAmount}
                onChange={(e) => setDelegationAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-16"
                placeholder="0.0"
                min="0"
                step="0.01"
                disabled={isProcessing}
              />
              <button
                type="button"
                onClick={() => setDelegationAmount(toEther(availableVotingPower))}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded hover:bg-purple-200 transition-colors"
                disabled={isProcessing}
              >
                MAX
              </button>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onDelegate}
              disabled={isProcessing || !delegationAmount || parseFloat(delegationAmount) <= 0}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionInProgress === 'delegate' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Delegating...
                </>
              ) : (
                <>
                  <VoteIcon className="h-4 w-4 mr-2" />
                  Delegate
                </>
              )}
            </button>
            
            {userVotes > BigInt(0) && (
              <button 
                onClick={onUndelegate}
                disabled={isProcessing || !delegationAmount || parseFloat(delegationAmount) <= 0}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionInProgress === 'undelegate' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Withdrawing...
                  </>
                ) : (
                  'Withdraw'
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <InfoIcon className="h-4 w-4 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              <strong>Limited Access:</strong> Full delegation features require a connected wallet with signing capabilities.
            </p>
          </div>
        </div>
      )}

      {/* Benefits Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">Delegation Benefits</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Increase your reward multiplier by supporting quality content</li>
          <li>• Help valuable Evermarks rise in the leaderboard</li>
          <li>• Earn additional rewards based on delegation performance</li>
          <li>• Contribute to the curation and quality of the platform</li>
        </ul>
      </div>
    </div>
  );
};

// Rewards Section Component
const RewardsSection: React.FC<{
  rewards: any;
  formatRewards: any;
  isAuthenticated: boolean;
}> = ({ rewards, formatRewards, isAuthenticated }) => {
  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <GiftIcon className="mx-auto h-8 w-8 text-gray-400 mb-3" />
        <h4 className="font-medium text-gray-900 mb-2">Connect to View Rewards</h4>
        <p className="text-sm text-gray-600">
          Connect your wallet to see your accumulated rewards
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {rewards.hasClaimableRewards ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-green-900">Rewards Available</h5>
              <p className="text-sm text-green-700">
                You have {formatRewards.totalRewardsDisplay()} tokens ready to claim
              </p>
            </div>
            <GiftIcon className="h-6 w-6 text-green-600" />
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <GiftIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">No rewards available yet</p>
        </div>
      )}
      
      <div className="text-center">
        <a
          href="/rewards"
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <GiftIcon className="h-4 w-4 mr-2" />
          View All Rewards
        </a>
      </div>
    </div>
  );
};

// History Section Component
const HistorySection: React.FC<{
  delegationHistory: any[];
  currentCycleDelegations: any[];
  evermarkId: string;
  isAuthenticated: boolean;
}> = ({ delegationHistory, currentCycleDelegations, evermarkId, isAuthenticated }) => {
  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <HistoryIcon className="mx-auto h-8 w-8 text-gray-400 mb-3" />
        <h4 className="font-medium text-gray-900 mb-2">Connect to View History</h4>
        <p className="text-sm text-gray-600">
          Connect your wallet to see your delegation history
        </p>
      </div>
    );
  }

  const relevantHistory = delegationHistory.filter(h => h.evermarkId === evermarkId);

  return (
    <div className="p-6 space-y-4">
      {relevantHistory.length > 0 ? (
        <div className="space-y-3">
          <h5 className="font-medium text-gray-900">Recent Activity</h5>
          {relevantHistory.slice(0, 3).map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {activity.type === 'delegate' ? 'Delegated' : 'Withdrew'} {Number(toEther(activity.amount)).toFixed(2)} $WEMARK
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                activity.type === 'delegate' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {activity.type === 'delegate' ? '+' : '-'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <HistoryIcon className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600">No delegation history for this Evermark</p>
        </div>
      )}
      
      <div className="text-center">
        <a
          href="/profile"
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <HistoryIcon className="h-4 w-4 mr-2" />
          View Full History
        </a>
      </div>
    </div>
  );
};