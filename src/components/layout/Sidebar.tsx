import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { useWalletConnection } from '../../providers/WalletProvider';
import SwapWidget from '../swap/SwapWidget';
import { 
  X as CloseIcon, 
  Home as HomeIcon, 
  BookOpen as BookOpenIcon,
  Trophy as TrophyIcon,
  Info as AboutIcon,
  Plus as CreateIcon,
  Copy as CopyIcon,
  WifiIcon,
  WifiOffIcon,
  CoinsIcon,
  BookmarkIcon,
  InfoIcon,
  GridIcon,
  SearchIcon,
  TrendingUpIcon,
  UserIcon
} from 'lucide-react';
import { cn, useIsMobile, touchFriendly, textSizes, spacing } from '../../utils/responsive';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // ✅ Use unified auth system
  const {
    displayName,
    avatar,
    handle,
    isAuthenticated,
    walletAddress,
    isInFarcaster,
    farcasterUser,
    primaryAddress
  } = useProfile();
  
  // ✅ Use unified wallet connection
  const { canInteract, walletType, isConnected } = useWalletConnection();
  
  // ✅ UPDATED: Enhanced navigation items with Explore and better organization
  const navItems = [
    { 
      path: '/', 
      label: 'Home', 
      icon: <HomeIcon className="h-5 w-5" />,
      description: 'Discover featured Evermarks',
      category: 'discover'
    },
    { 
      path: '/explore', 
      label: 'Explore', 
      icon: <GridIcon className="h-5 w-5" />,
      description: 'Browse all Evermarks with filters',
      category: 'discover',
      badge: 'New'
    },
    { 
      path: '/leaderboard', 
      label: 'Leaderboard', 
      icon: <TrophyIcon className="h-5 w-5" />,
      description: 'Top voted Evermarks',
      category: 'discover'
    },
    { 
      path: '/create', 
      label: 'Create', 
      icon: <CreateIcon className="h-5 w-5" />,
      description: 'Create new Evermark',
      requiresAuth: true,
      category: 'user'
    },
    { 
      path: '/my-evermarks', 
      label: 'My Collection', 
      icon: <BookOpenIcon className="h-5 w-5" />,
      description: 'Your created Evermarks',
      requiresAuth: true,
      category: 'user'
    },
    { 
      path: '/bookshelf', 
      label: 'Bookshelf', 
      icon: <BookmarkIcon className="h-5 w-5" />,
      description: 'Curated favorites and voting delegation',
      requiresAuth: true,
      category: 'user'
    },
    ...(canInteract ? [{
      path: '/wrapping', 
      label: 'Token Tools', 
      icon: <CoinsIcon className="h-5 w-5" />,
      badge: 'wEMARK',
      description: 'Wrap/unwrap EMARK tokens',
      category: 'tools'
    }] : []),
    { 
      path: '/about', 
      label: 'About', 
      icon: <InfoIcon className="h-5 w-5" />,
      description: 'Learn about Evermark Protocol',
      category: 'info'
    },
  ];
  
  // ✅ NEW: Group navigation items by category
  const navItemsByCategory = {
    discover: navItems.filter(item => item.category === 'discover'),
    user: navItems.filter(item => item.category === 'user'),
    tools: navItems.filter(item => item.category === 'tools'),
    info: navItems.filter(item => item.category === 'info')
  };
  
  // Check if a nav item is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
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
  
  // ✅ NEW: Render navigation section
  const renderNavSection = (title: string, items: typeof navItems, showTitle = true) => {
    const visibleItems = items.filter(item => !item.requiresAuth || isAuthenticated);
    
    if (visibleItems.length === 0) return null;
    
    return (
      <div className="mb-6">
        {showTitle && (
          <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </h3>
        )}
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center rounded-lg transition-all duration-200 group relative",
                  spacing.responsive['sm-md-lg'],
                  textSizes.responsive['sm-base-lg'],
                  touchFriendly.button,
                  isActive(item.path)
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                )}
                onClick={closeSidebar}
                title={item.description}
              >
                <span className={cn(
                  "mr-3 transition-colors",
                  isActive(item.path) ? 'text-purple-600' : 'text-gray-500 group-hover:text-gray-700'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                
                {/* Enhanced badges with better styling */}
                {item.badge && (
                  <span className={cn(
                    "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                    item.badge === 'New' 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : item.badge === 'wEMARK'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  )}>
                    {item.badge}
                  </span>
                )}
                
                {/* Active indicator */}
                {isActive(item.path) && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600 rounded-r" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  return (
    <div className={cn(
      "fixed md:sticky top-0 left-0 h-full md:h-screen w-64 bg-white border-r border-gray-200 z-20 transform transition-transform duration-300 ease-in-out flex flex-col",
      isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>
      {/* ✅ Enhanced Sidebar Header */}
      <div className={cn("border-b border-gray-200 flex items-center justify-between", spacing.responsive['sm-md-lg'])}>
        <Link 
          to="/" 
          className={cn(
            "font-serif font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center",
            textSizes.responsive['lg-xl-2xl']
          )}
          onClick={closeSidebar}
        >
          <img 
            src="/EvermarkLogo.png" 
            alt="Evermark Logo" 
            className="h-8 w-8 mr-2"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          Evermark
        </Link>
        <button
          className={cn(
            "md:hidden rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors",
            touchFriendly.button
          )}
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* ✅ Enhanced User Profile Section */}
      {isAuthenticated && (
        <div className={cn("border-b border-gray-200", spacing.responsive['sm-md-lg'])}>
          <div className="flex items-center space-x-3">
            {/* ✅ ENHANCED: Profile Picture */}
            <Link 
              to={primaryAddress ? `/${primaryAddress}` : '/profile'} 
              className={cn(
                "bg-purple-100 rounded-full flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer flex-shrink-0",
                isMobile ? "h-12 w-12" : "h-14 w-14"
              )}
              onClick={closeSidebar}
              title="View your profile"
            >
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={displayName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className={cn(
                  "font-bold text-purple-600",
                  textSizes.responsive['lg-xl-2xl']
                )}>
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            
            {/* User Info - Enhanced */}
            <div className="flex-1 min-w-0">
              <Link 
                to={primaryAddress ? `/${primaryAddress}` : '/profile'}
                onClick={closeSidebar}
                className="block hover:text-purple-600 transition-colors"
              >
                <h3 className={cn(
                  "font-medium text-gray-900 truncate",
                  textSizes.responsive['sm-base-lg']
                )}>
                  {displayName}
                </h3>
              </Link>
              
              {/* Show handle OR wallet address with better hierarchy */}
              {handle ? (
                <p className="text-xs sm:text-sm text-purple-600 truncate">@{handle}</p>
              ) : primaryAddress ? (
                <button
                  onClick={() => copyWalletAddress(primaryAddress)}
                  className="font-mono text-xs text-gray-600 hover:text-purple-600 transition-colors cursor-pointer flex items-center gap-1 group truncate"
                  title="Click to copy wallet address"
                >
                  <span className="truncate">{primaryAddress.slice(0, 8)}...{primaryAddress.slice(-4)}</span>
                  <CopyIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ) : (
                <p className="text-xs text-gray-500">No wallet connected</p>
              )}
              
              {/* ✅ ENHANCED: Connection status with better visual hierarchy */}
              <div className="flex items-center mt-1 text-xs">
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  canInteract ? 'bg-green-400' : isConnected ? 'bg-yellow-400' : 'bg-red-400'
                )}></div>
                <span className={cn(
                  "capitalize font-medium",
                  canInteract ? 'text-green-600' : isConnected ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {canInteract ? 'Full Access' : isConnected ? 'Read Only' : 'Connect Wallet'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ✅ Enhanced Frame-specific messaging */}
      {isInFarcaster && (
        <div className="px-3 sm:px-4 py-2 bg-purple-50 border-b border-purple-100">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
            <p className="text-xs font-medium text-purple-700">Running in Farcaster</p>
            {isAuthenticated ? (
              <WifiIcon className="h-3 w-3 text-purple-600" />
            ) : (
              <WifiOffIcon className="h-3 w-3 text-purple-400" />
            )}
          </div>
          <div className="mt-1 text-center">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              canInteract 
                ? "bg-green-100 text-green-700"
                : isConnected 
                ? "bg-yellow-100 text-yellow-700" 
                : "bg-red-100 text-red-700"
            )}>
              {canInteract ? 'Full Features' : isConnected ? 'Read Only' : 'No Wallet'}
            </span>
          </div>
        </div>
      )}
      
      {/* ✅ ENHANCED: Organized Navigation with Categories */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {/* ✅ NEW: Quick Swap Button */}
        {isAuthenticated && (
          <div className="mb-4 px-1">
            <SwapWidget />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Quick $EMARK swap
            </p>
          </div>
        )}

        {/* Discovery Section */}
        {renderNavSection('Discover', navItemsByCategory.discover)}
        
        {/* User Section (only if authenticated) */}
        {isAuthenticated && renderNavSection('My Evermarks', navItemsByCategory.user)}
        
        {/* Tools Section (only if can interact) */}
        {navItemsByCategory.tools.length > 0 && renderNavSection('Tools', navItemsByCategory.tools)}
        
        {/* Info Section */}
        {renderNavSection('Information', navItemsByCategory.info)}
        
        {/* ✅ ENHANCED: Better call-to-action for unauthenticated users */}
        {!isAuthenticated && (
          <div className="mt-6 px-2">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                Get Started
              </h4>
              <p className="text-xs text-purple-700 mb-3 leading-relaxed">
                Connect your wallet to create Evermarks, vote on content, and build your personal bookshelf
              </p>
              <div className="space-y-2">
                <Link
                  to="/explore"
                  onClick={closeSidebar}
                  className="block text-xs text-center bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 transition-colors font-medium"
                >
                  Explore Evermarks
                </Link>
                <Link
                  to="/about"
                  onClick={closeSidebar}
                  className="block text-xs text-center bg-white text-purple-600 border border-purple-300 px-3 py-2 rounded hover:bg-purple-50 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* ✅ Enhanced footer with version info */}
      <div className={cn("border-t border-gray-200 mt-auto", spacing.responsive['sm-md-lg'])}>
        {/* Network status for authenticated users */}
        {isAuthenticated && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600 font-medium">Network:</span>
              <span className="text-purple-600 font-semibold">Base Mainnet</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Status:</span>
              <span className={cn(
                "font-medium flex items-center gap-1",
                canInteract ? 'text-green-600' : isConnected ? 'text-yellow-600' : 'text-red-600'
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  canInteract ? 'bg-green-400' : isConnected ? 'bg-yellow-400' : 'bg-red-400'
                )}></div>
                {canInteract ? 'Active' : isConnected ? 'Limited' : 'Offline'}
              </span>
            </div>
          </div>
        )}
        
        {/* Logo and version info */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">
            © {new Date().getFullYear()} Evermark Protocol
          </p>
          <p className="text-xs text-gray-400">
            v2.0.0 • Base Mainnet
          </p>
          
          {/* Environment indicator for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2">
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                Development Mode
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;