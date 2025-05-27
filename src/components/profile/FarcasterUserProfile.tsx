// src/components/FarcasterUserProfile.tsx
import React from 'react';
import { useFarcasterUser, useFarcasterActions } from '../../lib/farcaster';
import { UserIcon, ExternalLinkIcon } from 'lucide-react';

interface FarcasterUserProfileProps {
  showFullProfile?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FarcasterUserProfile: React.FC<FarcasterUserProfileProps> = ({ 
  showFullProfile = false, 
  size = 'md',
  className = ''
}) => {
  const { 
    user, 
    isAuthenticated, 
    isInFarcaster,
    getDisplayName, 
    getProfileUrl, 
    getAvatarUrl,
    getUserHandle 
  } = useFarcasterUser();
  const { openWarpcastProfile } = useFarcasterActions();

  if (!isInFarcaster || !isAuthenticated || !user) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const avatarUrl = getAvatarUrl();
  const displayName = getDisplayName();
  const userHandle = getUserHandle();
  const profileUrl = getProfileUrl();

  if (!showFullProfile) {
    // Compact view - just avatar and name
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-purple-100 flex items-center justify-center`}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName || 'User'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-6 w-6'} text-purple-600`} />
          )}
        </div>
        <span className={`${textSizeClasses[size]} font-medium text-gray-900`}>
          {displayName}
        </span>
      </div>
    );
  }

  // Full profile view
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-purple-100 flex items-center justify-center`}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName || 'User'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-6 w-6'} text-purple-600`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className={`${textSizeClasses[size]} font-medium text-gray-900 truncate`}>
              {displayName}
            </p>
            {profileUrl && (
              <button
                onClick={() => openWarpcastProfile(user.username)}
                className="text-purple-600 hover:text-purple-700"
              >
                <ExternalLinkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {userHandle && (
            <p className="text-sm text-gray-500 truncate">
              {userHandle}
            </p>
          )}
          
          {user.bio && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {user.bio}
            </p>
          )}
          
          {(user.followerCount !== undefined || user.followingCount !== undefined) && (
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              {user.followerCount !== undefined && (
                <span>{user.followerCount.toLocaleString()} followers</span>
              )}
              {user.followingCount !== undefined && (
                <span>{user.followingCount.toLocaleString()} following</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple hook for components that just need basic user info
export const useFarcasterDisplayName = () => {
  const { getDisplayName, isAuthenticated, isInFarcaster } = useFarcasterUser();
  
  if (!isInFarcaster || !isAuthenticated) {
    return null;
  }
  
  return getDisplayName();
};