// src/components/evermark/EvermarkCard.tsx - Simplified Unified Component
import React from 'react';
import { 
  UserIcon, 
  CalendarIcon, 
  EyeIcon, 
  VoteIcon,
  TrophyIcon,
  HeartIcon,
  BookOpenIcon,
  ShareIcon,
  ZapIcon,
  ChevronRightIcon
} from 'lucide-react';
import { EvermarkImage } from '../layout/UniversalImage';
import { useViewTracking, formatViewCount } from '../../hooks/useViewTracking';
import { formatDistanceToNow } from 'date-fns';
import { cn, useIsMobile } from '../../utils/responsive';
import { toEther } from 'thirdweb/utils';

// Format votes for display
const formatVotes = (votes: bigint): string => {
  const voteNumber = Number(votes) / 1e18;
  
  if (voteNumber >= 1000000) {
    return `${(voteNumber / 1000000).toFixed(1)}M`;
  } else if (voteNumber >= 1000) {
    return `${(voteNumber / 1000).toFixed(1)}K`;
  } else if (voteNumber >= 1) {
    return voteNumber.toFixed(0);
  } else if (voteNumber >= 0.1) {
    return voteNumber.toFixed(1);
  } else if (voteNumber > 0) {
    return voteNumber.toFixed(2);
  } else {
    return '0';
  }
};

export interface EvermarkCardProps {
  evermark: {
    id: string;
    title: string;
    author: string;
    description?: string;
    image?: string;
    creationTime: number;
    creator?: string;
  };
  
  // Visual variants
  variant?: 'standard' | 'compact' | 'list' | 'hero' | 'leaderboard';
  
  // Data to display
  rank?: number;
  votes?: bigint;
  bookshelfCategory?: 'favorite' | 'currentReading';
  
  // What to show
  showRank?: boolean;
  showVotes?: boolean;
  showViews?: boolean;
  showDescription?: boolean;
  showImage?: boolean;
  showQuickActions?: boolean;
  
  // Interactions - SIMPLIFIED: Only modal interactions
  onOpenModal: (evermarkId: string, options?: ModalOptions) => void;
  
  // Styling
  priority?: boolean;
  className?: string;
}

export interface ModalOptions {
  autoExpandDelegation?: boolean;
  initialSection?: 'delegation' | 'rewards' | 'history';
}

export const EvermarkCard: React.FC<EvermarkCardProps> = ({
  evermark,
  variant = 'standard',
  rank,
  votes,
  bookshelfCategory,
  showRank = false,
  showVotes = false,
  showViews = true,
  showDescription = true,
  showImage = true,
  showQuickActions = true,
  onOpenModal,
  priority = false,
  className = ''
}) => {
  const { id, title, author, description, image, creationTime } = evermark;
  const { viewStats } = useViewTracking(id);
  const isMobile = useIsMobile();
  
  // Variant configurations
  const getVariantConfig = () => {
    const baseClasses = 'bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md group cursor-pointer';
    
    switch (variant) {
      case 'hero':
        return {
          container: `${baseClasses} hover:border-purple-300 hover:shadow-lg`,
          spacing: 'p-6 sm:p-8',
          imageHeight: 'h-64 sm:h-80',
          titleSize: 'text-xl sm:text-2xl font-bold text-gray-900',
          isHero: true
        };
        
      case 'leaderboard':
        return {
          container: `${baseClasses} hover:border-yellow-300`,
          spacing: 'p-4',
          imageHeight: isMobile ? 'h-32' : 'h-40',
          titleSize: 'text-lg font-semibold text-gray-900',
          isCompact: true
        };
        
      case 'compact':
        return {
          container: `${baseClasses} hover:border-blue-300`,
          spacing: 'p-4',
          imageHeight: 'h-32 sm:h-40',
          titleSize: 'text-base font-semibold text-gray-900',
          isCompact: true
        };
        
      case 'list':
        return {
          container: `${baseClasses} flex flex-row hover:border-green-300`,
          spacing: 'p-4',
          imageHeight: 'w-24 h-24 sm:w-32 sm:h-32',
          titleSize: 'text-base font-semibold text-gray-900',
          isList: true
        };
        
      default: // 'standard'
        return {
          container: `${baseClasses} hover:border-purple-300`,
          spacing: 'p-4 sm:p-6',
          imageHeight: 'h-48 sm:h-56',
          titleSize: 'text-lg sm:text-xl font-semibold text-gray-900',
          isDefault: true
        };
    }
  };

  const config = getVariantConfig();

  // Event handlers - SIMPLIFIED
  const handleCardClick = () => {
    onOpenModal(id);
  };

  const handleDelegationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenModal(id, { autoExpandDelegation: true });
  };

  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    // Handle quick actions without opening modal
    console.log(`Quick action: ${action} for evermark ${id}`);
  };

  // Badge components
  const RankBadge = () => {
    if (!showRank || !rank) return null;

    const getRankStyle = (rank: number) => {
      switch (rank) {
        case 1:
          return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/50 animate-pulse';
        case 2:
          return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-500/50';
        case 3:
          return 'bg-gradient-to-r from-orange-400 to-orange-600 text-black shadow-lg shadow-orange-500/50';
        default:
          return 'bg-gray-800 text-green-400 border border-green-400 shadow-md shadow-green-500/30';
      }
    };

    return (
      <div className={cn(
        'absolute top-2 left-2 z-20 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
        getRankStyle(rank)
      )}>
        {rank <= 3 ? ['👑', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </div>
    );
  };

  const VoteBadge = () => {
    if (!showVotes || votes === undefined || votes === null) return null;

    return (
      <div className="absolute top-2 right-2 z-20 bg-black/80 text-green-400 px-2 py-1 rounded border border-green-400/50 text-xs font-bold flex items-center backdrop-blur-sm">
        <ZapIcon className="h-3 w-3 mr-1" />
        {formatVotes(votes)}
      </div>
    );
  };

  const BookshelfBadge = () => {
    if (!bookshelfCategory) return null;

    const badgeConfig = {
      favorite: {
        icon: <HeartIcon className="h-3 w-3" />,
        label: 'Fav',
        style: 'bg-red-500/80 text-white border border-red-400'
      },
      currentReading: {
        icon: <BookOpenIcon className="h-3 w-3" />,
        label: 'Reading',
        style: 'bg-blue-500/80 text-white border border-blue-400'
      }
    };

    const badge = badgeConfig[bookshelfCategory];

    return (
      <div className={cn(
        'absolute top-2 right-2 z-20 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 backdrop-blur-sm',
        badge.style
      )}>
        {badge.icon}
        <span>{badge.label}</span>
      </div>
    );
  };

  // List variant (horizontal layout)
  if (config.isList) {
    return (
      <div 
        className={cn(config.container, className)}
        onClick={handleCardClick}
      >
        {/* Image */}
        {showImage && (
          <div className={cn('relative flex-shrink-0', config.imageHeight)}>
            <EvermarkImage
              src={image}
              alt={title}
              aspectRatio="square"
              rounded="lg"
              priority={priority}
              className="w-full h-full"
            />
            <RankBadge />
            <VoteBadge />
            <BookshelfBadge />
          </div>
        )}

        {/* Content */}
        <div className={cn('flex-1 min-w-0 flex flex-col justify-between', config.spacing)}>
          <div>
            <h3 className={cn(config.titleSize, 'group-hover:text-purple-600 transition-colors')}>
              {title}
            </h3>
            <div className="flex items-center mt-1 mb-2 text-gray-400">
              <UserIcon className="h-3 w-3 mr-1" />
              <span className="text-sm truncate">{author}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{formatDistanceToNow(creationTime, { addSuffix: true })}</span>
              {showViews && viewStats && (
                <span className="flex items-center text-cyan-400">
                  <EyeIcon className="h-3 w-3 mr-1" />
                  {formatViewCount(viewStats.totalViews)}
                </span>
              )}
              {showVotes && votes !== undefined && votes !== null && (
                <span className="flex items-center text-green-400">
                  <ZapIcon className="h-3 w-3 mr-1" />
                  {formatVotes(votes)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-3">
            {showQuickActions && (
              <div className="flex gap-2">
                {showVotes && (
                  <button
                    onClick={handleDelegationClick}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition-colors"
                  >
                    <ZapIcon className="h-3 w-3 mr-1 inline" />
                    Delegate
                  </button>
                )}
                <button
                  onClick={(e) => handleQuickAction(e, 'share')}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ShareIcon className="h-3 w-3" />
                </button>
              </div>
            )}
            <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
        </div>
      </div>
    );
  }

  // Standard card layout (vertical)
  return (
    <div 
      className={cn(config.container, 'flex flex-col h-full', className)}
      onClick={handleCardClick}
    >
      {/* Image */}
      {showImage && (
        <div className={cn('relative', config.imageHeight)}>
          <EvermarkImage
            src={image}
            alt={title}
            aspectRatio="video"
            rounded="none"
            priority={priority}
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <RankBadge />
          <VoteBadge />
          <BookshelfBadge />
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 flex flex-col', config.spacing)}>
        {/* Title */}
        <h3 className={cn(config.titleSize, 'mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors')}>
          {title}
        </h3>

        {/* Author & Meta */}
        <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
          <div className="flex items-center min-w-0">
            <UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate">{author}</span>
          </div>
          <div className="flex items-center flex-shrink-0 ml-2">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span className="text-xs">{formatDistanceToNow(creationTime, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Description */}
        {showDescription && description && !config.isCompact && (
          <p className="text-sm text-gray-600 line-clamp-3 flex-1 mb-4">
            {description}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-200">
          {/* Views and Votes */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {showViews && viewStats && (
              <span className="flex items-center text-cyan-400">
                <EyeIcon className="h-3 w-3 mr-1" />
                {formatViewCount(viewStats.totalViews)}
              </span>
            )}
            {showVotes && votes !== undefined && votes !== null && (
              <span className="flex items-center text-green-400">
                <ZapIcon className="h-3 w-3 mr-1" />
                {formatVotes(votes)}
              </span>
            )}
          </div>

          {/* Actions */}
          {showQuickActions && (
            <div className="flex items-center gap-2">
              {showVotes && (
                <button
                  onClick={handleDelegationClick}
                  className={cn(
                    'px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded font-medium text-xs',
                    'hover:from-purple-400 hover:to-purple-500 transition-all duration-200',
                    'shadow-sm hover:shadow-md flex items-center gap-1'
                  )}
                >
                  <ZapIcon className="h-3 w-3" />
                  <span>Delegate</span>
                </button>
              )}
              {!isMobile && (
                <button
                  onClick={(e) => handleQuickAction(e, 'share')}
                  className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 hover:text-gray-800 transition-colors"
                >
                  <ShareIcon className="h-3 w-3" />
                </button>
              )}
              <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// REMOVED: All specialized card exports - use the unified component with props instead

// Helper component for convenience in leaderboard
export const LeaderboardEvermarkCard: React.FC<{
  evermark: any;
  rank: number;
  votes: bigint;
  onOpenModal: (id: string, options?: ModalOptions) => void;
}> = ({ evermark, rank, votes, onOpenModal }) => (
  <EvermarkCard
    evermark={evermark}
    variant="leaderboard"
    rank={rank}
    votes={votes}
    showRank={true}
    showVotes={true}
    showDescription={false}
    onOpenModal={onOpenModal}
  />
);

// Helper component for explore page
export const ExploreEvermarkCard: React.FC<{
  evermark: any;
  onOpenModal: (id: string, options?: ModalOptions) => void;
  compact?: boolean;
}> = ({ evermark, onOpenModal, compact = false }) => (
  <EvermarkCard
    evermark={evermark}
    variant={compact ? 'compact' : 'standard'}
    showVotes={true}
    onOpenModal={onOpenModal}
  />
);

// Helper component for hero display
export const HeroEvermarkCard: React.FC<{
  evermark: any;
  onOpenModal: (id: string, options?: ModalOptions) => void;
}> = ({ evermark, onOpenModal }) => (
  <EvermarkCard
    evermark={evermark}
    variant="hero"
    showVotes={true}
    priority={true}
    onOpenModal={onOpenModal}
  />
);

export default EvermarkCard;