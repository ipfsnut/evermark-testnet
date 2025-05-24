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
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">
          {title}
        </h1>
      )}
      
      <div className={`mx-auto ${fullWidth ? 'w-full' : 'max-w-4xl'}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;