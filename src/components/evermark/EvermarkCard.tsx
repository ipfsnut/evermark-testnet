import React, { useState } from 'react';
import { 
  UserIcon, 
  CalendarIcon, 
  EyeIcon, 
  VoteIcon,
  TrophyIcon,
  HeartIcon,
  BookOpenIcon,
  ShareIcon,
  ZapIcon
} from 'lucide-react';
import { EvermarkImage } from '../layout/UniversalImage';
import { useProfile } from '../../hooks/useProfile';
import { useViewTracking, formatViewCount } from '../../hooks/useViewTracking';
import { formatDistanceToNow } from 'date-fns';
import { cn, useIsMobile } from '../../utils/responsive';

// Hi-tech neon design tokens
const NEON_TOKENS = {
  colors: {
    neonGreen: '#00ff41',
    neonPurple: '#bf00ff',
    neonYellow: '#ffff00',
    cyberBlue: '#00ffff',
    matrixGreen: '#0dff00'
  },
  shadows: {
    neonGlow: 'shadow-lg shadow-green-500/20',
    purpleGlow: 'shadow-lg shadow-purple-500/20',
    yellowGlow: 'shadow-lg shadow-yellow-500/20'
  },
  borders: {
    cyber: 'border border-gray-700 hover:border-green-400 transition-all duration-300',
    neon: 'border-2 border-transparent bg-gradient-to-r from-green-400 via-purple-500 to-yellow-400 bg-clip-border'
  }
};

export interface UnifiedEvermarkCardProps {
  evermark: {
    id: string;
    title: string;
    author: string;
    description?: string;
    image?: string;
    creationTime: number;
    creator?: string;
  };
  
  variant?: 'card' | 'compact' | 'list' | 'hero' | 'minimal' | 'leaderboard';
  rank?: number;
  votes?: bigint;
  bookshelfCategory?: 'favorite' | 'currentReading';
  
  showRank?: boolean;
  showVotes?: boolean;
  showViews?: boolean;
  showActions?: boolean;
  showDescription?: boolean;
  showImage?: boolean;
  showWemark?: boolean;
  
  onOpenModal?: () => void;
  onWemark?: () => void;
  
  priority?: boolean;
  className?: string;
}

export const EvermarkCard: React.FC<UnifiedEvermarkCardProps> = ({
  evermark,
  variant = 'card',
  rank,
  votes,
  bookshelfCategory,
  showRank = false,
  showVotes = false,
  showViews = true,
  showActions = true,
  showDescription = true,
  showImage = true,
  showWemark = false,
  onOpenModal,
  onWemark,
  priority = false,
  className = ''
}) => {
  const { id, title, author, description, image, creationTime } = evermark;
  const { primaryAddress } = useProfile();
  const { viewStats } = useViewTracking(id);
  const isMobile = useIsMobile();
  
  // Variant configurations
  const getVariantConfig = () => {
    const baseClasses = 'bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-all duration-300';
    
    switch (variant) {
      case 'hero':
        return {
          container: `${baseClasses} hover:border-green-400 hover:shadow-xl hover:shadow-green-500/20`,
          spacing: 'p-6 sm:p-8',
          imageHeight: 'h-64 sm:h-80',
          titleSize: 'text-xl sm:text-2xl font-bold text-white',
          isHero: true
        };
        
      case 'leaderboard':
        return {
          container: `${baseClasses} hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20`,
          spacing: 'p-4',
          imageHeight: isMobile ? 'h-32' : 'h-40',
          titleSize: 'text-lg font-semibold text-white',
          isCompact: true
        };
        
      case 'compact':
        return {
          container: `${baseClasses} hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-500/20`,
          spacing: 'p-4',
          imageHeight: 'h-32 sm:h-40',
          titleSize: 'text-base font-semibold text-white',
          isCompact: true
        };
        
      case 'list':
        return {
          container: `${baseClasses} flex flex-row hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-500/20`,
          spacing: 'p-4',
          imageHeight: 'w-24 h-24 sm:w-32 sm:h-32',
          titleSize: 'text-base font-semibold text-white',
          isList: true
        };
        
      case 'minimal':
        return {
          container: `${baseClasses} hover:border-gray-500`,
          spacing: 'p-3',
          imageHeight: 'h-24',
          titleSize: 'text-sm font-medium text-white',
          isMinimal: true
        };
        
      default: // 'card'
        return {
          container: `${baseClasses} hover:border-green-400 hover:shadow-lg hover:shadow-green-500/20`,
          spacing: 'p-4 sm:p-6',
          imageHeight: 'h-48 sm:h-56',
          titleSize: 'text-lg sm:text-xl font-semibold text-white',
          isDefault: true
        };
    }
  };

  const config = getVariantConfig();

  // Rank display component
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

  // Vote count overlay
  const VoteBadge = () => {
    if (!showVotes || !votes) return null;

    const formattedVotes = Number(votes) >= 1000000 
      ? `${(Number(votes) / 1000000).toFixed(1)}M`
      : Number(votes) >= 1000 
      ? `${(Number(votes) / 1000).toFixed(1)}K`
      : Number(votes).toString();

    return (
      <div className="absolute top-2 right-2 z-20 bg-black/80 text-green-400 px-2 py-1 rounded border border-green-400/50 text-xs font-bold flex items-center backdrop-blur-sm">
        <ZapIcon className="h-3 w-3 mr-1" />
        {formattedVotes}
      </div>
    );
  };

  // Bookshelf category badge
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

  // $WEMARK Button Component
  const WemarkButton = () => {
    if (!showWemark || !onWemark) return null;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onWemark();
        }}
        className={cn(
          'px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold rounded',
          'hover:from-green-300 hover:to-green-500 transition-all duration-200',
          'shadow-lg shadow-green-500/30 hover:shadow-green-500/50',
          'flex items-center gap-2 text-sm',
          isMobile ? 'flex-1' : ''
        )}
      >
        <ZapIcon className="h-4 w-4" />
        <span>$WEMARK</span>
      </button>
    );
  };

  // List variant (horizontal layout)
  if (config.isList) {
    return (
      <div 
        className={cn(config.container, 'cursor-pointer', className)}
        onClick={onOpenModal}
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
            <h3 className={config.titleSize}>{title}</h3>
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
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2 mt-3">
              <WemarkButton />
              <button className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm">
                <ShareIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard card layout (vertical)
  return (
    <div 
      className={cn(config.container, 'cursor-pointer flex flex-col h-full group', className)}
      onClick={onOpenModal}
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
        <h3 className={cn(config.titleSize, 'mb-2 line-clamp-2 group-hover:text-green-400 transition-colors')}>
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
          <p className="text-sm text-gray-300 line-clamp-3 flex-1 mb-4">
            {description}
          </p>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-700">
          {/* Views */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {showViews && viewStats && (
              <span className="flex items-center text-cyan-400">
                <EyeIcon className="h-3 w-3 mr-1" />
                {formatViewCount(viewStats.totalViews)}
              </span>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className={cn('flex items-center gap-2', isMobile && showWemark && 'flex-1 ml-4')}>
              <WemarkButton />
              {!isMobile && (
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 hover:text-white transition-colors"
                >
                  <ShareIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Convenience exports for specific use cases
export const LeaderboardEvermarkCard: React.FC<{
  evermark: any;
  rank: number;
  votes: bigint;
  onOpenModal: () => void;
  onWemark: () => void;
}> = ({ evermark, rank, votes, onOpenModal, onWemark }) => (
  <EvermarkCard
    evermark={evermark}
    variant="leaderboard"
    rank={rank}
    votes={votes}
    showRank={true}
    showVotes={true}
    showWemark={true}
    showDescription={false}
    onOpenModal={onOpenModal}
    onWemark={onWemark}
  />
);

export const ExploreEvermarkCard: React.FC<{
  evermark: any;
  onOpenModal: () => void;
  onWemark?: () => void;
  compact?: boolean;
}> = ({ evermark, onOpenModal, onWemark, compact = false }) => (
  <EvermarkCard
    evermark={evermark}
    variant={compact ? 'compact' : 'card'}
    showWemark={!!onWemark}
    onOpenModal={onOpenModal}
    onWemark={onWemark}
  />
);

export const HeroEvermarkCard: React.FC<{
  evermark: any;
  onOpenModal: () => void;
  onWemark: () => void;
}> = ({ evermark, onOpenModal, onWemark }) => (
  <EvermarkCard
    evermark={evermark}
    variant="hero"
    showWemark={true}
    priority={true}
    onOpenModal={onOpenModal}
    onWemark={onWemark}
  />
);

export default EvermarkCard;