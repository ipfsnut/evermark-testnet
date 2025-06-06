import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  
  // Handle sidebar state on resize and route changes
  useEffect(() => {
    const handleResize = () => {
      // On mobile (< 768px), keep sidebar closed by default
      // On desktop (>= 768px), keep sidebar open
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header openSidebar={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto">
            {/* 🎯 IMPROVED: Better mobile padding and spacing */}
            <div className="p-3 sm:p-4 md:p-6 lg:p-8">
              <div className="w-full max-w-none mx-auto">
                {children}
              </div>
            </div>
          </main>
          
          {/* Global Footer - replaces individual page footers */}
          <Footer />
        </div>
      </div>
      
      {/* 🎯 IMPROVED: Enhanced mobile sidebar overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          style={{ 
            // Ensure overlay is above everything except sidebar
            zIndex: 15,
            // Smooth transition
            animation: 'fadeIn 0.2s ease-out'
          }}
        />
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
export default Layout;