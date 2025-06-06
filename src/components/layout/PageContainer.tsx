import React from 'react';

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
  return (
    <div className={`animate-fadeIn ${className}`}>
      {title && (
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-gray-900 leading-tight">
            {title}
          </h1>
        </div>
      )}
      
      <div className={`mx-auto ${fullWidth ? 'w-full' : 'max-w-none sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl'}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;