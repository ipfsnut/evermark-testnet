// src/components/layout/MobileLayoutWrapper.tsx - Wrapper to improve existing pages

import React from 'react';
import { cn, useIsMobile } from '../../utils/responsive';

interface MobileLayoutWrapperProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  background?: 'gray' | 'white' | 'transparent';
}

/**
 * Wrapper component to add mobile optimization to existing pages
 * without requiring major refactoring
 */
export const MobileLayoutWrapper: React.FC<MobileLayoutWrapperProps> = ({
  children,
  className = '',
  padding = 'md',
  maxWidth = '7xl',
  background = 'gray'
}) => {
  const isMobile = useIsMobile();

  const paddingClasses = {
    none: '',
    sm: 'px-3 py-4 sm:px-4 sm:py-6',
    md: 'px-4 py-6 sm:px-6 sm:py-8',
    lg: 'px-6 py-8 sm:px-8 sm:py-12'
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-none'
  };

  const backgroundClasses = {
    gray: 'bg-gray-50',
    white: 'bg-white',
    transparent: 'bg-transparent'
  };

  return (
    <div className={cn(
      'min-h-screen',
      backgroundClasses[background],
      className
    )}>
      <div className={cn(
        'mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding]
      )}>
        {children}
      </div>
    </div>
  );
};

// Enhanced PageContainer that can replace the existing one
export const EnhancedPageContainer: React.FC<{
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  fullWidth?: boolean;
  className?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}> = ({ 
  children, 
  title, 
  subtitle,
  fullWidth = false, 
  className = '',
  actions,
  breadcrumbs 
}) => {
  const isMobile = useIsMobile();

  return (
    <MobileLayoutWrapper 
      maxWidth={fullWidth ? 'full' : '7xl'}
      className={className}
    >
      {/* Header Section */}
      {(title || subtitle || actions || breadcrumbs) && (
        <div className="mb-6 sm:mb-8">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm overflow-x-auto scrollbar-hide">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center whitespace-nowrap">
                    {index > 0 && (
                      <span className="text-gray-400 mx-2 flex-shrink-0">/</span>
                    )}
                    {crumb.href ? (
                      <a
                        href={crumb.href}
                        className="text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <span className="text-gray-500">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Title and Actions */}
          <div className={cn(
            'flex justify-between items-start',
            isMobile ? 'flex-col space-y-4' : 'flex-row items-center'
          )}>
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-base sm:text-lg text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
            
            {actions && (
              <div className={cn(
                'flex-shrink-0',
                isMobile ? 'w-full' : 'ml-6'
              )}>
                <div className={cn(
                  'flex items-center space-x-3',
                  isMobile ? 'justify-stretch' : ''
                )}>
                  {actions}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {children}
    </MobileLayoutWrapper>
  );
};

// Grid component optimized for Evermark cards
export const EvermarkGrid: React.FC<{
  children: React.ReactNode;
  variant?: 'standard' | 'compact' | 'wide';
  className?: string;
}> = ({ children, variant = 'standard', className = '' }) => {
  const isMobile = useIsMobile();

  const gridClasses = {
    standard: isMobile 
      ? 'grid grid-cols-1 gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
    compact: 'grid grid-cols-1 gap-3 sm:gap-4',
    wide: isMobile
      ? 'grid grid-cols-1 gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6'
  };

  return (
    <div className={cn(gridClasses[variant], className)}>
      {children}
    </div>
  );
};

// Loading skeleton for Evermark cards
export const EvermarkCardSkeleton: React.FC<{
  variant?: 'standard' | 'compact';
  count?: number;
}> = ({ variant = 'standard', count = 6 }) => {
  const isMobile = useIsMobile();

  const SkeletonCard = () => {
    if (variant === 'compact') {
      return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex">
            <div className="w-24 sm:w-32 h-24 sm:h-32 bg-gray-200 animate-pulse" />
            <div className="flex-1 p-3 sm:p-4">
              <div className="h-4 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-3 bg-gray-200 animate-pulse rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="w-full h-48 sm:h-56 bg-gray-200 animate-pulse" />
        <div className="p-4 sm:p-6">
          <div className="h-5 bg-gray-200 animate-pulse rounded mb-3" />
          <div className="h-4 bg-gray-200 animate-pulse rounded w-2/3 mb-3" />
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-gray-200 animate-pulse rounded" />
            <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 animate-pulse rounded w-1/3" />
            <div className="h-3 bg-gray-200 animate-pulse rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <EvermarkGrid variant={variant === 'compact' ? 'compact' : 'standard'}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </EvermarkGrid>
  );
};

// Enhanced empty state component
export const EvermarkEmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, actions, className = '' }) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      'text-center py-12 sm:py-16 px-4',
      className
    )}>
      <div className="text-gray-300 mb-6 flex justify-center text-5xl sm:text-6xl">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-3">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {actions && (
        <div className={cn(
          'flex justify-center',
          isMobile ? 'flex-col space-y-3 max-w-xs mx-auto' : 'flex-row space-x-4'
        )}>
          {actions}
        </div>
      )}
    </div>
  );
};

// Tab navigation optimized for mobile
export const MobileFriendlyTabs: React.FC<{
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
  }>;
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}> = ({ tabs, activeTab, onChange, className = '' }) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      'border-b border-gray-200 bg-white',
      className
    )}>
      <nav className={cn(
        'flex',
        isMobile ? 'overflow-x-auto scrollbar-hide px-4' : 'px-6'
      )}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
              'touch-friendly',
              activeTab === tab.id
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cn(
                'px-2 py-1 text-xs rounded-full flex-shrink-0',
                activeTab === tab.id 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'bg-gray-100 text-gray-600'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default {
  MobileLayoutWrapper,
  EnhancedPageContainer,
  EvermarkGrid,
  EvermarkCardSkeleton,
  EvermarkEmptyState,
  MobileFriendlyTabs
};