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
    <div className="flex flex-col min-h-screen bg-black">
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header openSidebar={() => setSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto">
            {/* Enhanced content area with cyber styling */}
            <div className="min-h-full">
              {children}
            </div>
          </main>
          
          {/* Global Footer */}
          <Footer />
        </div>
      </div>
      
      {/* Enhanced mobile sidebar overlay with cyber effects */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-10"
          onClick={() => setSidebarOpen(false)}
          style={{ 
            zIndex: 15,
            background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 65, 0.1) 0%, rgba(0, 0, 0, 0.8) 70%)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        />
      )}
      
      <style>{`
        @keyframes fadeIn {
          from { 
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to { 
            opacity: 1;
            backdrop-filter: blur(8px);
          }
        }
        
        /* Custom scrollbar for cyber theme */
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #00ff41, #bf00ff);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #00ff41, #00ffff);
        }

        /* Smooth transitions for all interactive elements */
        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 200ms;
        }

        /* Enhanced selection colors */
        ::selection {
          background-color: rgba(0, 255, 65, 0.3);
          color: #ffffff;
        }

        /* Cyber glow keyframes */
        @keyframes cyber-glow {
          0%, 100% { 
            text-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
          }
          50% { 
            text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
          }
        }

        .cyber-glow {
          animation: cyber-glow 2s ease-in-out infinite;
        }

        /* Matrix-style background animation (subtle) */
        @keyframes matrix-rain {
          0% { transform: translateY(-100vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Layout;