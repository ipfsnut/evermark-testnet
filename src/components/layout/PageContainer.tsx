// src/components/layout/PageContainer.tsx - Enhanced version of your existing component
// This is a drop-in replacement that maintains your existing API

import React from 'react';
import { cn, useIsMobile } from '../../utils/responsive';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  title, 
  fullWidth = false, 
  className = '' 
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={cn(
        'mx-auto',
        // Enhanced responsive container
        fullWidth ? 'w-full' : 'max-w-7xl',
        // Mobile-first padding
        'px-4 py-6 sm:px-6 sm:py-8',
        className
      )}>
        {/* Enhanced title handling */}
        {title && (
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-gray-900 text-balance">
              {title}
            </h1>
          </div>
        )}
        
        {/* Enhanced content spacing */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageContainer;