// src/components/evermark/EvermarkCard.tsx - Enhanced with proper image handling
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
  ChevronRightIcon,
  ImageIcon
} from 'lucide-react';
import { EvermarkImage } from '../layout/UniversalImage';
import { useImageProcessing, useImagePlaceholder } from '../../hooks/useImageProcessing';
import { useViewTracking, formatViewCount } from '../../hooks/useViewTracking';
import { formatDistanceToNow } from 'date-fns';
import { cn, useIsMobile } from '../../utils/responsive';
import type { StandardizedEvermark } from '../../lib/supabase-schema';

// Format votes for display
const formatVotes = (votes?: number): string => {
  if (!votes || votes === 0) return '0';
  
  if (votes >= 1000000) {
    return `${(votes / 1000000).toFixed(1)}M`;
  } else if (votes >= 1000) {
    return `${(votes / 1000).toFixed(1)}K`;
  } else if (votes >= 1) {
    return votes.toFixed(0);
  } else if (votes >= 0.1) {
    return votes.toFixed(1);
  } else if (votes > 0) {
    return votes.toFixed(2);
  } else {
    return '0';
  }
};

export interface EvermarkCardProps {
  evermark: StandardizedEvermark;
  
  // Visual variants
  variant?: 'standard' | 'compact' | 'list' | 'hero' | 'leaderboard';
  
  // Data to display
  rank?: number;
  votes?: bigint; // Keep for backward compatibility
  bookshelfCategory?: 'favorite' | 'currentReading';
  
  // What to show
  showRank?: boolean;
  showVotes?: boolean;
  showViews?: boolean;
  showDescription?: boolean;
  showImage?: boolean;
  showQuickActions?: boolean;
  
  // Interactions
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
  votes, // Legacy prop
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
  const { id, title, author, description, creationTime, votes: evermarkVotes } = evermark;
  const { viewStats } = useViewTracking(id);
  const { imageMetadata, getOptimalImageUrl } = useImageProcessing(evermark);
  const { generatePlaceholder } = useImagePlaceholder(evermark);
  const isMobile = useIsMobile();
  
  // Use evermark.votes if available, fallback to legacy votes prop
  const displayVotes = evermarkVotes || (votes ? Number(votes) / 1e18 : 0);
  
  // Get optimal image URL based on card variant
  const getImageUrl = () => {
    const sizeMap = {
      hero: 'large',
      standard: 'medium', 
      compact: 'medium',
      list: 'thumbnail',
      leaderboard: 'medium'
    } as const;
    
    const optimalUrl = getOptimalImageUrl(sizeMap[variant]);
    
    // Fallback to placeholder if no image
    if (!optimalUrl && showImage) {
      if (variant === 'hero') return generatePlaceholder(800, 450);
      if (variant === 'list') return generatePlaceholder(150, 150);
      return generatePlaceholder(400, 300);
    }
    
    return optimalUrl;
  };

  // Variant configurations for dark theme
  const getVariantConfig = () => {
    const baseClasses = cn(
      'bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden transition-all duration-300 group cursor-pointer',
      'hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm'
    );
    
    switch (variant) {
      case 'hero':
        return {
          container: cn(baseClasses, 'hover:shadow-xl hover:shadow-purple-500/30 hover:border-purple-400/50'),
          spacing: 'p-6 sm:p-8',
          imageHeight: 'h-64 sm:h-80',
          titleSize: 'text-xl sm:text-2xl font-bold text-white',
          isHero: true
        };
        
      case 'leaderboard':
        return {
          container: cn(baseClasses, 'hover:border-yellow-400/50 hover:shadow-yellow-500/20'),
          spacing: 'p-4',
          imageHeight: isMobile ? 'h-32' : 'h-40',
          titleSize: 'text-lg font-semibold text-white',
          isCompact: true
        };
        
      case 'compact':
        return {
          container: cn(baseClasses, 'hover:border-blue-400/50 hover:shadow-blue-500/20'),
          spacing: 'p-4',
          imageHeight: 'h-32 sm:h-40',
          titleSize: 'text-base font-semibold text-white',
          isCompact: true
        };
        
      case 'list':
        return {
          container: cn(baseClasses, 'flex flex-row hover:border-green-400/50 hover:shadow-green-500/20'),
          spacing: 'p-4',
          imageHeight: 'w-24 h-24 sm:w-32 sm:h-32',
          titleSize: 'text-base font-semibold text-white',
          isList: true
        };
        
      default: // 'standard'
        return {
          container: cn(baseClasses, 'hover:border-purple-400/50 hover:shadow-purple-500/20'),
          spacing: 'p-4 sm:p-6',
          imageHeight: 'h-48 sm:h-56',
          titleSize: 'text-lg sm:text-xl font-semibold text-white',
          isDefault: true
        };
    }
  };

  const config = getVariantConfig();

  // Event handlers
  const handleCardClick = () => {
    onOpenModal(id);
  };

  const handleDelegationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenModal(id, { autoExpandDelegation: true });
  };

  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    console.log(`Quick action: ${action} for evermark ${id}`);
  };

  // Badge components for dark theme
  const RankBadge = () => {
    if (!showRank || !rank) return null;

    const getRankStyle = (rank: number) => {
      switch (rank) {
        case 1:
          return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/50 animate-pulse border border-yellow-300';
        case 2:
          return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-500/50 border border-gray-200';
        case 3:
          return 'bg-gradient-to-r from-orange-400 to-orange-600 text-black shadow-lg shadow-orange-500/50 border border-orange-300';
        default:
          return 'bg-gray-900/80 text-green-400 border border-green-400/50 shadow-md shadow-green-500/30 backdrop-blur-sm';
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
    if (!showVotes || !displayVotes) return null;

    return (
      <div className="absolute top-2 right-2 z-20 bg-black/80 text-green-400 px-2 py-1 rounded border border-green-400/50 text-xs font-bold flex items-center backdrop-blur-sm shadow-lg shadow-green-500/30">
        <ZapIcon className="h-3 w-3 mr-1" />
        {formatVotes(displayVotes)}
      </div>
    );
  };

  const BookshelfBadge = () => {
    if (!bookshelfCategory) return null;

    const badgeConfig = {
      favorite: {
        icon: <HeartIcon className="h-3 w-3" />,
        label: 'Fav',
        style: 'bg-red-500/80 text-white border border-red-400/50 shadow-lg shadow-red-500/30'
      },
      currentReading: {
        icon: <BookOpenIcon className="h-3 w-3" />,
        label: 'Reading',
        style: 'bg-blue-500/80 text-white border border-blue-400/50 shadow-lg shadow-blue-500/30'
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

  // Image Status Indicator
  const ImageStatusIndicator = () => {
    if (!showImage || imageMetadata.status === 'processed') return null;

    const statusConfig = {
      processing: { icon: '⏳', text: 'Processing...', color: 'text-yellow-400' },
      failed: { icon: '❌', text: 'Failed', color: 'text-red-400' },
      none: { icon: '📷', text: 'No image', color: 'text-gray-400' }
    };

    const status = statusConfig[imageMetadata.status] || statusConfig.none;

    return (
      <div className="absolute bottom-2 left-2 z-20 bg-black/80 text-xs px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
        <span>{status.icon}</span>
        <span className={status.color}>{status.text}</span>
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
              src={getImageUrl()}
              alt={title}
              aspectRatio="square"
              rounded="lg"
              priority={priority}
              className="w-full h-full"
              evermarkTitle={title}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent rounded-lg" />
            <RankBadge />
            <VoteBadge />
            <BookshelfBadge />
            <ImageStatusIndicator />
          </div>
        )}

        {/* Content */}
        <div className={cn('flex-1 min-w-0 flex flex-col justify-between', config.spacing)}>
          <div>
            <h3 className={cn(config.titleSize, 'group-hover:text-cyan-400 transition-colors')}>
              {title}
            </h3>
            <div className="flex items-center mt-1 mb-2 text-gray-400">
              <UserIcon className="h-3 w-3 mr-1" />
              <span className="text-sm truncate">{author}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{formatDistanceToNow(creationTime * 1000, { addSuffix: true })}</span>
              {showViews && viewStats && (
                <span className="flex items-center text-cyan-400">
                  <EyeIcon className="h-3 w-3 mr-1" />
                  {formatViewCount(viewStats.totalViews)}
                </span>
              )}
              {showVotes && displayVotes > 0 && (
                <span className="flex items-center text-green-400">
                  <ZapIcon className="h-3 w-3 mr-1" />
                  {formatVotes(displayVotes)}
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
                    className="px-3 py-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded text-xs font-medium hover:bg-purple-600/30 hover:border-purple-400/50 transition-colors"
                  >
                    <ZapIcon className="h-3 w-3 mr-1 inline" />
                    Delegate
                  </button>
                )}
                <button
                  onClick={(e) => handleQuickAction(e, 'share')}
                  className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  <ShareIcon className="h-3 w-3" />
                </button>
              </div>
            )}
            <ChevronRightIcon className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
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
            src={getImageUrl()}
            alt={title}
            aspectRatio="video"
            rounded="none"
            priority={priority}
            className="w-full h-full group-hover:scale-105 transition-transform duration-500"
            evermarkTitle={title}
          />
          
          {/* Enhanced gradient overlay for dark theme */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <RankBadge />
          <VoteBadge />
          <BookshelfBadge />
          <ImageStatusIndicator />
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 flex flex-col', config.spacing)}>
        {/* Title */}
        <h3 className={cn(config.titleSize, 'mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors')}>
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
            <span className="text-xs">{formatDistanceToNow(creationTime * 1000, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Description */}
        {showDescription && description && !config.isCompact && (
          <p className="text-sm text-gray-300 line-clamp-3 flex-1 mb-4">
            {description}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-700">
          {/* Views and Votes */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {showViews && viewStats && (
              <span className="flex items-center text-cyan-400">
                <EyeIcon className="h-3 w-3 mr-1" />
                {formatViewCount(viewStats.totalViews)}
              </span>
            )}
            {showVotes && displayVotes > 0 && (
              <span className="flex items-center text-green-400">
                <ZapIcon className="h-3 w-3 mr-1" />
                {formatVotes(displayVotes)}
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
                    'px-3 py-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-cyan-300 rounded font-medium text-xs',
                    'hover:from-purple-500/30 hover:to-blue-500/30 hover:text-cyan-200 transition-all duration-200',
                    'border border-purple-500/30 hover:border-cyan-400/50 shadow-sm hover:shadow-md flex items-center gap-1',
                    'hover:shadow-cyan-500/20'
                  )}
                >
                  <ZapIcon className="h-3 w-3" />
                  <span>Delegate</span>
                </button>
              )}
              {!isMobile && (
                <button
                  onClick={(e) => handleQuickAction(e, 'share')}
                  className="p-2 bg-gray-700/50 text-gray-400 rounded hover:bg-gray-600/50 hover:text-cyan-400 transition-colors border border-gray-600/50 hover:border-cyan-400/30"
                >
                  <ShareIcon className="h-3 w-3" />
                </button>
              )}
              <ChevronRightIcon className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper components with updated styling
export const LeaderboardEvermarkCard: React.FC<{
  evermark: StandardizedEvermark;
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

export const ExploreEvermarkCard: React.FC<{
  evermark: StandardizedEvermark;
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

export const HeroEvermarkCard: React.FC<{
  evermark: StandardizedEvermark;
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