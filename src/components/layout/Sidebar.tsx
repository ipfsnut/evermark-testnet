import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { 
  X as CloseIcon, 
  Home as HomeIcon, 
  BookOpen as BookOpenIcon,
  Trophy as TrophyIcon,
  Info as AboutIcon,
  Plus as CreateIcon,
  Copy as CopyIcon,
  WifiIcon,
  WifiOffIcon
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const {
    displayName,
    avatar,
    handle,
    isAuthenticated,
    walletAddress,
    isInFarcaster,
    farcasterUser
  } = useProfile();
  
  // Define navigation items
  const navItems = [
    { path: '/', label: 'Home', icon: <HomeIcon className="h-5 w-5" /> },
    { path: '/leaderboard', label: 'Leaderboard', icon: <TrophyIcon className="h-5 w-5" /> },
    { path: '/create', label: 'Create', icon: <CreateIcon className="h-5 w-5" /> },
    { path: '/my-evermarks', label: 'My Collection', icon: <BookOpenIcon className="h-5 w-5" /> },
    { path: '/about', label: 'About', icon: <AboutIcon className="h-5 w-5" /> },
  ];
  
  // Check if a nav item is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  // Determine what to show in profile section
  const shouldShowProfile = isAuthenticated;
  const profileDisplayName = displayName;
  const profileAvatar = avatar;

  // Copy wallet address to clipboard
  const copyWalletAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      console.log('Wallet address copied to clipboard');
    } catch (err) {
      console.error('Failed to copy wallet address:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };
  
  return (
    <>
      {/* Sidebar */}
      <div className={`fixed md:sticky top-0 left-0 h-full md:h-screen w-64 bg-white border-r border-gray-200 z-20 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Sidebar Header with Close Button (mobile only) */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <Link 
            to="/" 
            className="font-serif text-lg sm:text-xl font-bold text-purple-600 hover:text-purple-700 transition-colors"
            onClick={() => closeSidebar()}
          >
            Evermark
          </Link>
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* 🎯 STREAMLINED: User Profile Section - Less redundant info */}
        {shouldShowProfile && (
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {/* Profile Picture - Clickable to go to profile */}
              <Link 
                to={walletAddress ? `/${walletAddress}` : '/profile'} 
                className="h-10 w-10 sm:h-12 sm:w-12 bg-purple-100 rounded-full flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer flex-shrink-0"
                onClick={() => closeSidebar()}
              >
                {profileAvatar ? (
                  <img 
                    src={profileAvatar} 
                    alt={profileDisplayName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg sm:text-xl font-bold text-purple-600">
                    {profileDisplayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
              
              {/* User Info - Simplified */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                  {profileDisplayName}
                </h3>
                
                {/* Show either handle OR wallet address, not both */}
                {handle ? (
                  <p className="text-xs sm:text-sm text-purple-600 truncate">{handle}</p>
                ) : walletAddress ? (
                  <button
                    onClick={() => copyWalletAddress(walletAddress)}
                    className="font-mono text-xs text-gray-600 hover:text-purple-600 transition-colors cursor-pointer flex items-center gap-1 group truncate"
                    title="Click to copy wallet address"
                  >
                    <span className="truncate">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                    <CopyIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ) : (
                  <p className="text-xs text-gray-500">No wallet connected</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 🎯 IMPROVED: Frame-specific messaging with better mobile design */}
        {isInFarcaster && (
          <div className="px-4 sm:px-6 py-2 bg-purple-50 border-b border-purple-100">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-medium text-purple-700">Running in Farcaster</p>
              {isAuthenticated ? (
                <WifiIcon className="h-3 w-3 text-purple-600" />
              ) : (
                <WifiOffIcon className="h-3 w-3 text-purple-400" />
              )}
            </div>
          </div>
        )}
        
        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base touch-manipulation ${
                    isActive(item.path)
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                  onClick={() => closeSidebar()}
                >
                  <span className={`mr-3 ${isActive(item.path) ? 'text-purple-600' : 'text-gray-500'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Footer with Logo */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 mt-auto">
          <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="Evermark Logo" 
              className="h-8 sm:h-10"
              onError={(e) => {
                // Fallback if image doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            © {new Date().getFullYear()} Evermark
          </p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;